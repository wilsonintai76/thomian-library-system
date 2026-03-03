
from django.db.models import Count, Sum, Q
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
from .services import CatalogingService


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
    queryset = Book.objects.all()
    serializer_class = BookSerializer
    lookup_field = 'pk'
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'author', 'isbn', 'barcode_id', 'call_number', 'shelf_location']
    ordering_fields = ['created_at', 'loan_count', 'title']
    ordering = ['-created_at']

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'waterfall_search', 'stats']:
            return [permissions.AllowAny()]
        return [IsLibrarianOrAdmin()]

    @action(detail=False, methods=['get'])
    def waterfall_search(self, request):
        q = request.query_params.get('isbn') or request.query_params.get('q')
        if not q:
            return Response({'error': 'isbn or q parameter required'}, status=400)
        # Check local first
        book = Book.objects.filter(isbn=q).first() or \
               Book.objects.filter(barcode_id=q).first()
        if book:
            return Response({'source': 'LOCAL', 'status': 'FOUND', 'data': BookSerializer(book).data})
        # External metadata fetch
        external_data = CatalogingService.fetch_book_metadata(q)
        if external_data:
            return Response({'source': 'EXTERNAL', 'status': 'FOUND', 'data': external_data})
        return Response({'source': 'ALL', 'status': 'NOT_FOUND'}, status=404)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Dashboard KPI endpoint"""
        active_loans = Loan.objects.filter(returned_at__isnull=True)
        overdue = active_loans.filter(due_date__lt=timezone.now())

        stats_data = Book.objects.aggregate(
            total_items=Count('id'),
            total_value=Sum('value'),
            lost_items=Count('id', filter=Q(status='LOST'))
        )

        # Classification breakdown via database aggregation
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

        # Status breakdown via database aggregation
        status_qs = Book.objects.values('status').annotate(count=Count('id'))
        status_data = {item['status']: item['count'] for item in status_qs}

        # Top readers optimized with selective fields and ordering
        top_readers = Loan.objects.values(
            'patron__student_id', 'patron__full_name'
        ).annotate(
            count=Count('id')
        ).order_by('-count')[:5]

        top_readers_formatted = [
            {'name': item['patron__full_name'], 'id': item['patron__student_id'], 'count': item['count']}
            for item in top_readers
        ]

        return Response({
            'totalItems': stats_data['total_items'],
            'totalValue': float(stats_data['total_value'] or 0),
            'activeLoans': active_loans.count(),
            'overdueLoans': overdue.count(),
            'lostItems': stats_data['lost_items'],
            'itemsByClassification': classification_data,
            'itemsByStatus': status_data,
            'topReaders': top_readers_formatted,
            'topClasses': [],
            'acquisitionHistory': [],
        })

    @action(detail=False, methods=['get'], permission_classes=[IsLibrarianOrAdmin])
    def recent_activity(self, request):
        """Last 20 loan/return events for the dashboard stream"""
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
    queryset = Patron.objects.all()
    serializer_class = PatronSerializer
    permission_classes = [IsLibrarianOrAdmin]
    filter_backends = [filters.SearchFilter]
    search_fields = ['full_name', 'student_id', 'class_name']
    lookup_field = 'student_id'

    def get_permissions(self):
        if self.action in ['verify_pin']:
            return [permissions.AllowAny()]
        return [IsLibrarianOrAdmin()]

    @action(detail=False, methods=['post'])
    def verify_pin(self, request):
        """Kiosk self-service PIN authentication"""
        student_id = request.data.get('student_id')
        pin = request.data.get('pin')
        try:
            patron = Patron.objects.get(student_id=student_id)
            if patron.pin == pin:
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


# ─────────────────────────────────────────────
# CIRCULATION
# ─────────────────────────────────────────────

class CirculationViewSet(viewsets.ViewSet):

    @action(detail=False, methods=['post'], permission_classes=[IsLibrarianOrAdmin])
    def checkout(self, request):
        patron_id = request.data.get('patron_id')
        book_barcodes = request.data.get('books', [])
        try:
            patron = Patron.objects.get(student_id=patron_id)
        except Patron.DoesNotExist:
            return Response({'success': False, 'message': 'Patron not found'}, status=404)
        if patron.is_blocked:
            return Response({'success': False, 'message': 'Patron is blocked'}, status=403)

        success_count = 0
        errors = []
        for barcode in book_barcodes:
            try:
                book = Book.objects.get(barcode_id=barcode)
                rule = CirculationRule.objects.filter(
                    patron_group=patron.patron_group, material_type=book.material_type
                ).first()
                loan_days = rule.loan_days if rule else 14
                due_date = timezone.now() + timedelta(days=loan_days)

                if book.status not in ('AVAILABLE', 'HELD'):
                    errors.append(f"{book.title}: Status {book.status}")
                    continue

                if book.status == 'HELD':
                    # Only the hold owner can pick it up
                    active_hold = Hold.objects.filter(book=book, is_active=True, patron=patron).first()
                    if not active_hold:
                        errors.append(f"{book.title}: On hold for another patron")
                        continue
                    active_hold.delete()

                Loan.objects.create(book=book, patron=patron, due_date=due_date)
                book.status = 'LOANED'
                book.loan_count += 1
                book.save()
                success_count += 1
            except Book.DoesNotExist:
                errors.append(f"Barcode {barcode}: Not found")

        return Response({'success': True, 'processed': success_count, 'errors': errors})

    @action(detail=False, methods=['post'], permission_classes=[IsLibrarianOrAdmin])
    def return_book(self, request):
        barcode = request.data.get('barcode')
        book = Book.objects.filter(barcode_id=barcode).first()
        if not book:
            return Response({'success': False, 'message': 'Book not found'}, status=404)

        loan = Loan.objects.select_related('patron').filter(book=book, returned_at__isnull=True).first()
        fine = Decimal('0.00')
        next_patron = None

        if loan:
            loan.returned_at = timezone.now()
            loan.save()
            if loan.due_date < timezone.now():
                delta = timezone.now() - loan.due_date
                if delta.days > 0:
                    rule = CirculationRule.objects.filter(
                        patron_group=loan.patron.patron_group, material_type=book.material_type
                    ).first()
                    fine_rate = rule.fine_per_day if rule else Decimal('0.50')
                    fine = Decimal(delta.days) * fine_rate
                    loan.patron.fines += fine
                    # Record fine transaction
                    Transaction.objects.create(
                        patron=loan.patron,
                        amount=fine,
                        type='FINE_ASSESSMENT',
                        method='SYSTEM',
                        librarian_id='SYSTEM',
                        book_title=book.title,
                    )
                    loan.patron.save()

        # Check if there's a hold queue — put book on HELD if so
        next_hold = Hold.objects.filter(book=book, is_active=True).order_by('created_at').first()
        if next_hold:
            book.status = 'HELD'
            next_patron = PatronSerializer(next_hold.patron).data
        else:
            book.status = 'AVAILABLE'
        book.save()

        return Response({
            'success': True,
            'fine_amount': float(fine),
            'book': BookSerializer(book).data,
            'patron': PatronSerializer(loan.patron).data if loan else None,
            'next_patron': next_patron,
        })

    @action(detail=False, methods=['post'], permission_classes=[IsLibrarianOrAdmin])
    def renew(self, request):
        barcode = request.data.get('barcode')
        patron_id = request.data.get('patron_id')
        book = Book.objects.filter(barcode_id=barcode).first()
        if not book:
            return Response({'success': False, 'message': 'Book not found'}, status=404)
        loan = Loan.objects.filter(book=book, patron__student_id=patron_id, returned_at__isnull=True).first()
        if not loan:
            return Response({'success': False, 'message': 'Active loan not found'}, status=404)
        rule = CirculationRule.objects.filter(
            patron_group=loan.patron.patron_group, material_type=book.material_type
        ).first()
        loan_days = rule.loan_days if rule else 14
        loan.due_date = timezone.now() + timedelta(days=loan_days)
        loan.renewal_count += 1
        loan.save()
        return Response({'success': True, 'due_date': loan.due_date.isoformat(), 'renewal_count': loan.renewal_count})

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
                'loanId': str(loan.id),
                'patronId': loan.patron.student_id,
                'patronName': loan.patron.full_name,
                'patronGroup': loan.patron.patron_group,
                'bookTitle': loan.book.title,
                'bookBarcode': loan.book.barcode_id or '',
                'dueDate': loan.due_date.date().isoformat(),
                'daysOverdue': delta.days,
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
    queryset = Transaction.objects.select_related('patron').order_by('-timestamp')
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
            'totalCollected': float(summary_data['total_collected'] or 0),
            'totalFinesAssessed': float(summary_data['total_fines'] or 0),
            'totalReplacementsAssessed': float(summary_data['total_replacements'] or 0),
            'totalDamageAssessed': 0,
            'totalWaived': float(summary_data['total_waived'] or 0),
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
