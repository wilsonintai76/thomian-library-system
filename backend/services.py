
import requests

class CatalogingService:
    @staticmethod
    def fetch_book_metadata(isbn):
        try:
            url = f"https://openlibrary.org/api/books?bibkeys=ISBN:{isbn}&format=json&jscmd=data"
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                data = response.json()
                key = f"ISBN:{isbn}"
                if key in data:
                    book_data = data[key]
                    return {
                        'isbn': isbn,
                        'title': book_data.get('title', 'Unknown Title'),
                        'author': book_data.get('authors', [{'name': 'Unknown'}])[0]['name'],
                        'cover_url': book_data.get('cover', {}).get('medium'),
                        'marc_metadata': book_data,
                        'ddc_code': book_data.get('identifiers', {}).get('dewey_decimal', ['000.0'])[0]
                    }
        except Exception as e:
            print(f"External Fetch Error: {e}")
        return None

    @staticmethod
    def generate_zpl(book):
        def get_field(obj, field):
            if isinstance(obj, dict): return obj.get(field, '')
            return getattr(obj, field, '')

        author = get_field(book, 'author')
        ddc_code = get_field(book, 'ddc_code')
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
