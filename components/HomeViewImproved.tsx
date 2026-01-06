/**
 * HomeViewImproved - Dashboard Simplificado con Eye3D de fondo
 *
 * Diseño minimalista con el ojo como signature visual.
 * Solo muestra las acciones principales de forma clara.
 *
 * @version 3.0
 */

import React, { useState, useMemo, useCallback, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { User } from '@supabase/supabase-js';
import type { ClothingItem, WeatherData, GeneratedLook } from '../types';
import type { UseSubscriptionReturn } from '../hooks/useSubscription';
import { getCurrentWeather, getUserCity } from '../services/weatherService';
import { getGeneratedLooks } from '../src/services/generatedLooksService';
import { useThemeContext } from '../contexts/ThemeContext';

// Lazy load Eye3D para performance
const Eye3D = lazy(() => import('./Eye3D'));

// Weather icon mapping to Material Symbols
const WEATHER_ICONS: Record<string, string> = {
  'Clear': 'sunny',
  'Clouds': 'cloud',
  'Rain': 'rainy',
  'Drizzle': 'grain',
  'Thunderstorm': 'thunderstorm',
  'Snow': 'weather_snowy',
  'Mist': 'foggy',
  'Fog': 'foggy',
  'Haze': 'foggy',
};

interface HomeViewImprovedProps {
  user: User | null;
  closet: ClothingItem[];
  onStartStudio: () => void;
  onAddItem: () => void;
  onStartStylist: () => void;
  onStartVirtualTryOn: () => void;
  onNavigateToCloset: () => void;
  onNavigateToCommunity: () => void;
  onStartSmartPacker: () => void;
  onStartChat: () => void;
  onStartWeatherOutfit: () => void;
  onStartLookbookCreator: () => void;
  onStartStyleChallenges: () => void;
  onStartRatingView: () => void;
  onStartFeedbackAnalysis: () => void;
  onStartGapAnalysis: () => void;
  onStartBrandRecognition: () => void;
  onStartDupeFinder: () => void;
  onStartCapsuleBuilder: () => void;
  onStartStyleDNA: () => void;
  onStartAIDesigner: () => void;
  onShowGenerationHistory: () => void;
  onStartStyleEvolution: () => void;
  onStartCalendarSync: () => void;
  onStartActivityFeed: () => void;
  onStartVirtualShopping: () => void;
  onStartMultiplayerChallenges: () => void;
  onStartBulkUpload: () => void;
  onNavigateToSavedLooks: () => void;
  onStartOutfitTesting?: () => void;
  hasProfessionalProfile?: boolean;
  onShowProfessionalWizard?: () => void;
  onShowAnalytics?: () => void;
  subscription?: UseSubscriptionReturn;
  onShowPricing?: () => void;
  onShowCredits?: () => void;
}

// Layout modes
type HomeLayoutMode = 'standard' | 'minimal';
const LAYOUT_STORAGE_KEY = 'ojodeloca-home-layout';

// Acciones para modo MINIMAL (solo 3 core)
const MINIMAL_ACTIONS = [
  { id: 'add', icon: 'add_photo_alternate', label: 'Agregar', description: 'Nueva prenda', handlerKey: 'onAddItem' },
  { id: 'studio', icon: 'auto_fix_high', label: 'Studio', description: 'Crear look', handlerKey: 'onStartStudio' },
  { id: 'closet', icon: 'checkroom', label: 'Armario', description: 'Ver prendas', handlerKey: 'onNavigateToCloset' },
] as const;

// Acciones para modo STANDARD (4 principales + extras)
const STANDARD_ACTIONS = [
  { id: 'studio', icon: 'auto_fix_high', label: 'Studio', description: 'Crear un look', handlerKey: 'onStartStudio' },
  { id: 'stylist', icon: 'auto_awesome', label: 'Estilista', description: 'IA sugiere outfit', handlerKey: 'onStartStylist' },
  { id: 'closet', icon: 'checkroom', label: 'Armario', description: 'Tus prendas', handlerKey: 'onNavigateToCloset' },
  { id: 'saved-looks', icon: 'photo_library', label: 'Armario de looks', description: 'Tus looks guardados', handlerKey: 'onNavigateToSavedLooks' },
  { id: 'chat', icon: 'forum', label: 'Chat', description: 'Hablar con IA', handlerKey: 'onStartChat' },
] as const;

// Herramientas secundarias (colapsables) - solo en modo standard
const MORE_TOOLS = [
  { id: 'add', icon: 'add_photo_alternate', label: 'Agregar prenda', handlerKey: 'onAddItem' },
  { id: 'bulk', icon: 'cloud_upload', label: 'Carga múltiple', handlerKey: 'onStartBulkUpload' },
  { id: 'weather', icon: 'partly_cloudy_day', label: 'Outfit del día', handlerKey: 'onStartWeatherOutfit' },
  { id: 'packer', icon: 'luggage', label: 'Maleta viaje', handlerKey: 'onStartSmartPacker' },
  { id: 'tryon', icon: 'view_in_ar', label: 'Probador virtual', handlerKey: 'onStartVirtualTryOn', isPro: true },
  { id: 'community', icon: 'groups', label: 'Comunidad', handlerKey: 'onNavigateToCommunity' },
  { id: 'dna', icon: 'fingerprint', label: 'Tu ADN de estilo', handlerKey: 'onStartStyleDNA' },
  { id: 'shopping', icon: 'storefront', label: 'Asistente compras', handlerKey: 'onStartVirtualShopping' },
] as const;

const HomeViewImproved: React.FC<HomeViewImprovedProps> = (props) => {
  const { user, closet, subscription } = props;
  const [showMoreTools, setShowMoreTools] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [latestLook, setLatestLook] = useState<GeneratedLook | null>(null);
  const { theme, toggleTheme } = useThemeContext();
  const isDark = theme === 'dark';

  // Layout mode preference (persisted in localStorage)
  const [layoutMode, setLayoutMode] = useState<HomeLayoutMode>(() => {
    const saved = localStorage.getItem(LAYOUT_STORAGE_KEY);
    return (saved === 'minimal' || saved === 'standard') ? saved : 'standard';
  });

  const toggleLayoutMode = useCallback(() => {
    const newMode = layoutMode === 'standard' ? 'minimal' : 'standard';
    setLayoutMode(newMode);
    localStorage.setItem(LAYOUT_STORAGE_KEY, newMode);
  }, [layoutMode]);

  // Get the appropriate actions based on layout mode
  const mainActions = layoutMode === 'minimal' ? MINIMAL_ACTIONS : STANDARD_ACTIONS;
  const isMinimalMode = layoutMode === 'minimal';

  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Usuario';

  // Fetch weather on mount
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const city = getUserCity();
        const data = await getCurrentWeather(city);
        setWeather(data);
      } catch (err) {
        // Silently fail - weather is optional
        console.log('Weather unavailable');
      }
    };
    fetchWeather();
  }, []);

  // Fetch latest look on mount
  useEffect(() => {
    const fetchLatestLook = async () => {
      if (!user) return;
      try {
        const looks = await getGeneratedLooks({ limit: 1 });
        if (looks.length > 0) {
          setLatestLook(looks[0]);
        }
      } catch (err) {
        // Silently fail - look is optional
        console.log('Latest look unavailable');
      }
    };
    fetchLatestLook();
  }, [user]);

  const closetStats = useMemo(() => ({
    tops: closet.filter(i => i.metadata.category === 'top').length,
    bottoms: closet.filter(i => i.metadata.category === 'bottom').length,
    shoes: closet.filter(i => i.metadata.category === 'shoes').length,
    total: closet.length,
  }), [closet]);

  // Handler map para lookup dinámico
  const getHandler = useCallback((key: string) => {
    return (props as any)[key] as (() => void) | undefined;
  }, [props]);


  return (
    <div className="fixed inset-0 z-40 overflow-hidden">
      {/* Background - Responde al tema */}
      <div className={`absolute inset-0 transition-colors duration-500 ${isDark ? 'bg-[#05060a]' : 'bg-gradient-to-br from-slate-50 via-purple-50/30 to-pink-50/20'}`}>
        {/* Gradients - Solo en modo oscuro */}
        {isDark && (
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              backgroundImage: [
                'radial-gradient(62% 48% at 50% 35%, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.00) 60%)',
                'radial-gradient(55% 45% at 20% 20%, rgba(168,85,247,0.12) 0%, rgba(168,85,247,0.00) 70%)',
                'radial-gradient(55% 45% at 80% 70%, rgba(59,130,246,0.10) 0%, rgba(59,130,246,0.00) 70%)',
                'linear-gradient(180deg, rgba(3,7,18,0.00) 0%, rgba(3,7,18,0.85) 100%)',
              ].join(','),
            }}
          />
        )}

        {/* Eye3D desenfocado - Visible en ambos modos con ajustes */}
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
          <div className={`w-[120%] h-[120%] -translate-y-[5%] ${
            isDark
              ? 'blur-sm opacity-50'
              : 'blur-md opacity-30'
          }`}>
            <Suspense fallback={null}>
              <Eye3D
                variant="landing"
                colorScheme={isDark ? "ocean" : "violet"}
                blinkInterval={6000}
                reducedMotion={false}
                quality="medium"
                interactive={false}
                className="w-full h-full"
              />
            </Suspense>
          </div>
        </div>

        {/* Vignette - Solo en modo oscuro */}
        {isDark && (
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(50% 50% at 50% 50%, transparent 0%, rgba(0,0,0,0.7) 100%)',
            }}
          />
        )}

        {/* Gradients suaves para modo claro */}
        {!isDark && (
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: [
                'radial-gradient(60% 50% at 50% 0%, rgba(168,85,247,0.08) 0%, transparent 70%)',
                'radial-gradient(40% 40% at 100% 100%, rgba(236,72,153,0.06) 0%, transparent 70%)',
              ].join(','),
            }}
          />
        )}
      </div>

      {/* Content */}
      <div className="absolute inset-0 z-10 flex flex-col px-4 pb-32 overflow-y-auto" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
        {/* Header */}
        <header className="pt-4 pb-6">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            {/* Top row: Weather + Theme toggle + Stats */}
            <div className="flex items-center justify-between">
              {/* Weather chip */}
              <div className="flex items-center gap-2">
                {weather ? (
                  <button
                    onClick={props.onStartWeatherOutfit}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md transition-colors ${
                      isDark
                        ? 'bg-white/10 hover:bg-white/15'
                        : 'bg-black/5 hover:bg-black/10'
                    }`}
                  >
                    <span className={`material-symbols-rounded text-lg ${isDark ? 'text-amber-300' : 'text-amber-500'}`}>
                      {WEATHER_ICONS[weather.condition] || 'partly_cloudy_day'}
                    </span>
                    <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{weather.temp}°</span>
                    <span className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>{weather.city}</span>
                  </button>
                ) : (
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                    <span className={`material-symbols-rounded text-lg animate-pulse ${isDark ? 'text-white/30' : 'text-gray-400'}`}>partly_cloudy_day</span>
                  </div>
                )}

                {/* Theme toggle */}
                <button
                  onClick={toggleTheme}
                  className={`flex items-center justify-center w-9 h-9 rounded-full backdrop-blur-md transition-all ${
                    isDark
                      ? 'bg-white/10 hover:bg-white/15'
                      : 'bg-black/5 hover:bg-black/10'
                  }`}
                  aria-label={isDark ? 'Cambiar a modo día' : 'Cambiar a modo noche'}
                >
                  <span className={`material-symbols-rounded text-lg transition-transform ${isDark ? 'text-amber-300' : 'text-purple-600'}`}>
                    {isDark ? 'light_mode' : 'dark_mode'}
                  </span>
                </button>

                {/* Layout mode toggle */}
                <button
                  onClick={toggleLayoutMode}
                  className={`flex items-center justify-center w-9 h-9 rounded-full backdrop-blur-md transition-all ${
                    isDark
                      ? 'bg-white/10 hover:bg-white/15'
                      : 'bg-black/5 hover:bg-black/10'
                  }`}
                  aria-label={isMinimalMode ? 'Ver más opciones' : 'Modo simplificado'}
                  title={isMinimalMode ? 'Ver más opciones' : 'Modo simplificado'}
                >
                  <span className={`material-symbols-rounded text-lg ${isDark ? 'text-white/70' : 'text-gray-600'}`}>
                    {isMinimalMode ? 'dashboard' : 'space_dashboard'}
                  </span>
                </button>
              </div>

              {/* Quick stats */}
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md ${
                  isDark ? 'bg-white/10' : 'bg-black/5'
                }`}>
                  <span className="material-symbols-rounded text-purple-500 text-lg">checkroom</span>
                  <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{closetStats.total}</span>
                </div>
                {subscription && (
                  <button
                    onClick={props.onShowCredits}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md transition-colors ${
                      isDark
                        ? 'bg-white/10 hover:bg-white/15'
                        : 'bg-black/5 hover:bg-black/10'
                    }`}
                  >
                    <span className="material-symbols-rounded text-amber-500 text-lg">toll</span>
                    <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {subscription.aiGenerationsLimit === -1 ? '∞' : subscription.aiGenerationsLimit - subscription.aiGenerationsUsed}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Greeting */}
            <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              ¿Qué te ponés hoy, <span className="text-purple-500">{displayName}</span>?
            </h1>
          </motion.div>
        </header>

        {/* Main Actions - Cards grandes */}
        <section className="mb-6">
          <div className={`grid gap-3 ${isMinimalMode ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {mainActions.map((action, idx) => {
              const handler = getHandler(action.handlerKey);
              const isLastOdd = !isMinimalMode && mainActions.length % 2 === 1 && idx === mainActions.length - 1;
              return (
                <motion.button
                  key={action.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={handler}
                  className={`group relative p-5 rounded-2xl backdrop-blur-xl border transition-all text-left overflow-hidden ${
                    isDark
                      ? 'bg-white/10 border-white/10 hover:bg-white/15 hover:border-white/20'
                      : 'bg-white/80 border-gray-200/50 hover:bg-white hover:border-purple-200 shadow-sm'
                  } ${isLastOdd ? 'col-span-2' : ''}`}
                >
                  {/* Glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="relative">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${
                      isDark
                        ? 'bg-gradient-to-br from-purple-500/30 to-pink-500/30'
                        : 'bg-gradient-to-br from-purple-100 to-pink-100'
                    }`}>
                      <span className={`material-symbols-rounded text-2xl ${isDark ? 'text-white' : 'text-purple-600'}`}>{action.icon}</span>
                    </div>
                    <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>{action.label}</h3>
                    <p className={`text-sm mt-0.5 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>{action.description}</p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </section>

        {/* Latest Look Card */}
        {latestLook && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-6"
          >
            <button
              onClick={props.onNavigateToSavedLooks}
              className={`w-full relative p-4 rounded-2xl backdrop-blur-xl border transition-all overflow-hidden text-left ${
                isDark
                  ? 'bg-white/10 border-white/10 hover:bg-white/15 hover:border-white/20'
                  : 'bg-white/80 border-gray-200/50 hover:bg-white hover:border-purple-200 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Look thumbnail */}
                <div className="w-16 h-20 rounded-xl overflow-hidden shrink-0 shadow-lg">
                  <img
                    src={latestLook.image_url}
                    alt="Último look guardado"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className={`text-xs mb-1 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>Último look en tu armario</p>
                  <h3 className={`font-semibold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {latestLook.title || 'Look generado'}
                  </h3>
                  <p className={`text-xs mt-1 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                    {new Date(latestLook.created_at).toLocaleDateString('es-AR', {
                      day: 'numeric',
                      month: 'short'
                    })}
                  </p>
                </div>

                {/* Arrow */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isDark ? 'bg-white/10' : 'bg-gray-100'
                }`}>
                  <span className={`material-symbols-rounded ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                    arrow_forward
                  </span>
                </div>
              </div>

              {/* Favorite badge */}
              {latestLook.is_favorite && (
                <div className="absolute top-3 right-3">
                  <span className="text-sm">❤️</span>
                </div>
              )}
            </button>
          </motion.section>
        )}

        {/* Empty Closet CTA */}
        {closetStats.total === 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`mb-6 p-5 rounded-2xl backdrop-blur-xl border ${
              isDark
                ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/20'
                : 'bg-gradient-to-br from-purple-100 to-pink-100 border-purple-200/50'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                isDark ? 'bg-purple-500/30' : 'bg-purple-200'
              }`}>
                <span className={`material-symbols-rounded text-2xl ${isDark ? 'text-purple-300' : 'text-purple-600'}`}>rocket_launch</span>
              </div>
              <div className="flex-1">
                <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Empezá tu armario digital</h3>
                <p className={`text-sm mt-1 ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                  Agregá 8-12 prendas para que la IA pueda crear looks increíbles.
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={props.onAddItem}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                      isDark
                        ? 'bg-white text-gray-900 hover:bg-white/90'
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                  >
                    Agregar prenda
                  </button>
                  <button
                    onClick={props.onStartBulkUpload}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                      isDark
                        ? 'bg-white/10 text-white hover:bg-white/20'
                        : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                    }`}
                  >
                    Carga múltiple
                  </button>
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {/* Quick Stats Row */}
        {closetStats.total > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-6"
          >
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {[
                { icon: 'stylus', label: 'Tops', value: closetStats.tops, color: isDark ? 'text-blue-400' : 'text-blue-600' },
                { icon: 'straighten', label: 'Bottoms', value: closetStats.bottoms, color: isDark ? 'text-green-400' : 'text-green-600' },
                { icon: 'steps', label: 'Zapatos', value: closetStats.shoes, color: isDark ? 'text-amber-400' : 'text-amber-600' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className={`flex-1 min-w-[100px] p-3 rounded-xl backdrop-blur-md border ${
                    isDark ? 'bg-white/5 border-white/10' : 'bg-white/80 border-gray-200/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`material-symbols-rounded ${stat.color} text-lg`}>{stat.icon}</span>
                    <span className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>{stat.label}</span>
                  </div>
                  <p className={`font-bold text-xl mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{stat.value}</p>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* More Tools - Colapsable (hidden in minimal mode) */}
        {!isMinimalMode && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <button
            onClick={() => setShowMoreTools(!showMoreTools)}
            className={`w-full flex items-center justify-between p-4 rounded-2xl backdrop-blur-md border transition-colors mb-3 ${
              isDark
                ? 'bg-white/5 border-white/10 hover:bg-white/10'
                : 'bg-white/80 border-gray-200/50 hover:bg-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className={`material-symbols-rounded ${isDark ? 'text-white/60' : 'text-gray-500'}`}>apps</span>
              <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Más herramientas</span>
            </div>
            <motion.span
              animate={{ rotate: showMoreTools ? 180 : 0 }}
              className={`material-symbols-rounded ${isDark ? 'text-white/60' : 'text-gray-500'}`}
            >
              expand_more
            </motion.span>
          </button>

          <AnimatePresence>
            {showMoreTools && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pb-4">
                  {MORE_TOOLS.map((tool, idx) => {
                    const handler = getHandler(tool.handlerKey);
                    return (
                      <motion.button
                        key={tool.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        onClick={handler}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl backdrop-blur-md border transition-colors relative ${
                          isDark
                            ? 'bg-white/5 border-white/10 hover:bg-white/10'
                            : 'bg-white/80 border-gray-200/50 hover:bg-white'
                        }`}
                      >
                        {tool.isPro && (
                          <span className="absolute top-2 right-2 text-[9px] font-bold text-amber-500 bg-amber-500/20 px-1.5 py-0.5 rounded">
                            PRO
                          </span>
                        )}
                        <span className={`material-symbols-rounded text-2xl ${isDark ? 'text-white/70' : 'text-gray-600'}`}>{tool.icon}</span>
                        <span className={`text-xs font-medium text-center ${isDark ? 'text-white/80' : 'text-gray-700'}`}>{tool.label}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>
        )}

        {/* Pro Upgrade Banner */}
        {subscription && subscription.tier === 'free' && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mt-auto pt-6"
          >
            <button
              onClick={props.onShowPricing}
              className={`w-full p-4 rounded-2xl backdrop-blur-xl border flex items-center justify-between transition-all ${
                isDark
                  ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/30 hover:from-amber-500/30 hover:to-orange-500/30'
                  : 'bg-gradient-to-r from-amber-100 to-orange-100 border-amber-200 hover:from-amber-200 hover:to-orange-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`material-symbols-rounded text-2xl ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>diamond</span>
                <div className="text-left">
                  <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Upgrade a Pro</p>
                  <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-600'}`}>Probador virtual + más créditos</p>
                </div>
              </div>
              <span className={`material-symbols-rounded ${isDark ? 'text-white/50' : 'text-gray-500'}`}>chevron_right</span>
            </button>
          </motion.section>
        )}
      </div>
    </div>
  );
};

export default HomeViewImproved;
