
import React, { useState, useEffect } from 'react';
import { Lock, User, Key, X, ChevronRight, AlertCircle, ShieldCheck, Settings, Globe, Wifi, Sparkles, UserCheck } from 'lucide-react';
import { mockLogin, getLanUrl, setLanUrl, initializeNetwork } from '../services/api';
import { AuthUser } from '../types';

interface LoginModalProps {
    onClose: () => void;
    onLoginSuccess: (user: AuthUser) => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ onClose, onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Settings Mode
    const [showSettings, setShowSettings] = useState(false);
    const [lanUrlInput, setLanUrlInput] = useState('');
    const [networkMode, setNetworkMode] = useState('AUTO');

    useEffect(() => {
        setLanUrlInput(getLanUrl());
        setNetworkMode(localStorage.getItem('thomian_network_mode') || 'AUTO');
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!username || !password) return;

        setIsLoading(true);
        setError('');

        try {
            const user = await mockLogin(username, password);
            if (user) {
                onLoginSuccess(user);
            } else {
                setError('Invalid credentials. Access denied.');
            }
        } catch (err) {
            setError('System error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDemoFill = () => {
        setUsername('admin');
        setPassword('admin123');
        setError('');
    };

    const handleLibrarianFill = () => {
        setUsername('librarian');
        setPassword('lib123');
        setError('');
    };

    const saveSettings = async () => {
        setLanUrl(lanUrlInput);
        localStorage.setItem('thomian_network_mode', networkMode);
        setIsLoading(true);
        const result = await initializeNetwork();
        setIsLoading(false);
        alert(`Network Updated: ${result}`);
        setShowSettings(false);
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up">
                {/* Header */}
                <div className="bg-slate-900 p-8 text-center relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
                    >
                        <X className="h-6 w-6" />
                    </button>
                    <div className="h-16 w-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-blue-900/50">
                        <Lock className="h-8 w-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">System Access</h2>
                    <p className="text-slate-400 text-sm mt-1">Authorized Personnel Only</p>
                </div>

                {/* Form */}
                {!showSettings ? (
                    <div className="p-8 space-y-6">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none transition-all font-medium text-slate-800 placeholder-slate-400"
                                    placeholder="Username"
                                    autoFocus
                                />
                            </div>
                            <div className="relative">
                                <Key className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none transition-all font-medium text-slate-800 placeholder-slate-400"
                                    placeholder="Password"
                                />
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm font-medium animate-shake">
                                    <AlertCircle className="h-4 w-4 shrink-0" />
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-100 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>Login <ChevronRight className="h-5 w-5" /></>
                                )}
                            </button>
                        </form>

                        {/* Demo Hint Section */}
                        <div className="bg-amber-50 border-2 border-amber-100 rounded-2xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest flex items-center gap-1.5">
                                    <Sparkles className="h-3 w-3" /> Quick Access
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleDemoFill}
                                    className="flex-1 text-[10px] font-black bg-amber-600 text-white px-2 py-2 rounded-lg uppercase hover:bg-amber-700 transition-colors shadow-sm flex items-center justify-center gap-2"
                                >
                                    <ShieldCheck className="h-3 w-3" /> Fill Admin
                                </button>
                                <button
                                    onClick={handleLibrarianFill}
                                    className="flex-1 text-[10px] font-black bg-blue-600 text-white px-2 py-2 rounded-lg uppercase hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center gap-2"
                                >
                                    <UserCheck className="h-3 w-3" /> Fill Librarian
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-2">
                            <p className="text-xs text-slate-400 font-medium italic">Thomian Core Engine v1.4</p>
                            <button
                                type="button"
                                onClick={() => setShowSettings(true)}
                                className="text-xs font-bold text-slate-500 flex items-center gap-1 hover:text-blue-600 transition-colors"
                            >
                                <Settings className="h-3 w-3" /> Net Config
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="p-8 space-y-6">
                        <div>
                            <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
                                <Wifi className="h-5 w-5 text-blue-500" /> Connection Settings
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Connection Mode</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['AUTO', 'LAN', 'CLOUD'].map(m => (
                                            <button
                                                key={m}
                                                onClick={() => setNetworkMode(m)}
                                                className={`py-2 rounded-lg text-xs font-bold border-2 transition-all ${networkMode === m ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                                            >
                                                {m}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Local Server Address (LAN)</label>
                                    <input
                                        type="text"
                                        value={lanUrlInput}
                                        onChange={(e) => setLanUrlInput(e.target.value)}
                                        className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg text-sm font-mono focus:border-blue-500 outline-none"
                                        placeholder="http://192.168.1.XX:8000"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">
                                        Local IP of the library backend server.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={() => setShowSettings(false)}
                                className="flex-1 py-3 text-slate-500 font-bold text-sm hover:bg-slate-50 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveSettings}
                                disabled={isLoading}
                                className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors shadow-lg flex items-center justify-center gap-2"
                            >
                                {isLoading ? "Testing..." : "Save & Test"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LoginModal;
