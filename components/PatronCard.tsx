
import React from 'react';
import { ShieldCheck, User, Library } from 'lucide-react';
import { Patron, MapConfig } from '../types';
import { SYSTEM_THEME_CONFIG } from '../utils';

interface PatronCardProps {
    patron: Patron;
    config: MapConfig | null;
}

// Abbreviate middle names for ID cards: "GWENYTTA VENETIA BINTI POLOI" → "GWENYTTA V. B. POLOI"
const formatCardName = (name: string): string => {
    const parts = name.trim().split(/\s+/);
    if (parts.length <= 3) return name; // short enough, leave as-is
    const first = parts[0];
    const last = parts[parts.length - 1];
    const midInitials = parts.slice(1, -1).map(p => p[0] + '.').join(' ');
    return `${first} ${midInitials} ${last}`;
};

// ── Real Code 39 barcode — renders correctly in browser AND PDF print ──
const C39: Record<string, number[]> = {
  '*':[0,1,0,0,1,0,1,0,0],'0':[0,0,0,1,1,0,1,0,0],'1':[1,0,0,1,0,0,0,0,1],
  '2':[0,0,1,1,0,0,0,0,1],'3':[1,0,1,1,0,0,0,0,0],'4':[0,0,0,1,0,0,1,0,1],
  '5':[1,0,0,1,0,0,1,0,0],'6':[0,0,1,1,0,0,1,0,0],'7':[0,0,0,1,1,0,0,0,1],
  '8':[1,0,0,1,1,0,0,0,0],'9':[0,0,1,1,1,0,0,0,0],'A':[1,0,0,0,0,1,0,0,1],
  'B':[0,0,1,0,0,1,0,0,1],'C':[1,0,1,0,0,1,0,0,0],'D':[0,0,0,0,1,1,0,0,1],
  'E':[1,0,0,0,1,1,0,0,0],'F':[0,0,1,0,1,1,0,0,0],'G':[0,0,0,0,0,1,1,0,1],
  'H':[1,0,0,0,0,1,1,0,0],'I':[0,0,1,0,0,1,1,0,0],'J':[0,0,0,0,1,1,1,0,0],
  'K':[1,0,0,0,0,0,0,1,1],'L':[0,0,1,0,0,0,0,1,1],'M':[1,0,1,0,0,0,0,1,0],
  'N':[0,0,0,0,1,0,0,1,1],'O':[1,0,0,0,1,0,0,1,0],'P':[0,0,1,0,1,0,0,1,0],
  'Q':[0,0,0,0,0,0,1,1,1],'R':[1,0,0,0,0,0,1,1,0],'S':[0,0,1,0,0,0,1,1,0],
  'T':[0,0,0,0,1,0,1,1,0],'U':[1,1,0,0,0,0,0,0,1],'V':[0,1,1,0,0,0,0,0,1],
  'W':[1,1,1,0,0,0,0,0,0],'X':[0,1,0,0,1,0,0,0,1],'Y':[1,1,0,0,1,0,0,0,0],
  'Z':[0,1,1,0,1,0,0,0,0],'-':[0,1,0,0,0,0,1,0,1],'.':[1,1,0,0,0,0,1,0,0],
  ' ':[0,1,1,0,0,0,1,0,0],'$':[0,1,0,1,0,1,0,0,0],'/':[0,1,0,1,0,0,0,1,0],
  '+':[0,1,0,0,0,1,0,1,0],'%':[0,0,0,1,0,1,0,1,0],
};

const Code39Barcode: React.FC<{ code: string; dark?: boolean; height?: number }> = ({ code, dark = false, height = 34 }) => {
  const safe = code.toUpperCase().replace(/[^0-9A-Z\-\.\$\/\+\% ]/g, '');
  const chars = ('*' + safe + '*').split('');
  const segs: { w: number; bar: boolean }[] = [];
  chars.forEach((ch, ci) => {
    const pat = C39[ch]; if (!pat) return;
    pat.forEach((wide, i) => segs.push({ w: wide ? 3 : 1, bar: i % 2 === 0 }));
    if (ci < chars.length - 1) segs.push({ w: 1, bar: false });
  });
  const totalW = segs.reduce((s, g) => s + g.w, 0);
  const bars: { x: number; w: number }[] = [];
  let cx = 0;
  for (const seg of segs) { if (seg.bar) bars.push({ x: cx, w: seg.w }); cx += seg.w; }
  return (
    <svg viewBox={`0 0 ${totalW} ${height}`} width="100%" height={height}
      preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      {bars.map((b, i) => <rect key={i} x={b.x} y={0} width={b.w} height={height} fill={dark ? 'white' : 'black'} />)}
    </svg>
  );
};

const PatronCard: React.FC<PatronCardProps> = ({ patron, config }) => {
  const theme = config?.theme || 'EMERALD';
  const template = config?.cardTemplate || 'TRADITIONAL';
  const styles = SYSTEM_THEME_CONFIG[theme];
  const nameSize = (name: string) => name.length > 22 ? 'text-[10px]' : name.length > 16 ? 'text-[11px]' : 'text-sm';

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
                        <h4 className={`${nameSize(patron.card_name || formatCardName(patron.full_name))} font-black text-slate-800 leading-tight uppercase line-clamp-2`}>{patron.card_name || formatCardName(patron.full_name)}</h4>
                        <div className="mt-2 flex items-center gap-2">
                            <span className={`px-1.5 py-0.5 ${styles.cardDark} text-white text-[7px] font-black rounded uppercase tracking-tighter`}>{patron.patron_group}</span>
                            <div className="flex items-center gap-1 text-[7px] font-bold text-emerald-600"><ShieldCheck className="h-2 w-2" /> ACTIVE</div>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Code39Barcode code={patron.student_id} height={32} />
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
                        <h4 className={`${nameSize(patron.card_name || formatCardName(patron.full_name))} font-black leading-tight uppercase line-clamp-2`}>{patron.card_name || formatCardName(patron.full_name)}</h4>
                        <p className="text-[8px] font-black opacity-60 uppercase tracking-[0.2em]">{patron.patron_group} • {patron.class_name || 'STAFF'}</p>
                    </div>
                </div>
                <div className="mt-4 bg-white/5 rounded-xl p-3 border border-white/10 flex items-center justify-between">
                    <div className="w-24 shrink-0"><Code39Barcode code={patron.student_id} dark height={28} /></div>
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
                    <h4 className={`${nameSize(patron.card_name || formatCardName(patron.full_name))} font-black text-slate-800 leading-tight uppercase line-clamp-2 mb-1`}>{patron.card_name || formatCardName(patron.full_name)}</h4>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${styles.navAccent}`}>{patron.patron_group}</span>
                </div>
                <div className="h-10 w-10 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
                    {config?.logo ? <img src={config.logo} alt="" className="h-6 w-6 object-contain" /> : <Library className="h-5 w-5 text-slate-300" />}
                </div>
            </div>
            <div className="mt-auto space-y-4">
                <div className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 shadow-inner">
                    <Code39Barcode code={patron.student_id} height={32} />
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
