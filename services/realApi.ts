/**
 * services/realApi.ts
 * Real HTTP client for the Thomian Library Django REST API.
 */

import type {
    Book, Patron, Transaction, AuthUser, MapConfig, LibraryEvent,
    SystemStats, OverdueReportItem, SystemAlert, CirculationRule,
    CheckInResult, CheckoutResult, LibraryClass, Loan,
} from '../types';

const API_BASE = '/api';
const TOKEN_KEY = 'thomian_auth_token';

function getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
}

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
        const data = await request<{ success: boolean; token: string; user: AuthUser }>(
            'POST', '/auth/login/', { username, password }, true,
        );
        if (data.success) {
            localStorage.setItem(TOKEN_KEY, data.token);
            localStorage.setItem('thomian_user_profile', JSON.stringify(data.user));
            return data.user;
        }
    } catch { /* fall through */ }
    return null;
};

export const mockCheckSession = async (): Promise<AuthUser | null> => {
    const token = getToken();
    if (!token) return null;
    try {
        const data = await request<{ success: boolean; user: AuthUser }>('GET', '/auth/me/');
        return data.success ? data.user : null;
    } catch {
        localStorage.removeItem(TOKEN_KEY);
        return null;
    }
};

export const mockLogout = async (): Promise<void> => {
    try { await request('POST', '/auth/logout/'); } catch {/* ignore */ }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('thomian_user_profile');
};

export const mockUpdateAuthUser = async (user: AuthUser): Promise<void> => {
    localStorage.setItem('thomian_user_profile', JSON.stringify(user));
};

export const mockGetBooks = async (): Promise<Book[]> => list<Book>('/catalog/', undefined, true);
export const mockAddBook = async (book: Partial<Book>): Promise<Book> => request<Book>('POST', '/catalog/', book);
export const mockUpdateBook = async (book: Book): Promise<Book> => request<Book>('PATCH', `/catalog/${book.id}/`, book);
export const mockDeleteBook = async (id: string): Promise<void> => request<void>('DELETE', `/catalog/${id}/`);
export const mockRestoreBook = async (book: Book): Promise<void> => { await request<Book>('POST', '/catalog/', book); };
export const mockSearchBooks = async (query: string): Promise<Book[]> => list<Book>('/catalog/', { search: query }, true);
export const mockGetBookByBarcode = async (barcode: string): Promise<Book | null> => {
    const results = await list<Book>('/catalog/', { search: barcode }, true);
    return results.find(b => b.barcode_id === barcode) ?? null;
};
export const mockGetBooksByShelf = async (shelf: string): Promise<Book[]> => {
    const data = await list<Book>('/catalog/', undefined, true);
    return data.filter(b => b.shelf_location === shelf);
};
export const mockGetNewArrivals = async (): Promise<Book[]> => list<Book>('/catalog/', { ordering: '-created_at', page_size: '4' }, true);
export const mockGetTrendingBooks = async (): Promise<Book[]> => list<Book>('/catalog/', { ordering: '-loan_count', page_size: '4' }, true);
export const mockPlaceHold = async (bookId: string, patronId: string): Promise<void> => {
    try { await request('POST', '/circulation/place_hold/', { book_id: bookId, patron_id: patronId }); } catch {
        await request('PATCH', `/catalog/${bookId}/`, { status: 'HELD' });
    }
};
export const simulateCatalogWaterfall = async (isbn: string, onUpdate: (s: string, st: string) => void): Promise<Partial<Book> | null> => {
    onUpdate('LOCAL', 'PENDING');
    try {
        const res = await request<{ source: string; status: string; data: Partial<Book> }>('GET', `/catalog/waterfall_search/?isbn=${encodeURIComponent(isbn)}`, undefined, true);
        if (res.status === 'FOUND') {
            onUpdate(res.source, 'FOUND');
            return res.data;
        }
    } catch { /* not found */ }
    onUpdate('LOCAL', 'NOT_FOUND');
    onUpdate('OPEN_LIBRARY', 'NOT_FOUND');
    return null;
};

export const mockGetPatrons = async (): Promise<Patron[]> => list<Patron>('/patrons/');
export const mockGetPatronById = async (id: string): Promise<Patron | null> => {
    try { return await request<Patron>('GET', `/patrons/${encodeURIComponent(id)}/`); } catch { return null; }
};
export const mockAddPatron = async (p: Patron): Promise<Patron> => request<Patron>('POST', '/patrons/', p);
export const mockUpdatePatron = async (p: Patron): Promise<Patron> => request<Patron>('PATCH', `/patrons/${encodeURIComponent(p.student_id)}/`, p);
export const mockDeletePatron = async (id: string): Promise<void> => request<void>('DELETE', `/patrons/${encodeURIComponent(id)}/`);
export const mockRestorePatron = async (p: Patron): Promise<void> => { await request<Patron>('POST', '/patrons/', p); };
export const mockVerifyPatron = async (id: string, pin: string): Promise<Patron | null> => {
    try {
        const d = await request<{ success: boolean; patron: Patron }>('POST', '/patrons/verify_pin/', { student_id: id, pin }, true);
        return d.success ? d.patron : null;
    } catch { return null; }
};

