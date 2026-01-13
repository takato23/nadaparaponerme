/**
 * Eye3D - "Ojo de loca" prototype (V27)
 *
 * Goals:
 * - Iris + pupil (with dilation) visible and crisp
 * - Eyelids that blink (top + bottom) and track gaze subtly
 * - Eyelashes (stylized but readable)
 * - Smooth mouse-follow (no random jitter)
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Float, Lightformer } from '@react-three/drei';
import * as THREE from 'three';

const STENCIL_REF_APERTURE = 1;
const STENCIL_REF_EYE_REGION = 2;
const RENDER_ORDER = {
    mask: 0,
    eyeball: 1,
    eyeballFX: 2, // cornea/highlights
    rim: 3,
    lids: 4,
    lashes: 5,
} as const;

// V27 tuning knobs (keep it local to this file for fast iteration)
const V27_TUNING = {
    render: {
        exposure: 1.08,
    },
    lights: {
        ambient: 0.35,
        key: { intensity: 1.85, pos: new THREE.Vector3(5, 5.2, 6.2) },
        fill: { intensity: 0.55, pos: new THREE.Vector3(-4.5, 1.0, 5.2) },
        rim: { intensity: 0.45, pos: new THREE.Vector3(0.0, 2.2, -3.2) },
    },
    // 1) Aperture (what part of the eyeball is visible)
    aperture: {
        outerW: 3.15,
        outerH: 1.95,
        innerW: 2.35,
        innerH: 1.2,
        outerUpperK: 0.86,
        outerLowerK: 0.78,
        innerUpperK: 0.78,
        innerLowerK: 0.7,
        shapeSegments: 96,
    },
    // 2) Silhouette + blink sealing (outer stays readable, inner closes harder)
    blink: {
        outerMinY: 0.18,
        innerMinY: 0.01,
    },
    // 3) Rim / waterline thickness + placement
    rim: {
        rimRadius: 0.043,
        waterlineRadius: 0.026,
        rimPos: new THREE.Vector3(0, -0.01, 1.01),
        waterlinePos: new THREE.Vector3(0, -0.012, 1.015),
        rimCurve: { wMul: 1.03, hMul: 1.01, upperK: 0.8, lowerK: 0.72, segments: 240, radial: 16 },
        waterlineCurve: { wMul: 0.99, hMul: 0.92, upperK: 0.78, lowerK: 0.7, segments: 210, radial: 16 },
    },
    // 4) Wetness / translucency
    wetness: {
        waterlineOpacity: 0.46,
        waterlineClearcoat: 0.98,
        waterlineRoughness: 0.12,
    },
    // 5) Contact shadow softness
    contactShadow: {
        opacity: 0.1,
        radius: 0.055,
        segments: 210,
        radial: 12,
        pos: new THREE.Vector3(0, -0.016, 1.002),
    },
    // Lid ribbon (procedural loft)
    lids: {
        edgeW: 2.35 * 0.985 * 1.005,
        edgeH: 1.2 * 0.965 * 0.94,
        edgeUpperK: 0.78,
        edgeLowerK: 0.7,
        edgeZ: 1.004,
        edgeBulge: 0.018,
        ribbonWidth: 0.19,
        ribbonBack: 0.095,
        upperLift: 0.06,
        lowerLift: -0.03,
        segments: 120,
    },
    lashes: {
        // Important: lashes must live in STENCIL_REF_EYE_REGION (2), not inside aperture (1)
        rootOut: 0.018,
        topForward: 1.45,
        bottomForward: 1.05,
        topOutwardWeight: 0.38,
        bottomOutwardWeight: 0.3,
        posAlongDir: 0.042,
        viewLift: 0.03,
        topLengthMul: 1.85,
        bottomLengthMul: 1.9,
        thickness: 0.012,
        polygonOffsetFactor: -8,
        // Material readability (beauty render)
        roughness: 0.55,
        clearcoat: 0.35,
        clearcoatRoughness: 0.28,
        specularIntensity: 0.85,
    },
    socket: {
        // Replace the old "big sphere" grey oval with a shaped vignette backdrop
        wMul: 1.85,
        hMul: 1.55,
        z: -0.95,
        y: -0.02,
        opacity: 0.95,
        color: '#0b1017',
    },
} as const;

const EYE_COLORS = {
    ocean: { iris: '#00B4D8', pupil: '#020202', name: 'Océano', glow: '#90e0ef' },
    emerald: { iris: '#10B981', pupil: '#064e3b', name: 'Esmeralda', glow: '#6ee7b7' },
    amber: { iris: '#F59E0B', pupil: '#451a03', name: 'Ámbar', glow: '#fcd34d' },
    violet: { iris: '#8B5CF6', pupil: '#3b0764', name: 'Violeta', glow: '#c4b5fd' },
    void: { iris: '#374151', pupil: '#000000', name: 'Vacío', glow: '#9ca3af' },
    cyber: { iris: '#EC4899', pupil: '#831843', name: 'Cyber', glow: '#fbcfe8' },
} as const;

export type EyeColorKey = keyof typeof EYE_COLORS;
type EyeColorScheme = (typeof EYE_COLORS)[EyeColorKey];
type PointerRef = React.MutableRefObject<{ x: number; y: number }>;
export type Eye3DVariant = 'playground' | 'landing';
export type Eye3DQuality = 'default' | 'watermark';

function WatermarkFrameDriver({
    enabled,
    fps,
    reduced,
}: {
    enabled: boolean;
    fps: number;
    reduced: boolean;
}) {
    const invalidate = useThree((s) => s.invalidate);

    useEffect(() => {
        if (!enabled) return;
        invalidate();
    }, [enabled, invalidate]);

    useEffect(() => {
        if (!enabled || reduced) return;
        const clampedFps = Number.isFinite(fps) ? Math.min(30, Math.max(10, fps)) : 24;
        const intervalMs = Math.round(1000 / clampedFps);
        const tick = () => {
            if (document.visibilityState === 'visible') invalidate();
        };
        const intervalId = window.setInterval(tick, intervalMs);
        document.addEventListener('visibilitychange', tick);
        return () => {
            window.clearInterval(intervalId);
            document.removeEventListener('visibilitychange', tick);
        };
    }, [enabled, reduced, fps, invalidate]);

    return null;
}

function clamp01(v: number) {
    return Math.min(1, Math.max(0, v));
}

function lerp(a: number, b: number, t: number) {
    return a + (b - a) * t;
}

function createAlmondShape(w: number, h: number, upperK: number, lowerK: number) {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0);
    s.bezierCurveTo(-w * 0.28, h * upperK, w * 0.28, h * upperK, w / 2, 0);
    s.bezierCurveTo(w * 0.28, -h * lowerK, -w * 0.28, -h * lowerK, -w / 2, 0);
    return s;
}

function createAlmondBezierCurves(w: number, h: number, upperK: number, lowerK: number) {
    const p0 = new THREE.Vector3(-w / 2, 0, 0);
    const p1 = new THREE.Vector3(-w * 0.28, h * upperK, 0);
    const p2 = new THREE.Vector3(w * 0.28, h * upperK, 0);
    const p3 = new THREE.Vector3(w / 2, 0, 0);

    const p4 = new THREE.Vector3(w * 0.28, -h * lowerK, 0);
    const p5 = new THREE.Vector3(-w * 0.28, -h * lowerK, 0);

    return {
        upper: new THREE.CubicBezierCurve3(p0, p1, p2, p3),
        lower: new THREE.CubicBezierCurve3(p3, p4, p5, p0),
    } as const;
}

function createAlmondClosedCurve(w: number, h: number, upperK: number, lowerK: number) {
    const { upper, lower } = createAlmondBezierCurves(w, h, upperK, lowerK);

    const pts: THREE.Vector3[] = [];
    const seg = 80;
    for (let i = 0; i <= seg; i++) pts.push(upper.getPoint(i / seg));
    for (let i = 1; i < seg; i++) pts.push(lower.getPoint(i / seg));

    // "centripetal" avoids overshoot at corners and reads more organic for rims.
    return new THREE.CatmullRomCurve3(pts, true, 'centripetal');
}

function useIrisTexture(colorHex: string) {
    return useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        const w = canvas.width;
        const h = canvas.height;
        const cx = w / 2;
        const cy = h / 2;
        const r = w / 2;

        ctx.clearRect(0, 0, w, h);
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.clip();

        const gradBase = ctx.createRadialGradient(cx, cy, r * 0.05, cx, cy, r);
        gradBase.addColorStop(0, '#0b0b0e');
        gradBase.addColorStop(0.2, colorHex);
        gradBase.addColorStop(0.6, colorHex);
        gradBase.addColorStop(1, '#050507');
        ctx.fillStyle = gradBase;
        ctx.fillRect(0, 0, w, h);

        // Fibers
        for (let i = 0; i < 3200; i++) {
            const angle = Math.random() * Math.PI * 2;
            const inner = r * (0.14 + Math.random() * 0.18);
            const outer = r * (0.55 + Math.random() * 0.42);
            const thickness = 0.6 + Math.random() * 1.6;
            const alpha = 0.02 + Math.random() * 0.12;

            ctx.beginPath();
            ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
            ctx.lineWidth = thickness;
            ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
            ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
            ctx.stroke();
        }

        // Speckles
        for (let i = 0; i < 2200; i++) {
            const angle = Math.random() * Math.PI * 2;
            const rr = r * Math.pow(Math.random(), 1.6);
            const x = cx + Math.cos(angle) * rr;
            const y = cy + Math.sin(angle) * rr;
            const a = 0.01 + Math.random() * 0.06;
            const size = 1 + Math.random() * 2.5;
            ctx.fillStyle = `rgba(0,0,0,${a})`;
            ctx.fillRect(x, y, size, size);
        }

        // Limbal ring
        const gradOuter = ctx.createRadialGradient(cx, cy, r * 0.75, cx, cy, r);
        gradOuter.addColorStop(0, 'rgba(0,0,0,0)');
        gradOuter.addColorStop(1, 'rgba(0,0,0,0.9)');
        ctx.fillStyle = gradOuter;
        ctx.fillRect(0, 0, w, h);

        // Inner ring near pupil
        const gradInner = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r * 0.45);
        gradInner.addColorStop(0, 'rgba(0,0,0,0.75)');
        gradInner.addColorStop(0.4, 'rgba(0,0,0,0.1)');
        gradInner.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gradInner;
        ctx.fillRect(0, 0, w, h);

        ctx.restore();

        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        return tex;
    }, [colorHex]);
}

function useScleraTexture() {
    return useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        const w = canvas.width;
        const h = canvas.height;
        const cx = w / 2;
        const cy = h / 2;

        const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, w / 2);
        grad.addColorStop(0, '#fbfbfb');
        grad.addColorStop(1, '#f0f0f0');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        ctx.globalAlpha = 0.12;
        ctx.strokeStyle = '#c55a5a';
        ctx.lineWidth = 0.8;
        for (let i = 0; i < 1200; i++) {
            const x = Math.random() * w;
            const y = Math.random() * h;
            const dx = (Math.random() - 0.5) * 40;
            const dy = (Math.random() - 0.5) * 40;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.bezierCurveTo(x + dx * 0.3, y + dy * 0.2, x + dx * 0.6, y + dy * 0.8, x + dx, y + dy);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;

        const vignette = ctx.createRadialGradient(cx, cy, w * 0.2, cx, cy, w * 0.55);
        vignette.addColorStop(0, 'rgba(255,255,255,0)');
        vignette.addColorStop(1, 'rgba(0,0,0,0.10)');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, w, h);

        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        return tex;
    }, []);
}

function useSocketVignetteAlpha() {
    return useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        const w = canvas.width;
        const h = canvas.height;
        const cx = w / 2;
        const cy = h / 2;

        ctx.clearRect(0, 0, w, h);

        // Soft outer fade + slightly darker center; alphaMap expects grayscale.
        const grad = ctx.createRadialGradient(cx, cy, w * 0.08, cx, cy, w * 0.52);
        grad.addColorStop(0, 'rgba(255,255,255,0.95)');
        grad.addColorStop(0.6, 'rgba(255,255,255,0.55)');
        grad.addColorStop(1, 'rgba(255,255,255,0.0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Tiny dithering noise to avoid visible banding in large gradients.
        const img = ctx.getImageData(0, 0, w, h);
        const data = img.data;
        for (let i = 0; i < data.length; i += 4) {
            const n = (Math.random() - 0.5) * 14;
            data[i] = Math.max(0, Math.min(255, data[i] + n));
            data[i + 1] = data[i];
            data[i + 2] = data[i];
        }
        ctx.putImageData(img, 0, 0);

        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.NoColorSpace;
        tex.anisotropy = 4;
        return tex;
    }, []);
}

function useSocketVignetteMap() {
    return useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        const w = canvas.width;
        const h = canvas.height;
        const cx = w / 2;
        const cy = h / 2;

        ctx.clearRect(0, 0, w, h);

        const grad = ctx.createRadialGradient(cx, cy, w * 0.05, cx, cy, w * 0.62);
        grad.addColorStop(0, '#141f2b');
        grad.addColorStop(0.45, '#0b1017');
        grad.addColorStop(1, '#05070b');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Very subtle film grain.
        ctx.globalAlpha = 0.08;
        for (let i = 0; i < 14000; i++) {
            const x = Math.random() * w;
            const y = Math.random() * h;
            const v = 10 + Math.random() * 18;
            ctx.fillStyle = `rgb(${v},${v},${v})`;
            ctx.fillRect(x, y, 1, 1);
        }
        ctx.globalAlpha = 1;

        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        return tex;
    }, []);
}

function useApertureOcclusionAlpha() {
    return useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        const w = canvas.width;
        const h = canvas.height;

        ctx.clearRect(0, 0, w, h);

        // Vertical gradient: darker at top (upper lid shadow), light at bottom.
        const vg = ctx.createLinearGradient(0, 0, 0, h);
        vg.addColorStop(0, 'rgba(255,255,255,0.95)');
        vg.addColorStop(0.32, 'rgba(255,255,255,0.52)');
        vg.addColorStop(1, 'rgba(255,255,255,0.05)');
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, w, h);

        // Corner vignette to sell "caruncle / corner occlusion" without extra geo.
        const g1 = ctx.createRadialGradient(w * 0.18, h * 0.48, 10, w * 0.18, h * 0.48, w * 0.42);
        g1.addColorStop(0, 'rgba(255,255,255,0.9)');
        g1.addColorStop(1, 'rgba(255,255,255,0.0)');
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = g1;
        ctx.fillRect(0, 0, w, h);

        const g2 = ctx.createRadialGradient(w * 0.82, h * 0.48, 10, w * 0.82, h * 0.48, w * 0.42);
        g2.addColorStop(0, 'rgba(255,255,255,0.75)');
        g2.addColorStop(1, 'rgba(255,255,255,0.0)');
        ctx.fillStyle = g2;
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'source-over';

        // Dither to avoid banding.
        const img = ctx.getImageData(0, 0, w, h);
        const data = img.data;
        for (let i = 0; i < data.length; i += 4) {
            const n = (Math.random() - 0.5) * 18;
            const v = Math.max(0, Math.min(255, data[i] + n));
            data[i] = v;
            data[i + 1] = v;
            data[i + 2] = v;
        }
        ctx.putImageData(img, 0, 0);

        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.NoColorSpace;
        tex.anisotropy = 4;
        return tex;
    }, []);
}

function useSkinMicroRoughnessMap() {
    return useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        const w = canvas.width;
        const h = canvas.height;
        const img = ctx.createImageData(w, h);
        const data = img.data;

        // High-frequency noise + some low frequency blobs to break spec.
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const i = (y * w + x) * 4;
                const hf = 0.85 + (Math.random() - 0.5) * 0.18;
                const lf =
                    0.08 *
                    (Math.sin((x / w) * Math.PI * 2.0) * Math.sin((y / h) * Math.PI * 2.0) +
                        Math.sin((x / w) * Math.PI * 4.0 + 1.7) * 0.6 +
                        Math.sin((y / h) * Math.PI * 3.0 + 0.3) * 0.6);
                const v = Math.max(0, Math.min(1, hf + lf));
                const c = Math.round(v * 255);
                data[i] = c;
                data[i + 1] = c;
                data[i + 2] = c;
                data[i + 3] = 255;
            }
        }
        ctx.putImageData(img, 0, 0);

        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.NoColorSpace;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(2, 2);
        tex.anisotropy = 8;
        return tex;
    }, []);
}

function Eyeball({ colors, mousePos }: { colors: EyeColorScheme; mousePos: PointerRef }) {
    const gazeRef = useRef<THREE.Group>(null);
    const pupilRef = useRef<THREE.Mesh>(null);

    const irisTex = useIrisTexture(colors.iris);
    const scleraTex = useScleraTexture();

    const stencilTest = useMemo(
        () => ({
            stencilWrite: true,
            stencilRef: STENCIL_REF_APERTURE,
            stencilFunc: THREE.EqualStencilFunc,
            stencilFail: THREE.KeepStencilOp,
            stencilZFail: THREE.KeepStencilOp,
            stencilZPass: THREE.KeepStencilOp,
        }),
        []
    );

    useFrame((state, delta) => {
        const x = mousePos.current.x;
        const y = mousePos.current.y;

        // Rotate the eyeball (avoids the "white interior gap" you get when sliding flat iris planes)
        if (gazeRef.current) {
            const targetYaw = THREE.MathUtils.clamp(x * 0.52, -0.52, 0.52);
            const targetPitch = THREE.MathUtils.clamp(-y * 0.34, -0.34, 0.34);
            gazeRef.current.rotation.y = THREE.MathUtils.damp(gazeRef.current.rotation.y, targetYaw, 9, delta);
            gazeRef.current.rotation.x = THREE.MathUtils.damp(gazeRef.current.rotation.x, targetPitch, 9, delta);
        }

        if (pupilRef.current) {
            const t = state.clock.elapsedTime;
            const dist = Math.min(1, Math.sqrt(x * x + y * y));
            const base = lerp(1.12, 0.88, dist);
            const pulse = 0.03 * Math.sin(t * 6.2) + 0.02 * Math.sin(t * 2.1);
            const s = THREE.MathUtils.clamp(base + pulse, 0.72, 1.28);
            const current = pupilRef.current.scale.x;
            const next = THREE.MathUtils.damp(current, s, 10, delta);
            pupilRef.current.scale.setScalar(next);
        }
    });

    return (
        <group ref={gazeRef}>
            <mesh castShadow receiveShadow renderOrder={RENDER_ORDER.eyeball}>
                <sphereGeometry args={[1, 64, 64]} />
                <meshPhysicalMaterial
                    color="#fbfbfb"
                    map={scleraTex ?? undefined}
                    roughness={0.32}
                    metalness={0}
                    clearcoat={0.35}
                    clearcoatRoughness={0.12}
                    {...stencilTest}
                />
            </mesh>

            {/* Iris + pupil are attached to the eyeball and rotate WITH it (prevents "inside gaps") */}
            <group position={[0, 0, 1.02]}>
                <mesh renderOrder={RENDER_ORDER.eyeball}>
                    <circleGeometry args={[0.46, 64]} />
                    <meshStandardMaterial
                        map={irisTex ?? undefined}
                        transparent
                        roughness={0.42}
                        metalness={0}
                        emissive={new THREE.Color(colors.glow)}
                        emissiveIntensity={0.1}
                        depthWrite={false}
                        polygonOffset
                        polygonOffsetFactor={-4}
                        {...stencilTest}
                    />
                </mesh>

                <mesh ref={pupilRef} position={[0, 0, 0.01]} renderOrder={RENDER_ORDER.eyeball}>
                    <circleGeometry args={[0.16, 64]} />
                    <meshStandardMaterial
                        color={colors.pupil}
                        roughness={0.25}
                        metalness={0}
                        emissive="#000"
                        emissiveIntensity={0.2}
                        depthWrite={false}
                        polygonOffset
                        polygonOffsetFactor={-5}
                        {...stencilTest}
                    />
                </mesh>

                <mesh position={[0, 0, 0.006]} renderOrder={RENDER_ORDER.eyeball}>
                    <ringGeometry args={[0.47, 0.5, 96]} />
                    <meshStandardMaterial color="#0b0b0b" transparent opacity={0.08} depthWrite={false} {...stencilTest} />
                </mesh>
            </group>

            <mesh renderOrder={RENDER_ORDER.eyeballFX}>
                <sphereGeometry args={[1.045, 64, 64]} />
                <meshPhysicalMaterial
                    transmission={1}
                    opacity={1}
                    roughness={0.02}
                    metalness={0}
                    ior={1.36}
                    thickness={0.07}
                    specularIntensity={1.1}
                    color="#ffffff"
                    transparent
                    {...stencilTest}
                />
            </mesh>

            <mesh position={[0.33, 0.28, 0.95]} renderOrder={RENDER_ORDER.eyeballFX}>
                <sphereGeometry args={[0.045, 16, 16]} />
                <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.8} transparent opacity={0.85} {...stencilTest} />
            </mesh>
        </group>
    );
}

