
import { Book, Patron, Transaction, AuthUser, MapConfig, MapLevel, ShelfDefinition, LibraryEvent, SystemStats, OverdueReportItem, SystemAlert, CirculationRule, CheckInResult, CheckoutResult, LibraryClass, Loan } from '../types';
import { GoogleGenAI, Type } from "@google/genai";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const STORAGE_KEY_BOOKS = "thomian_books";
const STORAGE_KEY_TRANSACTIONS = "thomian_transactions";
const STORAGE_KEY_PATRONS = "thomian_patrons";
const STORAGE_KEY_CLASSES = "thomian_classes";
const STORAGE_KEY_EVENTS = "thomian_events";
const STORAGE_KEY_RULES = "thomian_rules";
const STORAGE_KEY_ALERTS = "thomian_alerts";
const STORAGE_KEY_MAP = "thomian_map_config";
const STORAGE_KEY_USER = "thomian_user_profile";
const STORAGE_KEY_TOKEN = "thomian_auth_token";
const STORAGE_KEY_LAN_URL = "thomian_lan_url";

const SCHOOL_CREST_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 600"><defs><linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="50%" stop-color="black"/><stop offset="50%" stop-color="%23D6001C"/></linearGradient></defs><path d="M250 50Q125 70 50 50L50 280C50 400 250 480 250 480C250 480 450 400 450 280L450 50Q375 70 250 50Z" fill="url(%23g1)"/><g transform="translate(90,80) scale(0.6)"><path d="M50 100L10 100L20 40L50 0L80 40L90 100Z" fill="%23FFD700" stroke="white" stroke-width="2"/></g><g transform="translate(300,80) scale(0.6)"><path d="M10 30L80 30L100 10L110 20L90 40C90 60 70 70 40 70L20 70C10 70 0 60 10 30Z" fill="%23FFD700"/><circle cx="30" cy="15" r="10" fill="orange"/></g><g transform="translate(250,240) rotate(-30)"><rect x="-80" y="-10" width="160" height="20" fill="%23FFD700"/><rect x="60" y="-10" width="20" height="80" fill="%23FFD700"/></g><g transform="translate(20,430)"><path d="M20 50Q230 130 440 50L440 90Q230 170 20 90Z" fill="%23FFD700" stroke="black" stroke-width="2"/><text x="230" y="105" font-family="sans-serif" font-weight="900" font-size="30" text-anchor="middle" fill="black">AIM HIGHER</text></g></svg>`;

