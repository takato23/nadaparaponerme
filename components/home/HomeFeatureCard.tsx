import React from 'react';
import { Feature } from './types';
import { TooltipWrapper } from '../ui/TooltipWrapper';
import { CATEGORY_COLORS, BADGE_STYLES, type FeatureCategory, type BadgeType } from './featuresConfig';

interface HomeFeatureCardProps {
    feature: Feature & {
        badge?: BadgeType;
        featured?: boolean;
    };
    variant?: 'default' | 'compact' | 'featured';
}

export const HomeFeatureCard = ({ feature, variant = 'default' }: HomeFeatureCardProps) => {
    // Obtener colores de categoría
    const categoryColors = CATEGORY_COLORS[feature.category as FeatureCategory] || CATEGORY_COLORS.essential;

    // Obtener estilo de badge si existe
    const badgeStyle = feature.badge ? BADGE_STYLES[feature.badge] : null;

    const card = (
        <button
            onClick={feature.onClick}
            className={`
                relative w-full text-left overflow-hidden
                bg-white dark:bg-slate-800/90
                rounded-2xl
                border border-gray-100 dark:border-slate-700/50
                shadow-sm hover:shadow-lg
                transition-all duration-300 ease-out
                touch-manipulation
                hover:-translate-y-1
                active:scale-[0.98]
                ${variant === 'compact' ? 'p-3 h-[72px]' : ''}
                ${variant === 'default' ? 'p-4 h-[100px]' : ''}
                ${variant === 'featured' ? 'p-4 h-[100px]' : ''}
                group
            `}
        >
            {/* Gradient overlay on hover */}
            <div className={`absolute inset-0 bg-gradient-to-br ${categoryColors.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500 pointer-events-none`} />

            {/* Badge */}
            {badgeStyle && (
                <div className={`absolute top-2 right-2 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${badgeStyle.bg} ${badgeStyle.text} z-20`}>
                    {badgeStyle.label}
                </div>
            )}

            <div className={`relative z-10 flex items-center h-full ${variant === 'compact' ? 'gap-2.5' : 'gap-3'}`}>
                {/* Icon container with category color */}
                <div className={`
                    ${variant === 'compact' ? 'w-10 h-10' : 'w-12 h-12'}
                    rounded-xl
                    ${categoryColors.bg}
                    flex items-center justify-center shrink-0
                    transition-transform duration-300
                    group-hover:scale-110 group-hover:rotate-3
                `}>
                    <span className={`material-symbols-outlined ${categoryColors.text} ${variant === 'compact' ? 'text-xl' : 'text-2xl'}`}>
                        {feature.icon}
                    </span>
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h3 className={`
                        font-bold text-text-primary dark:text-gray-100
                        ${variant === 'compact' ? 'text-sm' : 'text-sm'}
                        leading-tight
                        group-hover:text-primary transition-colors
                        line-clamp-1
                    `}>
                        {feature.title}
                    </h3>
                    <p className={`
                        text-text-secondary dark:text-gray-400
                        ${variant === 'compact' ? 'text-[11px] line-clamp-1' : 'text-xs line-clamp-2'}
                        leading-snug font-medium opacity-80 mt-0.5
                    `}>
                        {feature.description}
                    </p>
                </div>
            </div>
        </button>
    );

    // Add tooltip if feature has a tooltip property
    if (feature.tooltip) {
        return (
            <TooltipWrapper content={feature.tooltip} position="top">
                {card}
            </TooltipWrapper>
        );
    }

    return card;
};
