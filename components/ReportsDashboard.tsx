
import React, { useState, useEffect } from 'react';
import { TrendingUp, AlertCircle, DollarSign, BookOpen, Printer, Download, Mail, LayoutTemplate, Library, RefreshCw, CheckCircle, Wallet, History, UserCheck, ShieldCheck, Zap, BarChart3, PieChart, Users, ChevronRight } from 'lucide-react';
import { mockGetSystemStats, mockGetOverdueItems, mockGetFinancialSummary, mockGetTransactions } from '../services/api';
import { SystemStats, OverdueReportItem, Transaction } from '../types';
import StatCard from './reports/StatCard';
import GenreIntelligence from './reports/GenreIntelligence';
import EngagementHub from './reports/EngagementHub';

const ReportsDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'OVERDUE' | 'COLLECTION' | 'FINANCIAL'>('OVERVIEW');
    const [stats, setStats] = useState<SystemStats | null>(null);
    const [overdues, setOverdues] = useState<OverdueReportItem[]>([]);
    const [financials, setFinancials] = useState<{ totalCollected: number, totalFinesAssessed: number, totalReplacementsAssessed: number, totalWaived: number } | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        const [statsData, overdueData, finSummary, txns] = await Promise.all([
            mockGetSystemStats(),
            mockGetOverdueItems(),
            mockGetFinancialSummary(),
            mockGetTransactions()
        ]);
        setStats(statsData);
        setOverdues(overdueData);
        setFinancials(finSummary);
        setTransactions(txns);
        setLoading(false);
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
    };

    if (loading || !stats) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <RefreshCw className="h-12 w-12 animate-spin mb-6 text-sky-500" />
                <p className="text-xs font-black uppercase tracking-[0.4em] animate-pulse">Aggregating Global Metrics...</p>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-10 max-w-[1700px] mx-auto h-full flex flex-col gap-10 animate-fade-in-up pb-32">

            {/* Superior Header Control */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 print:hidden">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 flex items-center gap-4 tracking-tighter uppercase">
                        <TrendingUp className="h-10 w-10 text-sky-600" /> System Analytics
                    </h2>
                    <p className="text-slate-500 font-medium mt-1">Cross-dimensional collection audit and reading behavior intelligence.</p>
                </div>

                <div className="bg-slate-100 p-1.5 rounded-[1.5rem] flex flex-wrap gap-1 shadow-inner border border-slate-200 self-start">
                    <button onClick={() => setActiveTab('OVERVIEW')} className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest rounded-2xl flex items-center gap-2.5 transition-all ${activeTab === 'OVERVIEW' ? 'bg-white text-sky-600 shadow-md ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-800'}`}><LayoutTemplate className="h-4 w-4" /> Overview</button>
                    <button onClick={() => setActiveTab('COLLECTION')} className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest rounded-2xl flex items-center gap-2.5 transition-all ${activeTab === 'COLLECTION' ? 'bg-white text-indigo-600 shadow-md ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-800'}`}><Library className="h-4 w-4" /> Collection</button>
                    <button onClick={() => setActiveTab('FINANCIAL')} className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest rounded-2xl flex items-center gap-2.5 transition-all ${activeTab === 'FINANCIAL' ? 'bg-white text-emerald-600 shadow-md ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-800'}`}><Wallet className="h-4 w-4" /> Financials</button>
                    <button onClick={() => setActiveTab('OVERDUE')} className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest rounded-2xl flex items-center gap-2.5 transition-all ${activeTab === 'OVERDUE' ? 'bg-white text-rose-600 shadow-md ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-800'}`}><AlertCircle className="h-4 w-4" /> Risks ({overdues.length})</button>
                </div>
            </div>

            {/* OVERVIEW MODE */}
            {activeTab === 'OVERVIEW' && (
                <div className="space-y-10 animate-fade-in">
                    {/* KPI Tier */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard label="Circulation Load" value={stats.activeLoans} subtext="Active Outbound Loans" icon={TrendingUp} colorClass="text-sky-600 bg-sky-50 text-sky-600 border-sky-100" />
                        <StatCard label="Asset Retention" value={stats.totalItems - stats.activeLoans - stats.lostItems} subtext="On-Shelf Availability" icon={BookOpen} colorClass="text-emerald-600 bg-emerald-50 text-emerald-600 border-emerald-100" />
                        <StatCard label="Collection Value" value={formatCurrency(stats.totalValue)} subtext="Core Holdings Appraisal" icon={DollarSign} colorClass="text-indigo-600 bg-indigo-50 text-indigo-600 border-indigo-100" />
                        <StatCard label="Overdue Risks" value={overdues.length} subtext="Pending Escalations" icon={AlertCircle} colorClass="text-rose-600 bg-rose-50 text-rose-600 border-rose-100" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[600px]">
                        <div className="lg:col-span-4">
                            <GenreIntelligence data={stats.itemsByClassification} totalBooks={stats.totalItems} />
                        </div>
                        <div className="lg:col-span-8">
                            <EngagementHub topReaders={stats.topReaders} topClasses={stats.topClasses} />
                        </div>
                    </div>

                    {/* Acquisition Velocity */}
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between mb-10">
                            <div>
                                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Acquisition Velocity</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Net collection growth (5 Month History)</p>
                            </div>
                            <Zap className="h-6 w-6 text-amber-400" />
                        </div>
                        <div className="flex items-end gap-12 h-48 px-10">
                            {stats.acquisitionHistory.map((point) => {
                                const maxVal = Math.max(...stats.acquisitionHistory.map(h => h.count));
                                const height = (point.count / maxVal) * 100;
                                return (
                                    <div key={point.month} className="flex-1 flex flex-col items-center group">
                                        <div className="w-full relative flex items-end justify-center h-full">
                                            <div className="absolute top-0 w-px h-full bg-slate-50"></div>
                                            <div
                                                className="w-16 bg-slate-900 group-hover:bg-sky-500 rounded-t-2xl transition-all duration-700 ease-out relative z-10 shadow-lg shadow-slate-100"
                                                style={{ height: `${height}%` }}
                                            >
                                                <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-black px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none shadow-xl">
                                                    +{point.count}
                                                </span>
                                            </div>
                                        </div>
                                        <span className="mt-6 text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-900 transition-colors">{point.month}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* FINANCIALS MODE */}
            {activeTab === 'FINANCIAL' && financials && (
                <div className="space-y-10 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="bg-emerald-600 text-white p-10 rounded-[2.5rem] shadow-2xl shadow-emerald-100 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-24 -mt-24 group-hover:bg-white/20 transition-all"></div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-200">Verified Cash Liquid</p>
                            <p className="text-6xl font-black tracking-tighter mt-4 font-mono">{formatCurrency(financials.totalCollected)}</p>
                            <div className="mt-8 flex items-center gap-3 bg-white/10 p-3 rounded-2xl border border-white/10">
                                <ShieldCheck className="h-5 w-5 text-emerald-300" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Drawer In-Sync Protocol Active</span>
                            </div>
                        </div>

                        <div className="bg-white border-2 border-slate-100 p-10 rounded-[2.5rem] flex flex-col justify-between group hover:border-sky-500 transition-colors">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Outstanding Fines</p>
                                <p className="text-4xl font-black text-slate-800 mt-2 font-mono">{formatCurrency(financials.totalFinesAssessed - financials.totalCollected)}</p>
                            </div>
                            <div className="flex gap-4 mt-6">
                                <div className="bg-amber-50 px-4 py-2 rounded-xl border border-amber-100">
                                    <p className="text-[8px] font-black text-amber-600 uppercase mb-0.5">Assessed</p>
                                    <p className="text-xs font-black text-amber-700">{formatCurrency(financials.totalFinesAssessed)}</p>
                                </div>
                                <div className="bg-sky-50 px-4 py-2 rounded-xl border border-sky-100">
                                    <p className="text-[8px] font-black text-sky-600 uppercase mb-0.5">Waived</p>
                                    <p className="text-xs font-black text-sky-700">{formatCurrency(financials.totalWaived)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-900 text-white p-10 rounded-[2.5rem] shadow-xl flex flex-col justify-between">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Asset Replacement Levy</p>
                                <p className="text-4xl font-black text-white mt-2 font-mono">{formatCurrency(financials.totalReplacementsAssessed)}</p>
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-2">Verified Losses Pending Reconciliation</p>
                            </div>
                            <button className="w-full mt-6 py-4 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Audit Lost Titles</button>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <History className="h-6 w-6 text-slate-400" />
                                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Financial Stream Audit</h3>
                            </div>
                            <button onClick={() => window.print()} className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg active:scale-95 transition-all"><Printer className="h-4 w-4" /> Export Audit Log</button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-100">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-8 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Journal Timestamp</th>
                                        <th className="px-8 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Controller</th>
                                        <th className="px-8 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Entity</th>
                                        <th className="px-8 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                                        <th className="px-8 py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-50">
                                    {transactions.map(txn => (
                                        <tr key={txn.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-8 py-5 text-xs font-mono font-bold text-slate-500">{new Date(txn.timestamp).toLocaleString()}</td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-6 w-6 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100"><ShieldCheck className="h-3 w-3" /></div>
                                                    <span className="text-[10px] font-black text-slate-800 uppercase tracking-tight">{txn.librarian_id}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 font-mono text-xs text-slate-400">{txn.patron_id}</td>
                                            <td className="px-8 py-5">
                                                <span className={`text-[9px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wider ${txn.type.includes('PAYMENT') ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                                                    {txn.type.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className={`px-8 py-5 text-right font-mono font-black ${txn.type.includes('PAYMENT') ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {txn.type.includes('PAYMENT') ? '–' : '+'}{formatCurrency(txn.amount)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* OVERDUE RISKS MODE */}
            {activeTab === 'OVERDUE' && (
                <div className="space-y-8 animate-fade-in">
                    <div className="bg-white border-2 border-rose-100 rounded-[2.5rem] p-10 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8 bg-gradient-to-br from-white to-rose-50/20">
                        <div className="flex items-center gap-6">
                            <div className="h-20 w-20 bg-rose-100 text-rose-600 rounded-[2rem] flex items-center justify-center border-2 border-rose-200 animate-pulse">
                                <AlertCircle className="h-10 w-10" />
                            </div>
                            <div>
                                <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-2">Escalation Pool</h3>
                                <p className="text-slate-500 font-medium max-w-sm">Items past their return threshold requiring parent communication.</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 shadow-xl hover:bg-slate-800 transition-all"><Printer className="h-4 w-4" /> Batch Call-Slips</button>
                            <button className="px-6 py-4 bg-white border border-slate-200 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2"><Download className="h-4 w-4" /> Export Pool</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {overdues.map(item => (
                            <div key={item.loanId} className="bg-white border border-slate-100 p-8 rounded-[2rem] shadow-sm hover:shadow-xl transition-all group relative overflow-hidden border-l-8 border-l-rose-500">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <p className="text-[9px] font-black text-rose-500 uppercase tracking-[0.2em] mb-1">{item.daysOverdue} Days Past Protocol</p>
                                        <h4 className="text-lg font-black text-slate-800 leading-tight uppercase line-clamp-1">{item.bookTitle}</h4>
                                    </div>
                                    <button className="p-2 text-slate-300 hover:text-sky-600 transition-colors"><Mail className="h-5 w-5" /></button>
                                </div>

                                <div className="space-y-4 mb-8">
                                    <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl">
                                        <div className="h-10 w-10 bg-slate-900 rounded-lg flex items-center justify-center text-white font-black text-xs">{item.patronName.charAt(0)}</div>
                                        <div>
                                            <p className="text-xs font-black text-slate-800 uppercase leading-none mb-1">{item.patronName}</p>
                                            <p className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">{item.patronId}</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">
                                        <span>Maturity Date:</span>
                                        <span className="text-slate-800">{new Date(item.dueDate).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                <button className="w-full py-4 bg-slate-50 group-hover:bg-sky-600 group-hover:text-white text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2">
                                    Issue Final Demand <ChevronRight className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* COLLECTION INSIGHTS MODE */}
            {activeTab === 'COLLECTION' && (
                <div className="space-y-10 animate-fade-in">
                    <div className="bg-slate-900 p-12 rounded-[3rem] text-white flex flex-col md:flex-row items-center gap-12 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-[100px] -mr-64 -mt-64"></div>
                        <div className="relative z-10 flex flex-col items-center text-center md:items-start md:text-left gap-6">
                            <div className="p-4 bg-sky-500 text-slate-900 rounded-[2rem] shadow-2xl shadow-sky-500/30">
                                <Library className="h-12 w-12" />
                            </div>
                            <div>
                                <h3 className="text-4xl font-black uppercase tracking-tighter leading-none mb-3">Deep Collection Audit</h3>
                                <p className="text-slate-400 font-medium max-w-lg">Advanced metrics for collection hygiene, subject-matter saturation, and physical space utilization.</p>
                            </div>
                        </div>
                        <div className="flex-1 grid grid-cols-2 gap-4 relative z-10 w-full md:w-auto">
                            <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
                                <p className="text-[10px] font-black text-sky-400 uppercase tracking-widest mb-1">Turnover Rate</p>
                                <p className="text-4xl font-black text-white">4.2<span className="text-sm font-bold text-slate-500 ml-2">loans/vol</span></p>
                            </div>
                            <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
                                <p className="text-[10px] font-black text-sky-400 uppercase tracking-widest mb-1">Legacy Load</p>
                                <p className="text-4xl font-black text-white">12%<span className="text-sm font-bold text-slate-500 ml-2">&gt;15yrs</span></p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-[600px]">
                        <GenreIntelligence data={stats.itemsByClassification} totalBooks={stats.totalItems} />
                        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center gap-6">
                            <div className="h-32 w-32 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                                <RefreshCw className="h-16 w-16 opacity-10" />
                            </div>
                            <h4 className="text-xl font-black text-slate-400 uppercase tracking-tight">Spatial Heatmap Unavailable</h4>
                            <p className="text-xs text-slate-400 font-medium max-w-xs uppercase leading-relaxed">Map logic integration required for shelf-level checkout hotzones.</p>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default ReportsDashboard;
