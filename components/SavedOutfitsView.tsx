import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import type { ClothingItem, LookFolder, SavedOutfit } from '../types';
import { Card } from './ui/Card';
import { EmptyState } from './ui/EmptyState';
import { ROUTES } from '../src/routes';
import { getLookFolders } from '../src/services/outfitService';
import { getPreferredClothingImage } from '../src/utils/closetImages';

interface SavedOutfitsViewProps {
  savedOutfits: SavedOutfit[];
  closet: ClothingItem[];
  onSelectOutfit: (id: string) => void;
}

type SortOption = 'recent' | 'oldest' | 'name';
type SourceFilter = 'all' | 'manual' | 'ai_recommendation';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'recent', label: 'Recientes' },
  { value: 'oldest', label: 'Antiguos' },
  { value: 'name', label: 'A-Z' },
];

const SOURCE_OPTIONS: { value: SourceFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'manual', label: 'Manual' },
  { value: 'ai_recommendation', label: 'IA' },
];

const sourceLabel: Record<string, string> = {
  manual: 'Manual',
  ai_recommendation: 'IA',
  reference_recreation: 'Referencia',
  planner: 'Planner',
  community_import: 'Comunidad',
};

export default function SavedOutfitsView({ savedOutfits, closet, onSelectOutfit }: SavedOutfitsViewProps) {
  const navigate = useNavigate();
  const [folders, setFolders] = useState<LookFolder[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [folderFilter, setFolderFilter] = useState<string>('all');

  useEffect(() => {
    let cancelled = false;

    const loadFolders = async () => {
      try {
        const data = await getLookFolders();
        if (!cancelled) {
          setFolders(data);
        }
      } catch (error) {
        console.error('Failed to load look folders:', error);
      }
    };

    void loadFolders();
    return () => {
      cancelled = true;
    };
  }, []);

  const folderMap = useMemo(() => {
    const map = new Map<string, string>();
    folders.forEach((folder) => map.set(folder.id, folder.name));
    return map;
  }, [folders]);

  const findItem = (id: string) => closet.find((item) => item.id === id);

  const filteredAndSortedOutfits = useMemo(() => {
    let filtered = [...savedOutfits];

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      filtered = filtered.filter((outfit) => {
        const haystack = [
          outfit.name,
          outfit.explanation,
          outfit.occasion,
          outfit.description,
          folderMap.get(outfit.folder_id || ''),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(query);
      });
    }

    if (sourceFilter !== 'all') {
      filtered = filtered.filter((outfit) => (outfit.source || 'manual') === sourceFilter);
    }

    if (folderFilter !== 'all') {
      filtered = filtered.filter((outfit) => (outfit.folder_id || '') === folderFilter);
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return a.id.localeCompare(b.id);
        case 'name':
          return (a.name || a.explanation).localeCompare(b.name || b.explanation);
        case 'recent':
        default:
          return b.id.localeCompare(a.id);
      }
    });

    return filtered;
  }, [folderFilter, folderMap, savedOutfits, searchQuery, sortBy, sourceFilter]);

  const handleShare = async (outfit: SavedOutfit, event: React.MouseEvent) => {
    event.stopPropagation();

    const payload = [outfit.name, outfit.explanation, outfit.occasion].filter(Boolean).join('\n');
    if (!payload) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title: outfit.name || 'Mi look guardado',
          text: payload,
        });
      } else {
        await navigator.clipboard.writeText(payload);
        toast.success('Look copiado al portapapeles');
      }
    } catch {
      await navigator.clipboard.writeText(payload);
      toast.success('Look copiado al portapapeles');
    }
  };

  if (savedOutfits.length === 0) {
    return (
      <div className="relative flex h-full min-h-full items-center justify-center overflow-hidden bg-[linear-gradient(180deg,#f7f0e8_0%,#fbf8f4_42%,#f1ece5_100%)] p-6">
        <div className="noise-overlay opacity-[0.04]" />
        <div className="relative flex max-w-xl flex-col items-center rounded-[2.4rem] border border-white/70 bg-white/52 px-8 py-10 text-center shadow-[0_24px_70px_rgba(24,24,27,0.12)] backdrop-blur-[24px]">
          <div className="mb-5 rounded-full border border-black/8 bg-black/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.28em] text-black/55">
            Looks
          </div>
          <EmptyState
            icon="style"
            title="Todavía no guardaste looks"
            description="Armá combinaciones desde Armario y guardalas acá para repetirlas mejor."
          />
          <button
            type="button"
            onClick={() => navigate(ROUTES.CLOSET)}
            className="mt-6 rounded-full bg-[#171717] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_34px_rgba(0,0,0,0.18)] transition hover:scale-[1.02]"
          >
            Ir a Armario
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-full flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.55),_transparent_32%),linear-gradient(180deg,#f8f2ea_0%,#fbf8f4_38%,#f2ece4_100%)]">
      <div className="noise-overlay opacity-[0.04]" />

      <header className="sticky top-0 z-20 px-6 pb-4 pt-10 backdrop-blur-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/42">Looks</p>
            <h1 className="text-4xl font-semibold tracking-[-0.04em] text-[#171717]">Tu biblioteca de looks</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-black/58">
              Acá viven las combinaciones que ya resolviste desde tu armario: manuales o recomendadas por IA.
            </p>
          </div>
          <span className="rounded-full border border-white/70 bg-white/45 px-3 py-1.5 text-sm font-semibold text-black/58 shadow-[0_10px_24px_rgba(0,0,0,0.06)] backdrop-blur-xl">
            {filteredAndSortedOutfits.length} look{filteredAndSortedOutfits.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px_200px]">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
              search
            </span>
            <input
              type="text"
              placeholder="Buscar por nombre, ocasión o carpeta"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full rounded-2xl border border-white/70 bg-white/60 py-3 pl-10 pr-4 text-sm font-medium text-text-primary outline-none focus:ring-2 focus:ring-[#cae8ea]"
            />
          </div>

          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as SortOption)}
            className="rounded-2xl border border-white/70 bg-white/60 px-4 py-3 text-sm font-medium text-text-primary outline-none"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={sourceFilter}
            onChange={(event) => setSourceFilter(event.target.value as SourceFilter)}
            className="rounded-2xl border border-white/70 bg-white/60 px-4 py-3 text-sm font-medium text-text-primary outline-none"
          >
            {SOURCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={folderFilter}
            onChange={(event) => setFolderFilter(event.target.value)}
            className="rounded-2xl border border-white/70 bg-white/60 px-4 py-3 text-sm font-medium text-text-primary outline-none"
          >
            <option value="all">Todas las carpetas</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="flex-grow overflow-y-auto px-4 pb-10">
        {filteredAndSortedOutfits.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center">
            <EmptyState
              icon="search_off"
              title="No encontramos looks con ese filtro"
              description="Probá ajustando la búsqueda, el origen o la carpeta."
            />
          </div>
        ) : (
          <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredAndSortedOutfits.map((outfit) => {
              const top = findItem(outfit.top_id);
              const bottom = findItem(outfit.bottom_id);
              const shoes = findItem(outfit.shoes_id);

              if (!top || !bottom || !shoes) return null;

              const coverImage = outfit.cover_image_url || getPreferredClothingImage(top);
              const folderName = folderMap.get(outfit.folder_id || '');

              return (
                <Card
                  key={outfit.id}
                  variant="glass"
                  padding="sm"
                  rounded="2xl"
                  className="group relative flex flex-col gap-4 border border-white/70 bg-white/56 shadow-[0_16px_38px_rgba(24,24,27,0.08)] backdrop-blur-[22px]"
                >
                  <button
                    type="button"
                    onClick={() => onSelectOutfit(outfit.id)}
                    className="overflow-hidden rounded-[1.35rem] text-left"
                  >
                    <div className="relative aspect-[4/5] overflow-hidden rounded-[1.35rem] bg-[#e8e0d7]">
                      <img
                        src={coverImage}
                        alt={outfit.name || 'Look guardado'}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                      />
                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/55 to-transparent px-3 pb-3 pt-10">
                        <span className="rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1d1d1d]">
                          {sourceLabel[outfit.source || 'manual'] || 'Manual'}
                        </span>
                        {folderName && (
                          <span className="rounded-full bg-[#f5efe7]/90 px-2.5 py-1 text-[11px] font-semibold text-[#5a3ca8]">
                            {folderName}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>

                  <div className="space-y-3 px-1 pb-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold text-[#171717]">
                          {outfit.name || outfit.occasion || 'Look guardado'}
                        </h2>
                        <p className="mt-1 line-clamp-2 text-sm leading-6 text-black/58">
                          {outfit.explanation}
                        </p>
                      </div>
                      <button
                        onClick={(event) => void handleShare(outfit, event)}
                        className="rounded-xl border border-white/70 bg-white/65 p-2 text-text-secondary transition hover:bg-white hover:text-[#171717]"
                        title="Compartir look"
                      >
                        <span className="material-symbols-outlined text-lg">share</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {[top, bottom, shoes].map((item) => (
                        <div key={item.id} className="overflow-hidden rounded-xl border border-black/5 bg-white/60">
                          <img
                            src={getPreferredClothingImage(item)}
                            alt={item.metadata.subcategory}
                            className="aspect-square w-full object-cover"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-[#f2ece4] px-3 py-1 text-xs text-black/60">
                        {outfit.occasion || 'Sin ocasión'}
                      </span>
                      {outfit.render_count ? (
                        <span className="rounded-full bg-[#eef7ee] px-3 py-1 text-xs text-[#256d39]">
                          {outfit.render_count} render{outfit.render_count === 1 ? '' : 's'}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
