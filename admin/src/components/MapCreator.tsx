
import React, { useState, useEffect, useRef } from 'react';
import { Save, RefreshCw, Plus, Building2, Layout, Trash2, MapPin, Bookmark } from 'lucide-react';
import { MapConfig, MapLevel, LibraryLocation } from '../types';
import { mockGetMapConfig, mockSaveMapConfig, mockGetLocations, mockAddLocation, mockDeleteLocation } from '../services/api';
import { SYSTEM_THEME_CONFIG } from '../utils';
import { useFloorPlanStore } from '../lib/floorPlanStore';
import FloorDesigner from './designer/FloorDesigner';

interface MapCreatorProps {
    onRefreshConfig?: () => void;
}

const MapCreator: React.FC<MapCreatorProps> = ({ onRefreshConfig }) => {
    const [config, setConfig] = useState<MapConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [locations, setLocations] = useState<LibraryLocation[]>([]);
    const [newLocName, setNewLocName] = useState('');

    const { 
        levels, setLevels, 
        activeLevelId, setActiveLevel,
        updateLevel
    } = useFloorPlanStore();

    // Theme Sync
    const theme = config?.theme || 'EMERALD';
    const styles = SYSTEM_THEME_CONFIG[theme];
    const accentBg = styles.navAccent.replace('text-', 'bg-');
    const accentBorder = styles.navAccent.replace('text-', 'border-');

    useEffect(() => {
        const init = async () => {
            const data = await mockGetMapConfig();
            setConfig(data);
            setLevels(data.levels);
            setLoading(false);
        };
        init();
        mockGetLocations().then(setLocations).catch(() => {});
    }, [setLevels]);

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const refreshed = await mockGetMapConfig();
            setConfig(refreshed);
            setLevels(refreshed.levels);
            if (onRefreshConfig) onRefreshConfig();
        } finally {
            setIsSyncing(false);
        }
    };

    const handleSave = async () => {
        if (!config) return;
        setSaving(true);
        try {
            const updatedConfig: MapConfig = {
                ...config,
                levels: levels,
                lastUpdated: new Date().toISOString()
            };
            await mockSaveMapConfig(updatedConfig);
            if (onRefreshConfig) onRefreshConfig();
            alert("Floor plan saved successfully.");
        } finally {
            setSaving(false);
        }
    };

    const addNewLevel = () => {
        const newLvlId = `lvl_${Date.now()}`;
        const newLevel: MapLevel = { 
            id: newLvlId, 
            name: `Room ${levels.length + 1}`, 
            stationX: 500, 
            stationY: 550, 
            layout: [] 
        };
        setLevels([...levels, newLevel]);
        setActiveLevel(newLvlId);
    };

    const deleteLevel = (id: string) => {
        if (levels.length <= 1) return;
        if (confirm(`Delete level and all its layout elements?`)) {
            const newLevels = levels.filter(l => l.id !== id);
            setLevels(newLevels);
            setActiveLevel(newLevels[0].id);
        }
    };

    if (loading || !config) return <div className="p-20 text-center animate-pulse text-slate-400 font-black uppercase tracking-widest">Initializing Mapping Engine...</div>;

    return (
        <div className="p-6 md:p-8 max-w-[1800px] mx-auto space-y-8 animate-fade-in-up">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div>
                    <h2 className={`text-4xl font-black ${styles.headingText} flex items-center gap-4 tracking-tighter uppercase`}>
                        <Building2 className={`h-10 w-10 ${styles.navAccent}`} /> Floor Plan Editor
                    </h2>
                    <p className={`${styles.bodyText} font-medium opacity-60`}>Design your library floor plan with walls, shelves, doors, and windows.</p>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="bg-white border-2 border-slate-200 text-slate-700 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-3 shadow-sm"
                    >
                        <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} /> Refresh
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={`${accentBg} text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-blue-900/20 hover:opacity-90 flex items-center gap-3 transition-all active:scale-95`}
                    >
                        {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Blueprints
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-3 space-y-6">
                    <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Room Inventory</h3>
                            <button onClick={addNewLevel} className="p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors">
                                <Plus className="h-4 w-4" />
                            </button>
                        </div>
                        
                        <div className="flex flex-col gap-3">
                            {levels.map(level => (
                                <div
                                    key={level.id}
                                    onClick={() => setActiveLevel(level.id)}
                                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${activeLevelId === level.id ? `${accentBg} ${accentBorder} text-white shadow-xl translate-x-2` : 'bg-slate-50 border-slate-100 hover:border-slate-300'}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${activeLevelId === level.id ? 'bg-white/20' : 'bg-white shadow-sm'}`}>
                                            <Layout className={`h-5 w-5 ${activeLevelId === level.id ? 'text-white' : 'text-slate-400'}`} />
                                        </div>
                                        <div>
                                            <span className="font-black text-xs block uppercase tracking-tight">{level.name}</span>
                                            <span className={`text-[8px] font-bold uppercase tracking-widest ${activeLevelId === level.id ? 'text-white/60' : 'text-slate-400'}`}>
                                                {level.layout?.length || 0} Entities
                                            </span>
                                        </div>
                                    </div>
                                    {activeLevelId === level.id && levels.length > 1 && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); deleteLevel(level.id); }}
                                            className="p-2 hover:bg-white/20 rounded-lg text-white/50 hover:text-white transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {activeLevelId && (
                            <div className="pt-6 border-t border-slate-100 space-y-4">
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Room Identifier</label>
                                    <input 
                                        type="text" 
                                        value={levels.find(l => l.id === activeLevelId)?.name || ''} 
                                        onChange={(e) => updateLevel(activeLevelId, { name: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-black outline-none focus:border-blue-400" 
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                                        <MapPin className="h-3 w-3 text-rose-400" /> Kiosk Station Position
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[8px] font-bold text-slate-400 mb-1 block">X (px)</label>
                                            <input 
                                                type="number" 
                                                value={levels.find(l => l.id === activeLevelId)?.stationX ?? 500} 
                                                onChange={(e) => updateLevel(activeLevelId, { stationX: parseInt(e.target.value) || 0 })}
                                                className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-mono outline-none focus:border-rose-400" 
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[8px] font-bold text-slate-400 mb-1 block">Y (px)</label>
                                            <input 
                                                type="number" 
                                                value={levels.find(l => l.id === activeLevelId)?.stationY ?? 550} 
                                                onChange={(e) => updateLevel(activeLevelId, { stationY: parseInt(e.target.value) || 0 })}
                                                className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-mono outline-none focus:border-rose-400" 
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[8px] text-slate-400 mt-2 font-medium">Where the "You Are Here" pin appears on the kiosk map</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Shelf Locations */}
                    <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-2">
                                <Bookmark className="h-3.5 w-3.5" /> Shelf Locations
                            </h3>
                        </div>
                        <p className="text-[8px] text-slate-400 font-medium">Locations used in cataloging &amp; wayfinding</p>
                        
                        {/* Add */}
                        <div className="flex gap-2">
                            <input type="text" value={newLocName} onChange={(e) => setNewLocName(e.target.value)}
                                placeholder="New location..."
                                className="flex-1 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-amber-400" />
                            <button
                                onClick={async () => {
                                    if (!newLocName.trim()) return;
                                    const loc = await mockAddLocation({ name: newLocName.trim(), level_id: activeLevelId || undefined });
                                    setLocations([...locations, loc]);
                                    setNewLocName('');
                                }}
                                className="p-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors">
                                <Plus className="h-4 w-4" />
                            </button>
                        </div>

                        {/* List */}
                        <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                            {locations.filter(l => !l.level_id || l.level_id === activeLevelId).map(loc => (
                                <div key={loc.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg group">
                                    <span className="text-[10px] font-bold text-slate-700 truncate">{loc.name}</span>
                                    <button
                                        onClick={async () => { await mockDeleteLocation(loc.id); setLocations(locations.filter(l => l.id !== loc.id)); }}
                                        className="p-1 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                                        <Trash2 className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                            {locations.filter(l => !l.level_id || l.level_id === activeLevelId).length === 0 && (
                                <p className="text-[9px] text-slate-400 text-center py-3">No locations for this room</p>
                            )}
                        </div>
                    </div>

                    <div className="bg-slate-900 rounded-[2rem] p-8 text-white space-y-6">
                        <div className="h-12 w-12 bg-white/10 rounded-2xl flex items-center justify-center">
                            <Layout className="h-6 w-6 text-blue-400" />
                        </div>
                        <div>
                            <h4 className="text-lg font-black tracking-tight mb-2">Editor Pro-Tips</h4>
                            <ul className="text-[10px] space-y-3 font-bold text-slate-400 uppercase tracking-wider">
                                <li className="flex items-start gap-3"><div className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-1 shrink-0"></div> Drag workspace to pan view</li>
                                <li className="flex items-start gap-3"><div className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-1 shrink-0"></div> Auto-snapping enabled (20px)</li>
                                <li className="flex items-start gap-3"><div className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-1 shrink-0"></div> Drag handles to resize &amp; rotate</li>
                                <li className="flex items-start gap-3"><div className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-1 shrink-0"></div> CMD/CTRL + Z to Undo</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-9">
                    <FloorDesigner />
                </div>
            </div>
        </div>
    );
};

export default MapCreator;