const INITIAL_BOOKS: Book[] = [
    { id: 'B-1', title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', isbn: '9780743273565', barcode_id: '3001', ddc_code: 'FIC', classification: 'Fiction', shelf_location: 'Shelf C', status: 'AVAILABLE', material_type: 'REGULAR', value: 15.99, language: 'English', pages: 180, vendor: 'Scribner', loan_count: 45, publisher: 'Scribner', pub_year: '2004', format: 'PAPERBACK', created_at: new Date().toISOString(), summary: 'A novel set in the Jazz Age that tells the tragic story of Jay Gatsby, a self-made millionaire, and his pursuit of Daisy Buchanan, a wealthy young woman whom he loved in his youth.' },
    { id: 'B-2', title: 'Introduction to Physics', author: 'John R. Taylor', isbn: '9781891389603', barcode_id: '1001', ddc_code: '530', classification: 'Science', shelf_location: 'Shelf B', status: 'LOANED', material_type: 'REGULAR', value: 85.00, publisher: 'University Science Books', pub_year: '2005', format: 'HARDCOVER', edition: '2nd', pages: 450, loan_count: 12, created_at: new Date(Date.now() - 86400000).toISOString(), summary: 'A comprehensive introduction to the fundamental concepts of physics, covering mechanics, thermodynamics, electromagnetism, and modern physics.' },
];

const INITIAL_RULES: CirculationRule[] = [
    { id: 'R-1', patron_group: 'STUDENT', material_type: 'REGULAR', loan_days: 14, max_items: 5, fine_per_day: 0.50 },
    { id: 'R-2', patron_group: 'STUDENT', material_type: 'REFERENCE', loan_days: 0, max_items: 0, fine_per_day: 0 },
    { id: 'R-3', patron_group: 'TEACHER', material_type: 'REGULAR', loan_days: 30, max_items: 20, fine_per_day: 0.10 },
];

const INITIAL_CLASSES: LibraryClass[] = [
    { id: 'C-1', name: 'Grade 10-A', grade_level: '10' },
    { id: 'C-2', name: 'Grade 12-B', grade_level: '12' },
    { id: 'C-3', name: 'Grade 8-C', grade_level: '8' },
];

export const mockGetBooks = async (): Promise<Book[]> => {
    const stored = localStorage.getItem(STORAGE_KEY_BOOKS);
    if (stored) return JSON.parse(stored);
    localStorage.setItem(STORAGE_KEY_BOOKS, JSON.stringify(INITIAL_BOOKS));
    return INITIAL_BOOKS;
};

export const mockAddBook = async (book: Partial<Book>): Promise<Book> => {
    const books = await mockGetBooks();
    const newBook = {
        ...book,
        id: `B-${Date.now()}`,
        barcode_id: book.barcode_id || `BC-${Date.now().toString().slice(-6)}`,
        created_at: new Date().toISOString(),
        loan_count: 0,
        status: book.status || 'AVAILABLE',
        material_type: book.material_type || 'REGULAR'
    } as Book;
    books.unshift(newBook);
    localStorage.setItem(STORAGE_KEY_BOOKS, JSON.stringify(books));
    return newBook;
};

export const mockUpdateBook = async (book: Book): Promise<Book> => {
    const books = await mockGetBooks();
    const updated = books.map(b => b.id === book.id ? book : b);
    localStorage.setItem(STORAGE_KEY_BOOKS, JSON.stringify(updated));
    return book;
};

export const mockDeleteBook = async (id: string): Promise<void> => {
    const books = await mockGetBooks();
    const filtered = books.filter(b => b.id !== id);
    localStorage.setItem(STORAGE_KEY_BOOKS, JSON.stringify(filtered));
};

export const mockRestoreBook = async (book: Book): Promise<void> => {
    const books = await mockGetBooks();
    books.unshift(book);
    localStorage.setItem(STORAGE_KEY_BOOKS, JSON.stringify(books));
};

export const mockGetClasses = async (): Promise<LibraryClass[]> => {
    const stored = localStorage.getItem(STORAGE_KEY_CLASSES);
    if (stored) return JSON.parse(stored);
    localStorage.setItem(STORAGE_KEY_CLASSES, JSON.stringify(INITIAL_CLASSES));
    return INITIAL_CLASSES;
};

export const mockAddClass = async (libClass: Omit<LibraryClass, 'id'>): Promise<LibraryClass> => {
    const classes = await mockGetClasses();
    const newClass = { ...libClass, id: `C-${Date.now()}` };
    classes.push(newClass);
    localStorage.setItem(STORAGE_KEY_CLASSES, JSON.stringify(classes));
    return newClass;
};

export const mockDeleteClass = async (id: string): Promise<void> => {
    const classes = await mockGetClasses();
    const filtered = classes.filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEY_CLASSES, JSON.stringify(filtered));
};

