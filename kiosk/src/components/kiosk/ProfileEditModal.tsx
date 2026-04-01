
import React, { useState, useEffect } from 'react';
import { X, Mail, Phone, Save, RefreshCw, UserCircle, Key, Eye, EyeOff, ShieldCheck, Lock, ChevronDown, ChevronUp, CheckCircle2, AlertCircle } from 'lucide-react';
import { Patron } from '../../types';

interface ProfileEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    patron: Patron;
    onSave: (updatedPatron: Patron) => Promise<void>;
}

const PinInput: React.FC<{
    label: string;
    value: string;
    onChange: (v: string) => void;
    show: boolean;
    onToggleShow: () => void;
    placeholder?: string;
}> = ({ label, value, onChange, show, onToggleShow, placeholder = '••••' }) => (
    <div>
        <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">{label}</label>
        <div className="relative">
            <Key className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-300 pointer-events-none" />
            <input
                type={show ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={4}
                value={value}
                onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-white border-2 border-blue-100 rounded-xl p-4 pl-11 pr-12 font-mono font-black text-xl tracking-[0.5em] text-blue-700 outline-none focus:border-blue-500 transition-colors"
                placeholder={placeholder}
            />
            <button
                type="button"
                onClick={onToggleShow}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-600 transition-colors"
            >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
        </div>
    </div>
);

const ProfileEditModal: React.FC<ProfileEditModalProps> = ({ isOpen, onClose, patron, onSave }) => {
    const [editName, setEditName] = useState(patron.full_name);
    const [editEmail, setEditEmail] = useState(patron.email || '');
    const [editPhone, setEditPhone] = useState(patron.phone || '');

    // PIN change flow — optional, collapsed by default
    const [changingPin, setChangingPin] = useState(false);
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [showNewPin, setShowNewPin] = useState(false);
    const [showConfirmPin, setShowConfirmPin] = useState(false);

    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setEditName(patron.full_name);
            setEditEmail(patron.email || '');
            setEditPhone(patron.phone || '');
            setChangingPin(false);
            setNewPin('');
            setConfirmPin('');
            setShowNewPin(false);
            setShowConfirmPin(false);
        }
    }, [isOpen, patron]);

    if (!isOpen) return null;

    const pinMismatch = changingPin && confirmPin.length > 0 && newPin !== confirmPin;
    const pinIncomplete = changingPin && (newPin.length !== 4 || confirmPin.length !== 4);
    const pinValid = !changingPin || (newPin.length === 4 && newPin === confirmPin);
    const canSave = editName.trim().length > 0 && pinValid && !isUpdating;

    const handleSave = async () => {
        if (!canSave) return;
        setIsUpdating(true);
        try {
            const updated: Patron = {
                ...patron,
                full_name: editName.trim(),
                email: editEmail.trim(),
                phone: editPhone.trim(),
                // pin stays as-is (current PIN for auth); new_pin carries the change request
                ...(changingPin ? { new_pin: newPin } : {}),
            };
            await onSave(updated);
            onClose();
        } catch {
            alert('Update failed. Please try again.');
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-fade-in-up flex flex-col max-h-[95vh]">

                {/* Header */}
                <div className="bg-slate-900 p-8 text-white text-center relative flex-shrink-0">
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                    <div className="h-16 w-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-blue-900/50">
                        <UserCircle className="h-8 w-8" />
                    </div>
                    <h3 className="text-2xl font-black uppercase tracking-tight">Identity Hub</h3>
                    <p className="text-slate-400 text-xs mt-1 uppercase tracking-widest font-black">Personal Data Management</p>
                </div>

                {/* Scrollable body */}
                <div className="p-6 space-y-5 overflow-y-auto flex-1 scrollbar-thin">

                    {/* Primary info */}
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-1">Primary Information</p>
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Display Name</label>
                        <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Email Notification</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 pointer-events-none" />
                            <input
                                type="email"
                                value={editEmail}
                                onChange={(e) => setEditEmail(e.target.value)}
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 pl-11 font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors"
                                placeholder="your@email.com"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Mobile Number</label>
                        <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 pointer-events-none" />
                            <input
                                type="tel"
                                value={editPhone}
                                onChange={(e) => setEditPhone(e.target.value)}
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 pl-11 font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors"
                                placeholder="01X-XXXXXXXX"
                            />
                        </div>
                    </div>

                    {/* Security Protocol */}
                    <p className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em] border-b border-slate-100 pb-1 pt-2">Security Protocol</p>

                    <div className="rounded-2xl border-2 border-blue-100 overflow-hidden">
                        {/* Toggle row */}
                        <button
                            type="button"
                            onClick={() => { setChangingPin(v => !v); setNewPin(''); setConfirmPin(''); }}
                            className="w-full flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 bg-blue-600 rounded-xl flex items-center justify-center shadow">
                                    <Lock className="h-4 w-4 text-white" />
                                </div>
                                <div className="text-left">
                                    <p className="text-xs font-black text-blue-800 uppercase tracking-widest">Change Kiosk PIN</p>
                                    <p className="text-[9px] text-blue-400 font-bold uppercase tracking-tight">4-digit security code</p>
                                </div>
                            </div>
                            {changingPin
                                ? <ChevronUp className="h-5 w-5 text-blue-500" />
                                : <ChevronDown className="h-5 w-5 text-blue-400" />
                            }
                        </button>

                        {/* Expanded PIN fields */}
                        {changingPin && (
                            <div className="p-4 bg-white space-y-4 border-t border-blue-100">
                                <PinInput
                                    label="New PIN"
                                    value={newPin}
                                    onChange={setNewPin}
                                    show={showNewPin}
                                    onToggleShow={() => setShowNewPin(v => !v)}
                                />
                                <PinInput
                                    label="Confirm New PIN"
                                    value={confirmPin}
                                    onChange={setConfirmPin}
                                    show={showConfirmPin}
                                    onToggleShow={() => setShowConfirmPin(v => !v)}
                                    placeholder="••••"
                                />

                                {/* Status indicator */}
                                {pinMismatch && (
                                    <div className="flex items-center gap-2 text-rose-500 text-[10px] font-black uppercase tracking-wide bg-rose-50 p-3 rounded-xl">
                                        <AlertCircle className="h-4 w-4 flex-shrink-0" /> PINs do not match
                                    </div>
                                )}
                                {!pinIncomplete && !pinMismatch && newPin.length === 4 && (
                                    <div className="flex items-center gap-2 text-emerald-600 text-[10px] font-black uppercase tracking-wide bg-emerald-50 p-3 rounded-xl">
                                        <CheckCircle2 className="h-4 w-4 flex-shrink-0" /> PIN confirmed — ready to save
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {!changingPin && (
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight text-center">
                            <ShieldCheck className="h-3 w-3 inline mr-1 text-slate-300" />
                            PIN unchanged — tap above to set a new one
                        </p>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3 flex-shrink-0">
                    <button onClick={onClose} className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all">
                        Discard
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!canSave}
                        className="flex-1 py-4 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {isUpdating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" /> Save Hub</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProfileEditModal;
