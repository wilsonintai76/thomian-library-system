/**
 * AuditReportModal.tsx
 * Prints a shelf stocktake audit report — single A4 page (or more if needed).
 * Shows: summary table, misplaced items list, verified items list, sign-off line.
 */

import React from 'react';
import { X, Printer } from 'lucide-react';
import { Book } from '../../types';
import { triggerPrint, reportTimestamp } from '../../utils/printUtils';

interface AuditReportModalProps {
    shelf: string;
    expectedCount: number;
    scannedBooks: Book[];
    misplacedBooks: Book[];
    logoUrl?: string | null;
    schoolName?: string;
    onClose: () => void;
}

const AuditReportModal: React.FC<AuditReportModalProps> = ({
    shelf, expectedCount, scannedBooks, misplacedBooks,
    logoUrl, schoolName = 'Thomian Library', onClose,
}) => {
    const missingCount = Math.max(0, expectedCount - scannedBooks.length);
    const timestamp = reportTimestamp();

    return (
        <>
            {/* ── Screen Preview UI ── */}
            <div className="print-hide fixed inset-0 z-[300] bg-slate-900/70 backdrop-blur-md flex flex-col items-center justify-center gap-5 p-6">
                <div className="bg-white rounded-[2rem] shadow-2xl p-8 flex flex-col items-center gap-6 max-w-md w-full">
                    <div className="h-16 w-16 bg-blue-600 rounded-[1.5rem] flex items-center justify-center">
                        <Printer className="h-8 w-8 text-white" />
                    </div>
                    <div className="text-center">
                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Print Audit Report</h3>
                        <p className="text-slate-500 text-sm mt-1">
                            {shelf} · {scannedBooks.length} verified · {misplacedBooks.length} misplaced · {missingCount} missing
                        </p>
                    </div>
                    <div className="w-full bg-sky-50 border border-sky-200 rounded-xl p-4 text-[11px] text-sky-800 font-medium leading-relaxed">
                        💡 Set print margins to <strong>Default</strong> and enable <strong>"Background graphics"</strong>. Use <strong>"Save as PDF"</strong> to archive this audit.
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
                            <div style={{ fontSize: '8pt', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Shelf Stocktake Audit Report</div>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '7pt', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Generated</div>
                        <div style={{ fontSize: '8pt', fontWeight: 700, color: '#475569' }}>{timestamp}</div>
                        <div style={{ marginTop: '2mm', background: '#1e3a5f', color: 'white', fontSize: '7pt', fontWeight: 900, padding: '1.5mm 3mm', borderRadius: '2mm', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            Zone: {shelf}
                        </div>
                    </div>
                </div>

                {/* Summary KPI row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4mm', marginBottom: '7mm' }}>
                    {[
                        { label: 'Expected', value: expectedCount, color: '#0f172a', bg: '#f8fafc', border: '#e2e8f0' },
                        { label: 'Verified', value: scannedBooks.length, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
                        { label: 'Misplaced', value: misplacedBooks.length, color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
                        { label: 'Missing', value: missingCount, color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
                    ].map(stat => (
                        <div key={stat.label} style={{ background: stat.bg, border: `1.5px solid ${stat.border}`, borderRadius: '3mm', padding: '4mm 5mm', textAlign: 'center' }}>
                            <div style={{ fontSize: '7pt', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.5mm' }}>{stat.label}</div>
                            <div style={{ fontSize: '20pt', fontWeight: 900, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
                        </div>
                    ))}
                </div>

                {/* Misplaced section */}
                {misplacedBooks.length > 0 && (
                    <div style={{ marginBottom: '6mm' }}>
                        <div style={{ fontSize: '8pt', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '3mm', paddingBottom: '1.5mm', borderBottom: '1px solid #e2e8f0' }}>
                            ⚠ Misplaced Items ({misplacedBooks.length})
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt' }}>
                            <thead>
                                <tr style={{ background: '#fffbeb' }}>
                                    <th style={{ textAlign: 'left', padding: '2mm 3mm', fontWeight: 900, color: '#92400e', textTransform: 'uppercase', fontSize: '7pt', borderBottom: '1px solid #fde68a' }}>#</th>
                                    <th style={{ textAlign: 'left', padding: '2mm 3mm', fontWeight: 900, color: '#92400e', textTransform: 'uppercase', fontSize: '7pt', borderBottom: '1px solid #fde68a' }}>Title</th>
                                    <th style={{ textAlign: 'left', padding: '2mm 3mm', fontWeight: 900, color: '#92400e', textTransform: 'uppercase', fontSize: '7pt', borderBottom: '1px solid #fde68a' }}>Barcode</th>
                                    <th style={{ textAlign: 'left', padding: '2mm 3mm', fontWeight: 900, color: '#92400e', textTransform: 'uppercase', fontSize: '7pt', borderBottom: '1px solid #fde68a' }}>Target Shelf</th>
                                </tr>
                            </thead>
                            <tbody>
                                {misplacedBooks.map((b, i) => (
                                    <tr key={b.id} style={{ background: i % 2 === 0 ? '#fffbeb40' : 'white' }}>
                                        <td style={{ padding: '2mm 3mm', color: '#475569', fontFamily: 'monospace', borderBottom: '1px solid #f1f5f9' }}>{i + 1}</td>
                                        <td style={{ padding: '2mm 3mm', fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #f1f5f9', maxWidth: '80mm', wordBreak: 'break-word' }}>{b.title}</td>
                                        <td style={{ padding: '2mm 3mm', fontFamily: 'monospace', color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>{b.barcode_id || b.isbn || '—'}</td>
                                        <td style={{ padding: '2mm 3mm', fontWeight: 900, color: '#d97706', borderBottom: '1px solid #f1f5f9' }}>{b.shelf_location}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Verified section */}
                {scannedBooks.length > 0 && (
                    <div style={{ marginBottom: '10mm' }}>
                        <div style={{ fontSize: '8pt', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '3mm', paddingBottom: '1.5mm', borderBottom: '1px solid #e2e8f0' }}>
                            ✓ Verified Items ({scannedBooks.length})
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt' }}>
                            <thead>
                                <tr style={{ background: '#f0fdf4' }}>
                                    <th style={{ textAlign: 'left', padding: '2mm 3mm', fontWeight: 900, color: '#15803d', textTransform: 'uppercase', fontSize: '7pt', borderBottom: '1px solid #bbf7d0' }}>#</th>
                                    <th style={{ textAlign: 'left', padding: '2mm 3mm', fontWeight: 900, color: '#15803d', textTransform: 'uppercase', fontSize: '7pt', borderBottom: '1px solid #bbf7d0' }}>Title</th>
                                    <th style={{ textAlign: 'left', padding: '2mm 3mm', fontWeight: 900, color: '#15803d', textTransform: 'uppercase', fontSize: '7pt', borderBottom: '1px solid #bbf7d0' }}>Barcode</th>
                                    <th style={{ textAlign: 'left', padding: '2mm 3mm', fontWeight: 900, color: '#15803d', textTransform: 'uppercase', fontSize: '7pt', borderBottom: '1px solid #bbf7d0' }}>DDC</th>
                                </tr>
                            </thead>
                            <tbody>
                                {scannedBooks.map((b, i) => (
                                    <tr key={b.id} style={{ background: i % 2 === 0 ? '#f0fdf420' : 'white' }}>
                                        <td style={{ padding: '2mm 3mm', color: '#475569', fontFamily: 'monospace', borderBottom: '1px solid #f1f5f9' }}>{i + 1}</td>
                                        <td style={{ padding: '2mm 3mm', fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #f1f5f9', maxWidth: '80mm', wordBreak: 'break-word' }}>{b.title}</td>
                                        <td style={{ padding: '2mm 3mm', fontFamily: 'monospace', color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>{b.barcode_id || b.isbn || '—'}</td>
                                        <td style={{ padding: '2mm 3mm', fontFamily: 'monospace', color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>{b.ddc_code || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Sign-off footer */}
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '5mm', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8mm' }}>
                    {['Librarian Name', 'Signature', 'Date'].map(label => (
                        <div key={label}>
                            <div style={{ borderBottom: '1px solid #cbd5e1', paddingBottom: '6mm', marginBottom: '2mm' }} />
                            <div style={{ fontSize: '7pt', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
};

export default AuditReportModal;
