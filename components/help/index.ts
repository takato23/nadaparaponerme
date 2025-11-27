// Help System - Complete export index
// All components for the professional help and guidance system

// Main components
export { default as HelpModal } from './HelpModal';
export { default as OnboardingTour } from './OnboardingTour';
export { default as FloatingHelpButton } from './FloatingHelpButton';

// Contextual tips
export {
  default as ContextualTip,
  FirstOutfitTip,
  EmptyClosetTip,
  LowRatingsTip,
  StreakTip,
  NewFeatureTip,
  ProTip
} from './ContextualTip';

// Empty states
export {
  default as EnhancedEmptyState,
  EmptyCloset,
  EmptySavedOutfits,
  EmptyLookbooks,
  EmptySearchResults,
  EmptyActivityFeed,
  EmptyChallenges,
  EmptyGenerationHistory,
  CustomEmptyState
} from './EnhancedEmptyState';

// Loading states
export {
  default as LoadingState,
  OutfitGenerationLoader,
  ItemAnalysisLoader,
  VirtualTryOnLoader,
  SmartPackerLoader,
  StyleDNALoader,
  ChatLoader,
  InlineSpinner
} from './LoadingState';

// Error messages
export {
  default as ErrorMessage,
  NetworkError,
  AITimeoutError,
  EmptyClosetError,
  ImageError,
  SaveError,
  AuthRequiredError,
  FeatureLockedError,
  GenericError
} from './ErrorMessage';

// Re-export existing tooltip components
export { TooltipWrapper } from '../ui/TooltipWrapper';
export { HelpIcon } from '../ui/HelpIcon';

// Re-export help content for use in other components
export {
  featureHelp,
  uiTooltips,
  faqs,
  onboardingTourSteps,
  contextualTips,
  errorMessages,
  loadingMessages,
  successMessages,
  emptyStates,
  keyboardShortcuts,
  a11yLabels,
  type HelpItem,
  type FAQ,
  type OnboardingStep,
  type ContextualTip as ContextualTipType,
  type EmptyStateContent
} from '../../data/helpContent';