export const exportSystemData = async (): Promise<string> => {
    const data = {
        version: "1.0",
        timestamp: new Date().toISOString(),
        books: JSON.parse(localStorage.getItem(STORAGE_KEY_BOOKS) || '[]'),
        patrons: JSON.parse(localStorage.getItem(STORAGE_KEY_PATRONS) || '[]'),
        classes: JSON.parse(localStorage.getItem(STORAGE_KEY_CLASSES) || '[]'),
        transactions: JSON.parse(localStorage.getItem(STORAGE_KEY_TRANSACTIONS) || '[]'),
        events: JSON.parse(localStorage.getItem(STORAGE_KEY_EVENTS) || '[]'),
        rules: JSON.parse(localStorage.getItem(STORAGE_KEY_RULES) || '[]'),
        mapConfig: JSON.parse(localStorage.getItem(STORAGE_KEY_MAP) || 'null'),
    };
    return JSON.stringify(data, null, 2);
};

export const importSystemData = async (jsonString: string): Promise<boolean> => {
    try {
        const data = JSON.parse(jsonString);
        if (!data.books || !data.patrons) throw new Error("Invalid backup format");
        if (data.books) localStorage.setItem(STORAGE_KEY_BOOKS, JSON.stringify(data.books));
        if (data.patrons) localStorage.setItem(STORAGE_KEY_PATRONS, JSON.stringify(data.patrons));
        if (data.classes) localStorage.setItem(STORAGE_KEY_CLASSES, JSON.stringify(data.classes));
        if (data.transactions) localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(data.transactions));
        if (data.events) localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(data.events));
        if (data.rules) localStorage.setItem(STORAGE_KEY_RULES, JSON.stringify(data.rules));
        if (data.mapConfig) localStorage.setItem(STORAGE_KEY_MAP, JSON.stringify(data.mapConfig));
        return true;
    } catch (e) {
        console.error("Import failed:", e);
        return false;
    }
};

export const performFactoryReset = async (): Promise<void> => {
    const keysToRemove = [STORAGE_KEY_BOOKS, STORAGE_KEY_TRANSACTIONS, STORAGE_KEY_PATRONS, STORAGE_KEY_CLASSES, STORAGE_KEY_EVENTS, STORAGE_KEY_RULES, STORAGE_KEY_ALERTS, STORAGE_KEY_MAP];
    keysToRemove.forEach(key => localStorage.removeItem(key));
    await new Promise(r => setTimeout(r, 500));
};

export const generateBookZpl = (book: Partial<Book>): string => {
    const authorShort = (book.author || 'UNK').slice(0, 3).toUpperCase();
    const ddc = book.ddc_code || '000.00';
    return `^XA^FO30,30^A0N,30,30^FD${ddc}^FS^FO30,100^A0N,25,25^FD${authorShort}^FS^FO150,30^BCN,60,Y,N,N^FD${book.barcode_id || 'TEMP-ID'}^FS^XZ`;
};

export const generatePatronZpl = (patron: Patron): string => {
    return `^XA^CI28^FO40,40^A0N,35,35^FDSt. Thomas Library^FS^FO40,160^A0N,50,50^FD${patron.full_name}^FS^FO40,300^BCN,100,Y,N,N^FD${patron.student_id}^FS^XZ`;
};

export const mockPrintBookLabel = async (book: Book): Promise<void> => {
    const zpl = generateBookZpl(book);
    console.log("%c ZPL Spine Label Stream Generated:", "color: #2563eb; font-weight: bold;");
    console.log(zpl);
    await new Promise(r => setTimeout(r, 800));
};

export const mockPrintPatronCard = async (patron: Patron): Promise<void> => {
    const zpl = generatePatronZpl(patron);
    console.log("%c ZPL ID Card Stream Generated:", "color: #16a34a; font-weight: bold;");
    console.log(zpl);
    await new Promise(r => setTimeout(r, 1200));
};

export const mockBulkPrintPatrons = async (patrons: Patron[]): Promise<void> => {
    console.log(`%c EXECUTING BATCH PRINT: ${patrons.length} PATRON CARDS`, "color: #16a34a; font-weight: 900; background: #f0fdf4; padding: 4px;");
    await new Promise(r => setTimeout(r, 500 * patrons.length));
};

