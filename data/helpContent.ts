// Help Content - Complete guide for all app features
// This file contains all tooltips, help text, tutorials, and contextual guidance

export interface HelpItem {
  id: string;
  title: string;
  shortHelp: string; // Tooltip text (max 100 chars)
  fullHelp: string; // Detailed explanation
  tips?: string[]; // Pro tips
  steps?: string[]; // Step-by-step guide
  category: 'getting-started' | 'closet' | 'outfits' | 'ai-features' | 'social' | 'advanced';
  keywords: string[];
  videoUrl?: string;
  relatedFeatures?: string[];
}

export interface FAQ {
  question: string;
  answer: string;
  category: string;
}

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  targetSelector?: string; // CSS selector for highlight
  position: 'center' | 'top' | 'bottom' | 'left' | 'right';
  action?: {
    label: string;
    handler?: string; // Function name to call
  };
}

// ============================================
// FEATURE HELP CONTENT
// ============================================

export const featureHelp: Record<string, HelpItem> = {
  // ESSENTIAL FEATURES
  'chat': {
    id: 'chat',
    title: 'Chat de Moda con IA',
    shortHelp: 'Preguntale a la IA sobre moda, combinaciones y tendencias',
    fullHelp: 'Tu asistente personal de moda está disponible 24/7. Puede ayudarte con consejos de estilo, sugerencias de outfits, análisis de tu armario, y responder cualquier duda sobre moda.',
    tips: [
      'Sé específico en tus preguntas para obtener mejores respuestas',
      'Podés preguntar sobre colores que te favorecen según tu tono de piel',
      'Pedile que analice una prenda específica de tu armario',
      'Consultale sobre tendencias actuales para tu estilo'
    ],
    steps: [
      'Tocá el botón de Chat de Moda',
      'Escribí tu pregunta o consulta',
      'Esperá la respuesta de la IA',
      'Podés hacer preguntas de seguimiento'
    ],
    category: 'ai-features',
    keywords: ['chat', 'asistente', 'preguntar', 'IA', 'consejos'],
    relatedFeatures: ['stylist', 'style-dna']
  },

  'stylist': {
    id: 'stylist',
    title: 'Estilista IA',
    shortHelp: 'Generá outfits completos basados en ocasión, clima o mood',
    fullHelp: 'El Estilista IA analiza todas las prendas de tu armario y crea combinaciones perfectas. Considerá la ocasión, el clima, y tu estilo personal para sugerencias personalizadas.',
    tips: [
      'Describí la ocasión con detalle: "reunión de trabajo formal" es mejor que solo "trabajo"',
      'Mencioná el clima si es relevante',
      'Indicá si tenés preferencias de colores para ese día',
      'Probá diferentes descripciones para ver variedad de outfits'
    ],
    steps: [
      'Describí la ocasión o evento',
      'Opcionalmente agregá preferencias (colores, comodidad, formalidad)',
      'La IA analizará tu armario',
      'Recibirás una sugerencia completa de outfit'
    ],
    category: 'ai-features',
    keywords: ['outfit', 'generar', 'estilista', 'ocasión', 'combinación'],
    relatedFeatures: ['weather', 'virtual-tryon', 'ratings']
  },

  'closet': {
    id: 'closet',
    title: 'Mi Armario',
    shortHelp: 'Explorá, buscá y organizá todas tus prendas digitalizadas',
    fullHelp: 'Tu armario digital contiene todas las prendas que has subido. Podés buscar por tipo, color, temporada, y más. La IA usa esta información para crear outfits personalizados.',
    tips: [
      'Usá los filtros para encontrar prendas rápidamente',
      'Las prendas con más usos aparecen primero por defecto',
      'Tocá una prenda para ver todos sus detalles y outfits donde aparece',
      'Subí fotos con buena iluminación para mejor análisis de IA'
    ],
    steps: [
      'Navegá a "Mi Armario" desde el menú',
      'Usá la barra de búsqueda o filtros',
      'Tocá una prenda para ver detalles',
      'Desde ahí podés editar, eliminar o ver outfits'
    ],
    category: 'closet',
    keywords: ['armario', 'prendas', 'buscar', 'filtrar', 'organizar'],
    relatedFeatures: ['bulk-upload', 'gap-analysis']
  },

  'weather': {
    id: 'weather',
    title: 'Outfit del Día',
    shortHelp: 'Recibí sugerencias de outfit basadas en el clima actual',
    fullHelp: 'Esta función usa tu ubicación para obtener el clima actual y pronosticado. La IA considera temperatura, lluvia, humedad y viento para sugerirte el outfit más apropiado del día.',
    tips: [
      'Permitir la ubicación da resultados más precisos',
      'Se actualiza automáticamente con el pronóstico',
      'Ideal para planificar lo que usar cada mañana',
      'Considera también la actividad del día si la mencionás'
    ],
    steps: [
      'Permitir acceso a ubicación (opcional pero recomendado)',
      'Ver el clima actual de tu ciudad',
      'Recibir sugerencia de outfit adaptada',
      'Guardar o modificar la sugerencia'
    ],
    category: 'ai-features',
    keywords: ['clima', 'temperatura', 'outfit', 'día', 'pronóstico'],
    relatedFeatures: ['stylist', 'calendar']
  },

  'bulk-upload': {
    id: 'bulk-upload',
    title: 'Carga Múltiple',
    shortHelp: 'Subí hasta 30 prendas a la vez - la IA analiza todas automáticamente',
    fullHelp: 'Ahorrá tiempo subiendo múltiples fotos de una sola vez. La IA procesará cada imagen, identificando tipo de prenda, color, temporada, y más atributos automáticamente.',
    tips: [
      'Las fotos con fondo claro funcionan mejor',
      'Una prenda por foto da mejores resultados',
      'Podés revisar y editar los datos de cada prenda después',
      'El proceso puede tardar unos segundos por prenda'
    ],
    steps: [
      'Tocá "Carga Múltiple"',
      'Seleccioná hasta 30 fotos de tu galería',
      'Esperá mientras la IA analiza cada una',
      'Revisá y confirmá los datos de cada prenda',
      'Las prendas se agregarán a tu armario'
    ],
    category: 'closet',
    keywords: ['subir', 'fotos', 'múltiple', 'agregar', 'cargar'],
    relatedFeatures: ['closet', 'brand-recognition']
  },

  'virtual-tryon': {
    id: 'virtual-tryon',
    title: 'Probador Virtual',
    shortHelp: 'Probate outfits virtualmente usando tu cámara o una foto tuya',
    fullHelp: 'El Probador Virtual usa IA avanzada para mostrarte cómo te quedaría un outfit. Subí una foto tuya y la IA compondrá las prendas de manera realista.',
    tips: [
      'Usá una foto de cuerpo entero para mejores resultados',
      'La iluminación uniforme mejora la composición',
      'Funciona mejor con fotos de frente',
      'Podés guardar los resultados para comparar después'
    ],
    steps: [
      'Seleccioná o generá un outfit',
      'Tocá "Probador Virtual"',
      'Subí una foto tuya de cuerpo entero',
      'Esperá mientras la IA compone la imagen',
      'Guardá o compartí el resultado'
    ],
    category: 'ai-features',
    keywords: ['probador', 'virtual', 'foto', 'probar', 'vestir'],
    relatedFeatures: ['stylist', 'ai-designer']
  },

  'smart-packer': {
    id: 'smart-packer',
    title: 'Maleta Inteligente',
    shortHelp: 'Generá listas de viaje personalizadas según destino y actividades',
    fullHelp: 'Planificá tu equipaje de manera inteligente. Describí tu viaje (destino, duración, actividades) y la IA seleccionará las prendas más versátiles de tu armario, sugiriendo combinaciones para cada día.',
    tips: [
      'Mencioná todas las actividades planeadas',
      'Indicá si hay eventos formales',
      'Especificá la duración del viaje',
      'El sistema prioriza prendas versátiles'
    ],
    steps: [
      'Describí tu viaje (destino, días, actividades)',
      'La IA analizará tu armario',
      'Recibirás una lista de prendas esenciales',
      'Verás combinaciones sugeridas para cada día',
      'Podés ajustar y guardar la lista'
    ],
    category: 'ai-features',
    keywords: ['viaje', 'maleta', 'equipaje', 'packing', 'viajar'],
    relatedFeatures: ['capsule', 'weather']
  },

  'lookbook': {
    id: 'lookbook',
    title: 'Lookbook Creator',
    shortHelp: 'Creá colecciones temáticas con tus outfits favoritos',
    fullHelp: 'Organizá tus mejores looks en lookbooks temáticos. Perfecto para planificar temporadas, eventos, o simplemente guardar inspiración. Compartí tus lookbooks con amigos.',
    tips: [
      'Creá lookbooks por temporada',
      'Agrupá looks por tipo de evento',
      'Agregá notas a cada outfit',
      'Compartí con amigos para feedback'
    ],
    steps: [
      'Tocá "Lookbook Creator"',
      'Creá un nuevo lookbook con nombre y descripción',
      'Agregá outfits de tus guardados',
      'Organizá el orden arrastrando',
      'Compartí o exportá el lookbook'
    ],
    category: 'social',
    keywords: ['lookbook', 'colección', 'organizar', 'outfits', 'álbum'],
    relatedFeatures: ['ratings', 'community']
  },

  'style-challenges': {
    id: 'style-challenges',
    title: 'Desafíos de Estilo',
    shortHelp: 'Completá retos creativos y ganá puntos por tu creatividad',
    fullHelp: 'Los desafíos de estilo te proponen retos creativos semanales. Desde "solo prendas de un color" hasta "outfit de los 90s", cada desafío te ayuda a explorar tu armario de nuevas formas.',
    tips: [
      'Los desafíos cambian semanalmente',
      'Ganá puntos completando desafíos',
      'Compartí tus respuestas para más puntos',
      'Los desafíos difíciles dan más recompensas'
    ],
    steps: [
      'Mirá los desafíos activos',
      'Elegí uno que te inspire',
      'Creá un outfit que cumpla el reto',
      'Subí tu respuesta',
      'Recibí feedback y puntos'
    ],
    category: 'social',
    keywords: ['desafío', 'reto', 'puntos', 'creatividad', 'competir'],
    relatedFeatures: ['multiplayer', 'community']
  },

  'multiplayer': {
    id: 'multiplayer',
    title: 'Desafíos Multiplayer',
    shortHelp: 'Competí con amigos en desafíos de estilo en tiempo real',
    fullHelp: 'Enfrentate a tus amigos en desafíos de moda. Ambos reciben el mismo reto, crean su outfit, y la comunidad vota. Subí en el ranking y desbloqueá logros especiales.',
    tips: [
      'Invitá a amigos para desafíos directos',
      'Los votos de la comunidad deciden el ganador',
      'Mantené una racha para bonificaciones',
      'Los desafíos expiran en 24 horas'
    ],
    steps: [
      'Invitá a un amigo o aceptá un desafío',
      'Ambos crean un outfit para el mismo tema',
      'La comunidad vota por 24 horas',
      'El ganador recibe puntos y sube en el ranking'
    ],
    category: 'social',
    keywords: ['multiplayer', 'competir', 'amigos', 'votar', 'ranking'],
    relatedFeatures: ['style-challenges', 'community']
  },

  'ratings': {
    id: 'ratings',
    title: 'Calificaciones de Outfits',
    shortHelp: 'Calificá tus outfits y descubrí cuáles son tus mejores looks',
    fullHelp: 'Después de usar un outfit, calificalo del 1 al 5. La app aprenderá tus preferencias y te mostrará estadísticas de tus looks mejor valorados.',
    tips: [
      'Calificá outfits después de usarlos',
      'Considerá comodidad, estética y practicidad',
      'Tus mejores looks aparecen en sugerencias',
      'Las calificaciones mejoran las recomendaciones de IA'
    ],
    steps: [
      'Usá un outfit generado o guardado',
      'Volvé a la app y tocá "Calificar"',
      'Deslizá o tocá para dar estrellas',
      'Opcionalmente agregá un comentario',
      'Tus ratings mejoran futuras sugerencias'
    ],
    category: 'outfits',
    keywords: ['calificar', 'rating', 'estrellas', 'evaluar', 'votar'],
    relatedFeatures: ['feedback', 'stylist']
  },

  'feedback': {
    id: 'feedback',
    title: 'Análisis de Feedback',
    shortHelp: 'Descubrí patrones en tus preferencias de estilo',
    fullHelp: 'La IA analiza todas tus calificaciones y preferencias para mostrarte insights sobre tu estilo. Descubrí qué colores, combinaciones y estilos preferís más.',
    tips: [
      'Necesitás varias calificaciones para insights precisos',
      'Los insights se actualizan semanalmente',
      'Usá la información para mejorar tu guardarropa',
      'Compartí insights con estilistas profesionales'
    ],
    category: 'advanced',
    keywords: ['feedback', 'análisis', 'preferencias', 'insights', 'patrones'],
    relatedFeatures: ['ratings', 'style-dna']
  },

  'gap-analysis': {
    id: 'gap-analysis',
    title: 'Análisis de Gaps',
    shortHelp: 'Identificá qué prendas faltan en tu armario para más versatilidad',
    fullHelp: 'La IA analiza la distribución de tu armario y detecta qué prendas básicas o complementarias te faltan para tener un guardarropa más completo y versátil.',
    tips: [
      'Priorizá las sugerencias marcadas como "esenciales"',
      'Las gaps varían según tu estilo de vida',
      'No es necesario llenar todos los gaps',
      'Revisá periódicamente a medida que crece tu armario'
    ],
    steps: [
      'La IA analiza tu armario actual',
      'Verás categorías con gaps',
      'Cada gap incluye sugerencias específicas',
      'Tocá para buscar opciones de compra'
    ],
    category: 'advanced',
    keywords: ['gaps', 'faltan', 'armario', 'análisis', 'sugerencias'],
    relatedFeatures: ['dupe-finder', 'virtual-shopping']
  },

  'brand-recognition': {
    id: 'brand-recognition',
    title: 'Detector de Marca y Precio',
    shortHelp: 'La IA identifica marcas y estima precios de tus prendas',
    fullHelp: 'Subí una foto de una prenda y la IA intentará identificar la marca, estimar su precio de mercado, y darte información sobre el fabricante.',
    tips: [
      'Fotos de etiquetas mejoran la precisión',
      'Funciona mejor con marcas reconocidas',
      'Los precios son estimaciones de mercado',
      'Útil para calcular el valor de tu armario'
    ],
    steps: [
      'Seleccioná una prenda o subí una foto nueva',
      'La IA analiza patrones y etiquetas visibles',
      'Verás la marca identificada (si es posible)',
      'Se muestra precio estimado de mercado'
    ],
    category: 'advanced',
    keywords: ['marca', 'precio', 'identificar', 'detector', 'valor'],
    relatedFeatures: ['dupe-finder', 'gap-analysis']
  },

  'dupe-finder': {
    id: 'dupe-finder',
    title: 'Buscador de Dupes',
    shortHelp: 'Encontrá alternativas más económicas a prendas de diseñador',
    fullHelp: 'Tenés una prenda que te gusta pero está fuera de presupuesto? El Dupe Finder busca alternativas similares a menor precio en tiendas online.',
    tips: [
      'Funciona mejor con prendas de diseñador conocidas',
      'Los resultados varían según disponibilidad',
      'Verificá tallas en cada tienda',
      'Los dupes no siempre tienen la misma calidad'
    ],
    steps: [
      'Seleccioná una prenda cara que te guste',
      'La IA analiza su estilo y características',
      'Recibís alternativas más económicas',
      'Tocá para ver en tiendas online'
    ],
    category: 'advanced',
    keywords: ['dupes', 'alternativas', 'económico', 'similar', 'buscar'],
    relatedFeatures: ['brand-recognition', 'virtual-shopping']
  },

  'capsule': {
    id: 'capsule',
    title: 'Capsule Wardrobe',
    shortHelp: 'Creá un armario cápsula minimalista con prendas versátiles',
    fullHelp: 'Un armario cápsula contiene prendas esenciales que combinan entre sí. La IA selecciona las mejores prendas de tu armario para crear una colección minimalista pero versátil.',
    tips: [
      'Ideal para viajes o temporadas específicas',
      'Las prendas neutras funcionan mejor',
      'Empezá con 20-30 prendas base',
      'Podés crear múltiples cápsulas para diferentes ocasiones'
    ],
    steps: [
      'Elegí el propósito de la cápsula',
      'Indicá cantidad de prendas deseada',
      'La IA selecciona las más versátiles',
      'Revisá y ajustá la selección',
      'Guardá tu cápsula para referencia'
    ],
    category: 'advanced',
    keywords: ['cápsula', 'minimalista', 'versátil', 'esencial', 'wardrobe'],
    relatedFeatures: ['smart-packer', 'gap-analysis']
  },

  'style-dna': {
    id: 'style-dna',
    title: 'Style DNA Profile',
    shortHelp: 'Descubrí tu ADN de estilo único basado en tu armario',
    fullHelp: 'La IA analiza todo tu armario, calificaciones y preferencias para crear tu perfil de Style DNA. Descubrí tu arquetipo de estilo, colores dominantes, y patrones únicos.',
    tips: [
      'Más prendas = perfil más preciso',
      'Se actualiza a medida que usás la app',
      'Compartilo en redes sociales',
      'Usalo para guiar futuras compras'
    ],
    steps: [
      'La IA analiza todo tu armario',
      'Se consideran tus calificaciones y uso',
      'Recibirás tu perfil de Style DNA',
      'Verás tu arquetipo, colores y patrones',
      'Descubrirás insights sobre tu estilo'
    ],
    category: 'advanced',
    keywords: ['DNA', 'ADN', 'perfil', 'estilo', 'personalidad'],
    relatedFeatures: ['feedback', 'evolution']
  },

  'evolution': {
    id: 'evolution',
    title: 'Style Evolution',
    shortHelp: 'Mirá cómo evolucionó tu estilo a lo largo del tiempo',
    fullHelp: 'Viajá en el tiempo para ver cómo cambió tu estilo. La app analiza tus outfits y compras a lo largo del tiempo para mostrar tu evolución de moda.',
    tips: [
      'Funciona mejor con uso prolongado de la app',
      'Agregá fechas a tus prendas para más precisión',
      'Mirá tendencias en colores y estilos',
      'Identificá cambios en tus preferencias'
    ],
    category: 'advanced',
    keywords: ['evolución', 'historia', 'timeline', 'cambio', 'progreso'],
    relatedFeatures: ['style-dna', 'feedback']
  },

  'ai-designer': {
    id: 'ai-designer',
    title: 'AI Fashion Designer',
    shortHelp: 'Diseñá prendas únicas personalizadas con inteligencia artificial',
    fullHelp: 'Describí la prenda de tus sueños y la IA la diseñará para vos. Podés especificar estilo, colores, materiales, y más. Las mejores creaciones pueden convertirse en prendas reales.',
    tips: [
      'Sé específico en la descripción',
      'Mencioná inspiraciones o referencias',
      'Probá diferentes estilos y épocas',
      'Guardá tus diseños favoritos'
    ],
    steps: [
      'Describí la prenda que imaginás',
      'Agregá detalles de estilo, color, material',
      'La IA genera varias opciones',
      'Elegí tu favorita',
      'Guardala en tu galería de diseños'
    ],
    category: 'ai-features',
    keywords: ['diseñar', 'crear', 'IA', 'personalizado', 'único'],
    relatedFeatures: ['virtual-tryon', 'generation-history']
  },

  'calendar': {
    id: 'calendar',
    title: 'Sincronización Calendario',
    shortHelp: 'Planificá outfits basados en tus próximos eventos del calendario',
    fullHelp: 'Conectá tu calendario y la app sugerirá outfits apropiados para cada evento. Una reunión de trabajo, una cita, un cumpleaños - cada ocasión tendrá su look perfecto.',
    tips: [
      'Conectá Google Calendar o iCal',
      'Los eventos con descripción dan mejores sugerencias',
      'Planificá la semana con anticipación',
      'Modificá sugerencias según tu mood del día'
    ],
    steps: [
      'Conectá tu calendario (Google/iCal)',
      'Verás tus próximos eventos',
      'La IA sugiere outfit para cada uno',
      'Aceptá, modificá o regenerá sugerencias',
      'Recibí recordatorios el día del evento'
    ],
    category: 'outfits',
    keywords: ['calendario', 'eventos', 'planificar', 'agenda', 'sincronizar'],
    relatedFeatures: ['weather', 'stylist']
  },

  'virtual-shopping': {
    id: 'virtual-shopping',
    title: 'Asistente de Compras',
    shortHelp: 'Recibí sugerencias personalizadas de compras basadas en tu armario',
    fullHelp: 'El asistente analiza tu armario, tus gaps, y tu estilo para recomendarte compras inteligentes. No más compras impulsivas que no combinan con nada.',
    tips: [
      'Usalo antes de ir de compras',
      'Las sugerencias se basan en tus gaps',
      'Filtrá por presupuesto',
      'Guardá items para comprar después'
    ],
    steps: [
      'El asistente analiza tu armario',
      'Verás recomendaciones personalizadas',
      'Cada sugerencia muestra con qué combina',
      'Filtrá por precio, tienda, o tipo',
      'Guardá o comprá directamente'
    ],
    category: 'advanced',
    keywords: ['compras', 'shopping', 'sugerencias', 'recomendaciones'],
    relatedFeatures: ['gap-analysis', 'dupe-finder']
  },

  'feed': {
    id: 'feed',
    title: 'Feed de Amigos',
    shortHelp: 'Mirá los outfits y actividad de tus amigos en tiempo real',
    fullHelp: 'Mantenete conectado con tu comunidad de moda. Mirá los outfits que publican tus amigos, sus logros en desafíos, y descubrí nueva inspiración.',
    tips: [
      'Seguí a personas con estilos que te inspiran',
      'Dale like y comentá para más interacción',
      'Tus publicaciones aparecen en feeds de amigos',
      'Filtrá por tipo de contenido'
    ],
    category: 'social',
    keywords: ['feed', 'amigos', 'social', 'comunidad', 'seguir'],
    relatedFeatures: ['community', 'multiplayer']
  },

  'community': {
    id: 'community',
    title: 'Comunidad',
    shortHelp: 'Explorá estilos de otros usuarios y encontrá inspiración',
    fullHelp: 'Navegá por la comunidad para descubrir nuevos estilos, seguir usuarios con gustos similares, y participar en conversaciones de moda.',
    tips: [
      'Usá filtros para encontrar tu nicho',
      'Participá en conversaciones',
      'Compartí tus mejores looks',
      'Seguí perfiles que te inspiren'
    ],
    category: 'social',
    keywords: ['comunidad', 'explorar', 'usuarios', 'inspiración', 'social'],
    relatedFeatures: ['feed', 'style-challenges']
  },

  'generation-history': {
    id: 'generation-history',
    title: 'Mis Diseños AI',
    shortHelp: 'Galería de todas las prendas que diseñaste con IA',
    fullHelp: 'Accedé a tu historial completo de prendas diseñadas con el AI Fashion Designer. Revisá, editá, o agregá diseños a tu armario virtual.',
    tips: [
      'Organizá por fecha o tipo',
      'Agregá tus favoritos al armario',
      'Descargá imágenes en alta calidad',
      'Compartí en redes sociales'
    ],
    category: 'closet',
    keywords: ['galería', 'historial', 'diseños', 'IA', 'generados'],
    relatedFeatures: ['ai-designer', 'closet']
  },

  'professional-profile': {
    id: 'professional-profile',
    title: 'Perfil Profesional',
    shortHelp: 'Activá outfits mejorados con tu morfología y colorimetría',
    fullHelp: 'Completá tu perfil profesional con información sobre tu tipo de cuerpo, colorimetría personal, y preferencias. Los outfits serán aún más personalizados.',
    tips: [
      'Completar el perfil mejora las sugerencias en un 40%',
      'Usá fotos recientes para mejor análisis',
      'Actualizá si cambiás de estilo de vida',
      'Los datos son privados y seguros'
    ],
    steps: [
      'Respondé preguntas sobre tu cuerpo y estilo',
      'Opcionalmente subí una foto para análisis',
      'La IA determina tu morfología',
      'Se calcula tu paleta de colores ideal',
      'Todas las sugerencias se personalizan'
    ],
    category: 'getting-started',
    keywords: ['perfil', 'morfología', 'colorimetría', 'profesional', 'personalizado'],
    relatedFeatures: ['style-dna', 'stylist']
  }
};

