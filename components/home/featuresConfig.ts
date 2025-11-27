/**
 * Features Configuration
 * Configuración centralizada de todas las features del dashboard
 * Separada de HomeView para mejor mantenibilidad
 *
 * v2.0 - Reorganización con colores, badges dinámicos y mejor UX
 */

export type FeatureCategory = 'essential' | 'create' | 'social' | 'intelligence';

// Colores por categoría para mejor identificación visual
export const CATEGORY_COLORS: Record<FeatureCategory, { bg: string; text: string; border: string; gradient: string }> = {
  essential: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800',
    gradient: 'from-emerald-500 to-teal-500',
  },
  create: {
    bg: 'bg-violet-50 dark:bg-violet-900/20',
    text: 'text-violet-600 dark:text-violet-400',
    border: 'border-violet-200 dark:border-violet-800',
    gradient: 'from-violet-500 to-purple-500',
  },
  social: {
    bg: 'bg-pink-50 dark:bg-pink-900/20',
    text: 'text-pink-600 dark:text-pink-400',
    border: 'border-pink-200 dark:border-pink-800',
    gradient: 'from-pink-500 to-rose-500',
  },
  intelligence: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800',
    gradient: 'from-amber-500 to-orange-500',
  },
};

// Badges dinámicos
export type BadgeType = 'new' | 'popular' | 'ai' | 'premium' | 'beta';

export const BADGE_STYLES: Record<BadgeType, { bg: string; text: string; label: string }> = {
  new: { bg: 'bg-green-500', text: 'text-white', label: 'Nuevo' },
  popular: { bg: 'bg-orange-500', text: 'text-white', label: 'Popular' },
  ai: { bg: 'bg-gradient-to-r from-violet-500 to-purple-500', text: 'text-white', label: 'IA' },
  premium: { bg: 'bg-gradient-to-r from-amber-400 to-yellow-500', text: 'text-amber-900', label: 'Pro' },
  beta: { bg: 'bg-blue-500', text: 'text-white', label: 'Beta' },
};

export interface FeatureConfig {
  id: string;
  icon: string;
  title: string;
  description: string;
  category: FeatureCategory;
  keywords: string[];
  tooltip?: string;
  badge?: BadgeType;
  /** Handler key que mapea a las props de HomeView */
  handlerKey: string;
  /** Si la feature requiere condiciones especiales para mostrarse */
  conditional?: boolean;
  /** Destacar como función principal (card más grande) */
  featured?: boolean;
  /** Popularidad para ordenamiento (mayor = más popular) */
  popularity?: number;
}

export interface QuickActionConfig {
  id: string;
  icon: string;
  label: string;
  color: string;
  bg: string;
  handlerKey: string;
  ariaLabel: string;
}

// Configuración de features esenciales (las más usadas)
const ESSENTIAL_FEATURES: FeatureConfig[] = [
  {
    id: 'stylist',
    icon: 'auto_awesome',
    title: 'Estilista IA',
    description: 'Genera un look para cualquier ocasión',
    category: 'essential',
    keywords: ['outfit', 'look', 'estilista', 'generar', 'crear'],
    tooltip: 'La IA creará combinaciones perfectas usando las prendas de tu armario',
    handlerKey: 'onStartStylist',
    featured: true,
    popularity: 100,
    badge: 'popular',
  },
  {
    id: 'chat',
    icon: 'forum',
    title: 'Chat de Moda',
    description: 'Tu asistente personal de estilo 24/7',
    category: 'essential',
    keywords: ['chat', 'asistente', 'IA', 'hablar', 'preguntar'],
    tooltip: 'Preguntá sobre consejos de moda, combinaciones de colores y tendencias actuales',
    handlerKey: 'onStartChat',
    featured: true,
    popularity: 95,
    badge: 'ai',
  },
  {
    id: 'closet',
    icon: 'checkroom',
    title: 'Mi Armario',
    description: '{closetCount} prendas en tu colección',
    category: 'essential',
    keywords: ['armario', 'ropa', 'prendas', 'closet', 'guardarropa'],
    tooltip: 'Explorá, buscá y organizá todas tus prendas en un solo lugar',
    handlerKey: 'onNavigateToCloset',
    featured: true,
    popularity: 90,
  },
  {
    id: 'weather',
    icon: 'partly_cloudy_day',
    title: 'Outfit del Día',
    description: 'Basado en el clima actual de tu ciudad',
    category: 'essential',
    keywords: ['clima', 'tiempo', 'temperatura', 'outfit', 'día'],
    tooltip: 'Recibí sugerencias de outfits adaptados al clima actual y pronóstico',
    handlerKey: 'onStartWeatherOutfit',
    featured: true,
    popularity: 85,
  },
  {
    id: 'professional-profile',
    icon: 'face_retouching_natural',
    title: 'Perfil Profesional',
    description: 'Outfits personalizados con tu morfología y paleta',
    category: 'essential',
    keywords: ['perfil', 'profesional', 'morfología', 'colorimetría', 'personalizado', 'mejorado'],
    badge: 'new',
    handlerKey: 'onShowProfessionalWizard',
    conditional: true,
    popularity: 80,
  },
  {
    id: 'bulk-upload',
    icon: 'add_photo_alternate',
    title: 'Carga Múltiple',
    description: 'Agregá hasta 30 prendas a la vez con IA',
    category: 'essential',
    keywords: ['subir', 'cargar', 'múltiple', 'fotos', 'agregar'],
    tooltip: 'Subí varias fotos simultáneamente y la IA analizará todas automáticamente',
    handlerKey: 'onStartBulkUpload',
    popularity: 75,
    badge: 'ai',
  },
];

