
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, GraduationCap, X, Save, Loader2, BookOpen } from 'lucide-react';
import { LibraryClass } from '../../types';
import { mockGetClasses, mockAddClass, mockDeleteClass } from '../../services/api';

const ClassManager: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [classes, setClasses] = useState<LibraryClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [newClassName, setNewClassName] = useState('');
  const [newGrade, setNewGrade] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    setLoading(true);
    const data = await mockGetClasses();
    setClasses(data);
    setLoading(false);
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName) return;
    setIsSubmitting(true);
    try {
      await mockAddClass({ name: newClassName, grade_level: newGrade });
      setNewClassName('');
      setNewGrade('');
      await loadClasses();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClass = async (id: string) => {
    if (!confirm("Are you sure you want to delete this class? Patrons currently assigned to it will retain the name text, but it won't be in the dropdown for new registrations.")) return;
    await mockDeleteClass(id);
    await loadClasses();
  };

  return (
    <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-fade-in-up border border-slate-100 flex flex-col max-h-[80vh]">
        <div className="bg-slate-900 p-8 text-white relative shrink-0">
          <button onClick={onClose} className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors">
            <X className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase tracking-tight">Class Registry</h3>
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">School Structure Management</p>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-8 overflow-y-auto flex-1 scrollbar-thin">
          <form onSubmit={handleAddClass} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Class Name</label>
              <input
                type="text"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                placeholder="e.g. Grade 11-B"
                className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-blue-500"
                required
              />
            </div>
            <div className="w-24">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Grade</label>
              <input
                type="text"
                value={newGrade}
                onChange={(e) => setNewGrade(e.target.value)}
                placeholder="11"
                className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-blue-500 text-center"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 text-white px-6 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add
            </button>
          </form>

          <div className="space-y-3">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Managed Entities</h4>
            {loading ? (
              <div className="text-center py-10"><Loader2 className="h-8 w-8 text-blue-500 animate-spin mx-auto" /></div>
            ) : classes.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 italic text-sm">No classes registered yet.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {classes.map(cls => (
                  <div key={cls.id} className="bg-white border-2 border-slate-100 p-4 rounded-2xl flex items-center justify-between group hover:border-blue-100 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black text-xs">
                        {cls.grade_level || '??'}
                      </div>
                      <span className="font-bold text-slate-700 uppercase">{cls.name}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteClass(cls.id)}
                      className="p-2 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100">
          <p className="text-[9px] text-slate-400 font-bold uppercase leading-relaxed text-center">
            Standardizing classes ensures clean data reporting and simplifies bulk student promotion at end-of-year.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ClassManager;
