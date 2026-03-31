import React, { useState } from 'react';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { mockUpdatePassword } from '../services/api';

interface ResetPasswordModalProps {
    onClose: () => void;
}

const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ onClose }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const result = await mockUpdatePassword(password);
            if (result.success) {
                setIsSuccess(true);
                setTimeout(() => {
                    onClose();
                    window.location.href = '/'; // Reload to clear recovery state
                }, 2000);
            } else {
                if (result.code === 'same_password') {
                    setError('New password must be different from your old one.');
                } else {
                    setError('Failed to update password. Link may have expired.');
                }
            }
        } catch (err) {
            setError('System error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md transition-opacity" />

            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up">
                {/* Header */}
                <div className="bg-emerald-600 p-8 text-center relative overflow-hidden">
                    <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/10" />
                    <div className="h-16 w-16 bg-white/20 backdrop-blur-xl rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-xl border border-white/30">
                        {isSuccess ? <CheckCircle2 className="h-8 w-8 text-white" /> : <ShieldCheck className="h-8 w-8 text-white" />}
                    </div>
                    <h2 className="text-2xl font-black text-white tracking-tight uppercase">
                        {isSuccess ? 'Password Reset' : 'New Credentials'}
                    </h2>
                    <p className="text-emerald-100 text-xs mt-1 font-bold uppercase tracking-widest opacity-80">
                        {isSuccess ? 'Redirecting to dashboard...' : 'Secure Account Synchronization'}
                    </p>
                </div>

                {/* Form */}
                <div className="p-8">
                    {isSuccess ? (
                        <div className="py-8 text-center">
                            <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-emerald-50 text-emerald-500 mb-6 animate-bounce">
                                <CheckCircle2 className="h-10 w-10" />
                            </div>
                            <p className="text-slate-600 font-bold">Your password has been updated successfully!</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">New Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-11 pr-12 py-3.5 border-2 border-slate-200 rounded-xl text-sm font-medium focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 outline-none transition-all"
                                        placeholder="Min. 6 characters"
                                        required
                                        disabled={isLoading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Confirm New Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full pl-11 pr-12 py-3.5 border-2 border-slate-200 rounded-xl text-sm font-medium focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 outline-none transition-all"
                                        placeholder="Repeat your password"
                                        required
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="flex items-center gap-3 text-rose-600 bg-rose-50 p-4 rounded-xl text-xs font-bold border border-rose-100">
                                    <AlertCircle className="h-4 w-4 shrink-0" />
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading || !password || !confirmPassword}
                                className="w-full bg-slate-900 text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-3"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Updating...
                                    </>
                                ) : (
                                    <>
                                        <Lock className="h-4 w-4" />
                                        Update Password
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResetPasswordModal;
