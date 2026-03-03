import React from 'react';
import { Printer, X, ShieldCheck, User, Key, CreditCard } from 'lucide-react';
import { Patron } from '../../types';

interface RegistrationSlipModalProps {
    patron: Patron;
    onClose: () => void;
}

const RegistrationSlipModal: React.FC<RegistrationSlipModalProps> = ({ patron, onClose }) => {
    return (
        <div className="fixed inset-0 z-[250] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 print:bg-white print:p-0 print:inset-0">
            <div className="slip-print bg-white rounded-2xl w-full max-w-xs overflow-hidden shadow-2xl animate-fade-in-up print:shadow-none print:rounded-none print:max-w-none print:w-72">
                {/* ── Header ── */}
                <div className="bg-slate-900 px-5 py-4 text-white relative print:bg-white print:text-black print:border-b print:border-slate-300">
                    <button onClick={onClose} className="absolute top-3 right-3 p-1.5 text-slate-500 hover:text-white transition-colors print:hidden">
                        <X className="h-4 w-4" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-blue-600 rounded-xl flex items-center justify-center shrink-0 print:bg-slate-100 print:border print:border-slate-300">
                            <ShieldCheck className="h-5 w-5 print:text-slate-800" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-tight leading-none">Registration Slip</h3>
                            <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold mt-0.5 print:text-slate-500">Thomian Library System</p>
                        </div>
                    </div>
                </div>

                {/* ── Body ── */}
                <div className="px-5 py-4 space-y-3">
                    <div>
                        <p className="text-sm font-black text-slate-800 uppercase tracking-tight leading-tight">{patron.full_name}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                            {patron.patron_group}{patron.class_name ? ` · ${patron.class_name}` : ''}
                        </p>
                    </div>

                    {/* ID + PIN side by side */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-200">
                            <div className="flex items-center gap-1.5 mb-1">
                                <CreditCard className="h-3 w-3 text-slate-400" />
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Patron ID</p>
                            </div>
                            <p className="font-mono font-black text-xs text-slate-800 tracking-wider break-all">{patron.student_id}</p>
                        </div>
                        <div className="bg-blue-50 px-3 py-2.5 rounded-xl border border-blue-100 print:bg-slate-50 print:border-slate-200">
                            <div className="flex items-center gap-1.5 mb-1">
                                <Key className="h-3 w-3 text-blue-500 print:text-slate-400" />
                                <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest print:text-slate-400">PIN</p>
                            </div>
                            <p className="font-mono font-black text-xl text-blue-700 tracking-widest print:text-slate-800">{patron.pin}</p>
                        </div>
                    </div>

                    <p className="text-[9px] text-slate-400 font-medium text-center border-t border-slate-100 pt-3 leading-relaxed">
                        Use this PIN at Kiosk &amp; Self-Checkout stations. Keep secure.
                    </p>
                </div>

                {/* ── Footer ── */}
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex gap-2 print:hidden">
                    <button onClick={onClose} className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-500 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all">Close</button>
                    <button
                        onClick={() => window.print()}
                        className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-1.5 hover:bg-blue-700 transition-all active:scale-95"
                    >
                        <Printer className="h-3.5 w-3.5" /> Print
                    </button>
                </div>
                <style>{`@media print{body *{visibility:hidden}.slip-print,.slip-print *{visibility:visible}.slip-print{position:fixed;top:20mm;left:50%;transform:translateX(-50%)}}`}</style>
            </div>
        </div>
    );
};

export default RegistrationSlipModal;
