// FIX: Create component to resolve 'not a module' error.
import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import type { SavedOutfit, ClothingItem } from '../types';
import { Card } from './ui/Card';
import { EmptyState } from './ui/EmptyState';

interface SavedOutfitsViewProps {
  savedOutfits: SavedOutfit[];
  closet: ClothingItem[];
  onSelectOutfit: (id: string) => void;
}

type SortOption = 'recent' | 'oldest' | 'name';
type FilterOption = 'all' | 'casual' | 'formal' | 'party' | 'work' | 'sport';

const FILTER_OPTIONS: { value: FilterOption; label: string; icon: string }[] = [
  { value: 'all', label: 'Todos', icon: 'apps' },
  { value: 'casual', label: 'Casual', icon: 'psychiatry' },
  { value: 'formal', label: 'Formal', icon: 'work' },
  { value: 'party', label: 'Fiesta', icon: 'celebration' },
  { value: 'work', label: 'Trabajo', icon: 'business_center' },
  { value: 'sport', label: 'Deportivo', icon: 'directions_run' },
];

const SORT_OPTIONS: { value: SortOption; label: string; icon: string }[] = [
  { value: 'recent', label: 'Recientes', icon: 'schedule' },
  { value: 'oldest', label: 'Antiguos', icon: 'history' },
  { value: 'name', label: 'A-Z', icon: 'sort_by_alpha' },
];

const SavedOutfitsView = ({ savedOutfits, closet, onSelectOutfit }: SavedOutfitsViewProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [showFilters, setShowFilters] = useState(false);

  const findItem = (id: string) => closet.find(item => item.id === id);

  // Filter and sort outfits
  const filteredAndSortedOutfits = useMemo(() => {
    let filtered = [...savedOutfits];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(outfit =>
        outfit.explanation.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply category filter
    if (filterBy !== 'all') {
      filtered = filtered.filter(outfit => {
        const explanation = outfit.explanation.toLowerCase();
        switch (filterBy) {
          case 'casual':
            return explanation.includes('casual') || explanation.includes('cómodo') || explanation.includes('día');
          case 'formal':
            return explanation.includes('formal') || explanation.includes('elegante') || explanation.includes('profesional');
          case 'party':
            return explanation.includes('fiesta') || explanation.includes('noche') || explanation.includes('celebración');
          case 'work':
            return explanation.includes('trabajo') || explanation.includes('oficina') || explanation.includes('reunión');
          case 'sport':
            return explanation.includes('deport') || explanation.includes('gym') || explanation.includes('ejercicio');
          default:
            return true;
        }
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return b.id.localeCompare(a.id); // Assuming IDs contain timestamps
        case 'oldest':
          return a.id.localeCompare(b.id);
        case 'name':
          return a.explanation.localeCompare(b.explanation);
        default:
          return 0;
      }
    });

    return filtered;
  }, [savedOutfits, searchQuery, filterBy, sortBy]);

  const handleShare = async (outfit: SavedOutfit, e: React.MouseEvent) => {
    e.stopPropagation();

    const top = findItem(outfit.top_id);
    const bottom = findItem(outfit.bottom_id);
    const shoes = findItem(outfit.shoes_id);

    if (navigator.share && top && bottom && shoes) {
      try {
        await navigator.share({
          title: 'Mi Outfit',
          text: outfit.explanation,
          // Note: Web Share API doesn't support images directly
        });
      } catch (error) {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(outfit.explanation);
        toast.success('¡Outfit copiado al portapapeles!');
      }
    } else {
      // Fallback for browsers without Share API
      navigator.clipboard.writeText(outfit.explanation);
      toast.success('¡Outfit copiado al portapapeles!');
    }
  };

  if (savedOutfits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <EmptyState
          icon="favorite"
          title="Sin Outfits Guardados"
          description="Usa el Estilista IA y guarda tus looks favoritos."
        />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col pt-10 animate-fade-in">
      {/* Header */}
      <header className="px-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-4xl font-bold text-text-primary dark:text-gray-200">Guardados</h1>
          <span className="text-sm text-text-secondary dark:text-gray-400">
            {filteredAndSortedOutfits.length} outfit{filteredAndSortedOutfits.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Search Bar */}
        <div className="relative mb-3">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary dark:text-gray-400">
            search
          </span>
          <input
            type="text"
            placeholder="Buscar looks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl liquid-glass text-text-primary dark:text-white placeholder-text-secondary dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <span className="material-symbols-outlined text-text-secondary dark:text-gray-400">close</span>
            </button>
          )}
        </div>

        {/* Filter/Sort Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${showFilters
                ? 'bg-accent text-white'
                : 'liquid-glass text-text-primary dark:text-white'
              }`}
          >
            <span className="material-symbols-outlined text-lg">tune</span>
            <span className="text-sm font-medium">Filtros</span>
          </button>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-4 py-2 rounded-xl liquid-glass text-text-primary dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {SORT_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Pills */}
        {showFilters && (
          <div className="flex gap-2 mt-3 overflow-x-auto pb-2 scrollbar-hide">
            {FILTER_OPTIONS.map(option => (
              <button
                key={option.value}
                onClick={() => setFilterBy(option.value)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full whitespace-nowrap transition-all ${filterBy === option.value
                    ? 'bg-accent text-white'
                    : 'liquid-glass text-text-primary dark:text-white'
                  }`}
              >
                <span className="material-symbols-outlined text-lg">{option.icon}</span>
                <span className="text-sm font-medium">{option.label}</span>
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Outfits Grid */}
      <div className="flex-grow overflow-y-auto p-4">
        {filteredAndSortedOutfits.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <EmptyState
              icon="search_off"
              title="No se encontraron outfits"
              description="Intenta con otros filtros o búsqueda."
            />
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-4">
            {filteredAndSortedOutfits.map(outfit => {
              const top = findItem(outfit.top_id);
              const bottom = findItem(outfit.bottom_id);
              const shoes = findItem(outfit.shoes_id);

              if (!top || !bottom || !shoes) return null;

              return (
                <Card
                  key={outfit.id}
                  variant="glass"
                  padding="sm"
                  rounded="2xl"
                  className="w-full flex flex-col gap-3 relative group"
                >
                  {/* Outfit Images */}
                  <div onClick={() => onSelectOutfit(outfit.id)} className="cursor-pointer">
                    <div className="grid grid-cols-3 gap-2">
                      <img src={top.imageDataUrl} alt="Top" className="aspect-square w-full object-cover rounded-lg" />
                      <img src={bottom.imageDataUrl} alt="Bottom" className="aspect-square w-full object-cover rounded-lg" />
                      <img src={shoes.imageDataUrl} alt="Shoes" className="aspect-square w-full object-cover rounded-lg" />
                    </div>
                  </div>

                  {/* Explanation & Actions */}
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-text-secondary dark:text-gray-400 flex-1 line-clamp-2">
                      {outfit.explanation}
                    </p>

                    {/* Share Button */}
                    <button
                      onClick={(e) => handleShare(outfit, e)}
                      className="p-2 rounded-lg liquid-glass hover:bg-accent hover:text-white transition-all opacity-0 group-hover:opacity-100"
                      title="Compartir outfit"
                    >
                      <span className="material-symbols-outlined text-lg">share</span>
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedOutfitsView;