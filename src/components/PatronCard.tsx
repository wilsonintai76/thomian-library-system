
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

// Per-role card color overrides — dark header bg + accent color
const ROLE_COLORS: Record<string, { dark: string; accent: string }> = {
  STUDENT:       { dark: '#0c4a6e', accent: '#0ea5e9' }, // sky blue
  TEACHER:       { dark: '#064e3b', accent: '#10b981' }, // emerald green
  LIBRARIAN:     { dark: '#4c1d95', accent: '#8b5cf6' }, // violet purple
  ADMINISTRATOR: { dark: '#881337', accent: '#f43f5e' }, // crimson red
};
const getRoleColors = (group: string) => ROLE_COLORS[group] ?? { dark: '#1e293b', accent: '#64748b' };

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

const Code39Barcode: React.FC<{ code: string; dark?: boolean; height?: number; width?: number | string }> = ({ code, dark = false, height = 34, width = '100%' }) => {
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
    <svg viewBox={`0 0 ${totalW} ${height}`} width={width} height={height}
      preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', maxWidth: '100%' }}>
      {bars.map((b, i) => <rect key={i} x={b.x} y={0} width={b.w} height={height} fill={dark ? 'white' : 'black'} />)}
    </svg>
  );
};

const PatronCard: React.FC<PatronCardProps> = ({ patron, config }) => {
  const theme = config?.theme || 'EMERALD';
  const template = config?.cardTemplate || 'TRADITIONAL';
  const styles = SYSTEM_THEME_CONFIG[theme];
  const roleColors = getRoleColors(patron.patron_group);
  const nameSize = (name: string) => name.length > 22 ? 'text-[10px]' : name.length > 16 ? 'text-[11px]' : 'text-sm';

  // TRADITIONAL TEMPLATE
  // Card: 324×204px. Header: 48px. Body: 156px.
  // Body padding: 12px L/R, 8px T/B → usable body: 300×140px
  // Photo col: 68px. Gap: 12px. Text col: 300-68-12 = 220px.
  if (template === 'TRADITIONAL') {
    const displayName = patron.card_name || formatCardName(patron.full_name);
    const BODY_W = 300; // 324 - 12pad - 12pad
    const PHOTO_W = 68;
    const GAP = 12;
    const TEXT_W = BODY_W - PHOTO_W - GAP; // 220px
    return (
        <div style={{width:324, height:204, background:'white', borderRadius:12, overflow:'hidden', border:'1px solid #e2e8f0', display:'flex', flexDirection:'column', fontFamily:'sans-serif', userSelect:'none', boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
            {/* Header */}
                <div style={{height:48, flexShrink:0, background: roleColors.dark, display:'flex', alignItems:'center', padding:'0 16px', gap:12, overflow:'hidden', position:'relative'}}>
                <div style={{height:32, width:32, background:'white', borderRadius:8, padding:4, flexShrink:0, zIndex:1}}>
                    {config?.logo
                        ? <img src={config.logo} alt="" style={{width:'100%', height:'100%', objectFit:'contain'}} />
                        : <div style={{width:'100%', height:'100%', borderRadius:4, background:'#059669'}} />}
                </div>
                <div style={{overflow:'hidden', zIndex:1}}>
                    <p style={{fontSize:10, fontWeight:900, color:'white', lineHeight:1, textTransform:'uppercase', letterSpacing:'-0.02em', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:220}}>St. Thomas Secondary</p>
                    <p style={{fontSize:7, fontWeight:700, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.1em', lineHeight:1.4, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:220}}>Identity &amp; Resource Access</p>
                </div>
            </div>
            {/* Body */}
            <div style={{flex:1, overflow:'hidden', display:'flex', flexDirection:'column', padding:'8px 12px 8px 12px', gap:6, background:'white'}}>
                {/* Row 1: Photo + Info */}
                <div style={{display:'flex', alignItems:'flex-start', gap:GAP, overflow:'hidden'}}>
                    {/* Photo */}
                    <div style={{width:PHOTO_W, height:80, flexShrink:0, background:'#f1f5f9', borderRadius:6, border:'2px solid #e2e8f0', overflow:'hidden', position:'relative'}}>
                        {patron.photo_url
                            ? <img src={patron.photo_url} alt="" style={{position:'absolute', top:0, left:0, width:PHOTO_W, height:66, objectFit:'cover', display:'block'}} />
                            : <div style={{position:'absolute', top:0, left:0, width:PHOTO_W, height:66, display:'flex', alignItems:'center', justifyContent:'center'}}><User style={{width:32, height:32, color:'#cbd5e1'}} /></div>}
                        <div style={{position:'absolute', bottom:0, left:0, right:0, background:'rgba(226,232,240,0.9)', textAlign:'center', padding:'2px 0'}}>
                            <span style={{fontSize:5, fontWeight:900, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.1em'}}>Verified</span>
                        </div>
                    </div>
                    {/* Info column */}
                    <div style={{width:TEXT_W, overflow:'hidden'}}>
                        <p style={{fontSize:6, fontWeight:900, color: roleColors.accent, textTransform:'uppercase', letterSpacing:'0.15em', marginBottom:2, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis'}}>Official Patron</p>
                        <p style={{fontSize: displayName.length > 26 ? 9 : displayName.length > 20 ? 10 : displayName.length > 14 ? 12 : 14, fontWeight:900, color:'#1e293b', textTransform:'uppercase', lineHeight:1.2, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', wordBreak:'break-word'}}>
                            {displayName}
                        </p>
                        <div style={{marginTop:4, display:'flex', alignItems:'center', gap:4, overflow:'hidden'}}>
                            <span style={{flexShrink:0, padding:'1px 4px', background: roleColors.dark, color:'white', fontSize:6, fontWeight:900, borderRadius:3, textTransform:'uppercase'}}>
                                {patron.patron_group === 'ADMINISTRATOR' ? 'ADMIN' : patron.patron_group}
                            </span>
                            <span style={{flexShrink:0, display:'flex', alignItems:'center', gap:2, fontSize:6, fontWeight:700, color: roleColors.accent}}>
                                <ShieldCheck style={{width:8, height:8}} /> ACTIVE
                            </span>
                        </div>
                    </div>
                </div>
                {/* Row 2: Barcode — full width, never competes with name */}
                <div style={{width:'100%', overflow:'hidden'}}>
                    <Code39Barcode code={patron.student_id} height={24} width={BODY_W} />
                    <p style={{fontSize:7, fontFamily:'monospace', fontWeight:700, color:'#334155', marginTop:1, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis'}}>{patron.student_id}</p>
                </div>
            </div>
        </div>
    );
  }

  // MODERN TEMPLATE
  if (template === 'MODERN') {
    return (
        <div style={{background: roleColors.dark}} className="w-[324px] h-[204px] rounded-[20px] shadow-2xl overflow-hidden relative flex flex-col font-sans select-none text-white">
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
        <div style={{background: roleColors.dark, width:12, flexShrink:0}}></div>
        <div className="flex-1 p-6 flex flex-col">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h4 className={`${nameSize(patron.card_name || formatCardName(patron.full_name))} font-black text-slate-800 leading-tight uppercase line-clamp-2 mb-1`}>{patron.card_name || formatCardName(patron.full_name)}</h4>
                    <span style={{color: roleColors.accent}} className="text-[10px] font-black uppercase tracking-widest">{patron.patron_group}</span>
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
