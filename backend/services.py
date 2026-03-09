
import requests
from django.db import connection


# ─── PostgreSQL RPC wrappers ──────────────────────────────────────────────────
# Each method calls the corresponding stored function when connected to
# PostgreSQL, and returns None on SQLite (so callers fall back to Python).

class CirculationRPC:
    """Thin Python wrapper around the PostgreSQL stored functions defined in migration 0007."""

    @staticmethod
    def checkout_book(patron_pk: int, book_pk: int, due_date) -> dict:
        """Call fn_checkout_book(patron_pk, book_pk, due_date) → JSONB."""
        with connection.cursor() as cur:
            cur.execute(
                "SELECT fn_checkout_book(%s, %s, %s);",
                [patron_pk, book_pk, due_date],
            )
            return cur.fetchone()[0]

    @staticmethod
    def return_book(book_barcode: str) -> dict:
        """Call fn_return_book(barcode) → JSONB."""
        with connection.cursor() as cur:
            cur.execute("SELECT fn_return_book(%s);", [book_barcode])
            return cur.fetchone()[0]

    @staticmethod
    def patron_balance(patron_pk: int) -> dict:
        """Call fn_patron_balance(patron_pk) → JSONB."""
        with connection.cursor() as cur:
            cur.execute("SELECT fn_patron_balance(%s);", [patron_pk])
            return cur.fetchone()[0]


# ─── Cataloging helpers ───────────────────────────────────────────────────────

class CatalogingService:

    @staticmethod
    def fetch_book_metadata(isbn):
        try:
            # Use the Search API which reliably returns dewey_number
            url = (
                f"https://openlibrary.org/search.json?"
                f"isbn={isbn}&limit=1"
                f"&fields=title,author_name,dewey_number,cover_i,"
                f"publisher,first_publish_year,number_of_pages_median,subject"
            )
            response = requests.get(url, timeout=8)
            if response.status_code == 200:
                data = response.json()
                docs = data.get('docs', [])
                if docs:
                    doc = docs[0]
                    cover_i = doc.get('cover_i')
                    cover_url = f"https://covers.openlibrary.org/b/id/{cover_i}-M.jpg" if cover_i else None
                    ddc_list = doc.get('dewey_number', [])
                    ddc_code = ddc_list[0] if ddc_list else '000'
                    authors = doc.get('author_name', ['Unknown'])
                    return {
                        'isbn': isbn,
                        'title': doc.get('title', 'Unknown Title'),
                        'author': authors[0] if authors else 'Unknown',
                        'cover_url': cover_url,
                        'ddc_code': ddc_code,
                        'publisher': (doc.get('publisher') or [''])[0],
                        'pub_year': str(doc.get('first_publish_year', '')),
                        'pages': doc.get('number_of_pages_median'),
                    }
        except Exception as e:
            print(f"External Fetch Error: {e}")
        return None

    @staticmethod
    def generate_zpl(book):
        def get_field(obj, field):
            if isinstance(obj, dict):
                return obj.get(field, '')
            return getattr(obj, field, '')

        # Support both dicts (external metadata) and normalised Book instances
        if isinstance(book, dict):
            author = book.get('author', '')
        else:
            first_author = book.authors.first()
            author = first_author.name if first_author else ''

        ddc_code   = get_field(book, 'ddc_code')
        barcode_id = get_field(book, 'barcode_id')
        author_short = author[:3].upper() if author else "UNK"
        
        if ddc_code and '.' in ddc_code:
            parts = ddc_code.split('.')
            ddc_main = parts[0]
            ddc_sub = '.' + parts[1]
        else:
            ddc_main = ddc_code if ddc_code else "000"
            ddc_sub = ""
        
        return f"""^XA
^FO30,30^A0N,30,30^FD{ddc_main}^FS
^FO30,65^A0N,30,30^FD{ddc_sub}^FS
^FO30,100^A0N,25,25^FD{author_short}^FS
^FO150,30^BCN,60,Y,N,N^FD{barcode_id}^FS
^XZ"""

    @staticmethod
    def generate_patron_zpl(patron):
        """
        Generates ZPL code for CR80 PVC Identity Cards.
        Optimized for 300dpi Zebra card printers.
        """
        name = getattr(patron, 'full_name', 'Unknown Patron')
        group = getattr(patron, 'patron_group', 'STUDENT')
        pid = getattr(patron, 'student_id', '000000')

        return f"""^XA
^CI28
^FO40,40^A0N,35,35^FDSt. Thomas Library^FS
^FO40,90^A0N,25,25^FDPatron Identity Card^FS
^FO40,160^A0N,50,50^FD{name}^FS
^FO40,225^A0N,30,30^FD{group}^FS
^FO40,300^BCN,100,Y,N,N^FD{pid}^FS
^XZ"""
