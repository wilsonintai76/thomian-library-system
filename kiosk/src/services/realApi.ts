/**
 * services/realApi.ts
 * Real HTTP client for the Thomian Library Django REST API.
 */

import type {
    Book, Patron, Transaction, AuthUser, MapConfig, LibraryEvent,
    SystemStats, OverdueReportItem, SystemAlert, CirculationRule,
    CheckInResult, CheckoutResult, LibraryClass, Loan, ShelfDefinition,
} from '../types';

import { hc } from 'hono/client';
import type { AppType } from '../../../backend/src/index.ts';

const API_BASE = (import.meta as any).env.VITE_API_BASE as string;
const TOKEN_KEY = 'thomian_session_token';
const CACHE_NAME = 'thomian-lib-v3.5.2';

function getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
}

async function parseApiError(res: Response): Promise<string> {
    try {
        const raw = await res.text();
        if (!raw) return `Request failed (${res.status})`;
        const parsed = JSON.parse(raw) as { error?: string; message?: string };
        return parsed.message || parsed.error || raw;
    } catch {
        return `Request failed (${res.status})`;
    }
}

export const apiClient = hc<AppType>(API_BASE, {
    headers() {
        const token = getToken();
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        return headers;
    }
});

// Legacy fetch helpers removed in favor of typed RPC

export const mockLogin = async (id: string, pin: string): Promise<AuthUser | null> => {
    try {
        const res = await apiClient.auth.login.$post({ json: { identifier: id, password: pin } });
        if (!res.ok) return null;
        const data = await res.json() as any;
        if (data.success) {
            localStorage.setItem(TOKEN_KEY, data.token);
            localStorage.setItem('thomian_user_profile', JSON.stringify(data.user));
            return data.user as AuthUser;
        }
    } catch { /* fall through */ }
    return null;
};

export const mockCheckSession = async (): Promise<AuthUser | null> => {
    const token = getToken();
    if (!token) return null;
    try {
        const res = await apiClient.auth.me.$get();
        if (!res.ok) {
            localStorage.removeItem(TOKEN_KEY);
            return null;
        }
        const data = await res.json() as any;
        return data.success ? (data.user as AuthUser) : null;
    } catch {
        localStorage.removeItem(TOKEN_KEY);
        return null;
    }
};

export const mockLogout = async (): Promise<void> => {
    try { await apiClient.auth.logout.$post(); } catch {/* ignore */ }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('thomian_user_profile');
};

export const mockUpdateAuthUser = async (user: AuthUser): Promise<void> => {
    localStorage.setItem('thomian_user_profile', JSON.stringify(user));
};