// ============================================
// TOOLTIPS FOR UI ELEMENTS
// ============================================

export const uiTooltips: Record<string, string> = {
  // Navigation
  'nav-home': 'Volver a la pantalla principal',
  'nav-closet': 'Ver y administrar tu armario',
  'nav-saved': 'Tus outfits guardados',
  'nav-profile': 'Tu perfil y configuración',
  'nav-community': 'Explorar la comunidad',

  // Actions
  'btn-add-item': 'Agregar una nueva prenda a tu armario',
  'btn-generate-outfit': 'Crear un nuevo outfit con IA',
  'btn-save-outfit': 'Guardar este outfit en tus favoritos',
  'btn-share': 'Compartir con amigos o en redes sociales',
  'btn-edit': 'Editar información de esta prenda',
  'btn-delete': 'Eliminar esta prenda permanentemente',
  'btn-try-on': 'Probar virtualmente este outfit',
  'btn-rate': 'Calificar este outfit',
  'btn-filter': 'Filtrar prendas por categoría, color, etc.',
  'btn-sort': 'Ordenar prendas por fecha, uso, o nombre',
  'btn-search': 'Buscar en tu armario',
  'btn-camera': 'Tomar foto con la cámara',
  'btn-gallery': 'Seleccionar de tu galería de fotos',

  // Cards and items
  'card-outfit': 'Tocá para ver detalles del outfit',
  'card-item': 'Tocá para ver detalles de la prenda',
  'card-challenge': 'Tocá para participar en este desafío',

  // Forms
  'input-occasion': 'Describí la ocasión (ej: reunión de trabajo, cita casual)',
  'input-mood': 'Tu mood o preferencia de estilo para hoy',
  'input-trip': 'Describí tu viaje (destino, duración, actividades)',
  'input-search': 'Buscá por nombre, color, tipo de prenda...',

  // Stats
  'stat-items': 'Total de prendas en tu armario',
  'stat-outfits': 'Outfits generados en total',
  'stat-streak': 'Días consecutivos usando la app',
  'stat-versatility': 'Qué tan versátil es esta prenda (más combinaciones posibles = mayor score)',

  // Settings
  'setting-notifications': 'Recibir notificaciones de sugerencias diarias',
  'setting-weather': 'Permitir acceso a ubicación para sugerencias por clima',
  'setting-privacy': 'Configurar quién puede ver tu perfil y outfits',
  'setting-theme': 'Cambiar entre modo claro y oscuro',

  // Empty states
  'empty-closet': 'Tu armario está vacío. Empezá subiendo tus primeras prendas.',
  'empty-outfits': 'No tenés outfits guardados. Generá uno y guardalo.',
  'empty-history': 'No hay historial aún. Usá la app para generar contenido.'
};