function FaceSocket({ enabled }: { enabled: boolean }) {
    // Landing-page friendly socket backdrop (avoids the big grey "oval sphere" look).
    if (!enabled) return null;
    const alphaMap = useSocketVignetteAlpha();
    const colorMap = useSocketVignetteMap();
    const geo = useMemo(() => {
        const s = createAlmondShape(
            V27_TUNING.aperture.outerW * V27_TUNING.socket.wMul,
            V27_TUNING.aperture.outerH * V27_TUNING.socket.hMul,
            V27_TUNING.aperture.outerUpperK,
            V27_TUNING.aperture.outerLowerK
        );
        const g = new THREE.ShapeGeometry(s, 96);
        g.computeVertexNormals();
        return g;
    }, []);

    return (
        <group>
            <mesh geometry={geo} position={[0, V27_TUNING.socket.y, V27_TUNING.socket.z]} renderOrder={-10}>
                <meshBasicMaterial
                    color={V27_TUNING.socket.color}
                    map={colorMap ?? undefined}
                    transparent
                    opacity={V27_TUNING.socket.opacity}
                    alphaMap={alphaMap ?? undefined}
                    depthWrite={false}
                />
            </mesh>
        </group>
    );
}

function EyeAperture({
    z = 0.06,
    outerW = V27_TUNING.aperture.outerW,
    outerH = V27_TUNING.aperture.outerH,
    innerW = V27_TUNING.aperture.innerW,
    innerH = V27_TUNING.aperture.innerH,
    blink,
}: {
    z?: number;
    outerW?: number;
    outerH?: number;
    innerW?: number;
    innerH?: number;
    blink?: React.MutableRefObject<number>;
}) {
    const outerBlinkRef = useRef<THREE.Group>(null);
    const apertureBlinkRef = useRef<THREE.Group>(null);

    useFrame((_, delta) => {
        if (!blink) return;
        const t = clamp01(blink.current);
        const ease = t * t * (3 - 2 * t); // smoothstep
        const outerTargetY = THREE.MathUtils.lerp(1, V27_TUNING.blink.outerMinY, ease);
        const innerTargetY = THREE.MathUtils.lerp(1, V27_TUNING.blink.innerMinY, ease);
        if (outerBlinkRef.current) outerBlinkRef.current.scale.y = THREE.MathUtils.damp(outerBlinkRef.current.scale.y, outerTargetY, 18, delta);
        if (apertureBlinkRef.current) apertureBlinkRef.current.scale.y = THREE.MathUtils.damp(apertureBlinkRef.current.scale.y, innerTargetY, 18, delta);
    });

    const stencilInEyeRegion = useMemo(
        () => ({
            stencilWrite: true,
            stencilRef: 0,
            stencilFunc: THREE.NotEqualStencilFunc,
            stencilFail: THREE.KeepStencilOp,
            stencilZFail: THREE.KeepStencilOp,
            stencilZPass: THREE.KeepStencilOp,
        }),
        []
    );

    const stencilOnlyRing = useMemo(
        () => ({
            stencilWrite: true,
            stencilRef: STENCIL_REF_EYE_REGION,
            stencilFunc: THREE.EqualStencilFunc,
            stencilFail: THREE.KeepStencilOp,
            stencilZFail: THREE.KeepStencilOp,
            stencilZPass: THREE.KeepStencilOp,
        }),
        []
    );

    const stencilOnlyAperture = useMemo(
        () => ({
            stencilWrite: false,
            stencilRef: STENCIL_REF_APERTURE,
            stencilFunc: THREE.EqualStencilFunc,
            stencilFail: THREE.KeepStencilOp,
            stencilZFail: THREE.KeepStencilOp,
            stencilZPass: THREE.KeepStencilOp,
        }),
        []
    );

    const apertureOcclusionAlpha = useApertureOcclusionAlpha();
    const skinMicroRoughness = useSkinMicroRoughnessMap();

    const [outerMaskGeo, apertureMaskGeo, shadowGeo, rimTubeGeo, waterlineTubeGeo, contactShadowTubeGeo] = useMemo(() => {
        // Dual stencil:
        // - outerMask writes 2 (overall eye region / silhouette)
        // - apertureMask writes 1 (actual opening for the eyeball)
        const outerMaskShape = createAlmondShape(
            outerW * 0.985,
            outerH * 0.985,
            V27_TUNING.aperture.outerUpperK,
            V27_TUNING.aperture.outerLowerK
        );
        const outerMask = new THREE.ShapeGeometry(outerMaskShape, V27_TUNING.aperture.shapeSegments);

        const apertureMaskShape = createAlmondShape(
            innerW * 0.985,
            innerH * 0.965,
            V27_TUNING.aperture.innerUpperK,
            V27_TUNING.aperture.innerLowerK
        );
        const apertureMask = new THREE.ShapeGeometry(apertureMaskShape, V27_TUNING.aperture.shapeSegments);

        // Socket shadow + outer skin rim (kept subtle, lives behind).
        const shadowShape = createAlmondShape(outerW * 1.05, outerH * 1.05, V27_TUNING.aperture.outerUpperK, V27_TUNING.aperture.outerLowerK);
        const shadow = new THREE.ShapeGeometry(shadowShape, 64);

        outerMask.computeVertexNormals();
        apertureMask.computeVertexNormals();
        shadow.computeVertexNormals();

        // 3D rims: real volume instead of layered planes.
        const rimCurve = createAlmondClosedCurve(
            innerW * V27_TUNING.rim.rimCurve.wMul,
            innerH * V27_TUNING.rim.rimCurve.hMul,
            V27_TUNING.rim.rimCurve.upperK,
            V27_TUNING.rim.rimCurve.lowerK
        );
        const waterlineCurve = createAlmondClosedCurve(
            innerW * V27_TUNING.rim.waterlineCurve.wMul,
            innerH * V27_TUNING.rim.waterlineCurve.hMul,
            V27_TUNING.rim.waterlineCurve.upperK,
            V27_TUNING.rim.waterlineCurve.lowerK
        );
        const contactShadowCurve = createAlmondClosedCurve(innerW * 1.01, innerH * 0.965, 0.79, 0.71);

        const rimTube = new THREE.TubeGeometry(rimCurve, V27_TUNING.rim.rimCurve.segments, V27_TUNING.rim.rimRadius, V27_TUNING.rim.rimCurve.radial, true);
        const waterlineTube = new THREE.TubeGeometry(
            waterlineCurve,
            V27_TUNING.rim.waterlineCurve.segments,
            V27_TUNING.rim.waterlineRadius,
            V27_TUNING.rim.waterlineCurve.radial,
            true
        );
        const contactShadowTube = new THREE.TubeGeometry(
            contactShadowCurve,
            V27_TUNING.contactShadow.segments,
            V27_TUNING.contactShadow.radius,
            V27_TUNING.contactShadow.radial,
            true
        );

        rimTube.computeVertexNormals();
        waterlineTube.computeVertexNormals();
        contactShadowTube.computeVertexNormals();

        return [outerMask, apertureMask, shadow, rimTube, waterlineTube, contactShadowTube] as const;
    }, [innerH, innerW, outerH, outerW]);

    return (
        <group>
            <group ref={outerBlinkRef}>
                {/* Stencil (outer): eye region silhouette */}
                <mesh geometry={outerMaskGeo} position={[0, 0, 1.01]} renderOrder={RENDER_ORDER.mask}>
                    <meshBasicMaterial
                        color="#000"
                        colorWrite={false}
                        depthWrite={false}
                        depthTest={false}
                        stencilWrite
                        stencilRef={STENCIL_REF_EYE_REGION}
                        stencilFunc={THREE.AlwaysStencilFunc}
                        stencilFail={THREE.KeepStencilOp}
                        stencilZFail={THREE.KeepStencilOp}
                        stencilZPass={THREE.ReplaceStencilOp}
                    />
                </mesh>

                {/* Contact shadow (subtle) */}
                <mesh geometry={contactShadowTubeGeo} position={V27_TUNING.contactShadow.pos} renderOrder={RENDER_ORDER.rim}>
                    <meshStandardMaterial
                        color="#000000"
                        transparent
                        opacity={V27_TUNING.contactShadow.opacity}
                        roughness={1}
                        metalness={0}
                        depthWrite={false}
                        polygonOffset
                        polygonOffsetFactor={-1}
                        {...stencilInEyeRegion}
                    />
                </mesh>

                {/* 3D skin rim (tube) */}
                <mesh geometry={rimTubeGeo} position={V27_TUNING.rim.rimPos} renderOrder={RENDER_ORDER.rim}>
                    <meshPhysicalMaterial
                        color="#d6a09a"
                        roughness={0.9}
                        roughnessMap={skinMicroRoughness ?? undefined}
                        metalness={0}
                        clearcoat={0.04}
                        clearcoatRoughness={0.55}
                        sheen={0.18}
                        sheenRoughness={0.85}
                        sheenColor={new THREE.Color('#b97c74')}
                        specularIntensity={0.4}
                        depthWrite
                        polygonOffset
                        polygonOffsetFactor={-2}
                        {...stencilOnlyRing}
                    />
                </mesh>

                {/* 3D wet waterline (tube) */}
                <mesh geometry={waterlineTubeGeo} position={V27_TUNING.rim.waterlinePos} renderOrder={RENDER_ORDER.rim}>
                    <meshPhysicalMaterial
                        color="#d9a1a9"
                        roughness={V27_TUNING.wetness.waterlineRoughness}
                        metalness={0}
                        clearcoat={V27_TUNING.wetness.waterlineClearcoat}
                        clearcoatRoughness={0.08}
                        transparent
                        opacity={V27_TUNING.wetness.waterlineOpacity}
                        polygonOffset
                        polygonOffsetFactor={-2}
                        {...stencilOnlyRing}
                    />
                </mesh>
            </group>

            {/* Stencil (inner): aperture opening for eyeball (scaled harder on blink to avoid slits) */}
            <group ref={apertureBlinkRef}>
                <mesh geometry={apertureMaskGeo} position={[0, 0, 1.011]} renderOrder={RENDER_ORDER.mask + 0.1}>
                    <meshBasicMaterial
                        color="#000"
                        colorWrite={false}
                        depthWrite={false}
                        depthTest={false}
                        stencilWrite
                        stencilRef={STENCIL_REF_APERTURE}
                        stencilFunc={THREE.AlwaysStencilFunc}
                        stencilFail={THREE.KeepStencilOp}
                        stencilZFail={THREE.KeepStencilOp}
                        stencilZPass={THREE.ReplaceStencilOp}
                    />
                </mesh>

                {/* Cheap AO inside the aperture (upper lid shadow + corners) */}
                <mesh geometry={apertureMaskGeo} position={[0, 0, 1.012]} renderOrder={RENDER_ORDER.eyeball + 0.6}>
                    <meshBasicMaterial
                        color="#000000"
                        transparent
                        opacity={0.24}
                        alphaMap={apertureOcclusionAlpha ?? undefined}
                        depthWrite={false}
                        depthTest={false}
                        {...stencilOnlyAperture}
                    />
                </mesh>
            </group>

            {/* Socket + outer eyelid volume (subtle, behind the eye) */}
            <group position={[0, 0, z]}>
                {/* Soft eyelid shadow behind */}
                <mesh geometry={shadowGeo} position={[0, -0.02, -0.025]} renderOrder={0}>
                    <meshStandardMaterial color="#000000" transparent opacity={0.10} roughness={1} metalness={0} depthWrite={false} />
                </mesh>

            </group>

        </group>
    );
}

