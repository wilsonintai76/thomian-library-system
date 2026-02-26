
import React, { useRef, useEffect } from 'react';
import { BookOpen, Layers, DollarSign, Tag, Info, ImageOff, Upload, Eye, Loader2, Fingerprint, ScanLine, Bookmark, Hash, StickyNote, Building, Calendar, Package, Type, FileText, ChevronDown } from 'lucide-react';
import { Book } from '../../types';
import { getClassificationFromDDC, DEWEY_CATEGORIES, getStarterDdcForClassification } from '../../utils';
import BookLabel from '../BookLabel';

interface MARCEditorProps {
    book: Partial<Book>;
    setBook: (book: Partial<Book>) => void;
    isManual: boolean;
    isSaving: boolean;
    onCommit: () => void;
    onPreview: () => void;
    onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const MARCEditor: React.FC<MARCEditorProps> = ({ book, setBook, isManual, isSaving, onCommit, onPreview, onImageUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-detect classification and suggest call number when DDC or Author changes
  useEffect(() => {
      if (isManual && !book.id) {
          const authorShort = (book.author || '').slice(0, 3).toUpperCase();
          const suggestedCall = book.ddc_code ? `${book.ddc_code} ${authorShort}` : '';
          
          if (suggestedCall && !book.call_number) {
              setBook({ 
                  ...book, 
                  call_number: suggestedCall,
                  cutter_number: authorShort
              });
          }
      }
  }, [book.ddc_code, book.author]);

  const handleDdcChange = (val: string) => {
      const detected = getClassificationFromDDC(val);
      setBook({ ...book, ddc_code: val, classification: detected });
  };

  const handleClassificationChange = (val: string) => {
      const starterDdc = getStarterDdcForClassification(val);
      // Only overwrite DDC if it's currently empty or the user just changed the category
      setBook({ 
          ...book, 
          classification: val, 
          ddc_code: book.ddc_code && !starterDdc.startsWith(book.ddc_code.slice(0,1)) ? starterDdc : (book.ddc_code || starterDdc) 
      });
  };

  const classificationOptions = Array.from(new Set(Object.values(DEWEY_CATEGORIES)));

  return (
    <div className={`bg-white rounded-[2.5rem] border shadow-2xl h-full flex flex-col transition-all duration-500 ${isManual ? 'border-amber-300 ring-8 ring-amber-50' : 'border-slate-100'}`}>
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-[2.5rem]">
            <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100">
                    <BookOpen className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                    <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight leading-none mb-1">Asset Cataloging</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">MARC 21 Standard Compliance (Lite)</p>
                </div>
            </div>
            {isManual && <span className="bg-amber-100 text-amber-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">{book.id ? 'Editing Records' : 'Manual Entry'}</span>}
        </div>

        <div className="p-8 flex-1 overflow-y-auto space-y-12 scrollbar-thin">
            <div className="flex flex-col xl:flex-row gap-12">
                <div className="w-full xl:w-48 shrink-0 space-y-8">
                    <div>
                        <label className="block w-full text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-4">Asset Visual</label>
                        <div className="group relative w-44 h-64 mx-auto bg-slate-50 rounded-[2rem] border-4 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shadow-inner cursor-pointer hover:border-blue-400 transition-all" onClick={() => fileInputRef.current?.click()}>
                            {book.cover_url ? (
                                <img src={book.cover_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="flex flex-col items-center text-slate-300 group-hover:opacity-40"><ImageOff className="h-12 w-12 mb-3" /><span className="text-[10px] font-black uppercase text-center">No Asset Found</span></div>
                            )}
                            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Upload className="h-8 w-8 text-white" /></div>
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={onImageUpload} />
                    </div>

                    <div className="pt-6 border-t border-slate-100">
                        <label className="block w-full text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-4 flex items-center justify-center gap-2">
                           <StickyNote className="h-3 w-3" /> Live Spine Label
                        </label>
                        <div className="flex justify-center scale-90 origin-top">
                           <BookLabel book={book} />
                        </div>
                    </div>
                </div>

                <div className="flex-1 space-y-12">
                    {/* SECTION 1: BIBLIOGRAPHIC DATA */}
                    <div className="space-y-6">
                        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2"><Layers className="h-4 w-4" /> 1. Bibliographic Data</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Main Title / Statement of Responsibility</label>
                                <input type="text" value={book.title || ''} onChange={(e) => setBook({ ...book, title: e.target.value })} className="w-full rounded-xl border-2 border-slate-100 p-4 font-black text-slate-800 outline-none focus:border-blue-500 shadow-sm" placeholder="Full Title of the Work..." />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Primary Author (Personal Name)</label>
                                <input type="text" value={book.author || ''} onChange={(e) => setBook({ ...book, author: e.target.value })} className="w-full rounded-xl border-2 border-slate-100 p-4 font-bold text-slate-700 outline-none focus:border-blue-500" placeholder="Surname, Given Name" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Series Title</label>
                                <input type="text" value={book.series || ''} onChange={(e) => setBook({ ...book, series: e.target.value })} className="w-full rounded-xl border-2 border-slate-100 p-4 font-bold text-slate-700 outline-none focus:border-blue-500" placeholder="e.g. Harry Potter" />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: PUBLICATION & PHYSICAL */}
                    <div className="space-y-6">
                        <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2"><Building className="h-4 w-4" /> 2. Publication & Physical Description</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-indigo-50/30 rounded-3xl border border-indigo-100">
                            <div>
                                <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">Publisher</label>
                                <input type="text" value={book.publisher || ''} onChange={(e) => setBook({ ...book, publisher: e.target.value })} className="w-full rounded-xl border-2 border-indigo-100 p-3 font-bold text-indigo-900 outline-none focus:border-indigo-500" placeholder="e.g. Penguin Books" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">Year</label>
                                <input type="text" maxLength={4} value={book.pub_year || ''} onChange={(e) => setBook({ ...book, pub_year: e.target.value.replace(/\D/g,'') })} className="w-full rounded-xl border-2 border-indigo-100 p-3 font-bold text-indigo-900 outline-none focus:border-indigo-500 text-center" placeholder="2024" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">Material Format</label>
                                <select value={book.format || 'PAPERBACK'} onChange={(e) => setBook({ ...book, format: e.target.value as any })} className="w-full rounded-xl border-2 border-indigo-100 p-3 font-bold text-indigo-900 outline-none focus:border-indigo-500 bg-white">
                                    <option value="HARDCOVER">Hardcover</option>
                                    <option value="PAPERBACK">Paperback</option>
                                    <option value="EQUIPMENT">Equipment / Kit</option>
                                    <option value="PERIODICAL">Periodical</option>
                                    <option value="DIGITAL">Digital Resource</option>
                                </select>
                            </div>
                            <div className="md:col-span-3">
                                <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">ISBN / Identifiers</label>
                                <input type="text" value={book.isbn || ''} onChange={(e) => setBook({ ...book, isbn: e.target.value })} className="w-full rounded-xl border-2 border-indigo-100 p-3 font-mono font-bold text-indigo-900 outline-none focus:border-indigo-500" placeholder="978..." />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 3: HOLDINGS & TAXONOMY */}
                    <div className="space-y-6">
                        <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] flex items-center gap-2"><Tag className="h-4 w-4" /> 3. Holdings & Classification</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Classification Category</label>
                                <div className="relative">
                                    <select 
                                        value={book.classification || ''} 
                                        onChange={(e) => handleClassificationChange(e.target.value)} 
                                        className="w-full rounded-xl border-2 border-slate-100 p-4 font-black text-slate-800 outline-none focus:border-blue-500 bg-slate-50/30 appearance-none pr-10"
                                    >
                                        <option value="">Auto-Detect...</option>
                                        {classificationOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">DDC (Dewey)</label>
                                <input type="text" value={book.ddc_code || ''} onChange={(e) => handleDdcChange(e.target.value)} className="w-full rounded-xl border-2 border-slate-100 p-4 font-mono font-black text-emerald-600 outline-none focus:border-emerald-500 shadow-sm" placeholder="530" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Cutter / Call</label>
                                <input type="text" value={book.call_number || ''} onChange={(e) => setBook({ ...book, call_number: e.target.value.toUpperCase() })} className="w-full rounded-xl border-2 border-slate-100 p-4 font-mono font-black text-slate-800 outline-none focus:border-blue-500 bg-slate-50/30" placeholder="530 TAY" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Location</label>
                                <input type="text" value={book.shelf_location || ''} onChange={(e) => setBook({ ...book, shelf_location: e.target.value })} className="w-full rounded-xl border-2 border-slate-100 p-4 font-bold text-slate-800 outline-none focus:border-blue-500" placeholder="Shelf A" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Barcode ID</label>
                                <input type="text" value={book.barcode_id || ''} onChange={(e) => setBook({ ...book, barcode_id: e.target.value.toUpperCase() })} className="w-full rounded-xl border-2 border-slate-100 p-4 font-mono font-black text-blue-600 outline-none focus:border-blue-500" placeholder="BC-0001" />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 4: PROCUREMENT & AUDIT */}
                    <div className="space-y-6">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2"><DollarSign className="h-4 w-4" /> 4. Procurement & Acquisition</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-slate-50 rounded-3xl border border-slate-200">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Replacement Cost</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input type="number" step="0.01" value={book.value || ''} onChange={(e) => setBook({ ...book, value: parseFloat(e.target.value) })} className="w-full rounded-xl border-2 border-slate-100 p-3 pl-10 font-black text-slate-800 outline-none focus:border-blue-500" />
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Acquisition Source / Vendor</label>
                                <input type="text" value={book.vendor || ''} onChange={(e) => setBook({ ...book, vendor: e.target.value })} className="w-full rounded-xl border-2 border-slate-100 p-3 font-bold text-slate-700 outline-none focus:border-blue-500" placeholder="e.g. Scholastic, Amazon" />
                            </div>
                            <div className="md:col-span-3">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Summary / Abstract (MARC 520)</label>
                                <textarea rows={3} value={book.summary || ''} onChange={(e) => setBook({ ...book, summary: e.target.value })} className="w-full rounded-xl border-2 border-slate-100 p-4 font-medium text-sm text-slate-600 outline-none focus:border-blue-500" placeholder="Brief description of the content..." />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 rounded-b-[2.5rem]">
            <div className="flex items-center gap-3 text-slate-400">
                <Info className="h-4 w-4" />
                <span className="text-[9px] font-black uppercase tracking-widest">Holdings are synchronized with primary catalog clusters.</span>
            </div>
            <div className="flex gap-4 w-full md:w-auto">
                <button onClick={onPreview} disabled={!book.title} className="flex-1 md:flex-none px-10 py-4 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl font-black text-xs uppercase hover:bg-slate-50 transition-all flex items-center justify-center gap-3 shadow-sm"><Eye className="h-4 w-4" /> Batch Preview</button>
                <button onClick={onCommit} disabled={isSaving} className="flex-1 md:flex-none px-12 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase hover:bg-blue-700 shadow-2xl transition-all active:scale-95 disabled:opacity-50">{isSaving ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : book.id ? 'Commit Updates' : 'Accession Item'}</button>
            </div>
        </div>
    </div>
  );
};

export default MARCEditor;
