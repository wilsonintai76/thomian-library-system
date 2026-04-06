/**
 * CallSlipModal.tsx
 * Prints overdue call-slips — 2 per A4 page (portrait).
 * Each slip shows school logo, patron details, book info, and fine amount.
 * Uses the .print-area CSS strategy defined in index.css.
 */

import React from 'react';
import { X, Printer } from 'lucide-react';
import { OverdueReportItem } from '../../types';
import { triggerPrint, fmtDate, fmtMYR, reportTimestamp } from '../../utils/printUtils';

interface CallSlipModalProps {
    overdues: OverdueReportItem[];
    logoUrl?: string | null;
    schoolName?: string;
    onClose: () => void;
}

/** Single call-slip card — designed for exactly half an A4 page tall */
const CallSlip: React.FC<{ item: OverdueReportItem; logoUrl?: string | null; schoolName: string; slipNumber: number; totalSlips: number }> = ({
    item, logoUrl, schoolName, slipNumber, totalSlips,
}) => (
    <div
        className="call-slip-card"
        style={{
            width: '210mm',
            height: '148.5mm', // half of A4 (297mm / 2)
            boxSizing: 'border-box',
            padding: '10mm 12mm',
            display: 'flex',
            flexDirection: 'column',
            gap: '6mm',
            background: 'white',
            borderBottom: slipNumber % 2 !== 0 ? '1px dashed #94a3b8' : 'none',
            pageBreakInside: 'avoid',
        }}
    >
        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '4mm' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4mm' }}>
                {logoUrl ? (
                    <img src={logoUrl} alt="School Logo" style={{ height: '14mm', width: 'auto', objectFit: 'contain' }} />
                ) : (
                    <div style={{ height: '14mm', width: '14mm', background: '#0f172a', borderRadius: '3mm', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: 'white', fontSize: '6pt', fontWeight: 900 }}>T</span>
                    </div>
                )}
                <div>
                    <div style={{ fontSize: '12pt', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{schoolName}</div>
                    <div style={{ fontSize: '7pt', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Library — Overdue Call-Slip</div>
                </div>
            </div>
            <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '7pt', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Issued</div>
                <div style={{ fontSize: '8pt', fontWeight: 700, color: '#475569' }}>{reportTimestamp()}</div>
                <div style={{ fontSize: '7pt', color: '#94a3b8', marginTop: '1mm' }}>Slip {slipNumber} / {totalSlips}</div>
            </div>
        </div>

        {/* ── Urgency Banner ── */}
        <div style={{
            background: item.daysOverdue >= 14 ? '#fef2f2' : '#fffbeb',
            border: `1.5px solid ${item.daysOverdue >= 14 ? '#fecaca' : '#fde68a'}`,
            borderRadius: '3mm',
            padding: '2.5mm 5mm',
            display: 'flex',
            alignItems: 'center',
            gap: '3mm',
        }}>
            <div style={{
                width: '8mm', height: '8mm', borderRadius: '50%',
                background: item.daysOverdue >= 14 ? '#ef4444' : '#f59e0b',
                flexShrink: 0,
            }} />
            <div>
                <span style={{ fontSize: '8pt', fontWeight: 900, color: item.daysOverdue >= 14 ? '#991b1b' : '#92400e', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {item.daysOverdue} Days Overdue
                </span>
                {item.daysOverdue >= 14 && (
                    <span style={{ fontSize: '7pt', color: '#dc2626', marginLeft: '3mm', fontWeight: 700 }}>— FINAL NOTICE</span>
                )}
            </div>
        </div>

        {/* ── Main Content: Patron + Book side by side ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6mm', flex: 1 }}>

            {/* Patron */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '3mm', padding: '4mm 5mm' }}>
                <div style={{ fontSize: '6.5pt', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2.5mm' }}>Patron Information</div>
                <div style={{ fontSize: '11pt', fontWeight: 900, color: '#0f172a', marginBottom: '1.5mm' }}>{item.patronName}</div>
                <div style={{ fontSize: '8pt', fontFamily: 'monospace', color: '#475569', fontWeight: 700, marginBottom: '3mm' }}>{item.patronId}</div>
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '2.5mm' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5mm' }}>
                        <span style={{ fontSize: '7pt', color: '#94a3b8', fontWeight: 700 }}>Due Date</span>
                        <span style={{ fontSize: '7.5pt', fontWeight: 900, color: '#ef4444' }}>{fmtDate(item.dueDate)}</span>
                    </div>
                    {(item as any).fineAmount !== undefined && (item as any).fineAmount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '7pt', color: '#94a3b8', fontWeight: 700 }}>Accrued Fine</span>
                            <span style={{ fontSize: '9pt', fontWeight: 900, color: '#dc2626', fontFamily: 'monospace' }}>{fmtMYR((item as any).fineAmount)}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Book */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '3mm', padding: '4mm 5mm' }}>
                <div style={{ fontSize: '6.5pt', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2.5mm' }}>Overdue Item</div>
                <div style={{ fontSize: '10pt', fontWeight: 900, color: '#0f172a', lineHeight: 1.3, marginBottom: '2mm', wordBreak: 'break-word' }}>{item.bookTitle}</div>
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '2.5mm' }}>
                    {item.bookBarcode && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5mm' }}>
                            <span style={{ fontSize: '7pt', color: '#94a3b8', fontWeight: 700 }}>Barcode</span>
                            <span style={{ fontSize: '7.5pt', fontFamily: 'monospace', fontWeight: 700, color: '#475569' }}>{item.bookBarcode}</span>
                        </div>
                    )}
                    {item.loanId && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '7pt', color: '#94a3b8', fontWeight: 700 }}>Loan ID</span>
                            <span style={{ fontSize: '7.5pt', fontFamily: 'monospace', fontWeight: 700, color: '#475569' }}>{item.loanId}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* ── Footer: Action Notice ── */}
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '3mm', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '7pt', color: '#64748b', fontWeight: 700, maxWidth: '120mm' }}>
                Please return the item to the library immediately or contact the librarian to arrange settlement. Continued non-return may result in suspension of borrowing privileges.
            </div>
            <div style={{ width: '30mm', borderBottom: '1px solid #cbd5e1', textAlign: 'center', paddingTop: '5mm' }}>
                <div style={{ fontSize: '6.5pt', color: '#94a3b8', fontWeight: 700 }}>Librarian Signature</div>
            </div>
        </div>
    </div>
);

