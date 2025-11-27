import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

interface LandingPage3DProps {
    onGetStarted: () => void;
    onLogin: () => void;
}

const LandingPage3D = ({ onGetStarted, onLogin }: LandingPage3DProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    });

    // Parallax transforms for text
    // Section 1: Hero (0 - 0.25)
    const heroOpacity = useTransform(scrollYProgress, [0, 0.15, 0.25], [1, 1, 0]);
    const heroScale = useTransform(scrollYProgress, [0, 0.25], [1, 0.9]);

    // Section 2: Chaos (0.25 - 0.5)
    const chaosOpacity = useTransform(scrollYProgress, [0.25, 0.35, 0.45, 0.5], [0, 1, 1, 0]);
    const chaosY = useTransform(scrollYProgress, [0.25, 0.35, 0.5], [50, 0, -50]);

    // Section 3: Order (0.5 - 0.75)
    const orderOpacity = useTransform(scrollYProgress, [0.5, 0.6, 0.7, 0.75], [0, 1, 1, 0]);
    const orderY = useTransform(scrollYProgress, [0.5, 0.6, 0.75], [50, 0, -50]);

    // Section 4: Magic (0.75 - 1.0)
    const magicOpacity = useTransform(scrollYProgress, [0.75, 0.85, 1], [0, 1, 1]);
    const magicY = useTransform(scrollYProgress, [0.75, 0.85], [50, 0]);

    return (
        <div ref={containerRef} className="relative w-full h-full overflow-y-auto bg-transparent text-[#1D1D1F] font-sans selection:bg-pink-200 selection:text-pink-900 pointer-events-none">
            {/* Scroll Spacer - Defines the total scroll height */}
            <div className="relative h-[500vh]">

                {/* Sticky Container for Content */}
                <div className="sticky top-0 h-screen w-full overflow-hidden flex flex-col items-center justify-center">

                    {/* Section 1: Hero (Gelatin) */}
                    <motion.div
                        style={{ opacity: heroOpacity, scale: heroScale }}
                        className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 pointer-events-none"
                    >
                        <h1 className="text-7xl md:text-9xl font-bold tracking-tighter mb-6 text-[#1D1D1F]">
                            Ojo de loca,<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF9A9E] to-[#FECFEF]">jamás se equivoca.</span>
                        </h1>
                        <p className="text-xl md:text-2xl text-[#86868B] max-w-2xl font-normal tracking-wide">
                            La intuición, perfeccionada por la ciencia.
                        </p>
                        <div className="mt-12 pointer-events-auto">
                            <button
                                onClick={onGetStarted}
                                className="px-10 py-4 bg-[#1D1D1F] text-white rounded-full font-medium text-lg hover:scale-105 transition-transform shadow-lg hover:shadow-xl"
                            >
                                Empezar Ahora
                            </button>
                        </div>
                    </motion.div>

                    {/* Section 2: Chaos (Falling Spheres) */}
                    <motion.div
                        style={{ opacity: chaosOpacity, y: chaosY }}
                        className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 pointer-events-none"
                    >
                        <h2 className="text-6xl md:text-8xl font-bold mb-8 text-[#FF3B30]">
                            Caos.
                        </h2>
                        <p className="text-2xl text-[#86868B] max-w-xl font-light">
                            "No tengo nada para ponerme."<br />
                            <span className="text-sm uppercase tracking-widest mt-4 block text-[#1D1D1F]">Problema Detectado</span>
                        </p>
                    </motion.div>

                    {/* Section 3: Order (Chrome Structure) */}
                    <motion.div
                        style={{ opacity: orderOpacity, y: orderY }}
                        className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 pointer-events-none"
                    >
                        <h2 className="text-6xl md:text-8xl font-bold mb-8 text-[#007AFF]">
                            Estructura.
                        </h2>
                        <p className="text-2xl text-[#86868B] max-w-xl font-light">
                            Tu armario, digitalizado y organizado.<br />
                            <span className="text-sm uppercase tracking-widest mt-4 block text-[#1D1D1F]">Solución Aplicada</span>
                        </p>
                    </motion.div>

                    {/* Section 4: Magic (Brain) */}
                    <motion.div
                        style={{ opacity: magicOpacity, y: magicY }}
                        className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 pointer-events-none"
                    >
                        <h2 className="text-6xl md:text-8xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-indigo-500">
                            Inteligencia.
                        </h2>
                        <p className="text-2xl text-[#86868B] max-w-xl mb-12 font-light">
                            Tu estilista personal, siempre disponible.
                        </p>
                        <div className="flex gap-4 pointer-events-auto">
                            <button
                                onClick={onLogin}
                                className="px-12 py-5 bg-[#1D1D1F] text-white rounded-full font-medium text-xl hover:scale-105 transition-transform shadow-2xl"
                            >
                                Crear Cuenta Gratis
                            </button>
                        </div>
                    </motion.div>

                </div>
            </div>
        </div>
    );
};

export default LandingPage3D;
