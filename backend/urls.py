
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from .views import (
    CatalogViewSet, CirculationViewSet, AuthViewSet, PatronViewSet,
    CirculationRuleViewSet, LibraryEventViewSet, SystemAlertViewSet,
    SystemConfigViewSet, LibraryClassViewSet, LoanViewSet, TransactionViewSet
)

router = DefaultRouter()
router.register(r'catalog', CatalogViewSet, basename='catalog')
router.register(r'circulation', CirculationViewSet, basename='circulation')
router.register(r'auth', AuthViewSet, basename='auth')
router.register(r'patrons', PatronViewSet, basename='patrons')
router.register(r'classes', LibraryClassViewSet, basename='classes')
router.register(r'system-config', SystemConfigViewSet, basename='system-config')
router.register(r'rules', CirculationRuleViewSet, basename='rules')
router.register(r'events', LibraryEventViewSet, basename='events')
router.register(r'alerts', SystemAlertViewSet, basename='alerts')
router.register(r'loans', LoanViewSet, basename='loans')
router.register(r'transactions', TransactionViewSet, basename='transactions')

urlpatterns = [
    path('api/', include(router.urls)),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
