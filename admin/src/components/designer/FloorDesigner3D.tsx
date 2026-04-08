import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows, Float, Text } from '@react-three/drei';
import { useFloorPlanStore } from '../../lib/floorPlanStore';

const SCALE = 0.05; // 1px = 5cm

const Element3D = ({ element }: any) => {
    const wallHeight = element.type === 'PARTITION' ? 1.5 : 2.8;
    const isShelf = element.type === 'SHELF';
    const isPortal = element.type === 'DOOR' || element.type === 'WINDOW';
    
    // Only render 3D-relevant elements
    if (element.type === 'TEXT') return null;

    const width = element.width * SCALE;
    const depth = element.height * SCALE;
    const height = isShelf ? 2.0 : (isPortal ? (element.type === 'DOOR' ? 2.1 : 1.2) : wallHeight);
    const yPos = isPortal && element.type === 'WINDOW' ? 1.0 : height / 2;

    const getColor = () => {
        switch (element.type) {
            case 'WALL': return '#e2e8f0';
            case 'PARTITION': return '#94a3b8';
            case 'SHELF': return '#3b82f6';
            case 'DOOR': return '#78350f';
            case 'WINDOW': return '#bae6fd';
            default: return '#cbd5e1';
        }
    };

    return (
        <group 
            position={[
                (element.x + element.width / 2) * SCALE, 
                yPos, 
                (element.y + element.height / 2) * SCALE
            ]}
            rotation={[0, -(element.rotation || 0) * Math.PI / 180, 0]}
        >
            <mesh castShadow receiveShadow>
                <boxGeometry args={[width, isPortal ? (element.type === 'DOOR' ? 2.1 : 1.2) : height, depth]} />
                <meshStandardMaterial 
                    color={getColor()} 
                    transparent={element.type === 'WINDOW'} 
                    opacity={element.type === 'WINDOW' ? 0.4 : 1}
                    roughness={0.3}
                />
            </mesh>
            {isShelf && element.label && (
                <Text
                    position={[0, height / 2 + 0.2, 0]}
                    fontSize={0.2}
                    color="black"
                    anchorX="center"
                    anchorY="middle"
                >
                    {element.label}
                </Text>
            )}
        </group>
    );
};

const FloorDesigner3D: React.FC = () => {
    const { levels, activeLevelId } = useFloorPlanStore();
    const activeLevel = levels.find(l => l.id === activeLevelId);

    if (!activeLevel) return null;

    return (
        <div className="w-full h-full bg-slate-900 overflow-hidden">
            <Canvas shadows>
                <PerspectiveCamera makeDefault position={[20, 20, 20]} fov={50} />
                <OrbitControls makeDefault />
                
                <Suspense fallback={null}>
                    <Environment preset="city" />
                    
                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} intensity={1} castShadow />
                    
                    {/* Floor */}
                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[50, 0, 50]} receiveShadow>
                        <planeGeometry args={[120, 120]} />
                        <meshStandardMaterial color="#1e293b" roughness={0.8} />
                    </mesh>

                    <group position={[0, 0, 0]}>
                        {activeLevel.layout?.map((el) => (
                            <Element3D key={el.id} element={el} />
                        ))}
                    </group>

                    <ContactShadows 
                        position={[50, 0.01, 50]} 
                        opacity={0.4} 
                        scale={120} 
                        blur={2.4} 
                        far={10} 
                    />
                </Suspense>
            </Canvas>
            
            <div className="absolute top-6 left-6 z-10">
                <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20">
                    <p className="text-[10px] font-black text-white uppercase tracking-widest italic">3D Rendering Enabled</p>
                    <p className="text-sm font-black text-white">{activeLevel.name}</p>
                </div>
            </div>
        </div>
    );
};

export default FloorDesigner3D;
