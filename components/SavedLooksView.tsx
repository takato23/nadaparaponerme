import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import type { GeneratedLook, ClothingItem } from '../types';
import { SLOT_CONFIGS, GENERATION_PRESETS } from '../types';
import {
  getGeneratedLooks,
  getLookStats,
  toggleLookFavorite,
  deleteGeneratedLook,
  enableLookSharing,
  disableLookSharing,
} from '../src/services/generatedLooksService';
import Loader from './Loader';
import EditLookModal from './EditLookModal';
import ShopTheLookPanel from './ShopTheLookPanel';
import LiquidMorphBackground from './LiquidMorphBackground';

interface SavedLooksViewProps {
  closet: ClothingItem[];
}

type FilterMode = 'all' | 'favorites' | 'shared';

const studioTheme = {
  '--studio-ink': '#1b1a17',
  '--studio-ink-muted': 'rgba(27, 26, 23, 0.6)',
  '--studio-paper': '#f8f3ee',
  '--studio-cream': '#f2ece4',
  '--studio-rose': '#f5a7a3',
  '--studio-mint': '#9ad4c0',
  '--studio-gold': '#f6c681',
} as React.CSSProperties;
const EASE_STANDARD: [number, number, number, number] = [0.22, 1, 0.36, 1];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE_STANDARD } }
};

