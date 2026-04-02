/**
 * services/api.ts
 * Routes all calls to the real Django REST API backend (PostgreSQL).
 */

import * as real from './realApi';

// ── Offline guard ─────────────────────────────────────────────────────────────
// All write operations pass through requireOnline() before hitting the network.
// Read operations are deliberately left unguarded so cached/in-flight data still works.
function requireOnline(operationLabel: string): void {
    if (!navigator.onLine) {
        throw new Error(`You are offline. "${operationLabel}" is unavailable until the connection is restored.`);
    }
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export const mockLogin = (u: any, p: any) => real.mockLogin(u, p);
export const mockCheckSession = () => real.mockCheckSession();
export const mockLogout = () => real.mockLogout();
export const mockUpdateAuthUser = (u: any) => { requireOnline('Update Profile'); return real.mockUpdateAuthUser(u); };
export const mockResetPassword = (e: string) => real.mockResetPassword(e);
export const mockUpdatePassword = (p: string) => { requireOnline('Change Password'); return real.mockUpdatePassword(p); };
export const uploadToR2 = (f: File) => { requireOnline('Upload File'); return real.uploadToR2(f); };

// ── Books ─────────────────────────────────────────────────────────────────────
export const mockGetBooks = () => real.mockGetBooks();
export const mockAddBook = (b: any) => { requireOnline('Add Book'); return real.mockAddBook(b); };
export const mockUpdateBook = (b: any) => { requireOnline('Update Book'); return real.mockUpdateBook(b); };
export const mockDeleteBook = (id: any) => { requireOnline('Delete Book'); return real.mockDeleteBook(id); };
export const mockRestoreBook = (b: any) => { requireOnline('Restore Book'); return real.mockRestoreBook(b); };
export const mockSearchBooks = (q: any) => real.mockSearchBooks(q);
export const mockGetBookByBarcode = (b: any) => real.mockGetBookByBarcode(b);
export const mockGetBooksByShelf = (s: any) => real.mockGetBooksByShelf(s);
export const mockGetNewArrivals = () => real.mockGetNewArrivals();
export const mockGetTrendingBooks = () => real.mockGetTrendingBooks();
export const mockPlaceHold = (b: any, p: any) => { requireOnline('Place Hold'); return real.mockPlaceHold(b, p); };
export const simulateCatalogWaterfall = (i: any, u: any) => { requireOnline('Catalog Import'); return real.simulateCatalogWaterfall(i, u); };
export const predictDDC = (t: string, a?: string, p?: string) => { requireOnline('AI Prediction'); return real.predictDDC(t, a, p); };
export const getPublishers = () => real.getPublishers();

// ── Patrons ───────────────────────────────────────────────────────────────────
export const mockGetPatrons = () => real.mockGetPatrons();
export const mockGetPatronById = (id: any) => real.mockGetPatronById(id);
export const mockAddPatron = (p: any) => { requireOnline('Add Patron'); return real.mockAddPatron(p); };
export const mockUpdatePatron = (p: any) => { requireOnline('Update Patron'); return real.mockUpdatePatron(p); };
export const mockDeletePatron = (id: any) => { requireOnline('Delete Patron'); return real.mockDeletePatron(id); };
export const mockRestorePatron = (p: any) => { requireOnline('Restore Patron'); return real.mockRestorePatron(p); };
export const mockVerifyPatron = (i: any, p: any) => real.mockVerifyPatron(i, p);

// ── Classes ───────────────────────────────────────────────────────────────────
export const mockGetClasses = () => real.mockGetClasses();
export const mockAddClass = (c: any) => { requireOnline('Add Class'); return real.mockAddClass(c); };
export const mockDeleteClass = (id: any) => { requireOnline('Delete Class'); return real.mockDeleteClass(id); };

// ── Transactions ──────────────────────────────────────────────────────────────
export const mockRecordTransaction = (t: any) => { requireOnline('Record Transaction'); return real.mockRecordTransaction(t); };
export const mockGetTransactions = () => real.mockGetTransactions();
export const mockGetTransactionsByPatron = (id: any) => real.mockGetTransactionsByPatron(id);
export const mockGetFinancialSummary = () => real.mockGetFinancialSummary();

// ── Circulation ───────────────────────────────────────────────────────────────
export const mockCheckoutBooks = (p: any, b: any) => { requireOnline('Check Out'); return real.mockCheckoutBooks(p, b); };
export const mockProcessReturn = (b: any) => { requireOnline('Check In'); return real.mockProcessReturn(b); };
export const mockRenewBook = (b: any, p: any) => { requireOnline('Renew'); return real.mockRenewBook(b, p); };
export const mockGetActiveLoans = () => real.mockGetActiveLoans();
export const mockGetPatronLoans = (id: any) => real.mockGetPatronLoans(id);

// ── Events ────────────────────────────────────────────────────────────────────
export const mockGetEvents = () => real.mockGetEvents();
export const mockAddEvent = (e: any) => { requireOnline('Add Event'); return real.mockAddEvent(e); };
export const mockDeleteEvent = (id: any) => { requireOnline('Delete Event'); return real.mockDeleteEvent(id); };
export const mockUpdateEvent = (e: any) => { requireOnline('Update Event'); return real.mockUpdateEvent(e); };

// ── Alerts ────────────────────────────────────────────────────────────────────
export const mockGetActiveAlerts = () => real.mockGetActiveAlerts();
export const mockResolveAlert = (id: any) => real.mockResolveAlert(id);
export const mockTriggerHelpAlert = (l: any) => real.mockTriggerHelpAlert(l);

// ── Circulation Rules ─────────────────────────────────────────────────────────
export const mockGetCirculationRules = () => real.mockGetCirculationRules();
export const mockUpdateCirculationRule = (r: any) => { requireOnline('Update Policy'); return real.mockUpdateCirculationRule(r); };
export const mockAddCirculationRule = (r: any) => { requireOnline('Add Policy'); return real.mockAddCirculationRule(r); };
export const mockDeleteCirculationRule = (id: any) => { requireOnline('Delete Policy'); return real.mockDeleteCirculationRule(id); };

// ── Map Config ────────────────────────────────────────────────────────────────
export const mockGetMapConfig = () => real.mockGetMapConfig();
export const mockSaveMapConfig = (c: any) => { requireOnline('Save Map'); return real.mockSaveMapConfig(c); };

// ── Stats ─────────────────────────────────────────────────────────────────────
export const mockGetSystemStats = () => real.mockGetSystemStats();
export const mockGetOverdueItems = () => real.mockGetOverdueItems();
export const mockGetRecentActivity = () => real.mockGetRecentActivity();

// ── Network ───────────────────────────────────────────────────────────────────
export const initializeNetwork = () => real.initializeNetwork();
export const getNetworkStatus = () => real.getNetworkStatus();

// ── LAN URL ───────────────────────────────────────────────────────────────────
export const getLanUrl = () => real.getLanUrl();
export const setLanUrl = (u: any) => real.setLanUrl(u);

// ── Data Export / Import / Factory Reset ──────────────────────────────────────
export const exportSystemData = () => real.exportSystemData();
export const importSystemData = (d: any) => { requireOnline('Import Data'); return real.importSystemData(d); };
export const performFactoryReset = async () => {
    requireOnline('Factory Reset');
    await real.performFactoryReset();
    localStorage.removeItem('thomian_auth_token');
    localStorage.removeItem('thomian_user_profile');
    window.location.reload();
};

// ── AI ────────────────────────────────────────────────────────────────────────
export const aiAnalyzeBlueprint = (i: string, l: string) => { requireOnline('AI Analysis'); return real.aiAnalyzeBlueprint(i, l); };
export const fetchAiInsights = () => real.fetchAiInsights();
export const reclassifyBook = (id: string) => { requireOnline('AI Reclassify'); return real.reclassifyBook(id); };

