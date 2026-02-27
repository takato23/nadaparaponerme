import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAITokens } from '../../hooks/useAITokens';

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
    const { balance, loading } = useAITokens();

    return (
        <header className="px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-3 sticky top-0 z-30 bg-[#f8f3ee]/85 backdrop-blur-lg border-b border-white/40">
            <div className="flex min-w-0 items-center justify-between gap-3">
                <button
                    onClick={() => navigate(-1)}
                    className="w-8 h-8 rounded-full bg-white/60 border border-white/70 flex items-center justify-center hover:bg-white/80 transition active:scale-95"
                    aria-label="Volver"
                >
                    <span className="material-symbols-outlined text-[18px] text-[color:var(--studio-ink)]">arrow_back</span>
                </button>

                {/* Center: Title + Gems inline */}
                <div className="flex-1 min-w-0 flex items-center justify-center gap-2 relative">
                    <h1
                        className="text-[15px] font-bold uppercase tracking-[0.15em] text-[color:var(--studio-ink)]"
                        style={{ fontFamily: 'var(--studio-font-body)' }}
                    >
                        Studio
                    </h1>
                    {!loading && balance !== null && (
                        <div className="flex items-center gap-0.5 text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200/60 px-1.5 py-0.5 rounded-full tracking-wide">
                            <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>diamond</span>
                            {balance}
                        </div>
                    )}
                    {onShowHelp && (
                        <button
                            onClick={onShowHelp}
                            className="absolute right-0 top-1/2 -translate-y-1/2 text-[color:var(--studio-ink-muted)] hover:text-[color:var(--studio-ink)] transition"
                            title="¿Cómo se usa?"
                        >
                            <span className="material-symbols-outlined text-[16px]">help_outline</span>
                        </button>
                    )}
                </div>

                {/* Mobile: Toggle inspector */}
                <button
                    onClick={onOpenLatestResult}
                    className={`lg:hidden w-10 h-10 rounded-full border flex items-center justify-center relative transition-all active:scale-95 ${showResultsHint && generatedImagesCount > 0
                        ? 'bg-[color:var(--studio-rose)] border-[color:var(--studio-rose)] shadow-[0_0_15px_rgba(236,72,153,0.5)]'
                        : 'bg-white/60 border-white/70 hover:bg-white/80'}`}
                    aria-label="Ver resultados"
                >
                    <span className={`material-symbols-outlined text-[20px] ${showResultsHint && generatedImagesCount > 0 ? 'text-white' : 'text-[color:var(--studio-ink)]'}`}>
                        photo_library
                    </span>

                    {generatedImagesCount > 0 && (
                        <motion.span
                            animate={showResultsHint ? { scale: [1, 1.2, 1] } : {}}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[color:var(--studio-ink)] text-white text-[10px] font-bold flex items-center justify-center border-2 border-[color:var(--studio-background)]"
                        >
                            {generatedImagesCount}
                        </motion.span>
                    )}

                    <AnimatePresence>
                        {showResultsHint && generatedImagesCount > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                                className="absolute -bottom-12 right-0 flex flex-col items-end pointer-events-none"
                            >
                                <div className="px-3 py-1.5 rounded-xl bg-[color:var(--studio-ink)] text-white text-[11px] font-bold shadow-xl border border-white/20 whitespace-nowrap flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-pulse" />
                                    Tu look listo
                                </div>
                                {/* Small tail for the speech bubble effect */}
                                <div className="mr-4 w-2 h-2 bg-[color:var(--studio-ink)] rotate-45 -translate-y-[5px]" />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Pulsing ring behind when ready */}
                    {showResultsHint && generatedImagesCount > 0 && (
                        <motion.div
                            className="absolute inset-0 rounded-full bg-[color:var(--studio-rose)]/40 -z-10"
                            animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                        />
                    )}
                </button>
            </div>
        </header>
    );
};
