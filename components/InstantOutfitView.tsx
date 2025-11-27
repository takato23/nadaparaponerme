import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useCloset } from '../contexts/ClosetContext';
import { ClothingItem } from '../types';
import { useNavigate } from 'react-router-dom';

export default function InstantOutfitView() {
    const { items } = useCloset();
    const navigate = useNavigate();
    const [isSpinning, setIsSpinning] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [selectedOutfit, setSelectedOutfit] = useState<{
        top: ClothingItem | null;
        bottom: ClothingItem | null;
        shoes: ClothingItem | null;
    }>({ top: null, bottom: null, shoes: null });

    // Filter items by category for the slot machine
    const tops = items.filter(i => i.metadata.category === 'top');
    const bottoms = items.filter(i => i.metadata.category === 'bottom');
    const shoes = items.filter(i => i.metadata.category === 'shoes');

    // Fallback images if closet is empty
    const fallbackItems = {
        tops: [
            'https://images.pexels.com/photos/10049570/pexels-photo-10049570.jpeg?auto=compress&cs=tinysrgb&w=300',
            'https://images.pexels.com/photos/5935754/pexels-photo-5935754.jpeg?auto=compress&cs=tinysrgb&w=300',
            'https://images.pexels.com/photos/1124468/pexels-photo-1124468.jpeg?auto=compress&cs=tinysrgb&w=300',
        ],
        bottoms: [
            'https://images.pexels.com/photos/1598507/pexels-photo-1598507.jpeg?auto=compress&cs=tinysrgb&w=300',
            'https://images.pexels.com/photos/1040424/pexels-photo-1040424.jpeg?auto=compress&cs=tinysrgb&w=300',
            'https://images.pexels.com/photos/7206287/pexels-photo-7206287.jpeg?auto=compress&cs=tinysrgb&w=300',
        ],
        shoes: [
            'https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=300',
            'https://images.pexels.com/photos/1478442/pexels-photo-1478442.jpeg?auto=compress&cs=tinysrgb&w=300',
            'https://images.pexels.com/photos/298863/pexels-photo-298863.jpeg?auto=compress&cs=tinysrgb&w=300',
        ],
    };

    // Prepare data for the slots
    const slotData = {
        tops: tops.length > 0 ? tops.map(i => i.imageDataUrl) : fallbackItems.tops,
        bottoms: bottoms.length > 0 ? bottoms.map(i => i.imageDataUrl) : fallbackItems.bottoms,
        shoes: shoes.length > 0 ? shoes.map(i => i.imageDataUrl) : fallbackItems.shoes,
    };

    const spin = () => {
        setIsSpinning(true);
        setResult(null);
        setSelectedOutfit({ top: null, bottom: null, shoes: null });

        setTimeout(() => {
            setIsSpinning(false);
            setResult('✨ Outfit Match! ✨');

            // Select random items from each category
            const selectedTop = tops.length > 0 ? tops[Math.floor(Math.random() * tops.length)] : null;
            const selectedBottom = bottoms.length > 0 ? bottoms[Math.floor(Math.random() * bottoms.length)] : null;
            const selectedShoes = shoes.length > 0 ? shoes[Math.floor(Math.random() * shoes.length)] : null;

            setSelectedOutfit({
                top: selectedTop,
                bottom: selectedBottom,
                shoes: selectedShoes
            });
        }, 2500);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background-start to-background-end flex flex-col items-center justify-center p-4 pb-32">
            <div className="text-center mb-8">
                <h1 className="text-4xl font-serif font-bold text-gradient mb-2">Instant Outfit</h1>
                <p className="text-text-secondary">Deja que el azar decida tu estilo de hoy.</p>
            </div>

            <div className="flex flex-col items-center gap-10 w-full max-w-4xl">
                <div className="flex gap-4 md:gap-6 p-4 md:p-8 liquid-glass rounded-[2.5rem] shadow-2xl border border-white/10 relative overflow-hidden w-full justify-center">

                    {/* Glass Reflection Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none z-20 rounded-[2.5rem]"></div>

                    {/* Slot Columns */}
                    {['tops', 'bottoms', 'shoes'].map((type, i) => (
                        <div key={type} className="w-1/3 max-w-[160px] aspect-[3/4] bg-gray-800/50 rounded-2xl overflow-hidden relative border border-white/5 shadow-inner">
                            <motion.div
                                animate={isSpinning ? { y: [0, -900] } : { y: 0 }}
                                transition={isSpinning ? { repeat: Infinity, duration: 0.4 + (i * 0.1), ease: "linear" } : { type: "spring", stiffness: 150, damping: 20 }}
                                className={`flex flex-col items-center ${isSpinning ? 'blur-sm' : ''}`}
                            >
                                {/* Tripled items for loop */}
                                {[...(slotData as any)[type], ...(slotData as any)[type], ...(slotData as any)[type], ...(slotData as any)[type]].map((img: string, idx: number) => (
                                    <div key={idx} className="w-full aspect-[3/4] p-2 flex items-center justify-center">
                                        <img
                                            src={img}
                                            alt="clothing"
                                            className="w-full h-full object-cover rounded-xl shadow-md"
                                        />
                                    </div>
                                ))}
                            </motion.div>

                            {/* Depth Gradients */}
                            <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/80 to-transparent pointer-events-none z-10"></div>
                            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-10"></div>

                            {/* Selection Line */}
                            {!isSpinning && (
                                <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-primary/50 shadow-[0_0_10px_rgba(var(--primary),0.8)] z-20 -translate-y-1/2"></div>
                            )}
                        </div>
                    ))}
                </div>

                <button
                    onClick={spin}
                    disabled={isSpinning}
                    className="
            relative overflow-hidden px-16 py-5 rounded-full 
            bg-gradient-to-r from-primary to-secondary 
            text-white font-bold text-xl tracking-wide
            shadow-[0_0_40px_-10px_rgba(var(--primary),0.6)]
            hover:scale-105 active:scale-95 transition-all 
            disabled:opacity-50 disabled:cursor-not-allowed
            group
          "
                >
                    <span className="relative z-10 flex items-center gap-2">
                        {isSpinning ? 'Mezclando...' : '🎲 GENERAR LOOK'}
                    </span>
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                </button>

                {result && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center gap-6 w-full max-w-md"
                    >
                        <div className="text-2xl font-bold text-primary animate-pulse">
                            {result}
                        </div>

                        {/* Action Buttons */}
                        {selectedOutfit.top && selectedOutfit.bottom && selectedOutfit.shoes && (
                            <div className="flex flex-wrap gap-3 justify-center w-full">
                                {/* Brand Detection Button */}
                                <button
                                    onClick={() => {
                                        // For now, analyze the top item, but we could let user choose
                                        const itemToAnalyze = selectedOutfit.top;
                                        if (itemToAnalyze) {
                                            navigate('/armario'); // Navigate to closet which has the brand recognition integration
                                            // TODO: Store item in state to auto-open brand recognition modal
                                        }
                                    }}
                                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold shadow-lg hover:scale-105 active:scale-95 transition-all"
                                >
                                    <span className="material-symbols-outlined">label</span>
                                    Analizar Marca
                                </button>

                                {/* Dupe Finder Button */}
                                <button
                                    onClick={() => {
                                        const itemToAnalyze = selectedOutfit.bottom;
                                        if (itemToAnalyze) {
                                            navigate('/armario');
                                        }
                                    }}
                                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold shadow-lg hover:scale-105 active:scale-95 transition-all"
                                >
                                    <span className="material-symbols-outlined">shopping_bag</span>
                                    Buscar Dupes
                                </button>

                                {/* Save Outfit Button */}
                                <button
                                    onClick={() => {
                                        // TODO: Implement save outfit functionality
                                        alert('Guardar outfit - próximamente!');
                                    }}
                                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold shadow-lg hover:scale-105 active:scale-95 transition-all"
                                >
                                    <span className="material-symbols-outlined">favorite</span>
                                    Guardar Outfit
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </div>
        </div>
    );
}
