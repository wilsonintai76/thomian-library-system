
import json
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
            result = cur.fetchone()[0]
            # psycopg2 usually deserialises JSONB automatically; guard against
            # configurations that return raw JSON strings instead.
            if isinstance(result, str):
                return json.loads(result)
            return result

    @staticmethod
    def return_book(book_barcode: str) -> dict:
        """Call fn_return_book(barcode) → JSONB."""
        with connection.cursor() as cur:
            cur.execute("SELECT fn_return_book(%s);", [book_barcode])
            result = cur.fetchone()[0]
            if isinstance(result, str):
                return json.loads(result)
            return result

    @staticmethod
    def patron_balance(patron_pk: int) -> dict:
        """Call fn_patron_balance(patron_pk) → JSONB."""
        with connection.cursor() as cur:
            cur.execute("SELECT fn_patron_balance(%s);", [patron_pk])
            return cur.fetchone()[0]


# ─── Cataloging helpers ───────────────────────────────────────────────────────

class CatalogingService:

    @staticmethod
    def _from_malcat_sru(isbn):
        """
        Query Malaysian Union Catalogue (MALCat / PNM) via SRU (Z39.50 over HTTP).
        Skipped silently when MALCAT_SRU_URL is not set in settings.
        Parses MARCXML using stdlib xml.etree.ElementTree — no extra dependencies.
        """
        import xml.etree.ElementTree as ET
        import re as _re
        from django.conf import settings as _settings
        base_url = getattr(_settings, 'MALCAT_SRU_URL', '').strip()
        if not base_url:
            return None

        params = {
            'operation': 'searchRetrieve',
            'version': '1.1',
            'query': f'dc.identifier={isbn}',
            'maximumRecords': '1',
            'recordSchema': 'marcxml',
        }
        resp = requests.get(base_url, params=params, timeout=10)
        if resp.status_code != 200:
            return None

        SRW  = 'http://www.loc.gov/zing/srw/'
        MARC = 'http://www.loc.gov/MARC21/slim'
        ns   = {'srw': SRW, 'marc': MARC}

        root = ET.fromstring(resp.content)
        num  = root.find('srw:numberOfRecords', ns)
        if num is None or (num.text or '0').strip() == '0':
            return None

        record_data = root.find('.//srw:recordData', ns)
        if record_data is None:
            return None
        marc = record_data.find('marc:record', ns)
        if marc is None:
            return None

        def sf(tag, code):
            df = marc.find(f"marc:datafield[@tag='{tag}']", ns)
            if df is None:
                return ''
            node = df.find(f"marc:subfield[@code='{code}']", ns)
            return (node.text or '').strip() if node is not None else ''

        title     = sf('245', 'a').rstrip(' /:')
        author    = sf('100', 'a').rstrip(' ,.') or sf('700', 'a').rstrip(' ,.')
        publisher = (sf('260', 'b') or sf('264', 'b')).strip(' ,.')
        pub_raw   = sf('260', 'c') or sf('264', 'c')
        pub_year  = ''.join(c for c in pub_raw if c.isdigit())[:4]
        ddc       = sf('082', 'a')
        pages_str = sf('300', 'a')
        pages     = None
        if pages_str:
            m = _re.search(r'(\d+)', pages_str)
            if m:
                pages = int(m.group(1))

        if not title:
            return None

        return {
            'isbn':      isbn,
            'source':    'MALCat',
            'title':     title,
            'author':    author,
            'cover_url': None,     # MARC records carry no cover images
            'ddc_code':  ddc if ddc else '000',
            'publisher': publisher,
            'pub_year':  pub_year,
            'pages':     pages,
        }

    @staticmethod
    def _from_openlibrary(isbn):
        """Try Open Library search API. Returns metadata dict or None."""
        url = (
            f"https://openlibrary.org/search.json?"
            f"isbn={isbn}&limit=1"
            f"&fields=title,author_name,dewey_number,cover_i,"
            f"publisher,first_publish_year,number_of_pages_median,subject"
        )
        resp = requests.get(url, timeout=8)
        if resp.status_code != 200:
            return None
        docs = resp.json().get('docs', [])
        if not docs:
            return None
        doc = docs[0]
        cover_i = doc.get('cover_i')
        ddc_list = doc.get('dewey_number', [])
        authors = doc.get('author_name', ['Unknown'])
        return {
            'isbn': isbn,
            'source': 'Open Library',
            'title': doc.get('title', ''),
            'author': authors[0] if authors else '',
            'cover_url': f"https://covers.openlibrary.org/b/id/{cover_i}-M.jpg" if cover_i else None,
            'ddc_code': ddc_list[0] if ddc_list else '000',
            'publisher': (doc.get('publisher') or [''])[0],
            'pub_year': str(doc.get('first_publish_year', '')),
            'pages': doc.get('number_of_pages_median'),
        }

    @staticmethod
    def _from_google_books(isbn):
        """Try Google Books API — better coverage for Malaysian/Asian publishers."""
        url = f"https://www.googleapis.com/books/v1/volumes?q=isbn:{isbn}&maxResults=1"
        resp = requests.get(url, timeout=8)
        if resp.status_code != 200:
            return None
        items = resp.json().get('items', [])
        if not items:
            return None
        info = items[0].get('volumeInfo', {})
        title = info.get('title', '')
        if not title:
            return None
        authors = info.get('authors', [])
        cover_url = (info.get('imageLinks') or {}).get('thumbnail')
        # Upgrade to HTTPS and ask for a larger thumbnail
        if cover_url:
            cover_url = cover_url.replace('http://', 'https://').replace('&zoom=1', '&zoom=2')
        pub_date = info.get('publishedDate', '')
        pub_year = pub_date[:4] if pub_date else ''
        categories = info.get('categories', [])
        # Google doesn't give DDC; leave as '000' so librarian can fill it in
        return {
            'isbn': isbn,
            'source': 'Google Books',
            'title': title,
            'author': authors[0] if authors else '',
            'cover_url': cover_url,
            'ddc_code': '000',
            'publisher': info.get('publisher', ''),
            'pub_year': pub_year,
            'pages': info.get('pageCount'),
            'language': info.get('language', ''),
            'description': info.get('description', ''),
        }

    @staticmethod
    def fetch_book_metadata(isbn):
        """
        Waterfall: Open Library → Google Books → stub (ISBN prefilled, fields blank).
        Malaysian books (978-967-*) rarely appear on Open Library but Google Books
        covers DBP, PTS, Utusan and other local publishers reasonably well.
        """
        for fetcher in (CatalogingService._from_malcat_sru, CatalogingService._from_openlibrary, CatalogingService._from_google_books):
            try:
                result = fetcher(isbn)
                if result:
                    return result
            except Exception as e:
                print(f"[CatalogingService] {fetcher.__name__} failed: {e}")

        # All APIs missed — return a pre-filled stub so the librarian can still
        # create the record manually without re-typing the ISBN.
        return {
            'isbn': isbn,
            'source': 'MANUAL',
            'title': '',
            'author': '',
            'cover_url': None,
            'ddc_code': '000',
            'publisher': '',
            'pub_year': '',
            'pages': None,
        }

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
