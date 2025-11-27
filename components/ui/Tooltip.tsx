import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
    children: React.ReactNode;
    content: string;
    position?: TooltipPosition;
    delay?: number;
    disabled?: boolean;
    className?: string;
    shortcut?: string; // e.g., "⌘K" or "Ctrl+K"
}

/**
 * Tooltip component with smart positioning and keyboard shortcut display
 *
 * @example
 * <Tooltip content="Agregar prenda" shortcut="⌘B">
 *   <button><Icon /></button>
 * </Tooltip>
 */
export function Tooltip({
    children,
    content,
    position = 'top',
    delay = 300,
    disabled = false,
    className = '',
    shortcut,
}: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [actualPosition, setActualPosition] = useState(position);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLDivElement>(null);

    // Smart positioning to avoid viewport overflow
    const updatePosition = useCallback(() => {
        if (!tooltipRef.current || !triggerRef.current) return;

        const trigger = triggerRef.current.getBoundingClientRect();
        const tooltip = tooltipRef.current.getBoundingClientRect();
        const viewport = {
            width: window.innerWidth,
            height: window.innerHeight,
        };

        let newPosition = position;

        // Check if tooltip would overflow and adjust
        if (position === 'top' && trigger.top - tooltip.height < 10) {
            newPosition = 'bottom';
        } else if (position === 'bottom' && trigger.bottom + tooltip.height > viewport.height - 10) {
            newPosition = 'top';
        } else if (position === 'left' && trigger.left - tooltip.width < 10) {
            newPosition = 'right';
        } else if (position === 'right' && trigger.right + tooltip.width > viewport.width - 10) {
            newPosition = 'left';
        }

        setActualPosition(newPosition);
    }, [position]);

    useEffect(() => {
        if (isVisible) {
            updatePosition();
            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);
        }
        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isVisible, updatePosition]);

    const showTooltip = () => {
        if (disabled) return;
        timeoutRef.current = setTimeout(() => {
            setIsVisible(true);
        }, delay);
    };

    const hideTooltip = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setIsVisible(false);
    };

    // Position styles
    const positionStyles: Record<TooltipPosition, string> = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    };

    // Arrow styles
    const arrowStyles: Record<TooltipPosition, string> = {
        top: 'top-full left-1/2 -translate-x-1/2 border-t-gray-900 dark:border-t-gray-100 border-x-transparent border-b-transparent',
        bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-900 dark:border-b-gray-100 border-x-transparent border-t-transparent',
        left: 'left-full top-1/2 -translate-y-1/2 border-l-gray-900 dark:border-l-gray-100 border-y-transparent border-r-transparent',
        right: 'right-full top-1/2 -translate-y-1/2 border-r-gray-900 dark:border-r-gray-100 border-y-transparent border-l-transparent',
    };

    // Animation variants
    const variants = {
        top: { initial: { opacity: 0, y: 5 }, animate: { opacity: 1, y: 0 } },
        bottom: { initial: { opacity: 0, y: -5 }, animate: { opacity: 1, y: 0 } },
        left: { initial: { opacity: 0, x: 5 }, animate: { opacity: 1, x: 0 } },
        right: { initial: { opacity: 0, x: -5 }, animate: { opacity: 1, x: 0 } },
    };

    return (
        <div
            ref={triggerRef}
            className={`relative inline-flex ${className}`}
            onMouseEnter={showTooltip}
            onMouseLeave={hideTooltip}
            onFocus={showTooltip}
            onBlur={hideTooltip}
        >
            {children}

            <AnimatePresence>
                {isVisible && (
                    <motion.div
                        ref={tooltipRef}
                        role="tooltip"
                        initial={variants[actualPosition].initial}
                        animate={variants[actualPosition].animate}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className={`
                            absolute z-[9999] pointer-events-none
                            ${positionStyles[actualPosition]}
                        `}
                    >
                        <div className="
                            px-2.5 py-1.5
                            bg-gray-900 dark:bg-gray-100
                            text-white dark:text-gray-900
                            text-xs font-medium
                            rounded-lg
                            whitespace-nowrap
                            shadow-lg
                            flex items-center gap-2
                        ">
                            <span>{content}</span>
                            {shortcut && (
                                <kbd className="
                                    px-1.5 py-0.5
                                    bg-gray-700 dark:bg-gray-300
                                    rounded
                                    text-[10px] font-mono
                                    opacity-70
                                ">
                                    {shortcut}
                                </kbd>
                            )}
                        </div>
                        {/* Arrow */}
                        <div className={`
                            absolute w-0 h-0
                            border-4
                            ${arrowStyles[actualPosition]}
                        `} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/**
 * TooltipWrapper - For wrapping existing components without changing their structure
 */
export function TooltipWrapper({
    children,
    tooltip,
    shortcut,
    position = 'top',
    delay = 300,
}: {
    children: React.ReactNode;
    tooltip: string;
    shortcut?: string;
    position?: TooltipPosition;
    delay?: number;
}) {
    return (
        <Tooltip content={tooltip} shortcut={shortcut} position={position} delay={delay}>
            {children}
        </Tooltip>
    );
}

export default Tooltip;
