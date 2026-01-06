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
    slotItems: Array<{ slot: ClothingSlot; item: ClothingItem }>;
    preset: GenerationPreset;
    customScene?: string;
    keepPose: boolean;
    useFaceRefs: boolean;
    faceRefsCount: number;
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
    message.includes('invalid')
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

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
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

        setQueue(requeued);
        setCompletedRequests(validCompleted.slice(0, MAX_COMPLETED_RESULTS));
      }
    } catch (e) {
      console.error('Failed to load AI generation state:', e);
    }

    return () => {
      isMountedRef.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // Save state to localStorage when it changes
  useEffect(() => {
    const data = {
      queue,
      active: activeRequest,
      completed: completedRequests.slice(0, MAX_COMPLETED_RESULTS),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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

      switch (request.type) {
        case 'studio': {
          const payload = (request as StudioGenerationRequest).payload;
          const apiResult = await generateVirtualTryOnWithSlots(
            payload.userImage,
            payload.slots,
            {
              preset: payload.preset,
              quality: payload.preset === 'editorial' ? 'pro' : 'flash',
              customScene: payload.customScene,
              keepPose: payload.keepPose,
              useFaceReferences: payload.useFaceRefs && payload.faceRefsCount > 0,
            }
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
          result = await aiService.generateOutfit(
            payload.closet,
            payload.occasion,
            payload.style,
            payload.weather,
            payload.excludeIds
          );
          break;
        }

        case 'packing': {
          const payload = (request as PackingGenerationRequest).payload;
          result = await aiService.generatePackingList(
            payload.closet,
            payload.destination,
            payload.duration,
            payload.activities,
            payload.weather
          );
          break;
        }
      }

      // Success!
      if (isMountedRef.current) {
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
      console.error(`Generation failed (${request.type}):`, error);

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
  return {
    enqueue: context.enqueueStudioGeneration,
    results: context.getStudioResults(),
    isProcessing: context.activeRequest?.type === 'studio',
    activeRequest: context.activeRequest?.type === 'studio' ? context.activeRequest : null,
    clearResult: context.clearCompletedRequest,
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