function Eyelashes({
    count = 30,
    edgeCurve,
    side = 'top' as 'top' | 'bottom',
}: {
    count?: number;
    edgeCurve: THREE.Curve<THREE.Vector3>;
    side?: 'top' | 'bottom';
}) {
    const stencilOnlyRing = useMemo(
        () => ({
            stencilWrite: true,
            stencilRef: STENCIL_REF_EYE_REGION,
            stencilFunc: THREE.EqualStencilFunc,
            stencilFail: THREE.KeepStencilOp,
            stencilZFail: THREE.KeepStencilOp,
            stencilZPass: THREE.KeepStencilOp,
        }),
        []
    );

    const lashes = useMemo(() => {
        const temp: Array<{
            position: [number, number, number];
            quaternion: [number, number, number, number];
            length: number;
            curl: number;
        }> = [];

        for (let i = 0; i < count; i++) {
            const u = count === 1 ? 0.5 : i / (count - 1);
            const arc = 1 - Math.pow((u - 0.5) * 2, 2); // 0..1..0

            const p = edgeCurve.getPoint(u);
            const tng = edgeCurve.getTangent(u).normalize();
            const view = new THREE.Vector3(0, 0, 1);

            const radial2D = new THREE.Vector3(p.x, p.y, 0).normalize();
            const outward = new THREE.Vector3().crossVectors(view, tng).normalize();
            if (outward.dot(radial2D) < 0) outward.negate();

            // Push roots OUT of the aperture so they survive the ring-only stencil (ref 2).
            const root = p.clone().addScaledVector(outward, V27_TUNING.lashes.rootOut);
            const forward = side === 'top' ? V27_TUNING.lashes.topForward : V27_TUNING.lashes.bottomForward;
            const outwardW = side === 'top' ? V27_TUNING.lashes.topOutwardWeight : V27_TUNING.lashes.bottomOutwardWeight;
            const dir = outward.clone().multiplyScalar(outwardW).addScaledVector(view, forward).normalize();
            const pos = root
                .clone()
                .addScaledVector(dir, V27_TUNING.lashes.posAlongDir)
                .addScaledVector(view, V27_TUNING.lashes.viewLift);

            // Quaternion: align cone's +Y to the normal direction (so it "grows" out from the lid edge)
            const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

            const centerBoost = 0.7 + 0.5 * arc;
            const noise = (Math.random() - 0.5) * 0.16;
            const base = (side === 'top' ? 0.11 : 0.06) * centerBoost * (1 + noise);
            const length = base * (side === 'top' ? V27_TUNING.lashes.topLengthMul : V27_TUNING.lashes.bottomLengthMul);
            const curl = (side === 'top' ? 0.85 : -0.6) + (Math.random() - 0.5) * 0.18;

            temp.push({
                position: [pos.x, pos.y, pos.z],
                quaternion: [q.x, q.y, q.z, q.w],
                length,
                curl,
            });
        }
        return temp;
    }, [count, edgeCurve, side]);

    return (
        <group>
            {lashes.map((l, i) => (
                <group key={`${side}-${i}`} position={l.position} quaternion={l.quaternion as any}>
                    {/* Cone points along +Y: add curl by rotating around local X (after quaternion) */}
                    <mesh rotation={[l.curl, 0, 0]} position={[0, l.length / 2, 0]} renderOrder={RENDER_ORDER.lashes}>
                        <coneGeometry args={[V27_TUNING.lashes.thickness, l.length, 7]} />
                        <meshPhysicalMaterial
                            color="#050505"
                            roughness={V27_TUNING.lashes.roughness}
                            metalness={0.05}
                            clearcoat={V27_TUNING.lashes.clearcoat}
                            clearcoatRoughness={V27_TUNING.lashes.clearcoatRoughness}
                            specularIntensity={V27_TUNING.lashes.specularIntensity}
                            depthWrite={false}
                            depthTest={false}
                            polygonOffset
                            polygonOffsetFactor={V27_TUNING.lashes.polygonOffsetFactor}
                            {...stencilOnlyRing}
                        />
                    </mesh>
                </group>
            ))}
        </group>
    );
}

