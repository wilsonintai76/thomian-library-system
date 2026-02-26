
import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth.models import User
from backend.models import Patron

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

# Inject Users
create_user_and_patron('admin', 'Admin@123', 'System Administrator', 'ADMINISTRATOR', 'ADMIN001')
create_user_and_patron('librarian', 'Lib@123', 'School Librarian', 'LIBRARIAN', 'LIB001')

print("User injection complete.")
