/**
 * services/realApi.ts
 * Auth: Custom JWT Auth
 * Data: Cloudflare D1 via Hono RPC
 */

import type {
    Book, Patron, Transaction, AuthUser, MapConfig, LibraryEvent,
    SystemStats, OverdueReportItem, SystemAlert, CirculationRule,
    CheckInResult, CheckoutResult, LibraryClass, Loan, ShelfDefinition,
} from '../types';
import { hc } from 'hono/client';
import { type AppType } from '../../../backend/src/index';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';
const SESSION_TOKEN_KEY = 'thomian_session_token';

function getToken(): string | null {
    return localStorage.getItem(SESSION_TOKEN_KEY);
}

export const apiClient = hc<AppType>(API_BASE, {
    headers() {
        const token = getToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
    }
}) as any; // Cast to any to bypass path-related type inference issues outside src

// ── Auth ─────────────────────────────────────────────────────────────

export const mockLogin = async (email: string, password: string): Promise<AuthUser | null> => {
    try {
        const res = await apiClient.auth.login.$post({ json: { identifier: email, password } });
        if (!res.ok) return null;
        const data = await res.json() as any;
        if (data.success) {
            localStorage.setItem(SESSION_TOKEN_KEY, data.token);
            return data.user as AuthUser;
        }
    } catch (err) {
        console.error('Auth Error:', err);
    }
    return null;
};

export const mockResetPassword = async (_email: string): Promise<boolean> => {
    // Custom implementation needed or placeholder
    return false;
};

export const mockUpdatePassword = async (_password: string): Promise<{ success: boolean; code?: string }> => {
    return { success: false };
};

export const mockCheckSession = async (): Promise<AuthUser | null> => {
    try {
        const res = await apiClient.auth.me.$get();
        if (!res.ok) {
            // Clear stale / expired token so the login modal appears cleanly
            if (res.status === 401) localStorage.removeItem(SESSION_TOKEN_KEY);
            return null;
        }
        const data = await res.json() as any;
        return data.success ? data.user : null;
    } catch {
        return null;
    }
};

export const mockLogout = async (): Promise<void> => {
    localStorage.removeItem(SESSION_TOKEN_KEY);
    localStorage.removeItem('thomian_user_profile');
};

export const uploadToR2 = async (file: File): Promise<string | null> => {
    try {
        const token = getToken();
        const form = new FormData();
        form.append('file', file);
        const res = await fetch(`${API_BASE}/system/upload`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: form,
        });
        if (!res.ok) {
            const body = await res.text().catch(() => '');
            console.error(`[R2 Upload] HTTP ${res.status}: ${body}`);
            return null;
        }
        const data = await res.json() as { success: boolean; url: string };
        if (!data.success) {
            console.error('[R2 Upload] Backend returned success:false', data);
            return null;
        }
        return data.url;
    } catch (err) {
        console.error('[R2 Upload] fetch error:', err);
        return null;
    }
};

export const mockUpdateAuthUser = async (user: AuthUser): Promise<void> => {
    localStorage.setItem('thomian_user_profile', JSON.stringify(user));
};

// ── Catalog ─────────────────────────────────────────────────────────

