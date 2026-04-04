import React from 'react';
import { ShieldCheck, BookOpen, BarChart3, Map, Zap, Layers, Globe, Clock, ChevronRight, Lock } from 'lucide-react';
import { MapConfig } from '../types';
import { DEFAULT_LOGO_URL } from '../constants';

interface AdminLandingProps {
    onLoginRequest: () => void;
    mapConfig: MapConfig | null;
}

const AdminLanding: React.FC<AdminLandingProps> = ({ onLoginRequest, mapConfig }) => {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500/30 overflow-x-hidden">
            {/* Ambient Background Elements */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-600/10 blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/5 blur-[150px]" />
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]" />
            </div>

            {/* Navigation */}
            <nav className="relative z-50 flex items-center justify-end px-6 py-8 max-w-7xl mx-auto">
                <button 
                    onClick={onLoginRequest}
                    className="px-6 py-2.5 bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-full text-xs font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all duration-500 group"
                >
                    <span className="flex items-center gap-2">
                        System Access <Lock className="h-3 w-3 transition-transform group-hover:scale-110" />
                    </span>
                </button>
            </nav>

            {/* Hero Section */}
            <main className="relative z-10 pt-12 md:pt-24 pb-32 px-6 max-w-7xl mx-auto text-center">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] mb-8 animate-fade-in-up">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                    Production Environment v{__APP_VERSION__}
                </div>
                
                <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-[0.9] mb-8 animate-fade-in-up">
                    Precision <span className="text-emerald-500">Library</span> <br />
                    Intelligence.
                </h1>
                
                <p className="max-w-2xl mx-auto text-slate-400 text-lg md:text-xl font-medium leading-relaxed mb-12 animate-fade-in-up md:delay-100">
                    The spatial management platform for modern curation. <br className="hidden md:block" />
                    Securely audit, automate, and analyze your collection with AIS-enhanced workflows.
                </p>

                <div className="flex flex-col md:flex-row items-center justify-center gap-4 animate-fade-in-up md:delay-200">
                    <button 
                        onClick={onLoginRequest}
                        className="w-full md:w-auto px-10 py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all duration-500 shadow-2xl shadow-emerald-900/30 flex items-center justify-center gap-3 active:scale-95"
                    >
                        Authenticate Librarian <ChevronRight className="h-4 w-4" />
                    </button>
                    <a 
                        href="https://www.thomian-lib.com" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-full md:w-auto px-10 py-5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl font-black text-sm uppercase tracking-widest transition-all duration-500 backdrop-blur-xl"
                    >
                        Visit Public Kiosk
                    </a>
                </div>
            </main>

            {/* Features Matrix */}
            <section className="relative z-10 py-24 px-6 bg-slate-900/30 border-y border-white/5 backdrop-blur-md overflow-hidden">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-20">
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em] mb-4">Core Capacities</p>
                        <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Purpose-Built for Librarians</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            {
                                icon: <Zap className="h-6 w-6 text-emerald-400" />,
                                title: "Smart Cataloging",
                                desc: "Automated MARC waterfall searches from OCLC and Open Library."
                            },
                            {
                                icon: <Layers className="h-6 w-6 text-blue-400" />,
                                title: "Circulation Matrix",
                                desc: "Rapid bulk checkout and automated fine assessment ledger."
                            },
                            {
                                icon: <Map className="h-6 w-6 text-purple-400" />,
                                title: "Spatial Analytics",
                                desc: "Visual shelf tracking with dynamic heatmaps and level mapping."
                            },
                            {
                                icon: <BarChart3 className="h-6 w-6 text-rose-400" />,
                                title: "Deep Reporting",
                                desc: "Comprehensive PDF audit journals and acquisition history logs."
                            }
                        ].map((item, idx) => (
                            <div key={idx} className="group p-8 bg-slate-900/50 border border-white/10 rounded-3xl hover:border-emerald-500/50 transition-all duration-700 hover:-translate-y-2">
                                <div className="h-12 w-12 bg-white/5 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                                    {item.icon}
                                </div>
                                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Bottom Footer Section */}
            <footer className="relative z-10 py-16 px-6 text-center">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-center gap-8 mb-8 text-slate-500 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-1000">
                        <div className="flex items-center gap-2"><Globe className="h-4 w-4" /><span className="text-[10px] font-black uppercase tracking-widest">Global CDN</span></div>
                        <div className="flex items-center gap-2"><Clock className="h-4 w-4" /><span className="text-[10px] font-black uppercase tracking-widest">99.9% Uptime</span></div>
                        <div className="flex items-center gap-2"><Lock className="h-4 w-4" /><span className="text-[10px] font-black uppercase tracking-widest">End-to-End SSL</span></div>
                    </div>
                    <p className="text-slate-500 text-xs font-medium tracking-tight">
                        &copy; {new Date().getFullYear()} Thomian Library Systems. Powered by Cloudflare. 
                    </p>
                </div>
            </footer>

            <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 1s cubic-bezier(0.19, 1, 0.22, 1) forwards;
                    opacity: 0;
                }
                .delay-100 { animation-delay: 0.1s; }
                .delay-200 { animation-delay: 0.2s; }
            `}</style>
        </div>
    );
};

export default AdminLanding;