function Eyelids({ blink, mousePos }: { blink: React.MutableRefObject<number>; mousePos: PointerRef }) {
    const upperRef = useRef<THREE.Group>(null);
    const lowerRef = useRef<THREE.Group>(null);

    const skinColor = '#d6a09a';

    useFrame((_, delta) => {
        const t = clamp01(blink.current);
        const gazeY = THREE.MathUtils.clamp(mousePos.current.y, -1, 1);
        const gazeX = THREE.MathUtils.clamp(mousePos.current.x, -1, 1);

        const yaw = THREE.MathUtils.clamp(gazeX * 0.06, -0.06, 0.06);
        const pitch = THREE.MathUtils.clamp(-gazeY * 0.10, -0.10, 0.10);
        const ease = t * t * (3 - 2 * t); // smoothstep

        // Rotate lids around eye center (more natural than translating them on Y)
        const upperOpen = 0.10;
        const upperClosed = 1.06;
        const lowerOpen = -0.06;
        const lowerClosed = -0.78;

        const upperRotX = lerp(upperOpen, upperClosed, ease) + pitch * 0.8;
        const lowerRotX = lerp(lowerOpen, lowerClosed, ease) + pitch * 0.5;

        if (upperRef.current) {
            upperRef.current.position.set(0, 0, 0.0);
            upperRef.current.rotation.x = THREE.MathUtils.damp(upperRef.current.rotation.x, upperRotX, 14, delta);
            upperRef.current.rotation.y = THREE.MathUtils.damp(upperRef.current.rotation.y, yaw, 10, delta);
        }
        if (lowerRef.current) {
            lowerRef.current.position.set(0, 0, 0.0);
            lowerRef.current.rotation.x = THREE.MathUtils.damp(lowerRef.current.rotation.x, lowerRotX, 14, delta);
            lowerRef.current.rotation.y = THREE.MathUtils.damp(lowerRef.current.rotation.y, yaw, 10, delta);
        }
    });

    const skinMicroRoughness = useSkinMicroRoughnessMap();

    const [upperLidGeo, lowerLidGeo, upperEdgeCurve, lowerEdgeCurve] = useMemo(() => {
        const buildLidRibbon = (edgePts: THREE.Vector3[], opts: { lift: number }) => {
            const positions: number[] = [];
            const uvs: number[] = [];
            const indices: number[] = [];

            const view = new THREE.Vector3(0, 0, 1);
            const tmp = new THREE.Vector3();

            for (let i = 0; i < edgePts.length; i++) {
                const u = edgePts.length <= 1 ? 0.5 : i / (edgePts.length - 1);
                const arc = 1 - Math.pow((u - 0.5) * 2, 2);

                const p = edgePts[i];
                const prev = edgePts[Math.max(0, i - 1)];
                const next = edgePts[Math.min(edgePts.length - 1, i + 1)];

                const tangent = tmp.copy(next).sub(prev).normalize();
                const radial2D = new THREE.Vector3(p.x, p.y, 0).normalize();
                const outward = new THREE.Vector3().crossVectors(view, tangent).normalize();
                if (outward.dot(radial2D) < 0) outward.negate();

                const inner = new THREE.Vector3(p.x, p.y, p.z);
                const outer = inner
                    .clone()
                    .addScaledVector(outward, V27_TUNING.lids.ribbonWidth)
                    .addScaledVector(view, -V27_TUNING.lids.ribbonBack)
                    .addScaledVector(new THREE.Vector3(0, 1, 0), opts.lift * (0.35 + 0.65 * arc));

                positions.push(inner.x, inner.y, inner.z);
                positions.push(outer.x, outer.y, outer.z);

                const uu = edgePts.length <= 1 ? 0.5 : i / (edgePts.length - 1);
                uvs.push(uu, 0);
                uvs.push(uu, 1);
            }

            for (let i = 0; i < edgePts.length - 1; i++) {
                const a = i * 2;
                const b = i * 2 + 1;
                const c = (i + 1) * 2;
                const d = (i + 1) * 2 + 1;
                indices.push(a, b, c);
                indices.push(b, d, c);
            }

            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
            geo.setIndex(indices);
            geo.computeVertexNormals();
            return geo;
        };

        const { upper, lower } = createAlmondBezierCurves(V27_TUNING.lids.edgeW, V27_TUNING.lids.edgeH, V27_TUNING.lids.edgeUpperK, V27_TUNING.lids.edgeLowerK);

        const seg = V27_TUNING.lids.segments;
        const upper2D = upper.getPoints(seg);
        const lower2D = lower.getPoints(seg);

        const mapEdge = (pts: THREE.Vector3[], side: 'top' | 'bottom') => {
            return pts.map((p, i) => {
                const u = pts.length <= 1 ? 0.5 : i / (pts.length - 1);
                const arc = 1 - Math.pow((u - 0.5) * 2, 2);
                const bulge = (side === 'top' ? 1 : 0.75) * V27_TUNING.lids.edgeBulge * arc;
                return new THREE.Vector3(p.x, p.y, V27_TUNING.lids.edgeZ + bulge);
            });
        };

        const upperPts = mapEdge(upper2D, 'top');
        const lowerPts = mapEdge(lower2D, 'bottom');

        const upperCurve = new THREE.CatmullRomCurve3(upperPts, false, 'centripetal');
        const lowerCurve = new THREE.CatmullRomCurve3(lowerPts, false, 'centripetal');

        const upperGeo = buildLidRibbon(upperPts, { lift: V27_TUNING.lids.upperLift });
        const lowerGeo = buildLidRibbon(lowerPts, { lift: V27_TUNING.lids.lowerLift });

        return [upperGeo, lowerGeo, upperCurve, lowerCurve] as const;
    }, []);

    const stencilOnlyRing = useMemo(
        () => ({
            stencilWrite: true,
            stencilRef: STENCIL_REF_EYE_REGION,
            stencilFunc: THREE.EqualStencilFunc,
            stencilFail: THREE.KeepStencilOp,
            stencilZFail: THREE.KeepStencilOp,
            stencilZPass: THREE.KeepStencilOp,
        }),
        []
    );

    return (
        <group>
            <group ref={upperRef}>
                <mesh castShadow receiveShadow renderOrder={RENDER_ORDER.lids}>
                    <primitive object={upperLidGeo} attach="geometry" />
                    <meshPhysicalMaterial
                        color={skinColor}
                        roughness={0.92}
                        roughnessMap={skinMicroRoughness ?? undefined}
                        metalness={0}
                        clearcoat={0.04}
                        clearcoatRoughness={0.62}
                        sheen={0.18}
                        sheenRoughness={0.9}
                        sheenColor={new THREE.Color('#b97c74')}
                        specularIntensity={0.35}
                        side={THREE.FrontSide}
                        {...stencilOnlyRing}
                    />
                </mesh>
                <Eyelashes side="top" edgeCurve={upperEdgeCurve} count={38} />
            </group>

            <group ref={lowerRef}>
                <mesh castShadow receiveShadow renderOrder={RENDER_ORDER.lids}>
                    <primitive object={lowerLidGeo} attach="geometry" />
                    <meshPhysicalMaterial
                        color={skinColor}
                        roughness={0.94}
                        roughnessMap={skinMicroRoughness ?? undefined}
                        metalness={0}
                        clearcoat={0.03}
                        clearcoatRoughness={0.7}
                        sheen={0.14}
                        sheenRoughness={0.92}
                        sheenColor={new THREE.Color('#b97c74')}
                        specularIntensity={0.3}
                        side={THREE.FrontSide}
                        {...stencilOnlyRing}
                    />
                </mesh>
                <Eyelashes side="bottom" edgeCurve={lowerEdgeCurve} count={26} />
            </group>
        </group>
    );
}

