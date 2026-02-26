
import React, { useRef, useState, useEffect } from 'react';
import { X, UserPlus, Save, GraduationCap, Phone, Mail, ShieldCheck, User, RefreshCw, Camera, Upload, Trash2, Aperture, AlertCircle, Key, Dices, Eye, EyeOff } from 'lucide-react';
import { Patron, PatronGroup, LibraryClass } from '../../types';
import { mockGetClasses } from '../../services/api';

interface PatronFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (patron: Partial<Patron>) => void;
    initialData?: Patron | null;
    isSaving: boolean;
}

const PatronFormModal: React.FC<PatronFormModalProps> = ({ isOpen, onClose, onSave, initialData, isSaving }) => {
    const [formData, setFormData] = useState<Partial<Patron>>({
        student_id: '',
        full_name: '',
        patron_group: 'STUDENT',
        class_name: '',
        email: '',
        phone: '',
        is_blocked: false,
        fines: 0,
        photo_url: '',
        pin: '1234'
    });

    const [classes, setClasses] = useState<LibraryClass[]>([]);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [showPin, setShowPin] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            mockGetClasses().then(setClasses);
        }
    }, [isOpen]);

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        } else {
            setFormData({
                student_id: generatePatronId(),
                full_name: '',
                patron_group: 'STUDENT',
                class_name: '',
                email: '',
                phone: '',
                is_blocked: false,
                fines: 0,
                photo_url: '',
                pin: generateRandomPin()
            });
        }
    }, [initialData, isOpen]);

    function generateRandomPin() {
        return Math.floor(1000 + Math.random() * 9000).toString();
    }

    function generatePatronId() {
        const year = new Date().getFullYear();
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        return `ST-${year}-${randomNum}`;
    }

    const handleGeneratePin = () => {
        setFormData({ ...formData, pin: generateRandomPin() });
        setShowPin(true);
    };

    // Start Camera
    const startCamera = async () => {
        setIsCameraActive(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { aspectRatio: 1 } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Camera access failed", err);
            alert("Could not access camera. Ensure you are on HTTPS and have granted permissions.");
            setIsCameraActive(false);
        }
    };

    // Stop Camera
    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
        setIsCameraActive(false);
    };

    // Capture Photo
    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            if (context) {
                canvasRef.current.width = 400;
                canvasRef.current.height = 400;
                context.drawImage(videoRef.current, 0, 0, 400, 400);
                const dataUrl = canvasRef.current.toDataURL('image/jpeg');
                setFormData({ ...formData, photo_url: dataUrl });
                stopCamera();
            }
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData({ ...formData, photo_url: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.student_id || !formData.full_name) {
            alert("ID and Name are mandatory.");
            return;
        }
        if (formData.patron_group === 'STUDENT' && !formData.class_name) {
            alert("Class selection is mandatory for Student patrons.");
            return;
        }
        if (!formData.pin || formData.pin.length !== 4) {
            alert("Security PIN must be exactly 4 digits.");
            return;
        }
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] w-full max-w-4xl overflow-hidden shadow-2xl animate-fade-in-up border border-slate-100 flex flex-col md:flex-row max-h-[90vh]">

                {/* Photo Acquisition Sidebar */}
                <div className="w-full md:w-80 bg-slate-50 border-r border-slate-100 p-8 flex flex-col items-center gap-6">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Identity Portrait</h4>

                    <div className="relative w-48 h-60 bg-white rounded-3xl border-4 border-white shadow-xl overflow-hidden group">
                        {isCameraActive ? (
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                className="w-full h-full object-cover scale-x-[-1]"
                            />
                        ) : formData.photo_url ? (
                            <img src={formData.photo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-200">
                                <User className="h-24 w-24 opacity-20" />
                            </div>
                        )}

                        {isCameraActive && (
                            <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                                <button
                                    onClick={capturePhoto}
                                    className="h-14 w-14 bg-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-90 transition-all border-4 border-blue-600"
                                >
                                    <Aperture className="h-7 w-7 text-blue-600 animate-pulse" />
                                </button>
                            </div>
                        )}
                    </div>

                    <canvas ref={canvasRef} className="hidden" />

                    <div className="flex flex-col gap-3 w-full">
                        {!isCameraActive ? (
                            <>
                                <button
                                    type="button"
                                    onClick={startCamera}
                                    className="w-full py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg hover:bg-blue-700 transition-all"
                                >
                                    <Camera className="h-4 w-4" /> Take Live Photo
                                </button>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 transition-all"
                                >
                                    <Upload className="h-4 w-4" /> Upload File
                                </button>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                                {formData.photo_url && (
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, photo_url: '' })}
                                        className="w-full py-2 text-rose-500 font-black text-[9px] uppercase tracking-widest hover:text-rose-600 transition-all flex items-center justify-center gap-1"
                                    >
                                        <Trash2 className="h-3 w-3" /> Clear Image
                                    </button>
                                )}
                            </>
                        ) : (
                            <button
                                type="button"
                                onClick={stopCamera}
                                className="w-full py-3 bg-slate-800 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                            >
                                <X className="h-4 w-4" /> Cancel Capture
                            </button>
                        )}
                    </div>
                </div>

                {/* Main Form Fields */}
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <div className="bg-slate-900 p-8 text-white relative shrink-0">
                        <button onClick={onClose} className="absolute top-6 right-6 text-white/40 hover:text-white"><X className="h-6 w-6" /></button>
                        <div className="flex items-center gap-4">
                            <div className="h-14 w-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                                {initialData ? <User className="h-7 w-7" /> : <UserPlus className="h-7 w-7" />}
                            </div>
                            <div>
                                <h3 className="text-2xl font-black uppercase tracking-tight">{initialData ? 'Update Identity' : 'Register Patron'}</h3>
                                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Thomian Core Directory Services</p>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto flex-1 scrollbar-thin">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-1">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Unique Patron ID (Barcode)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={formData.student_id}
                                        disabled={!!initialData}
                                        onChange={(e) => setFormData({ ...formData, student_id: e.target.value.toUpperCase() })}
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-mono font-bold text-slate-700 outline-none focus:border-blue-500 disabled:opacity-50"
                                        placeholder="ST-2024-XXX"
                                    />
                                    {!initialData && (
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, student_id: generatePatronId() })}
                                            title="Auto-Generate ID"
                                            className="px-4 bg-slate-100 text-slate-500 rounded-xl border border-slate-200 hover:bg-slate-200 transition-all shrink-0"
                                        >
                                            <RefreshCw className="h-5 w-5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Security PIN (4-Digits)</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                                        <input
                                            type={showPin ? "text" : "password"}
                                            maxLength={4}
                                            value={formData.pin}
                                            onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '') })}
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-10 py-3 font-mono font-black text-blue-600 outline-none focus:border-blue-500"
                                            placeholder="••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPin(!showPin)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                                        >
                                            {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleGeneratePin}
                                        title="Auto-Generate PIN"
                                        className="px-4 bg-slate-100 text-slate-500 rounded-xl border border-slate-200 hover:bg-slate-200 transition-all"
                                    >
                                        <Dices className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Full Legal Name</label>
                                <input
                                    type="text"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-800 outline-none focus:border-blue-500"
                                    placeholder="Surname, Given Names"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Patron Group</label>
                                <select
                                    value={formData.patron_group}
                                    onChange={(e) => setFormData({ ...formData, patron_group: e.target.value as PatronGroup })}
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-blue-500"
                                >
                                    <option value="STUDENT">Student</option>
                                    <option value="TEACHER">Teacher</option>
                                    <option value="LIBRARIAN">Librarian</option>
                                    <option value="ADMINISTRATOR">Administrator</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                    Class / Home Room {formData.patron_group === 'STUDENT' && <span className="text-rose-500">*</span>}
                                </label>
                                <div className="relative">
                                    <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                                    <select
                                        value={formData.class_name}
                                        onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                                        className={`w-full bg-slate-50 border-2 rounded-xl pl-10 pr-4 py-3 font-bold text-slate-700 outline-none focus:border-blue-500 appearance-none transition-all ${formData.patron_group === 'STUDENT' && !formData.class_name ? 'border-amber-200' : 'border-slate-100'}`}
                                    >
                                        <option value="">Select a Class...</option>
                                        {classes.map(cls => (
                                            <option key={cls.id} value={cls.name}>{cls.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl pl-10 pr-4 py-3 font-medium text-slate-700 outline-none focus:border-blue-500"
                                        placeholder="p.name@school.edu"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Contact Phone</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl pl-10 pr-4 py-3 font-medium text-slate-700 outline-none focus:border-blue-500"
                                        placeholder="+1..."
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 flex gap-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                            >
                                {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                {initialData ? 'Update Record' : 'Register Patron'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default PatronFormModal;
