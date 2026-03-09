
import json
import os
import random
import string
import requests as http_requests
from django.db.models import Count, Sum, Q, F
from django.db import transaction as db_transaction
from rest_framework import viewsets, status, filters, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from .models import Book, Patron, Loan, CirculationRule, LibraryEvent, Hold, SystemAlert, SystemConfiguration, LibraryClass, Transaction
from .serializers import (
    BookSerializer, PatronSerializer, CirculationRuleSerializer,
    LibraryEventSerializer, SystemAlertSerializer, SystemConfigSerializer,
    LibraryClassSerializer, TransactionSerializer, LoanSerializer, HoldSerializer
)
from .services import CatalogingService, CirculationRPC


class IsLibrarianOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated


# ─────────────────────────────────────────────
# AUTH
# ─────────────────────────────────────────────

class AuthViewSet(viewsets.ViewSet):
    permission_classes = [permissions.AllowAny]

    @action(detail=False, methods=['post'])
    def login(self, request):
        # Accept staff_id (numeric) or legacy username field
        username = request.data.get('staff_id') or request.data.get('username')
        password = request.data.get('password')
        user = authenticate(request, username=username, password=password)
        if user:
            token, _ = Token.objects.get_or_create(user=user)
            role = 'ADMINISTRATOR' if user.is_superuser else 'LIBRARIAN'
            return Response({
                'success': True,
                'token': token.key,
                'user': {
                    'id': str(user.id),
                    'username': user.username,
                    'staff_id': user.username,
                    'full_name': f"{user.first_name} {user.last_name}".strip() or user.username,
                    'role': role,
                    'email': user.email or '',
                }
            })
        return Response({'success': False, 'message': 'Invalid credentials'}, status=401)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        user = request.user
        role = 'ADMINISTRATOR' if user.is_superuser else 'LIBRARIAN'
        return Response({
            'success': True,
            'user': {
                'id': str(user.id),
                'username': user.username,
                'staff_id': user.username,
                'full_name': f"{user.first_name} {user.last_name}".strip() or user.username,
                'role': role,
                'email': user.email or '',
            }
        })

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def logout(self, request):
        try:
            request.user.auth_token.delete()
        except Exception:
            pass
        return Response({'success': True})


# ─────────────────────────────────────────────
# SYSTEM CONFIG
# ─────────────────────────────────────────────

class SystemConfigViewSet(viewsets.ViewSet):
    permission_classes = [permissions.AllowAny]

    def list(self, request):
        config, _ = SystemConfiguration.objects.get_or_create(pk=1)
        serializer = SystemConfigSerializer(config)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], permission_classes=[IsLibrarianOrAdmin])
    def update_config(self, request):
        config, _ = SystemConfiguration.objects.get_or_create(pk=1)
        config.logo = request.data.get('logo', config.logo)
        config.map_data = request.data.get('map_data', config.map_data)
        config.save()
        return Response({'success': True})


# ─────────────────────────────────────────────
# CLASSES
# ─────────────────────────────────────────────

class LibraryClassViewSet(viewsets.ModelViewSet):
    queryset = LibraryClass.objects.all()
    serializer_class = LibraryClassSerializer
    permission_classes = [IsLibrarianOrAdmin]


# ─────────────────────────────────────────────
# CATALOG
# ─────────────────────────────────────────────

