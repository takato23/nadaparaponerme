import React, { Suspense, lazy } from 'react';
import { AnimatePresence } from 'framer-motion';
import LazyLoader from './LazyLoader';
import type {
  ClothingItem,
  ClothingItemMetadata,
  FitResult,
  SavedOutfit,
  SortOption,
  PackingListResult,
  CommunityUser,
  ChatConversation,
  ChatMessage,
  OutfitSuggestionForEvent,
  DigitalTwinProfile,
  ProfessionalProfile
} from '../types';
import { useInventoryMap } from '../hooks/useInventoryMap';
import type { AppModalsState } from '../hooks/useAppModals';

// Lazy load all modal components
const AddItemView = lazy(() => import('./AddItemView'));
const ItemDetailView = lazy(() => import('./ItemDetailView'));
const OutfitDetailView = lazy(() => import('./OutfitDetailView'));
const GenerateFitViewImproved = lazy(() => import('./GenerateFitViewImproved'));
const FitResultViewImproved = lazy(() => import('./FitResultViewImproved'));
const FitResultView = lazy(() => import('./FitResultView'));
// VirtualTryOnView removed - consolidated into PhotoshootStudio
const ShareOutfitView = lazy(() => import('./ShareOutfitView'));
const ShareItemView = lazy(() => import('./ShareItemView'));
const SortOptionsView = lazy(() => import('./SortOptionsView'));
const SmartPackerView = lazy(() => import('./SmartPackerView'));
const PackingListView = lazy(() => import('./PackingListView'));
const FriendProfileView = lazy(() => import('./FriendProfileView'));
const BulkUploadView = lazy(() => import('./BulkUploadView'));
const PremiumCameraView = lazy(() => import('./PremiumCameraView'));
const OnboardingView = lazy(() => import('./OnboardingView'));
const MigrationModal = lazy(() => import('./MigrationModal'));
const ConfirmDeleteModal = lazy(() => import('./ui/ConfirmDeleteModal'));

// Feature modals
const ClosetAnalyticsView = lazy(() => import('./ClosetAnalyticsView'));
const ColorPaletteView = lazy(() => import('./ColorPaletteView'));
const TopVersatileView = lazy(() => import('./TopVersatileView'));
const AIStylistView = lazy(() => import('./AIStylistView'));
const WeatherOutfitView = lazy(() => import('./WeatherOutfitView'));
const WeeklyPlannerView = lazy(() => import('./WeeklyPlannerView'));
const LookbookCreatorView = lazy(() => import('./LookbookCreatorView'));
const StyleChallengesView = lazy(() => import('./StyleChallengesView'));
const OutfitRatingView = lazy(() => import('./OutfitRatingView'));
const FeedbackAnalysisView = lazy(() => import('./FeedbackAnalysisView'));
const ClosetGapAnalysisView = lazy(() => import('./ClosetGapAnalysisView'));
const BrandRecognitionView = lazy(() => import('./BrandRecognitionView'));
const DupeFinderView = lazy(() => import('./DupeFinderView'));
const CapsuleWardrobeBuilderView = lazy(() => import('./CapsuleWardrobeBuilderView'));
const StyleDNAProfileView = lazy(() => import('./StyleDNAProfileView'));
const AIFashionDesignerView = lazy(() => import('./AIFashionDesignerView'));
const GenerationHistoryView = lazy(() => import('./GenerationHistoryView'));
const StyleEvolutionView = lazy(() => import('./StyleEvolutionView'));
const CalendarSyncView = lazy(() => import('./CalendarSyncView'));
const ActivityFeedView = lazy(() => import('./ActivityFeedView'));
const VirtualShoppingAssistantView = lazy(() => import('./VirtualShoppingAssistantView'));
const MultiplayerChallengesView = lazy(() => import('./MultiplayerChallengesView'));
const PaywallView = lazy(() => import('./PaywallView'));
const FeatureLockedView = lazy(() => import('./FeatureLockedView'));
const ProfessionalStyleWizardView = lazy(() => import('./ProfessionalStyleWizardView'));
const OutfitGenerationTestingPlayground = lazy(() => import('./OutfitGenerationTestingPlayground'));
const AestheticPlayground = lazy(() => import('./AestheticPlayground'));
const LiquidMorphDemo = lazy(() => import('./LiquidMorphDemo'));
const DigitalTwinSetup = lazy(() => import('./digital-twin/DigitalTwinSetup'));