export const mockGetClasses = async (): Promise<LibraryClass[]> => list<LibraryClass>('/classes/');
export const mockAddClass = async (c: Omit<LibraryClass, 'id'>): Promise<LibraryClass> => request<LibraryClass>('POST', '/classes/', c);
export const mockDeleteClass = async (id: string): Promise<void> => request<void>('DELETE', `/classes/${id}/`);

export const mockRecordTransaction = async (t: Omit<Transaction, 'id' | 'timestamp'>): Promise<Transaction> => {
    const p = await mockGetPatronById(t.patron_id);
    if (!p) throw new Error('Patron not found');
    return request<Transaction>('POST', '/transactions/', { ...t, patron: p.student_id });
};
export const mockGetTransactions = async (): Promise<Transaction[]> => list<Transaction>('/transactions/');
export const mockGetTransactionsByPatron = async (id: string): Promise<Transaction[]> => list<Transaction>('/transactions/', { patron_id: id });
export const mockGetFinancialSummary = async () => request<any>('GET', '/transactions/summary/');

export const initializeNetwork = async (): Promise<string> => 'Network Synchronized';
export const getNetworkStatus = () => ({ mode: 'CLOUD', url: '', isLan: false });

export const mockCheckoutBooks = async (pid: string, b: string[]): Promise<CheckoutResult> => request<CheckoutResult>('POST', '/circulation/checkout/', { patron_id: pid, books: b });
export const mockProcessReturn = async (b: string): Promise<CheckInResult> => {
    const d = await request<any>('POST', '/circulation/return_book/', { barcode: b });
    return { book: d.book, patron: d.patron, fine_amount: d.fine_amount ?? 0, days_overdue: 0, next_patron: d.next_patron };
};
export const mockRenewBook = async (b: string, pid: string): Promise<any> => request('POST', '/circulation/renew/', { barcode: b, patron_id: pid });
export const mockGetActiveLoans = async (): Promise<Loan[]> => list<Loan>('/circulation/active_loans/');

export const mockGetEvents = async (): Promise<LibraryEvent[]> => list<LibraryEvent>('/events/', undefined, true);
export const mockAddEvent = async (e: any): Promise<LibraryEvent> => request<LibraryEvent>('POST', '/events/', e);
export const mockDeleteEvent = async (id: string): Promise<void> => request<void>('DELETE', `/events/${id}/`);
export const mockUpdateEvent = async (e: any): Promise<LibraryEvent> => request<LibraryEvent>('PATCH', `/events/${e.id}/`, e);

export const mockGetActiveAlerts = async (): Promise<SystemAlert[]> => list<SystemAlert>('/alerts/', undefined, true);
export const mockResolveAlert = async (id: string): Promise<void> => {
    try { await request('POST', `/alerts/${id}/resolve/`); } catch { await request('PATCH', `/alerts/${id}/`, { is_resolved: true }); }
};
export const mockTriggerHelpAlert = async (loc: string): Promise<void> => {
    await request('POST', '/alerts/', { message: 'Assistance Requested at Kiosk', location: loc }, true);
};

export const mockGetCirculationRules = async (): Promise<CirculationRule[]> => list<CirculationRule>('/rules/');
export const mockUpdateCirculationRule = async (r: any): Promise<CirculationRule> => request<CirculationRule>('PATCH', `/rules/${r.id}/`, r);
export const mockAddCirculationRule = async (r: any): Promise<CirculationRule> => request<CirculationRule>('POST', '/rules/', r);
export const mockDeleteCirculationRule = async (id: string): Promise<void> => request<void>('DELETE', `/rules/${id}/`);

export const mockGetMapConfig = async (): Promise<MapConfig> => {
    const d = await request<any>('GET', '/system-config/', undefined, true);
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
    await request('POST', '/system-config/update_config/', { map_data: c, logo: c.logo ?? null });
};

export const mockGetSystemStats = async (): Promise<SystemStats> => request<SystemStats>('GET', '/catalog/stats/', undefined, true);
export const mockGetOverdueItems = async (): Promise<OverdueReportItem[]> => request<OverdueReportItem[]>('GET', '/circulation/overdue/', undefined, true);
export const mockGetRecentActivity = async () => request<any[]>('GET', '/catalog/recent_activity/');
