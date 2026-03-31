import React, { useState } from 'react';
import { Lock, Mail, Eye, EyeOff, AlertCircle, X, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { mockLogin, mockResetPassword } from '../services/api';
import { AuthUser } from '../types';

interface LoginModalProps {
    onClose: () => void;
    onLoginSuccess: (user: AuthUser) => void;
}

type AuthMode = 'LOGIN' | 'FORGOT_PASSWORD' | 'RESET_SENT';

const LoginModal: React.FC<LoginModalProps> = ({ onClose, onLoginSuccess }) => {
    const [mode, setMode] = useState<AuthMode>('LOGIN');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setIsLoading(true);
        setError('');

        try {
            if (mode === 'LOGIN') {
                if (!password) {
                    setIsLoading(false);
                    return;
                }
                const user = await mockLogin(email.trim(), password);
                if (user) {
                    onLoginSuccess(user);
                } else {
                    setError('Invalid credentials or account not found.');
                    setPassword('');
                }
            } else if (mode === 'FORGOT_PASSWORD') {
                const success = await mockResetPassword(email.trim());
                if (success) {
                    setMode('RESET_SENT');
                } else {
                    setError('Could not send reset email. Verify your address.');
                }
            }
        } catch (err) {
            setError('System error. Please try again.');
            setPassword('');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up">
                {/* Header */}
                <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
                    {/* Background decoration */}
                    <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-blue-600/10" />
                    <div className="absolute -bottom-4 -left-4 h-20 w-20 rounded-full bg-blue-600/5" />

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors z-10"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5" />
                    </button>

                    <div className="h-16 w-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-blue-900/50 relative z-10">
                        {mode === 'RESET_SENT' ? <CheckCircle2 className="h-8 w-8 text-white" /> : <Lock className="h-8 w-8 text-white" />}
                    </div>
                    <h2 className="text-2xl font-black text-white tracking-tight relative z-10">
                        {mode === 'LOGIN' ? 'System Access' : mode === 'FORGOT_PASSWORD' ? 'Account Recovery' : 'Email Sent'}
                    </h2>
                    <p className="text-slate-400 text-sm mt-1 font-medium relative z-10">
                        {mode === 'LOGIN' ? 'Authorized Personnel Only' : mode === 'FORGOT_PASSWORD' ? 'Enter your email to reset password' : 'Check your inbox for instructions'}
                    </p>
                </div>

                {/* Form */}
                <div className="p-8">
                    {mode === 'RESET_SENT' ? (
                        <div className="text-center space-y-6">
                            <div className="bg-green-50 border border-green-100 p-4 rounded-2xl">
                                <p className="text-sm text-green-800 font-medium leading-relaxed">
                                    We've sent a recovery link to <span className="font-bold">{email}</span>. Please click the link in your email to reset your password.
                                </p>
                            </div>
                            <button
                                onClick={() => setMode('LOGIN')}
                                className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center justify-center gap-2 mx-auto hover:text-blue-700 transition-colors"
                            >
                                <ArrowLeft className="h-3 w-3" /> Back to Login
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Email */}
                            <div>
                                <label htmlFor="login-email" className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                                    Staff Email
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        id="login-email"
                                        type="email"
                                        autoComplete="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3.5 border-2 border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all"
                                        placeholder="you@thomian.edu.my"
                                        disabled={isLoading}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            {mode === 'LOGIN' && (
                                <div>
                                    <div className="flex justify-between items-end mb-2">
                                        <label htmlFor="login-password" className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                            Password
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setMode('FORGOT_PASSWORD')}
                                            className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors"
                                        >
                                            Forgot?
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <input
                                            id="login-password"
                                            type={showPassword ? 'text' : 'password'}
                                            autoComplete="current-password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full pl-11 pr-12 py-3.5 border-2 border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all"
                                            placeholder="••••••••"
                                            disabled={isLoading}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(v => !v)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                            tabIndex={-1}
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Error */}
                            {error && (
                                <div className="flex items-center gap-2.5 text-red-600 bg-red-50 border border-red-100 px-4 py-3 rounded-xl text-sm font-medium">
                                    <AlertCircle className="h-4 w-4 shrink-0" />
                                    {error}
                                </div>
                            )}

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={isLoading || !email || (mode === 'LOGIN' && !password)}
                                className="w-full bg-blue-600 text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 active:scale-[0.98] transition-all shadow-xl shadow-blue-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        {mode === 'LOGIN' ? 'Verifying...' : 'Sending Link...'}
                                    </>
                                ) : (
                                    <>
                                        {mode === 'LOGIN' ? <Lock className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                                        {mode === 'LOGIN' ? 'Sign In' : 'Send Recovery Link'}
                                    </>
                                )}
                            </button>

                            {mode === 'FORGOT_PASSWORD' && (
                                <button
                                    type="button"
                                    onClick={() => setMode('LOGIN')}
                                    className="w-full text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors flex items-center justify-center gap-2"
                                >
                                    <ArrowLeft className="h-3 w-3" /> Back to Login
                                </button>
                            )}
                        </form>
                    )}

                    <p className="text-center text-[10px] text-slate-400 font-black uppercase tracking-widest mt-6">
                        Thomian Core Engine · Secure Access
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginModal;
