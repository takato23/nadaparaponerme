import React from 'react';
import { motion } from 'framer-motion';
import { useThemeContext } from '../../contexts/ThemeContext';

const steps = [
    {
        number: '01',
        title: 'Digitaliza',
        description: 'Saca fotos a tus prendas o sube imágenes de tu galería. Nuestra IA las limpia y etiqueta por ti.',
        icon: 'photo_camera',
    },
    {
        number: '02',
        title: 'Organiza',
        description: 'Mira tu armario como nunca antes. Filtra por color, categoría o estilo con un solo toque.',
        icon: 'grid_view',
    },
    {
        number: '03',
        title: 'Luce Increíble',
        description: 'Genera outfits para cualquier evento o deja que la IA te sorprenda con combinaciones que no habías imaginado.',
        icon: 'auto_fix_high',
    }
];

export default function HowItWorksSection() {
    const { theme } = useThemeContext();
    const isDark = theme === 'dark';

    return (
        <section className={`py-24 px-4 relative overflow-hidden transition-colors duration-500 ${isDark ? 'bg-[#05060a]' : 'bg-white'}`}>
            {/* Decorative Lines */}
            <div className={`absolute inset-0 pointer-events-none ${isDark ? 'opacity-10' : 'opacity-5'}`}>
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-gradient-to-b from-transparent ${isDark ? 'via-white' : 'via-slate-400'} to-transparent`} />
            </div>

            <div className="max-w-6xl mx-auto">
                <div className="mb-20">
                    <motion.span
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        className="text-primary font-bold tracking-[0.2em] text-xs block mb-4"
                    >
                        PROCESO SIMPLE
                    </motion.span>
                    <motion.h2
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className={`text-3xl md:text-5xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-800'}`}
                    >
                        Cómo funciona <br /> <span className={`underline decoration-primary/40 underline-offset-8 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Ojo de Loca</span>
                    </motion.h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 relative">
                    {steps.map((step, idx) => (
                        <motion.div
                            key={step.title}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.2 }}
                            className="relative"
                        >
                            {/* Connector line for desktop */}
                            {idx < steps.length - 1 && (
                                <div className={`hidden lg:block absolute top-12 left-full w-full h-px z-0 -translate-x-12 ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
                            )}

                            <div className="relative z-10">
                                <div className="flex items-center gap-4 mb-6">
                                    <span className={`text-5xl font-black font-mono ${isDark ? 'text-white/5' : 'text-slate-100'}`}>{step.number}</span>
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-primary ${
                                        isDark ? 'bg-white/5 border border-white/10' : 'bg-slate-100 border border-slate-200'
                                    }`}>
                                        <span className="material-symbols-outlined">{step.icon}</span>
                                    </div>
                                </div>

                                <h3 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-800'}`}>{step.title}</h3>
                                <p className={`leading-relaxed ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                                    {step.description}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Bottom CTA Nudge */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className={`mt-20 p-8 rounded-3xl bg-gradient-to-r from-primary/10 to-secondary/10 text-center ${
                        isDark ? 'border border-white/5' : 'border border-slate-200'
                    }`}
                >
                    <p className={`font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}>
                        ¿Lista para revolucionar tu forma de vestir?
                    </p>
                    <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Más de 5,000 outfits generados este mes.</p>
                </motion.div>
            </div>
        </section>
    );
}
