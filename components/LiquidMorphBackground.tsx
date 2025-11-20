import React, { useEffect, useRef } from 'react';

interface LiquidMorphBackgroundProps {
    /** Intensity of the effect (1-10). Default: 5 */
    intensity?: number;
    /** Number of blobs (2-8). Default: 4 */
    blobCount?: number;
    /** Animation speed multiplier (0.5-2). Default: 1 */
    speed?: number;
    /** Color scheme: 'primary', 'accent', 'gradient'. Default: 'primary' */
    colorScheme?: 'primary' | 'accent' | 'gradient' | 'purple';
    /** Opacity (0-1). Default: 0.15 */
    opacity?: number;
    /** Apply blur filter. Default: true */
    blur?: boolean;
    /** Z-index. Default: -1 */
    zIndex?: number;
}

interface Blob {
    x: number;
    y: number;
    radius: number;
    vx: number;
    vy: number;
    targetX: number;
    targetY: number;
    color: string;
    phase: number;
    pulseSpeed: number;
}

/**
 * LiquidMorphBackground - Animated liquid blobs with glassmorphism
 * Perfect for premium backgrounds with "Liquid Glass" aesthetic
 */
export const LiquidMorphBackground: React.FC<LiquidMorphBackgroundProps> = ({
    intensity = 5,
    blobCount = 4,
    speed = 1,
    colorScheme = 'primary',
    opacity = 0.15,
    blur = true,
    zIndex = -1,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const blobsRef = useRef<Blob[]>([]);
    const animationFrameRef = useRef<number>();

    // Color palettes based on the app's Tailwind config
    const colorPalettes = {
        primary: ['#0D9488', '#14B8A6', '#2DD4BF'], // Teal variations
        accent: ['#F472B6', '#EC4899', '#DB2777'], // Pink variations
        gradient: ['#0D9488', '#A78BFA', '#F472B6'], // Primary → Purple → Pink
        purple: ['#A78BFA', '#9333EA', '#7C3AED'], // Purple variations
    };

    const colors = colorPalettes[colorScheme];

    // Initialize blobs
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size
        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        // Create blobs
        const createBlob = (): Blob => {
            const sizeMultiplier = intensity / 5;
            return {
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                radius: (100 + Math.random() * 200) * sizeMultiplier,
                vx: (Math.random() - 0.5) * 0.5 * speed,
                vy: (Math.random() - 0.5) * 0.5 * speed,
                targetX: Math.random() * canvas.width,
                targetY: Math.random() * canvas.height,
                color: colors[Math.floor(Math.random() * colors.length)],
                phase: Math.random() * Math.PI * 2,
                pulseSpeed: 0.001 + Math.random() * 0.002,
            };
        };

        blobsRef.current = Array.from({ length: blobCount }, createBlob);

        // Animation loop
        let lastTime = 0;
        const animate = (currentTime: number) => {
            const deltaTime = currentTime - lastTime;
            lastTime = currentTime;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            blobsRef.current.forEach((blob) => {
                // Update phase for pulsing
                blob.phase += blob.pulseSpeed * deltaTime * speed;

                // Smooth movement towards target
                const dx = blob.targetX - blob.x;
                const dy = blob.targetY - blob.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 50 || Math.random() < 0.005) {
                    // Set new target
                    blob.targetX = Math.random() * canvas.width;
                    blob.targetY = Math.random() * canvas.height;
                }

                // Ease towards target
                blob.vx += (dx / distance) * 0.01 * speed;
                blob.vy += (dy / distance) * 0.01 * speed;

                // Apply friction
                blob.vx *= 0.98;
                blob.vy *= 0.98;

                // Update position
                blob.x += blob.vx;
                blob.y += blob.vy;

                // Bounce off edges
                if (blob.x < -blob.radius) blob.x = canvas.width + blob.radius;
                if (blob.x > canvas.width + blob.radius) blob.x = -blob.radius;
                if (blob.y < -blob.radius) blob.y = canvas.height + blob.radius;
                if (blob.y > canvas.height + blob.radius) blob.y = -blob.radius;

                // Draw blob with pulsing radius
                const pulseOffset = Math.sin(blob.phase) * 20 * (intensity / 5);
                const currentRadius = blob.radius + pulseOffset;

                // Create radial gradient for soft edges
                const gradient = ctx.createRadialGradient(
                    blob.x,
                    blob.y,
                    0,
                    blob.x,
                    blob.y,
                    currentRadius
                );

                // Parse color and add opacity
                const r = parseInt(blob.color.slice(1, 3), 16);
                const g = parseInt(blob.color.slice(3, 5), 16);
                const b = parseInt(blob.color.slice(5, 7), 16);

                gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${opacity})`);
                gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${opacity * 0.5})`);
                gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(blob.x, blob.y, currentRadius, 0, Math.PI * 2);
                ctx.fill();
            });

            animationFrameRef.current = requestAnimationFrame(animate);
        };

        animationFrameRef.current = requestAnimationFrame(animate);

        return () => {
            window.removeEventListener('resize', resize);
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [intensity, blobCount, speed, colorScheme, opacity, colors]);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 w-full h-full pointer-events-none"
            style={{
                zIndex,
                filter: blur ? 'blur(60px)' : 'none',
                mixBlendMode: 'normal',
            }}
            aria-hidden="true"
        />
    );
};

export default LiquidMorphBackground;