// ============================================
// FAQ - Preguntas Frecuentes
// ============================================

export const faqs: FAQ[] = [
  // Getting Started
  {
    question: '¿Cómo empiezo a usar la app?',
    answer: 'Lo primero es agregar tus prendas al armario. Podés tomar fotos individuales o usar la Carga Múltiple para subir varias a la vez. La IA analizará cada prenda automáticamente.',
    category: 'getting-started'
  },
  {
    question: '¿Necesito subir todas mis prendas?',
    answer: 'No es obligatorio, pero cuantas más prendas tengas, mejores serán las sugerencias de outfit. Te recomendamos empezar con tus favoritas y las que más usás.',
    category: 'getting-started'
  },
  {
    question: '¿La app funciona sin internet?',
    answer: 'Podés ver tu armario y outfits guardados sin internet, pero las funciones de IA (generar outfits, análisis, chat) requieren conexión.',
    category: 'getting-started'
  },

  // AI Features
  {
    question: '¿Cómo funciona el Estilista IA?',
    answer: 'El Estilista analiza todas tus prendas y usa IA avanzada para crear combinaciones que funcionan. Considera colores complementarios, estilos, ocasión, y tus preferencias anteriores.',
    category: 'ai-features'
  },
  {
    question: '¿Por qué a veces las sugerencias no me gustan?',
    answer: 'La IA aprende de tus calificaciones. Calificá cada outfit que usés para mejorar las futuras sugerencias. Con el tiempo, se adaptará más a tu gusto.',
    category: 'ai-features'
  },
  {
    question: '¿El Probador Virtual es realista?',
    answer: 'Usamos IA avanzada para composición de imágenes. Los resultados son orientativos - te dan una idea de cómo se vería el outfit, pero pueden variar del resultado real.',
    category: 'ai-features'
  },

  // Closet
  {
    question: '¿Cómo edito información de una prenda?',
    answer: 'Tocá la prenda en tu armario para ver detalles, luego tocá el botón "Editar". Podés cambiar categoría, color, temporada, y agregar notas.',
    category: 'closet'
  },
  {
    question: '¿Puedo eliminar una prenda?',
    answer: 'Sí, desde los detalles de la prenda tocá "Eliminar". Te pediremos confirmación porque es permanente.',
    category: 'closet'
  },
  {
    question: '¿Qué pasa si vendo o regalo una prenda?',
    answer: 'Te recomendamos eliminarla del armario para que no aparezca en futuras sugerencias. Así tus outfits siempre serán precisos.',
    category: 'closet'
  },

  // Social
  {
    question: '¿Quién puede ver mis outfits?',
    answer: 'Por defecto tus outfits son privados. Podés compartir específicos en la comunidad o con amigos. Configurá privacidad en tu perfil.',
    category: 'social'
  },
  {
    question: '¿Cómo funciona el sistema de puntos?',
    answer: 'Ganás puntos participando en desafíos, recibiendo likes, y usando la app regularmente. Los puntos desbloquean badges y funciones especiales.',
    category: 'social'
  },
  {
    question: '¿Puedo bloquear usuarios?',
    answer: 'Sí, desde el perfil de cualquier usuario podés bloquearlo. No verás su contenido y no podrá interactuar contigo.',
    category: 'social'
  },

  // Privacy & Data
  {
    question: '¿Mis fotos son privadas?',
    answer: 'Sí, todas tus fotos están encriptadas y almacenadas de forma segura. Solo vos podés verlas a menos que las compartas explícitamente.',
    category: 'privacy'
  },
  {
    question: '¿Puedo exportar mis datos?',
    answer: 'Sí, desde Configuración > Privacidad podés solicitar una copia de todos tus datos incluyendo fotos, outfits, y preferencias.',
    category: 'privacy'
  },
  {
    question: '¿Cómo elimino mi cuenta?',
    answer: 'En Configuración > Cuenta encontrás la opción de eliminar tu cuenta. Esto borrará todos tus datos permanentemente.',
    category: 'privacy'
  },

  // Technical
  {
    question: '¿Por qué tarda en cargar?',
    answer: 'Las funciones de IA procesan mucha información. Si tarda más de lo normal, verificá tu conexión a internet. También podés probar cerrar y abrir la app.',
    category: 'technical'
  },
  {
    question: '¿La app consume mucha batería?',
    answer: 'El uso normal es moderado. La cámara y las funciones de IA consumen más batería. Cerrá la app cuando no la uses para optimizar.',
    category: 'technical'
  },
  {
    question: '¿Puedo usar la app en tablet?',
    answer: 'Sí, la app está optimizada para tablets y muestra más contenido aprovechando la pantalla más grande.',
    category: 'technical'
  }
];

