import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * NanoBanana Easter Egg Component
 * Una pequeña banana interactiva basada en físicas de spring
 * que aparece cuando no hay items o como deco.
 */
export default function NanoBanana({ className = '' }: { className?: string }) {
    const [isDancing, setIsDancing] = useState(false);

    return (
        <div className={`flex flex-col items-center justify-center ${className}`}>
            <motion.button
                onClick={() => setIsDancing(!isDancing)}
                whileHover={{ scale: 1.1, rotate: 10 }}
                whileTap={{ scale: 0.9 }}
                animate={
                    isDancing
                        ? {
                            y: [0, -20, 0],
                            rotate: [0, -15, 15, 0],
                            transition: {
                                duration: 0.5,
                                repeat: Infinity,
                                ease: "easeInOut",
                            },
                        }
                        : {
                            y: 0,
                            rotate: 0,
                        }
                }
                className="w-16 h-16 flex items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-300 to-yellow-500 shadow-glow-sm hover:shadow-glow-md transition-shadow relative overflow-hidden"
                aria-label="Nano Banana"
            >
                <span className="text-3xl relative z-10 drop-shadow-md">🍌</span>
                <div className="absolute inset-0 bg-white/20 backdrop-blur-sm z-0"></div>
            </motion.button>

            <AnimatePresence>
                {isDancing && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="mt-3 px-3 py-1 bg-black/80 backdrop-blur-md rounded-full border border-white/10"
                    >
                        <p className="text-[10px] font-bold text-yellow-300 font-mono tracking-widest uppercase">
                            Nano Banana Mode Active
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
