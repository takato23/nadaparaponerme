import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useThemeContext } from '../contexts/ThemeContext';
import { Card } from './ui/Card';
import { clearToneCache } from '../services/aiToneHelper';
import { useAuth } from '../src/hooks/useAuth';
import type { ClothingItem } from '../types';

export type AITone = 'concise' | 'balanced' | 'detailed';

interface ProfileViewProps {
    user: any;
    closet: ClothingItem[];
    stats: {
        totalItems: number;
        totalOutfits: number;
        favoriteBrand: string;
        mostWornColor: string;
    };
    onLogout: () => void;
    onOpenAnalytics?: () => void;
    onOpenColorPalette?: () => void;
    onOpenTopVersatile?: () => void;
    onOpenWeeklyPlanner?: () => void;
    onOpenTestingPlayground?: () => void;
    onOpenAestheticPlayground?: () => void;
}

const ProfileView = ({
    user,
    closet,
    stats,
    onLogout,
    onOpenAnalytics,
    onOpenColorPalette,
    onOpenTopVersatile,
    onOpenWeeklyPlanner,
    onOpenTestingPlayground,
    onOpenAestheticPlayground
}: ProfileViewProps) => {
    const { theme, toggleTheme } = useThemeContext();

    // Calculate real color stats from closet
    const colorStats = useMemo(() => {
        const colors: Record<string, number> = {};
        closet.forEach(item => {
            const color = item.metadata.color_primary;
            colors[color] = (colors[color] || 0) + 1;
        });

        const sorted = Object.entries(colors)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 4);

        const max = sorted[0]?.[1] || 1;

        // Map common color names to hex codes for visualization
        const colorMap: Record<string, string> = {
            'Negro': '#000000',
            'Blanco': '#ffffff',
            'Azul': '#3b82f6',
            'Rojo': '#ef4444',
            'Verde': '#10b981',
            'Amarillo': '#eab308',
            'Rosa': '#ec4899',
            'Gris': '#6b7280',
            'Beige': '#d6d3d1',
            'Marrón': '#78350f',
            'Naranja': '#f97316',
            'Violeta': '#8b5cf6'
        };

        return sorted.map(([label, count]) => ({
            label,
            count,
            height: `${(count / max) * 100}%`,
            color: colorMap[label] || '#cbd5e1' // Default to slate-300
        }));
    }, [closet]);

    // AI Tone preference
    const [aiTone, setAITone] = useState<AITone>(() => {
        const stored = localStorage.getItem('ojodeloca-ai-tone');
        return (stored as AITone) || 'balanced';
    });

    useEffect(() => {
        localStorage.setItem('ojodeloca-ai-tone', aiTone);
        clearToneCache();
    }, [aiTone]);

    const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Usuario';

    return (
        <div className="w-full h-full overflow-y-auto p-6 animate-fade-in">
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Header Profile */}
                <div className="flex flex-col items-center text-center relative">
                    <div className="absolute top-0 right-0">
                        <button
                            onClick={toggleTheme}
                            className="p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-sm hover:bg-white/20 transition-colors"
                        >
                            <span className="material-symbols-outlined dark:text-white">
                                {theme === 'dark' ? 'light_mode' : 'dark_mode'}
                            </span>
                        </button>
                    </div>

                    <div className="w-24 h-24 mb-4 rounded-full bg-gradient-to-br from-primary to-secondary p-1 shadow-lg">
                        <div className="w-full h-full rounded-full bg-white dark:bg-gray-800 overflow-hidden">
                            <img
                                src={user?.user_metadata?.avatar_url || "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=800"}
                                alt="User avatar"
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{displayName}</h2>
                    <p className="text-gray-500 dark:text-gray-400">@{displayName.toLowerCase().replace(/\s+/g, '_')}</p>

                    <button
                        onClick={onLogout}
                        className="mt-4 px-6 py-2 rounded-full bg-red-50 text-red-600 text-sm font-bold hover:bg-red-100 transition-colors"
                    >
                        Cerrar Sesión
                    </button>
                </div>

                {/* Analytics Section (Prototype Integration) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Most Worn Colors Chart */}
                    <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl p-6 rounded-3xl shadow-soft-lg border border-white/20 dark:border-gray-700">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">palette</span>
                            Colores Más Usados
                        </h3>

                        {colorStats.length > 0 ? (
                            <div className="flex items-end justify-between h-40 gap-4 px-2">
                                {colorStats.map((bar, i) => (
                                    <div key={i} className="flex flex-col items-center gap-2 w-full">
                                        <motion.div
                                            initial={{ height: 0 }}
                                            animate={{ height: bar.height }}
                                            transition={{ delay: i * 0.1, type: 'spring', stiffness: 100 }}
                                            className="w-full rounded-t-xl relative overflow-hidden group shadow-sm"
                                            style={{
                                                backgroundColor: bar.color,
                                                border: bar.color === '#ffffff' ? '1px solid #e5e7eb' : 'none'
                                            }}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>
                                        </motion.div>
                                        <span className="text-xs font-medium text-gray-500 truncate w-full text-center">{bar.label}</span>
                                        <span className="text-[10px] text-gray-400">{bar.count}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-40 flex items-center justify-center text-gray-400 text-sm">
                                No hay datos suficientes
                            </div>
                        )}
                    </div>

                    {/* Cost Per Wear (Mock for now, but visually impressive) */}
                    <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl p-6 rounded-3xl shadow-soft-lg border border-white/20 dark:border-gray-700 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white">Costo por Uso</h3>
                                <p className="text-sm text-gray-500">Promedio del armario</p>
                            </div>
                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">-12%</span>
                        </div>

                        <div className="flex items-center justify-center py-4">
                            <div className="relative w-32 h-32">
                                <svg className="w-full h-full -rotate-90">
                                    <circle cx="64" cy="64" r="56" stroke="#e5e7eb" strokeWidth="10" fill="transparent" className="dark:stroke-gray-700" />
                                    <motion.circle
                                        cx="64" cy="64" r="56"
                                        stroke="#10b981" strokeWidth="10" fill="transparent"
                                        strokeDasharray="351"
                                        strokeDashoffset="351"
                                        animate={{ strokeDashoffset: 100 }}
                                        transition={{ duration: 1.5, ease: "easeOut" }}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-2xl font-bold text-gray-800 dark:text-white">$4.20</span>
                                    <span className="text-[10px] text-gray-500">por uso</span>
                                </div>
                            </div>
                        </div>

                        <div className="text-center">
                            <p className="text-xs text-gray-400">Basado en precio estimado y frecuencia de uso</p>
                        </div>
                    </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white/40 dark:bg-gray-800/40 p-4 rounded-2xl border border-white/10 text-center">
                        <p className="text-3xl font-bold text-primary">{stats.totalItems}</p>
                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Prendas</p>
                    </div>
                    <div className="bg-white/40 dark:bg-gray-800/40 p-4 rounded-2xl border border-white/10 text-center">
                        <p className="text-3xl font-bold text-secondary">{stats.totalOutfits}</p>
                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Outfits</p>
                    </div>
                    <div className="bg-white/40 dark:bg-gray-800/40 p-4 rounded-2xl border border-white/10 text-center">
                        <p className="text-xl font-bold text-gray-800 dark:text-white truncate">{stats.favoriteBrand || '-'}</p>
                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Marca Fav</p>
                    </div>
                    <div className="bg-white/40 dark:bg-gray-800/40 p-4 rounded-2xl border border-white/10 text-center">
                        <p className="text-xl font-bold text-gray-800 dark:text-white truncate">{stats.mostWornColor || '-'}</p>
                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Color Top</p>
                    </div>
                </div>

                {/* Menu Options */}
                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-2">Configuración y Herramientas</h3>

                    <Card variant="glass" padding="md" rounded="xl" onClick={onOpenColorPalette} className="w-full flex items-center gap-4 hover:bg-white/50 transition-colors cursor-pointer">
                        <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                            <span className="material-symbols-outlined">palette</span>
                        </div>
                        <div className="text-left">
                            <p className="font-bold text-gray-800 dark:text-white">Paleta de Colores</p>
                            <p className="text-xs text-gray-500">Gestiona tus colores preferidos</p>
                        </div>
                        <span className="material-symbols-outlined ml-auto text-gray-400">chevron_right</span>
                    </Card>

                    <Card variant="glass" padding="md" rounded="xl" onClick={onOpenTopVersatile} className="w-full flex items-center gap-4 hover:bg-white/50 transition-colors cursor-pointer">
                        <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                            <span className="material-symbols-outlined">star</span>
                        </div>
                        <div className="text-left">
                            <p className="font-bold text-gray-800 dark:text-white">Top Versátiles</p>
                            <p className="text-xs text-gray-500">Tus prendas más combinables</p>
                        </div>
                        <span className="material-symbols-outlined ml-auto text-gray-400">chevron_right</span>
                    </Card>

                    {onOpenAestheticPlayground && (
                        <Card variant="glass" padding="md" rounded="xl" onClick={onOpenAestheticPlayground} className="w-full flex items-center gap-4 hover:bg-white/50 transition-colors cursor-pointer">
                            <div className="p-2 bg-gradient-to-br from-primary to-secondary text-white rounded-lg">
                                <span className="material-symbols-outlined">palette</span>
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-gray-800 dark:text-white">Aesthetic Playground</p>
                                <p className="text-xs text-gray-500">Prototipos y diseños experimentales</p>
                            </div>
                            <span className="material-symbols-outlined ml-auto text-gray-400">chevron_right</span>
                        </Card>
                    )}

                    {/* AI Tone Settings */}
                    <div className="bg-white/40 dark:bg-gray-800/40 p-4 rounded-xl border border-white/10">
                        <p className="text-sm font-bold text-gray-800 dark:text-white mb-3 text-left">Tono de la IA</p>
                        <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-lg">
                            {(['concise', 'balanced', 'detailed'] as AITone[]).map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setAITone(t)}
                                    className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${aiTone === t
                                        ? 'bg-white dark:bg-gray-700 shadow-sm text-primary'
                                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                        }`}
                                >
                                    {t === 'concise' ? 'Conciso' : t === 'balanced' ? 'Balance' : 'Detalle'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileView;
