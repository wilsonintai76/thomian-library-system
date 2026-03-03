
import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth.models import User
from backend.models import Patron, CirculationRule

def seed_policies():
    rules = [
        ('STUDENT', 'REGULAR', 14, 5, 0.50),
        ('STUDENT', 'REFERENCE', 0, 0, 0.00),
        ('TEACHER', 'REGULAR', 30, 10, 0.25),
        ('TEACHER', 'REFERENCE', 3, 2, 1.00),
        ('LIBRARIAN', 'REGULAR', 90, 50, 0.00),
        ('LIBRARIAN', 'REFERENCE', 14, 5, 0.00),
        ('ADMINISTRATOR', 'REGULAR', 365, 100, 0.00),
    ]
    for group, mat, days, max_i, fine in rules:
        CirculationRule.objects.get_or_create(
            patron_group=group,
            material_type=mat,
            defaults={'loan_days': days, 'max_items': max_i, 'fine_per_day': fine}
        )
    print("Default policies seeded.")

def create_user_and_patron(username, password, full_name, role, student_id):
    if not User.objects.filter(username=username).exists():
        if role == 'ADMINISTRATOR':
            user = User.objects.create_superuser(
                username=username,
                password=password,
                email=f"{username}@thomianlib.com",
                first_name=full_name.split()[0],
                last_name=" ".join(full_name.split()[1:]) if len(full_name.split()) > 1 else ""
            )
        else:
            user = User.objects.create_user(
                username=username,
                password=password,
                email=f"{username}@thomianlib.com",
                first_name=full_name.split()[0],
                last_name=" ".join(full_name.split()[1:]) if len(full_name.split()) > 1 else ""
            )
        print(f"Created User: {username}")
    else:
        user = User.objects.get(username=username)
        user.set_password(password)
        user.save()
        print(f"User {username} already exists. Password updated.")

    # Create corresponding Patron record
    patron, created = Patron.objects.get_or_create(
        student_id=student_id,
        defaults={
            'full_name': full_name,
            'patron_group': role,
            'email': f"{username}@thomianlib.com",
            'pin': '0000'
        }
    )
    if created:
        print(f"Created Patron: {full_name}")
    else:
        patron.full_name = full_name
        patron.patron_group = role
        patron.save()
        print(f"Patron {full_name} already exists. Updated.")

# Inject Data
seed_policies()
create_user_and_patron('20261001', '1234', 'System Administrator', 'ADMINISTRATOR', '20261001')
create_user_and_patron('20261002', '5678', 'School Librarian', 'LIBRARIAN', '20261002')

print("User and Policy injection complete.")
