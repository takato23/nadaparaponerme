/**
 * AIGenerationContext
 *
 * Unified context for all AI generation operations with:
 * - Queue system for multiple requests
 * - Automatic retry with exponential backoff
 * - Persistence across navigation
 * - Progress tracking for all operations
 *
 * Supports: Studio looks, Outfit generation, Smart Packer, and more
 */
import React, { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { generateVirtualTryOnWithSlots } from '@/src/services/aiService';
import * as aiService from '@/src/services/aiService';
import * as analytics from '@/src/services/analyticsService';
import { aiStorage } from '@/src/utils/aiStorage';
import type { ClothingItem, GenerationPreset, ClothingSlot, FitResult, PackingListResult } from '@/types';

// ============================================================================
// Types
// ============================================================================

export type GenerationType = 'studio' | 'outfit' | 'packing' | 'style-dna' | 'color-palette';

export type GenerationStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'retrying';

interface BaseGenerationRequest {
  id: string;
  type: GenerationType;
  status: GenerationStatus;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  failedAt?: number;
  retryCount: number;
  maxRetries: number;
  error?: string;
}

// Studio generation request
export interface StudioGenerationRequest extends BaseGenerationRequest {
  type: 'studio';
  payload: {
    userImage: string;
    slots: Record<string, string>;
    slotItems: Array<{ slot: ClothingSlot; item: ClothingItem; fit?: 'tight' | 'regular' | 'oversized' }>;
    slotFits?: Record<string, 'tight' | 'regular' | 'oversized'>; // Per-garment fit preferences
    preset: GenerationPreset;
    customScene?: string;
    keepPose: boolean;
    useFaceRefs: boolean;
    faceRefsCount: number;
    provider?: 'google' | 'openai';
    quality?: 'flash' | 'pro';
    view?: 'front' | 'back' | 'side';
    renderHash?: string;
    surface?: 'mirror' | 'studio';
    cachePolicyVersion?: number;
  };
  result?: {
    image: string;
    model: string;
    slotsUsed: string[];
    faceRefsUsed: number;
  };
}

// Outfit generation request
export interface OutfitGenerationRequest extends BaseGenerationRequest {
  type: 'outfit';
  payload: {
    closet: ClothingItem[];
    occasion?: string;
    style?: string;
    weather?: string;
    excludeIds?: string[];
  };
  result?: FitResult;
}

// Packing list generation request
export interface PackingGenerationRequest extends BaseGenerationRequest {
  type: 'packing';
  payload: {
    closet: ClothingItem[];
    destination: string;
    duration: number;
    activities: string[];
    weather?: string;
  };
  result?: PackingListResult;
}

export type GenerationRequest =
  | StudioGenerationRequest
  | OutfitGenerationRequest
  | PackingGenerationRequest;

interface AIGenerationContextType {
  // Queue state
  queue: GenerationRequest[];
  activeRequest: GenerationRequest | null;
  completedRequests: GenerationRequest[];

  // Computed state
  isProcessing: boolean;
  queueLength: number;
  hasCompletedRequests: boolean;

  // Actions
  enqueueStudioGeneration: (payload: StudioGenerationRequest['payload']) => string;
  enqueueOutfitGeneration: (payload: OutfitGenerationRequest['payload']) => string;
  enqueuePackingGeneration: (payload: PackingGenerationRequest['payload']) => string;

  // Queue management
  cancelRequest: (id: string) => void;
  clearCompletedRequest: (id: string) => void;
  clearAllCompleted: () => void;
  retryRequest: (id: string) => void;

  // Get specific results
  getStudioResults: () => StudioGenerationRequest[];
  getOutfitResults: () => OutfitGenerationRequest[];
  getPackingResults: () => PackingGenerationRequest[];
}

const AIGenerationContext = createContext<AIGenerationContextType | null>(null);

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = 'ai-generation-queue';
const MAX_COMPLETED_RESULTS = 10;
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY = 2000; // 2 seconds
const MAX_RETRY_DELAY = 30000; // 30 seconds
const GENERATION_TIMEOUT_MS: Record<GenerationType, number> = {
  studio: 120000,
  outfit: 60000,
  packing: 60000,
  'style-dna': 45000,
  'color-palette': 45000,
};

// ============================================================================
// Helpers
// ============================================================================

function generateId(): string {
  return `gen_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function calculateRetryDelay(retryCount: number): number {
  // Exponential backoff: 2s, 4s, 8s... up to 30s
  const delay = Math.min(BASE_RETRY_DELAY * Math.pow(2, retryCount), MAX_RETRY_DELAY);
  // Add jitter (±20%)
  const jitter = delay * 0.2 * (Math.random() - 0.5);
  return Math.round(delay + jitter);
}

async function runWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: number | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error(`Request timed out after ${Math.round(timeoutMs / 1000)}s`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
  }
}

function isNetworkError(error: any): boolean {
  const message = error?.message?.toLowerCase() || '';
  return (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('timeout') ||
    message.includes('connection') ||
    message.includes('offline') ||
    error?.name === 'TypeError' // Often indicates network issues
  );
}

function isRetryableError(error: any): boolean {
  const message = error?.message?.toLowerCase() || '';
  // Don't retry auth errors, quota errors, or validation errors
  if (
    message.includes('unauthorized') ||
    message.includes('cuota') ||
    message.includes('límite') ||
    message.includes('beta cerrada') ||
    message.includes('invalid') ||
    message.includes('must be verified') ||
    message.includes('organization must be verified') ||
    message.includes('verification required')
  ) {
    return false;
  }
  // Retry network errors and server errors
  return isNetworkError(error) || message.includes('500') || message.includes('503');
}

// ============================================================================
// Provider
// ============================================================================

export function AIGenerationProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<GenerationRequest[]>([]);
  const [activeRequest, setActiveRequest] = useState<GenerationRequest | null>(null);
  const [completedRequests, setCompletedRequests] = useState<GenerationRequest[]>([]);

  const isMountedRef = useRef(true);
  const processingRef = useRef(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load state from localStorage/IndexedDB on mount
  useEffect(() => {
    isMountedRef.current = true;
    const loadState = async () => {
      try {
        // Try IndexedDB first
        let data: any = await aiStorage.get(STORAGE_KEY);

        // Fallback to localStorage migration
        if (!data) {
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            data = JSON.parse(stored);
            // Migrate to IndexedDB for future runs
            await aiStorage.set(STORAGE_KEY, data);
            localStorage.removeItem(STORAGE_KEY); // Clean up old localStorage
          }
        }

        if (data) {
          const oneHourAgo = Date.now() - 60 * 60 * 1000;

          // Filter completed requests that are less than 1 hour old
          const validCompleted = (data.completed || []).filter(
            (r: GenerationRequest) => r.completedAt && r.completedAt > oneHourAgo
          );

          // Re-queue any requests that were processing when the page closed
          const requeued = (data.queue || []).map((r: GenerationRequest) => ({
            ...r,
            status: 'queued' as GenerationStatus,
            retryCount: 0,
          }));

          if (data.active) {
            requeued.unshift({
              ...data.active,
              status: 'queued' as GenerationStatus,
              retryCount: 0,
            });
          }

          if (isMountedRef.current) {
            setQueue(requeued);
            setCompletedRequests(validCompleted.slice(0, MAX_COMPLETED_RESULTS));
          }
        }
      } catch (e) {
        console.error('Failed to load AI generation state:', e);
      }
    };

    loadState();

    return () => {
      isMountedRef.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // Save state to IndexedDB when it changes
  useEffect(() => {
    // 1. Cleanup old results (older than 24h) naturally before saving
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;

    const safeCompleted = completedRequests
      .filter(r => (r.completedAt || r.createdAt) > twentyFourHoursAgo)
      .slice(0, MAX_COMPLETED_RESULTS)
      .map(r => ({
        ...r,
        // Since we are using IndexedDB, we could keep more data, but 
        // it's still good practice to drop heavy images from completed results 
        // if they are already consumed by the UI.
        result: r.result ? { ...r.result, image: undefined } : undefined,
        payload: {
          ...r.payload,
          userImage: undefined, // Remove base64 user image
          slots: undefined,      // Remove base64 clothing slots
          slotItems: undefined,
        }
      }));

    const data = {
      queue,
      active: activeRequest,
      completed: safeCompleted,
    };

    try {
      // Use IndexedDB which has massive storage quotas and will handle huge base64 arrays gracefully
      aiStorage.set(STORAGE_KEY, data).catch(e => {
        console.warn('Failed to save AI generation state to IndexedDB:', e);
      });
    } catch (e) {
      console.warn('Sync wrapper failed:', e);
    }
  }, [queue, activeRequest, completedRequests]);

  // Process queue
  const processQueue = useCallback(async () => {
    if (processingRef.current || queue.length === 0) return;

    processingRef.current = true;
    const request = queue[0];

    // Move to active
    setQueue(prev => prev.slice(1));
    setActiveRequest({ ...request, status: 'processing', startedAt: Date.now() });

    try {
      let result: any;

      const timeoutMs = GENERATION_TIMEOUT_MS[request.type] ?? 60000;

      switch (request.type) {
        case 'studio': {
          const payload = (request as StudioGenerationRequest).payload;
          const requestedQuality = payload.quality ?? 'pro';
          const apiResult = await runWithTimeout(
            generateVirtualTryOnWithSlots(
              payload.userImage,
              payload.slots,
              {
                preset: payload.preset,
                quality: requestedQuality,
                customScene: payload.customScene,
                keepPose: payload.keepPose,
                useFaceReferences: payload.useFaceRefs && payload.faceRefsCount > 0,
                provider: payload.provider,
                slotItems: payload.slotItems,
                slotFits: payload.slotFits, // Per-garment fits
                view: payload.view,
              }
            ),
            timeoutMs
          );
          result = {
            image: apiResult.resultImage,
            model: apiResult.model,
            slotsUsed: apiResult.slotsUsed,
            faceRefsUsed: apiResult.faceReferencesUsed || 0,
          };
          break;
        }

        case 'outfit': {
          const payload = (request as OutfitGenerationRequest).payload;
          const prompt = `Ocasión: ${payload.occasion || 'diaria'}, Estilo: ${payload.style || 'casual'}, Clima: ${payload.weather || 'templado'}${payload.excludeIds?.length ? `, Excluir IDs: ${payload.excludeIds.join(', ')}` : ''}`;
          result = await runWithTimeout(
            aiService.generateOutfit(
              prompt,
              payload.closet,
            ),
            timeoutMs
          );
          break;
        }

        case 'packing': {
          const payload = (request as PackingGenerationRequest).payload;
          const prompt = `Destino: ${payload.destination}, Duración: ${payload.duration} días, Actividades: ${payload.activities.join(', ')}${payload.weather ? `, Clima: ${payload.weather}` : ''}`;
          result = await runWithTimeout(
            aiService.generatePackingList(
              prompt,
              payload.closet,
            ),
            timeoutMs
          );
          break;
        }
      }

      // Success!
      if (isMountedRef.current) {
        if (request.type === 'studio') {
          analytics.trackVirtualTryOn();
        }
        if (request.type === 'outfit') {
          const payload = (request as OutfitGenerationRequest).payload;
          const closetSize = Array.isArray(payload.closet) ? payload.closet.length : 0;
          analytics.trackOutfitGenerated(closetSize);
        }
        analytics.trackAIFeatureUsed(request.type);

        const completedRequest: GenerationRequest = {
          ...request,
          status: 'completed',
          completedAt: Date.now(),
          result,
        } as GenerationRequest;

        setActiveRequest(null);
        setCompletedRequests(prev => [completedRequest, ...prev].slice(0, MAX_COMPLETED_RESULTS));
      }
    } catch (error: any) {
      console.error(`❌ [AIGenerationContext] Generation failed (${request.type}):`, error);
      console.error('Error details:', { message: error.message, stack: error.stack, name: error.name });

      if (isMountedRef.current) {
        const shouldRetry = isRetryableError(error) && request.retryCount < MAX_RETRIES;

        if (shouldRetry) {
          // Schedule retry
          const delay = calculateRetryDelay(request.retryCount);
          const retryRequest: GenerationRequest = {
            ...request,
            status: 'retrying',
            retryCount: request.retryCount + 1,
            error: error?.message || 'Error desconocido',
          } as GenerationRequest;

          setActiveRequest(retryRequest);

          retryTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              // Re-queue at the front
              setActiveRequest(null);
              setQueue(prev => [{ ...retryRequest, status: 'queued' }, ...prev]);
            }
          }, delay);
        } else {
          // Mark as failed
          const failedRequest: GenerationRequest = {
            ...request,
            status: 'failed',
            failedAt: Date.now(),
            error: error?.message || 'Error desconocido',
          } as GenerationRequest;

          setActiveRequest(null);
          setCompletedRequests(prev => [failedRequest, ...prev].slice(0, MAX_COMPLETED_RESULTS));
        }
      }
    } finally {
      processingRef.current = false;
    }
  }, [queue]);

  // Trigger queue processing when queue changes
  useEffect(() => {
    if (!activeRequest && queue.length > 0) {
      processQueue();
    }
  }, [queue, activeRequest, processQueue]);

  // Enqueue functions
  const enqueueStudioGeneration = useCallback((payload: StudioGenerationRequest['payload']): string => {
    const id = generateId();
    const request: StudioGenerationRequest = {
      id,
      type: 'studio',
      status: 'queued',
      createdAt: Date.now(),
      retryCount: 0,
      maxRetries: MAX_RETRIES,
      payload,
    };
    setQueue(prev => [...prev, request]);
    return id;
  }, []);

  const enqueueOutfitGeneration = useCallback((payload: OutfitGenerationRequest['payload']): string => {
    const id = generateId();
    const request: OutfitGenerationRequest = {
      id,
      type: 'outfit',
      status: 'queued',
      createdAt: Date.now(),
      retryCount: 0,
      maxRetries: MAX_RETRIES,
      payload,
    };
    setQueue(prev => [...prev, request]);
    return id;
  }, []);

  const enqueuePackingGeneration = useCallback((payload: PackingGenerationRequest['payload']): string => {
    const id = generateId();
    const request: PackingGenerationRequest = {
      id,
      type: 'packing',
      status: 'queued',
      createdAt: Date.now(),
      retryCount: 0,
      maxRetries: MAX_RETRIES,
      payload,
    };
    setQueue(prev => [...prev, request]);
    return id;
  }, []);

  // Queue management
  const cancelRequest = useCallback((id: string) => {
    setQueue(prev => prev.filter(r => r.id !== id));
    if (activeRequest?.id === id) {
      // Can't really cancel an in-flight request, but we can ignore its result
      setActiveRequest(null);
    }
  }, [activeRequest]);

  const clearCompletedRequest = useCallback((id: string) => {
    setCompletedRequests(prev => prev.filter(r => r.id !== id));
  }, []);

  const clearAllCompleted = useCallback(() => {
    setCompletedRequests([]);
  }, []);

  const retryRequest = useCallback((id: string) => {
    const request = completedRequests.find(r => r.id === id && r.status === 'failed');
    if (request) {
      setCompletedRequests(prev => prev.filter(r => r.id !== id));
      setQueue(prev => [...prev, { ...request, status: 'queued', retryCount: 0, error: undefined }]);
    }
  }, [completedRequests]);

  // Get specific results
  const getStudioResults = useCallback((): StudioGenerationRequest[] => {
    return completedRequests.filter(
      (r): r is StudioGenerationRequest => r.type === 'studio' && r.status === 'completed'
    );
  }, [completedRequests]);

  const getOutfitResults = useCallback((): OutfitGenerationRequest[] => {
    return completedRequests.filter(
      (r): r is OutfitGenerationRequest => r.type === 'outfit' && r.status === 'completed'
    );
  }, [completedRequests]);

  const getPackingResults = useCallback((): PackingGenerationRequest[] => {
    return completedRequests.filter(
      (r): r is PackingGenerationRequest => r.type === 'packing' && r.status === 'completed'
    );
  }, [completedRequests]);

  // Computed values
  const isProcessing = activeRequest !== null;
  const queueLength = queue.length + (isProcessing ? 1 : 0);
  const hasCompletedRequests = completedRequests.some(r => r.status === 'completed');

  const value: AIGenerationContextType = {
    queue,
    activeRequest,
    completedRequests,
    isProcessing,
    queueLength,
    hasCompletedRequests,
    enqueueStudioGeneration,
    enqueueOutfitGeneration,
    enqueuePackingGeneration,
    cancelRequest,
    clearCompletedRequest,
    clearAllCompleted,
    retryRequest,
    getStudioResults,
    getOutfitResults,
    getPackingResults,
  };

  return (
    <AIGenerationContext.Provider value={value}>
      {children}
    </AIGenerationContext.Provider>
  );
}

// ============================================================================
// Hooks
// ============================================================================

export function useAIGeneration() {
  const context = useContext(AIGenerationContext);
  if (!context) {
    throw new Error('useAIGeneration must be used within an AIGenerationProvider');
  }
  return context;
}

// Lightweight hook for status indicators
export function useAIGenerationStatus() {
  const context = useContext(AIGenerationContext);
  return {
    isProcessing: context?.isProcessing ?? false,
    queueLength: context?.queueLength ?? 0,
    hasCompletedRequests: context?.hasCompletedRequests ?? false,
    activeType: context?.activeRequest?.type ?? null,
    activeStatus: context?.activeRequest?.status ?? null,
    retryCount: context?.activeRequest?.retryCount ?? 0,
  };
}

// Hook for specific generation type
export function useStudioGeneration() {
  const context = useAIGeneration();
  const failures = context.completedRequests
    .filter((r) => r.type === 'studio' && r.status === 'failed')
    .sort((a, b) => (b.failedAt || 0) - (a.failedAt || 0));

  return {
    enqueue: context.enqueueStudioGeneration,
    results: context.getStudioResults(),
    isProcessing: context.activeRequest?.type === 'studio',
    activeRequest: context.activeRequest?.type === 'studio' ? context.activeRequest : null,
    clearResult: context.clearCompletedRequest,
    lastFailure: failures[0] ?? null,
    cancel: context.cancelRequest,
    retry: context.retryRequest,
  };
}

export function useOutfitGeneration2() {
  const context = useAIGeneration();
  return {
    enqueue: context.enqueueOutfitGeneration,
    results: context.getOutfitResults(),
    isProcessing: context.activeRequest?.type === 'outfit',
    activeRequest: context.activeRequest?.type === 'outfit' ? context.activeRequest : null,
    clearResult: context.clearCompletedRequest,
  };
}

export function usePackingGeneration() {
  const context = useAIGeneration();
  return {
    enqueue: context.enqueuePackingGeneration,
    results: context.getPackingResults(),
    isProcessing: context.activeRequest?.type === 'packing',
    activeRequest: context.activeRequest?.type === 'packing' ? context.activeRequest : null,
    clearResult: context.clearCompletedRequest,
  };
}
