from django.db import migrations, models


class Migration(migrations.Migration):
    """
    Remove unique=True from Book.isbn so the same ISBN can appear on multiple
    rows (one row per physical copy).  barcode_id remains unique and is the
    canonical identifier for each physical item.
    """

    dependencies = [
        ('backend', '0008_patron_pin_plaintext'),
    ]

    operations = [
        migrations.AlterField(
            model_name='book',
            name='isbn',
            field=models.CharField(max_length=13, db_index=True),
        ),
    ]
