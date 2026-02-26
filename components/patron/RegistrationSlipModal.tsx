import React from 'react';
import { Printer, X, ShieldCheck, User, Key, CreditCard } from 'lucide-react';
import { Patron } from '../../types';

interface RegistrationSlipModalProps {
    patron: Patron;
    onClose: () => void;
}

const RegistrationSlipModal: React.FC<RegistrationSlipModalProps> = ({ patron, onClose }) => {
    return (
        <div className="fixed inset-0 z-[250] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 print:bg-white print:p-0 print:inset-0">
            <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl animate-fade-in-up print:shadow-none print:rounded-none">
                <div className="bg-slate-900 p-8 text-white text-center relative print:bg-white print:text-black print:border-b print:border-slate-200">
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white transition-colors print:hidden"
                    >
                        <X className="h-6 w-6" />
                    </button>
                    <div className="h-16 w-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-blue-900/50 print:bg-slate-100 print:shadow-none print:border print:border-slate-300">
                        <ShieldCheck className="h-8 w-8 print:text-slate-800" />
                    </div>
                    <h3 className="text-2xl font-black uppercase tracking-tight">Registration Slip</h3>
                    <p className="text-slate-400 text-xs mt-1 uppercase tracking-widest font-black print:text-slate-500">Keep this information secure</p>
                </div>
                
                <div className="p-8 space-y-6">
                    <div className="text-center mb-6">
                        <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">{patron.full_name}</h4>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{patron.patron_group} {patron.class_name ? `- ${patron.class_name}` : ''}</p>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-4 print:border-slate-300">
                            <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0 print:border print:border-slate-200">
                                <CreditCard className="h-5 w-5 text-slate-400" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Patron ID</p>
                                <p className="font-mono font-black text-lg text-slate-800 tracking-wider">{patron.student_id}</p>
                            </div>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-center gap-4 print:border-slate-300 print:bg-slate-50">
                            <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0 print:border print:border-slate-200">
                                <Key className="h-5 w-5 text-blue-500 print:text-slate-600" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-0.5 print:text-slate-500">Security PIN</p>
                                <p className="font-mono font-black text-2xl text-blue-700 tracking-widest print:text-slate-800">{patron.pin}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl mt-6 print:border-slate-300 print:bg-white">
                        <p className="text-[10px] font-bold text-amber-800 leading-relaxed uppercase tracking-wide text-center print:text-slate-600">
                            You can use this PIN to access the Kiosk and Self-Checkout stations. You may change this PIN later from your Profile settings.
                        </p>
                    </div>
                </div>

                <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-3 pt-6 print:hidden">
                    <button onClick={onClose} className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all">Close</button>
                    <button 
                        onClick={() => window.print()} 
                        className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95 hover:bg-blue-700"
                    >
                        <Printer className="h-4 w-4" /> Print Slip
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RegistrationSlipModal;
