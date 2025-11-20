import React from 'react';
import { motion } from 'framer-motion';

interface DynamicMeshBackgroundProps {
    className?: string;
}

export const DynamicMeshBackground: React.FC<DynamicMeshBackgroundProps> = ({ className = '' }) => {
    return (
        <div className={`absolute inset-0 overflow-hidden bg-black ${className}`}>
            {/* Moving Gradient Orbs */}
            <motion.div
                className="absolute top-1/4 left-1/4 w-[50vw] h-[50vw] bg-purple-600 rounded-full mix-blend-screen filter blur-[100px] opacity-40"
                animate={{
                    x: [0, 100, -50, 0],
                    y: [0, -50, 100, 0],
                    scale: [1, 1.2, 0.8, 1],
                }}
                transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
                className="absolute bottom-1/4 right-1/4 w-[50vw] h-[50vw] bg-blue-600 rounded-full mix-blend-screen filter blur-[100px] opacity-40"
                animate={{
                    x: [0, -100, 50, 0],
                    y: [0, 50, -100, 0],
                    scale: [1, 0.8, 1.2, 1],
                }}
                transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
                className="absolute top-1/2 left-1/2 w-[40vw] h-[40vw] bg-pink-500 rounded-full mix-blend-screen filter blur-[100px] opacity-40"
                animate={{
                    x: [0, 50, -100, 0],
                    y: [0, 100, -50, 0],
                }}
                transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Noise Overlay for Texture */}
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }}></div>
        </div>
    );
};
