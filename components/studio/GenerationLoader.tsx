import React from 'react';
import { motion } from 'framer-motion';

interface GenerationLoaderProps {
    userImage?: string | null;
}

const DiffusionParticles = () => {
    const [particles, setParticles] = React.useState<any[]>([]);

    // Generate an array of 60 particles with varied, organic properties only once on mount
    React.useEffect(() => {
        const newParticles = Array.from({ length: 60 }).map((_, i) => {
            const size = Math.random() * 6 + 1; // 1px to 7px
            const isGlowing = Math.random() > 0.5;
            const colorClass = Math.random() > 0.7
                ? 'bg-fuchsia-300 shadow-[0_0_12px_rgba(217,70,239,0.8)]'
                : Math.random() > 0.4
                    ? 'bg-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.8)]'
                    : 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]';

            return {
                id: i,
                x: `${Math.random() * 100}%`,
                y: `${Math.random() * 100 + 10}%`, // Start slightly lower
                size,
                delay: Math.random() * 3, // Staggered starts
                duration: Math.random() * 3 + 2, // 2s to 5s lifespan
                blur: isGlowing ? 'blur-[1px]' : 'blur-[0.5px]',
                colorClass,
                drift: (Math.random() - 0.5) * 40, // Horizontal drift amount
                targetY: -(Math.random() * 60 + 40), // Pre-calculate float height
                targetScale: Math.random() + 0.5 // Pre-calculate target scale
            };
        });
        setParticles(newParticles);
    }, []);

    return (
        <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden mix-blend-screen">
            {/* Ambient Base Glow */}
            <motion.div
                className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(217,70,239,0.15)_0%,transparent_70%)]"
                animate={{ opacity: [0.5, 1, 0.5], scale: [0.9, 1.1, 0.9] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />

            {particles.map((p) => (
                <motion.div
                    key={p.id}
                    className={`absolute rounded-full ${p.colorClass} ${p.blur}`}
                    style={{
                        left: p.x,
                        top: p.y,
                        width: p.size,
                        height: p.size,
                    }}
                    initial={{ opacity: 0, scale: 0, y: 0, x: 0 }}
                    animate={{
                        opacity: [0, 0.9, 0],
                        scale: [0, p.targetScale, 0],
                        y: [0, p.targetY], // Float upwards significantly
                        x: [0, p.drift, p.drift * 1.5] // Drift sideways organically
                    }}
                    transition={{
                        duration: p.duration,
                        repeat: Infinity,
                        delay: p.delay,
                        ease: "easeOut"
                    }}
                />
            ))}
        </div>
    );
};

export const GenerationLoader: React.FC<GenerationLoaderProps> = ({ userImage }) => {
    return (
        <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden bg-gray-900 border border-white/20 shadow-2xl flex flex-col items-center justify-center group">
            {/* Background base image or dark gradient */}
            {userImage ? (
                <img
                    src={userImage}
                    alt="Base"
                    className="absolute inset-0 w-full h-full object-cover opacity-40 blur-sm scale-110 transition-transform duration-[10s] ease-linear group-hover:scale-125"
                />
            ) : (
                <img
                    src="/images/ai-assets/fashion_ai_loader.png"
                    alt="AI Generating"
                    className="absolute inset-0 w-full h-full object-cover opacity-40 scale-105 animate-pulse-slow mix-blend-lighten"
                />
            )}

            {/* Static SVG Noise Overlay for that "diffusion" granular feel */}
            <div
                className="absolute inset-0 z-10 opacity-30 mix-blend-overlay pointer-events-none"
                style={{
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")',
                }}
            />

            {/* Pulsing Gradient Layer (Simulated Colors) */}
            <motion.div
                className="absolute inset-0 z-10 opacity-40 bg-gradient-to-br from-purple-500/30 via-transparent to-pink-500/30"
                animate={{
                    opacity: [0.2, 0.6, 0.2],
                    scale: [1, 1.1, 1],
                }}
                transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />

            {/* The Floating Diffusion Particles */}
            <DiffusionParticles />

            {/* Scanning Beam Effect */}
            <motion.div
                className="absolute top-0 left-0 w-full h-[15%] bg-gradient-to-b from-transparent via-purple-400/40 to-transparent z-20 shadow-[0_0_20px_rgba(192,132,252,0.4)]"
                animate={{
                    top: ['-20%', '120%']
                }}
                transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />

            {/* Pulsing Core Details */}
            <motion.div
                className="relative z-30 flex flex-col items-center gap-3 backdrop-blur-sm bg-black/20 p-6 rounded-3xl border border-white/10"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
            >
                <div className="relative">
                    {/* Outer slow ring */}
                    <motion.div
                        className="w-16 h-16 rounded-full border border-purple-400/30 border-t-purple-400/80"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    />
                    {/* Inner fast ring */}
                    <motion.div
                        className="absolute inset-0 w-16 h-16 rounded-full border border-pink-400/20 border-b-pink-400/70"
                        animate={{ rotate: -360 }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                    />

                    <motion.div
                        className="absolute inset-0 flex items-center justify-center"
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                    >
                        <span className="material-symbols-outlined text-2xl text-transparent bg-clip-text bg-gradient-to-br from-purple-300 to-pink-300 drop-shadow-[0_0_10px_rgba(236,72,153,0.8)]">
                            auto_awesome
                        </span>
                    </motion.div>
                </div>

                <div className="text-center mt-2">
                    <motion.p
                        className="text-white text-sm font-bold tracking-[0.2em] uppercase drop-shadow-lg"
                        animate={{ opacity: [0.6, 1, 0.6] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    >
                        Generando
                    </motion.p>
                    <p className="text-xs text-purple-200/90 mt-1.5 font-medium">Difusión Mágica...</p>
                </div>
            </motion.div>
        </div>
    );
};