export const mockGetBooks = async (): Promise<Book[]> => {
    const res = await apiClient.catalog.$get({ query: {} });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<Book[]>;
};
export const mockAddBook = async (book: Partial<Book>): Promise<Book> => {
    const res = await apiClient.catalog.$post({ json: book as any });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as unknown as Promise<Book>;
};
export const mockUpdateBook = async (book: Book): Promise<Book> => {
    if (!book.id) throw new Error("Missing ID");
    const res = await apiClient.catalog[':id'].$patch({ param: { id: book.id.toString() }, json: book as any });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as unknown as Promise<Book>;
};
export const mockDeleteBook = async (id: string): Promise<void> => {
    const res = await apiClient.catalog[':id'].$delete({ param: { id } });
    if (!res.ok) throw new Error(await res.text());
};
export const mockRestoreBook = async (book: Book): Promise<void> => {
    await mockAddBook(book);
};
export const mockSearchBooks = async (query: string): Promise<Book[]> => {
    const res = await apiClient.catalog.$get({ query: { search: query } });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<Book[]>;
};
export const mockGetBookByBarcode = async (barcode: string): Promise<Book | null> => {
    const res = await apiClient.catalog.barcode[':barcode'].$get({ param: { barcode: barcode.trim() } });
    if (!res.ok) return null;
    return res.json() as unknown as Promise<Book>;
};
export const mockGetBooksByShelf = async (shelf: string): Promise<Book[]> => {
    const res = await apiClient.catalog.by_shelf[':shelf'].$get({ param: { shelf } });
    if (!res.ok) return [];
    return res.json() as Promise<Book[]>;
};
export const mockGetNewArrivals = async (): Promise<Book[]> => {
    const res = await apiClient.catalog.new_arrivals.$get();
    if (!res.ok) return [];
    return res.json() as Promise<Book[]>;
};
export const mockGetTrendingBooks = async (): Promise<Book[]> => {
    const res = await apiClient.catalog.trending.$get();
    if (!res.ok) return [];
    return res.json() as Promise<Book[]>;
};
export const mockPlaceHold = async (bookId: string, patronId: string): Promise<{ queued: boolean }> => {
    const res = await apiClient.circulation.place_hold.$post({ json: { book_id: bookId, patron_id: patronId } });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json() as any;
    return { queued: data.queued };
};
export const simulateCatalogWaterfall = async (isbn: string, onUpdate: (s: string, st: string) => void): Promise<Partial<Book> | null> => {
    onUpdate('LOCAL', 'PENDING');
    try {
        const res = await apiClient.catalog.waterfall_search.$get({ query: { isbn: encodeURIComponent(isbn) } });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json() as any;
        
        if (data.status === 'FOUND') {
            if (data.source === 'LOCAL') {
                onUpdate('LOCAL', 'FOUND');
                onUpdate('OPEN_LIBRARY', 'NOT_FOUND');
                onUpdate('GOOGLE_BOOKS', 'NOT_FOUND');
                onUpdate('CLASSIFY', 'NOT_FOUND');
            } else if (data.source === 'Open Library') {
                onUpdate('LOCAL', 'NOT_FOUND');
                onUpdate('OPEN_LIBRARY', 'FOUND');
                onUpdate('GOOGLE_BOOKS', 'NOT_FOUND');
            } else if (data.source === 'Google Books') {
                onUpdate('LOCAL', 'NOT_FOUND');
                onUpdate('OPEN_LIBRARY', 'NOT_FOUND');
                onUpdate('GOOGLE_BOOKS', 'FOUND');
            }
            if (data.data.ddc_code && data.data.ddc_code !== '000') onUpdate('CLASSIFY', 'FOUND');
            return data.data;
        }
        if (data.status === 'STUB') {
            onUpdate('LOCAL', 'NOT_FOUND');
            onUpdate('OPEN_LIBRARY', 'NOT_FOUND');
            onUpdate('GOOGLE_BOOKS', 'STUB');
            if (data.data.ddc_code && data.data.ddc_code !== '000') onUpdate('CLASSIFY', 'FOUND');
            else onUpdate('CLASSIFY', 'NOT_FOUND');
            return data.data;
        }
    } catch { /* fall through */ }
    onUpdate('LOCAL', 'NOT_FOUND');
    onUpdate('OPEN_LIBRARY', 'NOT_FOUND');
    onUpdate('GOOGLE_BOOKS', 'NOT_FOUND');
    onUpdate('CLASSIFY', 'NOT_FOUND');
    return null;
};

// ── Patrons ─────────────────────────────────────────────────────────

export const mockGetPatrons = async (): Promise<Patron[]> => {
    const res = await apiClient.patrons.$get();
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<Patron[]>;
};
export const mockGetPatronById = async (id: string): Promise<Patron | null> => {
    const res = await apiClient.patrons[':id'].$get({ param: { id } });
    if (!res.ok) return null;
    return res.json() as unknown as Promise<Patron>;
};
export const mockAddPatron = async (p: Partial<Patron>): Promise<Patron> => {
    const res = await apiClient.patrons.$post({ json: p as any });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as unknown as Promise<Patron>;
};
export const mockUpdatePatron = async (p: Partial<Patron>): Promise<Patron> => {
    if (!p.id) throw new Error("Missing ID");
    const res = await apiClient.patrons[':id'].$patch({ param: { id: p.id }, json: p as any });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as unknown as Promise<Patron>;
};
export const mockDeletePatron = async (id: string): Promise<void> => {
    const res = await apiClient.patrons[':id'].$delete({ param: { id } });
    if (!res.ok) throw new Error(await res.text());
};

