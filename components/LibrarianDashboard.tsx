
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  AlertCircle, 
  TrendingUp, 
  ArrowRight, 
  PlusCircle, 
  Search, 
  Clock, 
  History,
  CheckCircle2,
  Zap,
  ChevronRight,
  Loader2,
  Calendar
} from 'lucide-react';
import { SystemStats, Book, Loan, Transaction } from '../types';
import { 
  mockGetSystemStats, 
  mockGetRecentActivity, 
  mockGetOverdueItems 
} from '../services/mockApi';

interface LibrarianDashboardProps {
  onSelectTab: (tab: any) => void;
}

const LibrarianDashboard: React.FC<LibrarianDashboardProps> = ({ onSelectTab }) => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsData, activityData] = await Promise.all([
        mockGetSystemStats(),
        mockGetRecentActivity()
      ]);
      setStats(statsData);
      setRecentActivity(activityData);
    } catch (err) {
      console.error("Failed to load dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400">
        <Loader2 className="h-12 w-12 animate-spin mb-6 text-sky-500" />
        <p className="text-xs font-black uppercase tracking-[0.4em] animate-pulse">Initializing Mission Control...</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-[1700px] mx-auto h-full flex flex-col gap-8 animate-fade-in-up pb-32">
      
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 flex items-center gap-4 tracking-tighter uppercase">
            <LayoutDashboard className="h-10 w-10 text-sky-600" /> Librarian Command
          </h2>
          <p className="text-slate-500 font-medium mt-1">Real-time overview of library circulation and collection health.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl border border-emerald-100 flex items-center gap-2">
            <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-black uppercase tracking-widest">System Online</span>
          </div>
          <button 
            onClick={loadDashboardData}
            className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-slate-400 hover:text-sky-600"
          >
            <Zap className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <QuickStat 
          label="Active Loans" 
          value={stats.activeLoans} 
          subtext="Items currently out" 
          icon={BookOpen} 
          color="sky" 
          onClick={() => onSelectTab('CIRCULATION')}
        />
        <QuickStat 
          label="Overdue Risk" 
          value={stats.overdueLoans} 
          subtext="Pending returns" 
          icon={AlertCircle} 
          color="rose" 
          onClick={() => onSelectTab('REPORTS')}
        />
        <QuickStat 
          label="Total Collection" 
          value={stats.totalItems} 
          subtext="Cataloged assets" 
          icon={LayoutDashboard} 
          color="indigo" 
          onClick={() => onSelectTab('CATALOG')}
        />
        <QuickStat 
          label="Active Patrons" 
          value={stats.topReaders.length * 12} // Mocked multiplier for dashboard feel
          subtext="Registered entities" 
          icon={Users} 
          color="emerald" 
          onClick={() => onSelectTab('PATRONS')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Quick Actions Panel */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-sky-500/20 transition-all"></div>
            <h3 className="text-xl font-black uppercase tracking-tight mb-6 relative z-10">Quick Operations</h3>
            <div className="grid grid-cols-1 gap-3 relative z-10">
              <ActionButton 
                label="Check-Out Session" 
                icon={ArrowRight} 
                onClick={() => onSelectTab('CIRCULATION')} 
                color="bg-sky-600 hover:bg-sky-500"
              />
              <ActionButton 
                label="Process Returns" 
                icon={History} 
                onClick={() => onSelectTab('CIRCULATION')} 
                color="bg-emerald-600 hover:bg-emerald-500"
              />
              <ActionButton 
                label="Catalog New Asset" 
                icon={PlusCircle} 
                onClick={() => onSelectTab('CATALOG')} 
                color="bg-indigo-600 hover:bg-indigo-500"
              />
              <ActionButton 
                label="Search Directory" 
                icon={Search} 
                onClick={() => onSelectTab('PATRONS')} 
                color="bg-slate-700 hover:bg-slate-600"
              />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">System Health</h3>
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="space-y-4">
              <HealthItem label="Database Sync" status="Optimal" />
              <HealthItem label="Printer Connection" status="Ready" />
              <HealthItem label="Scanner Interface" status="Active" />
              <HealthItem label="Cloud Backup" status="12m ago" />
            </div>
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="lg:col-span-8">
          <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm flex flex-col h-full overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <Clock className="h-6 w-6 text-slate-400" />
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Live Circulation Stream</h3>
              </div>
              <button 
                onClick={() => onSelectTab('REPORTS')}
                className="text-[10px] font-black text-sky-600 uppercase tracking-widest hover:underline"
              >
                View Full Audit Log
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[600px] scrollbar-thin">
              {recentActivity.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-300 italic">
                  <History className="h-12 w-12 opacity-10 mb-4" />
                  <p>No recent activity recorded today.</p>
                </div>
              ) : (
                recentActivity.map((activity, idx) => (
                  <ActivityRow key={idx} activity={activity} />
                ))
              )}
            </div>

            <div className="bg-slate-900 p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-2 w-2 bg-sky-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Monitoring Global Events</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black text-white/40 uppercase tracking-widest">
                <Calendar className="h-3 w-3" />
                {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

const QuickStat = ({ label, value, subtext, icon: Icon, color, onClick }: any) => {
  const colors: any = {
    sky: "bg-sky-50 text-sky-600 border-sky-100 hover:border-sky-300",
    rose: "bg-rose-50 text-rose-600 border-rose-100 hover:border-rose-300",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100 hover:border-indigo-300",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100 hover:border-emerald-300"
  };

  return (
    <button 
      onClick={onClick}
      className={`p-8 rounded-[2.5rem] border-2 ${colors[color]} transition-all text-left group relative overflow-hidden active:scale-95 shadow-sm`}
    >
      <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
        <Icon className="h-24 w-24" />
      </div>
      <div className="relative z-10">
        <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-2">{label}</p>
        <p className="text-4xl font-black tracking-tighter mb-1">{value}</p>
        <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">{subtext}</p>
      </div>
    </button>
  );
};

const ActionButton = ({ label, icon: Icon, onClick, color }: any) => (
  <button 
    onClick={onClick}
    className={`w-full p-5 ${color} rounded-2xl flex items-center justify-between transition-all active:scale-[0.98] shadow-lg group`}
  >
    <div className="flex items-center gap-4">
      <div className="bg-white/20 p-2 rounded-xl">
        <Icon className="h-5 w-5 text-white" />
      </div>
      <span className="font-black text-xs uppercase tracking-widest">{label}</span>
    </div>
    <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
  </button>
);

const HealthItem = ({ label, status }: any) => (
  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
    <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{status}</span>
  </div>
);

const ActivityRow = ({ activity }: any) => {
  const isLoan = activity.type === 'LOAN';
  return (
    <div className="flex items-center justify-between p-5 hover:bg-slate-50 rounded-2xl transition-all group border border-transparent hover:border-slate-100">
      <div className="flex items-center gap-4">
        <div className={`h-12 w-12 rounded-xl flex items-center justify-center border shadow-sm ${isLoan ? 'bg-sky-50 text-sky-600 border-sky-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
          {isLoan ? <ArrowRight className="h-5 w-5" /> : <History className="h-5 w-5" />}
        </div>
        <div>
          <p className="text-sm font-black text-slate-800 uppercase tracking-tight leading-tight">
            {activity.patronName} <span className="text-slate-400 font-medium lowercase mx-1">processed</span> {activity.bookTitle}
          </p>
          <div className="flex items-center gap-3 mt-1.5">
            <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${isLoan ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700'}`}>
              {isLoan ? 'Outbound' : 'Returned'}
            </span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" /> {activity.time}
            </span>
          </div>
        </div>
      </div>
      <div className="text-right hidden sm:block">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Controller</p>
        <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{activity.librarian}</p>
      </div>
    </div>
  );
};

export default LibrarianDashboard;