// Configuración de features de creación (herramientas creativas)
const CREATE_FEATURES: FeatureConfig[] = [
  {
    id: 'virtual-tryon',
    icon: 'view_in_ar',
    title: 'Probador Virtual',
    description: 'Probate outfits con tu cámara antes de vestirte',
    category: 'create',
    keywords: ['probador', 'virtual', 'vestir', 'probar', 'cámara'],
    tooltip: 'Probate outfits virtualmente usando tu cámara antes de vestirte',
    handlerKey: 'onStartVirtualTryOn',
    popularity: 88,
    badge: 'ai',
  },
  {
    id: 'smart-packer',
    icon: 'luggage',
    title: 'Maleta Inteligente',
    description: 'Prepara tu equipaje para cualquier viaje',
    category: 'create',
    keywords: ['maleta', 'viaje', 'equipaje', 'packer', 'viajar'],
    tooltip: 'Generá listas de viaje personalizadas según destino, clima y actividades',
    handlerKey: 'onStartSmartPacker',
    popularity: 82,
  },
  {
    id: 'ai-designer',
    icon: 'brush',
    title: 'AI Fashion Designer',
    description: 'Diseña prendas únicas con inteligencia artificial',
    category: 'create',
    keywords: ['diseñar', 'crear', 'personalizar', 'IA', 'diseño'],
    handlerKey: 'onStartAIDesigner',
    popularity: 78,
    badge: 'ai',
  },
  {
    id: 'lookbook',
    icon: 'auto_stories',
    title: 'Lookbook Creator',
    description: 'Crea álbumes temáticos con tus mejores looks',
    category: 'create',
    keywords: ['lookbook', 'colección', 'álbum', 'temático'],
    handlerKey: 'onStartLookbookCreator',
    popularity: 70,
  },
  {
    id: 'capsule',
    icon: 'grid_view',
    title: 'Capsule Wardrobe',
    description: 'Arma una cápsula minimalista y versátil',
    category: 'create',
    keywords: ['cápsula', 'minimalista', 'esencial', 'versátil'],
    handlerKey: 'onStartCapsuleBuilder',
    popularity: 68,
  },
  {
    id: 'calendar',
    icon: 'calendar_month',
    title: 'Planificador Semanal',
    description: 'Outfits basados en tus próximos eventos',
    category: 'create',
    keywords: ['calendario', 'eventos', 'planear', 'agenda', 'semana'],
    handlerKey: 'onStartCalendarSync',
    popularity: 65,
  },
  {
    id: 'generation-history',
    icon: 'collections',
    title: 'Mis Diseños AI',
    description: 'Galería de prendas que creaste con IA',
    category: 'create',
    keywords: ['galería', 'historial', 'generaciones', 'IA', 'diseños'],
    handlerKey: 'onShowGenerationHistory',
    popularity: 60,
  },
  {
    id: 'ratings',
    icon: 'thumb_up',
    title: 'Calificar Outfits',
    description: 'Votá tus looks y descubrí los mejores',
    category: 'create',
    keywords: ['calificar', 'rating', 'votar', 'evaluar', 'mejores'],
    handlerKey: 'onStartRatingView',
    popularity: 55,
  },
];

