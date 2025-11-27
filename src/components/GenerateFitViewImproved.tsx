import React, { useState, useMemo, useEffect } from 'react';

interface ClothingItem {
  id: string;
  imageDataUrl: string;
  metadata: {
    category: 'top' | 'bottom' | 'shoes' | 'accessory' | 'outerwear';
    subcategory: string;
    color_primary: string;
    vibe_tags: string[];
    seasons: string[];
  };
}

interface GenerateFitViewImprovedProps {
  onGenerate: (prompt: string, mood?: string, category?: string) => void;
  onBack: () => void;
  isGenerating: boolean;
  error: string | null;
  closet: ClothingItem[];
  recentSearches?: string[];
}

type CategoryType = 'Casual' | 'Formal' | 'Deportivo' | 'Fiesta' | 'Trabajo';
type MoodType = 'happy' | 'professional' | 'relaxed' | 'bold';

const CATEGORIES: { value: CategoryType; icon: string; color: string }[] = [
  { value: 'Casual', icon: 'psychiatry', color: 'from-blue-500 to-cyan-500' },
  { value: 'Formal', icon: 'work', color: 'from-gray-700 to-gray-900' },
  { value: 'Deportivo', icon: 'directions_run', color: 'from-green-500 to-emerald-600' },
  { value: 'Fiesta', icon: 'celebration', color: 'from-pink-500 to-rose-600' },
  { value: 'Trabajo', icon: 'business_center', color: 'from-purple-500 to-violet-600' },
];

const MOODS: { value: MoodType; label: string; emoji: string; gradient: string }[] = [
  { value: 'happy', label: 'Feliz', emoji: '😊', gradient: 'from-yellow-400 to-orange-500' },
  { value: 'professional', label: 'Profesional', emoji: '💼', gradient: 'from-blue-500 to-indigo-600' },
  { value: 'relaxed', label: 'Relajado', emoji: '😌', gradient: 'from-green-400 to-teal-500' },
  { value: 'bold', label: 'Audaz', emoji: '🔥', gradient: 'from-red-500 to-pink-600' },
];

const CATEGORY_PROMPTS: Record<CategoryType, string> = {
  Casual: 'un outfit casual y cómodo para el día a día',
  Formal: 'un outfit formal y elegante para una ocasión especial',
  Deportivo: 'un outfit deportivo y funcional para actividades físicas',
  Fiesta: 'un outfit de fiesta llamativo y festivo',
  Trabajo: 'un outfit profesional apropiado para el trabajo',
};

const MOOD_PROMPTS: Record<MoodType, string> = {
  happy: 'con colores alegres y vibrantes',
  professional: 'con un estilo sobrio y profesional',
  relaxed: 'con una vibe relajada y confortable',
  bold: 'con combinaciones audaces y statement pieces',
};