// ============================================
// ONBOARDING TOUR STEPS
// ============================================

export const onboardingTourSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: '¡Bienvenida a tu Armario Digital!',
    description: 'En 4 pasos vas a aprender a sacarle el máximo provecho a la app. ¿Lista?',
    icon: 'waving_hand',
    position: 'center'
  },
  {
    id: 'closet',
    title: 'Paso 1: Tu Armario',
    description: 'Acá viviran todas tus prendas. Subí fotos y la IA las analizará automáticamente.',
    icon: 'checkroom',
    targetSelector: '[data-tour="closet"]',
    position: 'bottom',
    action: {
      label: 'Subir mi primera prenda',
      handler: 'openAddItem'
    }
  },
  {
    id: 'stylist',
    title: 'Paso 2: Tu Estilista',
    description: 'Pedile un outfit para cualquier ocasión. La IA combinará tus prendas de manera perfecta.',
    icon: 'auto_awesome',
    targetSelector: '[data-tour="stylist"]',
    position: 'bottom',
    action: {
      label: 'Probar ahora',
      handler: 'openStylist'
    }
  },
  {
    id: 'features',
    title: 'Paso 3: Más Funciones',
    description: 'Chat con IA, Maleta Inteligente, Probador Virtual, y mucho más. Explorá todas las herramientas.',
    icon: 'apps',
    targetSelector: '[data-tour="features"]',
    position: 'top'
  },
  {
    id: 'ready',
    title: '¡Lista para empezar!',
    description: 'Ya tenés todo lo que necesitás. Si tenés dudas, tocá el icono de ayuda (?) en cualquier momento.',
    icon: 'rocket_launch',
    position: 'center',
    action: {
      label: 'Comenzar',
      handler: 'completeTour'
    }
  }
];

