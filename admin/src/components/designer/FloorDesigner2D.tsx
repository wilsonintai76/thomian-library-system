import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Stage as KonvaStage, Layer as KonvaLayer, Rect as KonvaRect, Transformer as KonvaTransformer, Group as KonvaGroup, Text as KonvaText, Line as KonvaLine, Circle as KonvaCircle, Arc as KonvaArc } from 'react-konva';

const Stage = KonvaStage as any;
const Layer = KonvaLayer as any;
const Rect = KonvaRect as any;
const Transformer = KonvaTransformer as any;
const Group = KonvaGroup as any;
const Text = KonvaText as any;
const Line = KonvaLine as any;
const Circle = KonvaCircle as any;
const Arc = KonvaArc as any;

import { useFloorPlanStore } from '../../lib/floorPlanStore';
import { GRID_SIZE, snapToGrid } from '../../utils/geometry';
import { WallNode, WallSegment, WallFeature } from '../../types';
import Konva from 'konva';

// ── Helpers ─────────────────────────────────────────────────────────

/** Distance from point to line segment. Returns { distance, t } where t is the closest point param (0-1). */
const pointToSegment = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => {
    const dx = bx - ax, dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return { distance: Math.hypot(px - ax, py - ay), t: 0 };
    let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + t * dx, cy = ay + t * dy;
    return { distance: Math.hypot(px - cx, py - cy), t };
};

// ── Shelf / Text / Table Element (unchanged rectangle-based) ───────

const FurnitureElement = ({ element, levelId, isSelected, onSelect }: any) => {
    const shapeRef = useRef<Konva.Rect>(null);
    const trRef = useRef<Konva.Transformer>(null);
    const { updateElement } = useFloorPlanStore();

    useEffect(() => {
        if (isSelected && trRef.current && shapeRef.current) {
            trRef.current.nodes([shapeRef.current]);
            trRef.current.getLayer()?.batchDraw();
        }
    }, [isSelected]);

    const handleDragEnd = (e: any) => {
        updateElement(levelId, element.id, {
            x: snapToGrid(e.target.x()),
            y: snapToGrid(e.target.y()),
        });
    };

    const handleTransformEnd = () => {
        const node = shapeRef.current;
        if (!node) return;
        const scaleX = node.scaleX(), scaleY = node.scaleY();
        node.scaleX(1); node.scaleY(1);
        updateElement(levelId, element.id, {
            x: snapToGrid(node.x()), y: snapToGrid(node.y()),
            width: Math.max(10, Math.round(node.width() * scaleX)),
            height: Math.max(10, Math.round(node.height() * scaleY)),
            rotation: node.rotation(),
        });
    };

    const colors: Record<string, string> = {
        SHELF: '#3b82f6', COUNTER: '#e2e8f0', TABLE: '#f1f5f9', TEXT: '#fef3c7', PLANT: '#86efac',
    };

    return (
        <React.Fragment>
            <Rect
                ref={shapeRef}
                x={element.x} y={element.y}
                width={element.width} height={element.height}
                rotation={element.rotation || 0}
                fill={element.color || colors[element.type] || '#cbd5e1'}
                stroke={isSelected ? '#2563eb' : '#94a3b8'}
                strokeWidth={isSelected ? 3 : 1}
                draggable
                onClick={() => onSelect(element.id)}
                onTap={() => onSelect(element.id)}
                onDblClick={() => { const s = useFloorPlanStore.getState(); s.deleteElement(levelId, element.id); }}
                onDragEnd={handleDragEnd}
                onTransformEnd={handleTransformEnd}
                cornerRadius={element.type === 'TABLE' ? 4 : (element.type === 'COUNTER' ? 12 : 0)}
            />
            {isSelected && (
                <Transformer ref={trRef} boundBoxFunc={(oldBox: any, newBox: any) => (newBox.width < 10 || newBox.height < 10) ? oldBox : newBox} />
            )}
            {element.label && element.type !== 'TEXT' && !isSelected && (
                <Text x={element.x} y={element.y + element.height + 4} text={element.label}
                    fontSize={10} fontStyle="bold" fill="#64748b" width={element.width} align="center" />
            )}
            {element.type === 'TEXT' && !isSelected && (
                <Text x={element.x + 4} y={element.y + element.height / 2 - 6} text={element.label || 'Label'}
                    fontSize={12} fontStyle="bold" fill="#94a3b8" />
            )}
        </React.Fragment>
    );
};

