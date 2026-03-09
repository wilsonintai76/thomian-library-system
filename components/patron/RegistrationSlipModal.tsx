import React from 'react';
import { Printer, X, ShieldCheck, Key, CreditCard } from 'lucide-react';
import { Patron } from '../../types';

interface RegistrationSlipModalProps {
    patron: Patron;
    onClose: () => void;
}

const RegistrationSlipModal: React.FC<RegistrationSlipModalProps> = ({ patron, onClose }) => {
    const pin = patron.pin || '—';

    const handlePrint = () => {
        const esc = (s: string) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const printWin = window.open('', '_blank');
        if (!printWin) return;
        printWin.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Registration Slip</title>
<style>
  @page { size: 80mm 120mm; margin: 5mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #fff; font-family: system-ui, -apple-system, sans-serif; padding: 4mm; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .card { width: 100%; border: 1px solid #cbd5e1; border-radius: 10px; overflow: hidden; }
  .hdr { background: #0f172a; padding: 12px 16px; color: #fff; display: flex; align-items: center; gap: 10px; }
  .hdr-icon { width: 34px; height: 34px; background: #2563eb; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 16px; }
  .hdr-title { font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; }
  .hdr-sub { font-size: 8px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 2px; }
  .body { padding: 12px 16px; }
  .name { font-size: 13px; font-weight: 900; color: #1e293b; text-transform: uppercase; letter-spacing: 0.03em; }
  .group { font-size: 8px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 3px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 10px; }
  .cell { background: #f8fafc; padding: 8px 10px; border-radius: 8px; border: 1px solid #e2e8f0; }
  .cell-label { font-size: 7px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 3px; }
  .cell-id { font-family: monospace; font-weight: 900; font-size: 10px; color: #1e293b; word-break: break-all; }
  .cell-pin { font-family: monospace; font-weight: 900; font-size: 22px; color: #000; letter-spacing: 0.15em; }
  .footer-note { font-size: 8px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 8px; margin-top: 10px; line-height: 1.5; }
</style>
</head><body>
<div class="card">
  <div class="hdr">
    <div class="hdr-icon">🔒</div>
    <div>
      <div class="hdr-title">Registration Slip</div>
      <div class="hdr-sub">Thomian Library System</div>
    </div>
  </div>
  <div class="body">
    <div class="name">${esc(patron.full_name)}</div>
    <div class="group">${esc(patron.patron_group)}${patron.class_name ? ` · ${esc(patron.class_name)}` : ''}</div>
    <div class="grid">
      <div class="cell">
        <div class="cell-label">Patron ID</div>
        <div class="cell-id">${esc(patron.student_id)}</div>
      </div>
      <div class="cell">
        <div class="cell-label">PIN</div>
        <div class="cell-pin">${esc(pin)}</div>
      </div>
    </div>
    <div class="footer-note">Use this PIN at Kiosk &amp; Self-Checkout stations. Keep secure.</div>
  </div>
</div>
<script>window.onload = function() { window.print(); };<\/script>
</body></html>`);
        printWin.document.close();
    };

    return (
        <div className="fixed inset-0 z-[250] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-xs overflow-hidden shadow-2xl animate-fade-in-up">
                {/* ── Header ── */}
                <div className="bg-slate-900 px-5 py-4 text-white relative">
                    <button onClick={onClose} className="absolute top-3 right-3 p-1.5 text-slate-500 hover:text-white transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
                            <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-tight leading-none">Registration Slip</h3>
                            <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold mt-0.5">Thomian Library System</p>
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
                        <div className="bg-blue-50 px-3 py-2.5 rounded-xl border border-blue-100">
                            <div className="flex items-center gap-1.5 mb-1">
                                <Key className="h-3 w-3 text-blue-500" />
                                <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest">PIN</p>
                            </div>
                            <p className="font-mono font-black text-xl text-blue-700 tracking-widest">{pin}</p>
                        </div>
                    </div>

                    <p className="text-[9px] text-slate-400 font-medium text-center border-t border-slate-100 pt-3 leading-relaxed">
                        Use this PIN at Kiosk &amp; Self-Checkout stations. Keep secure.
                    </p>
                </div>

                {/* ── Footer ── */}
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex gap-2">
                    <button onClick={onClose} className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-500 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all">Close</button>
                    <button
                        onClick={handlePrint}
                        className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-1.5 hover:bg-blue-700 transition-all active:scale-95"
                    >
                        <Printer className="h-3.5 w-3.5" /> Print
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RegistrationSlipModal;
