
import React, { useState, useRef, useEffect } from 'react';
import { Library, Bell, Check, UserCircle, IdCard, Key, LogOut, ChevronDown, Monitor, Settings } from 'lucide-react';
import { AuthUser, SystemAlert, MapConfig, ViewMode } from '../../types';
import { SYSTEM_THEME_CONFIG } from '../../utils';

interface SystemNavbarProps {
  mode: ViewMode;
  setMode: (mode: ViewMode) => void;
  currentUser: AuthUser | null;
  mapConfig: MapConfig | null;
  alerts: SystemAlert[];
  onResolveAlert: (id: string) => void;
  onLogout: () => void;
  isMobile: boolean;
  onOpenLogin: () => void;
  onOpenCredentials: () => void;
  onSelectTab: (tab: any) => void;
}

const SystemNavbar: React.FC<SystemNavbarProps> = ({ 
    mode, setMode, currentUser, mapConfig, alerts, onResolveAlert, onLogout, isMobile, onOpenLogin, onOpenCredentials, onSelectTab 
}) => {
  const [showAlertMenu, setShowAlertMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const theme = mapConfig?.theme || 'EMERALD';
  const styles = SYSTEM_THEME_CONFIG[theme];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
            setShowProfileMenu(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className={`${styles.navBg} backdrop-blur-md ${styles.navText} shadow-sm border-b ${styles.navBorder} z-50 sticky top-0 print:hidden`}>
      <div className="max-w-[1800px] mx-auto px-4 lg:px-6">
        <div className="flex items-center justify-between h-16 lg:h-20">
          
          <div 
            className="flex items-center gap-3 shrink-0 cursor-pointer hover:opacity-80 transition-opacity group"
            onClick={() => setMode('KIOSK')}
          >
            <div className="h-10 w-10 lg:h-12 lg:w-12 flex items-center justify-center shrink-0">
              {mapConfig?.logo && !logoError ? (
                <img 
                  src={mapConfig.logo} 
                  alt="Logo" 
                  className="h-full w-full object-contain group-hover:scale-105 transition-transform"
                  onError={() => setLogoError(true)} 
                />
              ) : (
                <div className={`${styles.navAccent.replace('text-', 'bg-')} p-2 rounded-xl shadow-lg`}>
                  <Library className="h-6 w-6 text-white" />
                </div>
              )}
            </div>
            <div className="hidden md:block">
              <span className={`font-black text-lg lg:text-xl tracking-tighter block leading-tight uppercase ${styles.navBrand}`}>Thomian</span>
              {!isMobile && <span className={`text-[9px] ${styles.navAccent} block leading-tight uppercase tracking-[0.25em] font-black opacity-80`}>St. Thomas Secondary</span>}
            </div>
          </div>
          
          <div className={`flex items-center gap-2 lg:gap-5 shrink-0 pl-4 lg:pl-6 border-l ${styles.navBorder}/50 ml-4 lg:ml-6 h-10`}>
                {currentUser && (
                    <div className="relative">
                        <button 
                            onClick={() => setShowAlertMenu(!showAlertMenu)}
                            className={`p-2 lg:p-2.5 rounded-xl relative transition-all border ${alerts.length > 0 ? 'bg-rose-500 text-white animate-pulse border-rose-400 shadow-lg shadow-rose-100' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                        >
                            <Bell className="h-5 w-5" />
                            {alerts.length > 0 && (
                                <span className="absolute -top-1 -right-1 h-5 w-5 bg-white text-rose-600 text-[10px] font-black rounded-full flex items-center justify-center border-2 border-rose-500 shadow-sm">
                                    {alerts.length}
                                </span>
                            )}
                        </button>
                        {showAlertMenu && (
                            <div className="absolute top-14 lg:top-16 right-0 w-80 lg:w-96 bg-white text-slate-800 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-200 overflow-hidden z-[100] animate-fade-in-up">
                                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                                    <span className="font-black text-[10px] uppercase tracking-widest text-slate-500">System Monitoring</span>
                                    <span className="text-[10px] font-black bg-rose-100 text-rose-600 px-2.5 py-1 rounded-full">{alerts.length} NEW</span>
                                </div>
                                <div className="max-h-[450px] overflow-y-auto scrollbar-thin">
                                    {alerts.length === 0 ? (
                                        <div className="p-12 text-center text-slate-300 italic text-sm font-medium">No active alerts detected.</div>
                                    ) : (
                                        alerts.map(alert => (
                                            <div key={alert.id} className="p-6 border-b border-slate-50 hover:bg-slate-50 flex items-start justify-between group transition-colors">
                                                <div className="flex-1 pr-4">
                                                    <p className="font-black text-sm text-slate-800 group-hover:text-sky-600 transition-colors">
                                                        {alert.message}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-widest">Aisle/Zone: <strong className="text-slate-600">{alert.location}</strong></p>
                                                </div>
                                                <button onClick={() => onResolveAlert(alert.id)} className="p-2 text-slate-200 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"><Check className="h-5 w-5" /></button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {currentUser ? (
                    <div className="relative" ref={profileMenuRef}>
                        <button 
                            onClick={() => setShowProfileMenu(!showProfileMenu)}
                            className={`flex items-center gap-3 p-1 rounded-2xl border ${styles.navBorder}/50 hover:border-slate-300 hover:bg-white/50 transition-all`}
                        >
                            <div className={`h-8 w-8 lg:h-9 lg:w-9 ${currentUser.avatar_color || 'bg-slate-900'} rounded-xl flex items-center justify-center font-black text-xs text-white uppercase shadow-md`}>
                                {currentUser.full_name.charAt(0)}
                            </div>
                            <div className="text-left hidden lg:block pr-2">
                                <p className={`text-[10px] font-black ${styles.navBrand} uppercase tracking-tight leading-none`}>{currentUser.full_name}</p>
                                <p className={`text-[8px] ${styles.navAccent} font-black uppercase tracking-[0.2em] mt-1.5 opacity-70`}>{currentUser.role}</p>
                            </div>
                            <ChevronDown className={`h-4 w-4 ${styles.navAccent} transition-transform duration-300 mr-1 ${showProfileMenu ? 'rotate-180' : ''}`} />
                        </button>

                        {showProfileMenu && (
                            <div className="absolute top-14 lg:top-16 right-0 w-64 bg-white text-slate-800 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.18)] border border-slate-100 overflow-hidden z-[110] animate-fade-in-up">
                                <div className="p-6 bg-slate-50 border-b border-slate-100 flex flex-col items-center text-center">
                                    <div className={`h-16 w-16 ${currentUser.avatar_color || 'bg-slate-900'} rounded-[1.5rem] flex items-center justify-center text-white text-2xl font-black mb-4 shadow-xl border-4 border-white`}>
                                        {currentUser.full_name.charAt(0)}
                                    </div>
                                    <h4 className="font-black text-sm uppercase tracking-tight text-slate-900">{currentUser.full_name}</h4>
                                    <p className={`text-[9px] font-black ${styles.navAccent} uppercase tracking-[0.2em] mt-2 opacity-80`}>{currentUser.role}</p>
                                </div>
                                <div className="p-2 bg-white">
                                    <button onClick={() => { onSelectTab('PROFILE'); setShowProfileMenu(false); }} className="w-full text-left px-4 py-3.5 rounded-xl hover:bg-slate-50 flex items-center gap-3 transition-colors group">
                                        <UserCircle className={`h-4.5 w-4.5 ${styles.navAccent} group-hover:text-sky-600 transition-colors`} />
                                        <span className="text-xs font-black text-slate-600 uppercase tracking-widest">Account Hub</span>
                                    </button>
                                    <button onClick={() => { onOpenCredentials(); setShowProfileMenu(false); }} className="w-full text-left px-4 py-3.5 rounded-xl hover:bg-slate-50 flex items-center gap-3 transition-colors group">
                                        <IdCard className={`h-4.5 w-4.5 ${styles.navAccent} group-hover:text-sky-600 transition-colors`} />
                                        <span className="text-xs font-black text-slate-600 uppercase tracking-widest">Session Keys</span>
                                    </button>
                                </div>
                                <div className="p-2 border-t border-slate-100 bg-slate-50/20">
                                    <button onClick={onLogout} className="w-full px-4 py-4 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 flex items-center justify-center gap-3 transition-colors">
                                        <LogOut className="h-4.5 w-4.5" />
                                        <span className="text-xs font-black uppercase tracking-widest">Terminate Session</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <button onClick={onOpenLogin} className={`flex items-center gap-3 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${styles.navAccent.replace('text-', 'bg-')} hover:opacity-90 text-white transition-all shadow-xl active:scale-95`}>
                        <Settings className="h-4 w-4" /> Management Login
                    </button>
                )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default SystemNavbar;