class CatalogViewSet(viewsets.ModelViewSet):
    queryset = Book.objects.prefetch_related('authors').select_related('publisher')
    serializer_class = BookSerializer
    lookup_field = 'pk'
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    # authors__name replaces the old author CharField
    search_fields = ['title', 'authors__name', 'isbn', 'barcode_id', 'call_number', 'shelf_location']
    ordering_fields = ['created_at', 'loan_count', 'title']
    ordering = ['-created_at']

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'waterfall_search', 'stats', 'by_barcode']:
            return [permissions.AllowAny()]
        return [IsLibrarianOrAdmin()]

    @action(detail=False, methods=['get'], url_path='by_barcode')
    def by_barcode(self, request):
        """Exact barcode/ISBN lookup used by the circulation desk."""
        q = request.query_params.get('q', '').strip()
        if not q:
            return Response({'error': 'q parameter required'}, status=400)
        # Normalise: strip hyphens and spaces so ISBN-10/-13 both match
        q_norm = q.replace('-', '').replace(' ', '')
        book = (
            Book.objects.prefetch_related('authors').select_related('publisher')
            .filter(barcode_id=q).first()
            or Book.objects.prefetch_related('authors').select_related('publisher')
            .filter(isbn=q).first()
            or Book.objects.prefetch_related('authors').select_related('publisher')
            .filter(isbn=q_norm).first()
        )
        if not book:
            return Response({'found': False}, status=404)
        return Response({'found': True, 'book': BookSerializer(book).data})

    @action(detail=False, methods=['get'])
    def waterfall_search(self, request):
        q = request.query_params.get('isbn') or request.query_params.get('q')
        if not q:
            return Response({'error': 'isbn or q parameter required'}, status=400)
        # Normalise ISBN for matching (strip hyphens/spaces)
        q_norm = q.replace('-', '').replace(' ', '')
        book = (
            Book.objects.prefetch_related('authors').select_related('publisher')
            .filter(isbn=q).first()
            or Book.objects.prefetch_related('authors').select_related('publisher')
            .filter(isbn=q_norm).first()
            or Book.objects.prefetch_related('authors').select_related('publisher')
            .filter(barcode_id=q).first()
        )
        if book:
            return Response({'source': 'LOCAL', 'status': 'FOUND', 'data': BookSerializer(book).data})
        external_data = CatalogingService.fetch_book_metadata(q)
        if external_data:
            source = external_data.get('source', 'EXTERNAL')
            # MANUAL stub = all APIs missed; surface it differently so the
            # frontend can open the editor pre-filled with just the ISBN.
            if source == 'MANUAL':
                return Response({'source': 'MANUAL', 'status': 'STUB', 'data': external_data})
            return Response({'source': source, 'status': 'FOUND', 'data': external_data})
        return Response({'source': 'ALL', 'status': 'NOT_FOUND'}, status=404)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        active_loans = Loan.objects.filter(returned_at__isnull=True)
        overdue = active_loans.filter(due_date__lt=timezone.now())

        stats_data = Book.objects.aggregate(
            total_items=Count('id'),
            total_value=Sum('value'),
            lost_items=Count('id', filter=Q(status='LOST'))
        )

        classification_qs = Book.objects.values('classification').annotate(
            count=Count('id'),
            loans=Sum('loan_count')
        )
        classification_data = {
            (item['classification'] or 'General'): {
                'count': item['count'],
                'loans': item['loans']
            } for item in classification_qs
        }

        status_qs = Book.objects.values('status').annotate(count=Count('id'))
        status_data = {item['status']: item['count'] for item in status_qs}

        top_readers = Loan.objects.values(
            'patron__student_id', 'patron__full_name'
        ).annotate(
            count=Count('id')
        ).order_by('-count')[:5]

        top_readers_formatted = [
            {'name': item['patron__full_name'], 'id': item['patron__student_id'], 'count': item['count']}
            for item in top_readers
        ]

        active_patrons = Patron.objects.filter(is_archived=False, is_blocked=False).count()

        return Response({
            'totalItems': stats_data['total_items'],
            'totalValue': float(stats_data['total_value'] or 0),
            'activeLoans': active_loans.count(),
            'overdueLoans': overdue.count(),
            'lostItems': stats_data['lost_items'],
            'activePatrons': active_patrons,
            'itemsByClassification': classification_data,
            'itemsByStatus': status_data,
            'topReaders': top_readers_formatted,
            'topClasses': [],
            'acquisitionHistory': [],
        })

    @action(detail=False, methods=['get'], permission_classes=[IsLibrarianOrAdmin])
    def recent_activity(self, request):
        loans = Loan.objects.select_related('book', 'patron').order_by('-issued_at')[:20]
        activity = []
        for loan in loans:
            if loan.returned_at:
                activity.append({
                    'type': 'RETURN',
                    'patronName': loan.patron.full_name,
                    'bookTitle': loan.book.title,
                    'time': loan.returned_at.strftime('%Y-%m-%dT%H:%M:%SZ'),
                    'librarian': '',
                })
            else:
                activity.append({
                    'type': 'LOAN',
                    'patronName': loan.patron.full_name,
                    'bookTitle': loan.book.title,
                    'time': loan.issued_at.strftime('%Y-%m-%dT%H:%M:%SZ'),
                    'librarian': '',
                })
        return Response(activity)


