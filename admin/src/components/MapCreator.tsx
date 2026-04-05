
import React, { useState, useEffect, useRef } from 'react';
import { Save, RefreshCw, Edit3, Trash2, Plus, Info, Layout, Building2, Palette, MapPinned, Hash } from 'lucide-react';
import { MapConfig, MapLevel, MapElement, MapElementType } from '../types';
import { mockGetMapConfig, mockSaveMapConfig } from '../services/api';
import { SYSTEM_THEME_CONFIG } from '../utils';

import WayfinderMap from './WayfinderMap';
import FloorDesignerTools from './layout/FloorDesignerTools';

interface MapCreatorProps {
    onRefreshConfig?: () => void;
}

const MapCreator: React.FC<MapCreatorProps> = ({ onRefreshConfig }) => {
    const [config, setConfig] = useState<MapConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [editMode, setEditMode] = useState<'LAYOUT' | 'STATION'>('LAYOUT');
    const [activeLevelId, setActiveLevelId] = useState<string>('');
    const [activeElementId, setActiveElementId] = useState<string | null>(null);
    const [selectedLayoutType, setSelectedLayoutType] = useState<MapElementType | 'SELECT'>('WALL');

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

    const handleLayoutUpdate = (levelId: string, elementId: string, updates: Partial<MapElement>) => {
        if (!config) return;
        setConfig({
            ...config,
            levels: config.levels.map(l => l.id === levelId ? {
                ...l,
                layout: (l.layout || []).map(el => el.id === elementId ? { ...el, ...updates } : el)
            } : l)
        });
    };

    const handleMapClick = (x: number, y: number) => {
        if (!config || !activeLevelId) return;

        if (editMode === 'STATION') {
            setConfig({
                ...config,
                levels: config.levels.map(l => l.id === activeLevelId ? { ...l, stationX: x, stationY: y } : l)
            });
        } else if (editMode === 'LAYOUT') {
            if (selectedLayoutType === 'SELECT') {
                const level = config.levels.find(l => l.id === activeLevelId);
                const clickedEl = level?.layout?.find(el => 
                    x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height
                );
                if (clickedEl) setActiveElementId(clickedEl.id);
                else setActiveElementId(null);
            } else {
                addLayoutElement(x, y);
            }
        }
    };

    const addLayoutElement = (x: number, y: number) => {
        if (!config || !activeLevelId || selectedLayoutType === 'SELECT') return;
        
        const newEl: MapElement = {
            id: `el_${Date.now()}`,
            type: selectedLayoutType,
            x: x - 25,
            y: y - 25,
            width: selectedLayoutType === 'WALL' ? 100 : 50,
            height: selectedLayoutType === 'WALL' ? 10 : 50,
            rotation: 0,
            label: selectedLayoutType === 'TEXT' ? 'New Label' : (selectedLayoutType === 'SHELF' ? 'New Shelf' : ''),
            minDDC: selectedLayoutType === 'SHELF' ? 0 : undefined,
            maxDDC: selectedLayoutType === 'SHELF' ? 999 : undefined
        };

        setConfig({
            ...config,
            levels: config.levels.map(l => l.id === activeLevelId ? {
                ...l,
                layout: [...(l.layout || []), newEl]
            } : l)
        });
        setActiveElementId(newEl.id);
        setSelectedLayoutType('SELECT');
    };

    const deleteLayoutElement = () => {
        if (!config || !activeLevelId || !activeElementId) return;
        setConfig({
            ...config,
            levels: config.levels.map(l => l.id === activeLevelId ? {
                ...l,
                layout: (l.layout || []).filter(el => el.id !== activeElementId)
            } : l)
        });
        setActiveElementId(null);
    };

    const rotateLayoutElement = () => {
        if (!config || !activeLevelId || !activeElementId) return;
        const level = config.levels.find(l => l.id === activeLevelId);
        const el = level?.layout?.find(e => e.id === activeElementId);
        if (el) {
            handleLayoutUpdate(activeLevelId, activeElementId, { rotation: ((el.rotation || 0) + 90) % 360 });
        }
    };

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const refreshed = await mockGetMapConfig();
            setConfig(refreshed);
            if (activeElementId && !refreshed.levels.some(l => l.layout?.some(e => e.id === activeElementId))) {
                setActiveElementId(null);
            }
            if (onRefreshConfig) onRefreshConfig();
        } finally {
            setIsSyncing(false);
        }
    };

    const addNewLevel = () => {
        if (!config) return;
        const newLvlId = `lvl_${Date.now()}`;
        const newLevel: MapLevel = { id: newLvlId, name: `Room ${config.levels.length + 1}`, stationX: 500, stationY: 550, layout: [] };
        setConfig({ ...config, levels: [...config.levels, newLevel] });
        setActiveLevelId(newLvlId);
    };

    const deleteLevel = (id: string) => {
        if (!config || config.levels.length <= 1) return;
        if (confirm(`Delete level and all its layout elements?`)) {
            setConfig({
                ...config,
                levels: config.levels.filter(l => l.id !== id)
            });
            setActiveLevelId(config.levels.find(l => l.id !== id)?.id || '');
        }
    };

    const generateBoundary = () => {
        if (!config || !activeLevelId) return;
        const level = config.levels.find(l => l.id === activeLevelId);
        if (!level || !level.roomWidth || !level.roomHeight) {
            alert("Please set room width and height first.");
            return;
        }

        if (level.layout?.some(el => el.type === 'WALL') && !confirm("This will replace existing walls. Continue?")) {
            return;
        }

        const w = level.roomWidth;
        const h = level.roomHeight;
        const thick = 10;
        const startX = (1000 - w) / 2;
        const startY = (600 - h) / 2;

        const newWalls: MapElement[] = [
            { id: `wall_t_${Date.now()}`, type: 'WALL', x: startX, y: startY, width: w, height: thick, rotation: 0 },
            { id: `wall_b_${Date.now()}`, type: 'WALL', x: startX, y: startY + h - thick, width: w, height: thick, rotation: 0 },
            { id: `wall_l_${Date.now()}`, type: 'WALL', x: startX, y: startY, width: thick, height: h, rotation: 0 },
            { id: `wall_r_${Date.now()}`, type: 'WALL', x: startX + w - thick, y: startY, width: thick, height: h, rotation: 0 },
        ];

        setConfig({
            ...config,
            levels: config.levels.map(l => l.id === activeLevelId ? {
                ...l,
                layout: [...(l.layout || []).filter(el => el.type !== 'WALL'), ...newWalls]
            } : l)
        });
    };

    const handleSave = async () => {
        if (!config) return;
        setSaving(true);
        await mockSaveMapConfig(config);
        setSaving(false);
        if (onRefreshConfig) onRefreshConfig();
        alert("Unified Blueprint synchronized successfully.");
    };

    const currentLevel = config?.levels.find(l => l.id === activeLevelId);
    const activeElement = currentLevel?.layout?.find(el => el.id === activeElementId);

    if (loading || !config) return <div className="p-20 text-center animate-pulse text-slate-400 font-black uppercase tracking-widest">Initializing Mapping Engine...</div>;

    return (
        <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8 animate-fade-in-up">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div>
                    <h2 className={`text-3xl font-black ${styles.headingText} flex items-center gap-3 tracking-tighter uppercase`}>
                        <Building2 className={`h-8 w-8 ${styles.navAccent}`} /> Unified Library Designer
                    </h2>
                    <p className={`${styles.bodyText} font-medium`}>Draft your physical layout and interactive book zones on a single blueprint.</p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="bg-white border-2 border-slate-200 text-slate-700 px-6 py-3 rounded-2xl font-black text-sm hover:bg-slate-50 transition-all flex items-center gap-3 shadow-sm"
                    >
                        <RefreshCw className={`h-5 w-5 ${isSyncing ? 'animate-spin' : ''}`} /> Refresh
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
                <div className="lg:col-span-3 space-y-6 flex flex-col">
                    <div className="space-y-3 shrink-0">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Library Levels</h3>
                        <div className="flex flex-col gap-2">
                            {config.levels.map(level => (
                                <div key={level.id} className="space-y-2">
                                    <div
                                        onClick={() => { setActiveLevelId(level.id); setActiveElementId(null); }}
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
                                    
                                    {activeLevelId === level.id && (
                                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 animate-fade-in">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Width (px)</label>
                                                    <input 
                                                        type="number" 
                                                        value={level.roomWidth || ''} 
                                                        onChange={(e) => setConfig({
                                                            ...config,
                                                            levels: config.levels.map(l => l.id === level.id ? { ...l, roomWidth: parseInt(e.target.value) || 0 } : l)
                                                        })}
                                                        placeholder="800"
                                                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none focus:border-blue-400" 
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Height (px)</label>
                                                    <input 
                                                        type="number" 
                                                        value={level.roomHeight || ''} 
                                                        onChange={(e) => setConfig({
                                                            ...config,
                                                            levels: config.levels.map(l => l.id === level.id ? { ...l, roomHeight: parseInt(e.target.value) || 0 } : l)
                                                        })}
                                                        placeholder="400"
                                                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none focus:border-blue-400" 
                                                    />
                                                </div>
                                            </div>
                                            <button 
                                                onClick={generateBoundary}
                                                className={`w-full py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${accentBg} text-white shadow-sm hover:opacity-90`}
                                            >
                                                Build Outer Walls
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-100 p-1.5 rounded-3xl grid grid-cols-2 gap-2">
                        <button
                            onClick={() => setEditMode('LAYOUT')}
                            className={`py-3 rounded-2xl font-black text-[10px] uppercase transition-all flex items-center justify-center gap-1.5 ${editMode === 'LAYOUT' ? `bg-white ${styles.navAccent} shadow-md` : 'text-slate-400'}`}
                        >
                            <Building2 className="h-3.5 w-3.5" /> Design Floor
                        </button>
                        <button
                            onClick={() => setEditMode('STATION')}
                            className={`py-3 rounded-2xl font-black text-[10px] uppercase transition-all flex items-center justify-center gap-1.5 ${editMode === 'STATION' ? 'bg-white text-rose-600 shadow-md' : 'text-slate-400'}`}
                        >
                            <MapPinned className="h-3.5 w-3.5" /> Set Kiosk
                        </button>
                    </div>
                </div>

                <div className="lg:col-span-9 flex flex-col gap-6">
                    {editMode === 'LAYOUT' && (
                        <div className="animate-fade-in-down">
                            <FloorDesignerTools 
                                selectedType={selectedLayoutType}
                                onSelectType={setSelectedLayoutType}
                                onDeleteElement={deleteLayoutElement}
                                onRotateElement={rotateLayoutElement}
                                hasSelection={!!activeElementId}
                                styles={styles}
                            />
                        </div>
                    )}

                    <div className="bg-white p-2 rounded-[3rem] border-2 border-slate-200 shadow-2xl overflow-hidden relative h-[650px]">
                        <WayfinderMap
                            activeLevelId={activeLevelId}
                            configOverride={config}
                            onMapClick={handleMapClick}
                        />
                    </div>

                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm transition-all overflow-hidden">
                        {editMode === 'STATION' ? (
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
                        ) : activeElement ? (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 ${accentBg} text-white rounded-2xl shadow-lg`}>
                                            <Edit3 className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h3 className={`text-xl font-black ${styles.headingText} leading-tight uppercase`}>{activeElement.type} Properties</h3>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">UID: {activeElement.id}</p>
                                        </div>
                                    </div>
                                    <button onClick={deleteLayoutElement} className="px-4 py-2 text-rose-600 text-[10px] font-black uppercase tracking-widest border border-rose-100 hover:bg-rose-50 rounded-xl transition-all">Remove Element</button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <div className="md:col-span-1">
                                        <label className={`block text-[10px] font-black ${styles.navAccent} uppercase tracking-widest mb-2`}>Type</label>
                                        <div className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-black text-xs text-slate-600 uppercase">{activeElement.type}</div>
                                    </div>
                                    <div className="md:col-span-3">
                                        <label className={`block text-[10px] font-black ${styles.navAccent} uppercase tracking-widest mb-2`}>Label / Shelf Name</label>
                                        <input type="text" value={activeElement.label || ''} onChange={(e) => handleLayoutUpdate(activeLevelId, activeElement.id, { label: e.target.value })} className={`w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-black ${styles.headingText} outline-none focus:border-blue-400 transition-all`} placeholder="e.g. Fiction A" />
                                    </div>
                                </div>
                                
                                {activeElement.type === 'SHELF' && (
                                    <div className="grid grid-cols-2 gap-6 bg-blue-50/50 p-6 rounded-3xl border border-blue-100">
                                        <div>
                                            <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                <Hash className="h-3.5 w-3.5" /> Start DDC
                                            </label>
                                            <input type="number" step="0.01" value={activeElement.minDDC || 0} onChange={(e) => handleLayoutUpdate(activeLevelId, activeElement.id, { minDDC: parseFloat(e.target.value) || 0 })} className="w-full bg-white border-2 border-blue-100 rounded-xl px-4 py-3 font-mono text-sm outline-none focus:border-blue-400 font-bold" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                <Hash className="h-3.5 w-3.5" /> End DDC
                                            </label>
                                            <input type="number" step="0.01" value={activeElement.maxDDC || 999} onChange={(e) => handleLayoutUpdate(activeLevelId, activeElement.id, { maxDDC: parseFloat(e.target.value) || 0 })} className="w-full bg-white border-2 border-blue-100 rounded-xl px-4 py-3 font-mono text-sm outline-none focus:border-blue-400 font-bold" />
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mt-4">
                                    <div>
                                        <label className={`block text-[10px] font-black ${styles.navAccent} uppercase tracking-widest mb-2`}>X Coord</label>
                                        <input type="number" value={Math.round(activeElement.x)} onChange={(e) => handleLayoutUpdate(activeLevelId, activeElement.id, { x: parseInt(e.target.value) || 0 })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-mono text-sm outline-none focus:border-blue-400" />
                                    </div>
                                    <div>
                                        <label className={`block text-[10px] font-black ${styles.navAccent} uppercase tracking-widest mb-2`}>Y Coord</label>
                                        <input type="number" value={Math.round(activeElement.y)} onChange={(e) => handleLayoutUpdate(activeLevelId, activeElement.id, { y: parseInt(e.target.value) || 0 })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-mono text-sm outline-none focus:border-blue-400" />
                                    </div>
                                    <div>
                                        <label className={`block text-[10px] font-black ${styles.navAccent} uppercase tracking-widest mb-2`}>Width</label>
                                        <input type="number" value={activeElement.width} onChange={(e) => handleLayoutUpdate(activeLevelId, activeElement.id, { width: parseInt(e.target.value) || 10 })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-mono text-sm outline-none focus:border-blue-400" />
                                    </div>
                                    <div>
                                        <label className={`block text-[10px] font-black ${styles.navAccent} uppercase tracking-widest mb-2`}>Height</label>
                                        <input type="number" value={activeElement.height} onChange={(e) => handleLayoutUpdate(activeLevelId, activeElement.id, { height: parseInt(e.target.value) || 10 })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-mono text-sm outline-none focus:border-blue-400" />
                                    </div>
                                    <div>
                                        <label className={`block text-[10px] font-black ${styles.navAccent} uppercase tracking-widest mb-2`}>Rot (deg)</label>
                                        <input type="number" value={activeElement.rotation || 0} onChange={(e) => handleLayoutUpdate(activeLevelId, activeElement.id, { rotation: parseInt(e.target.value) || 0 })} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-mono text-sm outline-none focus:border-blue-400" />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-6 text-slate-400">
                                <Info className="h-10 w-10 mb-2 opacity-10" />
                                <p className="text-sm font-bold uppercase tracking-widest">Select an element to edit properties</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MapCreator;
