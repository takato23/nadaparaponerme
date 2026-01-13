import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppModals } from '../../hooks/useAppModals';
import { DigitalTwinProfile, ClothingItem, VirtualMirrorContext } from '../../types';
import Loader from '../Loader';
import { generateFashionImage, buildHighFidelityPrompt } from '../../src/services/imageGenerationService';
import { useToast } from '../../hooks/useToast';

interface VirtualMirrorViewProps {
    closet?: ClothingItem[];
    onOpenDigitalTwinSetup: () => void;
    onOpenHistory?: () => void;
}

const VirtualMirrorView: React.FC<VirtualMirrorViewProps> = ({ closet = [], onOpenDigitalTwinSetup, onOpenHistory }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const modals = useAppModals(); // Still needed for reading showDigitalTwinSetup state if we want to react to close, but the TRIGGER must use the prop.
    const toast = useToast();

    const [twinProfile, setTwinProfile] = useState<DigitalTwinProfile | null>(null);
    const [selectedContext, setSelectedContext] = useState<VirtualMirrorContext>('mirror');
    const [selectedItem, setSelectedItem] = useState<ClothingItem | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);

    // Context presets for background/lighting
    const CONTEXTS: { id: VirtualMirrorContext; name: string; icon: string; prompt: string }[] = [
        { id: 'mirror', name: 'Espejo Casa', icon: 'door_sliding', prompt: 'standing in front of a mirror in a modern bedroom, bright natural lighting' },
        { id: 'street', name: 'Calle', icon: 'location_city', prompt: 'walking on a city street during the day, street style photography, urban background' },
        { id: 'night_event', name: 'Evento Noche', icon: 'nightlife', prompt: 'at a night event, ambient party lighting, elegant atmosphere' },
        { id: 'beach', name: 'Playa', icon: 'beach_access', prompt: 'standing on a beach on a sunny day, ocean background' }
    ];

    // Smart Context Mapping
    const SMART_CONTEXT_MAP: Record<string, VirtualMirrorContext> = {
        'bikini': 'beach',
        'swimwear': 'beach',
        'dress': 'night_event',
        'suit': 'night_event',
        'coat': 'street',
        'jacket': 'street',
        'sneakers': 'street',
        'pajamas': 'mirror',
        'underwear': 'mirror'
    };

    useEffect(() => {
        // Load Digital Twin Profile
        const storedProfile = localStorage.getItem('ojodeloca-digital-twin');
        console.log('[VirtualMirrorView] Loading twin profile from localStorage:', storedProfile ? 'found' : 'not found');
        if (storedProfile) {
            try {
                const parsed = JSON.parse(storedProfile);
                console.log('[VirtualMirrorView] Parsed profile:', {
                    id: parsed.id,
                    hasSourceImages: !!parsed.sourceImages,
                    sourceImagesLength: parsed.sourceImages?.length
                });
                setTwinProfile(parsed);
            } catch (e) {
                console.error('[VirtualMirrorView] Error parsing profile:', e);
            }
        }
    }, []);

    // Listen for modal closure to reload profile if created
    useEffect(() => {
        if (!modals.showDigitalTwinSetup) {
            const storedProfile = localStorage.getItem('ojodeloca-digital-twin');
            if (storedProfile) {
                setTwinProfile(JSON.parse(storedProfile));
            }
        }
    }, [modals.showDigitalTwinSetup]);

    // Handle initial navigation context & Smart Context Logic
    useEffect(() => {
        if (location.state?.tab === 'virtual' && closet.length > 0) {
            const virtualItems = closet.filter(i => i.status === 'virtual' || i.status === 'wishlist');
            if (virtualItems.length > 0) {
                const sorted = [...virtualItems].sort((a, b) => b.id.localeCompare(a.id));
                const item = sorted[0];
                setSelectedItem(item);

                // Smart Context: Auto-select based on category/subcategory
                const categoryKey = item.metadata.subcategory.toLowerCase().split(' ')[0] || item.metadata.category;
                const smartContext = SMART_CONTEXT_MAP[categoryKey] || SMART_CONTEXT_MAP[item.metadata.category] || 'mirror';
                setSelectedContext(smartContext);
            }
        }
        // Handle direct item selection passed via location (e.g. from Closet "Try On" button)
        if (location.state?.selectedItemId) {
            const item = closet.find(i => i.id === location.state.selectedItemId);
            if (item) {
                setSelectedItem(item);
                // Smart Context
                const categoryKey = item.metadata.subcategory.toLowerCase().split(' ')[0] || item.metadata.category;
                const smartContext = SMART_CONTEXT_MAP[categoryKey] || SMART_CONTEXT_MAP[item.metadata.category] || 'mirror';
                setSelectedContext(smartContext);
            }
        }
    }, [location.state, closet]);


    const handleTryOn = async () => {
        if (!twinProfile || !selectedItem) return;

        setIsLoading(true);
        setGeneratedImage(null);

        try {
            const contextConfig = CONTEXTS.find(c => c.id === selectedContext);
            const contextPrompt = contextConfig?.prompt || '';
            const texturePrompt = `${selectedItem.metadata.subcategory}, ${selectedItem.metadata.color_primary}, ${selectedItem.metadata.vibe_tags.join(', ')}`;

            // Use the new High Fidelity builder
            const finalPrompt = buildHighFidelityPrompt(texturePrompt, contextPrompt);

            const result = await generateFashionImage({
                prompt: finalPrompt,
                user_base_image: twinProfile.sourceImages[0],
                input_images: [selectedItem.imageDataUrl],
                style_preferences: {
                    mood: selectedContext === 'night_event' ? 'dark' : 'bright'
                }
            });

            setGeneratedImage(result.image_url);
            toast.success('¡Look generado exitosamente!');
        } catch (error) {
            console.error('Try On Error:', error);
            toast.error('Error al generar el look. Intenta de nuevo.');
        } finally {
            setIsLoading(false);
        }
    };


    const handleCreateTwin = () => {
        onOpenDigitalTwinSetup();
    };

    // Check if profile has valid images
    const hasValidImages = twinProfile && twinProfile.sourceImages && twinProfile.sourceImages.length > 0 && twinProfile.sourceImages[0];

    if (!twinProfile || !hasValidImages) {
        return (
            <div className="min-h-screen h-full flex flex-col items-center justify-center relative overflow-hidden bg-black">
                {/* Immersive Background */}
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=2574&auto=format&fit=crop')] bg-cover bg-center opacity-40"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent"></div>

                {/* Content Card */}
                <div className="relative z-10 p-8 md:p-12 max-w-lg w-full text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group"
                    >
                        {/* Subtle Shine Effect */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

                        <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mb-6 mx-auto shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                            <span className="material-symbols-outlined text-5xl text-white">accessibility_new</span>
                        </div>

                        <h2 className="text-4xl font-serif font-bold text-white mb-4 tracking-tight">
                            Espejo Virtual
                        </h2>

                        <p className="text-gray-300 mb-8 leading-relaxed font-light">
                            Configura tu <strong className="text-white font-medium">Gemelo Digital</strong> para probarte cualquier prenda de tu armario sin moverte de casa.
                        </p>

                        <button
                            onClick={handleCreateTwin}
                            className="w-full group relative py-4 px-8 rounded-xl bg-white text-black font-bold text-lg shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all overflow-hidden"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined">add_circle</span>
                                CREAR MI GEMELO
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-gray-100 to-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>

                        <p className="text-[10px] uppercase tracking-widest text-white/30 mt-6">
                            Potenciado por IA
                        </p>

                        {/* Back Button */}
                        <button
                            onClick={() => navigate(-1)}
                            className="mt-6 text-white/40 hover:text-white text-xs font-medium flex items-center justify-center gap-2 transition-colors"
                        >
                            <span className="material-symbols-outlined text-sm">arrow_back</span>
                            Volver al Armario
                        </button>
                    </motion.div>
                </div>

                {/* Background Decoration */}
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent pointer-events-none"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen h-full flex flex-col p-4 md:p-6 overflow-hidden bg-gray-50 dark:bg-black">
            <div className="flex-1 bg-white dark:bg-black rounded-3xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-800 relative flex flex-col md:flex-row">

                {/* Background Layer - Dynamic based on Context */}
                <div className={`absolute inset-0 transition-colors duration-700 ${selectedContext === 'night_event' ? 'bg-indigo-950/90' :
                    selectedContext === 'beach' ? 'bg-blue-50' :
                        selectedContext === 'street' ? 'bg-gray-200' :
                            'bg-gray-100 dark:bg-gray-900'
                    }`}>
                    {/* Abstract Context Overlay */}
                    <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
                </div>

                {/* Left Panel: Controls */}
                <div className="w-full md:w-80 lg:w-96 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col gap-6 h-full z-20 shadow-2xl relative">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <button onClick={() => navigate(location.state?.from || '/')} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                                <span className="material-symbols-outlined">arrow_back</span>
                            </button>
                            <h1 className="text-xl font-bold font-serif">Espejo Virtual</h1>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* History Button */}
                            {onOpenHistory && (
                                <button
                                    onClick={onOpenHistory}
                                    className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
                                    title="Ver Historial de Diseños"
                                >
                                    <span className="material-symbols-outlined">history</span>
                                </button>
                            )}

                            {/* Edit Twin Button */}
                            <button
                                onClick={handleCreateTwin}
                                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-400 hover:text-primary"
                                title="Editar mi Gemelo"
                            >
                                <span className="material-symbols-outlined">edit_square</span>
                            </button>
                        </div>
                    </div>

                    {/* Context Selector */}
                    <div className="space-y-3">
                        <label className="text-xs font-semibold uppercase text-gray-500 tracking-wider">Escenario</label>
                        <div className="grid grid-cols-2 gap-2">
                            {CONTEXTS.map(ctx => (
                                <button
                                    key={ctx.id}
                                    onClick={() => setSelectedContext(ctx.id)}
                                    className={`p-3 rounded-xl flex flex-col items-center gap-2 transition-all ${selectedContext === ctx.id
                                        ? 'bg-primary text-white shadow-lg scale-105 ring-2 ring-primary ring-offset-2 dark:ring-offset-gray-900'
                                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50'
                                        }`}
                                >
                                    <span className="material-symbols-outlined">{ctx.icon}</span>
                                    <span className="text-xs font-medium">{ctx.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Selected Item */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <label className="text-xs font-semibold uppercase text-gray-500 tracking-wider mb-3">Prenda a Probar</label>
                        <div
                            className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex-1 flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors relative overflow-hidden group"
                            onClick={() => {
                                toast.info('Selecciona desde el armario');
                                navigate('/');
                            }}
                        >
                            {selectedItem ? (
                                <>
                                    <img src={selectedItem.imageDataUrl} alt="Selected" className="w-full h-full object-contain mb-2 max-h-[160px]" />
                                    <div className="text-center">
                                        <p className="font-bold capitalize text-sm md:text-base">{selectedItem.metadata.subcategory}</p>
                                        <p className="text-xs text-gray-500 capitalize">{selectedItem.metadata.category}</p>
                                    </div>
                                    <div className="absolute top-2 right-2 bg-purple-100 text-purple-600 px-2 py-1 rounded text-[10px] font-bold uppercase">
                                        {selectedItem.status === 'virtual' ? 'Virtual' : 'Propio'}
                                    </div>
                                </>
                            ) : (
                                <div className="text-center text-gray-400">
                                    <span className="material-symbols-outlined text-4xl mb-2">checkroom</span>
                                    <p className="text-xs">Selecciona una prenda</p>
                                </div>
                            )}

                            {/* Change Item Overlay */}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="text-white font-medium flex items-center gap-2 text-sm">
                                    <span className="material-symbols-outlined text-lg">swap_horiz</span> Cambiar
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={handleTryOn}
                        disabled={!selectedItem || isLoading}
                        className={`
                            w-full py-3 md:py-4 rounded-xl font-bold text-base md:text-lg shadow-xl hover:shadow-2xl transition-all
                            flex items-center justify-center gap-2
                            ${!selectedItem || isLoading
                                ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed text-gray-500'
                                : 'bg-black dark:bg-white text-white dark:text-black hover:scale-[1.02]'}
                        `}
                    >
                        {isLoading ? (
                            <>
                                <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                                Generando...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined">auto_fix_high</span>
                                PROBAR AHORA
                            </>
                        )}
                    </button>

                    {/* Helper text */}
                    <p className="text-[10px] text-center text-gray-400">
                        Calidad alta activada
                    </p>
                </div>

                {/* Right Panel: Mirror / Result */}
                <div className="flex-1 relative flex items-center justify-center p-4 md:p-8 overflow-hidden z-10">
                    {/* The "Mirror" Frame */}
                    <motion.div
                        layoutId="mirror-frame"
                        className="w-full max-w-xs sm:max-w-sm md:max-w-md aspect-[3/4] bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden relative border-[8px] md:border-[12px] border-white/30 backdrop-blur-md ring-1 ring-black/5"
                    >
                        {/* Display Content: Generated Result OR Base Twin */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900">
                            {generatedImage ? (
                                <img src={generatedImage} alt="Try On Result" className="w-full h-full object-cover animate-fade-in" />
                            ) : twinProfile?.sourceImages?.[0] ? (
                                <div className="relative w-full h-full">
                                    <img
                                        src={twinProfile.sourceImages[0]}
                                        alt="Digital Twin Base"
                                        className="w-full h-full object-cover opacity-90 transition-opacity duration-500"
                                    />
                                    {/* Overlay Hint if ready to try */}
                                    {selectedItem && !isLoading && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
                                            <div className="bg-white/90 dark:bg-black/80 px-6 py-3 rounded-full shadow-lg backdrop-blur-md">
                                                <p className="text-xs md:text-sm font-medium">✨ Lista para probar {selectedItem.metadata.subcategory}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <span className="material-symbols-outlined text-6xl text-gray-300">person_off</span>
                            )}

                            {/* Context Label Overlay */}
                            <div className="absolute bottom-6 left-0 right-0 text-center pointer-events-none">
                                <span className="inline-block px-3 py-1 rounded-full bg-black/30 backdrop-blur-md text-white text-[10px] font-medium uppercase tracking-widest border border-white/20">
                                    {CONTEXTS.find(c => c.id === selectedContext)?.name}
                                </span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default VirtualMirrorView;