# ─────────────────────────────────────────────
# PATRONS
# ─────────────────────────────────────────────

class PatronViewSet(viewsets.ModelViewSet):
    queryset = Patron.objects.select_related('library_class')
    serializer_class = PatronSerializer
    permission_classes = [IsLibrarianOrAdmin]
    filter_backends = [filters.SearchFilter]
    # library_class__name replaces the removed class_name CharField
    search_fields = ['full_name', 'student_id', 'library_class__name']
    lookup_field = 'student_id'

    def get_permissions(self):
        if self.action in ['verify_pin']:
            return [permissions.AllowAny()]
        return [IsLibrarianOrAdmin()]

    @action(detail=False, methods=['post'])
    def verify_pin(self, request):
        """Kiosk self-service PIN authentication (uses hashed PIN comparison)."""
        student_id = request.data.get('student_id')
        pin = request.data.get('pin')
        try:
            patron = Patron.objects.get(student_id=student_id)
            if patron.check_pin(pin):
                return Response({'success': True, 'patron': PatronSerializer(patron).data})
            return Response({'success': False, 'message': 'Invalid PIN'}, status=401)
        except Patron.DoesNotExist:
            return Response({'success': False, 'message': 'Patron not found'}, status=404)

    @action(detail=True, methods=['get'], url_path='loans')
    def patron_loans(self, request, student_id=None):
        patron = self.get_object()
        loans = Loan.objects.filter(patron=patron, returned_at__isnull=True).select_related('book')
        return Response(LoanSerializer(loans, many=True).data)

    @action(detail=True, methods=['get'], url_path='transactions')
    def patron_transactions(self, request, student_id=None):
        patron = self.get_object()
        txns = Transaction.objects.filter(patron=patron).order_by('-timestamp')
        return Response(TransactionSerializer(txns, many=True).data)

    @action(detail=True, methods=['get'], url_path='balance', permission_classes=[IsLibrarianOrAdmin])
    def balance(self, request, student_id=None):
        """Live financial balance via fn_patron_balance PostgreSQL RPC."""
        patron = self.get_object()
        return Response(CirculationRPC.patron_balance(patron.pk))


# ─────────────────────────────────────────────
# CIRCULATION
# ─────────────────────────────────────────────

