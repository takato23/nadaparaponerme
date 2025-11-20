import React, { useState, useMemo } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import type { ClothingItem, SavedOutfit } from '../types';

interface OutfitRatingViewProps {
  closet: ClothingItem[];
  savedOutfits: SavedOutfit[];
  onClose: () => void;
  onRateOutfit: (outfitId: string, rating: number) => void;
}

interface SwipeCardData {
  id: string;
  outfit: SavedOutfit;
  items: {
    top?: ClothingItem;
    bottom?: ClothingItem;
    shoes?: ClothingItem;
  };
}

const OutfitRatingView: React.FC<OutfitRatingViewProps> = ({ closet, savedOutfits, onClose, onRateOutfit }) => {
  const [cards, setCards] = useState<SwipeCardData[]>(() => {
    // Initialize cards from saved outfits
    return savedOutfits.slice(0, 10).map(outfit => ({
      id: outfit.id,
      outfit,
      items: {
        top: closet.find(i => i.id === outfit.top_id),
        bottom: closet.find(i => i.id === outfit.bottom_id),
        shoes: closet.find(i => i.id === outfit.shoes_id),
      }
    }));
  });

  const [ratings, setRatings] = useState<Record<string, number>>({});

  const removeCard = (id: string, rating: number) => {
    setRatings(prev => ({ ...prev, [id]: rating }));
    onRateOutfit(id, rating);

    setTimeout(() => {
      setCards(prev => prev.filter(card => card.id !== id));
    }, 200);
  };

  const resetCards = () => {
    setCards(savedOutfits.slice(0, 10).map(outfit => ({
      id: outfit.id,
      outfit,
      items: {
        top: closet.find(i => i.id === outfit.top_id),
        bottom: closet.find(i => i.id === outfit.bottom_id),
        shoes: closet.find(i => i.id === outfit.shoes_id),
      }
    })));
    setRatings({});
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
      <div className="relative w-full max-w-lg h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Califica Outfits</h2>
            <p className="text-gray-400 text-sm">{cards.length} pendientes</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Card Stack */}
        <div className="relative flex-grow flex items-center justify-center">
          <div className="relative w-full max-w-sm h-[600px]">
            <AnimatePresence>
              {cards.map((card, index) => (
                <SwipeCard
                  key={card.id}
                  card={card}
                  index={index}
                  total={cards.length}
                  onRemove={removeCard}
                />
              ))}
            </AnimatePresence>

            {cards.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-gray-900/50 backdrop-blur-sm rounded-3xl">
                <span className="material-symbols-outlined text-6xl text-green-400 mb-4">check_circle</span>
                <h3 className="text-2xl font-bold text-white">¡Todo calificado!</h3>
                <p className="text-gray-400 mt-2">Has revisado todos los outfits.</p>
                <button
                  onClick={resetCards}
                  className="mt-6 px-6 py-3 bg-primary text-white rounded-full font-bold hover:bg-primary/90 transition-colors"
                >
                  Volver a Calificar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        {cards.length > 0 && (
          <div className="flex justify-center gap-6 mt-8">
            <button
              onClick={() => cards[0] && removeCard(cards[0].id, 1)}
              className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md shadow-lg flex items-center justify-center text-red-500 hover:bg-red-500/20 transition-all border border-red-500/30 hover:scale-110 active:scale-95"
            >
              <span className="material-symbols-outlined text-3xl">close</span>
            </button>
            <button
              onClick={() => cards[0] && removeCard(cards[0].id, 3)}
              className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md shadow-lg flex items-center justify-center text-yellow-400 hover:bg-yellow-400/20 transition-all border border-yellow-400/30 hover:scale-110 active:scale-95"
            >
              <span className="material-symbols-outlined text-3xl">star</span>
            </button>
            <button
              onClick={() => cards[0] && removeCard(cards[0].id, 5)}
              className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md shadow-lg flex items-center justify-center text-green-500 hover:bg-green-500/20 transition-all border border-green-500/30 hover:scale-110 active:scale-95"
            >
              <span className="material-symbols-outlined text-3xl">favorite</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

interface SwipeCardProps {
  card: SwipeCardData;
  index: number;
  total: number;
  onRemove: (id: string, rating: number) => void;
}

const SwipeCard: React.FC<SwipeCardProps> = ({ card, index, total, onRemove }) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);

  const handleDragEnd = (_: any, info: any) => {
    if (Math.abs(info.offset.x) > 150) {
      const rating = info.offset.x > 0 ? 5 : 1; // Swipe right = like (5), left = dislike (1)
      onRemove(card.id, rating);
    }
  };

  // Show only top 3 cards
  if (index >= 3) return null;

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      style={{
        x,
        rotate,
        opacity,
        zIndex: total - index,
      }}
      initial={{ scale: 1 - index * 0.05, y: index * 10 }}
      animate={{ scale: 1 - index * 0.05, y: index * 10 }}
      exit={{ x: 300, opacity: 0, transition: { duration: 0.3 } }}
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
    >
      <div className="w-full h-full bg-gray-800 rounded-3xl overflow-hidden shadow-2xl border border-gray-700">

        {/* Outfit Images */}
        <div className="h-4/5 grid grid-cols-3 gap-1 p-4 bg-gradient-to-b from-gray-900 to-gray-800">
          {card.items.top && (
            <div className="col-span-3 rounded-xl overflow-hidden mb-1 shadow-lg">
              <img
                src={card.items.top.imageDataUrl}
                alt="Top"
                className="w-full h-full object-cover"
              />
            </div>
          )}
          {card.items.bottom && (
            <div className="col-span-2 rounded-xl overflow-hidden shadow-lg">
              <img
                src={card.items.bottom.imageDataUrl}
                alt="Bottom"
                className="w-full h-full object-cover"
              />
            </div>
          )}
          {card.items.shoes && (
            <div className="col-span-1 rounded-xl overflow-hidden shadow-lg">
              <img
                src={card.items.shoes.imageDataUrl}
                alt="Shoes"
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="h-1/5 p-4 bg-gray-900 flex flex-col justify-center">
          <h3 className="text-lg font-bold text-white mb-1">Outfit #{card.id.slice(0, 6)}</h3>
          <p className="text-sm text-gray-400 line-clamp-2">
            {card.outfit.explanation || 'Un gran outfit para cualquier ocasión'}
          </p>
        </div>

        {/* Swipe Indicators */}
        <motion.div
          className="absolute top-8 left-8 px-6 py-3 bg-red-500 text-white font-bold text-2xl rounded-2xl border-4 border-white shadow-2xl rotate-[-20deg]"
          style={{ opacity: useTransform(x, [-150, -50], [1, 0]) }}
        >
          NOPE
        </motion.div>
        <motion.div
          className="absolute top-8 right-8 px-6 py-3 bg-green-500 text-white font-bold text-2xl rounded-2xl border-4 border-white shadow-2xl rotate-[20deg]"
          style={{ opacity: useTransform(x, [50, 150], [0, 1]) }}
        >
          LIKE
        </motion.div>
      </div>
    </motion.div>
  );
};

export default OutfitRatingView;
