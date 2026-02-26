
import React, { useState, useEffect, useRef } from 'react';
import { Search, Database, Loader2, Plus, List, Printer, Eye, X, PackageSearch, Tag, Edit3, Calendar, MapPin, Trash2, ShieldCheck, Sparkles, BookOpen, Keyboard, LayoutGrid, Settings2, Building, DollarSign } from 'lucide-react';
import { simulateCatalogWaterfall, mockSearchBooks, mockAddBook, mockUpdateBook, mockPrintBookLabel, mockBulkPrintLabels, mockDeleteBook, mockRestoreBook } from '../services/api';
import { Book as BookType } from '../types';
import MobileScanner from './MobileScanner';
import BookLabel from './BookLabel';
import StocktakeDesk from './StocktakeDesk';
import MARCEditor from './catalog/MARCEditor';
import AcquisitionWaterfall from './catalog/AcquisitionWaterfall';
import InventoryList from './catalog/InventoryList';

type WaterfallStatus = 'IDLE' | 'PENDING' | 'FOUND' | 'NOT_FOUND';

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
    { source: 'LOCAL', status: 'IDLE' }, { source: 'ZEBRA_LOC', status: 'IDLE' }, { source: 'OPEN_LIBRARY', status: 'IDLE' }
  ]);
  const [result, setResult] = useState<Partial<BookType> | null>(null);
  const [bulkPreviewBooks, setBulkPreviewBooks] = useState<Partial<BookType>[] | null>(null);
  const [isManual, setIsManual] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [inventory, setInventory] = useState<BookType[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [undoAction, setUndoAction] = useState<{ book: BookType, timeout: NodeJS.Timeout } | null>(null);

  // Sheet Print Config
  const [printLayout, setPrintLayout] = useState<'SINGLE' | 'SHEET'>('SHEET');

  useEffect(() => {
    loadInventory();
  }, [view, searchQuery]);

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
      setSteps(prev => prev.map(s => s.source === source ? { ...s, status: status as WaterfallStatus } : s));
    }).then((data) => {
      if (data) {
        setResult({
          ...data,
          material_type: 'REGULAR',
          status: 'AVAILABLE',
          value: data.value || 25.00,
          acquisition_date: new Date().toISOString().split('T')[0]
        });
        setIsManual(false);
      } else {
        setIsManual(true);
        setResult({ isbn, status: 'AVAILABLE', material_type: 'REGULAR', value: 25.00 });
      }
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
        alert("Record updated in core directory.");
      } else {
        await mockAddBook({ ...result, isbn: isbn || result.isbn } as BookType);
        alert("New asset accessioned.");
      }
      setResult(null);
      setIsbn('');
      setView('LIST');
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
    setResult(book);
    setIsbn(book.isbn);
    setIsManual(true);
    setView('ADD');
  };

  const handlePrintRequest = (books: Partial<BookType>[]) => {
    setBulkPreviewBooks(books);
    setPrintLayout(books.length > 1 ? 'SHEET' : 'SINGLE');
    if (books.length === 1) mockPrintBookLabel(books[0] as BookType);
    else mockBulkPrintLabels(books);
  };

  const handlePrintAction = () => {
    window.print();
  };

  const startBlankAsset = () => {
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
    setIsManual(true);
    setIsbn('');
    setSteps(prev => prev.map(s => ({ ...s, status: 'IDLE' })));
  };

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto h-full flex flex-col relative pb-32">
      {undoAction && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 z-[100] animate-fade-in-up">
          <span className="text-sm font-medium">Item "{undoAction.book.title}" deleted.</span>
          <button onClick={handleUndoDelete} className="text-blue-400 font-bold uppercase tracking-widest text-xs hover:text-blue-300">Undo</button>
          <button onClick={() => { clearTimeout(undoAction.timeout); setUndoAction(null); }} className="text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
      )}
      {isScannerOpen && <MobileScanner onScan={(text) => { setIsScannerOpen(false); setIsbn(text); handleCatalogSearch(); }} onClose={() => setIsScannerOpen(false)} />}

      {bulkPreviewBooks && (
        <div className="fixed inset-0 z-[120] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-6 print:bg-white print:backdrop-blur-none print:inset-0 print:p-0">
          <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl animate-fade-in-up flex flex-col items-center gap-6 max-h-[90vh] w-full max-w-5xl overflow-hidden print:shadow-none print:rounded-none print:p-0 print:max-h-none print:overflow-visible print:max-w-none">

            <div className="flex items-center justify-between w-full border-b border-slate-100 pb-6 print:hidden">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight text-slate-800">
                  {bulkPreviewBooks.length > 1 ? `Batch Print Job: ${bulkPreviewBooks.length} Stickers` : 'Asset Sticker Preview'}
                </h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Configured for 1.5" x 1" Standard Labels</p>
              </div>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button onClick={() => setPrintLayout('SINGLE')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase flex items-center gap-2 ${printLayout === 'SINGLE' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}><Printer className="h-3.5 w-3.5" /> Thermal</button>
                <button onClick={() => setPrintLayout('SHEET')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase flex items-center gap-2 ${printLayout === 'SHEET' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}><LayoutGrid className="h-3.5 w-3.5" /> Sheet Grid</button>
              </div>
            </div>

            <div className={`
                    print-area flex-1 overflow-y-auto w-full p-4 scrollbar-thin 
                    ${printLayout === 'SHEET' ? 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 print:grid-cols-3 print:gap-0' : 'flex flex-wrap justify-center gap-6 print:block'}
                  `}>
              {bulkPreviewBooks.map((book, idx) => (
                <div key={idx} className="print:break-after-avoid flex items-center justify-center">
                  <BookLabel book={book} isSheetMode={printLayout === 'SHEET'} />
                </div>
              ))}
            </div>

            <div className="flex gap-4 w-full print:hidden shrink-0 mt-4 border-t border-slate-100 pt-6">
              <div className="flex-1 flex items-center gap-3 text-slate-400 text-[10px] font-bold uppercase tracking-tighter">
                <Settings2 className="h-4 w-4" />
                <span>Ensure "Background Graphics" is ON in print settings.</span>
              </div>
              <button onClick={() => setBulkPreviewBooks(null)} className="px-8 py-4 bg-slate-100 text-slate-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-200">Cancel Job</button>
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
              <button onClick={() => { setView('ADD'); setResult(null); setIsbn(''); }} className={`px-6 py-2.5 text-[10px] font-black uppercase rounded-xl flex items-center gap-2 transition-all ${view === 'ADD' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}><Plus className="h-3.5 w-3.5" /> Acquisition</button>
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
                      value={isbn}
                      onChange={(e) => setIsbn(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCatalogSearch()}
                      className="block w-full rounded-2xl border-2 border-slate-100 pl-12 pr-4 py-4 font-mono font-bold text-lg outline-none focus:border-blue-500 transition-all bg-slate-50/50"
                      placeholder="ISBN-13 / BARCODE..."
                    />
                  </div>
                  <button onClick={handleCatalogSearch} className="px-6 rounded-2xl shadow-xl text-white bg-blue-600 hover:bg-blue-700 transition-all active:scale-95"><Search className="h-6 w-6" /></button>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
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
            <MARCEditor
              book={result || {}}
              setBook={setResult}
              isManual={isManual}
              isSaving={isSaving}
              onCommit={handleCommit}
              onPreview={() => handlePrintRequest([result as BookType])}
              onImageUpload={(e) => {
                const reader = new FileReader();
                reader.onloadend = () => setResult(prev => ({ ...prev, cover_url: reader.result as string }));
                if (e.target.files?.[0]) reader.readAsDataURL(e.target.files[0]);
              }}
            />
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
        />
      )}

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-area, .print-area * { visibility: visible !important; }
          .print-area {
            position: fixed;
            left: 0;
            top: 0;
            width: 100vw;
            height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            z-index: 9999;
            background: white;
            padding: 0.5in;
          }
        }
      `}</style>
    </div>
  );
};

export default CatalogingDesk;
