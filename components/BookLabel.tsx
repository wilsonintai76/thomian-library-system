
import React from 'react';
import { Book as BookType } from '../types';

interface BookLabelProps {
    book: Partial<BookType>;
    isSheetMode?: boolean;
}

const BookLabel: React.FC<BookLabelProps> = ({ book, isSheetMode = false }) => {
    const authorShort = (book.author || 'UNK').slice(0, 3).toUpperCase();
    
    // Logic to split DDC for narrow spines
    const ddc = book.ddc_code || '000.00';
    const isGenrePrefix = isNaN(parseFloat(ddc.charAt(0)));
    
    const [main, sub] = ddc.includes('.') ? ddc.split('.') : [ddc, ''];

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

                    {/* Barcode Visualization */}
                    <div className="flex-1 flex flex-col items-center justify-center">
                        <div className="flex flex-col gap-[1.5px] w-14 h-12 bg-black/5 p-1 rounded-sm">
                            {[2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 1, 2].map((w, i) => (
                                <div 
                                    key={i} 
                                    className="bg-black h-[1.5px]" 
                                    style={{ width: `${30 + (w * 15)}%`, alignSelf: i % 2 === 0 ? 'flex-start' : 'flex-end' }} 
                                />
                            ))}
                        </div>
                        <span className="text-[8px] font-black mt-1 tracking-[0.2em]">{book.barcode_id || 'TEMP-ID'}</span>
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