export const mockGetBooks = async (): Promise<Book[]> => {
    const res = await apiClient.catalog.$get({ query: {} });
    return res.ok ? (res.json() as Promise<Book[]>) : [];
};
export const mockAddBook = async (book: Partial<Book>): Promise<Book> => {
    const res = await apiClient.catalog.$post({ json: book as any });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as unknown as Promise<Book>;
};
export const mockUpdateBook = async (book: Book): Promise<Book> => {
    const res = await apiClient.catalog[':id'].$patch({ param: { id: book.id.toString() }, json: book as any });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as unknown as Promise<Book>;
};
export const mockDeleteBook = async (id: string): Promise<void> => {
    await apiClient.catalog[':id'].$delete({ param: { id } });
};
export const mockRestoreBook = async (b: Book): Promise<Book> => mockAddBook(b);
export const mockSearchBooks = async (query: string): Promise<Book[]> => {
    const res = await apiClient.catalog.$get({ query: { search: query } });
    return res.ok ? (res.json() as Promise<Book[]>) : [];
};
export const mockGetBookByBarcode = async (barcode: string): Promise<Book | null> => {
    const res = await apiClient.catalog.barcode[':barcode'].$get({ param: { barcode: barcode.trim() } });
    return res.ok ? (res.json() as unknown as Promise<Book>) : null;
};
export const mockGetBooksByShelf = async (shelf: string): Promise<Book[]> => {
    const res = await apiClient.catalog.by_shelf[':shelf'].$get({ param: { shelf } });
    return res.ok ? (res.json() as Promise<Book[]>) : [];
};
export const mockGetNewArrivals = async (): Promise<Book[]> => {
    const res = await apiClient.catalog.new_arrivals.$get();
    return res.ok ? (res.json() as Promise<Book[]>) : [];
};
export const mockGetTrendingBooks = async (): Promise<Book[]> => {
    const res = await apiClient.catalog.trending.$get();
    return res.ok ? (res.json() as Promise<Book[]>) : [];
};
export const mockPlaceHold = async (bookId: string, patronId: string): Promise<{ queued: boolean }> => {
    const res = await apiClient.circulation.place_hold.$post({ json: { book_id: bookId, patron_id: patronId } });
    if (!res.ok) throw new Error('Hold failed');
    const data = await res.json() as { success: boolean; queued: boolean; message?: string };
    if (!data.success) throw new Error(data.message || 'Hold failed');
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
            } else if (data.source === 'Open Library') {
                onUpdate('LOCAL', 'NOT_FOUND');
                onUpdate('OPEN_LIBRARY', 'FOUND');
                onUpdate('GOOGLE_BOOKS', 'NOT_FOUND');
            } else if (data.source === 'Google Books') {
                onUpdate('LOCAL', 'NOT_FOUND');
                onUpdate('OPEN_LIBRARY', 'NOT_FOUND');
                onUpdate('GOOGLE_BOOKS', 'FOUND');
            }

            if (data.data.ddc_code && data.data.ddc_code !== '000') {
                onUpdate('CLASSIFY', 'FOUND');
            }

            return data.data;
        }
        if (data.status === 'STUB') {
            onUpdate('LOCAL', 'NOT_FOUND');
            onUpdate('OPEN_LIBRARY', 'NOT_FOUND');
            onUpdate('GOOGLE_BOOKS', 'STUB');
            
            if (data.data.ddc_code && data.data.ddc_code !== '000') {
                onUpdate('CLASSIFY', 'FOUND');
            } else {
                onUpdate('CLASSIFY', 'NOT_FOUND');
            }
            return data.data;
        }
    } catch { /* fall through */ }
    onUpdate('LOCAL', 'NOT_FOUND');
    onUpdate('OPEN_LIBRARY', 'NOT_FOUND');
    onUpdate('GOOGLE_BOOKS', 'NOT_FOUND');
    onUpdate('CLASSIFY', 'NOT_FOUND');
    return null;
};

