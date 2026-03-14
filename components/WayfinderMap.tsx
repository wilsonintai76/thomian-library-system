
import React, { useEffect, useState } from 'react';
import { Navigation, RefreshCw, Layers, MapPin } from 'lucide-react';
import { MapConfig, ShelfDefinition, MapLevel, Book } from '../types';
import { mockGetMapConfig } from '../services/api';
import { getShelfFromDDC } from '../utils';

interface WayfinderMapProps {
    selectedBook?: Book | null;
    activeLevelId?: string | null;
    highlightShelf?: string | null;
    configOverride?: MapConfig | null;
    onMapClick?: (x: number, y: number) => void;
    onAutoSwitchLevel?: (levelId: string) => void;
}

const WayfinderMap: React.FC<WayfinderMapProps> = ({
    selectedBook,
    activeLevelId,
    highlightShelf,
    configOverride,
    onMapClick,
    onAutoSwitchLevel
}) => {
    const [config, setConfig] = useState<MapConfig | null>(configOverride || null);
    const [loading, setLoading] = useState(!configOverride);

    useEffect(() => {
        if (configOverride) {
            setConfig(configOverride);
            setLoading(false);
        } else {
            mockGetMapConfig().then(data => {
                setConfig(data);
                setLoading(false);
            });
        }
    }, [configOverride]);

    const getTargetShelf = (): ShelfDefinition | null => {
        if (highlightShelf && config) return config.shelves.find(s => s.id === highlightShelf) || null;
        if (!selectedBook || !config) return null;

        // Attempt 1: Direct ID match
        let shelf = config.shelves.find(s => s.id === selectedBook.shelf_location);
        if (shelf) return shelf;

        // Attempt 2: DDC Utility Logic
        const ddcLabel = getShelfFromDDC(selectedBook.ddc_code);
        shelf = config.shelves.find(s => s.label === ddcLabel);
        if (shelf) return shelf;

        // Attempt 3: Numeric DDC Range Match
        const ddcVal = parseFloat(selectedBook.ddc_code);
        if (!isNaN(ddcVal)) {
            return config.shelves.find(s => ddcVal >= s.minDDC && ddcVal <= s.maxDDC) || null;
        }

        return null;
    };

    const targetShelf = getTargetShelf();
    const effectiveLevelId = activeLevelId || (targetShelf ? targetShelf.levelId : (config?.levels[0]?.id || null));

    // Auto-switch notification for Kiosk UI
    useEffect(() => {
        if (targetShelf && onAutoSwitchLevel && targetShelf.levelId !== activeLevelId) {
            onAutoSwitchLevel(targetShelf.levelId);
        }
    }, [targetShelf, activeLevelId, onAutoSwitchLevel]);

    const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
        if (!onMapClick) return;
        const svg = e.currentTarget;
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const cursorpt = pt.matrixTransform(svg.getScreenCTM()?.inverse());
        onMapClick(Math.round(cursorpt.x), Math.round(cursorpt.y));
    };

    if (loading || !config) {
        return (
            <div className="w-full h-full bg-slate-50 flex items-center justify-center rounded-xl">
                <RefreshCw className="h-10 w-10 text-slate-200 animate-spin" />
            </div>
        );
    }

    const currentLevel = config.levels.find(l => l.id === effectiveLevelId);
    const filteredShelves = config.shelves.filter(s => s.levelId === effectiveLevelId);

    return (
        <div className="w-full h-full bg-white rounded-xl shadow-inner border border-slate-200 flex flex-col items-center justify-center relative overflow-hidden">

            {/* Room/Floor Indicator Banner */}
            <div className="absolute top-4 left-4 z-20 flex flex-col gap-1">
                <div className="bg-white/90 p-3 rounded-xl backdrop-blur-md border border-slate-100 shadow-lg pointer-events-none">
                    <h3 className="text-sm md:text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
                        <Navigation className="h-4 w-4 text-blue-600" /> {currentLevel?.name || 'Main Hall'}
                    </h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {currentLevel?.customBackground ? 'Blueprint View' : 'Standard Floor View'}
                    </p>
                </div>
            </div>

            {/* Book Context Overlay */}
            {selectedBook && targetShelf && targetShelf.levelId === effectiveLevelId && (
                <div className="absolute bottom-4 left-4 z-20 bg-slate-900/95 text-white backdrop-blur border border-slate-700 p-4 rounded-2xl shadow-2xl max-w-xs animate-fade-in-up">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-600 rounded-lg">
                            <MapPin className="h-4 w-4 text-white" />
                        </div>
                        <div>
                            <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest">Target Shelf</p>
                            <p className="text-sm font-black text-white leading-tight">{targetShelf.label}</p>
                        </div>
                    </div>
                    <p className="text-xs text-slate-300 truncate border-t border-slate-700 pt-2 font-medium">
                        {selectedBook.title}
                    </p>
                </div>
            )}

            {/* SVG Map Container */}
            <svg
                viewBox="0 0 1000 600"
                className={`w-full h-full max-w-5xl select-none ${onMapClick ? 'cursor-crosshair' : 'cursor-default'}`}
                onClick={handleSvgClick}
            >
                <defs>
                    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="6" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>

                {/* LAYER 1: BACKGROUND */}
                {currentLevel?.customBackground ? (
                    <image
                        href={currentLevel.customBackground}
                        x="0" y="0" width="1000" height="600"
                        preserveAspectRatio="xMidYMid slice"
                        className="rounded-2xl"
                    />
                ) : (
                    <g>
                        <rect x="0" y="0" width="1000" height="600" fill="#f8fafc" rx="20" />
                        <path d="M 0 300 H 1000 M 500 0 V 600" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
                    </g>
                )}

                {/* LAYER 2: SHELVES */}
                {filteredShelves.map((shelf) => {
                    const isActive = targetShelf?.id === shelf.id;
                    return (
                        <g key={shelf.id} id={shelf.id} className="transition-all duration-500">
                            {isActive && (
                                <rect
                                    x={shelf.x - 4} y={shelf.y - 4}
                                    width={shelf.width + 8} height={shelf.height + 8}
                                    rx="12" fill="rgba(59, 130, 246, 0.2)"
                                    className="animate-pulse"
                                />
                            )}
                            <rect
                                x={shelf.x} y={shelf.y}
                                width={shelf.width} height={shelf.height}
                                rx="8"
                                fill={isActive ? 'rgba(59, 130, 246, 0.7)' : 'rgba(148, 163, 184, 0.2)'}
                                stroke={isActive ? '#2563eb' : '#94a3b8'}
                                strokeWidth={isActive ? 3 : 1}
                                style={{ opacity: isActive || !targetShelf ? 1 : 0.4, transition: 'all 0.3s' }}
                            />
                            <g style={{ pointerEvents: 'none' }}>
                                <text
                                    x={shelf.x + shelf.width / 2} y={shelf.y + shelf.height / 2 + 5}
                                    textAnchor="middle"
                                    className="text-xs font-black uppercase tracking-widest"
                                    fill={isActive ? '#ffffff' : '#64748b'}
                                >
                                    {shelf.label}
                                </text>
                            </g>
                        </g>
                    );
                })}

                {/* LAYER 3: KIOSK STATION (YOU ARE HERE) */}
                {currentLevel && (
                    <g transform={`translate(${currentLevel.stationX}, ${currentLevel.stationY})`} className="cursor-pointer">
                        {/* Visual Circle Pulse */}
                        <circle r="20" fill="#ef4444" className="animate-pulse" opacity="0.2" />
                        <circle r="8" fill="#ef4444" />

                        {/* Icon Marker */}
                        <g transform="translate(-12, -32)">
                            <path d="M12 0C5.37 0 0 5.37 0 12C0 21 12 32 12 32C12 32 24 21 24 12C24 5.37 18.63 0 12 0ZM12 16C9.79 16 8 14.21 8 12C8 9.79 9.79 8 12 8C14.21 8 16 9.79 16 12C16 14.21 14.21 16 12 16Z" fill="#ef4444" />
                        </g>

                        <text y="24" textAnchor="middle" className="text-[10px] font-black fill-red-600 uppercase tracking-widest">
                            Kiosk Station
                        </text>
                        <text y="36" textAnchor="middle" className="text-[9px] font-bold fill-slate-400 uppercase tracking-tighter">
                            (You Are Here)
                        </text>
                    </g>
                )}
            </svg>
        </div>
    );
};

export default WayfinderMap;
