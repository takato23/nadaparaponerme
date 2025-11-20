import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ClothingItem, SavedOutfit } from '../types';

interface StyleChallengesViewProps {
  closet: ClothingItem[];
  savedOutfits: SavedOutfit[];
  onClose: () => void;
  onViewOutfit: (outfit: SavedOutfit) => void;
}

const StyleChallengesView: React.FC<StyleChallengesViewProps> = ({ closet, savedOutfits, onClose, onViewOutfit }) => {
  const [voted, setVoted] = useState<number | null>(null);
  const [round, setRound] = useState(1);

  // Mock outfits if not enough saved outfits
  const mockOutfits = [
    { id: 'mock1', image: 'https://images.pexels.com/photos/1598507/pexels-photo-1598507.jpeg?auto=compress&cs=tinysrgb&w=400', name: 'Casual Chic' },
    { id: 'mock2', image: 'https://images.pexels.com/photos/10049570/pexels-photo-10049570.jpeg?auto=compress&cs=tinysrgb&w=400', name: 'Urban Explorer' },
    { id: 'mock3', image: 'https://images.pexels.com/photos/298863/pexels-photo-298863.jpeg?auto=compress&cs=tinysrgb&w=400', name: 'Business Casual' },
    { id: 'mock4', image: 'https://images.pexels.com/photos/6311392/pexels-photo-6311392.jpeg?auto=compress&cs=tinysrgb&w=400', name: 'Summer Vibes' },
  ];

  // Get two outfits to compare
  const currentPair = useMemo(() => {
    // In a real app, logic to select pairs based on round
    // For now, just cycle through mock outfits or saved outfits
    const idx1 = (round * 2) % mockOutfits.length;
    const idx2 = (round * 2 + 1) % mockOutfits.length;
    return [mockOutfits[idx1], mockOutfits[idx2]];
  }, [round]);

  const handleVote = (index: number) => {
    setVoted(index);
    setTimeout(() => {
      setVoted(null);
      setRound(r => r + 1);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
      <div className="relative w-full max-w-4xl h-[80vh] bg-gray-900 rounded-3xl overflow-hidden shadow-2xl border border-gray-800 flex flex-col">

        {/* Header */}
        <div className="p-6 flex justify-between items-center border-b border-gray-800">
          <div>
            <h2 className="text-2xl font-bold text-white">Duelo de Estilos</h2>
            <p className="text-gray-400 text-sm">Ronda {round}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-grow flex flex-col items-center justify-center p-6 relative">
          <h3 className="text-xl font-bold text-white mb-8 text-center">¿Cuál prefieres?</h3>

          <div className="flex flex-col md:flex-row gap-8 items-center justify-center w-full">

            {/* Option 1 */}
            <div className="relative group cursor-pointer w-full max-w-xs" onClick={() => !voted && handleVote(1)}>
              <motion.div
                className={`aspect-[3/4] rounded-3xl overflow-hidden shadow-xl border-4 transition-all duration-300 bg-gray-800 ${voted === 1 ? 'border-green-500 scale-105' : 'border-transparent hover:scale-105 hover:border-white/20'}`}
                whileHover={{ y: -10 }}
              >
                <img src={currentPair[0].image} alt="Outfit 1" className="w-full h-full object-cover" />
                {voted === 1 && (
                  <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-6xl text-white drop-shadow-lg">check_circle</span>
                  </div>
                )}
              </motion.div>
              <div className="mt-4 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="px-6 py-2 bg-white text-black rounded-full text-sm font-bold shadow-lg">Votar A</span>
              </div>
            </div>

            <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-gray-700 to-gray-900 z-10">VS</div>

            {/* Option 2 */}
            <div className="relative group cursor-pointer w-full max-w-xs" onClick={() => !voted && handleVote(2)}>
              <motion.div
                className={`aspect-[3/4] rounded-3xl overflow-hidden shadow-xl border-4 transition-all duration-300 bg-gray-800 ${voted === 2 ? 'border-green-500 scale-105' : 'border-transparent hover:scale-105 hover:border-white/20'}`}
                whileHover={{ y: -10 }}
              >
                <img src={currentPair[1].image} alt="Outfit 2" className="w-full h-full object-cover" />
                {voted === 2 && (
                  <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-6xl text-white drop-shadow-lg">check_circle</span>
                  </div>
                )}
              </motion.div>
              <div className="mt-4 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="px-6 py-2 bg-white text-black rounded-full text-sm font-bold shadow-lg">Votar B</span>
              </div>
            </div>

          </div>

          <AnimatePresence>
            {voted && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-8 px-6 py-3 bg-gray-800 rounded-full text-gray-300 font-medium border border-gray-700"
              >
                ¡Voto registrado! Siguiente ronda...
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
};

export default StyleChallengesView;