const CallSlipModal: React.FC<CallSlipModalProps> = ({ overdues, logoUrl, schoolName = 'Thomian Library', onClose }) => {

    // Pair slips into pages of 2
    const pages: [OverdueReportItem, OverdueReportItem | null][] = [];
    for (let i = 0; i < overdues.length; i += 2) {
        pages.push([overdues[i], overdues[i + 1] ?? null]);
    }

    return (
        <>
            {/* ── Screen Preview UI (hidden at print time) ── */}
            <div className="print-hide fixed inset-0 z-[300] bg-slate-900/70 backdrop-blur-md flex flex-col items-center justify-center gap-5 p-6">
                <div className="bg-white rounded-[2rem] shadow-2xl p-8 flex flex-col items-center gap-6 max-w-md w-full">
                    <div className="h-16 w-16 bg-slate-900 rounded-[1.5rem] flex items-center justify-center">
                        <Printer className="h-8 w-8 text-white" />
                    </div>
                    <div className="text-center">
                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Print Call-Slips</h3>
                        <p className="text-slate-500 text-sm mt-1">{overdues.length} slip{overdues.length !== 1 ? 's' : ''} · {pages.length} page{pages.length !== 1 ? 's' : ''} · 2 per page</p>
                    </div>
                    <div className="w-full bg-amber-50 border border-amber-200 rounded-xl p-4 text-[11px] text-amber-800 font-medium leading-relaxed">
                        💡 In the print dialog, enable <strong>"Background graphics"</strong> and set margins to <strong>None</strong> for best results. Use <strong>"Save as PDF"</strong> to export.
                    </div>
                    <div className="flex gap-3 w-full">
                        <button
                            onClick={triggerPrint}
                            className="flex-1 py-4 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-xl"
                        >
                            <Printer className="h-4 w-4" /> Print / Save PDF
                        </button>
                        <button
                            onClick={onClose}
                            className="py-4 px-6 bg-slate-100 text-slate-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Print Content (visible only at print time via .print-area) ── */}
            <div className="print-area" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                {pages.map((page, pi) => (
                    <div
                        key={pi}
                        style={{
                            width: '210mm',
                            height: '297mm',
                            pageBreakAfter: pi < pages.length - 1 ? 'always' : 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                        }}
                    >
                        <CallSlip
                            item={page[0]}
                            logoUrl={logoUrl}
                            schoolName={schoolName}
                            slipNumber={pi * 2 + 1}
                            totalSlips={overdues.length}
                        />
                        {page[1] ? (
                            <CallSlip
                                item={page[1]}
                                logoUrl={logoUrl}
                                schoolName={schoolName}
                                slipNumber={pi * 2 + 2}
                                totalSlips={overdues.length}
                            />
                        ) : (
                            // Empty bottom half with cut guide
                            <div style={{
                                width: '210mm', height: '148.5mm', borderTop: '1px dashed #cbd5e1',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <span style={{ fontSize: '8pt', color: '#e2e8f0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em' }}>
                                    — intentionally blank —
                                </span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </>
    );
};

export default CallSlipModal;
