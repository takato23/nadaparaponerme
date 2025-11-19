
import React, { useState, useMemo, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import type { ClothingItem } from '../types';
import OjoDeLocaLogo from './OjoDeLocaLogo';
import { Card } from './ui/Card';

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
  onStartStyleEvolution: () => void;
  onStartCalendarSync: () => void;
  onStartActivityFeed: () => void;
  onStartVirtualShopping: () => void;
  onStartMultiplayerChallenges: () => void;
  onStartBulkUpload: () => void;
}

interface Feature {
  id: string;
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
  category: 'essential' | 'create' | 'social' | 'advanced';
  keywords: string[];
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
  onStartStyleEvolution,
  onStartCalendarSync,
  onStartActivityFeed,
  onStartVirtualShopping,
  onStartMultiplayerChallenges,
  onStartBulkUpload
}: HomeViewProps) => {
  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Usuario';

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [recentFeatures, setRecentFeatures] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'essential' | 'create' | 'social' | 'advanced'>('essential');

  // Daily inspiration quotes
  const inspirationQuotes = [
    { quote: "La moda es la armadura para sobrevivir la realidad de la vida cotidiana", author: "Bill Cunningham" },
    { quote: "El estilo es una forma de decir quién eres sin tener que hablar", author: "Rachel Zoe" },
    { quote: "La elegancia es la única belleza que nunca se desvanece", author: "Audrey Hepburn" },
    { quote: "La moda cambia, pero el estilo permanece", author: "Coco Chanel" },
    { quote: "Vístete como si fueras a encontrarte con tu peor enemigo hoy", author: "Coco Chanel" },
    { quote: "La creatividad no tiene límites, solo tu imaginación", author: "Unknown" }
  ];

  const dailyQuote = useMemo(() => {
    const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return inspirationQuotes[dayOfYear % inspirationQuotes.length];
  }, []);

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
      keywords: ['chat', 'asistente', 'IA', 'hablar', 'preguntar']
    },
    {
      id: 'stylist',
      icon: 'auto_awesome',
      title: 'Estilista IA',
      description: 'Genera un look para cualquier ocasión',
      onClick: () => { trackFeatureUse('stylist'); onStartStylist(); },
      category: 'essential',
      keywords: ['outfit', 'look', 'estilista', 'generar', 'crear']
    },
    {
      id: 'weather',
      icon: 'wb_sunny',
      title: 'Outfit del Día',
      description: 'Basado en el clima actual de tu ciudad',
      onClick: () => { trackFeatureUse('weather'); onStartWeatherOutfit(); },
      category: 'essential',
      keywords: ['clima', 'tiempo', 'temperatura', 'outfit', 'día']
    },
    {
      id: 'closet',
      icon: 'dresser',
      title: 'Mi Armario',
      description: `${closet.length} prendas en tu colección`,
      onClick: () => { trackFeatureUse('closet'); onNavigateToCloset(); },
      category: 'essential',
      keywords: ['armario', 'ropa', 'prendas', 'closet', 'guardarropa']
    },
    {
      id: 'feed',
      icon: 'dynamic_feed',
      title: 'Feed de Amigos',
      description: 'Descubrí looks de tu comunidad',
      onClick: () => { trackFeatureUse('feed'); onStartActivityFeed(); },
      category: 'essential',
      keywords: ['feed', 'amigos', 'comunidad', 'social', 'looks']
    },
    {
      id: 'bulk-upload',
      icon: 'photo_library',
      title: 'Carga Múltiple',
      description: 'Agregá hasta 30 prendas a la vez con IA',
      onClick: () => { trackFeatureUse('bulk-upload'); onStartBulkUpload(); },
      category: 'essential',
      keywords: ['subir', 'cargar', 'múltiple', 'fotos', 'agregar']
    },

    // CREATE & PLAN (8)
    {
      id: 'smart-packer',
      icon: 'luggage',
      title: 'Maleta Inteligente',
      description: 'Prepara tu equipaje para cualquier viaje',
      onClick: () => { trackFeatureUse('smart-packer'); onStartSmartPacker(); },
      category: 'create',
      keywords: ['maleta', 'viaje', 'equipaje', 'packer', 'viajar']
    },
    {
      id: 'lookbook',
      icon: 'collections',
      title: 'Lookbook Creator',
      description: 'Crea lookbooks temáticos con tu ropa',
      onClick: () => { trackFeatureUse('lookbook'); onStartLookbookCreator(); },
      category: 'create',
      keywords: ['lookbook', 'colección', 'álbum', 'temático']
    },
    {
      id: 'calendar',
      icon: 'event_available',
      title: 'Sincronización Calendario',
      description: 'Outfits basados en tus próximos eventos',
      onClick: () => { trackFeatureUse('calendar'); onStartCalendarSync(); },
      category: 'create',
      keywords: ['calendario', 'eventos', 'planear', 'agenda']
    },
    {
      id: 'capsule',
      icon: 'view_module',
      title: 'Capsule Wardrobe',
      description: 'Crea una cápsula minimalista versátil',
      onClick: () => { trackFeatureUse('capsule'); onStartCapsuleBuilder(); },
      category: 'create',
      keywords: ['cápsula', 'minimalista', 'esencial', 'versátil']
    },
    {
      id: 'ai-designer',
      icon: 'auto_awesome',
      title: 'AI Fashion Designer',
      description: 'Diseña prendas personalizadas con IA',
      onClick: () => { trackFeatureUse('ai-designer'); onStartAIDesigner(); },
      category: 'create',
      keywords: ['diseñar', 'crear', 'personalizar', 'IA', 'diseño']
    },
    {
      id: 'virtual-tryon',
      icon: 'checkroom',
      title: 'Probador Virtual',
      description: 'Vístete con tus outfits generados',
      onClick: () => { trackFeatureUse('virtual-tryon'); onStartVirtualTryOn(); },
      category: 'create',
      keywords: ['probador', 'virtual', 'vestir', 'probar']
    },
    {
      id: 'ratings',
      icon: 'star',
      title: 'Calificaciones',
      description: 'Califica tus outfits y ve tus mejores looks',
      onClick: () => { trackFeatureUse('ratings'); onStartRatingView(); },
      category: 'create',
      keywords: ['calificar', 'rating', 'votar', 'evaluar', 'mejores']
    },
    {
      id: 'feedback',
      icon: 'psychology',
      title: 'Análisis de Feedback',
      description: 'Descubre tus preferencias de estilo',
      onClick: () => { trackFeatureUse('feedback'); onStartFeedbackAnalysis(); },
      category: 'create',
      keywords: ['feedback', 'análisis', 'preferencias', 'insights']
    },

    // SOCIAL (4)
    {
      id: 'multiplayer',
      icon: 'emoji_events',
      title: 'Desafíos Multiplayer',
      description: 'Compite con amigos en desafíos de estilo',
      onClick: () => { trackFeatureUse('multiplayer'); onStartMultiplayerChallenges(); },
      category: 'social',
      keywords: ['desafíos', 'competir', 'multiplayer', 'amigos', 'puntos']
    },
    {
      id: 'style-challenges',
      icon: 'emoji_events',
      title: 'Desafíos de Estilo',
      description: 'Completa retos creativos y gana puntos',
      onClick: () => { trackFeatureUse('style-challenges'); onStartStyleChallenges(); },
      category: 'social',
      keywords: ['desafíos', 'retos', 'creativos', 'puntos', 'completar']
    },
    {
      id: 'community',
      icon: 'group',
      title: 'Comunidad',
      description: 'Explora estilos de otros usuarios',
      onClick: () => { trackFeatureUse('community'); onNavigateToCommunity(); },
      category: 'social',
      keywords: ['comunidad', 'explorar', 'usuarios', 'estilos']
    },
    {
      id: 'activity-feed-full',
      icon: 'dynamic_feed',
      title: 'Feed de Actividad',
      description: 'Ve toda la actividad de tu red',
      onClick: () => { trackFeatureUse('activity-feed-full'); onStartActivityFeed(); },
      category: 'social',
      keywords: ['feed', 'actividad', 'red', 'amigos', 'social']
    },

    // ADVANCED (9)
    {
      id: 'gap-analysis',
      icon: 'checklist',
      title: 'Gaps del Armario',
      description: 'Identifica qué prendas te faltan',
      onClick: () => { trackFeatureUse('gap-analysis'); onStartGapAnalysis(); },
      category: 'advanced',
      keywords: ['gaps', 'faltan', 'análisis', 'armario', 'falta']
    },
    {
      id: 'brand-recognition',
      icon: 'label',
      title: 'Detector de Marca',
      description: 'Identifica marcas y precios de tus prendas',
      onClick: () => { trackFeatureUse('brand-recognition'); onStartBrandRecognition(); },
      category: 'advanced',
      keywords: ['marca', 'precio', 'detector', 'identificar']
    },
    {
      id: 'dupe-finder',
      icon: 'shopping_bag',
      title: 'Buscador de Dupes',
      description: 'Encuentra alternativas más baratas',
      onClick: () => { trackFeatureUse('dupe-finder'); onStartDupeFinder(); },
      category: 'advanced',
      keywords: ['dupes', 'alternativas', 'baratas', 'similar', 'buscar']
    },
    {
      id: 'style-dna',
      icon: 'fingerprint',
      title: 'Style DNA Profile',
      description: 'Descubre tu ADN de estilo único',
      onClick: () => { trackFeatureUse('style-dna'); onStartStyleDNA(); },
      category: 'advanced',
      keywords: ['DNA', 'ADN', 'perfil', 'estilo', 'único', 'personalidad']
    },
    {
      id: 'evolution',
      icon: 'timeline',
      title: 'Style Evolution',
      description: 'Descubre cómo ha evolucionado tu estilo',
      onClick: () => { trackFeatureUse('evolution'); onStartStyleEvolution(); },
      category: 'advanced',
      keywords: ['evolución', 'timeline', 'historia', 'cambio', 'tiempo']
    },
    {
      id: 'virtual-shopping',
      icon: 'shopping_bag',
      title: 'Asistente de Compras',
      description: 'Sugerencias personalizadas de compras',
      onClick: () => { trackFeatureUse('virtual-shopping'); onStartVirtualShopping(); },
      category: 'advanced',
      keywords: ['compras', 'shopping', 'asistente', 'sugerencias', 'comprar']
    }
  ], [closet.length, onStartChat, onStartStylist, onStartWeatherOutfit, onNavigateToCloset, onStartActivityFeed, onStartBulkUpload, onStartSmartPacker, onStartLookbookCreator, onStartCalendarSync, onStartCapsuleBuilder, onStartAIDesigner, onStartVirtualTryOn, onStartRatingView, onStartFeedbackAnalysis, onStartMultiplayerChallenges, onStartStyleChallenges, onNavigateToCommunity, onStartGapAnalysis, onStartBrandRecognition, onStartDupeFinder, onStartStyleDNA, onStartStyleEvolution, onStartVirtualShopping]);

  // Smart suggestions based on context
  const smartSuggestions = useMemo(() => {
    const suggestions: Feature[] = [];
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();

    // Morning suggestion (6am-11am)
    if (hour >= 6 && hour < 11) {
      suggestions.push(allFeatures.find(f => f.id === 'weather')!);
    }

    // Empty closet suggestion
    if (closet.length < 5) {
      suggestions.push(allFeatures.find(f => f.id === 'bulk-upload')!);
    }

    // Weekend suggestions
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      suggestions.push(allFeatures.find(f => f.id === 'multiplayer')!);
    }

    // Always show chat as fallback
    if (!suggestions.find(s => s.id === 'chat')) {
      suggestions.push(allFeatures.find(f => f.id === 'chat')!);
    }

    // Add recently used features
    recentFeatures.slice(0, 2).forEach(id => {
      const feature = allFeatures.find(f => f.id === id);
      if (feature && !suggestions.find(s => s.id === id)) {
        suggestions.push(feature);
      }
    });

    // Add popular features if still need more
    const popular = ['stylist', 'feed', 'closet'];
    popular.forEach(id => {
      if (suggestions.length < 6) {
        const feature = allFeatures.find(f => f.id === id);
        if (feature && !suggestions.find(s => s.id === id)) {
          suggestions.push(feature);
        }
      }
    });

    return suggestions.slice(0, 6);
  }, [closet.length, allFeatures, recentFeatures]);

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

  // Group by category
  const categorizedFeatures = useMemo(() => {
    return {
      essential: filteredFeatures.filter(f => f.category === 'essential'),
      create: filteredFeatures.filter(f => f.category === 'create'),
      social: filteredFeatures.filter(f => f.category === 'social'),
      advanced: filteredFeatures.filter(f => f.category === 'advanced')
    };
  }, [filteredFeatures]);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const FeatureCard = ({ feature, variant = 'default' }: { feature: Feature, variant?: 'default' | 'compact' }) => (
    <button
      onClick={feature.onClick}
      className={`
        relative w-full text-left overflow-hidden
        glass-card rounded-3xl
        transition-all duration-300 ease-out
        touch-manipulation
        hover:shadow-glow hover:-translate-y-1
        active:scale-[0.98]
        ${variant === 'compact' ? 'p-3 min-h-[72px]' : 'p-5 min-h-[100px]'}
        group
      `}
    >
      <div className={`absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />

      <div className={`relative z-10 flex items-start gap-${variant === 'compact' ? '3' : '4'}`}>
        <div className={`${variant === 'compact' ? 'w-10 h-10' : 'w-12 h-12'} rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
          <span className={`material-symbols-outlined text-primary ${variant === 'compact' ? 'text-xl' : 'text-2xl'}`}>
            {feature.icon}
          </span>
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <h3 className={`font-bold text-text-primary dark:text-gray-100 ${variant === 'compact' ? 'text-sm' : 'text-lg'} mb-0.5 leading-tight group-hover:text-primary transition-colors`}>
            {feature.title}
          </h3>
          <p className={`text-text-secondary dark:text-gray-400 ${variant === 'compact' ? 'text-xs' : 'text-sm'} leading-relaxed line-clamp-2 font-medium opacity-90`}>
            {feature.description}
          </p>
        </div>
      </div>
    </button>
  );

  const CategorySection = ({
    title,
    icon,
    features,
    categoryId,
    count
  }: {
    title: string,
    icon: string,
    features: Feature[],
    categoryId: string,
    count: number
  }) => {
    const isExpanded = expandedCategories.has(categoryId);

    return (
      <div className="mb-6">
        <button
          onClick={() => toggleCategory(categoryId)}
          className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/30 dark:bg-slate-800/30 backdrop-blur-md border border-white/20 hover:bg-white/40 dark:hover:bg-slate-800/40 transition-all duration-200 touch-manipulation active:scale-[0.98] group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <span className="material-symbols-outlined text-primary text-xl">
                {icon}
              </span>
            </div>
            <span className="font-serif font-semibold text-text-primary dark:text-gray-200 text-lg tracking-wide">
              {title}
            </span>
            <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
              {count}
            </span>
          </div>
          <span className={`material-symbols-outlined text-text-secondary transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
            expand_more
          </span>
        </button>

        {isExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 animate-slide-down origin-top">
            {features.map((feature, idx) => (
              <div key={feature.id} style={{ animationDelay: `${idx * 50}ms` }} className="animate-fade-in">
                <FeatureCard feature={feature} variant="compact" />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Get contextual greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '¡Buenos días';
    if (hour < 19) return '¡Buenas tardes';
    return '¡Buenas noches';
  };

  // Calculate user stats
  const totalOutfits = useMemo(() => {
    // This would normally come from a database query
    // For now, we'll use localStorage as a placeholder
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

  return (
    <div className="w-full h-full flex flex-col animate-fade-in overflow-hidden bg-transparent">
      {/* Hero Section Premium - Viral Style */}
      <header className="relative px-6 pt-safe pt-8 pb-6 overflow-hidden shrink-0">
        {/* Animated gradient background with more vibrancy */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-purple-500/10 to-secondary/20 opacity-60 animate-gradient-shift" />
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/30 rounded-full blur-3xl opacity-40 animate-pulse-slow" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-secondary/30 rounded-full blur-3xl opacity-40 animate-pulse-slow" style={{ animationDelay: '1s' }} />

        <div className="relative z-10">
          {/* Main greeting with staggered animation */}
          <div className="flex flex-col gap-1 mb-6">
            <div className="flex items-center gap-2 opacity-80 animate-slide-up">
              <span className="text-sm font-bold tracking-wider uppercase text-text-secondary">
                {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric' })}
              </span>
              <div className="h-1 w-1 rounded-full bg-text-secondary" />
              <span className="text-sm font-medium text-text-secondary">
                {getGreeting()}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-text-primary via-primary to-secondary tracking-tight leading-[1.1] animate-slide-up" style={{ animationDelay: '100ms' }}>
              Hola, {displayName}
            </h1>

            <p className="text-lg text-text-secondary/90 font-medium max-w-xs animate-slide-up" style={{ animationDelay: '200ms' }}>
              ¿Listo para romperla con tu look hoy? 🔥
            </p>
          </div>

          {/* Quick Stats - Grid Layout */}
          <div className="grid grid-cols-3 gap-2 animate-slide-up" style={{ animationDelay: '300ms' }}>
            <div className="glass-card p-3 rounded-2xl flex flex-col items-center justify-center border border-white/20 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-2">
                <span className="material-symbols-outlined text-xl">checkroom</span>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-text-primary leading-none mb-1">{closet.length}</div>
                <div className="text-[10px] font-medium text-text-secondary">Prendas</div>
              </div>
            </div>

            <div className="glass-card p-3 rounded-2xl flex flex-col items-center justify-center border border-white/20 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary mb-2">
                <span className="material-symbols-outlined text-xl">style</span>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-text-primary leading-none mb-1">{totalOutfits}</div>
                <div className="text-[10px] font-medium text-text-secondary">Outfits</div>
              </div>
            </div>

            <div className="glass-card p-3 rounded-2xl flex flex-col items-center justify-center border border-white/20 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent mb-2">
                <span className="material-symbols-outlined text-xl">local_fire_department</span>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-text-primary leading-none mb-1">{daysActive}</div>
                <div className="text-[10px] font-medium text-text-secondary">Racha</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow overflow-y-auto px-4 sm:px-6 pb-safe pb-32 scrollbar-hide">
        <div className="max-w-4xl mx-auto space-y-8 pt-2">

          {/* Search - Floating & Modern */}
          <div className="sticky top-0 z-30 pt-2 pb-4 -mt-2 bg-gradient-to-b from-[#f8f9fa] via-[#f8f9fa] to-transparent dark:from-slate-950 dark:via-slate-950">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/30 to-secondary/30 rounded-2xl blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <input
                type="text"
                placeholder="¿Qué buscas hoy?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="relative w-full px-5 pl-12 py-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 text-text-primary placeholder-text-secondary/60 transition-all duration-300 shadow-sm group-hover:shadow-md"
              />
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary/70">
                search
              </span>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                  <span className="material-symbols-outlined text-text-secondary text-lg">close</span>
                </button>
              )}
            </div>
          </div>

          {/* Empty closet CTA */}
          {closet.length === 0 && !searchQuery && (
            <div className="glass-card p-6 rounded-3xl text-center relative overflow-hidden group animate-fade-in">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 opacity-50" />
              <div className="relative z-10">
                <div className="w-16 h-16 mx-auto mb-4 bg-white/50 rounded-full flex items-center justify-center shadow-glow animate-bounce-slow">
                  <span className="material-symbols-outlined text-3xl text-primary">add_a_photo</span>
                </div>
                <h3 className="text-lg font-bold text-text-primary mb-1">¡Empieza tu transformación!</h3>
                <p className="text-sm text-text-secondary mb-4">
                  Sube tus prendas para que la IA haga su magia.
                </p>
                <button
                  onClick={onStartBulkUpload}
                  className="w-full py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-bold shadow-lg shadow-primary/30 active:scale-95 transition-all"
                >
                  Subir Ropa Ahora
                </button>
              </div>
            </div>
          )}

          {/* Quick Actions - Grid */}
          {!searchQuery && (
            <div className="animate-slide-up" style={{ animationDelay: '400ms' }}>
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="font-serif font-bold text-text-primary text-lg">
                  Acceso Rápido
                </h2>
              </div>
              <div className="grid grid-cols-4 gap-2 sm:gap-4">
                {[
                  { id: 'chat', icon: 'chat_bubble', label: 'Chat IA', color: 'text-purple-500', bg: 'bg-purple-500/10', onClick: () => { trackFeatureUse('chat'); onStartChat(); } },
                  { id: 'stylist', icon: 'auto_awesome', label: 'Estilista', color: 'text-primary', bg: 'bg-primary/10', onClick: () => { trackFeatureUse('stylist'); onStartStylist(); } },
                  { id: 'closet', icon: 'checkroom', label: 'Armario', color: 'text-blue-500', bg: 'bg-blue-500/10', onClick: () => { trackFeatureUse('closet'); onNavigateToCloset(); } },
                  { id: 'weather', icon: 'sunny', label: 'Del Día', color: 'text-orange-500', bg: 'bg-orange-500/10', onClick: () => { trackFeatureUse('weather'); onStartWeatherOutfit(); } },
                ].map((action) => (
                  <button
                    key={action.id}
                    onClick={action.onClick}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl ${action.bg} flex items-center justify-center transition-transform duration-300 group-hover:scale-105 group-active:scale-95`}>
                      <span className={`material-symbols-outlined text-2xl sm:text-3xl ${action.color}`}>
                        {action.icon}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-text-secondary group-hover:text-text-primary transition-colors">
                      {action.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Smart Suggestions - Bento Grid Style */}
          {!searchQuery && (
            <div className="animate-slide-up" style={{ animationDelay: '500ms' }}>
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-serif font-bold text-text-primary text-lg">
                    Sugerencias para Ti
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-primary to-secondary text-[10px] font-bold text-white shadow-sm">
                    IA
                  </span>
                </div>
              </div>

              {/* Bento Grid Layout: 1 Hero + 4 Standard */}
              <div className="grid grid-cols-2 gap-3">
                {smartSuggestions.slice(0, smartSuggestions.length > 5 ? 4 : 5).map((feature, idx) => {
                  const isHero = idx === 0;
                  return (
                    <div
                      key={feature.id}
                      className={`${isHero ? 'col-span-2' : 'col-span-1'} animate-fade-in`}
                      style={{ animationDelay: `${idx * 100}ms` }}
                    >
                      <button
                        onClick={feature.onClick}
                        className={`
                          relative w-full text-left overflow-hidden glass-card rounded-3xl 
                          transition-all duration-300 hover:shadow-glow hover:-translate-y-1 active:scale-[0.98] group border border-white/40
                          ${isHero ? 'p-6 min-h-[180px] flex flex-row items-center gap-6' : 'p-5 min-h-[160px] flex flex-col justify-between'}
                        `}
                      >
                        {/* Dynamic Backgrounds */}
                        <div className={`absolute inset-0 bg-gradient-to-br opacity-10 group-hover:opacity-20 transition-opacity duration-500
                          ${feature.id === 'chat' ? 'from-purple-500 to-pink-500' :
                            feature.id === 'stylist' ? 'from-primary to-secondary' :
                              feature.id === 'weather' ? 'from-orange-400 to-yellow-400' :
                                'from-blue-400 to-cyan-400'
                          }`}
                        />

                        {/* Icon */}
                        <div className={`
                          rounded-2xl flex items-center justify-center shadow-sm shrink-0
                          ${feature.id === 'chat' ? 'bg-purple-100 text-purple-600' :
                            feature.id === 'stylist' ? 'bg-primary/10 text-primary' :
                              feature.id === 'weather' ? 'bg-orange-100 text-orange-600' :
                                'bg-blue-100 text-blue-600'
                          }
                          ${isHero ? 'w-16 h-16' : 'w-12 h-12'}
                        `}>
                          <span className={`material-symbols-outlined ${isHero ? 'text-3xl' : 'text-2xl'}`}>{feature.icon}</span>
                        </div>

                        {/* Content */}
                        <div className={`flex flex-col ${isHero ? 'flex-1' : 'mt-4'}`}>
                          {isHero && (
                            <span className="inline-block self-start px-2 py-1 rounded-lg bg-white/80 backdrop-blur text-[10px] font-bold text-text-primary shadow-sm mb-2">
                              RECOMENDADO
                            </span>
                          )}

                          <h3 className={`font-bold text-text-primary leading-tight mb-1 ${isHero ? 'text-xl' : 'text-base'}`}>
                            {feature.title}
                          </h3>
                          <p className={`text-text-secondary font-medium ${isHero ? 'text-base line-clamp-2' : 'text-xs line-clamp-2'}`}>
                            {feature.description}
                          </p>

                          {isHero && (
                            <div className="flex items-center gap-1 mt-3 text-primary font-bold text-sm group-hover:translate-x-1 transition-transform">
                              <span>Probar ahora</span>
                              <span className="material-symbols-outlined text-sm">arrow_forward</span>
                            </div>
                          )}
                        </div>
                      </button>
                    </div>
                  );
                })}

                {/* "Ver más" mini card if we have more than 5 items (optional, or just rely on Explore) */}
                {smartSuggestions.length > 5 && (
                  <button
                    onClick={() => document.getElementById('explore-section')?.scrollIntoView({ behavior: 'smooth' })}
                    className="col-span-1 min-h-[160px] rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center gap-2 text-text-secondary hover:border-primary hover:text-primary transition-colors bg-white/20"
                  >
                    <span className="material-symbols-outlined text-3xl">add_circle</span>
                    <span className="font-bold text-sm">Ver más</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Inspiration of the Day - Viral Card */}
          {!searchQuery && (
            <div className="animate-slide-up" style={{ animationDelay: '600ms' }}>
              <div className="relative w-full overflow-hidden rounded-3xl shadow-xl group cursor-pointer active:scale-[0.98] transition-transform duration-300">
                {/* Background Image/Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-black" />
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-40 mix-blend-overlay group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

                <div className="relative z-10 p-8 flex flex-col items-center text-center">
                  <span className="px-3 py-1 rounded-full border border-white/30 text-white/90 text-xs font-bold tracking-widest uppercase mb-6 backdrop-blur-sm">
                    Inspiración del Día
                  </span>

                  <span className="material-symbols-outlined text-4xl text-white/80 mb-4">format_quote</span>

                  <p className="text-2xl sm:text-3xl font-serif italic text-white leading-relaxed mb-6 drop-shadow-lg">
                    "{dailyQuote.quote}"
                  </p>

                  <div className="flex items-center gap-2 text-white/80 font-medium text-sm">
                    <span className="w-8 h-[1px] bg-white/50" />
                    {dailyQuote.author}
                    <span className="w-8 h-[1px] bg-white/50" />
                  </div>

                  <div className="mt-8 flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
                    <button className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-colors">
                      <span className="material-symbols-outlined text-xl">favorite</span>
                    </button>
                    <button className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-colors">
                      <span className="material-symbols-outlined text-xl">share</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Categories List */}
          <div id="explore-section" className="pb-8 animate-slide-up" style={{ animationDelay: '700ms' }}>
            <div className="flex items-center gap-2 mb-4 px-1 mt-8">
              <span className="material-symbols-outlined text-primary text-xl">explore</span>
              <h2 className="font-serif font-bold text-text-primary text-lg">Explorar Todo</h2>
            </div>

            {searchQuery ? (
              <div className="grid grid-cols-1 gap-3">
                {filteredFeatures.map(feature => (
                  <FeatureCard key={feature.id} feature={feature} variant="compact" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <CategorySection
                  title="Esenciales"
                  icon="star"
                  features={categorizedFeatures.essential}
                  categoryId="essential"
                  count={categorizedFeatures.essential.length}
                />
                <CategorySection
                  title="Crear & Planear"
                  icon="palette"
                  features={categorizedFeatures.create}
                  categoryId="create"
                  count={categorizedFeatures.create.length}
                />
                <CategorySection
                  title="Social"
                  icon="group"
                  features={categorizedFeatures.social}
                  categoryId="social"
                  count={categorizedFeatures.social.length}
                />
                <CategorySection
                  title="Herramientas Avanzadas"
                  icon="science"
                  features={categorizedFeatures.advanced}
                  categoryId="advanced"
                  count={categorizedFeatures.advanced.length}
                />
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
};

export default HomeView;
