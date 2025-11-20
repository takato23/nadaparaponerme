import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';

interface AestheticPlaygroundProps {
    onClose: () => void;
}

export default function AestheticPlayground({ onClose }: AestheticPlaygroundProps) {
    const [activeTab, setActiveTab] = useState<'hero' | 'slots' | 'dock' | 'morph' | 'swipe' | 'board' | 'theme' | 'color' | 'weather' | 'packing' | 'analytics' | 'ar' | 'duel' | 'holo' | 'liquid-btn' | 'glass-modal' | 'cloth' | 'cursor' | 'neon' | 'mesh'>('hero');

    return (
        <div className="fixed inset-0 z-[100] bg-gray-50 dark:bg-slate-950 overflow-y-auto">
            <div className="max-w-4xl mx-auto p-6 min-h-screen flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                            Aesthetic Playground
                        </h1>
                        <p className="text-text-secondary dark:text-gray-400">Prototyping next-gen interactions</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-8 p-1 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 w-fit">
                    {[
                        { id: 'hero', label: '3D Hero', icon: 'view_in_ar' },
                        { id: 'slots', label: 'Slot Machine', icon: 'casino' },
                        { id: 'dock', label: 'Floating Dock', icon: 'dock_to_bottom' },
                        { id: 'morph', label: 'Morphing', icon: 'animation' },
                        { id: 'swipe', label: 'Swipe', icon: 'swipe' },
                        { id: 'board', label: 'Mood Board', icon: 'dashboard_customize' },
                        { id: 'theme', label: 'Theme Editor', icon: 'palette' },
                        { id: 'color', label: 'Color Matcher', icon: 'colorize' },
                        { id: 'weather', label: 'Weather Glass', icon: 'water_drop' },
                        { id: 'packing', label: 'Smart Packing', icon: 'luggage' },
                        { id: 'analytics', label: 'Style Analytics', icon: 'bar_chart' },
                        { id: 'ar', label: 'Magic Mirror', icon: 'face' },
                        { id: 'duel', label: 'Style Duel', icon: 'thumbs_up_down' },
                        // New High-End Aesthetics
                        { id: 'holo', label: 'Holographic', icon: 'diamond' },
                        { id: 'liquid-btn', label: 'Liquid Button', icon: 'water_drop' },
                        { id: 'glass-modal', label: 'Glass Modal', icon: 'window' },
                        { id: 'cloth', label: 'Floating Cloth', icon: 'checkroom' },
                        { id: 'cursor', label: 'Reactive Cursor', icon: 'mouse' },
                        { id: 'neon', label: 'Neon Glass', icon: 'lightbulb' },
                        { id: 'mesh', label: 'Dynamic Mesh', icon: 'gradient' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
                ${activeTab === tab.id
                                    ? 'bg-primary text-white shadow-lg shadow-primary/30'
                                    : 'text-text-secondary hover:bg-gray-50 dark:hover:bg-slate-800'
                                }
              `}
                        >
                            <span className="material-symbols-outlined text-lg">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div
                    className="flex-grow flex items-center justify-center border border-white/20 dark:border-white/10 p-8 relative overflow-hidden transition-all duration-300"
                    style={{
                        backdropFilter: `blur(var(--glass-blur)) saturate(var(--glass-saturation))`,
                        WebkitBackdropFilter: `blur(var(--glass-blur)) saturate(var(--glass-saturation))`,
                        backgroundColor: `rgba(255, 255, 255, var(--glass-opacity))`,
                        borderRadius: `var(--glass-radius)`,
                    }}
                >
                    <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

                    {activeTab === 'hero' && <Hero3DPrototype />}
                    {activeTab === 'slots' && <SlotMachinePrototype />}
                    {activeTab === 'dock' && <FloatingDockPrototype />}
                    {activeTab === 'morph' && <MorphingPrototype />}
                    {activeTab === 'swipe' && <SwipePrototype />}
                    {activeTab === 'board' && <MoodBoardPrototype />}
                    {activeTab === 'theme' && <ThemeEditorPrototype />}
                    {activeTab === 'color' && <ColorMatcherPrototype />}
                    {activeTab === 'weather' && <WeatherGlassPrototype />}
                    {activeTab === 'packing' && <PackingListPrototype />}
                    {activeTab === 'analytics' && <AnalyticsPrototype />}
                    {activeTab === 'ar' && <MagicMirrorPrototype />}
                    {activeTab === 'duel' && <StyleDuelPrototype />}
                    {activeTab === 'holo' && <HolographicCardPrototype />}
                    {activeTab === 'liquid-btn' && <LiquidButtonPrototype />}
                    {activeTab === 'glass-modal' && <GlassModalPrototype />}
                    {activeTab === 'cloth' && <FloatingClothPrototype />}
                    {activeTab === 'cursor' && <ReactiveCursorPrototype />}
                    {activeTab === 'neon' && <NeonGlassTextPrototype />}
                    {activeTab === 'mesh' && <DynamicMeshPrototype />}
                </div>
            </div>
        </div>
    );
}

// --- 1. 3D Hero Prototype ---
function Hero3DPrototype() {
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseX = useSpring(x, { stiffness: 150, damping: 15 });
    const mouseY = useSpring(y, { stiffness: 150, damping: 15 });

    const rotateX = useTransform(mouseY, [-0.5, 0.5], ["15deg", "-15deg"]);
    const rotateY = useTransform(mouseX, [-0.5, 0.5], ["-15deg", "15deg"]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseXVal = e.clientX - rect.left;
        const mouseYVal = e.clientY - rect.top;
        const xPct = mouseXVal / width - 0.5;
        const yPct = mouseYVal / height - 0.5;
        x.set(xPct);
        y.set(yPct);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    return (
        <motion.div
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
                rotateX,
                rotateY,
                transformStyle: "preserve-3d",
            }}
            className="relative w-full max-w-md aspect-[4/5] rounded-[2.5rem] bg-gradient-to-br from-gray-900 to-black shadow-2xl cursor-pointer group"
        >
            {/* Background Layers */}
            <div
                style={{ transform: "translateZ(20px)" }}
                className="absolute inset-4 rounded-[2rem] bg-gradient-to-br from-white/10 to-transparent border border-white/10 backdrop-blur-sm overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-secondary/20 opacity-50 mix-blend-overlay"></div>
            </div>

            {/* Content Layer */}
            <div
                style={{ transform: "translateZ(50px)" }}
                className="absolute inset-0 flex flex-col items-center justify-center text-center p-8"
            >
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary p-1 mb-6 shadow-glow-accent">
                    <img
                        src="https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=800"
                        alt="Avatar"
                        className="w-full h-full rounded-full object-cover border-2 border-white"
                    />
                </div>
                <h2 className="text-4xl font-bold text-white mb-2 tracking-tight">Hola, Sophia</h2>
                <p className="text-gray-400 text-lg">¿Qué nos ponemos hoy?</p>

                <div className="mt-8 flex gap-4">
                    <div className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-white text-sm font-bold">
                        Running
                    </div>
                    <div className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-white text-sm font-bold">
                        Cena
                    </div>
                </div>
            </div>

            {/* Floating Elements */}
            <div
                style={{ transform: "translateZ(80px)" }}
                className="absolute top-10 right-8 w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 blur-xl opacity-40 animate-pulse"
            ></div>

            {/* Glass Reflection */}
            <div
                style={{ transform: "translateZ(1px)" }}
                className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            ></div>
        </motion.div>
    );
}

// --- 2. Slot Machine Prototype (Enhanced) ---
function SlotMachinePrototype() {
    const [isSpinning, setIsSpinning] = useState(false);
    const [result, setResult] = useState<string | null>(null);

    // Real images for a more premium feel
    const items = {
        tops: [
            'https://images.pexels.com/photos/10049570/pexels-photo-10049570.jpeg?auto=compress&cs=tinysrgb&w=300', // White Top
            'https://images.pexels.com/photos/5935754/pexels-photo-5935754.jpeg?auto=compress&cs=tinysrgb&w=300', // Blue Shirt
            'https://images.pexels.com/photos/1124468/pexels-photo-1124468.jpeg?auto=compress&cs=tinysrgb&w=300', // Blazer
        ],
        bottoms: [
            'https://images.pexels.com/photos/1598507/pexels-photo-1598507.jpeg?auto=compress&cs=tinysrgb&w=300', // Jeans
            'https://images.pexels.com/photos/1040424/pexels-photo-1040424.jpeg?auto=compress&cs=tinysrgb&w=300', // Black Pants
            'https://images.pexels.com/photos/7206287/pexels-photo-7206287.jpeg?auto=compress&cs=tinysrgb&w=300', // Skirt
        ],
        shoes: [
            'https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=300', // Sneakers
            'https://images.pexels.com/photos/1478442/pexels-photo-1478442.jpeg?auto=compress&cs=tinysrgb&w=300', // Heels
            'https://images.pexels.com/photos/298863/pexels-photo-298863.jpeg?auto=compress&cs=tinysrgb&w=300', // Boots
        ],
    };

    const spin = () => {
        setIsSpinning(true);
        setResult(null);
        setTimeout(() => {
            setIsSpinning(false);
            setResult('✨ Outfit Match! ✨');
        }, 2500);
    };

    return (
        <div className="flex flex-col items-center gap-10">
            <div className="flex gap-6 p-8 bg-gradient-to-b from-gray-900 to-black rounded-[2.5rem] shadow-2xl border border-white/10 relative overflow-hidden">

                {/* Glass Reflection Overlay */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none z-20 rounded-[2.5rem]"></div>

                {/* Slot Columns */}
                {['tops', 'bottoms', 'shoes'].map((type, i) => (
                    <div key={type} className="w-40 h-56 bg-gray-800/50 rounded-2xl overflow-hidden relative border border-white/5 shadow-inner">
                        <motion.div
                            animate={isSpinning ? { y: [0, -900] } : { y: 0 }}
                            transition={isSpinning ? { repeat: Infinity, duration: 0.4 + (i * 0.1), ease: "linear" } : { type: "spring", stiffness: 150, damping: 20 }}
                            className={`flex flex-col items-center ${isSpinning ? 'blur-sm' : ''}`}
                        >
                            {/* Tripled items for loop */}
                            {[...(items as any)[type], ...(items as any)[type], ...(items as any)[type], ...(items as any)[type]].map((img: string, idx: number) => (
                                <div key={idx} className="h-56 w-full p-2 flex items-center justify-center">
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

            <AnimatePresence>
                {result && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute -bottom-20 bg-white dark:bg-gray-800 px-8 py-4 rounded-2xl shadow-xl border border-primary/30"
                    >
                        <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                            {result}
                        </h3>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// --- 3. Floating Dock Prototype (Liquid Glass) ---
function FloatingDockPrototype() {
    const icons = [
        { id: 'home', icon: 'home', label: 'Inicio' },
        { id: 'search', icon: 'search', label: 'Explorar' },
        { id: 'add', icon: 'add_circle', label: 'Nuevo' },
        { id: 'closet', icon: 'checkroom', label: 'Armario' },
        { id: 'profile', icon: 'person', label: 'Perfil' },
    ];

    return (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-full flex justify-center">
            <div className="
        flex items-end gap-3 px-6 py-4 
        bg-white/10 dark:bg-black/20 
        backdrop-blur-2xl backdrop-saturate-200
        border border-white/20 dark:border-white/10
        rounded-3xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.2)]
        ring-1 ring-white/10
      ">
                {icons.map((item) => (
                    <DockItem key={item.id} icon={item.icon} label={item.label} />
                ))}
            </div>
        </div>
    );
}

function DockItem({ icon, label }: { icon: string; label: string }) {
    const mouseX = useMotionValue(Infinity);
    const [isHovered, setIsHovered] = useState(false);

    return (
        <motion.div
            onMouseMove={(e) => mouseX.set(e.pageX)}
            onMouseLeave={() => mouseX.set(Infinity)}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
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
          bg-gradient-to-b from-white/80 to-white/40 dark:from-gray-800/80 dark:to-gray-900/40
          backdrop-blur-md border border-white/40 dark:border-white/10
          shadow-lg group-hover:shadow-[0_0_20px_rgba(var(--primary),0.4)]
          transition-shadow duration-300
          cursor-pointer
        `}
            >
                <span className={`
          material-symbols-outlined text-3xl 
          text-gray-700 dark:text-gray-200 
          group-hover:text-primary transition-colors duration-300
        `}>
                    {icon}
                </span>

                {/* Reflection */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </motion.div>

            {/* Dot Indicator for active state (simulated) */}
            {label === 'Inicio' && (
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

// --- 4. Morphing Page Transitions Prototype ---
function MorphingPrototype() {
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const items = [
        { id: '1', title: 'Summer Vibes', subtitle: 'Casual Collection', image: 'https://images.pexels.com/photos/10049570/pexels-photo-10049570.jpeg?auto=compress&cs=tinysrgb&w=400' },
        { id: '2', title: 'Office Chic', subtitle: 'Workwear Edit', image: 'https://images.pexels.com/photos/5935754/pexels-photo-5935754.jpeg?auto=compress&cs=tinysrgb&w=400' },
        { id: '3', title: 'Night Out', subtitle: 'Party Essentials', image: 'https://images.pexels.com/photos/1124468/pexels-photo-1124468.jpeg?auto=compress&cs=tinysrgb&w=400' },
    ];

    return (
        <div className="w-full h-full relative min-h-[500px]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {items.map((item) => (
                    <motion.div
                        key={item.id}
                        layoutId={item.id}
                        onClick={() => setSelectedId(item.id)}
                        className="cursor-pointer group relative"
                    >
                        <motion.div
                            className="bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-lg border border-gray-100 dark:border-gray-700"
                        >
                            <motion.div className="aspect-[3/4] overflow-hidden">
                                <motion.img
                                    src={item.image}
                                    alt={item.title}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                            </motion.div>
                            <motion.div className="p-4">
                                <motion.h3 className="text-lg font-bold text-gray-900 dark:text-white">{item.title}</motion.h3>
                                <motion.p className="text-sm text-gray-500">{item.subtitle}</motion.p>
                            </motion.div>
                        </motion.div>
                    </motion.div>
                ))}
            </div>

            <AnimatePresence>
                {selectedId && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-white/80 dark:bg-black/80 backdrop-blur-md pointer-events-auto"
                            onClick={() => setSelectedId(null)}
                        />

                        {items.filter(item => item.id === selectedId).map(item => (
                            <motion.div
                                key={item.id}
                                layoutId={item.id}
                                className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-[2rem] overflow-hidden shadow-2xl z-50 pointer-events-auto relative"
                            >
                                <button
                                    onClick={(e) => { e.stopPropagation(); setSelectedId(null); }}
                                    className="absolute top-4 right-4 z-10 p-2 bg-black/20 backdrop-blur-md rounded-full text-white hover:bg-black/40 transition-colors"
                                >
                                    <span className="material-symbols-outlined">close</span>
                                </button>

                                <motion.div className="aspect-video overflow-hidden">
                                    <motion.img
                                        src={item.image}
                                        alt={item.title}
                                        className="w-full h-full object-cover"
                                    />
                                </motion.div>

                                <motion.div className="p-8">
                                    <motion.h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{item.title}</motion.h2>
                                    <motion.p className="text-lg text-primary font-medium mb-6">{item.subtitle}</motion.p>

                                    <motion.p
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.2 }}
                                        className="text-gray-600 dark:text-gray-300 leading-relaxed mb-8"
                                    >
                                        This is a demonstration of a seamless morphing transition. Notice how the card expands naturally from its position in the grid to fill the center of the screen. This creates a sense of continuity and spatial awareness that standard page loads lack.
                                    </motion.p>

                                    <motion.button
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 }}
                                        className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-transform"
                                    >
                                        Add to Cart
                                    </motion.button>
                                </motion.div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

// --- 5. Tinder-style Swipe Prototype ---
function SwipePrototype() {
    const [cards, setCards] = useState([
        { id: 1, image: 'https://images.pexels.com/photos/10049570/pexels-photo-10049570.jpeg?auto=compress&cs=tinysrgb&w=600', title: 'Casual Sunday' },
        { id: 2, image: 'https://images.pexels.com/photos/5935754/pexels-photo-5935754.jpeg?auto=compress&cs=tinysrgb&w=600', title: 'Business Meeting' },
        { id: 3, image: 'https://images.pexels.com/photos/1124468/pexels-photo-1124468.jpeg?auto=compress&cs=tinysrgb&w=600', title: 'Date Night' },
        { id: 4, image: 'https://images.pexels.com/photos/1598507/pexels-photo-1598507.jpeg?auto=compress&cs=tinysrgb&w=600', title: 'Street Style' },
    ]);

    const removeCard = (id: number) => {
        setCards((prev) => prev.filter((card) => card.id !== id));
    };

    return (
        <div className="w-full h-full flex flex-col items-center justify-center relative min-h-[500px]">
            <div className="relative w-80 h-[480px]">
                <AnimatePresence>
                    {cards.map((card, index) => (
                        <SwipeCard
                            key={card.id}
                            card={card}
                            index={index}
                            total={cards.length}
                            onRemove={() => removeCard(card.id)}
                        />
                    ))}
                </AnimatePresence>

                {cards.length === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                        <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">check_circle</span>
                        <h3 className="text-2xl font-bold text-gray-800 dark:text-white">¡Todo listo!</h3>
                        <p className="text-gray-500 mt-2">Has revisado todas las sugerencias de hoy.</p>
                        <button
                            onClick={() => setCards([
                                { id: 1, image: 'https://images.pexels.com/photos/10049570/pexels-photo-10049570.jpeg?auto=compress&cs=tinysrgb&w=600', title: 'Casual Sunday' },
                                { id: 2, image: 'https://images.pexels.com/photos/5935754/pexels-photo-5935754.jpeg?auto=compress&cs=tinysrgb&w=600', title: 'Business Meeting' },
                                { id: 3, image: 'https://images.pexels.com/photos/1124468/pexels-photo-1124468.jpeg?auto=compress&cs=tinysrgb&w=600', title: 'Date Night' },
                                { id: 4, image: 'https://images.pexels.com/photos/1598507/pexels-photo-1598507.jpeg?auto=compress&cs=tinysrgb&w=600', title: 'Street Style' },
                            ])}
                            className="mt-6 px-6 py-2 bg-primary text-white rounded-full font-medium hover:bg-primary/90 transition-colors"
                        >
                            Reiniciar Demo
                        </button>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="flex gap-6 mt-8">
                <button className="w-14 h-14 rounded-full bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border border-red-100 dark:border-red-900/30">
                    <span className="material-symbols-outlined text-3xl">close</span>
                </button>
                <button className="w-14 h-14 rounded-full bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors border border-yellow-100 dark:border-yellow-900/30">
                    <span className="material-symbols-outlined text-3xl">star</span>
                </button>
                <button className="w-14 h-14 rounded-full bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors border border-green-100 dark:border-green-900/30">
                    <span className="material-symbols-outlined text-3xl">favorite</span>
                </button>
            </div>
        </div>
    );
}

function SwipeCard({ card, index, total, onRemove }: { card: any, index: number, total: number, onRemove: () => void }) {
    const x = useMotionValue(0);
    const rotate = useTransform(x, [-200, 200], [-25, 25]);
    const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);

    // Overlay opacities
    const likeOpacity = useTransform(x, [50, 150], [0, 1]);
    const nopeOpacity = useTransform(x, [-50, -150], [0, 1]);

    const isFront = index === total - 1;

    const handleDragEnd = (_: any, info: any) => {
        if (Math.abs(info.offset.x) > 100) {
            onRemove();
        }
    };

    return (
        <motion.div
            style={{
                x: isFront ? x : 0,
                rotate: isFront ? rotate : 0,
                zIndex: index,
                scale: 1 - (total - 1 - index) * 0.05,
                y: (total - 1 - index) * 10,
            }}
            drag={isFront ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={handleDragEnd}
            animate={{
                scale: 1 - (total - 1 - index) * 0.05,
                y: (total - 1 - index) * 10,
            }}
            className="absolute inset-0 bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700 cursor-grab active:cursor-grabbing origin-bottom"
        >
            <div className="relative h-full">
                <img src={card.image} alt={card.title} className="w-full h-full object-cover pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none"></div>

                <div className="absolute bottom-0 left-0 right-0 p-6 text-white pointer-events-none">
                    <h3 className="text-2xl font-bold">{card.title}</h3>
                    <p className="opacity-80">Desliza para decidir</p>
                </div>

                {/* Like/Nope Stamps */}
                <motion.div style={{ opacity: likeOpacity }} className="absolute top-8 left-8 border-4 border-green-500 rounded-xl px-4 py-2 -rotate-12 pointer-events-none">
                    <span className="text-4xl font-bold text-green-500 uppercase tracking-widest">LIKE</span>
                </motion.div>

                <motion.div style={{ opacity: nopeOpacity }} className="absolute top-8 right-8 border-4 border-red-500 rounded-xl px-4 py-2 rotate-12 pointer-events-none">
                    <span className="text-4xl font-bold text-red-500 uppercase tracking-widest">NOPE</span>
                </motion.div>
            </div>
        </motion.div>
    );
}

// --- 6. Interactive Mood Board Prototype ---
function MoodBoardPrototype() {
    const [stickers, setStickers] = useState([
        { id: 1, x: 50, y: 50, rotate: -10, scale: 1, image: 'https://images.pexels.com/photos/10049570/pexels-photo-10049570.jpeg?auto=compress&cs=tinysrgb&w=300' },
        { id: 2, x: 200, y: 100, rotate: 5, scale: 1, image: 'https://images.pexels.com/photos/5935754/pexels-photo-5935754.jpeg?auto=compress&cs=tinysrgb&w=300' },
        { id: 3, x: 100, y: 250, rotate: 15, scale: 1, image: 'https://images.pexels.com/photos/1124468/pexels-photo-1124468.jpeg?auto=compress&cs=tinysrgb&w=300' },
    ]);

    const containerRef = useRef<HTMLDivElement>(null);

    const addSticker = () => {
        const newSticker = {
            id: Date.now(),
            x: Math.random() * 200,
            y: Math.random() * 200,
            rotate: Math.random() * 30 - 15,
            scale: 1,
            image: 'https://images.pexels.com/photos/1598507/pexels-photo-1598507.jpeg?auto=compress&cs=tinysrgb&w=300',
        };
        setStickers([...stickers, newSticker]);
    };

    return (
        <div className="w-full h-full flex flex-col gap-4 min-h-[600px]">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">Style Collage</h3>
                <button
                    onClick={addSticker}
                    className="flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full font-medium hover:opacity-80 transition-opacity"
                >
                    <span className="material-symbols-outlined text-sm">add</span>
                    Add Item
                </button>
            </div>

            <div
                ref={containerRef}
                className="flex-grow bg-gray-100 dark:bg-gray-800/50 rounded-3xl border-2 border-dashed border-gray-300 dark:border-gray-700 relative overflow-hidden"
                style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }}
            >
                {stickers.map((sticker) => (
                    <MoodBoardItem key={sticker.id} sticker={sticker} containerRef={containerRef} />
                ))}

                <div className="absolute bottom-4 right-4 text-xs text-gray-400 pointer-events-none">
                    Drag to move • Pinch to resize
                </div>
            </div>
        </div>
    );
}

function MoodBoardItem({ sticker, containerRef }: { sticker: any, containerRef: React.RefObject<HTMLDivElement> }) {
    return (
        <motion.div
            drag
            dragConstraints={containerRef}
            dragElastic={0.1}
            dragMomentum={false}
            initial={{ x: sticker.x, y: sticker.y, rotate: sticker.rotate, scale: 0 }}
            animate={{ scale: 1 }}
            whileDrag={{ scale: 1.1, rotate: 0, zIndex: 100, cursor: 'grabbing' }}
            whileHover={{ scale: 1.05, cursor: 'grab' }}
            className="absolute w-32 md:w-40 aspect-[3/4] bg-white p-2 shadow-lg rounded-lg transform-gpu"
            style={{ rotate: sticker.rotate }}
        >
            <img
                src={sticker.image}
                alt="sticker"
                className="w-full h-full object-cover rounded pointer-events-none"
            />
            {/* Pin effect */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-red-500 shadow-sm border-2 border-white/50"></div>
        </motion.div>
    );
}

// --- 7. Liquid Theme Editor Prototype ---
function ThemeEditorPrototype() {
    const { glass, updateGlass } = useTheme();
    const { blur, opacity, saturation, radius } = glass;

    return (
        <div className="w-full h-full flex flex-col md:flex-row gap-8 items-center justify-center min-h-[500px]">

            {/* Controls */}
            <div className="w-full md:w-1/3 bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700">
                <h3 className="text-xl font-bold mb-6 text-gray-800 dark:text-white">Customize Glass</h3>

                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-500 mb-2">Blur Strength ({blur}px)</label>
                        <input
                            type="range" min="0" max="50" value={blur}
                            onChange={(e) => updateGlass('blur', Number(e.target.value))}
                            className="w-full accent-primary"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-500 mb-2">Opacity ({Math.round(opacity * 100)}%)</label>
                        <input
                            type="range" min="0" max="1" step="0.05" value={opacity}
                            onChange={(e) => updateGlass('opacity', Number(e.target.value))}
                            className="w-full accent-primary"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-500 mb-2">Saturation ({saturation}%)</label>
                        <input
                            type="range" min="0" max="300" value={saturation}
                            onChange={(e) => updateGlass('saturation', Number(e.target.value))}
                            className="w-full accent-primary"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-500 mb-2">Corner Radius ({radius}px)</label>
                        <input
                            type="range" min="0" max="50" value={radius}
                            onChange={(e) => updateGlass('radius', Number(e.target.value))}
                            className="w-full accent-primary"
                        />
                    </div>
                </div>
            </div>

            {/* Preview */}
            <div className="w-full md:w-1/2 aspect-square relative rounded-3xl overflow-hidden flex items-center justify-center bg-[url('https://images.pexels.com/photos/3052361/pexels-photo-3052361.jpeg?auto=compress&cs=tinysrgb&w=800')] bg-cover bg-center">
                <div className="absolute inset-0 bg-black/20"></div>

                <motion.div
                    className="w-64 h-64 flex flex-col items-center justify-center text-center p-6 border border-white/20 shadow-2xl relative overflow-hidden group"
                    style={{
                        backdropFilter: `blur(${blur}px) saturate(${saturation}%)`,
                        WebkitBackdropFilter: `blur(${blur}px) saturate(${saturation}%)`,
                        backgroundColor: `rgba(255, 255, 255, ${opacity})`,
                        borderRadius: `${radius}px`,
                    }}
                >
                    {/* Reflection */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none"></div>

                    <span className="material-symbols-outlined text-5xl text-white mb-4 drop-shadow-md">diamond</span>
                    <h2 className="text-2xl font-bold text-white drop-shadow-md">Liquid Glass</h2>
                    <p className="text-white/80 mt-2 text-sm font-medium drop-shadow-sm">
                        This is how your UI elements will look.
                    </p>
                </motion.div>
            </div>
        </div>
    );
}

// --- 8. Color Matcher Prototype ---
function ColorMatcherPrototype() {
    const [selectedColor, setSelectedColor] = useState('#3b82f6'); // Default blue

    const items = [
        { id: 1, color: '#3b82f6', image: 'https://images.pexels.com/photos/5935754/pexels-photo-5935754.jpeg?auto=compress&cs=tinysrgb&w=300', name: 'Blue Shirt' },
        { id: 2, color: '#ef4444', image: 'https://images.pexels.com/photos/1598507/pexels-photo-1598507.jpeg?auto=compress&cs=tinysrgb&w=300', name: 'Red Jeans' },
        { id: 3, color: '#10b981', image: 'https://images.pexels.com/photos/1124468/pexels-photo-1124468.jpeg?auto=compress&cs=tinysrgb&w=300', name: 'Green Jacket' },
        { id: 4, color: '#f59e0b', image: 'https://images.pexels.com/photos/10049570/pexels-photo-10049570.jpeg?auto=compress&cs=tinysrgb&w=300', name: 'Yellow Top' },
        { id: 5, color: '#3b82f6', image: 'https://images.pexels.com/photos/298863/pexels-photo-298863.jpeg?auto=compress&cs=tinysrgb&w=300', name: 'Blue Shoes' },
        { id: 6, color: '#000000', image: 'https://images.pexels.com/photos/1478442/pexels-photo-1478442.jpeg?auto=compress&cs=tinysrgb&w=300', name: 'Black Heels' },
    ];

    const filteredItems = items.filter(item => {
        // Simple exact match for demo, in real app would use color distance
        return item.color === selectedColor;
    });

    return (
        <div className="w-full h-full flex flex-col gap-8 min-h-[500px]">

            {/* Color Picker Section */}
            <div className="flex flex-col items-center gap-4">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">Pick a Color</h3>
                <div className="flex gap-4">
                    {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#000000'].map((color) => (
                        <button
                            key={color}
                            onClick={() => setSelectedColor(color)}
                            className={`
                w-12 h-12 rounded-full shadow-lg border-4 transition-transform hover:scale-110
                ${selectedColor === color ? 'border-white ring-2 ring-primary scale-110' : 'border-transparent'}
              `}
                            style={{ backgroundColor: color }}
                        />
                    ))}
                </div>
            </div>

            {/* Results Grid */}
            <div className="flex-grow bg-gray-50 dark:bg-gray-900/50 rounded-3xl p-6 border border-gray-200 dark:border-gray-800">
                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Matching Items</h4>

                {filteredItems.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {filteredItems.map((item) => (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md group cursor-pointer"
                            >
                                <div className="aspect-square overflow-hidden">
                                    <img
                                        src={item.image}
                                        alt={item.name}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                </div>
                                <div className="p-3">
                                    <p className="font-medium text-gray-800 dark:text-white">{item.name}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="h-40 flex items-center justify-center text-gray-400">
                        No items found for this color.
                    </div>
                )}
            </div>
        </div>
    );
}

// --- 9. Weather-Adaptive Glass Prototype ---
function WeatherGlassPrototype() {
    const [weather, setWeather] = useState<'sunny' | 'rainy' | 'frosty'>('sunny');

    const getBackground = () => {
        switch (weather) {
            case 'sunny': return 'bg-gradient-to-br from-orange-300 via-yellow-200 to-sky-300';
            case 'rainy': return 'bg-gradient-to-b from-gray-800 to-gray-900';
            case 'frosty': return 'bg-gradient-to-br from-blue-100 via-white to-blue-200';
        }
    };

    return (
        <div className={`w-full h-full flex flex-col items-center justify-center gap-8 min-h-[500px] transition-colors duration-1000 ${getBackground()} relative overflow-hidden`}>

            {/* Weather Effects */}
            {weather === 'rainy' && (
                <div className="absolute inset-0 pointer-events-none opacity-50 bg-[url('https://upload.wikimedia.org/wikipedia/commons/8/8c/Rain_animation.gif')] bg-cover mix-blend-overlay"></div>
            )}
            {weather === 'sunny' && (
                <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-400/30 rounded-full blur-[100px] pointer-events-none"></div>
            )}

            {/* Controls */}
            <div className="flex gap-4 z-10">
                {['sunny', 'rainy', 'frosty'].map((w) => (
                    <button
                        key={w}
                        onClick={() => setWeather(w as any)}
                        className={`px-6 py-2 rounded-full capitalize font-bold transition-all ${weather === w ? 'bg-white text-black shadow-lg scale-110' : 'bg-black/20 text-white hover:bg-black/30'}`}
                    >
                        {w}
                    </button>
                ))}
            </div>

            {/* Glass Card */}
            <motion.div
                className={`
          w-80 p-8 rounded-3xl border border-white/20 shadow-2xl text-center z-10
          ${weather === 'frosty' ? 'backdrop-blur-md bg-white/40' : 'backdrop-blur-xl bg-white/10'}
        `}
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            >
                <span className="material-symbols-outlined text-6xl text-white mb-4 drop-shadow-md">
                    {weather === 'sunny' ? 'wb_sunny' : weather === 'rainy' ? 'water_drop' : 'ac_unit'}
                </span>
                <h2 className="text-4xl font-bold text-white drop-shadow-md mb-2">24°C</h2>
                <p className="text-white/90 font-medium">Buenos Aires</p>

                <div className="mt-8 flex justify-between text-white/80 text-sm">
                    <div className="flex flex-col">
                        <span className="material-symbols-outlined">air</span>
                        <span>12 km/h</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="material-symbols-outlined">water_drop</span>
                        <span>48%</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="material-symbols-outlined">visibility</span>
                        <span>10 km</span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

// --- 10. Smart Packing Assistant Prototype ---
function PackingListPrototype() {
    const [items, setItems] = useState([
        { id: 1, name: 'Passport', checked: false, icon: 'badge' },
        { id: 2, name: 'Sunglasses', checked: false, icon: 'sunglasses' },
        { id: 3, name: 'Swimsuit', checked: false, icon: 'pool' },
        { id: 4, name: 'Camera', checked: false, icon: 'photo_camera' },
    ]);

    const toggleItem = (id: number) => {
        setItems(items.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
    };

    const progress = items.filter(i => i.checked).length / items.length;

    return (
        <div className="w-full h-full flex flex-col items-center justify-center min-h-[500px] bg-blue-50 dark:bg-slate-900">
            <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden">

                {/* Header */}
                <div className="bg-blue-600 p-8 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                    <h3 className="text-2xl font-bold mb-1">Trip to Tulum</h3>
                    <p className="text-blue-100 text-sm">4 days left • 28°C Sunny</p>

                    {/* Progress Bar */}
                    <div className="mt-6 h-2 bg-black/20 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-white"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress * 100}%` }}
                        />
                    </div>
                </div>

                {/* List */}
                <div className="p-4">
                    {items.map((item) => (
                        <motion.div
                            key={item.id}
                            onClick={() => toggleItem(item.id)}
                            className={`
                flex items-center gap-4 p-4 rounded-xl cursor-pointer mb-2 transition-colors
                ${item.checked ? 'bg-green-50 dark:bg-green-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}
              `}
                            whileTap={{ scale: 0.98 }}
                        >
                            <div className={`
                w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors
                ${item.checked ? 'bg-green-500 border-green-500' : 'border-gray-300 dark:border-gray-600'}
              `}>
                                {item.checked && <span className="material-symbols-outlined text-white text-sm">check</span>}
                            </div>

                            <div className="flex-grow">
                                <p className={`font-medium ${item.checked ? 'text-gray-400 line-through' : 'text-gray-800 dark:text-white'}`}>
                                    {item.name}
                                </p>
                            </div>

                            <span className="material-symbols-outlined text-gray-400">{item.icon}</span>
                        </motion.div>
                    ))}
                </div>

                {/* Add Button */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-700">
                    <button className="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 font-medium hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        + Add Item
                    </button>
                </div>
            </div>
        </div>
    );
}

// --- 11. Style Analytics Prototype ---
function AnalyticsPrototype() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center min-h-[500px] gap-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">

                {/* Card 1: Most Worn */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6">Most Worn Colors</h3>
                    <div className="flex items-end justify-between h-40 gap-4 px-4">
                        {[
                            { color: '#000000', height: '80%', label: 'Black' },
                            { color: '#ffffff', height: '60%', label: 'White' },
                            { color: '#3b82f6', height: '40%', label: 'Blue' },
                            { color: '#ef4444', height: '20%', label: 'Red' },
                        ].map((bar, i) => (
                            <div key={i} className="flex flex-col items-center gap-2 w-full">
                                <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: bar.height }}
                                    transition={{ delay: i * 0.1, type: 'spring' }}
                                    className="w-full rounded-t-xl relative overflow-hidden group"
                                    style={{ backgroundColor: bar.color, border: bar.color === '#ffffff' ? '1px solid #e5e7eb' : 'none' }}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                                </motion.div>
                                <span className="text-xs font-medium text-gray-500">{bar.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Card 2: Cost per Wear */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Cost Per Wear</h3>
                            <p className="text-sm text-gray-500">Average across wardrobe</p>
                        </div>
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">-12%</span>
                    </div>

                    <div className="flex items-center justify-center py-8">
                        <div className="relative w-40 h-40">
                            <svg className="w-full h-full -rotate-90">
                                <circle cx="80" cy="80" r="70" stroke="#e5e7eb" strokeWidth="12" fill="transparent" />
                                <motion.circle
                                    cx="80" cy="80" r="70"
                                    stroke="#10b981" strokeWidth="12" fill="transparent"
                                    strokeDasharray="440"
                                    strokeDashoffset="440"
                                    animate={{ strokeDashoffset: 100 }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-bold text-gray-800 dark:text-white">$4.20</span>
                                <span className="text-xs text-gray-500">per wear</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

// --- 12. Magic Mirror (AR Lite) Prototype ---
function MagicMirrorPrototype() {
    const [selectedItem, setSelectedItem] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        // Simulate camera feed with a placeholder video or image if actual camera access is tricky/blocked
        // For this prototype, we'll use a static "selfie" image to demonstrate the overlay
    }, []);

    const items = [
        { id: 'glasses', icon: 'sunglasses', image: 'https://purepng.com/public/uploads/large/purepng.com-glassesglasseseyewear-1421526461509d5tqf.png' },
        { id: 'hat', icon: 'school', image: 'https://purepng.com/public/uploads/large/purepng.com-hatfashion-dress-object-hat-clothing-head-cap-631522326876i7s0u.png' },
        { id: 'necklace', icon: 'diamond', image: 'https://purepng.com/public/uploads/large/purepng.com-necklacejewellery-gold-necklace-metal-precious-stone-chain-pendant-locket-63152232518043f2z.png' },
    ];

    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-8 min-h-[600px]">
            <div className="relative w-full max-w-md aspect-[3/4] bg-black rounded-3xl overflow-hidden shadow-2xl border-4 border-gray-900">

                {/* Simulated Camera Feed */}
                <img
                    src="https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=800"
                    alt="User Selfie"
                    className="w-full h-full object-cover opacity-80"
                />

                {/* AR Overlay */}
                <AnimatePresence>
                    {selectedItem && (
                        <motion.img
                            key={selectedItem}
                            src={items.find(i => i.id === selectedItem)?.image}
                            initial={{ opacity: 0, scale: 0.5, y: -50 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            className="absolute top-1/3 left-1/2 -translate-x-1/2 w-48 drop-shadow-2xl"
                            style={{
                                top: selectedItem === 'glasses' ? '35%' : selectedItem === 'hat' ? '15%' : '55%'
                            }}
                        />
                    )}
                </AnimatePresence>

                {/* UI Overlay */}
                <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="flex justify-center gap-4">
                        {items.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setSelectedItem(selectedItem === item.id ? null : item.id)}
                                className={`
                  w-14 h-14 rounded-full flex items-center justify-center backdrop-blur-md border transition-all
                  ${selectedItem === item.id ? 'bg-white text-black border-white scale-110' : 'bg-white/20 text-white border-white/30 hover:bg-white/30'}
                `}
                            >
                                <span className="material-symbols-outlined">{item.icon}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Scan Lines Effect */}
                <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px]"></div>
            </div>

            <p className="text-gray-500 text-sm">
                *In the real app, this would use the live camera feed.
            </p>
        </div>
    );
}

// --- 13. Style Duel Prototype ---
function StyleDuelPrototype() {
    const [voted, setVoted] = useState<number | null>(null);

    const outfit1 = 'https://images.pexels.com/photos/1598507/pexels-photo-1598507.jpeg?auto=compress&cs=tinysrgb&w=400';
    const outfit2 = 'https://images.pexels.com/photos/10049570/pexels-photo-10049570.jpeg?auto=compress&cs=tinysrgb&w=400';

    return (
        <div className="w-full h-full flex flex-col items-center justify-center min-h-[600px]">
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-8">Which style do you prefer?</h3>

            <div className="flex flex-col md:flex-row gap-8 items-center">

                {/* Option 1 */}
                <div className="relative group cursor-pointer" onClick={() => setVoted(1)}>
                    <motion.div
                        className={`w-64 h-80 rounded-3xl overflow-hidden shadow-xl border-4 transition-all duration-300 ${voted === 1 ? 'border-green-500 scale-105' : 'border-transparent hover:scale-105'}`}
                        whileHover={{ y: -10 }}
                    >
                        <img src={outfit1} alt="Outfit 1" className="w-full h-full object-cover" />
                        {voted === 1 && (
                            <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                                <span className="material-symbols-outlined text-6xl text-white drop-shadow-lg">check_circle</span>
                            </div>
                        )}
                    </motion.div>
                    <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="px-4 py-2 bg-black text-white rounded-full text-sm font-bold">Vote A</span>
                    </div>
                </div>

                <div className="text-2xl font-bold text-gray-300">VS</div>

                {/* Option 2 */}
                <div className="relative group cursor-pointer" onClick={() => setVoted(2)}>
                    <motion.div
                        className={`w-64 h-80 rounded-3xl overflow-hidden shadow-xl border-4 transition-all duration-300 ${voted === 2 ? 'border-green-500 scale-105' : 'border-transparent hover:scale-105'}`}
                        whileHover={{ y: -10 }}
                    >
                        <img src={outfit2} alt="Outfit 2" className="w-full h-full object-cover" />
                        {voted === 2 && (
                            <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                                <span className="material-symbols-outlined text-6xl text-white drop-shadow-lg">check_circle</span>
                            </div>
                        )}
                    </motion.div>
                    <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="px-4 py-2 bg-black text-white rounded-full text-sm font-bold">Vote B</span>
                    </div>
                </div>

            </div>

            {voted && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-12 px-6 py-3 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-600 dark:text-gray-300 font-medium"
                >
                    Thanks for voting! We're learning your style. 🧠
                </motion.div>
            )}
        </div>
    );
}

// --- 14. Holographic Card Prototype ---
function HolographicCardPrototype() {
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotateX = useTransform(y, [0, 400], [15, -15]);
    const rotateY = useTransform(x, [0, 300], [-15, 15]);

    function handleMouse(event: React.MouseEvent<HTMLDivElement>) {
        const rect = event.currentTarget.getBoundingClientRect();
        x.set(event.clientX - rect.left);
        y.set(event.clientY - rect.top);
    }

    return (
        <div className="flex items-center justify-center w-full h-full min-h-[500px] perspective-1000">
            <motion.div
                style={{
                    rotateX,
                    rotateY,
                    transformStyle: "preserve-3d",
                }}
                onMouseMove={handleMouse}
                onMouseLeave={() => {
                    x.set(150);
                    y.set(200);
                }}
                className="relative w-80 h-[450px] rounded-[2rem] bg-black shadow-2xl cursor-pointer group overflow-hidden"
            >
                {/* Holographic Gradient Layer */}
                <div
                    className="absolute inset-0 opacity-80 mix-blend-color-dodge pointer-events-none"
                    style={{
                        background: 'linear-gradient(105deg, transparent 20%, rgba(255,219,219,0.4) 40%, rgba(255,255,255,0.6) 45%, rgba(255,219,219,0.4) 50%, transparent 55%)',
                        backgroundSize: '200% 200%',
                        filter: 'brightness(1.2) contrast(1.2)',
                    }}
                />

                {/* Iridescent Sheen */}
                <motion.div
                    className="absolute inset-0 opacity-50 mix-blend-overlay pointer-events-none"
                    style={{
                        background: 'linear-gradient(to bottom right, #ff00cc, #3333ff, #00ccff)',
                        backgroundSize: '200% 200%',
                    }}
                    animate={{
                        backgroundPosition: ['0% 0%', '100% 100%'],
                    }}
                    transition={{
                        duration: 5,
                        repeat: Infinity,
                        repeatType: "reverse",
                    }}
                />

                {/* Content */}
                <div className="absolute inset-0 p-8 flex flex-col justify-between z-10">
                    <div className="flex justify-between items-start">
                        <span className="material-symbols-outlined text-white text-3xl">diamond</span>
                        <span className="px-3 py-1 rounded-full border border-white/30 text-white text-xs font-bold backdrop-blur-md">PREMIUM</span>
                    </div>

                    <div>
                        <h3 className="text-3xl font-bold text-white mb-2">Ultra Plan</h3>
                        <p className="text-white/70 text-sm mb-6">Unlock the full power of AI styling with holographic precision.</p>
                        <button className="w-full py-3 rounded-xl bg-white text-black font-bold hover:scale-105 transition-transform">
                            Upgrade Now
                        </button>
                    </div>
                </div>

                {/* Noise Texture */}
                <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }}></div>
            </motion.div>
        </div>
    );
}

// --- 15. Liquid Button Prototype ---
function LiquidButtonPrototype() {
    return (
        <div className="flex flex-col items-center justify-center w-full h-full min-h-[500px] gap-12">
            {/* SVG Filter Definition */}
            <svg className="absolute w-0 h-0">
                <defs>
                    <filter id="goo">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
                        <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" result="goo" />
                        <feComposite in="SourceGraphic" in2="goo" operator="atop" />
                    </filter>
                </defs>
            </svg>

            <div className="relative group">
                <button className="relative z-10 px-12 py-4 bg-primary text-white text-xl font-bold rounded-full transition-transform group-hover:scale-105">
                    Generate Outfit
                </button>

                {/* Liquid Blobs */}
                <div
                    className="absolute inset-0 bg-primary rounded-full -z-10 group-hover:animate-pulse"
                    style={{ filter: 'url(#goo)' }}
                >
                    <span className="absolute top-0 left-1/4 w-8 h-8 bg-primary rounded-full animate-[ping_2s_ease-in-out_infinite]"></span>
                    <span className="absolute bottom-0 right-1/4 w-6 h-6 bg-primary rounded-full animate-[ping_2.5s_ease-in-out_infinite_0.5s]"></span>
                    <span className="absolute top-1/2 left-1/2 w-10 h-10 bg-primary rounded-full animate-[ping_3s_ease-in-out_infinite_1s] -translate-x-1/2 -translate-y-1/2"></span>
                </div>
            </div>

            <p className="text-gray-500 max-w-xs text-center">
                Uses SVG filters to create a "gooey" liquid effect that feels organic and alive.
            </p>
        </div>
    );
}

// --- 16. Glass Modal Prototype ---
function GlassModalPrototype() {
    return (
        <div className="flex items-center justify-center w-full h-full min-h-[600px] bg-[url('https://images.pexels.com/photos/3052361/pexels-photo-3052361.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1')] bg-cover bg-center relative">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>

            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="
                    relative w-full max-w-lg p-8 rounded-[2.5rem] 
                    bg-white/10 backdrop-blur-2xl backdrop-saturate-150
                    border border-white/20 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)]
                    overflow-hidden
                "
            >
                {/* Chromatic Aberration Border Effect */}
                <div className="absolute inset-0 rounded-[2.5rem] border border-white/10 pointer-events-none" style={{ boxShadow: 'inset 0 0 20px rgba(255,255,255,0.1)' }}></div>

                <div className="relative z-10 text-center">
                    <div className="w-20 h-20 mx-auto bg-gradient-to-tr from-white/20 to-transparent rounded-full flex items-center justify-center mb-6 border border-white/20 shadow-lg">
                        <span className="material-symbols-outlined text-4xl text-white">check</span>
                    </div>

                    <h2 className="text-3xl font-bold text-white mb-2">Outfit Saved</h2>
                    <p className="text-white/70 mb-8">Your look has been added to your digital closet.</p>

                    <div className="flex gap-4">
                        <button className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-colors border border-white/10">
                            View Closet
                        </button>
                        <button className="flex-1 py-3 rounded-xl bg-white text-black font-bold hover:bg-gray-100 transition-colors shadow-lg shadow-white/10">
                            Share Look
                        </button>
                    </div>
                </div>

                {/* Reflection */}
                <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-gradient-to-b from-white/5 to-transparent rotate-45 pointer-events-none"></div>
            </motion.div>
        </div>
    );
}

// --- 17. Floating Cloth Prototype ---
function FloatingClothPrototype() {
    return (
        <div className="flex items-center justify-center w-full h-full min-h-[500px] bg-gray-900 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900"></div>

            {/* Simulated Cloth using SVG Path Animation */}
            <svg viewBox="0 0 200 200" className="w-96 h-96 drop-shadow-2xl">
                <defs>
                    <linearGradient id="clothGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#4f46e5" />
                        <stop offset="50%" stopColor="#818cf8" />
                        <stop offset="100%" stopColor="#c084fc" />
                    </linearGradient>
                    <filter id="clothShadow">
                        <feDropShadow dx="0" dy="10" stdDeviation="10" floodOpacity="0.5" />
                    </filter>
                </defs>

                <motion.path
                    d="M20,20 Q50,10 80,20 T140,20 T180,20 V180 Q150,190 120,180 T60,180 T20,180 Z"
                    fill="url(#clothGradient)"
                    filter="url(#clothShadow)"
                    animate={{
                        d: [
                            "M20,20 Q50,10 80,20 T140,20 T180,20 V180 Q150,190 120,180 T60,180 T20,180 Z",
                            "M20,20 Q50,30 80,20 T140,10 T180,20 V180 Q150,170 120,180 T60,190 T20,180 Z",
                            "M20,20 Q50,10 80,20 T140,20 T180,20 V180 Q150,190 120,180 T60,180 T20,180 Z"
                        ]
                    }}
                    transition={{
                        duration: 5,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />

                {/* Highlights */}
                <motion.path
                    d="M40,40 Q60,30 80,40"
                    fill="none"
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth="2"
                    animate={{ d: ["M40,40 Q60,30 80,40", "M40,40 Q60,50 80,40", "M40,40 Q60,30 80,40"] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                />
            </svg>

            <div className="absolute bottom-10 text-white/50 text-sm">
                Simulated fabric physics using SVG path morphing.
            </div>
        </div>
    );
}

// --- 18. Reactive Cursor Prototype ---
function ReactiveCursorPrototype() {
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const [isHovering, setIsHovering] = useState(false);

    function handleMouseMove(e: React.MouseEvent) {
        const rect = e.currentTarget.getBoundingClientRect();
        mouseX.set(e.clientX - rect.left);
        mouseY.set(e.clientY - rect.top);
    }

    return (
        <div
            className="w-full h-full min-h-[500px] bg-black relative overflow-hidden cursor-none flex items-center justify-center"
            onMouseMove={handleMouseMove}
        >
            {/* Grid Background */}
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

            {/* Main Cursor */}
            <motion.div
                className="absolute w-8 h-8 bg-white rounded-full mix-blend-difference pointer-events-none z-50"
                style={{ x: mouseX, y: mouseY, translateX: '-50%', translateY: '-50%' }}
                animate={{ scale: isHovering ? 3 : 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 28 }}
            />

            {/* Trailing Glow */}
            <motion.div
                className="absolute w-64 h-64 bg-primary/40 rounded-full blur-[80px] pointer-events-none z-0"
                style={{ x: mouseX, y: mouseY, translateX: '-50%', translateY: '-50%' }}
                transition={{ type: "spring", damping: 50, stiffness: 200 }}
            />

            {/* Interactive Elements */}
            <div className="flex gap-8 z-10">
                {['HOVER', 'ME', 'NOW'].map((text, i) => (
                    <motion.div
                        key={i}
                        onMouseEnter={() => setIsHovering(true)}
                        onMouseLeave={() => setIsHovering(false)}
                        className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500 select-none"
                    >
                        {text}
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

// --- 19. Neon Glass Text Prototype ---
function NeonGlassTextPrototype() {
    return (
        <div className="flex items-center justify-center w-full h-full min-h-[500px] bg-black relative overflow-hidden">
            {/* Dark Glass Background */}
            <div className="absolute inset-0 bg-[url('https://images.pexels.com/photos/2387793/pexels-photo-2387793.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1')] bg-cover bg-center opacity-20"></div>

            <div className="relative z-10 p-12 rounded-[3rem] bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
                <h1 className="text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 relative">
                    FUTURE
                    {/* Neon Glow Layer */}
                    <span
                        className="absolute inset-0 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 blur-md"
                        aria-hidden="true"
                    >
                        FUTURE
                    </span>
                    <span
                        className="absolute inset-0 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 blur-xl opacity-50"
                        aria-hidden="true"
                    >
                        FUTURE
                    </span>
                </h1>

                <h2 className="text-6xl font-bold text-white/90 mt-4 relative mix-blend-overlay">
                    FASHION
                </h2>

                {/* Reflection Line */}
                <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/10 to-transparent rounded-t-[3rem] pointer-events-none"></div>
            </div>
        </div>
    );
}

// --- 20. Dynamic Mesh Prototype ---
function DynamicMeshPrototype() {
    return (
        <div className="w-full h-full min-h-[500px] relative overflow-hidden bg-black flex items-center justify-center">
            {/* Moving Gradient Orbs */}
            <motion.div
                className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600 rounded-full mix-blend-screen filter blur-[100px] opacity-60"
                animate={{
                    x: [0, 100, -50, 0],
                    y: [0, -50, 100, 0],
                    scale: [1, 1.2, 0.8, 1],
                }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
                className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600 rounded-full mix-blend-screen filter blur-[100px] opacity-60"
                animate={{
                    x: [0, -100, 50, 0],
                    y: [0, 50, -100, 0],
                    scale: [1, 0.8, 1.2, 1],
                }}
                transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
                className="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-screen filter blur-[100px] opacity-60"
                animate={{
                    x: [0, 50, -100, 0],
                    y: [0, 100, -50, 0],
                }}
                transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Glass Overlay Card */}
            <div className="relative z-10 w-full max-w-md p-8 rounded-3xl bg-white/5 backdrop-blur-3xl border border-white/10 shadow-2xl">
                <h2 className="text-4xl font-bold text-white mb-4">Mesh Gradients</h2>
                <p className="text-white/80 leading-relaxed">
                    Soft, moving gradients create a calming and premium atmosphere. Perfect for login screens or profile backgrounds where you want depth without distraction.
                </p>
                <button className="mt-8 px-8 py-3 bg-white text-black rounded-full font-bold hover:bg-opacity-90 transition-colors">
                    Get Started
                </button>
            </div>
        </div>
    );
}