class CirculationViewSet(viewsets.ViewSet):

    @action(detail=False, methods=['post'], permission_classes=[IsLibrarianOrAdmin])
    def checkout(self, request):
        patron_id     = request.data.get('patron_id')
        book_barcodes = request.data.get('books', [])
        try:
            patron = Patron.objects.get(student_id=patron_id)
        except Patron.DoesNotExist:
            return Response({'success': False, 'message': 'Patron not found'}, status=404)
        if patron.is_blocked:
            return Response({'success': False, 'message': 'Patron is blocked'}, status=403)

        # Accept book_ids (preferred, avoids null-barcode collisions) or legacy barcodes
        book_ids = request.data.get('book_ids', [])
        book_barcodes = request.data.get('books', [])

        success_count = 0
        errors = []

        def _checkout_one(book):
            nonlocal success_count
            rule = CirculationRule.objects.filter(
                patron_group=patron.patron_group, material_type=book.material_type
            ).first()
            loan_days = rule.loan_days if rule else 14
            due_date  = timezone.now() + timedelta(days=loan_days)
            with db_transaction.atomic():
                locked = Book.objects.select_for_update().get(pk=book.pk)
                if locked.status not in ('AVAILABLE', 'HELD'):
                    errors.append(f"{locked.title}: Not available (status: {locked.status})")
                else:
                    max_items = rule.max_items if rule else 5
                    active_loans = Loan.objects.filter(patron=patron, returned_at__isnull=True).count()
                    if active_loans >= max_items:
                        errors.append(f"{locked.title}: Loan limit reached ({max_items} items)")
                    else:
                        Hold.objects.filter(book=locked, patron=patron, is_active=True).delete()
                        Loan.objects.create(book=locked, patron=patron, due_date=due_date, renewal_count=0)
                        Book.objects.filter(pk=locked.pk).update(
                            status='LOANED',
                            loan_count=F('loan_count') + 1,
                        )
                        success_count += 1

        for book_id in book_ids:
            try:
                book = Book.objects.get(pk=book_id)
                _checkout_one(book)
            except Book.DoesNotExist:
                errors.append(f"Book ID {book_id}: Not found")
            except Exception as exc:
                errors.append(f"Book ID {book_id}: {str(exc)}")

        for barcode in book_barcodes:
            try:
                if not barcode:
                    errors.append("Skipped item with no barcode")
                    continue
                book = Book.objects.get(barcode_id=barcode)
                _checkout_one(book)
            except Book.DoesNotExist:
                errors.append(f"Barcode {barcode}: Not found")
            except Book.MultipleObjectsReturned:
                errors.append(f"Barcode {barcode}: Multiple books matched — assign a unique barcode sticker")
            except Exception as exc:
                errors.append(f"Barcode {barcode}: {str(exc)}")

        return Response({'success': True, 'processed': success_count, 'errors': errors})

    @action(detail=False, methods=['post'], permission_classes=[IsLibrarianOrAdmin])
    @db_transaction.atomic
    def return_book(self, request):
        raw = (request.data.get('barcode') or '').strip()
        norm = raw.replace('-', '').replace(' ', '')

        book = (
            Book.objects.select_for_update().filter(barcode_id=raw).first()
            or Book.objects.select_for_update().filter(barcode_id=norm).first()
            or Book.objects.select_for_update().filter(isbn=raw).first()
            or Book.objects.select_for_update().filter(isbn=norm).first()
        )
        if not book:
            return Response({'success': False, 'message': 'Book not found'}, status=404)

        loan = Loan.objects.select_related('patron').filter(
            book=book, returned_at__isnull=True
        ).first()
        if not loan:
            return Response({'success': False, 'message': 'No active loan for this book'}, status=400)

        # ── Calculate fine ────────────────────────────────────────────────────
        now = timezone.now()
        rule = CirculationRule.objects.filter(
            patron_group=loan.patron.patron_group, material_type=book.material_type
        ).first()
        fine_per_day = rule.fine_per_day if rule else Decimal('0.50')
        overdue_days = max(0, (now.date() - loan.due_date.date()).days)
        fine_amount = fine_per_day * overdue_days

        loan.returned_at  = now
        loan.fine_assessed = fine_amount
        loan.save(update_fields=['returned_at', 'fine_assessed'])

        # ── Activate next hold if any ─────────────────────────────────────────
        next_hold = Hold.objects.select_related('patron').filter(
            book=book, is_active=False
        ).order_by('position', 'created_at').first()

        if next_hold:
            next_hold.is_active = True
            next_hold.save(update_fields=['is_active'])
            book.status = 'ON_HOLD'
            next_patron = PatronSerializer(next_hold.patron).data
        else:
            book.status = 'AVAILABLE'
            next_patron = None

        book.save(update_fields=['status'])

        return Response({
            'success': True,
            'fine_amount': float(fine_amount),
            'book': BookSerializer(book).data,
            'patron': PatronSerializer(loan.patron).data,
            'next_patron': next_patron,
        })

    @action(detail=False, methods=['post'], permission_classes=[IsLibrarianOrAdmin])
    def renew(self, request):
        raw       = (request.data.get('barcode') or '').strip()
        norm      = raw.replace('-', '').replace(' ', '')
        patron_id = request.data.get('patron_id')
        book = (
            Book.objects.filter(barcode_id=raw).first()
            or Book.objects.filter(barcode_id=norm).first()
            or Book.objects.filter(isbn=raw).first()
            or Book.objects.filter(isbn=norm).first()
        )
        if not book:
            return Response({'success': False, 'message': 'Book not found'}, status=404)
        loan = Loan.objects.filter(book=book, patron__student_id=patron_id, returned_at__isnull=True).first()
        if not loan:
            return Response({'success': False, 'message': 'Active loan not found'}, status=404)
        rule = CirculationRule.objects.filter(
            patron_group=loan.patron.patron_group, material_type=book.material_type
        ).first()
        loan_days = rule.loan_days if rule else 14
        loan.due_date      = timezone.now() + timedelta(days=loan_days)
        loan.renewal_count += 1
        loan.save()
        return Response({
            'success': True,
            'book_title': book.title,
            'due_date': loan.due_date.isoformat(),
            'renewal_count': loan.renewal_count,
        })

    @action(detail=False, methods=['get'], permission_classes=[IsLibrarianOrAdmin])
    def active_loans(self, request):
        loans = Loan.objects.filter(returned_at__isnull=True).select_related('book', 'patron').order_by('due_date')
        return Response(LoanSerializer(loans, many=True).data)

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def overdue(self, request):
        now = timezone.now()
        overdue_loans = Loan.objects.filter(
            returned_at__isnull=True, due_date__lt=now
        ).select_related('book', 'patron').order_by('due_date')
        result = []
        for loan in overdue_loans:
            delta = now - loan.due_date
            result.append({
                'loanId':       str(loan.id),
                'patronId':     loan.patron.student_id,
                'patronName':   loan.patron.full_name,
                'patronGroup':  loan.patron.patron_group,
                'bookTitle':    loan.book.title,
                'bookBarcode':  loan.book.barcode_id or '',
                'dueDate':      loan.due_date.date().isoformat(),
                'daysOverdue':  delta.days,
            })
        return Response(result)