export const mockBulkPrintLabels = async (books: Partial<Book>[]): Promise<void> => {
    console.log(`%c EXECUTING BATCH PRINT: ${books.length} SPINE LABELS`, "color: #2563eb; font-weight: 900; background: #eff6ff; padding: 4px;");
    await new Promise(r => setTimeout(r, 300 * books.length));
};

export const mockRecordTransaction = async (transaction: Omit<Transaction, 'id' | 'timestamp'>): Promise<Transaction> => {
    const stored = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
    const transactions: Transaction[] = stored ? JSON.parse(stored) : [];
    const newTransaction: Transaction = { ...transaction, id: `TXN-${Date.now()}`, timestamp: new Date().toISOString() };
    transactions.unshift(newTransaction);
    localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(transactions));
    return newTransaction;
};

export const mockGetTransactions = async (): Promise<Transaction[]> => {
    const stored = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
    return stored ? JSON.parse(stored) : [];
};

export const mockGetTransactionsByPatron = async (patronId: string): Promise<Transaction[]> => {
    const transactions = await mockGetTransactions();
    return transactions.filter(t => t.patron_id === patronId);
};

export const mockGetFinancialSummary = async () => {
    const txns = await mockGetTransactions();
    return txns.reduce((acc, t) => {
        if (t.type === 'FINE_PAYMENT' || t.type === 'REPLACEMENT_PAYMENT') acc.totalCollected += t.amount;
        else if (t.type === 'FINE_ASSESSMENT' || t.type === 'MANUAL_ADJUSTMENT') acc.totalFinesAssessed += t.amount;
        else if (t.type === 'REPLACEMENT_ASSESSMENT') acc.totalReplacementsAssessed += t.amount;
        else if (t.type === 'WAIVE') acc.totalWaived += t.amount;
        return acc;
    }, { totalCollected: 0, totalFinesAssessed: 0, totalReplacementsAssessed: 0, totalDamageAssessed: 0, totalWaived: 0 });
};

export const mockGetPatrons = async (): Promise<Patron[]> => {
    const stored = localStorage.getItem(STORAGE_KEY_PATRONS);
    if (stored) return JSON.parse(stored);
    const defaults: Patron[] = [
        { student_id: 'ST-2024-001', full_name: 'John Doe', patron_group: 'STUDENT', class_name: 'Grade 10-A', is_blocked: false, fines: 0, email: 'j.doe@stthomas.edu', phone: '+1 (555) 001-2233', pin: '1234' },
        { student_id: 'ST-2024-002', full_name: 'Jane Smith', patron_group: 'STUDENT', class_name: 'Grade 12-B', is_blocked: true, fines: 45.00, email: 'j.smith@stthomas.edu', phone: '+1 (555) 001-4455', pin: '0000' },
    ];
    localStorage.setItem(STORAGE_KEY_PATRONS, JSON.stringify(defaults));
    return defaults;
};

export const mockVerifyPatron = async (id: string, pin: string): Promise<Patron | null> => {
    const patrons = await mockGetPatrons();
    return patrons.find(p => p.student_id === id && p.pin === pin) || null;
};

export const mockGetPatronById = async (id: string): Promise<Patron | null> => {
    const patrons = await mockGetPatrons();
    return patrons.find(p => p.student_id === id) || null;
};

export const mockAddPatron = async (patron: Patron): Promise<Patron> => {
    const patrons = await mockGetPatrons();
    patrons.push(patron);
    localStorage.setItem(STORAGE_KEY_PATRONS, JSON.stringify(patrons));
    return patron;
};

export const mockUpdatePatron = async (patron: Patron): Promise<Patron> => {
    const patrons = await mockGetPatrons();
    const updated = patrons.map(p => p.student_id === patron.student_id ? patron : p);
    localStorage.setItem(STORAGE_KEY_PATRONS, JSON.stringify(updated));
    return patron;
};

