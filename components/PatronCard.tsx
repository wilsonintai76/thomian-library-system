
import React from 'react';
import { ShieldCheck, User, Globe, Library, Sparkles } from 'lucide-react';
import { Patron, MapConfig } from '../types';
import { SYSTEM_THEME_CONFIG } from '../utils';

interface PatronCardProps {
    patron: Patron;
    config: MapConfig | null;
}

const BarcodeMock: React.FC<{ code: string, isDark?: boolean }> = ({ code, isDark }) => (
    <div className={`flex items-end gap-[1px] h-10 p-1 rounded-sm ${isDark ? 'bg-white/10' : 'bg-white'}`}>
        {code.split('').map((char, i) => (
            <div 
                key={i} 
                className={`${isDark ? 'bg-white' : 'bg-black'}`}
                style={{ 
                    width: (parseInt(char, 36) % 3 + 1) + 'px',
                    height: (80 + (i % 20)) + '%' 
                }} 
            />
        ))}
    </div>
);

const PatronCard: React.FC<PatronCardProps> = ({ patron, config }) => {
  const theme = config?.theme || 'EMERALD';
  const template = config?.cardTemplate || 'TRADITIONAL';
  const styles = SYSTEM_THEME_CONFIG[theme];

  // TRADITIONAL TEMPLATE
  if (template === 'TRADITIONAL') {
    return (
        <div className="w-[324px] h-[204px] bg-white rounded-[12px] shadow-2xl overflow-hidden relative border border-slate-200 flex flex-col font-sans select-none">
            <div className={`h-12 ${styles.cardDark} flex items-center px-4 gap-3 relative`}>
                <div className="absolute top-0 right-0 w-24 h-full bg-gradient-to-l from-white/10 to-transparent" />
                <div className="h-8 w-8 bg-white rounded-lg p-1 shrink-0 z-10">
                    {config?.logo ? <img src={config.logo} alt="" className="w-full h-full object-contain" /> : <div className={`w-full h-full ${styles.cardPrimary} rounded-sm`} />}
                </div>
                <div className="z-10">
                    <p className="text-[10px] font-black text-white leading-none uppercase tracking-tighter">St. Thomas Secondary</p>
                    <p className="text-[7px] font-bold text-white/50 uppercase tracking-[0.2em] leading-tight">Identity & Resource Access</p>
                </div>
            </div>
            <div className="flex-1 flex p-4 gap-4 bg-white">
                <div className="w-20 h-24 bg-slate-100 rounded-lg border-2 border-slate-200 flex flex-col items-center justify-center relative overflow-hidden shrink-0 shadow-inner">
                    {patron.photo_url ? <img src={patron.photo_url} alt="" className="w-full h-full object-cover" /> : <User className="h-12 w-12 text-slate-300" />}
                    <div className="absolute bottom-0 w-full bg-slate-200/80 py-1 text-center">
                        <span className="text-[6px] font-black text-slate-500 uppercase">Verified</span>
                    </div>
                </div>
                <div className="flex-1 flex flex-col justify-between overflow-hidden">
                    <div>
                        <p className={`text-[6px] font-black ${styles.navAccent} uppercase tracking-widest mb-0.5`}>Official Patron</p>
                        <h4 className="text-sm font-black text-slate-800 leading-tight uppercase truncate">{patron.full_name}</h4>
                        <div className="mt-2 flex items-center gap-2">
                            <span className={`px-1.5 py-0.5 ${styles.cardDark} text-white text-[7px] font-black rounded uppercase tracking-tighter`}>{patron.patron_group}</span>
                            <div className="flex items-center gap-1 text-[7px] font-bold text-emerald-600"><ShieldCheck className="h-2 w-2" /> ACTIVE</div>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <BarcodeMock code={patron.student_id} />
                        <p className="text-[8px] font-mono font-bold text-slate-800 tracking-[0.3em]">{patron.student_id}</p>
                    </div>
                </div>
            </div>
        </div>
    );
  }

  // MODERN TEMPLATE
  if (template === 'MODERN') {
    return (
        <div className={`w-[324px] h-[204px] ${styles.cardDark} rounded-[20px] shadow-2xl overflow-hidden relative flex flex-col font-sans select-none text-white`}>
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl -mr-24 -mt-24"></div>
            <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                    <div className="h-10 w-10 bg-white/10 backdrop-blur-md rounded-xl p-1.5 border border-white/10">
                        {config?.logo ? <img src={config.logo} alt="" className="w-full h-full object-contain" /> : <Library className="h-full w-full text-white" />}
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-tighter leading-none">Thomian</p>
                        <p className="text-[7px] font-bold opacity-40 uppercase tracking-widest">Library</p>
                    </div>
                </div>
                <div className="flex gap-4 items-center mb-auto">
                    <div className="w-16 h-16 rounded-2xl border-2 border-white/20 overflow-hidden shadow-2xl shrink-0">
                        {patron.photo_url ? <img src={patron.photo_url} alt="" className="w-full h-full object-cover" /> : <User className="h-8 w-8 m-auto mt-4 opacity-50" />}
                    </div>
                    <div className="overflow-hidden">
                        <h4 className="text-lg font-black leading-tight uppercase truncate">{patron.full_name.split(' ')[0]}</h4>
                        <p className="text-[8px] font-black opacity-60 uppercase tracking-[0.2em]">{patron.patron_group} • {patron.class_name || 'STAFF'}</p>
                    </div>
                </div>
                <div className="mt-4 bg-white/5 rounded-xl p-3 border border-white/10 flex items-center justify-between">
                    <div className="shrink-0"><BarcodeMock code={patron.student_id} isDark /></div>
                    <div className="text-right">
                        <p className="text-[10px] font-mono font-bold tracking-widest">{patron.student_id}</p>
                        <p className="text-[6px] font-black opacity-30 uppercase">Scan to Issue</p>
                    </div>
                </div>
            </div>
        </div>
    );
  }

  // MINIMAL TEMPLATE
  return (
    <div className="w-[324px] h-[204px] bg-white rounded-lg shadow-xl overflow-hidden relative border-2 border-slate-100 flex font-sans select-none">
        <div className={`w-3 ${styles.cardPrimary}`}></div>
        <div className="flex-1 p-6 flex flex-col">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h4 className="text-xl font-black text-slate-800 leading-none uppercase mb-1">{patron.full_name}</h4>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${styles.navAccent}`}>{patron.patron_group}</span>
                </div>
                <div className="h-10 w-10 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
                    {config?.logo ? <img src={config.logo} alt="" className="h-6 w-6 object-contain" /> : <Library className="h-5 w-5 text-slate-300" />}
                </div>
            </div>
            <div className="mt-auto space-y-4">
                <div className="flex justify-center bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-inner">
                    <BarcodeMock code={patron.student_id} />
                </div>
                <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <span>St. Thomas LIS</span>
                    <span className="font-mono text-slate-900">{patron.student_id}</span>
                </div>
            </div>
        </div>
    </div>
  );
};

export default PatronCard;
