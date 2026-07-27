import { create } from 'zustand';
import { temporal } from 'zundo';
import { MapLevel, MapElement, WallNode, WallSegment, WallFeature } from '../types';

export type SelectedType = 'ELEMENT' | 'WALL_NODE' | 'WALL_SEGMENT' | 'WALL_FEATURE';

interface FloorPlanState {
    levels: MapLevel[];
    activeLevelId: string | null;
    selectedId: string | null;
    selectedType: SelectedType | null;
    zoomLevel: number;
    drawMode: 'SELECT' | 'WALL' | 'SHELF' | 'DOOR' | 'WINDOW' | 'TEXT';
    wallThickness: number; // current wall thickness for new walls
    
    // Actions
    setLevels: (levels: MapLevel[]) => void;
    setActiveLevel: (id: string) => void;
    selectItem: (id: string | null, type: SelectedType | null) => void;
    setZoomLevel: (zoom: number) => void;
    setDrawMode: (mode: FloorPlanState['drawMode']) => void;
    
    addElement: (levelId: string, element: MapElement) => void;
    updateElement: (levelId: string, elementId: string, updates: Partial<MapElement>) => void;
    deleteElement: (levelId: string, elementId: string) => void;
    updateLevel: (levelId: string, updates: Partial<MapLevel>) => void;
    
    // Wall node actions
    addWallNode: (levelId: string, node: WallNode) => void;
    moveWallNode: (levelId: string, nodeId: string, x: number, y: number) => void;
    deleteWallNode: (levelId: string, nodeId: string) => void;
    
    // Wall segment actions
    addWallSegment: (levelId: string, segment: WallSegment) => void;
    updateWallSegment: (levelId: string, segmentId: string, updates: Partial<WallSegment>) => void;
    deleteWallSegment: (levelId: string, segmentId: string) => void;
    
    // Wall feature actions (door/window on wall)
    addWallFeature: (levelId: string, feature: WallFeature) => void;
    updateWallFeature: (levelId: string, featureId: string, updates: Partial<WallFeature>) => void;
    deleteWallFeature: (levelId: string, featureId: string) => void;
    
    // Selectors
    getActiveLevel: () => MapLevel | undefined;
    getSelectedItem: () => MapElement | WallNode | WallSegment | WallFeature | undefined;
}