export const mockDeletePatron = async (id: string): Promise<void> => {
    const patrons = await mockGetPatrons();
    const filtered = patrons.filter(p => p.student_id !== id);
    localStorage.setItem(STORAGE_KEY_PATRONS, JSON.stringify(filtered));
};

export const mockRestorePatron = async (patron: Patron): Promise<void> => {
    const patrons = await mockGetPatrons();
    patrons.unshift(patron);
    localStorage.setItem(STORAGE_KEY_PATRONS, JSON.stringify(patrons));
};

export const mockSearchBooks = async (query: string): Promise<Book[]> => {
    const books = await mockGetBooks();
    const q = query.toLowerCase();
    return books.filter(b => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || b.isbn.includes(q) || b.barcode_id.includes(q));
};

export const mockGetEvents = async (): Promise<LibraryEvent[]> => {
    const stored = localStorage.getItem(STORAGE_KEY_EVENTS);
    if (stored) return JSON.parse(stored);
    const defaults: LibraryEvent[] = [{ id: 'E-1', title: 'Winter Break', date: '2024-12-20', type: 'HOLIDAY', description: 'Library Closed' }];
    localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(defaults));
    return defaults;
};

export const mockAddEvent = async (event: Omit<LibraryEvent, 'id'>): Promise<LibraryEvent> => {
    const events = await mockGetEvents();
    const newEvent = { ...event, id: `E-${Date.now()}` };
    events.push(newEvent);
    localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(events));
    return newEvent;
};

export const mockDeleteEvent = async (id: string): Promise<void> => {
    const events = await mockGetEvents();
    const filtered = events.filter(e => e.id !== id);
    localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(filtered));
};

export const mockUpdateEvent = async (event: LibraryEvent): Promise<LibraryEvent> => {
    const events = await mockGetEvents();
    const updated = events.map(e => e.id === event.id ? event : e);
    localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(updated));
    return event;
};

export const mockPlaceHold = async (bookId: string, patronId: string): Promise<void> => {
    const books = await mockGetBooks();
    const expires = new Date();
    expires.setHours(expires.getHours() + 48);
    const updated = books.map(b => b.id === bookId ? { ...b, status: 'HELD' as const, hold_expires_at: expires.toISOString() } : b);
    localStorage.setItem(STORAGE_KEY_BOOKS, JSON.stringify(updated));
};

export const mockTriggerHelpAlert = async (location: string): Promise<void> => {
    const alerts = await mockGetActiveAlerts();
    alerts.push({ id: `A-${Date.now()}`, message: "Assistance Requested at Kiosk", location, timestamp: new Date().toISOString() });
    localStorage.setItem(STORAGE_KEY_ALERTS, JSON.stringify(alerts));
};

export const mockGetNewArrivals = async (): Promise<Book[]> => {
    const books = await mockGetBooks();
    return [...books].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()).slice(0, 4);
};

export const mockGetTrendingBooks = async (): Promise<Book[]> => {
    const books = await mockGetBooks();
    return [...books].sort((a, b) => (b.loan_count || 0) - (a.loan_count || 0)).slice(0, 4);
};

export const aiAnalyzeBlueprint = async (imageBase64: string, levelId: string): Promise<ShelfDefinition[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    /* Fix: Corrected variable name from image64 to imageBase64 */
                    { inlineData: { mimeType: 'image/jpeg', data: imageBase64.split(',')[1] || imageBase64 } },
                    { text: "Analyze this library floor plan and identify shelving units. Return a JSON array." }
                ]
            },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            label: { type: Type.STRING },
                            minDDC: { type: Type.NUMBER },
                            maxDDC: { type: Type.NUMBER },
                            x: { type: Type.NUMBER },
                            y: { type: Type.NUMBER },
                            width: { type: Type.NUMBER },
                            height: { type: Type.NUMBER },
                        },
                        required: ['label', 'x', 'y', 'width', 'height', 'minDDC', 'maxDDC']
                    }
                }
            }
        });
        const data = JSON.parse(response.text || '[]');
        return data.map((s: any) => ({ ...s, id: `shelf_${Math.random().toString(36).substr(2, 9)}`, levelId }));
    } catch (e: any) {
        if (e.status === 429) throw new Error("QUOTA_EXHAUSTED");
        return [];
    }
};

