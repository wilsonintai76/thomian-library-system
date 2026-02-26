import os
import shutil
import sqlite3
import subprocess

def cleanup():
    print("--- Thomian Library Data Cleanup ---")
    
    # 1. Kill running servers if possible (optional, might fail if permission denied)
    # We assume the user stops the servers manually or the script handles files locked.
    
    # 2. Delete SQLite database
    db_path = "db.sqlite3"
    if os.path.exists(db_path):
        try:
            os.remove(db_path)
            print(f"Removed database: {db_path}")
        except Exception as e:
            print(f"Error removing {db_path}: {e}")
            print("Make sure the Django server is stopped!")
    else:
        print("No database file found.")

    # 3. Clear Migrations (keep __init__.py)
    migration_dir = os.path.join("backend", "migrations")
    if os.path.exists(migration_dir):
        for f in os.listdir(migration_dir):
            if f != "__init__.py" and f.endswith(".py"):
                os.remove(os.path.join(migration_dir, f))
        print("Cleared backend migrations.")

    # 4. Clear Media (uploaded covers)
    media_dir = os.path.join("media")
    if os.path.exists(media_dir):
        shutil.rmtree(media_dir)
        os.makedirs(media_dir)
        print("Cleared media uploads.")

    print("\n--- Cleanup Complete ---")
    print("Run these commands to restart:")
    print("1. python manage.py makemigrations backend")
    print("2. python manage.py migrate")
    print("3. python manage.py createsuperuser")

if __name__ == "__main__":
    cleanup()
