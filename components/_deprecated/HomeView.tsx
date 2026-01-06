import React, { useState, useMemo, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import type { ClothingItem } from '../types';
import { Hero3D } from './home/Hero3D';
import { HomeQuickActions } from './home/HomeQuickActions';
import { HomeFeatureCard } from './home/HomeFeatureCard';
import { HomeCategorySection } from './home/HomeCategorySection';
import { Feature } from './home/types';
import WeatherCard from './WeatherCard';

interface HomeViewProps {
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
  onStartOutfitTesting?: () => void;
}

const HomeView = ({
  user,
  closet,
  onStartStylist,
  onStartVirtualTryOn,
  onNavigateToCloset,
  onNavigateToCommunity,
  onStartSmartPacker,
  onStartChat,
  onStartWeatherOutfit,
  onStartLookbookCreator,
  onStartStyleChallenges,
  onStartRatingView,
  onStartFeedbackAnalysis,
  onStartGapAnalysis,
  onStartBrandRecognition,
  onStartDupeFinder,
  onStartCapsuleBuilder,
  onStartStyleDNA,
  onStartAIDesigner,
  onShowGenerationHistory,
  onStartStyleEvolution,
  onStartCalendarSync,
  onStartActivityFeed,
  onStartVirtualShopping,
  onStartMultiplayerChallenges,
  onStartBulkUpload,
  hasProfessionalProfile,
  onShowProfessionalWizard,
  onStartOutfitTesting
}: HomeViewProps) => {
  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Usuario';

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [recentFeatures, setRecentFeatures] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'essential' | 'create' | 'social' | 'advanced' | 'all'>('essential');

  // Load recent features from localStorage
  useEffect(() => {
    const recent = localStorage.getItem('ojodeloca-recent-features');
    if (recent) {
      try {
        setRecentFeatures(JSON.parse(recent));
      } catch (e) {
        console.error('Error loading recent features:', e);
      }
    }
  }, []);

  // Track feature usage
  const trackFeatureUse = (featureId: string) => {
    const updated = [featureId, ...recentFeatures.filter(id => id !== featureId)].slice(0, 5);
    setRecentFeatures(updated);
    localStorage.setItem('ojodeloca-recent-features', JSON.stringify(updated));
  };

  // All features organized
  const allFeatures: Feature[] = useMemo(() => [
    // ESSENTIAL (6)
    {
      id: 'chat',
      icon: 'chat',
      title: 'Chat de Moda',
      description: 'Conversa con tu asistente personal de estilo',
      onClick: () => { trackFeatureUse('chat'); onStartChat(); },
      category: 'essential',
      keywords: ['chat', 'asistente', 'IA', 'hablar', 'preguntar'],
      tooltip: 'Preguntá sobre consejos de moda, combinaciones de colores y tendencias actuales'
    },
    {
      id: 'stylist',
      icon: 'auto_awesome',
      title: 'Estilista IA',
      description: 'Genera un look para cualquier ocasión',
      onClick: () => { trackFeatureUse('stylist'); onStartStylist(); },
      category: 'essential',
      keywords: ['outfit', 'look', 'estilista', 'generar', 'crear'],
      tooltip: 'La IA creará combinaciones perfectas usando las prendas de tu armario'
    },
    ...(onShowProfessionalWizard ? [{
      id: 'professional-profile',
      icon: hasProfessionalProfile ? 'verified' : 'person_add',
      title: hasProfessionalProfile ? 'Perfil Profesional ✅' : 'Perfil Profesional',
      description: hasProfessionalProfile
        ? 'Outfits personalizados con morfología y colorimetría'
        : 'Activa outfits mejorados con tu morfología y paleta',
      onClick: () => { trackFeatureUse('professional-profile'); onShowProfessionalWizard(); },
      category: 'essential' as const,
      keywords: ['perfil', 'profesional', 'morfología', 'colorimetría', 'personalizado', 'mejorado'],
      badge: hasProfessionalProfile ? undefined : 'Nuevo'
    }] : []),
    {
      id: 'weather',
      icon: 'wb_sunny',
      title: 'Outfit del Día',
      description: 'Basado en el clima actual de tu ciudad',
      onClick: () => { trackFeatureUse('weather'); onStartWeatherOutfit(); },
      category: 'essential',
      keywords: ['clima', 'tiempo', 'temperatura', 'outfit', 'día'],
      tooltip: 'Recibí sugerencias de outfits adaptados al clima actual y pronóstico'
    },
    {
      id: 'closet',
      icon: 'dresser',
      title: 'Mi Armario',
      description: `${closet.length} prendas en tu colección`,
      onClick: () => { trackFeatureUse('closet'); onNavigateToCloset(); },
      category: 'essential',
      keywords: ['armario', 'ropa', 'prendas', 'closet', 'guardarropa'],
      tooltip: 'Explorá, buscá y organizá todas tus prendas en un solo lugar'
    },
    {
      id: 'feed',
      icon: 'dynamic_feed',
      title: 'Feed de Amigos',
      description: 'Descubrí looks de tu comunidad',
      onClick: () => { trackFeatureUse('feed'); onStartActivityFeed(); },
      category: 'essential',
      keywords: ['feed', 'amigos', 'comunidad', 'social', 'looks'],
      tooltip: 'Mirá los outfits, desafíos y actividades de tus amigos en tiempo real'
    },
    {
      id: 'bulk-upload',
      icon: 'photo_library',
      title: 'Carga Múltiple',
      description: 'Agregá hasta 30 prendas a la vez con IA',
      onClick: () => { trackFeatureUse('bulk-upload'); onStartBulkUpload(); },
      category: 'essential',
      keywords: ['subir', 'cargar', 'múltiple', 'fotos', 'agregar'],
      tooltip: 'Subí varias fotos simultáneamente y la IA analizará todas automáticamente'
    },

    // CREATE & PLAN (8)
    {
      id: 'smart-packer',
      icon: 'luggage',
      title: 'Maleta Inteligente',
      description: 'Prepara tu equipaje para cualquier viaje',
      onClick: () => { trackFeatureUse('smart-packer'); onStartSmartPacker(); },
      category: 'create',
      keywords: ['maleta', 'viaje', 'equipaje', 'packer', 'viajar'],
      tooltip: 'Generá listas de viaje personalizadas según destino, clima y actividades'
    },
    {
      id: 'lookbook',
      icon: 'collections',
      title: 'Lookbook Creator',
      description: 'Crea lookbooks temáticos con tu ropa',
      onClick: () => { trackFeatureUse('lookbook'); onStartLookbookCreator(); },
      category: 'create',
      keywords: ['lookbook', 'colección', 'álbum', 'temático'],
      tooltip: 'Organizá tus mejores looks en colecciones temáticas para eventos, temporadas o estilos'
    },
    {
      id: 'calendar',
      icon: 'event_available',
      title: 'Sincronización Calendario',
      description: 'Outfits basados en tus próximos eventos',
      onClick: () => { trackFeatureUse('calendar'); onStartCalendarSync(); },
      category: 'create',
      keywords: ['calendario', 'eventos', 'planear', 'agenda'],
      tooltip: 'Conectá tu calendario y recibí sugerencias de outfits para cada evento'
    },
    {
      id: 'capsule',
      icon: 'view_module',
      title: 'Capsule Wardrobe',
      description: 'Crea una cápsula minimalista versátil',
      onClick: () => { trackFeatureUse('capsule'); onStartCapsuleBuilder(); },
      category: 'create',
      keywords: ['cápsula', 'minimalista', 'esencial', 'versátil'],
      tooltip: 'Creá un armario esencial con prendas que combinan entre sí para máxima versatilidad'
    },
    {
      id: 'ai-designer',
      icon: 'auto_awesome',
      title: 'AI Fashion Designer',
      description: 'Diseña prendas personalizadas con IA',
      onClick: () => { trackFeatureUse('ai-designer'); onStartAIDesigner(); },
      category: 'create',
      keywords: ['diseñar', 'crear', 'personalizar', 'IA', 'diseño'],
      tooltip: 'Describí la prenda de tus sueños y la IA la diseñará para vos'
    },
    {
      id: 'generation-history',
      icon: 'photo_library',
      title: 'Mis Diseños AI',
      description: 'Galería de prendas generadas con IA',
      onClick: () => { trackFeatureUse('generation-history'); onShowGenerationHistory(); },
      category: 'discover',
      keywords: ['galería', 'historial', 'generaciones', 'IA', 'diseños'],
      tooltip: 'Accedé a tu historial completo de prendas diseñadas con IA'
    },
    {
      id: 'virtual-tryon',
      icon: 'checkroom',
      title: 'Probador Virtual',
      description: 'Vístete con tus outfits generados',
      onClick: () => { trackFeatureUse('virtual-tryon'); onStartVirtualTryOn(); },
      category: 'create',
      keywords: ['probador', 'virtual', 'vestir', 'probar'],
      tooltip: 'Probate outfits virtualmente usando tu cámara antes de vestirte'
    },
    {
      id: 'ratings',
      icon: 'star',
      title: 'Calificaciones',
      description: 'Califica tus outfits y ve tus mejores looks',
      onClick: () => { trackFeatureUse('ratings'); onStartRatingView(); },
      category: 'create',
      keywords: ['calificar', 'rating', 'votar', 'evaluar', 'mejores'],
      tooltip: 'Calificá cada outfit que uses para mejorar las futuras sugerencias de IA'
    },
    {
      id: 'feedback',
      icon: 'psychology',
      title: 'Análisis de Feedback',
      description: 'Descubre tus preferencias de estilo',
      onClick: () => { trackFeatureUse('feedback'); onStartFeedbackAnalysis(); },
      category: 'create',
      keywords: ['feedback', 'análisis', 'preferencias', 'insights'],
      tooltip: 'La IA analiza tus calificaciones para descubrir patrones en tus gustos'
    },

    // SOCIAL (4)
    {
      id: 'multiplayer',
      icon: 'emoji_events',
      title: 'Desafíos Multiplayer',
      description: 'Compite con amigos en desafíos de estilo',
      onClick: () => { trackFeatureUse('multiplayer'); onStartMultiplayerChallenges(); },
      category: 'social',
      keywords: ['desafíos', 'competir', 'multiplayer', 'amigos', 'puntos'],
      tooltip: 'Enfrentate a tus amigos en desafíos de moda y subí en el ranking'
    },
    {
      id: 'style-challenges',
      icon: 'emoji_events',
      title: 'Desafíos de Estilo',
      description: 'Completa retos creativos y gana puntos',
      onClick: () => { trackFeatureUse('style-challenges'); onStartStyleChallenges(); },
      category: 'social',
      keywords: ['desafíos', 'retos', 'creativos', 'puntos', 'completar'],
      tooltip: 'Retos semanales para explorar tu armario de formas creativas'
    },
    {
      id: 'community',
      icon: 'group',
      title: 'Comunidad',
      description: 'Explora estilos de otros usuarios',
      onClick: () => { trackFeatureUse('community'); onNavigateToCommunity(); },
      category: 'social',
      keywords: ['comunidad', 'explorar', 'usuarios', 'estilos'],
      tooltip: 'Descubrí nuevos estilos y seguí usuarios con gustos similares'
    },
    {
      id: 'activity-feed-full',
      icon: 'dynamic_feed',
      title: 'Feed de Actividad',
      description: 'Ve toda la actividad de tu red',
      onClick: () => { trackFeatureUse('activity-feed-full'); onStartActivityFeed(); },
      category: 'social',
      keywords: ['feed', 'actividad', 'red', 'amigos', 'social'],
      tooltip: 'Mirá los últimos outfits y logros de las personas que seguís'
    },

    // ADVANCED (9)
    {
      id: 'gap-analysis',
      icon: 'checklist',
      title: 'Gaps del Armario',
      description: 'Identifica qué prendas te faltan',
      onClick: () => { trackFeatureUse('gap-analysis'); onStartGapAnalysis(); },
      category: 'advanced',
      keywords: ['gaps', 'faltan', 'análisis', 'armario', 'falta'],
      tooltip: 'La IA detecta qué prendas básicas te faltan para un armario más versátil'
    },
    {
      id: 'brand-recognition',
      icon: 'label',
      title: 'Detector de Marca',
      description: 'Identifica marcas y precios de tus prendas',
      onClick: () => { trackFeatureUse('brand-recognition'); onStartBrandRecognition(); },
      category: 'advanced',
      keywords: ['marca', 'precio', 'detector', 'identificar'],
      tooltip: 'La IA identifica marcas y estima el valor de mercado de tus prendas'
    },
    {
      id: 'dupe-finder',
      icon: 'shopping_bag',
      title: 'Buscador de Dupes',
      description: 'Encuentra alternativas más baratas',
      onClick: () => { trackFeatureUse('dupe-finder'); onStartDupeFinder(); },
      category: 'advanced',
      keywords: ['dupes', 'alternativas', 'baratas', 'similar', 'buscar'],
      tooltip: 'Encontrá alternativas más económicas a prendas de diseñador'
    },
    {
      id: 'style-dna',
      icon: 'fingerprint',
      title: 'Style DNA Profile',
      description: 'Descubre tu ADN de estilo único',
      onClick: () => { trackFeatureUse('style-dna'); onStartStyleDNA(); },
      category: 'advanced',
      keywords: ['DNA', 'ADN', 'perfil', 'estilo', 'único', 'personalidad'],
      tooltip: 'Descubrí tu arquetipo de estilo y colores dominantes en tu armario'
    },
    {
      id: 'evolution',
      icon: 'timeline',
      title: 'Style Evolution',
      description: 'Descubre cómo ha evolucionado tu estilo',
      onClick: () => { trackFeatureUse('evolution'); onStartStyleEvolution(); },
      category: 'advanced',
      keywords: ['evolución', 'timeline', 'historia', 'cambio', 'tiempo'],
      tooltip: 'Viajá en el tiempo y mirá cómo cambió tu estilo a lo largo del tiempo'
    },
    {
      id: 'virtual-shopping',
      icon: 'shopping_bag',
      title: 'Asistente de Compras',
      description: 'Sugerencias personalizadas de compras',
      onClick: () => { trackFeatureUse('virtual-shopping'); onStartVirtualShopping(); },
      category: 'advanced',
      keywords: ['compras', 'shopping', 'asistente', 'sugerencias', 'comprar'],
      tooltip: 'Recomendaciones inteligentes basadas en tu armario y gaps'
    }
  ], [closet.length, onStartChat, onStartStylist, onStartWeatherOutfit, onNavigateToCloset, onStartActivityFeed, onStartBulkUpload, onStartSmartPacker, onStartLookbookCreator, onStartCalendarSync, onStartCapsuleBuilder, onStartAIDesigner, onStartVirtualTryOn, onStartRatingView, onStartFeedbackAnalysis, onStartMultiplayerChallenges, onStartStyleChallenges, onNavigateToCommunity, onStartGapAnalysis, onStartBrandRecognition, onStartDupeFinder, onStartStyleDNA, onStartStyleEvolution, onStartVirtualShopping]);

  // Search filtering
  const filteredFeatures = useMemo(() => {
    if (!searchQuery.trim()) return allFeatures;

    const query = searchQuery.toLowerCase();
    return allFeatures.filter(feature =>
      feature.title.toLowerCase().includes(query) ||
      feature.description.toLowerCase().includes(query) ||
      feature.keywords.some(kw => kw.includes(query))
    );
  }, [searchQuery, allFeatures]);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  // Calculate user stats
  const totalOutfits = useMemo(() => {
    const saved = localStorage.getItem('ojodeloca-total-outfits');
    return saved ? parseInt(saved, 10) : 0;
  }, []);

  const daysActive = useMemo(() => {
    const firstUse = localStorage.getItem('ojodeloca-first-use');
    if (!firstUse) {
      localStorage.setItem('ojodeloca-first-use', new Date().toISOString());
      return 1;
    }
    const diffTime = Math.abs(new Date().getTime() - new Date(firstUse).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }, []);

  // Scroll detection for sticky header
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const quickActions = [
    { id: 'chat', icon: 'chat_bubble', label: 'Chat IA', color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20', onClick: () => { trackFeatureUse('chat'); onStartChat(); } },
    { id: 'stylist', icon: 'auto_awesome', label: 'Estilista', color: 'text-primary', bg: 'bg-emerald-50 dark:bg-emerald-900/20', onClick: () => { trackFeatureUse('stylist'); onStartStylist(); } },
    { id: 'closet', icon: 'checkroom', label: 'Armario', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', onClick: () => { trackFeatureUse('closet'); onNavigateToCloset(); } },
    { id: 'packer', icon: 'luggage', label: 'Maleta', color: 'text-teal-500', bg: 'bg-teal-50 dark:bg-teal-900/20', onClick: () => { trackFeatureUse('packer'); onStartSmartPacker(); } },
    { id: 'lookbook', icon: 'photo_library', label: 'Lookbook', color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/20', onClick: () => { trackFeatureUse('lookbook'); onStartLookbookCreator(); } },
    { id: 'rate', icon: 'swipe', label: 'Calificar', color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-900/20', onClick: () => { trackFeatureUse('rate'); onStartRatingView(); } },
    { id: 'tryon', icon: 'photo_camera', label: 'Probar IA', color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20', onClick: () => { trackFeatureUse('tryon'); onStartVirtualTryOn(); } },
    { id: 'weather', icon: 'sunny', label: 'Del Día', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20', onClick: () => { trackFeatureUse('weather'); onStartWeatherOutfit(); } },
  ];

  return (
    <div className="w-full min-h-screen flex flex-col animate-fade-in bg-transparent font-sans selection:bg-primary/20 relative">
      {/* Background Orbs removed in favor of Global 3D Canvas */}

      {/* Sticky Header */}
      <header
        className={`
          fixed top-0 left-0 right-0 z-50 px-6 py-4 transition-all duration-300 ease-in-out
          ${isScrolled
            ? 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-slate-800/50 shadow-sm'
            : 'bg-transparent'
          }
        `}
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className={`flex flex-col transition-all duration-300 ${isScrolled ? 'opacity-100' : 'opacity-0'}`}>
            <h1 className="font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-text-primary via-primary to-secondary tracking-tight text-xl">
              Hola, {displayName}
            </h1>
          </div>

          {/* Mini Stats when scrolled */}
          <div className={`flex items-center gap-3 transition-all duration-300 ${isScrolled ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-lg">checkroom</span>
              <span className="text-sm font-bold">{closet.length}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/10 text-secondary">
              <span className="material-symbols-outlined text-lg">local_fire_department</span>
              <span className="text-sm font-bold">{daysActive}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-grow w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 pt-16 sm:pt-20 pb-20 sm:pb-24">

        {/* 2-COLUMN LAYOUT: Hero+Weather LEFT | Search+QuickActions RIGHT */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-4">

          {/* LEFT COLUMN - Hero + Weather */}
          <div className="space-y-3">
            {/* 3D HERO - Interactive */}
            <Hero3D
              displayName={displayName}
              avatarUrl={user?.user_metadata?.avatar_url}
              closetLength={closet.length}
              totalOutfits={totalOutfits}
              daysActive={daysActive}
            />

            {/* WEATHER GLASS */}
            <WeatherCard />
          </div>

          {/* RIGHT COLUMN - Search + Quick Actions */}
          <div className="space-y-3">
            {/* SEARCH BAR */}
            <div className="relative z-20">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-lg shadow-gray-200/50 dark:shadow-slate-900/50 border border-gray-100 dark:border-slate-700 flex items-center p-1 transition-transform duration-300 group-hover:-translate-y-0.5">
                  <div className="pl-4 text-primary">
                    <span className="material-symbols-outlined text-2xl">search</span>
                  </div>
                  <input
                    type="text"
                    placeholder="¿Qué buscas hoy?"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-3 bg-transparent border-none focus:ring-0 text-text-primary placeholder-text-secondary/60 text-lg"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors mr-1"
                    >
                      <span className="material-symbols-outlined text-text-secondary text-xl">close</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* QUICK ACTIONS */}
            {!searchQuery && (
              <HomeQuickActions actions={quickActions} />
            )}
          </div>
        </div>

        {/* Empty closet CTA */}
        {closet.length === 0 && !searchQuery && (
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 text-center relative overflow-hidden group animate-fade-in border border-primary/20 shadow-sm mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 opacity-50" />
            <div className="relative z-10">
              <div className="w-20 h-20 mx-auto mb-6 bg-white/80 rounded-full flex items-center justify-center shadow-glow animate-bounce-slow">
                <span className="material-symbols-outlined text-4xl text-primary">add_a_photo</span>
              </div>
              <h3 className="text-2xl font-bold text-text-primary mb-2">¡Empieza tu transformación!</h3>
              <p className="text-base text-text-secondary mb-6 max-w-md mx-auto">
                Sube tus prendas para que la IA haga su magia y empiece a crear outfits increíbles para ti.
              </p>
              <button
                onClick={onStartBulkUpload}
                className="px-8 py-4 bg-gradient-to-r from-primary to-secondary text-white rounded-2xl font-bold text-lg shadow-lg shadow-primary/30 active:scale-95 transition-all hover:shadow-xl hover:-translate-y-1"
              >
                Subir Ropa Ahora
              </button>
            </div>
          </div>
        )}

        {/* EXPLORE BUBBLE */}
        <div id="explore-section" className="!bg-transparent border-none shadow-none rounded-[2.5rem] p-4 animate-slide-up space-y-4 relative overflow-hidden" style={{ animationDelay: '300ms' }}>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gray-100 dark:via-slate-800 to-transparent opacity-50" />

          <div className="flex items-center gap-3 px-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-2xl">explore</span>
            </div>
            <h2 className="font-serif font-bold text-text-primary text-2xl">Explorar Todo</h2>
          </div>

          {/* Tabs Scrollable - Pill Style */}
          <div className="flex items-center gap-3 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
            {[
              { id: 'all', label: 'Todos', icon: 'apps' },
              { id: 'essential', label: 'Esenciales', icon: 'star' },
              { id: 'create', label: 'Crear', icon: 'palette' },
              { id: 'social', label: 'Social', icon: 'group' },
              { id: 'advanced', label: 'Avanzadas', icon: 'science' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm whitespace-nowrap transition-all duration-300
                  ${(activeTab === tab.id || (tab.id === 'all' && !['essential', 'create', 'social', 'advanced'].includes(activeTab)))
                    ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-105'
                    : 'bg-gray-50 dark:bg-slate-800 text-text-secondary hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700'
                  }
                `}
              >
                <span className="material-symbols-outlined text-lg">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Features Grid - 4 columns on desktop for better space use */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {filteredFeatures
              .filter(f => activeTab === 'all' || f.category === activeTab)
              .map((feature, idx) => (
                <div key={feature.id} style={{ animationDelay: `${idx * 50}ms` }} className="animate-fade-in">
                  <HomeFeatureCard feature={feature} />
                </div>
              ))}
          </div>
        </div>

      </main>
    </div>
  );
};

export default HomeView;