const STORAGE_KEY = 'ojodeloca-digital-twin';
const STORAGE_KEY_SOURCE_IMAGE = 'ojodeloca-digital-twin-source-image';

const getCompactDigitalTwinProfile = (profile: DigitalTwinProfile & { bodyType?: string }) => {
  const { id, userId, createdAt, modelId, modelStatus, bodyType, sourceImages } = profile;
  return {
    id,
    userId,
    createdAt,
    modelId,
    modelStatus,
    bodyType,
    sourceImages: sourceImages.slice(0, 1),
    sourceImageCount: sourceImages.length,
    hasSourceImages: sourceImages.length > 0,
  };
};

const persistDigitalTwinProfile = (profile: DigitalTwinProfile & { bodyType?: string }) => {
  const compact = getCompactDigitalTwinProfile(profile);
  const sourceImage = compact.sourceImages?.[0];

  const attempts = [
    () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      if (sourceImage) {
        localStorage.setItem(STORAGE_KEY_SOURCE_IMAGE, sourceImage);
      }
    },
    () => {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_KEY_SOURCE_IMAGE);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(compact));
      if (sourceImage) {
        localStorage.setItem(STORAGE_KEY_SOURCE_IMAGE, sourceImage);
      }
    },
  ];

  for (const attempt of attempts) {
    try {
      attempt();
      return true;
    } catch {
      // continue
    }
  }

  return false;
};

interface AppModalsProps {
  // Core data
  closet: ClothingItem[];
  savedOutfits: SavedOutfit[];
  communityData: CommunityUser[];

  // Modal state from useAppModals
  modals: AppModalsState;

  // Stylist state
  stylistView: 'generate' | 'result';
  fitResult: FitResult | null;
  isGenerating: boolean;
  generationError: string | null;
  recentSearches: string[];
  fitAlternatives: FitResult[];
  borrowedItemIds: Set<string>;

  // Packer state
  packerStep: 'generate' | 'result';
  packingListResult: PackingListResult | null;
  isGeneratingPackingList: boolean;
  packerError: string | null;

  // Chat state
  chatConversations: ChatConversation[];
  currentConversationId: string | null;
  currentConversation: ChatConversation | null;

  // Shopping assistant state
  shoppingChatMessages: any[];
  shoppingGaps: any[];
  shoppingRecommendations: any[];
  isShoppingTyping: boolean;
  isShoppingAnalyzing: boolean;

  // Sort state
  sortOption: SortOption;

  // Flags
  hasOnboarded: boolean;
  useSupabaseCloset: boolean;
  professionalProfile: ProfessionalProfile | null;

  // Delete confirmation state
  deleteConfirm: {
    isOpen: boolean;
    type: 'item' | 'outfit' | null;
    id: string | null;
    name?: string;
  };
  isDeleting: boolean;

  // Testing playground state
  showTestingPlayground: boolean;
  showAestheticPlayground: boolean;
  showLiquidMorphDemo: boolean;

