import React from 'react';
import { motion } from 'framer-motion';
import { useThemeContext } from '../../contexts/ThemeContext';

const features = [
    {
        title: 'Estilista con IA',
        description: 'Generá outfits perfectos para cualquier ocasión usando solo las prendas de tu armario real. Tu propio personal shopper en el bolsillo.',
        icon: 'auto_awesome',
        color: 'from-emerald-400 to-teal-500',
    },
    {
        title: 'Probador Virtual',
        description: 'Visualizá cómo te quedan las combinaciones antes de vestirte con nuestra tecnología de visualización avanzada.',
        icon: 'view_in_ar',
        color: 'from-violet-400 to-purple-500',
    },
    {
        title: 'Tu Armario Inteligente',
        description: 'La IA identifica tus prendas, colores y estilos automáticamente para que organizar tu guardarropa sea un placer.',
        icon: 'checkroom',
        color: 'from-blue-400 to-indigo-500',
    },
    {
        title: 'Maleta Perfecta',
        description: '¿Te vas de viaje? Armamos la maleta ideal basada en el clima y los días de tu destino. Nada sobra, nada falta.',
        icon: 'luggage',
        color: 'from-orange-400 to-rose-500',
    }
];

export default function FeaturesSection() {
    const { theme } = useThemeContext();
    const isDark = theme === 'dark';

    return (
        <section className={`relative py-24 px-4 overflow-hidden transition-colors duration-500 ${isDark ? 'bg-[#05060a]' : 'bg-slate-50'}`}>
            {/* Background Decor */}
            <div className={`absolute top-0 left-1/4 w-96 h-96 blur-[120px] rounded-full pointer-events-none ${isDark ? 'bg-primary/10' : 'bg-primary/20'}`} />
            <div className={`absolute bottom-0 right-1/4 w-96 h-96 blur-[120px] rounded-full pointer-events-none ${isDark ? 'bg-secondary/10' : 'bg-secondary/20'}`} />

            <div className="max-w-6xl mx-auto relative z-10">
                <div className="text-center mb-16">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className={`text-3xl md:text-5xl font-bold mb-4 tracking-tight ${isDark ? 'text-white' : 'text-slate-800'}`}
                    >
                        Tu armario, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">potenciado por IA</span>
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className={`text-lg max-w-2xl mx-auto ${isDark ? 'text-gray-400' : 'text-slate-600'}`}
                    >
                        Combinamos lo último en visión artificial y modelos de lenguaje para que nunca más digas "no tengo qué ponerme".
                    </motion.p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {features.map((feature, idx) => (
                        <motion.div
                            key={feature.title}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.1 }}
                            whileHover={{ y: -5 }}
                            className={`p-8 rounded-[2rem] backdrop-blur-xl relative group transition-colors duration-300 ${
                                isDark
                                    ? 'bg-white/5 border border-white/10'
                                    : 'bg-white/80 border border-slate-200 shadow-lg'
                            }`}
                        >
                            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} p-0.5 mb-6`}>
                                <div className={`w-full h-full rounded-2xl flex items-center justify-center ${isDark ? 'bg-[#05060a]/80' : 'bg-white/90'}`}>
                                    <span className={`material-symbols-outlined text-3xl ${isDark ? 'text-white' : 'text-slate-700'}`}>
                                        {feature.icon}
                                    </span>
                                </div>
                            </div>
                            <h3 className={`text-xl font-bold mb-3 ${isDark ? 'text-white' : 'text-slate-800'}`}>{feature.title}</h3>
                            <p className={`leading-relaxed text-sm ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                                {feature.description}
                            </p>

                            {/* Decorative Glow */}
                            <div className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity rounded-[2rem] pointer-events-none ${
                                isDark ? 'from-white/5 to-transparent' : 'from-primary/5 to-transparent'
                            }`} />
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
