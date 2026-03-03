
import React, { useState, useEffect } from 'react';
import { Lock, User, X, AlertCircle, Settings, Wifi, Delete } from 'lucide-react';
import { mockLogin, getLanUrl, setLanUrl, initializeNetwork } from '../services/api';
import { AuthUser } from '../types';

interface LoginModalProps {
    onClose: () => void;
    onLoginSuccess: (user: AuthUser) => void;
}

const PIN_MAX = 4;

const LoginModal: React.FC<LoginModalProps> = ({ onClose, onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [pin, setPin] = useState('');
    const [loginStep, setLoginStep] = useState<'ID' | 'PIN'>('ID');
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

    const handlePinPress = (digit: string) => {
        if (loginStep === 'ID') {
            if (username.length < 8) setUsername(prev => prev + digit);
        } else {
            if (pin.length < PIN_MAX) setPin(prev => prev + digit);
        }
    };

    const handlePinDelete = () => {
        if (loginStep === 'ID') setUsername(prev => prev.slice(0, -1));
        else setPin(prev => prev.slice(0, -1));
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!username || pin.length < 4) return;

        setIsLoading(true);
        setError('');

        try {
            const user = await mockLogin(username, pin);
            if (user) {
                onLoginSuccess(user);
            } else {
                setError('Invalid credentials. Access denied.');
                setPin('');
            }
        } catch (err) {
            setError('System error. Please try again.');
            setPin('');
        } finally {
            setIsLoading(false);
        }
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
                    <div className="p-6 space-y-4">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Step indicator */}
                            <div className="flex items-center gap-3 justify-center">
                                <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-colors ${loginStep === 'ID' ? 'text-blue-600' : 'text-slate-400'}`}>
                                    <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-black border-2 ${loginStep === 'ID' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-emerald-500 border-emerald-500 text-white'}`}>{loginStep === 'ID' ? '1' : '✓'}</div>
                                    Staff ID
                                </div>
                                <div className="h-px w-8 bg-slate-200" />
                                <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-colors ${loginStep === 'PIN' ? 'text-blue-600' : 'text-slate-300'}`}>
                                    <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-black border-2 ${loginStep === 'PIN' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-transparent border-slate-300 text-slate-400'}`}>2</div>
                                    PIN
                                </div>
                            </div>

                            {/* Display box */}
                            {loginStep === 'ID' ? (
                                <div className="bg-slate-50 border-2 border-blue-200 rounded-2xl px-5 py-4 text-center">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Staff ID</p>
                                    <p className="font-mono font-black text-3xl text-slate-800 tracking-widest min-h-[2.5rem]">
                                        {username || <span className="text-slate-300">--------</span>}
                                    </p>
                                </div>
                            ) : (
                                <div className="bg-slate-50 border-2 border-blue-200 rounded-2xl px-5 py-4 text-center">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Staff PIN</p>
                                    <div className="flex justify-center gap-4">
                                        {Array.from({ length: PIN_MAX }).map((_, i) => (
                                            <div key={i} className={`h-5 w-5 rounded-full border-2 transition-all duration-150 ${i < pin.length ? 'bg-blue-600 border-blue-600 scale-110' : 'bg-transparent border-slate-300'}`} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Numpad */}
                            <div className="grid grid-cols-3 gap-2.5">
                                {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((key, idx) => {
                                    if (key === '') return <div key={idx} />;
                                    const isDel = key === '⌫';
                                    return (
                                        <button key={key+idx} type="button" onClick={() => isDel ? handlePinDelete() : handlePinPress(key)}
                                            className={`py-3.5 rounded-xl text-xl font-black border-2 active:scale-95 transition-all select-none ${
                                                isDel ? 'bg-rose-50 text-rose-500 border-rose-100 hover:bg-rose-100'
                                                      : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-blue-50 hover:border-blue-300'}`}>
                                            {key}
                                        </button>
                                    );
                                })}
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm font-medium">
                                    <AlertCircle className="h-4 w-4 shrink-0" />
                                    {error}
                                </div>
                            )}

                            {/* Action buttons */}
                            {loginStep === 'ID' ? (
                                <button type="button" onClick={() => setLoginStep('PIN')} disabled={username.length < 4}
                                    className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold text-base hover:bg-blue-700 active:scale-[0.98] transition-all shadow-xl shadow-blue-100 disabled:opacity-50">
                                    Next →
                                </button>
                            ) : (
                                <div className="flex gap-3">
                                    <button type="button" onClick={() => { setPin(''); setLoginStep('ID'); }}
                                        className="flex-1 py-3.5 bg-slate-100 text-slate-500 rounded-xl font-bold text-sm">← Back</button>
                                    <button type="submit" disabled={isLoading || pin.length < 4}
                                        className="flex-1 bg-blue-600 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-blue-700 active:scale-[0.98] transition-all shadow-xl shadow-blue-100 disabled:opacity-50 flex items-center justify-center gap-2">
                                        {isLoading ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Login'}
                                    </button>
                                </div>
                            )}
                        </form>

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
