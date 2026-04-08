import React from 'react';
import FloorDesigner2D from './FloorDesigner2D';
import FloorDesigner3D from './FloorDesigner3D';
import DesignerToolbar from './DesignerToolbar';
import DesignerSidebar from './DesignerSidebar';
import { useFloorPlanStore } from '../../lib/floorPlanStore';
import { MapElementType } from '../../types';

const FloorDesigner: React.FC = () => {
    const { is3DMode, activeLevelId, addElement } = useFloorPlanStore();

    const handleAddElement = (type: MapElementType) => {
        if (!activeLevelId) return;
        
        const newEl = {
            id: `el_${Date.now()}`,
            type,
            x: 400,
            y: 400,
            width: type === 'WALL' ? 200 : (type === 'TEXT' ? 100 : 80),
            height: type === 'WALL' ? 15 : (type === 'TEXT' ? 30 : 80),
            rotation: 0,
            label: type === 'SHELF' ? 'New Shelf' : (type === 'TEXT' ? 'Label' : ''),
            minDDC: type === 'SHELF' ? 0 : undefined,
            maxDDC: type === 'SHELF' ? 999 : undefined
        };
        
        addElement(activeLevelId, newEl as any);
    };

    return (
        <div className="relative w-full h-[750px] rounded-[3.5rem] overflow-hidden border-8 border-slate-950 shadow-2xl bg-slate-950">
            <div className="absolute inset-0 z-0">
                {is3DMode ? <FloorDesigner3D /> : <FloorDesigner2D />}
            </div>
            
            <DesignerToolbar onAddElement={handleAddElement} />
            
            {!is3DMode && <DesignerSidebar />}

            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 bg-slate-900/40 backdrop-blur-md px-6 py-2.5 rounded-2xl border border-white/5 pointer-events-none">
                <p className="text-[9px] font-black text-white/50 uppercase tracking-[0.3em] text-center">
                    Engage Pro-Mapping Engine &mdash; {is3DMode ? '3D Visualization Layer' : '2D Drafting Layer'}
                </p>
            </div>
        </div>
    );
};

export default FloorDesigner;
