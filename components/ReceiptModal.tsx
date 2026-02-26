
import React from 'react';
import { X, Printer, CheckCircle, Scissors, Library } from 'lucide-react';
import { Transaction, Patron, MapConfig } from '../types';

interface ReceiptModalProps {
  transaction: Transaction;
  patron: Patron;
  config: MapConfig | null;
  onClose: () => void;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({ transaction, patron, config, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  const getTxnLabel = (type: Transaction['type']) => {
      switch(type) {
          case 'FINE_PAYMENT': return 'Fine Payment (Cash)';
          case 'REPLACEMENT_PAYMENT': return 'Replacement Payment (Cash)';
          case 'DAMAGE_ASSESSMENT': return 'Damage Fee Assessment';
          case 'REPLACEMENT_ASSESSMENT': return 'Replacement Cost Assessment';
          case 'FINE_ASSESSMENT': return 'Fine Assessment';
          case 'MANUAL_ADJUSTMENT': return 'Manual Adjustment';
          case 'WAIVE': return 'Fine Waived';
          default: return 'Financial Record';
      }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl animate-fade-in-up flex flex-col">
        
        {/* Visual Preview */}
        <div className={`p-8 text-white flex flex-col items-center text-center ${transaction.type.includes('PAYMENT') ? 'bg-emerald-600' : 'bg-slate-800'}`}>
            <div className="h-16 w-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-black">Transaction Successful</h3>
            <p className="text-white/70 text-sm">
                {transaction.type.includes('PAYMENT') ? `Payment of $${transaction.amount.toFixed(2)} recorded.` : `Charge of $${transaction.amount.toFixed(2)} applied.`}
            </p>
        </div>

        {/* Printable Area */}
        <div id="receipt-print-area" className="p-8 bg-white font-mono text-xs text-slate-800 printable">
            <div className="text-center mb-6 space-y-1">
                {config?.logo && <img src={config.logo} alt="Logo" className="h-10 mx-auto mb-2" />}
                <p className="font-black text-sm uppercase tracking-widest">St. Thomas Library</p>
                <p>Official Financial Document</p>
                <p>{new Date(transaction.timestamp).toLocaleString()}</p>
            </div>

            <div className="border-t border-b border-dashed border-slate-300 py-4 mb-4 space-y-2">
                <div className="flex justify-between">
                    <span>Reference ID:</span>
                    <span className="font-black">{transaction.id}</span>
                </div>
                <div className="flex justify-between">
                    <span>Patron:</span>
                    <span className="font-black">{patron.full_name}</span>
                </div>
                <div className="flex justify-between">
                    <span>Student ID:</span>
                    <span className="font-black">{patron.student_id}</span>
                </div>
                <div className="flex justify-between">
                    <span>Received By:</span>
                    <span className="font-black">{transaction.librarian_id}</span>
                </div>
            </div>

            <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center text-sm">
                    <span className="font-bold">{getTxnLabel(transaction.type)}</span>
                    <span className="font-black">${transaction.amount.toFixed(2)}</span>
                </div>
                {transaction.note && (
                    <p className="text-[10px] text-slate-500 italic">Note: {transaction.note}</p>
                )}
            </div>

            <div className="border-t-2 border-slate-900 pt-4 mb-10">
                <div className="flex justify-between items-center text-base">
                    <span className="font-black">Outstanding Balance:</span>
                    <span className="font-black">${patron.fines.toFixed(2)}</span>
                </div>
            </div>

            <div className="space-y-6">
                <div className="pt-4 border-t border-slate-200">
                    <p className="text-[8px] uppercase tracking-tighter text-slate-400 mb-6">Staff Signature</p>
                    <div className="border-b border-slate-300 w-full mb-1"></div>
                    <p className="text-[7px] text-center text-slate-400">AUTHORIZED LIBRARIAN STAMP REQUIRED</p>
                </div>

                <div className="text-center opacity-40 text-[9px] uppercase tracking-widest">
                    <p className="mb-4 flex items-center justify-center gap-2">
                        <Scissors className="h-3 w-3" /> ----------------------------
                    </p>
                    <p>Verify this document at the Librarian Desk</p>
                </div>
            </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-slate-100 rounded-xl transition-all">
                Close
            </button>
            <button onClick={handlePrint} className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 shadow-lg transition-all">
                <Printer className="h-4 w-4" /> Print Document
            </button>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #receipt-print-area, #receipt-print-area * { visibility: visible; }
          #receipt-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            padding: 10mm;
          }
        }
      `}</style>
    </div>
  );
};

export default ReceiptModal;