// ── Wall Node (draggable junction point) ────────────────────────────

const WallNodeCircle = ({ node, levelId, isSelected }: { node: WallNode; levelId: string; isSelected: boolean }) => {
    const shapeRef = useRef<Konva.Circle>(null);
    const { moveWallNode, selectItem, deleteWallNode } = useFloorPlanStore();

    const handleDragEnd = (e: any) => {
        let nx = snapToGrid(e.target.x()), ny = snapToGrid(e.target.y());
        // Alignment snap to other nodes
        const allNodes = useFloorPlanStore.getState().levels.find(l => l.id === levelId)?.wallNodes || [];
        for (const n of allNodes) {
            if (n.id === node.id) continue;
            if (Math.abs(nx - n.x) < 12) nx = n.x;
            if (Math.abs(ny - n.y) < 12) ny = n.y;
        }
        moveWallNode(levelId, node.id, nx, ny);
    };

    return (
        <Group>
            {/* Alignment indicators */}
            {isSelected && (() => {
                const allNodes = useFloorPlanStore.getState().levels.find(l => l.id === levelId)?.wallNodes || [];
                const lines: any[] = [];
                for (const n of allNodes) {
                    if (n.id === node.id) continue;
                    if (Math.abs(node.x - n.x) < 2 && Math.abs(node.y - n.y) > 20) {
                        lines.push(<Line key={`ax-${n.id}`} points={[node.x, Math.min(node.y, n.y) + 10, node.x, Math.max(node.y, n.y) - 10]}
                            stroke="#3b82f6" strokeWidth={0.5} dash={[4, 4]} opacity={0.5} />);
                    }
                    if (Math.abs(node.y - n.y) < 2 && Math.abs(node.x - n.x) > 20) {
                        lines.push(<Line key={`ay-${n.id}`} points={[Math.min(node.x, n.x) + 10, node.y, Math.max(node.x, n.x) - 10, node.y]}
                            stroke="#3b82f6" strokeWidth={0.5} dash={[4, 4]} opacity={0.5} />);
                    }
                }
                return lines;
            })()}
            <Circle
                ref={shapeRef}
                x={node.x} y={node.y} radius={6}
                fill={isSelected ? '#2563eb' : '#475569'}
                stroke="#fff" strokeWidth={2}
                draggable
                onClick={() => selectItem(node.id, 'WALL_NODE')}
                onTap={() => selectItem(node.id, 'WALL_NODE')}
                onDragEnd={handleDragEnd}
                onDblClick={() => deleteWallNode(levelId, node.id)}
                hitStrokeWidth={14}
            />
        </Group>
    );
};

// ── Draggable Door/Window on a Wall ───────────────────────────────

