
import React, { useState, useEffect } from 'react';
import { Settings, Users, Book, Clock, AlertTriangle, Calculator, Calendar, CalendarOff, ArrowRight, Save, X, Edit, Loader2, CheckCircle2, Info } from 'lucide-react';
import { CirculationRule, PatronGroup, LibraryEvent } from '../types';
import { mockGetEvents, mockGetCirculationRules, mockUpdateCirculationRule } from '../services/api';

const CirculationMatrix: React.FC = () => {
  // Rules State
  const [rules, setRules] = useState<CirculationRule[]>([]);
  const [loading, setLoading] = useState(true);

  // Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<CirculationRule>>({});
  const [saving, setSaving] = useState(false);

  // Simulator State
  const [simPatron, setSimPatron] = useState<PatronGroup>('STUDENT');
  const [simMaterial, setSimMaterial] = useState<'REGULAR' | 'REFERENCE'>('REGULAR');
  const [activeRule, setActiveRule] = useState<CirculationRule | null>(null);

  // Date Calculation State
  const [baseDueDate, setBaseDueDate] = useState<string>('');
  const [finalDueDate, setFinalDueDate] = useState<string>('');
  const [extensionReason, setExtensionReason] = useState<string | null>(null);
  const [holidays, setHolidays] = useState<LibraryEvent[]>([]);

  // 1. Fetch Data on Mount
  useEffect(() => {
    Promise.all([mockGetCirculationRules(), mockGetEvents()]).then(([fetchedRules, fetchedEvents]) => {
      setRules(fetchedRules);
      setHolidays(fetchedEvents.filter(e => e.type === 'HOLIDAY' || e.type === 'EXAM'));
      setLoading(false);
    });
  }, []);

  // 2. Calculation Logic
  useEffect(() => {
    const rule = rules.find(r => r.patron_group === simPatron && r.material_type === simMaterial);
    setActiveRule(rule || null);

    if (rule && rule.loan_days > 0) {
      const today = new Date();
      const rawDate = new Date(today);
      rawDate.setDate(today.getDate() + rule.loan_days);
      setBaseDueDate(rawDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

      let checkDate = new Date(rawDate);
      let reason = null;
      let daysAdded = 0;
      let isClosed = true;

      while (isClosed && daysAdded < 30) {
        const dateStr = checkDate.toISOString().split('T')[0];
        const dayOfWeek = checkDate.getDay();
        const holidayMatch = holidays.find(h => h.date === dateStr);

        if (holidayMatch) {
          checkDate.setDate(checkDate.getDate() + 1);
          reason = `Holiday: ${holidayMatch.title}`;
          daysAdded++;
        } else if (dayOfWeek === 0 || dayOfWeek === 6) {
          checkDate.setDate(checkDate.getDate() + 1);
          if (!reason) reason = "Weekend Closure";
          daysAdded++;
        } else {
          isClosed = false;
        }
      }

      setFinalDueDate(checkDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
      setExtensionReason(reason);

    } else {
      setBaseDueDate('');
      setFinalDueDate('Check-out Disabled');
      setExtensionReason(null);
    }
  }, [simPatron, simMaterial, holidays, rules]);

  // Editing Handlers
  const startEditing = (rule: CirculationRule) => {
    setEditingId(rule.id);
    setEditForm(rule);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveRule = async () => {
    if (!editForm.id) return;
    setSaving(true);
    try {
      const updated = await mockUpdateCirculationRule(editForm as CirculationRule);
      setRules(prev => prev.map(r => r.id === updated.id ? updated : r));
      setEditingId(null);
    } catch (err) {
      console.error("Failed to save rule", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3 tracking-tighter">
            <Settings className="h-8 w-8 text-blue-600" />
            Circulation Policy Matrix
          </h2>
          <p className="text-slate-500 font-medium">Define business rules for loans, quotas, and penalty structures.</p>
        </div>
      </div>

      {/* Instruction Banner */}
      <div className="bg-blue-600 text-white rounded-2xl p-4 shadow-lg shadow-blue-100 flex items-start gap-4">
        <div className="bg-white/20 p-2 rounded-lg">
          <Info className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-sm">Policy Management Guide</p>
          <p className="text-xs text-blue-100 mt-0.5">To update a rule, click the <span className="font-black underline">Update Rule</span> button on the specific row. Changes are applied immediately to all future transactions.</p>
        </div>
      </div>

      {/* Rules Table */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden relative">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/50">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Patron Entity</th>
                <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Material</th>
                <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Loan Window</th>
                <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Cap</th>
                <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Daily Fine</th>
                <th scope="col" className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-20 text-center text-slate-400 italic">Accessing core policy engine...</td></tr>
              ) : rules.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-20 text-center text-slate-400 italic">No policies defined.</td></tr>
              ) : rules.map((rule) => (
                <tr key={rule.id} className={`transition-all duration-200 ${editingId === rule.id ? "bg-blue-50 ring-2 ring-blue-500 ring-inset z-10" : "hover:bg-slate-50/50"}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl border ${rule.patron_group === 'ADMINISTRATOR' ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                        <Users className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-sm font-black text-slate-900 block">{rule.patron_group}</span>
                        {editingId === rule.id && <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest animate-pulse">Drafting Changes</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">{rule.material_type}</span>
                  </td>

                  {/* EDITABLE FIELDS */}
                  {editingId === rule.id ? (
                    <>
                      <td className="px-6 py-4">
                        <div className="relative w-28">
                          <input
                            type="number"
                            className="w-full pl-3 pr-10 py-2 border-2 border-blue-200 rounded-xl text-sm font-black focus:border-blue-500 outline-none shadow-inner"
                            value={editForm.loan_days}
                            onChange={(e) => setEditForm({ ...editForm, loan_days: Math.max(0, parseInt(e.target.value)) })}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">DAYS</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="number"
                          className="w-20 p-2 border-2 border-blue-200 rounded-xl text-sm font-black focus:border-blue-500 outline-none shadow-inner"
                          value={editForm.max_items}
                          onChange={(e) => setEditForm({ ...editForm, max_items: Math.max(1, parseInt(e.target.value)) })}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="relative w-24">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">$</span>
                          <input
                            type="number" step="0.10"
                            className="w-full pl-6 pr-3 py-2 border-2 border-blue-200 rounded-xl text-sm font-black focus:border-blue-500 outline-none shadow-inner"
                            value={editForm.fine_per_day}
                            onChange={(e) => setEditForm({ ...editForm, fine_per_day: parseFloat(e.target.value) })}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={saveRule}
                            disabled={saving}
                            className="px-4 py-2 bg-green-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-green-700 shadow-md transition-all flex items-center gap-2"
                          >
                            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                            Save
                          </button>
                          <button
                            onClick={cancelEditing}
                            disabled={saving}
                            className="px-3 py-2 bg-slate-200 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-300 transition-all"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-slate-300" />
                          {rule.loan_days === 0 ? (
                            <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100 uppercase tracking-widest">No Loan</span>
                          ) : (
                            <span className="text-sm font-black text-slate-700">{rule.loan_days} Days</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-slate-700">
                        {rule.max_items} Items
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-amber-600 font-mono">
                        {rule.fine_per_day > 0 ? `$${rule.fine_per_day.toFixed(2)}` : 'FREE'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); startEditing(rule); }}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl font-black text-[10px] uppercase tracking-widest border border-blue-100 hover:bg-blue-600 hover:text-white transition-all shadow-sm group active:scale-95 cursor-pointer relative z-20"
                        >
                          <Edit className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
                          Update Rule
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-slate-900 px-8 py-5 flex items-center gap-3 text-xs text-slate-400">
          <AlertTriangle className="h-4 w-4 text-amber-500 animate-pulse" />
          <span className="font-bold uppercase tracking-widest text-[10px]">Strict Mode Active: </span>
          <span>All changes are logged for security audits. Policy Engine is synchronized with Thomian Core.</span>
        </div>
      </div>

      {/* Logic Simulator */}
      <div className="bg-slate-50 rounded-[2.5rem] p-8 md:p-10 border-2 border-slate-200 shadow-inner overflow-hidden relative">
        <div className="absolute top-0 right-0 p-10 opacity-5">
          <Calculator className="h-40 w-40" />
        </div>

        <div className="flex items-center gap-4 mb-8 relative z-10">
          <div className="bg-blue-600 p-3 rounded-2xl shadow-xl shadow-blue-200">
            <Calculator className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">Policy Sandbox</h3>
            <p className="text-slate-500 font-medium">Simulate how a loan transaction will behave under current rules.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 relative z-10">
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Target Patron Group</label>
              <select
                value={simPatron}
                onChange={(e) => setSimPatron(e.target.value as PatronGroup)}
                className="w-full bg-slate-50 border-2 border-slate-100 text-slate-800 font-black rounded-xl p-3 outline-none focus:border-blue-500 transition-all cursor-pointer"
              >
                <option value="STUDENT">Student</option>
                <option value="TEACHER">Teacher</option>
                <option value="LIBRARIAN">Librarian</option>
                <option value="ADMINISTRATOR">Administrator</option>
              </select>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Material Category</label>
              <select
                value={simMaterial}
                onChange={(e) => setSimMaterial(e.target.value as any)}
                className="w-full bg-slate-50 border-2 border-slate-100 text-slate-800 font-black rounded-xl p-3 outline-none focus:border-blue-500 transition-all cursor-pointer"
              >
                <option value="REGULAR">Standard Circulation</option>
                <option value="REFERENCE">Reference Material</option>
              </select>
            </div>
          </div>

          <div className="lg:col-span-8 bg-white rounded-3xl p-8 border-2 border-slate-200 shadow-xl flex flex-col justify-center">
            <div className="flex flex-col md:flex-row items-start justify-between gap-6">
              <div className="flex-1">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-4">Live Logic Result</p>
                {activeRule?.loan_days === 0 ? (
                  <div className="flex items-center gap-4 text-red-600 bg-red-50 p-6 rounded-2xl border border-red-100">
                    <AlertTriangle className="h-10 w-10 shrink-0" />
                    <div>
                      <span className="text-2xl font-black block leading-tight">Checkout Blocked</span>
                      <span className="text-xs font-bold text-red-400">Policy prevents this patron group from borrowing this material.</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-start gap-5">
                      <div className="bg-green-100 text-green-600 p-4 rounded-2xl">
                        <Calendar className="h-8 w-8" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Calculated Return Date</span>
                        <span className="text-3xl font-black text-slate-800 block tracking-tighter leading-none mt-1">{finalDueDate}</span>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="bg-green-600 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase">Auto-Calculated</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Based on {activeRule?.loan_days || 0} Day Term</span>
                        </div>
                      </div>
                    </div>

                    {extensionReason && (
                      <div className="flex items-center gap-3 text-amber-600 text-xs bg-amber-50 px-5 py-3 rounded-2xl border border-amber-100 animate-fade-in">
                        <CalendarOff className="h-5 w-5 shrink-0" />
                        <span className="font-bold">
                          Policy Adjusted: Original date ({baseDueDate}) was extended due to <span className="underline decoration-amber-300 decoration-2">{extensionReason}</span>.
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="w-full md:w-auto grid grid-cols-2 md:grid-cols-1 gap-3">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Fine/Day</span>
                  <span className="text-lg font-black text-slate-800 font-mono">${activeRule?.fine_per_day.toFixed(2) || '0.00'}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Max Quota</span>
                  <span className="text-lg font-black text-slate-800 font-mono">{activeRule?.max_items || 0}</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center gap-2 text-[10px] font-black text-slate-300 uppercase tracking-widest">
              <CheckCircle2 className="h-4 w-4" /> Policy Validation Successful • Engine Verified
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CirculationMatrix;
