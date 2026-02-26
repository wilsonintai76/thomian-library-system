
import React from 'react';
import { LayoutDashboard, ArrowLeftRight, PackageSearch, HelpCircle, LogOut } from 'lucide-react';
import { AdminTab } from '../../types';

interface MobileTaskBarProps {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  onLogout: () => void;
}

const MobileTaskBar: React.FC<MobileTaskBarProps> = ({ activeTab, setActiveTab, onLogout }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 h-20 bg-[#020617] border-t border-slate-800 flex items-center justify-around px-2 z-[100] pb-2 print:hidden shadow-[0_-4px_30px_rgba(0,0,0,0.5)]">
        <button onClick={() => setActiveTab('DASHBOARD')} className={`flex flex-col items-center gap-1 transition-all flex-1 ${activeTab === 'DASHBOARD' ? 'text-sky-400' : 'text-slate-500'}`}>
          <div className={`p-2 rounded-xl transition-all ${activeTab === 'DASHBOARD' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : ''}`}>
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <span className="text-[8px] font-black uppercase tracking-widest">Home</span>
        </button>

        <button onClick={() => setActiveTab('CIRCULATION')} className={`flex flex-col items-center gap-1 transition-all flex-1 ${activeTab === 'CIRCULATION' ? 'text-sky-400' : 'text-slate-500'}`}>
          <div className={`p-2 rounded-xl transition-all ${activeTab === 'CIRCULATION' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : ''}`}>
            <ArrowLeftRight className="h-5 w-5" />
          </div>
          <span className="text-[8px] font-black uppercase tracking-widest">Loans</span>
        </button>

        <button onClick={() => setActiveTab('CATALOG')} className={`flex flex-col items-center gap-1 transition-all flex-1 ${activeTab === 'CATALOG' ? 'text-sky-400' : 'text-slate-500'}`}>
          <div className={`p-2 rounded-xl transition-all ${activeTab === 'CATALOG' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : ''}`}>
            <PackageSearch className="h-5 w-5" />
          </div>
          <span className="text-[8px] font-black uppercase tracking-widest">Books</span>
        </button>
        
        <button onClick={() => setActiveTab('HELP')} className={`flex flex-col items-center gap-1 transition-all flex-1 ${activeTab === 'HELP' ? 'text-white' : 'text-slate-500'}`}>
          <div className={`p-2 rounded-xl transition-all ${activeTab === 'HELP' ? 'bg-slate-800 text-white' : ''}`}>
            <HelpCircle className="h-5 w-5" />
          </div>
          <span className="text-[8px] font-black uppercase tracking-widest">Docs</span>
        </button>
        
        <button onClick={onLogout} className={`flex flex-col items-center gap-1 transition-all flex-1 text-rose-500/70 hover:text-rose-500`}>
          <div className="p-2"><LogOut className="h-5 w-5" /></div>
          <span className="text-[8px] font-black uppercase tracking-widest">Exit</span>
        </button>
    </div>
  );
};

export default MobileTaskBar;