# ─────────────────────────────────────────────
# LOANS (read-only / patron view)
# ─────────────────────────────────────────────

class LoanViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Loan.objects.all().select_related('book', 'patron')
    serializer_class = LoanSerializer
    permission_classes = [IsLibrarianOrAdmin]
    filter_backends = [filters.OrderingFilter]
    ordering = ['-issued_at']


# ─────────────────────────────────────────────
# TRANSACTIONS
# ─────────────────────────────────────────────

class TransactionViewSet(viewsets.ModelViewSet):
    queryset = Transaction.objects.select_related('patron', 'librarian').order_by('-timestamp')
    serializer_class = TransactionSerializer
    permission_classes = [IsLibrarianOrAdmin]
    filter_backends = [filters.OrderingFilter]

    def get_queryset(self):
        qs = super().get_queryset()
        patron_id = self.request.query_params.get('patron_id')
        if patron_id:
            qs = qs.filter(patron__student_id=patron_id)
        return qs

    @action(detail=False, methods=['get'])
    def summary(self, request):
        txns = self.get_queryset()
        summary_data = txns.aggregate(
            total_collected=Sum('amount', filter=Q(type__in=('FINE_PAYMENT', 'REPLACEMENT_PAYMENT'))),
            total_fines=Sum('amount', filter=Q(type__in=('FINE_ASSESSMENT', 'MANUAL_ADJUSTMENT'))),
            total_replacements=Sum('amount', filter=Q(type='REPLACEMENT_ASSESSMENT')),
            total_waived=Sum('amount', filter=Q(type='WAIVE'))
        )
        return Response({
            'totalCollected':           float(summary_data['total_collected']   or 0),
            'totalFinesAssessed':       float(summary_data['total_fines']       or 0),
            'totalReplacementsAssessed':float(summary_data['total_replacements'] or 0),
            'totalDamageAssessed': 0,
            'totalWaived':              float(summary_data['total_waived']      or 0),
        })


