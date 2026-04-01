
import React, { useState, useEffect, useRef } from 'react';
import { Search, X, LogIn, RefreshCw, Sparkles, ImageOff, History, BookOpen, Bookmark, Clock, Calendar, Bell, Phone, Mail, Save, Loader2, FileText, Banknote, UserCheck, TrendingUp, CalendarOff, GraduationCap, Lightbulb, Users, Settings, LogOut, Key, ChevronRight, AlertCircle, ShieldCheck, CheckCircle2, Trophy } from 'lucide-react';
import { mockSearchBooks, mockGetEvents, mockPlaceHold, mockTriggerHelpAlert, mockGetNewArrivals, mockGetTrendingBooks, mockGetMapConfig, mockUpdatePatron, mockGetTransactionsByPatron, mockVerifyPatron, mockGetPatronLoans } from '../services/api';
import { Book, LibraryEvent, MapConfig, Patron, Loan, Transaction } from '../types';
import { DEFAULT_LOGO_URL } from '../constants';
import WayfinderMap from './WayfinderMap';
import LibraryAssistant from './LibraryAssistant';
import PatronPortal from './kiosk/PatronPortal';
import ProfileEditModal from './kiosk/ProfileEditModal';

const KioskHome: React.FC = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Book[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedBook, setSelectedBook] = useState<Book | null>(null);
    const [events, setEvents] = useState<LibraryEvent[]>([]);
    const [mapConfig, setMapConfig] = useState<MapConfig | null>(null);
    const [activeLevelId, setActiveLevelId] = useState<string>('');

    const [newArrivals, setNewArrivals] = useState<Book[]>([]);
    const [trending, setTrending] = useState<Book[]>([]);
    const [helpStatus, setHelpStatus] = useState<'IDLE' | 'REQUESTING' | 'SUCCESS'>('IDLE');

    const [activePatron, setActivePatron] = useState<Patron | null>(null);
    const [patronLoans, setPatronLoans] = useState<Loan[]>([]);
    const [showAccountLogin, setShowAccountLogin] = useState(false);
    const [loginId, setLoginId] = useState('');
    const [loginPin, setLoginPin] = useState('');
    const [loginStep, setLoginStep] = useState<'ID' | 'PIN'>('ID');
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [patronHistory, setPatronHistory] = useState<Transaction[]>([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);

    const [showProfileEdit, setShowProfileEdit] = useState(false);

    const [showHoldModal, setShowHoldModal] = useState(false);
    const [holdStudentId, setHoldStudentId] = useState('');
    const [isPlacingHold, setIsPlacingHold] = useState(false);
    const [holdSuccess, setHoldSuccess] = useState(false);
    const [holdConfirmationId, setHoldConfirmationId] = useState<string | null>(null);
    const [patronHolds, setPatronHolds] = useState<{ id: string; title: string; status: string; expires: string }[]>([]);

    const inputRef = useRef<HTMLInputElement>(null);
    const mapSectionRef = useRef<HTMLDivElement>(null);
    const resultsSectionRef = useRef<HTMLDivElement>(null);
    const reserveSectionRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // -- Browser Closure Cache Clear --
        window.onbeforeunload = () => {
            localStorage.clear();
            sessionStorage.clear();
        };

        inputRef.current?.focus();
        mockGetEvents().then(setEvents);
        mockGetNewArrivals().then(setNewArrivals);
        mockGetTrendingBooks().then(setTrending);
        mockGetMapConfig().then(cfg => {
            setMapConfig(cfg);
            if (cfg.levels.length > 0) setActiveLevelId(cfg.levels[0].id);
        });
    }, []);

    const handleSearch = async () => {
        if (!query.trim()) return;
        setLoading(true);
        setSelectedBook(null);
        setHoldConfirmationId(null);
        try {
            const data = await mockSearchBooks(query);
            setResults(data);
            resultsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    const selectBook = (book: Book) => {
        setSelectedBook(book);
        setHoldConfirmationId(null);
        setTimeout(() => {
            reserveSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 50);
    };

    const handlePatronLogin = async () => {
        if (!loginId || !loginPin) return;
        setIsLoggingIn(true);
        const patron = await mockVerifyPatron(loginId, loginPin);
        if (patron) {
            setActivePatron(patron);
            mockGetPatronLoans(patron.student_id).then(setPatronLoans).catch(() => setPatronLoans([]));
            setShowAccountLogin(false);
            setLoginId('');
            setLoginPin('');
            setLoginStep('ID');
        } else {
            alert("Invalid credentials. Please check your ID and PIN.");
        }
        setIsLoggingIn(false);
    };

    const handleViewHistory = async () => {
        if (!activePatron) return;
        setIsHistoryLoading(true);
        setShowHistoryModal(true);
        try {
            const history = await mockGetTransactionsByPatron(activePatron.id ?? activePatron.student_id);
            setPatronHistory(history);
        } finally {
            setIsHistoryLoading(false);
        }
    };

    const handleUpdatePatronProfile = async (updatedPatron: Patron) => {
        await mockUpdatePatron(updatedPatron);
        setActivePatron(updatedPatron);
        alert("Profile updated successfully!");
    };

    const initiateHold = () => {
        if (activePatron) processHold(activePatron.student_id);
        else {
            setHoldSuccess(false);
            setShowHoldModal(true);
        }
    };

    const processHold = async (studentId: string) => {
        if (!selectedBook) return;
        setIsPlacingHold(true);

        try {
            const result = await mockPlaceHold(selectedBook.id, studentId);
            const newStatus = 'HELD' as const;
            const updatedBook = { ...selectedBook, status: newStatus };
            setHoldConfirmationId(selectedBook.id);
            setSelectedBook(updatedBook);
            const expires = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
            setPatronHolds(prev => [
                ...prev.filter(h => h.id !== selectedBook.id),
                { id: selectedBook.id, title: selectedBook.title, status: 'READY', expires },
            ]);
            const patchList = <T extends { id: string }>(list: T[]) =>
                list.map(b => b.id === selectedBook.id ? { ...b, status: newStatus } : b);
            setResults(patchList);
            setNewArrivals(patchList);
            setTrending(patchList);
            setHoldSuccess(true);
            if (activePatron) {
                setTimeout(() => setHoldSuccess(false), 5000);
            }
        } catch (err: any) {
            alert(err.message || 'Unable to place hold. Please try again.');
        } finally {
            setIsPlacingHold(false);
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        sessionStorage.clear();
        setActivePatron(null);
    };

    const handleLibrarianCall = async () => {
        if (helpStatus !== 'IDLE') return;
        setHelpStatus('REQUESTING');
        await mockTriggerHelpAlert('Kiosk Station 1');
        setHelpStatus('SUCCESS');
        setTimeout(() => setHelpStatus('IDLE'), 4000);
    };

    const BookPosterCard: React.FC<{ book: Book }> = ({ book }) => {
        const isSelected = selectedBook?.id === book.id;
        return (
            <div onClick={() => selectBook(book)} className="flex-none w-36 md:w-44 cursor-pointer snap-start">
                <div className={`relative aspect-[2/3] mb-3 bg-slate-100 rounded-xl overflow-hidden shadow-sm transition-all duration-200 ${
                    isSelected
                        ? 'ring-4 ring-blue-600 ring-offset-2 scale-[1.04] shadow-2xl shadow-blue-200'
                        : 'border border-slate-200 hover:shadow-xl hover:-translate-y-1'
                }`}>
                    {book.cover_url ? <img src={book.cover_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 p-2 text-center"><ImageOff className="h-8 w-8 mb-2 opacity-50" /><span className="text-[10px] font-black uppercase">No Cover</span></div>}
                    <div className="absolute bottom-2 left-2 right-2"><span className={`block text-center text-[10px] font-bold uppercase py-1 rounded shadow-sm backdrop-blur-md ${book.status === 'AVAILABLE' ? 'bg-green-500/90 text-white' : 'bg-slate-800/90 text-white'}`}>{book.status}</span></div>
                    {isSelected && (
                        <div className="absolute top-2 right-2 h-7 w-7 bg-blue-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                            <CheckCircle2 className="h-4 w-4 text-white" />
                        </div>
                    )}
                </div>
                <div className="px-1">
                    <h4 className={`font-bold text-sm leading-tight line-clamp-2 ${isSelected ? 'text-blue-600' : 'text-slate-800'}`}>{book.title}</h4>
                    <p className="text-xs text-slate-500 truncate">{book.author}</p>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-100 p-4 md:p-8 flex flex-col gap-6 md:gap-8 pb-24 font-sans relative">
            <LibraryAssistant />

            {/* Modals are now extracted for state safety */}
            {activePatron && (
                <ProfileEditModal
                    isOpen={showProfileEdit}
                    onClose={() => setShowProfileEdit(false)}
                    patron={activePatron}
                    onSave={handleUpdatePatronProfile}
                />
            )}

            {/* 1. Account Login Modal */}
            {showAccountLogin && (
                <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-fade-in-up">
                        <div className="bg-slate-900 p-8 text-white text-center">
                            <div className="h-16 w-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center mb-4">
                                <LogIn className="h-8 w-8" />
                            </div>
                            <h3 className="text-2xl font-black uppercase tracking-tight">Patron Login</h3>
                            <p className="text-slate-400 text-xs mt-1 uppercase tracking-widest font-black">Access your library profile</p>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Step indicator */}
                            <div className="flex items-center gap-3 justify-center mb-1">
                                <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-colors ${loginStep === 'ID' ? 'text-blue-600' : 'text-slate-400'}`}>
                                    <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-black border-2 transition-all ${loginStep === 'ID' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-emerald-500 border-emerald-500 text-white'}`}>{loginStep === 'ID' ? '1' : '✓'}</div>
                                    Patron ID
                                </div>
                                <div className="h-px w-8 bg-slate-200" />
                                <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-colors ${loginStep === 'PIN' ? 'text-blue-600' : 'text-slate-300'}`}>
                                    <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-black border-2 transition-all ${loginStep === 'PIN' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-transparent border-slate-300 text-slate-400'}`}>2</div>
                                    PIN
                                </div>
                            </div>

                            {/* ID digit display */}
                            {loginStep === 'ID' && (
                                <div className="bg-slate-50 border-2 border-blue-200 rounded-2xl px-5 py-4 text-center">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Patron ID</p>
                                    <p className="font-mono font-black text-3xl text-slate-800 tracking-widest min-h-[2.5rem]">
                                        {loginId || <span className="text-slate-300">--------</span>}
                                    </p>
                                </div>
                            )}

                            {/* PIN dot display */}
                            {loginStep === 'PIN' && (
                                <div className="bg-slate-50 border-2 border-blue-200 rounded-2xl px-5 py-4 text-center">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Secret PIN</p>
                                    <div className="flex justify-center gap-4">
                                        {[0,1,2,3].map(i => (
                                            <div key={i} className={`h-5 w-5 rounded-full border-2 transition-all ${loginPin.length > i ? 'bg-blue-600 border-blue-600 scale-110' : 'bg-slate-100 border-slate-300'}`} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Shared numpad */}
                            <div className="grid grid-cols-3 gap-2.5">
                                {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((key, idx) => {
                                    if (key === '') return <div key={idx} />;
                                    const isBackspace = key === '⌫';
                                    return (
                                        <button
                                            key={key + idx}
                                            type="button"
                                            onClick={() => {
                                                if (loginStep === 'ID') {
                                                    if (isBackspace) setLoginId(p => p.slice(0, -1));
                                                    else if (loginId.length < 8) setLoginId(p => p + key);
                                                } else {
                                                    if (isBackspace) setLoginPin(p => p.slice(0, -1));
                                                    else if (loginPin.length < 4) setLoginPin(p => p + key);
                                                }
                                            }}
                                            className={`py-4 rounded-2xl text-xl font-black transition-all active:scale-95 select-none
                                                ${isBackspace
                                                    ? 'bg-rose-50 text-rose-500 border-2 border-rose-100 hover:bg-rose-100'
                                                    : 'bg-slate-50 text-slate-800 border-2 border-slate-100 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 shadow-sm'}`}
                                        >{key}</button>
                                    );
                                })}
                            </div>

                            {/* Action buttons */}
                            <div className="flex gap-3 pt-1">
                                {loginStep === 'ID' ? (
                                    <>
                                        <button onClick={() => { setShowAccountLogin(false); setLoginId(''); setLoginPin(''); setLoginStep('ID'); }} className="flex-1 py-3.5 bg-slate-100 text-slate-500 rounded-xl font-black text-xs uppercase tracking-widest">Cancel</button>
                                        <button
                                            onClick={() => setLoginStep('PIN')}
                                            disabled={loginId.length < 4}
                                            className="flex-1 py-3.5 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100 disabled:opacity-40"
                                        >Next →</button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => { setLoginPin(''); setLoginStep('ID'); }} className="flex-1 py-3.5 bg-slate-100 text-slate-500 rounded-xl font-black text-xs uppercase tracking-widest">← Back</button>
                                        <button
                                            onClick={handlePatronLogin}
                                            disabled={isLoggingIn || loginPin.length < 4}
                                            className="flex-1 py-3.5 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100 flex items-center justify-center gap-2 disabled:opacity-40"
                                        >
                                            {isLoggingIn ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Verify ✓'}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 2. History Modal */}
            {showHistoryModal && (
                <div className="fixed inset-0 z-[250] bg-slate-900/70 backdrop-blur-lg flex items-center justify-center p-6">
                    <div className="bg-white rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-fade-in-up flex flex-col max-h-[85vh]">
                        <div className="bg-slate-900 p-8 text-white flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="h-14 w-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                                    <History className="h-7 w-7" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black uppercase tracking-tight">Financial Ledger</h3>
                                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Complete Transaction Audit</p>
                                </div>
                            </div>
                            <button onClick={() => setShowHistoryModal(false)} className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 scrollbar-thin">
                            {isHistoryLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <RefreshCw className="h-10 w-10 text-blue-600 animate-spin" />
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Syncing Local Journal...</p>
                                </div>
                            ) : patronHistory.length === 0 ? (
                                <div className="text-center py-20 space-y-4">
                                    <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto border-2 border-slate-100">
                                        <ShieldCheck className="h-10 w-10 text-slate-200" />
                                    </div>
                                    <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">No transaction records found.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {patronHistory.map(txn => (
                                        <div key={txn.id} className="flex items-center justify-between p-5 bg-slate-50 border border-slate-100 rounded-2xl group hover:border-blue-200 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${txn.type.includes('PAYMENT') || txn.type === 'WAIVE' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                                    {txn.type.includes('PAYMENT') ? <Banknote className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-800 uppercase tracking-tight leading-none mb-1">{txn.type.replace('_', ' ')}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(txn.timestamp).toLocaleDateString()} at {new Date(txn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-lg font-black font-mono ${txn.type.includes('PAYMENT') || txn.type === 'WAIVE' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {txn.type.includes('PAYMENT') || txn.type === 'WAIVE' ? '–' : '+'}RM {(txn.amount ?? 0).toFixed(2)}
                                                </p>
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Auth: {txn.librarian_id}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-8 bg-slate-50 border-t border-slate-100 shrink-0">
                            <div className="flex items-center justify-between text-slate-500">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="h-4 w-4 text-blue-500" />
                                    <span className="text-[9px] font-black uppercase tracking-widest">End-to-End Cryptography Active</span>
                                </div>
                                <button onClick={() => window.print()} className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest hover:text-blue-600 transition-colors">
                                    <FileText className="h-3 w-3" /> Export Summary
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 3. Reserve (Hold) Modal for Guests */}
            {showHoldModal && (
                <div className="fixed inset-0 z-[250] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-fade-in-up">
                        {holdSuccess ? (
                            <div className="p-12 text-center animate-fade-in">
                                <div className="h-24 w-24 bg-emerald-100 text-emerald-600 rounded-full mx-auto flex items-center justify-center mb-6 border-4 border-emerald-50">
                                    <CheckCircle2 className="h-12 w-12" />
                                </div>
                                <h3 className="text-2xl font-black uppercase tracking-tight text-slate-800 mb-2">Reserved!</h3>
                                <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                                    "{selectedBook?.title}" is now held in your name. Please collect it from the Librarian desk within 48 hours.
                                </p>
                                <button
                                    onClick={() => setShowHoldModal(false)}
                                    className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest"
                                >
                                    Close Window
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="bg-blue-600 p-8 text-white text-center">
                                    <div className="h-16 w-16 bg-white/20 rounded-2xl mx-auto flex items-center justify-center mb-4">
                                        <Bookmark className="h-8 w-8" />
                                    </div>
                                    <h3 className="text-2xl font-black uppercase tracking-tight">Reserve Resource</h3>
                                    <p className="text-blue-100 text-xs mt-1 uppercase tracking-widest font-black">Hold this item for collection</p>
                                </div>
                                <div className="p-8 space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Student Identity ID</label>
                                        <div className="relative">
                                            <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                pattern="[0-9]*"
                                                value={holdStudentId}
                                                onChange={(e) => setHoldStudentId(e.target.value.replace(/\D/g, ''))}
                                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 pl-12 font-mono font-bold text-slate-700 outline-none focus:border-blue-600"
                                                placeholder="20261234"
                                                autoFocus
                                            />
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Target Asset</p>
                                        <p className="font-bold text-slate-800 text-sm truncate">{selectedBook?.title}</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={() => setShowHoldModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-xl font-black text-xs uppercase tracking-widest">Cancel</button>
                                        <button
                                            onClick={() => processHold(holdStudentId)}
                                            disabled={isPlacingHold || !holdStudentId}
                                            className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100 flex items-center justify-center gap-2"
                                        >
                                            {isPlacingHold ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Confirm Hold"}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Main Kiosk Dashboard */}
            <div className="max-w-[1600px] mx-auto w-full grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8">
                <div className="lg:col-span-3 space-y-6 md:space-y-8">
                    <div className="bg-white p-5 md:p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start gap-6">
                        <div className="flex-1">
                            <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-6">
                                <div className="h-16 w-16 md:h-20 md:w-20 shrink-0">
                                    <img src={mapConfig?.logo || DEFAULT_LOGO_URL} alt="Logo" className="h-full w-full object-contain" />
                                </div>
                                <div>
                                    <h1 className="text-2xl md:text-4xl font-bold text-slate-800 mb-2 tracking-tight uppercase leading-none">Thomian Kiosk</h1>
                                    <p className="text-slate-500 font-bold uppercase text-[10px] md:text-xs tracking-[0.3em] opacity-70">Official Student Gateway</p>
                                </div>
                            </div>
                            <div className="relative group mt-4">
                                <div className="absolute inset-y-0 left-0 pl-4 md:pl-6 flex items-center pointer-events-none"><Search className="h-5 w-5 md:h-8 md:w-8 text-slate-400" /></div>
                                <input ref={inputRef} type="text" className="block w-full pl-12 pr-12 py-4 md:pl-16 md:pr-16 md:py-6 bg-slate-50 border-2 border-slate-300 rounded-2xl text-lg md:text-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition-all" placeholder="Find books, authors, or subjects..." value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
                            </div>
                        </div>
                        {!activePatron ? (
                            <button onClick={() => setShowAccountLogin(true)} className="bg-slate-900 text-white px-6 py-4 rounded-2xl flex items-center gap-3 font-black text-sm uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl"><LogIn className="h-5 w-5" /> My Account</button>
                        ) : (
                            <div className="bg-white border-2 border-blue-600 p-4 rounded-2xl shadow-xl flex items-center gap-4 group hover:shadow-2xl transition-all">
                                <div className="h-12 w-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black shrink-0 shadow-lg">{activePatron.full_name.charAt(0)}</div>
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Logged In</p>
                                    <p className="font-bold text-slate-800 truncate">{activePatron.full_name}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setShowProfileEdit(true)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors bg-slate-50 rounded-lg"><Settings className="h-5 w-5" /></button>
                                    <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 transition-colors bg-slate-50 rounded-lg"><LogOut className="h-5 w-5" /></button>
                                </div>
                            </div>
                        )}
                    </div>

                    {activePatron && (
                        <PatronPortal
                            patron={activePatron}
                            loans={patronLoans}
                            holds={patronHolds}
                            onViewHistory={handleViewHistory}
                            onOpenSettings={() => setShowProfileEdit(true)}
                        />
                    )}

                    {!query && !loading && !activePatron && (
                        <div className="space-y-8 animate-fade-in-up">
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                <div className="flex items-center gap-2 mb-4 px-2"><Sparkles className="h-5 w-5 text-purple-600" /><h3 className="font-black text-lg uppercase tracking-tight text-slate-800">New Arrivals</h3></div>
                                <div className="flex gap-4 overflow-x-auto pb-4 snap-x">{newArrivals.map(book => <BookPosterCard key={book.id} book={book} />)}</div>
                            </div>
                            {trending.length > 0 && (
                                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                    <div className="flex items-center gap-2 mb-4 px-2"><TrendingUp className="h-5 w-5 text-blue-600" /><h3 className="font-black text-lg uppercase tracking-tight text-slate-800">Library Favorites</h3></div>
                                    <div className="flex gap-4 overflow-x-auto pb-4 snap-x">{trending.map(book => <BookPosterCard key={book.id} book={book} />)}</div>
                                </div>
                            )}
                        </div>
                    )}

                    <div ref={resultsSectionRef} className="space-y-4 scroll-mt-24">
                        {results.map(book => (
                            <div key={book.id} onClick={() => selectBook(book)} className={`p-4 md:p-6 rounded-2xl cursor-pointer border-2 transition-all bg-white flex gap-6 ${selectedBook?.id === book.id ? 'border-blue-600 shadow-xl' : 'border-slate-200 hover:border-slate-300'}`}>
                                <div className="shrink-0 w-24 h-32 bg-slate-100 rounded-lg overflow-hidden border border-slate-200">{book.cover_url && <img src={book.cover_url} className="w-full h-full object-cover" />}</div>
                                <div className="flex-1 flex flex-col justify-between">
                                    <div>
                                        <h3 className="font-black text-xl text-slate-900 uppercase tracking-tight leading-none mb-1">{book.title}</h3>
                                        <p className="text-slate-500 font-bold uppercase text-xs tracking-widest mb-2">{book.author}</p>
                                        {book.summary && <p className="text-sm text-slate-600 line-clamp-2 mb-2">{book.summary}</p>}
                                    </div>
                                    <div className="flex items-center gap-3"><span className="bg-slate-900 text-white px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest">DDC {book.ddc_code}</span><span className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest border ${book.status === 'AVAILABLE' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>{book.status}</span></div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div ref={mapSectionRef} className="scroll-mt-6">
                        {selectedBook && (
                            <div ref={reserveSectionRef} className={`mb-6 rounded-3xl p-6 border-2 transition-all duration-500 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6 ${holdConfirmationId === selectedBook.id ? 'bg-emerald-600 border-emerald-500 text-white animate-bounce-subtle' : 'bg-white border-blue-400 text-slate-800'}`}>
                                <div className="flex items-center gap-4">
                                    <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${holdConfirmationId === selectedBook.id ? 'bg-white/20' : 'bg-blue-50 text-blue-600'}`}>
                                        {holdConfirmationId === selectedBook.id ? <CheckCircle2 className="h-8 w-8" /> : <Bookmark className="h-7 w-7 fill-current" />}
                                    </div>
                                    <div>
                                        <h3 className={`text-lg font-black uppercase tracking-tight ${holdConfirmationId === selectedBook.id ? 'text-white' : 'text-slate-800'}`}>
                                            {holdConfirmationId === selectedBook.id ? 'Hold Confirmed!' : 'Reserve This Item'}
                                        </h3>
                                        <p className={`text-sm font-black truncate max-w-xs ${holdConfirmationId === selectedBook.id ? 'text-emerald-100' : 'text-blue-600'}`}>
                                            {holdConfirmationId === selectedBook.id ? selectedBook.title : selectedBook.title}
                                        </p>
                                        <p className={`text-xs font-medium mt-0.5 ${holdConfirmationId === selectedBook.id ? 'text-emerald-50' : 'text-slate-500'}`}>
                                            {holdConfirmationId === selectedBook.id
                                                ? `Identity ${activePatron?.student_id || holdStudentId} linked. Collect from desk.`
                                                : (selectedBook.status === 'AVAILABLE' ? 'Book is on shelf. Reserve for pickup.' : 'Book is currently loaned. Join the queue.')}
                                        </p>
                                    </div>
                                </div>

                                {holdConfirmationId !== selectedBook.id ? (
                                    <button
                                        onClick={initiateHold}
                                        disabled={selectedBook.status === 'LOST' || selectedBook.status === 'HELD' || selectedBook.status === 'PROCESSING' || isPlacingHold}
                                        className={`px-8 py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-xl transition-all flex items-center gap-3 active:scale-95 disabled:opacity-50 ${selectedBook.status === 'AVAILABLE' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-amber-600 text-white hover:bg-amber-700'}`}
                                    >
                                        {isPlacingHold ? <Loader2 className="h-5 w-5 animate-spin" /> : (selectedBook.status === 'AVAILABLE' ? 'Reserve Now' : 'Place Hold')}
                                        {!isPlacingHold && <Clock className="h-4 w-4" />}
                                    </button>
                                ) : (
                                    <div className="bg-white/10 px-6 py-4 rounded-xl flex items-center gap-3 border border-white/20">
                                        <Trophy className="h-4 w-4 text-amber-300" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Queue Position: 01</span>
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="bg-white p-2 md:p-3 rounded-3xl shadow-lg border border-slate-200"><div className="w-full h-[400px] md:h-[550px] bg-slate-50 rounded-2xl relative overflow-hidden"><WayfinderMap selectedBook={selectedBook} activeLevelId={activeLevelId} onAutoSwitchLevel={(id) => setActiveLevelId(id)} /></div></div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-6 flex flex-col h-[520px] overflow-hidden">
                        <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4"><Calendar className="h-6 w-6 text-blue-600" /><h3 className="font-black text-xl uppercase tracking-tight text-slate-800">Library News</h3></div>
                        <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
                            {events.map(event => {
                                const dateObj = new Date(event.date);
                                return (
                                    <div key={event.id} className="flex flex-col p-4 rounded-2xl border-2 transition-all hover:scale-[1.02] shadow-sm bg-blue-50/50 border-blue-100">
                                        <div className="flex justify-between items-start mb-2"><div className="p-2 rounded-xl bg-blue-600 text-white shadow-md"><Calendar className="h-4 w-4" /></div><span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-white/80 px-2 py-1 rounded-lg border border-slate-100">{dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span></div>
                                        <h4 className="font-black text-sm mb-1 text-slate-800 uppercase tracking-tight">{event.title}</h4>
                                        <p className="text-[11px] text-slate-500 font-medium leading-tight line-clamp-2">{event.description}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div className="bg-slate-900 rounded-[2rem] shadow-2xl p-6 text-white text-center relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-3xl -mr-12 -mt-12 group-hover:bg-blue-500/20 transition-all"></div>
                        <h3 className="font-black text-lg uppercase tracking-tight mb-2">Need Assistance?</h3>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">Tap to alert librarian desk.</p>
                        <button onClick={handleLibrarianCall} disabled={helpStatus !== 'IDLE'} className="w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest bg-blue-600 text-white hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/50 active:scale-95">{helpStatus === 'IDLE' ? <><Bell className="h-4 w-4" /> Call Librarian</> : helpStatus === 'REQUESTING' ? "Alerting..." : "Help Confirmed"}</button>
                    </div>
                </div>
            </div>

            <style>{`
        @keyframes bounce-subtle {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
        }
        .animate-bounce-subtle {
            animation: bounce-subtle 2s ease-in-out infinite;
        }
      `}</style>
        </div>
    );
};

export default KioskHome;
