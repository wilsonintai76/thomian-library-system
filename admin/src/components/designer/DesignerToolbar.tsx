import React from 'react';
import { 
    MousePointer2, DoorOpen, Library,
    Type, Undo2, Redo2, ZoomIn, ZoomOut, GripHorizontal
} from 'lucide-react';
import { useFloorPlanStore } from '../../lib/floorPlanStore';

// Custom architectural wall icon
const WallIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className}>
        <rect x="4" y="3" width="16" height="5" rx="0.5" />
        <rect x="4" y="9" width="16" height="5" rx="0.5" />
        <rect x="4" y="15" width="16" height="5" rx="0.5" />
    </svg>
);

// Custom window icon
const WindowIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className}>
        <rect x="3" y="5" width="18" height="14" rx="1" />
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="3" y1="12" x2="21" y2="12" />
    </svg>
);

interface DesignerToolbarProps {
    onAddElement?: (type: any) => void;
}

type DrawMode = 'SELECT' | 'WALL' | 'SHELF' | 'DOOR' | 'WINDOW' | 'TEXT';

const DesignerToolbar: React.FC<DesignerToolbarProps> = () => {
    const { 
        drawMode, setDrawMode,
        zoomLevel, setZoomLevel,
        wallThickness,
        // @ts-ignore - access temporal for undo/redo
        temporal
    } = useFloorPlanStore();
    
    const { undo, redo, pastStates, futureStates } = temporal?.getState?.() ?? { undo: () => {}, redo: () => {}, pastStates: [], futureStates: [] };

    const tools: { id: DrawMode; icon: any; label: string; hotkey?: string }[] = [
        { id: 'SELECT', icon: MousePointer2, label: 'Select', hotkey: 'V' },
        { id: 'WALL', icon: WallIcon, label: 'Draw Walls', hotkey: 'W' },
        { id: 'DOOR', icon: DoorOpen, label: 'Place Door', hotkey: 'D' },
        { id: 'WINDOW', icon: WindowIcon, label: 'Place Window', hotkey: 'E' },
        { id: 'SHELF', icon: Library, label: 'Shelf', hotkey: 'S' },
        { id: 'TEXT', icon: Type, label: 'Label', hotkey: 'T' },
    ];

    return (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-slate-900/90 backdrop-blur-xl p-2 rounded-2xl border border-white/10 shadow-2xl">
            {/* Drawing Tools */}
            <div className="flex items-center gap-1 border-r border-white/10 pr-2">
                {tools.map(tool => {
                    const isActive = drawMode === tool.id;
                    return (
                        <button
                            key={tool.id}
                            onClick={() => setDrawMode(tool.id)}
                            className={`p-2.5 rounded-xl transition-all group relative ${
                                isActive 
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' 
                                    : 'text-slate-400 hover:text-white hover:bg-white/10'
                            }`}
                            title={`${tool.label}${tool.hotkey ? ` (${tool.hotkey})` : ''}`}
                        >
                            <tool.icon className="h-5 w-5" />
                            <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                {tool.label}{tool.hotkey && ` (${tool.hotkey})`}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Wall Thickness (only shown in WALL mode) */}
            {drawMode === 'WALL' && (
                <div className="flex items-center gap-1.5 border-r border-white/10 pr-2">
                    <GripHorizontal className="h-4 w-4 text-slate-500" />
                    <input
                        type="range"
                        min="4"
                        max="30"
                        value={wallThickness}
                        onChange={(e) => {
                            const store = useFloorPlanStore.getState();
                            // @ts-ignore - setting wallThickness directly
                            useFloorPlanStore.setState({ wallThickness: parseInt(e.target.value) });
                        }}
                        className="w-16 h-1 accent-blue-500"
                        title={`Wall thickness: ${wallThickness}px`}
                    />
                    <span className="text-[10px] font-mono text-white/50 tabular-nums min-w-[2ch]">{wallThickness}</span>
                </div>
            )}

            {/* Undo/Redo */}
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

            {/* Zoom */}
            <div className="flex items-center gap-1">
                <button 
                    onClick={() => setZoomLevel(Math.max(0.1, zoomLevel - 0.1))}
                    className="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                >
                    <ZoomOut className="h-5 w-5" />
                </button>
                <span className="text-[10px] font-mono font-bold text-white/40 min-w-[3ch] text-center tabular-nums">
                    {Math.round(zoomLevel * 100)}%
                </span>
                <button 
                    onClick={() => setZoomLevel(Math.min(3, zoomLevel + 0.1))}
                    className="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                >
                    <ZoomIn className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
};

export default DesignerToolbar;
