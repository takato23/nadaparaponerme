/**
 * HomeViewImproved - Dashboard Mejorado
 *
 * Mejoras implementadas:
 * 1. Configuración de features externalizada (featuresConfig.ts)
 * 2. Hero3D con soporte móvil y táctil
 * 3. WeatherCard con API real de clima
 * 4. Widget de estadísticas rápidas
 * 5. Accesibilidad mejorada (ARIA, keyboard nav)
 * 6. Mejor rendimiento y lazy loading
 * 7. Código más limpio y mantenible
 */

import React, { useState, useMemo, useEffect, useCallback, lazy, Suspense } from 'react';
import type { User } from '@supabase/supabase-js';
import type { ClothingItem } from '../types';
import { Hero3DImproved } from './home/Hero3DImproved';
import { HomeQuickActionsImproved } from './home/HomeQuickActionsImproved';
import { HomeFeatureCard } from './home/HomeFeatureCard';
import { QuickStatsWidget } from './home/QuickStatsWidget';
import { WeatherCardImproved } from './home/WeatherCardImproved';
import { QuotaIndicator } from './QuotaIndicator';
import type { UseSubscriptionReturn } from '../hooks/useSubscription';
import {
  ALL_FEATURES,
  QUICK_ACTIONS,
  FEATURE_TABS,
  FEATURED_FEATURES,
  CATEGORY_COLORS,
  searchFeatures,
  filterByCategory,
  type FeatureTabId,
  type FeatureConfig,
  type FeatureCategory,
} from './home/featuresConfig';
import { Feature } from './home/types';

// Tipos para los handlers
type HandlerKey =
  | 'onStartStylist'
  | 'onStartVirtualTryOn'
  | 'onNavigateToCloset'
  | 'onNavigateToCommunity'
  | 'onStartSmartPacker'
  | 'onStartChat'
  | 'onStartWeatherOutfit'
  | 'onStartLookbookCreator'
  | 'onStartStyleChallenges'
  | 'onStartRatingView'
  | 'onStartFeedbackAnalysis'
  | 'onStartGapAnalysis'
  | 'onStartBrandRecognition'
  | 'onStartDupeFinder'
  | 'onStartCapsuleBuilder'
  | 'onStartStyleDNA'
  | 'onStartAIDesigner'
  | 'onShowGenerationHistory'
  | 'onStartStyleEvolution'
  | 'onStartCalendarSync'
  | 'onStartActivityFeed'
  | 'onStartVirtualShopping'
  | 'onStartMultiplayerChallenges'
  | 'onStartBulkUpload'
  | 'onShowProfessionalWizard';

interface HomeViewImprovedProps {
  user: User | null;
  closet: ClothingItem[];
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
  hasProfessionalProfile?: boolean;
  onShowProfessionalWizard?: () => void;
  onShowAnalytics?: () => void;
  // Subscription props
  subscription?: UseSubscriptionReturn;
  onShowPricing?: () => void;
}

// Constantes
const RECENT_FEATURES_KEY = 'ojodeloca-recent-features';
const MAX_RECENT_FEATURES = 5;

