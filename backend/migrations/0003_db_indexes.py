"""
Performance migration: add db_index=True to high-traffic fields
that are filtered or joined on frequently but were missing indexes.

Adds 11 indexes:
  Book        : classification, status, material_type
  Patron      : patron_group, is_blocked, is_archived
  Loan        : returned_at
  Hold        : is_active
  Transaction : type
  LibraryEvent: date
  SystemAlert : is_resolved
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0002_alter_loan_due_date_alter_loan_issued_at_and_more'),
    ]

    operations = [
        # ── Book ─────────────────────────────────────────────────────────
        migrations.AlterField(
            model_name='book',
            name='classification',
            field=models.CharField(default='General', db_index=True, max_length=100),
        ),
        migrations.AlterField(
            model_name='book',
            name='status',
            field=models.CharField(
                choices=[
                    ('AVAILABLE', 'Available'),
                    ('LOANED', 'Loaned'),
                    ('LOST', 'Lost'),
                    ('PROCESSING', 'Processing'),
                    ('HELD', 'Held'),
                ],
                default='AVAILABLE',
                db_index=True,
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name='book',
            name='material_type',
            field=models.CharField(default='REGULAR', db_index=True, max_length=50),
        ),
        # ── Patron ───────────────────────────────────────────────────────
        migrations.AlterField(
            model_name='patron',
            name='patron_group',
            field=models.CharField(
                choices=[
                    ('STUDENT', 'Student'),
                    ('TEACHER', 'Teacher'),
                    ('LIBRARIAN', 'Librarian'),
                    ('ADMINISTRATOR', 'Administrator'),
                ],
                db_index=True,
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name='patron',
            name='is_blocked',
            field=models.BooleanField(default=False, db_index=True),
        ),
        migrations.AlterField(
            model_name='patron',
            name='is_archived',
            field=models.BooleanField(default=False, db_index=True),
        ),
        # ── Loan ─────────────────────────────────────────────────────────
        migrations.AlterField(
            model_name='loan',
            name='returned_at',
            field=models.DateTimeField(blank=True, db_index=True, null=True),
        ),
        # ── Hold ─────────────────────────────────────────────────────────
        migrations.AlterField(
            model_name='hold',
            name='is_active',
            field=models.BooleanField(default=False, db_index=True),
        ),
        # ── Transaction ──────────────────────────────────────────────────
        migrations.AlterField(
            model_name='transaction',
            name='type',
            field=models.CharField(
                choices=[
                    ('FINE_PAYMENT', 'Fine Payment'),
                    ('REPLACEMENT_PAYMENT', 'Replacement Payment'),
                    ('FINE_ASSESSMENT', 'Fine Assessment'),
                    ('REPLACEMENT_ASSESSMENT', 'Replacement Assessment'),
                    ('DAMAGE_ASSESSMENT', 'Damage Assessment'),
                    ('MANUAL_ADJUSTMENT', 'Manual Adjustment'),
                    ('WAIVE', 'Waive'),
                ],
                db_index=True,
                max_length=30,
            ),
        ),
        # ── LibraryEvent ─────────────────────────────────────────────────
        migrations.AlterField(
            model_name='libraryevent',
            name='date',
            field=models.DateField(db_index=True),
        ),
        # ── SystemAlert ──────────────────────────────────────────────────
        migrations.AlterField(
            model_name='systemalert',
            name='is_resolved',
            field=models.BooleanField(default=False, db_index=True),
        ),
    ]
