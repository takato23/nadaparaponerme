import React, { useState } from 'react';
import { motion, useMotionValue } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { ROUTES } from '../../src/routes';

interface DockItemProps {
    id: string;
    icon: string;
    label: string;
    isActive: boolean;
    onClick: () => void;
}

function DockItem({ icon, label, isActive, onClick }: DockItemProps) {
    const mouseX = useMotionValue(Infinity);
    const [isHovered, setIsHovered] = useState(false);

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

export function FloatingDock() {
    const navigate = useNavigate();
    const location = useLocation();

    const items = [
        { id: 'home', icon: 'home', label: 'Inicio', path: ROUTES.HOME },
        { id: 'closet', icon: 'checkroom', label: 'Armario', path: ROUTES.CLOSET },
        { id: 'stylist', icon: 'auto_awesome', label: 'Estilista', path: ROUTES.STYLIST },
        { id: 'community', icon: 'group', label: 'Comunidad', path: ROUTES.COMMUNITY },
        { id: 'profile', icon: 'person', label: 'Perfil', path: ROUTES.PROFILE },
    ];

    return (
        <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center pointer-events-none px-4">
            <div className="
        flex items-end gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4
        liquid-glass
        shadow-[0_20px_40px_-10px_rgba(0,0,0,0.2)]
        pointer-events-auto
        max-w-full
      ">
                {items.map((item) => (
                    <DockItem
                        key={item.id}
                        id={item.id}
                        icon={item.icon}
                        label={item.label}
                        isActive={location.pathname === item.path}
                        onClick={() => navigate(item.path)}
                    />
                ))}
            </div>
        </div>
    );
}
