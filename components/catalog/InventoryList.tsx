
import React, { useState, useMemo } from 'react';
import { BookOpen, Building, MapPin, DollarSign, Edit3, Printer, Trash2, ShieldCheck, Loader2, Download, Filter, ChevronDown } from 'lucide-react';
import { Book } from '../../types';
import { exportToCSV, DEWEY_CATEGORIES } from '../../utils';

interface InventoryListProps {
    inventory: Book[];
    isLoading: boolean;
    searchQuery: string;
    onSearchChange: (val: string) => void;
    onEdit: (book: Book) => void;
    onDelete: (id: string) => void;
    onPrint: (books: Book[]) => void;
    onAddRequested: () => void;
    selectedIds: Set<string>;
    setSelectedIds: (ids: Set<string>) => void;
}

const InventoryList: React.FC<InventoryListProps> = ({ 
    inventory, isLoading, searchQuery, onSearchChange, onEdit, onDelete, onPrint, onAddRequested, selectedIds, setSelectedIds 
}) => {
    const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

    const categories = useMemo(() => {
        const unique = Array.from(new Set(Object.values(DEWEY_CATEGORIES)));
        return ['ALL', ...unique.sort()];
    }, []);

    const filteredInventory = useMemo(() => {
        return inventory.filter(book => {
            const matchesSearch = 
                book.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
                book.isbn.includes(searchQuery) ||
                book.barcode_id.includes(searchQuery);
            
            const matchesCategory = selectedCategory === 'ALL' || book.classification === selectedCategory;
            
            return matchesSearch && matchesCategory;
        });
    }, [inventory, searchQuery, selectedCategory]);
    
    const toggleSelectAll = () => {
        if (selectedIds.size >= filteredInventory.length && filteredInventory.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredInventory.map(b => b.id)));
        }
    };

    const toggleSelectOne = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const handleCsvExport = () => {
        const exportData = filteredInventory.map(b => ({
            'Barcode': b.barcode_id,
            'Title': b.title,
            'Author': b.author,
            'ISBN': b.isbn,
            'DDC': b.ddc_code,
            'Classification': b.classification,
            'Status': b.status,
            'Location': b.shelf_location,
            'Publisher': b.publisher || '',
            'Value': b.value.toFixed(2)
        }));
        exportToCSV(exportData, 'Thomian_Catalog_Registry');
    };

    return (
        <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden animate-fade-in">
            {/* Table Header / Action Bar */}
            <div className="p-6 md:p-8 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-4 w-full md:w-auto flex-1">
                    <div className="relative group flex-1 max-w-md">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors">
                            <Loader2 className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </div>
                        <input 
                            type="text" 
                            value={searchQuery} 
                            onChange={(e) => onSearchChange(e.target.value)} 
                            className="w-full pl-12 pr-6 py-3.5 bg-white border-2 border-slate-100 rounded-2xl text-sm focus:border-sky-500 outline-none transition-all shadow-sm font-medium" 
                            placeholder="Search keywords..." 
                        />
                    </div>

                    <div className="relative shrink-0">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                            <Filter className="h-3.5 w-3.5" />
                        </div>
                        <select 
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="pl-10 pr-10 py-3.5 bg-white border-2 border-slate-100 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-700 outline-none focus:border-sky-500 shadow-sm appearance-none cursor-pointer min-w-[200px]"
                        >
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat === 'ALL' ? 'All Classifications' : cat}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button 
                        onClick={handleCsvExport}
                        className="px-4 py-3 bg-white border-2 border-slate-200 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                        title="Export current view to CSV"
                    >
                        <Download className="h-4 w-4" /> Export CSV
                    </button>
                    {selectedIds.size > 0 && (
                        <button 
                            onClick={() => onPrint(inventory.filter(b => selectedIds.has(b.id)))}
                            className="flex-1 md:flex-none px-6 py-3 bg-sky-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sky-100"
                        >
                           <Printer className="h-4 w-4" /> Print Labels ({selectedIds.size})
                        </button>
                    )}
                    <button 
                        onClick={onAddRequested}
                        className="flex-1 md:flex-none px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 hover:bg-slate-800 transition-all"
                    >
                        Accession Record
                    </button>
                </div>
            </div>
            
            {/* The Table */}
            <div className="flex-1 overflow-auto scrollbar-thin">
                <table className="min-w-full divide-y divide-slate-100 table-fixed">
                    <thead className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur">
                        <tr>
                            <th className="w-16 px-8 py-4 text-left">
                                <input 
                                    type="checkbox" 
                                    checked={selectedIds.size > 0 && selectedIds.size >= filteredInventory.length} 
                                    onChange={toggleSelectAll}
                                    className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500" 
                                />
                            </th>
                            <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Bibliographic Identity</th>
                            <th className="w-48 px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Classification</th>
                            <th className="w-40 px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Properties</th>
                            <th className="w-32 px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                            <th className="w-40 px-8 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest pr-10">Control</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-50">
                        {isLoading && filteredInventory.length === 0 ? (
                            <tr><td colSpan={6} className="text-center py-32"><Loader2 className="h-10 w-10 text-sky-500 animate-spin mx-auto mb-4 opacity-20" /><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Indexing Catalog Database...</p></td></tr>
                        ) : filteredInventory.length === 0 ? (
                            <tr><td colSpan={6} className="text-center py-32 text-slate-300 italic font-medium">No records found matching these criteria.</td></tr>
                        ) : filteredInventory.map(book => (
                            <tr key={book.id} className={`hover:bg-slate-50/50 transition-colors group ${selectedIds.has(book.id) ? 'bg-sky-50/30' : ''}`}>
                                <td className="px-8 py-4">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedIds.has(book.id)} 
                                        onChange={() => toggleSelectOne(book.id)}
                                        className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500" 
                                    />
                                </td>
                                <td className="px-8 py-4">
                                    <div className="flex items-center gap-5">
                                        <div className="h-16 w-12 bg-slate-100 rounded border border-slate-200 overflow-hidden shrink-0 shadow-sm relative group-hover:scale-105 transition-transform">
                                            {book.cover_url ? (
                                                <img src={book.cover_url} className="w-full h-full object-cover" />
                                            ) : (
                                                <BookOpen className="w-full h-full p-3 text-slate-300" />
                                            )}
                                        </div>
                                        <div className="flex flex-col gap-0.5 min-w-0">
                                            <p className="text-sm font-black text-slate-800 leading-tight uppercase truncate">{book.title}</p>
                                            <p className="text-xs font-bold text-sky-600 truncate">{book.author}</p>
                                            <div className="flex items-center gap-2 mt-1 opacity-60">
                                                <Building className="h-3 w-3 text-slate-400" />
                                                <span className="text-[10px] font-black uppercase tracking-tighter truncate">
                                                    {book.publisher || 'Unlisted'} • {book.pub_year || '????'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-4">
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center gap-2">
                                            <span className="bg-slate-900 text-white text-[10px] font-black font-mono px-2 py-0.5 rounded tracking-tighter">
                                                DDC {book.ddc_code || '000'}
                                            </span>
                                            <span className="text-[9px] font-black text-sky-600 uppercase tracking-tighter truncate max-w-[80px]">{book.classification}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-slate-400">
                                            <MapPin className="h-2.5 w-2.5" />
                                            <span className="text-[9px] font-black uppercase tracking-widest truncate">{book.shelf_location || 'PROC'}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-4">
                                    <div className="flex flex-col gap-1.5">
                                        <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100 uppercase w-fit">
                                            {book.format || 'PBK'}
                                        </span>
                                        <div className="flex items-center gap-1 text-emerald-600 font-mono font-black text-sm">
                                            <DollarSign className="h-3 w-3" />
                                            {(book.value || 0).toFixed(2)}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-4">
                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm ${
                                        book.status === 'AVAILABLE' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                                        book.status === 'LOANED' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                        'bg-slate-100 text-slate-500'
                                    }`}>
                                        {book.status}
                                    </span>
                                </td>
                                <td className="px-8 py-4 text-right pr-10">
                                    <div className="flex justify-end gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => onEdit(book)} className="p-2.5 text-slate-300 hover:text-sky-500 hover:bg-slate-50 rounded-xl transition-all"><Edit3 className="h-4.5 w-4.5" /></button>
                                        <button onClick={() => onPrint([book])} className="p-2.5 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"><Printer className="h-4.5 w-4.5" /></button>
                                        <button onClick={() => onDelete(book.id)} className="p-2.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 className="h-4.5 w-4.5" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            <div className="bg-slate-900 px-8 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 text-slate-500">
                    <ShieldCheck className="h-4 w-4" />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em]">Thomian Catalog Integrity Enabled</span>
                </div>
                <div className="text-[9px] font-black text-white/40 uppercase tracking-widest flex gap-6">
                    {selectedCategory !== 'ALL' && <span className="text-sky-400">Viewing: {selectedCategory}</span>}
                    <span>Displayed: {filteredInventory.length} of {inventory.length}</span>
                </div>
            </div>
        </div>
    );
};

export default InventoryList;
