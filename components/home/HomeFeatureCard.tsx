import React from 'react';
import { Feature } from './types';
import { TooltipWrapper } from '../ui/TooltipWrapper';

interface HomeFeatureCardProps {
    feature: Feature;
    variant?: 'default' | 'compact';
}

export const HomeFeatureCard = ({ feature, variant = 'default' }: HomeFeatureCardProps) => {
    const card = (
        <button
            onClick={feature.onClick}
            className={`
          relative w-full text-left overflow-hidden
          glass-card
          transition-all duration-300 ease-out
          touch-manipulation
          hover:shadow-glow hover:-translate-y-1
          active:scale-[0.98]
          ${variant === 'compact' ? 'p-3 min-h-[72px]' : 'p-5 min-h-[100px]'}
          group
        `}
        >
            <div className={`absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />

            <div className={`relative z-10 flex items-start gap-${variant === 'compact' ? '3' : '4'}`}>
                <div className={`${variant === 'compact' ? 'w-10 h-10' : 'w-12 h-12'} rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                    <span className={`material-symbols-outlined text-primary ${variant === 'compact' ? 'text-xl' : 'text-2xl'}`}>
                        {feature.icon}
                    </span>
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                    <h3 className={`font-bold text-text-primary dark:text-gray-100 ${variant === 'compact' ? 'text-sm' : 'text-lg'} mb-0.5 leading-tight group-hover:text-primary transition-colors`}>
                        {feature.title}
                    </h3>
                    <p className={`text-text-secondary dark:text-gray-400 ${variant === 'compact' ? 'text-xs' : 'text-sm'} leading-relaxed line-clamp-2 font-medium opacity-90`}>
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
