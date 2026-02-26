
from rest_framework import serializers
from .models import Book, Patron, Loan, CirculationRule, LibraryEvent, SystemAlert, SystemConfiguration, LibraryClass, Hold, Transaction


class SystemConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemConfiguration
        fields = ['logo', 'map_data', 'last_updated']


class LibraryClassSerializer(serializers.ModelSerializer):
    class Meta:
        model = LibraryClass
        fields = '__all__'


class BookSerializer(serializers.ModelSerializer):
    class Meta:
        model = Book
        fields = '__all__'


class PatronSerializer(serializers.ModelSerializer):
    class Meta:
        model = Patron
        fields = '__all__'


class LoanSerializer(serializers.ModelSerializer):
    book_title = serializers.CharField(source='book.title', read_only=True)
    patron_name = serializers.CharField(source='patron.full_name', read_only=True)
    patron_id = serializers.CharField(source='patron.student_id', read_only=True)
    book_barcode = serializers.CharField(source='book.barcode_id', read_only=True)
    book_isbn = serializers.CharField(source='book.isbn', read_only=True)
    book_cover_url = serializers.URLField(source='book.cover_url', read_only=True)

    class Meta:
        model = Loan
        fields = [
            'id', 'book', 'patron',
            'book_title', 'patron_name', 'patron_id', 'book_barcode', 'book_isbn', 'book_cover_url',
            'issued_at', 'due_date', 'returned_at', 'renewal_count'
        ]


class HoldSerializer(serializers.ModelSerializer):
    class Meta:
        model = Hold
        fields = '__all__'


class TransactionSerializer(serializers.ModelSerializer):
    patron_name = serializers.CharField(source='patron.full_name', read_only=True)
    # Expose patron's student_id as patron_id to match frontend types
    patron_id = serializers.CharField(source='patron.student_id', read_only=True)

    class Meta:
        model = Transaction
        fields = [
            'id', 'patron', 'patron_id', 'patron_name',
            'amount', 'type', 'method', 'timestamp', 'librarian_id', 'note', 'book_title'
        ]
        read_only_fields = ['patron_id', 'patron_name']


class CirculationRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = CirculationRule
        fields = '__all__'


class LibraryEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = LibraryEvent
        fields = '__all__'


class SystemAlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemAlert
        fields = '__all__'
