import React from 'react';
import { Feature } from './types';
import { HomeFeatureCard } from './HomeFeatureCard';

interface HomeCategorySectionProps {
    title: string;
    icon: string;
    features: Feature[];
    categoryId: string;
    count: number;
    isExpanded: boolean;
    onToggle: (categoryId: string) => void;
}

export const HomeCategorySection = ({
    title,
    icon,
    features,
    categoryId,
    count,
    isExpanded,
    onToggle
}: HomeCategorySectionProps) => {
    return (
        <div className="mb-6">
            <button
                onClick={() => onToggle(categoryId)}
                className="w-full flex items-center justify-between p-4 glass-card hover:opacity-90 transition-all duration-200 touch-manipulation active:scale-[0.98] group"
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <span className="material-symbols-outlined text-primary text-xl">
                            {icon}
                        </span>
                    </div>
                    <span className="font-serif font-semibold text-text-primary dark:text-gray-200 text-lg tracking-wide">
                        {title}
                    </span>
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                        {count}
                    </span>
                </div>
                <span className={`material-symbols-outlined text-text-secondary transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                    expand_more
                </span>
            </button>

            {isExpanded && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 animate-slide-down origin-top">
                    {features.map((feature, idx) => (
                        <div key={feature.id} style={{ animationDelay: `${idx * 50}ms` }} className="animate-fade-in">
                            <HomeFeatureCard feature={feature} variant="compact" />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
