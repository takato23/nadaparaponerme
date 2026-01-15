import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface StudioHeaderProps {
    generatedImagesCount: number;
    onOpenLatestResult: () => void;
    showResultsHint: boolean;
    onShowHelp?: () => void;
}

export const StudioHeader: React.FC<StudioHeaderProps> = ({
    generatedImagesCount,
    onOpenLatestResult,
    showResultsHint,
    onShowHelp
}) => {
    const navigate = useNavigate();

    return (
        <header className="px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-3 sticky top-0 z-30 bg-[#f8f3ee]/80 backdrop-blur-md">
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 rounded-full bg-white/70 backdrop-blur-md border border-white/60 flex items-center justify-center shadow-sm hover:shadow-md transition"
                    aria-label="Volver"
                >
                    <span className="material-symbols-outlined text-[color:var(--studio-ink)]">arrow_back</span>
                </button>
                <div className="text-center flex-1 relative">
                    <h1 className="text-xl font-semibold" style={{ fontFamily: 'var(--studio-font-display)' }}>
                        Studio
                    </h1>
                    {onShowHelp && (
                        <button
                            onClick={onShowHelp}
                            className="absolute right-0 top-1/2 -translate-y-1/2 text-[color:var(--studio-ink-muted)] hover:text-[color:var(--studio-ink)] transition"
                            title="¿Cómo se usa?"
                        >
                            <span className="material-symbols-outlined text-lg">help_outline</span>
                        </button>
                    )}
                </div>
                {/* Mobile: Toggle inspector */}
                <button
                    onClick={onOpenLatestResult}
                    className="lg:hidden w-10 h-10 rounded-full bg-white/70 backdrop-blur-md border border-white/60 flex items-center justify-center shadow-sm relative"
                    aria-label="Ver resultados"
                >
                    <span className="material-symbols-outlined text-[color:var(--studio-ink)]">photo_library</span>
                    {generatedImagesCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[color:var(--studio-rose)] text-white text-xs flex items-center justify-center">
                            {generatedImagesCount}
                        </span>
                    )}
                    <AnimatePresence>
                        {showResultsHint && generatedImagesCount > 0 && (
                            <motion.span
                                initial={{ opacity: 0, y: 6, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 6, scale: 0.95 }}
                                className="absolute -bottom-9 right-1/2 translate-x-1/2 px-2 py-1 rounded-lg bg-[color:var(--studio-ink)] text-white text-[10px] font-semibold shadow-lg whitespace-nowrap"
                            >
                                Tu look listo
                            </motion.span>
                        )}
                    </AnimatePresence>
                </button>
            </div>
        </header>
    );
};