# ─────────────────────────────────────────────
# CIRCULATION RULES
# ─────────────────────────────────────────────

class CirculationRuleViewSet(viewsets.ModelViewSet):
    queryset = CirculationRule.objects.all()
    serializer_class = CirculationRuleSerializer
    permission_classes = [IsLibrarianOrAdmin]


# ─────────────────────────────────────────────
# EVENTS
# ─────────────────────────────────────────────

class LibraryEventViewSet(viewsets.ModelViewSet):
    queryset = LibraryEvent.objects.all()
    serializer_class = LibraryEventSerializer
    permission_classes = [permissions.AllowAny]  # Publicly viewable for Kiosk


# ─────────────────────────────────────────────
# ALERTS
# ─────────────────────────────────────────────

class SystemAlertViewSet(viewsets.ModelViewSet):
    serializer_class = SystemAlertSerializer
    permission_classes = [permissions.AllowAny]  # Kiosk can POST alerts

    def get_queryset(self):
        return SystemAlert.objects.filter(is_resolved=False).order_by('-timestamp')

    @action(detail=True, methods=['post'], permission_classes=[IsLibrarianOrAdmin])
    def resolve(self, request, pk=None):
        alert = self.get_object()
        alert.is_resolved = True
        alert.save()
        return Response({'success': True})


# ─────────────────────────────────────────────
# AI PROXY  (Gemini key lives server-side only)
# ─────────────────────────────────────────────

GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'


