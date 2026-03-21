import React, { useEffect, useMemo, useState } from 'react';
import type { ClothingItem } from '../../types';
import { getImageUrl, PLACEHOLDERS } from '../../src/utils/imagePlaceholder';

interface ClosetPeekDeckProps {
  items: ClothingItem[];
  onItemClick: (id: string) => void;
  initialIndex?: number;
}

export default function ClosetPeekDeck({
  items,
  onItemClick,
  initialIndex = 0,
}: ClosetPeekDeckProps) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchDeltaX, setTouchDeltaX] = useState(0);

  useEffect(() => {
    if (items.length === 0) {
      setActiveIndex(0);
      return;
    }

    setActiveIndex((prev) => Math.min(prev, items.length - 1));
  }, [items.length]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        setActiveIndex((prev) => Math.max(0, prev - 1));
      }
      if (event.key === 'ArrowRight') {
        setActiveIndex((prev) => Math.min(items.length - 1, prev + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items.length]);

  const currentItem = items[activeIndex];
  const previousItem = activeIndex > 0 ? items[activeIndex - 1] : null;
  const nextItem = activeIndex < items.length - 1 ? items[activeIndex + 1] : null;

  const currentImage = useMemo(
    () => (currentItem ? getImageUrl(currentItem, false) : PLACEHOLDERS.noImage),
    [currentItem],
  );
  const previousImage = useMemo(
    () => (previousItem ? getImageUrl(previousItem, true) : null),
    [previousItem],
  );
  const nextImage = useMemo(
    () => (nextItem ? getImageUrl(nextItem, true) : null),
    [nextItem],
  );

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    setTouchStartX(event.touches[0]?.clientX ?? null);
    setTouchDeltaX(0);
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX === null) return;
    setTouchDeltaX((event.touches[0]?.clientX ?? touchStartX) - touchStartX);
  };

  const handleTouchEnd = () => {
    const threshold = 42;
    if (touchDeltaX > threshold) {
      setActiveIndex((prev) => Math.max(0, prev - 1));
    } else if (touchDeltaX < -threshold) {
      setActiveIndex((prev) => Math.min(items.length - 1, prev + 1));
    }

    setTouchStartX(null);
    setTouchDeltaX(0);
  };

  if (items.length === 0 || !currentItem) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center">
        <p className="text-sm text-text-secondary dark:text-gray-400">
          No hay prendas para mostrar en carrusel.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-4 pb-[calc(8rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <div className="rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(223,231,236,0.74))] px-4 py-4 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-black/45">Carrusel</p>
              <h2 className="mt-1 text-xl font-semibold text-[#14343b]">Explorá una prenda por vez</h2>
              <p className="mt-1 text-sm text-black/60">
                Deslizá o usá las flechas para navegar sin perder contexto del resto.
              </p>
            </div>
            <div className="rounded-full bg-white/90 px-3 py-1.5 text-sm font-semibold text-[#14343b] shadow-sm">
              {activeIndex + 1} / {items.length}
            </div>
          </div>
        </div>

        <div
          className="relative overflow-hidden rounded-[32px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(234,241,244,0.8))] px-2 py-6 shadow-[0_26px_56px_rgba(20,52,59,0.14)] sm:px-6"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          <div className="flex items-center justify-center gap-3 sm:gap-6">
            <button
              type="button"
              onClick={() => setActiveIndex((prev) => Math.max(0, prev - 1))}
              disabled={!previousItem}
              className="hidden h-12 w-12 items-center justify-center rounded-full border border-black/10 bg-white/90 text-[#14343b] shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-35 sm:flex"
              aria-label="Ver prenda anterior"
            >
              <span className="material-symbols-outlined text-xl">arrow_back</span>
            </button>

            <div className="relative flex w-full items-center justify-center">
              {previousItem && previousImage && (
                <button
                  type="button"
                  onClick={() => setActiveIndex(activeIndex - 1)}
                  className="absolute left-0 top-1/2 hidden w-[18%] min-w-[88px] -translate-y-1/2 overflow-hidden rounded-[26px] border border-white/70 bg-white/75 shadow-md transition hover:-translate-x-1 hover:shadow-lg md:block"
                  aria-label={`Ver ${previousItem.metadata?.subcategory || 'prenda'} anterior`}
                >
                  <div className="aspect-[3/4] bg-[linear-gradient(180deg,rgba(255,255,255,0.7),rgba(223,231,236,0.66))] p-3">
                    <img
                      src={previousImage}
                      alt={previousItem.metadata?.subcategory || 'Prenda anterior'}
                      className="h-full w-full object-contain opacity-80"
                      onError={(event) => {
                        event.currentTarget.src = PLACEHOLDERS.error;
                      }}
                    />
                  </div>
                </button>
              )}

              <button
                type="button"
                onClick={() => onItemClick(currentItem.id)}
                className="group w-full max-w-md overflow-hidden rounded-[30px] border border-white/80 bg-white/92 text-left shadow-[0_22px_48px_rgba(20,52,59,0.18)] transition hover:-translate-y-1 hover:shadow-[0_28px_58px_rgba(20,52,59,0.2)]"
              >
                <div className="aspect-[4/5] bg-[linear-gradient(180deg,rgba(255,255,255,0.74),rgba(223,231,236,0.74))] p-5">
                  <img
                    src={currentImage}
                    alt={currentItem.metadata?.subcategory || 'Prenda'}
                    className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.02]"
                    onError={(event) => {
                      event.currentTarget.src = PLACEHOLDERS.error;
                    }}
                  />
                </div>

                <div className="border-t border-black/5 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(247,250,251,0.96))] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-xl font-semibold text-[#14343b]">
                        {currentItem.metadata?.subcategory || 'Prenda'}
                      </p>
                      <p className="mt-1 truncate text-sm text-black/60">
                        {[currentItem.metadata?.category, currentItem.metadata?.color_primary]
                          .filter(Boolean)
                          .join(' • ')}
                      </p>
                    </div>
                    <span className="rounded-full border border-black/8 bg-[#eef4f6] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#14343b]">
                      Ver detalle
                    </span>
                  </div>

                  {!!currentItem.metadata?.vibe_tags?.length && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {currentItem.metadata.vibe_tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-[#f7f0e8] px-3 py-1 text-xs font-semibold text-[#14343b]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </button>

              {nextItem && nextImage && (
                <button
                  type="button"
                  onClick={() => setActiveIndex(activeIndex + 1)}
                  className="absolute right-0 top-1/2 hidden w-[18%] min-w-[88px] -translate-y-1/2 overflow-hidden rounded-[26px] border border-white/70 bg-white/75 shadow-md transition hover:translate-x-1 hover:shadow-lg md:block"
                  aria-label={`Ver ${nextItem.metadata?.subcategory || 'prenda'} siguiente`}
                >
                  <div className="aspect-[3/4] bg-[linear-gradient(180deg,rgba(255,255,255,0.7),rgba(223,231,236,0.66))] p-3">
                    <img
                      src={nextImage}
                      alt={nextItem.metadata?.subcategory || 'Prenda siguiente'}
                      className="h-full w-full object-contain opacity-80"
                      onError={(event) => {
                        event.currentTarget.src = PLACEHOLDERS.error;
                      }}
                    />
                  </div>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setActiveIndex((prev) => Math.min(items.length - 1, prev + 1))}
              disabled={!nextItem}
              className="hidden h-12 w-12 items-center justify-center rounded-full border border-black/10 bg-white/90 text-[#14343b] shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-35 sm:flex"
              aria-label="Ver prenda siguiente"
            >
              <span className="material-symbols-outlined text-xl">arrow_forward</span>
            </button>
          </div>

          <div className="mt-5 flex items-center justify-center gap-2 md:hidden">
            <button
              type="button"
              onClick={() => setActiveIndex((prev) => Math.max(0, prev - 1))}
              disabled={!previousItem}
              className="flex h-10 items-center gap-1 rounded-full border border-black/10 bg-white/90 px-3 text-sm font-semibold text-[#14343b] shadow-sm disabled:opacity-35"
            >
              <span className="material-symbols-outlined text-base">arrow_back</span>
              Antes
            </button>
            <button
              type="button"
              onClick={() => setActiveIndex((prev) => Math.min(items.length - 1, prev + 1))}
              disabled={!nextItem}
              className="flex h-10 items-center gap-1 rounded-full border border-black/10 bg-white/90 px-3 text-sm font-semibold text-[#14343b] shadow-sm disabled:opacity-35"
            >
              Después
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
