import React, { useState, useEffect } from 'react';
import { aiImageService } from '../src/services/aiImageService';
import type { AIGeneratedImage } from '../src/types/api';
import Loader from './Loader';
import { Card } from './ui/Card';

interface GenerationHistoryViewProps {
  onClose: () => void;
  onAddToCloset: (imageDataUrl: string, metadata: any) => void;
}

const GenerationHistoryView = ({ onClose, onAddToCloset }: GenerationHistoryViewProps) => {
  const [generations, setGenerations] = useState<AIGeneratedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedImage, setSelectedImage] = useState<AIGeneratedImage | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async (loadMore = false) => {
    try {
      if (loadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const limit = page * ITEMS_PER_PAGE;
      const history = await aiImageService.getGenerationHistory(limit);

      setGenerations(history);

      // Check if there are more items
      if (history.length < limit) {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    setPage(page + 1);
    loadHistory(true);
  };

  const handleRegeneratePrompt = () => {
    if (!selectedImage) return;
    // Close this modal and open AI Designer with the prompt
    // This would need to be handled by parent component
    onClose();
  };

  const handleAddToCloset = async () => {
    if (!selectedImage) return;

    try {
      await aiImageService.saveToCloset(selectedImage.image_url, selectedImage.prompt);
      onAddToCloset(selectedImage.image_url, {
        category: 'top', // Should come from metadata
        subcategory: 'AI Generated',
        color_primary: '#000000',
        vibe_tags: ['ai-generated'],
        seasons: ['spring', 'summer', 'fall', 'winter'],
      });

      // Refresh the generation to show updated added_to_closet status
      await loadHistory();

      // Close detail modal
      setSelectedImage(null);
    } catch (error) {
      console.error('Error adding to closet:', error);
    }
  };

  const handleShare = () => {
    if (!selectedImage) return;

    // Copy image URL to clipboard
    navigator.clipboard.writeText(selectedImage.image_url);
    alert('Link copiado al portapapeles');
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const bottom =
      e.currentTarget.scrollHeight - e.currentTarget.scrollTop === e.currentTarget.clientHeight;

    if (bottom && hasMore && !loadingMore) {
      handleLoadMore();
    }
  };

  // Detail Modal
  if (selectedImage) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
        <Card
          variant="glass"
          padding="none"
          rounded="3xl"
          className="bg-white dark:bg-gray-900 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm px-6 py-4 border-b border-gray-200 dark:border-gray-700 z-10">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-text-primary dark:text-gray-200">
                Diseño Generado
              </h2>
              <button
                onClick={() => setSelectedImage(null)}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Image */}
            <Card variant="glass" padding="none" rounded="2xl" className="overflow-hidden">
              <img
                src={selectedImage.image_url}
                alt={selectedImage.prompt}
                className="w-full h-auto"
              />
            </Card>

            {/* Prompt */}
            <Card variant="glass" padding="md" rounded="2xl">
              <h3 className="font-bold text-text-primary dark:text-gray-200 mb-2">Prompt Original</h3>
              <p className="text-text-secondary dark:text-gray-300 text-sm">
                {selectedImage.prompt}
              </p>
            </Card>

            {/* Metadata (if available) */}
            {selectedImage.metadata && Object.keys(selectedImage.metadata).length > 0 && (
              <Card variant="glass" padding="md" rounded="2xl">
                <h3 className="font-bold text-text-primary dark:text-gray-200 mb-2">
                  Análisis de IA
                </h3>
                <pre className="text-xs text-text-secondary dark:text-gray-400 overflow-x-auto">
                  {JSON.stringify(selectedImage.metadata, null, 2)}
                </pre>
              </Card>
            )}

            {/* Created At */}
            <div className="text-xs text-text-secondary dark:text-gray-500 text-center">
              Generado el {new Date(selectedImage.created_at).toLocaleDateString('es-AR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={handleRegeneratePrompt}
                className="p-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-text-primary dark:text-gray-200 font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-95 text-sm"
              >
                <span className="flex flex-col items-center gap-1">
                  <span className="material-symbols-outlined text-lg">refresh</span>
                  Regenerar
                </span>
              </button>

              <button
                onClick={handleAddToCloset}
                disabled={selectedImage.added_to_closet}
                className="p-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 text-sm"
              >
                <span className="flex flex-col items-center gap-1">
                  <span className="material-symbols-outlined text-lg">
                    {selectedImage.added_to_closet ? 'check_circle' : 'add'}
                  </span>
                  {selectedImage.added_to_closet ? 'En Closet' : 'Agregar'}
                </span>
              </button>

              <button
                onClick={handleShare}
                className="p-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-text-primary dark:text-gray-200 font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-95 text-sm"
              >
                <span className="flex flex-col items-center gap-1">
                  <span className="material-symbols-outlined text-lg">share</span>
                  Compartir
                </span>
              </button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Main Gallery View
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <Card
        variant="glass"
        padding="none"
        rounded="3xl"
        className="bg-white dark:bg-gray-900 w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-text-primary dark:text-gray-200">
                Mis Diseños AI
              </h2>
              <p className="text-sm text-text-secondary dark:text-gray-400 mt-1">
                {generations.length} {generations.length === 1 ? 'diseño generado' : 'diseños generados'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        {/* Gallery Content */}
        <div className="flex-1 overflow-y-auto p-6" onScroll={handleScroll}>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader />
            </div>
          ) : generations.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-5xl">
                  auto_awesome
                </span>
              </div>
              <h3 className="text-xl font-bold text-text-primary dark:text-gray-200 mb-2">
                Aún no generaste ningún diseño
              </h3>
              <p className="text-text-secondary dark:text-gray-400">
                Usá el AI Fashion Designer para crear tu primera prenda con IA
              </p>
            </div>
          ) : (
            <>
              {/* Gallery Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {generations.map((image) => (
                  <button
                    key={image.id}
                    onClick={() => setSelectedImage(image)}
                    className="group relative aspect-square rounded-lg overflow-hidden hover:ring-2 hover:ring-primary transition-all"
                  >
                    <img
                      src={image.image_url}
                      alt={image.prompt}
                      className="w-full h-full object-cover"
                    />

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end p-3">
                      <div className="text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity line-clamp-2">
                        {image.prompt}
                      </div>
                    </div>

                    {/* Added to Closet Badge */}
                    {image.added_to_closet && (
                      <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">check_circle</span>
                        En Closet
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Load More */}
              {loadingMore && (
                <div className="flex justify-center mt-6">
                  <Loader />
                </div>
              )}

              {!hasMore && generations.length > 0 && (
                <p className="text-center text-text-secondary dark:text-gray-500 text-sm mt-6">
                  Has visto todas tus generaciones
                </p>
              )}
            </>
          )}
        </div>
      </Card>
    </div>
  );
};

export default GenerationHistoryView;
