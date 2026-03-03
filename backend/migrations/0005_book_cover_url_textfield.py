from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0004_patron_card_name'),
    ]

    operations = [
        migrations.AlterField(
            model_name='book',
            name='cover_url',
            field=models.TextField(blank=True, null=True),
        ),
    ]
