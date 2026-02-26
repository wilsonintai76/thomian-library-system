
import React, { useState } from 'react';
/* Added missing X import */
import { History, BookOpen, RefreshCw, CreditCard, CheckCircle, Sparkles, FileText, Bookmark, Clock, ChevronRight, X } from 'lucide-react';
import { Patron, Loan } from '../../types';

interface PatronPortalProps {
  patron: Patron;
  loans: Loan[];
  onViewHistory: () => void;
  onOpenSettings: () => void;
}

const PatronPortal: React.FC<PatronPortalProps> = ({ patron, loans, onViewHistory, onOpenSettings }) => {
  const [activeView, setActiveView] = useState<'LOANS' | 'RESERVES'>('LOANS');

  // In a real app, holds would come from an API
  const mockHolds = [
      { id: 'h-1', title: 'The Great Gatsby', status: 'READY', expires: '2024-11-20' },
  ];

  return (
    <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white animate-fade-in-up grid grid-cols-1 md:grid-cols-3 gap-8 shadow-2xl relative overflow-hidden">
        <Sparkles className="absolute -top-10 -right-10 h-40 w-40 text-blue-500/10" />
        
        <div className="md:col-span-2 flex flex-col h-[350px]">
            <div className="flex items-center gap-4 mb-6 border-b border-white/10 pb-4">
                <button 
                    onClick={() => setActiveView('LOANS')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeView === 'LOANS' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:text-white'}`}
                >
                    <BookOpen className="h-4 w-4" /> Active Loans ({loans.length})
                </button>
                <button 
                    onClick={() => setActiveView('RESERVES')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeView === 'RESERVES' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-slate-400 hover:text-white'}`}
                >
                    <Bookmark className="h-4 w-4" /> My Reserves ({mockHolds.length})
                </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin space-y-3">
                {activeView === 'LOANS' ? (
                    loans.length === 0 ? (
                        <div className="bg-white/5 border border-white/10 p-10 rounded-2xl text-center flex flex-col items-center justify-center h-full">
                            <BookOpen className="h-8 w-8 mb-3 text-slate-500 opacity-20" />
                            <p className="text-slate-400 italic font-medium uppercase text-[10px] tracking-widest">No active loans found</p>
                        </div>
                    ) : (
                        loans.map(loan => (
                            <div key={loan.id} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex justify-between items-center group hover:bg-white/10 transition-all border-l-4 border-l-blue-500">
                                <div>
                                    <p className="font-bold text-lg leading-tight mb-1">{loan.book_title}</p>
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <Clock className="h-3 w-3" />
                                        <p className="text-[10px] uppercase tracking-widest font-black">Returns: {new Date(loan.due_date).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <button className="bg-slate-800 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter flex items-center gap-2 hover:bg-blue-600 transition-colors border border-white/5">
                                    <RefreshCw className="h-3 w-3" /> Renew
                                </button>
                            </div>
                        ))
                    )
                ) : (
                    mockHolds.length === 0 ? (
                        <div className="bg-white/5 border border-white/10 p-10 rounded-2xl text-center flex flex-col items-center justify-center h-full">
                            <Bookmark className="h-8 w-8 mb-3 text-slate-500 opacity-20" />
                            <p className="text-slate-400 italic font-medium uppercase text-[10px] tracking-widest">No reservations found</p>
                        </div>
                    ) : (
                        mockHolds.map(hold => (
                            <div key={hold.id} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex justify-between items-center group hover:bg-white/10 transition-all border-l-4 border-l-indigo-500">
                                <div>
                                    <p className="font-bold text-lg leading-tight mb-1">{hold.title}</p>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${hold.status === 'READY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                            {hold.status === 'READY' ? 'Ready for Pickup' : 'In Queue'}
                                        </span>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Expires: {new Date(hold.expires).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <button className="p-2 text-white/20 hover:text-rose-500 transition-colors">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        ))
                    )
                )}
            </div>
        </div>

        <div className="bg-white/10 rounded-[2.5rem] p-8 backdrop-blur-md flex flex-col justify-between border border-white/5 shadow-inner">
            <div className="space-y-8">
                <div>
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-3">Identity Wallet</p>
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-blue-600 rounded-2xl flex items-center justify-center text-xl font-black shadow-lg">
                            {patron.full_name.charAt(0)}
                        </div>
                        <div>
                            <p className="text-sm font-black uppercase tracking-tight">{patron.full_name}</p>
                            <p className="text-[10px] text-slate-400 font-mono tracking-widest">{patron.student_id}</p>
                        </div>
                    </div>
                </div>

                <div>
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-2">Net Balance</p>
                    <p className="text-5xl font-black tracking-tighter">${patron.fines.toFixed(2)}</p>
                    {patron.fines > 0 ? (
                        <div className="mt-3 flex items-center gap-2 text-rose-400 text-[10px] font-black uppercase bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                            <CreditCard className="h-3.5 w-3.5" /> Fines Pending Clearance
                        </div>
                    ) : (
                        <div className="mt-3 flex items-center gap-2 text-emerald-400 text-[10px] font-black uppercase bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                            <CheckCircle className="h-3.5 w-3.5" /> Account Verified
                        </div>
                    )}
                </div>
            </div>

            <div className="pt-8 space-y-3">
                <button 
                    onClick={onViewHistory}
                    className="w-full bg-white text-slate-900 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-50 hover:text-blue-600 transition-all flex items-center justify-center gap-2 shadow-xl active:scale-95"
                >
                    <FileText className="h-4 w-4" /> Financial History
                </button>
                <p className="text-[8px] text-center text-slate-500 font-black uppercase tracking-widest">Access authorized by Thomian Identity Core</p>
            </div>
        </div>
    </div>
  );
};

export default PatronPortal;
