import React from 'react';
import { useFloorPlanStore } from '../../lib/floorPlanStore';
import { X, Trash2, Edit3, Type, Hash, Move, Maximize, RotateCw } from 'lucide-react';

const DesignerSidebar: React.FC = () => {
    const { 
        activeLevelId, 
        selectedElementId, 
        setSelectedElement, 
        updateElement, 
        deleteElement,
        getSelectedElement 
    } = useFloorPlanStore();

    const element = getSelectedElement();

    if (!element || !activeLevelId) return null;

    const handleUpdate = (updates: any) => {
        updateElement(activeLevelId, element.id, updates);
    };

    return (
        <div className="absolute top-6 right-6 bottom-6 w-80 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-fade-in-right z-50">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-lg shadow-slate-200">
                        <Edit3 className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Properties</h3>
                        <p className="text-[9px] font-black text-slate-400 tracking-widest uppercase">{element.type}</p>
                    </div>
                </div>
                <button 
                    onClick={() => setSelectedElement(null)}
                    className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-400 hover:text-slate-900"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Identification */}
                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <Type className="h-3.5 w-3.5" /> Label
                        </label>
                        <input 
                            type="text" 
                            value={element.label || ''} 
                            onChange={(e) => handleUpdate({ label: e.target.value })}
                            placeholder="e.g. Science Section"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-400 transition-all"
                        />
                    </div>
                </div>

                {/* Transform */}
                <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-4">
                        <Move className="h-3.5 w-3.5" /> Position & Size
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[9px] font-bold text-slate-400 mb-1 block">X Position</label>
                            <input 
                                type="number" 
                                value={Math.round(element.x)} 
                                onChange={(e) => handleUpdate({ x: parseInt(e.target.value) || 0 })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono"
                            />
                        </div>
                        <div>
                            <label className="text-[9px] font-bold text-slate-400 mb-1 block">Y Position</label>
                            <input 
                                type="number" 
                                value={Math.round(element.y)} 
                                onChange={(e) => handleUpdate({ y: parseInt(e.target.value) || 0 })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono"
                            />
                        </div>
                        <div>
                            <label className="text-[9px] font-bold text-slate-400 mb-1 block">Width (px)</label>
                            <input 
                                type="number" 
                                value={Math.round(element.width)} 
                                onChange={(e) => handleUpdate({ width: parseInt(e.target.value) || 0 })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono"
                            />
                        </div>
                        <div>
                            <label className="text-[9px] font-bold text-slate-400 mb-1 block">Height (px)</label>
                            <input 
                                type="number" 
                                value={Math.round(element.height)} 
                                onChange={(e) => handleUpdate({ height: parseInt(e.target.value) || 0 })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono"
                            />
                        </div>
                    </div>
                </div>

                {/* Special Settings for Shelf */}
                {element.type === 'SHELF' && (
                    <div className="space-y-4 p-5 bg-blue-50/50 rounded-2xl border border-blue-100">
                        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                            <Hash className="h-3.5 w-3.5" /> Classification Range
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[9px] font-bold text-blue-400 mb-1 block">Min DDC</label>
                                <input 
                                    type="number" 
                                    step="0.01"
                                    value={element.minDDC || 0} 
                                    onChange={(e) => handleUpdate({ minDDC: parseFloat(e.target.value) || 0 })}
                                    className="w-full bg-white border border-blue-100 rounded-lg px-3 py-2 text-xs font-mono"
                                />
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-blue-400 mb-1 block">Max DDC</label>
                                <input 
                                    type="number" 
                                    step="0.01"
                                    value={element.maxDDC || 999} 
                                    onChange={(e) => handleUpdate({ maxDDC: parseFloat(e.target.value) || 0 })}
                                    className="w-full bg-white border border-blue-100 rounded-lg px-3 py-2 text-xs font-mono"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50">
                <button 
                    onClick={() => deleteElement(activeLevelId, element.id)}
                    className="w-full py-4 bg-white border-2 border-rose-100 text-rose-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                    <Trash2 className="h-4 w-4" /> Delete Element
                </button>
            </div>
        </div>
    );
};

export default DesignerSidebar;
