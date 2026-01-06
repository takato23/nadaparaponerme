import React, { useState } from 'react';
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
}

function DockItem({ icon, label, isActive, onClick, isCamera }: DockItemProps) {
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
                className="relative group flex flex-col items-center justify-end -mt-4"
            >
                <motion.div
                    animate={{
                        scale: isHovered ? 1.08 : 1,
                        y: isHovered ? -3 : 0,
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 25, mass: 0.8 }}
                    className="
                        w-16 h-16 rounded-full
                        flex items-center justify-center
                        bg-gradient-to-br from-primary via-primary to-secondary
                        shadow-[0_4px_20px_rgba(var(--primary),0.5)]
                        group-hover:shadow-[0_8px_30px_rgba(var(--primary),0.6)]
                        transition-shadow duration-300
                        cursor-pointer
                        border-4 border-white/20
                        relative overflow-hidden
                    "
                >
                    {/* Shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/30 via-transparent to-transparent opacity-60" />

                    {/* Pulsing ring */}
                    <div className="absolute inset-0 rounded-full animate-ping bg-primary/30 opacity-0 group-hover:opacity-100" style={{ animationDuration: '2s' }} />

                    <span className="material-symbols-outlined text-3xl text-white relative z-10 drop-shadow-lg">
                        {icon}
                    </span>
                </motion.div>

                {/* Glow effect underneath */}
                <div className="absolute -bottom-1 w-10 h-2 rounded-full bg-primary/40 blur-md group-hover:bg-primary/60 transition-colors" />

                {/* Tooltip */}
                <div className={`
                    absolute -top-14
                    px-3 py-1.5
                    bg-gradient-to-r from-primary to-secondary text-white
                    text-xs font-bold rounded-lg
                    opacity-0 group-hover:opacity-100
                    transition-all duration-200 transform translate-y-2 group-hover:translate-y-0
                    pointer-events-none whitespace-nowrap backdrop-blur-sm
                    shadow-lg
                `}>
                    {label}
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-secondary rotate-45" />
                </div>
            </motion.div>
        );
    }

    // Regular dock item
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
          w-14 h-14 rounded-2xl
          flex items-center justify-center
          glass-card
          shadow-lg group-hover:shadow-[0_0_20px_rgba(var(--primary),0.4)]
          transition-shadow duration-300
          cursor-pointer
          ${isActive ? 'bg-white/90 dark:bg-white/20 border-primary/50' : ''}
        `}
            >
                <span className={`
          material-symbols-outlined text-3xl
          ${isActive ? 'text-primary' : 'text-gray-700 dark:text-gray-200'}
          group-hover:text-primary transition-colors duration-300
        `}>
                    {icon}
                </span>

                {/* Reflection */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </motion.div>

            {/* Dot Indicator for active state */}
            {isActive && (
                <div className="absolute -bottom-2 w-1.5 h-1.5 rounded-full bg-primary/80"></div>
            )}

            {/* Tooltip */}
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

export function FloatingDock({ onCameraClick }: { onCameraClick?: () => void }) {
    const navigate = useNavigateTransition();
    const location = useLocation();

    const items = [
        { id: 'home', icon: 'home', label: 'Inicio', path: ROUTES.HOME },
        { id: 'closet', icon: 'checkroom', label: 'Armario', path: ROUTES.CLOSET },
        { id: 'camera', icon: 'photo_camera', label: 'Escanear', path: ROUTES.CLOSET, isCamera: true },
        { id: 'community', icon: 'group', label: 'Comunidad', path: ROUTES.COMMUNITY },
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
            className="fixed left-0 right-0 z-50 flex justify-center pointer-events-none px-4"
            style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
        >
            <div className="
        flex items-end gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4
        liquid-glass
        shadow-[0_20px_40px_-10px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.4)]
        pointer-events-auto
        max-w-full
        transition-all duration-300
      " style={{ ['--glass-opacity' as any]: 0.35, ['--glass-blur' as any]: '26px' }}>
                {items.map((item) => (
                    <DockItem
                        key={item.id}
                        id={item.id}
                        icon={item.icon}
                        label={item.label}
                        isActive={location.pathname === item.path && item.id !== 'camera'}
                        onClick={() => handleItemClick(item)}
                        isCamera={item.isCamera}
                    />
                ))}
            </div>
        </div>
    );
}
