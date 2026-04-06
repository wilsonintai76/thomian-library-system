/**
 * printUtils.ts
 * Shared print utilities for all report/print modals.
 * Strategy: render a hidden .print-area div; @media print in index.css
 * makes body invisible and pins .print-area to full viewport so the
 * browser's native "Save as PDF" dialog captures it cleanly.
 */

/**
 * Trigger the browser's print / Save-as-PDF dialog.
 * Call this after the print modal is mounted and visible.
 */
export function triggerPrint(): void {
    // Small delay so React has flushed the DOM before the browser snapshots it
    setTimeout(() => {
        window.print();
    }, 150);
}

/**
 * Format a date string (ISO or locale) into a readable short date.
 */
export function fmtDate(dateStr: string): string {
    try {
        return new Date(dateStr).toLocaleDateString('en-MY', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    } catch {
        return dateStr;
    }
}

/**
 * Format a number as Malaysian Ringgit.
 */
export function fmtMYR(value: number): string {
    return new Intl.NumberFormat('en-MY', {
        style: 'currency',
        currency: 'MYR',
    }).format(value);
}

/**
 * Return the current date/time formatted for report headers.
 */
export function reportTimestamp(): string {
    return new Date().toLocaleString('en-MY', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}