export default function SavedLooksView({ closet }: SavedLooksViewProps) {
  const navigate = useNavigate();
  const [looks, setLooks] = useState<GeneratedLook[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    favorites: number;
    shared: number;
    limit: number;
    tier: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterMode>('all');
  const [selectedLook, setSelectedLook] = useState<GeneratedLook | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingLook, setEditingLook] = useState<GeneratedLook | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [comparePosition, setComparePosition] = useState(50);

  // Load looks and stats
  const loadData = useCallback(async () => {
    try {
      const [looksData, statsData] = await Promise.all([
        getGeneratedLooks({ favoritesOnly: filter === 'favorites' }),
        getLookStats()
      ]);

      let filtered = looksData;
      if (filter === 'shared') {
        filtered = looksData.filter(l => l.is_public);
      }

      setLooks(filtered);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading looks:', error);
      toast.error('Error al cargar los looks');
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Get clothing item by ID
  const getItemById = useCallback((itemId: string | undefined): ClothingItem | undefined => {
    if (!itemId) return undefined;
    return closet.find(item => item.id === itemId);
  }, [closet]);

  const shopLookItems = useMemo(() => {
    if (!selectedLook) return [];

    return SLOT_CONFIGS.map((config) => {
      const itemId = selectedLook.source_items[config.id];
      if (!itemId) return null;
      const item = getItemById(itemId);
      if (!item) return null;
      return { slot: config.id, item, label: config.labelShort };
    }).filter(Boolean) as { slot: string; item: ClothingItem; label?: string }[];
  }, [selectedLook, getItemById]);

  // Handle favorite toggle
  const handleToggleFavorite = async (look: GeneratedLook) => {
    setActionLoading(look.id);
    try {
      const newStatus = await toggleLookFavorite(look.id);
      setLooks(prev => prev.map(l =>
        l.id === look.id ? { ...l, is_favorite: newStatus } : l
      ));
      if (selectedLook?.id === look.id) {
        setSelectedLook(prev => prev ? { ...prev, is_favorite: newStatus } : null);
      }
      toast.success(newStatus ? 'Agregado a favoritos' : 'Quitado de favoritos');
    } catch (error) {
      toast.error('Error al actualizar favorito');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle share toggle
  const handleToggleShare = async (look: GeneratedLook) => {
    setActionLoading(look.id);
    try {
      if (look.is_public) {
        await disableLookSharing(look.id);
        setLooks(prev => prev.map(l =>
          l.id === look.id ? { ...l, is_public: false, share_token: undefined } : l
        ));
        if (selectedLook?.id === look.id) {
          setSelectedLook(prev => prev ? { ...prev, is_public: false, share_token: undefined } : null);
        }
        toast.success('Link de compartir desactivado');
      } else {
        const token = await enableLookSharing(look.id);
        setLooks(prev => prev.map(l =>
          l.id === look.id ? { ...l, is_public: true, share_token: token } : l
        ));
        if (selectedLook?.id === look.id) {
          setSelectedLook(prev => prev ? { ...prev, is_public: true, share_token: token } : null);
        }
        // Copy to clipboard
        const shareUrl = `${window.location.origin}/look/${token}`;
        try {
          await navigator.clipboard.writeText(shareUrl);
          toast.success('Link de compartir copiado');
        } catch {
          toast.success('Link habilitado. Copialo manualmente desde el detalle.');
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al actualizar compartir';
      if (message.includes('No autenticado')) {
        toast.error('Tenés que iniciar sesión para compartir.');
      } else if (message.includes('plan')) {
        toast.error('Tu plan actual no permite compartir looks.');
      } else if (message.includes('permite') || message.includes('límite')) {
        toast.error(message);
      } else {
        toast.error(message || 'Error al actualizar compartir');
      }
    } finally {
      setActionLoading(null);
    }
  };

  // Handle delete
  const handleDelete = async (look: GeneratedLook) => {
    if (!confirm('¿Seguro que querés eliminar este look?')) return;

    setActionLoading(look.id);
    try {
      await deleteGeneratedLook(look.id);
      setLooks(prev => prev.filter(l => l.id !== look.id));
      if (selectedLook?.id === look.id) {
        setIsDetailOpen(false);
        setSelectedLook(null);
      }
      toast.success('Look eliminado');
      // Refresh stats
      const newStats = await getLookStats();
      setStats(newStats);
    } catch (error) {
      toast.error('Error al eliminar');
    } finally {
      setActionLoading(null);
    }
  };

  // Download look image
  const handleDownload = async (look: GeneratedLook) => {
    try {
      const response = await fetch(look.image_url);
      if (!response.ok) {
        throw new Error('No se pudo descargar la imagen del look.');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `look-${look.title || look.id.slice(0, 8)}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Descargando...');
    } catch (err) {
      console.error('Download failed:', err);
      toast.error('Error al descargar');
    }
  };

  // Open edit modal
  const openEditModal = (look: GeneratedLook) => {
    setEditingLook(look);
    setIsEditOpen(true);
  };

  // Handle edit save
  const handleEditSave = (updatedLook: GeneratedLook) => {
    setLooks(prev => prev.map(l => l.id === updatedLook.id ? updatedLook : l));
    if (selectedLook?.id === updatedLook.id) {
      setSelectedLook(updatedLook);
    }
  };

  // Open detail modal
  const openDetail = (look: GeneratedLook) => {
    setSelectedLook(look);
    setIsDetailOpen(true);
    setCompareMode(false);
    setComparePosition(50);
  };

  // Get slot info for a look
  const getSlotInfo = (look: GeneratedLook) => {
    const items = look.source_items;
    const usedSlots: Array<{ slot: string; item?: ClothingItem }> = [];

    SLOT_CONFIGS.forEach(config => {
      const itemId = items[config.id as keyof typeof items];
      if (itemId) {
        usedSlots.push({ slot: config.labelShort, item: getItemById(itemId) });
      }
    });

    return usedSlots;
  };

  const usagePercentage = stats ? Math.round((stats.total / stats.limit) * 100) : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={studioTheme}>
        <Loader />
      </div>
    );
  }

  return (
    <div
      className="relative min-h-screen overflow-hidden text-[color:var(--studio-ink)]"
      style={{ ...studioTheme, fontFamily: '"Poppins", sans-serif' }}
    >
      {/* Background - Liquid Glass */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <LiquidMorphBackground />
        {/* Capa extra de unificación para dark mode si es necesario */}
        <div className="absolute inset-0 bg-white/20 dark:bg-black/40 backdrop-blur-[2px]"></div>
      </div>

      {/* Header */}
      <header className="px-5 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-4 sticky top-0 z-40 bg-white/40 dark:bg-black/20 backdrop-blur-xl border-b border-white/20 dark:border-white/5">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="w-11 h-11 rounded-[1.15rem] bg-white/50 dark:bg-white/5 backdrop-blur-md border border-white/60 dark:border-white/10 flex items-center justify-center shadow-sm hover:shadow-md hover:scale-105 active:scale-95 transition-all text-gray-800 dark:text-gray-200"
            aria-label="Volver"
          >
            <span className="material-symbols-rounded">arrow_back</span>
          </button>
          <div className="text-right flex flex-col items-end">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="material-symbols-rounded text-sm text-fuchsia-500 drop-shadow-sm">auto_awesome</span>
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-500 dark:text-gray-400">Armario de looks</p>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-white dark:via-gray-200 dark:to-white">
              Digital Wardrobe
            </h1>
          </div>
        </div>
      </header>

      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="px-4 pb-[calc(6rem+env(safe-area-inset-bottom))]"
      >
        {/* Storage usage */}
        {stats && (
          <motion.section variants={itemVariants} className="mb-4">
            <div className="rounded-2xl bg-white/70 backdrop-blur-md border border-white/60 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[color:var(--studio-ink-muted)]">
                  {stats.total} de {stats.limit} looks ({stats.tier})
                </span>
                <span className="text-xs font-semibold">{usagePercentage}%</span>
              </div>
              <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(usagePercentage, 100)}%`,
                    background: usagePercentage > 80 ? '#f5a7a3' : '#9ad4c0'
                  }}
                />
              </div>
              <div className="flex gap-4 mt-3 text-xs text-[color:var(--studio-ink-muted)]">
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-red-500 text-sm">favorite</span> {stats.favorites} favoritos</span>
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-blue-500 text-sm">link</span> {stats.shared} compartidos</span>
              </div>
            </div>
          </motion.section>
        )}

        {/* Filters - Pill Selectors */}
        <motion.section variants={itemVariants} className="mb-6 mt-4">
          <div className="flex gap-2 p-1 bg-white/40 dark:bg-black/20 backdrop-blur-md border border-white/50 dark:border-white/10 rounded-2xl w-fit shadow-sm overflow-x-auto hide-scrollbar">
            {[
              { id: 'all' as FilterMode, label: 'Todos', count: stats?.total, icon: 'grid_view' },
              { id: 'favorites' as FilterMode, label: 'Favoritos', count: stats?.favorites, icon: 'favorite' },
              { id: 'shared' as FilterMode, label: 'Compartidos', count: stats?.shared, icon: 'link' },
            ].map(f => {
              const isActive = filter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`relative px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${isActive
                    ? 'text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="saved-looks-filter"
                      className="absolute inset-0 bg-gray-900 dark:bg-white rounded-xl shadow-md"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <span className={`material-symbols-rounded text-[16px] ${isActive ? (f.id === 'favorites' ? 'text-rose-400' : f.id === 'shared' ? 'text-blue-400' : '') : ''}`}>
                      {f.icon}
                    </span>
                    {f.label}
                    <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] ${isActive ? 'bg-white/20 dark:bg-black/20 text-white dark:text-gray-900' : 'bg-gray-200 dark:bg-gray-800 text-gray-500'}`}>
                      {f.count || 0}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </motion.section>

        {/* Looks Grid - Masonry */}
        <motion.section variants={itemVariants}>
          {looks.length === 0 ? (
            <div className="rounded-3xl bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/50 dark:border-white/10 p-10 text-center shadow-sm">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
                <span className="material-symbols-rounded text-4xl text-violet-500 drop-shadow-sm">
                  photo_library
                </span>
              </div>
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
                {filter === 'all'
                  ? 'Tu armario digital está vacío.'
                  : filter === 'favorites'
                    ? 'Aún no marcaste ningún look como favorito.'
                    : 'No compartiste ningún look todavía.'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Generá nuevos looks en el Studio para llenar esta galería.
              </p>
              {filter === 'all' && (
                <button
                  onClick={() => navigate('/studio')}
                  className="mt-6 px-6 py-2.5 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-bold shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
                >
                  Ir al Studio
                </button>
              )}
            </div>
          ) : (
            <div className="columns-2 sm:columns-3 gap-3 space-y-3 pb-8">
              <AnimatePresence>
                {looks.map(look => (
                  <motion.div
                    key={look.id}
                    layoutId={`look-${look.id}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative rounded-[20px] overflow-hidden shadow-sm hover:shadow-xl group cursor-pointer border border-white/30 dark:border-white/10 bg-white/20 dark:bg-black/20 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 block break-inside-avoid"
                    onClick={() => openDetail(look)}
                  >
                    <img
                      src={look.image_url}
                      alt={look.title || 'Look generado'}
                      loading="lazy"
                      className="w-full h-auto object-cover"
                    />

                    {/* Premium Hover Glow */}
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                    {/* Gradient Overlay for Text */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-60 group-hover:opacity-80 transition-opacity pointer-events-none" />

                    {/* Glass Badges */}
                    <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 z-10">
                      {look.is_favorite && (
                        <span className="w-7 h-7 rounded-full bg-white/80 dark:bg-black/60 backdrop-blur-md flex items-center justify-center shadow-sm border border-white/40 dark:border-white/10">
                          <span className="material-symbols-rounded text-rose-500 text-[15px] drop-shadow-sm">heart_check</span>
                        </span>
                      )}
                      {look.is_public && (
                        <span className="w-7 h-7 rounded-full bg-white/80 dark:bg-black/60 backdrop-blur-md flex items-center justify-center shadow-sm border border-white/40 dark:border-white/10">
                          <span className="material-symbols-rounded text-blue-500 text-[15px] drop-shadow-sm">link</span>
                        </span>
                      )}
                    </div>

                    {/* Date & Title */}
                    <div className="absolute bottom-3 left-3 right-3 z-10 transform translate-y-1 group-hover:translate-y-0 transition-transform">
                      <p className="text-xs font-bold text-white drop-shadow-sm truncate mb-0.5">
                        {look.title || "Outfit Diario"}
                      </p>
                      <p className="text-[10px] text-white/80 truncate font-medium uppercase tracking-wide">
                        {new Date(look.created_at).toLocaleDateString('es-AR', {
                          day: 'numeric',
                          month: 'short'
                        })}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.section>
      </motion.main>

      {/* Detail Modal */}
      {createPortal(
        <AnimatePresence>
          {isDetailOpen && selectedLook && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
              onClick={() => setIsDetailOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="w-full max-w-lg bg-white/85 dark:bg-[#05060a]/80 backdrop-blur-3xl border border-white/50 dark:border-white/10 rounded-[32px] overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()}
              >
                <div className="overflow-y-auto custom-scrollbar w-full flex-1">
                  {/* Image with comparison */}
                  <div className="relative">
                    {compareMode && selectedLook.selfie_url ? (
                      // Comparison mode - before/after slider
                      <div
                        className="relative w-full aspect-[4/5] select-none"
                        onMouseMove={(e) => {
                          if (e.buttons === 1) {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = ((e.clientX - rect.left) / rect.width) * 100;
                            setComparePosition(Math.max(0, Math.min(100, x)));
                          }
                        }}
                        onTouchMove={(e) => {
                          const touch = e.touches[0];
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = ((touch.clientX - rect.left) / rect.width) * 100;
                          setComparePosition(Math.max(0, Math.min(100, x)));
                        }}
                      >
                        {/* Before (selfie) - full background */}
                        <img
                          src={selectedLook.selfie_url}
                          alt="Antes"
                          className="absolute inset-0 w-full h-full object-cover"
                          draggable={false}
                        />
                        {/* After (generated) - clipped */}
                        <div
                          className="absolute inset-0 overflow-hidden"
                          style={{ clipPath: `inset(0 ${100 - comparePosition}% 0 0)` }}
                        >
                          <img
                            src={selectedLook.image_url}
                            alt="Después"
                            className="w-full h-full object-cover"
                            draggable={false}
                          />
                        </div>
                        {/* Slider line - Refined */}
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-gradient-to-b from-white/0 via-white/80 to-white/0 shadow-[0_0_10px_rgba(255,255,255,0.5)] cursor-ew-resize"
                          style={{ left: `${comparePosition}%` }}
                        >
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-md shadow-lg border border-white/50 flex items-center justify-center hover:scale-110 transition-transform">
                            <span className="material-symbols-rounded text-gray-700 text-sm">drag_handle</span>
                          </div>
                        </div>
                        {/* Labels - Refined */}
                        <div className="absolute top-4 left-4 px-3 py-1.5 rounded-xl bg-black/40 backdrop-blur-md text-white text-[10px] font-bold tracking-wide uppercase border border-white/20">
                          Antes
                        </div>
                        <div className="absolute top-4 right-4 px-3 py-1.5 rounded-xl bg-black/40 backdrop-blur-md text-white text-[10px] font-bold tracking-wide uppercase border border-white/20">
                          Después
                        </div>
                      </div>
                    ) : (
                      <div className="relative group">
                        <img
                          src={selectedLook.image_url}
                          alt={selectedLook.title || 'Look'}
                          className="w-full aspect-[4/5] object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                      </div>
                    )}
                    {/* Close button - Refined */}
                    <button
                      onClick={() => setIsDetailOpen(false)}
                      className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/30 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg hover:bg-black/50 transition-colors z-10"
                    >
                      <span className="material-symbols-rounded text-white">close</span>
                    </button>
                    {/* Compare toggle - Refined */}
                    {selectedLook.selfie_url && (
                      <button
                        onClick={() => setCompareMode(!compareMode)}
                        className={`absolute top-4 left-4 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all border z-10 ${compareMode ? 'bg-fuchsia-500 text-white border-fuchsia-400' : 'bg-black/30 backdrop-blur-md text-white border-white/20 hover:bg-black/50'
                          }`}
                      >
                        <span className="material-symbols-rounded text-[20px]">compare</span>
                      </button>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
                    {/* Title & date */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                          {selectedLook.title || 'Outfit Diario'}
                        </h2>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          {new Date(selectedLook.created_at).toLocaleDateString('es-AR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Generation metadata badges */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {/* Model */}
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                        Nano 3.1
                      </span>
                      {/* Preset */}
                      <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">
                        {GENERATION_PRESETS.find(p => p.id === selectedLook.generation_preset)?.label || selectedLook.generation_preset}
                      </span>
                      {/* Keep pose */}
                      {selectedLook.keep_pose && (
                        <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">person_pin</span>
                          Pose fija
                        </span>
                      )}
                      {/* Face refs */}
                      {(selectedLook.face_refs_used ?? 0) > 0 && (
                        <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">face</span>
                          {selectedLook.face_refs_used} ref
                        </span>
                      )}
                    </div>

                    {/* Slots used */}
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 mb-2">Prendas usadas:</p>
                      <div className="flex flex-wrap gap-2">
                        {getSlotInfo(selectedLook).map((slot, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-100">
                            {slot.item ? (
                              <img
                                src={slot.item.imageDataUrl}
                                alt={slot.slot}
                                className="w-6 h-6 rounded object-cover"
                              />
                            ) : (
                              <span className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center text-xs">?</span>
                            )}
                            <span className="text-xs text-gray-600">{slot.slot}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {shopLookItems.length > 0 && (
                      <div className="mb-6">
                        <ShopTheLookPanel
                          items={shopLookItems}
                          title="Comprar este look"
                          variant="default"
                          className="bg-white/50 dark:bg-black/20 backdrop-blur-md border border-white/60 dark:border-white/10 shadow-sm rounded-2xl"
                        />
                      </div>
                    )}

                    {/* Share link - Refined */}
                    {selectedLook.is_public && selectedLook.share_token && (
                      <div className="mb-6 p-4 rounded-2xl bg-white/40 dark:bg-white/5 backdrop-blur-md border border-white/50 dark:border-white/10 shadow-sm">
                        <p className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-2">Enlace compartido:</p>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={`${window.location.origin}/look/${selectedLook.share_token}`}
                            className="flex-1 text-xs bg-white/60 dark:bg-black/40 rounded-xl px-3 py-2 border border-white/50 dark:border-white/10 text-gray-900 dark:text-white font-medium focus:outline-none"
                          />
                          <button
                            onClick={async () => {
                              const shareUrl = `${window.location.origin}/look/${selectedLook.share_token}`;
                              try {
                                await navigator.clipboard.writeText(shareUrl);
                                toast.success('Link copiado');
                              } catch {
                                toast.error('No se pudo copiar. Mantené el texto seleccionado manualmente.');
                              }
                            }}
                            className="px-4 py-2 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-all"
                          >
                            Copiar
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Actions Row 1 - Primary & Secondary */}
                    <div className="flex gap-3 mb-3">
                      <button
                        onClick={() => handleToggleFavorite(selectedLook)}
                        disabled={actionLoading === selectedLook.id}
                        className={`flex-1 py-3.5 rounded-[1.25rem] font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm ${selectedLook.is_favorite
                          ? 'bg-rose-500 text-white shadow-rose-500/20 shadow-lg'
                          : 'bg-white/50 dark:bg-white/5 backdrop-blur-md border border-white/60 dark:border-white/10 text-gray-800 dark:text-gray-200 hover:bg-white/80 dark:hover:bg-white/10'
                          }`}
                      >
                        {actionLoading === selectedLook.id ? (
                          <Loader size="small" />
                        ) : (
                          <>
                            <span className="material-symbols-rounded text-[20px]">{selectedLook.is_favorite ? 'heart_check' : 'favorite'}</span>
                            {selectedLook.is_favorite ? 'Guardado' : 'Favorito'}
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleToggleShare(selectedLook)}
                        disabled={actionLoading === selectedLook.id}
                        className={`flex-1 py-3.5 rounded-[1.25rem] font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm ${selectedLook.is_public
                          ? 'bg-blue-500 text-white shadow-blue-500/20 shadow-lg'
                          : 'bg-white/50 dark:bg-white/5 backdrop-blur-md border border-white/60 dark:border-white/10 text-gray-800 dark:text-gray-200 hover:bg-white/80 dark:hover:bg-white/10'
                          }`}
                      >
                        {actionLoading === selectedLook.id ? (
                          <Loader size="small" />
                        ) : (
                          <>
                            <span className="material-symbols-rounded text-[20px]">
                              {selectedLook.is_public ? 'link' : 'ios_share'}
                            </span>
                            {selectedLook.is_public ? 'Compartitdo' : 'Compartir'}
                          </>
                        )}
                      </button>
                    </div>

                    {/* Actions Row 2 - Tertiary */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleDownload(selectedLook)}
                        className="flex-1 py-3.5 rounded-[1.25rem] bg-transparent border border-gray-200 dark:border-gray-800 font-bold text-sm text-gray-600 dark:text-gray-400 flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                      >
                        <span className="material-symbols-rounded text-[18px]">download</span>
                        Guardar
                      </button>

                      <button
                        onClick={() => {
                          setIsDetailOpen(false);
                          openEditModal(selectedLook);
                        }}
                        className="flex-1 py-3.5 rounded-[1.25rem] bg-transparent border border-gray-200 dark:border-gray-800 font-bold text-sm text-gray-600 dark:text-gray-400 flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                      >
                        <span className="material-symbols-rounded text-[18px]">edit</span>
                        Editar
                      </button>

                      <button
                        onClick={() => handleDelete(selectedLook)}
                        disabled={actionLoading === selectedLook.id}
                        className="w-[52px] h-[52px] shrink-0 rounded-[1.25rem] bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                        title="Eliminar Look"
                      >
                        {actionLoading === selectedLook.id ? (
                          <Loader size="small" />
                        ) : (
                          <span className="material-symbols-rounded text-[20px]">delete</span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* FAB to Studio */}
      <button
        onClick={() => navigate('/studio')}
        className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 w-14 h-14 rounded-full bg-[color:var(--studio-ink)] text-white shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition z-30"
        aria-label="Ir al Studio"
      >
        <span className="material-symbols-outlined">add_photo_alternate</span>
      </button>

      {/* Edit Modal */}
      <EditLookModal
        look={editingLook}
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setEditingLook(null);
        }}
        onSave={handleEditSave}
      />
    </div>
  );
}
