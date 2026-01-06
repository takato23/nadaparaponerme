/**
 * Gemini Service - Modular Version
 * 
 * This index file re-exports all functions from the modular structure.
 * It provides backward compatibility with existing imports.
 * 
 * Usage:
 *   import { analyzeClothingItem, generateOutfit } from '../services/gemini';
 * 
 * Or import from specific modules:
 *   import { analyzeClothingItem } from '../services/gemini/analyze';
 */

// Client configuration and utilities
export {
    configureGeminiAPI,
    getAIClient,
    enrichError,
    base64ToGenerativePart,
    Type,
    Part,
    Modality
} from './client';

// For backward compatibility, re-export everything from the original monolithic service
// This allows gradual migration without breaking existing code
export * from '../geminiService';