export const simulateCatalogWaterfall = async (isbn: string, onUpdate: (source: string, status: string) => void): Promise<Partial<Book> | null> => {
    onUpdate('LOCAL', 'PENDING');
    await new Promise(r => setTimeout(r, 600));
    const books = await mockGetBooks();
    const local = books.find(b => b.isbn === isbn);
    if (local) {
        onUpdate('LOCAL', 'FOUND');
        return local;
    }
    onUpdate('LOCAL', 'NOT_FOUND');
    onUpdate('ZEBRA_LOC', 'PENDING');
    await new Promise(r => setTimeout(r, 800));
    onUpdate('ZEBRA_LOC', 'NOT_FOUND');
    onUpdate('OPEN_LIBRARY', 'PENDING');
    await new Promise(r => setTimeout(r, 1000));
    onUpdate('OPEN_LIBRARY', 'FOUND');
    return {
        title: 'Professional Library Science',
        author: 'Dewey, Melvil',
        isbn: isbn,
        ddc_code: '025.431',
        publisher: 'Library Bureau',
        pub_year: '1876',
        format: 'HARDCOVER',
        material_type: 'REGULAR',
        status: 'AVAILABLE',
        value: 25.00,
        language: 'English',
        classification: 'Technology',
        summary: 'A foundational text outlining the principles and practices of modern library organization, including the introduction of the Dewey Decimal Classification system.'
    };
};

export const mockGetBooksByShelf = async (shelf: string): Promise<Book[]> => {
    const books = await mockGetBooks();
    return books.filter(b => b.shelf_location === shelf);
};

export const mockGetBookByBarcode = async (barcode: string): Promise<Book | null> => {
    const books = await mockGetBooks();
    return books.find(b => b.barcode_id === barcode) || null;
};

export const mockGetCirculationRules = async (): Promise<CirculationRule[]> => {
    const stored = localStorage.getItem(STORAGE_KEY_RULES);
    if (stored) return JSON.parse(stored);
    localStorage.setItem(STORAGE_KEY_RULES, JSON.stringify(INITIAL_RULES));
    return INITIAL_RULES;
};

export const mockUpdateCirculationRule = async (rule: CirculationRule): Promise<CirculationRule> => {
    const rules = await mockGetCirculationRules();
    const updated = rules.map(r => r.id === rule.id ? rule : r);
    localStorage.setItem(STORAGE_KEY_RULES, JSON.stringify(updated));
    return rule;
};

export const mockAddCirculationRule = async (rule: Omit<CirculationRule, 'id'>): Promise<CirculationRule> => {
    const rules = await mockGetCirculationRules();
    const newRule = { ...rule, id: `R-${Date.now()}` };
    rules.push(newRule);
    localStorage.setItem(STORAGE_KEY_RULES, JSON.stringify(rules));
    return newRule;
};

export const mockDeleteCirculationRule = async (id: string): Promise<void> => {
    const rules = await mockGetCirculationRules();
    const filtered = rules.filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEY_RULES, JSON.stringify(filtered));
};

export const mockGetActiveAlerts = async (): Promise<SystemAlert[]> => {
    const stored = localStorage.getItem(STORAGE_KEY_ALERTS);
    return stored ? JSON.parse(stored) : [];
};

export const mockResolveAlert = async (id: string): Promise<void> => {
    const alerts = await mockGetActiveAlerts();
    const filtered = alerts.filter(a => a.id !== id);
    localStorage.setItem(STORAGE_KEY_ALERTS, JSON.stringify(filtered));
};

