
from django.db import models
from django.db.models import JSONField
from django.utils import timezone


class SystemConfiguration(models.Model):
    logo = models.TextField(blank=True, null=True)        # Base64 logo string
    map_data = JSONField(default=dict)                    # JSONB on PostgreSQL – GIN-indexed (see migration 0007)
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"System Config (Updated: {self.last_updated})"


class LibraryClass(models.Model):
    name = models.CharField(max_length=100, unique=True)
    grade_level = models.CharField(max_length=20, blank=True, null=True)
    room_number = models.CharField(max_length=20, blank=True, null=True)

    def __str__(self):
        return self.name


# ─── Normalised catalogue lookup tables ───────────────────────────────────────

class Author(models.Model):
    """Normalised author entity.  Books reference authors via M2M."""
    name = models.CharField(max_length=255, unique=True, db_index=True)
    bio  = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name


class Publisher(models.Model):
    """Normalised publisher entity.  Books carry a FK to Publisher."""
    name    = models.CharField(max_length=255, unique=True, db_index=True)
    city    = models.CharField(max_length=100, blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return self.name


# ── Book ──────────────────────────────────────────────────────────────────────

class Book(models.Model):
    STATUS_CHOICES = [
        ('AVAILABLE',  'Available'),
        ('LOANED',     'Loaned'),
        ('LOST',       'Lost'),
        ('PROCESSING', 'Processing'),
        ('HELD',       'Held'),
    ]

    isbn          = models.CharField(max_length=13,  unique=True, db_index=True)
    title         = models.CharField(max_length=255)
    # 3NF: authors live in their own table; many-to-many allows co-authorship
    authors       = models.ManyToManyField(Author, related_name='books', blank=True)
    ddc_code      = models.CharField(max_length=20,  db_index=True)
    classification= models.CharField(max_length=100, default='General', db_index=True)
    call_number   = models.CharField(max_length=50,  blank=True, null=True, db_index=True)
    barcode_id    = models.CharField(max_length=50,  unique=True, db_index=True, null=True, blank=True)
    shelf_location= models.CharField(max_length=50,  blank=True, null=True, db_index=True)
    cover_url     = models.TextField(blank=True, null=True)

    # Financial & Acquisition
    value           = models.DecimalField(max_digits=10, decimal_places=2, default=25.00)
    vendor          = models.CharField(max_length=255, blank=True, null=True)
    acquisition_date= models.DateField(null=True, blank=True)

    # Extended metadata
    series    = models.CharField(max_length=255, blank=True, null=True)
    edition   = models.CharField(max_length=100, blank=True, null=True)
    # 3NF: publisher is a normalised FK
    publisher = models.ForeignKey(
        Publisher, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='books',
    )
    pub_year  = models.CharField(max_length=4,   blank=True, null=True)
    format    = models.CharField(max_length=50,  default='PAPERBACK')
    language  = models.CharField(max_length=50,  default='English')
    pages     = models.IntegerField(null=True, blank=True)
    summary   = models.TextField(blank=True, null=True)
    # JSONB on PostgreSQL – GIN-indexed in migration 0007
    subjects      = JSONField(default=list, blank=True)
    marc_metadata = JSONField(default=dict)

    status        = models.CharField(max_length=20, choices=STATUS_CHOICES, default='AVAILABLE', db_index=True)
    material_type = models.CharField(max_length=50, default='REGULAR', db_index=True)
    last_inventoried = models.DateField(null=True, blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)
    # Maintained by fn_checkout_book stored procedure
    loan_count    = models.IntegerField(default=0)

    @property
    def queue_length(self):
        """Derived from Hold table – never stored as a column."""
        return self.holds.filter(is_active=True).count()

    def __str__(self):
        return self.title


# ── Patron ────────────────────────────────────────────────────────────────────

class Patron(models.Model):
    GROUP_CHOICES = [
        ('STUDENT',       'Student'),
        ('TEACHER',       'Teacher'),
        ('LIBRARIAN',     'Librarian'),
        ('ADMINISTRATOR', 'Administrator'),
    ]

    student_id  = models.CharField(max_length=20, unique=True)
    full_name   = models.CharField(max_length=255)
    card_name   = models.CharField(max_length=60, blank=True, null=True)
    patron_group= models.CharField(max_length=20, choices=GROUP_CHOICES, db_index=True)
    # 3NF: FK to the LibraryClass table instead of denormalised text
    library_class = models.ForeignKey(
        LibraryClass, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='patrons',
    )
    email     = models.EmailField(blank=True, null=True)
    phone     = models.CharField(max_length=20, blank=True, null=True)
    photo_url = models.TextField(blank=True, null=True)
    is_blocked  = models.BooleanField(default=False, db_index=True)
    is_archived = models.BooleanField(default=False, db_index=True)
    # Cached aggregates – maintained by fn_checkout_book / fn_return_book stored procedures
    fines      = models.DecimalField(max_digits=8,  decimal_places=2, default=0.00)
    total_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    # Plain-text 4-digit kiosk PIN (not a login credential — no hashing needed)
    pin = models.CharField(max_length=10, default='1234')

    def set_pin(self, raw_pin: str) -> None:
        self.pin = str(raw_pin)

    def check_pin(self, raw_pin: str) -> bool:
        return self.pin == str(raw_pin)

    def __str__(self):
        return f"{self.full_name} ({self.student_id})"


# ── Loan ──────────────────────────────────────────────────────────────────────

class Loan(models.Model):
    book   = models.ForeignKey(Book,   on_delete=models.CASCADE, related_name='loans')
    patron = models.ForeignKey(Patron, on_delete=models.CASCADE, related_name='loans')
    issued_at   = models.DateTimeField(auto_now_add=True, db_index=True)
    due_date    = models.DateTimeField(db_index=True)
    returned_at = models.DateTimeField(null=True, blank=True, db_index=True)
    renewal_count  = models.IntegerField(default=0)
    fine_assessed  = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)


