import React, { useState, useEffect } from 'react';
import type { ClothingItem, SavedOutfit, OutfitRating, RatingStats, OutfitWithRating } from '../types';
import * as ratingService from '../src/services/ratingService';
import Loader from './Loader';
import { Card } from './ui/Card';

interface OutfitRatingViewProps {
  closet: ClothingItem[];
  savedOutfits: SavedOutfit[];
  onClose: () => void;
  onViewOutfit?: (outfit: SavedOutfit) => void;
}

type ViewStep = 'list' | 'edit';

const OutfitRatingView = ({ closet, savedOutfits, onClose, onViewOutfit }: OutfitRatingViewProps) => {
  const [currentStep, setCurrentStep] = useState<ViewStep>('list');
  const [outfitsWithRatings, setOutfitsWithRatings] = useState<OutfitWithRating[]>([]);
  const [stats, setStats] = useState<RatingStats>({
    average_rating: 0,
    total_ratings: 0,
    rating_distribution: {},
    highest_rated_outfit: undefined,
    lowest_rated_outfit: undefined,
  });
  const [selectedOutfit, setSelectedOutfit] = useState<OutfitWithRating | null>(null);
  const [editRating, setEditRating] = useState<number>(0);
  const [editNotes, setEditNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'rating'>('date');
  const [filterRating, setFilterRating] = useState<number | null>(null);

  useEffect(() => {
    loadRatings();
  }, [savedOutfits]);

  const loadRatings = async () => {
    try {
      setIsLoading(true);
      const ratings = await ratingService.getUserRatings();

      // Merge ratings with outfits
      const outfitsWithRatingsData: OutfitWithRating[] = savedOutfits.map((outfit) => {
        const rating = ratings.find((r) => r.outfit_id === outfit.id);
        return {
          ...outfit,
          rating,
        };
      });

      setOutfitsWithRatings(outfitsWithRatingsData);

      // Load stats
      const ratingStats = await ratingService.getRatingStats(savedOutfits);
      setStats(ratingStats);
    } catch (err) {
      console.error('Error loading ratings:', err);
      setError('Error al cargar calificaciones');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditRating = (outfit: OutfitWithRating) => {
    setSelectedOutfit(outfit);
    setEditRating(outfit.rating?.rating || 0);
    setEditNotes(outfit.rating?.notes || '');
    setCurrentStep('edit');
  };

  const handleSaveRating = async () => {
    if (!selectedOutfit || editRating === 0) {
      setError('Debes seleccionar una calificación');
      return;
    }

    try {
      setIsLoading(true);
      await ratingService.createOrUpdateRating(
        selectedOutfit.id,
        editRating,
        editNotes
      );

      await loadRatings();
      setCurrentStep('list');
      setSelectedOutfit(null);
      setEditRating(0);
      setEditNotes('');
      setError(null);
    } catch (err) {
      console.error('Error saving rating:', err);
      setError('Error al guardar calificación');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRating = async (outfit: OutfitWithRating) => {
    if (!outfit.rating) return;

    if (!confirm('¿Estás segura de que querés eliminar esta calificación?')) {
      return;
    }

    try {
      await ratingService.deleteRating(outfit.rating.id);
      await loadRatings();
    } catch (err) {
      console.error('Error deleting rating:', err);
      setError('Error al eliminar calificación');
    }
  };

  const getTopForOutfit = (outfit: SavedOutfit): ClothingItem | undefined => {
    return closet.find((item) => item.id === outfit.top_id);
  };

  const getBottomForOutfit = (outfit: SavedOutfit): ClothingItem | undefined => {
    return closet.find((item) => item.id === outfit.bottom_id);
  };

  const getShoesForOutfit = (outfit: SavedOutfit): ClothingItem | undefined => {
    return closet.find((item) => item.id === outfit.shoes_id);
  };

  const renderStars = (rating: number, size: 'sm' | 'lg' = 'sm') => {
    const sizeClass = size === 'sm' ? 'text-xl' : 'text-3xl';
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`${sizeClass} ${
              star <= rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'
            }`}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  const renderInteractiveStars = (currentRating: number, onChange: (rating: number) => void) => {
    return (
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => onChange(star)}
            className={`text-4xl transition-all hover:scale-110 ${
              star <= currentRating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'
            }`}
          >
            ★
          </button>
        ))}
      </div>
    );
  };

  // Filter and sort outfits
  const filteredOutfits = outfitsWithRatings
    .filter((outfit) => {
      if (filterRating === null) return true;
      return outfit.rating?.rating === filterRating;
    })
    .sort((a, b) => {
      if (sortBy === 'rating') {
        const ratingA = a.rating?.rating || 0;
        const ratingB = b.rating?.rating || 0;
        return ratingB - ratingA; // Descending
      }
      // Sort by date (most recent first)
      return b.id.localeCompare(a.id);
    });

  if (isLoading && outfitsWithRatings.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card variant="glass" padding="lg" rounded="2xl" className="max-w-md mx-4">
          <Loader message="Cargando calificaciones..." />
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card variant="glass" padding="lg" rounded="2xl" className="max-w-4xl w-full my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Calificaciones de Outfits
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded-lg">
            {error}
          </div>
        )}

        {currentStep === 'list' && (
          <>
            {/* Stats Dashboard */}
            {stats.total_ratings > 0 && (
              <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Average Rating */}
                <Card variant="glass" padding="md" rounded="xl">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Promedio General
                  </div>
                  <div className="flex items-center gap-2">
                    {renderStars(Math.round(stats.average_rating))}
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stats.average_rating.toFixed(1)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {stats.total_ratings} outfit{stats.total_ratings !== 1 ? 's' : ''} calificado
                    {stats.total_ratings !== 1 ? 's' : ''}
                  </div>
                </Card>

                {/* Best Outfit */}
                {stats.highest_rated_outfit && (
                  <Card variant="glass" padding="md" rounded="xl">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Mejor Outfit
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      {renderStars(stats.highest_rated_outfit.rating)}
                      <span className="text-lg font-bold text-gray-900 dark:text-white">
                        {stats.highest_rated_outfit.rating}
                      </span>
                    </div>
                    <button
                      onClick={() => onViewOutfit && onViewOutfit(stats.highest_rated_outfit!)}
                      className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                    >
                      Ver outfit →
                    </button>
                  </Card>
                )}

                {/* Worst Outfit */}
                {stats.lowest_rated_outfit && (
                  <Card variant="glass" padding="md" rounded="xl">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Peor Outfit
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      {renderStars(stats.lowest_rated_outfit.rating)}
                      <span className="text-lg font-bold text-gray-900 dark:text-white">
                        {stats.lowest_rated_outfit.rating}
                      </span>
                    </div>
                    <button
                      onClick={() => onViewOutfit && onViewOutfit(stats.lowest_rated_outfit!)}
                      className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                    >
                      Ver outfit →
                    </button>
                  </Card>
                )}
              </div>
            )}

            {/* Filters and Sort */}
            <div className="mb-4 flex flex-wrap gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'rating')}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="date">Más recientes</option>
                <option value="rating">Mayor calificación</option>
              </select>

              <select
                value={filterRating || ''}
                onChange={(e) => setFilterRating(e.target.value ? parseInt(e.target.value) : null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">Todas las calificaciones</option>
                <option value="5">⭐⭐⭐⭐⭐</option>
                <option value="4">⭐⭐⭐⭐</option>
                <option value="3">⭐⭐⭐</option>
                <option value="2">⭐⭐</option>
                <option value="1">⭐</option>
              </select>
            </div>

            {/* Outfits Grid */}
            {filteredOutfits.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <span className="material-symbols-rounded text-6xl mb-4 opacity-30">star</span>
                <p>No hay outfits {filterRating ? `con ${filterRating} estrellas` : 'para mostrar'}</p>
                <p className="text-sm mt-2">
                  {savedOutfits.length === 0
                    ? 'Guardá algunos outfits primero'
                    : 'Empezá calificando tus outfits guardados'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredOutfits.map((outfit) => {
                  const top = getTopForOutfit(outfit);
                  const bottom = getBottomForOutfit(outfit);
                  const shoes = getShoesForOutfit(outfit);

                  return (
                    <Card
                      key={outfit.id}
                      variant="glass"
                      padding="md"
                      rounded="xl"
                      className="hover:shadow-lg transition-shadow"
                    >
                      {/* Outfit Preview */}
                      <div className="flex gap-2 mb-3">
                        {top && (
                          <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                            <img
                              src={top.imageDataUrl}
                              alt="Top"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        {bottom && (
                          <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                            <img
                              src={bottom.imageDataUrl}
                              alt="Bottom"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        {shoes && (
                          <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                            <img
                              src={shoes.imageDataUrl}
                              alt="Shoes"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </div>

                      {/* Rating */}
                      {outfit.rating ? (
                        <div className="mb-2">
                          {renderStars(outfit.rating.rating)}
                          {outfit.rating.notes && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                              {outfit.rating.notes}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="mb-2 text-sm text-gray-500 dark:text-gray-500">
                          Sin calificación
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleEditRating(outfit)}
                          className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
                        >
                          {outfit.rating ? 'Editar' : 'Calificar'}
                        </button>
                        {onViewOutfit && (
                          <button
                            onClick={() => onViewOutfit(outfit)}
                            className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                          >
                            <span className="material-symbols-rounded text-xl">visibility</span>
                          </button>
                        )}
                        {outfit.rating && (
                          <button
                            onClick={() => handleDeleteRating(outfit)}
                            className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                          >
                            <span className="material-symbols-rounded text-xl">delete</span>
                          </button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}

        {currentStep === 'edit' && selectedOutfit && (
          <>
            <button
              onClick={() => setCurrentStep('list')}
              className="mb-4 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <span className="material-symbols-rounded">arrow_back</span>
              Volver
            </button>

            <Card variant="glass" padding="lg" rounded="xl">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Calificar Outfit
              </h3>

              {/* Outfit Preview */}
              <div className="flex gap-3 mb-6">
                {getTopForOutfit(selectedOutfit) && (
                  <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                    <img
                      src={getTopForOutfit(selectedOutfit)!.imageDataUrl}
                      alt="Top"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                {getBottomForOutfit(selectedOutfit) && (
                  <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                    <img
                      src={getBottomForOutfit(selectedOutfit)!.imageDataUrl}
                      alt="Bottom"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                {getShoesForOutfit(selectedOutfit) && (
                  <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                    <img
                      src={getShoesForOutfit(selectedOutfit)!.imageDataUrl}
                      alt="Shoes"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              {/* Rating */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Calificación
                </label>
                {renderInteractiveStars(editRating, setEditRating)}
              </div>

              {/* Notes */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notas (opcional)
                </label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="¿Qué te gustó o no te gustó de este outfit?"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                  rows={3}
                />
              </div>

              {/* Save Button */}
              <button
                onClick={handleSaveRating}
                disabled={isLoading || editRating === 0}
                className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Guardando...' : 'Guardar Calificación'}
              </button>
            </Card>
          </>
        )}
      </Card>
    </div>
  );
};

export default OutfitRatingView;
