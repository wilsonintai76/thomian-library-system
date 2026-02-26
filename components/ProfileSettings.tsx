
import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Shield, Save, CheckCircle, IdCard, Key, Eye, EyeOff, Loader2, UserCircle } from 'lucide-react';
import { AuthUser } from '../types';
import { mockUpdateAuthUser } from '../services/api';

interface ProfileSettingsProps {
    user: AuthUser;
    onUpdate: (updatedUser: AuthUser) => void;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ user, onUpdate }) => {
    const [formData, setFormData] = useState<AuthUser>(user);
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showToken, setShowToken] = useState(false);

    // Sync state if user prop changes
    useEffect(() => {
        setFormData(user);
    }, [user]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await mockUpdateAuthUser(formData);
            onUpdate(formData);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (err) {
            alert("Failed to update profile.");
        } finally {
            setIsSaving(false);
        }
    };

    const avatarColors = [
        'bg-slate-900', 'bg-blue-600', 'bg-emerald-600', 'bg-rose-600', 'bg-indigo-600', 'bg-purple-600'
    ];

    return (
        <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-10 animate-fade-in-up pb-32">
            <div className="flex items-center gap-5 border-b border-slate-200 pb-8">
                <div className={`h-20 w-20 ${formData.avatar_color || 'bg-slate-900'} rounded-[1.5rem] flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-slate-200`}>
                    {formData.full_name.charAt(0)}
                </div>
                <div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight">Account Hub</h2>
                    <p className="text-slate-500 font-medium">Librarian Entity: <span className="text-blue-600 font-bold">@{formData.username}</span></p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

                {/* Form Column */}
                <div className="lg:col-span-2">
                    <form onSubmit={handleSave} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8">
                        <div className="space-y-6">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <User className="h-4 w-4" /> Personal Information
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Display Name</label>
                                    <input
                                        type="text"
                                        value={formData.full_name}
                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner"
                                        placeholder="Full Name"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Work Email</label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                            <input
                                                type="email"
                                                value={formData.email || ''}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 pr-5 py-4 font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner"
                                                placeholder="email@stthomas.edu"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Mobile / Extension</label>
                                        <div className="relative">
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                            <input
                                                type="tel"
                                                value={formData.phone || ''}
                                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 pr-5 py-4 font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner"
                                                placeholder="+1 (555) 000-0000"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <UserCircle className="h-4 w-4" /> Identity Customization
                            </h3>
                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Avatar Theme</label>
                                <div className="flex gap-3">
                                    {avatarColors.map(color => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, avatar_color: color })}
                                            className={`h-10 w-10 rounded-xl transition-all ${color} ${formData.avatar_color === color ? 'ring-4 ring-blue-100 scale-110 border-2 border-white' : 'opacity-60 hover:opacity-100'}`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                                Last local update: {new Date().toLocaleTimeString()}
                            </p>
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all flex items-center gap-3 active:scale-95"
                            >
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : showSuccess ? <CheckCircle className="h-4 w-4 text-emerald-400" /> : <Save className="h-4 w-4" />}
                                {showSuccess ? "Changes Applied" : "Sync Profile"}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Sidebar Column */}
                <div className="space-y-8">
                    <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                        <Shield className="absolute -top-10 -right-10 h-32 w-32 opacity-10 rotate-12 group-hover:rotate-0 transition-transform" />
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-6 flex items-center gap-2">
                            <IdCard className="h-4 w-4" /> System Identity
                        </h4>

                        <div className="space-y-6 relative z-10">
                            <div>
                                <p className="text-[9px] font-black text-white/40 uppercase mb-1">Global User ID</p>
                                <p className="text-sm font-mono font-bold truncate bg-white/5 p-2 rounded-lg border border-white/5">{formData.id}</p>
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-white/40 uppercase mb-1">Assigned Privilege</p>
                                <div className="flex items-center gap-2 text-sm font-black">
                                    <Shield className="h-4 w-4 text-amber-500 fill-current" />
                                    {formData.role}
                                </div>
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-white/40 uppercase mb-1">Session Protocol</p>
                                <div className="bg-white/5 p-3 rounded-2xl border border-white/5 flex items-center justify-between">
                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-[10px] font-mono truncate mr-4">
                                            {showToken ? localStorage.getItem('thomian_auth_token') : '••••••••••••••••••••'}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowToken(!showToken)}
                                        className="text-white/40 hover:text-white transition-colors"
                                    >
                                        {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-100 p-6 rounded-3xl">
                        <div className="flex gap-4 items-start">
                            <div className="bg-blue-600 p-2 rounded-lg shrink-0">
                                <Key className="h-4 w-4 text-white" />
                            </div>
                            <div>
                                <h5 className="text-xs font-black text-blue-800 uppercase tracking-widest mb-1">Security Audit</h5>
                                <p className="text-[10px] text-blue-600 leading-relaxed font-medium">
                                    Passwords are managed via School Directory Services. Contact the IT Department to reset your portal credentials.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileSettings;
