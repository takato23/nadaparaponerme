import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type BadgeType = 'beta_tester' | 'trendsetter' | 'super_stylist' | 'verified';

interface BadgeDefinition {
    id: BadgeType;
    label: string;
    description: string;
    icon: string; // fallback Material icon
    colorClass: string;
    glowClass: string;
}

export const BADGE_DEFINITIONS: Record<BadgeType, BadgeDefinition> = {
    beta_tester: {
        id: 'beta_tester',
        label: 'Pionero Beta',
        description: 'Miembro fundador de la versión beta cerrada.',
        icon: 'token',
        colorClass: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30',
        glowClass: 'shadow-[0_0_15px_rgba(34,211,238,0.3)]',
    },
    trendsetter: {
        id: 'trendsetter',
        label: 'Trendsetter',
        description: 'Tus looks marcan tendencia en la comunidad.',
        icon: 'local_fire_department',
        colorClass: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
        glowClass: 'shadow-[0_0_15px_rgba(251,191,36,0.3)]',
    },
    super_stylist: {
        id: 'super_stylist',
        label: 'Súper Stylist',
        description: 'Genio(a) creando atuendos con IA de alto impacto.',
        icon: 'auto_awesome',
        colorClass: 'text-fuchsia-400 bg-fuchsia-400/10 border-fuchsia-400/30',
        glowClass: 'shadow-[0_0_15px_rgba(232,121,249,0.3)]',
    },
    verified: {
        id: 'verified',
        label: 'Cuenta Verificada',
        description: 'Usuario auténtico en la red de No Tengo Nada Para Ponerme.',
        icon: 'verified',
        colorClass: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
        glowClass: 'shadow-[0_0_15px_rgba(96,165,250,0.3)]',
    }
};

interface SocialBadgeProps {
    type: BadgeType;
    size?: 'sm' | 'md' | 'lg';
    showTooltip?: boolean;
}

const sizeClasses = {
    sm: 'w-5 h-5 text-[10px]',
    md: 'w-7 h-7 text-sm',
    lg: 'w-10 h-10 text-xl'
};

export const SocialBadge: React.FC<SocialBadgeProps> = ({
    type,
    size = 'md',
    showTooltip = true
}) => {
    const [isHovered, setIsHovered] = useState(false);
    const def = BADGE_DEFINITIONS[type];

    // In the future, we will replace the 'def.icon' with an <img> tag 
    // pointing to the Nano Banana 2 generated sprite:
    // <img src={`/images/badges/${type}.png`} alt={def.label} className="w-full h-full object-contain" />

    return (
        <div
            className="relative flex items-center justify-center pointer-events-auto"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <motion.div
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center justify-center rounded-full border backdrop-blur-sm cursor-help transition-all ${sizeClasses[size]} ${def.colorClass} hover:${def.glowClass}`}
            >
                <span className="material-symbols-outlined text-[inherit]">
                    {def.icon}
                </span>
            </motion.div>

            <AnimatePresence>
                {isHovered && showTooltip && (
                    <motion.div
                        initial={{ opacity: 0, y: 5, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-48 p-3 rounded-2xl liquid-glass border border-white/10 shadow-2xl pointer-events-none"
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`material-symbols-outlined text-sm ${def.colorClass.split(' ')[0]}`}>
                                {def.icon}
                            </span>
                            <p className="text-sm font-bold text-white tracking-wide">{def.label}</p>
                        </div>
                        <p className="text-xs text-white/70 leading-relaxed">
                            {def.description}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
