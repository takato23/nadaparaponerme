import React, { useState, useEffect, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import ConfettiEffect from './ConfettiEffect';
import * as paymentService from '../services/paymentService';
import { MONETIZATION_FLAGS, getFeatureFlag, getAffiliateLink, shouldShowWatermark } from '../services/monetizationService';
import ShopTheLookPanel from '../../components/ShopTheLookPanel';

import type { ClothingItem, FitResult, SavedOutfit } from '../../types';

interface FitResultViewImprovedProps {
  result: FitResult;
  inventory: ClothingItem[];
  savedOutfits: SavedOutfit[];
  onSaveOutfit: (outfit: Omit<FitResult, 'missing_piece_suggestion'>) => void;
  onVirtualTryOn: () => void;
  onShareOutfit: (outfit: FitResult) => void;
  onRegenerateWithAdjustment: (adjustment: 'more-formal' | 'change-colors' | 'more-casual') => void;
  onRateOutfit: (rating: number) => void;
  onOpenShopLook?: () => void;
  onBack: () => void;
  borrowedItemIds: Set<string>;
  alternatives?: FitResult[];
}

interface CalendarDay {
  day: string;
  date: number;
  outfit?: FitResult;
}

const DAYS_OF_WEEK = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const FitResultViewImproved: React.FC<FitResultViewImprovedProps> = ({
  result,
  inventory,
  savedOutfits,
  onSaveOutfit,
  onVirtualTryOn,
  onShareOutfit,
  onRegenerateWithAdjustment,
  onRateOutfit,
  onOpenShopLook,
  onBack,
  borrowedItemIds,
  alternatives = [],
}) => {
  const [currentAlternativeIndex, setCurrentAlternativeIndex] = useState(0);
  const [rating, setRating] = useState(0);
  const [showCalendar, setShowCalendar] = useState(false);
  const [outfitCalendar, setOutfitCalendar] = useState<Record<string, FitResult>>({});
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonOutfit, setComparisonOutfit] = useState<FitResult | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  // Monetization features
  const [userTier, setUserTier] = useState<string>('free');
  const [hasSharedForReward, setHasSharedForReward] = useState(() => {
    return localStorage.getItem('ojodeloca-shared-for-reward') === 'true';
  });
  const [showShareRewardSuccess, setShowShareRewardSuccess] = useState(false);

  // Swipe gesture states
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Combinar outfit actual con alternativas
  const allOutfits = useMemo(() => [result, ...alternatives], [result, alternatives]);
  const currentOutfit = allOutfits[currentAlternativeIndex];

  // Obtener items del outfit actual
  const topItem = inventory.find((item) => item.id === currentOutfit.top_id);
  const bottomItem = inventory.find((item) => item.id === currentOutfit.bottom_id);
  const shoesItem = inventory.find((item) => item.id === currentOutfit.shoes_id);
  const shopItems = useMemo(
    () =>
      [
        topItem ? { slot: 'top', item: topItem } : null,
        bottomItem ? { slot: 'bottom', item: bottomItem } : null,
        shoesItem ? { slot: 'shoes', item: shoesItem } : null,
      ].filter(Boolean) as { slot: string; item: ClothingItem }[],
    [topItem, bottomItem, shoesItem]
  );

  // Verificar si el outfit está guardado
  const isOutfitSaved = savedOutfits.some(
    (saved) =>
      saved.top_id === currentOutfit.top_id &&
      saved.bottom_id === currentOutfit.bottom_id &&
      saved.shoes_id === currentOutfit.shoes_id
  );

  // Calcular score de versatilidad
  const versatilityScore = useMemo(() => {
    const items = [topItem, bottomItem, shoesItem].filter(Boolean);
    const seasonCounts = new Set<string>();
    const vibeTagsCounts = new Set<string>();

    items.forEach((item) => {
      if (item) {
        item.metadata.seasons.forEach((season) => seasonCounts.add(season));
        item.metadata.vibe_tags.forEach((vibe) => vibeTagsCounts.add(vibe));
      }
    });

    const seasonScore = seasonCounts.size;
    const vibeScore = vibeTagsCounts.size;
    const totalScore = Math.min(seasonScore + vibeScore, 10);

    return {
      score: totalScore,
      occasions: Math.ceil(totalScore / 2),
    };
  }, [topItem, bottomItem, shoesItem]);

  // Generar calendario de la semana
  const weekCalendar = useMemo(() => {
    const today = new Date();
    const calendar: CalendarDay[] = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];

      calendar.push({
        day: DAYS_OF_WEEK[date.getDay() === 0 ? 6 : date.getDay() - 1],
        date: date.getDate(),
        outfit: outfitCalendar[dateKey],
      });
    }

    return calendar;
  }, [outfitCalendar]);

  // Cargar rating y calendario desde localStorage
  useEffect(() => {
    const outfitId = `${currentOutfit.top_id}-${currentOutfit.bottom_id}-${currentOutfit.shoes_id}`;

    // Cargar rating
    const ratingsStr = localStorage.getItem('ojodeloca-outfit-ratings');
    if (ratingsStr) {
      const ratings: Record<string, number> = JSON.parse(ratingsStr);
      setRating(ratings[outfitId] || 0);
    }

    // Cargar calendario
    const calendarStr = localStorage.getItem('ojodeloca-outfit-calendar');
    if (calendarStr) {
      setOutfitCalendar(JSON.parse(calendarStr));
    }
  }, [currentOutfit]);

  // Load user subscription tier
  useEffect(() => {
    const loadSubscription = async () => {
      const subscription = await paymentService.getCurrentSubscription();
      setUserTier(subscription?.tier || 'free');
    };
    loadSubscription();
  }, []);

  // Share to Unlock handler
  const handleShareForReward = () => {
    if (hasSharedForReward) {
      toast.success('¡Ya reclamaste tu recompensa por compartir!');
      return;
    }

    // In a real app, this would integrate with Web Share API or Instagram Stories API
    // For now, we simulate the share and grant the reward
    if (navigator.share) {
      navigator.share({
        title: '¡Mirá mi outfit!',
        text: `Creado con Ojo de Loca 👗✨`,
        url: window.location.href,
      }).then(() => {
        // Mark as shared and show success
        localStorage.setItem('ojodeloca-shared-for-reward', 'true');
        setHasSharedForReward(true);
        setShowShareRewardSuccess(true);

        // In a real implementation, call backend to increment AI generations
        console.log('✅ Share reward granted: +1 AI Generation');
      }).catch((err) => {
        console.log('Share canceled', err);
      });
    } else {
      // Fallback: Just open share sheet simulation
      toast.success('📱 Compartí este outfit en tus Instagram Stories para desbloquear 1 generación de IA gratis!');
      // For demo purposes, grant reward anyway
      localStorage.setItem('ojodeloca-shared-for-reward', 'true');
      setHasSharedForReward(true);
      setShowShareRewardSuccess(true);
    }
  };

  const handleRating = (newRating: number) => {
    setRating(newRating);
    onRateOutfit(newRating);

    // Trigger confetti for 5-star ratings!
    if (newRating === 5) {
      setShowConfetti(true);
    }

    const outfitId = `${currentOutfit.top_id}-${currentOutfit.bottom_id}-${currentOutfit.shoes_id}`;
    const ratingsStr = localStorage.getItem('ojodeloca-outfit-ratings');
    const ratings: Record<string, number> = ratingsStr ? JSON.parse(ratingsStr) : {};
    ratings[outfitId] = newRating;
    localStorage.setItem('ojodeloca-outfit-ratings', JSON.stringify(ratings));
  };

  const handleAssignToDay = (dateKey: string) => {
    const newCalendar = { ...outfitCalendar, [dateKey]: currentOutfit };
    setOutfitCalendar(newCalendar);
    localStorage.setItem('ojodeloca-outfit-calendar', JSON.stringify(newCalendar));
    setShowCalendar(false);
  };

  const handleSaveOutfit = () => {
    onSaveOutfit({
      top_id: currentOutfit.top_id,
      bottom_id: currentOutfit.bottom_id,
      shoes_id: currentOutfit.shoes_id,
      explanation: currentOutfit.explanation,
    });
  };

  const handlePrevAlternative = () => {
    setCurrentAlternativeIndex((prev) => (prev === 0 ? allOutfits.length - 1 : prev - 1));
  };

  const handleNextAlternative = () => {
    setCurrentAlternativeIndex((prev) => (prev === allOutfits.length - 1 ? 0 : prev + 1));
  };

  // Swipe gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && allOutfits.length > 1) {
      handleNextAlternative();
    }
    if (isRightSwipe && allOutfits.length > 1) {
      handlePrevAlternative();
    }

    // Reset
    setTouchStart(0);
    setTouchEnd(0);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-4xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto relative">
        {/* Mood Color Background */}
        {(currentOutfit as any).ui_metadata?.mood_color_hex && (
          <div
            className="absolute inset-0 -z-10 opacity-20 dark:opacity-10 pointer-events-none rounded-2xl"
            style={{
              background: `radial-gradient(circle at 20% 80%, ${(currentOutfit as any).ui_metadata.mood_color_hex}80, transparent 70%)`
            }}
          />
        )}

        {/* Header */}
        <div className="sticky top-0 z-10 glass-panel border-b border-white/20 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors"
            >
              <span className="material-symbols-outlined text-xl">arrow_back</span>
            </button>
            <div>
              <h2 className="text-2xl font-serif font-bold text-text-primary dark:text-white">
                Tu Outfit
              </h2>
              <p className="text-xs text-text-secondary dark:text-gray-400 font-medium">
                {allOutfits.length > 1
                  ? `${currentAlternativeIndex + 1} de ${allOutfits.length} variaciones`
                  : 'Outfit único'}
              </p>
            </div>
          </div>
          {/* Versatility Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-primary to-secondary text-white rounded-full shadow-glow-accent">
            <span className="material-symbols-outlined text-sm">workspace_premium</span>
            <span className="font-bold text-xs tracking-wide">
              {versatilityScore.occasions} ocasiones
            </span>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Lookbook View */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Outfit Visualization */}
            <div className="space-y-4">
              {/* Carousel Navigation for Alternatives */}
              {allOutfits.length > 1 && (
                <div className="flex items-center justify-between px-2">
                  <button
                    onClick={handlePrevAlternative}
                    className="p-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-md rounded-full hover:bg-white/80 dark:hover:bg-gray-700 transition-all shadow-sm"
                  >
                    <span className="material-symbols-outlined text-lg">chevron_left</span>
                  </button>
                  <div className="flex gap-2">
                    {allOutfits.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentAlternativeIndex(index)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${index === currentAlternativeIndex
                          ? 'bg-primary w-6'
                          : 'bg-gray-300 dark:bg-gray-600 w-1.5'
                          }`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={handleNextAlternative}
                    className="p-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-md rounded-full hover:bg-white/80 dark:hover:bg-gray-700 transition-all shadow-sm"
                  >
                    <span className="material-symbols-outlined text-lg">chevron_right</span>
                  </button>
                </div>
              )}

              {/* Vertical Lookbook Layout */}
              <div
                ref={carouselRef}
                className="space-y-3"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {/* Top */}
                {topItem && (
                  <div className="relative group overflow-hidden rounded-2xl shadow-soft-lg hover:animate-float">
                    <img
                      src={topItem.imageDataUrl}
                      alt="Top"
                      className="w-full h-56 object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    {borrowedItemIds.has(topItem.id) && (
                      <div className="absolute top-3 right-3 px-2.5 py-1 bg-blue-500/90 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm">
                        Prestado
                      </div>
                    )}

                    {/* Watermark for Free Users */}
                    {shouldShowWatermark(userTier !== 'free') && (
                      <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-sm text-white text-[9px] font-bold rounded opacity-70">
                        Ojo de Loca
                      </div>
                    )}


                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-12 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <p className="text-white text-base font-bold">{topItem.metadata.subcategory}</p>
                      <p className="text-white/90 text-xs font-medium">{topItem.metadata.color_primary}</p>

                      {/* Affiliate Link Button */}
                      {getFeatureFlag(MONETIZATION_FLAGS.ENABLE_AFFILIATES) && getAffiliateLink(topItem) && (
                        <a
                          href={getAffiliateLink(topItem)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-full transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="material-symbols-outlined text-sm">shopping_bag</span>
                          Comprar Similar
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Bottom */}
                {bottomItem && (
                  <div className="relative group overflow-hidden rounded-2xl shadow-soft-lg hover:animate-float">
                    <img
                      src={bottomItem.imageDataUrl}
                      alt="Bottom"
                      className="w-full h-56 object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    {borrowedItemIds.has(bottomItem.id) && (
                      <div className="absolute top-3 right-3 px-2.5 py-1 bg-blue-500/90 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm">
                        Prestado
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-12 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <p className="text-white text-base font-bold">{bottomItem.metadata.subcategory}</p>
                      <p className="text-white/90 text-xs font-medium">{bottomItem.metadata.color_primary}</p>
                    </div>
                  </div>
                )}

                {/* Shoes */}
                {shoesItem && (
                  <div className="relative group overflow-hidden rounded-2xl shadow-soft-lg hover:animate-float">
                    <img
                      src={shoesItem.imageDataUrl}
                      alt="Shoes"
                      className="w-full h-40 object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    {borrowedItemIds.has(shoesItem.id) && (
                      <div className="absolute top-3 right-3 px-2.5 py-1 bg-blue-500/90 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm">
                        Prestado
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-12 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <p className="text-white text-base font-bold">{shoesItem.metadata.subcategory}</p>
                      <p className="text-white/90 text-xs font-medium">{shoesItem.metadata.color_primary}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Outfit Details & Actions */}
            <div className="space-y-4">
              {/* Rating System */}
              <div className="glass-card p-4 rounded-2xl">
                <h3 className="text-sm font-bold text-text-primary dark:text-white mb-3">
                  ¿Qué te parece?
                </h3>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => handleRating(star)}
                      className="transform hover:scale-110 transition-transform focus:outline-none"
                    >
                      <span
                        className={`material-symbols-outlined text-3xl transition-colors ${star <= rating
                          ? 'text-yellow-400 drop-shadow-sm'
                          : 'text-gray-300 dark:text-gray-600'
                          }`}
                        style={{ fontVariationSettings: star <= rating ? "'FILL' 1, 'wght' 400" : "'FILL' 0, 'wght' 300" }}
                      >
                        star
                      </span>
                    </button>
                  ))}
                </div>
                {rating > 0 && (
                  <p className="text-sm font-medium text-primary mt-2 animate-fade-in">
                    {rating === 5 && '¡Increíble! 🎉'}
                    {rating === 4 && '¡Muy bueno! 👍'}
                    {rating === 3 && 'Me gusta 😊'}
                    {rating === 2 && 'Está bien 🤔'}
                    {rating === 1 && 'No me convence 😕'}
                  </p>
                )}
              </div>

              {/* AI Explanation */}
              <div className="glass-card p-5 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <span className="material-symbols-outlined text-6xl text-primary">auto_awesome</span>
                </div>
                <h3 className="text-sm font-bold text-text-primary dark:text-white mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-xl animate-pulse-slow">auto_awesome</span>
                  Explicación
                </h3>
                <p className="text-sm text-text-secondary dark:text-gray-300 leading-relaxed font-medium">
                  {currentOutfit.explanation}
                </p>
              </div>

              {/* Professional Educational Section */}
              {(currentOutfit as any).educational && (
                <div className="glass-card p-5 rounded-2xl space-y-4">
                  <h3 className="text-sm font-bold text-text-primary dark:text-white mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-purple-500 text-xl">psychology</span>
                    💡 ¿Por qué te favorece?
                  </h3>

                  {/* Morfología */}
                  {(currentOutfit as any).educational.morphology_explanation && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-purple-400 text-base">checkroom</span>
                        <h4 className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wide">
                          Tu Cuerpo
                        </h4>
                      </div>
                      <p className="text-sm text-text-secondary dark:text-gray-300 leading-relaxed pl-6">
                        {(currentOutfit as any).educational.morphology_explanation}
                      </p>
                    </div>
                  )}

                  {/* Colorimetría */}
                  {(currentOutfit as any).educational.colorimetry_explanation && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-pink-400 text-base">palette</span>
                        <h4 className="text-xs font-bold text-pink-600 dark:text-pink-400 uppercase tracking-wide">
                          Tus Colores
                        </h4>
                      </div>
                      <p className="text-sm text-text-secondary dark:text-gray-300 leading-relaxed pl-6">
                        {(currentOutfit as any).educational.colorimetry_explanation}
                      </p>
                    </div>
                  )}

                  {/* Mood */}
                  {(currentOutfit as any).educational.mood_explanation && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-blue-400 text-base">mood</span>
                        <h4 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                          El Mood
                        </h4>
                      </div>
                      <p className="text-sm text-text-secondary dark:text-gray-300 leading-relaxed pl-6">
                        {(currentOutfit as any).educational.mood_explanation}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Missing Piece Suggestion */}
              {currentOutfit.missing_piece_suggestion && (
                <div className="bg-amber-50/80 dark:bg-amber-900/30 border border-amber-200/50 dark:border-amber-700/50 p-4 rounded-2xl backdrop-blur-sm">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-100 dark:bg-amber-800/50 rounded-full shrink-0">
                      <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-xl">
                        lightbulb
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-amber-800 dark:text-amber-200 uppercase tracking-wide mb-1">
                        Sugerencia
                      </p>
                      <p className="text-sm text-amber-900 dark:text-amber-100">
                        <strong className="font-bold">{currentOutfit.missing_piece_suggestion.item_name}</strong>:{' '}
                        {currentOutfit.missing_piece_suggestion.reason}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {shopItems.length > 0 && (
                <ShopTheLookPanel
                  items={shopItems}
                  borrowedItemIds={borrowedItemIds}
                  onOpenFinder={onOpenShopLook}
                />
              )}

              {/* Regenerate with Adjustments */}
              <div>
                <h3 className="text-xs font-bold text-text-secondary dark:text-gray-400 uppercase tracking-wider mb-3 ml-1">
                  Ajustar Estilo
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => onRegenerateWithAdjustment('more-formal')}
                    className="p-3 bg-white/50 dark:bg-slate-800/50 border border-white/20 dark:border-slate-700 rounded-xl hover:bg-white/80 dark:hover:bg-slate-700 transition-all text-center group"
                  >
                    <span className="material-symbols-outlined text-blue-500 text-2xl mb-1 group-hover:scale-110 transition-transform">workspace_premium</span>
                    <p className="text-xs font-bold text-text-primary dark:text-gray-200">Formal</p>
                  </button>
                  <button
                    onClick={() => onRegenerateWithAdjustment('change-colors')}
                    className="p-3 bg-white/50 dark:bg-slate-800/50 border border-white/20 dark:border-slate-700 rounded-xl hover:bg-white/80 dark:hover:bg-slate-700 transition-all text-center group"
                  >
                    <span className="material-symbols-outlined text-purple-500 text-2xl mb-1 group-hover:scale-110 transition-transform">palette</span>
                    <p className="text-xs font-bold text-text-primary dark:text-gray-200">Colores</p>
                  </button>
                  <button
                    onClick={() => onRegenerateWithAdjustment('more-casual')}
                    className="p-3 bg-white/50 dark:bg-slate-800/50 border border-white/20 dark:border-slate-700 rounded-xl hover:bg-white/80 dark:hover:bg-slate-700 transition-all text-center group"
                  >
                    <span className="material-symbols-outlined text-green-500 text-2xl mb-1 group-hover:scale-110 transition-transform">routine</span>
                    <p className="text-xs font-bold text-text-primary dark:text-gray-200">Casual</p>
                  </button>
                </div>
              </div>

              {/* Main Actions */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={handleSaveOutfit}
                  disabled={isOutfitSaved}
                  className={`px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${isOutfitSaved
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed shadow-none'
                    : 'bg-gradient-to-r from-primary to-teal-600 text-white hover:shadow-primary/30 hover:-translate-y-0.5 active:scale-95 animate-shine'
                    }`}
                >
                  <span className="material-symbols-outlined text-xl">
                    {isOutfitSaved ? 'check_circle' : 'favorite'}
                  </span>
                  {isOutfitSaved ? 'Guardado' : 'Guardar'}
                </button>
                <button
                  onClick={onVirtualTryOn}
                  className="px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-purple-500/30 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-xl">photo_camera</span>
                  Probar
                </button>
                <button
                  onClick={() => onShareOutfit(currentOutfit)}
                  className="px-4 py-3 bg-white dark:bg-slate-800 text-text-primary dark:text-white border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-bold hover:bg-gray-50 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-xl">share</span>
                  Compartir
                </button>

                {/* Share to Unlock - Only for Free users */}
                {getFeatureFlag(MONETIZATION_FLAGS.ENABLE_SHARE_REWARD) && userTier === 'free' && !hasSharedForReward && (
                  <button
                    onClick={handleShareForReward}
                    className="px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-green-500/30 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center justify-center gap-2 animate-pulse"
                  >
                    <span className="material-symbols-outlined text-xl">star</span>
                    Desbloquear +1 Gen
                  </button>
                )}

                {/* Calendar button - only show if Share to Unlock not visible */}
                {(!getFeatureFlag(MONETIZATION_FLAGS.ENABLE_SHARE_REWARD) || userTier !== 'free' || hasSharedForReward) && (
                  <button
                    onClick={() => setShowCalendar(!showCalendar)}
                    className="px-4 py-3 bg-white dark:bg-slate-800 text-text-primary dark:text-white border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-bold hover:bg-gray-50 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-xl">calendar_month</span>
                    Calendario
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Calendar View */}
          {showCalendar && (
            <div className="liquid-glass p-4 rounded-xl animate-fade-in">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Asignar a un Día
              </h3>
              <div className="grid grid-cols-7 gap-1.5">
                {weekCalendar.map((day, index) => {
                  const dateKey = new Date();
                  dateKey.setDate(new Date().getDate() + index);
                  const key = dateKey.toISOString().split('T')[0];

                  return (
                    <button
                      key={index}
                      onClick={() => handleAssignToDay(key)}
                      className={`p-2 rounded-lg text-center transition-all ${day.outfit
                        ? 'bg-primary text-white shadow-md'
                        : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                    >
                      <p className="text-[10px] font-medium mb-0.5">{day.day}</p>
                      <p className="text-base font-bold">{day.date}</p>
                      {day.outfit && (
                        <span className="material-symbols-outlined text-[10px] mt-0.5">check_circle</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Similar Outfits (Mock) */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Similares
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-xl flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-gray-400 dark:text-gray-500 text-2xl">
                    checkroom
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Confetti Effect */}
      <ConfettiEffect trigger={showConfetti} onComplete={() => setShowConfetti(false)} />
    </div>
  );
};

export default FitResultViewImproved;