# ── Hold ──────────────────────────────────────────────────────────────────────

class Hold(models.Model):
    book   = models.ForeignKey(Book,   on_delete=models.CASCADE, related_name='holds')
    patron = models.ForeignKey(Patron, on_delete=models.CASCADE, related_name='holds')
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    is_active  = models.BooleanField(default=False, db_index=True)
    # Queue position enables FIFO ordering without full-table sorts
    position   = models.PositiveIntegerField(default=0, db_index=True)

    class Meta:
        ordering = ['position', 'created_at']


# ── Transaction ───────────────────────────────────────────────────────────────

class Transaction(models.Model):
    TYPE_CHOICES = [
        ('FINE_PAYMENT',          'Fine Payment'),
        ('REPLACEMENT_PAYMENT',   'Replacement Payment'),
        ('FINE_ASSESSMENT',       'Fine Assessment'),
        ('REPLACEMENT_ASSESSMENT','Replacement Assessment'),
        ('DAMAGE_ASSESSMENT',     'Damage Assessment'),
        ('MANUAL_ADJUSTMENT',     'Manual Adjustment'),
        ('WAIVE',                 'Waive'),
    ]
    METHOD_CHOICES = [('CASH', 'Cash'), ('SYSTEM', 'System')]

    patron = models.ForeignKey(Patron, on_delete=models.CASCADE, related_name='transactions')
    # FK traceability to the triggering loan and book
    loan = models.ForeignKey(
        Loan, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='transactions',
    )
    book = models.ForeignKey(
        Book, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='transactions',
    )
    amount    = models.DecimalField(max_digits=10, decimal_places=2)
    type      = models.CharField(max_length=30, choices=TYPE_CHOICES, db_index=True)
    method    = models.CharField(max_length=10, choices=METHOD_CHOICES)
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)
    # FK to staff user; NULL means automated system action
    librarian = models.ForeignKey(
        'auth.User', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='transactions',
    )
    note = models.TextField(blank=True, null=True)
    # Historical snapshot so ledger is readable even after the book is deleted
    book_title = models.CharField(max_length=255, blank=True, null=True)


# ── CirculationRule ───────────────────────────────────────────────────────────

class CirculationRule(models.Model):
    patron_group  = models.CharField(max_length=20, choices=Patron.GROUP_CHOICES)
    material_type = models.CharField(max_length=50, default='REGULAR')
    loan_days     = models.IntegerField(default=14)
    max_items     = models.IntegerField(default=5)
    fine_per_day  = models.DecimalField(max_digits=5, decimal_places=2, default=0.50)

    class Meta:
        unique_together = ('patron_group', 'material_type')


# ── LibraryEvent ──────────────────────────────────────────────────────────────

class LibraryEvent(models.Model):
    TYPE_CHOICES = [
        ('HOLIDAY',  'Holiday'),
        ('WORKSHOP', 'Workshop'),
        ('CLUB',     'Club'),
        ('EXAM',     'Exam'),
        ('GENERAL',  'General'),
    ]
    title       = models.CharField(max_length=255)
    date        = models.DateField(db_index=True)
    type        = models.CharField(max_length=20, choices=TYPE_CHOICES, default='GENERAL')
    description = models.TextField(blank=True, null=True)


# ── SystemAlert ───────────────────────────────────────────────────────────────

class SystemAlert(models.Model):
    message     = models.CharField(max_length=255)
    location    = models.CharField(max_length=100)
    timestamp   = models.DateTimeField(auto_now_add=True, db_index=True)
    is_resolved = models.BooleanField(default=False, db_index=True)
