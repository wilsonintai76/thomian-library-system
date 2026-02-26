
import React, { useState } from 'react';
import { X, TrendingUp, Archive, ArrowRight, AlertTriangle, RefreshCw } from 'lucide-react';
import { Patron, LibraryClass } from '../../types';
import { mockUpdatePatron } from '../../services/api';

interface RollOverWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    patrons: Patron[];
    classes: LibraryClass[];
}

const RollOverWizard: React.FC<RollOverWizardProps> = ({ isOpen, onClose, onSuccess, patrons, classes }) => {
    const [rollOverAction, setRollOverAction] = useState<'PROMOTE' | 'ARCHIVE'>('PROMOTE');
    const [sourceClass, setSourceClass] = useState('');
    const [destClass, setDestClass] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    if (!isOpen) return null;

    const executeRollOver = async () => {
        if (!sourceClass) return;
        const targetPatrons = patrons.filter(p => p.class_name === sourceClass && !p.is_archived);

        if (targetPatrons.length === 0) {
            alert("No active patrons found in the source class.");
            return;
        }

        if (rollOverAction === 'PROMOTE' && !destClass) {
            alert("Please select a destination class for promotion.");
            return;
        }

        const fineCount = targetPatrons.filter(p => p.fines > 0).length;
        const confirmMsg = rollOverAction === 'PROMOTE'
            ? `Confirm Promotion: ${targetPatrons.length} students will move from ${sourceClass} to ${destClass}.`
            : `Confirm Archival: ${targetPatrons.length} students from ${sourceClass} will be marked as ARCHIVED.`;

        const fineWarning = fineCount > 0 ? `\n\nWARNING: ${fineCount} students have unpaid fines.` : '';

        if (confirm(confirmMsg + fineWarning + "\n\nThis action will batch-update local records. Proceed?")) {
            setIsProcessing(true);
            try {
                for (const p of targetPatrons) {
                    const updates = rollOverAction === 'PROMOTE'
                        ? { class_name: destClass }
                        : { is_archived: true };
                    await mockUpdatePatron({ ...p, ...updates });
                }
                onSuccess();
                alert("Roll-over complete. Patron directory synchronized.");
                onClose();
                setSourceClass('');
                setDestClass('');
            } finally {
                setIsProcessing(false);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6">
            <div className="bg-white rounded-[2.5rem] w-full max-w-xl overflow-hidden shadow-2xl animate-fade-in-up">
                <div className={`p-8 text-white text-center transition-colors ${rollOverAction === 'PROMOTE' ? 'bg-blue-600' : 'bg-indigo-600'}`}>
                    <button onClick={onClose} className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors"><X className="h-6 w-6" /></button>
                    {rollOverAction === 'PROMOTE' ? <TrendingUp className="h-12 w-12 mx-auto mb-4" /> : <Archive className="h-12 w-12 mx-auto mb-4" />}
                    <h3 className="text-2xl font-black uppercase tracking-tight">Annual Roll-over Wizard</h3>
                    <p className="text-white/70 text-sm mt-1">Efficiently manage class transitions at year end.</p>
                </div>

                <div className="p-8 space-y-8">
                    {/* Action Selector */}
                    <div className="bg-slate-100 p-1 rounded-2xl flex border border-slate-200">
                        <button
                            onClick={() => setRollOverAction('PROMOTE')}
                            className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${rollOverAction === 'PROMOTE' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                        >
                            <TrendingUp className="h-4 w-4" /> Promote Class
                        </button>
                        <button
                            onClick={() => setRollOverAction('ARCHIVE')}
                            className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${rollOverAction === 'ARCHIVE' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                        >
                            <Archive className="h-4 w-4" /> Archive (Graduating)
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Source Class</label>
                            <select
                                value={sourceClass}
                                onChange={(e) => setSourceClass(e.target.value)}
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-black outline-none focus:border-blue-500 appearance-none"
                            >
                                <option value="">Select current class...</option>
                                {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </select>
                        </div>

                        {rollOverAction === 'PROMOTE' && (
                            <div className="animate-fade-in">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center justify-between">
                                    <span>Destination Class</span>
                                    <span className="text-blue-500 font-black">NEXT FORM</span>
                                </label>
                                <div className="flex items-center gap-4">
                                    <div className="h-14 w-14 bg-blue-50 rounded-2xl flex items-center justify-center shrink-0">
                                        <ArrowRight className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <select
                                        value={destClass}
                                        onChange={(e) => setDestClass(e.target.value)}
                                        className="flex-1 bg-white border-2 border-blue-100 rounded-2xl p-4 font-black outline-none focus:border-blue-600"
                                    >
                                        <option value="">Select destination...</option>
                                        {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 flex items-start gap-4">
                        <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-[10px] text-amber-900 font-black uppercase tracking-tight">Data Integrity Notice</p>
                            <p className="text-xs text-amber-800 leading-relaxed font-medium">
                                {rollOverAction === 'PROMOTE'
                                    ? "Promotion updates the 'Class' field for all active students. Ensure you have created the new class in the Class Registry first."
                                    : "Archival hides students from the active kiosk. They remain in the database for financial auditing if they still owe replacement fees."}
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={onClose}
                            className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={executeRollOver}
                            disabled={!sourceClass || (rollOverAction === 'PROMOTE' && !destClass) || isProcessing}
                            className={`flex-1 py-4 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95 disabled:opacity-50 ${rollOverAction === 'PROMOTE' ? 'bg-blue-600 shadow-blue-100 hover:bg-blue-700' : 'bg-indigo-600 shadow-indigo-100 hover:bg-indigo-700'}`}
                        >
                            {isProcessing ? <RefreshCw className="h-5 w-5 animate-spin mx-auto" /> : "Execute Task"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RollOverWizard;
