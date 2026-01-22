import React, { useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { ClothingItem } from '../../types';

interface HomeHeroProps {
    displayName: string;
    closetLength: number;
    totalOutfits: number;
    daysActive: number;
    isScrolled: boolean;
}

export const HomeHero = ({
    displayName,
    closetLength,
    totalOutfits,
    daysActive,
    isScrolled
}: HomeHeroProps) => {
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return '¡Buenos días';
        if (hour < 19) return '¡Buenas tardes';
        return '¡Buenas noches';
    };

    // 3D Tilt Effect
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const mouseX = useSpring(x, { stiffness: 150, damping: 20 });
    const mouseY = useSpring(y, { stiffness: 150, damping: 20 });
    const rotateX = useTransform(mouseY, [-0.5, 0.5], ["5deg", "-5deg"]);
    const rotateY = useTransform(mouseX, [-0.5, 0.5], ["-5deg", "5deg"]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const xPct = (e.clientX - rect.left) / rect.width - 0.5;
        const yPct = (e.clientY - rect.top) / rect.height - 0.5;
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
            className={`
      relative overflow-hidden
      liquid-glass
      p-8 
      shadow-sm 
      transition-all duration-500 
      ${isScrolled ? 'opacity-100' : 'opacity-100'}
    `}>
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-accent/5 to-primary/5 rounded-full blur-2xl translate-y-1/3 -translate-x-1/3 pointer-events-none" />

            <div className="relative z-10" style={{ transform: "translateZ(20px)" }}>
                {/* Greeting */}
                <div className="mb-8">
                    <div className="flex items-center gap-2 mb-2 opacity-80">
                        <span className="text-xs font-bold tracking-wider uppercase text-text-secondary">
                            {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric' })}
                        </span>
                        <div className="h-1 w-1 rounded-full bg-text-secondary" />
                        <span className="text-xs font-medium text-text-secondary">
                            {getGreeting()}
                        </span>
                    </div>
                    <h1 className="font-serif font-black text-text-primary tracking-tight text-4xl sm:text-5xl leading-tight">
                        Hola, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">{displayName}</span>
                    </h1>
                </div>

                {/* Stats Sub-Bubbles */}
                <div className="grid grid-cols-3 gap-3 sm:gap-4">
                    <div className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-slate-800/50 rounded-3xl border border-gray-100 dark:border-slate-700/50 transition-transform hover:scale-[1.02]">
                        <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-700 shadow-sm flex items-center justify-center text-primary mb-3">
                            <span className="material-symbols-outlined text-xl">checkroom</span>
                        </div>
                        <div className="text-center">
                            <div className="text-xl sm:text-2xl font-black text-text-primary leading-none mb-1">{closetLength}</div>
                            <div className="text-xs sm:text-xs font-bold text-text-secondary uppercase tracking-wider">Prendas</div>
                        </div>
                    </div>

                    <div className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-slate-800/50 rounded-3xl border border-gray-100 dark:border-slate-700/50 transition-transform hover:scale-[1.02]">
                        <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-700 shadow-sm flex items-center justify-center text-secondary mb-3">
                            <span className="material-symbols-outlined text-xl">style</span>
                        </div>
                        <div className="text-center">
                            <div className="text-xl sm:text-2xl font-black text-text-primary leading-none mb-1">{totalOutfits}</div>
                            <div className="text-xs sm:text-xs font-bold text-text-secondary uppercase tracking-wider">Outfits</div>
                        </div>
                    </div>

                    <div className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-slate-800/50 rounded-3xl border border-gray-100 dark:border-slate-700/50 transition-transform hover:scale-[1.02]">
                        <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-700 shadow-sm flex items-center justify-center text-accent mb-3">
                            <span className="material-symbols-outlined text-xl">local_fire_department</span>
                        </div>
                        <div className="text-center">
                            <div className="text-xl sm:text-2xl font-black text-text-primary leading-none mb-1">{daysActive}</div>
                            <div className="text-xs sm:text-xs font-bold text-text-secondary uppercase tracking-wider">Racha</div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
