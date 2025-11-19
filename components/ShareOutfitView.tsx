import React, { useRef, useEffect, useState } from 'react';
import type { ClothingItem } from '../types';
import Loader from './Loader';

interface ShareOutfitViewProps {
  outfitItems: {
    top: ClothingItem;
    bottom: ClothingItem;
    shoes: ClothingItem;
  };
  onClose: () => void;
}

async function dataUrlToFile(dataUrl: string, fileName: string): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], fileName, { type: blob.type });
}

const ShareOutfitView = ({ outfitItems, onClose }: ShareOutfitViewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [compositeImage, setCompositeImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const generateImage = async () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) {
        setError("No se pudo inicializar el lienzo.");
        setIsLoading(false);
        return;
      }

      // Set canvas dimensions and background
      const canvasWidth = 800;
      const canvasHeight = 1000;
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      ctx.fillStyle = '#F3F4F6'; // background-light
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      try {
        const imagesToLoad = [outfitItems.top.imageDataUrl, outfitItems.bottom.imageDataUrl, outfitItems.shoes.imageDataUrl];
        const loadedImages = await Promise.all(
          imagesToLoad.map(src => new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
          }))
        );

        const [topImg, bottomImg, shoesImg] = loadedImages;
        
        // Layout: Top and Bottom side-by-side, Shoes below
        const padding = 40;
        const itemWidth = (canvasWidth - 3 * padding) / 2;
        const itemHeight = itemWidth * 1.25;

        ctx.drawImage(topImg, padding, padding, itemWidth, itemHeight);
        ctx.drawImage(bottomImg, itemWidth + 2 * padding, padding, itemWidth, itemHeight);
        
        const shoesY = itemHeight + 2 * padding;
        const shoesWidth = canvasWidth - 2 * padding;
        const shoesHeight = (shoesWidth / 2) * 1.25; 
        ctx.drawImage(shoesImg, padding, shoesY, shoesWidth, shoesHeight);


        setCompositeImage(canvas.toDataURL('image/png'));
      } catch (e) {
        console.error("Error loading images for canvas:", e);
        setError("No se pudieron cargar las imágenes del outfit.");
      } finally {
        setIsLoading(false);
      }
    };

    generateImage();
  }, [outfitItems]);

  const handleShare = async () => {
    if (!compositeImage) return;

    try {
      const file = await dataUrlToFile(compositeImage, 'mi-outfit-ojodeloca.png');
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Mi Outfit de Ojo de Loca',
          text: '¡Mira el outfit que creé con mi armario digital!',
          files: [file],
        });
      } else {
        // Fallback for browsers that don't support sharing files
        const link = document.createElement('a');
        link.href = compositeImage;
        link.download = 'mi-outfit-ojodeloca.png';
        link.click();
      }
    } catch (err) {
      console.error('Error sharing:', err);
      alert('No se pudo compartir el outfit.');
    }
  };

  return (
    <div className="absolute inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-md bg-white/80 dark:bg-background-dark/80 backdrop-blur-xl rounded-3xl p-6 flex flex-col items-center">
        <header className="w-full flex items-center justify-between mb-4">
          <div className="w-8"></div>
          <h2 className="text-xl font-bold text-text-primary dark:text-gray-200">Compartir Look</h2>
          <button onClick={onClose} className="p-2 -m-2 dark:text-gray-200">
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        <div className="w-full aspect-[4/5] rounded-xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
          {isLoading && <Loader />}
          {error && <p className="text-red-500 text-sm p-4">{error}</p>}
          {compositeImage && <img src={compositeImage} alt="Outfit compuesto" className="w-full h-full object-contain" />}
          <canvas ref={canvasRef} className="hidden"></canvas>
        </div>

        <button 
          onClick={handleShare}
          disabled={isLoading || !!error || !compositeImage}
          className="w-full mt-6 bg-primary text-white font-bold py-3 px-4 rounded-xl disabled:bg-gray-400 dark:disabled:bg-gray-600 transition-colors"
        >
          {navigator.share ? 'Compartir Look' : 'Descargar Look'}
        </button>
      </div>
    </div>
  );
};

export default ShareOutfitView;