"""
Migration 0006 – Full Normalisation
====================================
Changes
-------
Book
  • author  CharField  → authors  ManyToManyField(Author)   [3NF]
  • publisher CharField → publisher ForeignKey(Publisher)   [3NF]
  • Remove hold_expires_at  (hold expiry is on Hold.expires_at)
  • Remove queue_length     (now a @property on the model)
Patron
  • class_name CharField → library_class ForeignKey(LibraryClass) [3NF]
  • pin  max_length 4     → max_length 128 + PBKDF2 hashed
Transaction
  • librarian_id CharField → librarian ForeignKey(auth.User, null=True)
  • Add loan ForeignKey(Loan, null=True)
  • Add book ForeignKey(Book, null=True)
Hold
  • Add position PositiveIntegerField  (FIFO ordering without sort)
Loan
  • Add fine_assessed DecimalField (recorded at return time)
New models
  • Author
  • Publisher
"""

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
from django.contrib.auth.hashers import make_password


# ─── Data-migration helpers ────────────────────────────────────────────────────

def migrate_authors_forward(apps, schema_editor):
    """Populate Author table and Book↔Author M2M from legacy Book.author_legacy."""
    Book   = apps.get_model('backend', 'Book')
    Author = apps.get_model('backend', 'Author')
    for book in Book.objects.exclude(author_legacy='').exclude(author_legacy__isnull=True):
        raw_name = (book.author_legacy or '').strip()
        if not raw_name:
            continue
        author, _ = Author.objects.get_or_create(name=raw_name)
        book.authors.add(author)


def migrate_publishers_forward(apps, schema_editor):
    """Populate Publisher table and set Book.publisher FK from legacy publisher_legacy."""
    Book      = apps.get_model('backend', 'Book')
    Publisher = apps.get_model('backend', 'Publisher')
    for book in Book.objects.exclude(publisher_legacy='').exclude(publisher_legacy__isnull=True):
        raw_name = (book.publisher_legacy or '').strip()
        if not raw_name:
            continue
        pub, _ = Publisher.objects.get_or_create(name=raw_name)
        Book.objects.filter(pk=book.pk).update(publisher=pub)


def migrate_patron_classes_forward(apps, schema_editor):
    """Link Patron.library_class FK from legacy class_name CharField."""
    Patron       = apps.get_model('backend', 'Patron')
    LibraryClass = apps.get_model('backend', 'LibraryClass')
    for patron in Patron.objects.exclude(class_name_legacy='').exclude(class_name_legacy__isnull=True):
        raw_name = (patron.class_name_legacy or '').strip()
        if not raw_name:
            continue
        lc, _ = LibraryClass.objects.get_or_create(name=raw_name)
        Patron.objects.filter(pk=patron.pk).update(library_class=lc)


def hash_patron_pins(apps, schema_editor):
    """Re-hash all plain-text 4-digit PINs with Django's PBKDF2 hasher."""
    Patron = apps.get_model('backend', 'Patron')
    to_update = []
    for patron in Patron.objects.all():
        raw = patron.pin or '0000'
        # Skip if already hashed (Django hashes start with algorithm prefix)
        if not raw.startswith('pbkdf2_') and not raw.startswith('bcrypt') and not raw.startswith('argon2'):
            patron.pin = make_password(raw)
            to_update.append(patron)
    if to_update:
        Patron.objects.bulk_update(to_update, ['pin'])


# ─── Migration ─────────────────────────────────────────────────────────────────

class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('backend', '0005_book_cover_url_textfield'),
    ]

    operations = [

        # ── 1. New normalised tables ──────────────────────────────────────────
        migrations.CreateModel(
            name='Author',
            fields=[
                ('id',   models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=255, unique=True, db_index=True)),
                ('bio',  models.TextField(blank=True, null=True)),
            ],
        ),
        migrations.CreateModel(
            name='Publisher',
            fields=[
                ('id',      models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('name',    models.CharField(max_length=255, unique=True, db_index=True)),
                ('city',    models.CharField(max_length=100, blank=True, null=True)),
                ('country', models.CharField(max_length=100, blank=True, null=True)),
            ],
        ),

        # ── 2. Book – author CharField → M2M ─────────────────────────────────
        # Rename old CharFields FIRST to free the names, then add normalised FK/M2M
        migrations.RenameField(
            model_name='book',
            old_name='author',
            new_name='author_legacy',
        ),
        migrations.RenameField(
            model_name='book',
            old_name='publisher',
            new_name='publisher_legacy',
        ),
        # Add normalised FK (nullable; populated by data migration below)
        migrations.AddField(
            model_name='book',
            name='publisher',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='books',
                to='backend.publisher',
            ),
        ),
        # Add M2M through table
        migrations.AddField(
            model_name='book',
            name='authors',
            field=models.ManyToManyField(blank=True, related_name='books', to='backend.author'),
        ),

        # ── 3. Book – remove derived / redundant columns ─────────────────────
        migrations.RemoveField(model_name='book', name='hold_expires_at'),
        migrations.RemoveField(model_name='book', name='queue_length'),

        # ── 4. Patron – class_name CharField → FK ────────────────────────────
        migrations.RenameField(
            model_name='patron',
            old_name='class_name',
            new_name='class_name_legacy',
        ),
        migrations.AddField(
            model_name='patron',
            name='library_class',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='patrons',
                to='backend.libraryclass',
            ),
        ),

        # ── 5. Patron – widen PIN field for hashed storage ───────────────────
        migrations.AlterField(
            model_name='patron',
            name='pin',
            field=models.CharField(max_length=128, default=''),
        ),

        # ── 6. Transaction – add FK columns, drop the old librarian_id CharField
        # IMPORTANT: Drop the old CharField FIRST because Django's FK named
        # 'librarian' also maps to a DB column called 'librarian_id'; adding the
        # FK before removing the old column causes a "duplicate column" error.
        migrations.RemoveField(model_name='transaction', name='librarian_id'),
        migrations.AddField(
            model_name='transaction',
            name='loan',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='transactions',
                to='backend.loan',
            ),
        ),
        migrations.AddField(
            model_name='transaction',
            name='book',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='transactions',
                to='backend.book',
            ),
        ),
        migrations.AddField(
            model_name='transaction',
            name='librarian',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='transactions',
                to=settings.AUTH_USER_MODEL,
            ),
        ),

        # ── 7. Hold – queue position ──────────────────────────────────────────
        migrations.AddField(
            model_name='hold',
            name='position',
            field=models.PositiveIntegerField(default=0, db_index=True),
        ),

        # ── 8. Loan – store assessed fine at return time ──────────────────────
        migrations.AddField(
            model_name='loan',
            name='fine_assessed',
            field=models.DecimalField(decimal_places=2, max_digits=8, null=True, blank=True),
        ),

        # ── 9. Data migrations ────────────────────────────────────────────────
        migrations.RunPython(migrate_authors_forward,    migrations.RunPython.noop),
        migrations.RunPython(migrate_publishers_forward, migrations.RunPython.noop),
        migrations.RunPython(migrate_patron_classes_forward, migrations.RunPython.noop),
        migrations.RunPython(hash_patron_pins, migrations.RunPython.noop),

        # ── 10. Drop legacy columns (data already migrated) ───────────────────
        migrations.RemoveField(model_name='book',   name='author_legacy'),
        migrations.RemoveField(model_name='book',   name='publisher_legacy'),
        migrations.RemoveField(model_name='patron', name='class_name_legacy'),
    ]
