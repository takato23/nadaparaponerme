import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip } from 'recharts';
import type { ClothingItem, StyleDNAProfile } from '../types';
import { analyzeStyleDNA } from '../src/services/aiService';
import Loader from './Loader';
import { Card } from './ui/Card';
import { HelpIcon } from './ui/HelpIcon';
import { getCreditStatus } from '../src/services/usageTrackingService';
import LiquidMorphBackground from './LiquidMorphBackground';

interface StyleDNAProfileViewProps {
    closet: ClothingItem[];
    onClose: () => void;
}

type ViewStep = 'intro' | 'analyzing' | 'results';

const COLORS = ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#14B8A6', '#F97316', '#6366F1', '#8B5CF6'];

const StyleDNAProfileView = ({ closet, onClose }: StyleDNAProfileViewProps) => {
    const [currentStep, setCurrentStep] = useState<ViewStep>('intro');
    const [dnaProfile, setDnaProfile] = useState<StyleDNAProfile | null>(null);
    const [error, setError] = useState<string>('');
    const [activeSection, setActiveSection] = useState<string>('overview');
    const resultsRef = useRef<HTMLDivElement>(null);

    // Credits status
    const credits = useMemo(() => getCreditStatus(), [dnaProfile]);

    const handleStartAnalysis = async () => {
        if (closet.length < 10) {
            setError('Necesitás al menos 10 prendas en tu armario para un análisis confiable de Style DNA.');
            return;
        }

        setError('');
        setCurrentStep('analyzing');

        try {
            const result = await analyzeStyleDNA(closet);
            setDnaProfile(result);
            setCurrentStep('results');
        } catch (err) {
            console.error('Error analyzing style DNA:', err);
            setError(err instanceof Error ? err.message : 'Error al analizar tu Style DNA');
            setCurrentStep('intro');
        }
    };

    const handleShare = async () => {
        if (!dnaProfile) return;

        const shareText = `Mi Style DNA: ${dnaProfile.primary_archetype.charAt(0).toUpperCase() + dnaProfile.primary_archetype.slice(1)} 🧬\n\nVersatilidad: ${dnaProfile.versatility_score}/100\nUniqueness: ${dnaProfile.uniqueness_score}/100\n\n¡Descubrí tu ADN de estilo en No Tengo Nada Para Ponerme! 👗`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Mi Style DNA Profile',
                    text: shareText,
                });
            } catch (err) {
                console.log('Error sharing:', err);
            }
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(shareText);
            alert('¡Copiado al portapapeles!');
        }
    };

    const handleExportPDF = async () => {
        if (!resultsRef.current) return;

        try {
            const html2canvas = (await import('html2canvas')).default;
            const jsPDF = (await import('jspdf')).default;

            const canvas = await html2canvas(resultsRef.current, {
                scale: 2,
                backgroundColor: '#ffffff',
                logging: false
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: [canvas.width / 2, canvas.height / 2]
            });

            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
            pdf.save(`style-dna-${Date.now()}.pdf`);
        } catch (err) {
            console.error('Error exporting PDF:', err);
            alert('Error al exportar PDF. Intenta de nuevo.');
        }
    };

    // Animation variants
    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants: Variants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                type: 'spring' as const,
                stiffness: 100
            }
        }
    };

    // Intro Step
    if (currentStep === 'intro') {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 overflow-hidden"
            >
                <div onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

                {/* Liquid Glass Background */}
                <div className="absolute inset-0 pointer-events-none">
                    <LiquidMorphBackground />
                    <div className="absolute inset-0 bg-white/30 dark:bg-black/40 backdrop-blur-[2px]"></div>
                </div>

                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="absolute inset-0 md:inset-x-8 md:inset-y-8 bg-white/60 dark:bg-[#05060a]/70 backdrop-blur-3xl flex flex-col md:rounded-[32px] md:border md:border-white/50 dark:md:border-white/10 shadow-2xl overflow-hidden"
                >
                    <header className="p-6 md:px-8 py-5 flex items-center justify-between border-b border-white/30 dark:border-white/10 bg-white/20 dark:bg-black/20 backdrop-blur-xl">
                        <div className="flex items-center gap-3">
                            <motion.h2
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-white dark:via-gray-200 dark:to-white"
                                style={{ fontFamily: '"Playfair Display", serif' }}
                            >
                                Tu Style DNA
                            </motion.h2>
                            <HelpIcon
                                content="Style DNA analiza todas tus prendas para identificar patrones de estilo, arquetipos de personalidad y preferencias únicas"
                                position="bottom"
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Credits Indicator */}
                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${credits.remaining <= 3
                                    ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                                    : 'bg-gray-100 dark:bg-gray-800'
                                    }`}
                            >
                                <span className="material-symbols-rounded text-gray-500 text-sm">toll</span>
                                <span className={`text-xs font-medium ${credits.remaining <= 3 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-300'
                                    }`}>
                                    {credits.limit === -1 ? '∞' : credits.remaining}
                                </span>
                            </motion.div>
                            <motion.button
                                whileHover={{ scale: 1.1, rotate: 90 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl dark:text-gray-200"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </motion.button>
                        </div>
                    </header>

                    <div className="flex-grow overflow-y-auto p-6 md:p-8 custom-scrollbar relative z-10">
                        <motion.div
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            className="max-w-3xl mx-auto space-y-6"
                        >
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="bg-red-500/10 backdrop-blur-md border border-red-500/20 rounded-[20px] p-4 flex items-center gap-3"
                                >
                                    <span className="material-symbols-rounded text-red-500">error</span>
                                    <p className="text-red-600 dark:text-red-400 font-medium text-sm">{error}</p>
                                </motion.div>
                            )}

                            {/* Hero Intro Card - Super Glass */}
                            <motion.div variants={itemVariants}>
                                <div className="bg-white/40 dark:bg-black/30 backdrop-blur-2xl border border-white/60 dark:border-white/10 p-8 sm:p-12 rounded-[32px] text-center shadow-xl relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                                    <motion.div
                                        animate={{
                                            rotate: [0, 360],
                                            scale: [1, 1.05, 1]
                                        }}
                                        transition={{
                                            rotate: { duration: 30, repeat: Infinity, ease: "linear" },
                                            scale: { duration: 3, repeat: Infinity, ease: "easeInOut" }
                                        }}
                                        className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-rose-500 p-[2px] shadow-2xl"
                                    >
                                        <div className="w-full h-full bg-white/90 dark:bg-[#05060a]/90 backdrop-blur-sm rounded-[22px] flex items-center justify-center">
                                            <span className="material-symbols-rounded text-transparent bg-clip-text bg-gradient-to-br from-violet-500 to-fuchsia-500 text-5xl">fingerprint</span>
                                        </div>
                                    </motion.div>

                                    <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4 text-gray-900 dark:text-white" style={{ fontFamily: '"Playfair Display", serif' }}>
                                        Descubrí tu <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-600">ADN de Estilo</span>
                                    </h3>
                                    <p className="text-base sm:text-lg text-gray-700 dark:text-gray-300 max-w-xl mx-auto font-medium leading-relaxed">
                                        Un análisis profundo de tu personalidad a través de tu ropa. Nuestra IA examina tu armario completo para revelar arquetipos, paletas cromáticas y muchísimo más.
                                    </p>
                                </div>
                            </motion.div>

                            <motion.div
                                variants={containerVariants}
                                className="grid md:grid-cols-2 gap-4"
                            >
                                {[
                                    { icon: 'diversity_3', title: 'Arquetipos', desc: 'Descubrí si sos casual, minimalista, edgy o una mezcla curada.' },
                                    { icon: 'palette', title: 'Perfil de Color', desc: 'Tu paleta dominante, temperatura cromática y boldness visual.' },
                                    { icon: 'psychology', title: 'Personalidad', desc: 'Lo que revelan tus elecciones de ropa sobre tus valores.' },
                                    { icon: 'star', title: 'Celeb Matches', desc: 'Figuras icónicas cuyo estilo resuena exactamente con el tuyo.' }
                                ].map((feature, idx) => (
                                    <motion.div key={idx} variants={itemVariants}>
                                        <div className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/50 dark:border-white/10 p-6 rounded-[24px] hover:shadow-xl transition-all hover:-translate-y-1 group hover:bg-white/60 dark:hover:bg-white/5 h-full">
                                            <motion.div
                                                whileHover={{ scale: 1.1, rotate: 5 }}
                                                className="flex items-center gap-3 mb-3"
                                            >
                                                <span className="material-symbols-rounded text-[28px] text-transparent bg-clip-text bg-gradient-to-br from-violet-500 to-fuchsia-500 drop-shadow-sm">{feature.icon}</span>
                                                <h4 className="font-extrabold text-gray-900 dark:text-white">{feature.title}</h4>
                                            </motion.div>
                                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 leading-relaxed">
                                                {feature.desc}
                                            </p>
                                        </div>
                                    </motion.div>
                                ))}
                            </motion.div>

                            <motion.div variants={itemVariants}>
                                <Card variant="glass" padding="lg" rounded="2xl">
                                    <h4 className="font-bold mb-3 dark:text-gray-200">¿Qué es Style DNA?</h4>
                                    <p className="text-sm text-text-secondary dark:text-gray-400 mb-2">
                                        Tu "ADN de Estilo" es un perfil psicológico basado en tu armario completo. IA analiza:
                                    </p>
                                    <ul className="space-y-2 text-sm text-text-secondary dark:text-gray-400">
                                        {[
                                            '10 arquetipos de estilo con distribución porcentual',
                                            'Análisis de color: temperatura, boldness, neutros vs. accents',
                                            'Preferencias de silueta: oversized, fitted, structured, etc.',
                                            'Rasgos de personalidad inferidos de tus elecciones de ropa',
                                            'Celebrity matches: influencers con estilo similar',
                                            'Insights de evolución: cómo está cambiando tu estilo'
                                        ].map((item, idx) => (
                                            <motion.li
                                                key={idx}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.1 }}
                                                className="flex items-start gap-2"
                                            >
                                                <span className="material-symbols-outlined text-primary text-sm mt-0.5">check</span>
                                                <span><strong>{item.split(':')[0]}:</strong> {item.split(':')[1] || item}</span>
                                            </motion.li>
                                        ))}
                                    </ul>
                                </Card>
                            </motion.div>

                            <motion.div variants={itemVariants}>
                                <Card variant="glass" padding="lg" rounded="2xl" className="bg-gradient-to-br from-primary/5 to-purple-500/5">
                                    <div className="flex items-start gap-3">
                                        <span className="material-symbols-outlined text-primary">info</span>
                                        <div>
                                            <h4 className="font-bold mb-1 dark:text-gray-200">Requisitos</h4>
                                            <p className="text-sm text-text-secondary dark:text-gray-400">
                                                Necesitás al menos 10 prendas para un análisis básico. Con 15+ prendas obtenés confidence medium. Con 30+ prendas el análisis es altamente confiable.
                                            </p>
                                            <motion.p
                                                animate={{ scale: [1, 1.05, 1] }}
                                                transition={{ duration: 2, repeat: Infinity }}
                                                className="text-sm font-bold mt-2 dark:text-gray-200"
                                            >
                                                Tu armario actual: {closet.length} prendas
                                            </motion.p>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        </motion.div>
                    </div>

                    <div className="p-6 md:p-8 border-t border-white/30 dark:border-white/10 bg-white/20 dark:bg-black/20 backdrop-blur-xl">
                        <motion.button
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleStartAnalysis}
                            disabled={closet.length < 10}
                            className="w-full relative overflow-hidden bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold py-4.5 rounded-[20px] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(139,92,246,0.3)] group"
                        >
                            {!closet.length || closet.length >= 10 ? (
                                <>
                                    <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-rose-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 will-change-opacity" />
                                    <span className="relative z-10 flex items-center justify-center gap-2">
                                        <span className="material-symbols-rounded">fingerprint</span>
                                        Comenzar Análisis Biométrico
                                    </span>
                                </>
                            ) : (
                                <span className="relative z-10 flex items-center justify-center gap-2">
                                    <span className="material-symbols-rounded">lock</span>
                                    Agregá {10 - closet.length} prendas para desbloquear
                                </span>
                            )}
                        </motion.button>
                    </div>
                </motion.div>
            </motion.div>
        );
    }

    // Analyzing Step
    if (currentStep === 'analyzing') {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="fixed inset-0 z-50 overflow-hidden"
            >
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

                {/* Liquid Glass Background */}
                <div className="absolute inset-0 pointer-events-none">
                    <LiquidMorphBackground />
                    <div className="absolute inset-0 bg-white/30 dark:bg-black/40 backdrop-blur-[2px]"></div>
                </div>

                <div className="absolute inset-0 bg-transparent flex flex-col items-center justify-center p-6 z-10">
                    <div className="bg-white/60 dark:bg-[#05060a]/70 backdrop-blur-3xl border border-white/50 dark:border-white/10 p-10 rounded-[32px] max-w-md w-full text-center shadow-2xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 animate-pulse pointer-events-none" />

                        <div className="relative z-10 flex flex-col items-center">
                            <Loader />
                            <motion.h3
                                animate={{ opacity: [0.7, 1, 0.7] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="text-2xl font-bold mt-8 mb-3 text-gray-900 dark:text-white"
                                style={{ fontFamily: '"Playfair Display", serif' }}
                            >
                                Decodificando tu <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-600">ADN</span>
                            </motion.h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-8 font-medium">
                                IA está estudiando tus <span className="text-violet-600 dark:text-fuchsia-400 font-bold">{closet.length} prendas</span> para descubrir tu perfil único...
                            </p>

                            <div className="w-full space-y-3 text-left">
                                {[
                                    'Identificando arquetipos de estilo',
                                    'Analizando paleta de colores',
                                    'Evaluando preferencias de silueta',
                                    'Infiriendo rasgos de personalidad'
                                ].map((step, idx) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.4 }}
                                        className="flex items-center gap-3 bg-white/40 dark:bg-black/20 p-3 rounded-xl border border-white/40 dark:border-white/5"
                                    >
                                        <div className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                                            <span className="material-symbols-rounded text-violet-600 dark:text-fuchsia-400 text-sm">check</span>
                                        </div>
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{step}</span>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        );
    }

    // Results Step
    if (currentStep === 'results' && dnaProfile) {
        // Prepare data for charts
        const radarData = dnaProfile.archetypes
            .filter(a => a.percentage > 0)
            .sort((a, b) => b.percentage - a.percentage)
            .slice(0, 6)
            .map(a => ({
                archetype: a.archetype.charAt(0).toUpperCase() + a.archetype.slice(1),
                value: a.percentage
            }));

        const pieData = dnaProfile.archetypes
            .filter(a => a.percentage > 0)
            .sort((a, b) => b.percentage - a.percentage)
            .map(a => ({
                name: a.archetype.charAt(0).toUpperCase() + a.archetype.slice(1),
                value: a.percentage
            }));

        const personalityRadarData = dnaProfile.personality_traits.map(t => ({
            trait: t.trait,
            value: t.score * 10 // Scale to 100
        }));

        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="fixed inset-0 z-50 overflow-hidden"
            >
                <div onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

                {/* Liquid Glass Background */}
                <div className="absolute inset-0 pointer-events-none">
                    <LiquidMorphBackground />
                    <div className="absolute inset-0 bg-white/30 dark:bg-black/40 backdrop-blur-[2px]"></div>
                </div>

                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="absolute inset-0 md:inset-x-8 md:inset-y-8 bg-white/60 dark:bg-[#05060a]/70 backdrop-blur-3xl flex flex-col md:rounded-[32px] md:border md:border-white/50 dark:md:border-white/10 shadow-2xl overflow-hidden"
                >
                    <header className="p-4 md:px-8 md:py-5 flex items-center justify-between border-b border-white/30 dark:border-white/10 bg-white/20 dark:bg-black/20 backdrop-blur-xl relative z-20">
                        <div className="flex items-center gap-3">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setCurrentStep('intro')}
                                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/50 dark:bg-black/40 border border-white/60 dark:border-white/10 shadow-sm text-gray-700 dark:text-gray-200"
                            >
                                <span className="material-symbols-rounded text-[20px]">arrow_back</span>
                            </motion.button>
                            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-white dark:via-gray-200 dark:to-white" style={{ fontFamily: '"Playfair Display", serif' }}>
                                Style DNA
                            </h2>
                        </div>
                        <div className="flex items-center gap-2 md:gap-3">
                            {/* Share Button */}
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleShare}
                                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/40 dark:bg-black/30 border border-white/50 dark:border-white/10 shadow-sm text-gray-700 dark:text-gray-200"
                                title="Compartir"
                            >
                                <span className="material-symbols-rounded text-[20px]">ios_share</span>
                            </motion.button>
                            {/* Export PDF Button */}
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleExportPDF}
                                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/40 dark:bg-black/30 border border-white/50 dark:border-white/10 shadow-sm text-gray-700 dark:text-gray-200"
                                title="Exportar PDF"
                            >
                                <span className="material-symbols-rounded text-[20px]">picture_as_pdf</span>
                            </motion.button>
                            {/* Credits Indicator */}
                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${credits.remaining <= 3
                                    ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                                    : 'bg-gray-100 dark:bg-gray-800'
                                    }`}
                            >
                                <span className="material-symbols-rounded text-gray-500 text-sm">toll</span>
                                <span className={`text-xs font-medium ${credits.remaining <= 3 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-300'
                                    }`}>
                                    {credits.limit === -1 ? '∞' : credits.remaining}
                                </span>
                            </motion.div>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={onClose}
                                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/50 dark:bg-black/40 border border-white/60 dark:border-white/10 shadow-sm text-gray-900 dark:text-white"
                            >
                                <span className="material-symbols-rounded text-[20px]">close</span>
                            </motion.button>
                        </div>
                    </header>

                    <div className="flex-grow overflow-y-auto p-4 md:p-8 custom-scrollbar relative z-10" ref={resultsRef}>
                        <motion.div
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            className="max-w-4xl mx-auto space-y-6 pb-24"
                        >
                            {/* Hero Summary Card - Super Glass Infographic */}
                            <motion.div variants={itemVariants}>
                                <div className="bg-white/40 dark:bg-[#05060a]/40 backdrop-blur-2xl border border-white/50 dark:border-white/10 rounded-[32px] p-8 md:p-10 shadow-xl relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 pointer-events-none" />

                                    <div className="text-center mb-8 relative z-10">
                                        <motion.div
                                            animate={{
                                                y: [-5, 5, -5]
                                            }}
                                            transition={{
                                                duration: 4, repeat: Infinity, ease: "easeInOut"
                                            }}
                                            className="inline-flex items-center justify-center w-20 h-20 mb-4 rounded-[24px] bg-white/80 dark:bg-black/50 shadow-[0_0_30px_rgba(139,92,246,0.3)] border border-white/60 dark:border-white/10"
                                        >
                                            <span className="material-symbols-rounded text-transparent bg-clip-text bg-gradient-to-br from-violet-500 to-fuchsia-500 text-4xl">style</span>
                                        </motion.div>
                                        <h3 className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-violet-600 via-fuchsia-600 to-rose-500 bg-clip-text text-transparent mb-2 drop-shadow-sm" style={{ fontFamily: '"Playfair Display", serif' }}>
                                            {dnaProfile.primary_archetype.charAt(0).toUpperCase() + dnaProfile.primary_archetype.slice(1)}
                                        </h3>
                                        {dnaProfile.secondary_archetype && (
                                            <p className="text-lg text-gray-600 dark:text-gray-300 font-medium">
                                                con toques de <span className="font-bold text-gray-900 dark:text-white capitalize">{dnaProfile.secondary_archetype}</span>
                                            </p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-3 gap-3 md:gap-6 relative z-10">
                                        {[
                                            { label: 'Versatilidad', value: dnaProfile.versatility_score, icon: 'swap_horiz', color: 'text-violet-600 dark:text-violet-400' },
                                            { label: 'Uniqueness', value: dnaProfile.uniqueness_score, icon: 'auto_awesome', color: 'text-fuchsia-600 dark:text-fuchsia-400' },
                                            { label: 'Confidence', value: dnaProfile.confidence_level, icon: 'verified', color: 'text-rose-500 dark:text-rose-400' }
                                        ].map((stat, idx) => (
                                            <motion.div
                                                key={idx}
                                                whileHover={{ scale: 1.05, y: -5 }}
                                                className="flex flex-col items-center justify-center bg-white/60 dark:bg-black/40 backdrop-blur-md rounded-[24px] p-4 md:p-6 border border-white/50 dark:border-white/5 shadow-sm transition-all"
                                            >
                                                <span className={`material-symbols-rounded text-[28px] mb-2 drop-shadow-sm ${stat.color}`}>{stat.icon}</span>
                                                <p className={`text-3xl md:text-4xl font-extrabold tracking-tight ${stat.color}`}>
                                                    {typeof stat.value === 'number' ? stat.value : stat.value.toUpperCase()}
                                                </p>
                                                <p className="text-xs md:text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mt-1">{stat.label}</p>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>

                            {/* Navigation Tabs - Animated Pill Selectors */}
                            <motion.div variants={itemVariants} className="sticky top-0 z-20 pt-2 pb-4 bg-transparent">
                                <div className="bg-white/40 dark:bg-black/40 backdrop-blur-2xl border border-white/50 dark:border-white/10 p-1.5 rounded-2xl shadow-lg mx-auto max-w-fit">
                                    <div className="flex gap-1 overflow-x-auto hide-scrollbar">
                                        {[
                                            { id: 'overview', label: 'Resumen', icon: 'auto_stories' },
                                            { id: 'archetypes', label: 'Arquetipos', icon: 'diversity_3' },
                                            { id: 'colors', label: 'Colores', icon: 'palette' },
                                            { id: 'personality', label: 'Personalidad', icon: 'psychology' },
                                            { id: 'celebs', label: 'Íconos', icon: 'star' }
                                        ].map((tab) => (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveSection(tab.id)}
                                                className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all whitespace-nowrap text-sm font-bold tracking-wide ${activeSection === tab.id
                                                    ? 'text-white drop-shadow-md'
                                                    : 'text-gray-600 dark:text-gray-300 hover:bg-white/30 dark:hover:bg-white/5'
                                                    }`}
                                            >
                                                {activeSection === tab.id && (
                                                    <motion.div
                                                        layoutId="dna-tab"
                                                        className="absolute inset-0 bg-gray-900 dark:bg-white rounded-xl shadow-md"
                                                        transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                                                    />
                                                )}
                                                <span className={`relative z-10 material-symbols-rounded text-[18px] ${activeSection === tab.id ? 'text-white dark:text-gray-900' : ''}`}>{tab.icon}</span>
                                                <span className={`relative z-10 ${activeSection === tab.id ? 'dark:text-gray-900' : ''}`}>{tab.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>

                            {/* Content Sections */}
                            <AnimatePresence mode="wait">
                                {activeSection === 'overview' && (
                                    <motion.div
                                        key="overview"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        className="space-y-6"
                                    >
                                        {/* Narrative Summary */}
                                        <div className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/50 dark:border-white/10 p-6 md:p-8 rounded-[24px] shadow-sm">
                                            <h3 className="font-extrabold text-xl mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
                                                <span className="material-symbols-rounded text-violet-600 dark:text-fuchsia-400">auto_stories</span>
                                                Tu Historia de Estilo
                                            </h3>
                                            <p className="text-gray-700 dark:text-gray-300 font-medium whitespace-pre-line leading-relaxed text-base md:text-lg">
                                                {dnaProfile.summary}
                                            </p>
                                        </div>

                                        {/* Occasion Breakdown */}
                                        <div className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/50 dark:border-white/10 p-6 md:p-8 rounded-[24px] shadow-sm">
                                            <h3 className="font-extrabold text-xl mb-6 flex items-center gap-2 text-gray-900 dark:text-white">
                                                <span className="material-symbols-rounded text-violet-600 dark:text-fuchsia-400">event</span>
                                                Desglose por Ocasiones
                                            </h3>
                                            <div className="grid md:grid-cols-2 gap-4">
                                                {dnaProfile.occasion_breakdown
                                                    .sort((a, b) => b.percentage - a.percentage)
                                                    .map((occasion, idx) => (
                                                        <motion.div
                                                            key={occasion.occasion}
                                                            initial={{ opacity: 0, scale: 0.95 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            transition={{ delay: idx * 0.1 }}
                                                            whileHover={{ scale: 1.02, y: -2 }}
                                                            className="border border-white/40 dark:border-white/10 rounded-2xl p-5 bg-white/50 dark:bg-black/30 backdrop-blur-sm shadow-sm hover:shadow-md transition-all"
                                                        >
                                                            <div className="flex items-center justify-between mb-3">
                                                                <span className="font-bold capitalize text-gray-900 dark:text-white text-lg">{occasion.occasion}</span>
                                                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-600 font-black text-2xl">{Math.round(occasion.percentage)}%</span>
                                                            </div>
                                                            <div className="w-full bg-black/5 dark:bg-white/10 rounded-full h-3 mt-2 overflow-hidden border border-white/20 dark:border-white/5">
                                                                <motion.div
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${occasion.percentage}%` }}
                                                                    transition={{ duration: 1.5, delay: idx * 0.1, ease: "easeOut" }}
                                                                    className="bg-gradient-to-r from-violet-500 via-fuchsia-500 to-rose-500 rounded-full h-full animate-gradient-xy shadow-[0_0_10px_rgba(139,92,246,0.6)]"
                                                                />
                                                            </div>
                                                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-3 text-right">{occasion.item_count} prendas analizadas</p>
                                                        </motion.div>
                                                    ))}
                                            </div>
                                        </div>

                                        {/* Evolution Insights */}
                                        {dnaProfile.style_evolution_insights.length > 0 && (
                                            <div className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/50 dark:border-white/10 p-6 md:p-8 rounded-[24px] shadow-sm">
                                                <h3 className="font-extrabold text-xl mb-6 flex items-center gap-2 text-gray-900 dark:text-white">
                                                    <span className="material-symbols-rounded text-violet-600 dark:text-fuchsia-400">trending_up</span>
                                                    Evolución de Estilo
                                                </h3>
                                                <div className="space-y-4">
                                                    {dnaProfile.style_evolution_insights.map((insight, idx) => (
                                                        <motion.div
                                                            key={idx}
                                                            initial={{ opacity: 0, x: -20 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: idx * 0.2 }}
                                                            whileHover={{ x: 5 }}
                                                            className="border-l-[6px] border-violet-500 pl-5 bg-gradient-to-r from-violet-500/10 to-transparent rounded-r-[20px] py-4 pr-4"
                                                        >
                                                            <h4 className="font-bold mb-2 text-gray-900 dark:text-white text-lg">{insight.trend}</h4>
                                                            <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                                                                <span className="text-violet-600 dark:text-fuchsia-400 font-bold mr-1">Evidencia:</span> {insight.evidence}
                                                            </p>
                                                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                                                <span className="text-rose-500 font-bold mr-1">Recomendación:</span> {insight.recommendation}
                                                            </p>
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                )}

                                {activeSection === 'archetypes' && (
                                    <motion.div
                                        key="archetypes"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        className="space-y-6"
                                    >
                                        {/* Radar Chart */}
                                        <div className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/50 dark:border-white/10 p-6 md:p-8 rounded-[24px] shadow-sm">
                                            <h3 className="font-extrabold text-xl mb-6 flex items-center gap-2 text-gray-900 dark:text-white">
                                                <span className="material-symbols-rounded text-violet-600 dark:text-fuchsia-400">radar</span>
                                                Mapa Biométrico
                                            </h3>
                                            <div className="w-full h-80 sm:h-96">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <RadarChart data={radarData} className="dark:opacity-90">
                                                        <PolarGrid stroke="rgba(139, 92, 246, 0.3)" />
                                                        <PolarAngleAxis dataKey="archetype" tick={{ fill: '#6B7280', fontSize: 12, fontWeight: 600 }} className="dark:[&_text]:fill-gray-300" />
                                                        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: 'transparent' }} axisLine={false} />
                                                        <Radar name="Style DNA" dataKey="value" stroke="url(#colorUv)" fill="url(#colorUv)" fillOpacity={0.5} />
                                                        <defs>
                                                            <linearGradient id="colorUv" x1="0" y1="0" x2="1" y2="1">
                                                                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8} />
                                                                <stop offset="95%" stopColor="#d946ef" stopOpacity={0.8} />
                                                            </linearGradient>
                                                        </defs>
                                                    </RadarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>

                                        {/* Detailed List */}
                                        <div className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/50 dark:border-white/10 p-6 md:p-8 rounded-[24px] shadow-sm">
                                            <h3 className="font-extrabold text-xl mb-6 flex items-center gap-2 text-gray-900 dark:text-white">
                                                <span className="material-symbols-rounded text-violet-600 dark:text-fuchsia-400">list</span>
                                                Composición de Arquetipos
                                            </h3>
                                            <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                                                {dnaProfile.archetypes
                                                    .sort((a, b) => b.percentage - a.percentage)
                                                    .filter(a => a.percentage > 0)
                                                    .map((archetype, idx) => (
                                                        <motion.div
                                                            key={archetype.archetype}
                                                            initial={{ opacity: 0, x: -20 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: idx * 0.1 }}
                                                            whileHover={{ scale: 1.02 }}
                                                            className="bg-white/50 dark:bg-black/30 backdrop-blur-sm shadow-sm hover:shadow-md border border-white/40 dark:border-white/10 rounded-[20px] p-5 transition-all"
                                                        >
                                                            <div className="flex items-center justify-between mb-3">
                                                                <span className="text-lg font-bold capitalize text-gray-900 dark:text-white">{archetype.archetype}</span>
                                                                <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-600">{Math.round(archetype.percentage)}%</span>
                                                            </div>
                                                            <div className="w-full bg-black/5 dark:bg-white/10 rounded-full h-3 mb-4 overflow-hidden border border-white/20 dark:border-white/5">
                                                                <motion.div
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${archetype.percentage}%` }}
                                                                    transition={{ duration: 1.5, delay: idx * 0.1, ease: "easeOut" }}
                                                                    className="bg-gradient-to-r from-violet-500 via-fuchsia-500 to-rose-500 rounded-full h-full animate-gradient-xy shadow-[0_0_10px_rgba(139,92,246,0.6)]"
                                                                />
                                                            </div>
                                                            <p className="text-sm font-medium text-gray-600 dark:text-gray-300 leading-relaxed">{archetype.description}</p>
                                                        </motion.div>
                                                    ))}
                                            </div>
                                        </div>

                                        {/* Pie Chart */}
                                        <div className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/50 dark:border-white/10 p-6 md:p-8 rounded-[24px] shadow-sm">
                                            <h3 className="font-extrabold text-xl mb-6 flex items-center gap-2 text-gray-900 dark:text-white">
                                                <span className="material-symbols-rounded text-violet-600 dark:text-fuchsia-400">pie_chart</span>
                                                Distribución
                                            </h3>
                                            <div className="w-full h-80">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={pieData}
                                                            cx="50%"
                                                            cy="50%"
                                                            labelLine={false}
                                                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                                            outerRadius={100}
                                                            innerRadius={60}
                                                            paddingAngle={3}
                                                            fill="#8884d8"
                                                            dataKey="value"
                                                            stroke="none"
                                                        >
                                                            {pieData.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip
                                                            contentStyle={{
                                                                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                                                backdropFilter: 'blur(16px)',
                                                                border: '1px solid rgba(255,255,255,0.5)',
                                                                borderRadius: '16px',
                                                                fontWeight: '600'
                                                            }}
                                                            itemStyle={{ color: '#111827' }}
                                                        />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {activeSection === 'colors' && (
                                    <motion.div
                                        key="colors"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        className="space-y-6"
                                    >
                                        <div className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/50 dark:border-white/10 p-6 md:p-8 rounded-[24px] shadow-sm">
                                            <h3 className="font-extrabold text-xl mb-6 flex items-center gap-2 text-gray-900 dark:text-white">
                                                <span className="material-symbols-rounded text-violet-600 dark:text-fuchsia-400">palette</span>
                                                Perfil de Color
                                            </h3>

                                            <div className="grid md:grid-cols-2 gap-4 md:gap-6 mb-8">
                                                <motion.div whileHover={{ scale: 1.02 }} className="bg-white/50 dark:bg-black/30 backdrop-blur-md rounded-2xl p-5 border border-white/40 dark:border-white/10 shadow-sm flex items-center justify-between">
                                                    <span className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Temperatura</span>
                                                    <span className="capitalize text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-600 text-xl font-black">{dnaProfile.color_profile.color_temperature}</span>
                                                </motion.div>
                                                <motion.div whileHover={{ scale: 1.02 }} className="bg-white/50 dark:bg-black/30 backdrop-blur-md rounded-2xl p-5 border border-white/40 dark:border-white/10 shadow-sm flex items-center justify-between">
                                                    <span className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Boldness</span>
                                                    <span className="capitalize text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-600 text-xl font-black">{dnaProfile.color_profile.color_boldness}</span>
                                                </motion.div>
                                            </div>

                                            <div className="mb-8">
                                                <h4 className="text-sm font-bold mb-4 text-gray-900 dark:text-white uppercase tracking-wider">Colores Dominantes</h4>
                                                <div className="flex flex-wrap gap-4 md:gap-6">
                                                    {dnaProfile.color_profile.dominant_colors.map((color, idx) => (
                                                        <motion.div
                                                            key={idx}
                                                            initial={{ opacity: 0, scale: 0 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            transition={{ delay: idx * 0.1, type: "spring" }}
                                                            whileHover={{ scale: 1.1, y: -5 }}
                                                            className="flex flex-col items-center gap-3"
                                                        >
                                                            <div className="relative group">
                                                                <div className="absolute inset-x-0 -bottom-2 h-4 bg-black/20 dark:bg-black/40 blur-md rounded-[100%] transition-opacity group-hover:opacity-100 opacity-50"></div>
                                                                <div
                                                                    className="w-16 h-16 md:w-20 md:h-20 rounded-[20px] border-[3px] border-white/80 dark:border-white/20 shadow-lg relative z-10 transition-transform group-hover:rotate-3"
                                                                    style={{ backgroundColor: color.hex }}
                                                                />
                                                            </div>
                                                            <div className="text-center">
                                                                <span className="block text-xs font-bold capitalize text-gray-900 dark:text-white leading-tight">{color.name}</span>
                                                                <span className="block text-xs text-violet-600 dark:text-fuchsia-400 font-extrabold">{Math.round(color.percentage)}%</span>
                                                            </div>
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="grid md:grid-cols-2 gap-6">
                                                <div>
                                                    <h4 className="text-sm font-bold mb-4 text-gray-900 dark:text-white uppercase tracking-wider">Neutrals Clave</h4>
                                                    <div className="flex flex-wrap gap-2 md:gap-3">
                                                        {dnaProfile.color_profile.favorite_neutrals.map((color, idx) => (
                                                            <motion.span
                                                                key={idx}
                                                                initial={{ opacity: 0, y: 10 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                transition={{ delay: idx * 0.1 }}
                                                                whileHover={{ scale: 1.05 }}
                                                                className="text-sm px-4 py-2 bg-white/60 dark:bg-black/40 backdrop-blur-md rounded-full capitalize text-gray-800 dark:text-gray-200 font-bold border border-white/50 dark:border-white/10 shadow-sm"
                                                            >
                                                                {color}
                                                            </motion.span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold mb-4 text-gray-900 dark:text-white uppercase tracking-wider">Acentos</h4>
                                                    <div className="flex flex-wrap gap-2 md:gap-3">
                                                        {dnaProfile.color_profile.accent_colors.map((color, idx) => (
                                                            <motion.span
                                                                key={idx}
                                                                initial={{ opacity: 0, y: 10 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                transition={{ delay: idx * 0.1 }}
                                                                whileHover={{ scale: 1.05 }}
                                                                className="text-sm px-4 py-2 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 text-violet-700 dark:text-fuchsia-300 rounded-full capitalize font-bold shadow-sm"
                                                            >
                                                                {color}
                                                            </motion.span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Silhouette Preferences */}
                                        <div className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/50 dark:border-white/10 p-6 md:p-8 rounded-[24px] shadow-sm">
                                            <h3 className="font-extrabold text-xl mb-6 flex items-center gap-2 text-gray-900 dark:text-white">
                                                <span className="material-symbols-rounded text-violet-600 dark:text-fuchsia-400">straighten</span>
                                                Preferencias de Silueta
                                            </h3>
                                            <div className="space-y-4">
                                                {dnaProfile.silhouette_preferences
                                                    .sort((a, b) => b.percentage - a.percentage)
                                                    .filter(s => s.percentage > 0)
                                                    .map((silhouette, idx) => (
                                                        <motion.div
                                                            key={silhouette.type}
                                                            initial={{ opacity: 0, x: -20 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: idx * 0.1 }}
                                                            whileHover={{ scale: 1.02 }}
                                                            className="bg-white/50 dark:bg-black/30 backdrop-blur-sm shadow-sm hover:shadow-md border border-white/40 dark:border-white/10 rounded-[20px] p-5 transition-all"
                                                        >
                                                            <div className="flex items-center justify-between mb-3">
                                                                <span className="text-lg font-bold capitalize text-gray-900 dark:text-white">{silhouette.type}</span>
                                                                <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-600">{Math.round(silhouette.percentage)}%</span>
                                                            </div>
                                                            <div className="w-full bg-black/5 dark:bg-white/10 rounded-full h-3 mb-4 overflow-hidden border border-white/20 dark:border-white/5">
                                                                <motion.div
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${silhouette.percentage}%` }}
                                                                    transition={{ duration: 1.5, delay: idx * 0.1, ease: "easeOut" }}
                                                                    className="bg-gradient-to-r from-violet-500 via-fuchsia-500 to-rose-500 rounded-full h-full animate-gradient-xy shadow-[0_0_10px_rgba(139,92,246,0.6)]"
                                                                />
                                                            </div>
                                                            <p className="text-sm font-medium text-gray-600 dark:text-gray-300 leading-relaxed">{silhouette.description}</p>
                                                        </motion.div>
                                                    ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {activeSection === 'personality' && (
                                    <motion.div
                                        key="personality"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        className="space-y-6"
                                    >
                                        {/* Personality Radar */}
                                        <div className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/50 dark:border-white/10 p-6 md:p-8 rounded-[24px] shadow-sm">
                                            <h3 className="font-extrabold text-xl mb-6 flex items-center gap-2 text-gray-900 dark:text-white">
                                                <span className="material-symbols-rounded text-rose-500 dark:text-rose-400">radar</span>
                                                Mapa de Personalidad
                                            </h3>
                                            <div className="w-full h-80 sm:h-96">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <RadarChart data={personalityRadarData} className="dark:opacity-90">
                                                        <PolarGrid stroke="rgba(244, 63, 94, 0.3)" />
                                                        <PolarAngleAxis dataKey="trait" tick={{ fill: '#6B7280', fontSize: 12, fontWeight: 600 }} className="dark:[&_text]:fill-gray-300" />
                                                        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: 'transparent' }} axisLine={false} />
                                                        <Radar name="Personality" dataKey="value" stroke="url(#colorPersonality)" fill="url(#colorPersonality)" fillOpacity={0.5} />
                                                        <defs>
                                                            <linearGradient id="colorPersonality" x1="0" y1="0" x2="1" y2="1">
                                                                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8} />
                                                                <stop offset="95%" stopColor="#fb923c" stopOpacity={0.8} />
                                                            </linearGradient>
                                                        </defs>
                                                    </RadarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>

                                        {/* Personality Traits */}
                                        <div className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/50 dark:border-white/10 p-6 md:p-8 rounded-[24px] shadow-sm">
                                            <h3 className="font-extrabold text-xl mb-6 flex items-center gap-2 text-gray-900 dark:text-white">
                                                <span className="material-symbols-rounded text-rose-500 dark:text-rose-400">psychology</span>
                                                Rasgos Clave
                                            </h3>
                                            <div className="space-y-4">
                                                {dnaProfile.personality_traits.map((trait, idx) => (
                                                    <motion.div
                                                        key={idx}
                                                        initial={{ opacity: 0, y: 20 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: idx * 0.1 }}
                                                        whileHover={{ scale: 1.02 }}
                                                        className="bg-white/50 dark:bg-black/30 backdrop-blur-sm shadow-sm hover:shadow-md border border-white/40 dark:border-white/10 rounded-[20px] p-5 transition-all"
                                                    >
                                                        <div className="flex items-center justify-between mb-3">
                                                            <span className="font-bold text-lg text-gray-900 dark:text-white">{trait.trait}</span>
                                                            <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-orange-500">{trait.score}/10</span>
                                                        </div>
                                                        <div className="w-full bg-black/5 dark:bg-white/10 rounded-full h-3 mb-4 overflow-hidden border border-white/20 dark:border-white/5">
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${(trait.score / 10) * 100}%` }}
                                                                transition={{ duration: 1.5, delay: idx * 0.1, ease: "easeOut" }}
                                                                className="bg-gradient-to-r from-rose-500 via-orange-500 to-yellow-500 rounded-full h-full animate-gradient-xy shadow-[0_0_10px_rgba(244,63,94,0.6)]"
                                                            />
                                                        </div>
                                                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300 leading-relaxed">{trait.reasoning}</p>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {activeSection === 'celebs' && (
                                    <motion.div
                                        key="celebs"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        className="space-y-6"
                                    >
                                        <div className="bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/50 dark:border-white/10 p-6 md:p-8 rounded-[24px] shadow-sm">
                                            <h3 className="font-extrabold text-xl mb-6 flex items-center gap-2 text-gray-900 dark:text-white">
                                                <span className="material-symbols-rounded text-yellow-500 dark:text-yellow-400">star</span>
                                                Íconos de Estilo
                                            </h3>
                                            <div className="space-y-4">
                                                {dnaProfile.celebrity_matches.map((celeb, idx) => (
                                                    <motion.div
                                                        key={idx}
                                                        initial={{ opacity: 0, scale: 0.95 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        transition={{ delay: idx * 0.2 }}
                                                        whileHover={{ scale: 1.02, y: -5 }}
                                                        className="bg-white/50 dark:bg-black/30 backdrop-blur-md border border-yellow-500/20 dark:border-yellow-500/10 rounded-[20px] p-6 shadow-sm hover:shadow-lg relative overflow-hidden transition-all group"
                                                    >
                                                        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                                                        <motion.div
                                                            animate={{
                                                                rotate: [0, 360],
                                                            }}
                                                            transition={{
                                                                duration: 20,
                                                                repeat: Infinity,
                                                                ease: "linear"
                                                            }}
                                                            className="absolute -top-4 -right-4 text-7xl opacity-5 dark:opacity-10 pointer-events-none"
                                                        >
                                                            ⭐
                                                        </motion.div>
                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 relative z-10 gap-2">
                                                            <div>
                                                                <h4 className="font-extrabold text-2xl text-gray-900 dark:text-white mb-1">{celeb.name}</h4>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
                                                                    <p className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-orange-500 font-black text-lg">{celeb.match_percentage}% Match Profile</p>
                                                                </div>
                                                            </div>
                                                            <span className="text-5xl font-black text-gray-200/50 dark:text-gray-800/50 absolute bottom-0 right-0 sm:static">#{idx + 1}</span>
                                                        </div>
                                                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300 leading-relaxed mb-4 relative z-10">{celeb.reasoning}</p>
                                                        <div className="flex flex-wrap gap-2 relative z-10">
                                                            {celeb.shared_characteristics.map((char, charIdx) => (
                                                                <motion.span
                                                                    key={charIdx}
                                                                    initial={{ opacity: 0, scale: 0 }}
                                                                    animate={{ opacity: 1, scale: 1 }}
                                                                    transition={{ delay: idx * 0.2 + charIdx * 0.1 }}
                                                                    whileHover={{ scale: 1.05 }}
                                                                    className="text-xs px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-700 dark:text-yellow-400 rounded-full font-bold shadow-sm"
                                                                >
                                                                    {char}
                                                                </motion.span>
                                                            ))}
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </div>

                    <motion.div
                        initial={{ y: 100 }}
                        animate={{ y: 0 }}
                        className="absolute bottom-0 left-0 right-0 p-6 pt-12 bg-gradient-to-t from-white via-white/80 to-transparent dark:from-[#05060a] dark:via-[#05060a]/80 backdrop-blur-[2px] pointer-events-none flex items-end justify-center"
                    >
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setCurrentStep('intro')}
                            className="w-full max-w-sm bg-white/40 dark:bg-black/40 backdrop-blur-3xl border border-white/50 dark:border-gray-700/50 text-gray-900 dark:text-white font-bold py-4 rounded-2xl transition-all shadow-lg hover:shadow-xl pointer-events-auto flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-rounded">refresh</span>
                            Analizar de Nuevo
                        </motion.button>
                    </motion.div>
                </motion.div>
            </motion.div>
        );
    }

    return null;
};

export default StyleDNAProfileView;
