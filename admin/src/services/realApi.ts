/**
 * services/realApi.ts
 * Auth: Supabase Auth (signInWithPassword / getSession / signOut)
 * Data: Django REST API backend (/api/...)
 */

import type {
    Book, Patron, Transaction, AuthUser, MapConfig, LibraryEvent,
    SystemStats, OverdueReportItem, SystemAlert, CirculationRule,
    CheckInResult, CheckoutResult, LibraryClass, Loan, ShelfDefinition,
} from '../types';
import { supabase } from '../lib/supabase';

const API_BASE = '/api';
const SESSION_TOKEN_KEY = 'thomian_session_token';

function getToken(): string | null {
    return localStorage.getItem(SESSION_TOKEN_KEY);
}

function authHeaders(): HeadersInit {
    const token = getToken();
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

// ── Supabase Auth ─────────────────────────────────────────────────────────────

async function fetchProfile(userId: string): Promise<AuthUser | null> {
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, staff_id')
        .eq('id', userId)
        .single();
    if (error || !profile) return null;
    return {
        id: profile.id,
        username: profile.staff_id || profile.email || '',
        full_name: profile.full_name || profile.email || '',
        role: profile.role as 'LIBRARIAN' | 'ADMINISTRATOR',
        email: profile.email,
    };
}

export const mockLogin = async (email: string, password: string): Promise<AuthUser | null> => {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error || !data.user || !data.session) return null;
        localStorage.setItem(SESSION_TOKEN_KEY, data.session.access_token);
        return await fetchProfile(data.user.id);
    } catch {
        return null;
    }
};

export const mockCheckSession = async (): Promise<AuthUser | null> => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return null;
        localStorage.setItem(SESSION_TOKEN_KEY, session.access_token);
        return await fetchProfile(session.user.id);
    } catch {
        return null;
    }
};

export const mockLogout = async (): Promise<void> => {
    await supabase.auth.signOut();
    localStorage.removeItem(SESSION_TOKEN_KEY);
    localStorage.removeItem('thomian_user_profile');
};

export const uploadToR2 = async (file: File): Promise<string | null> => {
    // 1. Get Presigned URL from Edge Function
    const { data: presignData, error } = await supabase.functions.invoke('get-r2-upload-url', {
        body: { fileName: file.name, contentType: file.type }
    });

    if (error || !presignData || !presignData.presignedUrl) {
        console.error("Failed to get R2 presigned URL:", error || presignData?.error);
        return null;
    }

    // 2. Upload file directly to Cloudflare R2
    const uploadReq = await fetch(presignData.presignedUrl, {
        method: 'PUT',
        body: file,
        headers: {
            'Content-Type': file.type,
        }
    });

    if (!uploadReq.ok) {
        console.error("R2 Upload failed:", uploadReq.statusText);
        return null;
    }

    // 3. Return the final public Cloudflare URL
    return presignData.publicUrl;
};

export const mockUpdateAuthUser = async (user: AuthUser): Promise<void> => {
    localStorage.setItem('thomian_user_profile', JSON.stringify(user));
    if (user.id) {
        await supabase
            .from('profiles')
            .update({ full_name: user.full_name, email: user.email })
            .eq('id', user.id);
    }
};

export const mockGetBooks = async (): Promise<Book[]> => list<Book>('/catalog/', undefined, true);
export const mockAddBook = async (book: Partial<Book>): Promise<Book> => request<Book>('POST', '/catalog/', book);
export const mockUpdateBook = async (book: Book): Promise<Book> => request<Book>('PATCH', `/catalog/${book.id}/`, book);
export const mockDeleteBook = async (id: string): Promise<void> => request<void>('DELETE', `/catalog/${id}/`);
export const mockRestoreBook = async (book: Book): Promise<void> => { await request<Book>('POST', '/catalog/', book); };
export const mockSearchBooks = async (query: string): Promise<Book[]> => list<Book>('/catalog/', { search: query }, true);
export const mockGetBookByBarcode = async (barcode: string): Promise<Book | null> => {
    try {
        const res = await request<{ found: boolean; book: Book }>(
            'GET', `/catalog/by_barcode/?q=${encodeURIComponent(barcode.trim())}`, undefined, true,
        );
        return res.found ? res.book : null;
    } catch { return null; }
};
export const mockGetBooksByShelf = async (shelf: string): Promise<Book[]> => {
    const data = await list<Book>('/catalog/', undefined, true);
    return data.filter(b => b.shelf_location === shelf);
};
export const mockGetNewArrivals = async (): Promise<Book[]> => list<Book>('/catalog/', { ordering: '-created_at', page_size: '4' }, true);
export const mockGetTrendingBooks = async (): Promise<Book[]> => list<Book>('/catalog/', { ordering: '-loan_count', page_size: '4' }, true);
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
    // Backend TransactionSerializer accepts patron as student_id string (patron_id field)
    return request<Transaction>('POST', '/transactions/', { ...t, patron: t.patron_id });
};
export const mockGetTransactions = async (): Promise<Transaction[]> => list<Transaction>('/transactions/');
export const mockGetTransactionsByPatron = async (id: string): Promise<Transaction[]> => list<Transaction>('/transactions/', { patron_id: id });
export const mockGetFinancialSummary = async () => request<any>('GET', '/transactions/summary/');

export const initializeNetwork = async (): Promise<string> => 'Network Synchronized';
export const getNetworkStatus = () => ({ mode: 'CLOUD', url: '', isLan: false });

export const mockCheckoutBooks = async (pid: string, b: string[]): Promise<CheckoutResult> => request<CheckoutResult>('POST', '/circulation/checkout/', { patron_id: pid, book_ids: b });
export const mockProcessReturn = async (b: string): Promise<CheckInResult> => {
    const d = await request<any>('POST', '/circulation/return_book/', { barcode: b });
    return { book: d.book, patron: d.patron, fine_amount: d.fine_amount ?? 0, days_overdue: 0, next_patron: d.next_patron };
};
export const mockRenewBook = async (b: string, pid: string): Promise<any> => request('POST', '/circulation/renew/', { barcode: b, patron_id: pid });
export const mockGetActiveLoans = async (): Promise<Loan[]> => list<Loan>('/circulation/active_loans/');
export const mockGetPatronLoans = async (studentId: string): Promise<Loan[]> => list<Loan>(`/patrons/${studentId}/loans/`);

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
    return await request<Book>('POST', `/catalog/${id}/reclassify/`);
};