export const initializeNetwork = async (): Promise<string> => {
    await new Promise(r => setTimeout(r, 500));
    return "Network Synchronized";
};

export const getNetworkStatus = () => {
    const mode = localStorage.getItem('thomian_network_mode') || 'AUTO';
    return { mode, url: getLanUrl(), isLan: mode === 'LAN' };
};

export const mockLogout = async (): Promise<void> => {
    localStorage.removeItem(STORAGE_KEY_USER);
    localStorage.removeItem(STORAGE_KEY_TOKEN);
};

export const mockProcessReturn = async (barcode: string): Promise<CheckInResult> => {
    const book = await mockGetBookByBarcode(barcode);
    if (!book) throw new Error("Book not found");
    const updatedBook = { ...book, status: 'AVAILABLE' as const };
    await mockUpdateBook(updatedBook);
    return { book: updatedBook, fine_amount: 0, days_overdue: 0 };
};

export const mockCheckoutBooks = async (patronId: string, barcodes: string[]): Promise<CheckoutResult> => {
    const books = await mockGetBooks();
    const updated = books.map(b => barcodes.includes(b.barcode_id) ? { ...b, status: 'LOANED' as const } : b);
    localStorage.setItem(STORAGE_KEY_BOOKS, JSON.stringify(updated));
    return { success: true, message: "Checkout processed successfully", errors: [] };
};

export const mockRenewBook = async (barcode: string, patronId: string): Promise<{ due_date: string; renewal_count: number }> => {
    await delay(500);
    const date = new Date();
    date.setDate(date.getDate() + 14);
    return { due_date: date.toISOString(), renewal_count: 1 };
};

export const mockGetActiveLoans = async (): Promise<Loan[]> => {
    const books = await mockGetBooks();
    return books.filter(b => b.status === 'LOANED').map(b => ({
        id: `L-${b.id}`,
        book: b.id,
        book_id: b.id,
        patron: 'ST-2024-001',
        patron_id: 'ST-2024-001',
        due_date: new Date(Date.now() + 86400000 * 7).toISOString(),
        checkout_date: new Date().toISOString(),
        issued_at: new Date().toISOString(),
        renewal_count: 0,
        status: 'ACTIVE',
        book_title: b.title,
        patron_name: 'John Doe'
    })) as Loan[];
};

export const mockGetRecentActivity = async () => {
    await delay(600);
    return [
        { type: 'LOAN', patronName: 'Alexander Thom', bookTitle: 'The Great Gatsby', time: '2m ago', librarian: 'Admin' },
        { type: 'RETURN', patronName: 'Sophia Chen', bookTitle: 'Physics: A Modern Approach', time: '15m ago', librarian: 'Admin' },
        { type: 'LOAN', patronName: 'Marcus Wright', bookTitle: '1984', time: '42m ago', librarian: 'Admin' },
        { type: 'RETURN', patronName: 'Emma Wilson', bookTitle: 'The Hobbit', time: '1h ago', librarian: 'Admin' },
        { type: 'LOAN', patronName: 'David Miller', bookTitle: 'Clean Code', time: '2h ago', librarian: 'Admin' },
        { type: 'LOAN', patronName: 'Sarah Jenkins', bookTitle: 'Design Patterns', time: '3h ago', librarian: 'Admin' },
    ];
};

