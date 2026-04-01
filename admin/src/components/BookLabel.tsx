
import React from 'react';
import { Book as BookType } from '../types';

interface BookLabelProps {
    book: Partial<BookType>;
    isSheetMode?: boolean;
}

// Code 39 barcode — SVG-based, always prints regardless of browser "print background" setting
const CODE39: Record<string, string> = {
    '0':'nnnwwnwnn','1':'wnnwnnnnw','2':'nnwwnnnnw','3':'wnwwnnnnn','4':'nnnwwnnnw',
    '5':'wnnwwnnnn','6':'nnwwwnnnn','7':'nnnwnnwnw','8':'wnnwnnwnn','9':'nnwwnnwnn',
    'A':'wnnnnwnnw','B':'nnwnnwnnw','C':'wnwnnwnnn','D':'nnnnwwnnw','E':'wnnnwwnnn',
    'F':'nnwnwwnnn','G':'nnnnnwwnw','H':'wnnnnwwnn','I':'nnwnnwwnn','J':'nnnnwwwnn',
    'K':'wnnnnnnww','L':'nnwnnnnww','M':'wnwnnnnwn','N':'nnnnwnnww','O':'wnnnwnnwn',
    'P':'nnwnwnnwn','Q':'nnnnnwnww','R':'wnnnnwnwn','S':'nnwnnwnwn','T':'nnnnwwnwn',
    'U':'wwnnnnnnw','V':'nwwnnnnnw','W':'wwwnnnnnn','X':'nwnnwnnnw','Y':'wwnnwnnnn',
    'Z':'nwwnwnnnn','-':'nwnnnnwnw',' ':'nwnnwwnnn','*':'nwnnwnwnn','.':'wwnnnnwnn',
    '$':'nwnwnwnnn','/':'nwnwnnnwn','+':'nwnnnwnwn','%':'nnnwnwnwn',
};
const WIDE = 3; const NARROW = 1; const GAP = 1;
const Code39Barcode: React.FC<{ value: string | number; height?: number; dark?: boolean }> = ({ value, height = 28, dark = false }) => {
    const safeValue = String(value || '');
    const text = ('*' + safeValue.toUpperCase().replace(/[^0-9A-Z\-. $/+%]/g, '') + '*');
    const bars: { x: number; w: number }[] = [];
    let x = 0;
    for (const ch of text) {
        const pat = CODE39[ch] || CODE39['*'];
        for (let i = 0; i < 9; i++) {
            const w = pat[i] === 'w' ? WIDE : NARROW;
            if (i % 2 === 0) bars.push({ x, w });
            x += w + (i % 2 === 1 ? GAP : 0);
        }
        x += GAP;
    }
    const totalW = x;
    const color = dark ? '#fff' : '#000';
    return (
        <svg viewBox={`0 0 ${totalW} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height }} aria-label={value}>
            {bars.map((b, i) => <rect key={i} x={b.x} y={0} width={b.w} height={height} fill={color} />)}
        </svg>
    );
};

const BookLabel: React.FC<BookLabelProps> = ({ book, isSheetMode = false }) => {
    const authorShort = String(book.author || 'UNK').slice(0, 3).toUpperCase();
    
    // Logic to split DDC for narrow spines
    const ddc = String(book.ddc_code || '000.00');
    const isGenrePrefix = isNaN(parseFloat(ddc.charAt(0)));
    
    const [main, sub] = ddc.includes('.') ? ddc.split('.') : [ddc, ''];

    // Resolve barcode: assigned barcode_id preferred, then ISBN, then nothing
    const barcodeValue = book.barcode_id || book.isbn || null;

    return (
        <div className={`
            relative group overflow-hidden bg-white font-mono select-none
            ${isSheetMode ? 'w-[1.5in] h-[1in] border border-slate-100' : 'w-[144px] h-[96px] border border-slate-300 shadow-md rounded-lg'}
            print:border-0 print:shadow-none print:rounded-none
        `}>
            {/* Die-cut sticker edge effect (non-print only) */}
            {!isSheetMode && (
                <div className="absolute inset-0 pointer-events-none border-[3px] border-slate-50/50 rounded-lg z-20"></div>
            )}
            
            <div className="flex flex-col h-full p-2 z-10">
                <div className="flex-1 flex justify-between gap-2">
                    {/* DDC Vertical Stack */}
                    <div className="flex flex-col leading-none">
                        {isGenrePrefix ? (
                            <span className="text-2xl font-black text-black tracking-tight">{ddc}</span>
                        ) : (
                            <>
                                <span className="text-xl font-black text-black">{main}</span>
                                {sub && <span className="text-lg font-bold text-black">.{sub}</span>}
                            </>
                        )}
                        <div className="mt-1 bg-black text-white px-1.5 py-0.5 w-fit rounded-sm">
                            <span className="text-[10px] font-black uppercase tracking-tighter">{authorShort}</span>
                        </div>
                    </div>

                    {/* Barcode */}
                    <div className="flex-1 flex flex-col items-center justify-center">
                        {barcodeValue ? (
                            <>
                                <div className="w-full px-0.5">
                                    <Code39Barcode value={barcodeValue} height={28} />
                                </div>
                                {/* Human-readable — large enough to type manually if scanner fails */}
                                <span className="text-[9px] font-black mt-0.5 tracking-[0.15em] font-mono text-center w-full leading-tight break-all">
                                    {barcodeValue}
                                </span>
                                {!book.barcode_id && (
                                    <span className="text-[6px] text-amber-500 font-black uppercase tracking-widest text-center leading-tight mt-0.5">
                                        TEMP — save to lock
                                    </span>
                                )}
                            </>
                        ) : (
                            <div className="w-full flex flex-col items-center justify-center gap-0.5 border border-dashed border-slate-300 rounded py-1 px-1">
                                <span className="text-[7px] font-black uppercase tracking-widest text-slate-400 text-center leading-tight">No Barcode</span>
                                <span className="text-[6px] text-slate-300 font-mono text-center leading-tight">Assign in Catalog</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Labels */}
                <div className="mt-auto pt-1 border-t border-slate-100 flex justify-between items-center opacity-40">
                    <span className="text-[5px] font-black uppercase tracking-widest">Thomian Lib LIS</span>
                    <span className="text-[5px] font-black uppercase tracking-widest">{book.classification || 'GEN'}</span>
                </div>
            </div>

            {!isSheetMode && (
                <div className="absolute top-0 right-0 w-4 h-4 bg-gradient-to-bl from-slate-200 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
            )}
        </div>
    );
};

export default BookLabel;