// ============================================
// CONTEXTUAL TIPS (shown at appropriate moments)
// ============================================

export interface ContextualTip {
  id: string;
  trigger: 'first-outfit' | 'empty-closet' | 'low-ratings' | 'streak' | 'new-feature' | 'idle';
  title: string;
  message: string;
  action?: {
    label: string;
    handler: string;
  };
  dismissable: boolean;
  showOnce: boolean;
}

export const contextualTips: ContextualTip[] = [
  {
    id: 'first-outfit',
    trigger: 'first-outfit',
    title: 'Tu primer outfit',
    message: 'Calificá este outfit después de usarlo. Eso ayuda a la IA a aprender tus gustos.',
    action: {
      label: 'Entendido',
      handler: 'dismiss'
    },
    dismissable: true,
    showOnce: true
  },
  {
    id: 'empty-closet',
    trigger: 'empty-closet',
    title: 'Armario vacío',
    message: 'Subí al menos 5 prendas para que la IA pueda crear buenos outfits.',
    action: {
      label: 'Subir prendas',
      handler: 'openBulkUpload'
    },
    dismissable: true,
    showOnce: false
  },
  {
    id: 'low-ratings',
    trigger: 'low-ratings',
    title: 'Mejoramos con tu feedback',
    message: 'Notamos que no te gustaron las últimas sugerencias. Probá ser más específico con la ocasión.',
    dismissable: true,
    showOnce: true
  },
  {
    id: 'streak-3',
    trigger: 'streak',
    title: '3 días seguidos',
    message: 'Vas muy bien con tu racha. Seguí así y desbloquearás badges especiales.',
    dismissable: true,
    showOnce: true
  },
  {
    id: 'try-chat',
    trigger: 'idle',
    title: '¿Sabías que...?',
    message: 'Podés chatear con la IA para consejos de moda personalizados. Preguntale lo que quieras.',
    action: {
      label: 'Probar chat',
      handler: 'openChat'
    },
    dismissable: true,
    showOnce: true
  },
  {
    id: 'try-professional',
    trigger: 'new-feature',
    title: 'Nuevo: Perfil Profesional',
    message: 'Completá tu perfil de morfología y colorimetría para outfits super personalizados.',
    action: {
      label: 'Completar perfil',
      handler: 'openProfessionalProfile'
    },
    dismissable: true,
    showOnce: true
  }
];

