import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { SystemTheme } from './types';

/**
 * Utility for Tailwind class merging
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Professional DDC and Classification Logic
 */
export const DEWEY_CATEGORIES: Record<string, string> = {
    '000': 'Generalities',
    '100': 'Philosophy & Psychology',
    '200': 'Religion',
    '300': 'Social Sciences',
    '400': 'Language',
    '500': 'Science',
    '600': 'Technology',
    '700': 'Arts & Recreation',
    '800': 'Literature',
    '900': 'History & Geography',
    'FIC': 'Fiction',
    'JF': 'Junior Fiction',
    'B': 'Biography',
    'REF': 'Reference',
    'E': 'Easy Reader'
};

export const getClassificationFromDDC = (ddc: string | undefined): string => {
    if (!ddc) return 'General';
    const upper = ddc.trim().toUpperCase();

    if (upper.startsWith('FIC') || upper === 'F') return 'Fiction';
    if (upper.startsWith('JF')) return 'Junior Fiction';
    if (upper.startsWith('B') || upper.startsWith('920') || upper.startsWith('921')) return 'Biography';
    if (upper.startsWith('REF')) return 'Reference';
    if (upper.startsWith('E')) return 'Easy Reader';

    const num = parseFloat(ddc);
    if (!isNaN(num)) {
        if (num >= 800 && num < 900) return 'Literature';
        const hundred = Math.floor(num / 100) * 100;
        const key = hundred.toString().padStart(3, '0');
        return DEWEY_CATEGORIES[key] || 'Non-Fiction';
    }

    return 'Special Collection';
};

export const getStarterDdcForClassification = (classification: string): string => {
    const entry = Object.entries(DEWEY_CATEGORIES).find(([_, label]) => label === classification);
    if (entry) return entry[0];
    if (classification === 'Literature') return '800';
    return '';
};

export const getShelfFromDDC = (ddc: string | undefined): string => {
  if (!ddc) return 'Unknown';
  const upper = ddc.trim().toUpperCase();
  if (upper.startsWith('FIC') || upper === 'F') return 'Shelf C';
  if (upper.startsWith('JF')) return 'Shelf C';
  if (upper.startsWith('B')) return 'Shelf D';
  const num = parseFloat(ddc);
  if (isNaN(num)) return 'Shelf A';
  if (num >= 0 && num < 300) return 'Shelf A';
  if (num >= 300 && num < 600) return 'Shelf B';
  if (num >= 600 && num < 900) return 'Shelf C';
  if (num >= 900) return 'Shelf D';
  return 'Unknown';
};

/**
 * Centralized System Theme Configuration
 * Controls all visual parameters including text pairings
 */
export const SYSTEM_THEME_CONFIG: Record<SystemTheme, {
    navBg: string;
    navText: string;
    navBrand: string;
    navAccent: string;
    navBorder: string;
    subnavBg: string;
    subnavActive: string;
    subnavIdle: string;
    subnavIndicator: string;
    globalBg: string;
    headingText: string;
    bodyText: string;
    cardPrimary: string;
    cardDark: string;
    cardLight: string;
    accentHex: string;
    cardDarkHex: string;
}> = {
    EMERALD: {
        navBg: 'bg-emerald-50',
        navText: 'text-emerald-900',
        navBrand: 'text-emerald-950',
        navAccent: 'text-emerald-600',
        navBorder: 'border-emerald-100',
        subnavBg: 'bg-emerald-50',
        subnavActive: 'text-emerald-700',
        subnavIdle: 'text-emerald-800/40',
        subnavIndicator: 'bg-emerald-600',
        globalBg: 'bg-slate-50',
        headingText: 'text-slate-900',
        bodyText: 'text-slate-600',
        cardPrimary: 'bg-emerald-600',
        cardDark: 'bg-emerald-900',
        cardLight: 'bg-emerald-50',
        accentHex: '#059669',
        cardDarkHex: '#064e3b'
    },
    PURPLE: {
        navBg: 'bg-purple-50',
        navText: 'text-purple-900',
        navBrand: 'text-purple-950',
        navAccent: 'text-purple-600',
        navBorder: 'border-purple-100',
        subnavBg: 'bg-purple-50',
        subnavActive: 'text-purple-700',
        subnavIdle: 'text-purple-800/40',
        subnavIndicator: 'bg-purple-600',
        globalBg: 'bg-slate-50',
        headingText: 'text-slate-900',
        bodyText: 'text-slate-600',
        cardPrimary: 'bg-purple-600',
        cardDark: 'bg-purple-900',
        cardLight: 'bg-purple-50',
        accentHex: '#9333ea',
        cardDarkHex: '#581c87'
    },
    SKY: {
        navBg: 'bg-sky-50',
        navText: 'text-sky-900',
        navBrand: 'text-sky-950',
        navAccent: 'text-sky-600',
        navBorder: 'border-sky-100',
        subnavBg: 'bg-sky-50',
        subnavActive: 'text-sky-700',
        subnavIdle: 'text-sky-800/40',
        subnavIndicator: 'bg-sky-600',
        globalBg: 'bg-slate-50',
        headingText: 'text-slate-900',
        bodyText: 'text-slate-600',
        cardPrimary: 'bg-sky-600',
        cardDark: 'bg-sky-900',
        cardLight: 'bg-sky-50',
        accentHex: '#0284c7',
        cardDarkHex: '#0c4a6e'
    },
    MIDNIGHT: {
        navBg: 'bg-slate-900',
        navText: 'text-slate-100',
        navBrand: 'text-white',
        navAccent: 'text-sky-400',
        navBorder: 'border-slate-800',
        subnavBg: 'bg-slate-950',
        subnavActive: 'text-sky-400',
        subnavIdle: 'text-slate-500',
        subnavIndicator: 'bg-sky-500',
        globalBg: 'bg-slate-900',
        headingText: 'text-white',
        bodyText: 'text-slate-300',
        cardPrimary: 'bg-slate-800',
        cardDark: 'bg-slate-950',
        cardLight: 'bg-slate-800',
        accentHex: '#38bdf8',
        cardDarkHex: '#020617'
    },
    WHITE: {
        navBg: 'bg-white',
        navText: 'text-slate-900',
        navBrand: 'text-slate-950',
        navAccent: 'text-slate-50',
        navBorder: 'border-slate-200',
        subnavBg: 'bg-white',
        subnavActive: 'text-slate-900',
        subnavIdle: 'text-slate-400',
        subnavIndicator: 'bg-slate-900',
        globalBg: 'bg-slate-50',
        headingText: 'text-slate-900',
        bodyText: 'text-slate-600',
        cardPrimary: 'bg-slate-900',
        cardDark: 'bg-slate-900',
        cardLight: 'bg-slate-50',
        accentHex: '#64748b',
        cardDarkHex: '#0f172a'
    }
};