export const mockGetSystemStats = async (): Promise<SystemStats> => {
    const books = await mockGetBooks();
    const patrons = await mockGetPatrons();

    const classificationStats: Record<string, { count: number, loans: number }> = {};
    books.forEach(b => {
        const cls = b.classification || 'General';
        if (!classificationStats[cls]) classificationStats[cls] = { count: 0, loans: 0 };
        classificationStats[cls].count++;
        classificationStats[cls].loans += (b.loan_count || 0);
    });

    const statusStats: Record<string, number> = {};
    books.forEach(b => {
        statusStats[b.status] = (statusStats[b.status] || 0) + 1;
    });

    return {
        totalItems: books.length,
        totalValue: books.reduce((acc, b) => acc + (b.value || 0), 0),
        activeLoans: books.filter(b => b.status === 'LOANED').length,
        overdueLoans: 2, // Mocking some overdue
        lostItems: books.filter(b => b.status === 'LOST').length,
        itemsByClassification: classificationStats,
        itemsByStatus: statusStats,
        topReaders: [
            { name: 'Alice Wong', id: 'ST-001', count: 24 },
            { name: 'Michael Chen', id: 'ST-002', count: 19 },
            { name: 'Sarah Miller', id: 'ST-003', count: 15 }
        ],
        topClasses: [
            { name: 'Grade 10-A', count: 142 },
            { name: 'Grade 12-B', count: 98 },
            { name: 'Grade 8-C', count: 76 }
        ],
        acquisitionHistory: [
            { month: 'Jan', count: 12 },
            { month: 'Feb', count: 45 },
            { month: 'Mar', count: 22 },
            { month: 'Apr', count: 88 },
            { month: 'May', count: 31 }
        ]
    };
};

export const mockGetOverdueItems = async (): Promise<OverdueReportItem[]> => [
    { loanId: 'L-1', patronId: 'ST-001', patronName: 'Alice Wong', patronGroup: 'STUDENT', bookTitle: 'The Great Gatsby', bookBarcode: '3001', dueDate: '2024-05-10', daysOverdue: 5 },
    { loanId: 'L-2', patronId: 'ST-005', patronName: 'James Bond', patronGroup: 'STUDENT', bookTitle: 'Quantum Physics', bookBarcode: '5502', dueDate: '2024-05-12', daysOverdue: 3 }
];

export const mockLogin = async (username: string, password: string): Promise<AuthUser | null> => {
    if (username === 'admin' && password === 'admin123') {
        const user: AuthUser = { id: 'U-1', username: 'admin', full_name: 'Admin', role: 'ADMINISTRATOR', avatar_color: 'bg-slate-900' };
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
        localStorage.setItem(STORAGE_KEY_TOKEN, "token");
        return user;
    }
    if (username === 'librarian' && password === 'lib123') {
        const user: AuthUser = { id: 'U-2', username: 'librarian', full_name: 'Librarian', role: 'LIBRARIAN', avatar_color: 'bg-sky-600' };
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
        localStorage.setItem(STORAGE_KEY_TOKEN, "token");
        return user;
    }
    return null;
};

export const mockUpdateAuthUser = async (user: AuthUser): Promise<void> => {
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
};

export const getLanUrl = () => localStorage.getItem(STORAGE_KEY_LAN_URL) || "http://localhost:8000";
export const setLanUrl = (url: string) => localStorage.setItem(STORAGE_KEY_LAN_URL, url);

export const mockGetMapConfig = async (): Promise<MapConfig> => {
    const stored = localStorage.getItem(STORAGE_KEY_MAP);
    if (stored) return JSON.parse(stored);
    const defaults: MapConfig = {
        lastUpdated: new Date().toISOString(),
        logo: SCHOOL_CREST_SVG,
        levels: [{ id: 'lvl_1', name: 'Main Hall', stationX: 500, stationY: 550 }],
        shelves: [],
        theme: 'EMERALD',
        cardTemplate: 'TRADITIONAL'
    };
    localStorage.setItem(STORAGE_KEY_MAP, JSON.stringify(defaults));
    return defaults;
};

export const mockSaveMapConfig = async (config: MapConfig): Promise<void> => {
    localStorage.setItem(STORAGE_KEY_MAP, JSON.stringify(config));
};

export const mockCheckSession = async (): Promise<AuthUser | null> => {
    const stored = localStorage.getItem(STORAGE_KEY_USER);
    const token = localStorage.getItem(STORAGE_KEY_TOKEN);
    if (stored && token) return JSON.parse(stored);
    return null;
};
