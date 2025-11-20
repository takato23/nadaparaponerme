import React from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';

interface HolographicCardProps {
    title: string;
    description: string;
    price?: string;
    features?: string[];
    buttonText?: string;
    onButtonClick?: () => void;
    className?: string;
}

export const HolographicCard: React.FC<HolographicCardProps> = ({
    title,
    description,
    price,
    features,
    buttonText = 'Select Plan',
    onButtonClick,
    className = ''
}) => {
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotateX = useTransform(y, [0, 400], [10, -10]);
    const rotateY = useTransform(x, [0, 300], [-10, 10]);

    function handleMouse(event: React.MouseEvent<HTMLDivElement>) {
        const rect = event.currentTarget.getBoundingClientRect();
        x.set(event.clientX - rect.left);
        y.set(event.clientY - rect.top);
    }

    return (
        <div className={`perspective-1000 ${className}`}>
            <motion.div
                style={{
                    rotateX,
                    rotateY,
                    transformStyle: "preserve-3d",
                }}
                onMouseMove={handleMouse}
                onMouseLeave={() => {
                    x.set(150);
                    y.set(200);
                }}
                className="relative w-full h-full min-h-[400px] rounded-[2rem] bg-black shadow-2xl cursor-pointer group overflow-hidden border border-white/10"
            >
                {/* Holographic Gradient Layer */}
                <div
                    className="absolute inset-0 opacity-60 mix-blend-color-dodge pointer-events-none"
                    style={{
                        background: 'linear-gradient(105deg, transparent 20%, rgba(255,219,219,0.4) 40%, rgba(255,255,255,0.6) 45%, rgba(255,219,219,0.4) 50%, transparent 55%)',
                        backgroundSize: '200% 200%',
                        filter: 'brightness(1.2) contrast(1.2)',
                    }}
                />

                {/* Iridescent Sheen */}
                <motion.div
                    className="absolute inset-0 opacity-40 mix-blend-overlay pointer-events-none"
                    style={{
                        background: 'linear-gradient(to bottom right, #ff00cc, #3333ff, #00ccff)',
                        backgroundSize: '200% 200%',
                    }}
                    animate={{
                        backgroundPosition: ['0% 0%', '100% 100%'],
                    }}
                    transition={{
                        duration: 5,
                        repeat: Infinity,
                        repeatType: "reverse",
                    }}
                />

                {/* Content */}
                <div className="absolute inset-0 p-8 flex flex-col justify-between z-10">
                    <div className="flex justify-between items-start">
                        <span className="material-symbols-outlined text-white text-3xl">diamond</span>
                        <span className="px-3 py-1 rounded-full border border-white/30 text-white text-xs font-bold backdrop-blur-md">PREMIUM</span>
                    </div>

                    <div>
                        <h3 className="text-3xl font-bold text-white mb-2">{title}</h3>
                        <p className="text-white/70 text-sm mb-6">{description}</p>

                        {price && (
                            <div className="mb-6">
                                <span className="text-4xl font-bold text-white">{price}</span>
                                <span className="text-white/60 text-sm">/month</span>
                            </div>
                        )}

                        {features && (
                            <ul className="space-y-2 mb-8">
                                {features.map((feature, i) => (
                                    <li key={i} className="flex items-center gap-2 text-white/80 text-sm">
                                        <span className="material-symbols-outlined text-sm text-cyan-400">check</span>
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                        )}

                        <button
                            onClick={onButtonClick}
                            className="w-full py-3 rounded-xl bg-white text-black font-bold hover:scale-105 transition-transform shadow-lg shadow-white/20"
                        >
                            {buttonText}
                        </button>
                    </div>
                </div>

                {/* Noise Texture */}
                <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }}></div>
            </motion.div>
        </div>
    );
};
