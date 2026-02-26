
import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, ShieldCheck, User, Key, X, IdCard, Wifi, Cloud, ScanLine, ArrowLeftRight, BookOpen, Users, TrendingUp, MapPin, Calendar, Settings, HelpCircle } from 'lucide-react';
import { ViewMode, AdminTab, SystemAlert, AuthUser, MapConfig } from './types';
import KioskHome from './components/KioskHome';
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

const App: React.FC = () => {
  const [mode, setMode] = useState<ViewMode>('KIOSK');
  const [adminTab, setAdminTab] = useState<AdminTab>('DASHBOARD');
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
        setMode('ADMIN');
        if (window.innerWidth < 768) setAdminTab('CATALOG');
      }
    };
    init();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (mode === 'ADMIN') {
        mockGetActiveAlerts().then(currentAlerts => {
          setAlerts(currentAlerts);
        });
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [mode]);

  const handleResolveAlert = (id: string) => {
    mockResolveAlert(id);
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const handleLoginSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    setIsLoginOpen(false);
    setMode('ADMIN');
    setAdminTab(isMobile ? 'CATALOG' : 'DASHBOARD');
  };

  const handleLogout = () => {
    mockLogout();
    setCurrentUser(null);
    setMode('KIOSK');
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
        mode={mode}
        setMode={setMode}
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

      {!isMobile && mode === 'ADMIN' && currentUser && (
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

      <main className="flex-1 overflow-hidden relative">
        {mode === 'KIOSK' ? <KioskHome /> : (
          <div className={`h-full overflow-y-auto scrollbar-thin ${isMobile ? 'pb-24' : ''}`}>
            <div className={styles.headingText}>
              {adminTab === 'DASHBOARD' && <LibrarianDashboard onSelectTab={setAdminTab} />}
              {adminTab === 'CIRCULATION' && <CirculationDesk />}
              {adminTab === 'CATALOG' && <CatalogingDesk />}
              {adminTab === 'PATRONS' && <PatronDashboard onRefreshConfig={refreshConfig} />}
              {adminTab === 'REPORTS' && <ReportsDashboard />}
              {adminTab === 'MATRIX' && <CirculationMatrix />}
              {adminTab === 'MAP' && <MapCreator onRefreshConfig={refreshConfig} />}
              {adminTab === 'CALENDAR' && <EventCalendar />}
              {adminTab === 'SETTINGS' && <SystemSettings onRefreshConfig={refreshConfig} />}
              {adminTab === 'HELP' && <HelpGuide />}
              {adminTab === 'PROFILE' && currentUser && <ProfileSettings user={currentUser} onUpdate={setCurrentUser} />}
            </div>
          </div>
        )}
      </main>

      {isMobile && mode === 'ADMIN' && currentUser && (
        <MobileTaskBar activeTab={adminTab} setActiveTab={setAdminTab} onLogout={handleLogout} />
      )}

      {mode === 'ADMIN' && !isMobile && (
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
