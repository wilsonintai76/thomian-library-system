/**
 * services/api.ts
 * Routes all calls to the real Django REST API backend (PostgreSQL).
 */

import * as real from './realApi';

// ── Auth ─────────────────────────────────────────────────────────────────────
export const mockLogin = (u: any, p: any) => real.mockLogin(u, p);
export const mockCheckSession = () => real.mockCheckSession();
export const mockLogout = () => real.mockLogout();
export const mockUpdateAuthUser = (u: any) => real.mockUpdateAuthUser(u);

// ── Books ─────────────────────────────────────────────────────────────────────
export const mockGetBooks = () => real.mockGetBooks();
export const mockAddBook = (b: any) => real.mockAddBook(b);
export const mockUpdateBook = (b: any) => real.mockUpdateBook(b);
export const mockDeleteBook = (id: any) => real.mockDeleteBook(id);
export const mockRestoreBook = (b: any) => real.mockRestoreBook(b);
export const mockSearchBooks = (q: any) => real.mockSearchBooks(q);
export const mockGetBookByBarcode = (b: any) => real.mockGetBookByBarcode(b);
export const mockGetBooksByShelf = (s: any) => real.mockGetBooksByShelf(s);
export const mockGetNewArrivals = () => real.mockGetNewArrivals();
export const mockGetTrendingBooks = () => real.mockGetTrendingBooks();
export const mockPlaceHold = (b: any, p: any) => real.mockPlaceHold(b, p);
export const simulateCatalogWaterfall = (i: any, u: any) => real.simulateCatalogWaterfall(i, u);

// ── Patrons ───────────────────────────────────────────────────────────────────
export const mockGetPatrons = () => real.mockGetPatrons();
export const mockGetPatronById = (id: any) => real.mockGetPatronById(id);
export const mockAddPatron = (p: any) => real.mockAddPatron(p);
export const mockUpdatePatron = (p: any) => real.mockUpdatePatron(p);
export const mockDeletePatron = (id: any) => real.mockDeletePatron(id);
export const mockRestorePatron = (p: any) => real.mockRestorePatron(p);
export const mockVerifyPatron = (i: any, p: any) => real.mockVerifyPatron(i, p);

// ── Classes ───────────────────────────────────────────────────────────────────
export const mockGetClasses = () => real.mockGetClasses();
export const mockAddClass = (c: any) => real.mockAddClass(c);
export const mockDeleteClass = (id: any) => real.mockDeleteClass(id);

// ── Transactions ──────────────────────────────────────────────────────────────
export const mockRecordTransaction = (t: any) => real.mockRecordTransaction(t);
export const mockGetTransactions = () => real.mockGetTransactions();
export const mockGetTransactionsByPatron = (id: any) => real.mockGetTransactionsByPatron(id);
export const mockGetFinancialSummary = () => real.mockGetFinancialSummary();

// ── Circulation ───────────────────────────────────────────────────────────────
export const mockCheckoutBooks = (p: any, b: any) => real.mockCheckoutBooks(p, b);
export const mockProcessReturn = (b: any) => real.mockProcessReturn(b);
export const mockRenewBook = (b: any, p: any) => real.mockRenewBook(b, p);
export const mockGetActiveLoans = () => real.mockGetActiveLoans();
export const mockGetPatronLoans = (id: any) => real.mockGetPatronLoans(id);

// ── Events ────────────────────────────────────────────────────────────────────
export const mockGetEvents = () => real.mockGetEvents();
export const mockAddEvent = (e: any) => real.mockAddEvent(e);
export const mockDeleteEvent = (id: any) => real.mockDeleteEvent(id);
export const mockUpdateEvent = (e: any) => real.mockUpdateEvent(e);

// ── Alerts ────────────────────────────────────────────────────────────────────
export const mockGetActiveAlerts = () => real.mockGetActiveAlerts();
export const mockResolveAlert = (id: any) => real.mockResolveAlert(id);
export const mockTriggerHelpAlert = (l: any) => real.mockTriggerHelpAlert(l);

// ── Circulation Rules ─────────────────────────────────────────────────────────
export const mockGetCirculationRules = () => real.mockGetCirculationRules();
export const mockUpdateCirculationRule = (r: any) => real.mockUpdateCirculationRule(r);
export const mockAddCirculationRule = (r: any) => real.mockAddCirculationRule(r);
export const mockDeleteCirculationRule = (id: any) => real.mockDeleteCirculationRule(id);

// ── Map Config ────────────────────────────────────────────────────────────────
export const mockGetMapConfig = () => real.mockGetMapConfig();
export const mockSaveMapConfig = (c: any) => real.mockSaveMapConfig(c);

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
export const importSystemData = (d: any) => real.importSystemData(d);
export const performFactoryReset = async () => {
    await real.performFactoryReset();
    localStorage.removeItem('thomian_auth_token');
    localStorage.removeItem('thomian_user_profile');
    window.location.reload();
};

// ── AI ────────────────────────────────────────────────────────────────────────
export const aiAnalyzeBlueprint = (i: string, l: string) => real.aiAnalyzeBlueprint(i, l);
