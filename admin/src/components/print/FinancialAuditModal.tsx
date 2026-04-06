/**
 * FinancialAuditModal.tsx
 * Prints the Financial Stream Audit log — full transaction table on A4.
 * Includes school logo, summary KPI row, and transaction table.
 */

import React from 'react';
import { X, Printer } from 'lucide-react';
import { Transaction } from '../../types';
import { triggerPrint, fmtDate, fmtMYR, reportTimestamp } from '../../utils/printUtils';

interface FinancialSummary {
    totalCollected: number;
    totalFinesAssessed: number;
    totalReplacementsAssessed: number;
    totalWaived: number;
}

interface FinancialAuditModalProps {
    transactions: Transaction[];
    summary: FinancialSummary;
    logoUrl?: string | null;
    schoolName?: string;
    onClose: () => void;
}

const FinancialAuditModal: React.FC<FinancialAuditModalProps> = ({
    transactions, summary, logoUrl, schoolName = 'Thomian Library', onClose,
}) => {
    const timestamp = reportTimestamp();
    const outstanding = summary.totalFinesAssessed - summary.totalCollected;

    return (
        <>
            {/* ── Screen Preview UI ── */}
            <div className="print-hide fixed inset-0 z-[300] bg-slate-900/70 backdrop-blur-md flex flex-col items-center justify-center gap-5 p-6">
                <div className="bg-white rounded-[2rem] shadow-2xl p-8 flex flex-col items-center gap-6 max-w-md w-full">
                    <div className="h-16 w-16 bg-emerald-600 rounded-[1.5rem] flex items-center justify-center">
                        <Printer className="h-8 w-8 text-white" />
                    </div>
                    <div className="text-center">
                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Print Financial Audit</h3>
                        <p className="text-slate-500 text-sm mt-1">{transactions.length} transactions · {fmtMYR(summary.totalCollected)} collected</p>
                    </div>
                    <div className="w-full bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-[11px] text-emerald-800 font-medium leading-relaxed">
                        💡 Enable <strong>"Background graphics"</strong> in the print dialog. Use <strong>"Save as PDF"</strong> to keep a digital record.
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

            {/* ── Print Content ── */}
            <div className="print-area" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', padding: '12mm 14mm', width: '210mm', boxSizing: 'border-box' }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '5mm', marginBottom: '6mm' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4mm' }}>
                        {logoUrl ? (
                            <img src={logoUrl} alt="Logo" style={{ height: '14mm', width: 'auto', objectFit: 'contain' }} />
                        ) : (
                            <div style={{ height: '14mm', width: '14mm', background: '#0f172a', borderRadius: '3mm', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ color: 'white', fontSize: '7pt', fontWeight: 900 }}>T</span>
                            </div>
                        )}
                        <div>
                            <div style={{ fontSize: '13pt', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{schoolName}</div>
                            <div style={{ fontSize: '8pt', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Financial Stream Audit Report</div>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '7pt', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Generated</div>
                        <div style={{ fontSize: '8pt', fontWeight: 700, color: '#475569' }}>{timestamp}</div>
                        <div style={{ fontSize: '7pt', color: '#94a3b8', marginTop: '1.5mm' }}>{transactions.length} transactions</div>
                    </div>
                </div>

                {/* KPI Summary Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4mm', marginBottom: '7mm' }}>
                    {[
                        { label: 'Collected', value: fmtMYR(summary.totalCollected), color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
                        { label: 'Outstanding', value: fmtMYR(outstanding), color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
                        { label: 'Assessed', value: fmtMYR(summary.totalFinesAssessed), color: '#0f172a', bg: '#f8fafc', border: '#e2e8f0' },
                        { label: 'Waived', value: fmtMYR(summary.totalWaived), color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
                    ].map(stat => (
                        <div key={stat.label} style={{ background: stat.bg, border: `1.5px solid ${stat.border}`, borderRadius: '3mm', padding: '3mm 4mm' }}>
                            <div style={{ fontSize: '6.5pt', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.5mm' }}>{stat.label}</div>
                            <div style={{ fontSize: '11pt', fontWeight: 900, color: stat.color, fontFamily: 'monospace', lineHeight: 1 }}>{stat.value}</div>
                        </div>
                    ))}
                </div>

                {/* Transaction Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt' }}>
                    <thead>
                        <tr style={{ background: '#0f172a' }}>
                            {['Timestamp', 'Librarian', 'Patron ID', 'Type', 'Amount'].map((h, i) => (
                                <th key={h} style={{
                                    padding: '3mm 4mm', color: 'white', fontWeight: 900,
                                    textTransform: 'uppercase', fontSize: '7pt', letterSpacing: '0.08em',
                                    textAlign: i === 4 ? 'right' : 'left',
                                }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.map((txn, i) => {
                            const isPayment = txn.type?.includes('PAYMENT');
                            return (
                                <tr key={txn.id} style={{ background: i % 2 === 0 ? '#f8fafc' : 'white' }}>
                                    <td style={{ padding: '2.5mm 4mm', fontFamily: 'monospace', color: '#64748b', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>
                                        {fmtDate(txn.timestamp)}
                                    </td>
                                    <td style={{ padding: '2.5mm 4mm', fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #f1f5f9' }}>
                                        {txn.librarian_id || '—'}
                                    </td>
                                    <td style={{ padding: '2.5mm 4mm', fontFamily: 'monospace', color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>
                                        {txn.patron_id || '—'}
                                    </td>
                                    <td style={{ padding: '2.5mm 4mm', borderBottom: '1px solid #f1f5f9' }}>
                                        <span style={{
                                            fontSize: '6.5pt', fontWeight: 900, padding: '1mm 2.5mm',
                                            borderRadius: '2mm', textTransform: 'uppercase', letterSpacing: '0.06em',
                                            background: isPayment ? '#f0fdf4' : '#fef2f2',
                                            color: isPayment ? '#15803d' : '#dc2626',
                                            border: `1px solid ${isPayment ? '#bbf7d0' : '#fecaca'}`,
                                        }}>
                                            {txn.type?.replace('_', ' ') || '—'}
                                        </span>
                                    </td>
                                    <td style={{
                                        padding: '2.5mm 4mm', textAlign: 'right', fontFamily: 'monospace',
                                        fontWeight: 900, borderBottom: '1px solid #f1f5f9',
                                        color: isPayment ? '#15803d' : '#dc2626',
                                    }}>
                                        {isPayment ? '–' : '+'}{fmtMYR(txn.amount)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    {/* Totals row */}
                    <tfoot>
                        <tr style={{ background: '#0f172a' }}>
                            <td colSpan={4} style={{ padding: '3mm 4mm', color: 'white', fontWeight: 900, fontSize: '8pt', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                Net Collected
                            </td>
                            <td style={{ padding: '3mm 4mm', textAlign: 'right', fontFamily: 'monospace', fontWeight: 900, color: '#4ade80', fontSize: '10pt' }}>
                                {fmtMYR(summary.totalCollected)}
                            </td>
                        </tr>
                    </tfoot>
                </table>

                {/* Footer */}
                <div style={{ marginTop: '8mm', borderTop: '1px solid #e2e8f0', paddingTop: '5mm', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div style={{ fontSize: '7pt', color: '#94a3b8', maxWidth: '120mm', lineHeight: 1.5 }}>
                        This report is auto-generated by the Thomian Library Management System. All figures reflect recorded transactions only and are subject to final reconciliation by the head librarian.
                    </div>
                    <div style={{ width: '40mm' }}>
                        <div style={{ borderBottom: '1px solid #cbd5e1', paddingBottom: '6mm', marginBottom: '2mm' }} />
                        <div style={{ fontSize: '7pt', color: '#94a3b8', textAlign: 'center', fontWeight: 700, textTransform: 'uppercase' }}>Head Librarian</div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default FinancialAuditModal;
