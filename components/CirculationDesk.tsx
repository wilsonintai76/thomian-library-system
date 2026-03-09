
import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeftRight, User, BookOpen, CheckCircle, AlertTriangle, XCircle, Search, Calendar, DollarSign, ScanLine, ArrowRight, Camera, Zap, Smartphone, Monitor, Loader2, History, ChevronUp, ChevronDown, X, Trash2, UserCheck, ShieldCheck, CreditCard, Lock, RefreshCw } from 'lucide-react';
import { mockGetPatronById, mockGetBookByBarcode, mockProcessReturn, mockCheckoutBooks, mockGetMapConfig, mockRenewBook } from '../services/api';
import { Patron, Book, CheckInResult, MapConfig } from '../types';
import MobileScanner from './MobileScanner';

const CirculationDesk: React.FC<{ initialMode?: 'CHECK_OUT' | 'CHECK_IN' | 'RENEW' }> = ({ initialMode }) => {
    const [mode, setMode] = useState<'CHECK_OUT' | 'CHECK_IN' | 'RENEW'>(initialMode ?? 'CHECK_IN');

    useEffect(() => {
        if (initialMode) setMode(initialMode);
    }, [initialMode]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [processingCheckout, setProcessingCheckout] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [flash, setFlash] = useState<boolean>(false);
    const [systemConfig, setSystemConfig] = useState<MapConfig | null>(null);

    // Session State
    const [currentPatron, setCurrentPatron] = useState<Patron | null>(null);
    const [scannedBooks, setScannedBooks] = useState<Book[]>([]);
    const [returnResult, setReturnResult] = useState<CheckInResult | null>(null);
    const [returnHistory, setReturnHistory] = useState<CheckInResult[]>([]);
    const [renewHistory, setRenewHistory] = useState<{ book_title: string; due_date: string; renewal_count: number }[]>([]);

    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        mockGetMapConfig().then(setSystemConfig);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Hardware focus
    useEffect(() => {
        if (!isScannerOpen && !(mode === 'CHECK_OUT' && systemConfig?.circulationLocked)) {
            const timer = setTimeout(() => inputRef.current?.focus(), 100);
            return () => clearTimeout(timer);
        }
    }, [mode, isScannerOpen, currentPatron, systemConfig]);

    const triggerFlash = () => {
        setFlash(true);
        setTimeout(() => setFlash(false), 200);
    };

    const processScan = async (value: string) => {
        if (mode === 'CHECK_OUT' && systemConfig?.circulationLocked) return;

        const query = value.trim();
        if (!query) return;
        setLoading(true);

        if (mode === 'CHECK_IN') {
            try {
                const result = await mockProcessReturn(query);
                setReturnResult(result);
                setReturnHistory(prev => [result, ...prev]);
                triggerFlash();
            } catch (err) {
                console.error(err);
            }
        } else if (mode === 'RENEW') {
            try {
                if (!currentPatron) {
                    const patron = await mockGetPatronById(query);
                    if (patron) {
                        if (patron.is_blocked || patron.is_archived) {
                            alert(`ACCESS BLOCKED: Patron is ${patron.is_archived ? 'ARCHIVED (Graduated)' : 'BLOCKED'}.`);
                        } else {
                            setCurrentPatron(patron);
                            triggerFlash();
                        }
                    } else {
                        alert('Identity not found in Thomian Core.');
                    }
                } else {
                    const result = await mockRenewBook(query, currentPatron.student_id);
                    setRenewHistory(prev => [{ book_title: result.book_title || query, due_date: result.due_date, renewal_count: result.renewal_count }, ...prev]);
                    triggerFlash();
                }
            } catch (err: any) {
                alert(`Renewal error: ${err.message || 'Please try again.'}`);
            }
        } else {
            try {
                if (!currentPatron) {
                    const patron = await mockGetPatronById(query);
                    if (patron) {
                        if (patron.is_blocked || patron.is_archived) {
                            alert(`ACCESS BLOCKED: Patron is ${patron.is_archived ? 'ARCHIVED (Graduated)' : 'BLOCKED (Fines)'}.`);
                        } else {
                            setCurrentPatron(patron);
                            triggerFlash();
                        }
                    } else {
                        const book = await mockGetBookByBarcode(query);
                        if (book) {
                            alert(`Scan patron card first, then scan books.\n\n"${book.title}" is ready to be added once a patron is identified.`);
                        } else {
                            alert("Identity not found in Thomian Core.");
                        }
                    }
                } else {
                    const book = await mockGetBookByBarcode(query);
                    if (book) {
                        if (scannedBooks.some(b => b.id === book.id)) {
                            alert(`"${book.title}" is already in this session.`);
                        } else if (book.status !== 'AVAILABLE' && book.status !== 'HELD') {
                            alert(`Cannot check out: "${book.title}" is currently ${book.status}.`);
                        } else {
                            setScannedBooks(prev => [...prev, book]);
                            triggerFlash();
                        }
                    } else {
                        alert("Resource not cataloged.");
                    }
                }
            } catch (err: any) {
                alert(`Scan error: ${err.message || 'Please try again.'}`);
            }
        }
        setLoading(false);
        setInput('');
        // Restore focus immediately so the next HID scan lands in the input
        setTimeout(() => inputRef.current?.focus(), 50);
    };

    const handleCheckout = async () => {
        if (!currentPatron || scannedBooks.length === 0) return;
        setProcessingCheckout(true);
        const barcodes = scannedBooks.map(b => b.id);
        try {
            const result = await mockCheckoutBooks(currentPatron.student_id, barcodes);
            if (result.processed > 0) {
                if (result.errors?.length > 0) {
                    alert(`Issued ${result.processed} of ${scannedBooks.length} item(s).\nWarnings:\n${result.errors.join('\n')}`);
                } else {
                    alert(`${result.processed} item(s) issued successfully.`);
                }
                clearSession();
            } else {
                alert(`Checkout failed:\n${result.errors?.join('\n') || result.message || 'No items were processed.'}`);
            }
        } catch (err: any) {
            alert(`Checkout error: ${err.message || 'Server error. Please try again.'}`);
        } finally {
            setProcessingCheckout(false);
        }
    };

    const clearSession = () => {
        setCurrentPatron(null);
        setScannedBooks([]);
        setReturnResult(null);
    };

    return (
        <div className="h-full flex flex-col bg-slate-100 font-sans">
            {isScannerOpen && <MobileScanner onScan={processScan} onClose={() => setIsScannerOpen(false)} />}

            {flash && (
                <div className="fixed inset-0 z-[300] bg-white/20 pointer-events-none transition-opacity"></div>
            )}

            {/* Responsive Header */}
            <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm shrink-0">
                <div>
                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-2.5 tracking-tighter uppercase">
                        <ArrowLeftRight className="h-6 w-6 text-blue-600" /> Circulation Manager
                    </h2>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Hardware HID Input Synchronized</p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                        onClick={() => { setMode('CHECK_OUT'); clearSession(); }}
                        className={`flex-1 md:flex-none px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${mode === 'CHECK_OUT' ? 'bg-white text-emerald-600 shadow-md' : 'text-slate-400'}`}
                    >
                        <BookOpen className="h-3.5 w-3.5" /> Check-Out
                    </button>
                    <button
                        onClick={() => { setMode('CHECK_IN'); clearSession(); }}
                        className={`flex-1 md:flex-none px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${mode === 'CHECK_IN' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400'}`}
                    >
                        <CheckCircle className="h-3.5 w-3.5" /> Check-In
                    </button>
                    <button
                        onClick={() => { setMode('RENEW'); clearSession(); }}
                        className={`flex-1 md:flex-none px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${mode === 'RENEW' ? 'bg-white text-violet-600 shadow-md' : 'text-slate-400'}`}
                    >
                        <RefreshCw className="h-3.5 w-3.5" /> Renew
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
              <div className="w-full max-w-5xl flex flex-col gap-5">

                    {/* Global Lock Overlay for Checkout */}
                    {mode === 'CHECK_OUT' && systemConfig?.circulationLocked ? (
                        <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-16 text-center">
                            <div className="h-20 w-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-6 border border-rose-100">
                                <Lock className="h-9 w-9" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-3">Check-Out Restricted</h3>
                            <p className="text-slate-400 font-medium max-w-sm leading-relaxed">
                                The circulation engine is <span className="text-rose-500 font-black">LOCKED</span> for End-of-Year stocktake. Returns are still permitted.
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col lg:flex-row gap-5 items-start">

                            {/* ── Left column: scan bar + stream ── */}
                            <div className="flex-1 min-w-0 flex flex-col gap-4">

                                {/* Scan bar */}
                                <div className={`rounded-2xl border-2 px-4 py-3 flex items-center gap-3 transition-colors duration-300 ${mode === 'CHECK_IN' ? 'bg-blue-600 border-blue-700' : mode === 'RENEW' ? 'bg-violet-600 border-violet-700' : 'bg-emerald-600 border-emerald-700'}`}>
                                    <ScanLine className="h-4 w-4 text-white/70 shrink-0" />
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && processScan(input)}
                                        className="flex-1 min-w-0 bg-transparent outline-none text-sm font-mono text-white placeholder-white/40 uppercase tracking-widest"
                                        placeholder={loading ? 'SYNCING...' : mode === 'CHECK_OUT' && !currentPatron ? 'SCAN PATRON CARD FIRST...' : 'SCAN BARCODE OR TYPE ISBN...'}
                                        disabled={loading}
                                    />
                                    <button onClick={() => setIsScannerOpen(true)} className="flex items-center gap-1.5 h-7 px-3 bg-white/15 hover:bg-white/25 border border-white/20 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shrink-0">
                                        <Camera className="h-3 w-3" /> Camera
                                    </button>
                                </div>

                                {/* Transaction stream */}
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Transaction Stream</span>
                                        <History className="h-4 w-4 text-slate-300" />
                                    </div>
                                    <div className="p-4 space-y-2.5 max-h-[420px] overflow-y-auto">
                                        {mode === 'CHECK_IN' ? (
                                            returnHistory.length === 0 ? (
                                                <div className="py-16 flex flex-col items-center text-slate-200">
                                                    <ScanLine className="h-10 w-10 mb-3" />
                                                    <p className="text-xs font-black uppercase tracking-widest">Scan a book to begin</p>
                                                </div>
                                            ) : returnHistory.map((res, i) => (
                                                <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-100 rounded-xl">
                                                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${res.fine_amount > 0 ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                                                        <CheckCircle className="h-5 w-5" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-black text-slate-800 truncate leading-none mb-1">{res.book.title}</p>
                                                        <p className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">Shelf: {res.book.shelf_location}</p>
                                                    </div>
                                                    {res.fine_amount > 0 && (
                                                        <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-black shrink-0">RM {res.fine_amount.toFixed(2)}</span>
                                                    )}
                                                </div>
                                            ))
                                        ) : mode === 'RENEW' ? (
                                            renewHistory.length === 0 ? (
                                                <div className="py-16 flex flex-col items-center text-slate-200">
                                                    <RefreshCw className="h-10 w-10 mb-3" />
                                                    <p className="text-xs font-black uppercase tracking-widest">Scan patron, then books</p>
                                                </div>
                                            ) : renewHistory.map((res, i) => (
                                                <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-100 rounded-xl">
                                                    <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 bg-violet-100 text-violet-600">
                                                        <RefreshCw className="h-5 w-5" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-black text-slate-800 truncate leading-none mb-1">{res.book_title}</p>
                                                        <p className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">Due: {new Date(res.due_date).toLocaleDateString('en-MY')} · ×{res.renewal_count} renewed</p>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            scannedBooks.length === 0 ? (
                                                <div className="py-16 flex flex-col items-center text-slate-200">
                                                    <UserCheck className="h-10 w-10 mb-3" />
                                                    <p className="text-xs font-black uppercase tracking-widest">Scan patron card first</p>
                                                </div>
                                            ) : scannedBooks.map((book, i) => (
                                                <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-100 rounded-xl">
                                                    <div className="h-10 w-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0">{i + 1}</div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-black text-slate-800 truncate leading-none mb-1">{book.title}</p>
                                                        <p className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">ISBN: {book.barcode_id || book.isbn}</p>
                                                    </div>
                                                    <button aria-label="Remove book" onClick={() => setScannedBooks(prev => prev.filter((_, idx) => idx !== i))} className="p-1.5 text-slate-200 hover:text-rose-500 transition-colors shrink-0">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* ── Right column: status card ── */}
                            <div className="w-full lg:w-72 shrink-0 flex flex-col gap-4">

                                {/* Patron / identity card */}
                                <div className={`rounded-2xl border-2 overflow-hidden transition-colors duration-300 ${
                                    mode === 'CHECK_IN' ? 'border-blue-100 bg-blue-50' :
                                    mode === 'RENEW' ? 'border-violet-100 bg-violet-50' :
                                    'border-emerald-100 bg-emerald-50'
                                }`}>
                                    <div className={`px-5 py-3 flex items-center gap-2 border-b ${
                                        mode === 'CHECK_IN' ? 'border-blue-100' :
                                        mode === 'RENEW' ? 'border-violet-100' :
                                        'border-emerald-100'
                                    }`}>
                                        <div className={`h-1.5 w-1.5 rounded-full ${
                                            mode === 'CHECK_IN' ? 'bg-blue-500' :
                                            mode === 'RENEW' ? 'bg-violet-500' :
                                            'bg-emerald-500'
                                        }`} />
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                                            {mode === 'CHECK_IN' ? 'Return Mode' : mode === 'RENEW' ? 'Renewal Mode' : 'Issue Mode'}
                                        </span>
                                    </div>
                                    <div className="p-5">
                                        {(mode === 'CHECK_OUT' || mode === 'RENEW') ? (
                                            currentPatron ? (
                                                <div className="flex items-center gap-3">
                                                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-white text-xl font-black shrink-0 shadow-lg ${mode === 'RENEW' ? 'bg-violet-600' : 'bg-emerald-600'}`}>
                                                        {currentPatron.full_name.charAt(0)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-black text-slate-800 leading-tight truncate">{currentPatron.full_name}</p>
                                                        <p className="text-[10px] font-mono text-slate-400 mt-0.5 uppercase">{currentPatron.student_id}</p>
                                                    </div>
                                                    <button onClick={clearSession} title="Clear" className="text-slate-300 hover:text-rose-400 transition-colors shrink-0">
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-3">
                                                    <div className="h-12 w-12 rounded-2xl bg-white border-2 border-dashed border-slate-200 flex items-center justify-center shrink-0">
                                                        <User className="h-5 w-5 text-slate-300" />
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-400 text-sm uppercase tracking-wide">Identity Required</p>
                                                        <p className="text-[9px] text-slate-300 mt-0.5">Scan patron card to begin</p>
                                                    </div>
                                                </div>
                                            )
                                        ) : (
                                            <div className="flex items-center gap-3">
                                                <div className="h-12 w-12 rounded-2xl bg-blue-100 flex items-center justify-center shrink-0">
                                                    <ScanLine className="h-5 w-5 text-blue-600" />
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-800 text-sm">Ready to Accept</p>
                                                    <p className="text-[9px] text-slate-400 mt-0.5">Scan any book barcode or ISBN</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Stats */}
                                {(mode === 'CHECK_OUT' || mode === 'RENEW') && (
                                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                            {mode === 'RENEW' ? 'Renewed' : 'Queued'}
                                        </span>
                                        <span className={`text-2xl font-black font-mono ${mode === 'RENEW' ? 'text-violet-600' : 'text-emerald-600'}`}>
                                            {mode === 'RENEW' ? renewHistory.length : scannedBooks.length}
                                        </span>
                                    </div>
                                )}
                                {mode === 'CHECK_IN' && returnHistory.length > 0 && (
                                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Returned</span>
                                        <span className="text-2xl font-black font-mono text-blue-600">{returnHistory.length}</span>
                                    </div>
                                )}

                                {/* Finalize (CHECK_OUT only) */}
                                {mode === 'CHECK_OUT' && (
                                    <button
                                        onClick={handleCheckout}
                                        disabled={!currentPatron || scannedBooks.length === 0 || processingCheckout}
                                        className="w-full bg-slate-900 hover:bg-slate-700 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg transition-all active:scale-95 disabled:opacity-25 flex items-center justify-center gap-2"
                                    >
                                        {processingCheckout
                                            ? <Loader2 className="animate-spin h-4 w-4" />
                                            : <>{scannedBooks.length > 0 && <span className="bg-white/20 rounded-lg px-1.5 py-0.5 text-xs">{scannedBooks.length}</span>} Finalize Session <ArrowRight className="h-4 w-4" /></>
                                        }
                                    </button>
                                )}

                                {/* Policy note */}
                                <div className="bg-slate-900 rounded-2xl p-5 text-white">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Core Matrix Policy</span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 leading-relaxed">Rules derived from <strong className="text-slate-300">Circulation Matrix</strong>. All actions are logged.</p>
                                </div>
                            </div>
                        </div>
                    )}
              </div>
            </div>
        </div>
    );
};

export default CirculationDesk;
