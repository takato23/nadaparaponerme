
import React, { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import useLocalStorage from './hooks/useLocalStorage';
import { useDebounce } from './hooks/useDebounce';
import { useAppModals } from './hooks/useAppModals';
import { useToast } from './hooks/useToast';
import { useOptimistic } from './hooks/useOptimistic';
import type { ClothingItem, FitResult, ClothingItemMetadata, SavedOutfit, CommunityUser, PackingListResult, SortOption, BrandRecognitionResult, OutfitSuggestionForEvent, ChatConversation, ChatMessage, CategoryFilter, ProfessionalProfile, ProfessionalFitResult } from './types';
import * as aiService from './src/services/aiService';
import { generateProfessionalOutfit } from './services/professionalStylistService';
import { dataUrlToFile } from './src/lib/supabase';
import * as preferencesService from './src/services/preferencesService';
import { communityData } from './data/communityData';
import { sampleData } from './data/sampleData';
import { useFeatureFlag } from './src/hooks/useFeatureFlag';
import { useAuth } from './src/hooks/useAuth';
import * as closetService from './src/services/closetService';
import * as outfitService from './src/services/outfitService';
import * as paymentService from './src/services/paymentService';
import { usePullToRefresh } from './hooks/usePullToRefresh';
import PullToRefreshIndicator from './components/ui/PullToRefreshIndicator';
import { FloatingDock } from './components/ui/FloatingDock';
import { ClosetGridSkeleton } from './components/ui/Skeleton';
import Toast from './components/Toast';
import { ROUTES } from './src/routes';
import { getErrorMessage } from './utils/errorMessages';
import { SkipToMainContent } from './utils/accessibility';

// Eager load critical components (above the fold)
import ClosetGrid from './components/ClosetGrid';
import LazyLoader from './components/LazyLoader';

// Enhanced Closet System
import { ClosetProvider } from './contexts/ClosetContext';
import { ThemeProvider } from './context/ThemeContext';
import ClosetViewEnhanced from './components/closet/ClosetViewEnhanced';
import { GlobalCanvas } from './components/3d/GlobalCanvas';

// Lazy load all view components
const AddItemView = lazy(() => import('./components/AddItemView'));
const GenerateFitViewImproved = lazy(() => import('./src/components/GenerateFitViewImproved'));
const FitResultView = lazy(() => import('./components/FitResultView'));
const FitResultViewImproved = lazy(() => import('./src/components/FitResultViewImproved'));
const ItemDetailView = lazy(() => import('./components/ItemDetailView'));
const SavedOutfitsView = lazy(() => import('./components/SavedOutfitsView'));
const OutfitDetailView = lazy(() => import('./components/OutfitDetailView'));
const VirtualTryOnView = lazy(() => import('./components/VirtualTryOnView'));
const VirtualShoppingView = lazy(() => import('./components/VirtualShoppingView'));
const HomeView = lazy(() => import('./components/HomeView'));
const InstantOutfitView = lazy(() => import('./components/InstantOutfitView'));
const ProfileView = lazy(() => import('./components/ProfileView'));
const CommunityView = lazy(() => import('./components/CommunityView'));
const FriendProfileView = lazy(() => import('./components/FriendProfileView'));
const OnboardingView = lazy(() => import('./components/OnboardingView'));
const ShareOutfitView = lazy(() => import('./components/ShareOutfitView'));
const SmartPackerView = lazy(() => import('./components/SmartPackerView'));
const PackingListView = lazy(() => import('./components/PackingListView'));
const ShareItemView = lazy(() => import('./components/ShareItemView'));
const SortOptionsView = lazy(() => import('./components/SortOptionsView'));
const AuthView = lazy(() => import('./components/AuthView'));
const MigrationModal = lazy(() => import('./src/components/MigrationModal'));
const ClosetAnalyticsView = lazy(() => import('./components/ClosetAnalyticsView'));
const ColorPaletteView = lazy(() => import('./components/ColorPaletteView'));
const TopVersatileView = lazy(() => import('./components/TopVersatileView'));
const FashionChatViewImproved = lazy(() => import('./components/FashionChatViewImproved'));
const WeatherOutfitView = lazy(() => import('./components/WeatherOutfitView'));
const WeeklyPlannerView = lazy(() => import('./components/WeeklyPlannerView'));
const LookbookCreatorView = lazy(() => import('./components/LookbookCreatorView'));
const StyleChallengesView = lazy(() => import('./components/StyleChallengesView'));
const OutfitRatingView = lazy(() => import('./components/OutfitRatingView'));
const FeedbackAnalysisView = lazy(() => import('./components/FeedbackAnalysisView'));
const ClosetGapAnalysisView = lazy(() => import('./components/ClosetGapAnalysisView'));
const BrandRecognitionView = lazy(() => import('./components/BrandRecognitionView'));
const DupeFinderView = lazy(() => import('./components/DupeFinderView'));
const CapsuleWardrobeBuilderView = lazy(() => import('./components/CapsuleWardrobeBuilderView'));
const StyleDNAProfileView = lazy(() => import('./components/StyleDNAProfileView'));
const AIFashionDesignerView = lazy(() => import('./components/AIFashionDesignerView'));
const BulkUploadView = lazy(() => import('./components/BulkUploadView'));
const StyleEvolutionView = lazy(() => import('./components/StyleEvolutionView'));
const CalendarSyncView = lazy(() => import('./components/CalendarSyncView'));
const ActivityFeedView = lazy(() => import('./components/ActivityFeedView'));
const VirtualShoppingAssistantView = lazy(() => import('./components/VirtualShoppingAssistantView'));
const MultiplayerChallengesView = lazy(() => import('./components/MultiplayerChallengesView'));
const PaywallView = lazy(() => import('./components/PaywallView'));
const FeatureLockedView = lazy(() => import('./components/FeatureLockedView'));
const OutfitGenerationTestingPlayground = lazy(() => import('./src/components/OutfitGenerationTestingPlayground'));
const AestheticPlayground = lazy(() => import('./components/AestheticPlayground'));
const LandingPage = lazy(() => import('./components/LandingPage3D'));
const ProfessionalStyleWizardView = lazy(() => import('./components/ProfessionalStyleWizardView'));
const LiquidMorphDemo = lazy(() => import('./components/LiquidMorphDemo'));
const ConfirmDeleteModal = lazy(() => import('./components/ui/ConfirmDeleteModal'));

/**
 * AppContent - Main app component with routing logic
 * Separated from App to use React Router hooks
 */
const AppContent = () => {
    const location = useLocation();
    const navigate = useNavigate();
    // Authentication
    const { user, signOut: authSignOut } = useAuth();
    const isAuthenticated = !!user;
    const [hasOnboarded, setHasOnboarded] = useLocalStorage('ojodeloca-has-onboarded', false);
    const [closet, setCloset] = useLocalStorage<ClothingItem[]>('ojodeloca-closet', []);
    const [savedOutfits, setSavedOutfits] = useLocalStorage<SavedOutfit[]>('ojodeloca-saved-outfits', []);
    const [professionalProfile, setProfessionalProfile] = useLocalStorage<ProfessionalProfile | null>('ojodeloca-professional-profile', null);
    const [showProfessionalWizard, setShowProfessionalWizard] = useState(false);
    const [showMigrationModal, setShowMigrationModal] = useState(false);
    const [hasMigratedCloset, setHasMigratedCloset] = useState(() => {
        if (typeof window === 'undefined') return false;
        return localStorage.getItem('ojodeloca-migrated-closet') === 'true';
    });

    // Feature flags
    const useSupabaseCloset = useFeatureFlag('useSupabaseCloset');
    const useSupabaseOutfits = useFeatureFlag('useSupabaseOutfits');
    const useSupabasePreferences = useFeatureFlag('useSupabasePreferences');

    // UX improvements: Toast notifications and optimistic UI
    const toast = useToast();
    const optimistic = useOptimistic();

    useEffect(() => {
        // Pre-populate closet for new users after they sign up/log in and are onboarding
        if (isAuthenticated && !hasOnboarded && closet.length === 0) {
            setCloset(sampleData);
        }
    }, [isAuthenticated, hasOnboarded]);

    // Helper: Check if user has data that needs migration
    const needsMigration = (): boolean => {
        if (typeof window === 'undefined') return false;
        if (hasMigratedCloset) return false;

        // Check for legacy closet data
        const legacyCloset = localStorage.getItem('ojodeloca-closet');
        if (!legacyCloset) return false;

        try {
            const parsed = JSON.parse(legacyCloset);
            return Array.isArray(parsed) && parsed.length > 0;
        } catch {
            return false;
        }
    };

    useEffect(() => {
        // Show migration modal after onboarding is complete
        // ONLY if user has data that needs migration
        if (isAuthenticated && hasOnboarded && !useSupabaseCloset && needsMigration()) {
            setShowMigrationModal(true);
        }
    }, [isAuthenticated, hasOnboarded, useSupabaseCloset]);

    // Load closet from Supabase when flag is enabled
    useEffect(() => {
        if (useSupabaseCloset && isAuthenticated && user) {
            loadClosetFromSupabase();
        }
    }, [useSupabaseCloset, isAuthenticated, user]);

    // Migration is now handled exclusively through MigrationModal component
    // Auto-migration removed to avoid conflicts and provide better UX with progress feedback

    // Load outfits from Supabase when flag is enabled
    useEffect(() => {
        if (useSupabaseOutfits && isAuthenticated && user) {
            loadOutfitsFromSupabase();
        }
    }, [useSupabaseOutfits, isAuthenticated, user]);

    const loadClosetFromSupabase = async () => {
        try {
            const items = await closetService.getClothingItems();
            setCloset(items);
        } catch (error) {
            console.error('Failed to load closet from Supabase:', error);
        }
    };

    const loadOutfitsFromSupabase = async () => {
        try {
            const outfits = await outfitService.getSavedOutfits();
            setSavedOutfits(outfits);
        } catch (error) {
            console.error('Failed to load outfits from Supabase:', error);
        }
    };

    // Load and save sort preferences from/to Supabase
    useEffect(() => {
        if (useSupabasePreferences && isAuthenticated && user) {
            loadPreferencesFromSupabase();
        }
    }, [useSupabasePreferences, isAuthenticated, user]);

    const loadPreferencesFromSupabase = async () => {
        if (!user) return;

        try {
            const sortPrefs = await preferencesService.getSortPreferences(user.id);

            if (sortPrefs) {
                setSortOption(sortPrefs);
            }
        } catch (error) {
            console.error('Failed to load preferences from Supabase:', error);
        }
    };

    const savePreferencesToSupabase = async (newSortOption: SortOption) => {
        if (!useSupabasePreferences || !user) return;

        try {
            await preferencesService.updateSortPreferences(user.id, newSortOption);
        } catch (error) {
            console.error('Failed to save preferences to Supabase:', error);
        }
    };


    // Central modal state management - replaces 20+ individual useState declarations
    const modals = useAppModals();

    const [stylistView, setStylistView] = useState<'generate' | 'result'>('generate');
    const [fitResult, setFitResult] = useState<FitResult | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fitAlternatives, setFitAlternatives] = useState<FitResult[]>([]);
    const [recentSearches, setRecentSearches] = useLocalStorage<string[]>('ojodeloca-recent-searches', []);
    const [lastPrompt, setLastPrompt] = useState<string>('');

    const [borrowedItemIds, setBorrowedItemIds] = useState<Set<string>>(new Set());

    const [searchTerm, setSearchTerm] = useState('');
    // Debounce search term for performance optimization (300ms delay)
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const [activeCategory, setActiveCategory] = useState<CategoryFilter | null>(null);
    const [sortOption, setSortOption] = useLocalStorage<SortOption>('ojodeloca-sort-option', { property: 'date', direction: 'desc' });
    const [showSortOptions, setShowSortOptions] = useState(false);
    const [showAddItemModal, setShowAddItemModal] = useState(false);

    const handleItemClick = (item: ClothingItem) => {
        // Item detail view implementation deferred - not critical for MVP
        // Future enhancement: open modal with full item details, edit options, and outfit history
    };

    const refreshCloset = async () => {
        if (useSupabaseCloset) {
            await loadClosetFromSupabase();
        }
    };

    // Wrapper for setSortOption that also saves to Supabase
    const handleSortOptionChange = async (newSortOption: SortOption) => {
        setSortOption(newSortOption);
        await savePreferencesToSupabase(newSortOption);
    };

    const [outfitToShare, setOutfitToShare] = useState<FitResult | SavedOutfit | null>(null);
    const [itemToShare, setItemToShare] = useState<ClothingItem | null>(null);

    // Chat conversations management with persistence
    const [chatConversations, setChatConversations] = useLocalStorage<ChatConversation[]>('ojodeloca-chat-conversations', []);
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

    // Chat helper functions
    const createNewConversation = () => {
        const welcomeMessage: ChatMessage = {
            id: 'welcome',
            role: 'assistant',
            content: '¡Hola! Soy tu asistente de moda personal. ¿En qué puedo ayudarte hoy? Puedo sugerirte outfits para cualquier ocasión basándome en tu armario.',
            timestamp: Date.now()
        };

        const newConversation: ChatConversation = {
            id: `chat_${Date.now()}`,
            title: 'Nueva Conversación',
            messages: [welcomeMessage],
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        setChatConversations(prev => [newConversation, ...prev]);
        setCurrentConversationId(newConversation.id);
        modals.setShowChat(true);
    };

    const selectConversation = (conversationId: string) => {
        setCurrentConversationId(conversationId);
        modals.setShowChat(true);
    };

    const updateConversationMessages = (messages: ChatMessage[]) => {
        if (!currentConversationId) return;

        setChatConversations(prev => prev.map(conv => {
            if (conv.id === currentConversationId) {
                // Generate preview from first user message
                const firstUserMessage = messages.find(m => m.role === 'user');
                const preview = firstUserMessage?.content.slice(0, 100);

                return {
                    ...conv,
                    messages,
                    updatedAt: Date.now(),
                    preview: preview || conv.preview
                };
            }
            return conv;
        }));
    };

    const updateConversationTitle = (title: string) => {
        if (!currentConversationId) return;

        setChatConversations(prev => prev.map(conv =>
            conv.id === currentConversationId
                ? { ...conv, title, updatedAt: Date.now() }
                : conv
        ));
    };

    const deleteConversation = (conversationId: string) => {
        setChatConversations(prev => prev.filter(conv => conv.id !== conversationId));
        if (currentConversationId === conversationId) {
            setCurrentConversationId(null);
            modals.setShowChat(false);
        }
    };

    const getCurrentConversation = (): ChatConversation | null => {
        if (!currentConversationId) return null;
        return chatConversations.find(conv => conv.id === currentConversationId) || null;
    };

    const [showSmartPacker, setShowSmartPacker] = useState(false);
    const [packerStep, setPackerStep] = useState<'generate' | 'result'>('generate');
    const [packingListResult, setPackingListResult] = useState<PackingListResult | null>(null);
    const [isGeneratingPackingList, setIsGeneratingPackingList] = useState(false);
    const [packerError, setPackerError] = useState<string | null>(null);

    // Virtual Shopping Assistant states
    const [shoppingChatMessages, setShoppingChatMessages] = useState<import('./types').ShoppingChatMessage[]>([]);
    const [shoppingGaps, setShoppingGaps] = useState<import('./types').ShoppingGap[] | undefined>(undefined);
    const [shoppingRecommendations, setShoppingRecommendations] = useState<import('./types').ShoppingRecommendation[] | undefined>(undefined);
    const [isShoppingAnalyzing, setIsShoppingAnalyzing] = useState(false);
    const [isShoppingTyping, setIsShoppingTyping] = useState(false);

    // Testing Playground state (dev tool for comparing outfit generation versions)
    const [showTestingPlayground, setShowTestingPlayground] = useState(false);
    const [showAestheticPlayground, setShowAestheticPlayground] = useState(false);
    const [showLiquidMorphDemo, setShowLiquidMorphDemo] = useState(false);

    // Delete confirmation state
    const [deleteConfirm, setDeleteConfirm] = useState<{
        isOpen: boolean;
        type: 'item' | 'outfit' | null;
        id: string | null;
        name?: string;
    }>({ isOpen: false, type: null, id: null });

    const filteredCloset = useMemo(() => {
        let filtered = closet.filter(item => {
            const searchLower = debouncedSearchTerm.toLowerCase();
            const searchMatch = searchLower === '' ||
                item.metadata.subcategory.toLowerCase().includes(searchLower) ||
                item.metadata.color_primary.toLowerCase().includes(searchLower);

            const categoryMatch = !activeCategory || item.metadata.category === activeCategory;

            return searchMatch && categoryMatch;
        });

        filtered.sort((a, b) => {
            const { property, direction } = sortOption;
            let valA: string, valB: string;

            switch (property) {
                case 'name':
                    valA = a.metadata.subcategory;
                    valB = b.metadata.subcategory;
                    break;
                case 'color':
                    valA = a.metadata.color_primary;
                    valB = b.metadata.color_primary;
                    break;
                case 'date':
                default:
                    valA = a.id;
                    valB = b.id;
                    break;
            }

            const comparison = valA.localeCompare(valB, undefined, { sensitivity: 'base' });
            return direction === 'asc' ? comparison : -comparison;
        });

        return filtered;

    }, [closet, debouncedSearchTerm, activeCategory, sortOption]);

    const handleLocalItemAdd = (item: ClothingItem) => {
        setCloset(prev => [item, ...prev]);
    };

    const handleLocalBulkAdd = (items: ClothingItem[]) => {
        setCloset(prev => [...items, ...prev]);
    };

    const handleClosetSync = (items: ClothingItem[]) => {
        setCloset(items);
    };

    const handleAddItem = (item: any) => {
        // Wrapper for legacy calls
        if (item.imageDataUrl) {
            // Handle AI designer format
            const newItem: ClothingItem = {
                id: `item-${Date.now()}`,
                user_id: user?.id || 'local',
                name: item.metadata?.subcategory || 'Nueva Prenda',
                category: item.metadata?.category || 'top',
                subcategory: item.metadata?.subcategory,
                color_primary: item.metadata?.color_primary || 'unknown',
                image_url: item.imageDataUrl, // Use data URL as image URL for local
                imageDataUrl: item.imageDataUrl,
                ai_metadata: item.metadata,
                metadata: item.metadata, // Legacy support
                brand: null,
                size: null,
                purchase_date: new Date().toISOString(),
                purchase_price: null,
                tags: [],
                notes: null,
                times_worn: 0,
                last_worn_at: null,
                is_favorite: false,
                deleted_at: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            handleLocalItemAdd(newItem);
        } else {
            handleLocalItemAdd(item);
        }
    };

    const handleUpdateItem = async (id: string, metadata: ClothingItemMetadata) => {
        try {
            if (useSupabaseCloset) {
                // Use Supabase
                const updatedItem = await closetService.updateClothingItem(id, metadata);
                setCloset(prev => prev.map(item => item.id === id ? updatedItem : item));
            } else {
                // Use localStorage (legacy)
                setCloset(prev => prev.map(item => item.id === id ? { ...item, metadata } : item));
            }
            modals.setSelectedItemId(null);
        } catch (error) {
            console.error('Failed to update item:', error);
            const errorMsg = getErrorMessage(error, undefined, {
                retry: () => handleUpdateItem(id, metadata)
            });
            toast.error(errorMsg.message);
        }
    };

    const handleDeleteItemClick = (id: string) => {
        const item = closet.find(i => i.id === id);
        const itemName = item?.metadata?.subcategory || 'esta prenda';
        setDeleteConfirm({
            isOpen: true,
            type: 'item',
            id,
            name: itemName
        });
    };

    const handleDeleteItem = async (id: string) => {
        // Store original state for rollback
        const originalCloset = closet;

        await optimistic.update(
            // Optimistic update: Remove item immediately
            () => {
                setCloset(prev => prev.filter(item => item.id !== id));
                modals.setSelectedItemId(null);
                setDeleteConfirm({ isOpen: false, type: null, id: null });
            },

            // API call
            async () => {
                if (useSupabaseCloset) {
                    await closetService.deleteClothingItem(id);
                }
                // localStorage already updated optimistically
            },

            // Rollback on error
            () => {
                setCloset(originalCloset);
                modals.setSelectedItemId(id); // Restore selected item
            },

            // Callbacks
            {
                onSuccess: () => toast.success('Prenda eliminada'),
                onError: () => toast.error('Error al eliminar. Intentá de nuevo.')
            }
        );
    };

    const handleGenerateFit = async (prompt: string, mood?: string, category?: string) => {
        setIsGenerating(true);
        setError(null);
        setLastPrompt(prompt);
        setBorrowedItemIds(new Set(modals.borrowedItems.map(item => item.id)));

        // Save to recent searches (max 3)
        setRecentSearches(prev => {
            const filtered = prev.filter(s => s !== prompt);
            return [prompt, ...filtered].slice(0, 3);
        });

        const combinedInventory = [...closet, ...modals.borrowedItems];
        const uniqueInventory = Array.from(new Map(combinedInventory.map(item => [item.id, item])).values());

        try {
            let result: FitResult;

            // Si el usuario tiene perfil profesional, usar servicio profesional
            if (professionalProfile) {
                // Weather data integration planned for future release
                // Will integrate with OpenWeatherMap API for location-based outfit suggestions
                const weatherData = undefined;

                // Obtener API key de Gemini (ya está configurado en aiService)
                const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

                // Generar outfit profesional
                const professionalResult = await generateProfessionalOutfit(
                    uniqueInventory,
                    professionalProfile,
                    prompt,
                    weatherData,
                    'balanced', // Usar tono balanceado por defecto
                    apiKey
                );

                result = professionalResult as FitResult;
            } else {
                // Fallback al servicio básico
                result = await aiService.generateOutfit(prompt, uniqueInventory);
            }

            setFitResult(result);
            setStylistView('result');

            // Generate 2 alternatives in background (don't block UI)
            setTimeout(async () => {
                try {
                    const alt1Promise = aiService.generateOutfit(`${prompt}. Genera una variación diferente usando otras combinaciones de colores`, uniqueInventory);
                    const alt2Promise = aiService.generateOutfit(`${prompt}. Genera otra alternativa con un estilo ligeramente diferente`, uniqueInventory);

                    const [alt1, alt2] = await Promise.all([alt1Promise, alt2Promise]);
                    setFitAlternatives([alt1, alt2]);
                } catch (altError) {
                    console.log('Error generating alternatives:', altError);
                    // Silently fail - alternatives are optional
                }
            }, 100);
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
            setError(errorMessage);
        } finally {
            setIsGenerating(false);
            modals.setBorrowedItems([]);
            modals.setViewingFriend(null);
        }
    };

    const handleGeneratePackingList = async (prompt: string) => {
        setIsGeneratingPackingList(true);
        setPackerError(null);
        try {
            const result = await aiService.generatePackingList(prompt, closet);
            setPackingListResult(result);
            setPackerStep('result');
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
            setPackerError(errorMessage);
        } finally {
            setIsGeneratingPackingList(false);
        }
    };

    const handleStartStylistWithBorrowedItems = (items: ClothingItem[]) => {
        modals.setBorrowedItems(items);
        resetStylist();
        modals.setShowStylist(true);
    };

    const handleRegenerateWithAdjustment = (adjustment: 'more-formal' | 'change-colors' | 'more-casual') => {
        const adjustmentPrompts = {
            'more-formal': 'Hazlo más formal y elegante',
            'change-colors': 'Usa diferentes combinaciones de colores',
            'more-casual': 'Hazlo más casual y relajado'
        };

        const newPrompt = `${lastPrompt}. ${adjustmentPrompts[adjustment]}`;
        setStylistView('generate');
        handleGenerateFit(newPrompt);
    };

    const handleRateOutfit = (rating: number) => {
        // Analytics tracking deferred to future iteration
        // Will integrate with Google Analytics or Mixpanel for user feedback tracking
    };

    const handleSaveOutfit = async (outfit: Omit<FitResult, 'missing_piece_suggestion'>) => {
        // Create temporary outfit for optimistic update
        const tempOutfit: SavedOutfit = {
            ...outfit,
            id: `outfit_${Date.now()}`
        };

        // Store original state for rollback
        const originalOutfits = savedOutfits;

        await optimistic.update(
            // Optimistic update: Add outfit immediately
            () => setSavedOutfits(prev => [tempOutfit, ...prev]),

            // API call
            async () => {
                if (useSupabaseOutfits) {
                    // Use Supabase - replace temp with real outfit
                    const newOutfit = await outfitService.saveOutfit(outfit);
                    setSavedOutfits(prev => prev.map(o => o.id === tempOutfit.id ? newOutfit : o));
                }
                // localStorage doesn't need async, already saved optimistically
            },

            // Rollback on error
            () => setSavedOutfits(originalOutfits),

            // Callbacks
            {
                onSuccess: () => toast.success('¡Outfit guardado!'),
                onError: () => toast.error('Error al guardar el outfit. Intentá de nuevo.')
            }
        );
    };

    const handleDeleteOutfitClick = (id: string) => {
        const outfit = savedOutfits.find(o => o.id === id);
        const outfitName = outfit?.name || 'este outfit';
        setDeleteConfirm({
            isOpen: true,
            type: 'outfit',
            id,
            name: outfitName
        });
    };

    const handleDeleteOutfit = async (id: string) => {
        try {
            if (useSupabaseOutfits) {
                // Use Supabase (soft delete)
                await outfitService.deleteOutfit(id);
            }
            // Remove from local state in both cases
            setSavedOutfits(prev => prev.filter(outfit => outfit.id !== id));
            modals.setSelectedOutfitId(null);
            setDeleteConfirm({ isOpen: false, type: null, id: null });
            toast.success('Outfit eliminado');
        } catch (error) {
            console.error('Failed to delete outfit:', error);
            const errorMsg = getErrorMessage(error, undefined, {
                retry: () => handleDeleteOutfit(id)
            });
            toast.error(errorMsg.message);
        }
    };

    const resetStylist = () => {
        setFitResult(null);
        setError(null);
        setStylistView('generate');
    };

    const handleStylistClick = () => {
        resetStylist();
        modals.setBorrowedItems([]);
        modals.setShowStylist(true);
    };

    const resetPacker = () => {
        setPackingListResult(null);
        setPackerError(null);
        setPackerStep('generate');
    };

    const handlePackerClick = () => {
        resetPacker();
        setShowSmartPacker(true);
    };

    // Virtual Shopping Assistant handlers
    const handleAnalyzeShoppingGaps = async () => {
        setIsShoppingAnalyzing(true);
        try {
            const gaps = await aiService.analyzeShoppingGaps(closet);
            setShoppingGaps(gaps);

            // Add system message about gaps
            const systemMessage: import('./types').ShoppingChatMessage = {
                id: `msg-${Date.now()}`,
                role: 'assistant',
                content: `✨ Analicé tu armario y encontré ${gaps.length} oportunidades de compra:\n\n` +
                    `• ${gaps.filter(g => g.priority === 'essential').length} esenciales\n` +
                    `• ${gaps.filter(g => g.priority === 'recommended').length} recomendados\n` +
                    `• ${gaps.filter(g => g.priority === 'optional').length} opcionales\n\n` +
                    `Andá a la pestaña "Gaps" para ver el análisis completo, o preguntame sobre algún gap específico!`,
                timestamp: new Date().toISOString(),
                gap_analysis: gaps
            };
            setShoppingChatMessages(prev => [...prev, systemMessage]);
        } catch (error) {
            console.error('Error analyzing shopping gaps:', error);
            const errorMessage: import('./types').ShoppingChatMessage = {
                id: `msg-${Date.now()}`,
                role: 'assistant',
                content: '❌ Hubo un error al analizar los gaps. Por favor intentá de nuevo.',
                timestamp: new Date().toISOString()
            };
            setShoppingChatMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsShoppingAnalyzing(false);
        }
    };

    const handleGenerateShoppingRecommendations = async () => {
        if (!shoppingGaps) {
            toast.warning('Primero tenés que analizar los gaps del armario');
            return;
        }

        setIsShoppingAnalyzing(true);
        try {
            const recommendations = await aiService.generateShoppingRecommendations(
                shoppingGaps,
                closet
            );
            setShoppingRecommendations(recommendations);

            const totalProducts = recommendations.reduce((sum, rec) => sum + rec.products.length, 0);
            const totalBudget = recommendations.reduce((sum, rec) => sum + rec.total_budget_estimate, 0);

            // Add system message about recommendations
            const systemMessage: import('./types').ShoppingChatMessage = {
                id: `msg-${Date.now()}`,
                role: 'assistant',
                content: `🎯 Generé ${recommendations.length} recomendaciones estratégicas con ${totalProducts} productos:\n\n` +
                    `💰 Presupuesto total: $${totalBudget.toLocaleString('es-AR')}\n\n` +
                    `Andá a la pestaña "Recomendaciones" para explorar los productos sugeridos!`,
                timestamp: new Date().toISOString(),
                recommendations
            };
            setShoppingChatMessages(prev => [...prev, systemMessage]);
        } catch (error) {
            console.error('Error generating shopping recommendations:', error);
            const errorMessage: import('./types').ShoppingChatMessage = {
                id: `msg-${Date.now()}`,
                role: 'assistant',
                content: '❌ Hubo un error al generar recomendaciones. Por favor intentá de nuevo.',
                timestamp: new Date().toISOString()
            };
            setShoppingChatMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsShoppingAnalyzing(false);
        }
    };

    const handleSendShoppingMessage = async (message: string) => {
        // Add user message
        const userMessage: import('./types').ShoppingChatMessage = {
            id: `msg-${Date.now()}`,
            role: 'user',
            content: message,
            timestamp: new Date().toISOString()
        };
        setShoppingChatMessages(prev => [...prev, userMessage]);

        // Show typing indicator
        setIsShoppingTyping(true);

        try {
            const assistantMessage = await aiService.conversationalShoppingAssistant(
                message,
                shoppingChatMessages,
                closet,
                shoppingGaps,
                shoppingRecommendations
            );
            setShoppingChatMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error('Error in shopping assistant chat:', error);
            const errorMessage: import('./types').ShoppingChatMessage = {
                id: `msg-${Date.now()}`,
                role: 'assistant',
                content: '❌ Ups, no pude procesar tu mensaje. Intentá de nuevo.',
                timestamp: new Date().toISOString()
            };
            setShoppingChatMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsShoppingTyping(false);
        }
    };

    // Feature access control for premium features
    const checkFeatureAccess = async (
        featureName: string,
        featureIcon: string,
        featureDescription: string,
        requiredTier: 'Pro' | 'Premium',
        onAccessGranted: () => void
    ) => {
        try {
            console.log('🔐 Checking feature access:', featureName);
            const hasAccess = await paymentService.hasFeatureAccess(featureName);
            console.log('🔐 Has access:', hasAccess);

            if (hasAccess) {
                console.log('✅ Access granted, executing callback');
                onAccessGranted();
            } else {
                console.log('❌ Access denied, showing paywall');
                // Show feature locked modal
                modals.setLockedFeature({
                    name: featureName,
                    icon: featureIcon,
                    description: featureDescription,
                    requiredTier
                });
                modals.setShowFeatureLocked(true);
            }
        } catch (error) {
            console.error('❌ Error checking feature access:', error);
            // On error, allow access (fail open for better UX)
            console.log('⚠️ Error occurred, granting access by default');
            onAccessGranted();
        }
    };

    // Wrapper functions for premium features
    const handleStartVirtualTryOn = () => {
        console.log('🎥 Virtual Try-On button clicked', { fitResult, virtualTryOnItems });
        checkFeatureAccess(
            'virtual_tryon',
            'checkroom',
            'Probá tus outfits de forma virtual con tu foto',
            'Pro',
            () => {
                console.log('✅ Access granted, opening Virtual Try-On modal');
                modals.setShowVirtualTryOn(true);
            }
        );
    };

    const handleStartLookbookCreator = () => {
        checkFeatureAccess(
            'lookbook',
            'photo_library',
            'Creá lookbooks profesionales con tus mejores outfits',
            'Pro',
            () => modals.setShowLookbookCreator(true)
        );
    };

    const handleStartAIDesigner = () => {
        checkFeatureAccess(
            'ai_designer',
            'palette',
            'Diseñá prendas únicas con inteligencia artificial',
            'Pro',
            () => modals.setShowAIDesigner(true)
        );
    };

    const handleStartStyleDNA = () => {
        checkFeatureAccess(
            'style_dna',
            'analytics',
            'Descubrí tu perfil de estilo personalizado con análisis profundo',
            'Premium',
            () => modals.setShowStyleDNA(true)
        );
    };

    const handleGenerateOutfitsForItem = async (item: ClothingItem) => {
        console.log("Generating outfits for:", item.metadata.subcategory);

        // Build a prompt that focuses on this specific item
        const prompt = `Quiero un outfit que incluya esta prenda: ${item.metadata.subcategory} de color ${item.metadata.color_primary}. Dame combinaciones que se vean bien con esta prenda.`;

        // Reset stylist state
        resetStylist();

        // Set loading state and open stylist modal
        setIsGenerating(true);
        setError(null);
        modals.setShowStylist(true);

        try {
            const result = await aiService.generateOutfit(prompt, closet);
            setFitResult(result);
            setStylistView('result');
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
            setError(errorMessage);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleConfirmShareItem = (friendIds: string[]) => {
        if (!itemToShare) return;
        const friendNames = communityData.filter(f => friendIds.includes(f.id)).map(f => f.name).join(', ');
        toast.success(`"${itemToShare.metadata.subcategory}" compartida con ${friendNames}!`);
        setItemToShare(null);
    };

    const handleLogin = () => {
        // Authentication is handled by useAuth hook
        // This is just a callback when login succeeds
    };

    const handleLogout = async () => {
        try {
            await authSignOut();
            // Optional: clear user-specific data upon logout if needed
            // setCloset([]);
            // setSavedOutfits([]);
            // setHasOnboarded(false);
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    const selectedItem = closet.find(item => item.id === modals.selectedItemId);
    const selectedOutfit = savedOutfits.find(outfit => outfit.id === modals.selectedOutfitId);

    const virtualTryOnItems = (() => {
        if (!fitResult) return null;

        const inventory = [...closet, ...modals.borrowedItems];
        const items = {
            top: inventory.find(item => item.id === fitResult.top_id),
            bottom: inventory.find(item => item.id === fitResult.bottom_id),
            shoes: inventory.find(item => item.id === fitResult.shoes_id),
        };

        console.log('🧥 Virtual Try-On Items calculation:', {
            fitResult,
            inventorySize: inventory.length,
            topFound: !!items.top,
            bottomFound: !!items.bottom,
            shoesFound: !!items.shoes,
            topId: fitResult.top_id,
            bottomId: fitResult.bottom_id,
            shoesId: fitResult.shoes_id,
        });

        // Warn if items are missing
        if (!items.top || !items.bottom || !items.shoes) {
            console.warn('⚠️ Missing items for Virtual Try-On:', {
                missingTop: !items.top,
                missingBottom: !items.bottom,
                missingShoes: !items.shoes,
            });
        }

        return items;
    })();


    const outfitToShareItems = outfitToShare ? {
        top: closet.find(item => item.id === outfitToShare.top_id),
        bottom: closet.find(item => item.id === outfitToShare.bottom_id),
        shoes: closet.find(item => item.id === outfitToShare.shoes_id),
    } : null;

    const [showAuthView, setShowAuthView] = useState(false);

    if (!isAuthenticated) {
        if (showAuthView) {
            return (
                <>
                    <GlobalCanvas isAuth={true} />
                    <div className="relative z-10 w-full h-dvh p-3 md:p-6 lg:p-8 flex items-center justify-center">
                        <Suspense fallback={<LazyLoader type="modal" />}>
                            <AuthView onLogin={handleLogin} />
                        </Suspense>
                    </div>
                </>
            );
        }

        return (
            <>
                <GlobalCanvas isAuth={false} />
                <Suspense fallback={<LazyLoader type="view" />}>
                    <LandingPage
                        onGetStarted={() => setShowAuthView(true)}
                        onLogin={() => setShowAuthView(true)}
                    />
                </Suspense>
            </>
        );
    }


    return (
        <>
            <SkipToMainContent />
            <GlobalCanvas isAuth={!isAuthenticated && showAuthView} />
            <div className="relative z-10 w-full h-dvh p-2 md:p-3 lg:p-4 flex items-center justify-center">
                <div className="w-full h-full max-w-7xl flex flex-col md:flex-row liquid-glass rounded-4xl overflow-hidden shadow-soft-lg">


                    <main
                        id="main-content"
                        role="main"
                        aria-label="Contenido principal"
                        className={`relative flex-grow flex flex-col ${location.pathname === ROUTES.CLOSET ? 'overflow-hidden' : 'overflow-y-auto'}`}
                    >
                        <Suspense fallback={<LazyLoader type="view" />}>
                            {/* Main Content Area with Morphing Transitions */}
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={location.pathname}
                                    initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
                                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                    exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
                                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                                    className="flex-grow overflow-x-hidden"
                                >
                                    <Routes>
                                        <Route path={ROUTES.HOME} element={
                                            <HomeView
                                                user={user!}
                                                closet={closet}
                                                onStartStylist={handleStylistClick}
                                                onStartVirtualTryOn={() => navigate(ROUTES.VIRTUAL_TRY_ON)}
                                                onNavigateToCloset={() => navigate(ROUTES.CLOSET)}
                                                onNavigateToCommunity={() => navigate(ROUTES.COMMUNITY)}
                                                onStartSmartPacker={() => navigate(ROUTES.SMART_PACKER)}
                                                onStartActivityFeed={() => navigate(ROUTES.ACTIVITY)}
                                                onStartVirtualShopping={() => navigate(ROUTES.VIRTUAL_SHOPPING)}
                                                onStartBulkUpload={() => navigate(ROUTES.BULK_UPLOAD)}
                                                onStartMultiplayerChallenges={() => navigate(ROUTES.MULTIPLAYER_CHALLENGES)}
                                                onStartCapsuleBuilder={() => navigate(ROUTES.CAPSULE_BUILDER)}
                                                onStartChat={createNewConversation}
                                                onStartWeatherOutfit={() => modals.setShowWeatherOutfit(true)}
                                                onStartLookbookCreator={handleStartLookbookCreator}
                                                onStartStyleChallenges={() => modals.setShowStyleChallenges(true)}
                                                onStartRatingView={() => modals.setShowRatingView(true)}
                                                onStartFeedbackAnalysis={() => modals.setShowFeedbackAnalysis(true)}
                                                onStartGapAnalysis={() => modals.setShowGapAnalysis(true)}
                                                onStartBrandRecognition={() => navigate(ROUTES.CLOSET)}
                                                onStartDupeFinder={() => navigate(ROUTES.CLOSET)}
                                                onStartStyleDNA={handleStartStyleDNA}
                                                onStartAIDesigner={handleStartAIDesigner}
                                                onStartStyleEvolution={() => modals.setShowStyleEvolution(true)}
                                                onStartCalendarSync={() => modals.setShowCalendarSync(true)}
                                                onStartOutfitTesting={() => setShowTestingPlayground(true)}
                                                hasProfessionalProfile={!!professionalProfile}
                                                onShowProfessionalWizard={() => setShowProfessionalWizard(true)}
                                            />
                                        } />
                                        <Route path={ROUTES.CLOSET} element={
                                            <ClosetProvider items={closet}>
                                                <ClosetViewEnhanced
                                                    onItemClick={modals.setSelectedItemId}
                                                    onAddItem={() => modals.setShowAddItem(true)}
                                                />
                                            </ClosetProvider>
                                        } />
                                        <Route path={ROUTES.COMMUNITY} element={
                                            <CommunityView friends={communityData} onViewFriendCloset={modals.setViewingFriend} />
                                        } />
                                        <Route path={ROUTES.SAVED} element={
                                            <SavedOutfitsView savedOutfits={savedOutfits} closet={closet} onSelectOutfit={modals.setSelectedOutfitId} />
                                        } />
                                        <Route path={ROUTES.STYLIST} element={
                                            <ClosetProvider items={closet}>
                                                <InstantOutfitView />
                                            </ClosetProvider>
                                        } />
                                        <Route path={ROUTES.PROFILE} element={
                                            <ProfileView
                                                user={user!}
                                                closet={closet}
                                                stats={{
                                                    totalItems: closet.length,
                                                    totalOutfits: savedOutfits.length,
                                                    favoriteBrand: 'Zara',
                                                    mostWornColor: 'Negro'
                                                }}
                                                onLogout={handleLogout}
                                                onOpenAnalytics={() => modals.setShowAnalytics(true)}
                                                onOpenColorPalette={() => modals.setShowColorPalette(true)}
                                                onOpenTopVersatile={() => modals.setShowTopVersatile(true)}
                                                onOpenWeeklyPlanner={() => modals.setShowWeeklyPlanner(true)}
                                                onOpenTestingPlayground={() => setShowTestingPlayground(true)}
                                                onOpenAestheticPlayground={() => setShowAestheticPlayground(true)}
                                            />
                                        } />
                                        <Route path={ROUTES.VIRTUAL_TRY_ON} element={
                                            <VirtualTryOnView
                                                closet={closet}
                                                onClose={() => navigate(ROUTES.HOME)}
                                            />
                                        } />
                                        <Route path={ROUTES.SMART_PACKER} element={
                                            <SmartPackerView
                                                closet={closet}
                                                onClose={() => navigate(ROUTES.HOME)}
                                            />
                                        } />
                                        <Route path={ROUTES.ACTIVITY} element={<ActivityFeedView />} />
                                        <Route path={ROUTES.VIRTUAL_SHOPPING} element={<VirtualShoppingView />} />
                                        <Route path={ROUTES.BULK_UPLOAD} element={
                                            <BulkUploadView onUploadComplete={() => refreshCloset()} />
                                        } />
                                        <Route path={ROUTES.MULTIPLAYER_CHALLENGES} element={<MultiplayerChallengesView />} />
                                        <Route path={ROUTES.CAPSULE_BUILDER} element={<CapsuleWardrobeBuilderView />} />

                                        {/* Redirect unknown routes to home */}
                                        <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
                                    </Routes>
                                </motion.div>
                            </AnimatePresence>

                            {/* Floating Dock Navigation */}
                            <FloatingDock />

                        </Suspense>
                    </main>
                </div>

                {
                    !hasOnboarded && (
                        <Suspense fallback={<LazyLoader type="modal" />}>
                            <OnboardingView onComplete={() => setHasOnboarded(true)} />
                        </Suspense>
                    )
                }

                {
                    showMigrationModal && (
                        <Suspense fallback={<LazyLoader type="modal" />}>
                            <MigrationModal
                                onComplete={() => setShowMigrationModal(false)}
                                onSkip={() => setShowMigrationModal(false)}
                            />
                        </Suspense>
                    )
                }

                {
                    itemToShare && (
                        <Suspense fallback={<LazyLoader type="modal" />}>
                            <ShareItemView
                                item={itemToShare}
                                friends={communityData}
                                onClose={() => setItemToShare(null)}
                                onShare={handleConfirmShareItem}
                            />
                        </Suspense>
                    )
                }

                {
                    outfitToShare && outfitToShareItems && outfitToShareItems.top && outfitToShareItems.bottom && outfitToShareItems.shoes && (
                        <Suspense fallback={<LazyLoader type="modal" />}>
                            <ShareOutfitView
                                outfitItems={outfitToShareItems}
                                onClose={() => setOutfitToShare(null)}
                            />
                        </Suspense>
                    )
                }

                {
                    modals.showAddItem && (
                        <Suspense fallback={<LazyLoader type="modal" />}>
                            <AddItemView
                                onAddLocalItem={handleLocalItemAdd}
                                onClosetSync={handleClosetSync}
                                useSupabaseCloset={useSupabaseCloset}
                                onBack={() => modals.setShowAddItem(false)}
                            />
                        </Suspense>
                    )
                }

                {
                    modals.showBulkUpload && (
                        <Suspense fallback={<LazyLoader type="modal" />}>
                            <BulkUploadView
                                onClose={() => modals.setShowBulkUpload(false)}
                                onAddItemsLocal={handleLocalBulkAdd}
                                onClosetSync={handleClosetSync}
                                useSupabaseCloset={useSupabaseCloset}
                            />
                        </Suspense>
                    )
                }

                <AnimatePresence>
                    {
                        selectedItem && (
                            <Suspense fallback={<LazyLoader type="modal" />}>
                                <ItemDetailView
                                    item={selectedItem}
                                    inventory={closet}
                                    onUpdate={handleUpdateItem}
                                    onDelete={handleDeleteItemClick}
                                    onBack={() => modals.setSelectedItemId(null)}
                                    onGenerateOutfitWithItem={handleGenerateOutfitsForItem}
                                    onSelectItem={modals.setSelectedItemId}
                                    onShareItem={setItemToShare}
                                    onStartBrandRecognition={(item) => {
                                        modals.setSelectedItemForBrandRecognition(item);
                                        modals.setShowBrandRecognition(true);
                                    }}
                                    onStartDupeFinder={(item) => {
                                        modals.setSelectedItemForDupeFinder(item);
                                        modals.setShowDupeFinder(true);
                                        modals.setBrandRecognitionResultForDupe(undefined);
                                    }}
                                />
                            </Suspense>
                        )
                    }
                </AnimatePresence>

                {
                    selectedOutfit && (
                        <Suspense fallback={<LazyLoader type="modal" />}>
                            <OutfitDetailView
                                outfit={selectedOutfit}
                                inventory={closet}
                                onBack={() => modals.setSelectedOutfitId(null)}
                                onDelete={handleDeleteOutfitClick}
                                onShareOutfit={setOutfitToShare}
                            />
                        </Suspense>
                    )
                }

                {
                    modals.showStylist && stylistView === 'generate' && (
                        <Suspense fallback={<LazyLoader type="modal" />}>
                            <GenerateFitViewImproved
                                onGenerate={handleGenerateFit}
                                onBack={() => {
                                    modals.setShowStylist(false);
                                    modals.setBorrowedItems([]);
                                }}
                                isGenerating={isGenerating}
                                error={error}
                                closet={closet}
                                recentSearches={recentSearches}
                            />
                        </Suspense>
                    )
                }

                {
                    modals.showStylist && stylistView === 'result' && fitResult && (
                        <Suspense fallback={<LazyLoader type="modal" />}>
                            <FitResultViewImproved
                                result={fitResult}
                                inventory={[...closet, ...modals.borrowedItems]}
                                savedOutfits={savedOutfits}
                                onSaveOutfit={handleSaveOutfit}
                                onVirtualTryOn={handleStartVirtualTryOn}
                                onShareOutfit={setOutfitToShare}
                                onRegenerateWithAdjustment={handleRegenerateWithAdjustment}
                                onRateOutfit={handleRateOutfit}
                                borrowedItemIds={borrowedItemIds}
                                alternatives={fitAlternatives}
                                onBack={() => {
                                    resetStylist();
                                    modals.setShowStylist(false);
                                }}
                            />
                        </Suspense>
                    )
                }

                {/* Friend Profile View (formerly FriendClosetView) */}
                {
                    modals.viewingFriend && (
                        <Suspense fallback={<LazyLoader />}>
                            <FriendProfileView
                                friend={modals.viewingFriend}
                                onClose={() => modals.setViewingFriend(null)}
                                onGenerateWithItems={handleStartStylistWithBorrowedItems}
                            />
                        </Suspense>
                    )
                }

                {
                    (() => {
                        console.log('🎬 VirtualTryOnView render check:', {
                            showVirtualTryOn: modals.showVirtualTryOn,
                            virtualTryOnItems,
                            hasTop: virtualTryOnItems?.top,
                            hasBottom: virtualTryOnItems?.bottom,
                            hasShoes: virtualTryOnItems?.shoes
                        });
                        return null;
                    })()
                }
                {
                    modals.showVirtualTryOn && virtualTryOnItems && (
                        <>
                            {!virtualTryOnItems.top || !virtualTryOnItems.bottom || !virtualTryOnItems.shoes ? (
                                // Show error modal if items are missing
                                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fade-in">
                                    <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 max-w-md w-full">
                                        <div className="text-center">
                                            <span className="material-symbols-outlined text-red-500 text-6xl mb-4">error</span>
                                            <h2 className="text-2xl font-bold text-text-primary dark:text-gray-200 mb-2">
                                                Items no encontrados
                                            </h2>
                                            <p className="text-text-secondary dark:text-gray-400 mb-6">
                                                No se pudieron encontrar todas las prendas del outfit en tu closet.
                                                {!virtualTryOnItems.top && <><br />• Top faltante</>}
                                                {!virtualTryOnItems.bottom && <><br />• Bottom faltante</>}
                                                {!virtualTryOnItems.shoes && <><br />• Zapatos faltantes</>}
                                            </p>
                                            <button
                                                onClick={() => modals.setShowVirtualTryOn(false)}
                                                className="w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-all active:scale-95"
                                            >
                                                Entendido
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <VirtualTryOnView
                                    onBack={() => modals.setShowVirtualTryOn(false)}
                                    outfitItems={{
                                        top: virtualTryOnItems.top,
                                        bottom: virtualTryOnItems.bottom,
                                        shoes: virtualTryOnItems.shoes,
                                    }}
                                />
                            )}
                        </>
                    )
                }

                {
                    showSmartPacker && packerStep === 'generate' && (
                        <SmartPackerView
                            onBack={() => setShowSmartPacker(false)}
                            onGenerate={handleGeneratePackingList}
                            isGenerating={isGeneratingPackingList}
                            error={packerError}
                        />
                    )
                }

                {
                    showSmartPacker && packerStep === 'result' && packingListResult && (
                        <PackingListView
                            result={packingListResult}
                            inventory={closet}
                            onBack={() => {
                                resetPacker();
                                setShowSmartPacker(false);
                            }}
                        />
                    )
                }

                {
                    showSortOptions && (
                        <SortOptionsView
                            currentSort={sortOption}
                            onSortChange={handleSortOptionChange}
                            onClose={() => setShowSortOptions(false)}
                        />
                    )
                }

                {
                    modals.showAnalytics && (
                        <ClosetAnalyticsView
                            closet={closet}
                            onClose={() => modals.setShowAnalytics(false)}
                        />
                    )
                }

                {
                    modals.showColorPalette && (
                        <ColorPaletteView
                            closet={closet}
                            onClose={() => modals.setShowColorPalette(false)}
                        />
                    )
                }

                {
                    modals.showTopVersatile && (
                        <TopVersatileView
                            closet={closet}
                            onClose={() => modals.setShowTopVersatile(false)}
                            onItemClick={modals.setSelectedItemId}
                        />
                    )
                }

                {
                    modals.showChat && getCurrentConversation() && (
                        <FashionChatViewImproved
                            closet={closet}
                            onClose={() => modals.setShowChat(false)}
                            conversations={chatConversations}
                            currentConversationId={currentConversationId}
                            onSelectConversation={selectConversation}
                            onNewConversation={createNewConversation}
                            onDeleteConversation={deleteConversation}
                            onMessagesUpdate={updateConversationMessages}
                            onUpdateTitle={updateConversationTitle}
                            onViewOutfit={(topId, bottomId, shoesId) => {
                                console.log('App.tsx - Ver Outfit Completo handler called:', { topId, bottomId, shoesId });

                                // Create outfit result to view
                                const chatOutfit: FitResult = {
                                    top_id: topId,
                                    bottom_id: bottomId,
                                    shoes_id: shoesId,
                                    explanation: 'Outfit sugerido por el asistente de moda'
                                };

                                setFitResult(chatOutfit);
                                setStylistView('result');
                                modals.setShowStylist(true);
                                // Keep chat open in background (don't close)
                            }}
                        />
                    )
                }

                {
                    modals.showWeatherOutfit && (
                        <WeatherOutfitView
                            closet={closet}
                            onClose={() => modals.setShowWeatherOutfit(false)}
                            onViewOutfit={(topId, bottomId, shoesId) => {
                                // Create a temporary outfit result to view
                                const weatherOutfit: FitResult = {
                                    top_id: topId,
                                    bottom_id: bottomId,
                                    shoes_id: shoesId,
                                    explanation: 'Outfit sugerido para el clima actual'
                                };
                                setFitResult(weatherOutfit);
                                setStylistView('result');
                                modals.setShowStylist(true);
                                modals.setShowWeatherOutfit(false);
                            }}
                        />
                    )
                }

                {
                    modals.showWeeklyPlanner && (
                        <WeeklyPlannerView
                            savedOutfits={savedOutfits}
                            closet={closet}
                            onClose={() => modals.setShowWeeklyPlanner(false)}
                            onViewOutfit={(outfit) => {
                                modals.setSelectedOutfitId(outfit.id);
                                modals.setShowWeeklyPlanner(false);
                            }}
                        />
                    )
                }

                {
                    modals.showLookbookCreator && (
                        <LookbookCreatorView
                            closet={closet}
                            onClose={() => modals.setShowLookbookCreator(false)}
                        />
                    )
                }

                {
                    modals.showStyleChallenges && (
                        <StyleChallengesView
                            closet={closet}
                            savedOutfits={savedOutfits}
                            onClose={() => modals.setShowStyleChallenges(false)}
                            onViewOutfit={(outfit) => {
                                modals.setSelectedOutfitId(outfit.id);
                                modals.setShowStyleChallenges(false);
                            }}
                        />
                    )
                }

                {
                    modals.showRatingView && (
                        <OutfitRatingView
                            closet={closet}
                            savedOutfits={savedOutfits}
                            onClose={() => modals.setShowRatingView(false)}
                            onViewOutfit={(outfit) => {
                                modals.setSelectedOutfitId(outfit.id);
                                modals.setShowRatingView(false);
                            }}
                        />
                    )
                }

                {
                    modals.showFeedbackAnalysis && (
                        <FeedbackAnalysisView
                            closet={closet}
                            savedOutfits={savedOutfits}
                            onClose={() => modals.setShowFeedbackAnalysis(false)}
                        />
                    )
                }

                {
                    modals.showGapAnalysis && (
                        <ClosetGapAnalysisView
                            closet={closet}
                            onClose={() => modals.setShowGapAnalysis(false)}
                        />
                    )
                }

                {
                    modals.showBrandRecognition && modals.selectedItemForBrandRecognition && (
                        <BrandRecognitionView
                            item={modals.selectedItemForBrandRecognition}
                            onClose={() => {
                                modals.setShowBrandRecognition(false);
                                modals.setSelectedItemForBrandRecognition(null);
                            }}
                        />
                    )
                }

                {
                    modals.showDupeFinder && modals.selectedItemForDupeFinder && (
                        <DupeFinderView
                            item={modals.selectedItemForDupeFinder}
                            brandInfo={modals.brandRecognitionResultForDupe}
                            onClose={() => {
                                modals.setShowDupeFinder(false);
                                modals.setSelectedItemForDupeFinder(null);
                                modals.setBrandRecognitionResultForDupe(undefined);
                            }}
                        />
                    )
                }

                {
                    modals.showCapsuleBuilder && (
                        <CapsuleWardrobeBuilderView
                            closet={closet}
                            onClose={() => modals.setShowCapsuleBuilder(false)}
                            onSaveCapsule={(capsule) => {
                                // Capsule persistence will be added in next iteration
                                // Planned: Save to Supabase capsule_wardrobes table with items reference
                                modals.setShowCapsuleBuilder(false);
                            }}
                            onCreateOutfitFromCapsule={(topId, bottomId, shoesId) => {
                                const top = closet.find(i => i.id === topId);
                                const bottom = closet.find(i => i.id === bottomId);
                                const shoes = closet.find(i => i.id === shoesId);

                                if (top && bottom && shoes) {
                                    const outfit: SavedOutfit = {
                                        id: `outfit-${Date.now()}`,
                                        top_id: topId,
                                        bottom_id: bottomId,
                                        shoes_id: shoesId,
                                        explanation: 'Outfit creado desde Capsule Wardrobe'
                                    };
                                    setSavedOutfits([...savedOutfits, outfit]);
                                }

                                modals.setShowCapsuleBuilder(false);
                                navigate(ROUTES.SAVED);
                            }}
                        />
                    )
                }

                {
                    modals.showStyleDNA && (
                        <StyleDNAProfileView
                            closet={closet}
                            onClose={() => modals.setShowStyleDNA(false)}
                        />
                    )
                }

                {
                    modals.showAIDesigner && (
                        <AIFashionDesignerView
                            onClose={() => modals.setShowAIDesigner(false)}
                            onAddToCloset={(imageDataUrl, metadata) => {
                                handleAddItem({ imageDataUrl, metadata });
                            }}
                        />
                    )
                }

                {
                    modals.showStyleEvolution && (
                        <StyleEvolutionView
                            closet={closet}
                            onClose={() => modals.setShowStyleEvolution(false)}
                        />
                    )
                }

                {
                    modals.showCalendarSync && (
                        <CalendarSyncView
                            closet={closet}
                            onClose={() => modals.setShowCalendarSync(false)}
                            onViewOutfit={(suggestion) => {
                                modals.setCurrentEventSuggestion(suggestion);
                                setFitResult(suggestion.suggested_outfit);
                                modals.setShowCalendarSync(false);
                            }}
                        />
                    )
                }

                {
                    modals.showActivityFeed && (
                        <ActivityFeedView
                            closet={closet}
                            savedOutfits={savedOutfits}
                            onClose={() => modals.setShowActivityFeed(false)}
                            onViewOutfit={(outfit) => {
                                modals.setSelectedOutfitId(outfit.id);
                                modals.setShowActivityFeed(false);
                            }}
                            onViewItem={(item) => {
                                modals.setSelectedItemId(item.id);
                                modals.setShowActivityFeed(false);
                            }}
                        />
                    )
                }

                {
                    modals.showVirtualShopping && (
                        <VirtualShoppingAssistantView
                            closet={closet}
                            onClose={() => modals.setShowVirtualShopping(false)}
                            onAnalyzeGaps={handleAnalyzeShoppingGaps}
                            onGenerateRecommendations={handleGenerateShoppingRecommendations}
                            onSendMessage={handleSendShoppingMessage}
                            chatMessages={shoppingChatMessages}
                            currentGaps={shoppingGaps}
                            currentRecommendations={shoppingRecommendations}
                            isTyping={isShoppingTyping}
                            isAnalyzing={isShoppingAnalyzing}
                        />
                    )
                }

                {
                    modals.showMultiplayerChallenges && (
                        <Suspense fallback={<LazyLoader type="analytics" />}>
                            <MultiplayerChallengesView
                                closet={closet}
                                onClose={() => modals.setShowMultiplayerChallenges(false)}
                            />
                        </Suspense>
                    )
                }

                {
                    modals.currentEventSuggestion && fitResult && (
                        <FitResultView
                            fit={fitResult}
                            closet={closet}
                            onClose={() => {
                                modals.setCurrentEventSuggestion(null);
                                setFitResult(null);
                                modals.setShowCalendarSync(true);
                            }}
                            onSave={() => {
                                if (fitResult) handleSaveOutfit(fitResult);
                                modals.setCurrentEventSuggestion(null);
                                setFitResult(null);
                                modals.setShowCalendarSync(true);
                            }}
                            onStartVirtualTryOn={() => {
                                if (fitResult) {
                                    handleStartVirtualTryOn();
                                    modals.setCurrentEventSuggestion(null);
                                    setFitResult(null);
                                    modals.setShowCalendarSync(false);
                                }
                            }}
                        />
                    )
                }

                {
                    modals.showPaywall && (
                        <Suspense fallback={<LazyLoader type="modal" />}>
                            <PaywallView
                                onClose={() => modals.setShowPaywall(false)}
                            />
                        </Suspense>
                    )
                }

                {
                    showAestheticPlayground && (
                        <Suspense fallback={<LazyLoader type="view" />}>
                            <AestheticPlayground onClose={() => setShowAestheticPlayground(false)} />
                        </Suspense>
                    )
                }

                {
                    showLiquidMorphDemo && (
                        <Suspense fallback={<LazyLoader type="view" />}>
                            <LiquidMorphDemo />
                        </Suspense>
                    )
                }


                {
                    modals.showFeatureLocked && modals.lockedFeature && (
                        <Suspense fallback={<LazyLoader type="modal" />}>
                            <FeatureLockedView
                                featureName={modals.lockedFeature.name}
                                featureIcon={modals.lockedFeature.icon}
                                description={modals.lockedFeature.description}
                                requiredTier={modals.lockedFeature.requiredTier}
                                onUpgrade={() => {
                                    modals.setShowFeatureLocked(false);
                                    modals.setShowPaywall(true);
                                }}
                                onClose={() => {
                                    modals.setShowFeatureLocked(false);
                                    modals.setLockedFeature(null);
                                }}
                            />
                        </Suspense>
                    )
                }

                {/* Professional Style Wizard */}
                {
                    showProfessionalWizard && (
                        <Suspense fallback={<LazyLoader type="modal" />}>
                            <ProfessionalStyleWizardView
                                onComplete={(profile) => {
                                    setProfessionalProfile(profile);
                                    setShowProfessionalWizard(false);
                                    toast.showToast('¡Perfil profesional guardado! Ahora tus outfits serán personalizados.', 'success');
                                }}
                                onClose={() => setShowProfessionalWizard(false)}
                                existingProfile={professionalProfile || undefined}
                            />
                        </Suspense>
                    )
                }

                {/* Testing Playground (Dev Tool) */}
                {
                    showTestingPlayground && (
                        <Suspense fallback={<LazyLoader type="modal" />}>
                            <OutfitGenerationTestingPlayground
                                closet={closet}
                                onClose={() => setShowTestingPlayground(false)}
                            />
                        </Suspense>
                    )
                }

                {/* Toast Notifications */}
                <div role="region" aria-label="Notificaciones" aria-live="polite">
                    {
                        toast.toasts.map((t) => (
                            <Toast
                                key={t.id}
                                message={t.message}
                                type={t.type}
                                duration={t.duration}
                                onClose={() => toast.hideToast(t.id)}
                            />
                        ))
                    }
                </div>

                {/* Delete Confirmation Modal */}
                <Suspense fallback={null}>
                    <ConfirmDeleteModal
                        isOpen={deleteConfirm.isOpen}
                        onClose={() => setDeleteConfirm({ isOpen: false, type: null, id: null })}
                        onConfirm={() => {
                            if (deleteConfirm.id) {
                                if (deleteConfirm.type === 'item') {
                                    handleDeleteItem(deleteConfirm.id);
                                } else if (deleteConfirm.type === 'outfit') {
                                    handleDeleteOutfit(deleteConfirm.id);
                                }
                            }
                        }}
                        itemName={deleteConfirm.name}
                        itemType={deleteConfirm.type === 'item' ? 'prenda' : 'outfit'}
                        isLoading={optimistic.isLoading}
                    />
                </Suspense>
            </div>
        </>
    );
};

/**
 * App - Root component with Router Provider
 * Wraps AppContent with BrowserRouter for routing functionality
 */
const App = () => (
    <BrowserRouter>
        <AppContent />
    </BrowserRouter>
);

const AppWithProviders = () => (
    <ThemeProvider>
        <App />
    </ThemeProvider>
);

export default AppWithProviders;