export const mockRestorePatron = async (p: Patron): Promise<void> => {
    // Re-insert the deleted patron (used for undo-delete)
    await mockAddPatron(p);
};

export const mockVerifyPatron = async (id: string, pin: string): Promise<Patron | null> => {
    try {
        const res = await apiClient.patrons.verify_pin.$post({ json: { student_id: id, pin } });
        if (!res.ok) return null;
        const data = await res.json() as any;
        return data.success ? data.patron : null;
    } catch { return null; }
};

// ── System ──────────────────────────────────────────────────────────

export const mockGetClasses = async (): Promise<LibraryClass[]> => {
    const res = await apiClient.system.classes.$get();
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<LibraryClass[]>;
};
export const mockAddClass = async (c: LibraryClass): Promise<LibraryClass> => {
    const res = await apiClient.system.classes.$post({ json: c as any });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as unknown as Promise<LibraryClass>;
};
export const mockDeleteClass = async (id: string): Promise<void> => {
    const res = await apiClient.system.classes[':id'].$delete({ param: { id } });
    if (!res.ok) throw new Error(await res.text());
};

export const mockRecordTransaction = async (t: Transaction): Promise<Transaction> => {
    const res = await apiClient.transactions.$post({ json: t as any });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as unknown as Promise<Transaction>;
};
export const mockGetTransactions = async (): Promise<Transaction[]> => {
    const res = await apiClient.transactions.$get({ query: {} });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<Transaction[]>;
};
export const mockGetTransactionsByPatron = async (id: string): Promise<Transaction[]> => {
    const res = await apiClient.transactions.$get({ query: { patron_id: id } });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<Transaction[]>;
};
export const mockGetFinancialSummary = async (): Promise<{ total_revenue: number; outstanding_fines: number; transaction_count: number }> => {
    const res = await apiClient.transactions.summary.$get();
    if (!res.ok) throw new Error(await res.text());
    return res.json() as any;
};

// ── Circulation ─────────────────────────────────────────────────────

export const mockCheckoutBooks = async (patronId: string, bookIds: string[]): Promise<CheckoutResult> => {
    const res = await apiClient.circulation.checkout.$post({ json: { patron_id: patronId, book_ids: bookIds } });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as unknown as Promise<CheckoutResult>;
};
export const mockProcessReturn = async (barcode: string): Promise<CheckInResult> => {
    const res = await apiClient.circulation.return_book.$post({ json: { barcode } });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as unknown as Promise<CheckInResult>;
};
export const mockRenewBook = async (barcode: string, patronId: string): Promise<{ success: boolean; due_date?: string; error?: string }> => {
    const res = await apiClient.circulation.renew.$post({ json: { barcode, patron_id: patronId } });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as any;
};
export const mockGetActiveLoans = async (): Promise<Loan[]> => {
    const res = await apiClient.circulation.active_loans.$get();
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json() as any[];
    return (data || []).map(l => ({ ...l, book_title: l.book?.title, patron_name: l.patron?.full_name }));
};
export const mockGetPatronLoans = async (studentId: string): Promise<Loan[]> => {
    const res = await apiClient.circulation.active_loans.$get();
    if (!res.ok) return [];
    const data = await res.json() as any[];
    return (data || []).filter(l => l.patron?.student_id === studentId).map(l => ({ ...l, book_title: l.book?.title, patron_name: l.patron?.full_name }));
};
export const mockGetOverdueLoans = async (): Promise<Loan[]> => {
    const res = await apiClient.circulation.overdue.$get();
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json() as any[];
    return (data || []).map(l => ({ ...l, book_title: l.book?.title, patron_name: l.patron?.full_name }));
};

// ── Events & Alerts ────────────────────────────────────────────────

export const mockGetEvents = async (): Promise<LibraryEvent[]> => {
    const res = await apiClient.system.events.$get();
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<LibraryEvent[]>;
};
export const mockAddEvent = async (e: any): Promise<LibraryEvent> => {
    const res = await apiClient.system.events.$post({ json: e });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as unknown as Promise<LibraryEvent>;
};
export const mockDeleteEvent = async (id: string): Promise<void> => {
    const res = await apiClient.system.events[':id'].$delete({ param: { id } });
    if (!res.ok) throw new Error(await res.text());
};
export const mockUpdateEvent = async (e: any): Promise<LibraryEvent> => {
    const res = await apiClient.system.events[':id'].$patch({ param: { id: e.id }, json: e });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as unknown as Promise<LibraryEvent>;
};

