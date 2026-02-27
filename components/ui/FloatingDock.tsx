import React, { useEffect, useState } from 'react';
import { motion, useMotionValue } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { ROUTES } from '../../src/routes';
import { useNavigateTransition } from '../../hooks/useNavigateTransition';

interface DockItemProps {
    id: string;
    icon: string;
    label: string;
    isActive: boolean;
    onClick: () => void;
    isCamera?: boolean;
    compact?: boolean;
}

function DockItem({ icon, label, isActive, onClick, isCamera, compact = false }: DockItemProps) {
    const mouseX = useMotionValue(Infinity);
    const [isHovered, setIsHovered] = useState(false);

    // Special styling for camera button
    if (isCamera) {
        return (
            <motion.div
                onMouseMove={(e) => mouseX.set(e.pageX)}
                onMouseLeave={() => mouseX.set(Infinity)}
                onHoverStart={() => setIsHovered(true)}
                onHoverEnd={() => setIsHovered(false)}
                onClick={onClick}
                className={`relative group flex flex-col items-center justify-end ${compact ? '-mt-2.5' : '-mt-4'}`}
            >
                <motion.div
                    animate={{
                        scale: isHovered ? 1.08 : 1,
                        y: isHovered ? -3 : 0,
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 25, mass: 0.8 }}
                    className="
                        rounded-full
                        flex items-center justify-center
                        bg-[length:200%_200%] animate-gradient-xy bg-gradient-to-r from-purple-500 via-pink-500 to-[color:var(--studio-rose)]
                        shadow-[0_0_15px_rgba(236,72,153,0.4)]
                        group-hover:shadow-[0_0_25px_rgba(236,72,153,0.6)]
                        transition-shadow duration-300
                        cursor-pointer
                        border-4 border-white/20
                        relative overflow-hidden
                    "
                    style={{
                        width: compact ? 52 : 64,
                        height: compact ? 52 : 64,
                    }}
                >
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/30 via-transparent to-transparent opacity-40" />
                    <div className="absolute inset-0 rounded-full animate-pulse-glow" />

                    <span className={`material-symbols-outlined text-white relative z-10 drop-shadow-md group-hover:scale-110 transition-transform ${compact ? 'text-2xl' : 'text-3xl'}`}>
                        {icon}
                    </span>
                </motion.div>

                <div className={`
                    absolute -top-14
                    px-3 py-1.5
                    bg-gradient-to-r from-purple-500 to-pink-500 text-white
                    text-xs font-bold rounded-lg
                    opacity-0 group-hover:opacity-100
                    transition-all duration-200 transform translate-y-2 group-hover:translate-y-0
                    pointer-events-none whitespace-nowrap backdrop-blur-sm
                    shadow-[0_4px_12px_rgba(236,72,153,0.3)]
                `}>
                    {label}
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-pink-500 rotate-45" />
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            onMouseMove={(e) => mouseX.set(e.pageX)}
            onMouseLeave={() => mouseX.set(Infinity)}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            onClick={onClick}
            className="relative group flex flex-col items-center justify-end"
        >
            <motion.div
                animate={{
                    scale: isHovered ? 1.4 : 1,
                    y: isHovered ? -15 : 0,
                }}
                transition={{ type: "spring", stiffness: 400, damping: 25, mass: 0.8 }}
                className={`
          rounded-2xl
          flex items-center justify-center
          glass-card
          shadow-md
          transition-shadow duration-300
          cursor-pointer
          ${isActive ? 'bg-white/90 dark:bg-white/20 border-primary/50' : ''}
        `}
                style={{
                    width: compact ? 46 : 56,
                    height: compact ? 46 : 56,
                }}
            >
                <span className={`
          material-symbols-outlined ${compact ? 'text-2xl' : 'text-3xl'}
          ${isActive ? 'text-primary' : 'text-gray-700 dark:text-gray-200'}
          group-hover:text-primary transition-colors duration-300
        `}>
                    {icon}
                </span>

                <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </motion.div>

            {isActive && (
                <div className="absolute -bottom-2 w-1.5 h-1.5 rounded-full bg-primary/80"></div>
            )}

            <div className={`
        absolute -top-12
        px-3 py-1.5
        bg-gray-900/90 dark:bg-white/90 text-white dark:text-gray-900
        text-xs font-bold rounded-lg
        opacity-0 group-hover:opacity-100
        transition-all duration-200 transform translate-y-2 group-hover:translate-y-0
        pointer-events-none whitespace-nowrap backdrop-blur-sm
      `}>
                {label}
            </div>
        </motion.div>
    );
}

interface FloatingDockProps {
    onCameraClick?: () => void;
    forceHidden?: boolean;
}

export function FloatingDock({ onCameraClick, forceHidden = false }: FloatingDockProps) {
    const navigate = useNavigateTransition();
    const location = useLocation();
    const [compactDock, setCompactDock] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.innerWidth < 430;
    });

    useEffect(() => {
        const handleResize = () => {
            setCompactDock(window.innerWidth < 430);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const fullscreenRoutes = [
        ROUTES.ONBOARDING_STYLIST,
        '/stylist-onboarding',
        '/onboarding',
    ];

    const shouldHideDock = fullscreenRoutes.some(route =>
        location.pathname === route || location.pathname.startsWith(route + '/')
    );

    if (forceHidden || shouldHideDock) {
        return null;
    }

    const items = [
        { id: 'home', icon: 'home', label: 'Inicio', path: ROUTES.HOME },
        { id: 'closet', icon: 'checkroom', label: 'Armario', path: ROUTES.CLOSET },
        { id: 'studio', icon: 'auto_fix_high', label: 'Studio', path: ROUTES.STUDIO },
        { id: 'profile', icon: 'person', label: 'Perfil', path: ROUTES.PROFILE },
    ];

    const handleItemClick = (item: typeof items[0]) => {
        if (item.id === 'camera' && onCameraClick) {
            onCameraClick();
        } else {
            navigate(item.path);
        }
    };

    return (
        <div
            data-testid="floating-dock"
            className="fixed left-0 right-0 z-50 flex justify-center pointer-events-none px-4"
            style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
        >
            <div className="
    flex w-auto max-w-[min(36rem,calc(100vw-0.75rem))] items-end justify-center gap-1.5 sm:gap-3 px-2.5 sm:px-6 py-2.5 sm:py-4
    backdrop-blur-2xl bg-white/80 dark:bg-gray-900/80 border border-white/20 dark:border-white/10 rounded-2xl
    !overflow-visible
    shadow-lg
    pointer-events-auto
    max-w-full
    transition-all duration-300
" style={{}}>
                {items.map((item) => (
                    <DockItem
                        key={item.id}
                        id={item.id}
                        icon={item.icon}
                        label={item.label}
                        isActive={location.pathname === item.path}
                        onClick={() => handleItemClick(item)}
                        isCamera={item.isCamera}
                        compact={compactDock}
                    />
                ))}
            </div>
        </div>
    );
}
