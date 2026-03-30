
import React, { useState, useEffect } from 'react';
import { X, Settings, Mail, Phone, Save, RefreshCw, UserCircle, Key, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Patron } from '../../types';

interface ProfileEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    patron: Patron;
    onSave: (updatedPatron: Patron) => Promise<void>;
}

const ProfileEditModal: React.FC<ProfileEditModalProps> = ({ isOpen, onClose, patron, onSave }) => {
    const [editName, setEditName] = useState(patron.full_name);
    const [editEmail, setEditEmail] = useState(patron.email || '');
    const [editPhone, setEditPhone] = useState(patron.phone || '');
    const [editPin, setEditPin] = useState(patron.pin || '');
    const [showPin, setShowPin] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    // Sync local state when modal opens or patron changes
    useEffect(() => {
        if (isOpen) {
            setEditName(patron.full_name);
            setEditEmail(patron.email || '');
            setEditPhone(patron.phone || '');
            setEditPin(patron.pin || '');
        }
    }, [isOpen, patron]);

    if (!isOpen) return null;

    const handleUpdateProfile = async () => {
        if (!editName.trim()) return;
        if (editPin.length !== 4) {
            alert("Security PIN must be 4 digits.");
            return;
        }
        setIsUpdating(true);
        try {
            const updated = { 
                ...patron, 
                full_name: editName.trim(), 
                email: editEmail.trim(), 
                phone: editPhone.trim(),
                pin: editPin
            };
            await onSave(updated);
            onClose();
        } catch (error) {
            alert("Update failed. Please try again.");
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6">
            <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-fade-in-up">
                <div className="bg-slate-900 p-8 text-white text-center relative">
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white transition-colors"
                    >
                        <X className="h-6 w-6" />
                    </button>
                    <div className="h-16 w-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-blue-900/50">
                        <UserCircle className="h-8 w-8" />
                    </div>
                    <h3 className="text-2xl font-black uppercase tracking-tight">Identity Hub</h3>
                    <p className="text-slate-400 text-xs mt-1 uppercase tracking-widest font-black">Personal Data Management</p>
                </div>
                <div className="p-8 space-y-6 overflow-y-auto max-h-[60vh] scrollbar-thin">
                    <div className="space-y-4">
                        <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 border-b border-slate-100 pb-1">Primary Information</h4>
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Display Name</label>
                            <input 
                                type="text" 
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 font-bold text-slate-700 outline-none focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Email Notification</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                                <input 
                                    type="email" 
                                    value={editEmail}
                                    onChange={(e) => setEditEmail(e.target.value)}
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 pl-12 font-bold text-slate-700 outline-none focus:border-blue-500"
                                    placeholder="p.name@school.edu"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Mobile Number</label>
                            <div className="relative">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                                <input 
                                    type="tel" 
                                    value={editPhone}
                                    onChange={(e) => setEditPhone(e.target.value)}
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 pl-12 font-bold text-slate-700 outline-none focus:border-blue-500"
                                    placeholder="+1..."
                                />
                            </div>
                        </div>

                        <h4 className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em] pt-4 mb-2 border-b border-slate-100 pb-1">Security Protocol</h4>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-blue-50">
                            <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">Kiosk Secret PIN</label>
                            <div className="relative">
                                <Key className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-200" />
                                <input 
                                    type={showPin ? "text" : "password"} 
                                    maxLength={4}
                                    value={editPin}
                                    onChange={(e) => setEditPin(e.target.value.replace(/\D/g, ''))}
                                    className="w-full bg-white border-2 border-blue-100 rounded-xl p-4 pl-12 font-mono font-black text-blue-700 outline-none focus:border-blue-500"
                                    placeholder="••••"
                                />
                                <button 
                                    type="button" 
                                    onClick={() => setShowPin(!showPin)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-blue-500"
                                >
                                    {showPin ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                            <p className="text-[8px] text-slate-400 mt-2 font-bold uppercase tracking-tight">Used for secure workstation access.</p>
                        </div>
                    </div>
                </div>
                <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-3 pt-6">
                    <button onClick={onClose} className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all">Discard</button>
                    <button 
                        onClick={handleUpdateProfile} 
                        disabled={isUpdating || !editName.trim()}
                        className="flex-1 py-4 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        {isUpdating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" /> Save Hub</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProfileEditModal;
