import React, { useRef, useEffect } from 'react';
import { Stage as KonvaStage, Layer as KonvaLayer, Rect as KonvaRect, Transformer as KonvaTransformer, Group as KonvaGroup, Text as KonvaText, Line as KonvaLine } from 'react-konva';

const Stage = KonvaStage as any;
const Layer = KonvaLayer as any;
const Rect = KonvaRect as any;
const Transformer = KonvaTransformer as any;
const Group = KonvaGroup as any;
const Text = KonvaText as any;
const Line = KonvaLine as any;

import { useFloorPlanStore } from '../../lib/floorPlanStore';
import { GRID_SIZE, snapToGrid } from '../../utils/geometry';
import Konva from 'konva';

const Element = ({ element, levelId, isSelected, onSelect }: any) => {
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

    const handleTransformEnd = (e: any) => {
        const node = shapeRef.current;
        if (!node) return;
        
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();

        node.scaleX(1);
        node.scaleY(1);

        updateElement(levelId, element.id, {
            x: snapToGrid(node.x()),
            y: snapToGrid(node.y()),
            width: Math.max(5, Math.round(node.width() * scaleX)),
            height: Math.max(5, Math.round(node.height() * scaleY)),
            rotation: node.rotation(),
        });
    };

    const getColor = () => {
        switch (element.type) {
            case 'WALL': return '#334155';
            case 'PARTITION': return '#64748b';
            case 'SHELF': return '#3b82f6';
            case 'DOOR': return '#94a3b8';
            case 'WINDOW': return '#bae6fd';
            default: return '#cbd5e1';
        }
    };

    return (
        <React.Fragment>
            <Rect
                ref={shapeRef}
                {...element}
                fill={getColor()}
                stroke={isSelected ? '#2563eb' : 'transparent'}
                strokeWidth={2}
                draggable
                onClick={() => onSelect(element.id)}
                onTap={() => onSelect(element.id)}
                onDragEnd={handleDragEnd}
                onTransformEnd={handleTransformEnd}
                opacity={element.type === 'WINDOW' ? 0.6 : 1}
            />
            {isSelected && (
                <Transformer
                    ref={trRef}
                    boundBoxFunc={(oldBox, newBox) => {
                        if (newBox.width < 5 || newBox.height < 5) {
                            return oldBox;
                        }
                        return newBox;
                    }}
                />
            )}
            {element.label && !isSelected && (
                <Text
                    x={element.x}
                    y={element.y + element.height + 5}
                    text={element.label}
                    fontSize={10}
                    fontStyle="bold"
                    fill="#64748b"
                    width={element.width}
                    align="center"
                />
            )}
        </React.Fragment>
    );
};

const FloorDesigner2D: React.FC = () => {
    const { levels, activeLevelId, selectedElementId, setSelectedElement, zoomLevel } = useFloorPlanStore();
    const stageRef = useRef<Konva.Stage>(null);
    
    const activeLevel = levels.find(l => l.id === activeLevelId);
    
    if (!activeLevel) return null;

    const width = 2000;
    const height = 2000;

    const renderGrid = () => {
        const lines = [];
        for (let i = 0; i <= width / GRID_SIZE; i++) {
            lines.push(
                <Line
                    key={`v-${i}`}
                    points={[i * GRID_SIZE, 0, i * GRID_SIZE, height]}
                    stroke="#f1f5f9"
                    strokeWidth={1}
                />
            );
        }
        for (let i = 0; i <= height / GRID_SIZE; i++) {
            lines.push(
                <Line
                    key={`h-${i}`}
                    points={[0, i * GRID_SIZE, width, i * GRID_SIZE]}
                    stroke="#f1f5f9"
                    strokeWidth={1}
                />
            );
        }
        return lines;
    };

    return (
        <div className="w-full h-full bg-slate-50 overflow-hidden relative">
            <Stage
                ref={stageRef}
                width={window.innerWidth}
                height={window.innerHeight}
                scaleX={zoomLevel}
                scaleY={zoomLevel}
                draggable
            >
                <Layer>
                    <Group x={100} y={100}>
                        {renderGrid()}
                        {activeLevel.layout?.map((el) => (
                            <Element
                                key={el.id}
                                element={el}
                                levelId={activeLevel.id}
                                isSelected={selectedElementId === el.id}
                                onSelect={setSelectedElement}
                            />
                        ))}
                    </Group>
                </Layer>
            </Stage>
        </div>
    );
};

export default FloorDesigner2D;