export const useFloorPlanStore = create<FloorPlanState>()(
    temporal((set, get) => ({
        levels: [],
        activeLevelId: null,
        selectedId: null,
        selectedType: null,
        zoomLevel: 1,
        drawMode: 'SELECT',
        wallThickness: 12,

        setLevels: (levels) => {
            const activeId = get().activeLevelId || (levels.length > 0 ? levels[0].id : null);
            set({ levels, activeLevelId: activeId });
        },
        
        setActiveLevel: (id) => set({ activeLevelId: id, selectedId: null, selectedType: null }),
        selectItem: (id, type) => set({ selectedId: id, selectedType: type }),
        setZoomLevel: (zoom) => set({ zoomLevel: zoom }),
        setDrawMode: (mode) => set({ drawMode: mode, selectedId: null, selectedType: null }),

        addElement: (levelId, element) => set((state) => ({
            levels: state.levels.map(l => l.id === levelId ? { 
                ...l, 
                layout: [...(l.layout || []), element] 
            } : l),
            selectedId: element.id,
            selectedType: 'ELEMENT'
        })),

        updateElement: (levelId, elementId, updates) => set((state) => ({
            levels: state.levels.map(l => l.id === levelId ? {
                ...l,
                layout: (l.layout || []).map(el => el.id === elementId ? { ...el, ...updates } : el)
            } : l)
        })),

        deleteElement: (levelId, elementId) => set((state) => ({
            levels: state.levels.map(l => l.id === levelId ? {
                ...l,
                layout: (l.layout || []).filter(el => el.id !== elementId)
            } : l),
            selectedId: state.selectedId === elementId ? null : state.selectedId,
            selectedType: state.selectedId === elementId ? null : state.selectedType,
        })),

        updateLevel: (levelId, updates) => set((state) => ({
            levels: state.levels.map(l => l.id === levelId ? { ...l, ...updates } : l)
        })),

        // ── Wall Nodes ──────────────────────────────────────────────
        addWallNode: (levelId, node) => set((state) => ({
            levels: state.levels.map(l => l.id === levelId ? {
                ...l,
                wallNodes: [...(l.wallNodes || []), node]
            } : l),
            selectedId: node.id,
            selectedType: 'WALL_NODE'
        })),

        moveWallNode: (levelId, nodeId, x, y) => set((state) => ({
            levels: state.levels.map(l => l.id === levelId ? {
                ...l,
                wallNodes: (l.wallNodes || []).map(n => n.id === nodeId ? { ...n, x, y } : n)
            } : l)
        })),

        deleteWallNode: (levelId, nodeId) => set((state) => ({
            levels: state.levels.map(l => l.id === levelId ? {
                ...l,
                wallNodes: (l.wallNodes || []).filter(n => n.id !== nodeId),
                wallSegments: (l.wallSegments || []).filter(s => s.startNodeId !== nodeId && s.endNodeId !== nodeId),
                wallFeatures: (l.wallFeatures || []).filter(f => {
                    const seg = (l.wallSegments || []).find(s => s.id === f.wallId);
                    return seg && seg.startNodeId !== nodeId && seg.endNodeId !== nodeId;
                })
            } : l),
            selectedId: state.selectedId === nodeId ? null : state.selectedId,
            selectedType: state.selectedType === 'WALL_NODE' ? null : state.selectedType,
        })),

        // ── Wall Segments ───────────────────────────────────────────
        addWallSegment: (levelId, segment) => set((state) => ({
            levels: state.levels.map(l => l.id === levelId ? {
                ...l,
                wallSegments: [...(l.wallSegments || []), segment]
            } : l),
            selectedId: segment.id,
            selectedType: 'WALL_SEGMENT'
        })),

        updateWallSegment: (levelId, segmentId, updates) => set((state) => ({
            levels: state.levels.map(l => l.id === levelId ? {
                ...l,
                wallSegments: (l.wallSegments || []).map(s => s.id === segmentId ? { ...s, ...updates } : s)
            } : l)
        })),

        deleteWallSegment: (levelId, segmentId) => set((state) => ({
            levels: state.levels.map(l => l.id === levelId ? {
                ...l,
                wallSegments: (l.wallSegments || []).filter(s => s.id !== segmentId),
                wallFeatures: (l.wallFeatures || []).filter(f => f.wallId !== segmentId)
            } : l),
            selectedId: state.selectedId === segmentId ? null : state.selectedId,
            selectedType: state.selectedType === 'WALL_SEGMENT' ? null : state.selectedType,
        })),

        // ── Wall Features (Doors/Windows) ───────────────────────────
        addWallFeature: (levelId, feature) => set((state) => ({
            levels: state.levels.map(l => l.id === levelId ? {
                ...l,
                wallFeatures: [...(l.wallFeatures || []), feature]
            } : l),
            selectedId: feature.id,
            selectedType: 'WALL_FEATURE'
        })),

        updateWallFeature: (levelId, featureId, updates) => set((state) => ({
            levels: state.levels.map(l => l.id === levelId ? {
                ...l,
                wallFeatures: (l.wallFeatures || []).map(f => f.id === featureId ? { ...f, ...updates } : f)
            } : l)
        })),

        deleteWallFeature: (levelId, featureId) => set((state) => ({
            levels: state.levels.map(l => l.id === levelId ? {
                ...l,
                wallFeatures: (l.wallFeatures || []).filter(f => f.id !== featureId)
            } : l),
            selectedId: state.selectedId === featureId ? null : state.selectedId,
            selectedType: state.selectedType === 'WALL_FEATURE' ? null : state.selectedType,
        })),

        getActiveLevel: () => {
            const { levels, activeLevelId } = get();
            return levels.find(l => l.id === activeLevelId);
        },

        getSelectedItem: () => {
            const { levels, activeLevelId, selectedId, selectedType } = get();
            const level = levels.find(l => l.id === activeLevelId);
            if (!level || !selectedId) return undefined;
            switch (selectedType) {
                case 'ELEMENT': return level.layout?.find(el => el.id === selectedId);
                case 'WALL_NODE': return level.wallNodes?.find(n => n.id === selectedId);
                case 'WALL_SEGMENT': return level.wallSegments?.find(s => s.id === selectedId);
                case 'WALL_FEATURE': return level.wallFeatures?.find(f => f.id === selectedId);
                default: return undefined;
            }
        }
    }), {
        partialize: (state) => ({ levels: state.levels }), 
    })
);