export const mockGetPatrons = async (): Promise<Patron[]> => {
    const res = await apiClient.patrons.$get();
    return res.ok ? (res.json() as Promise<Patron[]>) : [];
};
export const mockGetPatronById = async (id: string): Promise<Patron | null> => {
    const res = await apiClient.patrons[':id'].$get({ param: { id } });
    return res.ok ? (res.json() as unknown as Promise<Patron>) : null;
};
export const mockAddPatron = async (p: Patron): Promise<Patron> => {
    const res = await apiClient.patrons.$post({ json: p as any });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as unknown as Promise<Patron>;
};
export const mockUpdatePatron = async (p: Patron): Promise<Patron> => {
    const res = await apiClient.patrons.update_self.$patch({
        json: {
            full_name: p.full_name,
            email: p.email,
            phone: p.phone,
            ...(p.new_pin ? { new_pin: p.new_pin } : {}),
        } as any
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json() as { success: boolean; patron: Patron; message?: string };
    if (!data.success) throw new Error(data.message || 'Update failed');
    // Preserve the session PIN — server never returns it; update to new_pin if it was changed
    return { ...data.patron, pin: p.new_pin ?? p.pin };
};
export const mockDeletePatron = async (id: string): Promise<void> => {
    await apiClient.patrons[':id'].$delete({ param: { id } });
};
export const mockRestorePatron = async (p: Patron): Promise<void> => { await mockAddPatron(p); };
export const mockVerifyPatron = async (id: string, pin: string): Promise<Patron | null> => {
    try {
        const res = await apiClient.patrons.verify_pin.$post({ json: { student_id: id, pin } });
        if (!res.ok) return null;
        const data = await res.json() as any;
        if (!data.success) return null;
        // Store the patron JWT so all subsequent apiClient calls are authenticated
        if (data.token) localStorage.setItem(TOKEN_KEY, data.token);
        // Keep the typed PIN in session memory for local UX (e.g. PIN field hint in Identity Hub)
        return { ...data.patron as Patron, pin } as Patron;
    } catch { return null; }
};

export const mockGetClasses = async (): Promise<LibraryClass[]> => {
    const res = await apiClient.system.classes.$get();
    return res.ok ? (res.json() as Promise<LibraryClass[]>) : [];
};
export const mockAddClass = async (c: LibraryClass): Promise<LibraryClass> => {
    const res = await apiClient.system.classes.$post({ json: c as any });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as unknown as Promise<LibraryClass>;
};
export const mockDeleteClass = async (id: string): Promise<void> => {
    await apiClient.system.classes[':id'].$delete({ param: { id } });
};

export const mockRecordTransaction = async (t: Transaction): Promise<Transaction> => {
    const res = await apiClient.transactions.$post({ json: t as any });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as unknown as Promise<Transaction>;
};
export const mockGetTransactions = async (): Promise<Transaction[]> => {
    const res = await apiClient.transactions.$get({ query: {} });
    return res.ok ? (res.json() as Promise<Transaction[]>) : [];
};
export const mockGetTransactionsByPatron = async (patronId: string): Promise<Transaction[]> => {
    const res = await apiClient.transactions.$get({ query: { patron_id: patronId } });
    return res.ok ? (res.json() as Promise<Transaction[]>) : [];
};
export const mockGetFinancialSummary = async () => {
    const res = await apiClient.transactions.summary.$get();
    return res.ok ? res.json() : { total_revenue: 0, outstanding_fines: 0, transaction_count: 0 };
};

export const initializeNetwork = async (): Promise<string> => 'Network Synchronized';
export const getNetworkStatus = () => ({ mode: 'CLOUD', url: '', isLan: false });

export const mockCheckoutBooks = async (pid: string, b: string[]): Promise<CheckoutResult> => {
    const res = await apiClient.circulation.checkout.$post({ json: { patron_id: pid, book_ids: b } });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as unknown as Promise<CheckoutResult>;
};
export const mockProcessReturn = async (b: string): Promise<CheckInResult> => {
    const res = await apiClient.circulation.return_book.$post({ json: { barcode: b } });
    if (!res.ok) {
        if (res.status === 401) {
            localStorage.removeItem(TOKEN_KEY);
            throw new Error('Session expired. Please authenticate again.');
        }
        throw new Error(await parseApiError(res));
    }
    return await res.json() as unknown as Promise<CheckInResult>;
};
export const mockRenewBook = async (b: string, pid: string): Promise<any> => {
    const res = await apiClient.circulation.renew.$post({ json: { barcode: b, patron_id: pid } });
    return await res.json();
};
export const mockGetActiveLoans = async (): Promise<Loan[]> => {
    const res = await apiClient.circulation.active_loans.$get();
    const data = res.ok ? (await res.json() as any[]) : [];
    return data.map(l => ({ ...l, book_title: l.books?.title, patron_name: l.patrons?.full_name }));
};
export const mockGetPatronLoans = async (studentId: string): Promise<Loan[]> => {
    const res = await apiClient.circulation.patron_loans[':student_id'].$get({ param: { student_id: studentId } });
    return res.ok ? (res.json() as Promise<Loan[]>) : [];
};

export const mockGetEvents = async (): Promise<LibraryEvent[]> => {
    const res = await apiClient.system.events.$get();
    return res.ok ? (res.json() as Promise<LibraryEvent[]>) : [];
};
export const mockAddEvent = async (e: any): Promise<LibraryEvent> => {
    const res = await apiClient.system.events.$post({ json: e });
    return res.json() as any;
};
export const mockDeleteEvent = async (_id: string): Promise<void> => { /* not exposed by backend */ };
export const mockUpdateEvent = async (e: any): Promise<LibraryEvent> => mockAddEvent(e);

export const mockGetActiveAlerts = async (): Promise<SystemAlert[]> => {
    const res = await apiClient.system.alerts.$get();
    return res.ok ? (res.json() as Promise<SystemAlert[]>) : [];
};
export const mockResolveAlert = async (id: string): Promise<void> => {
    await apiClient.system.alerts[':id'].resolve.$post({ param: { id } });
};
export const mockTriggerHelpAlert = async (loc: string): Promise<void> => {
    await apiClient.system.alerts.trigger_help.$post({ json: { location: loc } });
};

export const mockGetCirculationRules = async (): Promise<CirculationRule[]> => {
    const res = await apiClient.system.rules.$get();
    return res.ok ? (res.json() as Promise<CirculationRule[]>) : [];
};
export const mockUpdateCirculationRule = async (r: any): Promise<CirculationRule> => {
    const res = await apiClient.system.rules[':id'].$patch({ param: { id: r.id }, json: r });
    return res.json() as unknown as Promise<CirculationRule>;
};
export const mockAddCirculationRule = async (r: any): Promise<CirculationRule> => {
    const res = await apiClient.system.rules.$post({ json: r });
    return res.json() as unknown as Promise<CirculationRule>;
};
export const mockDeleteCirculationRule = async (id: string): Promise<void> => {
    await apiClient.system.rules[':id'].$delete({ param: { id } });
};

export const mockGetMapConfig = async (): Promise<MapConfig> => {
    const res = await apiClient.system['system-config'].$get();
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json() as any;
    return {
        levels: [],
        shelves: [],
        theme: 'EMERALD',
        cardTemplate: 'TRADITIONAL',
        ...data.map_data,
        logo: data.logo || data.map_data?.logo,
        lastUpdated: new Date().toISOString()
    } as MapConfig;
};
export const mockSaveMapConfig = async (c: MapConfig): Promise<void> => {
    await apiClient.system['update-config'].$post({ json: { map_data: c, logo: c.logo ?? null } as any });
};

export const mockGetSystemStats = async (): Promise<SystemStats> => {
    const res = await apiClient.catalog.stats.$get();
    return res.json() as unknown as Promise<SystemStats>;
};
export const mockGetOverdueItems = async (): Promise<OverdueReportItem[]> => {
    const res = await apiClient.circulation.overdue.$get();
    return res.ok ? (res.json() as Promise<OverdueReportItem[]>) : [];
};
export const mockGetRecentActivity = async () => {
    const res = await apiClient.catalog.recent_activity.$get();
    return res.ok ? res.json() : [];
};

export const aiAnalyzeBlueprint = async (imageBase64: string, levelId: string): Promise<ShelfDefinition[]> => {
    const res = await apiClient.ai['analyze-blueprint'].$post({ json: { imageBase64, levelId } });
    if (res.status === 429) throw new Error('QUOTA_EXHAUSTED');
    if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try { const e = await res.json() as any; msg = e.error || msg; } catch { /* ignore */ }
        throw new Error(msg);
    }
    return res.json() as Promise<ShelfDefinition[]>;
};

// ── LAN URL (user preference — stored locally) ───────────────────────────────

const LAN_URL_KEY = 'thomian_lan_url';
export const getLanUrl = (): string => localStorage.getItem(LAN_URL_KEY) || 'http://localhost:8000';
export const setLanUrl = (url: string): void => { localStorage.setItem(LAN_URL_KEY, url); };

// ── Data Export / Import / Factory Reset ─────────────────────────────────────

export const exportSystemData = async (): Promise<string> => {
    const res = await apiClient.system.export.$get();
    if (!res.ok) throw new Error('Export failed');
    return JSON.stringify(await res.json(), null, 2);
};

export const importSystemData = async (data: any): Promise<boolean> => {
    try {
        const res = await apiClient.system.import.$post({ json: data });
        return res.ok;
    } catch (e) {
        console.error('Import failed:', e);
        return false;
    }
};

export const performFactoryReset = async (): Promise<void> => {
    // Factory reset logic removed from frontend
};

export const reclassifyBook = async (id: string): Promise<Book> => {
    const res = await apiClient.catalog.reclassify[':id'].$post({ param: { id } });
    return res.json() as unknown as Promise<Book>;
};
