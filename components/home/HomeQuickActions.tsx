import React from 'react';

interface QuickAction {
    id: string;
    icon: string;
    label: string;
    color: string;
    bg: string;
    onClick: () => void;
}

interface HomeQuickActionsProps {
    actions: QuickAction[];
}

export const HomeQuickActions = ({ actions }: HomeQuickActionsProps) => {
    return (
        <div className="liquid-glass p-6 animate-slide-up relative overflow-hidden" style={{ animationDelay: '100ms' }}>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gray-100 dark:via-slate-800 to-transparent opacity-50" />

            <div className="flex items-center justify-between mb-6 px-2">
                <h2 className="font-serif font-bold text-text-primary text-xl flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-2xl">bolt</span>
                    Acceso Rápido
                </h2>
            </div>
            {/* Responsive grid: 3 cols mobile, 4 cols tablet, 4 cols desktop */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4">
                {actions.map((action) => (
                    <button
                        key={action.id}
                        onClick={action.onClick}
                        className="flex flex-col items-center gap-2 sm:gap-3 group"
                    >
                        <div className={`w-full aspect-square rounded-2xl sm:rounded-3xl ${action.bg} flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-active:scale-95 group-hover:shadow-md border border-transparent group-hover:border-gray-100 dark:group-hover:border-slate-700`}>
                            <span className={`material-symbols-outlined text-2xl sm:text-3xl md:text-4xl ${action.color} transition-transform duration-300 group-hover:rotate-6`}>
                                {action.icon}
                            </span>
                        </div>
                        <span className="text-xs sm:text-xs md:text-sm font-bold text-text-secondary group-hover:text-text-primary transition-colors text-center leading-tight px-0.5">
                            {action.label}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
};
