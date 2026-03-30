
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, ShieldCheck, Key, X, IdCard, Wifi, Cloud, ScanLine, ArrowLeftRight, BookOpen, Users, TrendingUp, MapPin, Calendar, Settings, HelpCircle, Copy, CheckCheck, Terminal, ShieldAlert } from 'lucide-react';
import { AdminTab, SystemAlert, AuthUser, MapConfig } from './types';
import CatalogingDesk from './components/CatalogingDesk';
import CirculationMatrix from './components/CirculationMatrix';
import PatronDashboard from './components/PatronDashboard';
import LibrarianDashboard from './components/LibrarianDashboard';
import CirculationDesk from './components/CirculationDesk';
import EventCalendar from './components/EventCalendar';
import ReportsDashboard from './components/ReportsDashboard';
import HelpGuide from './components/HelpGuide';
import LoginModal from './components/LoginModal';
import MapCreator from './components/MapCreator';
import SystemSettings from './components/SystemSettings';
import ProfileSettings from './components/ProfileSettings';
import SystemNavbar from './components/layout/SystemNavbar';
import MobileTaskBar from './components/layout/MobileTaskBar';
import { mockGetActiveAlerts, mockResolveAlert, initializeNetwork, getNetworkStatus, mockCheckSession, mockLogout, mockGetMapConfig } from './services/api';
import { SYSTEM_THEME_CONFIG } from './utils';