export const mockGetActiveAlerts = async (): Promise<SystemAlert[]> => {
    const res = await apiClient.system.alerts.$get();
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<SystemAlert[]>;
};
export const mockResolveAlert = async (id: string): Promise<void> => {
    const res = await apiClient.system.alerts[':id'].resolve.$post({ param: { id } });
    if (!res.ok) throw new Error(await res.text());
};
export const mockTriggerHelpAlert = async (location: string): Promise<void> => {
    await apiClient.system.alerts.trigger_help.$post({ json: { location } });
};

// ── Rules & Config ──────────────────────────────────────────────────

export const mockGetCirculationRules = async (): Promise<CirculationRule[]> => {
    const res = await apiClient.system.rules.$get();
    if (!res.ok) throw new Error(await res.text());
    return res.json() as any;
};
export const mockUpdateCirculationRule = async (r: any): Promise<CirculationRule> => {
    const res = await apiClient.system.rules[':id'].$patch({ param: { id: r.id }, json: r });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as any;
};
export const mockAddCirculationRule = async (r: any): Promise<CirculationRule> => {
    const res = await apiClient.system.rules.$post({ json: r });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as any;
};
export const mockDeleteCirculationRule = async (id: string): Promise<void> => {
    const res = await apiClient.system.rules[':id'].$delete({ param: { id } });
    if (!res.ok) throw new Error(await res.text());
};

export const mockGetMapConfig = async (): Promise<MapConfig> => {
    const res = await apiClient.system['system-config'].$get();
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json() as any;
    return data.map_data;
};
export const mockSaveMapConfig = async (config: MapConfig): Promise<void> => {
    const res = await apiClient.system['system-config'].update_config.$post({ json: { map_data: config } });
    if (!res.ok) throw new Error(await res.text());
};

export const mockGetSystemStats = async (): Promise<SystemStats> => {
    const res = await apiClient.catalog.stats.$get();
    if (!res.ok) throw new Error(await res.text());
    return res.json() as any;
};
export const mockGetOverdueItems = async (): Promise<OverdueReportItem[]> => {
    const res = await apiClient.circulation.overdue.$get();
    if (!res.ok) throw new Error(await res.text());
    return res.json() as any;
};
export const mockGetRecentActivity = async (): Promise<any[]> => {
    const res = await apiClient.catalog.recent_activity.$get();
    if (!res.ok) throw new Error(await res.text());
    return res.json() as any;
};

// ── Misc ───────────────────────────────────────────────────────────

export const initializeNetwork = async (): Promise<string> => 'Network Synchronized';
export const getNetworkStatus = () => ({ mode: 'CLOUD', url: '', isLan: false });

export const getLanUrl = (): string => localStorage.getItem('thomian_lan_url') || 'http://localhost:8000';
export const setLanUrl = (url: string): void => { localStorage.setItem('thomian_lan_url', url); };

export const exportSystemData = async (): Promise<string> => {
    const token = getToken();
    const res = await fetch(`${API_BASE}/system/export`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Export failed');
    return JSON.stringify(await res.json(), null, 2);
};

export const importSystemData = async (jsonString: string): Promise<boolean> => {
    try {
        const data = JSON.parse(jsonString);
        if (!data?.tables) return false; // Not a full backup envelope
        const token = getToken();
        const res = await fetch(`${API_BASE}/system/import`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(data),
        });
        return res.ok;
    } catch { return false; }
};

export const performFactoryReset = async (): Promise<void> => {
    // Implement on system router if needed
};

export const reclassifyBook = async (id: string): Promise<Book> => {
     // Reclassify logic usually lives in waterfall_search or specialized route
     throw new Error("Not implemented in D1 yet");
};

export const aiAnalyzeBlueprint = async (_imageBase64: string, _level: string): Promise<any> => {
    // AI blueprint analysis — not yet implemented for Cloudflare D1 backend
    throw new Error("aiAnalyzeBlueprint not implemented");
};
