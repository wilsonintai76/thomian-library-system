
import React from 'react';
import { Loader2, CheckCircle, Archive } from 'lucide-react';

interface Step {
    source: string;
    status: 'IDLE' | 'PENDING' | 'FOUND' | 'NOT_FOUND';
}

interface AcquisitionWaterfallProps {
    steps: Step[];
}

const AcquisitionWaterfall: React.FC<AcquisitionWaterfallProps> = ({ steps }) => {
  return (
    <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-5">
      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-3 mb-2">Acquisition Waterfall</h3>
      {steps.map((step) => (
        <div key={step.source} className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`flex items-center justify-center w-10 h-10 rounded-xl border-2 transition-all ${step.status === 'PENDING' ? 'border-blue-500 bg-blue-50' : step.status === 'FOUND' ? 'border-emerald-500 bg-emerald-50' : step.status === 'NOT_FOUND' ? 'border-slate-200 bg-slate-50' : 'border-slate-100 opacity-30'}`}>
              {step.status === 'PENDING' && <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />}
              {step.status === 'FOUND' && <CheckCircle className="h-5 w-5 text-emerald-600" />}
              {step.status === 'NOT_FOUND' && <Archive className="h-5 w-5 text-slate-300" />}
              {step.status === 'IDLE' && <div className="w-2 h-2 rounded-full bg-slate-200" />}
            </div>
            <div>
                <p className={`text-[10px] font-black uppercase tracking-tight ${step.status === 'FOUND' ? 'text-emerald-700' : 'text-slate-400'}`}>
                    {step.source === 'LOCAL' ? 'Thomian Core DB' : step.source === 'ZEBRA_LOC' ? 'Library of Congress' : 'Open Library API'}
                </p>
                <p className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter">{step.status}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AcquisitionWaterfall;
