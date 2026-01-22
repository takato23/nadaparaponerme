import React from 'react';
import { motion } from 'framer-motion';

interface GenerationLoaderProps {
    userImage?: string | null;
}

export const GenerationLoader: React.FC<GenerationLoaderProps> = ({ userImage }) => {
    return (
        <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-gray-900 border border-white/20 shadow-inner flex flex-col items-center justify-center group">
            {/* Background base image or dark gradient */}
            {userImage ? (
                <img
                    src={userImage}
                    alt="Base"
                    className="absolute inset-0 w-full h-full object-cover opacity-50 blur-sm scale-110 transition-transform duration-[10s] ease-linear group-hover:scale-125"
                />
            ) : (
                <img
                    src="/images/ai-assets/fashion_ai_loader.png"
                    alt="AI Generating"
                    className="absolute inset-0 w-full h-full object-cover opacity-60 scale-105 animate-pulse-slow"
                />
            )}

            {/* Pulsing Gradient Layer (Simulated Diffusion) */}
            <motion.div
                className="absolute inset-0 z-10 opacity-50 bg-gradient-to-br from-purple-500/20 via-transparent to-pink-500/20"
                animate={{
                    opacity: [0.3, 0.6, 0.3],
                    scale: [1, 1.05, 1],
                }}
                transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />

            {/* Scanning Beam Effect */}
            <motion.div
                className="absolute top-0 left-0 w-full h-[5%] bg-gradient-to-b from-transparent via-purple-500/50 to-transparent z-20 shadow-[0_0_15px_rgba(168,85,247,0.5)]"
                animate={{
                    top: ['-10%', '110%']
                }}
                transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />

            {/* Pulsing Core */}
            <motion.div
                className="relative z-30 flex flex-col items-center gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
            >
                <div className="relative">
                    <motion.div
                        className="w-16 h-16 rounded-full border-2 border-purple-400/50 border-t-purple-400"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    />
                    <motion.div
                        className="absolute inset-0 w-16 h-16 rounded-full border border-pink-400/30 blur-md"
                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="material-symbols-outlined text-2xl text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">
                            auto_awesome
                        </span>
                    </div>
                </div>

                <div className="text-center">
                    <motion.p
                        className="text-white text-xs font-semibold tracking-wider uppercase drop-shadow-md"
                        animate={{ opacity: [0.7, 1, 0.7] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    >
                        Generando
                    </motion.p>
                    <p className="text-xs text-purple-200/80 mt-1">Creando tu look...</p>
                </div>
            </motion.div>
        </div>
    );
};
