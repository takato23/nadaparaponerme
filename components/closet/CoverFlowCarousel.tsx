import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import type { ClothingItem } from '../../types';

interface CoverFlowCarouselProps {
    items: ClothingItem[];
    onItemClick: (id: string) => void;
    initialIndex?: number;
}

export const CoverFlowCarousel = ({ items, onItemClick, initialIndex = 0 }: CoverFlowCarouselProps) => {
    const [activeIndex, setActiveIndex] = useState(initialIndex);
    const containerRef = useRef<HTMLDivElement>(null);

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') {
                setActiveIndex(prev => Math.max(0, prev - 1));
            } else if (e.key === 'ArrowRight') {
                setActiveIndex(prev => Math.min(items.length - 1, prev + 1));
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [items.length]);

    const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const threshold = 50;
        if (info.offset.x > threshold) {
            setActiveIndex(prev => Math.max(0, prev - 1));
        } else if (info.offset.x < -threshold) {
            setActiveIndex(prev => Math.min(items.length - 1, prev + 1));
        }
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

    return (
        <div
            ref={containerRef}
            className="relative w-full h-full flex items-center justify-center overflow-hidden perspective-1000"
            style={{ perspective: '1000px' }}
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
                style={{ touchAction: 'pan-y' }} // Allow vertical scrolling
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
            <div className="absolute bottom-4 sm:bottom-8 left-0 right-0 flex justify-center gap-2 z-50 pointer-events-auto">
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

const CarouselItem = ({ item, offset, isActive, onClick, isMobile }: CarouselItemProps) => {
    // 3D Transform calculations tuned for mobile/desktop
    const spacing = isMobile ? 45 : 55; // Tighter spacing on mobile
    const x = offset * spacing;
    const z = Math.abs(offset) * (isMobile ? -150 : -250); // Less depth on mobile to keep items visible
    const rotateY = offset * (isMobile ? -25 : -35); // Less rotation on mobile
    const scale = isActive ? (isMobile ? 1.05 : 1.1) : (isMobile ? 0.9 : 0.85);
    const opacity = Math.max(0, 1 - Math.abs(offset) * 0.3);
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
                <div className="w-full h-full relative flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
                    {/* Image */}
                    <img
                        src={item.imageDataUrl}
                        alt={item.metadata?.subcategory || 'Prenda'}
                        className="w-full h-full object-contain drop-shadow-xl"
                        draggable={false}
                    />
                </div>
            </div>

            {/* Reflection (Visual trick) - Made more subtle for glass theme */}
            <div
                className="absolute top-full left-0 w-full h-20 opacity-20 pointer-events-none"
                style={{
                    transform: 'scaleY(-1) translateY(-10px)',
                    maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 20%, rgba(0,0,0,0) 100%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 60%)'
                }}
            >
                <img
                    src={item.imageDataUrl}
                    alt=""
                    className="w-full h-full object-contain blur-[2px]"
                />
            </div>
        </motion.div>
    );
};
