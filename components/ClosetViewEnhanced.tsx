import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ClothingItem, SortOption } from '../types';
import ClosetGrid from './ClosetGrid';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import PullToRefreshIndicator from './ui/PullToRefreshIndicator';
import { ClosetGridSkeleton } from './ui/Skeleton';
import { CoverFlowCarousel } from './closet/CoverFlowCarousel';
import { TooltipWrapper } from './ui/TooltipWrapper';

type CategoryFilter = 'top' | 'bottom' | 'shoes';

interface ClosetViewEnhancedProps {
    items: ClothingItem[];
    onItemClick: (id: string) => void;
    onAddItemClick: () => void;
    searchTerm: string;
    setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
    activeCategory: CategoryFilter | null;
    setActiveCategory: React.Dispatch<React.SetStateAction<CategoryFilter | null>>;
    sortOption: SortOption;
    onSortClick: () => void;
    onRefresh?: () => Promise<void>;
}

const ClosetViewEnhanced = ({
    items,
    onItemClick,
    onAddItemClick,
    searchTerm,
    setSearchTerm,
    activeCategory,
    setActiveCategory,
    sortOption,
    onSortClick,
    onRefresh
}: ClosetViewEnhancedProps) => {
    const [isLoading, setIsLoading] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'carousel'>('grid');

    const handleCategoryToggle = (category: CategoryFilter) => {
        setActiveCategory(prev => prev === category ? null : category);
    };

    const sortLabel = useMemo(() => {
        if (sortOption.property === 'date') {
            return sortOption.direction === 'desc' ? 'Más recientes' : 'Más antiguos';
        }
        if (sortOption.property === 'name') {
            return `Alfabético (${sortOption.direction === 'asc' ? 'A-Z' : 'Z-A'})`;
        }
        if (sortOption.property === 'color') {
            return `Color (${sortOption.direction === 'asc' ? 'A-Z' : 'Z-A'})`;
        }
        return 'Ordenar';
    }, [sortOption]);

    const handleRefresh = async () => {
        if (!onRefresh) return;
        setIsLoading(true);
        try {
            await onRefresh();
        } finally {
            setIsLoading(false);
        }
    };

    const {
        containerRef,
        pullPercentage,
        isRefreshing,
        shouldRefresh
    } = usePullToRefresh({
        onRefresh: handleRefresh,
        enabled: !!onRefresh
    });

    return (
        <div className="animate-fade-in w-full h-full flex flex-col">
            {/* Fixed header with safe area support */}
            <header
                className="px-4 sm:px-6 pb-4 flex justify-between items-center shrink-0 sticky top-0 bg-gradient-to-b from-background/95 to-transparent backdrop-blur-sm z-10"
                style={{ paddingTop: 'max(2.5rem, env(safe-area-inset-top))' }}
            >
                <h1 className="text-3xl sm:text-4xl font-bold text-text-primary dark:text-gray-200">Armario</h1>
                <TooltipWrapper content="Agregá una prenda sacando una foto o subiendo una imagen" position="left">
                    <button
                        onClick={onAddItemClick}
                        className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full flex items-center justify-center transition-all active:scale-95 shadow-[0_0_15px_rgba(236,72,153,0.3)] hover:shadow-[0_0_20px_rgba(236,72,153,0.5)] hover:scale-105 touch-manipulation relative overflow-hidden group border-0"
                        aria-label="Agregar prenda nueva"
                    >
                        {/* Animated gradient background to match Studio */}
                        <div className="absolute inset-0 bg-[length:200%_200%] animate-gradient-xy bg-gradient-to-r from-purple-500 via-pink-500 to-[color:var(--studio-rose)]" />
                        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                        <span className="material-symbols-outlined text-white text-3xl font-bold relative z-10" aria-hidden="true">add</span>
                    </button>
                </TooltipWrapper>
            </header>

            {/* Search and filters with improved touch targets */}
            <div className="px-4 pb-4 shrink-0 space-y-3">
                <TooltipWrapper content="Buscá por tipo de prenda (ej: remera, jean) o por color (ej: azul, negro)" position="bottom">
                    <div className="relative">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar por prenda o color..."
                            className="w-full p-3 pr-10 min-h-[48px] bg-white/50 dark:bg-black/20 rounded-xl border-none focus:ring-2 focus:ring-primary transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                            aria-label="Buscar prendas"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 min-w-[24px] min-h-[24px] hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded-full transition-colors touch-manipulation"
                                aria-label="Limpiar búsqueda"
                            >
                                <span className="material-symbols-outlined text-gray-500 text-xl" aria-hidden="true">close</span>
                            </button>
                        )}
                    </div>
                </TooltipWrapper>
                <div className="flex gap-2 justify-between items-center flex-wrap">

                    {/* Filters (iOS Segmented Control style - matches Studio) */}
                    <div className="flex p-1 bg-white/40 dark:bg-black/20 backdrop-blur-md border border-gray-200/50 dark:border-white/5 rounded-full shadow-inner overflow-x-auto no-scrollbar">
                        {(['top', 'bottom', 'shoes'] as CategoryFilter[]).map(cat => {
                            const isActive = activeCategory === cat;
                            const tooltips = {
                                top: 'Remeras, camisas, sweaters...',
                                bottom: 'Pantalones, shorts, polleras...',
                                shoes: 'Zapatillas, zapatos, sandalias...'
                            };
                            return (
                                <TooltipWrapper key={cat} content={tooltips[cat]} position="top">
                                    <button
                                        onClick={() => {
                                            if (navigator.vibrate) navigator.vibrate(5);
                                            handleCategoryToggle(cat);
                                        }}
                                        className="relative shrink-0 px-4 sm:px-5 py-1.5 rounded-full text-[13px] font-bold transition-colors focus:outline-none touch-manipulation"
                                        aria-label={`Filtrar por ${cat}`}
                                        aria-pressed={isActive}
                                    >
                                        {isActive && (
                                            <motion.div
                                                layoutId="activeFilterMain"
                                                className="absolute inset-0 bg-white dark:bg-gray-700 rounded-full shadow-[0_2px_8px_rgba(33,37,41,0.08)] border border-white/80 dark:border-gray-600"
                                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                            />
                                        )}
                                        <span className={`relative z-10 transition-colors duration-300 ${isActive ? 'text-[color:var(--studio-ink)] dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'}`}>
                                            {cat.charAt(0).toUpperCase() + cat.slice(1)}s
                                        </span>
                                    </button>
                                </TooltipWrapper>
                            );
                        })}
                    </div>
                    <TooltipWrapper content="Cambiá el orden de visualización: por fecha, nombre o color" position="bottom">
                        <button
                            onClick={onSortClick}
                            className="px-3 py-2 min-h-[44px] rounded-full text-sm font-semibold transition-all bg-gray-200/60 dark:bg-gray-700/60 hover:bg-gray-300/60 dark:hover:bg-gray-600/60 flex items-center gap-1.5 whitespace-nowrap shrink-0 touch-manipulation"
                            aria-label={`Ordenar: ${sortLabel}`}
                        >
                            <span className="material-symbols-outlined text-base" aria-hidden="true">
                                {sortOption.direction === 'desc' ? 'arrow_downward' : 'arrow_upward'}
                            </span>
                            <span className="hidden sm:inline">{sortLabel}</span>
                            <span className="sm:hidden">Orden</span>
                        </button>
                    </TooltipWrapper>

                    {/* View Mode Toggle */}
                    <div className="flex bg-gray-200/60 dark:bg-gray-700/60 rounded-full p-1 ml-auto sm:ml-0">
                        <TooltipWrapper content="Vista de cuadrícula: mirá múltiples prendas a la vez" position="bottom">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-full transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow-sm text-primary' : 'text-gray-500'}`}
                                aria-label="Vista Cuadrícula"
                            >
                                <span className="material-symbols-outlined text-xl">grid_view</span>
                            </button>
                        </TooltipWrapper>
                        <TooltipWrapper content="Vista carrusel: navegá tus prendas en 3D con efecto Cover Flow" position="bottom">
                            <button
                                onClick={() => setViewMode('carousel')}
                                className={`p-2 rounded-full transition-all ${viewMode === 'carousel' ? 'bg-white dark:bg-gray-600 shadow-sm text-primary' : 'text-gray-500'}`}
                                aria-label="Vista Carrusel"
                            >
                                <span className="material-symbols-outlined text-xl">view_carousel</span>
                            </button>
                        </TooltipWrapper>
                    </div>
                </div>
            </div>

            {/* Scrollable content with pull-to-refresh */}
            <div
                ref={containerRef}
                className="flex-grow overflow-y-auto relative"
                style={{
                    WebkitOverflowScrolling: 'touch',
                    paddingBottom: 'max(8rem, env(safe-area-inset-bottom))'
                }}
            >
                {onRefresh && (
                    <PullToRefreshIndicator
                        pullPercentage={pullPercentage}
                        isRefreshing={isRefreshing}
                        shouldRefresh={shouldRefresh}
                    />
                )}
                {isLoading ? (
                    <ClosetGridSkeleton />
                ) : viewMode === 'carousel' ? (
                    <CoverFlowCarousel items={items} onItemClick={onItemClick} />
                ) : (
                    <ClosetGrid items={items} onItemClick={onItemClick} viewMode={'grid'} />
                )}
            </div>
        </div>
    );
};

export default ClosetViewEnhanced;