type BlinkMachine = {
    phase: 'idle' | 'closing' | 'opening' | 'pause';
    nextAtMs: number;
    phaseStartMs: number;
    double: boolean;
    doubleStep: 0 | 1;
};

function EyeScene({
    colorScheme,
    blinkInterval = 3000,
    variant = 'playground',
    showBackdrop = true,
}: {
    colorScheme: EyeColorKey;
    blinkInterval?: number;
    variant?: Eye3DVariant;
    showBackdrop?: boolean;
}) {
    const rigRef = useRef<THREE.Group>(null);
    const mousePos = useRef({ x: 0, y: 0 }); // smoothed pointer
    const pointerRaw = useRef({ x: 0, y: 0 });
    const blink = useRef(0);
    const machine = useRef<BlinkMachine>({
        phase: 'idle',
        nextAtMs: 0,
        phaseStartMs: 0,
        double: false,
        doubleStep: 0,
    });

    useFrame((state, delta) => {
        pointerRaw.current.x = state.pointer.x;
        pointerRaw.current.y = state.pointer.y;
        mousePos.current.x = THREE.MathUtils.damp(mousePos.current.x, pointerRaw.current.x, 10, delta);
        mousePos.current.y = THREE.MathUtils.damp(mousePos.current.y, pointerRaw.current.y, 10, delta);

        if (rigRef.current) {
            const targetYaw = THREE.MathUtils.clamp(mousePos.current.x * 0.18, -0.18, 0.18);
            const targetPitch = THREE.MathUtils.clamp(-mousePos.current.y * 0.12, -0.12, 0.12);
            rigRef.current.rotation.y = THREE.MathUtils.damp(rigRef.current.rotation.y, targetYaw, 10, delta);
            rigRef.current.rotation.x = THREE.MathUtils.damp(rigRef.current.rotation.x, targetPitch, 10, delta);
        }

        const nowMs = state.clock.elapsedTime * 1000;
        const m = machine.current;

        if (m.nextAtMs === 0) {
            m.nextAtMs = nowMs + 900;
        }

        const closeMs = 90;
        const openMs = 140;
        const pauseMs = 110;

        if (m.phase === 'idle' && nowMs >= m.nextAtMs) {
            m.phase = 'closing';
            m.phaseStartMs = nowMs;
            m.double = Math.random() > 0.82;
            m.doubleStep = 0;
        }

        if (m.phase === 'closing') {
            const t = clamp01((nowMs - m.phaseStartMs) / closeMs);
            blink.current = t;
            if (t >= 1) {
                m.phase = 'opening';
                m.phaseStartMs = nowMs;
            }
        } else if (m.phase === 'opening') {
            const t = clamp01((nowMs - m.phaseStartMs) / openMs);
            blink.current = 1 - t;
            if (t >= 1) {
                blink.current = 0;
                if (m.double && m.doubleStep === 0) {
                    m.phase = 'pause';
                    m.phaseStartMs = nowMs;
                } else {
                    m.phase = 'idle';
                    const jitter = Math.random() * 1400 - 700;
                    m.nextAtMs = nowMs + Math.max(1200, blinkInterval + jitter);
                }
            }
        } else if (m.phase === 'pause') {
            blink.current = THREE.MathUtils.damp(blink.current, 0, 15, delta);
            if (nowMs - m.phaseStartMs >= pauseMs) {
                m.doubleStep = 1;
                m.phase = 'closing';
                m.phaseStartMs = nowMs;
            }
        }
    });

    return (
        <group ref={rigRef} scale={[1.15, 1.15, 1.15]} position={[0, 0, 0]}>
            <FaceSocket enabled={showBackdrop} />
            <EyeAperture blink={blink} />
            <Eyeball colors={EYE_COLORS[colorScheme]} mousePos={mousePos} />
            <Eyelids blink={blink} mousePos={mousePos} />
        </group>
    );
}