// ============================================
// ERROR MESSAGES (user-friendly)
// ============================================

export const errorMessages: Record<string, { title: string; message: string; action?: string }> = {
  'network-error': {
    title: 'Sin conexión',
    message: 'Parece que no tenés internet. Conectate y volvé a intentar.',
    action: 'Reintentar'
  },
  'ai-timeout': {
    title: 'La IA está ocupada',
    message: 'Hay mucha demanda en este momento. Esperá unos segundos y volvé a intentar.',
    action: 'Reintentar'
  },
  'image-too-large': {
    title: 'Imagen muy grande',
    message: 'La foto es demasiado grande. Probá con una de menor resolución.',
    action: 'Elegir otra'
  },
  'invalid-image': {
    title: 'Imagen no válida',
    message: 'No pudimos procesar esta imagen. Asegurate de que sea una foto clara de la prenda.',
    action: 'Elegir otra'
  },
  'closet-empty': {
    title: 'Armario vacío',
    message: 'Necesitás al menos 3 prendas para generar un outfit.',
    action: 'Agregar prendas'
  },
  'analysis-failed': {
    title: 'Error de análisis',
    message: 'No pudimos analizar la prenda. Probá con una foto más clara o diferente ángulo.',
    action: 'Reintentar'
  },
  'save-failed': {
    title: 'Error al guardar',
    message: 'No pudimos guardar los cambios. Verificá tu conexión e intentá de nuevo.',
    action: 'Reintentar'
  },
  'auth-required': {
    title: 'Iniciá sesión',
    message: 'Necesitás una cuenta para usar esta función.',
    action: 'Iniciar sesión'
  },
  'feature-locked': {
    title: 'Función Premium',
    message: 'Esta función está disponible en el plan premium.',
    action: 'Ver planes'
  },
  'general-error': {
    title: 'Algo salió mal',
    message: 'Ocurrió un error inesperado. Por favor, intentá de nuevo.',
    action: 'Reintentar'
  }
};

