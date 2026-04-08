import React from 'react';
import { 
    MousePointer2, Square, Lamp, DoorOpen, 
    Box, Type, Undo2, Redo2, Layers, 
    BoxSelect, Box as BoxIcon, ZoomIn, ZoomOut 
} from 'lucide-react';
import { useFloorPlanStore } from '../../lib/floorPlanStore';
import { MapElementType } from '../../types';

interface DesignerToolbarProps {
    onAddElement: (type: MapElementType) => void;
}

const DesignerToolbar: React.FC<DesignerToolbarProps> = ({ onAddElement }) => {
    const { 
        is3DMode, set3DMode, 
        zoomLevel, setZoomLevel,
        // @ts-ignore - access temporal for undo/redo
        temporal
    } = useFloorPlanStore();
    
    const { undo, redo, pastStates, futureStates } = temporal.getState();

    const tools = [
        { id: 'SELECT', icon: MousePointer2, label: 'Select' },
        { id: 'WALL', icon: Square, label: 'Wall' },
        { id: 'SHELF', icon: Box, label: 'Shelf' },
        { id: 'DOOR', icon: DoorOpen, label: 'Door/Portal' },
        { id: 'TEXT', icon: Type, label: 'Label' },
    ];

    return (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-slate-900/90 backdrop-blur-xl p-2 rounded-2xl border border-white/10 shadow-2xl">
            <div className="flex items-center gap-1 border-r border-white/10 pr-2">
                {tools.map(tool => (
                    <button
                        key={tool.id}
                        onClick={() => tool.id !== 'SELECT' && onAddElement(tool.id as MapElementType)}
                        className="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all group relative"
                        title={tool.label}
                    >
                        <tool.icon className="h-5 w-5" />
                        <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            {tool.label}
                        </span>
                    </button>
                ))}
            </div>

            <div className="flex items-center gap-1 border-r border-white/10 pr-2">
                <button 
                    onClick={() => undo()} 
                    disabled={pastStates.length === 0}
                    className="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl disabled:opacity-20 transition-all"
                >
                    <Undo2 className="h-5 w-5" />
                </button>
                <button 
                    onClick={() => redo()} 
                    disabled={futureStates.length === 0}
                    className="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl disabled:opacity-20 transition-all"
                >
                    <Redo2 className="h-5 w-5" />
                </button>
            </div>

            <div className="flex items-center gap-1 border-r border-white/10 pr-2">
                <button 
                    onClick={() => setZoomLevel(Math.max(0.1, zoomLevel - 0.1))}
                    className="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                >
                    <ZoomOut className="h-5 w-5" />
                </button>
                <button 
                    onClick={() => setZoomLevel(Math.min(3, zoomLevel + 0.1))}
                    className="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                >
                    <ZoomIn className="h-5 w-5" />
                </button>
            </div>

            <button
                onClick={() => set3DMode(!is3DMode)}
                className={`flex items-center gap-3 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${is3DMode ? 'bg-blue-600 text-white shadow-lg' : 'bg-white/10 text-slate-300 hover:text-white hover:bg-white/20'}`}
            >
                {is3DMode ? <Layers className="h-4 w-4" /> : <BoxIcon className="h-4 w-4" />}
                {is3DMode ? 'View 2D Editor' : 'Visualize 3D'}
            </button>
        </div>
    );
};

export default DesignerToolbar;