class GeminiProxyViewSet(viewsets.ViewSet):
    permission_classes = [IsLibrarianOrAdmin]

    @action(detail=False, methods=['post'], url_path='analyze-blueprint')
    def analyze_blueprint(self, request):
        api_key = os.environ.get('GEMINI_API_KEY', '')
        if not api_key:
            return Response({'error': 'Gemini API key not configured on server.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        image_base64 = request.data.get('imageBase64', '')
        level_id = request.data.get('levelId', '')

        # Strip data-URL prefix (e.g. "data:image/jpeg;base64,")
        if ',' in image_base64:
            image_base64 = image_base64.split(',', 1)[1]

        payload = {
            'contents': [{
                'parts': [
                    {'inlineData': {'mimeType': 'image/jpeg', 'data': image_base64}},
                    {'text': (
                        'Analyze this library floor plan and identify all shelving units. '
                        'Return a JSON array where each item has: '
                        'label (string), minDDC (number), maxDDC (number), '
                        'x (number), y (number), width (number), height (number).'
                    )},
                ]
            }],
            'generationConfig': {'responseMimeType': 'application/json'},
        }

        try:
            resp = http_requests.post(
                GEMINI_API_URL,
                params={'key': api_key},
                json=payload,
                timeout=30,
            )
            if resp.status_code == 429:
                return Response({'error': 'QUOTA_EXHAUSTED'}, status=429)
            resp.raise_for_status()
            text = resp.json()['candidates'][0]['content']['parts'][0]['text']
            shelves = json.loads(text)
            rand_id = lambda: ''.join(random.choices(string.ascii_lowercase + string.digits, k=9))
            result = [{**s, 'id': f'shelf_{rand_id()}', 'levelId': level_id} for s in shelves]
            return Response(result)
        except Exception as exc:
            return Response({'error': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

    @action(detail=False, methods=['post'], url_path='chat', permission_classes=[permissions.AllowAny])
    def chat(self, request):
        """
        Patron-facing AI chat assistant.
        Proxies to Gemini with tool support (catalog search, schedule).
        The API key never leaves the server.
        """
        api_key = os.environ.get('GEMINI_API_KEY', '')
        if not api_key:
            return Response({'text': 'The AI assistant is not configured on this server.'})

        message = (request.data.get('message') or '').strip()
        history = request.data.get('history', [])
        if not message:
            return Response({'text': ''}, status=status.HTTP_400_BAD_REQUEST)

        # Build conversation history in Gemini REST format
        contents = [
            {'role': h['role'], 'parts': [{'text': h.get('text', '')}]}
            for h in history
            if h.get('role') in ('user', 'model') and h.get('text')
        ]
        contents.append({'role': 'user', 'parts': [{'text': message}]})

        tools = [{'functionDeclarations': [
            {
                'name': 'search_catalog',
                'description': 'Search the library catalog for books by title, author, or keyword.',
                'parameters': {
                    'type': 'OBJECT',
                    'properties': {'query': {'type': 'STRING', 'description': 'The search term.'}},
                    'required': ['query'],
                },
            },
            {
                'name': 'check_schedule',
                'description': 'Check library events and upcoming schedule.',
                'parameters': {'type': 'OBJECT', 'properties': {}},
            },
        ]}]

        system_instruction = {'parts': [{'text': (
            'You are a helpful and friendly library assistant for St. Thomas Secondary School. '
            'You have access to the library catalog and schedule via tools. '
            'When a user asks about books, ALWAYS use the search_catalog tool. '
            'If a book is AVAILABLE, tell them the shelf location. '
            'If it is LOANED, tell them it is currently out. Be concise.'
        )}]}

        payload = {'system_instruction': system_instruction, 'contents': contents, 'tools': tools}

        try:
            resp = http_requests.post(
                GEMINI_API_URL, params={'key': api_key}, json=payload, timeout=30,
            )
            if resp.status_code == 429:
                return Response({'text': 'I am receiving too many requests right now. Please try again in a moment.'})
            resp.raise_for_status()

            candidate = resp.json().get('candidates', [{}])[0]
            parts = candidate.get('content', {}).get('parts', [])

            # Handle a function call from Gemini
            for part in parts:
                func_call = part.get('functionCall')
                if not func_call:
                    continue

                tool_name = func_call.get('name')
                args = func_call.get('args', {})
                tool_result = {}

                if tool_name == 'search_catalog':
                    query = args.get('query', '')
                    books = (
                        Book.objects
                        .prefetch_related('authors')
                        .filter(
                            Q(title__icontains=query) |
                            Q(authors__name__icontains=query) |
                            Q(ddc_code__icontains=query) |
                            Q(barcode_id=query)
                        )
                        .exclude(status='LOST')
                        .distinct()[:10]
                    )
                    tool_result = {
                        'found_count': books.count(),
                        'books': [
                            {
                                'title': b.title,
                                'author': ', '.join(a.name for a in b.authors.all()),
                                'shelf': b.shelf_location or 'Unknown',
                                'status': b.status,
                                'call_number': b.ddc_code,
                            }
                            for b in books
                        ],
                    }
                elif tool_name == 'check_schedule':
                    events = LibraryEvent.objects.filter(
                        date__gte=timezone.now().date()
                    ).order_by('date')[:5]
                    tool_result = {
                        'events': [
                            {'title': e.title, 'date': str(e.date), 'description': e.description or ''}
                            for e in events
                        ]
                    }

                # Send tool result back to Gemini for the final response
                contents_with_result = contents + [
                    {'role': 'model', 'parts': parts},
                    {'role': 'user', 'parts': [{'functionResponse': {'name': tool_name, 'response': {'result': tool_result}}}]},
                ]
                payload2 = {'system_instruction': system_instruction, 'contents': contents_with_result, 'tools': tools}
                resp2 = http_requests.post(
                    GEMINI_API_URL, params={'key': api_key}, json=payload2, timeout=30,
                )
                resp2.raise_for_status()
                text = (
                    resp2.json()
                    .get('candidates', [{}])[0]
                    .get('content', {})
                    .get('parts', [{}])[0]
                    .get('text', '')
                )
                return Response({'text': text or "I couldn't find what you were looking for."})

            # No function call — direct text response
            text = parts[0].get('text', '') if parts else ''
            return Response({'text': text or "I couldn't process that request."})

        except Exception:
            return Response({'text': "I'm having trouble connecting right now. Please try searching manually."})
