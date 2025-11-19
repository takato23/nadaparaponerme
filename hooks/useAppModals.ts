import { useState } from 'react';
import type { ClothingItem, CommunityUser, FitResult, SavedOutfit, PackingListResult, BrandRecognitionResult, OutfitSuggestionForEvent } from '../types';

/**
 * Central modal state management for the App
 * Replaces 20+ individual useState declarations
 */
export function useAppModals() {
  // Item management modals
  const [showAddItem, setShowAddItem] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedItemForBrandRecognition, setSelectedItemForBrandRecognition] = useState<ClothingItem | null>(null);
  const [selectedItemForDupeFinder, setSelectedItemForDupeFinder] = useState<ClothingItem | null>(null);
  const [itemToShare, setItemToShare] = useState<ClothingItem | null>(null);

  // Outfit modals
  const [showStylist, setShowStylist] = useState(false);
  const [selectedOutfitId, setSelectedOutfitId] = useState<string | null>(null);
  const [outfitToShare, setOutfitToShare] = useState<FitResult | SavedOutfit | null>(null);

  // Feature modals
  const [showVirtualTryOn, setShowVirtualTryOn] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showColorPalette, setShowColorPalette] = useState(false);
  const [showTopVersatile, setShowTopVersatile] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showWeatherOutfit, setShowWeatherOutfit] = useState(false);
  const [showWeeklyPlanner, setShowWeeklyPlanner] = useState(false);
  const [showLookbookCreator, setShowLookbookCreator] = useState(false);
  const [showStyleChallenges, setShowStyleChallenges] = useState(false);
  const [showRatingView, setShowRatingView] = useState(false);
  const [showFeedbackAnalysis, setShowFeedbackAnalysis] = useState(false);
  const [showGapAnalysis, setShowGapAnalysis] = useState(false);
  const [showBrandRecognition, setShowBrandRecognition] = useState(false);
  const [showDupeFinder, setShowDupeFinder] = useState(false);
  const [showCapsuleBuilder, setShowCapsuleBuilder] = useState(false);
  const [showStyleDNA, setShowStyleDNA] = useState(false);
  const [showAIDesigner, setShowAIDesigner] = useState(false);
  const [showStyleEvolution, setShowStyleEvolution] = useState(false);
  const [showCalendarSync, setShowCalendarSync] = useState(false);
  const [showActivityFeed, setShowActivityFeed] = useState(false);
  const [showVirtualShopping, setShowVirtualShopping] = useState(false);
  const [showMultiplayerChallenges, setShowMultiplayerChallenges] = useState(false);

  // Paywall modals
  const [showPaywall, setShowPaywall] = useState(false);
  const [showFeatureLocked, setShowFeatureLocked] = useState(false);
  const [lockedFeature, setLockedFeature] = useState<{
    name: string;
    icon: string;
    description: string;
    requiredTier: 'Pro' | 'Premium';
  } | null>(null);

  // Packer modals
  const [showSmartPacker, setShowSmartPacker] = useState(false);
  const [showSortOptions, setShowSortOptions] = useState(false);

  // Additional data states
  const [brandRecognitionResultForDupe, setBrandRecognitionResultForDupe] = useState<BrandRecognitionResult | undefined>(undefined);
  const [currentEventSuggestion, setCurrentEventSuggestion] = useState<OutfitSuggestionForEvent | null>(null);
  const [viewingFriend, setViewingFriend] = useState<CommunityUser | null>(null);
  const [borrowedItems, setBorrowedItems] = useState<ClothingItem[]>([]);

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
    setBorrowedItems
  };
}
