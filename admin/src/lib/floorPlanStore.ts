import { create } from 'zustand';
import { temporal } from 'zundo';
import { MapLevel, MapElement } from '../types';

interface FloorPlanState {
    levels: MapLevel[];
    activeLevelId: string | null;
    selectedElementId: string | null;
    is3DMode: boolean;
    zoomLevel: number;
    
    // Actions
    setLevels: (levels: MapLevel[]) => void;
    setActiveLevel: (id: string) => void;
    setSelectedElement: (id: string | null) => void;
    set3DMode: (is3D: boolean) => void;
    setZoomLevel: (zoom: number) => void;
    
    addElement: (levelId: string, element: MapElement) => void;
    updateElement: (levelId: string, elementId: string, updates: Partial<MapElement>) => void;
    deleteElement: (levelId: string, elementId: string) => void;
    updateLevel: (levelId: string, updates: Partial<MapLevel>) => void;
    
    // Selectors
    getActiveLevel: () => MapLevel | undefined;
    getSelectedElement: () => MapElement | undefined;
}

export const useFloorPlanStore = create<FloorPlanState>()(
    temporal((set, get) => ({
        levels: [],
        activeLevelId: null,
        selectedElementId: null,
        is3DMode: false,
        zoomLevel: 1,

        setLevels: (levels) => {
            const activeId = get().activeLevelId || (levels.length > 0 ? levels[0].id : null);
            set({ levels, activeLevelId: activeId });
        },
        
        setActiveLevel: (id) => set({ activeLevelId: id, selectedElementId: null }),
        setSelectedElement: (id) => set({ selectedElementId: id }),
        set3DMode: (is3D) => set({ is3DMode: is3D }),
        setZoomLevel: (zoom) => set({ zoomLevel: zoom }),

        addElement: (levelId, element) => set((state) => ({
            levels: state.levels.map(l => l.id === levelId ? { 
                ...l, 
                layout: [...(l.layout || []), element] 
            } : l),
            selectedElementId: element.id
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
            selectedElementId: state.selectedElementId === elementId ? null : state.selectedElementId
        })),

        updateLevel: (levelId, updates) => set((state) => ({
            levels: state.levels.map(l => l.id === levelId ? { ...l, ...updates } : l)
        })),

        getActiveLevel: () => {
            const { levels, activeLevelId } = get();
            return levels.find(l => l.id === activeLevelId);
        },

        getSelectedElement: () => {
            const { levels, activeLevelId, selectedElementId } = get();
            const level = levels.find(l => l.id === activeLevelId);
            return level?.layout?.find(el => el.id === selectedElementId);
        }
    }), {
        // Exclude UI-only state from history if desired, but for now we keep it simple
        partialize: (state) => ({ levels: state.levels }), 
    })
);
