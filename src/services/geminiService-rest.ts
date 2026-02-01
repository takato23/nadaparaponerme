/**
 * Gemini REST API Implementation
 *
 * Uses direct fetch calls to Google's Generative Language API
 * instead of the @google/genai SDK to avoid model compatibility issues.
 */

import type { ClothingItemMetadata } from '../../types';
import { geminiRateLimiter, retryWithBackoff } from '../utils/rateLimiter';

const GEMINI_MODEL = "gemini-2.0-flash";
const API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

// Global API key configuration (same pattern as before)
let _apiKey: string | undefined = undefined;

export function configureGeminiAPI(apiKey: string) {
  _apiKey = apiKey;
}

function getAPIKey(): string {
  if (!_apiKey) {
    throw new Error(
      'Gemini API not configured. This service must be called from Edge Functions only. ' +
      'Use src/services/aiService.ts from client code, which routes through Edge Functions.'
    );
  }
  return _apiKey;
}

// Schema for clothing analysis
const clothingItemSchema = {
  type: "object",
  properties: {
    category: {
      type: "string",
      description: 'ej: "top", "bottom", "shoes", "accessory", "outerwear", "one-piece"',
    },
    subcategory: {
      type: "string",
      description: 'ej: "graphic tee", "cargo pants", "sneakers", "t-shirt", "jeans", "dress", "jacket"',
    },
    color_primary: {
      type: "string",
      description: 'el color principal dominante',
    },
    neckline: {
      type: "string",
      description: 'Opcional. Tipo de cuello si aplica',
    },
    sleeve_type: {
      type: "string",
      description: 'Opcional. Tipo de manga si aplica',
    },
    vibe_tags: {
      type: "array",
      description: 'ej: ["streetwear", "casual", "sporty", "vintage", "minimalist"]',
      items: {
        type: "string",
      },
    },
    seasons: {
      type: "array",
      description: 'array de: "spring", "summer", "autumn", "winter"',
      items: {
        type: "string",
      },
    },
    // Premium Fields
    fashion_score: {
      type: "number",
      description: "Puntaje de moda del 1 al 10 basado en tendencias actuales y calidad visual",
    },
    occasion_tags: {
      type: "array",
      description: 'ej: ["work", "party", "date", "gym", "travel"]',
      items: { type: "string" },
    },
    color_palette: {
      type: "array",
      description: "Array de códigos hex de los colores prominentes en la prenda",
      items: { type: "string" },
    },
    styling_tips: {
      type: "string",
      description: "Consejo corto y experto de cómo combinar esta prenda",
    },
    care_instructions: {
      type: "string",
      description: "Instrucciones de cuidado inferidas (ej: 'Lavar en frío', 'Limpieza en seco')",
    },
    fabric_composition: {
      type: "string",
      description: "Composición de tela estimada (ej: '100% Algodón', 'Mezcla de Poliéster')",
    },
  },
  required: ['category', 'subcategory', 'color_primary', 'vibe_tags', 'seasons', 'fashion_score', 'occasion_tags', 'styling_tips'],
};

/**
 * Analyze clothing item using REST API (with rate limiting and retry)
 */
export async function analyzeClothingItem(imageDataUrl: string): Promise<ClothingItemMetadata> {
  // Wrap in rate limiter and retry logic
  return retryWithBackoff(async () => {
    return geminiRateLimiter.execute(async () => {
      const [mimeType, base64Data] = imageDataUrl.split(';base64,');
      const imageMimeType = mimeType.split(':')[1];

      if (!base64Data || !imageMimeType) {
        throw new Error('Invalid image data URL');
      }

      const apiKey = getAPIKey();
      const url = `${API_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

      const requestBody = {
        contents: [{
          parts: [
            {
              text: 'Analiza esta prenda como un Estilista de Moda de Alto Nivel. Provee: categoría, subcategoría, color, detalles técnicos, vibe tags, temporadas, puntaje de moda (1-10), ocasiones de uso, paleta de colores (hex), tips de estilismo expertos, cuidados y composición estimada. Responde en JSON.'
            },
            {
              inlineData: {
                mimeType: imageMimeType,
                data: base64Data
              }
            }
          ]
        }],
        systemInstruction: {
          parts: [{
            text: 'Eres un Estilista de Moda de clase mundial y experto en análisis de prendas. Tu trabajo es analizar ropa con precisión técnica y gusto exquisito. Identifica tendencias, calidad y estilo.'
          }]
        },
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: clothingItemSchema,
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Gemini API error: ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      const text = data.candidates[0].content.parts[0].text;
      const parsedJson = JSON.parse(text);

      if (parsedJson.category && Array.isArray(parsedJson.vibe_tags) && Array.isArray(parsedJson.seasons)) {
        return parsedJson as ClothingItemMetadata;
      } else {
        throw new Error('Parsed JSON does not match expected structure.');
      }
    });
  }, 3, 2000); // 3 retries, 2 second base delay
}

/**
 * Test function to verify API key works
 */
export async function testAPIConnection(): Promise<boolean> {
  try {
    const apiKey = getAPIKey();
    const url = `${API_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: "Hello" }]
        }]
      })
    });

    return response.ok;
  } catch (error) {
    console.error("API connection test failed:", error);
    return false;
  }
}

