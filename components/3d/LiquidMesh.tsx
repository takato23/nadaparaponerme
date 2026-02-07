import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { MeshTransmissionMaterial } from '@react-three/drei';
import { Color, MathUtils, Vector3 } from 'three';
import type { IcosahedronGeometry, Mesh } from 'three';
import { easing } from 'maath';
import { useScrollProgress } from '../../hooks/useScrollProgress';

interface LiquidMeshProps {
    section: string;
}

export const LiquidMesh: React.FC<LiquidMeshProps> = ({ section }) => {
    const mesh = useRef<Mesh | null>(null);
    const material = useRef<any>(null);
    const { viewport, pointer } = useThree();
    const { progress } = useScrollProgress(); // Track global scroll

    // Configuration for each section
    const config = useMemo(() => {
        return {
            home: {
                position: [0, 0, 0],
                scale: 1.5,
                color: '#2DD4BF', // Teal start
                distortion: 0.5,
                roughness: 0.1,
            },
            closet: {
                position: [viewport.width / 3, 0, -2],
                scale: 1.0,
                color: '#A78BFA', // Purple
                distortion: 0.8,
                roughness: 0.2,
            },
            stylist: {
                position: [0, 1, 0],
                scale: 0.8,
                color: '#F472B6', // Pink
                distortion: 1.2, // High distortion for "brain" activity
                roughness: 0.3,
            },
            auth: {
                position: [0, 0, 0],
                scale: 1.3,
                color: '#6366f1', // Indigo/Violet
                distortion: 0.4,
                roughness: 0.05,
            },
            landing: {
                position: [0, 0, 0],
                scale: 1.5,
                color: '#ffffff', // Base color, will be overridden
                distortion: 0.2,
                roughness: 0.1,
            },
            default: {
                position: [0, 0, 0],
                scale: 1,
                color: '#ffffff',
                distortion: 0.0,
                roughness: 0.1,
            }
        };
    }, [viewport]);

    // Mobile detection
    const isMobile = viewport.width < 5;

    // Geometry detail based on device
    const geometryDetail = isMobile ? 4 : 10;

    // Store original positions for deformation
    const originalPositions = useRef<Float32Array | null>(null);
    const geometryRef = useRef<IcosahedronGeometry | null>(null);

    // Reusable objects to avoid GC in useFrame
    const mouseVec = useMemo(() => new Vector3(), []);

    useFrame((state, delta) => {
        if (!mesh.current || !material.current) return;

        // Initialize original positions once
        if (geometryRef.current && (!originalPositions.current || originalPositions.current.length !== geometryRef.current.attributes.position.array.length)) {
            originalPositions.current = geometryRef.current.attributes.position.array.slice() as Float32Array;
        }

        let target = config[section as keyof typeof config] || config.default;

        // SCROLLYTELLING LOGIC FOR HOME
        if (section === 'home') {
            const scrollColor = new Color().set('#2DD4BF');
            if (progress < 0.5) {
                scrollColor.lerp(new Color('#3B82F6'), progress * 2);
            } else {
                scrollColor.set('#3B82F6').lerp(new Color('#8B5CF6'), (progress - 0.5) * 2);
            }

            const scrollDistortion = 0.5 + progress * 1.0;
            const scrollY = progress * 2;

            target = {
                ...target,
                color: '#' + scrollColor.getHexString(),
                distortion: scrollDistortion,
                position: [0, -scrollY * 0.5, 0]
            };

            easing.dampC(material.current.color, scrollColor, 0.5, delta);
        } else if (section === 'landing') {
            const scroll = progress;
            let targetDistortion = 0.3;
            const targetColor = new Color('#FF9A9E');
            let targetRoughness = 0.2;

            if (scroll < 0.25) {
                targetDistortion = 0.3;
                targetColor.set('#FF9A9E');
                targetRoughness = 0.2;
            } else if (scroll < 0.5) {
                const t = (scroll - 0.25) / 0.25;
                targetDistortion = MathUtils.lerp(0.3, 2.0, t);
                targetColor.set('#FF3B30');
                targetRoughness = 0.3;
            } else if (scroll < 0.75) {
                const t = (scroll - 0.5) / 0.25;
                targetDistortion = MathUtils.lerp(2.0, 0.1, t);
                targetColor.set('#A0A0A0');
                targetRoughness = 0.05;
            } else {
                const t = (scroll - 0.75) / 0.25;
                targetDistortion = MathUtils.lerp(0.1, 0.8, t);
                targetColor.set('#8B5CF6');
                targetRoughness = 0.1;
            }

            target = {
                ...target,
                distortion: targetDistortion,
                color: '#' + targetColor.getHexString(),
                roughness: targetRoughness,
            };

            easing.dampC(material.current.color, targetColor, 0.5, delta);
            if (material.current.roughness !== undefined) {
                easing.damp(material.current, 'roughness', targetRoughness, 0.5, delta);
            }
        } else if (section === 'auth') {
            // Auth Transition Logic - "Arrebatarse"
            target = {
                ...target,
                position: [0, 0, 0],
                scale: 1.2,
                distortion: 0.8,
                roughness: 0.0,
            };
            easing.dampC(material.current.color, new Color(target.color), 0.15, delta);
        } else {
            easing.dampC(material.current.color, target.color, 0.5, delta);
        }

        // Animate Position & Scale
        easing.damp3(mesh.current.position, new Vector3(...target.position as [number, number, number]), 0.5, delta);
        easing.damp(mesh.current.scale, 'x', target.scale, 0.5, delta);
        easing.damp(mesh.current.scale, 'y', target.scale, 0.5, delta);
        easing.damp(mesh.current.scale, 'z', target.scale, 0.5, delta);

        // Mouse interaction
        const dist = Math.sqrt(pointer.x * pointer.x + pointer.y * pointer.y);
        const maxDist = isMobile ? 0.8 : 0.6;
        const hoverIntensity = Math.max(0, 1 - dist / maxDist);

        const mouseX = (pointer.x * viewport.width) / 2;
        const mouseY = (pointer.y * viewport.height) / 2;

        // Rotate
        const rotationSpeed = section === 'auth' ? 2.0 : 0.1;
        mesh.current.rotation.x = MathUtils.lerp(mesh.current.rotation.x, mouseY * 0.1 + state.clock.getElapsedTime() * rotationSpeed, 0.1);
        mesh.current.rotation.y = MathUtils.lerp(mesh.current.rotation.y, mouseX * 0.1 + state.clock.getElapsedTime() * (rotationSpeed * 1.5), 0.1);

        // Move
        const moveIntensity = 0.25;
        mesh.current.position.x = MathUtils.lerp(mesh.current.position.x, target.position[0] + (pointer.x * moveIntensity), 0.08);
        mesh.current.position.y = MathUtils.lerp(mesh.current.position.y, target.position[1] + (pointer.y * moveIntensity), 0.08);

        // VERTEX DISPLACEMENT (Refined "Viscous Water" Effect)
        if (geometryRef.current && originalPositions.current) {
            const positions = geometryRef.current.attributes.position.array as Float32Array;
            const originals = originalPositions.current;
            const count = positions.length / 3;
            let needsUpdate = false;

            if (section !== 'auth') {
                if (hoverIntensity > 0.01) {
                    // Optimization: Reuse vector
                    mouseVec.set(pointer.x * viewport.width / 2, pointer.y * viewport.height / 2, 1);
                    mesh.current.worldToLocal(mouseVec);

                    const forceRadius = 1.2;
                    const forceRadiusSq = forceRadius * forceRadius;
                    const time = state.clock.getElapsedTime();

                    // Optimization: Pre-calculate constants
                    const rippleSpeed = time * 2;
                    const noiseSpeed = time * 2;

                    for (let i = 0; i < count; i++) {
                        const ix = i * 3;
                        const iy = i * 3 + 1;
                        const iz = i * 3 + 2;

                        const ox = originals[ix];
                        const oy = originals[iy];
                        const oz = originals[iz];

                        const dx = mouseVec.x - ox;
                        const dy = mouseVec.y - oy;
                        const dz = mouseVec.z - oz;
                        const dSq = dx * dx + dy * dy + dz * dz; // Squared distance check is faster

                        let tx = ox;
                        let ty = oy;
                        let tz = oz;

                        if (dSq < forceRadiusSq) {
                            const d = Math.sqrt(dSq);
                            const ripple = Math.cos(d * 5 - rippleSpeed) * 0.5 + 0.5;
                            const force = (1 - d / forceRadius) * hoverIntensity * 0.3;
                            const noise = Math.sin(noiseSpeed + oy * 3) * 0.05;

                            tx = ox + dx * force * ripple + noise;
                            ty = oy + dy * force * ripple + noise;
                            tz = oz + dz * force * ripple + noise;
                        }

                        const lerpFactor = 0.1;

                        if (Math.abs(positions[ix] - tx) > 0.001) {
                            positions[ix] = positions[ix] + (tx - positions[ix]) * lerpFactor; // Raw math lerp
                            positions[iy] = positions[iy] + (ty - positions[iy]) * lerpFactor;
                            positions[iz] = positions[iz] + (tz - positions[iz]) * lerpFactor;
                            needsUpdate = true;
                        }
                    }
                } else {
                    // Reset slowly
                    for (let i = 0; i < count; i++) {
                        const ix = i * 3;
                        const iy = i * 3 + 1;
                        const iz = i * 3 + 2;
                        if (Math.abs(positions[ix] - originals[ix]) > 0.001) {
                            positions[ix] = positions[ix] + (originals[ix] - positions[ix]) * 0.05;
                            positions[iy] = positions[iy] + (originals[iy] - positions[iy]) * 0.05;
                            positions[iz] = positions[iz] + (originals[iz] - positions[iz]) * 0.05;
                            needsUpdate = true;
                        }
                    }
                }
            } else {
                // In Auth mode, snap back faster
                for (let i = 0; i < count; i++) {
                    const ix = i * 3;
                    const iy = i * 3 + 1;
                    const iz = i * 3 + 2;
                    if (Math.abs(positions[ix] - originals[ix]) > 0.001) {
                        positions[ix] = positions[ix] + (originals[ix] - positions[ix]) * 0.2;
                        positions[iy] = positions[iy] + (originals[iy] - positions[iy]) * 0.2;
                        positions[iz] = positions[iz] + (originals[iz] - positions[iz]) * 0.2;
                        needsUpdate = true;
                    }
                }
            }

            if (needsUpdate) {
                geometryRef.current.attributes.position.needsUpdate = true;
                geometryRef.current.computeVertexNormals();
            }
        }

        // MATERIAL DEFORMATION
        if (material.current) {
            const baseDistortion = target.distortion;
            const baseTemporalDistortion = 0.1;
            const baseDistortionScale = 0.5;
            const baseChromaticAberration = 0.02;

            const hoverDistortion = 0.5;
            const hoverTemporalDistortion = 0.2;
            const hoverDistortionScale = 0.4;
            const hoverChromaticAberration = 0.08;

            const finalDistortion = MathUtils.lerp(baseDistortion, hoverDistortion, hoverIntensity);
            const finalTemporalDistortion = MathUtils.lerp(baseTemporalDistortion, hoverTemporalDistortion, hoverIntensity);
            const finalDistortionScale = MathUtils.lerp(baseDistortionScale, hoverDistortionScale, hoverIntensity);
            const finalChromaticAberration = MathUtils.lerp(baseChromaticAberration, hoverChromaticAberration, hoverIntensity);

            easing.damp(material.current, 'distortion', finalDistortion, 0.25, delta);
            easing.damp(material.current, 'temporalDistortion', finalTemporalDistortion, 0.25, delta);
            easing.damp(material.current, 'distortionScale', finalDistortionScale, 0.25, delta);
            easing.damp(material.current, 'chromaticAberration', finalChromaticAberration, 0.25, delta);

            const targetColorHex = target.color.startsWith('#') ? target.color : '#' + target.color;
            easing.dampC(material.current.color, targetColorHex, 0.2, delta);

            if (material.current.roughness !== undefined && target.roughness !== undefined) {
                easing.damp(material.current, 'roughness', target.roughness, 0.25, delta);
            }
        }
    });

    return (
        <mesh ref={mesh}>
            <icosahedronGeometry ref={geometryRef} args={[1, geometryDetail]} />
            <MeshTransmissionMaterial
                ref={material}
                backside
                samples={isMobile ? 2 : 4}
                resolution={isMobile ? 512 : 1024}
                thickness={2}
                chromaticAberration={0.02}
                anisotropy={0.1}
                distortion={0.5}
                distortionScale={0.5}
                temporalDistortion={0.1}
                iridescence={0.5}
                iridescenceIOR={1}
                iridescenceThicknessRange={[0, 1400]}
                roughness={0.1}
                clearcoat={1}
                attenuationDistance={0.5}
                attenuationColor="#ffffff"
                color="#ffffff"
                background={new Color('#ffffff')}
            />
        </mesh>
    );
};
