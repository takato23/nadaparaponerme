/**
 * Gemini AI Client Configuration
 * 
 * This module handles API client initialization and configuration.
 * In development: uses VITE_GEMINI_API_KEY
 * In production: should use Edge Functions only
 */

import { GoogleGenAI, Type, Part, Modality } from "@google/genai";

// API key configuration
let _apiKey: string | undefined = undefined;
let _aiClient: GoogleGenAI | null = null;

/**
 * Configure API key (for Edge Functions only in production)
 */
export function configureGeminiAPI(apiKey: string) {
    _apiKey = apiKey;
    _aiClient = new GoogleGenAI({ apiKey });
}

/**
 * Get configured AI client
 * In development mode, automatically configures from VITE_GEMINI_API_KEY
 */
export function getAIClient(): GoogleGenAI {
    // If already configured, return it
    if (_aiClient && _apiKey) {
        return _aiClient;
    }

    // In development mode, try to read from VITE_ environment variable
    const envApiKey = import.meta.env?.VITE_GEMINI_API_KEY;
    if (envApiKey) {
        console.log('🔑 Gemini API configured from environment variable (development mode)');
        _apiKey = envApiKey;
        _aiClient = new GoogleGenAI({ apiKey: envApiKey });
        return _aiClient;
    }

    // If not configured, throw error
    throw new Error(
        'Gemini API not configured. Set VITE_GEMINI_API_KEY in .env.local for development, ' +
        'or use Edge Functions for production.'
    );
}

/**
 * Create enriched error with context
 * Adds operation context to help with debugging and user-facing messages
 */
export function enrichError(error: unknown, operation: string, context?: Record<string, any>): Error {
    const err = error instanceof Error ? error : new Error(String(error));

    // Add operation context to error message
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : '';
    err.message = `[${operation}] ${err.message}${contextStr}`;

    // Add metadata for error handling
    (err as any).operation = operation;
    (err as any).context = context;

    return err;
}

/**
 * Convert base64 data to Gemini Part format
 */
export function base64ToGenerativePart(base64Data: string, mimeType: string): Part {
    return {
        inlineData: {
            data: base64Data,
            mimeType,
        },
    };
}

// Re-export types and utilities for convenience
export { Type, Part, Modality };
