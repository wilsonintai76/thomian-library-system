
import React from 'react';
import { Square, Box, DoorOpen, Layout, Minus, Type, Scaling, RotateCcw, Trash2, Map, Layers } from 'lucide-react';
import { MapElementType } from '../../types';

interface FloorDesignerToolsProps {
    selectedType: MapElementType | 'SELECT';
    onSelectType: (type: MapElementType | 'SELECT') => void;
    onDeleteElement: () => void;
    onRotateElement: () => void;
    hasSelection: boolean;
    styles: any;
}

const FloorDesignerTools: React.FC<FloorDesignerToolsProps> = ({ 
    selectedType, 
    onSelectType, 
    onDeleteElement, 
    onRotateElement,
    hasSelection,
    styles 
}) => {
    const tools: { type: MapElementType | 'SELECT', icon: any, label: string }[] = [
        { type: 'SELECT', icon: Scaling, label: 'Select' },
        { type: 'WALL', icon: Square, label: 'Wall' },
        { type: 'PARTITION', icon: Minus, label: 'Partition' },
        { type: 'SHELF', icon: Layers, label: 'Book Shelf' },
        { type: 'COUNTER', icon: Layout, label: 'Counter' },
        { type: 'TABLE', icon: Box, label: 'Table' },
        { type: 'DOOR', icon: DoorOpen, label: 'Door' },
        { type: 'TEXT', icon: Type, label: 'Text Label' },
    ];

    return (
        <div className="flex flex-wrap gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-200">
            {tools.map((tool) => (
                <button
                    key={tool.type}
                    onClick={() => onSelectType(tool.type)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                        selectedType === tool.type 
                            ? `${styles.navAccent.replace('text-', 'bg-')} text-white shadow-lg shadow-blue-200` 
                            : 'bg-white text-slate-500 hover:bg-slate-100'
                    }`}
                >
                    <tool.icon className="h-4 w-4" />
                    {tool.label}
                </button>
            ))}

            <div className="w-px h-10 bg-slate-200 mx-2" />

            <button
                onClick={onRotateElement}
                disabled={!hasSelection}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-all"
            >
                <RotateCcw className="h-4 w-4" />
                Rotate 90°
            </button>

            <button
                onClick={onDeleteElement}
                disabled={!hasSelection}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest bg-rose-50 text-rose-600 hover:bg-rose-100 disabled:opacity-30 transition-all"
            >
                <Trash2 className="h-4 w-4" />
                Delete
            </button>
        </div>
    );
};

export default FloorDesignerTools;
