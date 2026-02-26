
import { SystemTheme } from './types';

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
}> = {
    EMERALD: {
        navBg: 'bg-emerald-50/90',
        navText: 'text-emerald-900',
        navBrand: 'text-emerald-950',
        navAccent: 'text-emerald-600',
        navBorder: 'border-emerald-100',
        subnavBg: 'bg-emerald-50/40',
        subnavActive: 'text-emerald-700',
        subnavIdle: 'text-emerald-800/40',
        subnavIndicator: 'bg-emerald-600',
        globalBg: 'bg-slate-50',
        headingText: 'text-slate-900',
        bodyText: 'text-slate-600',
        cardPrimary: 'bg-emerald-600',
        cardDark: 'bg-emerald-900',
        cardLight: 'bg-emerald-50',
        accentHex: '#059669'
    },
    PURPLE: {
        navBg: 'bg-purple-50/90',
        navText: 'text-purple-900',
        navBrand: 'text-purple-950',
        navAccent: 'text-purple-600',
        navBorder: 'border-purple-100',
        subnavBg: 'bg-purple-50/40',
        subnavActive: 'text-purple-700',
        subnavIdle: 'text-purple-800/40',
        subnavIndicator: 'bg-purple-600',
        globalBg: 'bg-slate-50',
        headingText: 'text-slate-900',
        bodyText: 'text-slate-600',
        cardPrimary: 'bg-purple-600',
        cardDark: 'bg-purple-900',
        cardLight: 'bg-purple-50',
        accentHex: '#9333ea'
    },
    SKY: {
        navBg: 'bg-sky-50/90',
        navText: 'text-sky-900',
        navBrand: 'text-sky-950',
        navAccent: 'text-sky-600',
        navBorder: 'border-sky-100',
        subnavBg: 'bg-sky-50/40',
        subnavActive: 'text-sky-700',
        subnavIdle: 'text-sky-800/40',
        subnavIndicator: 'bg-sky-600',
        globalBg: 'bg-slate-50',
        headingText: 'text-slate-900',
        bodyText: 'text-slate-600',
        cardPrimary: 'bg-sky-600',
        cardDark: 'bg-sky-900',
        cardLight: 'bg-sky-50',
        accentHex: '#0284c7'
    },
    MIDNIGHT: {
        navBg: 'bg-slate-900/95',
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
        accentHex: '#38bdf8'
    },
    WHITE: {
        navBg: 'bg-white/95',
        navText: 'text-slate-900',
        navBrand: 'text-slate-950',
        navAccent: 'text-slate-500',
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
        accentHex: '#64748b'
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