// Configuración de features sociales (comunidad y amigos)
const SOCIAL_FEATURES: FeatureConfig[] = [
  {
    id: 'activity-feed',
    icon: 'dynamic_feed',
    title: 'Feed de Amigos',
    description: 'Descubrí looks y actividad de tu comunidad',
    category: 'social',
    keywords: ['feed', 'actividad', 'red', 'amigos', 'social', 'looks'],
    tooltip: 'Mirá los outfits, desafíos y actividades de tus amigos en tiempo real',
    handlerKey: 'onStartActivityFeed',
    popularity: 75,
  },
  {
    id: 'multiplayer',
    icon: 'swords',
    title: 'Desafíos vs Amigos',
    description: 'Competí con amigos en batallas de estilo',
    category: 'social',
    keywords: ['desafíos', 'competir', 'multiplayer', 'amigos', 'versus', 'batalla'],
    handlerKey: 'onStartMultiplayerChallenges',
    popularity: 72,
    badge: 'popular',
  },
  {
    id: 'style-challenges',
    icon: 'military_tech',
    title: 'Retos Creativos',
    description: 'Completá desafíos de moda y ganá puntos',
    category: 'social',
    keywords: ['desafíos', 'retos', 'creativos', 'puntos', 'completar'],
    handlerKey: 'onStartStyleChallenges',
    popularity: 68,
  },
  {
    id: 'community',
    icon: 'groups',
    title: 'Explorar Comunidad',
    description: 'Descubrí estilos de otros usuarios',
    category: 'social',
    keywords: ['comunidad', 'explorar', 'usuarios', 'estilos', 'inspiración'],
    handlerKey: 'onNavigateToCommunity',
    popularity: 65,
  },
];

// Configuración de features de inteligencia (análisis con IA)
const INTELLIGENCE_FEATURES: FeatureConfig[] = [
  {
    id: 'style-dna',
    icon: 'fingerprint',
    title: 'Tu ADN de Estilo',
    description: 'Descubrí tu perfil de estilo único',
    category: 'intelligence',
    keywords: ['DNA', 'ADN', 'perfil', 'estilo', 'único', 'personalidad'],
    handlerKey: 'onStartStyleDNA',
    popularity: 80,
    badge: 'ai',
  },
  {
    id: 'virtual-shopping',
    icon: 'storefront',
    title: 'Asistente de Compras',
    description: 'Sugerencias inteligentes de qué comprar',
    category: 'intelligence',
    keywords: ['compras', 'shopping', 'asistente', 'sugerencias', 'comprar'],
    handlerKey: 'onStartVirtualShopping',
    popularity: 78,
    badge: 'ai',
  },
  {
    id: 'gap-analysis',
    icon: 'search_insights',
    title: 'Análisis de Gaps',
    description: 'Descubrí qué prendas te faltan',
    category: 'intelligence',
    keywords: ['gaps', 'faltan', 'análisis', 'armario', 'falta'],
    handlerKey: 'onStartGapAnalysis',
    popularity: 72,
  },
  {
    id: 'feedback',
    icon: 'psychology',
    title: 'Análisis de Preferencias',
    description: 'Entendé tus gustos de estilo',
    category: 'intelligence',
    keywords: ['feedback', 'análisis', 'preferencias', 'insights', 'gustos'],
    handlerKey: 'onStartFeedbackAnalysis',
    popularity: 70,
    badge: 'ai',
  },
  {
    id: 'brand-recognition',
    icon: 'sell',
    title: 'Detector de Marcas',
    description: 'Identificá marcas y precios estimados',
    category: 'intelligence',
    keywords: ['marca', 'precio', 'detector', 'identificar'],
    handlerKey: 'onStartBrandRecognition',
    popularity: 65,
    badge: 'ai',
  },
  {
    id: 'dupe-finder',
    icon: 'content_copy',
    title: 'Buscador de Dupes',
    description: 'Encontrá alternativas más económicas',
    category: 'intelligence',
    keywords: ['dupes', 'alternativas', 'baratas', 'similar', 'buscar'],
    handlerKey: 'onStartDupeFinder',
    popularity: 62,
  },
  {
    id: 'evolution',
    icon: 'trending_up',
    title: 'Tu Evolución de Estilo',
    description: 'Mirá cómo cambió tu estilo en el tiempo',
    category: 'intelligence',
    keywords: ['evolución', 'timeline', 'historia', 'cambio', 'tiempo'],
    handlerKey: 'onStartStyleEvolution',
    popularity: 58,
  },
];

// Exportar todas las features combinadas y ordenadas por popularidad
export const ALL_FEATURES: FeatureConfig[] = [
  ...ESSENTIAL_FEATURES,
  ...CREATE_FEATURES,
  ...SOCIAL_FEATURES,
  ...INTELLIGENCE_FEATURES,
].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

