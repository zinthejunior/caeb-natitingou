from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0007_readingclub_members'),
    ]

    operations = [
        migrations.AddField(
            model_name='book',
            name='mots_cles',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='book',
            name='localisation',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='book',
            name='section',
            field=models.CharField(blank=True, max_length=200, null=True),
        ),
    ]
