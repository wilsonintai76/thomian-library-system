
import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, Zap, AlertCircle, RefreshCw, Keyboard, ShieldAlert, Lock, ShieldX } from 'lucide-react';

interface MobileScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

const MobileScanner: React.FC<MobileScannerProps> = ({ onScan, onClose }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isInitializingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isNotSecure, setIsNotSecure] = useState(false);
  const regionId = "reader-container";

  const cleanupScanner = async () => {
    if (scannerRef.current) {
        try {
            if (scannerRef.current.isScanning) {
                await scannerRef.current.stop();
            }
            scannerRef.current.clear();
        } catch (e) {
            console.warn("Scanner cleanup warning", e);
        }
    }
  };

  const startScanner = async () => {
    // Proactive check for Secure Context (required for media devices)
    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
        setIsNotSecure(true);
        setError("Browser Security Alert: Camera access requires an encrypted connection (HTTPS). Please ensure you are accessing via a secure domain.");
        setIsInitializing(false);
        return;
    }

    if (isInitializingRef.current) return;
    
    isInitializingRef.current = true;
    setIsInitializing(true);
    setError(null);
    
    await cleanupScanner();

    // Create a fresh instance
    const scanner = new Html5Qrcode(regionId);
    scannerRef.current = scanner;
    
    const config = { 
      fps: 20, 
      qrbox: { width: 250, height: 160 },
      aspectRatio: 1.0,
      disableFlip: false
    };

    try {
        // Primary: Rear Camera
        await scanner.start(
            { facingMode: "environment" }, 
            config, 
            (decodedText) => {
                onScan(decodedText);
            },
            () => {} 
        );
        setIsInitializing(false);
    } catch (err: any) {
        console.warn("Rear camera failed, trying user camera...", err);
        
        try {
            // Fallback: Front Camera
            await scanner.start(
                { facingMode: "user" },
                config,
                (decodedText) => {
                    onScan(decodedText);
                },
                () => {}
            );
            setIsInitializing(false);
        } catch (fallbackErr: any) {
            console.error("All camera attempts failed", fallbackErr);
            const msg = fallbackErr?.message || fallbackErr?.toString() || "Unknown error";
            
            if (msg.includes('NotAllowedError') || msg.includes('Permission denied')) {
                setError("Camera access was blocked. Please tap the LOCK icon in your address bar to allow permissions, or use Manual Entry.");
            } else if (msg.includes('NotFoundError')) {
                setError("No camera hardware detected on this device.");
            } else {
                setError("Vision hardware error. Please check your system settings.");
            }
            setIsInitializing(false);
        }
    } finally {
        isInitializingRef.current = false;
    }
  };

  useEffect(() => {
    startScanner();
    return () => {
      cleanupScanner();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 h-20 px-6 flex justify-between items-center z-30 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-3 text-white">
          <div className="p-2 bg-blue-600 rounded-full shadow-lg"><Camera className="h-5 w-5" /></div>
          <span className="font-black text-lg tracking-tight uppercase">Vision System</span>
        </div>
        <button onClick={onClose} className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-xl border border-white/10 transition-colors">
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Viewfinder Area */}
      <div className="relative w-full max-w-sm aspect-square bg-slate-900 rounded-[3rem] overflow-hidden border-2 border-white/10 shadow-[0_0_80px_rgba(37,99,235,0.2)] flex items-center justify-center group">
        
        <div id={regionId} className="w-full h-full object-cover"></div>
        
        {isInitializing && (
            <div className="absolute inset-0 bg-slate-950 z-20 flex flex-col items-center justify-center gap-6">
                <div className="relative">
                    <RefreshCw className="h-14 w-14 text-blue-500 animate-spin" />
                    <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 text-blue-400 fill-current animate-pulse" />
                </div>
                <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em] animate-pulse">Syncing Sensors...</p>
            </div>
        )}

        {!error && !isInitializing && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                <div className="w-[260px] h-[170px] border-[3px] border-blue-400 rounded-2xl relative overflow-hidden bg-blue-400/5 shadow-[0_0_100px_rgba(59,130,246,0.3)]">
                    <div className="scanner-laser"></div>
                    <div className="absolute top-4 left-4 w-6 h-6 border-t-4 border-l-4 border-white/40 rounded-tl-lg"></div>
                    <div className="absolute top-4 right-4 w-6 h-6 border-t-4 border-r-4 border-white/40 rounded-tr-lg"></div>
                    <div className="absolute bottom-4 left-4 w-6 h-6 border-b-4 border-l-4 border-white/40 rounded-bl-lg"></div>
                    <div className="absolute bottom-4 right-4 w-6 h-6 border-b-4 border-r-4 border-white/40 rounded-br-lg"></div>
                </div>
                <div className="absolute bottom-12 text-center text-white/40 text-[9px] font-black uppercase tracking-[0.5em]">Align Barcode / ISBN</div>
            </div>
        )}

        {error && (
            <div className="absolute inset-0 bg-slate-950 z-40 flex flex-col items-center justify-center p-10 text-center">
                <div className="h-24 w-24 bg-rose-500/10 text-rose-500 rounded-[2rem] flex items-center justify-center mb-8 border-2 border-rose-500/20 shadow-2xl">
                    {isNotSecure ? <ShieldX className="h-12 w-12" /> : <ShieldAlert className="h-12 w-12" />}
                </div>
                <h3 className="text-white font-black text-2xl mb-4 tracking-tight">{isNotSecure ? 'Insecure Link' : 'Access Restricted'}</h3>
                <p className="text-slate-400 text-sm mb-10 leading-relaxed max-w-[280px] font-medium uppercase tracking-tight">
                    {error}
                </p>
                
                <div className="flex flex-col gap-4 w-full max-w-[260px]">
                    {!isNotSecure && (
                        <button onClick={startScanner} className="bg-blue-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-900/40">
                            <RefreshCw className="h-5 w-5" /> Retry Link
                        </button>
                    )}
                    <button onClick={onClose} className="bg-slate-800 text-white/70 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-700 transition-all flex items-center justify-center gap-3">
                        <Keyboard className="h-5 w-5" /> Use Manual Entry
                    </button>
                </div>
            </div>
        )}
      </div>

      {!error && !isInitializing && (
          <div className="mt-12 flex flex-col items-center gap-6 text-center z-20">
            <div className="flex items-center gap-3 text-emerald-400 bg-emerald-400/10 px-6 py-3 rounded-full border border-emerald-400/20 text-[10px] font-black uppercase tracking-widest shadow-lg">
                <Zap className="h-4 w-4 fill-current animate-pulse" /> Neural Optics Synchronized
            </div>
            <p className="text-slate-500 text-[10px] max-w-[260px] font-bold uppercase tracking-widest leading-loose opacity-60 flex items-center gap-2">
                <Lock className="h-3 w-3" /> Secure Protocol v4.2
            </p>
          </div>
      )}
    </div>
  );
};

export default MobileScanner;
