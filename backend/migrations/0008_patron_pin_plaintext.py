"""
Migration 0008: Change patron PIN from hashed (PBKDF2) to plain-text storage.

The PIN is a 4-digit kiosk access code, not a login credential.
Hashing it prevented the frontend from ever displaying or reprinting it.

All existing hashed PINs are reset to '1234' because they are irreversible —
librarians should reissue registration slips with the new PIN if needed.
"""

from django.db import migrations, models


def reset_hashed_pins(apps, schema_editor):
    """Set every patron's PIN to '1234' since hashed values can't be reversed."""
    Patron = apps.get_model('backend', 'Patron')
    Patron.objects.all().update(pin='1234')


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0007_stored_procedures'),
    ]

    operations = [
        # First reset all values to plain '1234' so they fit in the smaller field
        migrations.RunPython(reset_hashed_pins, migrations.RunPython.noop),
        # Then shrink the column from max_length=128 to max_length=10
        migrations.AlterField(
            model_name='patron',
            name='pin',
            field=models.CharField(default='1234', max_length=10),
        ),
    ]
