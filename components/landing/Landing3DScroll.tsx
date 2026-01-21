import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import Eye3D from '../Eye3D';
import { ArrowRight, Star, Sparkles, CheckCircle2 } from 'lucide-react';

interface Landing3DScrollProps {
    onGetStarted: () => void;
    onLogin: () => void;
}

const SECTION_HEIGHT = 100; // vh

export default function Landing3DScroll({ onGetStarted, onLogin }: Landing3DScrollProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    });

    // Smooth scroll progress
    const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 20 });

    // 3D Object Transformations based on scroll
    // Rotates the eye and moves it across the screen
    const eyeScale = useTransform(smoothProgress, [0, 0.2, 0.8, 1], [1, 1.2, 0.8, 1.5]);
    const eyeY = useTransform(smoothProgress, [0, 0.3, 0.7, 1], ["0%", "10%", "-10%", "0%"]);
    const eyeX = useTransform(smoothProgress, [0, 0.3, 0.7, 1], ["0%", "-20%", "20%", "0%"]);

    // Background Gradient Opacity
    const bgOpacity = useTransform(smoothProgress, [0, 0.5, 1], [0.8, 0.4, 0.9]);

    return (
        <div ref={containerRef} className="relative bg-[#05060a] text-white">

            {/* STICKY BACKGROUND LAYER */}
            <div className="fixed inset-0 h-screen overflow-hidden pointer-events-none">
                {/* 3D Eye */}
                <motion.div
                    style={{ scale: eyeScale, y: eyeY, x: eyeX }}
                    className="absolute inset-0 z-0 flex items-center justify-center"
                >
                    <Eye3D variant="landing" className="w-full h-full" />
                </motion.div>

                {/* Overlays/Gradients */}
                <motion.div
                    style={{ opacity: bgOpacity }}
                    className="absolute inset-0 bg-gradient-to-b from-transparent via-[#05060a]/50 to-[#05060a] z-10"
                />
            </div>

            {/* SCROLLABLE CONTENT LAYER */}
            <div className="relative z-20">

                {/* HERO SECTION */}
                <Section className="items-center text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="max-w-3xl px-6"
                    >
                        <Badge>Nuevo: Asesoría IA v2.0</Badge>
                        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-200 to-purple-400">
                            No Tengo Nada<br />Que Ponerme
                        </h1>
                        <p className="text-xl text-gray-400 mb-8 max-w-xl mx-auto">
                            Transforma el caos de tu armario en outfits infinitos. La única app que entiende tu estilo, tu cuerpo y tu vida.
                        </p>
                        <button
                            onClick={onGetStarted}
                            className="bg-white text-black px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-200 transition-all flex items-center gap-2 mx-auto group"
                        >
                            Analizar mi Estilo Gratis
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </motion.div>
                </Section>

                {/* PROBLEM SECTION */}
                <Section className="items-center md:items-start md:pl-20">
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        className="max-w-xl px-6"
                    >
                        <h2 className="text-4xl md:text-6xl font-bold mb-6">El Dilema Diario.</h2>
                        <p className="text-2xl text-gray-400 leading-relaxed">
                            Tienes el armario lleno, pero sientes que no tienes opciones.
                            <span className="text-white font-semibold"> Ojo de Loca</span> escanea tus prendas y crea nuevas combinaciones que nunca imaginaste.
                        </p>
                    </motion.div>
                </Section>

                {/* SOLUTION / STYLIST SECTION */}
                <Section className="items-center md:items-end md:pr-20 text-right">
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        className="max-w-xl px-6"
                    >
                        <div className="flex items-center justify-end gap-2 mb-4 text-purple-400">
                            <Sparkles />
                            <span className="font-bold tracking-widest text-sm uppercase">Experto en Moda</span>
                        </div>
                        <h2 className="text-4xl md:text-6xl font-bold mb-6">Tu Asesor 24/7.</h2>
                        <p className="text-xl text-gray-400 mb-6">
                            No es solo un algoritmo. Entiende colorimetría, tipos de cuerpo y tendencias.
                        </p>
                        <ul className="space-y-4 inline-block text-left">
                            <FeatureItem>Análisis de 12 Estaciones</FeatureItem>
                            <FeatureItem>Equilibrio según tipo de cuerpo</FeatureItem>
                            <FeatureItem>Sugerencias para el clima real</FeatureItem>
                        </ul>
                    </motion.div>
                </Section>

                {/* FINAL CTA SECTION */}
                <Section className="items-center justify-center text-center">
                    <div className="bg-gradient-to-b from-transparent to-purple-900/20 absolute inset-0 -z-10" />
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        whileInView={{ scale: 1, opacity: 1 }}
                        className="max-w-2xl px-6 bg-white/5 backdrop-blur-3xl rounded-3xl p-12 border border-white/10"
                    >
                        <Star className="w-12 h-12 text-yellow-400 mx-auto mb-6 fill-yellow-400/20" />
                        <h2 className="text-4xl md:text-5xl font-bold mb-6">Empieza tu Transformación</h2>
                        <p className="text-lg text-gray-300 mb-8">
                            Únete a miles de personas que ya recuperaron el control de su imagen.
                            Primer análisis 100% gratuito.
                        </p>
                        <div className="flex flex-col gap-4 sm:flex-row justify-center">
                            <button
                                onClick={onGetStarted}
                                className="bg-purple-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-purple-700 transition-all shadow-lg shadow-purple-600/25"
                            >
                                Descubrir mi Estilo
                            </button>
                            <button
                                onClick={onLogin}
                                className="px-8 py-4 rounded-xl font-medium text-lg text-gray-400 hover:text-white transition-colors"
                            >
                                Ya tengo cuenta
                            </button>
                        </div>
                        <p className="mt-6 text-xs text-gray-500">
                            Sin tarjeta de crédito requerida para el diagnóstico inicial.
                        </p>
                    </motion.div>
                </Section>

            </div>
        </div>
    );
}

// Utility Components
const Section = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
    <div className={`min-h-screen w-full flex flex-col justify-center relative py-20 ${className}`}>
        {children}
    </div>
);

const Badge = ({ children }: { children: React.ReactNode }) => (
    <div className="inline-flex items-center px-3 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs font-bold tracking-wider uppercase mb-6">
        {children}
    </div>
);

const FeatureItem = ({ children }: { children: React.ReactNode }) => (
    <li className="flex items-center gap-3 text-lg text-gray-300">
        <CheckCircle2 className="w-5 h-5 text-purple-400 shrink-0" />
        {children}
    </li>
);
