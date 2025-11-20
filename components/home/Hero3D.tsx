import React from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';

interface Hero3DProps {
    displayName: string;
    avatarUrl?: string;
    closetLength: number;
    totalOutfits: number;
    daysActive: number;
}

export function Hero3D({
    displayName,
    avatarUrl,
    closetLength,
    totalOutfits,
    daysActive
}: Hero3DProps) {
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseX = useSpring(x, { stiffness: 150, damping: 15 });
    const mouseY = useSpring(y, { stiffness: 150, damping: 15 });

    const rotateX = useTransform(mouseY, [-0.5, 0.5], ["15deg", "-15deg"]);
    const rotateY = useTransform(mouseX, [-0.5, 0.5], ["-15deg", "15deg"]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseXVal = e.clientX - rect.left;
        const mouseYVal = e.clientY - rect.top;
        const xPct = mouseXVal / width - 0.5;
        const yPct = mouseYVal / height - 0.5;
        x.set(xPct);
        y.set(yPct);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    return (
        <motion.div
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
                rotateX,
                rotateY,
                transformStyle: "preserve-3d",
            }}
            className="relative w-full max-w-3xl mx-auto aspect-auto min-h-[420px] md:min-h-0 md:aspect-[16/9] rounded-2xl md:rounded-[2.5rem] bg-white/5 dark:bg-black/20 backdrop-blur-sm border border-white/10 shadow-2xl cursor-pointer group overflow-hidden"
        >
            {/* Background Layers with depth */}
            <div
                style={{ transform: "translateZ(20px)" }}
                className="absolute inset-4 rounded-[2rem] border border-white/5 overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-30"></div>
            </div>

            {/* Content Layer */}
            <div
                style={{ transform: "translateZ(50px)" }}
                className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 md:p-8"
            >
                {/* Avatar with gradient ring */}
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-primary to-secondary p-1 mb-4 md:mb-6 shadow-glow-accent shrink-0">
                    <img
                        src={avatarUrl || "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=800"}
                        alt={displayName}
                        className="w-full h-full rounded-full object-cover border-2 border-white"
                    />
                </div>

                {/* Greeting */}
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">
                    Hola, {displayName}
                </h2>
                <p className="text-gray-400 text-base md:text-lg mb-6">
                    ¿Qué nos ponemos hoy?
                </p>

                {/* Quick Stats Pills */}
                <div className="flex flex-wrap gap-3 justify-center">
                    <div className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-white text-sm font-bold flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">checkroom</span>
                        {closetLength} prendas
                    </div>
                    <div className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-white text-sm font-bold flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">auto_awesome</span>
                        {totalOutfits} outfits
                    </div>
                    <div className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-white text-sm font-bold flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">local_fire_department</span>
                        {daysActive} días
                    </div>
                </div>
            </div>

            {/* Floating Elements for depth */}
            <div
                style={{ transform: "translateZ(80px)" }}
                className="absolute top-10 right-8 w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 blur-xl opacity-40 animate-pulse"
            ></div>

            <div
                style={{ transform: "translateZ(60px)", animationDelay: '1s' }}
                className="absolute bottom-10 left-8 w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary blur-2xl opacity-30 animate-pulse"
            ></div>

            {/* Glass Reflection on hover */}
            <div
                style={{ transform: "translateZ(1px)" }}
                className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            ></div>
        </motion.div>
    );
}
