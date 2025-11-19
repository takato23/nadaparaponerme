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
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-xl z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Main Card */}
      <div className="w-full max-w-2xl bg-gradient-to-br from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 rounded-3xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">

        {/* Premium Header */}
        <div className="relative overflow-hidden">
          {/* Animated Background Gradient */}
          <div className={`absolute inset-0 bg-gradient-to-r ${activeCategory?.color} opacity-10 animate-gradient`}></div>

          <div className="relative backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border-b border-gray-200/50 dark:border-gray-700/50 px-6 py-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={onBack}
                  className="p-2.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-all active:scale-95 group"
                >
                  <span className="material-symbols-outlined text-xl group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-primary via-purple-600 to-pink-600 bg-clip-text text-transparent">
                      Estilista IA
                    </h2>
                    <div className={`px-2 py-0.5 rounded-full bg-gradient-to-r ${timeOfDay.gradient} flex items-center gap-1`}>
                      <span className="text-xs">{timeOfDay.icon}</span>
                      <span className="text-[10px] font-bold text-white">{timeOfDay.label}</span>
                    </div>
                  </div>
                  <p className="text-xs text-text-secondary dark:text-gray-400 font-medium mt-1">
                    {closet.length} prendas disponibles · Powered by AI
                  </p>
                </div>
              </div>
              <button
                onClick={handleSurpriseMe}
                disabled={isGenerating || closet.length === 0}
                className="px-4 py-2.5 bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 text-white rounded-full text-sm font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                <span className="material-symbols-outlined text-lg relative">shuffle</span>
                <span className="relative">Sorpréndeme</span>
              </button>
            </div>

            {/* Compact Stats */}
            <div className="grid grid-cols-5 gap-2">
              {[
                { count: closetStats.tops, label: 'Tops', icon: 'checkroom', color: 'from-blue-500 to-cyan-500' },
                { count: closetStats.bottoms, label: 'Bottoms', icon: 'diamond', color: 'from-purple-500 to-pink-500' },
                { count: closetStats.shoes, label: 'Zapatos', icon: 'counter_1', color: 'from-green-500 to-emerald-500' },
                { count: closetStats.accessories, label: 'Acces.', icon: 'category', color: 'from-yellow-500 to-orange-500' },
                { count: closetStats.outerwear, label: 'Abrigos', icon: 'ac_unit', color: 'from-red-500 to-rose-500' },
              ].map((stat, i) => (
                <div key={i} className="group relative overflow-hidden rounded-xl bg-white/50 dark:bg-gray-800/50 p-2.5 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 hover:scale-105 transition-transform cursor-default">
                  <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-10 transition-opacity`}></div>
                  <div className="relative text-center">
                    <span className={`material-symbols-outlined text-lg mb-1 bg-gradient-to-br ${stat.color} bg-clip-text text-transparent`}>
                      {stat.icon}
                    </span>
                    <p className={`text-base font-bold bg-gradient-to-br ${stat.color} bg-clip-text text-transparent`}>{stat.count}</p>
                    <p className="text-[9px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking wider">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Category Pills - Premium Design */}
          <div>
            <h3 className="text-xs font-bold text-text-secondary dark:text-gray-400 uppercase tracking-wider mb-3 ml-1 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-primary">style</span>
              <span>Estilo</span>
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {CATEGORIES.map((category) => (
                <button
                  key={category.value}
                  onClick={() => setActiveTab(category.value)}
                  className={`group relative overflow-hidden p-4 rounded-2xl transition-all duration-300 ${activeTab === category.value
                      ? 'bg-gradient-to-br ' + category.color + ' shadow-lg scale-105'
                      : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-2 border-gray-100 dark:border-gray-700'
                    }`}
                >
                  {activeTab === category.value && (
                    <div className="absolute inset-0 bg-white/20 animate-pulse-slow"></div>
                  )}
                  <div className="relative flex flex-col items-center gap-2">
                    <span className={`material-symbols-outlined text-2xl ${activeTab === category.value ? 'text-white' : 'text-gray-600 dark:text-gray-400'
                      } group-hover:scale-110 transition-transform`}>
                      {category.icon}
                    </span>
                    <span className={`text-xs font-bold ${activeTab === category.value ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                      }`}>
                      {category.value}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Mood Selector - Enhanced */}
          <div>
            <h3 className="text-xs font-bold text-text-secondary dark:text-gray-400 uppercase tracking-wider mb-3 ml-1 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-primary">sentiment_satisfied</span>
              <span>¿Cómo te sientes?</span>
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {MOODS.map((mood) => (
                <button
                  key={mood.value}
                  onClick={() => setSelectedMood(selectedMood === mood.value ? null : mood.value)}
                  className={`group relative overflow-hidden p-3 rounded-2xl transition-all duration-300 ${selectedMood === mood.value
                      ? 'bg-gradient-to-br ' + mood.gradient + ' shadow-lg scale-105'
                      : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-2 border-gray-100 dark:border-gray-700'
                    }`}
                >
                  {selectedMood === mood.value && (
                    <div className="absolute inset-0 bg-white/10"></div>
                  )}
                  <div className="relative text-center">
                    <div className={`text-2xl mb-1 transform group-hover:scale-125 transition-transform ${selectedMood === mood.value ? 'animate-bounce-slow' : ''
                      }`}>
                      {mood.emoji}
                    </div>
                    <p className={`text-[10px] font-bold ${selectedMood === mood.value ? 'text-white' : 'text-gray-700 dark:text-gray-300'
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
            <div>
              <h3 className="text-xs font-bold text-text-secondary dark:text-gray-400 uppercase tracking-wider mb-3 ml-1 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-primary">history</span>
                <span>Recientes</span>
              </h3>
              <div className="flex gap-2 flex-wrap">
                {recentSearches.slice(0, 3).map((search, index) => (
                  <button
                    key={index}
                    onClick={() => handleRecentSearch(search)}
                    className="px-3 py-2 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border border-gray-200 dark:border-gray-600 text-text-secondary dark:text-gray-300 rounded-full text-xs font-medium hover:from-primary/10 hover:to-primary/5 hover:border-primary/30 transition-all hover:scale-105 active:scale-95"
                  >
                    {search}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Advanced Toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 hover:from-primary/10 hover:to-primary/5 transition-all group border border-gray-200 dark:border-gray-700"
          >
            <span className="text-sm font-bold text-text-secondary dark:text-gray-300 group-hover:text-primary transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">tune</span>
              Opciones Avanzadas
            </span>
            <span className={`material-symbols-outlined text-lg text-text-secondary transition-transform duration-300 ${showAdvanced ? 'rotate-180' : ''}`}>
              expand_more
            </span>
          </button>

          {/* Custom Prompt */}
          {showAdvanced && (
            <div className="space-y-3 animate-fade-in">
              <label className="block text-sm font-bold text-text-primary dark:text-white ml-1 flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-primary">edit_note</span>
                Describe tu outfit ideal
              </label>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Ej: Un outfit casual con jeans azules y colores neutros..."
                className="w-full p-4 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-text-primary dark:text-white placeholder-text-secondary/50 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none shadow-inner"
                rows={3}
                disabled={isGenerating}
              />
              <p className="text-xs text-text-secondary dark:text-gray-400 ml-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                Sé específico para mejores resultados
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-2 border-red-200 dark:border-red-800 rounded-2xl animate-shake">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-800/30 rounded-xl text-red-600 dark:text-red-400">
                  <span className="material-symbols-outlined text-xl">error</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-red-900 dark:text-red-200">Algo salió mal</p>
                  <p className="text-xs text-red-700 dark:text-red-300 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Premium CTA */}
        <div className="sticky bottom-0 p-6 bg-gradient-to-t from-white via-white/95 to-transparent dark:from-gray-900 dark:via-gray-900/95 dark:to-transparent backdrop-blur-sm border-t border-gray-200/50 dark:border-gray-700/50">
          <button
            onClick={handleGenerate}
            disabled={isGenerating || closet.length === 0}
            className="w-full py-4 bg-gradient-to-r from-primary via-purple-600 to-pink-600 text-white rounded-2xl font-bold text-lg shadow-2xl shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 group relative overflow-hidden"
          >
            {/* Shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>

            <div className="relative flex items-center gap-3">
              {isGenerating ? (
                <>
                  <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{loadingMessage}</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-2xl">auto_awesome</span>
                  <span>Generar Outfit Perfecto</span>
                </>
              )}
            </div>
          </button>

          {closet.length === 0 && (
            <p className="text-center text-xs font-medium text-text-secondary dark:text-gray-400 mt-3">
              Agrega prendas a tu armario para generar outfits
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default GenerateFitViewImproved;
