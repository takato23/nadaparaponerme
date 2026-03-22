import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import type { ClothingItem } from '../../types';
import { getImageUrl, PLACEHOLDERS } from '../../src/utils/imagePlaceholder';
import { resolveColorSwatch } from '../../src/utils/colorUtils';

interface CoverFlowCarouselProps {
    items: ClothingItem[];
    onItemClick: (id: string) => void;
    initialIndex?: number;
}

export const CoverFlowCarousel = ({ items, onItemClick, initialIndex = 0 }: CoverFlowCarouselProps) => {
    const [activeIndex, setActiveIndex] = useState(initialIndex);
    const containerRef = useRef<HTMLDivElement>(null);
    const touchStartXRef = useRef<number | null>(null);
    const touchDeltaXRef = useRef(0);

    useEffect(() => {
        if (items.length === 0) {
            setActiveIndex(0);
            return;
        }
        if (activeIndex > items.length - 1) {
            setActiveIndex(items.length - 1);
        }
    }, [activeIndex, items.length]);

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (items.length === 0) return;
            if (e.key === 'ArrowLeft') {
                setActiveIndex(prev => Math.max(0, prev - 1));
            } else if (e.key === 'ArrowRight') {
                setActiveIndex(prev => Math.min(items.length - 1, prev + 1));
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [items.length]);

    const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const threshold = 35;
        const swipePower = Math.abs(info.offset.x) * Math.abs(info.velocity.x);
        if (info.offset.x > threshold || (info.offset.x > 0 && swipePower > 450)) {
            setActiveIndex(prev => Math.max(0, prev - 1));
        } else if (info.offset.x < -threshold || (info.offset.x < 0 && swipePower > 450)) {
            setActiveIndex(prev => Math.min(items.length - 1, prev + 1));
        }
    };

    const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
        touchStartXRef.current = event.touches[0]?.clientX ?? null;
        touchDeltaXRef.current = 0;
    };

    const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
        if (touchStartXRef.current === null) return;
        const currentX = event.touches[0]?.clientX ?? touchStartXRef.current;
        touchDeltaXRef.current = currentX - touchStartXRef.current;
    };

    const handleTouchEnd = () => {
        const threshold = 42;
        if (touchDeltaXRef.current > threshold) {
            setActiveIndex(prev => Math.max(0, prev - 1));
        } else if (touchDeltaXRef.current < -threshold) {
            setActiveIndex(prev => Math.min(items.length - 1, prev + 1));
        }

        touchStartXRef.current = null;
        touchDeltaXRef.current = 0;
    };

    // Calculate visible range to optimize rendering
    // We only render a few items around the active index
    const VISIBLE_RANGE = 3; // Show 3 items on each side

    // Responsive values
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    if (items.length === 0) {
        return (
            <div className="relative w-full h-full flex items-center justify-center">
                <p className="text-sm text-text-secondary dark:text-gray-400">No hay prendas para mostrar en carrusel.</p>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="relative w-full h-full flex items-center justify-center overflow-hidden perspective-1000"
            style={{ perspective: '1000px' }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
        >
            {/* Glass Background */}
            <div className="absolute inset-0 backdrop-blur-md bg-white/5 dark:bg-black/20 pointer-events-none" />

            {/* Global Swipe Handler Overlay */}
            <motion.div
                className="absolute inset-0 z-40 cursor-grab active:cursor-grabbing"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={handleDragEnd}
                style={{ touchAction: 'none' }}
            />

            <div className="relative w-full max-w-4xl h-[50vh] sm:h-[60vh] flex items-center justify-center preserve-3d pointer-events-none">
                <AnimatePresence initial={false}>
                    {items.map((item, index) => {
                        // Only render items within range
                        if (Math.abs(index - activeIndex) > VISIBLE_RANGE) return null;

                        const offset = index - activeIndex;
                        const isActive = index === activeIndex;

                        return (
                            <CarouselItem
                                key={item.id}
                                item={item}
                                offset={offset}
                                isActive={isActive}
                                onClick={() => {
                                    // Allow clicking through the overlay
                                    if (isActive) onItemClick(item.id);
                                    else setActiveIndex(index);
                                }}
                                isMobile={isMobile}
                            />
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* Navigation Dots */}
            <div className="absolute bottom-[calc(5.5rem+env(safe-area-inset-bottom))] sm:bottom-10 left-0 right-0 flex justify-center gap-2 z-50 pointer-events-auto">
                {items.map((_, idx) => {
                    // Only show dots if we have few items, or show a sliding window of dots
                    if (items.length > 20 && Math.abs(idx - activeIndex) > 5) return null;

                    return (
                        <button
                            key={idx}
                            onClick={() => setActiveIndex(idx)}
                            className={`w-2 h-2 rounded-full transition-all duration-300 ${idx === activeIndex
                                ? 'bg-primary w-6 shadow-glow'
                                : 'bg-gray-400/30 hover:bg-gray-400/50 dark:bg-white/30 dark:hover:bg-white/50'
                                }`}
                        />
                    );
                })}
            </div>

            {/* Active Item Info */}
            <div className="absolute top-4 sm:top-8 left-0 right-0 text-center z-50 pointer-events-none px-4">
                <motion.div
                    key={activeIndex}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="inline-block max-w-full"
                >
                    {items[activeIndex] && (
                        <div className="bg-white/80 dark:bg-black/40 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/20 shadow-lg">
                            <h3 className="text-lg sm:text-xl font-bold text-text-primary dark:text-white truncate max-w-[200px] sm:max-w-xs mx-auto">
                                {items[activeIndex].metadata?.subcategory || items[activeIndex].metadata?.category || 'Prenda'}
                            </h3>
                            <p className="text-xs sm:text-sm text-text-secondary dark:text-gray-300 capitalize">
                                {items[activeIndex].metadata?.category}
                                {items[activeIndex].metadata?.color_primary && ` • ${items[activeIndex].metadata.color_primary}`}
                            </p>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
};

interface CarouselItemProps {
    item: ClothingItem;
    offset: number;
    isActive: boolean;
    onClick: () => void;
    isMobile: boolean;
}

const CATEGORY_ICONS: Record<string, string> = {
    top: 'styler',
    bottom: 'checkroom',
    shoes: 'steps',
    accessory: 'diamond',
    outerwear: 'dry_cleaning',
};

function sanitizeDisplayLabel(value: string | undefined | null, fallback: string): string {
    const sanitized = value?.trim().replace(/^auto-generated test item:\s*/i, '');
    return sanitized || fallback;
}

const CarouselItem = ({ item, offset, isActive, onClick, isMobile }: CarouselItemProps) => {
    const imageUrl = useMemo(() => getImageUrl(item as any, false), [item]);
    const hasImage = imageUrl !== PLACEHOLDERS.noImage;
    const colorSwatch = useMemo(() => resolveColorSwatch(item.metadata?.color_primary), [item.metadata?.color_primary]);
    const itemTitle = useMemo(
        () => sanitizeDisplayLabel(item.metadata?.subcategory, item.metadata?.category || 'Prenda'),
        [item.metadata?.category, item.metadata?.subcategory],
    );
    const itemSubtitle = useMemo(() => {
        const categoryLabel = sanitizeDisplayLabel(item.metadata?.category, 'Prenda');
        return item.metadata?.color_primary ? `${categoryLabel} • ${colorSwatch.label}` : categoryLabel;
    }, [colorSwatch.label, item.metadata?.category, item.metadata?.color_primary]);
    const categoryIcon = CATEGORY_ICONS[item.metadata?.category || ''] || 'checkroom';

    // 3D Transform calculations tuned for mobile/desktop
    const spacing = isMobile ? 52 : 62;
    const x = offset * spacing;
    const z = Math.abs(offset) * (isMobile ? -180 : -290);
    const rotateY = offset * (isMobile ? -34 : -42);
    const rotateZ = isActive ? 0 : offset * (isMobile ? 1.5 : 2);
    const scale = isActive ? (isMobile ? 1.06 : 1.12) : (isMobile ? 0.86 : 0.8);
    const opacity = Math.max(0.28, 1 - Math.abs(offset) * 0.26);
    const zIndex = 100 - Math.abs(offset);

    return (
        <motion.div
            className="absolute top-1/2 left-1/2 w-56 h-72 sm:w-72 sm:h-96 cursor-pointer pointer-events-auto" // Re-enable pointer events for items
            style={{
                zIndex,
                x: `calc(-50% + ${x}%)`,
                y: '-50%',
            }}
            initial={false}
            animate={{
                x: `calc(-50% + ${x}%)`,
                z,
                rotateY,
                rotateZ,
                scale,
                opacity,
            }}
            transition={{
                type: "spring",
                stiffness: 200,
                damping: 30,
                mass: 1
            }}
            onClick={onClick}
            whileHover={isActive ? { scale: isMobile ? 1.05 : 1.15 } : {}}
        >
            {/* Card Content */}
            <div className={`
        w-full h-full rounded-3xl overflow-hidden shadow-2xl
        transition-all duration-300 border border-white/20
        ${isActive ? 'shadow-primary/30 ring-1 ring-primary/30' : 'brightness-75 grayscale-[0.3]'}
        bg-white dark:bg-gray-800
      `}>
                <div
                    className="w-full h-full relative flex items-center justify-center p-4"
                    style={hasImage
                        ? undefined
                        : {
                            background: `radial-gradient(circle at top, rgba(255,255,255,0.55), transparent 42%), linear-gradient(180deg, ${colorSwatch.cssColor}22 0%, ${colorSwatch.cssColor}66 100%)`,
                        }}
                >
                    {hasImage ? (
                        <img
                            src={imageUrl}
                            alt={itemTitle}
                            className="w-full h-full object-contain drop-shadow-xl"
                            draggable={false}
                            onError={(event) => {
                                event.currentTarget.src = PLACEHOLDERS.error;
                            }}
                        />
                    ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center rounded-[1.75rem] border border-white/35 bg-white/25 px-5 py-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-md">
                            <div
                                className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border shadow-sm"
                                style={{
                                    backgroundColor: `${colorSwatch.cssColor}33`,
                                    borderColor: colorSwatch.borderColor,
                                    color: colorSwatch.checkColor,
                                }}
                            >
                                <span className="material-symbols-outlined text-[30px]">{categoryIcon}</span>
                            </div>
                            <span className="mb-2 rounded-full border border-white/35 bg-white/35 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#14343b]">
                                Sin foto
                            </span>
                            <h3 className="max-w-[14rem] text-lg font-semibold leading-tight text-[#14343b]">
                                {itemTitle}
                            </h3>
                            <p className="mt-2 max-w-[14rem] text-sm font-medium text-[#14343bcc]">
                                {itemSubtitle}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Reflection (Visual trick) - Made more subtle for glass theme */}
            {hasImage && (
                <div
                    className="absolute top-full left-0 w-full h-20 opacity-20 pointer-events-none"
                    style={{
                        transform: 'scaleY(-1) translateY(-10px)',
                        maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 20%, rgba(0,0,0,0) 100%)',
                        WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 60%)'
                    }}
                >
                    <img
                        src={imageUrl}
                        alt=""
                        className="w-full h-full object-contain blur-[2px]"
                        onError={(event) => {
                            event.currentTarget.src = PLACEHOLDERS.error;
                        }}
                    />
                </div>
            )}
        </motion.div>
    );
};
