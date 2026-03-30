import os
import psycopg2
from psycopg2.extras import RealDictCursor, execute_values
import json
from dotenv import load_dotenv

load_dotenv()

# Source Database (Local/Old Postgres)
SOURCE_DB = {
    'dbname': os.environ.get('DB_NAME', 'thomian_db'),
    'user': os.environ.get('DB_USER', 'postgres'),
    'password': os.environ.get('DB_PASSWORD', 'postgres'),
    'host': os.environ.get('DB_HOST', 'localhost'),
    'port': os.environ.get('DB_PORT', '5432')
}

# Target Database (Supabase)
# Get this from Supabase Dashboard -> Settings -> Database -> Connection String (PSQL)
TARGET_DB_URL = os.environ.get('SUPABASE_DB_URL')

def migrate():
    if not TARGET_DB_URL:
        print("Error: SUPABASE_DB_URL not set in .env")
        return

    try:
        src_conn = psycopg2.connect(**SOURCE_DB)
        tgt_conn = psycopg2.connect(TARGET_DB_URL)
        
        src_cur = src_conn.cursor(cursor_factory=RealDictCursor)
        tgt_cur = tgt_conn.cursor()

        print("--- Migrating Patrons ---")
        src_cur.execute("SELECT * FROM backend_patron")
        patrons = src_cur.fetchall()
        if patrons:
            # Map backend_patron fields to patrons table
            execute_values(tgt_cur, 
                "INSERT INTO patrons (id, first_name, last_name, patron_type, year_level, class_name, email, phone, pin, balance, status, created_at) VALUES %s ON CONFLICT (id) DO NOTHING",
                [(p['id'], p['first_name'], p['last_name'], p['patron_type'], p['year_level'], p['class_name'], p['email'], p['phone'], p['pin'], p['balance'], p['status'], p['created_at']) for p in patrons]
            )
        print(f"Migrated {len(patrons)} patrons.")

        print("--- Migrating Books ---")
        src_cur.execute("SELECT * FROM backend_book")
        books = src_cur.fetchall()
        if books:
            execute_values(tgt_cur,
                "INSERT INTO books (id, isbn, title, author, ddc_code, publisher, pub_year, marc_json, metadata_json, price, location, accession_number, status, created_at) VALUES %s ON CONFLICT (id) DO NOTHING",
                [(b['id'], b['isbn'], b['title'], b['author'], b['ddc_code'], b['publisher'], b['pub_year'], json.dumps(b.get('marc_json', {})), json.dumps(b.get('metadata_json', {})), b['price'], b['location'], b['accession_number'], b['status'], b['created_at']) for b in books]
            )
        print(f"Migrated {len(books)} books.")

        print("--- Migrating Loans ---")
        src_cur.execute("SELECT * FROM backend_loan")
        loans = src_cur.fetchall()
        if loans:
            execute_values(tgt_cur,
                "INSERT INTO loans (id, book_id, patron_id, checkout_at, due_at, returned_at, status, grace_period_days, daily_fine_rate) VALUES %s ON CONFLICT (id) DO NOTHING",
                [(l['id'], l['book_id'], l['patron_id'], l['checkout_at'], l['due_at'], l['returned_at'], l['status'], l['grace_period_days'], l['daily_fine_rate']) for l in loans]
            )
        print(f"Migrated {len(loans)} loans.")

        tgt_conn.commit()
        print("Migration completed successfully!")

    except Exception as e:
        print(f"Migration failed: {e}")
    finally:
        if 'src_conn' in locals(): src_conn.close()
        if 'tgt_conn' in locals(): tgt_conn.close()

if __name__ == "__main__":
    migrate()
