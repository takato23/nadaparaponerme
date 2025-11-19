import React, { useState } from 'react';
// FIX: The Loader component is now correctly created and exported, resolving the 'not a module' error.
import Loader from './Loader';

interface GenerateFitViewProps {
  onGenerate: (prompt: string) => void;
  onBack: () => void;
  isGenerating: boolean;
  error: string | null;
}

const GenerateFitView = ({ onGenerate, onBack, isGenerating, error }: GenerateFitViewProps) => {
  const [prompt, setPrompt] = useState('');

  const suggestions = [
    'una cena casual',
    'un día de oficina',
    'un festival de música',
    'una boda en la playa',
  ];

  return (
    <div className="absolute inset-0 bg-white/80 dark:bg-background-dark/80 backdrop-blur-xl z-30 flex flex-col p-4 animate-fade-in md:fixed md:bg-black/30 md:items-center md:justify-center">
      <div className="contents md:block md:relative md:w-full md:max-w-lg bg-white/80 dark:bg-background-dark/80 md:rounded-3xl md:max-h-[90vh] md:flex md:flex-col">
       <header className="flex items-center justify-between pb-4 shrink-0">
        <button onClick={onBack} className="p-2 dark:text-gray-200">
          <span className="material-symbols-outlined">close</span>
        </button>
        <h1 className="text-xl font-bold text-text-primary dark:text-gray-200">Estilista IA</h1>
        <div className="w-10"></div>
      </header>
      
      <div className="flex-grow flex flex-col justify-center text-center px-4">
        <span className="material-symbols-outlined text-5xl text-primary mb-4">auto_awesome</span>
        <p className="text-lg text-text-secondary dark:text-gray-400 mb-4">¿Para qué ocasión necesitas un outfit?</p>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="ej: 'brunch con amigas'"
          className="w-full p-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg mb-4 bg-transparent dark:text-white focus:border-primary focus:ring-0 transition-colors"
          rows={3}
          disabled={isGenerating}
        />
        
        <div className="flex flex-wrap gap-2 justify-center mb-6">
            {suggestions.map(s => (
                <button key={s} onClick={() => setPrompt(s)} className="bg-primary/10 dark:bg-primary/20 text-primary dark:text-teal-300 px-3 py-1 rounded-full text-sm">
                    {s}
                </button>
            ))}
        </div>

        {error && <p className="text-red-500 mb-4">{error}</p>}
      </div>

      <div className="pb-4 shrink-0 px-4">
        <button
          onClick={() => onGenerate(prompt)}
          disabled={isGenerating || !prompt}
          className="w-full bg-primary text-white font-bold py-4 px-4 rounded-2xl flex items-center justify-center gap-3 disabled:bg-gray-300 dark:disabled:bg-gray-600 transition-all"
        >
          {isGenerating ? (
            <>
              <Loader size="small" />
              <span>Generando outfit...</span>
            </>
          ) : 'Generar Outfit'}
        </button>
      </div>
      </div>
    </div>
  );
};

export default GenerateFitView;