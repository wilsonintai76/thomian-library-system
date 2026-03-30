
import React from 'react';
import { Book, Zap, TrendingUp } from 'lucide-react';

interface GenreIntelligenceProps {
    data: Record<string, { count: number, loans: number }>;
    totalBooks: number;
}

const GenreIntelligence: React.FC<GenreIntelligenceProps> = ({ data, totalBooks }) => {
    const sortedGenres = Object.entries(data).sort((a, b) => (b[1] as {count: number, loans: number}).count - (a[1] as {count: number, loans: number}).count);

    return (
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col h-full">
            <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
                    <Zap className="h-5 w-5 text-sky-500" /> Genre Intelligence
                </h3>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                    Collection Map
                </span>
            </div>

            <div className="space-y-6 flex-1 overflow-y-auto pr-2 scrollbar-thin">
                {sortedGenres.map(([genre, stats]) => {
                    const typedStats = stats as {count: number, loans: number};
                    const pct = (typedStats.count / totalBooks) * 100;
                    return (
                        <div key={genre} className="group">
                            <div className="flex justify-between items-end mb-2">
                                <div>
                                    <span className="text-xs font-black text-slate-700 uppercase tracking-tight block">{genre}</span>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <Book className="h-2.5 w-2.5 text-slate-300" />
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">{typedStats.count} Assets</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-black text-sky-600 font-mono">{pct.toFixed(1)}%</span>
                                    <div className="flex items-center gap-1 mt-0.5 justify-end">
                                        <TrendingUp className="h-2.5 w-2.5 text-emerald-400" />
                                        <span className="text-[9px] font-black text-emerald-600 uppercase">{typedStats.loans} Checkouts</span>
                                    </div>
                                </div>
                            </div>
                            <div className="w-full bg-slate-50 rounded-full h-2 overflow-hidden border border-slate-100">
                                <div 
                                    className="h-full bg-sky-500 rounded-full transition-all duration-1000 ease-out group-hover:bg-sky-400 shadow-[0_0_10px_rgba(14,165,233,0.3)]"
                                    style={{ width: `${pct}%` }}
                                ></div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                    Analyzing cross-subject correlation for automated weeding & acquisition priorities.
                </p>
            </div>
        </div>
    );
};

export default GenreIntelligence;
