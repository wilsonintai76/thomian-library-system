from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0003_db_indexes'),
    ]

    operations = [
        migrations.AddField(
            model_name='patron',
            name='card_name',
            field=models.CharField(blank=True, max_length=60, null=True),
        ),
    ]
