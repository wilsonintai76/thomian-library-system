
import React, { useRef, useState, useEffect } from 'react';
import { Settings, Download, Upload, Trash2, AlertTriangle, ShieldAlert, Loader2, RefreshCw, Database, Lock, Unlock, CalendarRange, Palette, Check, IdCard, Layout, Sparkles, Info } from 'lucide-react';
import { exportSystemData, importSystemData, performFactoryReset, mockGetBooks, mockGetPatrons, mockGetTransactions, uploadToR2, mockGetMapConfig, mockSaveMapConfig } from '../services/api';
import { MapConfig, SystemTheme, PatronCardTemplate } from '../types';
import { SYSTEM_THEME_CONFIG } from '../utils';
import { DEFAULT_LOGO_URL } from '../constants';
import PatronCard from './PatronCard';

interface SystemSettingsProps {
    onRefreshConfig?: () => void;
}

const SystemSettings: React.FC<SystemSettingsProps> = ({ onRefreshConfig }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [resetConfirm, setResetConfirm] = useState('');
    const [showResetModal, setShowResetModal] = useState(false);
    const [stats, setStats] = useState({ books: 0, patrons: 0, txns: 0 });
    const [config, setConfig] = useState<MapConfig | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);
    const [logoSaving, setLogoSaving] = useState(false);

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !config) return;
        if (file.size > 2 * 1024 * 1024) { alert('Logo must be under 2 MB.'); return; }
        setLogoSaving(true);
        try {
            const publicUrl = await uploadToR2(file);
            if (!publicUrl) { alert('Logo upload failed. Please try again.'); return; }
            const updated = { ...config, logo: publicUrl };
            setConfig(updated);
            await mockSaveMapConfig(updated);
            onRefreshConfig?.();
        } catch (err: any) {
            alert('Upload error: ' + (err?.message || 'Unknown error'));
        } finally {
            setLogoSaving(false);
            e.target.value = '';
        }
    };

    const handleRemoveLogo = async () => {
        if (!config) return;
        setLogoSaving(true);
        const updated = { ...config, logo: undefined };
        setConfig(updated);
        await mockSaveMapConfig(updated);
        setLogoSaving(false);
        onRefreshConfig?.();
    };

    useEffect(() => {
        calculateStorageStats();
        mockGetMapConfig().then(setConfig);
    }, []);

    const calculateStorageStats = async () => {
        const books = await mockGetBooks();
        const patrons = await mockGetPatrons();
        const txns = await mockGetTransactions();
        setStats({ books: books.length, patrons: patrons.length, txns: txns.length });
    };

    const toggleCirculationLock = async () => {
        if (!config) return;
        const updated = { ...config, circulationLocked: !config.circulationLocked };
        setConfig(updated);
        await mockSaveMapConfig(updated);
        if (onRefreshConfig) onRefreshConfig();
    };

    const handleThemeChange = async (newTheme: SystemTheme) => {
        if (!config) return;
        const updated = { ...config, theme: newTheme };
        setConfig(updated);
        await mockSaveMapConfig(updated);
        // Reactive update instead of full reload
        if (onRefreshConfig) onRefreshConfig();
    };

    const handleTemplateChange = async (newTemplate: PatronCardTemplate) => {
        if (!config) return;
        const updated = { ...config, cardTemplate: newTemplate };
        setConfig(updated);
        await mockSaveMapConfig(updated);
        if (onRefreshConfig) onRefreshConfig();
    };

    const handleBackup = async () => {
        setIsProcessing(true);
        try {
            const jsonStr = await exportSystemData();
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `thomian_backup_${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (e) {
            alert("Export failed.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!confirm("WARNING: All data will be OVERWRITTEN. Continue?")) return;
        setIsProcessing(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const success = await importSystemData(event.target?.result as string);
                if (success) {
                    if (onRefreshConfig) onRefreshConfig();
                    alert("Restore Complete.");
                } else { alert("Invalid format."); }
            } finally { setIsProcessing(false); }
        };
        reader.readAsText(file);
    };

    const handleFactoryReset = async () => {
        if (resetConfirm !== 'DELETE') return;
        setIsProcessing(true);
        localStorage.clear();
        sessionStorage.clear();
        await performFactoryReset();
        window.location.reload();
    };

    const themeOptions: { id: SystemTheme, label: string }[] = [
        { id: 'EMERALD', label: 'Thomian Emerald' },
        { id: 'PURPLE', label: 'Royal Purple' },
        { id: 'SKY', label: 'Atmosphere Sky' },
        { id: 'MIDNIGHT', label: 'Midnight Studio' },
        { id: 'WHITE', label: 'Clean Studio' },
    ];

    const templateOptions: { id: PatronCardTemplate, label: string, desc: string }[] = [
        { id: 'TRADITIONAL', label: 'Traditional', desc: 'Academic layout' },
        { id: 'MODERN', label: 'Modern Sleek', desc: 'Edge-to-edge gradients' },
        { id: 'MINIMAL', label: 'Minimal', desc: 'Focused scan area' },
    ];

    const previewPatron = {
        student_id: 'ST-2024-DEMO',
        full_name: 'ALEXANDER THOMIAN',
        patron_group: 'STUDENT' as const,
        class_name: 'Grade 12-A',
        is_blocked: false,
        fines: 0
    };

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-12 animate-fade-in-up pb-32">
            <div className="flex items-center gap-4 border-b border-slate-200 pb-8">
                <div className="bg-slate-900 p-4 rounded-[1.5rem]">
                    <Settings className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1">
                    <h2 className="text-4xl font-black tracking-tight uppercase">System Management</h2>
                    <p className="text-slate-500 font-medium">Branding, text palettes, and lifecycle protocols.</p>
                </div>
                <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-xl border border-slate-200">
                    <Info className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">v{__APP_VERSION__}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-7 space-y-8">
                    <section className="space-y-6">
                        <div className="flex items-center gap-3">
                            <Palette className="h-6 w-6 text-sky-600" />
                            <h3 className="text-xl font-bold">Visual Branding & Themes</h3>
                        </div>
                        {/* Logo Upload */}
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-5">School Logo</p>
                            <div className="flex items-center gap-6">
                                <div className="h-24 w-24 rounded-2xl border-2 border-slate-100 bg-slate-50 flex items-center justify-center shrink-0 overflow-hidden">
                                    <img 
                                        src={config?.logo || DEFAULT_LOGO_URL} 
                                        alt="Logo" 
                                        className="h-full w-full object-contain p-1" 
                                    />
                                </div>
                                <div className="flex-1 space-y-3">
                                    <p className="text-xs text-slate-500 font-medium">Appears in the navbar, member cards, and book labels. PNG/SVG recommended, max 2 MB.</p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => logoInputRef.current?.click()}
                                            disabled={logoSaving}
                                            className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-sky-700 transition-all disabled:opacity-50"
                                        >{logoSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Upload</button>
                                        {config?.logo && (
                                            <button
                                                onClick={handleRemoveLogo}
                                                disabled={logoSaving}
                                                className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-100 transition-all disabled:opacity-50"
                                            ><Trash2 className="h-3.5 w-3.5" /> Remove</button>
                                        )}
                                    </div>
                                    <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Select UI Palette & Text Pairings</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {themeOptions.map((theme) => {
                                    const tStyles = SYSTEM_THEME_CONFIG[theme.id];
                                    return (
                                        <button
                                            key={theme.id}
                                            onClick={() => handleThemeChange(theme.id)}
                                            className={`group relative p-4 rounded-2xl border-2 transition-all flex items-center gap-4 text-left ${config?.theme === theme.id ? 'border-sky-500 bg-sky-50 ring-4 ring-sky-100' : 'border-slate-100 hover:border-slate-300 bg-white'}`}
                                        >
                                            <div className={`h-12 w-12 rounded-xl ${tStyles.cardPrimary} shadow-lg flex items-center justify-center shrink-0`}>
                                                {config?.theme === theme.id && <Check className="h-6 w-6 text-white" />}
                                            </div>
                                            <div>
                                                <span className="text-[11px] font-black uppercase tracking-widest text-slate-800 block">{theme.label}</span>
                                                <div className="flex gap-1 mt-1">
                                                    <div className={`w-3 h-1 rounded-full ${tStyles.cardPrimary}`}></div>
                                                    <div className={`w-3 h-1 rounded-full ${tStyles.navAccent.replace('text-', 'bg-')}`}></div>
                                                    <div className={`w-3 h-1 rounded-full ${tStyles.navBrand.replace('text-', 'bg-')}`}></div>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </section>

                    <section className="space-y-6">
                        <div className="flex items-center gap-3">
                            <IdCard className="h-6 w-6 text-emerald-600" />
                            <h3 className="text-xl font-bold">Member Card Templates</h3>
                        </div>
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {templateOptions.map((opt) => (
                                    <button
                                        key={opt.id}
                                        onClick={() => handleTemplateChange(opt.id)}
                                        className={`p-5 rounded-2xl border-2 text-left transition-all group ${config?.cardTemplate === opt.id ? 'border-emerald-500 bg-emerald-50 ring-4 ring-emerald-100' : 'border-slate-100 hover:border-slate-300 bg-white'}`}
                                    >
                                        <Layout className={`h-5 w-5 mb-3 ${config?.cardTemplate === opt.id ? 'text-emerald-600' : 'text-slate-400'}`} />
                                        <p className="text-xs font-black uppercase mb-1">{opt.label}</p>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase leading-tight">{opt.desc}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </section>
                </div>

                <div className="lg:col-span-5">
                    <div className="sticky top-24 space-y-6">
                        <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
                            <div className="relative z-10 flex flex-col items-center">
                                <h4 className="text-[10px] font-black text-sky-400 uppercase tracking-widest mb-8 text-center">Live Identity Card Preview</h4>
                                <div className="scale-110 md:scale-125 my-8">
                                    <PatronCard patron={previewPatron as any} config={config} />
                                </div>
                                <div className="mt-8 flex items-center gap-3 bg-white/5 px-6 py-3 rounded-full border border-white/10">
                                    <Sparkles className="h-4 w-4 text-amber-400" />
                                    <span className="text-[9px] font-black uppercase tracking-widest">Aesthetic Sync Active</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <ShieldAlert className="h-6 w-6 text-rose-600" />
                    <h3 className="text-xl font-bold">Security & Lifecycle</h3>
                </div>
                <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Auto-Logout (Admin Inactivity)</label>
                            <div className="flex items-center gap-4">
                                <select 
                                    value={config?.idleTimeout || 60} 
                                    onChange={async (e) => {
                                        if (!config) return;
                                        const val = parseInt(e.target.value);
                                        const updated = { ...config, idleTimeout: val };
                                        setConfig(updated);
                                        await mockSaveMapConfig(updated);
                                        onRefreshConfig?.();
                                    }}
                                    className="flex-1 px-4 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm focus:border-rose-500 outline-none"
                                >
                                    <option value={5}>5 Minutes</option>
                                    <option value={15}>15 Minutes</option>
                                    <option value={30}>30 Minutes</option>
                                    <option value={60}>1 Hour</option>
                                    <option value={120}>2 Hours</option>
                                    <option value={480}>8 Hours</option>
                                </select>
                            </div>
                            <p className="mt-3 text-[10px] text-slate-400 font-bold uppercase leading-tight">Redirects to Kiosk after period of inactivity.</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <CalendarRange className="h-6 w-6 text-indigo-600" />
                    <h3 className="text-xl font-bold">End-of-Year Processing</h3>
                </div>
                <div className={`bg-white p-10 rounded-[2.5rem] border-2 transition-all ${config?.circulationLocked ? 'border-rose-200 bg-rose-50/30' : 'border-slate-200'}`}>
                    <div className="flex flex-col md:flex-row items-center justify-between gap-10">
                        <div className="max-w-2xl">
                            <div className="flex items-center gap-3 mb-4">
                                <h4 className="text-2xl font-black uppercase tracking-tight">Global Circulation Lock</h4>
                                {config?.circulationLocked ? (
                                    <span className="bg-rose-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> Locked</span>
                                ) : (
                                    <span className="bg-emerald-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5"><Unlock className="h-3.5 w-3.5" /> Active</span>
                                )}
                            </div>
                            <p className="leading-relaxed font-medium">Disable all <strong>Check-Out</strong> functions system-wide during stocktake while allowing <strong>Returns</strong> to continue.</p>
                        </div>
                        <button onClick={toggleCirculationLock} className={`px-10 py-5 rounded-[1.5rem] font-black text-sm uppercase tracking-widest transition-all shadow-2xl flex items-center gap-3 active:scale-95 shrink-0 ${config?.circulationLocked ? 'bg-white border-2 border-rose-200 text-rose-600 hover:bg-rose-50' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>{config?.circulationLocked ? <><Unlock className="h-5 w-5" /> Resume</> : <><Lock className="h-5 w-5" /> Lock System</>}</button>
                    </div>
                </div>
            </section>

            <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <Database className="h-6 w-6 text-blue-600" />
                    <h3 className="text-xl font-bold">Configuration Backup</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 flex flex-col">
                        <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-[1.5rem] flex items-center justify-center shadow-inner mb-8"><Download className="h-8 w-8" /></div>
                        <h4 className="text-xl font-black uppercase tracking-tight mb-2">Export Configuration</h4>
                        <p className="text-sm text-slate-500 mb-8 leading-relaxed font-medium">Download system configuration (themes, map layout, rules) as a portable JSON backup.</p>
                        <button onClick={handleBackup} className="w-full py-5 rounded-2xl bg-blue-600 text-white font-black text-xs uppercase hover:bg-blue-700 transition-all flex items-center justify-center gap-3 shadow-2xl shadow-blue-100">Export Config</button>
                    </div>
                    <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 flex flex-col">
                        <div className="h-16 w-16 bg-emerald-50 text-emerald-600 rounded-[1.5rem] flex items-center justify-center shadow-inner mb-8"><Upload className="h-8 w-8" /></div>
                        <h4 className="text-xl font-black uppercase tracking-tight mb-2">Restore Backup</h4>
                        <p className="text-sm text-slate-500 mb-8 leading-relaxed font-medium">Restore a previously exported configuration backup file.</p>
                        <input type="file" ref={fileInputRef} onChange={handleRestore} accept=".json" className="hidden" />
                        <button onClick={() => fileInputRef.current?.click()} className="w-full py-5 rounded-2xl bg-white border-2 border-slate-100 text-slate-600 font-black text-xs uppercase hover:bg-slate-50 transition-all flex items-center justify-center gap-3">Select File</button>
                    </div>
                </div>
            </section>

            <section className="pt-10 border-t border-slate-200">
                <div className="bg-rose-50 rounded-[3rem] p-10 border-2 border-rose-100 flex flex-col md:flex-row items-center justify-between gap-10">
                    <div className="flex items-start gap-8">
                        <div className="p-5 bg-rose-200 text-rose-700 rounded-[1.5rem] shrink-0 shadow-lg"><AlertTriangle className="h-10 w-10" /></div>
                        <div>
                            <h4 className="text-2xl font-black text-rose-900 uppercase tracking-tight mb-2">Danger Zone</h4>
                            <p className="text-sm text-rose-700/80 font-medium max-w-xl leading-relaxed">Clears local session data and resets the application to defaults. You will be signed out.</p>
                        </div>
                    </div>
                    <button onClick={() => setShowResetModal(true)} className="px-10 py-5 bg-rose-600 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-2xl shadow-rose-200 hover:bg-rose-700 transition-all active:scale-95">Reset Session</button>
                </div>
            </section>

            {showResetModal && (
                <div className="fixed inset-0 z-[250] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white rounded-[3rem] w-full max-w-xl overflow-hidden shadow-2xl animate-shake">
                        <div className="bg-rose-600 p-8 text-white text-center"><AlertTriangle className="h-16 w-16 mx-auto mb-4" /><h3 className="text-3xl font-black uppercase tracking-tight">Confirm Reset</h3></div>
                        <div className="p-10 space-y-8">
                            <p className="text-center font-medium leading-relaxed">Type <span className="font-black text-slate-900 bg-slate-100 px-2 py-1 rounded">DELETE</span> to proceed.</p>
                            <input type="text" value={resetConfirm} onChange={(e) => setResetConfirm(e.target.value)} className="w-full text-center text-4xl font-black tracking-[0.2em] p-6 border-4 border-rose-100 rounded-3xl outline-none uppercase bg-rose-50/30 focus:border-rose-300 transition-all" autoFocus />
                            <div className="flex gap-4">
                                <button onClick={() => { setShowResetModal(false); setResetConfirm(''); }} className="flex-1 py-5 bg-slate-100 text-slate-500 font-black text-xs uppercase rounded-2xl hover:bg-slate-200 transition-all">Abort</button>
                                <button onClick={handleFactoryReset} disabled={resetConfirm !== 'DELETE'} className="flex-1 py-5 bg-rose-600 text-white font-black text-xs uppercase rounded-2xl hover:bg-rose-700 disabled:opacity-30 shadow-2xl transition-all">Confirm Wipe</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SystemSettings;
