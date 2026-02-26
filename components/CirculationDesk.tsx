
import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeftRight, User, BookOpen, CheckCircle, AlertTriangle, XCircle, Search, Calendar, DollarSign, ScanLine, ArrowRight, Camera, Zap, Smartphone, Monitor, Loader2, History, ChevronUp, ChevronDown, X, Trash2, UserCheck, ShieldCheck, CreditCard, Lock } from 'lucide-react';
import { mockGetPatronById, mockGetBookByBarcode, mockProcessReturn, mockCheckoutBooks, mockGetMapConfig } from '../services/api';
import { Patron, Book, CheckInResult, MapConfig } from '../types';
import MobileScanner from './MobileScanner';

const CirculationDesk: React.FC = () => {
    const [mode, setMode] = useState<'CHECK_OUT' | 'CHECK_IN'>('CHECK_IN');
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
        } else {
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
                    alert("Identity not found in Thomian Core.");
                }
            } else {
                const book = await mockGetBookByBarcode(query);
                if (book) {
                    if (scannedBooks.some(b => b.id === book.id)) return;
                    if (book.status !== 'AVAILABLE' && book.status !== 'HELD') {
                        alert(`Status Alert: ${book.title} is ${book.status}.`);
                    } else {
                        setScannedBooks(prev => [...prev, book]);
                        triggerFlash();
                    }
                } else {
                    alert("Resource not cataloged.");
                }
            }
        }
        setLoading(false);
        setInput('');
    };

    const handleCheckout = async () => {
        if (!currentPatron || scannedBooks.length === 0) return;
        setProcessingCheckout(true);
        const barcodes = scannedBooks.map(b => b.barcode_id);
        try {
            const result = await mockCheckoutBooks(currentPatron.student_id, barcodes);
            if (result.success) {
                alert(`Success: ${scannedBooks.length} items issued.`);
                clearSession();
            }
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
                        className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${mode === 'CHECK_OUT' ? 'bg-white text-emerald-600 shadow-md' : 'text-slate-400'}`}
                    >
                        <BookOpen className="h-3.5 w-3.5" /> Check-Out
                    </button>
                    <button
                        onClick={() => { setMode('CHECK_IN'); clearSession(); }}
                        className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${mode === 'CHECK_IN' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400'}`}
                    >
                        <CheckCircle className="h-3.5 w-3.5" /> Check-In
                    </button>
                </div>
            </div>

            <div className="flex-1 p-4 md:p-6 grid grid-cols-12 gap-4 md:gap-6 min-h-0 overflow-y-auto lg:overflow-hidden relative">
                {/* Interaction Column */}
                <div className="col-span-12 lg:col-span-8 flex flex-col gap-6 h-full">

                    {/* Global Lock Overlay for Checkout */}
                    {mode === 'CHECK_OUT' && systemConfig?.circulationLocked ? (
                        <div className="flex-1 bg-white rounded-[2.5rem] border-4 border-dashed border-slate-200 flex flex-col items-center justify-center p-12 text-center animate-fade-in">
                            <div className="h-24 w-24 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-8 border-2 border-rose-100 shadow-lg">
                                <Lock className="h-10 w-10" />
                            </div>
                            <h3 className="text-3xl font-black text-slate-800 uppercase tracking-tight mb-4">Check-Out Restricted</h3>
                            <p className="text-slate-500 font-medium max-w-md leading-relaxed text-lg">
                                The core circulation engine is currently <span className="text-rose-600 font-black">LOCKED</span> for End-of-Year stocktake. No new items can be issued at this time.
                            </p>
                            <div className="mt-10 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                                <ShieldCheck className="h-5 w-5 text-blue-500" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Returns are still permitted in Check-In mode.</span>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className={`p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl border-4 transition-all duration-500 relative overflow-hidden flex flex-col items-center justify-center gap-4 md:gap-6 ${mode === 'CHECK_IN' ? 'bg-blue-600 border-blue-700' : 'bg-emerald-600 border-emerald-700'}`}>
                                <div className="absolute inset-0 opacity-10 pointer-events-none">
                                    <svg width="100%" height="100%"><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" /></pattern><rect width="100%" height="100%" fill="url(#grid)" /></svg>
                                </div>

                                <div className="relative z-10 w-full max-w-xl flex flex-col gap-4 md:gap-5">
                                    <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md flex items-center justify-between border border-white/10 shadow-lg">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 bg-white rounded-lg flex items-center justify-center shadow-inner">
                                                <ScanLine className="h-5 w-5 text-slate-800" />
                                            </div>
                                            <span className="text-white text-[10px] font-black uppercase tracking-widest">Active Channel</span>
                                        </div>
                                        <div className="flex gap-1.5">
                                            {[1, 2, 3].map(i => <div key={i} className="h-1 w-5 bg-white/20 rounded-full animate-pulse"></div>)}
                                        </div>
                                    </div>

                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && processScan(input)}
                                        className="w-full py-4 md:py-5 px-6 md:px-10 rounded-[1.5rem] md:rounded-[2rem] text-2xl md:text-3xl font-mono text-center shadow-2xl focus:ring-8 focus:ring-white/10 outline-none uppercase placeholder-white/20 bg-white border-4 border-transparent focus:border-white/20 transition-all"
                                        placeholder={loading ? "SYNCING..." : "READY TO SCAN..."}
                                        disabled={loading}
                                    />

                                    <div className="grid grid-cols-2 gap-3">
                                        <button onClick={() => setIsScannerOpen(true)} className="py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all border border-white/10 flex items-center justify-center gap-2">
                                            <Camera className="h-3.5 w-3.5" /> Camera Scan
                                        </button>
                                        <div className="py-3 bg-black/20 text-white/40 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 border border-white/5">
                                            <Monitor className="h-3.5 w-3.5" /> Hardware: Sync
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Results Table (Responsive) */}
                            <div className="bg-white flex-1 min-h-[400px] lg:min-h-0 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                                <div className="px-6 md:px-8 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Transaction Stream</h3>
                                    <History className="h-4 w-4 text-slate-300" />
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-thin">
                                    {mode === 'CHECK_IN' ? (
                                        returnHistory.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-slate-300">
                                                <ScanLine className="h-12 w-12 mb-4 opacity-5" />
                                                <p className="text-sm font-black uppercase tracking-tighter opacity-20 text-center">Scan returned book to begin cycle...</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {returnHistory.map((res, i) => (
                                                    <div key={i} className="flex items-center gap-4 md:gap-5 p-4 md:p-5 bg-slate-50 border border-slate-100 rounded-2xl animate-fade-in-up">
                                                        <div className={`h-10 md:h-12 w-10 md:w-12 rounded-xl flex items-center justify-center shrink-0 ${res.fine_amount > 0 ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600 shadow-sm'}`}>
                                                            <CheckCircle className="h-5 md:h-6 w-5 md:w-6" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-base md:text-lg font-black text-slate-800 truncate leading-none mb-1">{res.book.title}</p>
                                                            <p className="text-[9px] font-mono text-slate-400 uppercase tracking-widest truncate">ID: {res.book.barcode_id} • Shelf: {res.book.shelf_location}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )
                                    ) : (
                                        scannedBooks.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-slate-300">
                                                <UserCheck className="h-12 w-12 mb-4 opacity-5" />
                                                <p className="text-sm font-black uppercase tracking-tighter opacity-20 text-center">Scan Patron card to start session...</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {scannedBooks.map((book, i) => (
                                                    <div key={i} className="flex justify-between items-center p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all">
                                                        <div className="flex items-center gap-4">
                                                            <div className="h-10 w-10 bg-slate-900 rounded-lg flex items-center justify-center text-white font-black text-xs">{i + 1}</div>
                                                            <div className="overflow-hidden">
                                                                <p className="font-black text-slate-800 text-base leading-none mb-1 truncate">{book.title}</p>
                                                                <p className="text-[9px] font-mono text-slate-400 tracking-widest uppercase">ID: {book.barcode_id}</p>
                                                            </div>
                                                        </div>
                                                        <button onClick={() => setScannedBooks(prev => prev.filter((_, idx) => idx !== i))} className="p-2 text-slate-200 hover:text-rose-500 transition-colors shrink-0">
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Sidebar Info Column */}
                <div className="col-span-12 lg:col-span-4 flex flex-col h-full gap-6 pb-10">
                    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col p-8 shrink-0">
                        {mode === 'CHECK_OUT' && currentPatron ? (
                            <div className="animate-fade-in space-y-8">
                                <div className="text-center">
                                    <div className="h-24 w-24 md:h-28 md:w-28 bg-emerald-600 rounded-[1.5rem] md:rounded-[2rem] mx-auto flex items-center justify-center text-white text-3xl md:text-4xl font-black shadow-2xl mb-6 rotate-3 shadow-emerald-100">
                                        {currentPatron.full_name.charAt(0)}
                                    </div>
                                    <h3 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight leading-tight">{currentPatron.full_name}</h3>
                                    <p className="text-slate-400 font-mono text-xs tracking-widest mt-2 uppercase">{currentPatron.student_id}</p>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Account Status</span>
                                        <span className="text-[10px] font-black text-emerald-600 flex items-center gap-1.5 uppercase"><ShieldCheck className="h-3 w-3" /> Eligible</span>
                                    </div>
                                    <div className="flex justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Items In Queue</span>
                                        <span className="text-base font-black text-emerald-600 font-mono">{scannedBooks.length}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={handleCheckout}
                                    disabled={scannedBooks.length === 0 || processingCheckout}
                                    className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-base uppercase tracking-widest shadow-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-30"
                                >
                                    {processingCheckout ? <Loader2 className="animate-spin h-5 w-5" /> : <>Finalize Session <ArrowRight className="h-5 w-5" /></>}
                                </button>
                                <button onClick={clearSession} className="w-full text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] hover:text-rose-500 transition-colors">Abort Context</button>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center py-10 md:py-14">
                                <div className="h-16 w-16 md:h-20 md:w-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 border-2 border-slate-100">
                                    <User className="h-8 md:h-10 w-8 md:w-10 text-slate-200" />
                                </div>
                                <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">Identity Required</h4>
                                <p className="text-xs text-slate-400 mt-2 max-w-[200px] font-medium leading-relaxed mx-auto">Scan a valid Patron Identity Card to unlock circulation services.</p>
                            </div>
                        )}
                    </div>

                    <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden group shadow-xl shrink-0 hidden md:block">
                        <ShieldCheck className="absolute -top-10 -right-10 h-32 w-32 opacity-5 rotate-12 group-hover:rotate-0 transition-transform duration-700" />
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50"></div>
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Core Matrix Policy</h4>
                        </div>
                        <p className="text-xs text-slate-300 font-medium leading-relaxed">
                            System rules are derived from the <strong>Circulation Matrix</strong>. All actions are logged.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CirculationDesk;
