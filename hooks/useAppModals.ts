import { useState, startTransition, SetStateAction } from 'react';
import type { ClothingItem, CommunityUser, FitResult, SavedOutfit, PackingListResult, BrandRecognitionResult, OutfitSuggestionForEvent } from '../types';

// Wraps useState's setter in startTransition so opening lazy-loaded modals
// doesn't trigger React error #426 (suspending during a synchronous input).
const useTransitionState = <T,>(initial: T) => {
  const [value, setValue] = useState(initial);
  const setValueTransition = (next: SetStateAction<T>) => {
    startTransition(() => setValue(next));
  };
  return [value, setValueTransition] as const;
};

/**
 * Central modal state management for the App
 * Replaces 20+ individual useState declarations
 */
export function useAppModals() {
  // Item management modals
  const [showAddItem, setShowAddItem] = useTransitionState(false);
  const [showBulkUpload, setShowBulkUpload] = useTransitionState(false);
  const [selectedItemId, setSelectedItemId] = useTransitionState<string | null>(null);
  const [selectedItemForBrandRecognition, setSelectedItemForBrandRecognition] = useTransitionState<ClothingItem | null>(null);
  const [selectedItemForDupeFinder, setSelectedItemForDupeFinder] = useTransitionState<ClothingItem | null>(null);
  const [itemToShare, setItemToShare] = useTransitionState<ClothingItem | null>(null);

  // Outfit modals
  const [showStylist, setShowStylist] = useTransitionState(false);
  const [selectedOutfitId, setSelectedOutfitId] = useTransitionState<string | null>(null);
  const [outfitToShare, setOutfitToShare] = useTransitionState<FitResult | SavedOutfit | null>(null);

  // Feature modals
  const [showVirtualTryOn, setShowVirtualTryOn] = useTransitionState(false);
  const [showAnalytics, setShowAnalytics] = useTransitionState(false);
  const [showColorPalette, setShowColorPalette] = useTransitionState(false);
  const [showTopVersatile, setShowTopVersatile] = useTransitionState(false);
  const [showChat, setShowChat] = useTransitionState(false);
  const [showWeatherOutfit, setShowWeatherOutfit] = useTransitionState(false);
  const [showWeeklyPlanner, setShowWeeklyPlanner] = useTransitionState(false);
  const [showLookbookCreator, setShowLookbookCreator] = useTransitionState(false);
  const [showStyleChallenges, setShowStyleChallenges] = useTransitionState(false);
  const [showRatingView, setShowRatingView] = useTransitionState(false);
  const [showFeedbackAnalysis, setShowFeedbackAnalysis] = useTransitionState(false);
  const [showGapAnalysis, setShowGapAnalysis] = useTransitionState(false);
  const [showBrandRecognition, setShowBrandRecognition] = useTransitionState(false);
  const [showDupeFinder, setShowDupeFinder] = useTransitionState(false);
  const [showCapsuleBuilder, setShowCapsuleBuilder] = useTransitionState(false);
  const [showStyleDNA, setShowStyleDNA] = useTransitionState(false);
  const [showAIDesigner, setShowAIDesigner] = useTransitionState(false);
  const [showGenerationHistory, setShowGenerationHistory] = useTransitionState(false);
  const [showStyleEvolution, setShowStyleEvolution] = useTransitionState(false);
  const [showCalendarSync, setShowCalendarSync] = useTransitionState(false);
  const [showActivityFeed, setShowActivityFeed] = useTransitionState(false);
  const [showVirtualShopping, setShowVirtualShopping] = useTransitionState(false);
  const [showMultiplayerChallenges, setShowMultiplayerChallenges] = useTransitionState(false);
  const [showQuickCamera, setShowQuickCamera] = useTransitionState(false);
  const [showProfessionalWizard, setShowProfessionalWizard] = useTransitionState(false);
  const [showMigrationModal, setShowMigrationModal] = useTransitionState(false);
  const [showDigitalTwinSetup, setShowDigitalTwinSetup] = useTransitionState(false);
  const [showBorrowedItems, setShowBorrowedItems] = useTransitionState(false);
  const [showShopLook, setShowShopLook] = useTransitionState(false);

  // Paywall modals
  const [showPaywall, setShowPaywall] = useTransitionState(false);
  const [showFeatureLocked, setShowFeatureLocked] = useTransitionState(false);
  const [lockedFeature, setLockedFeature] = useTransitionState<{
    name: string;
    icon: string;
    description: string;
    requiredTier: 'Pro' | 'Premium';
  } | null>(null);

  // Packer modals
  const [showSmartPacker, setShowSmartPacker] = useTransitionState(false);
  const [showSortOptions, setShowSortOptions] = useTransitionState(false);

  // Additional data states
  const [brandRecognitionResultForDupe, setBrandRecognitionResultForDupe] = useTransitionState<BrandRecognitionResult | undefined>(undefined);
  const [currentEventSuggestion, setCurrentEventSuggestion] = useTransitionState<OutfitSuggestionForEvent | null>(null);
  const [viewingFriend, setViewingFriend] = useTransitionState<CommunityUser | null>(null);
  const [borrowedItems, setBorrowedItems] = useTransitionState<ClothingItem[]>([]);

  return {
    // Item management
    showAddItem,
    setShowAddItem,
    showBulkUpload,
    setShowBulkUpload,
    selectedItemId,
    setSelectedItemId,
    selectedItemForBrandRecognition,
    setSelectedItemForBrandRecognition,
    selectedItemForDupeFinder,
    setSelectedItemForDupeFinder,
    itemToShare,
    setItemToShare,

    // Outfit management
    showStylist,
    setShowStylist,
    selectedOutfitId,
    setSelectedOutfitId,
    outfitToShare,
    setOutfitToShare,

    // Features
    showVirtualTryOn,
    setShowVirtualTryOn,
    showAnalytics,
    setShowAnalytics,
    showColorPalette,
    setShowColorPalette,
    showTopVersatile,
    setShowTopVersatile,
    showChat,
    setShowChat,
    showWeatherOutfit,
    setShowWeatherOutfit,
    showWeeklyPlanner,
    setShowWeeklyPlanner,
    showLookbookCreator,
    setShowLookbookCreator,
    showStyleChallenges,
    setShowStyleChallenges,
    showRatingView,
    setShowRatingView,
    showFeedbackAnalysis,
    setShowFeedbackAnalysis,
    showGapAnalysis,
    setShowGapAnalysis,
    showBrandRecognition,
    setShowBrandRecognition,
    showDupeFinder,
    setShowDupeFinder,
    showCapsuleBuilder,
    setShowCapsuleBuilder,
    showStyleDNA,
    setShowStyleDNA,
    showAIDesigner,
    setShowAIDesigner,
    showGenerationHistory,
    setShowGenerationHistory,
    showStyleEvolution,
    setShowStyleEvolution,
    showCalendarSync,
    setShowCalendarSync,
    showActivityFeed,
    setShowActivityFeed,
    showVirtualShopping,
    setShowVirtualShopping,
    showMultiplayerChallenges,
    setShowMultiplayerChallenges,
    showQuickCamera,
    setShowQuickCamera,
    showProfessionalWizard,
    setShowProfessionalWizard,
    showMigrationModal,
    setShowMigrationModal,

    // Paywall
    showPaywall,
    setShowPaywall,
    showFeatureLocked,
    setShowFeatureLocked,
    lockedFeature,
    setLockedFeature,

    // Packer
    showSmartPacker,
    setShowSmartPacker,
    showSortOptions,
    setShowSortOptions,

    // Additional data
    brandRecognitionResultForDupe,
    setBrandRecognitionResultForDupe,
    currentEventSuggestion,
    setCurrentEventSuggestion,
    viewingFriend,
    setViewingFriend,
    borrowedItems,
    setBorrowedItems,
    // Digital Twin
    showDigitalTwinSetup,
    setShowDigitalTwinSetup,
    // Borrowed items
    showBorrowedItems,
    setShowBorrowedItems,
    // Shop Look
    showShopLook,
    setShowShopLook
  };
}
