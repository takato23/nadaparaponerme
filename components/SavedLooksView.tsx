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
        toast.success('Link de compartir copiado');
        // Copy to clipboard
        const shareUrl = `${window.location.origin}/look/${token}`;
        await navigator.clipboard.writeText(shareUrl);
      }
    } catch (error) {
      toast.error('Error al actualizar compartir');
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
      {/* Background */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(circle at 15% 10%, rgba(245, 167, 163, 0.35), transparent 45%), radial-gradient(circle at 85% 0%, rgba(154, 212, 192, 0.35), transparent 40%), linear-gradient(180deg, #f8f3ee 0%, #f0e7dd 50%, #f6f1ea 100%)'
        }}
      />

      {/* Header */}
      <header className="px-4 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="w-11 h-11 rounded-full bg-white/70 backdrop-blur-md border border-white/60 flex items-center justify-center shadow-sm hover:shadow-md transition"
            aria-label="Volver"
          >
            <span className="material-symbols-outlined text-[color:var(--studio-ink)]">arrow_back</span>
          </button>
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--studio-ink-muted)]">Armario de looks</p>
            <h1 className="text-2xl font-semibold" style={{ fontFamily: '"Playfair Display", serif' }}>
              Armario de looks
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

        {/* Filters */}
        <motion.section variants={itemVariants} className="mb-4">
          <div className="flex gap-2">
            {[
              { id: 'all' as FilterMode, label: 'Todos', count: stats?.total },
              { id: 'favorites' as FilterMode, label: 'Favoritos', count: stats?.favorites },
              { id: 'shared' as FilterMode, label: 'Compartidos', count: stats?.shared },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${filter === f.id
                  ? 'bg-[color:var(--studio-ink)] text-white shadow-sm'
                  : 'bg-white/60 text-[color:var(--studio-ink-muted)] border border-white/70'
                  }`}
              >
                {f.label} ({f.count || 0})
              </button>
            ))}
          </div>
        </motion.section>

        {/* Looks grid */}
        <motion.section variants={itemVariants}>
          {looks.length === 0 ? (
            <div className="rounded-2xl bg-white/50 border border-white/60 p-8 text-center">
              <span className="material-symbols-outlined text-4xl text-[color:var(--studio-ink-muted)] mb-3 block">
                photo_library
              </span>
              <p className="text-sm text-[color:var(--studio-ink-muted)]">
                {filter === 'all'
                  ? 'Todavía no tenés looks en tu armario. Generá uno en el Studio.'
                  : filter === 'favorites'
                    ? 'No tenés looks favoritos.'
                    : 'No tenés looks compartidos.'}
              </p>
              {filter === 'all' && (
                <button
                  onClick={() => navigate('/studio')}
                  className="mt-4 px-4 py-2 rounded-xl bg-[color:var(--studio-ink)] text-white text-sm font-semibold"
                >
                  Ir al Studio
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <AnimatePresence>
                {looks.map(look => (
                  <motion.div
                    key={look.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="relative rounded-2xl overflow-hidden shadow-lg group cursor-pointer"
                    onClick={() => openDetail(look)}
                  >
                    <img
                      src={look.image_url}
                      alt={look.title || 'Look generado'}
                      className="w-full aspect-[3/4] object-cover"
                    />

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    {/* Badges */}
                    <div className="absolute top-2 right-2 flex gap-1">
                      {look.is_favorite && (
                        <span className="w-6 h-6 rounded-full bg-white/90 flex items-center justify-center"><span className="material-symbols-rounded text-red-500 text-sm">favorite</span></span>
                      )}
                      {look.is_public && (
                        <span className="w-6 h-6 rounded-full bg-white/90 flex items-center justify-center"><span className="material-symbols-rounded text-blue-500 text-sm">link</span></span>
                      )}
                    </div>

                    {/* Date */}
                    <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-xs text-white/80 truncate">
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
              className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setIsDetailOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
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
                        {/* Slider line */}
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg cursor-ew-resize"
                          style={{ left: `${comparePosition}%` }}
                        >
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center">
                            <span className="material-symbols-outlined text-gray-700 text-sm">drag_handle</span>
                          </div>
                        </div>
                        {/* Labels */}
                        <div className="absolute top-3 left-3 px-2 py-1 rounded bg-black/50 text-white text-xs font-semibold">
                          Antes
                        </div>
                        <div className="absolute top-3 right-12 px-2 py-1 rounded bg-black/50 text-white text-xs font-semibold">
                          Después
                        </div>
                      </div>
                    ) : (
                      <img
                        src={selectedLook.image_url}
                        alt={selectedLook.title || 'Look'}
                        className="w-full aspect-[4/5] object-cover"
                      />
                    )}
                    {/* Close button */}
                    <button
                      onClick={() => setIsDetailOpen(false)}
                      className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg"
                    >
                      <span className="material-symbols-outlined">close</span>
                    </button>
                    {/* Compare toggle */}
                    {selectedLook.selfie_url && (
                      <button
                        onClick={() => setCompareMode(!compareMode)}
                        className={`absolute top-4 left-4 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition ${compareMode ? 'bg-yellow-500 text-black' : 'bg-white/90 text-gray-700'
                          }`}
                      >
                        <span className="material-symbols-outlined">compare</span>
                      </button>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                    {/* Title & date */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h2 className="text-lg font-semibold">
                          {selectedLook.title || 'Look generado'}
                        </h2>
                        <p className="text-xs text-gray-500">
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
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${selectedLook.generation_model?.includes('3-pro')
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-gray-100 text-gray-700'
                        }`}>
                        {selectedLook.generation_model?.includes('3-pro') ? 'Ultra' : 'Rápido'}
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
                      <div className="mb-4">
                        <ShopTheLookPanel
                          items={shopLookItems}
                          title="Comprar este look"
                          variant="default"
                          className="bg-white/70 border border-white/60 shadow-none"
                        />
                      </div>
                    )}

                    {/* Share link */}
                    {selectedLook.is_public && selectedLook.share_token && (
                      <div className="mb-4 p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <p className="text-xs text-gray-500 mb-1">Link para compartir:</p>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={`${window.location.origin}/look/${selectedLook.share_token}`}
                            className="flex-1 text-xs bg-white rounded px-2 py-1.5 border border-gray-200"
                          />
                          <button
                            onClick={async () => {
                              await navigator.clipboard.writeText(
                                `${window.location.origin}/look/${selectedLook.share_token}`
                              );
                              toast.success('Link copiado');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-semibold"
                          >
                            Copiar
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Actions Row 1 */}
                    <div className="flex gap-2 mb-2">
                      <button
                        onClick={() => handleToggleFavorite(selectedLook)}
                        disabled={actionLoading === selectedLook.id}
                        className={`flex-1 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition ${selectedLook.is_favorite
                          ? 'bg-[color:var(--studio-rose)] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                      >
                        {actionLoading === selectedLook.id ? (
                          <Loader size="small" />
                        ) : (
                          <>
                            <span className="material-symbols-rounded text-lg">{selectedLook.is_favorite ? 'favorite' : 'favorite_border'}</span>
                            {selectedLook.is_favorite ? 'Favorito' : 'Agregar'}
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleToggleShare(selectedLook)}
                        disabled={actionLoading === selectedLook.id}
                        className={`flex-1 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition ${selectedLook.is_public
                          ? 'bg-[color:var(--studio-mint)] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                      >
                        {actionLoading === selectedLook.id ? (
                          <Loader size="small" />
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-base">
                              {selectedLook.is_public ? 'link' : 'link_off'}
                            </span>
                            {selectedLook.is_public ? 'Compartido' : 'Compartir'}
                          </>
                        )}
                      </button>
                    </div>

                    {/* Actions Row 2 */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDownload(selectedLook)}
                        className="flex-1 py-3 rounded-xl bg-gray-100 font-semibold text-sm text-gray-700 flex items-center justify-center gap-2 hover:bg-gray-200 transition"
                      >
                        <span className="material-symbols-outlined text-base">download</span>
                        Descargar
                      </button>

                      <button
                        onClick={() => {
                          setIsDetailOpen(false);
                          openEditModal(selectedLook);
                        }}
                        className="flex-1 py-3 rounded-xl bg-gray-100 font-semibold text-sm text-gray-700 flex items-center justify-center gap-2 hover:bg-gray-200 transition"
                      >
                        <span className="material-symbols-outlined text-base">edit</span>
                        Editar
                      </button>

                      <button
                        onClick={() => handleDelete(selectedLook)}
                        disabled={actionLoading === selectedLook.id}
                        className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 transition"
                      >
                        {actionLoading === selectedLook.id ? (
                          <Loader size="small" />
                        ) : (
                          <span className="material-symbols-outlined">delete</span>
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
