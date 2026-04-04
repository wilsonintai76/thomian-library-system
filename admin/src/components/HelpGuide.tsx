
import React, { useState } from 'react';
import { BookOpen, ArrowLeftRight, Settings, ScanLine, Printer, LayoutGrid, Calendar, HelpCircle, ChevronRight, Bookmark, AlertCircle, Search, CheckCircle, MapPin, Sparkles, Building2, MapPinned, Image as ImageIcon, Smartphone, ShieldCheck, Wallet, UserCheck, Zap, Server, RefreshCcw, Globe, Wifi, Cloud, Layers, Info, StickyNote } from 'lucide-react';

interface HelpTopic {
  id: string;
  title: string;
  icon: React.ElementType;
  description: string;
  content: React.ReactNode;
}

const HelpGuide: React.FC = () => {
  const [activeTopicId, setActiveTopicId] = useState<string>('CIRCULATION');

  const topics: HelpTopic[] = [
    {
      id: 'DASHBOARD',
      title: 'Librarian Dashboard',
      icon: LayoutGrid,
      description: 'Overview of system health and live activity.',
      content: (
        <div className="space-y-6">
          <section>
            <h3 className="text-xl font-bold text-slate-800 mb-3 flex items-center gap-2">
               Mission Control <Zap className="h-5 w-5 text-amber-500" />
            </h3>
            <p className="text-slate-600 mb-4">The Librarian Dashboard is your primary command center. It provides real-time insights into the library's operations.</p>
            <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600">
                <li><strong>Live Circulation Stream:</strong> Monitor every loan and return as it happens.</li>
                <li><strong>System Health:</strong> Real-time status of your database, printers, and scanners.</li>
                <li><strong>Quick Actions:</strong> Jump directly to Check-Out, Returns, or Cataloging from the dashboard.</li>
                <li><strong>KPIs:</strong> Track active loans, overdue risks, and total collection value at a glance.</li>
            </ul>
          </section>
        </div>
      )
    },
    {
      id: 'CIRCULATION',
      title: 'Circulation Desk',
      icon: ArrowLeftRight,
      description: 'How to issue, return, and manage book loans.',
      content: (
        <div className="space-y-6">
          <section>
            <h3 className="text-xl font-bold text-slate-800 mb-3">Checking Out Books</h3>
            <ol className="list-decimal pl-5 space-y-2 text-slate-600">
              <li>Navigate to the <strong>Circulation</strong> tab.</li>
              <li>Ensure the mode toggle is set to <strong>Check Out</strong>.</li>
              <li><strong>Scan Patron ID:</strong> Identification is required before items can be added.</li>
              <li><strong>Blocked Accounts:</strong> If a patron has overdue fines exceeding the matrix limit, checkout will be automatically restricted.</li>
            </ol>
          </section>
        </div>
      )
    },
    {
      id: 'STICKERS',
      title: 'Hardware & Printing',
      icon: StickyNote,
      description: 'Setup for A4 optimized labels and manual cutting.',
      content: (
        <div className="space-y-6">
          <section>
            <h3 className="text-xl font-bold text-slate-800 mb-3 flex items-center gap-2">
               A4 Optimized Grids <Printer className="h-5 w-5 text-blue-600" />
            </h3>
            <p className="text-slate-600 mb-4">Thomian Library is optimized for standard A4 and Photo Paper, maximizing efficiency for manual processing.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="font-bold text-blue-600 uppercase text-[10px] tracking-widest block mb-2">5-Up Label Grid</span>
                    <p className="text-xs text-slate-600 leading-relaxed">
                        Labels are arranged in a high-density 5-column grid. This fits standard **1.5" x 1" labels** perfectly on A4 sheets. 
                        <strong>Pro Tip:</strong> Use "Cut Sheet" mode to render dotted manual cut guides.
                    </p>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="font-bold text-emerald-600 uppercase text-[10px] tracking-widest block mb-2">Manual Cut Guides</span>
                    <p className="text-xs text-slate-600 leading-relaxed">
                        Every label and ID card in "Cut Mode" includes a **dotted gray border**. These are designed to assist librarians with precise manual cutting using scissors or paper trimmers.
                    </p>
                </div>
            </div>

            <h4 className="font-bold text-slate-800 mb-2">Essential Browser Settings:</h4>
            <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600">
                <li><strong>Margins:</strong> Set to **"None"** in the print dialog for perfect alignment.</li>
                <li><strong>Background Graphics:</strong> Must be **enabled** to print barcodes and card colors correctly.</li>
                <li><strong>Scale:</strong> Must be set to **"100%"** or "Default".</li>
            </ul>
          </section>
        </div>
      )
    },
    {
      id: 'PATRONS',
      title: 'Patron Management',
      icon: UserCheck,
      description: 'Registration, ID Cards, and identity management.',
      content: (
        <div className="space-y-6">
          <section>
            <h3 className="text-xl font-bold text-slate-800 mb-3 flex items-center gap-2">
               Identity Card Printing <Smartphone className="h-5 w-5 text-blue-600" />
            </h3>
            <p className="text-slate-600 mb-4">The system generates high-fidelity identification cards for every patron, optimized for printing on photo paper.</p>
            <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600">
                <li><strong>2-Column Layout:</strong> Cards are automatically tiled in 2 columns on A4 paper for maximum paper savings.</li>
                <li><strong>Durable Design:</strong> Cards include the Patron ID, Barcode, and Profile image to ensure multi-year durability.</li>
                <li><strong>Manual Trimming:</strong> Use the built-in manual cut guides (dotted lines) for accurate trimming after printing.</li>
            </ul>
          </section>
          <section>
            <h3 className="text-xl font-bold text-slate-800 mb-3 flex items-center gap-2">
               Registration Protocol <ShieldCheck className="h-5 w-5 text-emerald-600" />
            </h3>
            <p className="text-slate-600 mb-4">New patrons receive a unique ID and a secure 4-digit PIN. The PIN is required for account access at the Kiosk.</p>
          </section>
        </div>
      )
    },
    {
      id: 'CATALOG',
      title: 'Professional Cataloging',
      icon: BookOpen,
      description: 'Managing deep metadata and replacement values.',
      content: (
        <div className="space-y-6">
          <section>
            <h3 className="text-xl font-bold text-slate-800 mb-3 flex items-center gap-2">
              The Three-Section Editor <Layers className="h-5 w-5 text-blue-600" />
            </h3>
            <p className="text-slate-600 mb-4">The new editor aligns with Koha/MARC standards by grouping data into logical blocks:</p>
            <ul className="space-y-4">
              <li className="flex gap-4">
                <div className="h-8 w-8 bg-blue-100 text-blue-600 rounded flex items-center justify-center shrink-0 font-black text-xs">1</div>
                <div>
                  <span className="font-bold text-slate-800">Descriptive Metadata:</span>
                  <p className="text-xs text-slate-500">Title, Author, Series, Edition, and Language. Essential for discovery.</p>
                </div>
              </li>
              <li className="flex gap-4">
                <div className="h-8 w-8 bg-emerald-100 text-emerald-600 rounded flex items-center justify-center shrink-0 font-black text-xs">2</div>
                <div>
                  <span className="font-bold text-slate-800">Acquisition & Finance:</span>
                  <p className="text-xs text-slate-500">Replacement Value (Price) and Vendor. The price is used automatically if the book is marked "LOST" at the Financial Desk.</p>
                </div>
              </li>
              <li className="flex gap-4">
                <div className="h-8 w-8 bg-slate-100 text-slate-600 rounded flex items-center justify-center shrink-0 font-black text-xs">3</div>
                <div>
                  <span className="font-bold text-slate-800">Holdings & Classification:</span>
                  <p className="text-xs text-slate-500">DDC, Call Number, and Shelf Location. Used by the Wayfinder Kiosk to guide students.</p>
                </div>
              </li>
            </ul>
          </section>
          <section>
            <h3 className="text-xl font-bold text-slate-800 mb-3 flex items-center gap-2">
               Undo Deletions <RefreshCcw className="h-5 w-5 text-amber-500" />
            </h3>
            <p className="text-slate-600 mb-4">Accidental deletions of catalog records can be reversed within a 5-second window.</p>
            <p className="text-sm text-slate-600">Look for the "Undo" notification bar at the bottom of the screen immediately after deleting a book.</p>
          </section>
        </div>
      )
    },
    {
      id: 'FINANCIAL',
      title: 'Financial Desk',
      icon: Wallet,
      description: 'Audit trails and cash management.',
      content: (
        <div className="space-y-6">
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex gap-3 mb-6">
            <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
            <p className="text-sm text-emerald-800 font-medium">
              <strong>Audit Transparency:</strong> All ledger entries record the processing librarian's name and a timestamp. 
            </p>
          </div>
          <section>
            <h3 className="text-xl font-bold text-slate-800 mb-3">Assess Loss Protocol</h3>
            <p className="text-slate-600">When a book is marked as Lost, the system fetches the <strong>Replacement Value</strong> defined in the Catalog and adds it to the patron's balance as a specialized assessment.</p>
          </section>
        </div>
      )
    },
    {
      id: 'WAYFINDER',
      title: 'Map & AI Vision',
      icon: MapPin,
      description: 'Creating digital twins with Gemini AI.',
      content: (
        <div className="space-y-6">
          <section>
            <h3 className="text-xl font-bold text-slate-800 mb-3 flex items-center gap-2">
              AI Vision Analysis <Sparkles className="h-5 w-5 text-amber-500" />
            </h3>
            <p className="text-slate-600">The <strong>AI Auto-Map</strong> feature uses Gemini to identify shelving units from blueprint uploads, assigning DDC ranges automatically to new zones.</p>
          </section>
        </div>
      )
    },
    {
      id: 'SYSTEM',
      title: 'System & Release',
      icon: RefreshCcw,
      description: 'Versioning and infrastructure status.',
      content: (
        <div className="space-y-6">
          <section>
            <h3 className="text-xl font-bold text-slate-800 mb-3 flex items-center gap-2">
              Grouped Versioning <RefreshCcw className="h-5 w-5 text-blue-600" />
            </h3>
            <p className="text-slate-600 mb-4">The Thomian Library System uses a **Grouped Versioning Strategy** (e.g., v3.5.x) for the entire monorepo.</p>
            <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600">
                <li><strong>Synchronization:</strong> All modules (Admin, Kiosk, and Backend) share the same version number to guarantee compatibility.</li>
                <li><strong>Release Markers:</strong> Every major fix or feature update triggers a new version bump across all packages.</li>
                <li><strong>CDN Caching:</strong> Version bumps automatically refresh service worker cache keys to ensure you are always running the latest code.</li>
            </ul>
          </section>
          <section>
            <h3 className="text-xl font-bold text-slate-800 mb-3 flex items-center gap-2">
              High Availability <Globe className="h-5 w-5 text-emerald-600" />
            </h3>
            <p className="text-slate-600 text-sm">Our infrastructure is powered by **Cloudflare Workers & Pages**, providing millisecond response times and offline-first PWA capabilities via Vite.</p>
          </section>
        </div>
      )
    }
  ];

  const activeContent = topics.find(t => t.id === activeTopicId);

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto h-full flex flex-col md:flex-row gap-8 animate-fade-in-up">
      <div className="w-full md:w-80 shrink-0 space-y-4">
         <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2 tracking-tight">
               <HelpCircle className="h-7 w-7 text-blue-600" />
               Help & Documentation
            </h2>
            <p className="text-slate-500 text-sm font-medium">Librarian Operations Handbook</p>
         </div>
         <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
            {topics.map(topic => (
               <button
                 key={topic.id}
                 onClick={() => setActiveTopicId(topic.id)}
                 className={`w-full text-left p-5 flex items-center gap-4 border-b border-slate-100 last:border-0 transition-all
                    ${activeTopicId === topic.id ? 'bg-blue-600 text-white shadow-inner' : 'hover:bg-slate-50 text-slate-600'}
                 `}
               >
                  <div className={`p-2 rounded-xl ${activeTopicId === topic.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      <topic.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                      <p className="font-black text-xs uppercase tracking-widest">{topic.title}</p>
                      <p className={`text-[10px] truncate ${activeTopicId === topic.id ? 'text-blue-100' : 'text-slate-400'}`}>{topic.description}</p>
                  </div>
                  {activeTopicId === topic.id && <ChevronRight className="h-4 w-4 ml-auto" />}
               </button>
            ))}
         </div>
      </div>
      <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl p-10 h-fit min-h-[700px]">
          {activeContent ? (
              <div className="animate-fade-in">
                  <div className="flex items-center gap-5 mb-8 pb-8 border-b border-slate-100">
                      <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
                          <activeContent.icon className="h-10 w-10" />
                      </div>
                      <div>
                          <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">{activeContent.title}</h2>
                          <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">{activeContent.description}</p>
                      </div>
                  </div>
                  <div className="prose prose-slate max-w-none prose-h3:text-slate-800 prose-p:text-slate-600 prose-p:font-medium">
                      {activeContent.content}
                  </div>
              </div>
          ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 py-32">
                  <Bookmark className="h-20 w-20 mb-6 opacity-10" />
                  <p className="text-xl font-black uppercase tracking-tighter opacity-20">Select a handbook chapter</p>
              </div>
          )}
      </div>
    </div>
  );
};

export default HelpGuide;
