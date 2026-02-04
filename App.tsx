

import React, { useState, useMemo, useEffect, lazy, Suspense, startTransition, useCallback, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import useLocalStorage from './hooks/useLocalStorage';
import { useDebounce } from './hooks/useDebounce';
import { useAppModals } from './hooks/useAppModals';
import { useToast } from './hooks/useToast';
import { useOptimistic } from './hooks/useOptimistic';
import { useSubscription } from './hooks/useSubscription';
import { useNavigateTransition } from './hooks/useNavigateTransition';
import { useChatConversations } from './hooks/useChatConversations';
import type { ClothingItem, FitResult, ClothingItemMetadata, SavedOutfit, CommunityUser, PackingListResult, SortOption, BrandRecognitionResult, OutfitSuggestionForEvent, ChatConversation, ChatMessage, CategoryFilter, ProfessionalProfile, ProfessionalFitResult } from './types';
import * as aiService from './src/services/aiService';
import { generateProfessionalOutfit } from './src/services/StylistService';
import { dataUrlToFile } from './src/lib/supabase';
import * as preferencesService from './src/services/preferencesService';
import { communityData } from './data/communityData';
import { sampleData } from './data/sampleData';
import { useFeatureFlag } from './hooks/useFeatureFlag';
import { useAuth } from './hooks/useAuth';
import * as closetService from './src/services/closetService';
import * as outfitService from './src/services/outfitService';
import * as paymentService from './src/services/paymentService';
import * as analytics from './src/services/analyticsService';
import { deleteAccount } from './src/services/accountService';
import { usePullToRefresh } from './hooks/usePullToRefresh';
import PullToRefreshIndicator from './components/ui/PullToRefreshIndicator';
import { FloatingDock } from './components/ui/FloatingDock';
import { useFeatureAccess } from './hooks/useFeatureAccess';
import { useShoppingAssistant } from './hooks/useShoppingAssistant';
import { useOutfitGeneration } from './hooks/useOutfitGeneration';
import { ClosetGridSkeleton } from './components/ui/Skeleton';
import Toast from './components/Toast';
import { NetworkIndicator } from './components/ui/NetworkIndicator';
import { CommandPalette } from './components/ui/CommandPalette';
import { StudioGenerationIndicator } from './components/ui/StudioGenerationIndicator';
import { KeyboardShortcutsHelp } from './components/ui/KeyboardShortcutsHelp';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { ROUTES } from './src/routes';
import { getErrorMessage } from './utils/errorMessages';
import { SkipToMainContent } from './utils/accessibility';
import { PricingModal } from './components/PricingModal';
import { QuotaIndicator, LimitReachedModal } from './components/QuotaIndicator';
import { CreditsDetailView } from './components/CreditsDetailView';
import AuthEyeScreen from './components/AuthEyeScreen';
import CookieConsentBanner from './components/legal/CookieConsentBanner';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { useConsentPreferences } from './hooks/useConsentPreferences';

// Eager load critical components (above the fold)
import ClosetGrid from './components/ClosetGrid';
import LazyLoader from './components/LazyLoader';

// Enhanced Closet System
import { ClosetProvider } from './contexts/ClosetContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AIGenerationProvider } from './contexts/AIGenerationContext';
import ClosetViewEnhanced from './components/closet/ClosetViewEnhanced';
import { GlobalCanvas } from './components/3d/GlobalCanvas';
const DISABLE_3D_BACKGROUND = true;
import { DISALLOW_CLIENT_GEMINI_KEY_IN_PROD, PAYMENTS_ENABLED, V1_SAFE_MODE } from './src/config/runtime';

// Lazy load all view components
const AddItemView = lazy(() => import('./components/AddItemView'));
const GenerateFitViewImproved = lazy(() => import('./components/GenerateFitViewImproved'));
const FitResultView = lazy(() => import('./components/FitResultView'));
const FitResultViewImproved = lazy(() => import('./components/FitResultViewImproved'));
const ItemDetailView = lazy(() => import('./components/ItemDetailView'));
const SavedOutfitsView = lazy(() => import('./components/SavedOutfitsView'));
const OutfitDetailView = lazy(() => import('./components/OutfitDetailView'));
// VirtualTryOnView removed - consolidated into PhotoshootStudio
const VirtualShoppingView = lazy(() => import('./components/VirtualShoppingView'));
const HomeView = lazy(() => import('./components/HomeViewImproved'));
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
const TermsView = lazy(() => import('./components/legal/TermsView'));
const PrivacyView = lazy(() => import('./components/legal/PrivacyView'));
const MigrationModal = lazy(() => import('./components/MigrationModal'));
const ClosetAnalyticsView = lazy(() => import('./components/ClosetAnalyticsView'));
const ColorPaletteView = lazy(() => import('./components/ColorPaletteView'));
const TopVersatileView = lazy(() => import('./components/TopVersatileView'));
const AIStylistView = lazy(() => import('./components/AIStylistView'));
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
const GenerationHistoryView = lazy(() => import('./components/GenerationHistoryView'));
const BulkUploadView = lazy(() => import('./components/BulkUploadView'));
const StyleEvolutionView = lazy(() => import('./components/StyleEvolutionView'));
const CalendarSyncView = lazy(() => import('./components/CalendarSyncView'));
const ActivityFeedView = lazy(() => import('./components/ActivityFeedView'));
const VirtualShoppingAssistantView = lazy(() => import('./components/VirtualShoppingAssistantView'));
const MultiplayerChallengesView = lazy(() => import('./components/MultiplayerChallengesView'));
const PaywallView = lazy(() => import('./components/PaywallView'));
const FeatureLockedView = lazy(() => import('./components/FeatureLockedView'));
const OutfitGenerationTestingPlayground = lazy(() => import('./components/OutfitGenerationTestingPlayground'));
const AestheticPlayground = lazy(() => import('./components/AestheticPlayground'));
const LandingPage = lazy(() => import('./components/LandingPage'));
const ProfessionalStyleWizardView = lazy(() => import('./components/ProfessionalStyleWizardView'));
const ConfirmDeleteModal = lazy(() => import('./components/ui/ConfirmDeleteModal'));
const PremiumCameraView = lazy(() => import('@/components/PremiumCameraView'));
const PhotoshootStudio = lazy(() => import('@/components/studio/PhotoshootStudio'));
const SavedLooksView = lazy(() => import('@/components/SavedLooksView'));
const SharedLookView = lazy(() => import('./components/SharedLookView'));
const VirtualMirrorView = lazy(() => import('./components/studio/VirtualMirrorView'));
const DigitalTwinSetup = lazy(() => import('./components/digital-twin/DigitalTwinSetup'));
const BorrowedItemsView = lazy(() => import('./components/BorrowedItemsView'));
const ShopLookView = lazy(() => import('./components/ShopLookView'));
const PricingPage = lazy(() => import('./components/PricingPage'));
const OnboardingStylistFlow = lazy(() => import('./components/OnboardingStylistFlow').then(module => ({ default: module.OnboardingStylistFlow })));

/**
 * AppContent - Main app component with routing logic
 * Separated from App to use React Router hooks
 */
const AppContent = () => {
    const location = useLocation();
    const navigate = useNavigateTransition();
    const consentPreferences = useConsentPreferences();
    const analyticsInitializedRef = useRef(false);
    // Authentication
    const { user, signOut: authSignOut } = useAuth();
    const isAuthenticated = !!user;
    const [hasOnboarded, setHasOnboarded] = useLocalStorage('ojodeloca-has-onboarded', false);
    const [closet, setCloset] = useLocalStorage<ClothingItem[]>('ojodeloca-closet', []);
    const [savedOutfits, setSavedOutfits] = useLocalStorage<SavedOutfit[]>('ojodeloca-saved-outfits', []);
    const [professionalProfile, setProfessionalProfile] = useLocalStorage<ProfessionalProfile | null>('ojodeloca-professional-profile', null);
    // const [showProfessionalWizard, setShowProfessionalWizard] = useState(false); // Moved to useAppModals
    // const [showMigrationModal, setShowMigrationModal] = useState(false); // Moved to useAppModals
    const [hasMigratedCloset, setHasMigratedCloset] = useState(() => {
        if (typeof window === 'undefined') return false;
        return localStorage.getItem('ojodeloca-migrated-closet') === 'true';
    });

    // Subscription state
    const subscription = useSubscription();
    const [showPricingModal, setShowPricingModal] = useState(false);
    const [showLimitReachedModal, setShowLimitReachedModal] = useState(false);
    const [showCreditsDetail, setShowCreditsDetail] = useState(false);

    // Feature flags
    const useSupabaseCloset = useFeatureFlag('useSupabaseCloset');
    const useSupabaseOutfits = useFeatureFlag('useSupabaseOutfits');
    const useSupabasePreferences = useFeatureFlag('useSupabasePreferences');
    const useSupabaseAuth = useFeatureFlag('useSupabaseAuth');

    // UX improvements: Toast notifications and optimistic UI
    const toast = useToast();
    const showToast = useCallback((message: string, type: 'success' | 'error') => {
        toast.showToast(message, type);
    }, [toast]);
    const optimistic = useOptimistic();

    // Hard safety: prevent client-side Gemini key in production builds
    // Initialize Google Analytics (only after consent)
    useEffect(() => {
        if (!consentPreferences?.analytics) return;
        if (analyticsInitializedRef.current) return;
        analytics.initAnalytics();
        analyticsInitializedRef.current = true;
    }, [consentPreferences?.analytics]);

    useEffect(() => {
        if (!consentPreferences?.analytics) return;
        analytics.trackPageView(location.pathname);
    }, [location.pathname, consentPreferences?.analytics]);

    useEffect(() => {
        if (showPricingModal) {
            analytics.trackUpgradeModalView('pricing_modal');
        }
    }, [showPricingModal]);

    useEffect(() => {
        if (!showLimitReachedModal) return;
        const tier = subscription.tier === 'premium' ? 'pro' : subscription.tier;
        analytics.trackLimitReached(tier);
    }, [showLimitReachedModal, subscription.tier]);

    useEffect(() => {
        if (!import.meta.env.PROD) return;
        if (!DISALLOW_CLIENT_GEMINI_KEY_IN_PROD) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const leakedKey = (import.meta.env as any).VITE_GEMINI_API_KEY as string | undefined;
        if (leakedKey && leakedKey.trim().length > 0) {
            throw new Error(
                'Security: VITE_GEMINI_API_KEY must NOT be set in production. ' +
                'Use Supabase Edge Functions secrets (GEMINI_API_KEY) instead.'
            );
        }
    }, []);

    useEffect(() => {
        // Pre-populate closet for new users after they sign up/log in and are onboarding
        if (isAuthenticated && !hasOnboarded) {
            if (closet.length === 0) {
                setCloset(sampleData);
            } else if (closet.length > 0) {
                // If user already has items, skip onboarding
                setHasOnboarded(true);
            }
        }
    }, [isAuthenticated, hasOnboarded, closet.length]);

    // Handle MercadoPago payment callback
    useEffect(() => {
        const handlePaymentCallback = async () => {
            const params = new URLSearchParams(window.location.search);
            const paymentStatus = params.get('payment');
            const tier = params.get('tier') as 'pro' | 'premium' | null;
            const collectionId = params.get('collection_id'); // MercadoPago payment_id

            // Clean URL params after reading
            if (paymentStatus) {
                window.history.replaceState({}, '', window.location.pathname);
            }

            if (paymentStatus === 'success' && collectionId && tier && isAuthenticated) {
                try {
                    toast.info('Procesando tu pago...');
                    await paymentService.handlePaymentSuccess(collectionId, tier);
                    await subscription.refresh();
                    analytics.trackPurchase(tier, 'ARS', tier === 'premium' ? 4999 : 2999);
                    toast.success(`¡Bienvenido a ${tier === 'premium' ? 'Premium' : 'Pro'}! Tu suscripción está activa.`);
                } catch (error) {
                    console.error('Error processing payment callback:', error);
                    toast.error('Hubo un problema verificando tu pago. Si el cobro se realizó, tu suscripción se activará automáticamente en unos minutos.');
                }
            } else if (paymentStatus === 'failure') {
                toast.error('El pago no se completó. Podés intentar de nuevo cuando quieras.');
            } else if (paymentStatus === 'pending') {
                toast.info('Tu pago está pendiente. Te notificaremos cuando se confirme.');
            }
        };

        handlePaymentCallback();
    }, [isAuthenticated]);

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
        if (isAuthenticated && hasOnboarded && useSupabaseCloset && needsMigration()) {
            modals.setShowMigrationModal(true);
        }
    }, [isAuthenticated, hasOnboarded, useSupabaseCloset]);

    // Load closet and outfits from Supabase in parallel when flags are enabled
    useEffect(() => {
        if (!isAuthenticated || !user) return;

        const loadDataInParallel = async () => {
            const promises: Promise<void>[] = [];

            if (useSupabaseCloset) {
                promises.push(loadClosetFromSupabase());
            }
            if (useSupabaseOutfits) {
                promises.push(loadOutfitsFromSupabase());
            }

            // Start all fetches in parallel
            await Promise.all(promises);
        };

        loadDataInParallel();
    }, [useSupabaseCloset, useSupabaseOutfits, isAuthenticated, user]);

    const loadClosetFromSupabase = async () => {
        try {
            const items = await closetService.getClothingItems();
            setCloset(items);
        } catch (error) {
            console.error('Error loading closet:', error);
            showToast('Error al cargar tu armario', 'error');
        }
    };

    const handleLoadSampleData = useCallback(() => {
        setCloset(sampleData);
        showToast('Datos de ejemplo cargados correctamente', 'success');
        analytics.trackEvent('load_sample_data', { items_count: sampleData.length });
    }, [showToast, setCloset]);


    const loadOutfitsFromSupabase = async () => {
        try {
            const outfits = await outfitService.getSavedOutfits();
            setSavedOutfits(outfits);
        } catch (error) {
            console.error('Failed to load outfits from Supabase:', error);
            toast.error('No se pudieron cargar tus outfits guardados.');
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
    const {
        isGenerating,
        fitResult,
        error: generationError,
        generateOutfit,
        resetGeneration,
        setFitResult,
        setError: setGenerationError
    } = useOutfitGeneration(closet);

    // We still need a general error state for other things, or we can use the one from the hook if appropriate.
    // But App.tsx has its own 'error' state for other features.
    // Let's keep the global error state but use generationError for the stylist view.
    const [appError, setAppError] = useState<string | null>(null);
    const [fitAlternatives, setFitAlternatives] = useState<FitResult[]>([]);
    const [recentSearches, setRecentSearches] = useLocalStorage<string[]>('ojodeloca-recent-searches', []);
    const [lastPrompt, setLastPrompt] = useState<string>('');

    const [borrowedItemIds, setBorrowedItemIds] = useState<Set<string>>(new Set());

    const [searchTerm, setSearchTerm] = useState('');
    // Debounce search term for performance optimization (300ms delay)
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const [activeCategory, setActiveCategory] = useState<CategoryFilter | null>(null);
    const [sortOption, setSortOption] = useLocalStorage<SortOption>('ojodeloca-sort-option', { property: 'date', direction: 'desc' });
    // const [showSortOptions, setShowSortOptions] = useState(false); // Moved to useAppModals
    // const [showAddItemModal, setShowAddItemModal] = useState(false); // Moved to useAppModals
    // const [showQuickCamera, setShowQuickCamera] = useState(false); // Moved to useAppModals

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

    // Chat conversations management - using extracted hook
    const chatHook = useChatConversations();
    const {
        conversations: chatConversations,
        currentConversationId,
        createConversation,
        selectConversation: selectConversationBase,
        updateMessages: updateConversationMessages,
        updateTitle: updateConversationTitle,
        deleteConversation: deleteConversationBase,
        currentConversation,
        setCurrentConversationId
    } = chatHook;

    // Wrap hook functions to integrate with modals
    const createNewConversation = () => {
        createConversation();
        startTransition(() => {
            modals.setShowChat(true);
        });
    };

    const selectConversation = (conversationId: string) => {
        selectConversationBase(conversationId);
        startTransition(() => {
            modals.setShowChat(true);
        });
    };

    const deleteConversation = (conversationId: string) => {
        const wasCurrent = deleteConversationBase(conversationId);
        if (wasCurrent) {
            modals.setShowChat(false);
        }
    };

    const getCurrentConversation = (): ChatConversation | null => {
        return currentConversation;
    };

    // const [showSmartPacker, setShowSmartPacker] = useState(false); // Moved to useAppModals
    const [packerStep, setPackerStep] = useState<'generate' | 'result'>('generate');
    const [packingListResult, setPackingListResult] = useState<PackingListResult | null>(null);
    const [isGeneratingPackingList, setIsGeneratingPackingList] = useState(false);
    const [packerError, setPackerError] = useState<string | null>(null);

    // Virtual Shopping Assistant states
    const {
        messages: shoppingChatMessages,
        gaps: shoppingGaps,
        recommendations: shoppingRecommendations,
        isAnalyzing: isShoppingAnalyzing,
        isTyping: isShoppingTyping,
        analyzeShoppingGaps: handleAnalyzeShoppingGaps,
        generateRecommendations: handleGenerateShoppingRecommendations,
        sendMessage: handleSendShoppingMessage
    } = useShoppingAssistant(closet);

    // Testing Playground state (dev tool for comparing outfit generation versions)
    const [showTestingPlayground, setShowTestingPlayground] = useState(false);
    const [showAestheticPlayground, setShowAestheticPlayground] = useState(false);
    const [showLiquidMorphDemo, setShowLiquidMorphDemo] = useState(false);

    // UX Enhancement states: Command Palette and Keyboard Shortcuts Help
    const [showCommandPalette, setShowCommandPalette] = useState(false);
    const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

    // Delete confirmation state
    const [deleteConfirm, setDeleteConfirm] = useState<{
        isOpen: boolean;
        type: 'item' | 'outfit' | null;
        id: string | null;
        name?: string;
    }>({ isOpen: false, type: null, id: null });

    const filteredCloset = useMemo(() => {
        const filtered = closet.filter(item => {
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
                imageDataUrl: item.imageDataUrl,
                metadata: item.metadata,
                isAIGenerated: true
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

    // Bulk delete multiple items
    const handleDeleteItems = async (ids: string[]) => {
        if (ids.length === 0) return;

        const originalCloset = closet;
        const count = ids.length;

        await optimistic.update(
            // Optimistic update: Remove items immediately
            () => {
                setCloset(prev => prev.filter(item => !ids.includes(item.id)));
            },
            // API call
            async () => {
                if (useSupabaseCloset) {
                    await Promise.all(ids.map(id => closetService.deleteClothingItem(id)));
                }
            },
            // Rollback on error
            () => {
                setCloset(originalCloset);
            },
            // Callbacks
            {
                onSuccess: () => toast.success(`${count} prendas eliminadas`),
                onError: () => toast.error('Error al eliminar. Intentá de nuevo.')
            }
        );
    };

    // Toggle favorite status
    const handleToggleFavorite = async (id: string) => {
        if (useSupabaseCloset) {
            try {
                await closetService.toggleFavorite(id);
                toast.success('Favorito actualizado');
            } catch {
                toast.error('Error al actualizar favorito');
            }
        }
    };

    const handleGenerateFit = async (prompt: string, mood?: string, category?: string) => {
        // Check if user can use AI feature before proceeding
        const canUseStatus = subscription.canUseAIFeature('outfit_generation');
        if (!canUseStatus.canUse) {
            setShowLimitReachedModal(true);
            return;
        }

        // setIsGenerating(true); // Handled by hook
        // setError(null); // Handled by hook
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
            let result: FitResult | null;

            // V1 SAFE: evitamos paths alternativos que puedan depender de integraciones no validadas
            if (professionalProfile && !(V1_SAFE_MODE && import.meta.env.PROD)) {
                // Weather data integration planned for future release
                // Will integrate with OpenWeatherMap API for location-based outfit suggestions
                const weatherData = undefined;

                // ⛔ SECURITY: API key removed - StylistService must use Edge Functions
                // The service should get the key from Supabase secrets, not client-side env

                // Generar outfit profesional
                const professionalResult = await generateProfessionalOutfit(
                    uniqueInventory,
                    professionalProfile,
                    prompt,
                    weatherData,
                    'balanced' // Usar tono balanceado por defecto
                    // apiKey removed - service must use Edge Functions
                );

                result = professionalResult as FitResult;
            } else {
                // Fallback al servicio básico
                result = await generateOutfit(prompt); // Use hook's generateOutfit - may return null on error
            }

            // Check if generation failed (returned null)
            if (!result) {
                // Error is already set in the hook's error state
                return;
            }

            setFitResult(result);
            setStylistView('result');

            // Record usage after successful generation
            await subscription.incrementUsage('outfit_generation');

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
            // Catch any other unexpected errors
            console.error('Unexpected error in handleGenerateFit:', e);
            setGenerationError(e instanceof Error ? e.message : 'Ocurrió un error inesperado');
        } finally {
            modals.setBorrowedItems([]);
            modals.setViewingFriend(null);
        }
    };

    const handleGeneratePackingList = async (prompt: string) => {
        // Check if user can use AI feature before proceeding
        const canUseStatus = subscription.canUseAIFeature('outfit_generation');
        if (!canUseStatus.canUse) {
            setShowLimitReachedModal(true);
            return;
        }

        setIsGeneratingPackingList(true);
        setPackerError(null);
        try {
            const result = await aiService.generatePackingList(prompt, closet);
            setPackingListResult(result);
            setPackerStep('result');

            // Record usage after successful generation
            await subscription.incrementUsage('outfit_generation');
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
            setPackerError(errorMessage);
        } finally {
            setIsGeneratingPackingList(false);
        }
    };

    const handleAddBorrowedItems = useCallback((items: ClothingItem[]) => {
        if (items.length === 0) return [];

        const timestamp = Date.now();
        const borrowedItems = items.map((item, index) => ({
            ...item,
            id: `borrowed_${item.id}_${timestamp}_${index}`,
            status: 'virtual' as const
        }));

        setCloset(prev => [...borrowedItems, ...prev]);
        toast.success(`${borrowedItems.length} prenda${borrowedItems.length === 1 ? '' : 's'} agregada${borrowedItems.length === 1 ? '' : 's'}`);
        return borrowedItems;
    }, [toast, setCloset]);

    const handleTryBorrowedItems = useCallback((items: ClothingItem[]) => {
        const borrowedItems = handleAddBorrowedItems(items);
        if (borrowedItems.length === 0) return;

        navigate(ROUTES.STUDIO, {
            state: {
                tab: 'virtual',
                preselectedItemIds: borrowedItems.map(item => item.id)
            }
        });
        modals.setViewingFriend(null);
    }, [handleAddBorrowedItems, navigate, modals]);

    const handleStartStylistWithBorrowedItems = (items: ClothingItem[]) => {
        modals.setBorrowedItems(items);
        resetStylist();
        startTransition(() => {
            modals.setShowStylist(true);
        });
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

    const handleRateOutfit = (outfitId: string, rating: number) => {
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
        const outfitName = 'este outfit';
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
        resetGeneration(); // Use hook's resetGeneration
        setStylistView('generate');
    };

    const handleStylistClick = () => {
        resetStylist();
        modals.setBorrowedItems([]);
        startTransition(() => {
            modals.setShowStylist(true);
        });
    };

    const resetPacker = () => {
        setPackingListResult(null);
        setPackerError(null);
        setPackerStep('generate');
    };

    const handlePackerClick = () => {
        resetPacker();
        modals.setShowSmartPacker(true);
    };

    // Global keyboard shortcuts (must be after resetStylist is defined)
    useKeyboardShortcuts([
        // Command Palette (Cmd+K)
        {
            key: 'k',
            modifiers: ['meta'],
            action: () => setShowCommandPalette(true),
            description: 'Abrir búsqueda rápida'
        },
        // Quick Navigation (1-4)
        {
            key: '1',
            action: () => navigate(ROUTES.HOME),
            description: 'Ir a Inicio'
        },
        {
            key: '2',
            action: () => navigate(ROUTES.CLOSET),
            description: 'Ir a Armario'
        },
        {
            key: '3',
            action: () => navigate(ROUTES.COMMUNITY),
            description: 'Ir a Comunidad'
        },
        {
            key: '4',
            action: () => navigate(ROUTES.PROFILE),
            description: 'Ir a Perfil'
        },
        // Add Item (Cmd+B)
        {
            key: 'b',
            modifiers: ['meta'],
            action: () => modals.setShowAddItem(true),
            description: 'Agregar prenda'
        },
        // Generate Outfit (Cmd+G)
        {
            key: 'g',
            modifiers: ['meta'],
            action: () => {
                resetStylist();
                startTransition(() => {
                    modals.setShowStylist(true);
                });
            },
            description: 'Generar outfit'
        },
        // Shortcuts Help (Cmd+/)
        {
            key: '/',
            modifiers: ['meta'],
            action: () => setShowShortcutsHelp(true),
            description: 'Ver atajos de teclado'
        }
    ]);

    // Feature access control for premium features
    const checkFeatureAccess = async (
        featureName: string,
        featureIcon: string,
        featureDescription: string,
        requiredTier: 'Pro' | 'Premium',
        onAccessGranted: () => void
    ) => {
        try {
            if (V1_SAFE_MODE && !PAYMENTS_ENABLED) {
                toast.info('Beta V1: pagos desactivados. Esta función se habilita pronto.');
                return;
            }
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
            // Fail closed in V1 to avoid accidental cost/access leaks
            toast.error('No pudimos validar el acceso. Probá de nuevo en un minuto.');
        }
    };

    // Wrapper functions for premium features
    const handleStartVirtualTryOn = () => {
        console.log('🎥 Virtual Try-On button clicked', { fitResult });

        // Collect item IDs from fitResult
        const itemIds: string[] = [];
        if (fitResult?.top_id) itemIds.push(fitResult.top_id);
        if (fitResult?.bottom_id) itemIds.push(fitResult.bottom_id);
        if (fitResult?.shoes_id) itemIds.push(fitResult.shoes_id);

        // Navigate to Studio with preselected items
        navigate(ROUTES.STUDIO, {
            state: { preselectedItemIds: itemIds }
        });
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
        // setIsGenerating(true); // Handled by hook
        // setError(null); // Handled by hook
        startTransition(() => {
            modals.setShowStylist(true);
        });

        try {
            await generateOutfit(prompt); // Use hook's generateOutfit
            setStylistView('result');
        } catch (e) {
            // const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.'; // Handled by hook
            // setError(errorMessage); // Handled by hook
        } finally {
            // setIsGenerating(false); // Handled by hook
        }
    };

    const handleConfirmShareItem = (friendIds: string[]) => {
        if (!itemToShare) return;
        const friendNames = communityData.filter(f => friendIds.includes(f.id)).map(f => f.name).join(', ');
        toast.success(`"${itemToShare.metadata.subcategory}" compartida con ${friendNames}!`);
        setItemToShare(null);
    };

    const handleLogin = () => {
        if (location.pathname === ROUTES.ONBOARDING_STYLIST) {
            navigate(ROUTES.HOME);
        }
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

    const clearLocalAppStorage = () => {
        if (typeof window === 'undefined') return;
        Object.keys(localStorage).forEach((key) => {
            if (key.startsWith('ojodeloca-')) {
                localStorage.removeItem(key);
            }
        });
    };

    const handleDeleteAccount = async () => {
        try {
            toast.info('Eliminando tu cuenta...');
            if (useSupabaseAuth) {
                await deleteAccount();
            }
            await authSignOut();
            clearLocalAppStorage();
            setCloset([]);
            setSavedOutfits([]);
            setProfessionalProfile(null);
            setHasOnboarded(false);
            setHasMigratedCloset(false);
            toast.success('Cuenta eliminada correctamente.');
        } catch (error) {
            console.error('Delete account failed:', error);
            toast.error('No pudimos eliminar tu cuenta. Probá de nuevo.');
            throw error;
        }
    };

    const selectedItem = closet.find(item => item.id === modals.selectedItemId);
    const selectedOutfit = savedOutfits.find(outfit => outfit.id === modals.selectedOutfitId);

    // virtualTryOnItems removed - consolidated into PhotoshootStudio


    const outfitToShareItems = outfitToShare ? {
        top: closet.find(item => item.id === outfitToShare.top_id),
        bottom: closet.find(item => item.id === outfitToShare.bottom_id),
        shoes: closet.find(item => item.id === outfitToShare.shoes_id),
    } : null;

    const [showAuthView, setShowAuthView] = useState(false);
    const [authInitialMode, setAuthInitialMode] = useState<'login' | 'signup'>('login');
    useEffect(() => {
        if (isAuthenticated) return;
        const params = new URLSearchParams(location.search);
        const authIntent = params.get('auth');
        if (authIntent === 'login' || authIntent === 'signup') {
            setAuthInitialMode(authIntent);
            setShowAuthView(true);
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, [isAuthenticated, location.search]);

    // Allow access to specific public routes (like Onboarding) without auth
    const isPublicRoute = location.pathname === ROUTES.ONBOARDING_STYLIST;

    if (!isAuthenticated && !isPublicRoute) {
        if (showAuthView) {
            return (
                <>
                    <div className="relative z-10 w-full h-dvh overflow-hidden">
                        <Suspense fallback={<LazyLoader type="modal" />}>
                            <AuthEyeScreen initialMode={authInitialMode} onLoggedIn={handleLogin} />
                        </Suspense>
                    </div>
                    <CookieConsentBanner />
                    <PWAInstallPrompt />
                </>
            );
        }

        return (
            <>
                <div className="relative w-full h-dvh overflow-hidden">
                    <Suspense fallback={<LazyLoader type="view" />}>
                        <LandingPage
                            onGetStarted={() => navigate(ROUTES.ONBOARDING_STYLIST)}
                            onLogin={() =>
                                startTransition(() => {
                                    setAuthInitialMode('login');
                                    setShowAuthView(true);
                                })
                            }
                        />
                    </Suspense>
                </div>
                <CookieConsentBanner />
                <PWAInstallPrompt />
            </>
        );
    }


    return (
        <>
            <SkipToMainContent />
            {!DISABLE_3D_BACKGROUND && <GlobalCanvas isAuth={!isAuthenticated && showAuthView} />}
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
                                                onAddItem={() => modals.setShowAddItem(true)}
                                                onStartStudio={() => navigate(ROUTES.STUDIO)}
                                                onStartStylist={handleStylistClick}
                                                onStartVirtualTryOn={() => navigate(ROUTES.VIRTUAL_TRY_ON)}
                                                onNavigateToCloset={() => navigate(ROUTES.CLOSET)}
                                                onNavigateToSavedLooks={() => navigate(ROUTES.SAVED_LOOKS)}
                                                onNavigateToCommunity={() => navigate(ROUTES.COMMUNITY)}
                                                onStartSmartPacker={() => navigate(ROUTES.SMART_PACKER)}
                                                onStartActivityFeed={() => navigate(ROUTES.ACTIVITY)}
                                                onStartVirtualShopping={() => navigate(ROUTES.VIRTUAL_SHOPPING)}
                                                onOpenShopLook={() => modals.setShowShopLook(true)}
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
                                                onShowGenerationHistory={() => modals.setShowGenerationHistory(true)}
                                                onStartStyleEvolution={() => modals.setShowStyleEvolution(true)}
                                                onStartCalendarSync={() => modals.setShowCalendarSync(true)}
                                                onStartOutfitTesting={() => startTransition(() => setShowTestingPlayground(true))}
                                                hasProfessionalProfile={!!professionalProfile}
                                                onShowProfessionalWizard={() => modals.setShowProfessionalWizard(true)}
                                                onShowAnalytics={() => modals.setShowAnalytics(true)}
                                                // Subscription props
                                                subscription={subscription}
                                                onShowPricing={() => setShowPricingModal(true)}
                                                onShowCredits={() => setShowCreditsDetail(true)}
                                            />
                                        } />
                                        <Route path={ROUTES.CLOSET} element={
                                            <ClosetProvider
                                                items={closet}
                                                onDeleteItem={handleDeleteItemClick}
                                                onDeleteItems={handleDeleteItems}
                                                onToggleFavorite={handleToggleFavorite}
                                            >
                                                <ClosetViewEnhanced
                                                    onItemClick={modals.setSelectedItemId}
                                                    onAddItem={() => modals.setShowAddItem(true)}
                                                    onLoadDemoData={(items) => {
                                                        setCloset(items);
                                                        localStorage.setItem('ojodeloca-closet', JSON.stringify(items));
                                                        toast.success('Armario demo cargado correctamente');
                                                    }}
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
                                                onOpenAestheticPlayground={!import.meta.env.PROD ? () => startTransition(() => setShowAestheticPlayground(true)) : undefined}
                                                onOpenBorrowedItems={() => modals.setShowBorrowedItems(true)}
                                                onDeleteAccount={handleDeleteAccount}
                                                onLoadSampleData={handleLoadSampleData}
                                            />
                                        } />
                                        {/* /prueba-virtual redirects to /studio */}
                                        <Route path={ROUTES.VIRTUAL_TRY_ON} element={<Navigate to={ROUTES.STUDIO} replace />} />
                                        <Route path={ROUTES.SMART_PACKER} element={
                                            <SmartPackerView
                                                closet={closet}
                                                onClose={() => navigate(ROUTES.HOME)}
                                            />
                                        } />
                                        <Route path={ROUTES.ACTIVITY} element={
                                            <ActivityFeedView
                                                closet={closet}
                                                savedOutfits={savedOutfits}
                                                onClose={() => navigate(ROUTES.HOME)}
                                            />
                                        } />
                                        <Route path={ROUTES.VIRTUAL_SHOPPING} element={<VirtualShoppingView />} />
                                        <Route path={ROUTES.BULK_UPLOAD} element={
                                            <BulkUploadView
                                                onClose={() => navigate(ROUTES.HOME)}
                                                onAddItemsLocal={handleLocalBulkAdd}
                                                onClosetSync={handleClosetSync}
                                                useSupabaseCloset={useSupabaseCloset}
                                            />
                                        } />
                                        <Route path={ROUTES.MULTIPLAYER_CHALLENGES} element={
                                            <MultiplayerChallengesView
                                                closet={closet}
                                                onClose={() => navigate(ROUTES.HOME)}
                                            />
                                        } />
                                        <Route path={ROUTES.CAPSULE_BUILDER} element={
                                            <CapsuleWardrobeBuilderView
                                                closet={closet}
                                                onClose={() => navigate(ROUTES.HOME)}
                                            />
                                        } />
                                        <Route path={ROUTES.STUDIO} element={
                                            <PhotoshootStudio closet={closet} />
                                        } />
                                        <Route path={ROUTES.STUDIO_MIRROR} element={
                                            <VirtualMirrorView
                                                closet={closet}
                                                onOpenDigitalTwinSetup={() => modals.setShowDigitalTwinSetup(true)}
                                                onOpenHistory={() => modals.setShowGenerationHistory(true)}
                                            />
                                        } />
                                        <Route path={ROUTES.STUDIO_PHOTOSHOOT} element={
                                            <PhotoshootStudio closet={closet} />
                                        } />
                                        <Route path={ROUTES.SAVED_LOOKS} element={
                                            <SavedLooksView closet={closet} />
                                        } />
                                        <Route path="/looks-guardados" element={<Navigate to={ROUTES.SAVED_LOOKS} replace />} />
                                        <Route path={ROUTES.SHARED_LOOK} element={
                                            <SharedLookView />
                                        } />
                                        <Route path={ROUTES.TERMS} element={<TermsView />} />
                                        <Route path={ROUTES.PRIVACY} element={<PrivacyView />} />
                                        <Route path={ROUTES.PRICING} element={
                                            <Suspense fallback={<LazyLoader type="view" />}>
                                                <PricingPage />
                                            </Suspense>
                                        } />
                                        <Route path={ROUTES.PLANES} element={<Navigate to={ROUTES.PRICING} replace />} />

                                        <Route path={ROUTES.ONBOARDING_STYLIST} element={
                                            isAuthenticated ? (
                                                <Navigate to={ROUTES.HOME} replace />
                                            ) : (
                                                <Suspense fallback={<LazyLoader type="view" />}>
                                                    <OnboardingStylistFlow />
                                                </Suspense>
                                            )
                                        } />

                                        {/* Redirect unknown routes to home */}
                                        <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
                                    </Routes>
                                </motion.div>
                            </AnimatePresence>

                            {/* Floating Dock Navigation */}
                            <FloatingDock onCameraClick={() => modals.setShowQuickCamera(true)} />

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
                    modals.showMigrationModal && (
                        <Suspense fallback={<LazyLoader type="modal" />}>
                            <MigrationModal
                                onComplete={() => modals.setShowMigrationModal(false)}
                                onSkip={() => modals.setShowMigrationModal(false)}
                            />
                        </Suspense>
                    )
                }

                {/* Pricing Modal */}
                <PricingModal
                    isOpen={showPricingModal}
                    onClose={() => setShowPricingModal(false)}
                    currentTier={subscription.tier}
                    aiGenerationsUsed={subscription.aiGenerationsUsed}
                    aiGenerationsLimit={subscription.aiGenerationsLimit}
                    onRefresh={subscription.refresh}
                />

                {/* Limit Reached Modal */}
                <LimitReachedModal
                    isOpen={showLimitReachedModal}
                    onClose={() => setShowLimitReachedModal(false)}
                    onUpgrade={() => {
                        setShowLimitReachedModal(false);
                        setShowPricingModal(true);
                    }}
                    tier={subscription.tier}
                />

                {/* Credits Detail Modal */}
                <CreditsDetailView
                    isOpen={showCreditsDetail}
                    onClose={() => setShowCreditsDetail(false)}
                    onUpgrade={() => {
                        setShowCreditsDetail(false);
                        setShowPricingModal(true);
                    }}
                />

                <CookieConsentBanner />
                <PWAInstallPrompt />

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
                    modals.showQuickCamera && (
                        <Suspense fallback={<LazyLoader type="modal" />}>
                            <PremiumCameraView
                                onClose={() => modals.setShowQuickCamera(false)}
                                onAddToCloset={async (imageDataUrl: string, metadata: ClothingItemMetadata, backImageDataUrl?: string) => {
                                    // Add to closet with already analyzed metadata
                                    try {
                                        const newItem: ClothingItem = {
                                            id: `item_${Date.now()}`,
                                            imageDataUrl,
                                            backImageDataUrl,
                                            metadata
                                        };

                                        if (useSupabaseCloset && user) {
                                            // Upload to Supabase
                                            const file = dataUrlToFile(imageDataUrl, `${newItem.id}.jpg`);
                                            const backFile = backImageDataUrl
                                                ? dataUrlToFile(backImageDataUrl, `${newItem.id}_back.jpg`)
                                                : undefined;
                                            await closetService.addClothingItem(file, metadata, backFile);
                                            await loadClosetFromSupabase();
                                        } else {
                                            // Add to local storage
                                            setCloset(prev => [newItem, ...prev]);
                                        }

                                        toast.success('✨ Prenda agregada al armario!');
                                    } catch (error) {
                                        console.error('Error adding item:', error);
                                        toast.error('Error al agregar la prenda');
                                    }
                                }}
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
                                onOpenShopLook={() => modals.setShowShopLook(true)}
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
                                error={generationError}
                                closet={closet as any} // Cast to any to resolve type mismatch
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
                                onRateOutfit={(rating) => handleRateOutfit('current-fit', rating)}
                                onOpenShopLook={() => modals.setShowShopLook(true)}
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
                                onAddBorrowedItems={handleAddBorrowedItems}
                                onTryBorrowedItems={handleTryBorrowedItems}
                                onShowToast={showToast}
                            />
                        </Suspense>
                    )
                }

                {/* VirtualTryOnView removed - consolidated into PhotoshootStudio */}

                {
                    modals.showSmartPacker && packerStep === 'generate' && (
                        <SmartPackerView
                            closet={closet}
                            onClose={() => modals.setShowSmartPacker(false)}
                            onBack={() => modals.setShowSmartPacker(false)}
                            onGenerate={handleGeneratePackingList}
                            isGenerating={isGeneratingPackingList}
                            error={packerError}
                        />
                    )
                }

                {
                    modals.showSmartPacker && packerStep === 'result' && packingListResult && (
                        <PackingListView
                            result={packingListResult}
                            inventory={closet}
                            onBack={() => {
                                resetPacker();
                                modals.setShowSmartPacker(false);
                            }}
                        />
                    )
                }

                {
                    modals.showSortOptions && (
                        <SortOptionsView
                            currentSort={sortOption}
                            onSortChange={handleSortOptionChange}
                            onClose={() => modals.setShowSortOptions(false)}
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
                    modals.showBorrowedItems && (
                        <Suspense fallback={<LazyLoader type="modal" />}>
                            <BorrowedItemsView
                                onClose={() => modals.setShowBorrowedItems(false)}
                                onShowToast={showToast}
                            />
                        </Suspense>
                    )
                }

                {
                    modals.showChat && getCurrentConversation() && (
                        <Suspense fallback={<LazyLoader type="modal" />}>
                            <AIStylistView
                                key="chat-modal"
                                closet={closet}
                                onClose={() => modals.setShowChat(false)}
                                conversations={chatConversations}
                                currentConversationId={currentConversationId}
                                onSelectConversation={selectConversation}
                                onNewConversation={createNewConversation}
                                onDeleteConversation={deleteConversation}
                                onMessagesUpdate={updateConversationMessages}
                                onUpdateTitle={updateConversationTitle}
                                userName={user?.user_metadata?.full_name || user?.email?.split('@')[0]}
                                onViewOutfit={(topId, bottomId, shoesId, aiGeneratedItems) => {
                                    console.log('App.tsx - Ver Outfit Completo handler called:', { topId, bottomId, shoesId, aiGeneratedItems });

                                    // Create outfit result to view
                                    const chatOutfit: FitResult = {
                                        top_id: topId,
                                        bottom_id: bottomId,
                                        shoes_id: shoesId,
                                        explanation: 'Outfit sugerido por el asistente de moda',
                                        aiGeneratedItems
                                    };

                                    setFitResult(chatOutfit);
                                    setStylistView('result');
                                    startTransition(() => {
                                        modals.setShowStylist(true);
                                    });
                                    // Keep chat open in background (don't close)
                                }}
                            />
                        </Suspense>
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
                                startTransition(() => {
                                    modals.setShowStylist(true);
                                });
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
                            onRateOutfit={handleRateOutfit}
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
                            onShowHistory={() => {
                                modals.setShowAIDesigner(false);
                                modals.setShowGenerationHistory(true);
                            }}
                        />
                    )
                }

                {
                    modals.showGenerationHistory && (
                        <GenerationHistoryView
                            onClose={() => modals.setShowGenerationHistory(false)}
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
                    modals.showShopLook && (
                        <ShopLookView
                            onClose={() => modals.setShowShopLook(false)}
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
                            result={fitResult}
                            inventory={closet}
                            onBack={() => {
                                modals.setCurrentEventSuggestion(null);
                                setFitResult(null);
                                modals.setShowCalendarSync(true);
                            }}
                            onSaveOutfit={() => {
                                if (fitResult) handleSaveOutfit(fitResult);
                                modals.setCurrentEventSuggestion(null);
                                setFitResult(null);
                                modals.setShowCalendarSync(true);
                            }}
                            onVirtualTryOn={() => {
                                if (fitResult) {
                                    handleStartVirtualTryOn();
                                    modals.setCurrentEventSuggestion(null);
                                    setFitResult(null);
                                    modals.setShowCalendarSync(false);
                                }
                            }}
                            savedOutfits={savedOutfits}
                            onShareOutfit={setOutfitToShare}
                            borrowedItemIds={new Set()}
                            onOpenShopLook={() => modals.setShowShopLook(true)}
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

                {/* AestheticPlayground - Habilitado para testear Eye3D */}
                {
                    showAestheticPlayground && (
                        <Suspense fallback={<LazyLoader type="view" />}>
                            <AestheticPlayground onClose={() => setShowAestheticPlayground(false)} />
                        </Suspense>
                    )
                }

                {/* BETA: LiquidMorphDemo usa Three.js - deshabilitado
                {
                    showLiquidMorphDemo && (
                        <Suspense fallback={<LazyLoader type="view" />}>
                            <LiquidMorphDemo />
                        </Suspense>
                    )
                }
                */}


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

                {/* Digital Twin Setup */}
                {
                    modals.showDigitalTwinSetup && (
                        <Suspense fallback={<LazyLoader type="modal" />}>
                            <DigitalTwinSetup
                                onClose={() => modals.setShowDigitalTwinSetup(false)}
                                onComplete={(profile) => {
                                    // Handle profile complete (e.g. update user context or toast)
                                    modals.setShowDigitalTwinSetup(false);
                                    toast.success('¡Gemelo Digital creado!');
                                }}
                            />
                        </Suspense>
                    )
                }

                {/* Professional Style Wizard */}
                {
                    modals.showProfessionalWizard && (
                        <Suspense fallback={<LazyLoader type="modal" />}>
                            <ProfessionalStyleWizardView
                                onClose={() => modals.setShowProfessionalWizard(false)}
                                onComplete={(profile) => {
                                    setProfessionalProfile(profile);
                                    modals.setShowProfessionalWizard(false);
                                    toast.success('¡Perfil profesional creado!');
                                }}
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

                {/* Network Status Indicator */}
                <NetworkIndicator />

                {/* Studio Generation Indicator (shows when generating in background) */}
                <StudioGenerationIndicator />

                {/* Command Palette (Cmd+K) */}
                <CommandPalette
                    isOpen={showCommandPalette}
                    onClose={() => setShowCommandPalette(false)}
                    onOpenCamera={() => modals.setShowQuickCamera(true)}
                    onOpenAddItem={() => modals.setShowAddItem(true)}
                    onOpenGenerateOutfit={() => {
                        resetStylist();
                        startTransition(() => {
                            modals.setShowStylist(true);
                        });
                    }}
                    onOpenShortcutsHelp={() => setShowShortcutsHelp(true)}
                />

                {/* Keyboard Shortcuts Help Modal */}
                <KeyboardShortcutsHelp
                    isOpen={showShortcutsHelp}
                    onClose={() => setShowShortcutsHelp(false)}
                />

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
        <AIGenerationProvider>
            <App />
        </AIGenerationProvider>
    </ThemeProvider>
);

export default AppWithProviders;