/**
 * Analyze multiple clothing items in a single batch request
 *
 * @param imageDataUrls - Array of base64 data URLs
 * @returns Array of ClothingItemMetadata in the same order
 */
export async function analyzeBatchClothingItems(
  imageDataUrls: string[]
): Promise<ClothingItemMetadata[]> {
  if (imageDataUrls.length === 0) {
    return [];
  }

  // Limit batch size to avoid token limits (max 5 images per batch)
  const MAX_BATCH_SIZE = 5;
  if (imageDataUrls.length > MAX_BATCH_SIZE) {
    throw new Error(`Batch size too large. Maximum ${MAX_BATCH_SIZE} images per batch.`);
  }

  const apiKey = getAPIKey();
  const url = `${API_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  // Build parts array with text instruction + all images
  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
    {
      text: `Analiza estas ${imageDataUrls.length} prendas de ropa. Para CADA imagen (en orden), proporciona su categoría, subcategoría, color principal, tipo de cuello y manga (si aplica), etiquetas de estilo y temporadas apropiadas.

IMPORTANTE: Responde con un array JSON de ${imageDataUrls.length} objetos, uno por cada imagen en el mismo orden que aparecen.`
    }
  ];

  // Add all images to parts
  for (const imageDataUrl of imageDataUrls) {
    const [mimeType, base64Data] = imageDataUrl.split(';base64,');
    const imageMimeType = mimeType.split(':')[1];

    if (!base64Data || !imageMimeType) {
      throw new Error('Invalid image data URL in batch');
    }

    parts.push({
      inlineData: {
        mimeType: imageMimeType,
        data: base64Data
      }
    });
  }

  // Schema for batch response (array of clothing items)
  const batchSchema = {
    type: "array",
    items: clothingItemSchema
  };

  const requestBody = {
    contents: [{ parts }],
    systemInstruction: {
      parts: [{
        text: 'Eres un experto en moda. Analiza prendas de ropa en imágenes y describe sus características detalladamente. Cuando recibes múltiples imágenes, analiza cada una y devuelve un array JSON con los resultados en el mismo orden.'
      }]
    },
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: batchSchema,
    }
  };

  try {
    const startTime = performance.now();

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Gemini API error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;
    const parsedJson = JSON.parse(text);

    const processingTime = performance.now() - startTime;

    // Validate response is an array with correct length
    if (!Array.isArray(parsedJson)) {
      throw new Error('Batch response is not an array');
    }

    if (parsedJson.length !== imageDataUrls.length) {
      console.warn(`⚠️ Expected ${imageDataUrls.length} results, got ${parsedJson.length}. Some images may have failed.`);
    }

    // Validate each item in the array
    const validatedResults: ClothingItemMetadata[] = parsedJson.map((item, idx) => {
      if (!item.category || !Array.isArray(item.vibe_tags) || !Array.isArray(item.seasons)) {
        throw new Error(`Invalid metadata structure for image ${idx + 1}`);
      }
      return item as ClothingItemMetadata;
    });

    return validatedResults;
  } catch (error) {
    console.error("Error in batch analysis:", error);
    throw new Error(`Failed to analyze batch. ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Stub: Find similar items
 * TODO: Implement using Gemini API or move to Edge Function
 */
export async function findSimilarItems(item: any, inventory: any[]): Promise<string[]> {
  return [];
}
