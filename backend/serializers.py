
from rest_framework import serializers
from .models import Book, Patron, Loan, CirculationRule, LibraryEvent, SystemAlert, SystemConfiguration, LibraryClass, Hold, Transaction, Author, Publisher


class SystemConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemConfiguration
        fields = ['logo', 'map_data', 'last_updated']


class LibraryClassSerializer(serializers.ModelSerializer):
    class Meta:
        model = LibraryClass
        fields = '__all__'


class AuthorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Author
        fields = ['id', 'name', 'bio']


class PublisherSerializer(serializers.ModelSerializer):
    class Meta:
        model = Publisher
        fields = ['id', 'name', 'city', 'country']


class BookSerializer(serializers.ModelSerializer):
    # Backward-compatible flat fields for the frontend (types.ts: author: string, publisher?: string)
    author = serializers.SerializerMethodField()
    publisher = serializers.SerializerMethodField()

    # Normalised write interfaces
    author_ids    = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Author.objects.all(), source='authors', write_only=True, required=False,
    )
    publisher_id  = serializers.PrimaryKeyRelatedField(
        queryset=Publisher.objects.all(), source='publisher', write_only=True, required=False, allow_null=True,
    )

    # Derived / computed
    queue_length   = serializers.IntegerField(read_only=True)
    hold_expires_at = serializers.SerializerMethodField()

    class Meta:
        model = Book
        exclude = ['authors']   # M2M exposed via 'author' (read) + 'author_ids' (write)

    def get_author(self, obj):
        names = [a.name for a in obj.authors.all()]
        return ', '.join(names) if names else ''

    def get_publisher(self, obj):
        return obj.publisher.name if obj.publisher_id else None

    def get_hold_expires_at(self, obj):
        hold = obj.holds.filter(is_active=True).order_by('position', 'created_at').first()
        if hold and hold.expires_at:
            return hold.expires_at.isoformat()
        return None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Ensure queue_length is serialised (property, not DB column)
        data['queue_length'] = instance.queue_length
        return data

    def _resolve_authors(self, author_str):
        """Convert comma-separated name string to a list of Author objects."""
        authors = []
        for name in [n.strip() for n in (author_str or '').split(',') if n.strip()]:
            obj, _ = Author.objects.get_or_create(name=name)
            authors.append(obj)
        return authors

    def _resolve_publisher(self, publisher_str):
        """Convert publisher name string to a Publisher object."""
        name = (publisher_str or '').strip()
        if not name:
            return None
        pub, _ = Publisher.objects.get_or_create(name=name)
        return pub

    def create(self, validated_data):
        # Accept flat-string author/publisher from MARCEditor when IDs not given
        author_str = self.initial_data.get('author')
        publisher_str = self.initial_data.get('publisher')
        if 'authors' not in validated_data and author_str is not None:
            validated_data['authors'] = self._resolve_authors(author_str)
        if 'publisher' not in validated_data and publisher_str is not None:
            pub = self._resolve_publisher(publisher_str)
            if pub:
                validated_data['publisher'] = pub
        return super().create(validated_data)

    def update(self, instance, validated_data):
        # Accept flat-string author/publisher from MARCEditor when IDs not given
        author_str = self.initial_data.get('author')
        publisher_str = self.initial_data.get('publisher')
        if 'authors' not in validated_data and author_str is not None:
            validated_data['authors'] = self._resolve_authors(author_str)
        if 'publisher' not in validated_data and publisher_str is not None:
            pub = self._resolve_publisher(publisher_str)
            validated_data['publisher'] = pub
        return super().update(instance, validated_data)


class PatronSerializer(serializers.ModelSerializer):
    # Backward-compatible flat string for frontend (types.ts: class_name?: string)
    class_name = serializers.SerializerMethodField()
    # Write FK by ID
    library_class_id = serializers.PrimaryKeyRelatedField(
        queryset=LibraryClass.objects.all(), source='library_class',
        write_only=True, required=False, allow_null=True,
    )
    # Never expose hashed PIN in list/retrieve responses
    pin = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Patron
        fields = '__all__'

    def get_class_name(self, obj):
        return obj.library_class.name if obj.library_class_id else None

    def create(self, validated_data):
        raw_pin = validated_data.pop('pin', '0000')
        patron = super().create(validated_data)
        patron.set_pin(raw_pin)
        patron.save(update_fields=['pin'])
        return patron

    def update(self, instance, validated_data):
        raw_pin = validated_data.pop('pin', None)
        instance = super().update(instance, validated_data)
        if raw_pin is not None:
            instance.set_pin(raw_pin)
            instance.save(update_fields=['pin'])
        return instance


class LoanSerializer(serializers.ModelSerializer):
    book_title   = serializers.CharField(source='book.title',      read_only=True)
    patron_name  = serializers.CharField(source='patron.full_name', read_only=True)
    patron_id    = serializers.CharField(source='patron.student_id', read_only=True)
    book_barcode = serializers.CharField(source='book.barcode_id',  read_only=True)
    book_isbn    = serializers.CharField(source='book.isbn',        read_only=True)
    book_cover_url = serializers.CharField(source='book.cover_url', read_only=True)

    class Meta:
        model = Loan
        fields = [
            'id', 'book', 'patron',
            'book_title', 'patron_name', 'patron_id', 'book_barcode', 'book_isbn', 'book_cover_url',
            'issued_at', 'due_date', 'returned_at', 'renewal_count', 'fine_assessed',
        ]


class HoldSerializer(serializers.ModelSerializer):
    class Meta:
        model = Hold
        fields = '__all__'


class TransactionSerializer(serializers.ModelSerializer):
    patron_name = serializers.CharField(source='patron.full_name',   read_only=True)
    patron_id   = serializers.CharField(source='patron.student_id',  read_only=True)
    # Backward-compatible string field: username when a librarian is linked, 'SYSTEM' otherwise
    librarian_id = serializers.SerializerMethodField()

    class Meta:
        model = Transaction
        fields = [
            'id', 'patron', 'patron_id', 'patron_name',
            'loan', 'book',
            'amount', 'type', 'method', 'timestamp',
            'librarian', 'librarian_id', 'note', 'book_title',
        ]
        read_only_fields = ['patron_id', 'patron_name', 'librarian_id']

    def get_librarian_id(self, obj):
        if obj.librarian_id:
            return obj.librarian.username
        return 'SYSTEM'


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

