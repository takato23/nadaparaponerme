
import React, { useState } from 'react';
import Loader from './Loader';

interface SmartPackerViewProps {
  onGenerate: (prompt: string) => void;
  onBack: () => void;
  isGenerating: boolean;
  error: string | null;
}

const SmartPackerView = ({ onGenerate, onBack, isGenerating, error }: SmartPackerViewProps) => {
  const [destination, setDestination] = useState('');
  const [duration, setDuration] = useState('');
  const [activities, setActivities] = useState('');
  const [travelDate, setTravelDate] = useState('');

  const suggestions = [
    { label: 'Finde en la playa', icon: 'beach_access', dest: 'un lugar de playa', dur: '3 días', act: 'relax en la arena, cenas casuales por la noche, y algún paseo' },
    { label: 'Semana en la montaña', icon: 'hiking', dest: 'un destino de montaña', dur: '7 días', act: 'senderismo durante el día, y cenas acogedoras por la noche' },
    { label: 'Viaje de negocios', icon: 'business_center', dest: 'una ciudad grande', dur: '4 días', act: 'reuniones de trabajo, cenas formales y algo de tiempo libre para explorar' },
    { label: 'Festival de música', icon: 'music_note', dest: 'un festival de música al aire libre', dur: '3 días', act: 'estar de pie y bailar mucho, looks de día y de noche, algo para el frío' },
  ];

  const handleSuggestionClick = (s: typeof suggestions[0]) => {
    setDestination(s.dest);
    setDuration(s.dur);
    setActivities(s.act);
  };

  const generatePrompt = () => {
    let prompt = `Destino: ${destination}. Duración: ${duration}. Actividades y estilo: ${activities}.`;
    if (travelDate) {
      prompt += ` Fecha de viaje: ${travelDate}.`;
    }
    return prompt;
  };

  const canGenerate = destination && duration && activities && !isGenerating;

  return (
    <div className="absolute inset-0 bg-white/80 dark:bg-background-dark/80 backdrop-blur-xl z-30 flex flex-col p-4 animate-fade-in md:fixed md:bg-black/30 md:items-center md:justify-center">
      <div className="contents md:block md:relative md:w-full md:max-w-lg bg-white/95 dark:bg-background-dark/95 md:rounded-3xl md:max-h-[90vh] md:flex md:flex-col md:shadow-2xl overflow-hidden">
        <header className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors dark:text-gray-200">
            <span className="material-symbols-outlined">close</span>
          </button>
          <h1 className="text-xl font-bold text-text-primary dark:text-gray-200">Maleta Inteligente</h1>
          <div className="w-10"></div>
        </header>

        <div className="flex-grow flex flex-col px-6 py-4 overflow-y-auto">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-5xl text-primary">luggage</span>
            </div>
            <p className="text-lg text-text-secondary dark:text-gray-400">
              Describe tu viaje y la IA preparará tu maleta perfecta.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 uppercase ml-1">Destino</label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-400 material-symbols-outlined text-xl">flight_takeoff</span>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="¿A dónde vas? (ej: París, La Costa)"
                  className="w-full pl-10 p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                  disabled={isGenerating}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500 uppercase ml-1">Duración</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-400 material-symbols-outlined text-xl">schedule</span>
                  <input
                    type="text"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="Ej: 5 días"
                    className="w-full pl-10 p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                    disabled={isGenerating}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500 uppercase ml-1">Fecha (Opcional)</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-400 material-symbols-outlined text-xl">calendar_today</span>
                  <input
                    type="date"
                    value={travelDate}
                    onChange={(e) => setTravelDate(e.target.value)}
                    className="w-full pl-10 p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                    disabled={isGenerating}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 uppercase ml-1">Actividades y Estilo</label>
              <textarea
                value={activities}
                onChange={(e) => setActivities(e.target.value)}
                placeholder="Cenas elegantes, caminatas, playa, reuniones..."
                className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-none"
                rows={3}
                disabled={isGenerating}
              />
            </div>
          </div>

          <div className="mt-6">
            <p className="text-xs font-medium text-gray-500 uppercase mb-3 ml-1">Sugerencias rápidas</p>
            <div className="grid grid-cols-2 gap-2">
              {suggestions.map(s => (
                <button
                  key={s.label}
                  onClick={() => handleSuggestionClick(s)}
                  className="flex items-center gap-2 p-3 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-primary/5 hover:border-primary/30 transition-all text-left group"
                >
                  <span className="material-symbols-outlined text-gray-400 group-hover:text-primary transition-colors">{s.icon}</span>
                  <span className="text-sm text-gray-600 dark:text-gray-300 group-hover:text-primary font-medium">{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
              <span className="material-symbols-outlined">error</span>
              {error}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-black/20 backdrop-blur-sm">
          <button
            onClick={() => onGenerate(generatePrompt())}
            disabled={!canGenerate}
            className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 px-4 rounded-xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 active:scale-[0.98]"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Preparando maleta...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">auto_awesome</span>
                Generar Lista de Equipaje
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SmartPackerView;