// ─── Session Keys Modal ───────────────────────────────────────────────────────
const SessionKeysModal: React.FC<{ user: AuthUser; token: string; onClose: () => void }> = ({ user, token, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(token).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up">
        <div className="bg-slate-900 p-8 relative">
          <button onClick={onClose} aria-label="Close" className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/40">
              <Terminal className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-tight">Session Keys</h3>
              <p className="text-slate-400 text-xs font-bold mt-0.5">Active credential tokens for this session</p>
            </div>
          </div>
        </div>
        <div className="p-8 space-y-6">
          <div className="flex items-center gap-4 bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <div className="h-10 w-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-lg">
              {user.full_name.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-black text-slate-800">{user.full_name}</p>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{user.role}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Username</p>
              <p className="text-sm font-mono font-bold text-slate-700">{user.username}</p>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Key className="h-3.5 w-3.5" /> Auth Token (JWT)
              </p>
              <button
                onClick={handleCopy}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  copied ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600 border border-slate-200'
                }`}
              >
                {copied ? <><CheckCheck className="h-3.5 w-3.5" /> Copied!</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
              </button>
            </div>
            <div className="bg-slate-950 rounded-2xl p-4 font-mono text-xs text-emerald-400 break-all select-all border border-slate-800 leading-relaxed">
              {token}
            </div>
          </div>
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-2xl p-4">
            <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-700 font-bold leading-relaxed">
              This token grants full API access as <span className="font-black">{user.role}</span>. Do not share it. Token is invalidated on logout.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── App ──────────────────────────────────────────────────────────────────────
const App: React.FC = () => {
  const [adminTab, setAdminTab] = useState<AdminTab>('DASHBOARD');
  const [circInitialMode, setCircInitialMode] = useState<'CHECK_OUT' | 'CHECK_IN' | 'RENEW'>('CHECK_IN');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [networkStatus, setNetworkStatus] = useState({ mode: 'CLOUD', url: '', isLan: false });
  const [mapConfig, setMapConfig] = useState<MapConfig | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);

  const theme = mapConfig?.theme || 'EMERALD';
  const styles = SYSTEM_THEME_CONFIG[theme];

  const refreshConfig = async () => {
    const cfg = await mockGetMapConfig();
    setMapConfig(cfg);
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const init = async () => {
      await initializeNetwork();
      setNetworkStatus(getNetworkStatus() as any);
      const user = await mockCheckSession();
      await refreshConfig();
      if (user) {
        setCurrentUser(user);
        if (window.innerWidth < 768) setAdminTab('CATALOG');
      } else {
        setIsLoginOpen(true);
      }
    };
    init();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (currentUser) {
        mockGetActiveAlerts().then(currentAlerts => {
          setAlerts(currentAlerts);
        });
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [currentUser]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const threshold = (mapConfig?.idleTimeout || 60) * 60 * 1000;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (currentUser) {
        timeoutId = setTimeout(() => {
          handleLogout();
        }, threshold);
      }
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    if (currentUser) {
      events.forEach(e => window.addEventListener(e, resetTimer));
      resetTimer();
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [currentUser, mapConfig?.idleTimeout]);

  const handleResolveAlert = (id: string) => {
    mockResolveAlert(id);
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const handleLoginSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    setIsLoginOpen(false);
    setAdminTab(isMobile ? 'CATALOG' : 'DASHBOARD');
  };

  const handleLogout = () => {
    mockLogout();
    setCurrentUser(null);
    setIsLoginOpen(true);
  };

  const allTabs = [
    { id: 'DASHBOARD', label: 'Dashboard', short: 'Home', icon: LayoutDashboard, roles: ['LIBRARIAN', 'ADMINISTRATOR'] },
    { id: 'CIRCULATION', label: 'Circulation', short: 'Loans', icon: ArrowLeftRight, roles: ['LIBRARIAN', 'ADMINISTRATOR'] },
    { id: 'CATALOG', label: 'Catalog', short: 'Assets', icon: BookOpen, roles: ['LIBRARIAN', 'ADMINISTRATOR'] },
    { id: 'PATRONS', label: 'Patrons', short: 'Users', icon: Users, roles: ['LIBRARIAN', 'ADMINISTRATOR'] },
    { id: 'REPORTS', label: 'Analytics', short: 'Data', icon: TrendingUp, roles: ['LIBRARIAN', 'ADMINISTRATOR'] },
    { id: 'MAP', label: 'Map Layout', short: 'Map', icon: MapPin, roles: ['LIBRARIAN', 'ADMINISTRATOR'] },
    { id: 'CALENDAR', label: 'Calendar', short: 'Dates', icon: Calendar, roles: ['LIBRARIAN', 'ADMINISTRATOR'] },
    { id: 'MATRIX', label: 'Policies', short: 'Rules', icon: Settings, roles: ['ADMINISTRATOR'] },
    { id: 'SETTINGS', label: 'System', short: 'Core', icon: ShieldCheck, roles: ['ADMINISTRATOR'] },
    { id: 'HELP', label: 'Help', short: 'Guide', icon: HelpCircle, roles: ['LIBRARIAN', 'ADMINISTRATOR'] },
  ];

  const filteredTabs = currentUser ? allTabs.filter(tab => tab.roles.includes(currentUser.role)) : [];

  return (
    <div className={`min-h-screen ${styles.globalBg} ${styles.bodyText} flex flex-col font-sans transition-colors duration-500`}>
      <SystemNavbar
        mode="ADMIN"
        setMode={() => {}}
        currentUser={currentUser}
        mapConfig={mapConfig}
        alerts={alerts}
        onResolveAlert={handleResolveAlert}
        onLogout={handleLogout}
        isMobile={isMobile}
        onOpenLogin={() => setIsLoginOpen(true)}
        onOpenCredentials={() => setShowCredentialsModal(true)}
        onSelectTab={(tab) => setAdminTab(tab)}
      />

      {!isMobile && currentUser && (
        <div className={`${styles.subnavBg} border-b ${styles.navBorder} z-40 sticky top-16 lg:top-20 print:hidden shadow-sm`}>
          <div className="max-w-[1800px] mx-auto px-6 flex justify-center h-14">
            {filteredTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setAdminTab(tab.id as AdminTab)}
                className={`px-6 py-2 flex items-center gap-2.5 uppercase tracking-widest text-[10px] font-black transition-all relative group h-full ${adminTab === tab.id ? styles.subnavActive : `${styles.subnavIdle} hover:text-slate-800`}`}
              >
                <tab.icon className={`h-4 w-4 transition-transform ${adminTab === tab.id ? 'scale-110' : 'group-hover:scale-110'}`} />
                {tab.label}
                {adminTab === tab.id && (
                  <div className={`absolute bottom-0 left-0 right-0 h-1 ${styles.subnavIndicator} rounded-t-full`}></div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {isLoginOpen && <LoginModal onClose={() => setIsLoginOpen(false)} onLoginSuccess={handleLoginSuccess} />}

      {showCredentialsModal && currentUser && (() => {
        const token = localStorage.getItem('thomian_session_token') || '—';
        return (
          <SessionKeysModal
            user={currentUser}
            token={token}
            onClose={() => setShowCredentialsModal(false)}
          />
        );
      })()}

      <main className="flex-1 overflow-hidden relative">
        {currentUser && (
          <div className={`h-full overflow-y-auto scrollbar-thin ${isMobile ? 'pb-24' : ''}`}>
            <div className={styles.headingText}>
              {adminTab === 'DASHBOARD' && <LibrarianDashboard onSelectTab={setAdminTab} onSelectCirculation={(mode) => { setCircInitialMode(mode); setAdminTab('CIRCULATION'); }} />}
              {adminTab === 'CIRCULATION' && <CirculationDesk key={circInitialMode} initialMode={circInitialMode} />}
              {adminTab === 'CATALOG' && <CatalogingDesk />}
              {adminTab === 'PATRONS' && <PatronDashboard onRefreshConfig={refreshConfig} />}
              {adminTab === 'REPORTS' && <ReportsDashboard />}
              {adminTab === 'MATRIX' && <CirculationMatrix />}
              {adminTab === 'MAP' && <MapCreator onRefreshConfig={refreshConfig} />}
              {adminTab === 'CALENDAR' && <EventCalendar />}
              {adminTab === 'SETTINGS' && <SystemSettings onRefreshConfig={refreshConfig} />}
              {adminTab === 'HELP' && <HelpGuide />}
              {adminTab === 'PROFILE' && <ProfileSettings user={currentUser} onUpdate={setCurrentUser} />}
            </div>
          </div>
        )}
      </main>

      {isMobile && currentUser && (
        <MobileTaskBar activeTab={adminTab} setActiveTab={setAdminTab} onLogout={handleLogout} />
      )}

      {!isMobile && (
        <div className="flex bg-white border-t border-slate-200 px-8 py-4 text-[9px] text-slate-500 justify-between items-center font-black uppercase tracking-[0.25em] shrink-0 print:hidden shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-8">
            <span className="flex items-center gap-2.5"><div className="h-2 w-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-200"></div>Core Status: <span className="text-slate-800">Synchronized</span></span>
            <div className="h-4 w-px bg-slate-100"></div>
            <span className="flex items-center gap-2.5">{networkStatus.isLan ? <Wifi className="h-3.5 w-3.5 text-emerald-500" /> : <Cloud className="h-3.5 w-3.5 text-slate-400" />}Sync Channel: <span className={networkStatus.isLan ? 'text-emerald-600' : 'text-slate-400'}>{networkStatus.mode}</span></span>
          </div>
          <div className="flex gap-10">
            <span className="flex items-center gap-2.5 text-slate-400 hover:text-slate-800 transition-colors cursor-help"><ScanLine className="h-3.5 w-3.5" /> Peripheral Interface Ready</span>
            <span className="text-[8px] opacity-40 font-bold">Rel 4.8.2</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