/**
 * Professional CSV Export Utility
 */
export const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(item => {
            return headers.map(header => {
                let val = item[header];
                if (val === null || val === undefined) val = '';
                const stringVal = String(val).replace(/"/g, '""');
                return `"${stringVal}"`;
            }).join(',');
        })
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

/**
 * PDF Export Utility — renders a printable HTML table in a hidden iframe
 * and triggers the browser's native Print / Save-as-PDF dialog.
 *
 * @param data     Array of flat objects (same shape as exportToCSV)
 * @param title    Report title shown at top of the PDF page
 * @param filename Used for the visible heading line (not the filename — PDF naming is browser-controlled)
 * @param logoUrl  Optional URL to show school logo in header
 * @param meta     Optional extra key-value pairs to show in a subtitle row (e.g. { 'Total Records': 42 })
 */
export const exportToPDF = (
    data: any[],
    title: string,
    logoUrl?: string | null,
    meta?: Record<string, string | number>,
) => {
    if (!data || data.length === 0) return;

    const headers = Object.keys(data[0]);
    const timestamp = new Date().toLocaleString('en-MY', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });

    const logoHtml = logoUrl
        ? `<img src="${logoUrl}" style="height:36px;width:auto;object-fit:contain;margin-right:12px;" />`
        : `<div style="height:36px;width:36px;background:#0f172a;border-radius:6px;display:flex;align-items:center;justify-content:center;margin-right:12px;flex-shrink:0;color:white;font-weight:900;font-size:14px;">T</div>`;

    const metaHtml = meta
        ? Object.entries(meta).map(([k, v]) =>
            `<span style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:4px;padding:2px 8px;font-size:10px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.06em;">${k}: <strong style="color:#0f172a;">${v}</strong></span>`
          ).join(' ')
        : '';

    const rowsHtml = data.map((item, i) =>
        `<tr style="background:${i % 2 === 0 ? '#f8fafc' : 'white'}">
            ${headers.map(h => {
                const val = item[h] ?? '—';
                return `<td style="padding:6px 10px;font-size:9px;color:#374151;border-bottom:1px solid #f1f5f9;word-break:break-word;">${String(val)}</td>`;
            }).join('')}
        </tr>`
    ).join('');

    const html = `<!DOCTYPE html><html><head>
<meta charset="utf-8"/>
<title>${title}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, sans-serif; background: white; padding: 14mm; }
  @page { size: A4 landscape; margin: 0; }
  @media print {
    body { padding: 10mm; }
    .no-print { display: none !important; }
  }
  table { width: 100%; border-collapse: collapse; table-layout: auto; }
  th { text-align: left; padding: 7px 10px; font-size: 8px; font-weight: 900;
       text-transform: uppercase; letter-spacing: 0.08em; color: white;
       background: #0f172a; white-space: nowrap; }
  tfoot td { background: #0f172a; color: white; font-size: 9px; font-weight: 700;
             padding: 6px 10px; text-align: right; }
</style>
</head><body>
  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #0f172a;padding-bottom:8px;margin-bottom:10px;">
    <div style="display:flex;align-items:center;">
      ${logoHtml}
      <div>
        <div style="font-size:14px;font-weight:900;color:#0f172a;text-transform:uppercase;letter-spacing:0.05em;">${title}</div>
        <div style="font-size:9px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin-top:2px;">Thomian Library Management System</div>
      </div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:8px;color:#94a3b8;font-weight:700;text-transform:uppercase;">Generated</div>
      <div style="font-size:9px;font-weight:700;color:#475569;">${timestamp}</div>
      <div style="font-size:8px;color:#94a3b8;margin-top:3px;">${data.length} records</div>
    </div>
  </div>
  ${metaHtml ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;">${metaHtml}</div>` : ''}
  <!-- Table -->
  <table>
    <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${rowsHtml}</tbody>
    <tfoot><tr><td colspan="${headers.length}">End of report — ${data.length} total records · ${timestamp}</td></tr></tfoot>
  </table>
  <!-- Print hint -->
  <div class="no-print" style="margin-top:16px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:10px 14px;font-size:11px;color:#0369a1;">
    💡 Use <strong>File → Print</strong> → set layout to <strong>Landscape</strong>, enable <strong>Background graphics</strong>, then <strong>Save as PDF</strong>.
  </div>
  <script>setTimeout(() => { window.print(); }, 300);<\/script>
</body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) win.onload = () => URL.revokeObjectURL(url);
};