  // Handlers
  handlers: {
    // Onboarding
    onCompleteOnboarding: () => void;

    // Items
    onAddItemLocal: (item: ClothingItem) => void;
    onAddItemsBulk: (items: ClothingItem[]) => void;
    onClosetSync: (items: ClothingItem[]) => void;
    onUpdateItem: (id: string, metadata: ClothingItemMetadata) => void;
    onDeleteItemClick: (id: string) => void;
    onDeleteItem: (id: string) => void;
    onGenerateOutfitsForItem: (item: ClothingItem) => void;
    onShareItem: (item: ClothingItem) => void;
    onConfirmShareItem: (friendIds: string[]) => void;
    onAddToClosetFromCamera: (imageDataUrl: string, metadata: ClothingItemMetadata, backImageDataUrl?: string) => Promise<void>;
    onAddBorrowedItems: (items: ClothingItem[]) => void;
    onTryBorrowedItems: (items: ClothingItem[]) => void;

    // Outfits
    onGenerateFit: (prompt: string, mood?: string, category?: string) => void;
    onSaveOutfit: (outfit: Omit<FitResult, 'missing_piece_suggestion'>) => void;
    onDeleteOutfitClick: (id: string) => void;
    onDeleteOutfit: (id: string) => void;
    onShareOutfit: (outfit: FitResult | SavedOutfit) => void;
    onRegenerateWithAdjustment: (adjustment: 'more-formal' | 'change-colors' | 'more-casual') => void;
    onRateOutfit: (outfitId: string, rating: number) => void;
    onStartVirtualTryOn: () => void;
    onResetStylist: () => void;

    // Packer
    onGeneratePackingList: (prompt: string) => Promise<void>;
    onResetPacker: () => void;

    // Chat
    onSelectConversation: (id: string) => void;
    onNewConversation: () => void;
    onDeleteConversation: (id: string) => void;
    onMessagesUpdate: (messages: ChatMessage[]) => void;
    onUpdateTitle: (title: string) => void;
    onViewOutfitFromChat: (topId: string, bottomId: string, shoesId: string) => void;

    // Shopping
    onAnalyzeShoppingGaps: () => Promise<void>;
    onGenerateShoppingRecommendations: () => Promise<void>;
    onSendShoppingMessage: (message: string) => Promise<void>;

    // Sort
    onSortChange: (option: SortOption) => void;

    // Friend closet
    onStartStylistWithBorrowedItems: (items: ClothingItem[]) => void;

    // Delete confirmation
    onConfirmDelete: () => void;
    onCancelDelete: () => void;

    // Professional
    onCompleteProfessionalWizard: (profile: ProfessionalProfile) => void;

    // Add to closet from AI designer
    onAddItemFromDesigner: (imageDataUrl: string, metadata: ClothingItemMetadata) => void;

    // Capsule builder
    onSaveCapsule: (capsule: any) => void;
    onCreateOutfitFromCapsule: (topId: string, bottomId: string, shoesId: string) => void;

    // Playgrounds
    onCloseTestingPlayground: () => void;
    onCloseAestheticPlayground: () => void;
    onCloseLiquidMorphDemo: () => void;

    // Calendar sync
    onViewOutfitFromCalendar: (suggestion: OutfitSuggestionForEvent) => void;

    // Feature locked
    onUpgradeFromLocked: () => void;

    // Navigation
    navigate: (path: string) => void;
  };
}

/**
 * AppModals - Renders all modal components
 * Extracted from App.tsx to reduce component size and improve maintainability
 */
