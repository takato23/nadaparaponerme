import React from 'react';

const EmptyClosetState = () => {
    return (
        <div className="flex flex-col items-center justify-center text-center h-full px-8 animate-fade-in py-20">
            <div className="w-32 h-32 mb-6 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center shadow-glow animate-float">
                <span className="material-symbols-outlined text-primary text-6xl">checkroom</span>
            </div>
            <h2 className="text-3xl font-serif font-bold text-text-primary dark:text-gray-100 mb-3 tracking-tight">
                Tu Armario Digital
            </h2>
            <p className="text-text-secondary dark:text-gray-400 font-medium max-w-[280px] text-lg leading-relaxed mb-8">
                Empieza a construir tu colección digital. Sube fotos de tus prendas favoritas.
            </p>
            <div className="flex gap-2 text-sm text-primary/60 font-medium uppercase tracking-wider">
                <span>• Organiza</span>
                <span>• Combina</span>
                <span>• Descubre</span>
            </div>
        </div>
    );
};

export default EmptyClosetState;