const HomeViewImproved: React.FC<HomeViewImprovedProps> = (props) => {
  const {
    user,
    closet,
    hasProfessionalProfile,
    onShowAnalytics,
    ...handlers
  } = props;

  // Estado
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FeatureTabId>('essential');
  const [recentFeatures, setRecentFeatures] = useState<string[]>([]);
  const [isScrolled, setIsScrolled] = useState(false);

  // Nombre para mostrar
  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Usuario';

  // Cargar features recientes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(RECENT_FEATURES_KEY);
      if (saved) setRecentFeatures(JSON.parse(saved));
    } catch {
      // Ignorar errores de parsing
    }
  }, []);

  // Tracking de uso de features
  const trackFeatureUse = useCallback((featureId: string) => {
    setRecentFeatures(prev => {
      const updated = [featureId, ...prev.filter(id => id !== featureId)].slice(0, MAX_RECENT_FEATURES);
      localStorage.setItem(RECENT_FEATURES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Mapa de handlers para lookup dinámico
  const handlerMap = useMemo((): Record<HandlerKey, (() => void) | undefined> => ({
    onStartStylist: handlers.onStartStylist,
    onStartVirtualTryOn: handlers.onStartVirtualTryOn,
    onNavigateToCloset: handlers.onNavigateToCloset,
    onNavigateToCommunity: handlers.onNavigateToCommunity,
    onStartSmartPacker: handlers.onStartSmartPacker,
    onStartChat: handlers.onStartChat,
    onStartWeatherOutfit: handlers.onStartWeatherOutfit,
    onStartLookbookCreator: handlers.onStartLookbookCreator,
    onStartStyleChallenges: handlers.onStartStyleChallenges,
    onStartRatingView: handlers.onStartRatingView,
    onStartFeedbackAnalysis: handlers.onStartFeedbackAnalysis,
    onStartGapAnalysis: handlers.onStartGapAnalysis,
    onStartBrandRecognition: handlers.onStartBrandRecognition,
    onStartDupeFinder: handlers.onStartDupeFinder,
    onStartCapsuleBuilder: handlers.onStartCapsuleBuilder,
    onStartStyleDNA: handlers.onStartStyleDNA,
    onStartAIDesigner: handlers.onStartAIDesigner,
    onShowGenerationHistory: handlers.onShowGenerationHistory,
    onStartStyleEvolution: handlers.onStartStyleEvolution,
    onStartCalendarSync: handlers.onStartCalendarSync,
    onStartActivityFeed: handlers.onStartActivityFeed,
    onStartVirtualShopping: handlers.onStartVirtualShopping,
    onStartMultiplayerChallenges: handlers.onStartMultiplayerChallenges,
    onStartBulkUpload: handlers.onStartBulkUpload,
    onShowProfessionalWizard: handlers.onShowProfessionalWizard,
  }), [handlers]);

  // Convertir FeatureConfig a Feature con handlers
  const buildFeature = useCallback((config: FeatureConfig): Feature | null => {
    const handler = handlerMap[config.handlerKey as HandlerKey];

    // Si es condicional y no tiene handler, omitir
    if (config.conditional && !handler) return null;

    // Procesar descripción dinámica
    let description = config.description;
    if (description.includes('{closetCount}')) {
      description = description.replace('{closetCount}', String(closet.length));
    }

    // Ajustar para perfil profesional
    let title = config.title;
    let icon = config.icon;
    let badge = config.badge;

    if (config.id === 'professional-profile' && hasProfessionalProfile) {
      title = 'Perfil Profesional ✅';
      icon = 'verified';
      badge = undefined;
      description = 'Outfits personalizados con morfología y colorimetría';
    }

    return {
      id: config.id,
      icon,
      title,
      description,
      category: config.category,
      keywords: config.keywords,
      tooltip: config.tooltip,
      badge,
      featured: config.featured,
      popularity: config.popularity,
      onClick: () => {
        trackFeatureUse(config.id);
        handler?.();
      },
    };
  }, [handlerMap, closet.length, hasProfessionalProfile, trackFeatureUse]);

  // Features procesadas
  const features = useMemo(() => {
    return ALL_FEATURES
      .map(buildFeature)
      .filter((f): f is Feature => f !== null);
  }, [buildFeature]);

  // Features filtradas
  const filteredFeatures = useMemo(() => {
    let result = features;

    // Aplicar búsqueda
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(f =>
        f.title.toLowerCase().includes(query) ||
        f.description.toLowerCase().includes(query) ||
        f.keywords.some(kw => kw.includes(query))
      );
    }

    // Aplicar filtro de categoría
    if (activeTab !== 'all') {
      result = result.filter(f => f.category === activeTab);
    }

    return result;
  }, [features, searchQuery, activeTab]);

  // Features destacadas (para mostrar en grid grande)
  const featuredFeatures = useMemo(() => {
    return features.filter(f => f.featured);
  }, [features]);

  // Features usadas recientemente
  const recentUsedFeatures = useMemo(() => {
    if (recentFeatures.length === 0) return [];
    return recentFeatures
      .map(id => features.find(f => f.id === id))
      .filter((f): f is Feature => f !== undefined)
      .slice(0, 4);
  }, [features, recentFeatures]);

  // Quick actions con handlers
  const quickActionsWithHandlers = useMemo(() => {
    return QUICK_ACTIONS.map(action => ({
      ...action,
      onClick: () => {
        trackFeatureUse(action.id);
        handlerMap[action.handlerKey as HandlerKey]?.();
      },
    }));
  }, [handlerMap, trackFeatureUse]);

  // User stats
  const userStats = useMemo(() => {
    const totalOutfits = parseInt(localStorage.getItem('ojodeloca-total-outfits') || '0', 10);
    const firstUse = localStorage.getItem('ojodeloca-first-use');

    if (!firstUse) {
      localStorage.setItem('ojodeloca-first-use', new Date().toISOString());
    }

    const daysActive = firstUse
      ? Math.ceil((Date.now() - new Date(firstUse).getTime()) / (1000 * 60 * 60 * 24))
      : 1;

    return { totalOutfits, daysActive };
  }, []);

  // Scroll detection
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="w-full min-h-screen flex flex-col animate-fade-in bg-transparent font-sans selection:bg-primary/20 relative">
      {/* Sticky Header */}
      <header
        className={`
          fixed top-0 left-0 right-0 z-50 px-4 md:px-6 py-3 md:py-4 transition-all duration-300 ease-in-out
          ${isScrolled
            ? 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-slate-800/50 shadow-sm'
            : 'bg-transparent'
          }
        `}
        role="banner"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className={`flex flex-col transition-all duration-300 ${isScrolled ? 'opacity-100' : 'opacity-0'}`}>
            <h1 className="font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-text-primary via-primary to-secondary tracking-tight text-lg md:text-xl">
              Hola, {displayName}
            </h1>
          </div>

          {/* Mini Stats cuando hay scroll */}
          <div className={`flex items-center gap-2 md:gap-3 transition-all duration-300 ${isScrolled ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
            <div className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-full bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-base md:text-lg" aria-hidden="true">checkroom</span>
              <span className="text-xs md:text-sm font-bold">{closet.length}</span>
            </div>
            <div className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-full bg-secondary/10 text-secondary">
              <span className="material-symbols-outlined text-base md:text-lg" aria-hidden="true">local_fire_department</span>
              <span className="text-xs md:text-sm font-bold">{userStats.daysActive}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-grow w-full max-w-6xl mx-auto px-3 sm:px-4 md:px-6 pt-14 sm:pt-16 md:pt-20 pb-20 sm:pb-24">
        {/* Grid principal: 2 columnas en desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-4">
          {/* Columna izquierda: Hero + Weather */}
          <div className="space-y-3">
            <Hero3DImproved
              displayName={displayName}
              avatarUrl={user?.user_metadata?.avatar_url}
              closetLength={closet.length}
              totalOutfits={userStats.totalOutfits}
              daysActive={userStats.daysActive}
            />
            <WeatherCardImproved />
          </div>

          {/* Columna derecha: Search + Quick Actions + Stats */}
          <div className="space-y-3">
            {/* Barra de búsqueda */}
            <div className="relative z-20">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-lg shadow-gray-200/50 dark:shadow-slate-900/50 border border-gray-100 dark:border-slate-700 flex items-center p-1 transition-transform duration-300 group-hover:-translate-y-0.5">
                  <label htmlFor="feature-search" className="pl-4 text-primary">
                    <span className="material-symbols-outlined text-xl md:text-2xl" aria-hidden="true">search</span>
                  </label>
                  <input
                    id="feature-search"
                    type="text"
                    placeholder="¿Qué buscas hoy?"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-transparent border-none focus:ring-0 text-text-primary dark:text-gray-100 placeholder-text-secondary/60 dark:placeholder-gray-500 text-base md:text-lg"
                    aria-label="Buscar funciones"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors mr-1"
                      aria-label="Limpiar búsqueda"
                    >
                      <span className="material-symbols-outlined text-text-secondary text-lg md:text-xl" aria-hidden="true">close</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions (ocultas durante búsqueda) */}
            {!searchQuery && (
              <HomeQuickActionsImproved actions={quickActionsWithHandlers} />
            )}

            {/* Stats Widget (oculto durante búsqueda) */}
            {!searchQuery && closet.length > 0 && (
              <QuickStatsWidget
                closet={closet}
                onViewAnalytics={onShowAnalytics}
              />
            )}

            {/* Quota Indicator (solo si hay suscripción) */}
            {!searchQuery && props.subscription && (
              <QuotaIndicator
                used={props.subscription.aiGenerationsUsed}
                limit={props.subscription.aiGenerationsLimit}
                tier={props.subscription.tier}
                variant="full"
                onUpgradeClick={props.onShowPricing}
                className="animate-fade-in"
              />
            )}
          </div>
        </div>

        {/* Empty closet CTA */}
        {closet.length === 0 && !searchQuery && (
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 text-center relative overflow-hidden group animate-fade-in border border-primary/20 shadow-sm mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 opacity-50" />
            <div className="relative z-10">
              <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 md:mb-6 bg-white/80 dark:bg-slate-800/80 rounded-full flex items-center justify-center shadow-glow animate-bounce-slow">
                <span className="material-symbols-outlined text-3xl md:text-4xl text-primary" aria-hidden="true">add_a_photo</span>
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-text-primary dark:text-gray-100 mb-2">
                ¡Empieza tu transformación!
              </h3>
              <p className="text-sm md:text-base text-text-secondary dark:text-gray-400 mb-4 md:mb-6 max-w-md mx-auto">
                Sube tus prendas para que la IA haga su magia y empiece a crear outfits increíbles para ti.
              </p>
              <button
                onClick={handlers.onStartBulkUpload}
                className="px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-primary to-secondary text-white rounded-xl md:rounded-2xl font-bold text-base md:text-lg shadow-lg shadow-primary/30 active:scale-95 transition-all hover:shadow-xl hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Subir Ropa Ahora
              </button>
            </div>
          </div>
        )}

        {/* Sección de usados recientemente (si hay) */}
        {recentUsedFeatures.length > 0 && !searchQuery && (
          <section
            className="mb-4 animate-slide-up"
            style={{ animationDelay: '200ms' }}
            aria-label="Funciones usadas recientemente"
          >
            <div className="flex items-center gap-2 mb-3 px-1">
              <span className="material-symbols-outlined text-lg text-primary" aria-hidden="true">history</span>
              <h2 className="font-bold text-text-primary dark:text-gray-100 text-base">
                Recientes
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {recentUsedFeatures.map((feature, idx) => (
                <div
                  key={feature.id}
                  style={{ animationDelay: `${idx * 30}ms` }}
                  className="animate-fade-in"
                >
                  <HomeFeatureCard feature={feature} variant="compact" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Sección de exploración */}
        <section
          id="explore-section"
          className="rounded-[2rem] md:rounded-[2.5rem] p-3 md:p-4 animate-slide-up space-y-3 md:space-y-4 relative overflow-hidden"
          style={{ animationDelay: '300ms' }}
          aria-label="Explorar todas las funciones"
        >
          {/* Header */}
          <div className="flex items-center gap-2 md:gap-3 px-1 md:px-2">
            <div className="p-1.5 md:p-2 rounded-lg md:rounded-xl bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-xl md:text-2xl" aria-hidden="true">explore</span>
            </div>
            <h2 className="font-serif font-bold text-text-primary dark:text-gray-100 text-xl md:text-2xl">
              Explorar Todo
            </h2>
            <span className="text-xs text-text-secondary dark:text-gray-500 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
              {features.length} funciones
            </span>
            {searchQuery && (
              <span className="text-sm text-text-secondary dark:text-gray-400 ml-auto">
                {filteredFeatures.length} resultado{filteredFeatures.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Tabs con colores */}
          <div
            className="flex items-center gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide"
            role="tablist"
            aria-label="Categorías de funciones"
          >
            {FEATURE_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`${tab.id}-panel`}
                className={`
                  flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs whitespace-nowrap transition-all duration-300
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
                  ${activeTab === tab.id
                    ? `bg-gradient-to-r ${tab.id === 'all' ? 'from-gray-600 to-gray-700' : tab.id === 'essential' ? 'from-emerald-500 to-teal-500' : tab.id === 'create' ? 'from-violet-500 to-purple-500' : tab.id === 'social' ? 'from-pink-500 to-rose-500' : 'from-amber-500 to-orange-500'} text-white shadow-lg scale-105`
                    : `bg-white dark:bg-slate-800 ${tab.color} hover:bg-gray-50 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700`
                  }
                `}
              >
                <span className="material-symbols-outlined text-base" aria-hidden="true">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Grid de Features destacadas (solo en tab "all" y sin búsqueda) */}
          {activeTab === 'all' && !searchQuery && featuredFeatures.length > 0 && (
            <div className="mb-2">
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className="material-symbols-outlined text-base text-amber-500" aria-hidden="true">star</span>
                <span className="text-sm font-bold text-text-secondary dark:text-gray-400">Destacadas</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {featuredFeatures.map((feature, idx) => (
                  <div
                    key={feature.id}
                    style={{ animationDelay: `${idx * 50}ms` }}
                    className="animate-fade-in"
                  >
                    <HomeFeatureCard feature={feature} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Separador visual */}
          {activeTab === 'all' && !searchQuery && featuredFeatures.length > 0 && (
            <div className="flex items-center gap-3 py-2">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-slate-700 to-transparent" />
              <span className="text-xs text-text-secondary dark:text-gray-500">Todas las funciones</span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-slate-700 to-transparent" />
            </div>
          )}

          {/* Features Grid */}
          <div
            id={`${activeTab}-panel`}
            role="tabpanel"
            aria-labelledby={activeTab}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3"
          >
            {filteredFeatures.length > 0 ? (
              filteredFeatures
                .filter(f => activeTab !== 'all' || !f.featured || searchQuery) // Ocultar featured en "all" si ya se muestran arriba
                .map((feature, idx) => (
                <div
                  key={feature.id}
                  style={{ animationDelay: `${idx * 30}ms` }}
                  className="animate-fade-in"
                >
                  <HomeFeatureCard feature={feature} />
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-8 md:py-12">
                <span className="material-symbols-outlined text-4xl md:text-5xl text-text-secondary/50 mb-2 md:mb-3 block" aria-hidden="true">
                  search_off
                </span>
                <p className="text-text-secondary dark:text-gray-400 text-sm md:text-base">
                  No se encontraron funciones para "{searchQuery}"
                </p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-2 md:mt-3 text-primary hover:underline text-sm md:text-base"
                >
                  Limpiar búsqueda
                </button>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default HomeViewImproved;
