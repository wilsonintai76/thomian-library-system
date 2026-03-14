
import React, { useState, useEffect, useRef } from 'react';
import { Save, RefreshCw, Layers, Edit3, Move, Trash2, Plus, Info, Upload, Image as ImageIcon, Sparkles, Loader2, MapPinned, Layout, Building2, ChevronRight, Hash, Palette, Maximize2 } from 'lucide-react';
import { MapConfig, ShelfDefinition, MapLevel } from '../types';
import { mockGetMapConfig, mockSaveMapConfig, aiAnalyzeBlueprint } from '../services/api';
import { SYSTEM_THEME_CONFIG } from '../utils';
import WayfinderMap from './WayfinderMap';

interface MapCreatorProps {
    onRefreshConfig?: () => void;
}

const MapCreator: React.FC<MapCreatorProps> = ({ onRefreshConfig }) => {
    const [config, setConfig] = useState<MapConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [editMode, setEditMode] = useState<'SHELVES' | 'STATION'>('SHELVES');
    const [activeLevelId, setActiveLevelId] = useState<string>('');
    const [activeShelfId, setActiveShelfId] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);

    // Theme Sync
    const theme = config?.theme || 'EMERALD';
    const styles = SYSTEM_THEME_CONFIG[theme];
    const accentBg = styles.navAccent.replace('text-', 'bg-');
    const accentBorder = styles.navAccent.replace('text-', 'border-');

    useEffect(() => {
        mockGetMapConfig().then(data => {
            setConfig(data);
            if (data.levels.length > 0) setActiveLevelId(data.levels[0].id);
            setLoading(false);
        });
    }, []);

    const handleShelfUpdate = (id: string, updates: Partial<ShelfDefinition>) => {
        if (!config) return;
        setConfig({
            ...config,
            shelves: config.shelves.map(s => s.id === id ? { ...s, ...updates } : s)
        });
    };

    const handleMapClick = (x: number, y: number) => {
        if (!config || !activeLevelId) return;

        if (editMode === 'STATION') {
            setConfig({
                ...config,
                levels: config.levels.map(l => l.id === activeLevelId ? { ...l, stationX: x, stationY: y } : l)
            });
        } else if (activeShelfId) {
            const shelf = config.shelves.find(s => s.id === activeShelfId);
            if (shelf) {
                handleShelfUpdate(activeShelfId, { x: x - (shelf.width / 2), y: y - (shelf.height / 2) });
            }
        }
    };

    const addNewShelf = () => {
        if (!config || !activeLevelId) return;
        const newId = `shelf_${Date.now()}`;
        const newShelf: ShelfDefinition = {
            id: newId,
            label: `Shelf ${config.shelves.filter(s => s.levelId === activeLevelId).length + 1}`,
            description: 'New Zone',
            minDDC: 0,
            maxDDC: 999,
            x: 450,
            y: 250,
            width: 100,
            height: 100,
            levelId: activeLevelId
        };
        setConfig({ ...config, shelves: [...config.shelves, newShelf] });
        setActiveShelfId(newId);
    };

    const deleteShelf = (id: string) => {
        if (!config) return;
        setConfig({ ...config, shelves: config.shelves.filter(s => s.id !== id) });
        if (activeShelfId === id) setActiveShelfId(null);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && config && activeLevelId) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setConfig({
                    ...config,
                    levels: config.levels.map(l => l.id === activeLevelId ? { ...l, customBackground: reader.result as string } : l)
                });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && config) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setConfig({ ...config, logo: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAiScan = async () => {
        const level = config?.levels.find(l => l.id === activeLevelId);
        if (!level?.customBackground || !config) return;
        setIsAnalyzing(true);
        try {
            const detectedShelves = await aiAnalyzeBlueprint(level.customBackground, level.id);
            const otherLevelsShelves = config.shelves.filter(s => s.levelId !== level.id);
            setConfig({ ...config, shelves: [...otherLevelsShelves, ...detectedShelves] });
            if (detectedShelves.length > 0) setActiveShelfId(detectedShelves[0].id);
        } catch (err: any) {
            if (err.message === "QUOTA_EXHAUSTED") {
                alert("AI Token Limit Reached: The free daily quota for Google Gemini has been exhausted.");
            } else {
                alert("AI Vision failed to identify zones.");
            }
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const refreshed = await mockGetMapConfig();
            setConfig(refreshed);
            // Verify if active shelf still exists to prevent "moved or deleted" visual error
            if (activeShelfId && !refreshed.shelves.some(s => s.id === activeShelfId)) {
                setActiveShelfId(null);
            }
            // Bridge back to main app for reactive theme/logo updates
            if (onRefreshConfig) onRefreshConfig();
        } finally {
            setIsSyncing(false);
        }
    };

    const addNewLevel = () => {
        if (!config) return;
        const newLvlId = `lvl_${Date.now()}`;
        const newLevel: MapLevel = { id: newLvlId, name: `Room ${config.levels.length + 1}`, stationX: 500, stationY: 550 };
        setConfig({ ...config, levels: [...config.levels, newLevel] });
        setActiveLevelId(newLvlId);
    };

    const deleteLevel = (id: string) => {
        if (!config || config.levels.length <= 1) return;
        if (confirm(`Delete level and all its shelf definitions?`)) {
            setConfig({
                ...config,
                levels: config.levels.filter(l => l.id !== id),
                shelves: config.shelves.filter(s => s.levelId !== id)
            });
            setActiveLevelId(config.levels.find(l => l.id !== id)?.id || '');
        }
    };

    const handleSave = async () => {
        if (!config) return;
        setSaving(true);
        await mockSaveMapConfig(config);
        setSaving(false);
        if (onRefreshConfig) onRefreshConfig();
        alert("Map layout and branding synchronized successfully.");
    };

    const currentLevel = config?.levels.find(l => l.id === activeLevelId);
    const activeShelf = config?.shelves.find(s => s.id === activeShelfId);
    const levelShelves = config?.shelves.filter(s => s.levelId === activeLevelId) || [];

    if (loading || !config) return <div className="p-20 text-center animate-pulse">Initializing Mapping Engine...</div>;

    return (
        <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8 animate-fade-in-up">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div>
                    <h2 className={`text-3xl font-black ${styles.headingText} flex items-center gap-3 tracking-tighter uppercase`}>
                        <Building2 className={`h-8 w-8 ${styles.navAccent}`} /> Multi-Floor Wayfinder Setup
                    </h2>
                    <p className={`${styles.bodyText} font-medium`}>Configure kiosks, shelves, and rooms across the library building.</p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="bg-white border-2 border-slate-200 text-slate-700 px-6 py-3 rounded-2xl font-black text-sm hover:bg-slate-50 transition-all flex items-center gap-3 shadow-sm"
                    >
                        <RefreshCw className={`h-5 w-5 ${isSyncing ? 'animate-spin' : ''}`} /> Sync Shelf Data
                    </button>
                    <button
                        onClick={addNewLevel}
                        className="bg-white border-2 border-slate-200 text-slate-700 px-6 py-3 rounded-2xl font-black text-sm hover:bg-slate-50 transition-all flex items-center gap-3 shadow-sm"
                    >
                        <Plus className="h-5 w-5" /> New Room
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={`${accentBg} text-white px-8 py-3.5 rounded-2xl font-black text-sm shadow-xl hover:opacity-90 flex items-center gap-3 transition-all active:scale-95`}
                    >
                        {saving ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />} Save Map
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-3 space-y-6 flex flex-col h-[750px]">
                    <div className="bg-white border border-slate-200 p-6 rounded-3xl space-y-4 shadow-sm shrink-0">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Palette className={`h-4 w-4 ${styles.navAccent}`} /> Library Branding
                            </h3>
                            <button
                                onClick={() => logoInputRef.current?.click()}
                                className={`p-1.5 ${styles.navAccent} hover:bg-slate-50 rounded-lg transition-colors`}
                            >
                                <Upload className="h-4 w-4" />
                            </button>
                        </div>

                        <input type="file" ref={logoInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />

                        <div className="aspect-video bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden relative group">
                            {config.logo ? (
                                <img src={config.logo} alt="Logo" className="w-full h-full object-contain p-4" />
                            ) : (
                                <div className="text-center text-slate-300">
                                    <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <span className="text-[10px] font-black uppercase">No Logo</span>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" onClick={() => logoInputRef.current?.click()}>
                                <span className="text-[10px] font-black text-white uppercase tracking-widest">Update Logo</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3 shrink-0">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Library Levels</h3>
                        <div className="flex flex-col gap-2">
                            {config.levels.map(level => (
                                <div
                                    key={level.id}
                                    onClick={() => { setActiveLevelId(level.id); setActiveShelfId(null); }}
                                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${activeLevelId === level.id ? `${accentBg} ${accentBorder} text-white shadow-lg` : 'bg-white border-slate-200 hover:border-slate-300'}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${activeLevelId === level.id ? 'bg-white/20' : 'bg-slate-100'}`}>
                                            <Layout className="h-5 w-5" />
                                        </div>
                                        <span className="font-black text-sm">{level.name}</span>
                                    </div>
                                    {activeLevelId === level.id && config.levels.length > 1 && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); deleteLevel(level.id); }}
                                            className="p-2 hover:bg-black/10 rounded-lg text-white/50 hover:text-white transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-100 p-1.5 rounded-3xl grid grid-cols-2 gap-2 shrink-0">
                        <button
                            onClick={() => setEditMode('SHELVES')}
                            className={`py-3 rounded-2xl font-black text-xs uppercase transition-all flex items-center justify-center gap-2 ${editMode === 'SHELVES' ? `bg-white ${styles.navAccent} shadow-md` : 'text-slate-400'}`}
                        >
                            <Layers className="h-4 w-4" /> Edit Zones
                        </button>
                        <button
                            onClick={() => setEditMode('STATION')}
                            className={`py-3 rounded-2xl font-black text-xs uppercase transition-all flex items-center justify-center gap-2 ${editMode === 'STATION' ? 'bg-white text-rose-600 shadow-md' : 'text-slate-400'}`}
                        >
                            <MapPinned className="h-4 w-4" /> Set Kiosk
                        </button>
                    </div>

                    {editMode === 'SHELVES' && (
                        <div className="flex-1 flex flex-col min-h-0">
                            <div className="flex items-center justify-between px-2 mb-3">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Floor Zones ({levelShelves.length})</h3>
                                <button
                                    onClick={addNewShelf}
                                    className={`p-1.5 ${styles.navAccent.replace('text-', 'bg-').replace('600', '50')} ${styles.navAccent} rounded-lg hover:opacity-80 transition-colors`}
                                >
                                    <Plus className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-thin">
                                {levelShelves.map(shelf => (
                                    <div
                                        key={shelf.id}
                                        onClick={() => setActiveShelfId(shelf.id)}
                                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${activeShelfId === shelf.id ? `bg-slate-900 text-white border-slate-900 shadow-lg` : 'bg-white border-slate-200 hover:border-slate-300'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${activeShelfId === shelf.id ? 'bg-white/10' : 'bg-slate-100 text-slate-400'}`}>
                                                {shelf.label.charAt(shelf.label.length - 1)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-xs">{shelf.label}</p>
                                                <p className="text-[9px] font-mono text-slate-400">DDC: {shelf.minDDC}-{shelf.maxDDC}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); deleteShelf(shelf.id); }}
                                            className="opacity-0 group-hover:opacity-100 p-1.5 text-red-400 hover:text-red-500 rounded-md transition-all"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="lg:col-span-9 flex flex-col gap-6">
                    <div className="bg-white p-2 rounded-[3rem] border-2 border-slate-200 shadow-2xl overflow-hidden relative group h-[650px]">
                        <WayfinderMap
                            activeLevelId={activeLevelId}
                            highlightShelf={activeShelfId}
                            configOverride={config}
                            onMapClick={handleMapClick}
                        />

                        {isAnalyzing && (
                            <div className="absolute inset-0 z-30 bg-blue-900/10 backdrop-blur-sm flex items-center justify-center">
                                <div className="bg-white/95 p-8 rounded-[2rem] shadow-2xl border border-blue-200 flex flex-col items-center">
                                    <Loader2 className={`h-12 w-12 ${styles.navAccent} animate-spin mb-4`} />
                                    <h3 className="text-lg font-black uppercase tracking-tight">AI Vision Engine</h3>
                                </div>
                            </div>
                        )}

                        <div className="absolute top-6 right-6 flex flex-col gap-2">
                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="bg-white/90 backdrop-blur border border-slate-200 text-slate-800 px-5 py-3 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl hover:bg-white transition-all"
                            >
                                <ImageIcon className={`h-4 w-4 ${styles.navAccent}`} /> Replace Blueprint
                            </button>
                            {currentLevel?.customBackground && (
                                <button
                                    onClick={handleAiScan}
                                    className="bg-slate-900 text-white px-5 py-3 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl hover:bg-slate-800 transition-all border border-slate-700"
                                >
                                    <Sparkles className="h-4 w-4 text-amber-400" /> AI Auto-Map
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm transition-all overflow-hidden">
                        {!activeShelf && editMode === 'SHELVES' ? (
                            <div className="flex flex-col items-center justify-center py-6 text-slate-400">
                                <Layers className="h-10 w-10 mb-2 opacity-10" />
                                <p className="text-sm font-bold uppercase tracking-widest">Select a zone to edit</p>
                            </div>
                        ) : editMode === 'STATION' ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                                <div>
                                    <h4 className="text-xl font-black text-slate-800 flex items-center gap-2 uppercase tracking-tight">
                                        <MapPinned className="h-5 w-5 text-red-600" /> Kiosk Location
                                    </h4>
                                    <p className="text-xs text-slate-500 font-medium italic">Define origin point for Wayfinding</p>
                                </div>
                                <div className="flex gap-4 col-span-2">
                                    <div className="flex-1">
                                        <label className={`block text-[10px] font-black ${styles.navAccent} uppercase tracking-widest mb-2`}>Coord X</label>
                                        <input readOnly value={currentLevel?.stationX} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-mono text-sm text-slate-600 outline-none" />
                                    </div>
                                    <div className="flex-1">
                                        <label className={`block text-[10px] font-black ${styles.navAccent} uppercase tracking-widest mb-2`}>Coord Y</label>
                                        <input readOnly value={currentLevel?.stationY} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-mono text-sm text-slate-600 outline-none" />
                                    </div>
                                </div>
                            </div>
                        ) : activeShelf ? (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 ${accentBg} text-white rounded-2xl shadow-lg`}>
                                            <Hash className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h3 className={`text-xl font-black ${styles.headingText} leading-tight uppercase`}>{activeShelf.label} Properties</h3>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reference: {activeLevelId}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => deleteShelf(activeShelf.id)} className="px-4 py-2 text-rose-600 text-[10px] font-black uppercase tracking-widest border border-rose-100 hover:bg-rose-50 rounded-xl transition-all">Delete Zone</button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <div className="md:col-span-2">
                                        <label className={`block text-[10px] font-black ${styles.navAccent} uppercase tracking-widest mb-2`}>Zone Label</label>
                                        <input type="text" value={activeShelf.label} onChange={(e) => handleShelfUpdate(activeShelf.id, { label: e.target.value })} className={`w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-black ${styles.headingText} outline-none focus:border-blue-400 transition-all`} />
                                    </div>
                                    <div>
                                        <label className={`block text-[10px] font-black ${styles.navAccent} uppercase tracking-widest mb-2`}>Start DDC</label>
                                        <input type="number" value={activeShelf.minDDC} onChange={(e) => handleShelfUpdate(activeShelf.id, { minDDC: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-mono text-sm outline-none focus:border-blue-400" />
                                    </div>
                                    <div>
                                        <label className={`block text-[10px] font-black ${styles.navAccent} uppercase tracking-widest mb-2`}>End DDC</label>
                                        <input type="number" value={activeShelf.maxDDC} onChange={(e) => handleShelfUpdate(activeShelf.id, { maxDDC: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-mono text-sm outline-none focus:border-blue-400" />
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MapCreator;
