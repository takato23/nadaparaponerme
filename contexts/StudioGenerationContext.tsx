/**
 * StudioGenerationContext
 *
 * Manages ongoing studio generations globally so they persist
 * across navigation. When a user starts a generation and navigates
 * away, the generation continues and results are stored here.
 */
import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { generateVirtualTryOnWithSlots } from '@/src/services/aiService';
import type { ClothingItem, GenerationPreset, ClothingSlot } from '@/types';

export interface GenerationRequest {
  id: string;
  userImage: string;
  slots: Record<string, string>;
  slotItems: Array<{ slot: ClothingSlot; item: ClothingItem }>;
  preset: GenerationPreset;
  customScene?: string;
  keepPose: boolean;
  useFaceRefs: boolean;
  faceRefsCount: number;
  startedAt: number;
}

export interface GenerationResult {
  requestId: string;
  image: string;
  model: string;
  slotsUsed: string[];
  faceRefsUsed: number;
  completedAt: number;
  request: GenerationRequest;
}

export interface GenerationError {
  requestId: string;
  error: string;
  failedAt: number;
  request: GenerationRequest;
}

interface StudioGenerationContextType {
  // Current state
  activeGeneration: GenerationRequest | null;
  isGenerating: boolean;
  pendingResults: GenerationResult[];
  lastError: GenerationError | null;

  // Actions
  startGeneration: (request: Omit<GenerationRequest, 'id' | 'startedAt'>) => Promise<GenerationResult>;
  clearPendingResult: (requestId: string) => void;
  clearAllPendingResults: () => void;
  clearError: () => void;

  // For checking if there's a result waiting
  hasPendingResults: boolean;
}

const StudioGenerationContext = createContext<StudioGenerationContextType | null>(null);

const STORAGE_KEY = 'studio-pending-generations';
const MAX_STORED_RESULTS = 5;

function generateId(): string {
  return `gen_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function StudioGenerationProvider({ children }: { children: React.ReactNode }) {
  const [activeGeneration, setActiveGeneration] = useState<GenerationRequest | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pendingResults, setPendingResults] = useState<GenerationResult[]>([]);
  const [lastError, setLastError] = useState<GenerationError | null>(null);

  // Use ref to track if component is mounted (for async operations)
  const isMountedRef = useRef(true);

  // Load pending results from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as GenerationResult[];
        // Only load results from the last hour
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        const validResults = parsed.filter(r => r.completedAt > oneHourAgo);
        setPendingResults(validResults);

        // Clean up old results
        if (validResults.length !== parsed.length) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(validResults));
        }
      }
    } catch (e) {
      console.error('Failed to load pending generations:', e);
    }

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Save pending results to localStorage when they change
  useEffect(() => {
    if (pendingResults.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingResults.slice(0, MAX_STORED_RESULTS)));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [pendingResults]);

  const startGeneration = useCallback(async (
    requestData: Omit<GenerationRequest, 'id' | 'startedAt'>
  ): Promise<GenerationResult> => {
    const request: GenerationRequest = {
      ...requestData,
      id: generateId(),
      startedAt: Date.now(),
    };

    setActiveGeneration(request);
    setIsGenerating(true);
    setLastError(null);

    // Also save to localStorage in case of page refresh during generation
    localStorage.setItem('studio-active-generation', JSON.stringify(request));

    try {
      const result = await generateVirtualTryOnWithSlots(
        request.userImage,
        request.slots,
        {
          preset: request.preset,
          quality: request.preset === 'editorial' ? 'pro' : 'flash',
          customScene: request.customScene,
          keepPose: request.keepPose,
          useFaceReferences: request.useFaceRefs && request.faceRefsCount > 0,
        }
      );

      const generationResult: GenerationResult = {
        requestId: request.id,
        image: result.resultImage,
        model: result.model,
        slotsUsed: result.slotsUsed,
        faceRefsUsed: result.faceReferencesUsed || 0,
        completedAt: Date.now(),
        request,
      };

      if (isMountedRef.current) {
        setActiveGeneration(null);
        setIsGenerating(false);

        // Add to pending results so it's available even if user navigated away
        setPendingResults(prev => [generationResult, ...prev].slice(0, MAX_STORED_RESULTS));
      }

      // Clean up active generation from localStorage
      localStorage.removeItem('studio-active-generation');

      return generationResult;
    } catch (error) {
      const errorObj: GenerationError = {
        requestId: request.id,
        error: error instanceof Error ? error.message : 'Error desconocido',
        failedAt: Date.now(),
        request,
      };

      if (isMountedRef.current) {
        setActiveGeneration(null);
        setIsGenerating(false);
        setLastError(errorObj);
      }

      // Clean up active generation from localStorage
      localStorage.removeItem('studio-active-generation');

      throw error;
    }
  }, []);

  const clearPendingResult = useCallback((requestId: string) => {
    setPendingResults(prev => prev.filter(r => r.requestId !== requestId));
  }, []);

  const clearAllPendingResults = useCallback(() => {
    setPendingResults([]);
  }, []);

  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  const value: StudioGenerationContextType = {
    activeGeneration,
    isGenerating,
    pendingResults,
    lastError,
    startGeneration,
    clearPendingResult,
    clearAllPendingResults,
    clearError,
    hasPendingResults: pendingResults.length > 0,
  };

  return (
    <StudioGenerationContext.Provider value={value}>
      {children}
    </StudioGenerationContext.Provider>
  );
}

export function useStudioGeneration() {
  const context = useContext(StudioGenerationContext);
  if (!context) {
    throw new Error('useStudioGeneration must be used within a StudioGenerationProvider');
  }
  return context;
}

// Hook to get just the pending status (for showing indicators in nav)
export function useStudioGenerationStatus() {
  const context = useContext(StudioGenerationContext);
  return {
    isGenerating: context?.isGenerating ?? false,
    hasPendingResults: context?.hasPendingResults ?? false,
    pendingCount: context?.pendingResults.length ?? 0,
  };
}
