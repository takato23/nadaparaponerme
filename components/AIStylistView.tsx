/**
 * AIStylistView - Estilista IA Premium
 *
 * Interfaz moderna y elegante para el asistente de moda con IA.
 * Diseño profesional inspirado en ChatGPT/Claude.
 *
 * @version 4.0
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ClothingItem, ChatMessage, ChatConversation, GuidedLookWorkflowResponse } from '../types';
import { chatWithFashionAssistantWorkflow, chatWithStudioStylist, generateVirtualTryOnWithSlots } from '../src/services/aiService';
import { sanitizeUserInput } from '../utils/sanitize';
import { useSubscription } from '../hooks/useSubscription';
import { LimitReachedModal } from './QuotaIndicator';
import { getCreditStatus } from '../src/services/usageTrackingService';
import { aiImageService } from '../src/services/aiImageService';
import { getFeatureFlag } from '../src/config/features';
import {
  LOOK_EDIT_CREDIT_COST,
  LOOK_CREATION_CREDIT_COST,
  TRY_ON_CREDIT_COST,
  buildGarmentEditPrompt,
  type LookCreationDraft,
  type MissingLookField,
  buildLookCostMessage,
  buildLookCreationPrompt,
  detectGarmentEditIntent,
  detectLookCreationIntent,
  getCategoryLabel,
  getLookFieldQuestion,
  getMissingLookFields,
  isAffirmative,
  isNegative,
  mapLookCategoryToTryOnSlot,
  parseLookCreationCategory,
  parseLookCreationFields,
} from '../src/services/lookCreationFlow';
import {
  getGuidedLookErrorMessage,
  mapGuidedStatusToLookCreationStatus,
} from '../src/services/guidedLookWorkflowUi';
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
  trackVirtualTryOn
} from '../src/services/analyticsService';

// ============================================================================
// TYPES
// ============================================================================

interface AIStylistViewProps {
  closet: ClothingItem[];
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
}

interface Suggestion {
  id: string;
  icon: string;
  label: string;
  description: string;
  prompt: string;
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

// ============================================================================
// CONSTANTS
// ============================================================================

const SUGGESTIONS: Suggestion[] = [
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
];

const QUICK_ACTIONS = [
  { id: 'formal', label: 'Más formal', icon: 'straighten' },
  { id: 'casual', label: 'Más casual', icon: 'spa' },
  { id: 'colors', label: 'Cambiar colores', icon: 'palette' },
  { id: 'alternative', label: 'Otra opción', icon: 'autorenew' },
];

const START_LOOK_CREATION_PROMPT = 'Quiero crear un look nuevo con IA';
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
  ],
};

// ============================================================================
// COMPONENT
// ============================================================================

const AIStylistView: React.FC<AIStylistViewProps> = ({
  closet,
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
}) => {
  // State
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [showSidebar, setShowSidebar] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [generatedClosetItems, setGeneratedClosetItems] = useState<ClothingItem[]>([]);
  const [lookCreation, setLookCreation] = useState<LookCreationState>({ status: 'idle' });
  const [garmentEdit, setGarmentEdit] = useState<GarmentEditState | null>(null);
  const [editInstructionInput, setEditInstructionInput] = useState('');
  const [tryOn, setTryOn] = useState<TryOnState>({ status: 'idle' });
  const [hybridLookChoice, setHybridLookChoice] = useState<HybridLookChoiceState | null>(null);
  const [guidedWorkflow, setGuidedWorkflow] = useState<GuidedLookWorkflowResponse | null>(null);
  const [guidedAutosaveEnabled, setGuidedAutosaveEnabled] = useState(false);
  const [limitModalSource, setLimitModalSource] = useState<'chat' | 'guided' | 'edit' | 'tryon' | null>(null);

  // Subscription hook for tracking usage
  const subscription = useSubscription();

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  // Computed
  const currentConversation = conversations.find(c => c.id === currentConversationId);
  const messages = currentConversation?.messages || [];
  const isNewChat = messages.length <= 1;
  const enrichedCloset = useMemo(() => [...generatedClosetItems, ...closet], [generatedClosetItems, closet]);
  const useGuidedLookBackend = useMemo(() => getFeatureFlag('enableGuidedLookCreationBackend'), []);

  // Get chat credits status - recalculate after each message
  const chatCreditsStatus = useMemo(() => getCreditStatus(), [messages.length]);

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
    setLookCreation({ status: 'idle' });
    setGeneratedClosetItems([]);
    setGarmentEdit(null);
    setEditInstructionInput('');
    setTryOn({ status: 'idle' });
    setHybridLookChoice(null);
    setGuidedWorkflow(null);
    setGuidedAutosaveEnabled(false);
    setLimitModalSource(null);
  }, [currentConversationId]);

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
  ) => {
    const assistantMessage: ChatMessage = {
      id: `assistant_${Date.now()}`,
      role: 'assistant',
      content,
      timestamp: Date.now(),
      outfitSuggestion: outfitSuggestion || undefined,
    };
    const nextMessages = [...baseMessages, assistantMessage];
    onMessagesUpdate(nextMessages);
    return nextMessages;
  }, [onMessagesUpdate]);

  const isCreditError = useCallback((message: string) => {
    const normalized = message.toLowerCase();
    return normalized.includes('crédito')
      || normalized.includes('credito')
      || normalized.includes('insufficient')
      || normalized.includes('402')
      || normalized.includes('saldo')
      || normalized.includes('upgrade')
      || normalized.includes('límite')
      || normalized.includes('limite');
  }, []);

  const mapChatErrorMessage = useCallback((error: any) => {
    const errorMsg = error?.message || String(error);

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
    if (isCreditError(errorMsg)) {
      return 'No tenés créditos suficientes para seguir usando el chat. Hacé upgrade o sumá créditos para continuar.';
    }
    return '¡Ups! Algo salió mal. Intentá de nuevo en unos segundos.';
  }, [isCreditError]);

  const mapLookCreationErrorMessage = useCallback((error: any) => {
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
    if (isCreditError(errorMsg)) {
      return 'No tenés créditos suficientes para generar la prenda. Hacé upgrade o sumá créditos para continuar.';
    }
    return `No pude generar la prenda: ${errorMsg || 'error desconocido'}`;
  }, [isCreditError]);

  const mapTryOnErrorMessage = useCallback((error: any) => {
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
    if (isCreditError(errorMsg)) {
      return 'No tenés créditos suficientes para usar el probador virtual. Hacé upgrade o sumá créditos para continuar.';
    }
    return `No pude generar el probador virtual: ${errorMsg || 'error desconocido'}`;
  }, [isCreditError]);

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
        appendAssistantMessage(baseMessages, response.content, response.outfitSuggestion || undefined);
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
      const userFacingError = mapLookCreationErrorMessage(error);
      appendAssistantMessage(baseMessages, userFacingError);
      if (isCreditError(error?.message || String(error))) {
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
    enrichedCloset,
    guidedWorkflow,
    isCreditError,
    mapLookCreationErrorMessage,
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
      `Perfecto. Puedo modificar esta prenda con IA aplicando: "${cleanedInstruction}". Esta edición cuesta ${LOOK_EDIT_CREDIT_COST} créditos. ¿Confirmás?`,
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
      const userFacingError = mapLookCreationErrorMessage(error);
      if (isCreditError(error?.message || String(error))) {
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
    isCreditError,
    lookCreation.generatedItem,
    lookCreation.generatedPrompt,
    lookCreation.occasion,
    lookCreation.requestText,
    lookCreation.style,
    mapLookCreationErrorMessage,
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
      const userFacingError = mapTryOnErrorMessage(error);
      if (isCreditError(error?.message || String(error))) {
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
    isCreditError,
    lookCreation.generatedItem,
    mapTryOnErrorMessage,
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
      setHybridLookChoice(null);

      appendAssistantMessage(
        baseMessages,
        `Listo. Lo resolví en modo directo (chat + generación IA) y consumió ${LOOK_CREATION_CREDIT_COST} créditos de generación. Si querés, ahora la guardamos en tu armario o armamos outfit completo.`,
      );
      await subscription.refresh();
    } catch (error: any) {
      console.error('Error generating direct look from chat:', error);
      const userFacingError = mapLookCreationErrorMessage(error);
      if (isCreditError(error?.message || String(error))) {
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
    isCreditError,
    mapLookCreationErrorMessage,
    subscription,
    withTimeout,
  ]);

  const beginUserTurn = useCallback((trimmedText: string) => {
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: trimmedText,
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, userMessage];
    onMessagesUpdate(updatedMessages);
    setInputValue('');
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
        appendAssistantMessage(messages, `Selfie cargada. El probador virtual cuesta ${TRY_ON_CREDIT_COST} créditos cuando confirmes.`);
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
    appendAssistantMessage(messages, `El probador virtual cuesta ${TRY_ON_CREDIT_COST} créditos. ¿Confirmás que lo genere ahora?`);
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
        { surface: 'closet' },
      );

      appendAssistantMessage(updatedMessages, response.content, response.outfitSuggestion || undefined);
      setStreamingMessage('');
      await subscription.refresh();
    } catch (error: any) {
      console.error('Error suggesting outfit with generated item:', error);
      const userFacingError = mapChatErrorMessage(error);
      if (isCreditError(error?.message || String(error))) {
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
    currentConversation,
    enrichedCloset,
    isCreditError,
    isTyping,
    lookCreation.category,
    lookCreation.generatedItem,
    lookCreation.occasion,
    lookCreation.style,
    mapChatErrorMessage,
    messages,
    onMessagesUpdate,
    subscription,
    guidedWorkflow,
    runGuidedWorkflowAction,
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
  const handleSend = useCallback(async (text: string) => {
    if (!text.trim() || isTyping || !currentConversation) return;
    const trimmedText = text.trim();

    if (garmentEdit?.status === 'confirming') {
      const updatedMessages = beginUserTurn(trimmedText);
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
      const updatedMessages = beginUserTurn(trimmedText);
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

    if (!useGuidedLookBackend && hybridLookChoice) {
      const updatedMessages = beginUserTurn(trimmedText);
      const normalized = trimmedText.toLowerCase();
      const wantsGuided = normalized.includes('guiad');
      const wantsDirect = normalized.includes('direct') || isAffirmative(trimmedText);

      if (wantsGuided) {
        setHybridLookChoice(null);
        const draft: LookCreationDraft = {
          ...hybridLookChoice.parsed,
          requestText: hybridLookChoice.requestText,
        };
        const missing = getMissingLookFields(draft);
        const nextField = missing[0];
        setLookCreation({
          ...draft,
          status: missing.length > 0 ? 'collecting' : 'confirming',
          awaitingField: nextField,
        });
        if (missing.length > 0 && nextField) {
          appendAssistantMessage(updatedMessages, getLookFieldQuestion(nextField));
        } else {
          appendAssistantMessage(updatedMessages, buildLookCostMessage(draft));
        }
        return;
      }

      if (wantsDirect) {
        await runDirectLookGeneration(updatedMessages, hybridLookChoice);
        return;
      }

      if (isNegative(trimmedText)) {
        setHybridLookChoice(null);
        appendAssistantMessage(updatedMessages, 'Perfecto, cancelé la creación de prenda/look por ahora.');
        return;
      }

      appendAssistantMessage(
        updatedMessages,
        `Decime "directo" para generar ahora (${LOOK_CREATION_CREDIT_COST} créditos) o "guiado" para afinar primero.`,
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

    const lastAssistantHadOutfit = Boolean(messages[messages.length - 1]?.outfitSuggestion);
    const canUseTextEditIntent = lookCreation.status === 'result' && !lastAssistantHadOutfit;

    if (!guidedInProgress && canUseTextEditIntent && lookCreation.generatedItem && detectGarmentEditIntent(trimmedText)) {
      const updatedMessages = beginUserTurn(trimmedText);
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

    const lookIntentDetected = detectLookCreationIntent(trimmedText);
    if (useGuidedLookBackend && !guidedInProgress && lookIntentDetected) {
      const updatedMessages = beginUserTurn(trimmedText);
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
      const updatedMessages = beginUserTurn(trimmedText);
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
    if (!shouldHandleLookCreation) {
      const canUseStatus = subscription.canUseAIFeature('fashion_chat');
      if (!canUseStatus.canUse) {
        setLimitModalSource('chat');
        setShowLimitModal(true);
        return;
      }
    }

    const updatedMessages = beginUserTurn(trimmedText);

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
              'No tenés créditos suficientes para generar esta prenda. Hacé upgrade o sumá créditos para continuar.',
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
            const userFacingError = mapLookCreationErrorMessage(error);
            if (isCreditError(error?.message || String(error))) {
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

      const firstMissingBeforeInput = shouldResetDraft ? getMissingLookFields(currentDraft)[0] : getMissingLookFields(lookCreation)[0];
      if (firstMissingBeforeInput) {
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

      const missingFields = getMissingLookFields(currentDraft);
      if (missingFields.length > 0) {
        const nextField = missingFields[0];
        setLookCreation({
          ...currentDraft,
          status: 'collecting',
          awaitingField: nextField,
        });
        appendAssistantMessage(updatedMessages, getLookFieldQuestion(nextField));
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

    setIsTyping(true);
    try {
      const response = await chatWithStudioStylist(
        trimmedText,
        enrichedCloset,
        messages,
        { surface: 'closet' },
      );

      appendAssistantMessage(updatedMessages, response.content, response.outfitSuggestion || undefined);
      setStreamingMessage('');

      // Source of truth for credits is backend.
      await subscription.refresh();
    } catch (error: any) {
      console.error('Error in AIStylistView:', error);
      const userFacingError = mapChatErrorMessage(error);
      if (isCreditError(error?.message || String(error))) {
        setLimitModalSource('chat');
        setShowLimitModal(true);
      }
      appendAssistantMessage(updatedMessages, userFacingError);
      setStreamingMessage('');
    } finally {
      setIsTyping(false);
    }
  }, [
    beginUserTurn,
    appendAssistantMessage,
    currentConversation,
    enrichedCloset,
    garmentEdit,
    hybridLookChoice,
    guidedAutosaveEnabled,
    guidedWorkflow,
    isCreditError,
    isTyping,
    lookCreation,
    mapChatErrorMessage,
    mapLookCreationErrorMessage,
    messages,
    requestGarmentEditConfirmation,
    runDirectLookGeneration,
    runGarmentEditGeneration,
    runGuidedWorkflowAction,
    runTryOnGeneration,
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
    return content.replace(/\[(?:top|bottom|shoes):\s*[^\]]+\]/gi, '').trim();
  };

  // Credits progress bar color
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
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
        className="relative w-full max-w-3xl h-[85vh] bg-white/85 dark:bg-[#05060a]/80 backdrop-blur-3xl border border-white/50 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden flex"
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
                className="h-full bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden"
              >
                {/* Sidebar Header */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => { onNewConversation(); setShowSidebar(false); }}
                    className="w-full py-2.5 px-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-medium text-sm hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
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
                      <p className="text-sm text-gray-500 dark:text-gray-400">No hay conversaciones</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {conversations.map(conv => (
                        <div
                          key={conv.id}
                          onClick={() => { onSelectConversation(conv.id); setShowSidebar(false); }}
                          className={`group p-3 rounded-lg cursor-pointer transition-all ${conv.id === currentConversationId
                            ? 'bg-gray-100 dark:bg-gray-800'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
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
                                  className="px-2.5 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-medium"
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
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{formatDate(conv.updatedAt)}</p>
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(conv.id); }}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-all"
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
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Bar */}
          <header className="h-14 px-4 flex items-center justify-between border-b border-white/20 dark:border-white/5 bg-white/40 dark:bg-black/20 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="p-2 hover:bg-white/50 dark:hover:bg-white/10 rounded-xl transition-colors"
                title="Conversaciones"
              >
                <span className="material-symbols-rounded text-gray-700 dark:text-gray-300">menu</span>
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-sm shadow-violet-500/20">
                  <span className="material-symbols-rounded text-white text-lg drop-shadow-sm">checkroom</span>
                </div>
                <span className="font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-white dark:via-gray-200 dark:to-white">Estilista IA</span>
              </div>
            </div>

            {/* Credits Indicator - PREMIUM */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 px-3 py-1.5 bg-white/50 dark:bg-white/5 backdrop-blur-md rounded-full border border-white/40 dark:border-white/10 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-rounded text-violet-500 dark:text-violet-400 text-lg">toll</span>
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
                          <span className="text-gray-500 dark:text-gray-400 font-medium">{chatCreditsStatus.limit}</span>
                        </>
                      )}
                    </span>
                    <span className="text-[9px] uppercase tracking-wider text-gray-500 dark:text-gray-500 font-semibold leading-tight mt-0.5">mensajes</span>
                  </div>
                </div>
                {/* Mini progress bar */}
                {chatCreditsStatus.limit !== -1 && (
                  <div className="w-12 h-1 bg-gray-200/50 dark:bg-gray-700/50 rounded-full overflow-hidden backdrop-blur-sm">
                    <div
                      className={`h-full ${getCreditsColor()} rounded-full transition-all`}
                      style={{ width: `${(chatCreditsStatus.remaining / chatCreditsStatus.limit) * 100}%` }}
                    />
                  </div>
                )}
              </div>

              <button
                onClick={onClose}
                className="p-2 bg-white/50 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 border border-white/40 dark:border-white/10 shadow-sm rounded-xl transition-all"
                title="Cerrar"
              >
                <span className="material-symbols-rounded text-gray-700 dark:text-gray-300">close</span>
              </button>
            </div>
          </header>

          {/* Chat Area */}
          <div className="flex-1 overflow-y-auto">
            {isNewChat ? (
              /* Welcome Screen */
              <div className="h-full flex flex-col items-center justify-center p-6 max-w-2xl mx-auto">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center mb-10"
                >
                  <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 flex items-center justify-center shadow-xl shadow-violet-500/20">
                    <span className="material-symbols-rounded text-white text-3xl">checkroom</span>
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {userName ? `¡Hola, ${userName}!` : 'Tu Estilista Personal'}
                  </h1>
                  <p className="text-gray-500 dark:text-gray-400 max-w-md">
                    Contame qué tenés planeado y te ayudo a armar el outfit perfecto usando las prendas de tu armario.
                  </p>
                </motion.div>

                {/* Suggestion Cards */}
                <div className="w-full max-w-xl grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  {SUGGESTIONS.map((sug, i) => (
                    <motion.button
                      key={sug.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      onClick={() => handleSend(sug.prompt)}
                      disabled={isTyping}
                      className="relative p-4 text-left rounded-2xl border border-white/40 dark:border-white/10 bg-white/40 dark:bg-black/20 backdrop-blur-xl shadow-sm hover:shadow-lg transition-all disabled:opacity-50 group overflow-hidden"
                    >
                      {/* Premium Hover Glow */}
                      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      <div className="relative flex items-start gap-4 z-10">
                        <div className="w-12 h-12 rounded-xl bg-white/60 dark:bg-white/5 border border-white/50 dark:border-white/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-gradient-to-br group-hover:from-violet-500 group-hover:to-fuchsia-500 transition-all duration-300 shadow-sm">
                          <span className="material-symbols-rounded text-gray-600 dark:text-gray-300 group-hover:text-white transition-colors duration-300 drop-shadow-sm">
                            {sug.icon}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 dark:text-white mb-0.5 group-hover:text-violet-600 dark:group-hover:text-violet-300 transition-colors">{sug.label}</h3>
                          <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">{sug.description}</p>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>

                <button
                  onClick={() => handleSend(START_LOOK_CREATION_PROMPT)}
                  disabled={isTyping}
                  className="mt-5 w-full max-w-xl px-4 py-3 rounded-2xl border border-violet-300/60 dark:border-violet-700/60 bg-violet-50/70 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 hover:bg-violet-100/80 dark:hover:bg-violet-900/30 transition-all font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span className="material-symbols-rounded text-base">auto_awesome</span>
                  Crear look nuevo con IA ({LOOK_CREATION_CREDIT_COST} créditos, directo o guiado)
                </button>

                {/* Closet info */}
                <div className="mt-8 flex items-center gap-2 text-sm text-gray-400">
                  <span className="material-symbols-rounded text-lg">inventory_2</span>
                  <span>{closet.length} prendas en tu armario</span>
                </div>
              </div>
            ) : (
              /* Chat Messages */
              <div className="max-w-3xl mx-auto p-4 space-y-6">
                {messages.map(msg => {
                  const isUser = msg.role === 'user';
                  const content = cleanContent(msg.content);
                  const outfit = msg.outfitSuggestion;
                  const top = outfit ? getItem(outfit.top_id, msg, 'top') : null;
                  const bottom = outfit ? getItem(outfit.bottom_id, msg, 'bottom') : null;
                  const shoes = outfit ? getItem(outfit.shoes_id, msg, 'shoes') : null;
                  const hasOutfit = top || bottom || shoes;

                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
                    >
                      {/* Avatar */}
                      <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center shadow-sm ${isUser
                        ? 'bg-white/20 dark:bg-white/10 backdrop-blur-md border border-white/30 dark:border-white/10'
                        : 'bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-violet-500/30'
                        }`}>
                        <span className={`material-symbols-rounded text-[16px] ${isUser ? 'text-gray-700 dark:text-gray-300' : 'text-white drop-shadow-sm'}`}>
                          {isUser ? 'person' : 'checkroom'}
                        </span>
                      </div>

                      {/* Message */}
                      <div className={`flex-1 ${isUser ? 'max-w-[85%]' : 'max-w-[90%]'}`}>
                        <div className={`rounded-2xl px-5 py-3.5 shadow-sm backdrop-blur-md border ${isUser
                          ? 'bg-gray-900/90 dark:bg-white/90 border-gray-800/50 dark:border-white/20 text-white dark:text-gray-900 ml-auto'
                          : 'bg-white/60 dark:bg-black/40 border-violet-200/50 dark:border-violet-800/30 hover:border-violet-300 dark:hover:border-violet-700/50 transition-colors'
                          }`}>
                          <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed font-medium">
                            {sanitizeUserInput(content)}
                          </p>
                        </div>

                        {/* Outfit Preview */}
                        {hasOutfit && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-3 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700"
                          >
                            <div className="flex items-center gap-2 mb-3">
                              <span className="material-symbols-rounded text-violet-500 text-sm">style</span>
                              <span className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
                                Outfit sugerido
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-3 mb-4">
                              {[
                                { item: top, label: 'Top' },
                                { item: bottom, label: 'Bottom' },
                                { item: shoes, label: 'Calzado' }
                              ].map(({ item, label }, idx) => item && (
                                <div key={idx} className="space-y-1.5">
                                  <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 ring-1 ring-gray-200 dark:ring-gray-600">
                                    <img src={item.imageDataUrl} alt="" className="w-full h-full object-cover" />
                                    {item.isAIGenerated && (
                                      <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-violet-600 text-white text-xs rounded font-medium">
                                        AI
                                      </div>
                                    )}
                                  </div>
                                  <p className="text-xs text-center text-gray-500 dark:text-gray-400 font-medium">{label}</p>
                                </div>
                              ))}
                            </div>

                            <button
                              onClick={() => onViewOutfit(outfit!.top_id, outfit!.bottom_id, outfit!.shoes_id, outfit!.aiGeneratedItems)}
                              className="w-full py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                            >
                              <span className="material-symbols-rounded text-lg">view_in_ar</span>
                              Ver outfit completo
                            </button>
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
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex-shrink-0 flex items-center justify-center shadow-sm shadow-violet-500/30">
                      <span className="material-symbols-rounded text-white text-[16px] drop-shadow-sm">checkroom</span>
                    </div>
                    <div className="flex-1 max-w-[90%]">
                      <div className="rounded-2xl px-5 py-3.5 bg-white/60 dark:bg-black/40 backdrop-blur-md border border-violet-300/50 dark:border-violet-700/50 shadow-sm">
                        <p className="text-[15px] leading-relaxed font-medium">{sanitizeUserInput(streamingMessage)}</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Typing indicator */}
                {isTyping && !streamingMessage && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex-shrink-0 flex items-center justify-center shadow-sm shadow-violet-500/30">
                      <span className="material-symbols-rounded text-white text-[16px] drop-shadow-sm">checkroom</span>
                    </div>
                    <div className="px-5 py-4 bg-white/60 dark:bg-black/40 backdrop-blur-md rounded-2xl border border-violet-200/50 dark:border-violet-800/30 shadow-sm w-fit">
                      <div className="flex gap-1.5 items-center h-2">
                        {[0, 150, 300].map((delay, i) => (
                          <div
                            key={i}
                            className="w-2 h-2 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-400 animate-bounce shadow-[0_0_5px_rgba(168,85,247,0.5)]"
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
                        className="px-4 py-2 bg-white/40 dark:bg-white/5 backdrop-blur-md border border-white/50 dark:border-white/10 hover:bg-white/80 dark:hover:bg-white/10 text-gray-800 dark:text-gray-200 hover:text-violet-600 dark:hover:text-violet-400 hover:border-violet-400/50 rounded-full text-xs font-bold transition-all flex items-center gap-2 shadow-sm hover:shadow-md hover:-translate-y-0.5"
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
                    className="p-4 rounded-2xl border border-violet-200/70 dark:border-violet-800/40 bg-violet-50/70 dark:bg-violet-900/10"
                  >
                    <div className="flex items-center gap-2 text-violet-700 dark:text-violet-300 font-semibold text-sm">
                      <span className="material-symbols-rounded animate-spin text-base">progress_activity</span>
                      Generando tu prenda con IA...
                    </div>
                    <p className="text-xs text-violet-600/90 dark:text-violet-300/80 mt-1">
                      Esto puede tardar unos segundos.
                    </p>
                  </motion.div>
                )}

                {lookCreation.status === 'result' && lookCreation.generatedImageUrl && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl border border-violet-200/70 dark:border-violet-800/40 bg-white/80 dark:bg-black/30"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="material-symbols-rounded text-violet-500 text-base">auto_awesome</span>
                      <span className="text-xs font-semibold text-violet-600 dark:text-violet-300 uppercase tracking-wider">
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
                            className="py-2.5 px-3 rounded-xl border border-violet-300/70 dark:border-violet-700/60 text-violet-700 dark:text-violet-300 text-sm font-semibold hover:bg-violet-50 dark:hover:bg-violet-900/20 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                          >
                            Armar outfit completo
                          </button>
                        </div>

                        <div className="space-y-2 pt-1">
                          <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                            Modificar prenda con IA ({LOOK_EDIT_CREDIT_COST} créditos)
                          </p>
                          <div className="flex gap-2">
                            <input
                              value={editInstructionInput}
                              onChange={(event) => setEditInstructionInput(event.target.value)}
                              placeholder='Ej: "cambiar color a negro" o "agregar estampa floral"'
                              disabled={isTyping || garmentEdit?.status === 'editing'}
                              className="flex-1 px-3 py-2 rounded-xl border border-gray-300/70 dark:border-gray-700/70 bg-white/80 dark:bg-white/5 text-xs text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400/50"
                            />
                            <button
                              onClick={handlePrepareGarmentEditFromInput}
                              disabled={isTyping || garmentEdit?.status === 'editing'}
                              className="px-3 py-2 rounded-xl border border-violet-300/70 dark:border-violet-700/60 text-violet-700 dark:text-violet-300 text-xs font-semibold hover:bg-violet-50 dark:hover:bg-violet-900/20 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                            >
                              Modificar
                            </button>
                          </div>

                          {garmentEdit?.status === 'confirming' && (
                            <div className="p-2.5 rounded-xl border border-violet-200/80 dark:border-violet-800/50 bg-violet-50/70 dark:bg-violet-900/20">
                              <p className="text-xs text-violet-700 dark:text-violet-300 font-semibold">
                                Esta edición cuesta {LOOK_EDIT_CREDIT_COST} créditos.
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <button
                                  onClick={() => void handleConfirmGarmentEdit()}
                                  disabled={isTyping}
                                  className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                                >
                                  Confirmar edición
                                </button>
                                <button
                                  onClick={handleCancelGarmentEdit}
                                  disabled={isTyping}
                                  className="px-3 py-1.5 rounded-lg border border-violet-300/70 dark:border-violet-700/60 text-violet-700 dark:text-violet-300 text-xs font-semibold hover:bg-violet-100/70 dark:hover:bg-violet-900/30 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          )}

                          {garmentEdit?.status === 'editing' && (
                            <div className="text-xs text-violet-700 dark:text-violet-300 flex items-center gap-1.5 font-semibold">
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
                            Probador virtual ({TRY_ON_CREDIT_COST} créditos)
                          </p>

                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => selfieInputRef.current?.click()}
                              disabled={isTyping || tryOn.status === 'generating'}
                              className="px-3 py-2 rounded-xl border border-gray-300/70 dark:border-gray-700/70 text-gray-700 dark:text-gray-200 text-xs font-semibold hover:border-violet-400/60 hover:text-violet-600 dark:hover:text-violet-300 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {tryOn.selfieImageDataUrl ? 'Cambiar selfie' : 'Subir selfie'}
                            </button>
                            <button
                              onClick={handlePrepareTryOn}
                              disabled={isTyping || tryOn.status === 'generating'}
                              className="px-3 py-2 rounded-xl border border-violet-300/70 dark:border-violet-700/60 text-violet-700 dark:text-violet-300 text-xs font-semibold hover:bg-violet-50 dark:hover:bg-violet-900/20 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
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
                            <div className="p-2.5 rounded-xl border border-violet-200/80 dark:border-violet-800/50 bg-violet-50/70 dark:bg-violet-900/20">
                              <p className="text-xs text-violet-700 dark:text-violet-300 font-semibold">
                                Esta prueba virtual cuesta {TRY_ON_CREDIT_COST} créditos.
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <button
                                  onClick={() => void handleConfirmTryOn()}
                                  disabled={isTyping}
                                  className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                                >
                                  Confirmar prueba
                                </button>
                                <button
                                  onClick={handleCancelTryOn}
                                  disabled={isTyping}
                                  className="px-3 py-1.5 rounded-lg border border-violet-300/70 dark:border-violet-700/60 text-violet-700 dark:text-violet-300 text-xs font-semibold hover:bg-violet-100/70 dark:hover:bg-violet-900/30 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          )}

                          {tryOn.status === 'generating' && (
                            <div className="text-xs text-violet-700 dark:text-violet-300 flex items-center gap-1.5 font-semibold">
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
          <div className="border-t border-white/20 dark:border-white/5 bg-white/30 dark:bg-black/20 backdrop-blur-xl p-4">
            <div className="max-w-3xl mx-auto">
              <div className="mb-2">
                <button
                  onClick={() => handleSend(START_LOOK_CREATION_PROMPT)}
                  disabled={isTyping}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-300/60 dark:border-violet-700/60 bg-violet-50/70 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 text-xs font-semibold hover:bg-violet-100/80 dark:hover:bg-violet-900/30 transition-all disabled:opacity-50"
                >
                  <span className="material-symbols-rounded text-sm">auto_awesome</span>
                  Crear prenda con IA ({LOOK_CREATION_CREDIT_COST} créditos)
                </button>
              </div>
              {((useGuidedLookBackend && guidedWorkflow?.status === 'choosing_mode') || (!useGuidedLookBackend && hybridLookChoice)) && (
                <div className="mb-2 flex flex-wrap gap-2">
                  <button
                    onClick={() => handleSend('directo')}
                    disabled={isTyping}
                    className="px-3 py-1.5 rounded-full border border-violet-300/70 dark:border-violet-700/60 bg-violet-50/70 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 text-xs font-semibold hover:bg-violet-100/80 dark:hover:bg-violet-900/30 transition-all disabled:opacity-50"
                  >
                    Directo ({guidedWorkflow?.estimatedCostCredits || LOOK_CREATION_CREDIT_COST} créditos)
                  </button>
                  <button
                    onClick={() => handleSend('guiado')}
                    disabled={isTyping}
                    className="px-3 py-1.5 rounded-full border border-gray-300/70 dark:border-gray-700/80 bg-white/70 dark:bg-white/5 text-gray-700 dark:text-gray-300 text-xs font-semibold hover:border-violet-400/60 hover:text-violet-600 dark:hover:text-violet-300 transition-all disabled:opacity-50"
                  >
                    Guiado
                  </button>
                  <button
                    onClick={() => handleSend('cancelar')}
                    disabled={isTyping}
                    className="px-3 py-1.5 rounded-full border border-gray-300/70 dark:border-gray-700/80 bg-white/70 dark:bg-white/5 text-gray-700 dark:text-gray-300 text-xs font-semibold hover:border-red-400/60 hover:text-red-600 dark:hover:text-red-300 transition-all disabled:opacity-50"
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
                      className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                    />
                    Guardar automáticamente en mi armario
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
                      className="px-3 py-1.5 rounded-full border border-gray-300/70 dark:border-gray-700/80 bg-white/70 dark:bg-white/5 text-gray-700 dark:text-gray-300 text-xs font-semibold hover:border-violet-400/60 hover:text-violet-600 dark:hover:text-violet-300 transition-all disabled:opacity-50"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
              {useGuidedLookBackend && lookCreation.status === 'confirming' && guidedWorkflow?.pendingAction === 'generate' && (
                <div className="mb-2 p-3 rounded-xl border border-violet-200/80 dark:border-violet-800/50 bg-violet-50/60 dark:bg-violet-900/20">
                  <p className="text-xs text-violet-700 dark:text-violet-300 font-semibold">
                    Esta generación cuesta {guidedWorkflow?.estimatedCostCredits || LOOK_CREATION_CREDIT_COST} créditos.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      onClick={() => void handleGuidedConfirmGenerate()}
                      disabled={isTyping}
                      className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                    >
                      Confirmar
                    </button>
                    <button
                      onClick={() => void handleGuidedCancelGenerate()}
                      disabled={isTyping}
                      className="px-3 py-1.5 rounded-lg border border-violet-300/70 dark:border-violet-700/60 text-violet-700 dark:text-violet-300 text-xs font-semibold hover:bg-violet-100/70 dark:hover:bg-violet-900/30 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
              <div className="relative flex items-end gap-2">
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Escribí tu mensaje..."
                    disabled={isTyping}
                    rows={1}
                    className="w-full px-5 py-3.5 bg-white/60 dark:bg-white/5 border border-white/60 dark:border-white/10 backdrop-blur-md rounded-2xl resize-none text-gray-900 dark:text-white placeholder-gray-500/80 focus:outline-none focus:ring-2 focus:ring-violet-500/50 shadow-inner transition-all text-sm font-medium disabled:opacity-50"
                    style={{ maxHeight: '120px' }}
                  />
                </div>
                <button
                  onClick={() => handleSend(inputValue)}
                  disabled={!inputValue.trim() || isTyping}
                  className="p-3.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-xl transition-all hover:scale-105 active:scale-95"
                  title="Enviar"
                >
                  <span className="material-symbols-rounded font-bold drop-shadow-sm">send</span>
                </button>
              </div>

              {/* Credits warning */}
              {chatCreditsStatus.limit !== -1 && chatCreditsStatus.remaining <= 5 && (
                <p className="text-xs text-center text-red-500 dark:text-red-400 mt-2 flex items-center justify-center gap-1 font-semibold animate-pulse">
                  <span className="material-symbols-rounded text-sm drop-shadow-sm">warning</span>
                  Te quedan {chatCreditsStatus.remaining} mensajes este mes
                </p>
              )}
            </div>
          </div>
        </div>
      </motion.div>

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
