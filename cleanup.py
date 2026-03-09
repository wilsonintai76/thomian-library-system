import os
import shutil
import subprocess

def cleanup():
    print("--- Thomian Library Data Cleanup ---")
    print("WARNING: This will permanently drop and recreate the PostgreSQL database,")
    print("         clear all migrations, and wipe uploaded media files.")
    confirm = input("Type 'yes' to continue: ")
    if confirm.strip().lower() != 'yes':
        print("Aborted.")
        return

    # 1. Drop and recreate the PostgreSQL database via Docker Compose
    print("\nResetting PostgreSQL database...")
    try:
        subprocess.run(
            ["docker", "compose", "exec", "-T", "db",
             "psql", "-U", "postgres", "-c",
             "DROP DATABASE IF EXISTS thomian_db; CREATE DATABASE thomian_db;"],
            check=True
        )
        print("Database reset complete.")
    except subprocess.CalledProcessError as e:
        print(f"Error resetting database: {e}")
        print("Make sure the Docker stack is running: docker compose up -d")
        return

    # 2. Clear migrations (keep __init__.py)
    migration_dir = os.path.join("backend", "migrations")
    if os.path.exists(migration_dir):
        for f in os.listdir(migration_dir):
            if f != "__init__.py" and f.endswith(".py"):
                os.remove(os.path.join(migration_dir, f))
        print("Cleared backend migrations.")

    # 3. Clear media (uploaded covers, patron photos)
    media_dir = os.path.join("media")
    if os.path.exists(media_dir):
        shutil.rmtree(media_dir)
        os.makedirs(media_dir)
        print("Cleared media uploads.")

    print("\n--- Cleanup Complete ---")
    print("Run these commands to restart:")
    print("1. docker compose run --rm backend python manage.py makemigrations backend")
    print("2. docker compose up --build -d")
    print("3. docker compose exec backend python manage.py createsuperuser")

if __name__ == "__main__":
    cleanup()
