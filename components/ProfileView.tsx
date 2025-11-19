
import React, { useState, useEffect } from 'react';
import { useThemeContext } from '../contexts/ThemeContext';
import { Card } from './ui/Card';
import { clearToneCache } from '../services/aiToneHelper';

export type AITone = 'concise' | 'balanced' | 'detailed';

interface ProfileViewProps {
  onLogout: () => void;
  onOpenAnalytics: () => void;
  onOpenColorPalette: () => void;
  onOpenTopVersatile: () => void;
  onOpenWeeklyPlanner: () => void;
  onOpenTestingPlayground?: () => void;
}

const ProfileView = ({ onLogout, onOpenAnalytics, onOpenColorPalette, onOpenTopVersatile, onOpenWeeklyPlanner, onOpenTestingPlayground }: ProfileViewProps) => {
  const { theme, toggleTheme } = useThemeContext();

  // AI Tone preference
  const [aiTone, setAITone] = useState<AITone>(() => {
    const stored = localStorage.getItem('ojodeloca-ai-tone');
    return (stored as AITone) || 'balanced';
  });

  useEffect(() => {
    localStorage.setItem('ojodeloca-ai-tone', aiTone);
    clearToneCache(); // Limpiar caché cuando cambia la preferencia
  }, [aiTone]);

  const toneOptions: { value: AITone; label: string; icon: string; description: string }[] = [
    { value: 'concise', label: 'Conciso', icon: 'flash_on', description: 'Directo y breve' },
    { value: 'balanced', label: 'Balanceado', icon: 'balance', description: 'Término medio' },
    { value: 'detailed', label: 'Detallado', icon: 'description', description: 'Explicaciones completas' }
  ];

  return (
    <div className="w-full h-full flex flex-col items-center justify-center text-center p-8 animate-fade-in">
        <div className="absolute top-6 right-6">
            <Card variant="glass" padding="none" rounded="full" onClick={toggleTheme} className="w-12 h-12 flex items-center justify-center transition-transform active:scale-95 cursor-pointer">
                <span className="material-symbols-outlined dark:text-gray-200">
                    {theme === 'dark' ? 'light_mode' : 'dark_mode'}
                </span>
            </Card>
        </div>
        <div className="w-24 h-24 mb-4 rounded-full bg-gray-200 flex items-center justify-center">
             <img 
                src="https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=800"
                alt="User avatar"
                className="w-full h-full object-cover rounded-full"
            />
        </div>
        <h2 className="text-2xl font-bold text-text-primary dark:text-gray-200">Sophia</h2>
        <p className="text-text-secondary dark:text-gray-400">@sophia_trends</p>
        <div className="mt-8 space-y-4 w-full max-w-md">
            <Card
                variant="glass"
                padding="md"
                rounded="xl"
                onClick={onOpenAnalytics}
                className="w-full text-left dark:text-gray-200 flex items-center gap-3 transition-transform active:scale-95 cursor-pointer"
            >
                <span className="material-symbols-outlined text-primary">insights</span>
                <span>Análisis de Armario</span>
            </Card>
            <Card
                variant="glass"
                padding="md"
                rounded="xl"
                onClick={onOpenColorPalette}
                className="w-full text-left dark:text-gray-200 flex items-center gap-3 transition-transform active:scale-95 cursor-pointer"
            >
                <span className="material-symbols-outlined text-primary">palette</span>
                <span>Paleta de Colores</span>
            </Card>
            <Card
                variant="glass"
                padding="md"
                rounded="xl"
                onClick={onOpenTopVersatile}
                className="w-full text-left dark:text-gray-200 flex items-center gap-3 transition-transform active:scale-95 cursor-pointer"
            >
                <span className="material-symbols-outlined text-primary">star</span>
                <span>Top 10 Versátiles</span>
            </Card>
            <Card
                variant="glass"
                padding="md"
                rounded="xl"
                onClick={onOpenWeeklyPlanner}
                className="w-full text-left dark:text-gray-200 flex items-center gap-3 transition-transform active:scale-95 cursor-pointer"
            >
                <span className="material-symbols-outlined text-primary">calendar_month</span>
                <span>Planificador Semanal</span>
            </Card>

            {/* AI Tone Preference */}
            <div className="w-full">
                <h3 className="text-sm font-medium text-text-secondary dark:text-gray-400 mb-2 text-left">Preferencias de IA</h3>
                <Card variant="glass" padding="md" rounded="xl" className="w-full">
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2 text-left">
                            <span className="material-symbols-outlined text-primary text-lg">smart_toy</span>
                            <span className="text-sm font-medium dark:text-gray-200">Tono de respuesta</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {toneOptions.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => setAITone(option.value)}
                                    className={`
                                        flex flex-col items-center justify-center p-3 rounded-lg
                                        transition-all duration-200
                                        ${aiTone === option.value
                                            ? 'bg-primary/20 border-2 border-primary dark:bg-primary/30'
                                            : 'bg-white/50 dark:bg-gray-800/50 border-2 border-transparent hover:border-primary/30'
                                        }
                                    `}
                                >
                                    <span className={`material-symbols-outlined text-2xl mb-1 ${aiTone === option.value ? 'text-primary' : 'text-gray-400'}`}>
                                        {option.icon}
                                    </span>
                                    <span className={`text-xs font-medium ${aiTone === option.value ? 'text-primary dark:text-primary' : 'text-gray-600 dark:text-gray-400'}`}>
                                        {option.label}
                                    </span>
                                    <span className={`text-[10px] ${aiTone === option.value ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400'}`}>
                                        {option.description}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </Card>
            </div>

            {/* Dev Tool - Testing Playground */}
            {onOpenTestingPlayground && (
                <Card
                    variant="glass"
                    padding="md"
                    rounded="xl"
                    onClick={onOpenTestingPlayground}
                    className="w-full text-left dark:text-gray-200 flex items-center gap-3 transition-transform active:scale-95 cursor-pointer border-2 border-purple-500/30"
                >
                    <span className="material-symbols-outlined text-purple-500">science</span>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <span>Testing Playground</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">DEV</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">Compare AI outfit generation versions</p>
                    </div>
                </Card>
            )}

            <Card variant="glass" padding="md" rounded="xl" className="w-full text-left dark:text-gray-200 cursor-pointer">Configuración de la cuenta</Card>
            <Card variant="glass" padding="md" rounded="xl" className="w-full text-left dark:text-gray-200 cursor-pointer">Privacidad</Card>
            <Card variant="glass" padding="md" rounded="xl" onClick={onLogout} className="w-full text-left text-red-500 cursor-pointer">Cerrar sesión</Card>
        </div>
    </div>
  );
};

export default ProfileView;