const DraggableFeature = ({ feature, segment, nodes, levelId }: {
    feature: WallFeature; segment: WallSegment; nodes: WallNode[]; levelId: string;
}) => {
    const { updateWallFeature, deleteWallFeature, selectItem } = useFloorPlanStore();
    const startNode = nodes.find(n => n.id === segment.startNodeId);
    const endNode = nodes.find(n => n.id === segment.endNodeId);
    if (!startNode || !endNode) return null;

    const dx = endNode.x - startNode.x, dy = endNode.y - startNode.y;
    const wallLength = Math.hypot(dx, dy);
    if (wallLength === 0) return null;
    const ux = dx / wallLength, uy = dy / wallLength;
    const nx = -uy, ny = ux;
    const wallAngle = Math.atan2(dy, dx) * 180 / Math.PI;

    // Current position along wall
    const cx = startNode.x + feature.position * wallLength * ux;
    const cy = startNode.y + feature.position * wallLength * uy;
    const halfW = feature.width / 2;

    const isDoor = feature.type === 'DOOR';

    return (
        <Group
            x={cx} y={cy} rotation={wallAngle}
            draggable
            dragBoundFunc={(pos: any) => {
                // Constrain to the wall line in world space
                const gx = pos.x, gy = pos.y;
                const dx2 = gx - startNode.x, dy2 = gy - startNode.y;
                let t = (dx2 * dx + dy2 * dy) / (wallLength * wallLength);
                t = Math.max(halfW / wallLength, Math.min(1 - halfW / wallLength, t));
                return {
                    x: startNode.x + t * wallLength * ux,
                    y: startNode.y + t * wallLength * uy,
                };
            }}
            onDragEnd={(e: any) => {
                const gx = e.target.x(), gy = e.target.y();
                const dx2 = gx - startNode.x, dy2 = gy - startNode.y;
                let t = (dx2 * dx + dy2 * dy) / (wallLength * wallLength);
                t = Math.max(halfW / wallLength, Math.min(1 - halfW / wallLength, t));
                updateWallFeature(levelId, feature.id, { position: Math.round(t * 100) / 100 });
            }}
        >
            {/* Opening gap in wall (white) */}
            <Rect x={-halfW} y={-segment.thickness - 1} width={feature.width} height={segment.thickness + 2}
                fill="#f8fafc" />

            {isDoor ? (
                <>
                    {/* Door jamb line */}
                    <Line points={[-halfW, 0, -halfW + nx * segment.thickness * 0.5, ny * segment.thickness * 0.5]}
                        stroke="#78350f" strokeWidth={2} />
                    {/* Swing arc */}
                    <Arc x={-halfW} y={0}
                        innerRadius={0} outerRadius={feature.width * 0.8}
                        angle={90} rotation={0}
                        fill="none" stroke="#78350f" strokeWidth={1.5} strokeDasharray="3 2" />
                    {/* Hinge dot */}
                    <Circle x={-halfW} y={0} radius={2} fill="#78350f" />
                </>
            ) : (
                <>
                    {/* Window: parallel lines */}
                    <Line points={[-halfW, -3, halfW, -3]} stroke="#38bdf8" strokeWidth={2} />
                    <Line points={[-halfW, 3, halfW, 3]} stroke="#38bdf8" strokeWidth={2} />
                </>
            )}

            {/* Invisible hit area for selection */}
            <Rect x={-halfW - 4} y={-segment.thickness} width={feature.width + 8} height={segment.thickness * 2}
                fill="transparent"
                onClick={() => selectItem(feature.id, 'WALL_FEATURE')}
                onTap={() => selectItem(feature.id, 'WALL_FEATURE')}
                onDblClick={() => deleteWallFeature(levelId, feature.id)} />
        </Group>
    );
};

// ── Kiosk Station Marker (draggable pin) ────────────────────────────

const KioskStationMarker = ({ levelId }: { levelId: string }) => {
    const { levels, updateLevel } = useFloorPlanStore();
    const level = levels.find(l => l.id === levelId);
    if (!level) return null;
    const { stationX, stationY } = level;

    const handleDragEnd = (e: any) => {
        updateLevel(levelId, {
            stationX: snapToGrid(e.target.x()),
            stationY: snapToGrid(e.target.y()),
        });
    };

    return (
        <Group x={stationX} y={stationY} draggable onDragEnd={handleDragEnd}>
            {/* Pulse ring */}
            <Circle radius={16} fill="#ef4444" opacity={0.15} />
            <Circle radius={10} fill="#ef4444" opacity={0.3} />
            {/* Solid pin */}
            <Circle radius={6} fill="#dc2626" stroke="#fff" strokeWidth={2} />
            {/* Inner dot */}
            <Circle radius={2} fill="#fff" />
            {/* Pin icon shape on top */}
            <Group y={-20}>
                <Line points={[0, 0, -6, -8]} stroke="#dc2626" strokeWidth={2.5} strokeLinecap="round" />
                <Line points={[0, 0, 6, -8]} stroke="#dc2626" strokeWidth={2.5} strokeLinecap="round" />
                <Circle x={0} y={-9} radius={3.5} fill="#dc2626" />
            </Group>
            {/* Label */}
            <Text y={18} text="Kiosk Station" fontSize={9} fontStyle="bold" fill="#dc2626"
                width={80} align="center" offsetX={40} />
            <Text y={29} text="(drag to place)" fontSize={7} fill="#94a3b8"
                width={80} align="center" offsetX={40} />
        </Group>
    );
};

