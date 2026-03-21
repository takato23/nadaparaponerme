/**
 * AIStylistView - Kumbi
 *
 * Interfaz moderna y elegante para el asistente de moda con IA.
 * Diseño profesional inspirado en ChatGPT/Claude.
 *
 * @version 4.0
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import type {
  ActiveWardrobeRecommendation,
  ChatUIAction,
  ChatAttachment,
  ChatAttachmentKind,
  ChatDetectedLookGarments,
  ChatReferencedItem,
  ClothingItem,
  LookFolder,
  SavedOutfit,
  ChatMessage,
  ChatConversation,
  GuidedLookWorkflowResponse,
  ProfessionalProfile,
  SavedLookContext,
  StylistContextPayload,
  StylistRecommendedItemCandidate,
  StylistSelectedItemContext,
  StylistShoppingSuggestion,
  StylistSurface,
} from '../types';
import { chatWithFashionAssistantWorkflow, chatWithStudioStylist, generateVirtualTryOnWithSlots } from '../src/services/aiService';
import { sanitizeUserInput } from '../utils/sanitize';
import { useSubscription } from '../hooks/useSubscription';
import { useNavigateTransition } from '../hooks/useNavigateTransition';
import { LimitReachedModal } from './QuotaIndicator';
import { useBillingSummary } from '../hooks/useBillingSummary';
import { getBucketSummary } from '../src/services/billingCatalogService';
import { aiImageService } from '../src/services/aiImageService';
import { getFeatureFlag } from '../src/config/features';
import { ROUTES } from '../src/routes';
import {
  type AmbiguousLookRequestResolution,
  LOOK_EDIT_CREDIT_COST,
  LOOK_CREATION_CREDIT_COST,
  TRY_ON_CREDIT_COST,
  buildGarmentEditPrompt,
  classifyStylistIntent,
  type LookCreationDraft,
  type MissingLookField,
  parseAmbiguousLookRequestResolution,
  parseAppNavigationIntent,
  buildLookCostMessage,
  buildLookCreationPrompt,
  detectGarmentEditIntent,
  detectItemRecommendationIntent,
  detectLookCreationIntent,
  detectWardrobeOutfitIntent,
  getCategoryLabel,
  getLookFieldQuestion,
  getMissingLookFields,
  isAmbiguousAICreationRequest,
  isAffirmative,
  isNegative,
  mapLookCategoryToTryOnSlot,
  parseLookCreationCategory,
  parseLookCreationFields,
  wantsAutoCategorySelection,
} from '../src/services/lookCreationFlow';
import {
  getGuidedLookErrorMessage,
  mapGuidedStatusToLookCreationStatus,
} from '../src/services/guidedLookWorkflowUi';
import { getPreferredClothingImage } from '../src/utils/closetImages';
import {
  trackGuidedLookConfirmed,
  trackGuidedLookCostShown,
  trackGuidedLookFieldCompleted,
  trackGuidedLookModeSelected,
  trackGuidedLookGenerationError,
  trackGuidedLookGenerationSuccess,
  trackGuidedLookOutfitRequested,
  trackGuidedLookSaved,
  trackGuidedLookStart,
  trackGuidedLookTryOn,
  trackGuidedLookUpgradeCTAClick,
  trackKumbiLookExtractionCompleted,
  trackKumbiLookExtractionFollowupSelected,
  trackKumbiLookExtractionSaved,
  trackKumbiLookExtractionStarted,
  trackKumbiLookSaveCompleted,
  trackKumbiLookSaveFailed,
  trackKumbiLookSaveFollowupSelected,
  trackKumbiLookSaveStarted,
  trackKumbiResponseRendered,
  trackKumbiSurfaceOpened,
  trackKumbiUiActionTriggered,
  trackStylistActionCompleted,
  trackStylistActionFailed,
  trackStylistActionRequested,
  trackStylistRecommendationCandidateShown,
  trackStylistRecommendationRequested,
  trackVirtualTryOn
} from '../src/services/analyticsService';
import { useMatchMedia } from '../src/hooks/useMatchMedia';
import {
  blockItem,
  confirmRecommendation,
  getBlockedItemIds,
} from '../src/services/recommendationService';
import { addImportedClothingItem } from '../src/services/closetService';
import {
  buildReviewableLookGarmentItems,
  saveReviewedLookGarments,
} from '../src/services/lookGarmentSeparationService';
import { getLookFolders, saveOutfit } from '../src/services/outfitService';
import { deriveSaveLookDraft } from '../src/services/kumbiLookSaveDraft';
import { buildStylistContext } from '../src/services/stylistContextService';
import { recordStylistEvent, upsertStylistMemory } from '../src/services/stylistMemoryService';
import {
  buildReferencedItemFromClothingItem,
  resolveReferencedItemFollowUp,
} from '../src/services/stylistReferencedItems';
import { consumePendingStylistPrompt, type PendingStylistEntry } from '../src/services/stylistEntryService';
import KumbiLookSaveDraftCard from './kumbi/KumbiLookSaveDraftCard';
import LookGarmentReviewPanel from './looks/LookGarmentReviewPanel';

// ============================================================================
// TYPES
// ============================================================================

interface AIStylistViewProps {
  closet: ClothingItem[];
  onClosetItemAdded?: (item: ClothingItem) => void;
  onClose: () => void;
  onViewOutfit: (
    topId: string,
    bottomId: string,
    shoesId: string,
    aiGeneratedItems?: {
      top?: ClothingItem;
      bottom?: ClothingItem;
      shoes?: ClothingItem;
    }
  ) => void;
  conversations: ChatConversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onMessagesUpdate: (messages: ChatMessage[]) => void;
  onUpdateTitle: (title: string) => void;
  userName?: string;
  onUpgrade?: () => void;
  savedOutfits?: SavedOutfit[];
  onOutfitSaved?: (outfit: SavedOutfit) => void;
  selectedLookContext?: SavedLookContext | null;
  onClearSelectedLookContext?: () => void;
  professionalProfile?: ProfessionalProfile | null;
  activeRecommendation?: ActiveWardrobeRecommendation | null;
  onActiveRecommendationChange?: (recommendation: ActiveWardrobeRecommendation | null) => void;
  surface?: StylistSurface;
}

interface Suggestion {
  id: string;
  icon: string;
  label: string;
  description: string;
  prompt: string;
  usesReferenceLook?: boolean;
}

interface LookCreationState extends LookCreationDraft {
  status: 'idle' | 'collecting' | 'confirming' | 'generating' | 'result';
  awaitingField?: MissingLookField;
  generatedImageUrl?: string;
  generatedPrompt?: string;
  generatedItem?: ClothingItem;
  savedToCloset?: boolean;
}

interface GarmentEditState {
  status: 'confirming' | 'editing';
  instruction: string;
}

interface TryOnState {
  status: 'idle' | 'ready' | 'confirming' | 'generating' | 'result';
  selfieImageDataUrl?: string;
  resultImageUrl?: string;
}

interface HybridLookChoiceState {
  requestText: string;
  parsed: Partial<LookCreationDraft>;
}

interface StylistTaskState {
  taskType: 'ambiguous_look_request';
  status: 'resolving_intent';
  requestText: string;
  missingFields: string[];
  delegationAllowed: boolean;
  suggestedCategory?: 'top' | 'bottom' | 'shoes';
  uiTarget?: string;
}

interface ImagePreviewState {
  src: string;
  title: string;
  fileName: string;
}

type ReferenceAttachmentMode = 'recreate' | 'feedback';

// ============================================================================
// CONSTANTS
// ============================================================================

const SUGGESTIONS: Suggestion[] = [
  {
    id: 'reference',
    icon: 'imagesmode',
    label: 'Recrear look',
    description: 'Subí una referencia y lo recreo con tu armario',
    prompt: 'Recreame este look con mi armario.',
    usesReferenceLook: true,
  },
  {
    id: 'work',
    icon: 'work',
    label: 'Oficina',
    description: 'Look profesional para el trabajo',
    prompt: 'Necesito un outfit profesional y elegante para ir a la oficina hoy.',
  },
  {
    id: 'date',
    icon: 'favorite',
    label: 'Cita',
    description: 'Romántico pero casual',
    prompt: 'Armame un look para una primera cita, que sea romántico pero no exagerado.',
  },
  {
    id: 'casual',
    icon: 'weekend',
    label: 'Fin de semana',
    description: 'Cómodo y relajado',
    prompt: 'Quiero un outfit casual y cómodo para salir a pasear.',
  },
  {
    id: 'party',
    icon: 'nightlife',
    label: 'Noche',
    description: 'Para destacar en la fiesta',
    prompt: 'Voy a una fiesta, necesito algo que destaque y sea divertido.',
  },
  {
    id: 'shopping',
    icon: 'shopping_bag',
    label: 'Comprar',
    description: 'Buscar opciones online',
    prompt: 'Mostrame opciones para comprar ropa online que complemente mi armario.',
  },
];

const QUICK_ACTIONS = [
  { id: 'formal', label: 'Más formal', icon: 'straighten' },
  { id: 'casual', label: 'Más casual', icon: 'spa' },
  { id: 'colors', label: 'Cambiar colores', icon: 'palette' },
  { id: 'alternative', label: 'Otra opción', icon: 'autorenew' },
];

const START_LOOK_CREATION_PROMPT = 'Quiero crear un look nuevo con IA';
const REFERENCE_LOOK_FEEDBACK_PROMPT = 'Decime qué opinás de esta prenda o este look.';

const STYLIST_QUICK_PROMPTS: Array<{
  label: string;
  prompt: string;
  icon: string;
  attachmentKind?: ChatAttachmentKind;
  attachmentPrompt?: string;
  referenceMode?: ReferenceAttachmentMode;
  isPremium?: boolean;
}> = [
  { label: 'Look para hoy', prompt: 'Armame un look completo para hoy con mi armario.', icon: 'wb_sunny' },
  { label: 'Reusar un look', prompt: 'Ayudame a reusar uno de mis looks guardados.', icon: 'history' },
  { label: 'Qué me falta', prompt: 'Decime qué falta en mi armario para cubrir mejor mis ocasiones.', icon: 'playlist_add_check' },
  { label: 'Armar para oficina', prompt: 'Armame un look para oficina con mi armario.', icon: 'work' },
  {
    label: 'Usar foto como inspiración',
    prompt: 'Recreame este look con mi armario.',
    icon: 'imagesmode',
    attachmentKind: 'reference_look',
    attachmentPrompt: 'Recreame este look con mi armario.',
    referenceMode: 'recreate',
  },
  {
    label: 'Qué opinás de esta foto',
    prompt: REFERENCE_LOOK_FEEDBACK_PROMPT,
    icon: 'rate_review',
    attachmentKind: 'reference_look',
    attachmentPrompt: REFERENCE_LOOK_FEEDBACK_PROMPT,
    referenceMode: 'feedback',
  },
  { label: 'Guardar prendas del look', prompt: 'Guardame la ropa de este look en mi armario.', icon: 'inventory_2', attachmentKind: 'extractable_look' },
  { label: 'Generar prenda premium', prompt: START_LOOK_CREATION_PROMPT, icon: 'auto_awesome', isPremium: true },
];

const DEFAULT_ATTACHMENT_PROMPTS: Record<ChatAttachmentKind, string> = {
  reference_look: 'Recreame este look con mi armario.',
  extractable_look: 'Guardame la ropa de este look en mi armario.',
};

function getDefaultPromptForAttachments(attachments: ChatAttachment[]): string {
  const primaryAttachment = attachments[0];
  if (!primaryAttachment) return '';
  return DEFAULT_ATTACHMENT_PROMPTS[primaryAttachment.kind] || '';
}

function isLookExtractionMessage(message: string, attachments: ChatAttachment[]): boolean {
  const normalized = message
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (attachments.some((attachment) => attachment.kind === 'extractable_look')) {
    return true;
  }

  if (!attachments.some((attachment) => attachment.kind === 'reference_look')) {
    return false;
  }

  return /\b(guarda(?:me|r)?|suma(?:me|r)?|carga(?:me|r)?|separa(?:me|r)?|extrae|saca(?:me|r)?|pas(?:a|ame)?).*(prendas?|ropa|look|armario|closet)\b|\b(prendas?|ropa).*(armario|closet|guarda|carga|suma)\b/i.test(normalized);
}
const LOOK_CREATION_QUICK_OPTIONS: Record<MissingLookField, Array<{ label: string; value: string }>> = {
  occasion: [
    { label: 'Oficina', value: 'oficina' },
    { label: 'Cita', value: 'cita' },
    { label: 'Fiesta', value: 'fiesta' },
    { label: 'Fin de semana', value: 'fin de semana' },
  ],
  style: [
    { label: 'Casual', value: 'casual' },
    { label: 'Elegante', value: 'elegante' },
    { label: 'Formal', value: 'formal' },
    { label: 'Streetwear', value: 'streetwear' },
  ],
  category: [
    { label: 'Top', value: 'top' },
    { label: 'Bottom', value: 'bottom' },
    { label: 'Calzado', value: 'calzado' },
    { label: 'Elegí vos', value: 'elegí vos' },
  ],
};

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getStreamingStepSize(remaining: number) {
  if (remaining > 220) return 10;
  if (remaining > 120) return 7;
  if (remaining > 48) return 4;
  return 2;
}

function StreamingMessageText({
  text,
  active,
  onDone,
  className,
}: {
  text: string;
  active: boolean;
  onDone?: () => void;
  className?: string;
}) {
  const [visibleText, setVisibleText] = useState(active ? '' : text);

  useEffect(() => {
    if (!active) {
      setVisibleText(text);
      return;
    }

    if (prefersReducedMotion()) {
      setVisibleText(text);
      onDone?.();
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let index = 0;

    setVisibleText('');

    const tick = () => {
      if (cancelled) return;

      const remaining = text.length - index;
      const step = getStreamingStepSize(remaining);
      index = Math.min(text.length, index + step);
      setVisibleText(text.slice(0, index));

      if (index >= text.length) {
        onDone?.();
        return;
      }

      timeoutId = setTimeout(tick, 16);
    };

    timeoutId = setTimeout(tick, 80);

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [active, onDone, text]);

  return (
    <p className={className}>
      {sanitizeUserInput(visibleText)}
      {active && visibleText.length < text.length && (
        <span className="ml-0.5 inline-block h-[1.05em] w-[0.12em] animate-pulse rounded-full bg-current align-[-0.12em]" />
      )}
    </p>
  );
}

function inferAnalyticsActionFromPrompt(prompt: string): Parameters<typeof trackStylistActionRequested>[0]['action_type'] {
  const normalized = prompt.toLowerCase();
  if (detectLookCreationIntent(normalized)) return 'new_garment_generation';
  if (detectWardrobeOutfitIntent(normalized) || detectItemRecommendationIntent(normalized)) return 'wardrobe_recommendation';
  if (/falta|faltantes|gap|wishlist|comprar/.test(normalized)) return 'wardrobe_gap_detection';
  if (/link|tienda|online|mercado libre|amazon|shopping/.test(normalized)) return 'external_link_suggestions';
  return 'free_chat';
}

function isCreditErrorMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes('uso')
    || normalized.includes('credito')
    || normalized.includes('insufficient')
    || normalized.includes('402')
    || normalized.includes('saldo')
    || normalized.includes('upgrade')
    || normalized.includes('límite')
    || normalized.includes('limite');
}

function mapChatErrorMessageValue(error: any): string {
  const errorMsg = error?.message || String(error);
  const normalized = errorMsg.toLowerCase();

  if (errorMsg.includes('429') || errorMsg.includes('rate limit') || errorMsg.includes('RESOURCE_EXHAUSTED')) {
    return '⏳ Demasiadas solicitudes. Por favor esperá unos segundos e intentá de nuevo.';
  }
  if (errorMsg.includes('503') || errorMsg.includes('overloaded') || errorMsg.includes('UNAVAILABLE')) {
    return '🔧 El servicio de IA está temporalmente sobrecargado. Intentá de nuevo en unos segundos.';
  }
  if (errorMsg.includes('API not configured') || errorMsg.includes('not available') || errorMsg.includes('desactivado')) {
    return '⚠️ Este servicio de chat no está disponible en la configuración actual.';
  }
  if (errorMsg.includes('network') || errorMsg.includes('fetch') || errorMsg.includes('Failed to fetch')) {
    return '📶 Error de conexión. Verificá tu conexión a internet e intentá de nuevo.';
  }
  if (normalized.includes('timed out') || normalized.includes('timeout')) {
    return '⏱️ Kumbi tardó más de lo esperado. Probá de nuevo en unos segundos.';
  }
  if (normalized.includes('no se pudo consultar al estilista')) {
    return 'No pude hablar con Kumbi en este momento. Reintentá en unos segundos.';
  }
  if (isCreditErrorMessage(errorMsg)) {
    return 'No pude resolver la consulta ahora por límites temporales del servicio. Reintentá en un rato.';
  }
  return '¡Ups! Algo salió mal. Intentá de nuevo en unos segundos.';
}

function mapLookCreationErrorMessageValue(error: any): string {
  const errorMsg = error?.message || String(error);
  const normalized = errorMsg.toLowerCase();

  if (normalized.includes('timed out') || normalized.includes('timeout')) {
    return '⏱️ La generación tardó más de lo esperado. Probá de nuevo en unos segundos.';
  }
  if (normalized.includes('429') || normalized.includes('rate limit')) {
    return '⏳ Tenemos mucha demanda en este momento. Esperá un momento e intentá nuevamente.';
  }
  if (normalized.includes('network') || normalized.includes('fetch') || normalized.includes('failed to fetch')) {
    return '📶 No pudimos conectarnos para generar la prenda. Verificá internet e intentá de nuevo.';
  }
  if (isCreditErrorMessage(errorMsg)) {
    return 'No tenés usos suficientes para generar la prenda. Hacé upgrade o sumá usos para continuar.';
  }
  return `No pude generar la prenda: ${errorMsg || 'error desconocido'}`;
}

function mapTryOnErrorMessageValue(error: any): string {
  const errorMsg = error?.message || String(error);
  const normalized = errorMsg.toLowerCase();

  if (normalized.includes('timed out') || normalized.includes('timeout')) {
    return '⏱️ El probador virtual tardó más de lo esperado. Probá de nuevo en unos segundos.';
  }
  if (normalized.includes('429') || normalized.includes('rate limit')) {
    return '⏳ Tenemos mucha demanda en el probador virtual. Esperá un poco e intentá nuevamente.';
  }
  if (normalized.includes('network') || normalized.includes('fetch') || normalized.includes('failed to fetch')) {
    return '📶 No pudimos conectarnos al probador virtual. Verificá internet e intentá de nuevo.';
  }
  if (isCreditErrorMessage(errorMsg)) {
    return 'No tenés usos suficientes para usar el probador virtual. Hacé upgrade o sumá usos para continuar.';
  }
  return `No pude generar el probador virtual: ${errorMsg || 'error desconocido'}`;
}

// ============================================================================
// COMPONENT
// ============================================================================

const AIStylistView: React.FC<AIStylistViewProps> = ({
  closet,
  onClosetItemAdded,
  onClose,
  onViewOutfit,
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onMessagesUpdate,
  onUpdateTitle,
  userName,
  onUpgrade,
  savedOutfits = [],
  onOutfitSaved,
  selectedLookContext = null,
  onClearSelectedLookContext,
  professionalProfile,
  activeRecommendation,
  onActiveRecommendationChange,
  surface = 'kumbi',
}) => {
  const navigate = useNavigateTransition();
  const isMobileChatLayout = useMatchMedia('(max-width: 767px)');
  // State
  const [inputValue, setInputValue] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [activeStreamingMessageId, setActiveStreamingMessageId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [generatedClosetItems, setGeneratedClosetItems] = useState<ClothingItem[]>([]);
  const [lookCreation, setLookCreation] = useState<LookCreationState>({ status: 'idle' });
  const [garmentEdit, setGarmentEdit] = useState<GarmentEditState | null>(null);
  const [editInstructionInput, setEditInstructionInput] = useState('');
  const [tryOn, setTryOn] = useState<TryOnState>({ status: 'idle' });
  const [stylistTask, setStylistTask] = useState<StylistTaskState | null>(null);
  const [guidedWorkflow, setGuidedWorkflow] = useState<GuidedLookWorkflowResponse | null>(null);
  const [guidedAutosaveEnabled, setGuidedAutosaveEnabled] = useState(false);
  const [limitModalSource, setLimitModalSource] = useState<'chat' | 'guided' | 'edit' | 'tryon' | null>(null);
  const [pendingRecommendation, setPendingRecommendation] = useState<StylistRecommendedItemCandidate | null>(null);
  const [blockedRecommendationItemIds, setBlockedRecommendationItemIds] = useState<string[]>([]);
  const [savingWishlistKeys, setSavingWishlistKeys] = useState<Set<string>>(new Set());
  const [savedWishlistKeys, setSavedWishlistKeys] = useState<Set<string>>(new Set());
  const [lookFolders, setLookFolders] = useState<LookFolder[]>([]);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [pendingAttachmentPrompt, setPendingAttachmentPrompt] = useState<string | null>(null);
  const [pendingReferenceAttachmentMode, setPendingReferenceAttachmentMode] = useState<ReferenceAttachmentMode | null>(null);
  const [imagePreview, setImagePreview] = useState<ImagePreviewState | null>(null);
  const [showPromptTray, setShowPromptTray] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia === 'undefined') {
      return true;
    }

    return !window.matchMedia('(max-width: 767px)').matches;
  });
  const [pendingEntry, setPendingEntry] = useState<PendingStylistEntry | null>(null);
  const [seededEntryContextPayload, setSeededEntryContextPayload] = useState<StylistContextPayload | null>(null);
  const [seededEntrySource, setSeededEntrySource] = useState<string | null>(null);

  // Subscription hook for tracking usage
  const subscription = useSubscription();
  const { data: billingSummary } = useBillingSummary();

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);
  const referenceLookInputRef = useRef<HTMLInputElement>(null);
  const referenceFeedbackInputRef = useRef<HTMLInputElement>(null);
  const extractableLookInputRef = useRef<HTMLInputElement>(null);
  const seededConversationIdRef = useRef<string | null>(null);
  const streamingPlaybackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamingPlaybackTokenRef = useRef(0);

  // Computed
  const currentConversation = conversations.find(c => c.id === currentConversationId);
  const messages = currentConversation?.messages || [];
  const isNewChat = messages.length <= 1;
  const enrichedCloset = useMemo(() => [...generatedClosetItems, ...closet], [generatedClosetItems, closet]);
  const stylistContext = useMemo(() => buildStylistContext({
    professionalProfile,
    activeRecommendation,
    savedOutfits,
  }), [activeRecommendation, professionalProfile, savedOutfits]);
  const useGuidedLookBackend = useMemo(() => getFeatureFlag('enableGuidedLookCreationBackend'), []);
  const useChatWardrobeRecommendations = useMemo(() => getFeatureFlag('enableChatWardrobeRecommendations'), []);
  const useKumbiLookExtraction = useMemo(() => getFeatureFlag('enableKumbiLookExtraction'), []);
  const stylistSurface = pendingEntry?.surface || surface;
  const entryContextPayload = pendingEntry?.contextPayload || seededEntryContextPayload || null;
  const selectedItemContext = entryContextPayload?.selectedItem || null;
  const effectiveSelectedLookContext = selectedLookContext || entryContextPayload?.selectedLook || null;
  const effectiveSelectedInferredLookContext = entryContextPayload?.selectedInferredLook || null;
  const contextualPromptChips = useMemo(() => {
    const chips: Array<{ label: string; prompt: string }> = [];

    if (selectedItemContext?.subcategory) {
      chips.push({
        label: `Resolver ${selectedItemContext.subcategory}`,
        prompt: `Ayudame a usar esta prenda (${selectedItemContext.subcategory}${selectedItemContext.color_primary ? ` ${selectedItemContext.color_primary}` : ''}) dentro de mi armario y decime con qué combinarla.`.trim(),
      });
    }

    if (effectiveSelectedLookContext?.name) {
      chips.push(
        {
          label: 'Pedir variante',
          prompt: `Quiero una variante nueva a partir de mi look guardado "${effectiveSelectedLookContext.name}".`,
        },
        {
          label: 'Adaptarlo',
          prompt: `Tomá mi look guardado "${effectiveSelectedLookContext.name}" y ayudame a adaptarlo a otra ocasión.`,
        },
      );
    }

    if (effectiveSelectedInferredLookContext?.summary) {
      chips.push(
        {
          label: 'Variarlo',
          prompt: `Tomá este look que subí (${effectiveSelectedInferredLookContext.summary}) y proponeme una variante nueva usando mi armario.`,
        },
        {
          label: 'Pasarlo a otra ocasión',
          prompt: `Ayudame a adaptar este look subido (${effectiveSelectedInferredLookContext.summary}) a otra ocasión sin perder su esencia.`,
        },
      );
    }

    if (stylistSurface === 'shopping') {
      chips.push(
        { label: 'Qué vale la pena', prompt: 'Con el contexto de shopping y mi armario, decime qué compra sí vale la pena y qué debería dejar pasar.' },
        { label: 'Prioridad wishlist', prompt: 'Viendo wishlist, recomendaciones y mi armario, ordename qué debería priorizar comprar primero.' },
      );
    } else if (stylistSurface === 'planner') {
      chips.push(
        { label: 'Vestime la semana', prompt: 'Ayudame a planear mis looks de esta semana con lo que ya tengo y el ritmo de mis días.' },
        { label: 'Resolver un evento', prompt: 'Tengo un evento y quiero que Kumbi me proponga opciones usando mi armario, clima y planner.' },
      );
    } else if (stylistSurface === 'activity') {
      chips.push(
        { label: 'Recrear inspiración', prompt: 'Tomá la inspiración que estoy viendo en actividad y ayudame a reinterpretarla con mi armario, sin copiarla literal.' },
        { label: 'Bajarlo a mi estilo', prompt: 'Viendo este feed, decime qué detalle o idea me conviene adoptar según mi estilo y mi armario.' },
      );
    } else if (stylistSurface === 'profile') {
      chips.push(
        { label: 'Leer mi estilo', prompt: 'Leé mi perfil y mi armario para resumir mi estilo actual, mis fortalezas y lo que debería repetir más.' },
        { label: 'Qué ajustar', prompt: 'Mirando mi perfil y mi armario, decime qué hábitos o elecciones de estilo debería ajustar para verme más coherente.' },
      );
    } else if (stylistSurface === 'closet') {
      chips.push(
        { label: 'Completame un look', prompt: 'Completame un look equilibrado usando mi armario actual.' },
        { label: 'Qué me falta', prompt: 'Decime qué falta en mi armario para cubrir mejor mis ocasiones.' },
      );
    } else if (stylistSurface === 'home') {
      chips.push(
        { label: 'Qué me pongo hoy', prompt: 'Qué me pongo hoy con lo que ya tengo en mi armario.' },
        { label: 'Armar desde una prenda', prompt: 'Quiero armar un look alrededor de una prenda clave de mi armario.' },
      );
    }

    const seen = new Set<string>();
    return chips.filter((chip) => {
      if (seen.has(chip.label)) return false;
      seen.add(chip.label);
      return true;
    }).slice(0, 4);
  }, [effectiveSelectedInferredLookContext, effectiveSelectedLookContext, selectedItemContext, stylistSurface]);

  // Get Kumbi usage from server-side billing summary
  const chatCreditsStatus = useMemo(() => {
    const bucket = getBucketSummary(billingSummary, 'kumbi_messages');
    if (!bucket) return { used: 0, limit: 0, remaining: 0 };
    const remaining = bucket.monthly_limit === -1 ? -1 : Math.max(0, bucket.monthly_limit - bucket.used - bucket.reserved);
    return { used: bucket.used, limit: bucket.monthly_limit, remaining };
  }, [billingSummary, messages.length]);

  const cancelStreamingPlayback = useCallback(() => {
    streamingPlaybackTokenRef.current += 1;
    if (streamingPlaybackTimeoutRef.current) {
      clearTimeout(streamingPlaybackTimeoutRef.current);
      streamingPlaybackTimeoutRef.current = null;
    }
    setStreamingMessage('');
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  // Focus input on mount
  useEffect(() => {
    if (!isNewChat) {
      inputRef.current?.focus();
    }
  }, [isNewChat]);

  useEffect(() => {
    if ((messages.length || 0) > 1) return;
    if (inputValue.trim()) return;

    const pendingEntry = consumePendingStylistPrompt();
    if (!pendingEntry?.prompt) return;

    seededConversationIdRef.current = currentConversationId;
    setPendingEntry(pendingEntry);
    setSeededEntryContextPayload(pendingEntry.contextPayload || null);
    setSeededEntrySource(pendingEntry.source || null);
    setInputValue(pendingEntry.prompt);
    setPendingAttachments(pendingEntry.attachments || []);
    setPendingAttachmentPrompt(null);
    setPendingReferenceAttachmentMode(null);
    setShowPromptTray(false);
    inputRef.current?.focus();
  }, [currentConversationId, inputValue, messages.length]);

  useEffect(() => {
    trackKumbiSurfaceOpened({
      surface: stylistSurface,
      source: pendingEntry?.source || seededEntrySource || 'direct_open',
      entry_mode: entryContextPayload?.entryMode || 'contextual',
      has_selected_look: Boolean(effectiveSelectedLookContext),
      has_inferred_look: Boolean(effectiveSelectedInferredLookContext),
    });
  }, [
    currentConversationId,
    effectiveSelectedInferredLookContext,
    effectiveSelectedLookContext,
    entryContextPayload?.entryMode,
    pendingEntry?.source,
    seededEntrySource,
    stylistSurface,
  ]);

  useEffect(() => {
    const isFreshSeededConversation = (currentConversation?.messages.length || 0) <= 1
      && currentConversationId === seededConversationIdRef.current;

    setLookCreation({ status: 'idle' });
    setGeneratedClosetItems([]);
    setGarmentEdit(null);
    setEditInstructionInput('');
    setTryOn({ status: 'idle' });
    setStylistTask(null);
    setGuidedWorkflow(null);
    setGuidedAutosaveEnabled(false);
    setLimitModalSource(null);
    setPendingRecommendation(null);
    setSavingWishlistKeys(new Set());
    setSavedWishlistKeys(new Set());
    cancelStreamingPlayback();
    setActiveStreamingMessageId(null);
    setShowPromptTray((currentConversation?.messages.length || 0) <= 1 && !isMobileChatLayout);

    if (!isFreshSeededConversation) {
      setPendingAttachments([]);
      setPendingAttachmentPrompt(null);
      setPendingReferenceAttachmentMode(null);
      setPendingEntry(null);
      setSeededEntryContextPayload(null);
      setSeededEntrySource(null);
      if (currentConversationId !== seededConversationIdRef.current) {
        seededConversationIdRef.current = null;
      }
    }
  }, [
    currentConversationId,
    currentConversation?.messages.length,
    isMobileChatLayout,
    cancelStreamingPlayback,
  ]);

  useEffect(() => () => {
    cancelStreamingPlayback();
  }, [cancelStreamingPlayback]);

  useEffect(() => {
    if (isMobileChatLayout) {
      setShowPromptTray(false);
    }
  }, [isMobileChatLayout]);

  useEffect(() => {
    if (!isMobileChatLayout) {
      setShowAttachmentMenu(false);
    }
  }, [isMobileChatLayout]);

  useEffect(() => {
    if (!useChatWardrobeRecommendations || !currentConversationId) return;
    let cancelled = false;

    void (async () => {
      try {
        const blocked = await getBlockedItemIds();
        if (!cancelled) {
          setBlockedRecommendationItemIds(blocked);
        }
      } catch {
        if (!cancelled) {
          setBlockedRecommendationItemIds([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentConversationId, useChatWardrobeRecommendations]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const folders = await getLookFolders();
        if (!cancelled) {
          setLookFolders(folders);
        }
      } catch {
        if (!cancelled) {
          setLookFolders([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setGarmentEdit(null);
    setEditInstructionInput('');
    setTryOn((prev) => ({
      ...prev,
      status: prev.selfieImageDataUrl ? 'ready' : 'idle',
      resultImageUrl: undefined,
    }));
  }, [lookCreation.generatedItem?.id]);

  const appendAssistantMessage = useCallback((
    baseMessages: ChatMessage[],
    content: string,
    outfitSuggestion?: ChatMessage['outfitSuggestion'],
    detectedLookGarments?: ChatDetectedLookGarments,
    problemItemSuggestions?: ChatMessage['problemItemSuggestions'],
    billing?: ChatMessage['billing'],
    shoppingSuggestions?: StylistShoppingSuggestion[],
    uiActions?: ChatUIAction[],
    referencedItems?: ChatReferencedItem[],
    options: { animate?: boolean } = {},
  ) => {
    const assistantMessage: ChatMessage = {
      id: `assistant_${Date.now()}`,
      role: 'assistant',
      content,
      timestamp: Date.now(),
      outfitSuggestion: outfitSuggestion || undefined,
      detectedLookGarments: detectedLookGarments || undefined,
      problemItemSuggestions: problemItemSuggestions && problemItemSuggestions.length > 0
        ? problemItemSuggestions
        : undefined,
      billing: billing || undefined,
      shoppingSuggestions: shoppingSuggestions && shoppingSuggestions.length > 0
        ? shoppingSuggestions
        : undefined,
      referencedItems: referencedItems && referencedItems.length > 0
        ? referencedItems
        : undefined,
      uiActions: uiActions && uiActions.length > 0 ? uiActions : undefined,
    };
    if (options.animate !== false) {
      setActiveStreamingMessageId(assistantMessage.id);
    }
    const nextMessages = [...baseMessages, assistantMessage];
    onMessagesUpdate(nextMessages);
    return nextMessages;
  }, [onMessagesUpdate]);

  const playStreamingAssistantText = useCallback(async (text: string) => {
    cancelStreamingPlayback();

    if (!text) return true;

    if (prefersReducedMotion()) {
      setStreamingMessage(text);
      return true;
    }

    const playbackToken = streamingPlaybackTokenRef.current;

    return await new Promise<boolean>((resolve) => {
      let index = 0;

      const tick = () => {
        if (streamingPlaybackTokenRef.current !== playbackToken) {
          resolve(false);
          return;
        }

        const remaining = text.length - index;
        index = Math.min(text.length, index + getStreamingStepSize(remaining));
        setStreamingMessage(text.slice(0, index));

        if (index >= text.length) {
          streamingPlaybackTimeoutRef.current = null;
          resolve(true);
          return;
        }

        streamingPlaybackTimeoutRef.current = setTimeout(tick, 16);
      };

      streamingPlaybackTimeoutRef.current = setTimeout(tick, 56);
    });
  }, [cancelStreamingPlayback]);

  const appendAssistantMessageWithPlayback = useCallback(async (
    baseMessages: ChatMessage[],
    content: string,
    outfitSuggestion?: ChatMessage['outfitSuggestion'],
    detectedLookGarments?: ChatDetectedLookGarments,
    problemItemSuggestions?: ChatMessage['problemItemSuggestions'],
    billing?: ChatMessage['billing'],
    shoppingSuggestions?: StylistShoppingSuggestion[],
    uiActions?: ChatUIAction[],
    referencedItems?: ChatReferencedItem[],
  ) => {
    const didCompletePlayback = await playStreamingAssistantText(content);
    if (!didCompletePlayback) {
      return baseMessages;
    }

    const nextMessages = appendAssistantMessage(
      baseMessages,
      content,
      outfitSuggestion,
      detectedLookGarments,
      problemItemSuggestions,
      billing,
      shoppingSuggestions,
      uiActions,
      referencedItems,
      { animate: false },
    );

    cancelStreamingPlayback();
    return nextMessages;
  }, [
    appendAssistantMessage,
    cancelStreamingPlayback,
    playStreamingAssistantText,
  ]);

  const updateChatMessage = useCallback((
    messageId: string,
    updater: (message: ChatMessage) => ChatMessage,
  ) => {
    const nextMessages = messages.map((message) => (
      message.id === messageId ? updater(message) : message
    ));
    onMessagesUpdate(nextMessages);
    return nextMessages;
  }, [messages, onMessagesUpdate]);

  const prepareDetectedLookGarments = useCallback(async (
    attachments: ChatAttachment[],
    detectedLookGarments?: NonNullable<Awaited<ReturnType<typeof chatWithStudioStylist>>['detectedLookGarments']> | null,
  ): Promise<ChatDetectedLookGarments | undefined> => {
    if (!detectedLookGarments) return undefined;

    const sourceAttachment = attachments[0];
    if (!sourceAttachment) return undefined;

    const reviewItems = await buildReviewableLookGarmentItems(
      sourceAttachment.imageDataUrl,
      detectedLookGarments,
    );

    return {
      items: reviewItems,
      warnings: detectedLookGarments.warnings || [],
      summary: detectedLookGarments.summary || null,
      saveState: 'idle',
      saveError: null,
    };
  }, []);

  const inferWishlistCategoryFromSuggestion = useCallback((product: StylistShoppingSuggestion): 'top' | 'bottom' | 'shoes' => {
    const raw = `${product.title || ''} ${product.reason || ''}`.toLowerCase();
    if (/zapat|zapato|bota|calzado|shoe|sandalia/.test(raw)) return 'shoes';
    if (/pantal|jean|falda|pollera|short|bottom/.test(raw)) return 'bottom';
    return 'top';
  }, []);

  const buildStylistMemoryUpdate = useCallback((prompt: string, outfitSuggestion?: ChatMessage['outfitSuggestion']) => {
    const normalized = prompt
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    const likedTags = new Set<string>();
    const dislikedTags = new Set<string>();

    if (/\b(con accesorios|mas accesorios|sumale accesorios|joyas|statement)\b/.test(normalized)) {
      likedTags.add('accessories-bold');
    }
    if (/\b(sin accesorios|menos accesorios|minimal|limpio)\b/.test(normalized)) {
      likedTags.add('accessories-light');
    }
    if (/\b(no me gusta|evito|odio)\b/.test(normalized)) {
      if (/\b(oversize|oversized)\b/.test(normalized)) dislikedTags.add('silhouette-oversized');
      if (/\b(entallado|ajustado|tight)\b/.test(normalized)) dislikedTags.add('silhouette-fitted');
      if (/\b(accesorios|joyas)\b/.test(normalized)) dislikedTags.add('accessories-heavy');
    }

    const paletteMatch = normalized.match(/\b(negro|blanco|gris|azul|beige|camel|bordo|rojo|verde|rosa)\b/g);
    if (paletteMatch?.length) {
      paletteMatch.slice(0, 3).forEach((color) => likedTags.add(`palette:${color}`));
    }

    if (outfitSuggestion?.look_goal === 'reference_recreation') {
      likedTags.add('reference_recreation');
    }

    if (likedTags.size === 0 && dislikedTags.size === 0) {
      return null;
    }

    return {
      liked_tags: Array.from(likedTags),
      disliked_tags: Array.from(dislikedTags),
    };
  }, []);

  const handleSaveShoppingSuggestionToWishlist = useCallback(async (
    messageId: string,
    product: StylistShoppingSuggestion,
  ) => {
    const key = `${messageId}:${product.id}`;
    if (savingWishlistKeys.has(key) || savedWishlistKeys.has(key)) return;

    setSavingWishlistKeys((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });

    try {
      const metadataCategory = inferWishlistCategoryFromSuggestion(product);
      const imported = await addImportedClothingItem({
        imageSource: product.image_url || undefined,
        metadata: {
          category: metadataCategory,
          subcategory: (product.title || 'Prenda recomendada').slice(0, 80),
          color_primary: 'desconocido',
          vibe_tags: ['wishlist', 'chat-stylist'],
          seasons: [],
          description: product.reason || `Recomendación del estilista IA (${product.store_name || 'tienda online'})`,
        },
        status: 'wishlist',
        isFavorite: true,
        linkMode: 'linked',
        sourceRef: {
          originType: 'stylist_chat_shopping',
          originUrl: product.shop_url,
          dedupeKey: `stylist-chat:${product.shop_url}`,
        },
      });

      onClosetItemAdded?.(imported);
      setSavedWishlistKeys((prev) => {
        const next = new Set(prev);
        next.add(key);
        return next;
      });
      appendAssistantMessage(
        messages,
        `Listo, guardé "${product.title}" en tu wishlist del armario.`,
      );
    } catch (error: any) {
      appendAssistantMessage(
        messages,
        `No pude guardarla en wishlist ahora: ${error?.message || 'error inesperado'}`,
      );
    } finally {
      setSavingWishlistKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }, [
    appendAssistantMessage,
    inferWishlistCategoryFromSuggestion,
    messages,
    onClosetItemAdded,
    savedWishlistKeys,
    savingWishlistKeys,
  ]);

  const runGeneralStylistChat = useCallback(async (
    updatedMessages: ChatMessage[],
    prompt: string,
    attachments: ChatAttachment[] = [],
  ) => {
    setIsTyping(true);
    const requestedAction = inferAnalyticsActionFromPrompt(prompt);
    const extractionRequest = useKumbiLookExtraction && isLookExtractionMessage(prompt, attachments);
    const explicitRecommendationRequest = useChatWardrobeRecommendations
      && detectItemRecommendationIntent(prompt);
    if (explicitRecommendationRequest) {
      trackStylistRecommendationRequested({
        source: 'chat',
        surface: stylistSurface,
        thread_id: currentConversationId || undefined,
      });
    }
    trackStylistActionRequested({
      action_type: requestedAction,
      charged: false,
      credits_used: 0,
      surface: stylistSurface,
      source: 'chat',
      used_external_search: requestedAction === 'external_link_suggestions',
      thread_id: currentConversationId,
    });
    if (extractionRequest) {
      trackKumbiLookExtractionStarted({
        surface: stylistSurface,
        thread_id: currentConversationId || null,
        attachment_kind: attachments[0]?.kind,
      });
    }

    try {
      const excludeItemIds = Array.from(new Set([
        ...blockedRecommendationItemIds,
        ...(activeRecommendation?.item_id ? [activeRecommendation.item_id] : []),
      ]));
      const response = await chatWithStudioStylist(
        prompt,
        enrichedCloset,
        messages,
        {
          attachments,
          surface: stylistSurface,
          profileContext: stylistContext.profileContext,
          savedLookContext: stylistContext.savedLookContext,
          selectedLookContext: effectiveSelectedLookContext,
          contextPayload: entryContextPayload,
          recommendationContext: explicitRecommendationRequest
            ? {
              explicit: true,
              excludeItemIds,
            }
            : undefined,
        },
      );
      const candidateItem = response.recommendedItemCandidate?.item_id
        ? enrichedCloset.find((item) => item.id === response.recommendedItemCandidate?.item_id)
        : null;
      const effectiveReferencedItems = (response.referencedItems && response.referencedItems.length > 0)
        ? response.referencedItems
        : (candidateItem && response.recommendedItemCandidate
          ? [buildReferencedItemFromClothingItem(
            candidateItem,
            response.recommendedItemCandidate.reason || 'Es la prenda que mejor encaja con lo que pediste.',
          )]
          : undefined);
      const preparedDetectedLookGarments = await prepareDetectedLookGarments(
        attachments,
        response.detectedLookGarments,
      );

      const nextMessages = await appendAssistantMessageWithPlayback(
        updatedMessages,
        response.content,
        response.outfitSuggestion || undefined,
        preparedDetectedLookGarments,
        response.problemItemSuggestions || undefined,
        response.billing,
        response.shoppingSuggestions || undefined,
        response.uiActions || undefined,
        effectiveReferencedItems,
      );
      setIsTyping(false);

      trackKumbiResponseRendered({
        surface: stylistSurface,
        thread_id: response.threadId || currentConversationId || null,
        has_outfit: Boolean(response.outfitSuggestion),
        has_actions: (Array.isArray(response.uiActions) && response.uiActions.length > 0)
          || Boolean(preparedDetectedLookGarments)
          || Boolean(response.problemItemSuggestions?.length),
        has_references: Array.isArray(effectiveReferencedItems) && effectiveReferencedItems.length > 0,
        has_shopping: Array.isArray(response.shoppingSuggestions) && response.shoppingSuggestions.length > 0,
      });
      if (preparedDetectedLookGarments) {
        trackKumbiLookExtractionCompleted({
          surface: stylistSurface,
          thread_id: response.threadId || currentConversationId || null,
          attachment_kind: attachments[0]?.kind,
          detected_count: preparedDetectedLookGarments.items.length,
        });
      }

      void recordStylistEvent({
        thread_id: response.threadId || currentConversationId || undefined,
        surface: stylistSurface,
        prompt,
        suggestion_json: response.outfitSuggestion as Record<string, unknown> | null | undefined,
        action: 'generated',
      });
      const memoryUpdate = buildStylistMemoryUpdate(prompt, response.outfitSuggestion || undefined);
      if (memoryUpdate) {
        void upsertStylistMemory(memoryUpdate);
      }

      if (explicitRecommendationRequest && response.recommendedItemCandidate?.item_id) {
        setPendingRecommendation(response.recommendedItemCandidate);
        trackStylistRecommendationCandidateShown({
          source: 'chat',
          surface: stylistSurface,
          thread_id: response.threadId || currentConversationId || undefined,
          item_id: response.recommendedItemCandidate.item_id,
          score_total: response.recommendedItemCandidate.score_total,
        });
        appendAssistantMessage(
          nextMessages,
          'Si querés, la marco como "Prenda recomendada" en tu armario por 48h. Respondé sí/no.',
        );
      } else if (explicitRecommendationRequest) {
        appendAssistantMessage(
          nextMessages,
          'No encontré una prenda clara para recomendar ahora. Si querés, dame ocasión y estilo para afinar.',
        );
      }

      trackStylistActionCompleted({
        action_type: response.billing?.reason || requestedAction,
        charged: response.billing?.charged || false,
        credits_used: response.billing?.credits_used || 0,
        surface: stylistSurface,
        source: 'chat',
        used_external_search: (response.billing?.reason || requestedAction) === 'external_search_enriched',
        thread_id: response.threadId || currentConversationId || null,
      });
      setStreamingMessage('');
      await subscription.refresh();
    } catch (error: any) {
      console.error('Error in AIStylistView:', error);
      trackStylistActionFailed({
        action_type: requestedAction,
        charged: false,
        credits_used: 0,
        surface: stylistSurface,
        source: 'chat',
        used_external_search: requestedAction === 'external_link_suggestions',
        thread_id: currentConversationId,
        outcome: 'failure',
      });
      const userFacingError = mapChatErrorMessageValue(error);
      if (isCreditErrorMessage(error?.message || String(error))) {
        setLimitModalSource('chat');
        setShowLimitModal(true);
      }
      appendAssistantMessage(updatedMessages, userFacingError);
      setStreamingMessage('');
    } finally {
      setIsTyping(false);
    }
  }, [
    activeRecommendation?.item_id,
    appendAssistantMessage,
    appendAssistantMessageWithPlayback,
    blockedRecommendationItemIds,
    buildStylistMemoryUpdate,
    currentConversationId,
    enrichedCloset,
    effectiveSelectedLookContext,
    entryContextPayload,
    messages,
    prepareDetectedLookGarments,
    subscription,
    stylistSurface,
    stylistContext,
    upsertStylistMemory,
    useChatWardrobeRecommendations,
    useKumbiLookExtraction,
  ]);

  const handleMessageUIAction = useCallback((msg: ChatMessage, action: ChatUIAction) => {
    trackKumbiUiActionTriggered({
      surface: stylistSurface,
      thread_id: currentConversationId || null,
      action_type: action.type,
      source: 'chat',
    });

    if (action.type === 'view_outfit') {
      const outfit = msg.outfitSuggestion;
      if (!outfit) {
        appendAssistantMessage(messages, 'Todavía no hay un outfit armado para mostrar.');
        return;
      }
      const extendedSelection = [
        outfit.top_id,
        outfit.bottom_id,
        outfit.shoes_id,
        outfit.outerwear_id,
        ...(outfit.accessory_ids || []),
      ].filter(Boolean) as string[];
      if (extendedSelection.length > 3) {
        navigate(ROUTES.STUDIO, {
          state: {
            preselectedItemIds: extendedSelection,
          },
        });
        onClose();
        return;
      }
      onViewOutfit(outfit.top_id, outfit.bottom_id, outfit.shoes_id, outfit.aiGeneratedItems);
      return;
    }

    if (action.type === 'save_to_wishlist') {
      const suggestions = msg.shoppingSuggestions || [];
      const target = action.suggestion_id
        ? suggestions.find((suggestion) => suggestion.id === action.suggestion_id)
        : suggestions[0];

      if (!target) {
        appendAssistantMessage(messages, 'No encontré la prenda para guardar en wishlist.');
        return;
      }

      void handleSaveShoppingSuggestionToWishlist(msg.id, target);
      return;
    }

    if (action.type === 'send_prompt' && action.prompt) {
      if (action.id.startsWith('look_extraction_followup_')) {
        trackKumbiLookExtractionFollowupSelected({
          surface: stylistSurface,
          thread_id: currentConversationId || null,
          followup_type: action.id === 'look_extraction_followup_variants'
            ? 'variants'
            : action.id === 'look_extraction_followup_gap_fill'
              ? 'gap_fill'
              : 'open_closet',
        });
      }
      if (action.id.startsWith('look_save_followup_')) {
        trackKumbiLookSaveFollowupSelected({
          surface: stylistSurface,
          thread_id: currentConversationId || null,
          followup_type: action.id === 'look_save_followup_variant'
            ? 'variant'
            : action.id === 'look_save_followup_occasion'
              ? 'occasion'
              : 'open_looks',
        });
      }
      void handleSend(action.prompt);
      return;
    }

    if (action.type === 'open_saved_looks' || action.type === 'open_wishlist' || action.type === 'open_closet_filtered') {
      if (action.id === 'look_extraction_followup_open_closet') {
        trackKumbiLookExtractionFollowupSelected({
          surface: stylistSurface,
          thread_id: currentConversationId || null,
          followup_type: 'open_closet',
        });
      }
      if (action.id === 'look_save_followup_open_looks') {
        trackKumbiLookSaveFollowupSelected({
          surface: stylistSurface,
          thread_id: currentConversationId || null,
          followup_type: 'open_looks',
        });
      }
      const targetRoute = action.type === 'open_saved_looks' ? ROUTES.SAVED : ROUTES.CLOSET;
      navigate(targetRoute, {
        state: {
          stylistNavigation: {
            type: action.type,
            filters: action.filters,
          },
        },
      });
      onClose();
      return;
    }

    if (action.type === 'open_recommended_item' && action.item_id) {
      navigate(ROUTES.CLOSET, {
        state: {
          stylistNavigation: {
            type: action.type,
            itemId: action.item_id,
          },
        },
      });
      onClose();
      return;
    }

    if (action.type === 'open_studio_with_selection') {
      navigate(ROUTES.STUDIO, {
        state: {
          preselectedItemIds: action.preselected_item_ids || [],
        },
      });
      onClose();
    }
  }, [
    appendAssistantMessage,
    handleSaveShoppingSuggestionToWishlist,
    messages,
    navigate,
    onViewOutfit,
    currentConversationId,
    stylistSurface,
  ]);

  const handleDetectedLookGarmentToggle = useCallback((messageId: string, itemId: string) => {
    updateChatMessage(messageId, (message) => {
      if (!message.detectedLookGarments) return message;
      return {
        ...message,
        detectedLookGarments: {
          ...message.detectedLookGarments,
          items: message.detectedLookGarments.items.map((item) => (
            item.id === itemId
              ? { ...item, selected: !item.selected }
              : item
          )),
          saveError: null,
        },
      };
    });
  }, [updateChatMessage]);

  const handleDetectedLookGarmentMetadataChange = useCallback((
    messageId: string,
    itemId: string,
    field: 'category' | 'color_primary' | 'subcategory',
    value: string,
  ) => {
    updateChatMessage(messageId, (message) => {
      if (!message.detectedLookGarments) return message;
      return {
        ...message,
        detectedLookGarments: {
          ...message.detectedLookGarments,
          items: message.detectedLookGarments.items.map((item) => (
            item.id === itemId
              ? { ...item, metadata: { ...item.metadata, [field]: value } }
              : item
          )),
          saveError: null,
        },
      };
    });
  }, [updateChatMessage]);

  const handleSaveDetectedLookGarments = useCallback(async (messageId: string) => {
    const targetMessage = messages.find((message) => message.id === messageId);
    const detectedLookGarments = targetMessage?.detectedLookGarments;
    if (!detectedLookGarments) return;

    updateChatMessage(messageId, (message) => ({
      ...message,
      detectedLookGarments: message.detectedLookGarments
        ? {
          ...message.detectedLookGarments,
          saveState: 'saving',
          saveError: null,
        }
        : undefined,
    }));

    try {
      const updatedCloset = await saveReviewedLookGarments(detectedLookGarments.items);
      const previousIds = new Set(closet.map((item) => item.id));
      updatedCloset
        .filter((item) => !previousIds.has(item.id))
        .forEach((item) => onClosetItemAdded?.(item));

      const selectedCount = detectedLookGarments.items.filter((item) => item.selected).length;

      const savedMessages = updateChatMessage(messageId, (message) => ({
        ...message,
        detectedLookGarments: message.detectedLookGarments
          ? {
            ...message.detectedLookGarments,
            saveState: 'saved',
            saveError: null,
          }
          : undefined,
      }));

      trackKumbiLookExtractionSaved({
        surface: stylistSurface,
        thread_id: currentConversationId || null,
        detected_count: detectedLookGarments.items.length,
        selected_count: selectedCount,
      });

      appendAssistantMessage(
        savedMessages,
        selectedCount === 1
          ? 'Listo, ya guardé esa prenda en tu armario. Si querés seguimos desde acá.'
          : `Listo, ya guardé ${selectedCount} prendas en tu armario. Si querés seguimos desde acá.`,
        undefined,
        undefined,
        undefined,
        undefined,
        [
          {
            id: 'look_extraction_followup_variants',
            type: 'send_prompt',
            label: 'Armame variantes con esto',
            prompt: 'Armame variantes usando las prendas que acabo de guardar desde este look.',
          },
          {
            id: 'look_extraction_followup_gap_fill',
            type: 'send_prompt',
            label: 'Qué me falta para completar el look',
            prompt: 'Decime qué me falta para completar mejor el look que acabo de guardar en mi armario.',
          },
          {
            id: 'look_extraction_followup_open_closet',
            type: 'open_closet_filtered',
            label: 'Ver mi armario',
            route: ROUTES.CLOSET,
          },
        ],
      );
    } catch (error: any) {
      updateChatMessage(messageId, (message) => ({
        ...message,
        detectedLookGarments: message.detectedLookGarments
          ? {
            ...message.detectedLookGarments,
            saveState: 'error',
            saveError: error?.message || 'No pude guardar esas prendas ahora.',
          }
          : undefined,
      }));
    }
  }, [
    appendAssistantMessage,
    closet,
    currentConversationId,
    messages,
    onClosetItemAdded,
    stylistSurface,
    updateChatMessage,
  ]);

  const handleViewReferencedItem = useCallback((itemId: string) => {
    navigate(ROUTES.CLOSET, {
      state: {
        stylistNavigation: {
          type: 'open_recommended_item',
          itemId: itemId,
        },
      },
    });
    onClose();
  }, [navigate, onClose]);

  const handleUseReferencedItemInLook = useCallback((itemId: string) => {
    navigate(ROUTES.STUDIO, {
      state: {
        preselectedItemIds: [itemId],
      },
    });
    onClose();
  }, [navigate, onClose]);

  const handleOpenClosetFromReferencedItem = useCallback((item: ClothingItem) => {
    const rawCategory = item.metadata?.category;
    const category = rawCategory === 'top' || rawCategory === 'bottom' || rawCategory === 'shoes'
      ? rawCategory
      : undefined;

    navigate(ROUTES.CLOSET, {
      state: {
        stylistNavigation: {
          type: 'open_closet_filtered',
          filters: {
            category,
          },
        },
      },
    });
    onClose();
  }, [navigate, onClose]);

  const handleStartSaveLookDraft = useCallback((
    messageId: string,
    outfitOverride?: ChatMessage['outfitSuggestion'],
  ) => {
    const message = messages.find((entry) => entry.id === messageId);
    const outfit = outfitOverride || message?.outfitSuggestion;
    if (!outfit?.top_id || !outfit.bottom_id || !outfit.shoes_id) return;
    if (message.saveLookDraft) return;

    trackKumbiLookSaveStarted({
      surface: stylistSurface,
      thread_id: currentConversationId || null,
      look_goal: outfit.look_goal || undefined,
    });

    updateChatMessage(messageId, (currentMessage) => ({
      ...currentMessage,
      saveLookDraft: deriveSaveLookDraft({
        outfit: outfit,
        assistantContent: currentMessage.content,
        surface: stylistSurface,
        suggestedOccasion: stylistContext.occasion || null,
      }),
    }));
  }, [
    currentConversationId,
    messages,
    stylistContext.occasion,
    stylistSurface,
    updateChatMessage,
  ]);

  const handleSaveLookDraftChange = useCallback((
    messageId: string,
    patch: Partial<NonNullable<ChatMessage['saveLookDraft']>>,
  ) => {
    updateChatMessage(messageId, (message) => {
      if (!message.saveLookDraft) return message;
      return {
        ...message,
        saveLookDraft: {
          ...message.saveLookDraft,
          ...patch,
        },
      };
    });
  }, [updateChatMessage]);

  const handleCancelSaveLookDraft = useCallback((messageId: string) => {
    updateChatMessage(messageId, (message) => ({
      ...message,
      saveLookDraft: undefined,
    }));
  }, [updateChatMessage]);

  const handleConfirmSaveLookDraft = useCallback(async (messageId: string) => {
    const message = messages.find((entry) => entry.id === messageId);
    const draft = message?.saveLookDraft;
    const outfit = draft?.outfitSuggestion || message?.outfitSuggestion;
    if (!outfit?.top_id || !outfit.bottom_id || !outfit.shoes_id || !draft || draft.status === 'saved' || draft.status === 'saving') {
      return;
    }

    updateChatMessage(messageId, (currentMessage) => ({
      ...currentMessage,
      saveLookDraft: currentMessage.saveLookDraft
        ? {
          ...currentMessage.saveLookDraft,
          status: 'saving',
          error: null,
        }
        : undefined,
    }));

    try {
      trackStylistActionRequested({
        action_type: 'saved_look_creation',
        charged: false,
        credits_used: 0,
        surface: stylistSurface,
        source: 'chat',
        thread_id: currentConversationId,
      });

      const saved = await saveOutfit({
        top_id: outfit.top_id,
        bottom_id: outfit.bottom_id,
        shoes_id: outfit.shoes_id,
        explanation: outfit.explanation || 'Look sugerido por el estilista',
        name: draft.name.trim() || 'Look de Kumbi',
        description: draft.note?.trim() || null,
        occasion: draft.occasion?.trim() || null,
        styleNotes: outfit.styling_notes?.join(' · ') || null,
        weatherContext: stylistContext.weatherContext || null,
        source: outfit.look_goal === 'reference_recreation' ? 'reference_recreation' : 'ai_recommendation',
        aiGenerated: false,
        chatThreadId: currentConversationId || null,
        heroItemId: outfit.top_id,
        folderId: draft.folderId || null,
        tags: draft.tags.slice(0, 3),
        referenceSummary: outfit.look_goal === 'reference_recreation'
          ? 'Look recreado desde una referencia visual en chat.'
          : null,
        contextJson: {
          look_goal: outfit.look_goal || null,
          similarity_score: outfit.similarity_score ?? null,
          styling_notes: outfit.styling_notes || [],
          active_recommendation_item_id: stylistContext.activeRecommendationItemId || null,
          recent_look_ids: stylistContext.recentLookIds,
          saved_look_context: stylistContext.savedLookContext,
          extra_item_ids: [
            outfit.outerwear_id,
            ...(outfit.accessory_ids || []),
          ].filter(Boolean),
        },
      });

      onOutfitSaved?.(saved);
      const nextMessages = updateChatMessage(messageId, (currentMessage) => ({
        ...currentMessage,
        saveLookDraft: currentMessage.saveLookDraft
          ? {
            ...currentMessage.saveLookDraft,
            status: 'saved',
            error: null,
          }
          : undefined,
      }));

      trackStylistActionCompleted({
        action_type: 'saved_look_creation',
        charged: false,
        credits_used: 0,
        surface: stylistSurface,
        source: 'chat',
        thread_id: currentConversationId,
      });
      trackKumbiLookSaveCompleted({
        surface: stylistSurface,
        thread_id: currentConversationId || null,
        look_goal: outfit.look_goal || undefined,
        folder_id: draft.folderId || null,
        tag_count: draft.tags.length,
      });

      appendAssistantMessage(
        nextMessages,
        'Listo, ese look ya quedó guardado en tu biblioteca. Si querés, sigo desde acá.',
        undefined,
        undefined,
        undefined,
        undefined,
        [
          {
            id: 'look_save_followup_variant',
            type: 'send_prompt',
            label: 'Armame una variante',
            prompt: 'Armame una variante nueva a partir del look que acabo de guardar.',
          },
          {
            id: 'look_save_followup_occasion',
            type: 'send_prompt',
            label: 'Adaptalo a otra ocasión',
            prompt: 'Tomá el look que acabo de guardar y adaptalo a otra ocasión.',
          },
          {
            id: 'look_save_followup_open_looks',
            type: 'open_saved_looks',
            label: 'Abrir Looks',
            route: ROUTES.SAVED,
          },
        ],
      );
    } catch (error: any) {
      console.error('Error saving recommended look:', error);
      trackStylistActionFailed({
        action_type: 'saved_look_creation',
        charged: false,
        credits_used: 0,
        surface: stylistSurface,
        source: 'chat',
        thread_id: currentConversationId,
        outcome: 'failure',
      });
      trackKumbiLookSaveFailed({
        surface: stylistSurface,
        thread_id: currentConversationId || null,
        look_goal: outfit.look_goal || undefined,
      });
      updateChatMessage(messageId, (currentMessage) => ({
        ...currentMessage,
        saveLookDraft: currentMessage.saveLookDraft
          ? {
            ...currentMessage.saveLookDraft,
            status: 'error',
            error: error?.message || 'No pude guardar este look ahora. Reintentá en unos segundos.',
          }
          : undefined,
      }));
    }
  }, [
    appendAssistantMessage,
    currentConversationId,
    messages,
    onOutfitSaved,
    stylistContext,
    stylistSurface,
    updateChatMessage,
  ]);

  const resolveLookCategory = useCallback((): 'top' | 'bottom' | 'shoes' => {
    const rawCategory = lookCreation.category || lookCreation.generatedItem?.metadata?.category;
    if (rawCategory === 'top' || rawCategory === 'bottom' || rawCategory === 'shoes') {
      return rawCategory;
    }
    const normalized = String(rawCategory || '').toLowerCase();
    if (/calzado|shoe|zapat|bota|zapato/.test(normalized)) return 'shoes';
    if (/bottom|pantal|jean|falda|pollera|short/.test(normalized)) return 'bottom';
    return 'top';
  }, [lookCreation.category, lookCreation.generatedItem?.metadata?.category]);

  const inferDelegatedLookCategory = useCallback((text: string): 'top' | 'bottom' | 'shoes' => {
    const normalized = (text || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    if (/(con|para).*(top|remera|camisa|blusa|camiseta)/.test(normalized)) return 'bottom';
    if (/(con|para).*(pantalon|jean|falda|pollera|short|bottom)/.test(normalized)) return 'top';
    if (/(con|para).*(zapatillas|zapas|zapatos|botas|calzado|shoes)/.test(normalized)) return 'top';

    const counts = { top: 0, bottom: 0, shoes: 0 };
    enrichedCloset.forEach((item) => {
      const categoryRaw = `${item.metadata?.category || ''} ${item.metadata?.subcategory || ''}`.toLowerCase();
      if (/shoe|calzado|zapat|bota|sandalia/.test(categoryRaw)) counts.shoes += 1;
      else if (/bottom|pantal|jean|falda|pollera|short/.test(categoryRaw)) counts.bottom += 1;
      else if (/top|remera|camisa|blusa|hoodie|buzo|sweater|campera|jacket/.test(categoryRaw)) counts.top += 1;
    });

    if (counts.top > 0 && counts.bottom === 0) return 'bottom';
    if (counts.top > 0 && counts.bottom > 0 && counts.shoes === 0) return 'shoes';
    return counts.top <= counts.bottom ? 'top' : 'bottom';
  }, [enrichedCloset]);

  const buildSmartCategoryQuestion = useCallback((text: string) => {
    const suggestedCategory = inferDelegatedLookCategory(text);
    return `${getLookFieldQuestion('category')} Mi sugerencia: ${getCategoryLabel(suggestedCategory).toLowerCase()}.`;
  }, [inferDelegatedLookCategory]);

  const withTimeout = useCallback(async <T,>(promise: Promise<T>, timeoutMs: number) => {
    return await new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Request timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      promise
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }, []);

  const readFileAsDataUrl = useCallback((file: File): Promise<string> => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(file);
    });
  }, []);

  const openImagePreview = useCallback((
    src: string,
    title: string,
    fileName: string,
  ) => {
    setImagePreview({ src, title, fileName });
  }, []);

  const handlePreviewDownload = useCallback(() => {
    if (!imagePreview) return;

    try {
      const link = document.createElement('a');
      link.href = imagePreview.src;
      link.download = imagePreview.fileName;
      link.click();
    } catch (error) {
      console.error('No se pudo descargar la imagen del chat:', error);
      toast.error('No pude preparar la imagen para descargar.');
    }
  }, [imagePreview]);

  const handleLookAttachmentUpload = useCallback(async (
    event: React.ChangeEvent<HTMLInputElement>,
    attachmentKind: ChatAttachmentKind,
    options: {
      defaultPrompt?: string;
      referenceMode?: ReferenceAttachmentMode | null;
    } = {},
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const imageDataUrl = await readFileAsDataUrl(file);
      setPendingAttachments([{ kind: attachmentKind, imageDataUrl }]);
      setPendingAttachmentPrompt(options.defaultPrompt || DEFAULT_ATTACHMENT_PROMPTS[attachmentKind]);
      setPendingReferenceAttachmentMode(attachmentKind === 'reference_look' ? options.referenceMode || null : null);
      setShowAttachmentMenu(false);
      if (!inputValue.trim()) {
        setInputValue(options.defaultPrompt || DEFAULT_ATTACHMENT_PROMPTS[attachmentKind]);
      }
    } catch (error: any) {
      appendAssistantMessage(
        messages,
        attachmentKind === 'extractable_look'
          ? `No pude cargar la foto del look para guardar prendas: ${error?.message || 'error inesperado'}`
          : `No pude cargar la referencia visual: ${error?.message || 'error inesperado'}`,
      );
    } finally {
      event.target.value = '';
    }
  }, [appendAssistantMessage, inputValue, messages, readFileAsDataUrl]);

  const handleReferenceLookUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    await handleLookAttachmentUpload(event, 'reference_look', {
      defaultPrompt: DEFAULT_ATTACHMENT_PROMPTS.reference_look,
      referenceMode: 'recreate',
    });
  }, [handleLookAttachmentUpload]);

  const handleReferenceFeedbackUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    await handleLookAttachmentUpload(event, 'reference_look', {
      defaultPrompt: REFERENCE_LOOK_FEEDBACK_PROMPT,
      referenceMode: 'feedback',
    });
  }, [handleLookAttachmentUpload]);

  const handleExtractableLookUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    await handleLookAttachmentUpload(event, 'extractable_look');
  }, [handleLookAttachmentUpload]);

  const clearPendingAttachment = useCallback(() => {
    const defaultPrompt = pendingAttachmentPrompt || getDefaultPromptForAttachments(pendingAttachments);
    setPendingAttachments([]);
    setPendingAttachmentPrompt(null);
    setPendingReferenceAttachmentMode(null);
    if (defaultPrompt && inputValue.trim() === defaultPrompt) {
      setInputValue('');
    }
  }, [inputValue, pendingAttachmentPrompt, pendingAttachments]);

  const syncLookCreationFromWorkflow = useCallback((workflow: GuidedLookWorkflowResponse | null) => {
    if (!workflow) return;

    setGuidedWorkflow(workflow);
    setGuidedAutosaveEnabled(workflow.autosaveEnabled);

    const mappedStatus = mapGuidedStatusToLookCreationStatus(workflow.status);

    const generatedItem = workflow.generatedItem as ClothingItem | null | undefined;
    if (generatedItem) {
      setGeneratedClosetItems((prev) => {
        const withoutDuplicated = prev.filter((item) => item.id !== generatedItem.id);
        return [generatedItem, ...withoutDuplicated];
      });
    }

    setLookCreation((prev) => ({
      ...prev,
      status: mappedStatus,
      occasion: workflow.collected?.occasion || prev.occasion,
      style: workflow.collected?.style || prev.style,
      category: workflow.collected?.category || prev.category,
      requestText: workflow.collected?.requestText || prev.requestText,
      awaitingField: workflow.missingFields?.[0] as MissingLookField | undefined,
      generatedItem: generatedItem || prev.generatedItem,
      generatedImageUrl: generatedItem?.imageDataUrl || prev.generatedImageUrl,
      generatedPrompt: generatedItem?.aiGenerationPrompt || prev.generatedPrompt,
      savedToCloset: Boolean((generatedItem as any)?.saved_to_closet) || prev.savedToCloset,
    }));

    const isEditConfirmation = workflow.status === 'confirming' && workflow.pendingAction === 'edit';
    if (workflow.status === 'editing' || isEditConfirmation) {
      setGarmentEdit({
        status: workflow.status === 'editing' ? 'editing' : 'confirming',
        instruction: workflow.editInstruction || '',
      });
    } else if (workflow.pendingAction !== 'edit') {
      setGarmentEdit(null);
    }

    if (workflow.status === 'tryon_confirming') {
      setTryOn((prev) => ({
        ...prev,
        status: 'confirming',
      }));
    } else if (workflow.status === 'tryon_generating') {
      setTryOn((prev) => ({
        ...prev,
        status: 'generating',
      }));
    } else if (workflow.tryOnResultImageUrl) {
      setTryOn((prev) => ({
        ...prev,
        status: 'result',
        resultImageUrl: workflow.tryOnResultImageUrl || prev.resultImageUrl,
      }));
    } else if (workflow.pendingAction !== 'tryon' && workflow.status === 'generated') {
      setTryOn((prev) => ({
        ...prev,
        status: prev.selfieImageDataUrl ? 'ready' : 'idle',
      }));
    }
  }, []);

  const runGuidedWorkflowAction = useCallback(async (
    action:
      | 'start'
      | 'submit'
      | 'select_strategy'
      | 'confirm_generate'
      | 'confirm_edit'
      | 'confirm_tryon'
      | 'cancel'
      | 'toggle_autosave'
      | 'request_outfit'
      | 'request_edit'
      | 'upload_selfie'
      | 'request_tryon'
      | 'save_generated_item',
    baseMessages: ChatMessage[],
    payload: {
      message?: string;
      strategy?: 'direct' | 'guided';
      occasion?: string;
      style?: string;
      category?: 'top' | 'bottom' | 'shoes';
      confirmationToken?: string;
      autosaveEnabled?: boolean;
      editInstruction?: string;
      selfieImageDataUrl?: string;
    } = {},
  ) => {
    const startAt = Date.now();
    const previousWorkflow = guidedWorkflow;

    if (action === 'confirm_generate') {
      setLookCreation((prev) => ({ ...prev, status: 'generating' }));
    }
    if (action === 'confirm_edit') {
      setGarmentEdit((prev) => prev ? { ...prev, status: 'editing' } : { status: 'editing', instruction: payload.editInstruction || '' });
    }
    if (action === 'confirm_tryon') {
      setTryOn((prev) => ({ ...prev, status: 'generating' }));
    }

    setIsTyping(true);
    setStreamingMessage('');

    try {
      const response = await chatWithFashionAssistantWorkflow(
        payload.message || '',
        enrichedCloset,
        baseMessages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        {
          mode: 'guided_look_creation',
          sessionId: guidedWorkflow?.sessionId || null,
          action,
          payload,
        },
      );

      const workflow = response.workflow || null;
      syncLookCreationFromWorkflow(workflow);
      if (response.content) {
        await appendAssistantMessageWithPlayback(
          baseMessages,
          response.content,
          response.outfitSuggestion || undefined,
          undefined,
          undefined,
          response.billing,
          response.shoppingSuggestions || undefined,
          response.uiActions || undefined,
          response.referencedItems || undefined,
        );
        setIsTyping(false);
      }

      if (workflow?.sessionId && previousWorkflow?.sessionId === workflow.sessionId) {
        if (!previousWorkflow.collected?.occasion && workflow.collected?.occasion) {
          trackGuidedLookFieldCompleted({
            session_id: workflow.sessionId,
            field: 'occasion',
            strategy: workflow.strategy || undefined,
            occasion: workflow.collected.occasion,
            category: workflow.collected.category,
            style: workflow.collected.style,
          });
        }
        if (!previousWorkflow.collected?.style && workflow.collected?.style) {
          trackGuidedLookFieldCompleted({
            session_id: workflow.sessionId,
            field: 'style',
            strategy: workflow.strategy || undefined,
            occasion: workflow.collected.occasion,
            category: workflow.collected.category,
            style: workflow.collected.style,
          });
        }
        if (!previousWorkflow.collected?.category && workflow.collected?.category) {
          trackGuidedLookFieldCompleted({
            session_id: workflow.sessionId,
            field: 'category',
            strategy: workflow.strategy || undefined,
            occasion: workflow.collected.occasion,
            category: workflow.collected.category,
            style: workflow.collected.style,
          });
        }
      }

      if (action === 'start' && workflow?.sessionId) {
        trackGuidedLookStart({ session_id: workflow.sessionId });
      }

      if (
        workflow?.sessionId
        && workflow.strategy
        && workflow.strategy !== previousWorkflow?.strategy
      ) {
        trackGuidedLookModeSelected({
          session_id: workflow.sessionId,
          strategy: workflow.strategy,
          category: workflow.collected.category,
          occasion: workflow.collected.occasion,
          style: workflow.collected.style,
        });
      }

      if (workflow?.sessionId && workflow.requiresConfirmation) {
        trackGuidedLookCostShown({
          session_id: workflow.sessionId,
          strategy: workflow.strategy || undefined,
          operation: workflow.pendingAction || undefined,
          category: workflow.collected.category,
          occasion: workflow.collected.occasion,
          style: workflow.collected.style,
          credits_charged: workflow.estimatedCostCredits,
        });
      }

      if (
        workflow?.sessionId
        && (action === 'confirm_generate' || action === 'confirm_edit' || action === 'confirm_tryon')
      ) {
        trackGuidedLookConfirmed({
          session_id: workflow.sessionId,
          strategy: workflow.strategy || undefined,
          operation: action === 'confirm_tryon' ? 'tryon' : action === 'confirm_edit' ? 'edit' : 'generate',
          category: workflow.collected.category,
          occasion: workflow.collected.occasion,
          style: workflow.collected.style,
          credits_charged: workflow.estimatedCostCredits,
        });
      }

      if (
        workflow?.sessionId
        && workflow.status === 'generated'
        && (action === 'confirm_generate' || action === 'confirm_edit' || action === 'confirm_tryon')
        && !workflow.errorCode
      ) {
        const operation = action === 'confirm_tryon' ? 'tryon' : action === 'confirm_edit' ? 'edit' : 'generate';
        trackGuidedLookGenerationSuccess({
          session_id: workflow.sessionId,
          strategy: workflow.strategy || undefined,
          operation,
          category: workflow.collected.category,
          occasion: workflow.collected.occasion,
          style: workflow.collected.style,
          credits_charged: response.credits_used || 0,
          latency_ms: Date.now() - startAt,
        });
        if (operation === 'tryon') {
          trackGuidedLookTryOn({
            session_id: workflow.sessionId,
            strategy: workflow.strategy || undefined,
            operation: 'tryon',
            category: workflow.collected.category,
            occasion: workflow.collected.occasion,
            style: workflow.collected.style,
            credits_charged: response.credits_used || 0,
            latency_ms: Date.now() - startAt,
          });
          trackVirtualTryOn();
        }
      }

      if (
        workflow?.sessionId
        && action === 'save_generated_item'
        && Boolean((workflow.generatedItem as any)?.saved_to_closet)
      ) {
        trackGuidedLookSaved({
          session_id: workflow.sessionId,
          strategy: workflow.strategy || undefined,
          category: workflow.collected.category,
          occasion: workflow.collected.occasion,
          style: workflow.collected.style,
        });
      }

      if (workflow?.errorCode) {
        trackGuidedLookGenerationError({
          session_id: workflow.sessionId,
          strategy: workflow.strategy || undefined,
          operation: workflow.pendingAction || undefined,
          category: workflow.collected.category,
          occasion: workflow.collected.occasion,
          style: workflow.collected.style,
          error_code: workflow.errorCode,
          latency_ms: Date.now() - startAt,
          credits_charged: response.credits_used || 0,
        });
        if (workflow.errorCode === 'INSUFFICIENT_CREDITS') {
          setLimitModalSource('guided');
          setShowLimitModal(true);
        }
        const workflowErrorMessage = getGuidedLookErrorMessage(workflow.errorCode);
        if (workflowErrorMessage && !response.content) {
          appendAssistantMessage(baseMessages, workflowErrorMessage);
        }
      }

      await subscription.refresh();
    } catch (error: any) {
      console.error('Error in guided look workflow:', error);
      const userFacingError = mapLookCreationErrorMessageValue(error);
      appendAssistantMessage(baseMessages, userFacingError);
      if (isCreditErrorMessage(error?.message || String(error))) {
        setLimitModalSource('guided');
        setShowLimitModal(true);
        if (guidedWorkflow?.sessionId) {
          trackGuidedLookGenerationError({
            session_id: guidedWorkflow.sessionId,
            error_code: 'INSUFFICIENT_CREDITS',
            latency_ms: Date.now() - startAt,
          });
        }
      }
    } finally {
      setIsTyping(false);
    }
  }, [
    appendAssistantMessage,
    appendAssistantMessageWithPlayback,
    enrichedCloset,
    guidedWorkflow,
    messages,
    subscription,
    syncLookCreationFromWorkflow,
  ]);

  const requestGarmentEditConfirmation = useCallback((baseMessages: ChatMessage[], instruction: string) => {
    const cleanedInstruction = instruction.trim();
    if (!cleanedInstruction) {
      appendAssistantMessage(baseMessages, 'Contame qué cambio querés aplicar en la prenda. Ej: "cambiar a negro mate" o "agregar estampa floral".');
      return;
    }

    setGarmentEdit({
      status: 'confirming',
      instruction: cleanedInstruction,
    });

    appendAssistantMessage(
      baseMessages,
      `Perfecto. Puedo modificar esta prenda con IA aplicando: "${cleanedInstruction}". Esta edición cuesta ${LOOK_EDIT_CREDIT_COST} usos premium. ¿Confirmás?`,
    );
  }, [appendAssistantMessage]);

  const runGarmentEditGeneration = useCallback(async (baseMessages: ChatMessage[], instruction: string) => {
    if (!lookCreation.generatedItem) {
      appendAssistantMessage(baseMessages, 'Primero necesito una prenda generada para poder modificarla.');
      return;
    }

    const category = resolveLookCategory();
    const basePrompt = lookCreation.generatedPrompt
      || lookCreation.generatedItem.aiGenerationPrompt
      || lookCreation.generatedItem.metadata?.description
      || lookCreation.requestText
      || '';
    const editPrompt = buildGarmentEditPrompt(
      {
        occasion: lookCreation.occasion,
        style: lookCreation.style,
        category,
        requestText: lookCreation.requestText,
      },
      instruction,
      basePrompt,
    );

    setGarmentEdit({
      status: 'editing',
      instruction,
    });
    setIsTyping(true);
    setStreamingMessage('');

    try {
      const generationResult = await withTimeout(
        aiImageService.generateFashionImage(editPrompt, {
          category,
          occasion: lookCreation.occasion,
        }),
        90000,
      );

      if (!generationResult.success || !generationResult.image_url) {
        throw new Error(generationResult.error || 'No se pudo generar la edición');
      }

      const sourceMetadata = lookCreation.generatedItem.metadata || ({} as ClothingItem['metadata']);
      const editedItem: ClothingItem = {
        id: `ai_chat_edit_${Date.now()}`,
        imageDataUrl: generationResult.image_url,
        metadata: {
          category,
          subcategory: sourceMetadata.subcategory || `Prenda IA - ${getCategoryLabel(category)}`,
          color_primary: sourceMetadata.color_primary || '#000000',
          vibe_tags: Array.from(new Set([...(sourceMetadata.vibe_tags || []), 'ai-generated', 'edited'])),
          seasons: sourceMetadata.seasons?.length
            ? sourceMetadata.seasons
            : ['spring', 'summer', 'fall', 'winter'],
          description: editPrompt,
        },
        isAIGenerated: true,
        aiGenerationPrompt: editPrompt,
      };

      setGeneratedClosetItems((prev) => [editedItem, ...prev]);
      setLookCreation((prev) => ({
        ...prev,
        status: 'result',
        category,
        generatedImageUrl: generationResult.image_url,
        generatedPrompt: editPrompt,
        generatedItem: editedItem,
        savedToCloset: false,
      }));
      setTryOn((prev) => ({
        ...prev,
        status: prev.selfieImageDataUrl ? 'ready' : 'idle',
        resultImageUrl: undefined,
      }));
      setGarmentEdit(null);

      appendAssistantMessage(
        baseMessages,
        `¡Listo! Apliqué la modificación a tu prenda (${instruction}). Si querés, ahora podés guardarla o probarla con una selfie.`,
      );
      await subscription.refresh();
    } catch (error: any) {
      console.error('Error editing generated garment:', error);
      const userFacingError = mapLookCreationErrorMessageValue(error);
      if (isCreditErrorMessage(error?.message || String(error))) {
        setLimitModalSource('edit');
        setShowLimitModal(true);
      }
      appendAssistantMessage(baseMessages, userFacingError);
      setGarmentEdit({
        status: 'confirming',
        instruction,
      });
    } finally {
      setIsTyping(false);
    }
  }, [
    appendAssistantMessage,
    lookCreation.generatedItem,
    lookCreation.generatedPrompt,
    lookCreation.occasion,
    lookCreation.requestText,
    lookCreation.style,
    resolveLookCategory,
    subscription,
    withTimeout,
  ]);

  const runTryOnGeneration = useCallback(async (baseMessages: ChatMessage[]) => {
    if (!lookCreation.generatedItem || !tryOn.selfieImageDataUrl) {
      appendAssistantMessage(baseMessages, 'Necesito una selfie y una prenda generada para ejecutar el probador virtual.');
      return;
    }

    const category = resolveLookCategory();
    const slot = mapLookCategoryToTryOnSlot(category);
    const slots: Record<string, string> = {
      [slot]: lookCreation.generatedItem.imageDataUrl,
    };

    setTryOn((prev) => ({
      ...prev,
      status: 'generating',
    }));
    setIsTyping(true);
    setStreamingMessage('');

    try {
      const tryOnResult = await withTimeout(
        generateVirtualTryOnWithSlots(tryOn.selfieImageDataUrl, slots, {
          preset: 'mirror_selfie',
          quality: 'pro',
          keepPose: true,
          useFaceReferences: true,
          view: 'front',
          slotFits: {
            [slot]: 'regular',
          },
        }),
        120000,
      );

      setTryOn((prev) => ({
        ...prev,
        status: 'result',
        resultImageUrl: tryOnResult.resultImage,
      }));
      appendAssistantMessage(baseMessages, '¡Listo! Te mostré cómo queda la prenda en tu selfie.');
      trackVirtualTryOn();
      await subscription.refresh();
    } catch (error: any) {
      console.error('Error generating try-on from chat:', error);
      const userFacingError = mapTryOnErrorMessageValue(error);
      if (isCreditErrorMessage(error?.message || String(error))) {
        setLimitModalSource('tryon');
        setShowLimitModal(true);
      }
      appendAssistantMessage(baseMessages, userFacingError);
      setTryOn((prev) => ({
        ...prev,
        status: prev.selfieImageDataUrl ? 'ready' : 'idle',
      }));
    } finally {
      setIsTyping(false);
    }
  }, [
    appendAssistantMessage,
    lookCreation.generatedItem,
    resolveLookCategory,
    subscription,
    tryOn.selfieImageDataUrl,
    withTimeout,
  ]);

  const runDirectLookGeneration = useCallback(async (
    baseMessages: ChatMessage[],
    choice: HybridLookChoiceState,
  ) => {
    const category = (choice.parsed.category || 'top') as 'top' | 'bottom' | 'shoes';
    const occasion = choice.parsed.occasion || 'uso diario';
    const style = choice.parsed.style || 'casual';
    const draft: LookCreationDraft = {
      requestText: choice.requestText,
      category,
      occasion,
      style,
    };

    setLookCreation({
      ...draft,
      status: 'generating',
      awaitingField: undefined,
    });
    setIsTyping(true);
    setStreamingMessage('');

    try {
      const generationPrompt = buildLookCreationPrompt(draft);
      const generationResult = await withTimeout(
        aiImageService.generateFashionImage(generationPrompt, {
          category,
          occasion,
        }),
        90000,
      );

      if (!generationResult.success || !generationResult.image_url) {
        throw new Error(generationResult.error || 'No se pudo generar la imagen');
      }

      const generatedItem: ClothingItem = {
        id: `ai_chat_direct_${Date.now()}`,
        imageDataUrl: generationResult.image_url,
        metadata: {
          category,
          subcategory: `Prenda IA - ${getCategoryLabel(category)}`,
          color_primary: '#000000',
          vibe_tags: ['ai-generated', style, 'nano-banana-flow'],
          seasons: ['spring', 'summer', 'fall', 'winter'],
          description: generationPrompt,
        },
        isAIGenerated: true,
        aiGenerationPrompt: generationPrompt,
      };

      setGeneratedClosetItems((prev) => [generatedItem, ...prev]);
      setLookCreation({
        ...draft,
        status: 'result',
        generatedImageUrl: generationResult.image_url,
        generatedPrompt: generationPrompt,
        generatedItem,
        savedToCloset: false,
      });
      setStylistTask(null);

      appendAssistantMessage(
        baseMessages,
        `Listo. Lo resolví en modo directo (chat + generación IA) y consumió ${LOOK_CREATION_CREDIT_COST} usos de generación. Si querés, ahora la guardamos en tu armario o armamos outfit completo.`,
      );
      await subscription.refresh();
    } catch (error: any) {
      console.error('Error generating direct look from chat:', error);
      const userFacingError = mapLookCreationErrorMessageValue(error);
      if (isCreditErrorMessage(error?.message || String(error))) {
        setLimitModalSource('chat');
        setShowLimitModal(true);
      }
      appendAssistantMessage(baseMessages, userFacingError);
      setLookCreation({ status: 'idle' });
    } finally {
      setIsTyping(false);
    }
  }, [
    appendAssistantMessage,
    subscription,
    withTimeout,
  ]);

  const beginUserTurn = useCallback((trimmedText: string, attachments: ChatAttachment[] = []) => {
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: trimmedText,
      timestamp: Date.now(),
      attachments: attachments.length > 0 ? attachments : undefined,
    };

    const updatedMessages = [...messages, userMessage];
    onMessagesUpdate(updatedMessages);
    setInputValue('');
    setPendingAttachments([]);
    setPendingAttachmentPrompt(null);
    setPendingReferenceAttachmentMode(null);
    setShowAttachmentMenu(false);
    setStreamingMessage('');

    if (messages.filter((m) => m.role === 'user').length === 0) {
      const title = trimmedText.slice(0, 40) + (trimmedText.length > 40 ? '...' : '');
      onUpdateTitle(title);
    }

    return updatedMessages;
  }, [messages, onMessagesUpdate, onUpdateTitle]);

  const handlePrepareGarmentEditFromInput = useCallback(async () => {
    if (!lookCreation.generatedItem || isTyping) return;
    const cleanedInstruction = editInstructionInput.trim();
    if (!cleanedInstruction) {
      appendAssistantMessage(messages, 'Contame qué cambio querés aplicar en la prenda. Ej: "cambiar a negro mate" o "agregar estampa floral".');
      return;
    }

    if (useGuidedLookBackend && guidedWorkflow?.sessionId) {
      const updatedMessages = beginUserTurn(cleanedInstruction);
      await runGuidedWorkflowAction('request_edit', updatedMessages, {
        message: cleanedInstruction,
        editInstruction: cleanedInstruction,
      });
      setEditInstructionInput('');
      return;
    }

    requestGarmentEditConfirmation(messages, cleanedInstruction);
    setEditInstructionInput('');
  }, [
    appendAssistantMessage,
    beginUserTurn,
    editInstructionInput,
    guidedWorkflow?.sessionId,
    isTyping,
    lookCreation.generatedItem,
    messages,
    requestGarmentEditConfirmation,
    runGuidedWorkflowAction,
    useGuidedLookBackend,
  ]);

  const handleConfirmGarmentEdit = useCallback(async () => {
    if (!garmentEdit || garmentEdit.status !== 'confirming' || isTyping) return;
    if (useGuidedLookBackend && guidedWorkflow?.sessionId) {
      const updatedMessages = beginUserTurn('Confirmar edición de la prenda');
      await runGuidedWorkflowAction('confirm_edit', updatedMessages, {
        message: 'confirmo',
        confirmationToken: guidedWorkflow.confirmationToken || undefined,
      });
      return;
    }
    await runGarmentEditGeneration(messages, garmentEdit.instruction);
  }, [
    beginUserTurn,
    garmentEdit,
    guidedWorkflow,
    isTyping,
    messages,
    runGarmentEditGeneration,
    runGuidedWorkflowAction,
    useGuidedLookBackend,
  ]);

  const handleCancelGarmentEdit = useCallback(async () => {
    if (!garmentEdit || isTyping) return;
    if (useGuidedLookBackend && guidedWorkflow?.sessionId) {
      const updatedMessages = beginUserTurn('Cancelar edición de la prenda');
      await runGuidedWorkflowAction('cancel', updatedMessages, { message: 'cancelar' });
      return;
    }
    setGarmentEdit(null);
    appendAssistantMessage(messages, 'Perfecto, cancelé la edición de la prenda.');
  }, [
    appendAssistantMessage,
    beginUserTurn,
    garmentEdit,
    guidedWorkflow?.sessionId,
    isTyping,
    messages,
    runGuidedWorkflowAction,
    useGuidedLookBackend,
  ]);

  const handleSelfieUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setTryOn({
        status: 'ready',
        selfieImageDataUrl: dataUrl,
      });
      if (useGuidedLookBackend && guidedWorkflow?.sessionId) {
        const updatedMessages = beginUserTurn('Subí una selfie para el probador');
        await runGuidedWorkflowAction('upload_selfie', updatedMessages, {
          message: 'selfie cargada',
          selfieImageDataUrl: dataUrl,
        });
      } else {
        appendAssistantMessage(messages, `Selfie cargada. El probador virtual cuesta ${TRY_ON_CREDIT_COST} usos premium cuando confirmes.`);
      }
    } catch (error: any) {
      appendAssistantMessage(messages, `No pude cargar la selfie: ${error?.message || 'error inesperado'}`);
    } finally {
      event.target.value = '';
    }
  }, [
    appendAssistantMessage,
    beginUserTurn,
    guidedWorkflow?.sessionId,
    messages,
    readFileAsDataUrl,
    runGuidedWorkflowAction,
    useGuidedLookBackend,
  ]);

  const handlePrepareTryOn = useCallback(async () => {
    if (!lookCreation.generatedItem || isTyping) return;
    if (!tryOn.selfieImageDataUrl) {
      appendAssistantMessage(messages, 'Primero subí una selfie para poder probarte la prenda.');
      selfieInputRef.current?.click();
      return;
    }

    if (useGuidedLookBackend && guidedWorkflow?.sessionId) {
      const updatedMessages = beginUserTurn('Quiero probarme esta prenda');
      await runGuidedWorkflowAction('request_tryon', updatedMessages, {
        message: 'probar en mí',
        selfieImageDataUrl: tryOn.selfieImageDataUrl,
      });
      return;
    }

    setTryOn((prev) => ({
      ...prev,
      status: 'confirming',
    }));
    appendAssistantMessage(messages, `El probador virtual cuesta ${TRY_ON_CREDIT_COST} usos premium. ¿Confirmás que lo genere ahora?`);
  }, [
    appendAssistantMessage,
    beginUserTurn,
    guidedWorkflow?.sessionId,
    isTyping,
    lookCreation.generatedItem,
    messages,
    runGuidedWorkflowAction,
    tryOn.selfieImageDataUrl,
    useGuidedLookBackend,
  ]);

  const handleConfirmTryOn = useCallback(async () => {
    if (isTyping || tryOn.status !== 'confirming') return;
    if (useGuidedLookBackend && guidedWorkflow?.sessionId) {
      const updatedMessages = beginUserTurn('Confirmar probador virtual');
      await runGuidedWorkflowAction('confirm_tryon', updatedMessages, {
        message: 'confirmo',
        confirmationToken: guidedWorkflow.confirmationToken || undefined,
      });
      return;
    }
    await runTryOnGeneration(messages);
  }, [
    beginUserTurn,
    guidedWorkflow,
    isTyping,
    messages,
    runGuidedWorkflowAction,
    runTryOnGeneration,
    tryOn.status,
    useGuidedLookBackend,
  ]);

  const handleCancelTryOn = useCallback(async () => {
    if (isTyping) return;
    if (useGuidedLookBackend && guidedWorkflow?.sessionId) {
      const updatedMessages = beginUserTurn('Cancelar probador virtual');
      await runGuidedWorkflowAction('cancel', updatedMessages, { message: 'cancelar' });
      return;
    }
    setTryOn((prev) => ({
      ...prev,
      status: prev.selfieImageDataUrl ? 'ready' : 'idle',
    }));
    appendAssistantMessage(messages, 'Perfecto, cancelé el probador virtual.');
  }, [
    appendAssistantMessage,
    beginUserTurn,
    guidedWorkflow?.sessionId,
    isTyping,
    messages,
    runGuidedWorkflowAction,
    useGuidedLookBackend,
  ]);

  const handleSuggestOutfitWithGeneratedItem = useCallback(async () => {
    if (!lookCreation.generatedItem || isTyping || !currentConversation) return;

    if (useGuidedLookBackend && guidedWorkflow?.sessionId) {
      const baseMessages = messages;
      trackGuidedLookOutfitRequested({
        session_id: guidedWorkflow.sessionId,
        category: guidedWorkflow.collected.category,
        occasion: guidedWorkflow.collected.occasion,
        style: guidedWorkflow.collected.style,
      });
      await runGuidedWorkflowAction('request_outfit', baseMessages, {});
      return;
    }

    const canUseStatus = subscription.canUseAIFeature('fashion_chat');
    if (!canUseStatus.canUse) {
      setLimitModalSource('chat');
      setShowLimitModal(true);
      return;
    }

    const userPrompt = `Armame un outfit completo para ${lookCreation.occasion || 'esta ocasión'} usando como protagonista la nueva prenda (${lookCreation.category ? getCategoryLabel(lookCreation.category) : 'prenda'}) con estilo ${lookCreation.style || 'equilibrado'}.`;

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: 'Usá la prenda nueva y armame un outfit completo.',
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, userMessage];
    onMessagesUpdate(updatedMessages);
    setIsTyping(true);
    setStreamingMessage('');

    try {
      const response = await chatWithStudioStylist(
        userPrompt,
        enrichedCloset,
        messages,
        {
          surface: stylistSurface,
          profileContext: stylistContext.profileContext,
          savedLookContext: stylistContext.savedLookContext,
          selectedLookContext: effectiveSelectedLookContext,
          contextPayload: entryContextPayload,
        },
      );

      await appendAssistantMessageWithPlayback(
        updatedMessages,
        response.content,
        response.outfitSuggestion || undefined,
        undefined,
        undefined,
        response.billing,
        response.shoppingSuggestions || undefined,
        response.uiActions || undefined,
        response.referencedItems || undefined,
      );
      setIsTyping(false);
      await subscription.refresh();
    } catch (error: any) {
      console.error('Error suggesting outfit with generated item:', error);
      const userFacingError = mapChatErrorMessageValue(error);
      if (isCreditErrorMessage(error?.message || String(error))) {
        setLimitModalSource('chat');
        setShowLimitModal(true);
      }
      appendAssistantMessage(updatedMessages, userFacingError);
      setStreamingMessage('');
    } finally {
      setIsTyping(false);
    }
  }, [
    appendAssistantMessage,
    appendAssistantMessageWithPlayback,
    currentConversation,
    enrichedCloset,
    isTyping,
    lookCreation.category,
    lookCreation.generatedItem,
    lookCreation.occasion,
    lookCreation.style,
    messages,
    onMessagesUpdate,
    effectiveSelectedLookContext,
    subscription,
    entryContextPayload,
    guidedWorkflow,
    runGuidedWorkflowAction,
    stylistSurface,
    stylistContext,
    useGuidedLookBackend,
  ]);

  const handleSaveGeneratedItem = useCallback(async () => {
    if (!lookCreation.generatedImageUrl || !lookCreation.generatedPrompt || !lookCreation.category) return;
    if (lookCreation.savedToCloset) return;

    if (useGuidedLookBackend && guidedWorkflow?.sessionId) {
      const updatedMessages = beginUserTurn('Guardar prenda generada en armario');
      await runGuidedWorkflowAction('save_generated_item', updatedMessages, {
        message: 'guardar',
      });
      return;
    }

    try {
      await aiImageService.saveToCloset(
        lookCreation.generatedImageUrl,
        lookCreation.generatedPrompt,
        {
          category: lookCreation.category,
          occasion: lookCreation.occasion,
        },
      );

      setLookCreation((prev) => ({
        ...prev,
        savedToCloset: true,
      }));

      if (guidedWorkflow?.sessionId) {
        trackGuidedLookSaved({
          session_id: guidedWorkflow.sessionId,
          category: guidedWorkflow.collected.category,
          occasion: guidedWorkflow.collected.occasion,
          style: guidedWorkflow.collected.style,
        });
      }

      appendAssistantMessage(
        messages,
        'Listo, ya guardé esta prenda en tu armario. Si querés, ahora te armo un outfit usándola.',
      );
    } catch (error: any) {
      appendAssistantMessage(messages, `No pude guardarla en tu armario: ${error?.message || 'error inesperado'}`);
    }
  }, [
    appendAssistantMessage,
    lookCreation.category,
    lookCreation.generatedImageUrl,
    lookCreation.generatedPrompt,
    lookCreation.occasion,
    lookCreation.savedToCloset,
    messages,
    guidedWorkflow,
    beginUserTurn,
    runGuidedWorkflowAction,
    useGuidedLookBackend,
  ]);

  const handleGuidedAutosaveToggle = useCallback(async (enabled: boolean) => {
    if (!useGuidedLookBackend || !currentConversation || isTyping) return;
    setGuidedAutosaveEnabled(enabled);
    if (!guidedWorkflow?.sessionId) return;
    await runGuidedWorkflowAction('toggle_autosave', messages, { autosaveEnabled: enabled });
  }, [currentConversation, guidedWorkflow?.sessionId, isTyping, messages, runGuidedWorkflowAction, useGuidedLookBackend]);

  const handleGuidedConfirmGenerate = useCallback(async () => {
    if (!currentConversation || isTyping) return;
    const pendingAction = guidedWorkflow?.pendingAction;
    const action = pendingAction === 'edit'
      ? 'confirm_edit'
      : pendingAction === 'tryon'
        ? 'confirm_tryon'
        : 'confirm_generate';
    const updatedMessages = beginUserTurn('Confirmar acción del workflow');
    await runGuidedWorkflowAction(action, updatedMessages, {
      confirmationToken: guidedWorkflow?.confirmationToken || undefined,
      message: 'confirmo',
    });
  }, [
    beginUserTurn,
    currentConversation,
    guidedWorkflow?.confirmationToken,
    guidedWorkflow?.pendingAction,
    isTyping,
    runGuidedWorkflowAction,
  ]);

  const handleGuidedCancelGenerate = useCallback(async () => {
    if (!currentConversation || isTyping) return;
    const updatedMessages = beginUserTurn('Cancelar generación de la prenda');
    await runGuidedWorkflowAction('cancel', updatedMessages, {
      message: 'cancelar',
    });
  }, [beginUserTurn, currentConversation, isTyping, runGuidedWorkflowAction]);

  // Send message handler
  const handleSend = useCallback(async (text: string, attachmentsOverride?: ChatAttachment[]) => {
    if (isTyping || !currentConversation) return;
    const activeAttachments = attachmentsOverride ?? pendingAttachments;
    const trimmedText = text.trim() || pendingAttachmentPrompt || getDefaultPromptForAttachments(activeAttachments);
    if (!trimmedText) return;
    setShowPromptTray(false);

    if (garmentEdit?.status === 'confirming') {
      const updatedMessages = beginUserTurn(trimmedText, activeAttachments);
      if (isAffirmative(trimmedText)) {
        if (useGuidedLookBackend && guidedWorkflow?.sessionId) {
          await runGuidedWorkflowAction('confirm_edit', updatedMessages, {
            message: trimmedText,
            confirmationToken: guidedWorkflow.confirmationToken || undefined,
          });
          return;
        }
        await runGarmentEditGeneration(updatedMessages, garmentEdit.instruction);
        return;
      }
      if (isNegative(trimmedText)) {
        if (useGuidedLookBackend && guidedWorkflow?.sessionId) {
          await runGuidedWorkflowAction('cancel', updatedMessages, { message: trimmedText });
        } else {
          setGarmentEdit(null);
          appendAssistantMessage(updatedMessages, 'Perfecto, cancelé la edición de la prenda.');
        }
        return;
      }
      appendAssistantMessage(updatedMessages, 'Decime "sí" para confirmar la edición o "no" para cancelarla.');
      return;
    }

    if (tryOn.status === 'confirming') {
      const updatedMessages = beginUserTurn(trimmedText, activeAttachments);
      if (isAffirmative(trimmedText)) {
        if (useGuidedLookBackend && guidedWorkflow?.sessionId) {
          await runGuidedWorkflowAction('confirm_tryon', updatedMessages, {
            message: trimmedText,
            confirmationToken: guidedWorkflow.confirmationToken || undefined,
          });
          return;
        }
        await runTryOnGeneration(updatedMessages);
        return;
      }
      if (isNegative(trimmedText)) {
        if (useGuidedLookBackend && guidedWorkflow?.sessionId) {
          await runGuidedWorkflowAction('cancel', updatedMessages, { message: trimmedText });
        } else {
          setTryOn((prev) => ({
            ...prev,
            status: prev.selfieImageDataUrl ? 'ready' : 'idle',
          }));
          appendAssistantMessage(updatedMessages, 'Perfecto, cancelé el probador virtual.');
        }
        return;
      }
      appendAssistantMessage(updatedMessages, 'Decime "sí" para generar el probador ahora o "no" para cancelarlo.');
      return;
    }

    if (stylistTask?.status === 'resolving_intent') {
      const updatedMessages = beginUserTurn(trimmedText, activeAttachments);
      const resolution = parseAmbiguousLookRequestResolution(trimmedText);

      if (resolution === 'wardrobe_outfit') {
        setStylistTask(null);
        await runGeneralStylistChat(updatedMessages, `Armame un outfit con mi armario. Pedido original: ${stylistTask.requestText}`);
        return;
      }

      if (resolution === 'new_garment') {
        setStylistTask(null);
        if (useGuidedLookBackend) {
          await runGuidedWorkflowAction('start', updatedMessages, {
            message: `Quiero generar una prenda nueva con IA. Pedido original: ${stylistTask.requestText}`,
            category: undefined,
            autosaveEnabled: guidedAutosaveEnabled,
          });
        } else {
          const draft: LookCreationDraft = {
            requestText: stylistTask.requestText,
          };
          setLookCreation({
            ...draft,
            status: 'collecting',
            awaitingField: 'occasion',
          });
          appendAssistantMessage(updatedMessages, 'Perfecto. Vamos por prenda nueva con IA. ¿Para qué ocasión la querés?');
        }
        return;
      }

      if (resolution === 'delegate') {
        setStylistTask(null);
        if (detectWardrobeOutfitIntent(stylistTask.requestText)) {
          await runGeneralStylistChat(updatedMessages, `Armame un outfit con mi armario. Pedido original: ${stylistTask.requestText}`);
          return;
        }
        if (useGuidedLookBackend) {
          await runGuidedWorkflowAction('start', updatedMessages, {
            message: `Quiero generar una prenda nueva con IA. Pedido original: ${stylistTask.requestText}`,
            category: stylistTask.suggestedCategory,
            autosaveEnabled: guidedAutosaveEnabled,
          });
        } else {
          const draft: LookCreationDraft = {
            requestText: stylistTask.requestText,
            category: stylistTask.suggestedCategory,
          };
          const missing = getMissingLookFields(draft);
          const nextField = missing[0];
          setLookCreation({
            ...draft,
            status: missing.length > 0 ? 'collecting' : 'confirming',
            awaitingField: nextField,
          });
          appendAssistantMessage(updatedMessages, missing.length > 0 && nextField
            ? getLookFieldQuestion(nextField)
            : buildLookCostMessage(draft));
        }
        return;
      }

      if (isNegative(trimmedText)) {
        setStylistTask(null);
        appendAssistantMessage(updatedMessages, 'Perfecto, cancelé la creación de prenda/look por ahora.');
        return;
      }

      appendAssistantMessage(
        updatedMessages,
        'Decime si querés "outfit con mi armario", "prenda nueva" o "elegí vos".',
      );
      return;
    }

    if (useChatWardrobeRecommendations && pendingRecommendation) {
      const updatedMessages = beginUserTurn(trimmedText, activeAttachments);

      if (isAffirmative(trimmedText)) {
        try {
          const confirmed = await confirmRecommendation(
            pendingRecommendation,
            currentConversationId || null,
          );
          onActiveRecommendationChange?.(confirmed);
          setPendingRecommendation(null);
          appendAssistantMessage(
            updatedMessages,
            'Perfecto. Ya marqué esta prenda como recomendada en tu armario (visible por 48h).',
          );
        } catch (error: any) {
          appendAssistantMessage(
            updatedMessages,
            `No pude guardar la recomendación ahora: ${error?.message || 'error inesperado'}`,
          );
        }
        return;
      }

      if (isNegative(trimmedText)) {
        try {
          await blockItem(pendingRecommendation.item_id, 30);
          const blocked = await getBlockedItemIds();
          setBlockedRecommendationItemIds(blocked);
        } catch {
          // keep UX flow even if persistence fails
        }
        setPendingRecommendation(null);
        appendAssistantMessage(
          updatedMessages,
          'Listo, no la recomiendo de nuevo por ahora. Si querés, te busco otra opción.',
        );
        return;
      }

      appendAssistantMessage(
        updatedMessages,
        'Decime "sí" para marcarla como recomendada o "no" para descartarla.',
      );
      return;
    }

    const guidedStatus = guidedWorkflow?.status;
    const guidedPendingAction = guidedWorkflow?.pendingAction;
    const guidedInProgress = guidedStatus === 'collecting'
      || guidedStatus === 'choosing_mode'
      || guidedStatus === 'confirming'
      || guidedStatus === 'generating'
      || guidedStatus === 'editing'
      || guidedStatus === 'tryon_confirming'
      || guidedStatus === 'tryon_generating';

    if (
      activeAttachments.length > 0
      && !guidedInProgress
      && lookCreation.status !== 'collecting'
      && lookCreation.status !== 'confirming'
      && lookCreation.status !== 'generating'
    ) {
      const updatedMessages = beginUserTurn(trimmedText, activeAttachments);
      await runGeneralStylistChat(updatedMessages, trimmedText, activeAttachments);
      return;
    }

    const lastAssistantHadOutfit = Boolean(messages[messages.length - 1]?.outfitSuggestion);
    const canUseTextEditIntent = lookCreation.status === 'result' && !lastAssistantHadOutfit;
    const lastAssistantMessage = [...messages].reverse().find((message) => message.role === 'assistant');

    if (!guidedInProgress && canUseTextEditIntent && lookCreation.generatedItem && detectGarmentEditIntent(trimmedText)) {
      const updatedMessages = beginUserTurn(trimmedText, activeAttachments);
      if (useGuidedLookBackend && guidedWorkflow?.sessionId) {
        await runGuidedWorkflowAction('request_edit', updatedMessages, {
          message: trimmedText,
          editInstruction: trimmedText,
        });
      } else {
        requestGarmentEditConfirmation(updatedMessages, trimmedText);
      }
      return;
    }

    const referencedFollowUp = resolveReferencedItemFollowUp({
      text: trimmedText,
      lastAssistantMessage,
      closet: enrichedCloset,
    });
    if (referencedFollowUp) {
      const updatedMessages = beginUserTurn(trimmedText, activeAttachments);
      appendAssistantMessage(
        updatedMessages,
        referencedFollowUp.content,
        undefined,
        undefined,
        undefined,
        undefined,
        referencedFollowUp.referencedItems,
      );
      return;
    }

    const navigationIntent = parseAppNavigationIntent(trimmedText);
    if (navigationIntent) {
      const updatedMessages = beginUserTurn(trimmedText, activeAttachments);
      const navigationAction: ChatUIAction = {
        id: `nav_${Date.now()}`,
        type: navigationIntent.type,
        label: navigationIntent.type === 'open_saved_looks'
          ? 'Abrir looks guardados'
          : navigationIntent.type === 'open_wishlist'
            ? 'Abrir wishlist'
            : 'Abrir armario filtrado',
        route: navigationIntent.route,
        filters: 'filters' in navigationIntent ? navigationIntent.filters : undefined,
      };
      appendAssistantMessage(updatedMessages, 'Te llevo ahí.', undefined, undefined, undefined, undefined, undefined, [navigationAction]);
      if (navigationIntent.type === 'open_saved_looks') {
        navigate(ROUTES.SAVED);
      } else {
        navigate(ROUTES.CLOSET, {
          state: {
            stylistNavigation: {
              type: navigationIntent.type,
              filters: 'filters' in navigationIntent ? navigationIntent.filters : undefined,
            },
          },
        });
      }
      onClose();
      return;
    }

    if (isAmbiguousAICreationRequest(trimmedText)) {
      const updatedMessages = beginUserTurn(trimmedText, activeAttachments);
      const suggestedCategory = inferDelegatedLookCategory(trimmedText);
      setStylistTask({
        taskType: 'ambiguous_look_request',
        status: 'resolving_intent',
        requestText: trimmedText,
        missingFields: ['mode'],
        delegationAllowed: true,
        suggestedCategory,
      });
      appendAssistantMessage(
        updatedMessages,
        `¿Querés que use tu armario para armar un outfit o que genere una prenda nueva con IA? Si preferís delegarlo, respondeme "elegí vos". Para prenda nueva, mi sugerencia sería ${getCategoryLabel(suggestedCategory).toLowerCase()}.`,
      );
      return;
    }

    const stylistIntent = classifyStylistIntent(trimmedText);
    const lookIntentDetected = stylistIntent === 'generate_new_garment' && detectLookCreationIntent(trimmedText);
    if (useGuidedLookBackend && !guidedInProgress && lookIntentDetected) {
      const updatedMessages = beginUserTurn(trimmedText, activeAttachments);
      await runGuidedWorkflowAction('start', updatedMessages, {
        message: trimmedText,
        autosaveEnabled: guidedAutosaveEnabled,
      });
      return;
    }

    const shouldUseGuidedWorkflow = useGuidedLookBackend && (
      guidedStatus === 'choosing_mode'
      || guidedStatus === 'collecting'
      || guidedStatus === 'confirming'
      || guidedStatus === 'generating'
      || guidedStatus === 'editing'
      || guidedStatus === 'tryon_confirming'
      || guidedStatus === 'tryon_generating'
    );

    if (shouldUseGuidedWorkflow) {
      const updatedMessages = beginUserTurn(trimmedText, activeAttachments);
      if ((guidedStatus === 'confirming' || guidedStatus === 'tryon_confirming') && isAffirmative(trimmedText)) {
        const confirmAction = guidedStatus === 'tryon_confirming'
          ? 'confirm_tryon'
          : (guidedPendingAction === 'edit' ? 'confirm_edit' : 'confirm_generate');
        await runGuidedWorkflowAction(confirmAction, updatedMessages, {
          message: trimmedText,
          confirmationToken: guidedWorkflow?.confirmationToken || undefined,
        });
        return;
      }

      if ((guidedStatus === 'confirming' || guidedStatus === 'tryon_confirming') && isNegative(trimmedText)) {
        await runGuidedWorkflowAction('cancel', updatedMessages, { message: trimmedText });
        return;
      }

      await runGuidedWorkflowAction('submit', updatedMessages, {
        message: trimmedText,
        autosaveEnabled: guidedAutosaveEnabled,
      });
      return;
    }

    const shouldHandleLookCreation = !useGuidedLookBackend && (
      lookIntentDetected
      || lookCreation.status === 'collecting'
      || lookCreation.status === 'confirming'
    );
    const updatedMessages = beginUserTurn(trimmedText, activeAttachments);

    if (shouldHandleLookCreation) {
      if (lookCreation.status === 'confirming') {
        if (isAffirmative(trimmedText)) {
          if (!lookCreation.category || !lookCreation.occasion || !lookCreation.style) {
            const missing = getMissingLookFields(lookCreation);
            const nextField = missing[0];
            setLookCreation((prev) => ({
              ...prev,
              status: 'collecting',
              awaitingField: nextField,
            }));
            if (nextField) {
              appendAssistantMessage(updatedMessages, getLookFieldQuestion(nextField));
            }
            return;
          }

          const canUseGeneration = subscription.canUseAIFeature('image_generation');
          if (!canUseGeneration.canUse) {
            setLimitModalSource('chat');
            setShowLimitModal(true);
            appendAssistantMessage(
              updatedMessages,
              'No tenés usos suficientes para generar esta prenda. Hacé upgrade o sumá usos para continuar.',
            );
            setLookCreation({ status: 'idle' });
            return;
          }

          setLookCreation((prev) => ({ ...prev, status: 'generating' }));
          setIsTyping(true);
          setStreamingMessage('');

          try {
            const generationPrompt = buildLookCreationPrompt(lookCreation);
            const generationResult = await withTimeout(
              aiImageService.generateFashionImage(generationPrompt, {
                category: lookCreation.category,
                occasion: lookCreation.occasion,
              }),
              90000,
            );

            if (!generationResult.success || !generationResult.image_url) {
              throw new Error(generationResult.error || 'No se pudo generar la imagen');
            }

            const generatedItem: ClothingItem = {
              id: `ai_chat_${Date.now()}`,
              imageDataUrl: generationResult.image_url,
              metadata: {
                category: lookCreation.category,
                subcategory: `Prenda IA - ${getCategoryLabel(lookCreation.category)}`,
                color_primary: '#000000',
                vibe_tags: ['ai-generated', lookCreation.style],
                seasons: ['spring', 'summer', 'fall', 'winter'],
                description: generationPrompt,
              },
              isAIGenerated: true,
              aiGenerationPrompt: generationPrompt,
            };

            setGeneratedClosetItems((prev) => [generatedItem, ...prev]);
            setLookCreation((prev) => ({
              ...prev,
              status: 'result',
              generatedImageUrl: generationResult.image_url,
              generatedPrompt: generationPrompt,
              generatedItem,
              savedToCloset: false,
            }));

            appendAssistantMessage(
              updatedMessages,
              `¡Listo! Generé una ${getCategoryLabel(lookCreation.category).toLowerCase()} para ${lookCreation.occasion} con estilo ${lookCreation.style}. Si querés, podés guardarla en tu armario o pedirme un outfit completo con esta prenda.`,
            );
            await subscription.refresh();
          } catch (error: any) {
            console.error('Error generating look from chat:', error);
            const userFacingError = mapLookCreationErrorMessageValue(error);
            if (isCreditErrorMessage(error?.message || String(error))) {
              setLimitModalSource('chat');
              setShowLimitModal(true);
            }
            appendAssistantMessage(updatedMessages, userFacingError);
            setLookCreation({ status: 'idle' });
          } finally {
            setIsTyping(false);
          }
          return;
        }

        if (isNegative(trimmedText)) {
          setLookCreation({ status: 'idle' });
          appendAssistantMessage(updatedMessages, 'Perfecto, cancelé la generación. Cuando quieras la retomamos.');
          return;
        }

        appendAssistantMessage(updatedMessages, 'Decime "sí" para generar ahora o "no" para cancelar.');
        return;
      }

      const extractedFields = parseLookCreationFields(trimmedText);
      const shouldResetDraft = lookIntentDetected || lookCreation.status === 'idle' || lookCreation.status === 'result';
      const currentDraft: LookCreationDraft = shouldResetDraft
        ? {
          ...extractedFields,
          requestText: trimmedText,
        }
        : {
          ...lookCreation,
          ...extractedFields,
        };

      const firstMissingBeforeInput = shouldResetDraft
        ? getMissingLookFields(currentDraft)[0]
        : (lookCreation.awaitingField || getMissingLookFields(lookCreation)[0]);
      if (!shouldResetDraft && firstMissingBeforeInput) {
        if (firstMissingBeforeInput === 'occasion' && !currentDraft.occasion) {
          currentDraft.occasion = trimmedText;
        }
        if (firstMissingBeforeInput === 'style' && !currentDraft.style) {
          currentDraft.style = trimmedText;
        }
        if (firstMissingBeforeInput === 'category' && !currentDraft.category) {
          const parsedCategory = parseLookCreationCategory(trimmedText);
          if (!parsedCategory) {
            setLookCreation((prev) => ({
              ...prev,
              status: 'collecting',
              awaitingField: 'category',
            }));
            appendAssistantMessage(updatedMessages, 'No llegué a entender la categoría. Elegí una: top, bottom o calzado.');
            return;
          }
          currentDraft.category = parsedCategory;
        }
      }

      if (!currentDraft.requestText) {
        currentDraft.requestText = trimmedText;
      }

      if (!currentDraft.category && wantsAutoCategorySelection(trimmedText)) {
        currentDraft.category = inferDelegatedLookCategory(currentDraft.requestText || trimmedText);
      }

      const missingFields = getMissingLookFields(currentDraft);
      if (missingFields.length > 0) {
        const nextField = missingFields[0];
        const capturedThisTurn: string[] = [];
        if (currentDraft.occasion && currentDraft.occasion !== lookCreation.occasion) {
          capturedThisTurn.push(`ocasión: ${currentDraft.occasion}`);
        }
        if (currentDraft.style && currentDraft.style !== lookCreation.style) {
          capturedThisTurn.push(`estilo: ${currentDraft.style}`);
        }
        if (currentDraft.category && currentDraft.category !== lookCreation.category) {
          capturedThisTurn.push(`categoría: ${getCategoryLabel(currentDraft.category).toLowerCase()}`);
        }
        setLookCreation({
          ...currentDraft,
          status: 'collecting',
          awaitingField: nextField,
        });
        const prefix = capturedThisTurn.length > 0
          ? `Perfecto, tomo ${capturedThisTurn.join(' y ')}. `
          : '';
        const question = nextField === 'category' && !currentDraft.category
          ? `${buildSmartCategoryQuestion(currentDraft.requestText || trimmedText)} Si querés delegarlo, respondeme "elegí vos".`
          : getLookFieldQuestion(nextField);
        appendAssistantMessage(updatedMessages, `${prefix}${question}`);
        return;
      }

      setLookCreation({
        ...currentDraft,
        status: 'confirming',
        awaitingField: undefined,
      });
      appendAssistantMessage(updatedMessages, buildLookCostMessage(currentDraft));
      return;
    }

    await runGeneralStylistChat(updatedMessages, trimmedText, activeAttachments);
  }, [
    beginUserTurn,
    appendAssistantMessage,
    buildSmartCategoryQuestion,
    classifyStylistIntent,
    currentConversation,
    detectWardrobeOutfitIntent,
    enrichedCloset,
    garmentEdit,
    guidedAutosaveEnabled,
    guidedWorkflow,
    messages,
    handleMessageUIAction,
    inferDelegatedLookCategory,
    isAmbiguousAICreationRequest,
    isTyping,
    lookCreation,
    navigate,
    onActiveRecommendationChange,
    onClose,
    pendingAttachmentPrompt,
    pendingAttachments,
    parseAppNavigationIntent,
    parseAmbiguousLookRequestResolution,
    pendingRecommendation,
    requestGarmentEditConfirmation,
    runGeneralStylistChat,
    runGarmentEditGeneration,
    runGuidedWorkflowAction,
    runTryOnGeneration,
    stylistTask,
    subscription,
    tryOn.status,
    useGuidedLookBackend,
    withTimeout,
  ]);

  // Keyboard handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(inputValue);
    }
  };

  // Format date
  const formatDate = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Hoy';
    if (diff === 1) return 'Ayer';
    if (diff < 7) return `Hace ${diff} días`;
    return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
  };

  const pendingReferenceLook = pendingAttachments.find((attachment) => attachment.kind === 'reference_look');
  const pendingExtractableLook = pendingAttachments.find((attachment) => attachment.kind === 'extractable_look');
  const showMinimalMobileContext = isMobileChatLayout;
  const shouldRenderPromptTray = !isMobileChatLayout || (isNewChat && !inputValue.trim() && pendingAttachments.length === 0);
  const inputPlaceholder = isMobileChatLayout
    ? 'Preguntale a Kumbi'
    : 'Preguntale a Kumbi qué te ponés hoy...';

  // Get item helper
  const getItem = useCallback((id: string, msg: ChatMessage, cat?: 'top' | 'bottom' | 'shoes') => {
    const item = enrichedCloset.find(i => i.id === id);
    if (item) return item;
    if (msg.outfitSuggestion?.aiGeneratedItems && cat) {
      return msg.outfitSuggestion.aiGeneratedItems[cat];
    }
    return null;
  }, [enrichedCloset]);

  // Clean message content (remove IDs)
  const cleanContent = (content: any) => {
    if (typeof content !== 'string') return '';
    return content
      .replace(/\[(?:top|bottom|shoes|outerwear|accessories?):\s*[^\]]+\]/gi, '')
      .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi, '')
      .replace(/\(\s*[0-9a-f-]{20,}\s*\)/gi, '')
      .replace(/\(\s*ID:\s*\)/gi, '')
      .replace(/\b(?:su\s+)?id\s+es\s*(?:[\w-]+|\.|,|;|$)/gi, '')
      .replace(/\bID:\s*(?:\.|,|;|$)/gi, '')
      .replace(/^\s*\*\s+/gm, '• ')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  };
  const getCreditsColor = () => {
    if (chatCreditsStatus.limit === -1) return 'bg-emerald-500';
    const percent = (chatCreditsStatus.remaining / chatCreditsStatus.limit) * 100;
    if (percent <= 15) return 'bg-red-500';
    if (percent <= 40) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  // ========== RENDER ==========

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-end justify-center overflow-x-hidden p-0 sm:items-center sm:p-4"
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />

      {/* Modal Container */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative flex h-[100dvh] min-h-0 w-full max-w-3xl overflow-hidden rounded-none border border-white/70 bg-[linear-gradient(180deg,rgba(239,244,246,0.96),rgba(231,236,239,0.92))] shadow-2xl backdrop-blur-3xl dark:border-slate-500/50 dark:bg-[#0b1220]/95 sm:h-[85vh] sm:rounded-3xl"
      >
        {/* Sidebar */}
        <AnimatePresence>
          {showSidebar && (
            <>
              <motion.aside
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 240, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="h-full border-r border-white/70 bg-[linear-gradient(180deg,rgba(223,231,236,0.92),rgba(235,229,231,0.84))] dark:border-slate-600 dark:bg-[#0f172a] flex flex-col overflow-hidden"
              >
                {/* Sidebar Header */}
                <div className="border-b border-white/70 p-4 dark:border-slate-700">
                  <button
                    onClick={() => { onNewConversation(); setShowSidebar(false); }}
                    className="flex w-full items-center justify-center gap-2 rounded-[1rem] bg-[#08111a] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#10202b] dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
                  >
                    <span className="material-symbols-rounded text-lg">add</span>
                    Nueva conversación
                  </button>
                </div>

                {/* Conversations List */}
                <div className="flex-1 overflow-y-auto p-2">
                  {conversations.length === 0 ? (
                    <div className="text-center py-8 px-4">
                      <span className="material-symbols-rounded text-4xl text-gray-300 dark:text-gray-700 block mb-2">forum</span>
                      <p className="text-sm text-gray-500 dark:text-gray-300">No hay conversaciones</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {conversations.map(conv => (
                        <div
                          key={conv.id}
                          onClick={() => { onSelectConversation(conv.id); setShowSidebar(false); }}
                          className={`group p-3 rounded-lg cursor-pointer transition-all ${conv.id === currentConversationId
                            ? 'bg-white/55 dark:bg-slate-700/70'
                            : 'hover:bg-white/35 dark:hover:bg-slate-700/40'
                            }`}
                        >
                          {deleteConfirmId === conv.id ? (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-red-600 dark:text-red-400">¿Eliminar?</span>
                              <div className="flex gap-1">
                                <button
                                  onClick={(e) => { e.stopPropagation(); onDeleteConversation(conv.id); setDeleteConfirmId(null); }}
                                  className="px-2.5 py-1 bg-red-600 text-white rounded text-xs font-medium"
                                >
                                  Sí
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }}
                                  className="px-2.5 py-1 bg-gray-200 dark:bg-slate-600 rounded text-xs font-medium"
                                >
                                  No
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start gap-2">
                              <span className="material-symbols-rounded text-gray-400 text-lg mt-0.5">chat_bubble_outline</span>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                  {conv.title}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-300 mt-0.5">{formatDate(conv.updatedAt)}</p>
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(conv.id); }}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-slate-600 rounded transition-all"
                              >
                                <span className="material-symbols-rounded text-gray-400 text-lg">delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {/* Top Bar */}
          <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-white/30 bg-white/35 px-3 backdrop-blur-md dark:border-slate-600/70 dark:bg-[#0f172a]/90 sm:px-4">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="p-2 hover:bg-white/50 dark:hover:bg-white/10 rounded-xl transition-colors"
                title="Conversaciones"
              >
                <span className="material-symbols-rounded text-gray-700 dark:text-gray-300">menu</span>
              </button>
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/60 bg-[linear-gradient(180deg,rgba(202,232,234,0.92),rgba(223,231,236,0.92))] shadow-sm">
                  <span className="material-symbols-rounded text-lg text-[#14343b]">checkroom</span>
                </div>
                <span className="truncate bg-clip-text font-bold tracking-tight text-[#14343b] dark:text-white">Kumbi</span>
              </div>
            </div>

            {/* Credits Indicator - PREMIUM */}
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              {isMobileChatLayout ? (
                <div className="flex items-center gap-1.5 rounded-full border border-white/55 bg-white/60 px-2.5 py-1.5 shadow-sm backdrop-blur-md dark:border-slate-600 dark:bg-slate-800/80">
                  <span className="material-symbols-rounded text-base text-[#2aa1a7] dark:text-violet-400">toll</span>
                  <span className={`text-xs font-bold leading-none text-gray-800 dark:text-gray-200 ${chatCreditsStatus.remaining <= 5 ? 'text-red-500' : ''}`}>
                    {chatCreditsStatus.limit === -1 ? '∞' : chatCreditsStatus.remaining}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-full border border-white/55 bg-white/52 px-3 py-1.5 shadow-sm backdrop-blur-md dark:border-slate-600 dark:bg-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-rounded text-lg text-[#2aa1a7] dark:text-violet-400">toll</span>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-gray-800 dark:text-gray-200 leading-none">
                        {chatCreditsStatus.limit === -1 ? (
                          'Ilimitado'
                        ) : (
                          <>
                            <span className={chatCreditsStatus.remaining <= 5 ? 'text-red-500 animate-pulse-glow drop-shadow-md' : ''}>
                              {chatCreditsStatus.remaining}
                            </span>
                            <span className="text-gray-400/80 mx-0.5">/</span>
                            <span className="text-gray-500 dark:text-gray-300 font-medium">{chatCreditsStatus.limit}</span>
                          </>
                        )}
                      </span>
                      <span className="text-[9px] uppercase tracking-wider text-gray-500 dark:text-gray-500 font-semibold leading-tight mt-0.5">premium</span>
                    </div>
                  </div>
                  {chatCreditsStatus.limit !== -1 && (
                    <div className="w-12 h-1 bg-gray-200/50 dark:bg-slate-600/80 rounded-full overflow-hidden backdrop-blur-sm">
                      <div
                        className={`h-full ${getCreditsColor()} rounded-full transition-all`}
                        style={{ width: `${(chatCreditsStatus.remaining / chatCreditsStatus.limit) * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={onClose}
                className="shrink-0 rounded-xl border border-white/40 bg-white/50 p-2 shadow-sm transition-all hover:bg-white/80 dark:border-slate-600 dark:bg-slate-800/80 dark:hover:bg-slate-700"
                title="Cerrar"
              >
                <span className="material-symbols-rounded text-gray-700 dark:text-gray-300">close</span>
              </button>
            </div>
          </header>

          {/* Chat Area */}
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
            {isNewChat ? (
              /* Welcome Screen */
              <div className="h-full flex flex-col justify-start p-6 pt-8 max-w-2xl mx-auto">
                <motion.div
                  initial={{ scale: 0.98, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-full text-center"
                >
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/70 bg-[linear-gradient(180deg,rgba(202,232,234,0.95),rgba(235,229,231,0.92))] shadow-lg">
                    <span className="material-symbols-rounded text-[30px] text-[#14343b]">checkroom</span>
                  </div>
                  <h1 className="text-[1.75rem] font-bold text-gray-900 dark:text-white mb-2">
                    {userName ? `Hola, ${userName}.` : 'Hola.'}
                  </h1>
                  <p className="mx-auto max-w-lg text-sm leading-6 text-gray-500 dark:text-gray-300">
                    Preguntame qué ponerte hoy, cómo reusar un look o qué falta en tu armario.
                  </p>
                </motion.div>

                {effectiveSelectedInferredLookContext && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mx-auto mt-5 w-full max-w-xl overflow-hidden rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(223,231,236,0.78))] shadow-sm"
                  >
                    <div className="grid items-center gap-0 sm:grid-cols-[180px_minmax(0,1fr)]">
                      {effectiveSelectedInferredLookContext.image_data_url ? (
                        <img
                          src={effectiveSelectedInferredLookContext.image_data_url}
                          alt={effectiveSelectedInferredLookContext.name || 'Look subido'}
                          className="h-44 w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-44 items-center justify-center bg-[linear-gradient(180deg,rgba(202,232,234,0.95),rgba(235,229,231,0.92))]">
                          <span className="material-symbols-rounded text-[38px] text-[#14343b]">style</span>
                        </div>
                      )}
                      <div className="p-4 text-left">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#2d5f64] dark:text-violet-300">
                          Look subido
                        </p>
                        <p className="mt-2 text-sm font-semibold text-[#14343b] dark:text-white">
                          {effectiveSelectedInferredLookContext.occasion || effectiveSelectedInferredLookContext.name || 'Base para trabajar con Kumbi'}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                          {effectiveSelectedInferredLookContext.summary}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                <div className="mt-5 flex items-center justify-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                  <span className="material-symbols-rounded text-base">inventory_2</span>
                  <span>{closet.length} prendas en tu armario</span>
                </div>
              </div>
            ) : (
              /* Chat Messages */
              <div className="max-w-3xl mx-auto p-4 space-y-6">
                {messages.map((msg, msgIndex) => {
                  const isUser = msg.role === 'user';
                  const content = cleanContent(msg.content);
                  const outfit = msg.outfitSuggestion;
                  const detectedLookGarments = !isUser ? msg.detectedLookGarments : undefined;
                  const problemItemSuggestions = !isUser ? (msg.problemItemSuggestions || []) : [];
                  const saveLookDraft = !isUser ? msg.saveLookDraft : undefined;
                  const shoppingSuggestions = msg.shoppingSuggestions || [];
                  const referenceAttachment = msg.attachments?.find((attachment) => attachment.kind === 'reference_look');
                  const extractionSourceAttachment = !isUser && detectedLookGarments
                    ? [...messages.slice(0, msgIndex)]
                      .reverse()
                      .flatMap((message) => message.attachments || [])
                      .find((attachment) => attachment.kind === 'extractable_look' || attachment.kind === 'reference_look')
                    : null;
                  const referencedItems = !isUser
                    ? (msg.referencedItems || [])
                      .map((referencedItem) => {
                        const item = getItem(referencedItem.item_id, msg);
                        if (!item) return null;
                        const fallbackLabel = [
                          item.metadata?.subcategory,
                          item.metadata?.color_primary,
                        ].filter(Boolean).join(' ').trim() || 'Prenda de tu armario';
                        return {
                          item,
                          label: referencedItem.label || fallbackLabel,
                          reason: referencedItem.reason,
                        };
                      })
                      .filter(Boolean) as Array<{ item: ClothingItem; label: string; reason: string }>
                    : [];
                  const top = outfit ? getItem(outfit.top_id, msg, 'top') : null;
                  const bottom = outfit ? getItem(outfit.bottom_id, msg, 'bottom') : null;
                  const shoes = outfit ? getItem(outfit.shoes_id, msg, 'shoes') : null;
                  const outerwear = outfit?.outerwear_id ? getItem(outfit.outerwear_id, msg) : null;
                  const accessories = (outfit?.accessory_ids || [])
                    .map((id) => getItem(id, msg))
                    .filter(Boolean);
                  const outfitPieces = [
                    { item: top, label: 'Top' },
                    { item: bottom, label: 'Bottom' },
                    { item: shoes, label: 'Calzado' },
                    { item: outerwear, label: 'Capa' },
                    ...accessories.map((item, index) => ({ item, label: `Accesorio ${index + 1}` })),
                  ].filter((piece) => piece.item);
                  const hasOutfit = outfitPieces.length > 0;
                  const hasDetectedLookGarments = Boolean(detectedLookGarments?.items?.length);
                  const hasProblemItemSuggestions = problemItemSuggestions.length > 0;
                  const hasReferencedItems = referencedItems.length > 0;
                  const hasShoppingSuggestions = !isUser && shoppingSuggestions.length > 0;
                  const messageActions = !isUser && Array.isArray(msg.uiActions)
                    ? msg.uiActions.filter((action) => !(hasShoppingSuggestions && action.type === 'save_to_wishlist'))
                    : [];
                  const hasMessageActions = messageActions.length > 0;

                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex min-w-0 gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
                    >
                      {/* Avatar */}
                      <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl shadow-sm ${isUser
                        ? 'border border-white/30 bg-white/20 backdrop-blur-md dark:border-slate-500 dark:bg-slate-700/70'
                        : 'border border-white/60 bg-[linear-gradient(180deg,rgba(202,232,234,0.95),rgba(235,229,231,0.9))]'
                        }`}>
                        <span className={`material-symbols-rounded text-[16px] ${isUser ? 'text-gray-700 dark:text-gray-300' : 'text-[#14343b]'}`}>
                          {isUser ? 'person' : 'checkroom'}
                        </span>
                      </div>

                      {/* Message */}
                      <div className={`flex-1 ${isUser ? 'max-w-[85%]' : 'max-w-[90%]'}`}>
                        <div className={`rounded-2xl border px-5 py-3.5 shadow-sm backdrop-blur-md ${isUser
                          ? 'ml-auto border-[#08111a]/30 bg-[#08111a]/94 text-white dark:border-white/20 dark:bg-white/90 dark:text-gray-900'
                          : 'border-white/70 bg-[linear-gradient(180deg,rgba(223,231,236,0.76),rgba(255,255,255,0.66))] text-gray-900 transition-colors hover:border-white dark:border-violet-500/40 dark:bg-[#111827]/90 dark:text-gray-100'
                          }`}>
                          <StreamingMessageText
                            text={content}
                            active={!isUser && msg.id === activeStreamingMessageId}
                            onDone={() => {
                              setActiveStreamingMessageId((currentId) => currentId === msg.id ? null : currentId);
                            }}
                            className="whitespace-pre-wrap break-words text-[15px] leading-relaxed font-medium"
                          />
                          {referenceAttachment && (
                            <button
                              type="button"
                              onClick={() => openImagePreview(
                                referenceAttachment.imageDataUrl,
                                'Look de referencia',
                                'kumbi-look-de-referencia.jpg',
                              )}
                              className="mt-3 overflow-hidden rounded-2xl border border-white/20 bg-black/10 text-left dark:border-slate-600 dark:bg-black/20 max-w-[220px]"
                            >
                              <img src={referenceAttachment.imageDataUrl} alt="Look de referencia" className="h-40 w-full object-cover" />
                              <div className="px-3 py-2">
                                <p className="text-[11px] font-semibold text-current opacity-80">Tocá la foto para abrirla</p>
                              </div>
                            </button>
                          )}
                        </div>

                        {hasReferencedItems && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-3 space-y-3"
                          >
                            {referencedItems.map(({ item, label, reason }) => (
                              <div
                                key={`${msg.id}:${item.id}`}
                                className="rounded-2xl border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(223,231,236,0.74))] p-3 shadow-sm backdrop-blur-md dark:border-slate-600 dark:bg-[#111827]"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl bg-gray-100 ring-1 ring-white/70 dark:bg-slate-800 dark:ring-slate-600">
                                    <img
                                      src={getPreferredClothingImage(item)}
                                      alt={label}
                                      className="h-full w-full object-cover"
                                    />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-[#14343b] dark:text-gray-100">
                                      {label}
                                    </p>
                                    <p className="mt-1 text-xs leading-relaxed text-[#355e64] dark:text-gray-300">
                                      {reason}
                                    </p>
                                  </div>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleViewReferencedItem(item.id)}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/70 bg-white/72 px-3 py-1.5 text-[11px] font-semibold text-[#14343b] transition-colors hover:bg-white/90 dark:border-violet-300/40 dark:bg-slate-900/60 dark:text-violet-200 dark:hover:bg-slate-900"
                                  >
                                    <span className="material-symbols-rounded text-sm">visibility</span>
                                    Ver prenda
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUseReferencedItemInLook(item.id)}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/70 bg-white/72 px-3 py-1.5 text-[11px] font-semibold text-[#14343b] transition-colors hover:bg-white/90 dark:border-violet-300/40 dark:bg-slate-900/60 dark:text-violet-200 dark:hover:bg-slate-900"
                                  >
                                    <span className="material-symbols-rounded text-sm">auto_fix_high</span>
                                    Usar en look
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenClosetFromReferencedItem(item)}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/70 bg-white/72 px-3 py-1.5 text-[11px] font-semibold text-[#14343b] transition-colors hover:bg-white/90 dark:border-violet-300/40 dark:bg-slate-900/60 dark:text-violet-200 dark:hover:bg-slate-900"
                                  >
                                    <span className="material-symbols-rounded text-sm">checkroom</span>
                                    Abrir armario
                                  </button>
                                </div>
                              </div>
                            ))}
                          </motion.div>
                        )}

                        {hasDetectedLookGarments && detectedLookGarments && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-3"
                          >
                            <LookGarmentReviewPanel
                              items={detectedLookGarments.items}
                              summary={detectedLookGarments.summary}
                              warnings={detectedLookGarments.warnings}
                              sourceImageDataUrl={extractionSourceAttachment?.imageDataUrl}
                              sourceImageAlt="Look a separar"
                              saveState={detectedLookGarments.saveState}
                              saveError={detectedLookGarments.saveError}
                              saveLabel={detectedLookGarments.saveState === 'saved' ? 'Guardadas en armario' : undefined}
                              onSaveSelected={() => handleSaveDetectedLookGarments(msg.id)}
                              onToggleItem={(itemId) => handleDetectedLookGarmentToggle(msg.id, itemId)}
                              onMetadataChange={(itemId, field, value) => {
                                if (field === 'category' || field === 'color_primary' || field === 'subcategory') {
                                  handleDetectedLookGarmentMetadataChange(msg.id, itemId, field, value);
                                }
                              }}
                              title="Revisá las prendas detectadas"
                              description="Confirmá qué querés guardar, corregí nombre, categoría o color y seguí sin salir de Kumbi."
                            />
                          </motion.div>
                        )}

                        {hasProblemItemSuggestions && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-3 rounded-2xl border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(223,231,236,0.74))] p-4 dark:border-slate-600 dark:bg-[#111827]"
                          >
                            <div className="flex items-center gap-2 mb-3">
                              <span className="material-symbols-rounded text-sm text-[#2aa1a7]">auto_fix_high</span>
                              <span className="text-xs font-semibold uppercase tracking-wider text-[#2d5f64] dark:text-violet-300">
                                Prenda problema
                              </span>
                            </div>

                            <div className="space-y-3">
                              {problemItemSuggestions.map((path) => {
                                const pathOutfit = path.outfitSuggestion || null;
                                const pathPieces = pathOutfit
                                  ? [
                                    { item: getItem(pathOutfit.top_id, msg, 'top'), label: 'Top' },
                                    { item: getItem(pathOutfit.bottom_id, msg, 'bottom'), label: 'Bottom' },
                                    { item: getItem(pathOutfit.shoes_id, msg, 'shoes'), label: 'Calzado' },
                                  ].filter((piece) => piece.item)
                                  : [];

                                return (
                                  <div
                                    key={path.id}
                                    className="rounded-xl border border-white/70 bg-white/72 p-3 dark:border-slate-700 dark:bg-slate-900/50"
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <p className="text-sm font-semibold text-[#14343b] dark:text-gray-100">{path.title}</p>
                                        <p className="mt-1 text-xs text-[#355e64] dark:text-gray-300">{path.summary}</p>
                                      </div>
                                      <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#2d5f64] dark:bg-slate-800 dark:text-violet-300">
                                        {path.pathType.replace('_', ' ')}
                                      </span>
                                    </div>

                                    {pathPieces.length > 0 && (
                                      <div className="mt-3 grid grid-cols-3 gap-2">
                                        {pathPieces.map((piece) => piece.item && (
                                          <div key={`${path.id}:${piece.label}`} className="space-y-1">
                                            <div className="aspect-square overflow-hidden rounded-lg bg-gray-100 dark:bg-slate-800">
                                              <img src={getPreferredClothingImage(piece.item)} alt={piece.label} className="h-full w-full object-cover" />
                                            </div>
                                            <p className="text-[10px] text-center text-gray-500 dark:text-gray-400">{piece.label}</p>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    <p className="mt-3 text-xs text-gray-600 dark:text-gray-300">
                                      {path.reason}
                                    </p>

                                    <div className="mt-3 flex flex-wrap gap-2">
                                      {pathOutfit && (
                                        <button
                                          type="button"
                                          onClick={() => onViewOutfit(pathOutfit.top_id, pathOutfit.bottom_id, pathOutfit.shoes_id, pathOutfit.aiGeneratedItems)}
                                          className="rounded-xl bg-[#14343b] px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-[#102830]"
                                        >
                                          Ver outfit
                                        </button>
                                      )}
                                      {pathOutfit && (
                                        <button
                                          type="button"
                                          onClick={() => handleStartSaveLookDraft(msg.id, pathOutfit)}
                                          className="rounded-xl border border-white/70 bg-white/56 px-3 py-1.5 text-[11px] font-semibold text-[#14343b] transition-colors hover:bg-white/82 dark:border-violet-700/60 dark:text-violet-300 dark:hover:bg-violet-900/20"
                                        >
                                          Guardar en Looks
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleSend(`Seguí por el camino "${path.title}" para esta prenda.`)}
                                        className="rounded-xl border border-white/70 bg-white/56 px-3 py-1.5 text-[11px] font-semibold text-[#14343b] transition-colors hover:bg-white/82 dark:border-violet-700/60 dark:text-violet-300 dark:hover:bg-violet-900/20"
                                      >
                                        Seguir desde este camino
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}

                        {/* Outfit Preview */}
                        {hasOutfit && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-3 rounded-2xl border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(223,231,236,0.72))] p-4 dark:border-slate-600 dark:bg-[#111827]"
                          >
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                              <span className="material-symbols-rounded text-sm text-[#2aa1a7]">style</span>
                              <span className="text-xs font-semibold uppercase tracking-wider text-[#2d5f64] dark:text-violet-400">
                                {outfit?.look_goal === 'reference_recreation' ? 'Look recreado' : 'Outfit sugerido'}
                              </span>
                              {typeof outfit?.similarity_score === 'number' && (
                                <span className="inline-flex items-center rounded-full bg-white/65 px-2 py-0.5 text-[11px] font-semibold text-[#2d5f64] dark:bg-violet-900/30 dark:text-violet-300">
                                  Similitud {Math.round(outfit.similarity_score * 100)}%
                                </span>
                              )}
                            </div>

                            <div className={`grid gap-3 mb-4 ${outfitPieces.length >= 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
                              {outfitPieces.map(({ item, label }, idx) => item && (
                                <div key={idx} className="space-y-1.5">
                                  <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 ring-1 ring-gray-200 dark:ring-gray-600">
                                    <img src={getPreferredClothingImage(item)} alt="" className="w-full h-full object-cover" />
                                    {item.isAIGenerated && (
                                        <div className="absolute top-1.5 right-1.5 rounded bg-[#14343b] px-1.5 py-0.5 text-xs font-medium text-white">
                                        AI
                                      </div>
                                    )}
                                  </div>
                                  <p className="text-xs text-center text-gray-500 dark:text-gray-300 font-medium">{label}</p>
                                </div>
                              ))}
                            </div>

                            {(outfit?.styling_notes?.length || outfit?.missing_piece_suggestion) && (
                              <div className="mb-4 space-y-2">
                                {outfit?.styling_notes?.length ? (
                                  <div className="flex flex-wrap gap-2">
                                    {outfit.styling_notes.map((note) => (
                                      <span
                                        key={note}
                                        className="rounded-full border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/70 px-2.5 py-1 text-[11px] font-medium text-gray-600 dark:text-gray-300"
                                      >
                                        {note}
                                      </span>
                                    ))}
                                  </div>
                                ) : null}
                                {outfit?.missing_piece_suggestion && (
                                  <p className="text-xs text-gray-600 dark:text-gray-300">
                                    <span className="font-semibold">Si querés acercarte más:</span> {outfit.missing_piece_suggestion.item_name}. {outfit.missing_piece_suggestion.reason}
                                  </p>
                                )}
                              </div>
                            )}

                            <div className="grid gap-2 sm:grid-cols-2">
                              <button
                                onClick={() => {
                                  const extendedSelection = [
                                    outfit!.top_id,
                                    outfit!.bottom_id,
                                    outfit!.shoes_id,
                                    outfit!.outerwear_id,
                                    ...(outfit!.accessory_ids || []),
                                  ].filter(Boolean) as string[];
                                  if (extendedSelection.length > 3) {
                                    navigate(ROUTES.STUDIO, {
                                      state: {
                                        preselectedItemIds: extendedSelection,
                                      },
                                    });
                                    return;
                                  }
                                  onViewOutfit(outfit!.top_id, outfit!.bottom_id, outfit!.shoes_id, outfit!.aiGeneratedItems);
                                }}
                                className="w-full py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                              >
                                <span className="material-symbols-rounded text-lg">view_in_ar</span>
                                {(outfit?.outerwear_id || outfit?.accessory_ids?.length)
                                  ? 'Ver look en Studio'
                                  : 'Ver outfit'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStartSaveLookDraft(msg.id)}
                                disabled={saveLookDraft?.status === 'saving' || saveLookDraft?.status === 'saved'}
                                className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors border ${saveLookDraft?.status === 'saved'
                                  ? 'border-emerald-300/70 bg-emerald-50 text-emerald-700 dark:border-emerald-700/60 dark:bg-emerald-900/20 dark:text-emerald-300'
                                  : 'border-white/70 bg-white/52 text-[#14343b] hover:bg-white/82 dark:border-violet-700/60 dark:text-violet-300 dark:hover:bg-violet-900/20'
                                  }`}
                              >
                                {saveLookDraft?.status === 'saved'
                                  ? 'Guardado en Looks'
                                  : saveLookDraft?.status === 'saving'
                                    ? 'Guardando...'
                                    : saveLookDraft?.status === 'editing' || saveLookDraft?.status === 'error'
                                      ? 'Revisar guardado'
                                    : 'Guardar en Looks'}
                              </button>
                            </div>

                            {saveLookDraft && saveLookDraft.status !== 'saved' && (
                              <KumbiLookSaveDraftCard
                                draft={saveLookDraft}
                                folders={lookFolders}
                                pieces={outfitPieces
                                  .filter((piece): piece is { item: ClothingItem; label: string } => Boolean(piece.item))
                                  .map((piece) => ({ label: piece.label, item: piece.item as ClothingItem }))}
                                onChange={(patch) => handleSaveLookDraftChange(msg.id, patch)}
                                onSave={() => void handleConfirmSaveLookDraft(msg.id)}
                                onCancel={() => handleCancelSaveLookDraft(msg.id)}
                              />
                            )}
                          </motion.div>
                        )}

                        {hasShoppingSuggestions && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-3 rounded-2xl border border-white/70 bg-[linear-gradient(180deg,rgba(235,229,231,0.78),rgba(255,255,255,0.82))] p-4 dark:border-violet-500/40 dark:bg-[#111827]"
                          >
                            <div className="flex items-center gap-2 mb-3">
                              <span className="material-symbols-rounded text-sm text-[#2aa1a7]">shopping_bag</span>
                              <span className="text-xs font-semibold uppercase tracking-wider text-[#2d5f64] dark:text-violet-300">
                                Opciones online recomendadas
                              </span>
                            </div>

                            <div className="grid gap-2 sm:grid-cols-2">
                              {shoppingSuggestions.map((product) => {
                                const wishlistKey = `${msg.id}:${product.id}`;
                                const isSavingWishlist = savingWishlistKeys.has(wishlistKey);
                                const isSavedWishlist = savedWishlistKeys.has(wishlistKey);
                                return (
                                  <div
                                    key={product.id}
                                    className="group rounded-xl border border-white/70 bg-white/72 p-3 transition-colors hover:border-[#9fcfd2] dark:border-slate-600 dark:bg-[#0f172a] dark:hover:border-violet-400/70"
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0">
                                        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                                          {product.title}
                                        </p>
                                        <p className="text-[11px] text-gray-600 dark:text-gray-300 mt-0.5">
                                          {product.store_name}
                                        </p>
                                      </div>
                                      <a
                                        href={product.shop_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="material-symbols-rounded text-sm text-gray-500 transition-colors hover:text-[#2aa1a7] dark:text-gray-300 dark:hover:text-violet-500"
                                        aria-label={`Abrir ${product.title} en tienda`}
                                      >
                                        open_in_new
                                      </a>
                                    </div>
                                    {product.price_label && (
                                      <p className="mt-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                        {product.price_label}
                                      </p>
                                    )}
                                    {product.reason && (
                                      <p className="mt-1 text-[11px] text-gray-600 dark:text-gray-300 line-clamp-2">
                                        {product.reason}
                                      </p>
                                    )}
                                    <div className="mt-2">
                                      <button
                                        type="button"
                                        onClick={() => handleSaveShoppingSuggestionToWishlist(msg.id, product)}
                                        disabled={isSavingWishlist || isSavedWishlist}
                                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors ${isSavedWishlist
                                          ? 'border-emerald-300/70 text-emerald-700 dark:text-emerald-300 bg-emerald-50/70 dark:bg-emerald-900/20'
                                          : 'border-white/70 bg-white/56 text-[#14343b] hover:bg-white/82 disabled:opacity-70 dark:border-violet-300/70 dark:text-violet-300 dark:hover:bg-violet-900/20'
                                          }`}
                                      >
                                        {isSavedWishlist
                                          ? 'Guardada en wishlist'
                                          : isSavingWishlist
                                            ? 'Guardando...'
                                            : 'Guardar en wishlist'}
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}

                        {hasMessageActions && (
                          <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-3 flex flex-wrap gap-2"
                          >
                            {messageActions.map((action) => {
                              const targetSuggestion = action.type === 'save_to_wishlist'
                                ? (shoppingSuggestions.find((suggestion) => suggestion.id === action.suggestion_id) || null)
                                : null;
                              const actionKey = targetSuggestion
                                ? `${msg.id}:${targetSuggestion.id}`
                                : `${msg.id}:${action.id}`;
                              const isSavingAction = targetSuggestion ? savingWishlistKeys.has(actionKey) : false;
                              const isSavedAction = targetSuggestion ? savedWishlistKeys.has(actionKey) : false;
                              const actionLabel = isSavedAction
                                ? 'Guardada en wishlist'
                                : isSavingAction
                                  ? 'Guardando...'
                                  : action.label;
                              const actionIcon = action.type === 'view_outfit'
                                ? 'view_in_ar'
                                : action.type === 'open_saved_looks'
                                  ? 'photo_library'
                                  : action.type === 'open_wishlist'
                                    ? 'favorite'
                                    : action.type === 'open_closet_filtered'
                                      ? 'checkroom'
                                      : action.type === 'open_recommended_item'
                                        ? 'visibility'
                                        : action.type === 'open_studio_with_selection'
                                          ? 'auto_fix_high'
                                          : action.type === 'send_prompt'
                                            ? 'auto_awesome'
                                          : 'favorite';

                              return (
                                <button
                                  key={action.id}
                                  type="button"
                                  onClick={() => handleMessageUIAction(msg, action)}
                                  disabled={isSavingAction || isSavedAction}
                                  className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition-colors inline-flex items-center gap-1.5 ${isSavedAction
                                    ? 'border-emerald-300/70 text-emerald-700 dark:text-emerald-300 bg-emerald-50/70 dark:bg-emerald-900/20'
                                    : 'border-white/70 bg-white/56 text-[#14343b] hover:bg-white/82 disabled:opacity-70 dark:border-violet-300/70 dark:text-violet-300 dark:hover:bg-violet-900/20'
                                    }`}
                                >
                                  <span className="material-symbols-rounded text-sm">{actionIcon}</span>
                                  {actionLabel}
                                </button>
                              );
                            })}
                          </motion.div>
                        )}

                        <p className={`text-xs mt-1.5 px-1 text-gray-400 ${isUser ? 'text-right' : ''}`}>
                          {new Date(msg.timestamp).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}

                {/* Streaming message */}
                {isTyping && streamingMessage && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-white/60 bg-[linear-gradient(180deg,rgba(202,232,234,0.95),rgba(235,229,231,0.9))] shadow-sm">
                      <span className="material-symbols-rounded text-[16px] text-[#14343b]">checkroom</span>
                    </div>
                    <div className="flex-1 max-w-[90%]">
                      <div className="rounded-2xl border border-white/70 bg-[linear-gradient(180deg,rgba(223,231,236,0.76),rgba(255,255,255,0.66))] px-5 py-3.5 shadow-sm backdrop-blur-md dark:border-violet-500/50 dark:bg-[#111827]/90">
                        <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed font-medium text-gray-900 dark:text-gray-100">
                          {sanitizeUserInput(streamingMessage)}
                          <span className="ml-0.5 inline-block h-[1.05em] w-[0.12em] animate-pulse rounded-full bg-current align-[-0.12em]" />
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Typing indicator */}
                {isTyping && !streamingMessage && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-white/60 bg-[linear-gradient(180deg,rgba(202,232,234,0.95),rgba(235,229,231,0.9))] shadow-sm">
                      <span className="material-symbols-rounded text-[16px] text-[#14343b]">checkroom</span>
                    </div>
                    <div className="w-fit rounded-2xl border border-white/70 bg-[linear-gradient(180deg,rgba(223,231,236,0.76),rgba(255,255,255,0.66))] px-5 py-4 shadow-sm backdrop-blur-md dark:border-violet-500/40 dark:bg-[#111827]/90">
                      <div className="flex gap-1.5 items-center h-2">
                        {[0, 150, 300].map((delay, i) => (
                          <div
                            key={i}
                            className="h-2 w-2 animate-bounce rounded-full bg-[linear-gradient(180deg,#2aa1a7,#7baeb2)] shadow-[0_0_5px_rgba(42,161,167,0.35)]"
                            style={{ animationDelay: `${delay}ms` }}
                          />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Quick Actions */}
                {!isTyping && messages.length > 1 && messages[messages.length - 1]?.outfitSuggestion && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-wrap gap-2 justify-center py-2"
                  >
                    {QUICK_ACTIONS.map(action => (
                      <button
                        key={action.id}
                        onClick={() => handleSend(`Hacelo ${action.label.toLowerCase()}`)}
                        className="flex items-center gap-2 rounded-full border border-white/60 bg-white/52 px-4 py-2 text-xs font-bold text-gray-800 shadow-sm backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-[#9fcfd2] hover:bg-white/80 hover:text-[#14343b] hover:shadow-md dark:border-slate-600 dark:bg-slate-800/80 dark:text-gray-100 dark:hover:bg-slate-700 dark:hover:text-violet-300"
                      >
                        <span className="material-symbols-rounded text-sm">{action.icon}</span>
                        {action.label}
                      </button>
                    ))}
                  </motion.div>
                )}

                {lookCreation.status === 'generating' && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-white/70 bg-[linear-gradient(180deg,rgba(235,229,231,0.72),rgba(223,231,236,0.74))] p-4 dark:border-violet-800/40 dark:bg-violet-900/10"
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#2d5f64] dark:text-violet-300">
                      <span className="material-symbols-rounded animate-spin text-base">progress_activity</span>
                      Generando tu prenda con IA...
                    </div>
                    <p className="mt-1 text-xs text-[color:#55757b] dark:text-violet-300/80">
                      Esto puede tardar unos segundos.
                    </p>
                  </motion.div>
                )}

                {lookCreation.status === 'result' && lookCreation.generatedImageUrl && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(223,231,236,0.72))] p-4 dark:border-violet-600/40 dark:bg-[#111827]"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="material-symbols-rounded text-base text-[#2aa1a7]">auto_awesome</span>
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#2d5f64] dark:text-violet-300">
                        Prenda creada con IA
                      </span>
                    </div>

                    <div className="grid sm:grid-cols-[140px_1fr] gap-3 items-start">
                      <div className="aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-gray-700">
                        <img src={lookCreation.generatedImageUrl} alt="Prenda generada por IA" className="w-full h-full object-cover" />
                      </div>

                      <div className="space-y-3">
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                          <p><strong>Ocasión:</strong> {lookCreation.occasion}</p>
                          <p><strong>Estilo:</strong> {lookCreation.style}</p>
                          <p><strong>Categoría:</strong> {lookCreation.category ? getCategoryLabel(lookCreation.category) : '-'}</p>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-2">
                          <button
                            onClick={() => void handleSaveGeneratedItem()}
                            disabled={lookCreation.savedToCloset}
                            className="py-2.5 px-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                          >
                            {lookCreation.savedToCloset ? 'Guardada en armario' : 'Guardar en armario'}
                          </button>
                          <button
                            onClick={() => void handleSuggestOutfitWithGeneratedItem()}
                            disabled={isTyping}
                            className="rounded-xl border border-white/70 bg-white/58 px-3 py-2.5 text-sm font-semibold text-[#14343b] transition-colors hover:bg-white/82 disabled:cursor-not-allowed disabled:opacity-60 dark:border-violet-700/60 dark:text-violet-300 dark:hover:bg-violet-900/20"
                          >
                            Armar outfit completo
                          </button>
                        </div>

                        <div className="space-y-2 pt-1">
                          <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                            Modificar prenda con IA ({LOOK_EDIT_CREDIT_COST} usos)
                          </p>
                          <div className="flex gap-2">
                            <input
                              value={editInstructionInput}
                              onChange={(event) => setEditInstructionInput(event.target.value)}
                              placeholder='Ej: "cambiar color a negro" o "agregar estampa floral"'
                              disabled={isTyping || garmentEdit?.status === 'editing'}
                              className="flex-1 rounded-xl border border-white/70 bg-white/78 px-3 py-2 text-xs text-gray-700 placeholder-gray-400 shadow-inner focus:outline-none focus:ring-2 focus:ring-[#9fcfd2] dark:border-slate-500/70 dark:bg-slate-800/80 dark:text-gray-100"
                            />
                            <button
                              onClick={handlePrepareGarmentEditFromInput}
                              disabled={isTyping || garmentEdit?.status === 'editing'}
                              className="rounded-xl border border-white/70 bg-white/58 px-3 py-2 text-xs font-semibold text-[#14343b] transition-colors hover:bg-white/82 disabled:cursor-not-allowed disabled:opacity-60 dark:border-violet-700/60 dark:text-violet-300 dark:hover:bg-violet-900/20"
                            >
                              Modificar
                            </button>
                          </div>

                          {garmentEdit?.status === 'confirming' && (
                            <div className="rounded-xl border border-white/70 bg-[linear-gradient(180deg,rgba(235,229,231,0.72),rgba(255,255,255,0.82))] p-2.5 dark:border-violet-800/50 dark:bg-violet-900/20">
                              <p className="text-xs font-semibold text-[#2d5f64] dark:text-violet-300">
                                Esta edición cuesta {LOOK_EDIT_CREDIT_COST} usos premium.
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <button
                                  onClick={() => void handleConfirmGarmentEdit()}
                                  disabled={isTyping}
                                  className="rounded-lg bg-[#14343b] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#102830] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Confirmar edición
                                </button>
                                <button
                                  onClick={handleCancelGarmentEdit}
                                  disabled={isTyping}
                                  className="rounded-lg border border-white/70 bg-white/56 px-3 py-1.5 text-xs font-semibold text-[#14343b] transition-colors hover:bg-white/82 disabled:cursor-not-allowed disabled:opacity-60 dark:border-violet-700/60 dark:text-violet-300 dark:hover:bg-violet-900/30"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          )}

                          {garmentEdit?.status === 'editing' && (
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#2d5f64] dark:text-violet-300">
                              <span className="material-symbols-rounded animate-spin text-sm">progress_activity</span>
                              Aplicando cambios en la prenda...
                            </div>
                          )}
                        </div>

                        <div className="space-y-2 pt-2 border-t border-gray-200/70 dark:border-gray-700/70">
                          <input
                            ref={selfieInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(event) => void handleSelfieUpload(event)}
                            className="hidden"
                          />

                          <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                            Probador virtual ({TRY_ON_CREDIT_COST} usos)
                          </p>

                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => selfieInputRef.current?.click()}
                              disabled={isTyping || tryOn.status === 'generating'}
                              className="rounded-xl border border-white/70 bg-white/56 px-3 py-2 text-xs font-semibold text-[#14343b] transition-all hover:border-[#9fcfd2] hover:bg-white/82 dark:border-gray-700/70 dark:bg-transparent dark:text-gray-200 dark:hover:text-violet-300 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {tryOn.selfieImageDataUrl ? 'Cambiar selfie' : 'Subir selfie'}
                            </button>
                            <button
                              onClick={handlePrepareTryOn}
                              disabled={isTyping || tryOn.status === 'generating'}
                              className="rounded-xl border border-white/70 bg-white/58 px-3 py-2 text-xs font-semibold text-[#14343b] transition-colors hover:bg-white/82 dark:border-violet-700/60 dark:text-violet-300 dark:hover:bg-violet-900/20 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Probar en mí
                            </button>
                          </div>

                          {tryOn.selfieImageDataUrl && (
                            <div className="w-20 h-28 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                              <img src={tryOn.selfieImageDataUrl} alt="Selfie cargada" className="w-full h-full object-cover" />
                            </div>
                          )}

                          {tryOn.status === 'confirming' && (
                            <div className="rounded-xl border border-white/70 bg-[linear-gradient(180deg,rgba(223,231,236,0.76),rgba(255,255,255,0.8))] p-2.5 dark:border-violet-800/50 dark:bg-violet-900/20">
                              <p className="text-xs font-semibold text-[#2d5f64] dark:text-violet-300">
                                Esta prueba virtual cuesta {TRY_ON_CREDIT_COST} usos premium.
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <button
                                  onClick={() => void handleConfirmTryOn()}
                                  disabled={isTyping}
                                  className="rounded-lg bg-[#14343b] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#102830] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Confirmar prueba
                                </button>
                                <button
                                  onClick={handleCancelTryOn}
                                  disabled={isTyping}
                                  className="rounded-lg border border-white/70 bg-white/56 px-3 py-1.5 text-xs font-semibold text-[#14343b] transition-colors hover:bg-white/82 disabled:cursor-not-allowed disabled:opacity-60 dark:border-violet-700/60 dark:text-violet-300 dark:hover:bg-violet-900/30"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          )}

                          {tryOn.status === 'generating' && (
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#2d5f64] dark:text-violet-300">
                              <span className="material-symbols-rounded animate-spin text-sm">progress_activity</span>
                              Generando tu prueba virtual...
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {tryOn.resultImageUrl && (
                      <div className="mt-4 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-black/20">
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-2">
                          Resultado del probador virtual
                        </p>
                        <div className="max-w-sm rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                          <img src={tryOn.resultImageUrl} alt="Resultado probador virtual" className="w-full h-auto object-cover" />
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                <div ref={messagesEndRef} className="h-4" />
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="shrink-0 border-t border-white/30 bg-white/32 p-3 pb-[max(calc(env(safe-area-inset-bottom)+0.75rem),1rem)] backdrop-blur-xl dark:border-slate-600/70 dark:bg-[#0f172a]/90 sm:p-4 sm:pb-4">
            <div className="max-w-3xl mx-auto">
              {shouldRenderPromptTray && (
                <div className={`overflow-hidden rounded-2xl border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.74),rgba(223,231,236,0.64))] shadow-sm backdrop-blur-md dark:border-slate-600/80 dark:bg-slate-800/80 ${showPromptTray ? 'mb-2' : 'mb-3'}`}>
                  <button
                    type="button"
                    onClick={() => setShowPromptTray((prev) => !prev)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                  >
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#2d5f64] dark:text-violet-300">
                        {isMobileChatLayout ? 'Ideas rápidas' : 'Atajos de Kumbi'}
                      </p>
                      {!isMobileChatLayout && (
                        <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">Ideas rápidas para arrancar.</p>
                      )}
                    </div>
                    <span className={`material-symbols-rounded text-[#14343b] transition-transform dark:text-gray-100 ${showPromptTray ? 'rotate-180' : ''}`}>expand_more</span>
                  </button>
                  <AnimatePresence initial={false}>
                    {showPromptTray && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        className="overflow-hidden border-t border-white/50 dark:border-slate-600/70"
                      >
                        <div className={isMobileChatLayout ? 'max-h-44 overflow-y-auto' : undefined}>
                          <div className={isMobileChatLayout ? 'flex gap-2 overflow-x-auto px-4 py-3' : 'flex flex-wrap gap-2 px-4 py-3'}>
                            {contextualPromptChips.map((promptOption) => (
                              <button
                                key={`contextual-${promptOption.label}`}
                                onClick={() => handleSend(promptOption.prompt)}
                                disabled={isTyping}
                                className={`inline-flex items-center gap-1.5 rounded-full border border-[#9fcfd2] bg-[linear-gradient(180deg,rgba(202,232,234,0.86),rgba(223,231,236,0.82))] px-3 py-1.5 text-xs font-semibold text-[#14343b] transition-all hover:bg-[linear-gradient(180deg,rgba(202,232,234,0.98),rgba(223,231,236,0.95))] disabled:opacity-50 dark:border-violet-700/60 dark:bg-violet-900/20 dark:text-violet-300 dark:hover:bg-violet-900/30 ${isMobileChatLayout ? 'shrink-0' : ''}`}
                              >
                                <span className="material-symbols-rounded text-sm">auto_awesome</span>
                                {promptOption.label}
                              </button>
                            ))}
                            {STYLIST_QUICK_PROMPTS
                              .filter((promptOption) => useKumbiLookExtraction || promptOption.attachmentKind !== 'extractable_look')
                              .map((promptOption) => (
                                <button
                                  key={promptOption.label}
                                  onClick={() => {
                                    if (promptOption.attachmentKind === 'reference_look') {
                                      if (promptOption.referenceMode === 'feedback') {
                                        referenceFeedbackInputRef.current?.click();
                                      } else {
                                        referenceLookInputRef.current?.click();
                                      }
                                      return;
                                    }
                                    if (promptOption.attachmentKind === 'extractable_look') {
                                      extractableLookInputRef.current?.click();
                                      return;
                                    }
                                    handleSend(promptOption.prompt);
                                  }}
                                  disabled={isTyping}
                                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all disabled:opacity-50 ${isMobileChatLayout ? 'shrink-0' : ''} ${promptOption.isPremium
                                    ? 'border-[#d8c1c9] bg-[linear-gradient(180deg,rgba(235,229,231,0.9),rgba(223,231,236,0.82))] text-[#14343b] hover:bg-[linear-gradient(180deg,rgba(235,229,231,0.98),rgba(223,231,236,0.92))] dark:border-violet-700/60 dark:bg-violet-900/20 dark:text-violet-300 dark:hover:bg-violet-900/30'
                                    : 'border-white/70 bg-white/62 text-[#14343b] hover:border-[#9fcfd2] hover:bg-white/82 dark:border-slate-500/80 dark:bg-slate-800/80 dark:text-gray-100 dark:hover:text-violet-300'}`}
                                >
                                  <span className="material-symbols-rounded text-sm">{promptOption.icon}</span>
                                  {promptOption.label}
                                  {promptOption.isPremium && (
                                    <span className="rounded-full bg-white/70 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#2d5f64] dark:bg-violet-950/50 dark:text-violet-200">
                                      {LOOK_CREATION_CREDIT_COST} usos
                                    </span>
                                  )}
                                </button>
                              ))}
                          </div>
                        </div>
                        {!isMobileChatLayout && (
                          <div className="border-t border-white/50 px-4 py-2.5 dark:border-slate-600/70">
                            <p className="text-[11px] text-gray-600 dark:text-gray-300">Las referencias visuales, la extracción de prendas y el probador usan IA segura del servidor.</p>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              {((useGuidedLookBackend && guidedWorkflow?.status === 'choosing_mode') || stylistTask?.status === 'resolving_intent') && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {stylistTask?.status === 'resolving_intent' ? (
                    <>
                      <button
                        onClick={() => handleSend('outfit con mi armario')}
                        disabled={isTyping}
                        className="rounded-full border border-white/70 bg-[linear-gradient(180deg,rgba(202,232,234,0.86),rgba(223,231,236,0.82))] px-3 py-1.5 text-xs font-semibold text-[#14343b] transition-all hover:bg-[linear-gradient(180deg,rgba(202,232,234,0.98),rgba(223,231,236,0.95))] disabled:opacity-50 dark:border-violet-700/60 dark:bg-violet-900/20 dark:text-violet-300 dark:hover:bg-violet-900/30"
                      >
                        Armar outfit con mi armario
                      </button>
                      <button
                        onClick={() => handleSend('prenda nueva')}
                        disabled={isTyping}
                        className="rounded-full border border-white/70 bg-white/62 px-3 py-1.5 text-xs font-semibold text-[#14343b] transition-all hover:border-[#9fcfd2] hover:bg-white/82 dark:border-slate-500/80 dark:bg-slate-800/80 dark:text-gray-100 dark:hover:text-violet-300 disabled:opacity-50"
                      >
                        Generar prenda nueva con IA
                      </button>
                      <button
                        onClick={() => handleSend('elegí vos')}
                        disabled={isTyping}
                        className="rounded-full border border-white/70 bg-white/62 px-3 py-1.5 text-xs font-semibold text-[#14343b] transition-all hover:border-[#9fcfd2] hover:bg-white/82 dark:border-slate-500/80 dark:bg-slate-800/80 dark:text-gray-100 dark:hover:text-violet-300 disabled:opacity-50"
                      >
                        Elegí vos
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleSend('directo')}
                        disabled={isTyping}
                        className="rounded-full border border-white/70 bg-[linear-gradient(180deg,rgba(202,232,234,0.86),rgba(223,231,236,0.82))] px-3 py-1.5 text-xs font-semibold text-[#14343b] transition-all hover:bg-[linear-gradient(180deg,rgba(202,232,234,0.98),rgba(223,231,236,0.95))] disabled:opacity-50 dark:border-violet-700/60 dark:bg-violet-900/20 dark:text-violet-300 dark:hover:bg-violet-900/30"
                      >
                        Directo ({guidedWorkflow?.estimatedCostCredits || LOOK_CREATION_CREDIT_COST} usos)
                      </button>
                      <button
                        onClick={() => handleSend('guiado')}
                        disabled={isTyping}
                        className="rounded-full border border-white/70 bg-white/62 px-3 py-1.5 text-xs font-semibold text-[#14343b] transition-all hover:border-[#9fcfd2] hover:bg-white/82 dark:border-slate-500/80 dark:bg-slate-800/80 dark:text-gray-100 dark:hover:text-violet-300 disabled:opacity-50"
                      >
                        Guiado
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleSend('cancelar')}
                    disabled={isTyping}
                    className="px-3 py-1.5 rounded-full border border-gray-300/70 dark:border-slate-500/80 bg-white/70 dark:bg-slate-800/80 text-gray-700 dark:text-gray-100 text-xs font-semibold hover:border-red-400/60 hover:text-red-600 dark:hover:text-red-300 transition-all disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                </div>
              )}
              {useGuidedLookBackend && (
                <div className="mb-2">
                  <label className="inline-flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={guidedAutosaveEnabled}
                      onChange={(event) => void handleGuidedAutosaveToggle(event.target.checked)}
                      disabled={isTyping}
                      className="h-4 w-4 rounded border-gray-300 text-[#2aa1a7] focus:ring-[#9fcfd2]"
                    />
                    Guardar automáticamente en mi armario cuando genere algo premium
                  </label>
                </div>
              )}
              {lookCreation.status === 'collecting' && lookCreation.awaitingField && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {LOOK_CREATION_QUICK_OPTIONS[lookCreation.awaitingField].map((option) => (
                    <button
                      key={`${lookCreation.awaitingField}-${option.value}`}
                      onClick={() => handleSend(option.value)}
                      disabled={isTyping}
                      className="rounded-full border border-white/70 bg-white/62 px-3 py-1.5 text-xs font-semibold text-[#14343b] transition-all hover:border-[#9fcfd2] hover:bg-white/82 dark:border-slate-500/80 dark:bg-slate-800/80 dark:text-gray-100 dark:hover:text-violet-300 disabled:opacity-50"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
              {useGuidedLookBackend && lookCreation.status === 'confirming' && guidedWorkflow?.pendingAction === 'generate' && (
                <div className="mb-2 rounded-xl border border-white/70 bg-[linear-gradient(180deg,rgba(235,229,231,0.72),rgba(255,255,255,0.82))] p-3 dark:border-violet-800/50 dark:bg-violet-900/20">
                  <p className="text-xs font-semibold text-[#2d5f64] dark:text-violet-300">
                    Esta generación premium cuesta {guidedWorkflow?.estimatedCostCredits || LOOK_CREATION_CREDIT_COST} usos premium.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      onClick={() => void handleGuidedConfirmGenerate()}
                      disabled={isTyping}
                      className="rounded-lg bg-[#14343b] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#102830] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Confirmar
                    </button>
                    <button
                      onClick={() => void handleGuidedCancelGenerate()}
                      disabled={isTyping}
                      className="rounded-lg border border-white/70 bg-white/56 px-3 py-1.5 text-xs font-semibold text-[#14343b] transition-colors hover:bg-white/82 disabled:cursor-not-allowed disabled:opacity-60 dark:border-violet-700/60 dark:text-violet-300 dark:hover:bg-violet-900/30"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
              {(pendingReferenceLook || pendingExtractableLook) && (() => {
                const pendingLookAttachment = pendingExtractableLook || pendingReferenceLook;
                const isExtractionAttachment = pendingLookAttachment?.kind === 'extractable_look';
                const isFeedbackReference = pendingLookAttachment?.kind === 'reference_look' && pendingReferenceAttachmentMode === 'feedback';
                const title = isExtractionAttachment
                  ? 'Foto para guardar prendas'
                  : isFeedbackReference
                    ? 'Foto para pedir opinión'
                    : 'Look de referencia';
                const description = isExtractionAttachment
                  ? 'Voy a separar las prendas principales visibles y te las voy a dejar listas para revisar antes de guardarlas.'
                  : isFeedbackReference
                    ? 'Voy a mirar la prenda o el look y te voy a decir qué funciona, qué no y cómo lo mejoraría.'
                    : 'Voy a recrearlo con tu armario y compensar con capas o accesorios si hace falta.';
                const compactLabel = isExtractionAttachment
                  ? 'Foto lista para guardar prendas'
                  : isFeedbackReference
                    ? 'Foto lista para pedir opinión'
                    : 'Look de referencia listo para recrear';

                return (
                showMinimalMobileContext ? (
                  <div className="mb-2 flex items-center gap-2 rounded-2xl border border-white/70 bg-[linear-gradient(180deg,rgba(235,229,231,0.78),rgba(223,231,236,0.72))] px-3 py-2 dark:border-violet-800/50 dark:bg-violet-900/20">
                    <button
                      type="button"
                      onClick={() => openImagePreview(
                        pendingLookAttachment?.imageDataUrl || '',
                        title,
                        isExtractionAttachment ? 'kumbi-prendas-del-look.jpg' : 'kumbi-look-de-referencia.jpg',
                      )}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-white/70 bg-white/70 dark:border-violet-700/60 dark:bg-slate-900/70">
                        <img src={pendingLookAttachment?.imageDataUrl} alt={title} className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-[#14343b] dark:text-gray-100">{compactLabel}</p>
                        <p className="text-[11px] text-[#355e64] dark:text-gray-300">Tocá la foto para abrirla</p>
                      </div>
                    </button>
                    <button
                      onClick={clearPendingAttachment}
                      type="button"
                      className="rounded-full border border-white/70 bg-white/52 p-1.5 text-[#14343b] transition-colors hover:bg-white/82 dark:border-violet-700/60 dark:text-violet-300 dark:hover:bg-violet-900/30"
                      aria-label="Quitar referencia"
                    >
                      <span className="material-symbols-rounded text-sm">close</span>
                    </button>
                  </div>
                ) : (
                  <div className="mb-3 flex items-center gap-3 rounded-2xl border border-white/70 bg-[linear-gradient(180deg,rgba(235,229,231,0.78),rgba(223,231,236,0.72))] p-3 dark:border-violet-800/50 dark:bg-violet-900/20">
                    <button
                      type="button"
                      onClick={() => openImagePreview(
                        pendingLookAttachment?.imageDataUrl || '',
                        title,
                        isExtractionAttachment ? 'kumbi-prendas-del-look.jpg' : 'kumbi-look-de-referencia.jpg',
                      )}
                      className="h-16 w-16 overflow-hidden rounded-xl border border-white/70 bg-white/70 dark:border-violet-700/60 dark:bg-slate-900/70"
                    >
                      <img src={pendingLookAttachment?.imageDataUrl} alt={title} className="h-full w-full object-cover" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#2d5f64] dark:text-violet-300">
                        {title}
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-200">{description}</p>
                      <p className="mt-1 text-xs text-[#355e64] dark:text-gray-300">Tocá la miniatura para abrirla.</p>
                    </div>
                    <button
                      onClick={clearPendingAttachment}
                      type="button"
                      className="rounded-full border border-white/70 bg-white/52 p-2 text-[#14343b] transition-colors hover:bg-white/82 dark:border-violet-700/60 dark:text-violet-300 dark:hover:bg-violet-900/30"
                      aria-label="Quitar referencia"
                    >
                      <span className="material-symbols-rounded text-sm">close</span>
                    </button>
                  </div>
                )
                );
              })()}
              {effectiveSelectedLookContext && (
                showMinimalMobileContext ? (
                  <div className="mb-2 flex items-center gap-2 rounded-2xl border border-white/70 bg-[linear-gradient(180deg,rgba(244,238,225,0.85),rgba(232,223,204,0.76))] px-3 py-2 dark:border-amber-700/50 dark:bg-amber-900/20">
                    <span className="material-symbols-rounded text-base text-[#7a5b39] dark:text-amber-300">style</span>
                    <p className="min-w-0 flex-1 truncate text-xs font-semibold text-[#3b2b1d] dark:text-amber-50">{effectiveSelectedLookContext.name || 'Look guardado seleccionado'}</p>
                    {onClearSelectedLookContext && (
                      <button
                        onClick={onClearSelectedLookContext}
                        type="button"
                        className="rounded-full border border-white/70 bg-white/52 p-1.5 text-[#5a422b] transition-colors hover:bg-white/82 dark:border-amber-700/60 dark:text-amber-300 dark:hover:bg-amber-900/30"
                        aria-label="Quitar look seleccionado"
                      >
                        <span className="material-symbols-rounded text-sm">close</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="mb-3 flex items-center gap-3 rounded-2xl border border-white/70 bg-[linear-gradient(180deg,rgba(244,238,225,0.85),rgba(232,223,204,0.76))] p-3 dark:border-amber-700/50 dark:bg-amber-900/20">
                    {(() => {
                      const lookItemIds = effectiveSelectedLookContext.clothing_item_ids || [];
                      const resolvedItems = lookItemIds
                        .map((itemId: string) => enrichedCloset.find((ci) => ci.id === itemId))
                        .filter(Boolean)
                        .slice(0, 3) as typeof closet;
                      return resolvedItems.length > 0 ? (
                        <div className="flex -space-x-2.5">
                          {resolvedItems.map((item) => (
                            <img
                              key={item.id}
                              src={item.imageDataUrl}
                              alt={item.metadata.subcategory}
                              className="h-14 w-14 rounded-xl border-2 border-[#f0e8db] object-cover shadow-sm"
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/70 bg-white/60 text-[#6b4b2a] dark:border-amber-700/60 dark:bg-slate-900/70 dark:text-amber-200">
                          <span className="material-symbols-rounded text-2xl">style</span>
                        </div>
                      );
                    })()}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#7a5b39] dark:text-amber-300">
                        Look seleccionado
                      </p>
                      <p className="truncate text-sm font-semibold text-[#3b2b1d] dark:text-amber-50">
                        {effectiveSelectedLookContext.name || 'Look guardado'}
                      </p>
                      <p className="text-xs text-[#5f4936] dark:text-amber-100/80">
                        Lo voy a usar como referencia para variantes o adaptaciones.
                      </p>
                    </div>
                    {onClearSelectedLookContext && (
                      <button
                        onClick={onClearSelectedLookContext}
                        type="button"
                        className="rounded-full border border-white/70 bg-white/52 p-2 text-[#5a422b] transition-colors hover:bg-white/82 dark:border-amber-700/60 dark:text-amber-300 dark:hover:bg-amber-900/30"
                        aria-label="Quitar look seleccionado"
                      >
                        <span className="material-symbols-rounded text-sm">close</span>
                      </button>
                    )}
                  </div>
                )
              )}
              {selectedItemContext && (
                showMinimalMobileContext ? (
                  <div className="mb-2 flex items-center gap-2 rounded-2xl border border-white/70 bg-[linear-gradient(180deg,rgba(230,242,244,0.86),rgba(220,233,236,0.78))] px-3 py-2 dark:border-cyan-700/50 dark:bg-cyan-900/20">
                    <span className="material-symbols-rounded text-base text-[#2d5f64] dark:text-cyan-300">checkroom</span>
                    <p className="min-w-0 flex-1 truncate text-xs font-semibold text-[#14343b] dark:text-cyan-50">{selectedItemContext.subcategory || 'Prenda en foco'}</p>
                  </div>
                ) : (
                  <div className="mb-3 flex items-center gap-3 rounded-2xl border border-white/70 bg-[linear-gradient(180deg,rgba(230,242,244,0.86),rgba(220,233,236,0.78))] p-3 dark:border-cyan-700/50 dark:bg-cyan-900/20">
                    <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-white/70 bg-white/60 text-[#24515a] dark:border-cyan-700/60 dark:bg-slate-900/70 dark:text-cyan-200">
                      <span className="material-symbols-rounded text-3xl">checkroom</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#2d5f64] dark:text-cyan-300">
                        Prenda en foco
                      </p>
                      <p className="truncate text-sm font-semibold text-[#14343b] dark:text-cyan-50">
                        {selectedItemContext.subcategory || 'Prenda seleccionada'}
                      </p>
                      <p className="text-sm text-[#345760] dark:text-cyan-100/80">
                        {[
                          selectedItemContext.color_primary,
                          selectedItemContext.category,
                        ].filter(Boolean).join(' · ') || 'La voy a usar como contexto principal para combinar, comparar o destrabar un look.'}
                      </p>
                    </div>
                  </div>
                )
              )}
              <div className="relative flex items-end gap-1.5 sm:gap-2">
                <input
                  ref={referenceLookInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(event) => void handleReferenceLookUpload(event)}
                  className="hidden"
                />
                <input
                  ref={referenceFeedbackInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(event) => void handleReferenceFeedbackUpload(event)}
                  className="hidden"
                />
                <input
                  ref={extractableLookInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(event) => void handleExtractableLookUpload(event)}
                  className="hidden"
                />
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onFocus={() => {
                      if (isMobileChatLayout) {
                        setShowPromptTray(false);
                        setShowAttachmentMenu(false);
                      }
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={inputPlaceholder}
                    disabled={isTyping}
                    rows={1}
                    className="w-full resize-none rounded-2xl border border-white/70 bg-white/74 px-4 py-3 text-sm font-medium text-gray-900 shadow-inner transition-all placeholder:text-gray-500/80 focus:outline-none focus:ring-2 focus:ring-[#9fcfd2] disabled:opacity-50 dark:border-slate-500 dark:bg-slate-800/80 dark:text-gray-100 dark:placeholder-gray-400 sm:px-5 sm:py-3.5"
                    style={{ maxHeight: '120px' }}
                  />
                </div>
                {isMobileChatLayout ? (
                  <div className="relative shrink-0">
                    <button
                      onClick={() => setShowAttachmentMenu((prev) => !prev)}
                      disabled={isTyping}
                      className={`rounded-2xl border p-3 transition-all ${pendingAttachments.length > 0
                        ? 'border-[#9fcfd2] bg-[linear-gradient(180deg,rgba(202,232,234,0.9),rgba(223,231,236,0.86))] text-[#14343b] dark:border-violet-600 dark:bg-violet-900/20 dark:text-violet-300'
                        : 'border-white/70 bg-white/70 text-[#14343b] dark:border-slate-500 dark:bg-slate-800/80 dark:text-gray-200'} disabled:opacity-50`}
                      title="Adjuntar foto"
                      type="button"
                      aria-label="Adjuntar foto"
                    >
                      <span className="material-symbols-rounded font-bold drop-shadow-sm">add_photo_alternate</span>
                    </button>
                    <AnimatePresence>
                      {showAttachmentMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 8 }}
                          className="absolute bottom-full right-0 z-20 mb-2 w-64 overflow-hidden rounded-2xl border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(223,231,236,0.94))] p-1.5 shadow-xl backdrop-blur-md dark:border-slate-600 dark:bg-slate-900/95"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setShowAttachmentMenu(false);
                              referenceLookInputRef.current?.click();
                            }}
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-white/80 dark:hover:bg-slate-800"
                          >
                            <span className="material-symbols-rounded text-[#14343b] dark:text-violet-300">imagesmode</span>
                            <div>
                              <p className="text-sm font-semibold text-[#14343b] dark:text-gray-100">Usar foto como inspiración</p>
                              <p className="text-xs text-[#355e64] dark:text-gray-300">Kumbi la recrea con tu armario.</p>
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowAttachmentMenu(false);
                              referenceFeedbackInputRef.current?.click();
                            }}
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-white/80 dark:hover:bg-slate-800"
                          >
                            <span className="material-symbols-rounded text-[#14343b] dark:text-violet-300">rate_review</span>
                            <div>
                              <p className="text-sm font-semibold text-[#14343b] dark:text-gray-100">Pedir opinión sobre la foto</p>
                              <p className="text-xs text-[#355e64] dark:text-gray-300">Kumbi la analiza y te dice qué piensa.</p>
                            </div>
                          </button>
                          {useKumbiLookExtraction && (
                            <button
                              type="button"
                              onClick={() => {
                                setShowAttachmentMenu(false);
                                extractableLookInputRef.current?.click();
                              }}
                              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-white/80 dark:hover:bg-slate-800"
                            >
                              <span className="material-symbols-rounded text-[#14343b] dark:text-violet-300">inventory_2</span>
                              <div>
                                <p className="text-sm font-semibold text-[#14343b] dark:text-gray-100">Guardar prendas del look</p>
                                <p className="text-xs text-[#355e64] dark:text-gray-300">Separo las prendas y las revisás.</p>
                              </div>
                            </button>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => referenceLookInputRef.current?.click()}
                      disabled={isTyping}
                      className={`p-3.5 rounded-2xl border transition-all ${pendingReferenceLook
                        ? 'border-[#9fcfd2] bg-[linear-gradient(180deg,rgba(202,232,234,0.9),rgba(223,231,236,0.86))] text-[#14343b] dark:border-violet-600 dark:bg-violet-900/20 dark:text-violet-300'
                        : 'border-white/70 bg-white/70 text-[#14343b] dark:border-slate-500 dark:bg-slate-800/80 dark:text-gray-200'} disabled:opacity-50`}
                      title="Usar foto como inspiración"
                      aria-label="Usar foto como inspiración"
                      type="button"
                    >
                      <span className="material-symbols-rounded font-bold drop-shadow-sm">imagesmode</span>
                    </button>
                    <button
                      onClick={() => referenceFeedbackInputRef.current?.click()}
                      disabled={isTyping}
                      className={`p-3.5 rounded-2xl border transition-all ${pendingReferenceLook && pendingReferenceAttachmentMode === 'feedback'
                        ? 'border-[#9fcfd2] bg-[linear-gradient(180deg,rgba(202,232,234,0.9),rgba(223,231,236,0.86))] text-[#14343b] dark:border-violet-600 dark:bg-violet-900/20 dark:text-violet-300'
                        : 'border-white/70 bg-white/70 text-[#14343b] dark:border-slate-500 dark:bg-slate-800/80 dark:text-gray-200'} disabled:opacity-50`}
                      title="Pedir opinión sobre una foto"
                      aria-label="Pedir opinión sobre una foto"
                      type="button"
                    >
                      <span className="material-symbols-rounded font-bold drop-shadow-sm">rate_review</span>
                    </button>
                    {useKumbiLookExtraction && (
                      <button
                        onClick={() => extractableLookInputRef.current?.click()}
                        disabled={isTyping}
                        className={`p-3.5 rounded-2xl border transition-all ${pendingExtractableLook
                          ? 'border-[#9fcfd2] bg-[linear-gradient(180deg,rgba(202,232,234,0.9),rgba(223,231,236,0.86))] text-[#14343b] dark:border-violet-600 dark:bg-violet-900/20 dark:text-violet-300'
                          : 'border-white/70 bg-white/70 text-[#14343b] dark:border-slate-500 dark:bg-slate-800/80 dark:text-gray-200'} disabled:opacity-50`}
                        title="Guardar prendas del look"
                        aria-label="Guardar prendas del look"
                        type="button"
                      >
                        <span className="material-symbols-rounded font-bold drop-shadow-sm">inventory_2</span>
                      </button>
                    )}
                  </>
                )}
                <button
                  onClick={() => handleSend(inputValue)}
                  disabled={(!inputValue.trim() && pendingAttachments.length === 0) || isTyping}
                  className="shrink-0 rounded-2xl bg-gray-900 p-3 text-white shadow-md transition-all hover:scale-105 hover:bg-gray-800 hover:shadow-xl active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 sm:p-3.5"
                  title="Enviar"
                >
                  <span className="material-symbols-rounded font-bold drop-shadow-sm">send</span>
                </button>
              </div>

              {/* Credits warning */}
              {chatCreditsStatus.limit !== -1 && chatCreditsStatus.remaining <= 5 && (
                <p className="text-xs text-center text-red-500 dark:text-red-400 mt-2 flex items-center justify-center gap-1 font-semibold animate-pulse">
                  <span className="material-symbols-rounded text-sm drop-shadow-sm">warning</span>
                  Te quedan {chatCreditsStatus.remaining} usos este mes
                </p>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {imagePreview && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[85] bg-black/70 backdrop-blur-sm"
              onClick={() => setImagePreview(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="absolute inset-x-0 bottom-0 z-[86] mx-auto w-full max-w-lg rounded-t-[28px] border border-white/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(223,231,236,0.94))] p-4 shadow-2xl dark:border-slate-600 dark:bg-slate-900/96 sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[min(92vw,32rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[28px]"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#14343b] dark:text-gray-100">{imagePreview.title}</p>
                  <p className="mt-1 text-xs text-[#355e64] dark:text-gray-300">Podés abrirla completa o descargarla.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setImagePreview(null)}
                  className="rounded-xl border border-white/60 bg-white/70 p-2 text-[#14343b] transition-colors hover:bg-white dark:border-slate-600 dark:bg-slate-800 dark:text-gray-100 dark:hover:bg-slate-700"
                  aria-label="Cerrar vista previa"
                >
                  <span className="material-symbols-rounded text-sm">close</span>
                </button>
              </div>

              <div className="overflow-hidden rounded-2xl border border-white/70 bg-white/70 dark:border-slate-600 dark:bg-slate-800">
                <img src={imagePreview.src} alt={imagePreview.title} className="max-h-[65vh] w-full object-contain" />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={imagePreview.src}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/70 bg-white/80 px-3 py-2 text-sm font-semibold text-[#14343b] transition-colors hover:bg-white dark:border-slate-600 dark:bg-slate-800 dark:text-gray-100 dark:hover:bg-slate-700"
                >
                  <span className="material-symbols-rounded text-sm">open_in_new</span>
                  Abrir imagen
                </a>
                <button
                  type="button"
                  onClick={handlePreviewDownload}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#14343b] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#102830]"
                >
                  <span className="material-symbols-rounded text-sm">download</span>
                  Descargar
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Limit Reached Modal */}
      <LimitReachedModal
        isOpen={showLimitModal}
        onClose={() => {
          setShowLimitModal(false);
          setLimitModalSource(null);
        }}
        onUpgrade={() => {
          setShowLimitModal(false);
          if (limitModalSource === 'guided' && guidedWorkflow?.sessionId) {
            trackGuidedLookUpgradeCTAClick({
              session_id: guidedWorkflow.sessionId,
              category: guidedWorkflow.collected.category,
              occasion: guidedWorkflow.collected.occasion,
              style: guidedWorkflow.collected.style,
              error_code: guidedWorkflow.errorCode || undefined,
            });
          }
          setLimitModalSource(null);
          onUpgrade?.();
        }}
        tier={subscription.tier}
      />
    </motion.div>
  );
};

export default AIStylistView;