const GenerateFitViewImproved: React.FC<GenerateFitViewImprovedProps> = ({
  onGenerate,
  onBack,
  isGenerating,
  error,
  closet,
  recentSearches = [],
}) => {
  const [activeTab, setActiveTab] = useState<CategoryType>('Casual');
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Analizando tu armario...');

  const closetStats = useMemo(() => {
    const stats = {
      tops: 0,
      bottoms: 0,
      shoes: 0,
      accessories: 0,
      outerwear: 0,
    };

    closet.forEach((item) => {
      if (item.metadata.category === 'top') stats.tops++;
      else if (item.metadata.category === 'bottom') stats.bottoms++;
      else if (item.metadata.category === 'shoes') stats.shoes++;
      else if (item.metadata.category === 'accessory') stats.accessories++;
      else if (item.metadata.category === 'outerwear') stats.outerwear++;
    });

    return stats;
  }, [closet]);

  const timeOfDay = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return { label: 'Buenos días', icon: '🌅', gradient: 'from-orange-400 to-yellow-500' };
    if (hour < 18) return { label: 'Buenas tardes', icon: '☀️', gradient: 'from-blue-400 to-cyan-500' };
    return { label: 'Buenas noches', icon: '🌙', gradient: 'from-indigo-500 to-purple-600' };
  }, []);

  useEffect(() => {
    if (!isGenerating) {
      setLoadingMessage('Analizando tu armario...');
      return;
    }

    const messages = [
      'Analizando tu armario...',
      'Combinando prendas perfectas...',
      'Creando tu outfit ideal...',
      'Agregando los toques finales...',
    ];

    let messageIndex = 0;
    const interval = setInterval(() => {
      messageIndex = (messageIndex + 1) % messages.length;
      setLoadingMessage(messages[messageIndex]);
    }, 1500);

    return () => clearInterval(interval);
  }, [isGenerating]);

  const handleGenerate = () => {
    let finalPrompt = '';

    if (customPrompt.trim()) {
      finalPrompt = customPrompt.trim();
    } else {
      finalPrompt = `Genera ${CATEGORY_PROMPTS[activeTab]}`;
      if (selectedMood) {
        finalPrompt += ` ${MOOD_PROMPTS[selectedMood]}`;
      }
    }

    onGenerate(finalPrompt, selectedMood || undefined, activeTab);
  };

  const handleSurpriseMe = () => {
    const randomCategory = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)].value;
    const randomMood = MOODS[Math.floor(Math.random() * MOODS.length)].value;

    const prompt = `Genera ${CATEGORY_PROMPTS[randomCategory]} ${MOOD_PROMPTS[randomMood]}`;
    onGenerate(prompt, randomMood, randomCategory);
  };

  const handleRecentSearch = (search: string) => {
    setCustomPrompt(search);
  };

  const activeCategory = CATEGORIES.find(c => c.value === activeTab);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in overflow-hidden">
      {/* Background with Iridescent Effect */}
      <div className="absolute inset-0 bg-gray-50 dark:bg-gray-900 transition-colors duration-500"></div>
      <div className="absolute inset-0 opacity-60 dark:opacity-40 iridescent-gradient"></div>
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>

      {/* Main Card */}
      <div className="relative w-full max-w-2xl liquid-glass shadow-2xl max-h-[90vh] overflow-hidden flex flex-col animate-scale-in">

        {/* Premium Header */}
        <div className="relative z-10">
          <div className="bg-white/40 dark:bg-gray-900/40 border-b border-white/20 dark:border-gray-700/30 px-6 py-5 backdrop-blur-md">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <button
                  onClick={onBack}
                  className="w-10 h-10 rounded-full bg-white/50 dark:bg-gray-800/50 hover:bg-white/80 dark:hover:bg-gray-700/80 flex items-center justify-center transition-all active:scale-95 shadow-sm border border-white/40 group"
                >
                  <span className="material-symbols-outlined text-xl text-gray-700 dark:text-gray-200 group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white font-serif tracking-tight">
                      Estilista <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">AI</span>
                    </h2>
                    <div className={`px-2.5 py-0.5 rounded-full bg-gradient-to-r ${timeOfDay.gradient} flex items-center gap-1.5 shadow-sm ring-1 ring-white/50`}>
                      <span className="text-xs">{timeOfDay.icon}</span>
                      <span className="text-[10px] font-bold text-white tracking-wide uppercase">{timeOfDay.label}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1 tracking-wide">
                    {closet.length} prendas disponibles para combinar
                  </p>
                </div>
              </div>
              <button
                onClick={handleSurpriseMe}
                disabled={isGenerating || closet.length === 0}
                className="px-4 py-2 bg-white/50 dark:bg-gray-800/50 hover:bg-white/80 dark:hover:bg-gray-700/80 rounded-full text-sm font-semibold text-purple-700 dark:text-purple-300 shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95 border border-white/40 backdrop-blur-sm group"
              >
                <span className="material-symbols-outlined text-xl group-hover:rotate-180 transition-transform duration-500">auto_awesome</span>
                <span>Sorpréndeme</span>
              </button>
            </div>

            {/* Elegant Stats */}
            <div className="flex justify-between gap-2 px-1">
              {[
                { count: closetStats.tops, label: 'Tops', icon: 'checkroom' },
                { count: closetStats.bottoms, label: 'Bottoms', icon: 'dresser' },
                { count: closetStats.shoes, label: 'Calzado', icon: 'steps' },
                { count: closetStats.accessories, label: 'Accesorios', icon: 'diamond' },
                { count: closetStats.outerwear, label: 'Abrigos', icon: 'apparel' },
              ].map((stat, i) => (
                <div key={i} className="flex flex-col items-center gap-1 group cursor-default">
                  <div className="w-10 h-10 rounded-2xl bg-white/40 dark:bg-gray-800/40 flex items-center justify-center shadow-sm border border-white/30 group-hover:scale-110 transition-transform duration-300 group-hover:bg-white/60 dark:group-hover:bg-gray-700/60">
                    <span className="material-symbols-outlined text-lg text-gray-600 dark:text-gray-300 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      {stat.icon}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{stat.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-white/30 dark:bg-black/10 backdrop-blur-sm custom-scrollbar">

          {/* Category Selection */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
              <span className="w-1 h-4 bg-purple-500 rounded-full"></span>
              Ocasión
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {CATEGORIES.map((category) => (
                <button
                  key={category.value}
                  onClick={() => setActiveTab(category.value)}
                  className={`group relative overflow-hidden p-4 rounded-2xl transition-all duration-300 border ${activeTab === category.value
                    ? 'bg-white dark:bg-gray-800 shadow-lg border-purple-200 dark:border-purple-800 scale-[1.02]'
                    : 'bg-white/40 dark:bg-gray-800/40 hover:bg-white/60 dark:hover:bg-gray-700/60 border-white/30 dark:border-gray-600/30'
                    }`}
                >
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${category.color} opacity-10`}></div>
                  <div className="relative flex flex-col items-center gap-2">
                    <span className={`material-symbols-outlined text-2xl transition-colors duration-300 ${activeTab === category.value ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200'
                      }`}>
                      {category.icon}
                    </span>
                    <span className={`text-xs font-bold tracking-wide ${activeTab === category.value ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'
                      }`}>
                      {category.value}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Mood Selection */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
              <span className="w-1 h-4 bg-pink-500 rounded-full"></span>
              Vibe
            </h3>
            <div className="grid grid-cols-4 gap-3">
              {MOODS.map((mood) => (
                <button
                  key={mood.value}
                  onClick={() => setSelectedMood(selectedMood === mood.value ? null : mood.value)}
                  className={`group relative overflow-hidden p-3 rounded-2xl transition-all duration-300 border ${selectedMood === mood.value
                    ? 'bg-white dark:bg-gray-800 shadow-md border-pink-200 dark:border-pink-800 scale-105'
                    : 'bg-white/40 dark:bg-gray-800/40 hover:bg-white/60 dark:hover:bg-gray-700/60 border-white/30 dark:border-gray-600/30'
                    }`}
                >
                  <div className="relative text-center">
                    <div className={`text-2xl mb-2 transform transition-transform duration-300 ${selectedMood === mood.value ? 'scale-110' : 'group-hover:scale-110'
                      }`}>
                      {mood.emoji}
                    </div>
                    <p className={`text-[10px] font-bold uppercase tracking-wide ${selectedMood === mood.value ? 'text-pink-600 dark:text-pink-400' : 'text-gray-600 dark:text-gray-400'
                      }`}>
                      {mood.label}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Recientes</h3>
              <div className="flex gap-2 flex-wrap">
                {recentSearches.slice(0, 3).map((search, index) => (
                  <button
                    key={index}
                    onClick={() => handleRecentSearch(search)}
                    className="px-4 py-2 bg-white/40 dark:bg-gray-800/40 border border-white/30 dark:border-gray-600/30 text-gray-600 dark:text-gray-300 rounded-full text-xs font-medium hover:bg-white/60 hover:border-purple-300 transition-all hover:shadow-sm active:scale-95"
                  >
                    {search}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Advanced Toggle */}
          <div className="pt-2">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/40 dark:bg-gray-800/40 hover:bg-white/60 dark:hover:bg-gray-700/60 transition-all group border border-white/30 dark:border-gray-600/30"
            >
              <span className="text-sm font-bold text-gray-700 dark:text-gray-200 group-hover:text-purple-600 transition-colors flex items-center gap-2">
                <span className="material-symbols-outlined text-lg text-purple-500">tune</span>
                Configuración Avanzada
              </span>
              <span className={`material-symbols-outlined text-lg text-gray-400 transition-transform duration-300 ${showAdvanced ? 'rotate-180' : ''}`}>
                expand_more
              </span>
            </button>

            {/* Custom Prompt */}
            <div className={`grid transition-all duration-300 ease-in-out ${showAdvanced ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0'}`}>
              <div className="overflow-hidden">
                <div className="relative">
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Describe exactamente qué buscas (ej: 'Outfit para una entrevista de trabajo en verano')..."
                    className="w-full p-5 rounded-2xl border border-purple-100 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all resize-none shadow-inner backdrop-blur-sm outline-none"
                    rows={3}
                    disabled={isGenerating}
                  />
                  <div className="absolute bottom-3 right-3">
                    <span className="material-symbols-outlined text-gray-400 text-lg">edit</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50/90 dark:bg-red-900/30 border border-red-100 dark:border-red-800 rounded-2xl animate-shake backdrop-blur-sm shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-800/50 flex items-center justify-center text-red-500 dark:text-red-400 shrink-0">
                  <span className="material-symbols-outlined text-lg">error_outline</span>
                </div>
                <p className="text-sm text-red-700 dark:text-red-200 font-medium">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Premium CTA */}
        <div className="sticky bottom-0 p-6 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border-t border-white/40 dark:border-gray-700/40 z-20">
          <button
            onClick={handleGenerate}
            disabled={isGenerating || closet.length === 0}
            className="w-full py-4 rounded-2xl font-bold text-lg text-white shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 group relative overflow-hidden bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-[length:200%_auto] hover:bg-right transition-[background-position] duration-500"
          >
            <div className="relative flex items-center gap-2">
              {isGenerating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="tracking-wide font-medium">{loadingMessage}</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-2xl animate-pulse-glow">auto_awesome</span>
                  <span className="tracking-wide font-serif italic">Diseñar mi Outfit</span>
                </>
              )}
            </div>
          </button>

          {closet.length === 0 && (
            <p className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 mt-3 flex items-center justify-center gap-1">
              <span className="material-symbols-outlined text-sm">info</span>
              Necesitas agregar prendas a tu armario primero
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default GenerateFitViewImproved;