export default function Eye3D({
    colorScheme = 'ocean',
    blinkInterval = 3500,
    variant = 'playground',
    reducedMotion = false,
    dpr,
    quality = 'default',
    interactive = true,
    watermarkFps = 24,
    className = '',
    enableBackdrop,
}: {
    colorScheme?: EyeColorKey;
    blinkInterval?: number;
    variant?: Eye3DVariant;
    reducedMotion?: boolean;
    dpr?: number | [number, number];
    quality?: Eye3DQuality;
    interactive?: boolean;
    watermarkFps?: number;
    className?: string;
    enableBackdrop?: boolean;
}) {
    const isWatermark = quality === 'watermark';
    const computedDpr = dpr ?? (isWatermark ? [0.8, 1.15] : [1, 1.75]);
    const floatIntensity = reducedMotion ? 0 : isWatermark ? 0.03 : variant === 'landing' ? 0.06 : 0.15;
    const floatSpeed = reducedMotion ? 0 : isWatermark ? 0.75 : 1.2;
    const envResolution = isWatermark ? 128 : 256;
    const envBlur = isWatermark ? 0.85 : 0.7;
    const enableShadows = !isWatermark;
    const frameloop: 'always' | 'demand' = isWatermark ? 'demand' : 'always';
    const containerMinH = variant === 'playground' ? 'min-h-[520px]' : 'min-h-0';

    // Logic: if enableBackdrop is explicitly set, use it. Otherwise, default to hiding it on landing variant (legacy behavior)
    // but we are about to override this in LandingHeroEye.
    const showBackdrop = enableBackdrop ?? (variant !== 'landing');

    return (
        <div className={`w-full h-full ${containerMinH} ${className}`}>
            <Canvas
                shadows={enableShadows}
                frameloop={frameloop}
                dpr={computedDpr}
                camera={{ position: [0, 0, 6.2], fov: 34 }}
                gl={{
                    antialias: !isWatermark,
                    alpha: true,
                    stencil: true,
                    powerPreference: isWatermark ? 'low-power' : 'high-performance',
                }}
                style={{ pointerEvents: interactive ? 'auto' : 'none' }}
                onCreated={({ gl }) => {
                    gl.toneMapping = THREE.ACESFilmicToneMapping;
                    gl.toneMappingExposure = V27_TUNING.render.exposure;
                    gl.outputColorSpace = THREE.SRGBColorSpace;
                }}
            >
                <WatermarkFrameDriver enabled={isWatermark} fps={watermarkFps} reduced={reducedMotion} />
                <ambientLight intensity={V27_TUNING.lights.ambient} />
                <spotLight
                    castShadow={enableShadows}
                    position={V27_TUNING.lights.key.pos}
                    angle={0.28}
                    penumbra={1}
                    intensity={V27_TUNING.lights.key.intensity}
                    color="#fff"
                    shadow-mapSize={enableShadows ? [1024, 1024] : undefined}
                    shadow-bias={enableShadows ? -0.00015 : undefined}
                    shadow-normalBias={enableShadows ? 0.018 : undefined}
                    shadow-radius={enableShadows ? 4 : undefined}
                />
                <pointLight position={V27_TUNING.lights.fill.pos} intensity={V27_TUNING.lights.fill.intensity} color="#ffffff" />
                <pointLight position={V27_TUNING.lights.rim.pos} intensity={V27_TUNING.lights.rim.intensity} color="#cfe5ff" />
                {variant !== 'landing' && (
                    <pointLight position={[0, 0, -2]} intensity={1.0} color={EYE_COLORS[colorScheme]?.iris || 'white'} distance={4} />
                )}

                <Float speed={floatSpeed} rotationIntensity={0} floatIntensity={floatIntensity}>
                    <EyeScene colorScheme={colorScheme} blinkInterval={blinkInterval} variant={variant} showBackdrop={showBackdrop} />
                </Float>

                {/* Custom lightformers to avoid the HDRI "cross" reflection and keep a premium, controlled highlight */}
                <Environment resolution={envResolution} blur={envBlur}>
                    <Lightformer
                        form="circle"
                        intensity={2.0}
                        rotation={[-Math.PI / 2, 0, 0]}
                        position={[0.4, 2.4, 2.6]}
                        scale={[5.2, 5.2, 1]}
                        color="#ffffff"
                    />
                    <Lightformer form="circle" intensity={0.75} rotation={[0, Math.PI / 2, 0]} position={[-3.0, 0.55, 2.2]} scale={[2.6, 2.6, 1]} color="#d9e7ff" />
                    <Lightformer form="ring" intensity={0.35} rotation={[0, 0, 0]} position={[0.0, 0.2, -2.6]} scale={[5.5, 5.5, 1]} color="#bcd7ff" />
                </Environment>
            </Canvas>
        </div>
    );
}

