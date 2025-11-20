import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Preload, PerformanceMonitor, AdaptiveDpr } from '@react-three/drei';
import { SceneOrchestrator } from './SceneOrchestrator';

interface GlobalCanvasProps {
    children?: React.ReactNode;
    isAuth?: boolean;
}

export const GlobalCanvas: React.FC<GlobalCanvasProps> = ({ isAuth }) => {
    const [dpr, setDpr] = React.useState(1); // Start conservative at 1

    return (
        <div className="fixed inset-0 pointer-events-none -z-10 bg-[#F5F5F7]">
            <Canvas
                dpr={dpr}
                gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }} // Disable AA for perf
                camera={{ position: [0, 0, 5], fov: 45 }}
                style={{ background: 'transparent', pointerEvents: 'auto' }}
                eventSource={document.body}
                eventPrefix="client"
            >
                <PerformanceMonitor onIncline={() => setDpr(1.5)} onDecline={() => setDpr(0.75)}>
                    <AdaptiveDpr pixelated />
                </PerformanceMonitor>

                <Suspense fallback={null}>
                    <SceneOrchestrator isAuth={isAuth} />
                    <Preload all />
                </Suspense>
            </Canvas>
        </div>
    );
};
