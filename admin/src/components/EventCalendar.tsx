
import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, CalendarOff, GraduationCap, Users, Lightbulb, Info, AlertTriangle, Save, X } from 'lucide-react';
import { mockGetEvents, mockAddEvent } from '../services/api';
import { LibraryEvent } from '../types';

const EventCalendar: React.FC = () => {
    const [events, setEvents] = useState<LibraryEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    // Form State
    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [type, setType] = useState<LibraryEvent['type']>('GENERAL');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = () => {
        mockGetEvents().then(data => {
            setEvents(data);
            setLoading(false);
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !date) return;

        setIsSubmitting(true);
        try {
            await mockAddEvent({
                title,
                date,
                type,
                description
            });
            // Reset form
            setTitle('');
            setDate('');
            setType('GENERAL');
            setDescription('');
            setShowForm(false);
            fetchEvents();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getEventMeta = (type: LibraryEvent['type']) => {
        switch (type) {
            case 'HOLIDAY':
                return { icon: <CalendarOff className="h-5 w-5" />, color: 'bg-red-50 text-red-700 border-red-200', label: 'Holiday (Closed)' };
            case 'EXAM':
                return { icon: <GraduationCap className="h-5 w-5" />, color: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Exam' };
            case 'WORKSHOP':
                return { icon: <Lightbulb className="h-5 w-5" />, color: 'bg-purple-50 text-purple-700 border-purple-200', label: 'Workshop' };
            case 'CLUB':
                return { icon: <Users className="h-5 w-5" />, color: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Club' };
            default:
                return { icon: <Info className="h-5 w-5" />, color: 'bg-blue-50 text-blue-700 border-blue-200', label: 'General' };
        }
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto h-full flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Calendar className="h-6 w-6 text-slate-600" />
                        School Year Calendar
                    </h2>
                    <p className="text-slate-500">Manage holidays and events. <span className="font-bold text-slate-700">Holidays</span> automatically extend loan due dates.</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-blue-700 flex items-center gap-2 transition-all"
                >
                    {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    {showForm ? 'Cancel' : 'Add Event'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Column 1: Add Event Form */}
                {showForm && (
                    <div className="lg:col-span-1 animate-fade-in-up">
                        <div className="bg-white p-6 rounded-xl border border-blue-200 shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
                            <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                                Create New Entry
                            </h3>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Event Title</label>
                                    <input
                                        type="text"
                                        required
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="w-full border-slate-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                                        placeholder="e.g., Deepavali Holiday"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="w-full border-slate-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Event Type</label>
                                    <select
                                        value={type}
                                        onChange={(e) => setType(e.target.value as any)}
                                        className="w-full border-slate-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                                    >
                                        <option value="GENERAL">General Event</option>
                                        <option value="HOLIDAY">Holiday (Library Closed)</option>
                                        <option value="EXAM">Exam Period</option>
                                        <option value="CLUB">Club Activity</option>
                                        <option value="WORKSHOP">Workshop</option>
                                    </select>
                                    {type === 'HOLIDAY' && (
                                        <div className="mt-2 text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200 flex items-start gap-2">
                                            <AlertTriangle className="h-4 w-4 shrink-0" />
                                            <span>Selecting <strong>Holiday</strong> will prevent due dates from falling on this day in the Circulation Matrix.</span>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Description (Optional)</label>
                                    <textarea
                                        rows={3}
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="w-full border-slate-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                                        placeholder="Additional details..."
                                    />
                                </div>

                                <div className="pt-2 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full bg-slate-900 text-white py-2 rounded-md font-bold hover:bg-slate-800 disabled:opacity-70 flex justify-center items-center gap-2"
                                    >
                                        {isSubmitting ? 'Saving...' : <><Save className="h-4 w-4" /> Save to Calendar</>}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Column 2: Event List */}
                <div className={`${showForm ? 'lg:col-span-2' : 'lg:col-span-3'} transition-all`}>
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="font-bold text-slate-700">Upcoming Schedule</h3>
                            <span className="text-xs font-bold bg-slate-200 text-slate-600 px-2 py-1 rounded-full">{events.length} Items</span>
                        </div>

                        {loading ? (
                            <div className="p-12 text-center text-slate-400">Loading calendar...</div>
                        ) : events.length === 0 ? (
                            <div className="p-12 text-center text-slate-400 italic">No events scheduled.</div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {events.map((ev) => {
                                    const meta = getEventMeta(ev.type);
                                    const dateObj = new Date(ev.date);
                                    return (
                                        <div key={ev.id} className="p-5 flex items-start gap-5 hover:bg-slate-50 group transition-colors">
                                            {/* Date Box */}
                                            <div className="flex flex-col items-center justify-center w-16 h-16 bg-white border border-slate-200 rounded-lg shadow-sm shrink-0">
                                                <span className="text-xs font-bold text-slate-500 uppercase">{dateObj.toLocaleString('default', { month: 'short' })}</span>
                                                <span className="text-2xl font-bold text-slate-800">{dateObj.getDate()}</span>
                                            </div>

                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wide ${meta.color}`}>
                                                        {meta.icon} {meta.label}
                                                    </span>
                                                    <span className="text-xs text-slate-400 font-medium">
                                                        {dateObj.toLocaleDateString('default', { weekday: 'long' })}
                                                    </span>
                                                </div>
                                                <h4 className="text-lg font-bold text-slate-800">{ev.title}</h4>
                                                <p className="text-slate-500 text-sm mt-1">{ev.description || "No description provided."}</p>
                                            </div>

                                            <button className="text-slate-300 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
                                                <Trash2 className="h-5 w-5" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EventCalendar;
