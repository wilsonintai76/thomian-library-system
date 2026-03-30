
import React from 'react';
import { Trophy, Users, Star, GraduationCap } from 'lucide-react';

interface EngagementHubProps {
    topReaders: { name: string, id: string, count: number }[];
    topClasses: { name: string, count: number }[];
}

const EngagementHub: React.FC<EngagementHubProps> = ({ topReaders, topClasses }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden h-full flex flex-col">
            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
            
            <div className="flex items-center gap-3 mb-8 relative z-10">
                <div className="p-3 bg-white/10 rounded-2xl">
                    <Trophy className="h-6 w-6 text-amber-400" />
                </div>
                <div>
                    <h3 className="text-xl font-black uppercase tracking-tight">Top Scholars</h3>
                    <p className="text-[10px] font-black text-sky-400 uppercase tracking-widest opacity-80">Library Power Users</p>
                </div>
            </div>

            <div className="space-y-4 flex-1 relative z-10 overflow-y-auto pr-2 scrollbar-thin">
                {topReaders.map((patron, i) => (
                    <div key={patron.id} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-black text-xs ${i === 0 ? 'bg-amber-400 text-slate-900 shadow-[0_0_15px_rgba(251,191,36,0.4)]' : 'bg-slate-800 text-slate-400'}`}>
                                {i + 1}
                            </div>
                            <div>
                                <p className="font-black text-sm uppercase tracking-tight">{patron.name}</p>
                                <p className="text-[9px] font-bold text-slate-500 font-mono uppercase tracking-widest">{patron.id}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-lg font-black text-sky-400 font-mono">{patron.count}</p>
                            <p className="text-[8px] font-black text-slate-500 uppercase">Loans</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col h-full">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-slate-100 rounded-2xl text-slate-400">
                    <GraduationCap className="h-6 w-6" />
                </div>
                <div>
                    <h3 className="text-xl font-black uppercase tracking-tight text-slate-800">Form Leaderboard</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aggregated by Class</p>
                </div>
            </div>

            <div className="space-y-4 flex-1 overflow-y-auto pr-2 scrollbar-thin">
                {topClasses.map((cls, i) => (
                    <div key={cls.name} className="group">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-xs font-black text-slate-700 uppercase tracking-widest">{cls.name}</span>
                            <span className="text-sm font-black text-slate-800 font-mono">{cls.count} Loans</span>
                        </div>
                        <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden border border-slate-100">
                            <div 
                                className={`h-full rounded-full transition-all duration-1000 ${i === 0 ? 'bg-indigo-500' : 'bg-slate-300'}`}
                                style={{ width: `${(cls.count / topClasses[0].count) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

export default EngagementHub;
