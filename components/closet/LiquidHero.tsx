import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { MeshTransmissionMaterial, Text, Float, Environment, Lightformer } from '@react-three/drei';
import { useScroll, useTransform, motion } from 'framer-motion';
import * as THREE from 'three';

function LiquidSphere({ scrollY }: { scrollY: any }) {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (!meshRef.current) return;
        const time = state.clock.getElapsedTime();

        // Subtle breathing/liquid motion
        meshRef.current.position.y = Math.sin(time * 0.5) * 0.1;
        meshRef.current.rotation.x = Math.sin(time * 0.3) * 0.1;
        meshRef.current.rotation.z = Math.cos(time * 0.2) * 0.1;

        // Distortion effect (simulated by scaling for now, could be shader)
        const distortion = Math.sin(time * 2) * 0.02;
        meshRef.current.scale.set(1 + distortion, 1 - distortion, 1 + distortion);
    });

    return (
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
            <mesh ref={meshRef} scale={1.5}>
                <sphereGeometry args={[1, 64, 64]} />
                <MeshTransmissionMaterial
                    backside
                    samples={4}
                    thickness={0.5}
                    chromaticAberration={0.1}
                    anisotropy={0.1}
                    distortion={0.4}
                    distortionScale={0.5}
                    temporalDistortion={0.1}
                    iridescence={0.5}
                    iridescenceIOR={1}
                    iridescenceThicknessRange={[0, 1400]}
                    roughness={0.1}
                    clearcoat={1}
                    color="#e0f2fe"
                />
            </mesh>
        </Float>
    );
}

function Background() {
    return (
        <Environment preset="city">
            <Lightformer intensity={4} rotation-x={Math.PI / 2} position={[0, 5, -9]} scale={[10, 10, 1]} />
            <Lightformer intensity={2} rotation-y={Math.PI / 2} position={[-5, 1, -1]} scale={[10, 2, 1]} />
            <Lightformer intensity={2} rotation-y={Math.PI / 2} position={[-5, -1, -1]} scale={[10, 2, 1]} />
            <Lightformer intensity={2} rotation-y={-Math.PI / 2} position={[10, 1, 0]} scale={[20, 2, 1]} />
        </Environment>
    );
}

interface LiquidHeroProps {
    totalItems: number;
    totalValue: number;
}

export default function LiquidHero({ totalItems, totalValue }: LiquidHeroProps) {
    const { scrollY } = useScroll();

    return (
        <div className="relative h-[40vh] w-full overflow-hidden bg-gradient-to-b from-blue-50/50 to-transparent dark:from-blue-900/20">
            <div className="absolute inset-0 z-0">
                <Canvas camera={{ position: [0, 0, 5], fov: 45 }} dpr={[1, 2]}>
                    <LiquidSphere scrollY={scrollY} />
                    <Background />
                    <ambientLight intensity={0.5} />
                    <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
                </Canvas>
            </div>

            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="text-center"
                >
                    <h1 className="text-4xl md:text-6xl font-serif font-bold text-slate-800 dark:text-slate-100 tracking-tight mb-2 drop-shadow-lg">
                        Tu Armario
                    </h1>
                    <div className="flex gap-6 justify-center text-sm md:text-base font-medium text-slate-600 dark:text-slate-300 bg-white/30 dark:bg-black/30 backdrop-blur-md px-6 py-2 rounded-full border border-white/20">
                        <span>{totalItems} Prendas</span>
                        <span className="w-px h-4 bg-slate-400/50 my-auto"></span>
                        <span>${totalValue.toLocaleString()} Valor</span>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
