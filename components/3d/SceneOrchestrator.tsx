import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useLocation } from 'react-router-dom';
import { Environment, Float, Lightformer } from '@react-three/drei';
import { LiquidMesh } from './LiquidMesh';
import * as THREE from 'three';

interface SceneOrchestratorProps {
    isAuth?: boolean;
}

export const SceneOrchestrator: React.FC<SceneOrchestratorProps> = ({ isAuth }) => {
    const location = useLocation();
    const { viewport } = useThree();

    // Determine current section based on path or auth state
    const getSection = () => {
        if (isAuth) return 'auth';

        // If we are on the landing page (root path and not authenticated)
        if (location.pathname === '/') {
            // We can check scroll position or just return a default 'landing' state
            // Ideally, LiquidMesh should handle the scroll-based morphing internally if it's in 'landing' mode
            return 'landing';
        }

        switch (location.pathname) {
            case '/closet': return 'closet';
            case '/outfits': return 'outfits';
            case '/community': return 'community';
            default: return 'home';
        }
    };

    const section = getSection();

    return (
        <>
            {/* Lighting Environment */}
            <Environment resolution={512}>
                <Lightformer intensity={2} rotation-x={Math.PI / 2} position={[0, 4, -9]} scale={[10, 1, 1]} />
                <Lightformer intensity={2} rotation-x={Math.PI / 2} position={[0, 4, -6]} scale={[10, 1, 1]} />
                <group rotation={[Math.PI / 2, 1, 0]}>
                    <Lightformer intensity={5} rotation-y={Math.PI / 2} position={[-5, 1, -1]} scale={[50, 2, 1]} />
                    <Lightformer intensity={5} rotation-y={Math.PI / 2} position={[-5, -1, -1]} scale={[50, 2, 1]} />
                    <Lightformer intensity={5} rotation-y={-Math.PI / 2} position={[10, 1, 0]} scale={[50, 2, 1]} />
                </group>
            </Environment>

            <ambientLight intensity={0.5} />
            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />

            {/* The Main Actor: Liquid Mesh */}
            <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
                <LiquidMesh section={section} />
            </Float>
        </>
    );
};
