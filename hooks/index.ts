/**
 * Hooks Index
 * Central export for all custom React hooks
 */

// State Management Hooks
export { default as useLocalStorage } from './useLocalStorage';
export { useDebounce } from './useDebounce';
export { useOptimistic } from './useOptimistic';

// Modal & UI State Hooks
export { useAppModals } from './useAppModals';
export { useFocusTrap, useRestoreFocus, useKeyboardDismiss, useAccessibleModal } from './useFocusTrap';

// Data & Operations Hooks
export { useClosetOperations } from './useClosetOperations';
export { useSavedOutfits } from './useSavedOutfits';
export { useChatConversations } from './useChatConversations';
export { useInventoryMap } from './useInventoryMap';

// Feature Hooks
export { useOutfitGeneration } from './useOutfitGeneration';
export { useShoppingAssistant } from './useShoppingAssistant';
export { useSubscription } from './useSubscription';
export { useFeatureAccess } from './useFeatureAccess';
export { useVersatilityScores } from './useVersatilityScores';
export { useFeedbackAnalysis } from './useFeedbackAnalysis';

// UI Enhancement Hooks
export { useToast } from './useToast';
export { usePullToRefresh } from './usePullToRefresh';
