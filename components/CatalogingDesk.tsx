
import React, { useState, useEffect, useRef } from 'react';
import { Search, Database, Loader2, Plus, List, Printer, Eye, X, PackageSearch, Tag, Edit3, Calendar, MapPin, Trash2, ShieldCheck, Sparkles, BookOpen, Keyboard, LayoutGrid, Settings2, Building, DollarSign, CheckCircle, Scissors } from 'lucide-react';
import { simulateCatalogWaterfall, mockSearchBooks, mockAddBook, mockUpdateBook, mockDeleteBook, mockRestoreBook } from '../services/api';
import { Book as BookType } from '../types';
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
    { source: 'LOCAL', status: 'IDLE' }, { source: 'MALCAT', status: 'IDLE' }, { source: 'OPEN_LIBRARY', status: 'IDLE' }, { source: 'GOOGLE_BOOKS', status: 'IDLE' }
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
        if ((data as BookType).id) {
          // Book already in catalog — switch to the add-copies flow
          setExistingBook(data);
          setResult(null);
          return;
        }
        setExistingBook(null);
        const ddc = data.ddc_code;
        const authorShort = (data.author || '').slice(0, 3).toUpperCase();
        setResult({
          ...data,
          id: undefined,
          material_type: 'REGULAR',
          status: 'AVAILABLE',
          value: data.value || 25.00,
          acquisition_date: new Date().toISOString().split('T')[0],
          classification: getClassificationFromDDC(ddc),
          call_number: ddc ? `${ddc} ${authorShort}` : '',
          cutter_number: authorShort,
        });
        // MANUAL stub = no API had data; open editor with ISBN pre-filled
        setIsManual(!data.title);
      } else {
        setExistingBook(null);
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
  };

  const handlePrintAction = async () => {
    const area = document.querySelector<HTMLElement>('.print-area');
    if (!area) return;
    const labelEls = area.querySelectorAll<HTMLElement>(':scope > div');
    const labelHTMLs = Array.from(labelEls).map(el => el.outerHTML);
    if (labelHTMLs.length === 0) return;

    // Fetch & inline all stylesheets — popup is about:blank so relative paths fail;
    // l.href is always absolute in the browser so we can fetch it directly.
    const cssTexts = await Promise.all(
      Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')).map(async (l) => {
        try { return await fetch(l.href).then(r => r.text()); } catch { return ''; }
      })
    );
    const inlineStyles = Array.from(document.querySelectorAll('style'))
      .map(s => `<style>${(s as HTMLStyleElement).innerHTML}</style>`).join('\n');
    const allCss = `<style>${cssTexts.join('\n')}</style>${inlineStyles}`;

    // SHEET = 5-up Avery label sheet (1.5" × 1")
    // SINGLE = 2-up cut sheet on plain A4 paper — bigger labels, easier to cut by hand
    const cols = printLayout === 'SHEET' ? 5 : 2;
    const LABEL_W = printLayout === 'SHEET' ? '1.5in' : '3in';
    const LABELS_PER_PAGE = printLayout === 'SHEET' ? 50 : 20;
    const pages: string[][] = [];
    for (let i = 0; i < labelHTMLs.length; i += LABELS_PER_PAGE) {
      pages.push(labelHTMLs.slice(i, i + LABELS_PER_PAGE));
    }

    const pageBlocks = pages.map((pageLabels, pi) => {
      const brk = pi < pages.length - 1 ? 'page-break-after:always;' : '';
      return `<div style="display:grid;grid-template-columns:repeat(${cols},${LABEL_W});gap:2mm;justify-content:center;${brk}">${pageLabels.join('')}</div>`;
    }).join('');

    const printWin = window.open('', '_blank')!;
    printWin.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Book Labels</title>
${allCss}
<style>
  @page { size: A4 portrait; margin: 10mm; }
  * { box-sizing: border-box; }
  body { background: white; margin: 0; padding: 0; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head><body>${pageBlocks}
<script>window.print();<\/script>
</body></html>`);
    printWin.document.close();
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
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 z-[100] animate-fade-in-up">
          <span className="text-sm font-medium">Item "{undoAction.book.title}" deleted.</span>
          <button onClick={handleUndoDelete} className="text-blue-400 font-bold uppercase tracking-widest text-xs hover:text-blue-300">Undo</button>
          <button aria-label="Dismiss" onClick={() => { clearTimeout(undoAction.timeout); setUndoAction(null); }} className="text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>
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
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Print on plain A4 paper — cut &amp; stick, or use Avery adhesive label sheets</p>
              </div>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button onClick={() => setPrintLayout('SINGLE')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase flex items-center gap-2 ${printLayout === 'SINGLE' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}><Scissors className="h-3.5 w-3.5" /> Cut Sheet (A4)</button>
                <button onClick={() => setPrintLayout('SHEET')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase flex items-center gap-2 ${printLayout === 'SHEET' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}><LayoutGrid className="h-3.5 w-3.5" /> Label Sheet (Avery)</button>
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
                <span>Enable "Background Graphics" in browser print settings for correct barcode printing.</span>
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
              <MARCEditor
                book={result || {}}
                setBook={setResult}
                isManual={isManual}
                isSaving={isSaving}
                copies={copies}
                onCommit={handleCommit}
                onPreview={() => handlePrintRequest([result as BookType])}
                onCancel={() => { setCopies(1); setResult(null); setIsbn(''); setView('LIST'); }}
                onImageUpload={(e) => {
                  const reader = new FileReader();
                  reader.onloadend = () => setResult(prev => ({ ...prev, cover_url: reader.result as string }));
                  if (e.target.files?.[0]) reader.readAsDataURL(e.target.files[0]);
                }}
              />
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