// ============================================
// LOADING MESSAGES (while AI processes)
// ============================================

export const loadingMessages: Record<string, string[]> = {
  'generate-outfit': [
    'Analizando tu armario...',
    'Buscando combinaciones perfectas...',
    'Considerando colores y estilos...',
    'Creando tu outfit ideal...',
    'Casi listo...'
  ],
  'analyze-item': [
    'Analizando la imagen...',
    'Identificando tipo de prenda...',
    'Detectando colores...',
    'Evaluando estilo y temporada...'
  ],
  'virtual-tryon': [
    'Preparando el probador...',
    'Procesando tu foto...',
    'Componiendo el outfit...',
    'Ajustando detalles...',
    'Renderizando resultado...'
  ],
  'smart-packer': [
    'Analizando tu viaje...',
    'Considerando el clima del destino...',
    'Seleccionando prendas versátiles...',
    'Creando combinaciones para cada día...'
  ],
  'style-dna': [
    'Analizando tu armario completo...',
    'Identificando patrones de estilo...',
    'Calculando tu perfil único...',
    'Generando tu Style DNA...'
  ],
  'chat': [
    'Pensando...',
    'Consultando mi base de conocimientos...',
    'Preparando mi respuesta...'
  ]
};

// ============================================
// SUCCESS MESSAGES
// ============================================

