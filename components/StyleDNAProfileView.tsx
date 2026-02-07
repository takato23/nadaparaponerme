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
                className="fixed inset-0 z-50"
            >
                <div onClick={onClose} className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                    className="absolute inset-0 bg-white/90 dark:bg-background-dark/90 backdrop-blur-xl flex flex-col md:inset-y-4 md:inset-x-4 md:rounded-3xl md:border md:border-white/20"
                >
                    <header className="p-6 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2">
                            <motion.h2
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                className="text-2xl font-bold dark:text-gray-200"
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

                    <div className="flex-grow overflow-y-auto p-6">
                        <motion.div
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            className="max-w-2xl mx-auto space-y-6"
                        >
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-2xl p-4"
                                >
                                    <p className="text-red-800 dark:text-red-300 text-sm">{error}</p>
                                </motion.div>
                            )}

                            <motion.div variants={itemVariants}>
                                <Card variant="glass" padding="xl" rounded="3xl" className="text-center">
                                    <motion.div
                                        animate={{
                                            rotate: [0, 360],
                                            scale: [1, 1.1, 1]
                                        }}
                                        transition={{
                                            rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                                            scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                                        }}
                                        className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-primary to-purple-600 rounded-2xl flex items-center justify-center"
                                    >
                                        <span className="material-symbols-outlined text-white text-5xl">fingerprint</span>
                                    </motion.div>
                                    <h3 className="text-2xl font-bold mb-2 dark:text-gray-200">Descubrí tu ADN de Estilo</h3>
                                    <p className="text-text-secondary dark:text-gray-400">
                                        Un análisis profundo de tu personalidad a través de tu ropa. IA examina tu armario completo para revelar arquetipos de estilo, rasgos de personalidad, y mucho más.
                                    </p>
                                </Card>
                            </motion.div>

                            <motion.div
                                variants={containerVariants}
                                className="grid md:grid-cols-2 gap-4"
                            >
                                {[
                                    { icon: 'diversity_3', title: 'Arquetipos de Estilo', desc: 'Descubre si sos casual, formal, minimalist, edgy, bohemian, o una mezcla única.' },
                                    { icon: 'palette', title: 'Perfil de Color', desc: 'Tu paleta de colores dominante, temperatura cromática, y boldness.' },
                                    { icon: 'psychology', title: 'Rasgos de Personalidad', desc: 'Lo que tu ropa revela sobre tu personalidad y valores.' },
                                    { icon: 'star', title: 'Celebrity Matches', desc: 'Celebridades cuyo estilo es similar al tuyo.' }
                                ].map((feature, idx) => (
                                    <motion.div key={idx} variants={itemVariants}>
                                        <Card variant="glass" padding="lg" rounded="2xl" className="hover:shadow-lg transition-shadow">
                                            <motion.div
                                                whileHover={{ scale: 1.1, rotate: 5 }}
                                                className="flex items-center gap-3 mb-3"
                                            >
                                                <span className="material-symbols-outlined text-primary">{feature.icon}</span>
                                                <h4 className="font-bold dark:text-gray-200">{feature.title}</h4>
                                            </motion.div>
                                            <p className="text-sm text-text-secondary dark:text-gray-400">
                                                {feature.desc}
                                            </p>
                                        </Card>
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

                    <div className="p-6 border-t border-gray-200 dark:border-gray-700">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleStartAnalysis}
                            disabled={closet.length < 10}
                            className="w-full bg-gradient-to-r from-primary to-purple-600 text-white font-bold py-4 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                        >
                            {closet.length < 10 ? `Agregá ${10 - closet.length} prendas más` : '🧬 Analizar mi Style DNA'}
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
                className="fixed inset-0 z-50"
            >
                <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

                <div className="absolute inset-0 bg-white/90 dark:bg-background-dark/90 backdrop-blur-xl flex flex-col items-center justify-center p-6">
                    <Card variant="glass" padding="xl" rounded="3xl" className="max-w-md w-full text-center">
                        <Loader />
                        <motion.h3
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="text-2xl font-bold mt-6 mb-2 dark:text-gray-200"
                        >
                            Analizando tu Style DNA
                        </motion.h3>
                        <p className="text-text-secondary dark:text-gray-400 mb-6">
                            IA está estudiando tus {closet.length} prendas para descubrir tu perfil de estilo único...
                        </p>
                        <div className="space-y-2 text-sm text-text-secondary dark:text-gray-400">
                            {[
                                'Identificando arquetipos de estilo',
                                'Analizando paleta de colores',
                                'Evaluando preferencias de silueta',
                                'Infiriendo rasgos de personalidad',
                                'Buscando celebrity matches'
                            ].map((step, idx) => (
                                <motion.p
                                    key={idx}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.3 }}
                                >
                                    ✓ {step}
                                </motion.p>
                            ))}
                        </div>
                    </Card>
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
                className="fixed inset-0 z-50"
            >
                <div onClick={onClose} className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute inset-0 bg-white/90 dark:bg-background-dark/90 backdrop-blur-xl flex flex-col md:inset-y-4 md:inset-x-4 md:rounded-3xl md:border md:border-white/20"
                >
                    <header className="p-6 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setCurrentStep('intro')}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl dark:text-gray-200"
                        >
                            <span className="material-symbols-outlined">arrow_back</span>
                        </motion.button>
                        <h2 className="text-xl font-bold dark:text-gray-200">Tu Style DNA</h2>
                        <div className="flex items-center gap-3">
                            {/* Share Button */}
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={handleShare}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl dark:text-gray-200"
                                title="Compartir"
                            >
                                <span className="material-symbols-outlined">share</span>
                            </motion.button>
                            {/* Export PDF Button */}
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={handleExportPDF}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl dark:text-gray-200"
                                title="Exportar PDF"
                            >
                                <span className="material-symbols-outlined">download</span>
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
                                whileHover={{ scale: 1.1, rotate: 90 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl dark:text-gray-200"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </motion.button>
                        </div>
                    </header>

                    <div className="flex-grow overflow-y-auto p-6 pb-24" ref={resultsRef}>
                        <motion.div
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            className="max-w-4xl mx-auto space-y-6"
                        >
                            {/* Hero Summary Card */}
                            <motion.div variants={itemVariants}>
                                <Card variant="glass" padding="lg" rounded="3xl" className="bg-gradient-to-br from-primary/10 to-purple-600/10">
                                    <div className="text-center mb-4">
                                        <motion.div
                                            animate={{
                                                rotate: [0, 360],
                                                scale: [1, 1.1, 1]
                                            }}
                                            transition={{
                                                rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                                                scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                                            }}
                                            className="flex items-center justify-center gap-2 mb-2"
                                        >
                                            <span className="material-symbols-outlined text-primary text-4xl">fingerprint</span>
                                            <h3 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                                                {dnaProfile.primary_archetype.charAt(0).toUpperCase() + dnaProfile.primary_archetype.slice(1)}
                                            </h3>
                                        </motion.div>
                                        {dnaProfile.secondary_archetype && (
                                            <p className="text-text-secondary dark:text-gray-400">
                                                con toques de <span className="font-bold text-primary">{dnaProfile.secondary_archetype.charAt(0).toUpperCase() + dnaProfile.secondary_archetype.slice(1)}</span>
                                            </p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-3 gap-4 mt-6">
                                        {[
                                            { label: 'Versatilidad', value: dnaProfile.versatility_score, icon: 'swap_horiz' },
                                            { label: 'Uniqueness', value: dnaProfile.uniqueness_score, icon: 'auto_awesome' },
                                            { label: 'Confidence', value: dnaProfile.confidence_level, icon: 'verified' }
                                        ].map((stat, idx) => (
                                            <motion.div
                                                key={idx}
                                                whileHover={{ scale: 1.05, y: -5 }}
                                                className="text-center bg-white/50 dark:bg-gray-800/50 rounded-2xl p-4"
                                            >
                                                <span className="material-symbols-outlined text-primary text-2xl mb-2">{stat.icon}</span>
                                                <p className="text-3xl font-bold text-primary">
                                                    {typeof stat.value === 'number' ? stat.value : stat.value.toUpperCase()}
                                                </p>
                                                <p className="text-sm text-text-secondary dark:text-gray-400">{stat.label}</p>
                                            </motion.div>
                                        ))}
                                    </div>
                                </Card>
                            </motion.div>

                            {/* Navigation Tabs */}
                            <motion.div variants={itemVariants}>
                                <Card variant="glass" padding="sm" rounded="2xl">
                                    <div className="flex gap-2 overflow-x-auto">
                                        {[
                                            { id: 'overview', label: 'Overview', icon: 'overview' },
                                            { id: 'archetypes', label: 'Arquetipos', icon: 'diversity_3' },
                                            { id: 'colors', label: 'Colores', icon: 'palette' },
                                            { id: 'personality', label: 'Personalidad', icon: 'psychology' },
                                            { id: 'celebs', label: 'Celebs', icon: 'star' }
                                        ].map((tab) => (
                                            <motion.button
                                                key={tab.id}
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => setActiveSection(tab.id)}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap ${activeSection === tab.id
                                                        ? 'bg-primary text-white'
                                                        : 'hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-200'
                                                    }`}
                                            >
                                                <span className="material-symbols-outlined text-sm">{tab.icon}</span>
                                                <span className="text-sm font-medium">{tab.label}</span>
                                            </motion.button>
                                        ))}
                                    </div>
                                </Card>
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
                                        <Card variant="glass" padding="lg" rounded="3xl">
                                            <h3 className="font-bold text-lg mb-3 flex items-center gap-2 dark:text-gray-200">
                                                <span className="material-symbols-outlined text-primary">auto_stories</span>
                                                Tu Historia de Estilo
                                            </h3>
                                            <p className="text-text-secondary dark:text-gray-400 whitespace-pre-line leading-relaxed">
                                                {dnaProfile.summary}
                                            </p>
                                        </Card>

                                        {/* Occasion Breakdown */}
                                        <Card variant="glass" padding="lg" rounded="3xl">
                                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 dark:text-gray-200">
                                                <span className="material-symbols-outlined text-primary">event</span>
                                                Breakdown por Ocasiones
                                            </h3>
                                            <div className="grid md:grid-cols-2 gap-4">
                                                {dnaProfile.occasion_breakdown
                                                    .sort((a, b) => b.percentage - a.percentage)
                                                    .map((occasion, idx) => (
                                                        <motion.div
                                                            key={occasion.occasion}
                                                            initial={{ opacity: 0, scale: 0.9 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            transition={{ delay: idx * 0.1 }}
                                                            whileHover={{ scale: 1.02, y: -2 }}
                                                            className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900"
                                                        >
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="font-medium capitalize dark:text-gray-200">{occasion.occasion}</span>
                                                                <span className="text-primary font-bold text-xl">{Math.round(occasion.percentage)}%</span>
                                                            </div>
                                                            <p className="text-sm text-text-secondary dark:text-gray-400">{occasion.item_count} prendas</p>
                                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                                                                <motion.div
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${occasion.percentage}%` }}
                                                                    transition={{ duration: 1, delay: idx * 0.1 }}
                                                                    className="bg-gradient-to-r from-primary to-purple-600 rounded-full h-2"
                                                                />
                                                            </div>
                                                        </motion.div>
                                                    ))}
                                            </div>
                                        </Card>

                                        {/* Evolution Insights */}
                                        {dnaProfile.style_evolution_insights.length > 0 && (
                                            <Card variant="glass" padding="lg" rounded="3xl">
                                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 dark:text-gray-200">
                                                    <span className="material-symbols-outlined text-primary">trending_up</span>
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
                                                            className="border-l-4 border-primary pl-4 bg-gradient-to-r from-primary/5 to-transparent rounded-r-xl p-4"
                                                        >
                                                            <h4 className="font-bold mb-1 dark:text-gray-200">{insight.trend}</h4>
                                                            <p className="text-sm text-text-secondary dark:text-gray-400 mb-2">
                                                                <strong>Evidencia:</strong> {insight.evidence}
                                                            </p>
                                                            <p className="text-sm text-primary">
                                                                <strong>Recomendación:</strong> {insight.recommendation}
                                                            </p>
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            </Card>
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
                                        <Card variant="glass" padding="lg" rounded="3xl">
                                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 dark:text-gray-200">
                                                <span className="material-symbols-outlined text-primary">radar</span>
                                                Mapa de Arquetipos
                                            </h3>
                                            <div className="w-full h-80">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <RadarChart data={radarData}>
                                                        <PolarGrid stroke="#8884d8" />
                                                        <PolarAngleAxis dataKey="archetype" />
                                                        <PolarRadiusAxis angle={90} domain={[0, 100]} />
                                                        <Radar name="Style DNA" dataKey="value" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.6} />
                                                    </RadarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </Card>

                                        {/* Pie Chart */}
                                        <Card variant="glass" padding="lg" rounded="3xl">
                                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 dark:text-gray-200">
                                                <span className="material-symbols-outlined text-primary">pie_chart</span>
                                                Distribución de Arquetipos
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
                                                            outerRadius={80}
                                                            fill="#8884d8"
                                                            dataKey="value"
                                                        >
                                                            {pieData.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </Card>

                                        {/* Detailed List */}
                                        <Card variant="glass" padding="lg" rounded="3xl">
                                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 dark:text-gray-200">
                                                <span className="material-symbols-outlined text-primary">list</span>
                                                Detalles de Arquetipos
                                            </h3>
                                            <div className="space-y-4">
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
                                                            className="bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-4 border border-gray-200 dark:border-gray-700"
                                                        >
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="text-lg font-bold capitalize dark:text-gray-200">{archetype.archetype}</span>
                                                                <span className="text-2xl font-bold text-primary">{Math.round(archetype.percentage)}%</span>
                                                            </div>
                                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-3">
                                                                <motion.div
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${archetype.percentage}%` }}
                                                                    transition={{ duration: 1, delay: idx * 0.1 }}
                                                                    className="bg-gradient-to-r from-primary to-purple-600 rounded-full h-3"
                                                                />
                                                            </div>
                                                            <p className="text-sm text-text-secondary dark:text-gray-400">{archetype.description}</p>
                                                        </motion.div>
                                                    ))}
                                            </div>
                                        </Card>
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
                                        <Card variant="glass" padding="lg" rounded="3xl">
                                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 dark:text-gray-200">
                                                <span className="material-symbols-outlined text-primary">palette</span>
                                                Perfil de Color
                                            </h3>

                                            <div className="grid md:grid-cols-2 gap-6 mb-6">
                                                <motion.div whileHover={{ scale: 1.02 }} className="bg-gradient-to-br from-primary/10 to-purple-600/10 rounded-2xl p-4">
                                                    <p className="text-sm font-medium mb-2 dark:text-gray-200">
                                                        Temperature: <span className="capitalize text-primary text-lg font-bold">{dnaProfile.color_profile.color_temperature}</span>
                                                    </p>
                                                </motion.div>
                                                <motion.div whileHover={{ scale: 1.02 }} className="bg-gradient-to-br from-primary/10 to-purple-600/10 rounded-2xl p-4">
                                                    <p className="text-sm font-medium mb-2 dark:text-gray-200">
                                                        Boldness: <span className="capitalize text-primary text-lg font-bold">{dnaProfile.color_profile.color_boldness}</span>
                                                    </p>
                                                </motion.div>
                                            </div>

                                            <div className="mb-6">
                                                <p className="text-sm font-bold mb-3 dark:text-gray-200">Colores Dominantes:</p>
                                                <div className="flex flex-wrap gap-3">
                                                    {dnaProfile.color_profile.dominant_colors.map((color, idx) => (
                                                        <motion.div
                                                            key={idx}
                                                            initial={{ opacity: 0, scale: 0 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            transition={{ delay: idx * 0.1 }}
                                                            whileHover={{ scale: 1.1, rotate: 5 }}
                                                            className="flex flex-col items-center gap-2"
                                                        >
                                                            <div
                                                                className="w-16 h-16 rounded-2xl border-4 border-white shadow-lg"
                                                                style={{ backgroundColor: color.hex }}
                                                            />
                                                            <span className="text-xs font-medium capitalize dark:text-gray-200">{color.name}</span>
                                                            <span className="text-xs text-primary font-bold">{Math.round(color.percentage)}%</span>
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="grid md:grid-cols-2 gap-6">
                                                <div>
                                                    <p className="text-sm font-bold mb-3 dark:text-gray-200">Neutrals Favoritos:</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {dnaProfile.color_profile.favorite_neutrals.map((color, idx) => (
                                                            <motion.span
                                                                key={idx}
                                                                initial={{ opacity: 0, y: 10 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                transition={{ delay: idx * 0.1 }}
                                                                whileHover={{ scale: 1.1 }}
                                                                className="text-sm px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full capitalize dark:text-gray-200 font-medium"
                                                            >
                                                                {color}
                                                            </motion.span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold mb-3 dark:text-gray-200">Accent Colors:</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {dnaProfile.color_profile.accent_colors.map((color, idx) => (
                                                            <motion.span
                                                                key={idx}
                                                                initial={{ opacity: 0, y: 10 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                transition={{ delay: idx * 0.1 }}
                                                                whileHover={{ scale: 1.1 }}
                                                                className="text-sm px-3 py-1.5 bg-primary/10 text-primary rounded-full capitalize font-medium"
                                                            >
                                                                {color}
                                                            </motion.span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>

                                        {/* Silhouette Preferences */}
                                        <Card variant="glass" padding="lg" rounded="3xl">
                                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 dark:text-gray-200">
                                                <span className="material-symbols-outlined text-primary">straighten</span>
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
                                                            className="bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-4 border border-gray-200 dark:border-gray-700"
                                                        >
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="text-lg font-bold capitalize dark:text-gray-200">{silhouette.type}</span>
                                                                <span className="text-2xl font-bold text-primary">{Math.round(silhouette.percentage)}%</span>
                                                            </div>
                                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-3">
                                                                <motion.div
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${silhouette.percentage}%` }}
                                                                    transition={{ duration: 1, delay: idx * 0.1 }}
                                                                    className="bg-gradient-to-r from-primary to-purple-600 rounded-full h-3"
                                                                />
                                                            </div>
                                                            <p className="text-sm text-text-secondary dark:text-gray-400">{silhouette.description}</p>
                                                        </motion.div>
                                                    ))}
                                            </div>
                                        </Card>
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
                                        <Card variant="glass" padding="lg" rounded="3xl">
                                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 dark:text-gray-200">
                                                <span className="material-symbols-outlined text-primary">radar</span>
                                                Mapa de Personalidad
                                            </h3>
                                            <div className="w-full h-80">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <RadarChart data={personalityRadarData}>
                                                        <PolarGrid stroke="#8884d8" />
                                                        <PolarAngleAxis dataKey="trait" />
                                                        <PolarRadiusAxis angle={90} domain={[0, 100]} />
                                                        <Radar name="Personality" dataKey="value" stroke="#EC4899" fill="#EC4899" fillOpacity={0.6} />
                                                    </RadarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </Card>

                                        {/* Personality Traits */}
                                        <Card variant="glass" padding="lg" rounded="3xl">
                                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 dark:text-gray-200">
                                                <span className="material-symbols-outlined text-primary">psychology</span>
                                                Rasgos de Personalidad
                                            </h3>
                                            <div className="space-y-4">
                                                {dnaProfile.personality_traits.map((trait, idx) => (
                                                    <motion.div
                                                        key={idx}
                                                        initial={{ opacity: 0, y: 20 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: idx * 0.1 }}
                                                        whileHover={{ scale: 1.02 }}
                                                        className="bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-4 border border-gray-200 dark:border-gray-700"
                                                    >
                                                        <div className="flex items-center justify-between mb-3">
                                                            <span className="font-bold text-lg dark:text-gray-200">{trait.trait}</span>
                                                            <div className="flex gap-1">
                                                                {Array.from({ length: 10 }).map((_, i) => (
                                                                    <motion.div
                                                                        key={i}
                                                                        initial={{ scale: 0 }}
                                                                        animate={{ scale: 1 }}
                                                                        transition={{ delay: idx * 0.1 + i * 0.05 }}
                                                                        className={`w-3 h-3 rounded-full ${i < trait.score
                                                                                ? 'bg-primary'
                                                                                : 'bg-gray-200 dark:bg-gray-700'
                                                                            }`}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <p className="text-sm text-text-secondary dark:text-gray-400">{trait.reasoning}</p>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </Card>
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
                                        <Card variant="glass" padding="lg" rounded="3xl">
                                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 dark:text-gray-200">
                                                <span className="material-symbols-outlined text-primary">star</span>
                                                Celebrity Style Matches
                                            </h3>
                                            <div className="space-y-4">
                                                {dnaProfile.celebrity_matches.map((celeb, idx) => (
                                                    <motion.div
                                                        key={idx}
                                                        initial={{ opacity: 0, scale: 0.9 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        transition={{ delay: idx * 0.2 }}
                                                        whileHover={{ scale: 1.02, y: -5 }}
                                                        className="border border-gray-200 dark:border-gray-700 rounded-2xl p-6 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 relative overflow-hidden"
                                                    >
                                                        <motion.div
                                                            animate={{
                                                                rotate: [0, 360],
                                                            }}
                                                            transition={{
                                                                duration: 20,
                                                                repeat: Infinity,
                                                                ease: "linear"
                                                            }}
                                                            className="absolute top-4 right-4 text-6xl opacity-10"
                                                        >
                                                            ⭐
                                                        </motion.div>
                                                        <div className="flex items-start justify-between mb-3 relative z-10">
                                                            <div>
                                                                <h4 className="font-bold text-xl dark:text-gray-200">{celeb.name}</h4>
                                                                <p className="text-primary font-bold text-2xl">{celeb.match_percentage}% match</p>
                                                            </div>
                                                            <span className="text-5xl font-bold text-gray-200 dark:text-gray-700">#{idx + 1}</span>
                                                        </div>
                                                        <p className="text-sm text-text-secondary dark:text-gray-400 mb-3">{celeb.reasoning}</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {celeb.shared_characteristics.map((char, charIdx) => (
                                                                <motion.span
                                                                    key={charIdx}
                                                                    initial={{ opacity: 0, scale: 0 }}
                                                                    animate={{ opacity: 1, scale: 1 }}
                                                                    transition={{ delay: idx * 0.2 + charIdx * 0.1 }}
                                                                    whileHover={{ scale: 1.1 }}
                                                                    className="text-xs px-3 py-1.5 bg-primary/10 text-primary rounded-full font-medium"
                                                                >
                                                                    {char}
                                                                </motion.span>
                                                            ))}
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </Card>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </div>

                    <motion.div
                        initial={{ y: 100 }}
                        animate={{ y: 0 }}
                        className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white/90 to-transparent dark:from-background-dark/90"
                    >
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setCurrentStep('intro')}
                            className="w-full bg-white dark:bg-gray-800 border-2 border-primary text-primary font-bold py-4 rounded-2xl transition-all shadow-lg hover:shadow-xl"
                        >
                            🔄 Analizar de Nuevo
                        </motion.button>
                    </motion.div>
                </motion.div>
            </motion.div>
        );
    }

    return null;
};

export default StyleDNAProfileView;
