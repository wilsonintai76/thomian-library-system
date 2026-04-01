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
import type { AppType } from '../../../backend/src/index';

const API_BASE = import.meta.env.VITE_API_BASE as string;
const TOKEN_KEY = 'thomian_session_token';

function getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
}

export const apiClient = hc<AppType>(API_BASE, {
    headers() {
        const token = getToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
    }
});

function authHeaders(): HeadersInit {
    const token = getToken();
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Token ${token}` } : {}),
    };
}

async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    isPublic = false,
): Promise<T> {
    const headers: HeadersInit = isPublic
        ? { 'Content-Type': 'application/json' }
        : authHeaders();

    const res = await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
            const err = await res.json();
            msg = err.message || err.detail || JSON.stringify(err);
        } catch {/* ignore */ }
        throw new Error(msg);
    }

    if (res.status === 204) return undefined as unknown as T;
    return res.json() as Promise<T>;
}

async function list<T>(path: string, params?: Record<string, string>, isPublic = false): Promise<T[]> {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const data = await request<T[] | { results: T[]; count: number }>(
        'GET', `${path}${qs}`, undefined, isPublic,
    );
    if (Array.isArray(data)) return data;
    return (data as { results: T[] }).results;
}

export const mockLogin = async (username: string, password: string): Promise<AuthUser | null> => {
    try {
        const res = await apiClient.auth.login.$post({ json: { staff_id: username, password } });
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
    const res = await request<{ success: boolean; queued: boolean; message?: string }>(
        'POST', '/circulation/place_hold/', { book_id: bookId, patron_id: patronId }
    );
    if (!res.success) throw new Error(res.message || 'Hold failed');
    return { queued: res.queued };
};
export const simulateCatalogWaterfall = async (isbn: string, onUpdate: (s: string, st: string) => void): Promise<Partial<Book> | null> => {
    onUpdate('LOCAL', 'PENDING');
    try {
        const res = await request<{ source: string; status: string; data: Partial<Book> }>('GET', `/catalog/waterfall_search/?isbn=${encodeURIComponent(isbn)}`, undefined, true);
        if (res.status === 'FOUND') {
            if (res.source === 'LOCAL') {
                onUpdate('LOCAL', 'FOUND');
            } else if (res.source === 'Open Library') {
                onUpdate('LOCAL', 'NOT_FOUND');
                onUpdate('OPEN_LIBRARY', 'FOUND');
                onUpdate('GOOGLE_BOOKS', 'NOT_FOUND');
            } else if (res.source === 'Google Books') {
                onUpdate('LOCAL', 'NOT_FOUND');
                onUpdate('OPEN_LIBRARY', 'NOT_FOUND');
                onUpdate('GOOGLE_BOOKS', 'FOUND');
            }

            // If a Dewey code was returned (either from the source or Classify enhancement)
            if (res.data.ddc_code && res.data.ddc_code !== '000') {
                onUpdate('CLASSIFY', 'FOUND');
            }

            return res.data;
        }
        if (res.status === 'STUB') {
            onUpdate('LOCAL', 'NOT_FOUND');
            onUpdate('OPEN_LIBRARY', 'NOT_FOUND');
            onUpdate('GOOGLE_BOOKS', 'STUB');
            
            // Check if Classify found a Dewey for the manual stub
            if (res.data.ddc_code && res.data.ddc_code !== '000') {
                onUpdate('CLASSIFY', 'FOUND');
            } else {
                onUpdate('CLASSIFY', 'NOT_FOUND');
            }
            return res.data;
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
    const res = await apiClient.patrons[':id'].$patch({ param: { id: p.student_id }, json: p as any });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as unknown as Promise<Patron>;
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
        return data.success ? (data.patron as Patron) : null;
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
    if (!res.ok) throw new Error(await res.text());
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
    const d = res.ok ? (await res.json() as any) : {};
    const mapData = d.map_data || {};
    return {
        levels: [],
        shelves: [],
        theme: 'EMERALD',
        cardTemplate: 'TRADITIONAL',
        ...mapData,
        logo: d.logo,
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
    const res = await fetch('/api/ai/analyze-blueprint/', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ imageBase64, levelId }),
    });
    if (res.status === 429) throw new Error('QUOTA_EXHAUSTED');
    if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try { const e = await res.json(); msg = e.error || msg; } catch { /* ignore */ }
        throw new Error(msg);
    }
    return res.json();
};

// ── LAN URL (user preference — stored locally) ───────────────────────────────

const LAN_URL_KEY = 'thomian_lan_url';
export const getLanUrl = (): string => localStorage.getItem(LAN_URL_KEY) || 'http://localhost:8000';
export const setLanUrl = (url: string): void => { localStorage.setItem(LAN_URL_KEY, url); };

// ── Data Export / Import / Factory Reset ─────────────────────────────────────

export const exportSystemData = async (): Promise<string> => {
    const data = await request<object>('GET', '/system-config/export/');
    return JSON.stringify(data, null, 2);
};

export const importSystemData = async (jsonString: string): Promise<boolean> => {
    try {
        const data = JSON.parse(jsonString);
        await request('POST', '/system-config/import/', data);
        return true;
    } catch (e) {
        console.error('Import failed:', e);
        return false;
    }
};

export const performFactoryReset = async (): Promise<void> => {
    await request('POST', '/system-config/factory_reset/');
};

export const reclassifyBook = async (id: string): Promise<Book> => {
    const res = await apiClient.catalog[':id'].reclassify.$post({ param: { id } });
    return res.json() as unknown as Promise<Book>;
};
