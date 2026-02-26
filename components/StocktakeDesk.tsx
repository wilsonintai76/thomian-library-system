
import React, { useState, useEffect, useRef } from 'react';
import { PackageSearch, Plus, Square, Zap, Smartphone, Monitor, Camera, History, ScanLine, CheckCircle, AlertTriangle, ArrowRight, BookOpen, Trash2, X, ChevronRight, LayoutTemplate, ListCheck, RefreshCw } from 'lucide-react';
import { mockGetBooksByShelf, mockGetBookByBarcode } from '../services/api';
import { Book as BookType } from '../types';
import MobileScanner from './MobileScanner';

const StocktakeDesk: React.FC = () => {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [targetShelf, setTargetShelf] = useState('Shelf A');
    const [stockInput, setStockInput] = useState('');
    const [expectedBooks, setExpectedBooks] = useState<BookType[]>([]);
    const [scannedBooks, setScannedBooks] = useState<BookType[]>([]);
    const [misplacedBooks, setMisplacedBooks] = useState<BookType[]>([]);
    const [isAuditActive, setIsAuditActive] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [lastScanResult, setLastScanResult] = useState<{ status: 'OK' | 'MISPLACED' | 'NOT_FOUND', book?: BookType } | null>(null);
    const [flash, setFlash] = useState<'GREEN' | 'RED' | null>(null);

    const stockInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (isAuditActive && !isScannerOpen && !isMobile) {
            const timer = setTimeout(() => stockInputRef.current?.focus(), 100);
            return () => clearTimeout(timer);
        }
    }, [isAuditActive, isScannerOpen, isMobile]);

    const triggerFlash = (type: 'GREEN' | 'RED') => {
        setFlash(type);
        setTimeout(() => setFlash(null), 300);
    };

    const startAudit = async () => {
        setIsAuditActive(true);
        setLastScanResult(null);
        const books = await mockGetBooksByShelf(targetShelf);
        setExpectedBooks(books);
        setScannedBooks([]);
        setMisplacedBooks([]);
    };

    const stopAudit = () => {
        setIsAuditActive(false);
        if (scannedBooks.length > 0 || misplacedBooks.length > 0) {
            alert(`Shelf Audit Finalized: ${targetShelf}\n----------------------------\nVerified Assets: ${scannedBooks.length}\nMisplaced Assets: ${misplacedBooks.length}`);
        }
    };

    const processStockScan = async (barcode: string) => {
        if (!barcode.trim()) return;
        const query = barcode.trim();

        const book = await mockGetBookByBarcode(query);
        if (book) {
            if (book.shelf_location === targetShelf) {
                setScannedBooks(prev => [book, ...prev]);
                setLastScanResult({ status: 'OK', book });
                triggerFlash('GREEN');
                setTimeout(() => setLastScanResult(prev => prev?.book?.id === book.id ? null : prev), 1200);
            } else {
                setMisplacedBooks(prev => [book, ...prev]);
                setLastScanResult({ status: 'MISPLACED', book });
                triggerFlash('RED');
            }
        } else {
            setLastScanResult({ status: 'NOT_FOUND' });
            triggerFlash('RED');
        }
        setStockInput('');
    };

    /**
     * MOBILE VIEW: AISLE MODE (ONE-HANDED)
     */
    const MobileUI = () => (
        <div className={`flex flex-col h-full font-sans transition-all duration-300 ${isAuditActive ? 'bg-slate-950' : 'bg-slate-50'}`}>
            {isScannerOpen && <MobileScanner onScan={processStockScan} onClose={() => setIsScannerOpen(false)} />}

            {/* Flash Overlay */}
            {flash && (
                <div className={`fixed inset-0 z-[300] transition-opacity duration-300 pointer-events-none ${flash === 'GREEN' ? 'bg-emerald-500/40' : 'bg-rose-600/40'}`}></div>
            )}

            {!isAuditActive ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 gap-10">
                    <div className="h-32 w-32 bg-blue-600 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl shadow-blue-900/40 rotate-3 animate-fade-in">
                        <ListCheck className="h-14 w-14" />
                    </div>
                    <div className="text-center space-y-3">
                        <h3 className="text-3xl font-black text-slate-800 uppercase tracking-tight">Zone Audit</h3>
                        <p className="text-slate-400 text-sm font-bold uppercase tracking-widest leading-relaxed">Select a physical shelf zone <br /> to verify digital records.</p>
                    </div>
                    <div className="w-full space-y-4">
                        <select
                            value={targetShelf}
                            onChange={(e) => setTargetShelf(e.target.value)}
                            className="w-full bg-white border-4 border-slate-200 rounded-[2rem] py-6 px-10 text-2xl font-black text-slate-800 outline-none shadow-xl appearance-none text-center"
                        >
                            <option value="Shelf A">Shelf A</option>
                            <option value="Shelf B">Shelf B</option>
                            <option value="Shelf C">Shelf C</option>
                            <option value="Shelf D">Shelf D</option>
                        </select>
                        <button onClick={startAudit} className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black text-xl uppercase tracking-widest shadow-2xl active:scale-95 transition-all">
                            Begin Audit
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col">
                    <div className={`h-[40vh] flex flex-col items-center justify-center p-8 text-center transition-all duration-500 ${!lastScanResult ? 'bg-slate-900' :
                            lastScanResult.status === 'OK' ? 'bg-emerald-600' : 'bg-rose-700 animate-shake shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]'
                        }`}>
                        {!lastScanResult ? (
                            <div className="animate-pulse">
                                <Zap className="h-16 w-16 text-blue-500 mb-6 mx-auto" />
                                <p className="text-white/30 text-xs font-black uppercase tracking-[0.4em]">Awaiting Live Scan...</p>
                            </div>
                        ) : (
                            <div className="animate-fade-in-up text-white w-full max-w-sm">
                                <div className="h-24 w-24 bg-white/20 rounded-full mx-auto flex items-center justify-center mb-6 backdrop-blur-2xl shadow-inner border border-white/20">
                                    {lastScanResult.status === 'OK' ? <CheckCircle className="h-12 w-12" /> : <AlertTriangle className="h-12 w-12" />}
                                </div>
                                <h4 className="text-2xl md:text-3xl font-black tracking-tight leading-none mb-3 truncate">{lastScanResult.book?.title || 'System Error'}</h4>
                                <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                                    {lastScanResult.status === 'OK' ? 'Asset Verified' : 'MISPLACED RESOURCE'}
                                </p>
                                {lastScanResult.status === 'MISPLACED' && (
                                    <div className="bg-white text-rose-900 px-8 py-3 rounded-full inline-block font-black text-xl border-4 border-rose-400/50 shadow-2xl animate-bounce">
                                        TARGET: {lastScanResult.book?.shelf_location}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex-1 p-8 space-y-6 flex flex-col">
                        <button
                            onClick={() => setIsScannerOpen(true)}
                            className="w-full py-12 bg-blue-600 rounded-[3rem] flex flex-col items-center justify-center gap-4 text-white shadow-[0_20px_50px_rgba(37,99,235,0.4)] active:scale-95 transition-all border-4 border-white/10"
                        >
                            <Camera className="h-12 w-12" />
                            <span className="text-sm font-black uppercase tracking-[0.3em]">Scan Next Item</span>
                        </button>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] text-center shadow-lg">
                                <p className="text-white/30 text-[9px] font-black uppercase tracking-widest mb-2">Verified</p>
                                <p className="text-5xl font-black text-emerald-400">{scannedBooks.length}</p>
                            </div>
                            <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] text-center shadow-lg">
                                <p className="text-white/30 text-[9px] font-black uppercase tracking-widest mb-2">Misplaced</p>
                                <p className="text-5xl font-black text-rose-400">{misplacedBooks.length}</p>
                            </div>
                        </div>

                        <div className="mt-auto">
                            <button onClick={stopAudit} className="w-full py-5 text-white/30 font-black text-xs uppercase tracking-[0.3em] border border-white/10 rounded-2xl active:bg-white/5 transition-all">
                                Complete Audit Job
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    /**
     * DESKTOP VIEW: AUDIT MANAGER
     */
    const DesktopUI = () => (
        <div className="h-full flex flex-col gap-6 animate-fade-in-up p-8">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center justify-between shrink-0">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
                        <PackageSearch className="h-8 w-8" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 tracking-tighter uppercase leading-none mb-1">Audit Control</h3>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Active Zone: <span className="text-blue-600">{targetShelf}</span></p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {!isAuditActive ? (
                        <>
                            <select value={targetShelf} onChange={(e) => setTargetShelf(e.target.value)} className="bg-slate-50 border-2 border-slate-100 rounded-xl py-2.5 px-6 text-xs font-black text-slate-700 outline-none focus:border-blue-500 cursor-pointer shadow-sm">
                                <option value="Shelf A">Shelf A</option>
                                <option value="Shelf B">Shelf B</option>
                                <option value="Shelf C">Shelf C</option>
                                <option value="Shelf D">Shelf D</option>
                            </select>
                            <button onClick={startAudit} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2">
                                <Plus className="h-4 w-4" /> Initialize Audit
                            </button>
                        </>
                    ) : (
                        <button onClick={stopAudit} className="bg-rose-600 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-rose-100 hover:bg-rose-700 transition-all flex items-center gap-2">
                            <Square className="h-4 w-4 fill-current" /> Terminate Session
                        </button>
                    )}
                </div>
            </div>

            {isAuditActive && (
                <div className="flex-1 grid grid-cols-12 gap-6 min-h-0 overflow-hidden">
                    {/* High-Speed Scan Column */}
                    <div className="col-span-4 space-y-6 flex flex-col">
                        <div className="bg-white p-6 rounded-[2rem] border-4 border-blue-600 shadow-xl relative overflow-hidden group shrink-0">
                            <div className="flex items-center justify-between mb-4">
                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">HID Hardware Channel</label>
                                <div className="h-2 w-2 rounded-full bg-blue-500 animate-ping"></div>
                            </div>
                            <div className="relative">
                                <input
                                    ref={stockInputRef}
                                    type="text"
                                    value={stockInput}
                                    onChange={(e) => setStockInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && processStockScan(stockInput)}
                                    className="w-full text-3xl font-mono p-5 border-2 border-slate-100 rounded-xl focus:border-blue-600 outline-none uppercase transition-all shadow-inner bg-slate-50/50"
                                    placeholder="SCAN..."
                                />
                                <Monitor className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-200 h-6 w-6" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 shrink-0">
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
                                <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1">Verified</p>
                                <p className="text-5xl font-black text-emerald-600 tracking-tighter">{scannedBooks.length}</p>
                            </div>
                            <div className={`p-6 rounded-2xl border-2 text-center transition-all ${misplacedBooks.length > 0 ? 'bg-amber-50 border-amber-500 shadow-md' : 'bg-white border-slate-200 shadow-sm'}`}>
                                <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1">Misplaced</p>
                                <p className={`text-5xl font-black tracking-tighter ${misplacedBooks.length > 0 ? 'text-amber-600' : 'text-slate-200'}`}>{misplacedBooks.length}</p>
                            </div>
                        </div>

                        <div className="flex-1 bg-slate-900 rounded-2xl p-6 text-white relative overflow-hidden flex flex-col justify-center">
                            <div className="relative z-10 space-y-3">
                                <h4 className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Audit Policy</h4>
                                <p className="text-[11px] text-slate-400 leading-relaxed font-medium">Scanning verifies the physical existence of an asset in its assigned DDC zone. Misplaced items will trigger a location alert.</p>
                            </div>
                            <div className="absolute -bottom-10 -right-10 h-32 w-32 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
                        </div>
                    </div>

                    {/* Audit Log Column */}
                    <div className="col-span-8 bg-white rounded-[2rem] border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                        <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
                            <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Real-Time Inventory Stream</h3>
                            <div className="flex gap-4">
                                <div className="flex items-center gap-1.5">
                                    <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Correct</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="h-2 w-2 rounded-full bg-amber-500"></div>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Misplaced</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 space-y-4 scrollbar-thin">
                            {misplacedBooks.length === 0 && scannedBooks.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-300 italic">
                                    <ScanLine className="h-16 w-16 mb-6 opacity-5" />
                                    <p className="text-xl font-black uppercase tracking-tighter opacity-10">Live Buffer Empty</p>
                                </div>
                            ) : (
                                <>
                                    {misplacedBooks.map((book, i) => (
                                        <div key={`m-${i}`} className="flex items-center gap-6 p-6 bg-amber-50 border-2 border-amber-100 rounded-2xl animate-shake shadow-lg">
                                            <div className="h-12 w-12 bg-amber-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-md">
                                                <AlertTriangle className="h-6 w-6" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xl font-black text-slate-800 truncate mb-1">{book.title}</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[9px] font-black text-amber-700 uppercase tracking-widest">Target Zone:</span>
                                                    <span className="bg-amber-600 text-white px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest">{book.shelf_location}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {scannedBooks.map((book, i) => (
                                        <div key={`s-${i}`} className="flex items-center gap-5 p-4 bg-slate-50 border border-slate-100 rounded-xl hover:bg-white transition-all group">
                                            <div className="h-10 w-10 bg-white border border-slate-100 rounded-lg flex items-center justify-center shrink-0 group-hover:shadow-md transition-all">
                                                <CheckCircle className="h-5 w-5 text-emerald-500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-slate-700 text-sm leading-tight truncate">{book.title}</p>
                                                <p className="text-[8px] font-mono text-slate-400 mt-1 uppercase tracking-widest">{book.barcode_id}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-full">Verified</p>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    return isMobile ? <MobileUI /> : <DesktopUI />;
};

export default StocktakeDesk;
