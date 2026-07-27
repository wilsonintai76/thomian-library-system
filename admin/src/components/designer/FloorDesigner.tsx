import React from 'react';
import FloorDesigner2D from './FloorDesigner2D';
import DesignerToolbar from './DesignerToolbar';
import DesignerSidebar from './DesignerSidebar';

const FloorDesigner: React.FC = () => {
    return (
        <div className="relative w-full h-[750px] rounded-[3.5rem] overflow-hidden border-8 border-slate-950 shadow-2xl bg-slate-950">
            <div className="absolute inset-0 z-0">
                <FloorDesigner2D />
            </div>
            
            <DesignerToolbar />
            
            <DesignerSidebar />

            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 bg-slate-900/40 backdrop-blur-md px-6 py-2.5 rounded-2xl border border-white/5 pointer-events-none">
                <p className="text-[9px] font-black text-white/50 uppercase tracking-[0.3em] text-center">
                    Floor Plan Designer
                </p>
            </div>
        </div>
    );
};

export default FloorDesigner;