export const successMessages: Record<string, string> = {
  'item-added': 'Prenda agregada a tu armario',
  'outfit-saved': 'Outfit guardado en tus favoritos',
  'outfit-shared': 'Outfit compartido exitosamente',
  'profile-updated': 'Perfil actualizado',
  'settings-saved': 'Configuración guardada',
  'item-deleted': 'Prenda eliminada',
  'rating-saved': 'Gracias por tu calificación',
  'challenge-completed': 'Desafío completado',
  'challenge-joined': 'Te uniste al desafío'
};

// ============================================
// EMPTY STATE MESSAGES
// ============================================

export interface EmptyStateContent {
  icon: string;
  title: string;
  description: string;
  action?: {
    label: string;
    handler: string;
  };
  tips?: string[];
}

export const emptyStates: Record<string, EmptyStateContent> = {
  'closet': {
    icon: 'checkroom',
    title: 'Tu armario está vacío',
    description: 'Empezá subiendo tus prendas favoritas para que la IA pueda crear outfits increíbles.',
    action: {
      label: 'Agregar primera prenda',
      handler: 'openAddItem'
    },
    tips: [
      'Subí fotos con buena iluminación',
      'Una prenda por foto funciona mejor',
      'Podés subir hasta 30 fotos a la vez'
    ]
  },
  'saved-outfits': {
    icon: 'bookmark',
    title: 'No tenés outfits guardados',
    description: 'Cuando encuentres un outfit que te guste, tocá el corazón para guardarlo acá.',
    action: {
      label: 'Generar un outfit',
      handler: 'openStylist'
    }
  },
  'lookbooks': {
    icon: 'collections',
    title: 'Sin lookbooks todavía',
    description: 'Creá colecciones temáticas para organizar tus mejores looks.',
    action: {
      label: 'Crear lookbook',
      handler: 'openLookbookCreator'
    }
  },
  'challenges': {
    icon: 'emoji_events',
    title: 'No hay desafíos activos',
    description: 'Los nuevos desafíos se publican cada semana. Volvé pronto.',
    tips: [
      'Seguí a más usuarios para ver sus desafíos',
      'Activá notificaciones para no perderte ninguno'
    ]
  },
  'search-results': {
    icon: 'search_off',
    title: 'Sin resultados',
    description: 'No encontramos nada con esos términos. Probá buscar de otra manera.',
    tips: [
      'Usá términos más generales',
      'Probá buscando por color',
      'Revisá que no haya errores de tipeo'
    ]
  },
  'activity-feed': {
    icon: 'group',
    title: 'Tu feed está vacío',
    description: 'Seguí a otros usuarios para ver su actividad acá.',
    action: {
      label: 'Explorar comunidad',
      handler: 'openCommunity'
    }
  },
  'generation-history': {
    icon: 'palette',
    title: 'No hay diseños todavía',
    description: 'Usá el AI Fashion Designer para crear prendas únicas.',
    action: {
      label: 'Diseñar ahora',
      handler: 'openAIDesigner'
    }
  }
};

// ============================================
// KEYBOARD SHORTCUTS (for power users)
// ============================================

export const keyboardShortcuts = [
  { keys: ['/', 'Ctrl+K'], action: 'Buscar', description: 'Abre la búsqueda rápida' },
  { keys: ['N'], action: 'Nueva prenda', description: 'Agregar nueva prenda' },
  { keys: ['G'], action: 'Generar outfit', description: 'Abre el estilista IA' },
  { keys: ['C'], action: 'Chat', description: 'Abre el chat de moda' },
  { keys: ['H'], action: 'Home', description: 'Volver al inicio' },
  { keys: ['?'], action: 'Ayuda', description: 'Mostrar esta ayuda' },
  { keys: ['Esc'], action: 'Cerrar', description: 'Cerrar modal actual' }
];

// ============================================
// ACCESSIBILITY LABELS
// ============================================

export const a11yLabels: Record<string, string> = {
  'close-modal': 'Cerrar ventana',
  'open-menu': 'Abrir menú',
  'go-back': 'Volver atrás',
  'loading': 'Cargando contenido',
  'image-clothing': 'Foto de prenda',
  'image-outfit': 'Foto de outfit',
  'star-rating': 'Calificación con estrellas',
  'color-swatch': 'Muestra de color',
  'expand-section': 'Expandir sección',
  'collapse-section': 'Contraer sección',
  'play-video': 'Reproducir video',
  'pause-video': 'Pausar video',
  'volume-control': 'Control de volumen',
  'carousel-next': 'Siguiente imagen',
  'carousel-prev': 'Imagen anterior',
  'tab-selected': 'Pestaña seleccionada',
  'checkbox-checked': 'Casilla marcada',
  'checkbox-unchecked': 'Casilla sin marcar',
  'required-field': 'Campo obligatorio',
  'optional-field': 'Campo opcional',
  'error-message': 'Mensaje de error',
  'success-message': 'Mensaje de éxito',
  'notification': 'Notificación'
};