export function Eye3DPrototype() {
    const [color, setColor] = useState<EyeColorKey>('ocean');
    return (
        <div className="w-full h-full flex flex-col gap-4 p-4 bg-black rounded-3xl relative">
            <div className="flex-1 min-h-[520px] relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-t from-gray-900 to-black">
                <div className="absolute top-4 left-4 z-10 bg-white/10 px-3 py-1 rounded-full text-xs font-bold text-white/80 uppercase tracking-wider backdrop-blur-md">
                    V27: Lofted Lids + Organic Rim
                </div>
                <Eye3D colorScheme={color} className="absolute inset-0" />
            </div>

            <div className="h-16 flex items-center justify-center gap-3 bg-white/5 rounded-xl border-t border-white/10 backdrop-blur-md">
                {Object.keys(EYE_COLORS).map((c) => {
                    const info = EYE_COLORS[c as EyeColorKey];
                    const isActive = color === c;
                    return (
                        <button
                            key={c}
                            onClick={() => setColor(c as EyeColorKey)}
                            className={`
                                group relative w-10 h-10 rounded-full transition-all duration-300
                                ${isActive ? 'scale-110 ring-2 ring-white shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'opacity-60 hover:opacity-100 hover:scale-105'}
                            `}
                            title={info.name}
                        >
                            <div className="absolute inset-1 rounded-full overflow-hidden border border-white/20">
                                <div className="w-full h-full" style={{ background: `radial-gradient(circle at 30% 30%, ${info.iris}, ${info.pupil})` }} />
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export { EYE_COLORS };