// ── Main Designer ──────────────────────────────────────────────────

const FloorDesigner2D: React.FC = () => {
    const {
        levels, activeLevelId, selectedId, selectedType, selectItem,
        zoomLevel, drawMode, setDrawMode, wallThickness,
        addWallNode, addWallSegment, addElement, addWallFeature,
    } = useFloorPlanStore();
    const stageRef = useRef<Konva.Stage>(null);
    const [lastWallNodeId, setLastWallNodeId] = useState<string | null>(null);
    const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
    const [shiftHeld, setShiftHeld] = useState(false);

    const activeLevel = levels.find(l => l.id === activeLevelId);
    if (!activeLevel) return null;

    const width = 2000, height = 2000;

    // Reset last node when switching away from WALL mode
    useEffect(() => {
        if (drawMode !== 'WALL') setLastWallNodeId(null);
    }, [drawMode]);

    // Escape/Delete key handler + Shift tracking
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Shift') { setShiftHeld(e.type === 'keydown'); return; }
            if (e.key === 'Escape') { setDrawMode('SELECT'); setLastWallNodeId(null); return; }
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
                const state = useFloorPlanStore.getState();
                const { selectedId, selectedType, activeLevelId } = state;
                if (!selectedId || !activeLevelId) return;
                switch (selectedType) {
                    case 'ELEMENT': state.deleteElement(activeLevelId, selectedId); break;
                    case 'WALL_NODE': state.deleteWallNode(activeLevelId, selectedId); break;
                    case 'WALL_SEGMENT': state.deleteWallSegment(activeLevelId, selectedId); break;
                    case 'WALL_FEATURE': state.deleteWallFeature(activeLevelId, selectedId); break;
                }
            }
        };
        window.addEventListener('keydown', handler);
        window.addEventListener('keyup', handler);
        return () => { window.removeEventListener('keydown', handler); window.removeEventListener('keyup', handler); };
    }, [setDrawMode]);

    const handleCanvasClick = useCallback((e: any) => {
        if (!activeLevelId || drawMode === 'SELECT') return;

        // Convert stage coords to canvas coords (accounting for zoom and pan)
        const stage = stageRef.current;
        if (!stage) return;
        const pointer = stage.getPointerPosition();
        if (!pointer) return;
        const transform = stage.getAbsoluteTransform().copy().invert();
        const pos = transform.point(pointer);
        const cx = snapToGrid(pos.x - 100); // offset for the Group x=100
        const cy = snapToGrid(pos.y - 100);

        if (drawMode === 'WALL') {
            const nodes = activeLevel.wallNodes || [];
            let nx = cx, ny = cy;

            // Angle snapping + alignment when connecting from last node
            if (lastWallNodeId) {
                const lastNode = nodes.find(n => n.id === lastWallNodeId);
                if (lastNode) {
                    const dx = cx - lastNode.x, dy = cy - lastNode.y;
                    const dist = Math.hypot(dx, dy);
                    const angle = Math.atan2(dy, dx) * 180 / Math.PI;

                    if (dist > 20 && !shiftHeld) {
                        // Snap to nearest 45° angle (±7.5° tolerance)
                        const snappedAngle = Math.round(angle / 45) * 45;
                        if (Math.abs(angle - snappedAngle) <= 7.5) {
                            const rad = snappedAngle * Math.PI / 180;
                            nx = lastNode.x + Math.cos(rad) * dist;
                            ny = lastNode.y + Math.sin(rad) * dist;
                        }
                    }

                    // Alignment snap: snap to existing node X or Y
                    const ALIGN_THRESHOLD = 12;
                    for (const n of nodes) {
                        if (n.id === lastWallNodeId) continue;
                        if (Math.abs(nx - n.x) < ALIGN_THRESHOLD) nx = n.x;
                        if (Math.abs(ny - n.y) < ALIGN_THRESHOLD) ny = n.y;
                    }
                }
            }

            nx = snapToGrid(nx);
            ny = snapToGrid(ny);

            // Close-loop detection: if near first node of current chain, snap to it
            if (lastWallNodeId) {
                const firstNodeInChain = nodes.find(n => n.id === lastWallNodeId);
                // Find the first node in this drawing session
                const allMyNodes = nodes.filter(n => n.id === lastWallNodeId || 
                    (activeLevel.wallSegments || []).some(s => 
                        (s.startNodeId === lastWallNodeId || s.endNodeId === lastWallNodeId) &&
                        (s.startNodeId === n.id || s.endNodeId === n.id)
                    ));
                // Simple: just check first placed node
                const segments = activeLevel.wallSegments || [];
                const connectedToLast = segments.filter(s => s.startNodeId === lastWallNodeId || s.endNodeId === lastWallNodeId);
                // Find the very first node in the chain (one with only one connection, or just the first we placed)
                // For now, check all nodes except the last one
                for (const n of nodes) {
                    if (n.id === lastWallNodeId) continue;
                    const distToNode = Math.hypot(nx - n.x, ny - n.y);
                    if (distToNode < 15 && !segments.some(s => 
                        (s.startNodeId === lastWallNodeId && s.endNodeId === n.id) ||
                        (s.endNodeId === lastWallNodeId && s.startNodeId === n.id)
                    )) {
                        nx = n.x; ny = n.y;
                        // Don't create a new node — connect to existing
                        const segment: WallSegment = {
                            id: `ws_${Date.now()}`,
                            startNodeId: lastWallNodeId,
                            endNodeId: n.id,
                            thickness: wallThickness,
                            type: 'WALL',
                        };
                        addWallSegment(activeLevelId, segment);
                        setLastWallNodeId(null); // end the chain
                        return;
                    }
                }
            }

            const nodeId = `wn_${Date.now()}`;
            const node: WallNode = { id: nodeId, x: nx, y: ny };
            addWallNode(activeLevelId, node);

            if (lastWallNodeId) {
                const segment: WallSegment = {
                    id: `ws_${Date.now()}`,
                    startNodeId: lastWallNodeId,
                    endNodeId: nodeId,
                    thickness: wallThickness,
                    type: 'WALL',
                };
                addWallSegment(activeLevelId, segment);
            }
            setLastWallNodeId(nodeId);
            return;
        }

        if (drawMode === 'DOOR' || drawMode === 'WINDOW') {
            // Find nearest wall segment
            const nodes = activeLevel.wallNodes || [];
            const segments = activeLevel.wallSegments || [];
            let bestDist = 20; // snap threshold in px
            let bestSeg: WallSegment | null = null;
            let bestT = 0;

            for (const seg of segments) {
                const a = nodes.find(n => n.id === seg.startNodeId);
                const b = nodes.find(n => n.id === seg.endNodeId);
                if (!a || !b) continue;
                const { distance, t } = pointToSegment(cx, cy, a.x, a.y, b.x, b.y);
                if (distance < bestDist) {
                    bestDist = distance;
                    bestSeg = seg;
                    bestT = t;
                }
            }

            if (bestSeg) {
                const feature: WallFeature = {
                    id: `wf_${Date.now()}`,
                    wallId: bestSeg.id,
                    type: drawMode === 'DOOR' ? 'DOOR' : 'WINDOW',
                    position: bestT,
                    width: drawMode === 'DOOR' ? 40 : 60,
                    label: drawMode === 'DOOR' ? 'Door' : 'Window',
                };
                addWallFeature(activeLevelId, feature);
                selectItem(feature.id, 'WALL_FEATURE');
            }
            return;
        }

        // SHELF, TEXT — place as regular element
        if (drawMode === 'SHELF' || drawMode === 'TEXT') {
            const el = {
                id: `el_${Date.now()}`,
                type: drawMode === 'SHELF' ? 'SHELF' : 'TEXT',
                x: cx, y: cy,
                width: drawMode === 'TEXT' ? 100 : 80,
                height: drawMode === 'TEXT' ? 30 : 80,
                rotation: 0,
                label: drawMode === 'SHELF' ? 'New Shelf' : 'Label',
                minDDC: drawMode === 'SHELF' ? 0 : undefined,
                maxDDC: drawMode === 'SHELF' ? 999 : undefined,
            };
            addElement(activeLevelId, el as any);
            selectItem(el.id, 'ELEMENT');
        }
    }, [activeLevelId, drawMode, lastWallNodeId, wallThickness, addWallNode, addWallSegment, addElement, addWallFeature, selectItem, activeLevel]);

    const renderGrid = () => {
        const lines = [];
        for (let i = 0; i <= width / GRID_SIZE; i++) {
            lines.push(<Line key={`v-${i}`} points={[i * GRID_SIZE, 0, i * GRID_SIZE, height]} stroke="#f1f5f9" strokeWidth={1} />);
        }
        for (let i = 0; i <= height / GRID_SIZE; i++) {
            lines.push(<Line key={`h-${i}`} points={[0, i * GRID_SIZE, width, i * GRID_SIZE]} stroke="#f1f5f9" strokeWidth={1} />);
        }
        return lines;
    };

    const cursorClass = drawMode === 'WALL' ? 'cursor-crosshair' : (drawMode === 'DOOR' || drawMode === 'WINDOW') ? 'cursor-cell' : (drawMode !== 'SELECT' ? 'cursor-crosshair' : 'cursor-default');

    return (
        <div className={`w-full h-full bg-slate-50 overflow-hidden relative ${cursorClass}`}>
            <Stage
                ref={stageRef}
                width={window.innerWidth}
                height={window.innerHeight}
                scaleX={zoomLevel} scaleY={zoomLevel}
                draggable={drawMode === 'SELECT'}
                onClick={handleCanvasClick}
                onTap={handleCanvasClick}
                onMouseMove={(e: any) => {
                    const stage = stageRef.current;
                    if (!stage || drawMode !== 'WALL') { setMousePos(null); return; }
                    const pointer = stage.getPointerPosition();
                    if (!pointer) return;
                    const transform = stage.getAbsoluteTransform().copy().invert();
                    const pos = transform.point(pointer);
                    setMousePos({ x: pos.x - 100, y: pos.y - 100 });
                }}
            >
                <Layer>
                    <Group x={100} y={100}>
                        {renderGrid()}

                        {/* Wall Segments */}
                        {(activeLevel.wallSegments || []).map(seg => {
                            const a = (activeLevel.wallNodes || []).find(n => n.id === seg.startNodeId);
                            const b = (activeLevel.wallNodes || []).find(n => n.id === seg.endNodeId);
                            if (!a || !b) return null;
                            const segFeatures = (activeLevel.wallFeatures || [])
                                .filter(f => f.wallId === seg.id)
                                .sort((x, y) => x.position - y.position);
                            const dx = b.x - a.x, dy = b.y - a.y;
                            const len = Math.hypot(dx, dy);
                            if (len === 0) return null;
                            const ux = dx / len, uy = dy / len;

                            // Build solid wall parts around features
                            const parts: { start: number; end: number; hasGap: boolean }[] = [];
                            let cursor = 0;
                            for (const f of segFeatures) {
                                const fc = f.position * len, fh = f.width / 2;
                                const gs = Math.max(cursor, fc - fh);
                                if (gs > cursor) parts.push({ start: cursor, end: gs, hasGap: false });
                                parts.push({ start: gs, end: Math.min(len, fc + fh), hasGap: true });
                                cursor = Math.min(len, fc + fh);
                            }
                            if (cursor < len) parts.push({ start: cursor, end: len, hasGap: false });

                            return (
                                <React.Fragment key={seg.id}>
                                    {parts.map((p, i) => !p.hasGap && (
                                        <Line key={`part-${i}`}
                                            points={[a.x + p.start * ux, a.y + p.start * uy, a.x + p.end * ux, a.y + p.end * uy]}
                                            stroke={seg.type === 'PARTITION' ? '#94a3b8' : '#334155'}
                                            strokeWidth={seg.thickness} lineCap="butt"
                                            onClick={() => selectItem(seg.id, 'WALL_SEGMENT')}
                                            onTap={() => selectItem(seg.id, 'WALL_SEGMENT')}
                                            onDblClick={() => { const s = useFloorPlanStore.getState(); s.deleteWallSegment(activeLevel.id, seg.id); }}
                                            hitStrokeWidth={Math.max(seg.thickness, 8)} />
                                    ))}
                                </React.Fragment>
                            );
                        })}

                        {/* Door/Window Features (draggable overlays) */}
                        {(activeLevel.wallFeatures || []).map(feature => {
                            const seg = (activeLevel.wallSegments || []).find(s => s.id === feature.wallId);
                            if (!seg) return null;
                            return (
                                <DraggableFeature
                                    key={feature.id}
                                    feature={feature}
                                    segment={seg}
                                    nodes={activeLevel.wallNodes || []}
                                    levelId={activeLevel.id}
                                />
                            );
                        })}

                        {/* Wall Nodes (rendered on top of segments) */}
                        {(activeLevel.wallNodes || []).map(node => (
                            <WallNodeCircle
                                key={node.id}
                                node={node}
                                levelId={activeLevel.id}
                                isSelected={selectedType === 'WALL_NODE' && selectedId === node.id}
                            />
                        ))}

                        {/* Kiosk Station Marker (draggable) */}
                        <KioskStationMarker levelId={activeLevel.id} />

                        {/* Construction line preview (WALL mode) */}
                        {drawMode === 'WALL' && mousePos && lastWallNodeId && (() => {
                            const lastNode = (activeLevel.wallNodes || []).find(n => n.id === lastWallNodeId);
                            if (!lastNode) return null;
                            const dx = mousePos.x - lastNode.x, dy = mousePos.y - lastNode.y;
                            const dist = Math.hypot(dx, dy);
                            const midX = (lastNode.x + mousePos.x) / 2, midY = (lastNode.y + mousePos.y) / 2;
                            return (
                                <>
                                    {/* Dashed construction line */}
                                    <Line points={[lastNode.x, lastNode.y, mousePos.x, mousePos.y]}
                                        stroke="#3b82f6" strokeWidth={1.5} dash={[8, 4]} opacity={0.7} />
                                    {/* Wall length label */}
                                    {dist > 10 && (
                                        <Text x={midX} y={midY - 14} text={`${Math.round(dist)}px`}
                                            fontSize={10} fontStyle="bold" fill="#3b82f6"
                                            offsetX={20} padding={4}
                                            fillAfterStrokeEnabled />
                                    )}
                                    {/* Cursor crosshair */}
                                    <Line points={[mousePos.x - 8, mousePos.y, mousePos.x + 8, mousePos.y]}
                                        stroke="#3b82f6" strokeWidth={1} opacity={0.6} />
                                    <Line points={[mousePos.x, mousePos.y - 8, mousePos.x, mousePos.y + 8]}
                                        stroke="#3b82f6" strokeWidth={1} opacity={0.6} />
                                </>
                            );
                        })()}

                        {/* Furniture / Shelves / Text */}
                        {(activeLevel.layout || []).map(el => (
                            <FurnitureElement
                                key={el.id}
                                element={el}
                                levelId={activeLevel.id}
                                isSelected={selectedType === 'ELEMENT' && selectedId === el.id}
                                onSelect={(id: string) => selectItem(id, 'ELEMENT')}
                            />
                        ))}
                    </Group>
                </Layer>
            </Stage>

            {/* Mode indicator */}
            {drawMode !== 'SELECT' && (
                <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 bg-blue-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg pointer-events-none">
                    {drawMode === 'WALL' ? (
                        <>Click to place wall nodes <span className="opacity-60 mx-1">•</span> Hold Shift for free angle <span className="opacity-60 ml-1">•</span> Esc to cancel</>
                    ) : drawMode === 'DOOR' ? 'Click a wall to place door • Esc to cancel' :
                     drawMode === 'WINDOW' ? 'Click a wall to place window • Esc to cancel' :
                     'Click canvas to place element • Esc to cancel'}
                </div>
            )}
        </div>
    );
};

export default FloorDesigner2D;
