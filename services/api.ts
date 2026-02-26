/**
 * services/api.ts
 * Switcher service that routes calls to either mockApi (Demo) or realApi (Realtime).
 */

import * as mock from './mockApi';
import * as real from './realApi';

// Determine mode from localStorage
export const isDemoMode = (): boolean => {
    return localStorage.getItem('thomian_demo_mode') === 'true';
};

export const setDemoMode = (val: boolean) => {
    localStorage.setItem('thomian_demo_mode', val.toString());
    window.location.reload();
};

const getProvider = () => (isDemoMode() ? mock : real);

// ── Shared Re-exports ────────────────────────────────────────────────────────
export {
    aiAnalyzeBlueprint,
    generateBookZpl,
    generatePatronZpl,
    mockPrintBookLabel,
    mockPrintPatronCard,
    mockBulkPrintPatrons,
    mockBulkPrintLabels,
    exportSystemData,
    importSystemData,
    performFactoryReset,
    getLanUrl,
    setLanUrl,
} from './mockApi';

// ── Dynamic Provider Methods ────────────────────────────────────────────────
export const mockLogin = (u: any, p: any) => getProvider().mockLogin(u, p);
export const mockCheckSession = () => getProvider().mockCheckSession();
export const mockLogout = () => getProvider().mockLogout();
export const mockUpdateAuthUser = (u: any) => getProvider().mockUpdateAuthUser(u);

export const mockGetBooks = () => getProvider().mockGetBooks();
export const mockAddBook = (b: any) => getProvider().mockAddBook(b);
export const mockUpdateBook = (b: any) => getProvider().mockUpdateBook(b);
export const mockDeleteBook = (id: any) => getProvider().mockDeleteBook(id);
export const mockRestoreBook = (b: any) => getProvider().mockRestoreBook(b);
export const mockSearchBooks = (q: any) => getProvider().mockSearchBooks(q);
export const mockGetBookByBarcode = (b: any) => getProvider().mockGetBookByBarcode(b);
export const mockGetBooksByShelf = (s: any) => getProvider().mockGetBooksByShelf(s);
export const mockGetNewArrivals = () => getProvider().mockGetNewArrivals();
export const mockGetTrendingBooks = () => getProvider().mockGetTrendingBooks();
export const mockPlaceHold = (b: any, p: any) => getProvider().mockPlaceHold(b, p);
export const simulateCatalogWaterfall = (i: any, u: any) => getProvider().simulateCatalogWaterfall(i, u);

export const mockGetPatrons = () => getProvider().mockGetPatrons();
export const mockGetPatronById = (id: any) => getProvider().mockGetPatronById(id);
export const mockAddPatron = (p: any) => getProvider().mockAddPatron(p);
export const mockUpdatePatron = (p: any) => getProvider().mockUpdatePatron(p);
export const mockDeletePatron = (id: any) => getProvider().mockDeletePatron(id);
export const mockRestorePatron = (p: any) => getProvider().mockRestorePatron(p);
export const mockVerifyPatron = (i: any, p: any) => getProvider().mockVerifyPatron(i, p);

export const mockGetClasses = () => getProvider().mockGetClasses();
export const mockAddClass = (c: any) => getProvider().mockAddClass(c);
export const mockDeleteClass = (id: any) => getProvider().mockDeleteClass(id);

export const mockRecordTransaction = (t: any) => getProvider().mockRecordTransaction(t);
export const mockGetTransactions = () => getProvider().mockGetTransactions();
export const mockGetTransactionsByPatron = (id: any) => getProvider().mockGetTransactionsByPatron(id);
export const mockGetFinancialSummary = () => getProvider().mockGetFinancialSummary();

export const mockCheckoutBooks = (p: any, b: any) => getProvider().mockCheckoutBooks(p, b);
export const mockProcessReturn = (b: any) => getProvider().mockProcessReturn(b);
export const mockRenewBook = (b: any, p: any) => getProvider().mockRenewBook(b, p);
export const mockGetActiveLoans = () => getProvider().mockGetActiveLoans();

export const mockGetEvents = () => getProvider().mockGetEvents();
export const mockAddEvent = (e: any) => getProvider().mockAddEvent(e);
export const mockDeleteEvent = (id: any) => getProvider().mockDeleteEvent(id);
export const mockUpdateEvent = (e: any) => getProvider().mockUpdateEvent(e);

export const mockGetActiveAlerts = () => getProvider().mockGetActiveAlerts();
export const mockResolveAlert = (id: any) => getProvider().mockResolveAlert(id);
export const mockTriggerHelpAlert = (l: any) => getProvider().mockTriggerHelpAlert(l);

export const mockGetCirculationRules = () => getProvider().mockGetCirculationRules();
export const mockUpdateCirculationRule = (r: any) => getProvider().mockUpdateCirculationRule(r);
export const mockAddCirculationRule = (r: any) => getProvider().mockAddCirculationRule(r);
export const mockDeleteCirculationRule = (id: any) => getProvider().mockDeleteCirculationRule(id);

export const mockGetMapConfig = () => getProvider().mockGetMapConfig();
export const mockSaveMapConfig = (c: any) => getProvider().mockSaveMapConfig(c);

export const mockGetSystemStats = () => getProvider().mockGetSystemStats();
export const mockGetOverdueItems = () => getProvider().mockGetOverdueItems();
export const mockGetRecentActivity = () => getProvider().mockGetRecentActivity();

export const initializeNetwork = () => getProvider().initializeNetwork();
export const getNetworkStatus = () => getProvider().getNetworkStatus();
