import React, { useState, useRef } from 'react';
import type { ClothingItem } from '../types';
import { generateVirtualTryOn } from '../src/services/aiService';
// FIX: The Loader component is now correctly created and exported, resolving the 'not a module' error.
import Loader from './Loader';

interface VirtualTryOnViewProps {
  onBack: () => void;
  outfitItems: {
    top: ClothingItem;
    bottom: ClothingItem;
    shoes: ClothingItem;
  };
}

type ViewState = 'upload' | 'generating' | 'result';

const VirtualTryOnView = ({ onBack, outfitItems }: VirtualTryOnViewProps) => {
  const [viewState, setViewState] = useState<ViewState>('upload');
  const [userImage, setUserImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        setUserImage(url);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!userImage) return;
    setViewState('generating');
    setError(null);
    try {
      const result = await generateVirtualTryOn(
        userImage,
        outfitItems.top.imageDataUrl,
        outfitItems.bottom.imageDataUrl,
        outfitItems.shoes.imageDataUrl,
      );
      setResultImage(result);
      setViewState('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setViewState('upload');
    }
  };

  const renderContent = () => {
    switch (viewState) {
      case 'upload':
        return (
          <div className="p-4 flex flex-col items-center justify-center h-full text-center">
            <h2 className="text-2xl font-bold mb-2 dark:text-gray-200">Probador Virtual</h2>
            <p className="text-text-secondary dark:text-gray-400 mb-4">Sube una foto tuya de cuerpo entero.</p>
             {error && <p className="text-red-500 mb-4">{error}</p>}
            <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-[3/4] border-2 border-dashed dark:border-gray-600 rounded-2xl flex items-center justify-center mb-4 cursor-pointer"
            >
              {userImage ? (
                <img src={userImage} alt="user" className="w-full h-full object-cover rounded-2xl" />
              ) : (
                <span className="material-symbols-outlined text-5xl text-gray-400">add_a_photo</span>
              )}
            </div>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            <button onClick={handleGenerate} disabled={!userImage} className="w-full bg-primary text-white font-bold py-4 rounded-xl disabled:bg-gray-300 dark:disabled:bg-gray-600">
              Generar
            </button>
          </div>
        );
      case 'generating':
        return <div className="flex flex-col items-center justify-center h-full dark:text-gray-300"><Loader /><p className="mt-4">Vistiéndote...</p></div>;
      case 'result':
        return (
          <div className="p-4 flex flex-col items-center justify-center h-full text-center">
            <h2 className="text-2xl font-bold mb-4 dark:text-gray-200">¡Listo!</h2>
            {resultImage && <img src={resultImage} alt="try on result" className="w-full aspect-[3/4] object-cover rounded-2xl mb-4" />}
            <button onClick={() => setViewState('upload')} className="w-full bg-gray-200 dark:bg-gray-700 text-text-primary dark:text-gray-200 font-bold py-4 rounded-xl">
              Probar con otra foto
            </button>
          </div>
        );
    }
  };

  return (
    <div className="absolute inset-0 bg-white/80 dark:bg-background-dark/80 backdrop-blur-xl z-[60] flex flex-col md:fixed md:bg-black/30 md:items-center md:justify-center">
       <div className="contents md:block md:relative md:w-full md:max-w-md bg-white/80 dark:bg-background-dark/80 md:rounded-3xl md:max-h-[90vh] md:flex md:flex-col">
        <header className="p-4 flex items-center">
            <button onClick={onBack} className="p-2 dark:text-gray-200">
            <span className="material-symbols-outlined">close</span>
            </button>
        </header>
        <div className="flex-grow">{renderContent()}</div>
       </div>
    </div>
  );
};

export default VirtualTryOnView;