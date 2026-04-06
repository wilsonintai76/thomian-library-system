
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Database, Loader2, Plus, List, Printer, Eye, X, PackageSearch, Tag, Edit3, Calendar, MapPin, Trash2, ShieldCheck, BookOpen, Keyboard, LayoutGrid, Settings2, Building, CheckCircle, Scissors } from 'lucide-react';
import { simulateCatalogWaterfall, mockSearchBooks, mockAddBook, mockUpdateBook, mockDeleteBook, mockRestoreBook, uploadToR2, mockGetMapConfig } from '../services/api';
import { Book as BookType, MapConfig } from '../types';
import { getClassificationFromDDC } from '../utils';
import MobileScanner from './MobileScanner';
import BookLabel from './BookLabel';
import StocktakeDesk from './StocktakeDesk';
import MARCEditor from './catalog/MARCEditor';
import AcquisitionWaterfall from './catalog/AcquisitionWaterfall';
import InventoryList from './catalog/InventoryList';

type WaterfallStatus = 'IDLE' | 'PENDING' | 'FOUND' | 'NOT_FOUND' | 'STUB';

interface StepStatus {
  source: string;
  status: WaterfallStatus;
}

const CatalogingDesk: React.FC<{ initialView?: 'ADD' | 'LIST' | 'STOCKTAKE' }> = ({ initialView }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [view, setView] = useState<'ADD' | 'LIST' | 'STOCKTAKE'>(isMobile ? 'STOCKTAKE' : (initialView || 'LIST'));
  const [selectedBookIds, setSelectedBookIds] = useState<Set<string>>(new Set());
  const [isbn, setIsbn] = useState('');
  const [steps, setSteps] = useState<StepStatus[]>([
    { source: 'LOCAL', status: 'IDLE' },
    { source: 'OPEN_LIBRARY', status: 'IDLE' },
    { source: 'GOOGLE_BOOKS', status: 'IDLE' },
    { source: 'CLASSIFY', status: 'IDLE' },
    { source: 'WORKERS_AI', status: 'IDLE' }
  ]);
  const [result, setResult] = useState<Partial<BookType> | null>(null);
  const [bulkPreviewBooks, setBulkPreviewBooks] = useState<Partial<BookType>[] | null>(null);
  const [isManual, setIsManual] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [existingBook, setExistingBook] = useState<Partial<BookType> | null>(null);
  const [copies, setCopies] = useState(1);
  const [inventory, setInventory] = useState<BookType[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [undoAction, setUndoAction] = useState<{ book: BookType, timeout: NodeJS.Timeout } | null>(null);
  const [mapConfig, setMapConfig] = useState<MapConfig | null>(null);
  const isbnInputRef = useRef<HTMLInputElement>(null);

  // Sheet Print Config: AUTO (5x11), GRID_4X4 (4x4)
  const [printLayout, setPrintLayout] = useState<'SINGLE' | 'SHEET'>('SHEET');
  const [gridType, setGridType] = useState<'AUTO' | 'GRID_4X4'>('AUTO');
  const [replicateToFill, setReplicateToFill] = useState(true);

  // Helper to generate the display list based on replication
  const printItems = useMemo(() => {
    if (!bulkPreviewBooks) return [];
    if (!replicateToFill) return bulkPreviewBooks;
    
    // Fill to grid capacity
    const capacity = gridType === 'GRID_4X4' ? 16 : 55;
    const items = [];
    for (let i = 0; i < capacity; i++) {
        items.push(bulkPreviewBooks[i % bulkPreviewBooks.length]);
    }
    return items;
  }, [bulkPreviewBooks, replicateToFill, gridType]);

  useEffect(() => {
    if (view === 'ADD') {
      // Small timeout to ensure the DOM is ready after view switch
      setTimeout(() => isbnInputRef.current?.focus(), 100);
    }
  }, [view]);

  useEffect(() => {
    loadInventory();
  }, [view, searchQuery]);

  useEffect(() => {
    mockGetMapConfig().then(setMapConfig).catch(() => {});
  }, []);

  const loadInventory = async () => {
    if (view === 'LIST') {
      setIsLoadingList(true);
      const data = await mockSearchBooks(searchQuery);
      setInventory(data);
      setIsLoadingList(false);
    }
  };

  const handleCatalogSearch = async () => {
    if (!isbn) return;
    setSteps(prev => prev.map(s => ({ ...s, status: 'IDLE' })));
    await simulateCatalogWaterfall(isbn, (source, status) => {
      // Map backend sources to step keys
      let mappedSource = source;
      if (source === 'Open Library') mappedSource = 'OPEN_LIBRARY';
      if (source === 'Google Books') mappedSource = 'GOOGLE_BOOKS';
      setSteps(prev => prev.map(s => s.source === mappedSource ? { ...s, status: status as WaterfallStatus } : s));
    }).then((data) => {
      if (data) {
        if ((data as BookType).id) {
          // Book already in catalog — switch to the add-copies flow
          setExistingBook(data);
          setResult(null);
          return;
        }
      setExistingBook(null);
      const ddc = (data as any).ddc_code;
      const authorShort = (data.author || '').slice(0, 3).toUpperCase();
      setResult({
        ...(data as any),
        id: undefined,
        material_type: 'REGULAR',
        status: 'AVAILABLE',
        value: data.value || 25.00,
        acquisition_date: new Date().toISOString().split('T')[0],
        classification: getClassificationFromDDC(ddc),
        call_number: ddc ? `${ddc} ${authorShort}` : '',
        cutter_number: authorShort,
        _source: (data as any).source || '', // Track which API provided the data
      } as any);
      // MANUAL stub = no API had data; open editor with ISBN pre-filled
      setIsManual(!data.title);
    } else {
      setExistingBook(null);
      setIsManual(true);
      setResult({ isbn, status: 'AVAILABLE', material_type: 'REGULAR', value: 25.00, _source: '' } as any);
    }
    // Optionally, display the source of cataloging data in the UI
    // Example usage in your render:
    // {result && (result as any)._source && <div className="text-xs text-slate-500 mt-1">Source: {(result as any)._source}</div>}
    });
  };

  const handleCommit = async () => {
    if (!result || !result.title || !result.author) {
      alert("Biblio Title and Primary Author are mandatory for MARC records.");
      return;
    }
    setIsSaving(true);
    try {
      if (result.id) {
        await mockUpdateBook(result as BookType);
        setResult(null);
        setIsbn('');
        setView('LIST');
      } else {
        const base = { ...result, isbn: isbn || result.isbn };
        for (let i = 0; i < copies; i++) {
          // Copy 1 keeps the barcode the librarian entered; copies 2+ get a blank
          // barcode so each can be stickered and updated individually from the list.
          const copyData = i === 0 ? base : { ...base, barcode_id: '' };
          await mockAddBook(copyData as BookType);
        }
        setCopies(1);
        setResult(null);
        setIsbn('');
        setView('LIST');
      }
    } catch (err: any) {
      alert(`Save failed: ${err?.message || 'Unknown error. Check network or re-login.'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCopies = async () => {
    if (!existingBook) return;
    setIsSaving(true);
    try {
      const base = {
        ...existingBook,
        id: undefined,
        barcode_id: '',
        status: 'AVAILABLE' as const,
        acquisition_date: new Date().toISOString().split('T')[0],
      };
      for (let i = 0; i < copies; i++) {
        await mockAddBook(base as BookType);
      }
      setCopies(1);
      setExistingBook(null);
      setIsbn('');
      setView('LIST');
    } catch (err: any) {
      alert(`Failed to add copies: ${err?.message || 'Unknown error.'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This will remove the item from active holdings. All loan history will be archived.")) return;

    const bookToDelete = inventory.find(b => b.id === id);
    if (!bookToDelete) return;

    await mockDeleteBook(id);
    setInventory(prev => prev.filter(b => b.id !== id));

    if (undoAction) clearTimeout(undoAction.timeout);

    const timeout = setTimeout(() => {
      setUndoAction(null);
    }, 5000);

    setUndoAction({ book: bookToDelete, timeout });
  };

  const handleUndoDelete = async () => {
    if (!undoAction) return;
    clearTimeout(undoAction.timeout);
    await mockRestoreBook(undoAction.book);
    setInventory(prev => [undoAction.book, ...prev]);
    setUndoAction(null);
  };

  const handleEditBook = (book: BookType) => {
    setExistingBook(null);
    setResult(book);
    setIsbn(book.isbn);
    setIsManual(true);
    setView('ADD');
  };

  const handlePrintRequest = async (books: Partial<BookType>[]) => {
    // Auto-assign barcodes for any books that don't have one yet
    const resolved = await Promise.all(
      books.map(async (b) => {
        if (b.barcode_id || !b.id) return b;
        try {
          // PATCH with no barcode_id triggers backend auto-generation
          const saved = await mockUpdateBook(b as BookType);
          return saved;
        } catch {
          return b; // keep as-is if patch fails
        }
      })
    );
    setBulkPreviewBooks(resolved);
    setPrintLayout(resolved.length > 1 ? 'SHEET' : 'SINGLE');
    setReplicateToFill(false); // Default to selected count, not auto-fill
  };

  const handlePrintAction = () => {
    if (!bulkPreviewBooks || bulkPreviewBooks.length === 0) return;
    window.print();
  };

  const startBlankAsset = () => {
    setExistingBook(null);
    setResult({
      title: '',
      author: '',
      isbn: '',
      barcode_id: '',
      status: 'AVAILABLE',
      material_type: 'REGULAR',
      value: 20.00,
      acquisition_date: new Date().toISOString().split('T')[0]
    });
    setCopies(1);
    setIsManual(true);
    setIsbn('');
    setSteps(prev => prev.map(s => ({ ...s, status: 'IDLE' })));
  };

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto h-full flex flex-col relative pb-32">
      {undoAction && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 z-[100] animate-fade-in-up print:hidden">
          <span className="text-sm font-medium">Item "{undoAction.book.title}" deleted.</span>
          <button onClick={handleUndoDelete} className="text-blue-400 font-bold uppercase tracking-widest text-xs hover:text-blue-300">Undo</button>
          <button aria-label="Dismiss" onClick={() => { clearTimeout(undoAction.timeout); setUndoAction(null); }} className="text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
      )}
      {isScannerOpen && <MobileScanner onScan={(text) => { setIsScannerOpen(false); setIsbn(text); handleCatalogSearch(); }} onClose={() => setIsScannerOpen(false)} />}

      {bulkPreviewBooks && (
        <div className="fixed inset-0 z-[120] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-6 print:bg-white print:backdrop-blur-none print:inset-0 print:p-0 print-container-root">
          <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl animate-fade-in-up flex flex-col items-center gap-6 max-h-[90vh] w-full max-w-5xl overflow-hidden print:shadow-none print:rounded-none print:p-0 print:max-h-none print:overflow-visible print:max-w-none print-page-flow">

            <div className="flex flex-col md:flex-row md:items-center justify-between w-full border-b border-slate-100 pb-6 print:hidden gap-4">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight text-slate-800">
                  {bulkPreviewBooks.length > 1 ? `Batch Print Job: ${bulkPreviewBooks.length} Stickers` : 'Asset Sticker Preview'}
                </h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 text-blue-600">Tip: Enable "Background Graphics" in print settings for cut guides.</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                  {/* Fill Page Replicator */}
                  {bulkPreviewBooks.length === 1 && (
                      <label className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl cursor-pointer hover:bg-slate-200 transition-colors">
                          <input type="checkbox" checked={replicateToFill} onChange={(e) => setReplicateToFill(e.target.checked)} className="accent-blue-600 h-4 w-4" />
                          <span className="text-[10px] font-black uppercase text-slate-600">Auto-Fill Sheet</span>
                      </label>
                  )}

                  {/* Grid Selector */}
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button onClick={() => setGridType('AUTO')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase ${gridType === 'AUTO' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>5x11 Grid</button>
                    <button onClick={() => setGridType('GRID_4X4')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase ${gridType === 'GRID_4X4' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>4x4 Grid</button>
                  </div>

                  {/* Mode Selector - Hidden in 4x4 or Sheet mode if needed, but let's keep it */}
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button onClick={() => setPrintLayout('SINGLE')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase flex items-center gap-2 ${printLayout === 'SINGLE' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}><Scissors className="h-3.5 w-3.5" /> A4 Plain</button>
                    <button onClick={() => setPrintLayout('SHEET')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase flex items-center gap-2 ${printLayout === 'SHEET' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}><LayoutGrid className="h-3.5 w-3.5" /> Label sheet</button>
                  </div>
              </div>
            </div>

            <div className={`
                    print-area flex-1 overflow-y-auto w-full p-4 scrollbar-thin print:p-0 print:overflow-visible
                    ${printLayout === 'SHEET' 
                        ? (gridType === 'GRID_4X4' ? 'grid-4x4 print-page-a4' : 'grid-5x11 print-page-a4') 
                        : 'flex flex-wrap justify-center gap-6 print:grid print:grid-cols-5 print:gap-2'}
                  `}>
              {printItems.map((book, idx) => (
                <div key={idx} className="print:break-inside-avoid flex items-center justify-center cut-guide-dotted">
                  <BookLabel book={book} isSheetMode={printLayout === 'SHEET'} />
                </div>
              ))}
            </div>

            <div className="flex gap-4 w-full print:hidden shrink-0 mt-4 border-t border-slate-100 pt-6">
              <div className="flex-1 flex items-center gap-3 text-slate-400 text-[10px] font-bold uppercase tracking-tighter">
                <Settings2 className="h-4 w-4" />
                <span>Printer scaling must be "Default" or "100%" for perfect label alignment.</span>
              </div>
              <button onClick={() => setBulkPreviewBooks(null)} className="px-8 py-4 bg-slate-100 text-slate-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-200">Close</button>
              <button onClick={handlePrintAction} className="px-12 py-4 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 flex items-center justify-center gap-2 shadow-xl shadow-blue-100 active:scale-95 transition-all">
                <Printer className="h-5 w-5" /> Execute Print
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3 uppercase tracking-tighter">
            <Database className="h-8 w-8 text-blue-600" />
            {view === 'STOCKTAKE' ? 'Inventory Audit' : 'Catalog Manager'}
          </h2>
          <p className="text-slate-500 font-medium">Manage MARC records, acquisition streams, and holdings.</p>
        </div>
        {!isMobile && (
          <div className="flex items-center gap-4">
            <div className="bg-slate-100 p-1 rounded-2xl flex border border-slate-200">
              <button onClick={() => setView('LIST')} className={`px-6 py-2.5 text-[10px] font-black uppercase rounded-xl flex items-center gap-2 transition-all ${view === 'LIST' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}><List className="h-3.5 w-3.5" /> Registry</button>
              <button onClick={() => { setView('ADD'); setResult(null); setIsbn(''); setExistingBook(null); }} className={`px-6 py-2.5 text-[10px] font-black uppercase rounded-xl flex items-center gap-2 transition-all ${view === 'ADD' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}><Plus className="h-3.5 w-3.5" /> Acquisition</button>
              <button onClick={() => setView('STOCKTAKE')} className={`px-6 py-2.5 text-[10px] font-black uppercase rounded-xl flex items-center gap-2 transition-all ${view === 'STOCKTAKE' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}><PackageSearch className="h-3.5 w-3.5" /> Inventory Audit</button>
            </div>
          </div>
        )}
      </div>

      {view === 'STOCKTAKE' && <StocktakeDesk />}

      {view === 'ADD' && !isMobile && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-fade-in-up">
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">New Asset Stream</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                    <input
                      type="text"
                      ref={isbnInputRef}
                      value={isbn}
                      onChange={(e) => setIsbn(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCatalogSearch()}
                      className="block w-full rounded-2xl border-2 border-slate-100 pl-12 pr-4 py-4 font-mono font-bold text-lg outline-none focus:border-blue-500 transition-all bg-slate-50/50"
                      placeholder="ISBN-13 / BARCODE..."
                    />
                  </div>
                  <button aria-label="Search ISBN" onClick={handleCatalogSearch} className="px-6 rounded-2xl shadow-xl text-white bg-blue-600 hover:bg-blue-700 transition-all active:scale-95"><Search className="h-6 w-6" /></button>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Copies / Qty</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setCopies(c => Math.max(1, c - 1))} className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-black text-slate-600 text-sm transition-all">−</button>
                    <span className={`font-black w-8 text-center text-sm ${copies > 1 ? 'text-blue-600' : 'text-slate-400'}`}>{copies}</span>
                    <button onClick={() => setCopies(c => Math.min(20, c + 1))} className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-black text-slate-600 text-sm transition-all">+</button>
                  </div>
                </div>
                <button onClick={() => setIsScannerOpen(true)} className="w-full py-4 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2 border border-slate-200">
                  <Edit3 className="h-4 w-4" /> Use Camera Scan
                </button>
                <button onClick={startBlankAsset} className="w-full py-4 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg">
                  <Keyboard className="h-4 w-4" /> Manual MARC Entry
                </button>
              </div>
            </div>
            <AcquisitionWaterfall steps={steps} />
          </div>
          <div className="lg:col-span-8 h-full min-h-[800px]">
            {existingBook ? (
              <div className="bg-white rounded-[2.5rem] border-2 border-emerald-200 shadow-2xl h-full flex flex-col ring-8 ring-emerald-50">
                <div className="p-8 border-b border-emerald-100 flex justify-between items-center bg-emerald-50/50 rounded-t-[2.5rem]">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">Already in Catalog</h3>
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">This title is registered — adding new physical copies</p>
                    </div>
                  </div>
                  <span className="bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">EXISTING TITLE</span>
                </div>
                <div className="p-8 flex-1 flex gap-8 overflow-y-auto">
                  {existingBook.cover_url && (
                    <img src={existingBook.cover_url} alt="Cover" className="w-36 h-52 object-cover rounded-2xl shadow-lg shrink-0" />
                  )}
                  <div className="flex-1 space-y-6">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Title</p>
                      <p className="text-2xl font-black text-slate-800 leading-tight">{existingBook.title}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Author</p>
                        <p className="font-bold text-slate-700">{existingBook.author}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ISBN</p>
                        <p className="font-mono font-bold text-slate-700">{existingBook.isbn}</p>
                      </div>
                      {existingBook.call_number && <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Call Number</p>
                        <p className="font-mono font-bold text-slate-700">{existingBook.call_number}</p>
                      </div>}
                      {existingBook.shelf_location && <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Shelf Location</p>
                        <p className="font-bold text-slate-700">{existingBook.shelf_location}</p>
                      </div>}
                      {existingBook.pub_year && <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Year Published</p>
                        <p className="font-bold text-slate-700">{existingBook.pub_year}</p>
                      </div>}
                      {existingBook.publisher && <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Publisher</p>
                        <p className="font-bold text-slate-700">{existingBook.publisher as string}</p>
                      </div>}
                    </div>
                    <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100">
                      <p className="text-[11px] font-black text-emerald-700 uppercase tracking-widest">
                        {copies === 1 ? '1 new physical copy' : `${copies} new physical copies`} will be added to holdings. Each copy receives a unique auto-generated barcode ID.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-8 border-t border-emerald-100 flex gap-4 shrink-0">
                  <button
                    onClick={() => { setExistingBook(null); setIsbn(''); setCopies(1); setSteps(prev => prev.map(s => ({ ...s, status: 'IDLE' }))); }}
                    className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddCopies}
                    disabled={isSaving}
                    className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-emerald-700 flex items-center justify-center gap-3 shadow-xl shadow-emerald-100 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                    {isSaving ? 'Adding...' : `Add ${copies} Physical ${copies === 1 ? 'Copy' : 'Copies'} to Holdings`}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <MARCEditor
                  book={result || {}}
                  setBook={setResult}
                  isManual={isManual}
                  isSaving={isSaving}
                  copies={copies}
                  onCommit={handleCommit}
                  onPreview={() => handlePrintRequest([result as BookType])}
                  onCancel={() => { setCopies(1); setResult(null); setIsbn(''); setView('LIST'); }}
                  onImageUpload={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setIsSaving(true);
                      const publicUrl = await uploadToR2(file);
                      if (publicUrl) {
                        setResult(prev => ({ ...prev, cover_url: publicUrl }));
                      } else {
                        alert('Cloudflare R2 Upload Failed.');
                      }
                      setIsSaving(false);
                    }
                  }}
                />
              </>
            )}
          </div>
        </div>
      )}

      {view === 'LIST' && !isMobile && (
        <InventoryList
          inventory={inventory}
          isLoading={isLoadingList}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onEdit={handleEditBook}
          onDelete={handleDelete}
          onPrint={(books) => handlePrintRequest(books)}
          onAddRequested={() => { setView('ADD'); startBlankAsset(); }}
          selectedIds={selectedBookIds}
          setSelectedIds={setSelectedBookIds}
          logoUrl={mapConfig?.logo}
        />
      )}

    </div>
  );
};

export default CatalogingDesk;
