
import React from 'react';
import { X, Wallet, BookOpen, PlusCircle, HandHelping, History, CreditCard, Loader2, CheckCircle, AlertTriangle, UserCheck, Banknote } from 'lucide-react';
import { Patron, Transaction } from '../../types';

interface LedgerInterfaceProps {
    patron: Patron;
    mode: 'PAY' | 'LOST' | 'ASSESS' | 'HISTORY' | 'WAIVE';
    setMode: (mode: any) => void;
    onClose: () => void;
    paymentAmount: string;
    setPaymentAmount: (val: string) => void;
    onPayment: () => void;
    isProcessing: boolean;
    history: Transaction[];
    onViewReceipt: (txn: Transaction) => void;
}

const LedgerInterface: React.FC<LedgerInterfaceProps> = ({ 
    patron, mode, setMode, onClose, paymentAmount, setPaymentAmount, onPayment, isProcessing, history, onViewReceipt 
}) => {
  return (
    <div className="bg-white rounded-[2.5rem] w-full max-w-3xl overflow-hidden shadow-2xl animate-fade-in-up border border-slate-100 flex flex-col max-h-[90vh]">
        <div className={`p-8 text-white relative shrink-0 ${
            mode === 'PAY' ? 'bg-emerald-600' : 
            mode === 'LOST' ? 'bg-rose-600' : 
            mode === 'ASSESS' ? 'bg-amber-600' : 
            mode === 'WAIVE' ? 'bg-indigo-600' : 'bg-slate-900'
        }`}>
            <button onClick={onClose} className="absolute top-6 right-6 text-white/50 hover:text-white"><X className="h-6 w-6" /></button>
            <div className="flex items-center gap-6">
                <div className="h-16 w-16 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                    {mode === 'PAY' ? <Wallet className="h-8 w-8" /> : mode === 'LOST' ? <BookOpen className="h-8 w-8" /> : mode === 'ASSESS' ? <PlusCircle className="h-8 w-8" /> : mode === 'WAIVE' ? <HandHelping className="h-8 w-8" /> : <History className="h-8 w-8" />}
                </div>
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-1">Financial Desk</p>
                    <h3 className="text-2xl font-black">{patron.full_name}</h3>
                </div>
                <div className="ml-auto text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-1">Current Balance</p>
                    <p className="text-4xl font-black">${patron.fines.toFixed(2)}</p>
                </div>
            </div>

            <div className="flex gap-2 mt-8 overflow-x-auto pb-2 scrollbar-none">
                {['PAY', 'WAIVE', 'ASSESS', 'LOST', 'HISTORY'].map((m: any) => (
                    <button key={m} onClick={() => setMode(m)} className={`shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === m ? 'bg-white text-slate-900' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}>{m === 'PAY' ? 'Collect' : m === 'WAIVE' ? 'Waive' : m === 'ASSESS' ? 'Charge' : m === 'LOST' ? 'Lost' : 'History'}</button>
                ))}
            </div>
        </div>

        <div className="p-8 overflow-y-auto flex-1">
            {mode === 'PAY' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
                    <div className="space-y-6">
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Accept Cash Payment</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300">$</span>
                                <input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} className="w-full text-4xl font-mono font-black p-5 pl-12 bg-white border-2 border-slate-200 rounded-2xl focus:border-emerald-500 outline-none transition-all shadow-inner" placeholder="0.00" autoFocus />
                            </div>
                        </div>
                        <button onClick={onPayment} disabled={isProcessing || !paymentAmount} className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black text-lg uppercase tracking-widest shadow-2xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50">{isProcessing ? <Loader2 className="h-6 w-6 animate-spin" /> : <><CreditCard className="h-6 w-6" /> Accept & Print Receipt</>}</button>
                    </div>
                </div>
            )}

            {mode === 'HISTORY' && (
                <div className="animate-fade-in h-full">
                    <div className="bg-slate-50 rounded-2xl overflow-hidden border border-slate-200">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-100">
                                <tr>
                                    <th className="px-6 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                    <th className="px-6 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                                    <th className="px-6 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-100">
                                {history.length === 0 ? <tr><td colSpan={3} className="p-10 text-center text-slate-400 italic text-sm">No transaction records found.</td></tr> : history.map(txn => (
                                    <tr key={txn.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => onViewReceipt(txn)}>
                                        <td className="px-6 py-4 text-xs text-slate-500 font-mono">{new Date(txn.timestamp).toLocaleDateString()}</td>
                                        <td className="px-6 py-4"><span className="text-xs font-bold text-slate-700 uppercase">{txn.type.replace('_', ' ')}</span></td>
                                        <td className={`px-6 py-4 text-right text-sm font-black font-mono ${txn.type.includes('PAYMENT') || txn.type === 'WAIVE' ? 'text-emerald-600' : 'text-rose-600'}`}>{txn.type.includes('PAYMENT') || txn.type === 'WAIVE' ? '-' : '+'}${txn.amount.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default LedgerInterface;