export const AppModals: React.FC<AppModalsProps> = ({
  closet,
  savedOutfits,
  communityData,
  modals,
  stylistView,
  fitResult,
  isGenerating,
  generationError,
  recentSearches,
  fitAlternatives,
  borrowedItemIds,
  packerStep,
  packingListResult,
  isGeneratingPackingList,
  packerError,
  chatConversations,
  currentConversationId,
  currentConversation,
  shoppingChatMessages,
  shoppingGaps,
  shoppingRecommendations,
  isShoppingTyping,
  isShoppingAnalyzing,
  sortOption,
  hasOnboarded,
  useSupabaseCloset,
  professionalProfile,
  deleteConfirm,
  isDeleting,
  showTestingPlayground,
  showAestheticPlayground,
  showLiquidMorphDemo,
  handlers
}) => {
  // Use inventory map for O(1) lookups
  const { getItem } = useInventoryMap(
    closet,
    modals.borrowedItems
  );

  const selectedItem = modals.selectedItemId ? getItem(modals.selectedItemId) : undefined;
  const selectedOutfit = savedOutfits.find(o => o.id === modals.selectedOutfitId);

  // Get outfit items for sharing
  const outfitToShareItems = modals.outfitToShare ? {
    top: getItem(modals.outfitToShare.top_id),
    bottom: getItem(modals.outfitToShare.bottom_id),
    shoes: getItem(modals.outfitToShare.shoes_id)
  } : null;

  return (
    <>
      {/* Onboarding */}
      {!hasOnboarded && (
        <Suspense fallback={<LazyLoader type="modal" />}>
          <OnboardingView onComplete={handlers.onCompleteOnboarding} />
        </Suspense>
      )}

      {/* Migration Modal */}
      {modals.showMigrationModal && (
        <Suspense fallback={<LazyLoader type="modal" />}>
          <MigrationModal
            onComplete={() => modals.setShowMigrationModal(false)}
            onSkip={() => modals.setShowMigrationModal(false)}
          />
        </Suspense>
      )}

      {/* Quick Camera */}
      {modals.showQuickCamera && (
        <Suspense fallback={<LazyLoader type="modal" />}>
          <PremiumCameraView
            onClose={() => modals.setShowQuickCamera(false)}
            onAddToCloset={handlers.onAddToClosetFromCamera}
          />
        </Suspense>
      )}

      {/* Add Item */}
      {modals.showAddItem && (
        <Suspense fallback={<LazyLoader type="modal" />}>
          <AddItemView
            onAddLocalItem={handlers.onAddItemLocal}
            onClosetSync={handlers.onClosetSync}
            useSupabaseCloset={useSupabaseCloset}
            onBack={() => modals.setShowAddItem(false)}
          />
        </Suspense>
      )}

      {/* Bulk Upload */}
      {modals.showBulkUpload && (
        <Suspense fallback={<LazyLoader type="modal" />}>
          <BulkUploadView
            onClose={() => modals.setShowBulkUpload(false)}
            onAddItemsLocal={handlers.onAddItemsBulk}
            onClosetSync={handlers.onClosetSync}
            useSupabaseCloset={useSupabaseCloset}
          />
        </Suspense>
      )}

      {/* Item Detail */}
      <AnimatePresence>
        {selectedItem && (
          <Suspense fallback={<LazyLoader type="modal" />}>
            <ItemDetailView
              item={selectedItem}
              inventory={closet}
              onUpdate={handlers.onUpdateItem}
              onDelete={handlers.onDeleteItemClick}
              onBack={() => modals.setSelectedItemId(null)}
              onGenerateOutfitWithItem={handlers.onGenerateOutfitsForItem}
              onSelectItem={modals.setSelectedItemId}
              onShareItem={handlers.onShareItem}
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
        )}
      </AnimatePresence>

      {/* Outfit Detail */}
      {selectedOutfit && (
        <Suspense fallback={<LazyLoader type="modal" />}>
          <OutfitDetailView
            outfit={selectedOutfit}
            inventory={closet}
            onBack={() => modals.setSelectedOutfitId(null)}
            onDelete={handlers.onDeleteOutfitClick}
            onShareOutfit={handlers.onShareOutfit}
          />
        </Suspense>
      )}

      {/* Stylist - Generate */}
      {modals.showStylist && stylistView === 'generate' && (
        <Suspense fallback={<LazyLoader type="modal" />}>
          <GenerateFitViewImproved
            onGenerate={handlers.onGenerateFit}
            onBack={() => {
              modals.setShowStylist(false);
              modals.setBorrowedItems([]);
            }}
            isGenerating={isGenerating}
            error={generationError}
            closet={closet as any}
            recentSearches={recentSearches}
          />
        </Suspense>
      )}

      {/* Stylist - Result */}
      {modals.showStylist && stylistView === 'result' && fitResult && (
        <Suspense fallback={<LazyLoader type="modal" />}>
          <FitResultViewImproved
            result={fitResult}
            inventory={closet}
            savedOutfits={savedOutfits}
            onSaveOutfit={handlers.onSaveOutfit}
            onVirtualTryOn={handlers.onStartVirtualTryOn}
            onShareOutfit={handlers.onShareOutfit}
            onRegenerateWithAdjustment={handlers.onRegenerateWithAdjustment}
            onRateOutfit={(rating) => handlers.onRateOutfit('current-fit', rating)}
            borrowedItemIds={borrowedItemIds}
            alternatives={fitAlternatives}
            onBack={() => {
              handlers.onResetStylist();
              modals.setShowStylist(false);
            }}
          />
        </Suspense>
      )}

      {/* VirtualTryOnView removed - consolidated into PhotoshootStudio */}

      {/* Share Modals */}
      {modals.itemToShare && (
        <Suspense fallback={<LazyLoader type="modal" />}>
          <ShareItemView
            item={modals.itemToShare}
            friends={communityData}
            onClose={() => modals.setItemToShare(null)}
            onShare={handlers.onConfirmShareItem}
          />
        </Suspense>
      )}

      {modals.outfitToShare && outfitToShareItems?.top && outfitToShareItems?.bottom && outfitToShareItems?.shoes && (
        <Suspense fallback={<LazyLoader type="modal" />}>
          <ShareOutfitView
            outfitItems={outfitToShareItems as any}
            onClose={() => modals.setOutfitToShare(null)}
          />
        </Suspense>
      )}

      {/* Sort Options */}
      {modals.showSortOptions && (
        <SortOptionsView
          currentSort={sortOption}
          onSortChange={handlers.onSortChange}
          onClose={() => modals.setShowSortOptions(false)}
        />
      )}

      {/* Smart Packer */}
      {modals.showSmartPacker && packerStep === 'generate' && (
        <SmartPackerView
          closet={closet}
          onClose={() => modals.setShowSmartPacker(false)}
          onBack={() => modals.setShowSmartPacker(false)}
          onGenerate={handlers.onGeneratePackingList}
          isGenerating={isGeneratingPackingList}
          error={packerError}
        />
      )}

      {modals.showSmartPacker && packerStep === 'result' && packingListResult && (
        <PackingListView
          result={packingListResult}
          inventory={closet}
          onBack={() => {
            handlers.onResetPacker();
            modals.setShowSmartPacker(false);
          }}
        />
      )}

      {/* Friend Profile */}
      {modals.viewingFriend && (
        <Suspense fallback={<LazyLoader />}>
          <FriendProfileView
            friend={modals.viewingFriend}
            onClose={() => modals.setViewingFriend(null)}
            onAddBorrowedItems={handlers.onAddBorrowedItems}
            onTryBorrowedItems={handlers.onTryBorrowedItems}
          />
        </Suspense>
      )}

      {/* Analytics & Stats */}
      {modals.showAnalytics && (
        <ClosetAnalyticsView
          closet={closet}
          onClose={() => modals.setShowAnalytics(false)}
        />
      )}

      {modals.showColorPalette && (
        <ColorPaletteView
          closet={closet}
          onClose={() => modals.setShowColorPalette(false)}
        />
      )}

      {modals.showTopVersatile && (
        <TopVersatileView
          closet={closet}
          onClose={() => modals.setShowTopVersatile(false)}
          onItemClick={modals.setSelectedItemId}
        />
      )}

      {/* Chat */}
      <AnimatePresence>
        {modals.showChat && currentConversation && (
          <AIStylistView
            key="chat-modal"
            closet={closet}
            onClose={() => modals.setShowChat(false)}
            conversations={chatConversations}
            currentConversationId={currentConversationId}
            onSelectConversation={handlers.onSelectConversation}
            onNewConversation={handlers.onNewConversation}
            onDeleteConversation={handlers.onDeleteConversation}
            onMessagesUpdate={handlers.onMessagesUpdate}
            onUpdateTitle={handlers.onUpdateTitle}
            onViewOutfit={handlers.onViewOutfitFromChat}
          />
        )}
      </AnimatePresence>

      {/* Weather Outfit */}
      {modals.showWeatherOutfit && (
        <WeatherOutfitView
          closet={closet}
          onClose={() => modals.setShowWeatherOutfit(false)}
          onViewOutfit={(topId, bottomId, shoesId) => {
            const weatherOutfit: FitResult = {
              top_id: topId,
              bottom_id: bottomId,
              shoes_id: shoesId,
              explanation: 'Outfit sugerido para el clima actual'
            };
            // This needs to be handled by parent - pass through handlers
            modals.setShowWeatherOutfit(false);
          }}
        />
      )}

      {/* Weekly Planner */}
      {modals.showWeeklyPlanner && (
        <WeeklyPlannerView
          savedOutfits={savedOutfits}
          closet={closet}
          onClose={() => modals.setShowWeeklyPlanner(false)}
          onViewOutfit={(outfit) => {
            modals.setSelectedOutfitId(outfit.id);
            modals.setShowWeeklyPlanner(false);
          }}
        />
      )}

      {/* Style Features */}
      {modals.showLookbookCreator && (
        <LookbookCreatorView
          closet={closet}
          onClose={() => modals.setShowLookbookCreator(false)}
        />
      )}

      {modals.showStyleChallenges && (
        <StyleChallengesView
          closet={closet}
          savedOutfits={savedOutfits}
          onClose={() => modals.setShowStyleChallenges(false)}
          onViewOutfit={(outfit) => {
            modals.setSelectedOutfitId(outfit.id);
            modals.setShowStyleChallenges(false);
          }}
        />
      )}

      {modals.showRatingView && (
        <OutfitRatingView
          closet={closet}
          savedOutfits={savedOutfits}
          onClose={() => modals.setShowRatingView(false)}
          onRateOutfit={handlers.onRateOutfit}
        />
      )}

      {modals.showFeedbackAnalysis && (
        <FeedbackAnalysisView
          closet={closet}
          savedOutfits={savedOutfits}
          onClose={() => modals.setShowFeedbackAnalysis(false)}
        />
      )}

      {modals.showGapAnalysis && (
        <ClosetGapAnalysisView
          closet={closet}
          onClose={() => modals.setShowGapAnalysis(false)}
        />
      )}

      {/* Brand & Dupe */}
      {modals.showBrandRecognition && modals.selectedItemForBrandRecognition && (
        <BrandRecognitionView
          item={modals.selectedItemForBrandRecognition}
          onClose={() => {
            modals.setShowBrandRecognition(false);
            modals.setSelectedItemForBrandRecognition(null);
          }}
        />
      )}

      {modals.showDupeFinder && modals.selectedItemForDupeFinder && (
        <DupeFinderView
          item={modals.selectedItemForDupeFinder}
          brandInfo={modals.brandRecognitionResultForDupe}
          onClose={() => {
            modals.setShowDupeFinder(false);
            modals.setSelectedItemForDupeFinder(null);
            modals.setBrandRecognitionResultForDupe(undefined);
          }}
        />
      )}

      {/* Capsule Builder */}
      {modals.showCapsuleBuilder && (
        <CapsuleWardrobeBuilderView
          closet={closet}
          onClose={() => modals.setShowCapsuleBuilder(false)}
          onSaveCapsule={handlers.onSaveCapsule}
          onCreateOutfitFromCapsule={handlers.onCreateOutfitFromCapsule}
        />
      )}

      {/* Style DNA */}
      {modals.showStyleDNA && (
        <StyleDNAProfileView
          closet={closet}
          onClose={() => modals.setShowStyleDNA(false)}
        />
      )}

      {/* AI Designer */}
      {modals.showAIDesigner && (
        <AIFashionDesignerView
          onClose={() => modals.setShowAIDesigner(false)}
          onAddToCloset={handlers.onAddItemFromDesigner}
          onShowHistory={() => {
            modals.setShowAIDesigner(false);
            modals.setShowGenerationHistory(true);
          }}
        />
      )}

      {modals.showGenerationHistory && (
        <GenerationHistoryView
          onClose={() => modals.setShowGenerationHistory(false)}
          onAddToCloset={handlers.onAddItemFromDesigner}
        />
      )}

      {/* Style Evolution */}
      {modals.showStyleEvolution && (
        <StyleEvolutionView
          closet={closet}
          onClose={() => modals.setShowStyleEvolution(false)}
        />
      )}

      {/* Calendar Sync */}
      {modals.showCalendarSync && (
        <CalendarSyncView
          closet={closet}
          onClose={() => modals.setShowCalendarSync(false)}
          onViewOutfit={handlers.onViewOutfitFromCalendar}
        />
      )}

      {/* Digital Twin Setup */}
      {modals.showDigitalTwinSetup && (
        <Suspense fallback={<LazyLoader type="modal" />}>
          <DigitalTwinSetup
            onComplete={(profile) => {
              if (!persistDigitalTwinProfile(profile)) {
                console.warn('No se pudo guardar el gemelo digital en localStorage.');
              }
              modals.setShowDigitalTwinSetup(false);
            }}
            onClose={() => modals.setShowDigitalTwinSetup(false)}
          />
        </Suspense>
      )}

      {/* Activity Feed */}
      {modals.showActivityFeed && (
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
      )}

      {/* Virtual Shopping */}
      {modals.showVirtualShopping && (
        <VirtualShoppingAssistantView
          closet={closet}
          onClose={() => modals.setShowVirtualShopping(false)}
          onAnalyzeGaps={handlers.onAnalyzeShoppingGaps}
          onGenerateRecommendations={handlers.onGenerateShoppingRecommendations}
          onSendMessage={handlers.onSendShoppingMessage}
          chatMessages={shoppingChatMessages}
          currentGaps={shoppingGaps}
          currentRecommendations={shoppingRecommendations}
          isTyping={isShoppingTyping}
          isAnalyzing={isShoppingAnalyzing}
        />
      )}

      {/* Multiplayer Challenges */}
      {modals.showMultiplayerChallenges && (
        <Suspense fallback={<LazyLoader type="analytics" />}>
          <MultiplayerChallengesView
            closet={closet}
            onClose={() => modals.setShowMultiplayerChallenges(false)}
          />
        </Suspense>
      )}

      {/* Calendar Event Outfit */}
      {modals.currentEventSuggestion && fitResult && (
        <FitResultView
          result={fitResult}
          inventory={closet}
          onBack={() => {
            modals.setCurrentEventSuggestion(null);
            modals.setShowCalendarSync(true);
          }}
          onSaveOutfit={() => {
            if (fitResult) handlers.onSaveOutfit(fitResult);
            modals.setCurrentEventSuggestion(null);
            modals.setShowCalendarSync(true);
          }}
          onVirtualTryOn={() => {
            if (fitResult) {
              handlers.onStartVirtualTryOn();
              modals.setCurrentEventSuggestion(null);
              modals.setShowCalendarSync(false);
            }
          }}
          savedOutfits={savedOutfits}
          onShareOutfit={handlers.onShareOutfit}
          borrowedItemIds={new Set()}
        />
      )}

      {/* Paywall */}
      {modals.showPaywall && (
        <Suspense fallback={<LazyLoader type="modal" />}>
          <PaywallView onClose={() => modals.setShowPaywall(false)} />
        </Suspense>
      )}

      {/* Feature Locked */}
      {modals.showFeatureLocked && modals.lockedFeature && (
        <Suspense fallback={<LazyLoader type="modal" />}>
          <FeatureLockedView
            featureName={modals.lockedFeature.name}
            featureIcon={modals.lockedFeature.icon}
            description={modals.lockedFeature.description}
            requiredTier={modals.lockedFeature.requiredTier}
            onUpgrade={handlers.onUpgradeFromLocked}
            onClose={() => {
              modals.setShowFeatureLocked(false);
              modals.setLockedFeature(null);
            }}
          />
        </Suspense>
      )}

      {/* Professional Style Wizard */}
      {modals.showProfessionalWizard && (
        <Suspense fallback={<LazyLoader type="modal" />}>
          <ProfessionalStyleWizardView
            onClose={() => modals.setShowProfessionalWizard(false)}
            onComplete={handlers.onCompleteProfessionalWizard}
            existingProfile={professionalProfile || undefined}
          />
        </Suspense>
      )}

      {/* Testing Playgrounds */}
      {showTestingPlayground && (
        <Suspense fallback={<LazyLoader type="modal" />}>
          <OutfitGenerationTestingPlayground
            closet={closet}
            onClose={handlers.onCloseTestingPlayground}
          />
        </Suspense>
      )}

      {showAestheticPlayground && (
        <Suspense fallback={<LazyLoader type="view" />}>
          <AestheticPlayground onClose={handlers.onCloseAestheticPlayground} />
        </Suspense>
      )}

      {showLiquidMorphDemo && (
        <Suspense fallback={<LazyLoader type="view" />}>
          <LiquidMorphDemo />
        </Suspense>
      )}

      {/* Delete Confirmation */}
      <Suspense fallback={null}>
        <ConfirmDeleteModal
          isOpen={deleteConfirm.isOpen}
          onClose={handlers.onCancelDelete}
          onConfirm={handlers.onConfirmDelete}
          itemName={deleteConfirm.name}
          itemType={deleteConfirm.type === 'item' ? 'prenda' : 'outfit'}
          isLoading={isDeleting}
        />
      </Suspense>
    </>
  );
};

export default AppModals;