// Features destacadas (para mostrar más grandes)
export const FEATURED_FEATURES = ALL_FEATURES.filter(f => f.featured);

// Helper para obtener features por categoría con orden
export function getFeaturesByCategory(category: FeatureCategory): FeatureConfig[] {
  return ALL_FEATURES.filter(f => f.category === category);
}

// Configuración de acciones rápidas con accesibilidad mejorada
export const QUICK_ACTIONS: QuickActionConfig[] = [
  {
    id: 'chat',
    icon: 'chat_bubble',
    label: 'Chat IA',
    color: 'text-purple-500',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    handlerKey: 'onStartChat',
    ariaLabel: 'Abrir chat con asistente de moda IA',
  },
  {
    id: 'stylist',
    icon: 'auto_awesome',
    label: 'Estilista',
    color: 'text-primary',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    handlerKey: 'onStartStylist',
    ariaLabel: 'Generar outfit con estilista IA',
  },
  {
    id: 'closet',
    icon: 'checkroom',
    label: 'Armario',
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    handlerKey: 'onNavigateToCloset',
    ariaLabel: 'Ver mi armario de prendas',
  },
  {
    id: 'packer',
    icon: 'luggage',
    label: 'Maleta',
    color: 'text-teal-500',
    bg: 'bg-teal-50 dark:bg-teal-900/20',
    handlerKey: 'onStartSmartPacker',
    ariaLabel: 'Preparar maleta inteligente para viaje',
  },
  {
    id: 'lookbook',
    icon: 'photo_library',
    label: 'Lookbook',
    color: 'text-violet-500',
    bg: 'bg-violet-50 dark:bg-violet-900/20',
    handlerKey: 'onStartLookbookCreator',
    ariaLabel: 'Crear lookbook temático',
  },
  {
    id: 'rate',
    icon: 'swipe',
    label: 'Calificar',
    color: 'text-pink-500',
    bg: 'bg-pink-50 dark:bg-pink-900/20',
    handlerKey: 'onStartRatingView',
    ariaLabel: 'Calificar mis outfits',
  },
  {
    id: 'tryon',
    icon: 'photo_camera',
    label: 'Probar IA',
    color: 'text-indigo-500',
    bg: 'bg-indigo-50 dark:bg-indigo-900/20',
    handlerKey: 'onStartVirtualTryOn',
    ariaLabel: 'Probador virtual con cámara',
  },
  {
    id: 'weather',
    icon: 'sunny',
    label: 'Del Día',
    color: 'text-orange-500',
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    handlerKey: 'onStartWeatherOutfit',
    ariaLabel: 'Ver outfit recomendado según el clima',
  },
];

// Configuración de tabs con iconos, colores y accesibilidad
export const FEATURE_TABS = [
  { id: 'all', label: 'Todos', icon: 'apps', ariaLabel: 'Ver todas las funciones', color: 'text-gray-600 dark:text-gray-400' },
  { id: 'essential', label: 'Inicio', icon: 'home', ariaLabel: 'Ver funciones esenciales', color: 'text-emerald-600 dark:text-emerald-400' },
  { id: 'create', label: 'Crear', icon: 'palette', ariaLabel: 'Ver funciones de creación', color: 'text-violet-600 dark:text-violet-400' },
  { id: 'social', label: 'Social', icon: 'groups', ariaLabel: 'Ver funciones sociales', color: 'text-pink-600 dark:text-pink-400' },
  { id: 'intelligence', label: 'IA', icon: 'neurology', ariaLabel: 'Ver funciones de inteligencia artificial', color: 'text-amber-600 dark:text-amber-400' },
] as const;

export type FeatureTabId = typeof FEATURE_TABS[number]['id'];

// Helper para buscar features
export function searchFeatures(features: FeatureConfig[], query: string): FeatureConfig[] {
  if (!query.trim()) return features;

  const normalizedQuery = query.toLowerCase();
  return features.filter(feature =>
    feature.title.toLowerCase().includes(normalizedQuery) ||
    feature.description.toLowerCase().includes(normalizedQuery) ||
    feature.keywords.some(kw => kw.includes(normalizedQuery))
  );
}

// Helper para filtrar por categoría
export function filterByCategory(features: FeatureConfig[], category: FeatureTabId): FeatureConfig[] {
  if (category === 'all') return features;
  return features.filter(f => f.category === category);
}
