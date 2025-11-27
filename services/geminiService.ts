import { GoogleGenAI, Type, Part, Modality } from "@google/genai";
import type { ClothingItemMetadata, ClothingItem, FitResult, PackingListResult, GroundingChunk, ColorPaletteAnalysis, ChatMessage, WeatherData, WeatherOutfitResult, Lookbook, LookbookTheme, ChallengeType, ChallengeDifficulty, FeedbackInsights, FeedbackPatternData, OutfitRating, SavedOutfit, ShoppingGap, ShoppingRecommendation, ShoppingChatMessage } from '../types';
import { getSeason } from './weatherService';
import { getToneInstructions } from './aiToneHelper';
import { retryAIOperation, retryAIOperation as retryWithBackoff } from '../utils/retryWithBackoff';

/**
 * SECURITY NOTICE: API Key Management
 *
 * This service should ONLY be used from server-side contexts (Supabase Edge Functions).
 * The API key is NO LONGER exposed in the client bundle for security reasons.
 *
 * For client-side usage:
 * - Use src/services/aiService.ts which routes calls through Edge Functions
 * - Edge Functions securely access the API key from Supabase Secrets
 *
 * Direct usage from this file will fail unless an API key is explicitly provided.
 */

// ⛔ SECURITY: API key MUST only be configured via Edge Functions (server-side)
// NEVER read from VITE_ environment variables - they are exposed in client bundle
let _apiKey: string | undefined = undefined;

// Lazy initialization - only creates client when explicitly configured via configureGeminiAPI()
let _aiClient: GoogleGenAI | null = null;

/**
 * Configure API key (for Edge Functions only)
 * This should NEVER be called from client code
 */
export function configureGeminiAPI(apiKey: string) {
  _apiKey = apiKey;
  _aiClient = new GoogleGenAI({ apiKey });
}

/**
 * Get configured AI client
 * Throws error if called without proper configuration
 */
function getAIClient(): GoogleGenAI {
  // If already configured from environment or explicit config, return it
  if (_aiClient && _apiKey) {
    return _aiClient;
  }

  // If not configured, throw error
  throw new Error(
    'Gemini API not configured. This service must be called from Edge Functions only. ' +
    'Use src/services/aiService.ts from client code, which routes through Edge Functions.'
  );
}

/**
 * Create enriched error with context
 * Adds operation context to help with debugging and user-facing messages
 */
function enrichError(error: unknown, operation: string, context?: Record<string, any>): Error {
  const err = error instanceof Error ? error : new Error(String(error));

  // Add operation context to error message
  const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : '';
  err.message = `[${operation}] ${err.message}${contextStr}`;

  // Add metadata for error handling
  (err as any).operation = operation;
  (err as any).context = context;

  return err;
}

// --- Analyze Item Service ---

const clothingItemSchema = {
    type: Type.OBJECT,
    properties: {
        category: {
            type: Type.STRING,
            description: 'ej: "top", "bottom", "shoes", "accessory", "outerwear", "one-piece"',
        },
        subcategory: {
            type: Type.STRING,
            description: 'ej: "graphic tee", "cargo pants", "sneakers", "t-shirt", "jeans", "dress", "jacket"',
        },
        color_primary: {
            type: Type.STRING,
            description: 'el color principal dominante',
        },
        neckline: {
            type: Type.STRING,
            description: 'Opcional. Tipo de cuello si aplica. ej: "cuello redondo", "cuello en V", "cuello alto", "strapless"',
        },
        sleeve_type: {
            type: Type.STRING,
            description: 'Opcional. Tipo de manga si aplica. ej: "manga corta", "manga larga", "sin mangas", "tirantes"',
        },
        vibe_tags: {
            type: Type.ARRAY,
            description: 'ej: "streetwear", "casual", "sporty", "elegant", "boho", "minimalist"',
            items: {
                type: Type.STRING,
            },
        },
        seasons: {
            type: Type.ARRAY,
            description: 'array de: "spring", "summer", "autumn", "winter"',
            items: {
                type: Type.STRING,
            },
        },
    },
    required: ['category', 'subcategory', 'color_primary', 'vibe_tags', 'seasons'],
};

function base64ToGenerativePart(base64Data: string, mimeType: string) {
  return {
    inlineData: {
      data: base64Data,
      mimeType,
    },
  };
}

export async function analyzeClothingItem(imageDataUrl: string): Promise<ClothingItemMetadata> {
  try {
    const [mimeType, base64Data] = imageDataUrl.split(';base64,');
    const imageMimeType = mimeType.split(':')[1];

    if (!base64Data || !imageMimeType) {
      throw enrichError(
        new Error('Formato de imagen inválido'),
        'analyzeClothingItem',
        { hasBase64: !!base64Data, hasMimeType: !!imageMimeType }
      );
    }

    const imagePart = base64ToGenerativePart(base64Data, imageMimeType);
    const systemInstruction = `Eres un experto en moda. Analiza la prenda en la imagen y describe sus características, prestando especial atención a detalles como el tipo de cuello y de manga si son visibles.`;

    const response = await retryAIOperation(async () => {
      return await getAIClient().models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart] },
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          responseSchema: clothingItemSchema,
        }
      });
    });

    if (!response?.text) {
      throw enrichError(
        new Error('La IA no devolvió ninguna respuesta'),
        'analyzeClothingItem',
        { responseEmpty: true }
      );
    }

    const parsedJson = JSON.parse(response.text);

    if (!parsedJson.category || !Array.isArray(parsedJson.vibe_tags) || !Array.isArray(parsedJson.seasons)) {
      throw enrichError(
        new Error('La respuesta de IA no tiene el formato esperado'),
        'analyzeClothingItem',
        { hasCategory: !!parsedJson.category, hasVibeTags: Array.isArray(parsedJson.vibe_tags) }
      );
    }

    return parsedJson as ClothingItemMetadata;
  } catch (error: any) {
    console.error("Error analyzing clothing item:", error);

    // Provide more specific error messages
    if (error?.message?.includes('429') || error?.message?.includes('rate limit') || error?.message?.includes('RESOURCE_EXHAUSTED')) {
      throw enrichError(
        new Error('Límite de análisis alcanzado. Por favor esperá 30 minutos o upgradeá a Premium.'),
        'analyzeClothingItem',
        { errorType: 'rate_limit' }
      );
    }

    if (error?.message?.includes('503') || error?.message?.includes('overloaded') || error?.message?.includes('UNAVAILABLE')) {
      throw enrichError(
        new Error('El servicio de IA está temporalmente sobrecargado. Por favor, intenta nuevamente en unos segundos.'),
        'analyzeClothingItem',
        { errorType: 'service_overload' }
      );
    }

    if (error?.message?.includes('dark') || error?.message?.includes('oscura')) {
      throw enrichError(
        new Error('La imagen está muy oscura. Por favor tomá la foto con mejor iluminación.'),
        'analyzeClothingItem',
        { errorType: 'dark_image' }
      );
    }

    if (error?.message?.includes('timeout') || error?.message?.includes('deadline')) {
      throw enrichError(
        new Error('El análisis tardó demasiado. Por favor intentá de nuevo.'),
        'analyzeClothingItem',
        { errorType: 'timeout' }
      );
    }

    // Re-throw enriched error or create generic one
    throw error?.operation ? error : enrichError(
      error,
      'analyzeClothingItem',
      { originalMessage: error?.message }
    );
  }
}

// --- Generate Clothing Image Service ---

export async function generateClothingImage(prompt: string): Promise<string> {
  const enhancedPrompt = `A high-quality studio photograph of ${prompt}, on a clean, neutral white background. The item should be the main focus, with no distractions. Centered composition.`;

  try {
    const response = await getAIClient().models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: enhancedPrompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '1:1',
        },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
        const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
        return `data:image/jpeg;base64,${base64ImageBytes}`;
    } else {
        throw new Error("Image generation failed, no images returned.");
    }
  } catch (error) {
    console.error("Error generating clothing image:", error);
    throw new Error("Failed to generate an image. Please try a different prompt.");
  }
}


// --- Generate Outfit Service ---

const fitResultSchema = {
    type: Type.OBJECT,
    properties: {
        top_id: { type: Type.STRING },
        bottom_id: { type: Type.STRING },
        shoes_id: { type: Type.STRING },
        explanation: { type: Type.STRING },
        missing_piece_suggestion: {
            type: Type.OBJECT,
            description: "Sugerencia opcional para una prenda que falta para completar el look.",
            properties: {
                item_name: { type: Type.STRING, description: "ej: 'White minimalist sneakers'" },
                reason: { type: Type.STRING, description: "ej: 'Tus zapatos actuales son muy deportivos para este look.'" }
            },
            required: ['item_name', 'reason']
        }
    },
    required: ['top_id', 'bottom_id', 'shoes_id', 'explanation'],
};

export async function generateOutfit(userPrompt: string, inventory: ClothingItem[]): Promise<FitResult> {
    // We only need to send metadata and IDs, not the full image data, to save tokens.
    const simplifiedInventory = inventory.map(item => ({
        id: item.id,
        metadata: item.metadata
    }));

    if (simplifiedInventory.length < 3) {
        throw new Error("No hay suficientes prendas en tu armario. Añade al menos un top, un pantalón y un par de zapatos.");
    }

    const systemInstruction = `Eres un estilista personal con un 'ojo de loca' para la moda. Tienes acceso al siguiente inventario de ropa: ${JSON.stringify(simplifiedInventory)}. El usuario quiere un outfit para: "${userPrompt}".
    Selecciona la mejor combinación (Top + Bottom + Shoes) del inventario.
    Si crees que falta una pieza clave en el inventario para que el outfit sea perfecto (ej: los zapatos disponibles no combinan bien), puedes sugerir una pieza que el usuario podría comprar. Para ello, incluye el campo opcional 'missing_piece_suggestion'.
    Devuelve siempre un JSON con los IDs de las prendas seleccionadas del inventario y una breve explicación de por qué funciona este outfit.`;

    try {
        const response = await retryWithBackoff(async () => {
          return await getAIClient().models.generateContent({
            model: 'gemini-2.5-flash', // Usando 2.5-flash: modelo estable más reciente
            contents: { parts: [{ text: `Aquí está la petición del usuario: "${userPrompt}"` }] },
            config: {
              systemInstruction,
              responseMimeType: "application/json",
              responseSchema: fitResultSchema,
            }
          });
        });

        const parsedJson = JSON.parse(response.text);

        if (parsedJson.top_id && parsedJson.bottom_id && parsedJson.shoes_id && parsedJson.explanation) {
            return parsedJson as FitResult;
        } else {
            throw new Error("La IA no pudo crear un outfit válido con las prendas disponibles.");
        }
    } catch (error: any) {
        console.error("Error generating outfit:", error);

        const errorMessage = error?.message || String(error);

        // Handle quota exceeded (429 with billing message)
        if (errorMessage.includes('exceeded your current quota') || errorMessage.includes('billing')) {
            throw new Error("⏱️ Has alcanzado el límite gratuito de la API de Gemini. Esperá unos minutos e intentá de nuevo, o conseguí una API key con más cuota en https://aistudio.google.com/app/apikey");
        }

        // Handle rate limiting (temporary 429)
        if (errorMessage.includes('429') || errorMessage.includes('rate limit') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
            throw new Error("⏱️ Demasiadas solicitudes. Esperá 30-60 segundos e intentá de nuevo.");
        }

        // Provide more specific error message for API overload
        if (errorMessage.includes('503') || errorMessage.includes('overloaded')) {
            throw new Error("El servicio de IA está temporalmente sobrecargado. Por favor, intenta nuevamente en unos segundos.");
        }

        throw new Error("No se pudo generar un outfit. Inténtalo de nuevo.");
    }
}

/**
 * Generate outfit with custom system prompt (for professional stylist)
 * @param userPrompt - User's occasion/context
 * @param inventory - Available clothing items
 * @param customSystemPrompt - Custom system instruction
 * @param responseSchema - Custom response schema
 * @returns FitResult with potential educational fields
 */
export async function generateOutfitWithCustomPrompt(
  userPrompt: string,
  inventory: ClothingItem[],
  customSystemPrompt: string,
  responseSchema: any
): Promise<any> {
  console.log('🟢 [GEMINI] generateOutfitWithCustomPrompt iniciando...');
  console.log('🟢 [GEMINI] Inventory size:', inventory.length);

  const simplifiedInventory = inventory.map(item => ({
    id: item.id,
    metadata: item.metadata
  }));

  if (simplifiedInventory.length < 3) {
    throw new Error("No hay suficientes prendas en tu armario. Añade al menos un top, un pantalón y un par de zapatos.");
  }

  try {
    console.log('🟢 [GEMINI] Llamando a retryWithBackoff...');
    const response = await retryWithBackoff(async () => {
      console.log('🟢 [GEMINI] Dentro de retryWithBackoff, llamando a getAIClient()...');
      return await getAIClient().models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: `Aquí está la petición del usuario: "${userPrompt}"\n\nINVENTARIO DISPONIBLE:\n${JSON.stringify(simplifiedInventory, null, 2)}` }] },
        config: {
          systemInstruction: customSystemPrompt,
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        }
      });
    });

    console.log('🟢 [GEMINI] Respuesta recibida, parseando JSON...');
    const parsedJson = JSON.parse(response.text);
    console.log('🟢 [GEMINI] JSON parseado exitosamente');

    if (parsedJson.top_id && parsedJson.bottom_id && parsedJson.shoes_id && parsedJson.explanation) {
      console.log('🟢 [GEMINI] Validación exitosa, retornando resultado');
      return parsedJson;
    } else {
      throw new Error("La IA no pudo crear un outfit válido con las prendas disponibles.");
    }
  } catch (error) {
    console.error("🔴 [GEMINI] Error generating outfit:", error);

    if (error?.message?.includes('503') || error?.message?.includes('overloaded')) {
      throw new Error("El servicio de IA está temporalmente sobrecargado. Por favor, intenta nuevamente en unos segundos.");
    }

    throw new Error("No se pudo generar un outfit. Inténtalo de nuevo.");
  }
}

// --- Generate Packing List Service ---

const packingListSchema = {
    type: Type.OBJECT,
    properties: {
        packing_list: {
            type: Type.ARRAY,
            description: "An array of item IDs from the inventory to pack for the trip.",
            items: { type: Type.STRING }
        },
        outfit_suggestions: {
            type: Type.STRING,
            description: "A markdown-formatted string suggesting several outfits. ej: '- **Look de Día:** Prenda A + Prenda B. Perfecto para pasear.\\n- **Look de Noche:** Prenda D + Prenda E. Ideal para una cena.'"
        }
    },
    required: ['packing_list', 'outfit_suggestions']
};

export async function generatePackingList(prompt: string, inventory: ClothingItem[]): Promise<PackingListResult> {
    const simplifiedInventory = inventory.map(item => ({
        id: item.id,
        metadata: item.metadata
    }));

    if (simplifiedInventory.length < 3) {
        throw new Error("No hay suficientes prendas en tu armario para hacer una maleta.");
    }

    const toneInstructions = getToneInstructions();

    const systemInstruction = `Eres un estilista de viajes experto. Tienes acceso al siguiente inventario de ropa: ${JSON.stringify(simplifiedInventory)}.

${toneInstructions}

    El usuario necesita hacer una maleta para: "${prompt}".
    Crea una lista de equipaje compacta y versátil seleccionando prendas del inventario.
    Además, proporciona algunas sugerencias de outfits que se pueden crear con los artículos seleccionados.
    Devuelve un JSON con los IDs de las prendas a empacar y las sugerencias de outfits en formato markdown.`;

    try {
        const response = await retryWithBackoff(async () => {
          return await getAIClient().models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: `Detalles del viaje: "${prompt}"` }] },
            config: {
              systemInstruction,
              responseMimeType: "application/json",
              responseSchema: packingListSchema,
            }
          });
        });

        const parsedJson = JSON.parse(response.text);

        if (parsedJson.packing_list && parsedJson.outfit_suggestions) {
            return parsedJson as PackingListResult;
        } else {
            throw new Error("La IA no pudo crear una lista de equipaje válida.");
        }
    } catch (error) {
        console.error("Error generating packing list:", error);

        // Provide more specific error message for API overload
        if (error?.message?.includes('503') || error?.message?.includes('overloaded')) {
            throw new Error("El servicio de IA está temporalmente sobrecargado. Por favor, intenta nuevamente en unos segundos.");
        }

        throw new Error("No se pudo generar la lista de equipaje. Inténtalo de nuevo.");
    }
}

// --- Find Similar Items Service ---

const similarItemsSchema = {
    type: Type.OBJECT,
    properties: {
        similar_item_ids: {
            type: Type.ARRAY,
            description: "An array of IDs of items that are visually similar to the reference item.",
            items: {
                type: Type.STRING,
            },
        },
    },
    required: ['similar_item_ids'],
};

export async function findSimilarItems(currentItem: ClothingItem, inventory: ClothingItem[]): Promise<string[]> {
    const searchPool = inventory.filter(item => item.id !== currentItem.id);
    if (searchPool.length === 0) {
        return [];
    }
    
    const [currentItemMime, currentItemBase64] = currentItem.imageDataUrl.split(';base64,');
    if (!currentItemBase64 || !currentItemMime) {
        throw new Error('Invalid image data URL for current item');
    }

    const parts: Part[] = [
        { text: "You are a visual search engine for a fashion closet app. The first image is the reference item. From the following list of clothing items (each prefixed with its ID), identify up to 5 items that are visually similar in style, pattern, or silhouette. Respond ONLY with a JSON object containing their IDs." },
        base64ToGenerativePart(currentItemBase64, currentItemMime.split(':')[1]),
        { text: "--- INVENTORY ---" },
    ];

    for (const item of searchPool) {
        const [mime, base64] = item.imageDataUrl.split(';base64,');
        if (base64 && mime) {
            parts.push({ text: `ID: ${item.id}` });
            parts.push(base64ToGenerativePart(base64, mime.split(':')[1]));
        }
    }
    
    const systemInstruction = "Analyze the provided images and return a JSON object with the IDs of similar items. Do not include any other text or explanations in your response.";

    try {
        const response = await getAIClient().models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts },
                config: {
                    systemInstruction,
                    responseMimeType: "application/json",
                    responseSchema: similarItemsSchema,
                }
    });

        const parsedJson = JSON.parse(response.text);

        if (parsedJson.similar_item_ids && Array.isArray(parsedJson.similar_item_ids)) {
            return parsedJson.similar_item_ids as string[];
        } else {
            throw new Error('Parsed JSON does not match expected structure for similar items.');
        }

    } catch (error) {
        console.error("Error finding similar items:", error);
        // Return empty array on failure to avoid breaking the UI
        return [];
    }
}

/**
 * Find similar items in inventory using an uploaded image
 * Used for visual search feature
 */
export async function findSimilarByImage(searchImage: string, inventory: ClothingItem[]): Promise<string[]> {
    if (inventory.length === 0) {
        return [];
    }

    // Extract base64 from data URL
    const [searchMime, searchBase64] = searchImage.split(';base64,');
    if (!searchBase64 || !searchMime) {
        throw new Error('Invalid image data URL');
    }

    const parts: Part[] = [
        { text: "You are a visual search engine for a fashion closet app. The first image is a reference photo uploaded by the user. From the following list of clothing items (each prefixed with its ID), identify up to 5 items that are visually similar in style, color, pattern, or silhouette. Respond ONLY with a JSON object containing their IDs." },
        base64ToGenerativePart(searchBase64, searchMime.split(':')[1]),
        { text: "--- CLOSET INVENTORY ---" },
    ];

    // Add inventory items
    for (const item of inventory) {
        const imageUrl = item.imageDataUrl || (item as any).image_url;
        if (!imageUrl) continue;

        // Handle both base64 and URL images
        if (imageUrl.startsWith('data:')) {
            const [mime, base64] = imageUrl.split(';base64,');
            if (base64 && mime) {
                parts.push({ text: `ID: ${item.id}` });
                parts.push(base64ToGenerativePart(base64, mime.split(':')[1]));
            }
        }
        // Note: For Supabase URLs, we would need to fetch and convert to base64
        // or use a different approach (like using the URL directly with Gemini)
    }

    const systemInstruction = "Analyze the provided images and return a JSON object with the IDs of items similar to the reference image. Consider color, style, pattern, and silhouette when determining similarity. Do not include any other text or explanations in your response.";

    try {
        const response = await getAIClient().models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts },
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: similarItemsSchema,
            }
        });

        const parsedJson = JSON.parse(response.text);

        if (parsedJson.similar_item_ids && Array.isArray(parsedJson.similar_item_ids)) {
            return parsedJson.similar_item_ids as string[];
        } else {
            return [];
        }

    } catch (error) {
        console.error("Error finding similar items by image:", error);
        return [];
    }
}

// --- Search Shopping Suggestions Service ---

export async function searchShoppingSuggestions(itemName: string): Promise<GroundingChunk[]> {
    const prompt = `Find online shopping links for: ${itemName}. Provide a brief, encouraging response.`;

    try {
        const response = await getAIClient().models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    tools: [{googleSearch: {}}],
                },
            });

        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunks && Array.isArray(chunks)) {
            return chunks.filter(chunk => 'web' in chunk) as GroundingChunk[];
        }
        return [];

    } catch (error) {
        console.error("Error searching shopping suggestions:", error);

        // Provide more specific error message for API overload
        if (error?.message?.includes('503') || error?.message?.includes('overloaded')) {
            throw new Error("El servicio de IA está temporalmente sobrecargado. Por favor, intenta nuevamente en unos segundos.");
        }

        throw new Error("Failed to search for shopping suggestions.");
    }
}


// --- Virtual Try-On Service ---
export async function generateVirtualTryOn(
    userImage: string,
    topImage: string,
    bottomImage: string,
    shoesImage: string
): Promise<string> {

    const imageSources = [userImage, topImage, bottomImage, shoesImage];
    const imageParts: Part[] = [];

    for (const src of imageSources) {
        const [mime, base64] = src.split(';base64,');
        if (base64 && mime) {
            imageParts.push(base64ToGenerativePart(base64, mime.split(':')[1]));
        }
    }

    if (imageParts.length !== 4) {
        throw new Error("Una o más imágenes no son válidas.");
    }

    const prompt = 'Eres un asistente de moda experto. Viste a la persona en la primera imagen con la ropa de las tres imágenes que le siguen (top, pantalón, zapatos). Combina la ropa de forma realista sobre el cuerpo de la persona, manteniendo su rostro, pose y el fondo original. La salida debe ser solo la imagen final.';

    try {
        const response = await getAIClient().models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { text: prompt },
                    ...imageParts
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
    });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
              const base64ImageBytes: string = part.inlineData.data;
              return `data:image/png;base64,${base64ImageBytes}`;
            }
        }
        
        throw new Error("La IA no devolvió una imagen.");

    } catch (error) {
        console.error("Error generating virtual try-on:", error);
        throw new Error("No se pudo generar la imagen. Intenta con otra foto.");
    }
}

// --- Color Palette Analyzer Service ---

const colorPaletteSchema = {
    type: Type.OBJECT,
    properties: {
        dominant_colors: {
            type: Type.ARRAY,
            description: "Top 5-8 colores dominantes en el armario con información hex y porcentaje",
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: "Nombre del color en español (ej: 'Negro', 'Azul marino')" },
                    hex: { type: Type.STRING, description: "Código hexadecimal del color (ej: '#000000')" },
                    percentage: { type: Type.NUMBER, description: "Porcentaje aproximado de este color en el armario" }
                },
                required: ['name', 'hex', 'percentage']
            }
        },
        color_scheme: {
            type: Type.STRING,
            description: "Esquema cromático detectado: 'monochromatic', 'complementary', 'analogous', 'triadic', o 'diverse'"
        },
        missing_colors: {
            type: Type.ARRAY,
            description: "Sugerencias de colores que faltan para mejorar versatilidad (máximo 5)",
            items: { type: Type.STRING }
        },
        versatility_score: {
            type: Type.NUMBER,
            description: "Puntuación de versatilidad del armario de 0-100 basada en balance de colores"
        },
        recommendations: {
            type: Type.STRING,
            description: "Recomendaciones personalizadas para mejorar la paleta de colores (2-3 frases)"
        }
    },
    required: ['dominant_colors', 'color_scheme', 'missing_colors', 'versatility_score', 'recommendations']
};

export async function analyzeColorPalette(inventory: ClothingItem[]): Promise<ColorPaletteAnalysis> {
    // Extract only color information to save tokens
    const colors = inventory.map(item => ({
        id: item.id,
        category: item.metadata.category,
        primary_color: item.metadata.color_primary,
        vibes: item.metadata.vibe_tags
    }));

    if (colors.length === 0) {
        throw new Error("No hay prendas en el armario para analizar.");
    }

    const systemInstruction = `Eres un experto en teoría del color y moda. Analiza la paleta de colores del siguiente armario: ${JSON.stringify(colors)}.

    Identifica:
    1. Los colores dominantes (top 5-8) con sus códigos hex aproximados y porcentaje de presencia
    2. El esquema cromático general (monocromático si hay principalmente variaciones de un color, complementario si hay opuestos en la rueda cromática, análogo si hay colores adyacentes, triádico si hay 3 colores equidistantes, o diverse si es muy variado)
    3. Qué colores versátiles faltan (priorizando neutros como blanco, negro, beige, gris, y colores base como azul marino)
    4. Una puntuación de versatilidad (0-100) considerando: balance de neutros/colores, presencia de colores base, facilidad para combinar
    5. Recomendaciones específicas para mejorar la paleta

    Sé específico con los códigos hex y nombres de colores en español.`;

    try {
        const response = await getAIClient().models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: "Analiza la paleta de colores de mi armario" }] },
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: colorPaletteSchema,
            }

        });

        const parsedJson = JSON.parse(response.text);

        if (parsedJson.dominant_colors && Array.isArray(parsedJson.dominant_colors)) {
            return parsedJson as ColorPaletteAnalysis;
        } else {
            throw new Error('La IA no pudo analizar la paleta de colores correctamente.');
        }
    } catch (error) {
        console.error("Error analyzing color palette:", error);
        throw new Error("No se pudo analizar la paleta de colores. Inténtalo de nuevo.");
    }
}

// --- Fashion Chat Assistant Service ---

export async function chatWithFashionAssistant(
    userMessage: string,
    inventory: ClothingItem[],
    chatHistory: ChatMessage[],
    onStreamChunk?: (chunk: string) => void
): Promise<string> {
    // Simplify inventory for context
    const simplifiedInventory = inventory.map(item => ({
        id: item.id,
        metadata: item.metadata
    }));

    // Build conversation history for context
    // Map 'assistant' role to 'model' for Gemini API
    const conversationHistory = chatHistory.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
    }));

    const toneInstructions = getToneInstructions();

    const systemInstruction = `Eres un asistente de moda personal en español con un "ojo de loca" para la moda.

${toneInstructions}

ARMARIO DEL USUARIO:
${JSON.stringify(simplifiedInventory, null, 2)}

⚠️ REGLAS CRÍTICAS DE IDS - LEER ATENTAMENTE ⚠️:
- COPIAR Y PEGAR EXACTAMENTE los IDs del ARMARIO DEL USUARIO de arriba
- NUNCA NUNCA NUNCA inventes, modifiques o trunces IDs
- CADA CARÁCTER DEL ID debe ser IDÉNTICO al que aparece en la lista (incluyendo guiones y números)
- Si escribes un ID INCORRECTO, el sistema fallará completamente
- VERIFICA TRES VECES que el ID sea exacto antes de incluirlo
- Los IDs son UUIDs largos con formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
- SIEMPRE incluye los 3 items: top, bottom Y shoes en formato [top: ID_COMPLETO, bottom: ID_COMPLETO, shoes: ID_COMPLETO]
- Si no hay zapatos ideales, usa los más parecidos que existan (cualquier zapato > ningún zapato)

EJEMPLO DE ID CORRECTO: aa7bd885-7253-4849-b750-906a2b2b70
EJEMPLO DE ID INCORRECTO: aa7bd885-7253-4849-b750-906a2b2b700 ❌ (tiene un 0 de más al final)

INSTRUCCIONES:
- Responde en español de manera amigable y cercana
- Cuando sugieras outfits, describe las prendas de forma descriptiva y amigable
- Usa los metadatos (color, tipo, subcategoría) para hacer referencias naturales: "tu camisa azul", "el jean negro", "tus zapatillas blancas"
- IMPORTANTE: Al final de tu sugerencia, SIEMPRE incluye los IDs técnicos en este formato: [top: ID_TOP, bottom: ID_BOTTOM, shoes: ID_SHOES]
- Sé específica sobre POR QUÉ un outfit funciona (colores, ocasión, estilo)
- Si el armario no tiene zapatos ideales, usa los que más se acerquen Y menciona que podrían complementarse con otros zapatos
- Mantén un tono entusiasta pero profesional
- Considera la ocasión, el clima, y las preferencias del usuario

EJEMPLOS DE RESPUESTAS:
"¡Tengo el outfit perfecto para tu primera cita!

Te sugiero combinar tu camisa blanca con el pantalón negro y las zapatillas casuales. Esta combinación es elegante pero relajada - la camisa blanca proyecta frescura y sofisticación, mientras que el pantalón negro aporta un toque formal sin ser demasiado serio. Las zapatillas le dan ese aire descontracturado que funciona perfecto para una primera cita.

[top: abc-123, bottom: def-456, shoes: ghi-789]"

"Para la oficina te recomendaría:

Tu blusa azul marino combinada con el pantalón beige y los zapatos negros. El azul marino proyecta confianza profesional, el beige aporta sofisticación sin ser intimidante, y los zapatos negros completan el look de forma clásica y elegante.

[top: xyz-111, bottom: rst-222, shoes: uvw-333]"`;

    // Manual retry for streaming (retryWithBackoff doesn't work with streams)
    const maxRetries = 3;
    const initialDelay = 1000;
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await getAIClient().models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [
                    ...conversationHistory,
                    { role: 'user', parts: [{ text: userMessage }] }
                ],
                config: {
                    systemInstruction,
                }
            });

            const fullResponse = response.text;

            // Call the callback for full response (simulating streaming)
            if (onStreamChunk && fullResponse) {
                onStreamChunk(fullResponse);
            }

            return fullResponse;

        } catch (error: any) {
            lastError = error;

            // Check if error is retryable
            const isRetryable =
                error?.message?.includes('503') ||
                error?.message?.includes('overloaded') ||
                error?.message?.includes('UNAVAILABLE') ||
                error?.message?.includes('429') ||
                error?.message?.includes('rate limit') ||
                error?.message?.includes('RESOURCE_EXHAUSTED');

            // If not retryable or last attempt, throw immediately
            if (!isRetryable || attempt === maxRetries) {
                console.error("Error in fashion chat:", error);

                // Provide more specific error message for API overload
                if (error?.message?.includes('503') || error?.message?.includes('overloaded')) {
                    throw new Error("El servicio de chat está temporalmente sobrecargado. Por favor, intenta nuevamente en unos segundos.");
                }

                throw new Error("No pude procesar tu mensaje. Intentá de nuevo.");
            }

            // Calculate delay with exponential backoff + jitter
            const delay = initialDelay * Math.pow(2, attempt) + Math.random() * 1000;
            console.warn(`Chat request failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${Math.round(delay)}ms...`, error.message);

            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    // This should never be reached, but TypeScript needs it
    throw lastError;
}

/**
 * Generate a missing clothing item with AI
 * Used when chat suggests an item that doesn't exist in user's closet
 */
export async function generateMissingItem(
    description: string,
    category: 'top' | 'bottom' | 'shoes'
): Promise<ClothingItem> {
    try {
        // Generate the image using Gemini Imagen
        const prompt = `Product photo of ${description}, white background, professional photography, high quality, centered, e-commerce style`;
        const imageDataUrl = await generateClothingImage(prompt);

        // Generate a temporary ID for the AI-generated item
        const aiItemId = `ai_generated_${category}_${Date.now()}`;

        // Create metadata based on the description
        const metadata: ClothingItemMetadata = {
            category,
            subcategory: description,
            color_primary: 'multicolor', // Will be extracted from description
            vibe_tags: ['AI Generated', 'Sugerencia'],
            seasons: ['all'],
            description: `Item generado por IA: ${description}`
        };

        return {
            id: aiItemId,
            imageDataUrl,
            metadata,
            isAIGenerated: true,
            aiGenerationPrompt: prompt
        };
    } catch (error) {
        console.error('Error generating missing item:', error);
        throw new Error(`No se pudo generar el item: ${description}`);
    }
}

/**
 * Parse outfit IDs from assistant's response and validate against inventory
 * Format: [top: ID_TOP, bottom: ID_BOTTOM, shoes: ID_SHOES]
 *
 * Now supports generating AI items for missing pieces!
 */
export async function parseOutfitFromChat(
    message: string,
    inventory: ClothingItem[]
): Promise<{
    top_id: string;
    bottom_id: string;
    shoes_id: string;
    aiGeneratedItems?: {
        top?: ClothingItem;
        bottom?: ClothingItem;
        shoes?: ClothingItem;
    };
} | null> {
    const regex = /\[top:\s*([^,\]]+),\s*bottom:\s*([^,\]]+),\s*shoes:\s*([^\]]+)\]/i;
    const match = message.match(regex);

    if (!match) return null;

    const suggestedIds = {
        top_id: match[1].trim(),
        bottom_id: match[2].trim(),
        shoes_id: match[3].trim()
    };

    // Validate IDs against inventory
    const topExists = inventory.some(item => item.id === suggestedIds.top_id);
    const bottomExists = inventory.some(item => item.id === suggestedIds.bottom_id);
    const shoesExists = inventory.some(item => item.id === suggestedIds.shoes_id);

    // Log validation results for debugging
    console.log('🔍 Validating outfit IDs:', {
        top: { id: suggestedIds.top_id.substring(0, 20) + '...', exists: topExists },
        bottom: { id: suggestedIds.bottom_id.substring(0, 20) + '...', exists: bottomExists },
        shoes: { id: suggestedIds.shoes_id.substring(0, 20) + '...', exists: shoesExists }
    });

    // If any item doesn't exist, log error and return null
    if (!topExists || !bottomExists || !shoesExists) {
        const missingItems = [];
        if (!topExists) missingItems.push(`top (${suggestedIds.top_id})`);
        if (!bottomExists) missingItems.push(`bottom (${suggestedIds.bottom_id})`);
        if (!shoesExists) missingItems.push(`shoes (${suggestedIds.shoes_id})`);

        console.error('❌ Chat suggested invalid IDs:', missingItems.join(', '));
        console.error('💡 This means the AI is not following instructions to use only valid IDs from the inventory.');
        return null; // Return null instead of generating - billing required for Imagen
    }

    return suggestedIds;
}

/**
 * Extract item description from chat message
 * Helper function for AI item generation
 */
function extractItemDescription(message: string, category: 'top' | 'bottom' | 'shoes'): string {
    // Simple extraction based on category keywords
    // This can be improved with more sophisticated NLP
    const categoryMap = {
        top: ['camisa', 'blusa', 'sweater', 'remera', 'top', 't-shirt', 'camiseta'],
        bottom: ['pantalón', 'jean', 'falda', 'short', 'bottom', 'pants'],
        shoes: ['zapatos', 'zapatillas', 'botas', 'shoes', 'sneakers', 'boots']
    };

    const keywords = categoryMap[category];
    const lowerMessage = message.toLowerCase();

    // Find sentences containing category keywords
    const sentences = message.split(/[.!?]/);
    for (const sentence of sentences) {
        const lowerSentence = sentence.toLowerCase();
        if (keywords.some(kw => lowerSentence.includes(kw))) {
            // Extract color and type info
            const colorMatch = sentence.match(/(blanco|negro|azul|rojo|verde|amarillo|rosa|gris|beige|marrón|violeta|naranja|white|black|blue|red|green|yellow|pink|gray|beige|brown|purple|orange)/i);
            const color = colorMatch ? colorMatch[0] : '';

            return `${color} ${keywords[0]}`.trim() || `${keywords[0]} casual`;
        }
    }

    // Fallback to generic description
    return `${keywords[0]} casual`;
}

// --- Weather-Aware Outfit Generator ---

const weatherOutfitSchema = {
    type: Type.OBJECT,
    properties: {
        outfit: {
            type: Type.OBJECT,
            properties: {
                top_id: { type: Type.STRING },
                bottom_id: { type: Type.STRING },
                shoes_id: { type: Type.STRING }
            },
            required: ['top_id', 'bottom_id', 'shoes_id']
        },
        explanation: {
            type: Type.STRING,
            description: 'Explicación de por qué este outfit es perfecto para el clima actual'
        },
        weather_context: {
            type: Type.STRING,
            description: 'Contexto breve del clima (ej: "Día soleado y caluroso", "Lluvia y fresco")'
        }
    },
    required: ['outfit', 'explanation', 'weather_context']
};

export async function generateWeatherOutfit(
    weather: WeatherData,
    inventory: ClothingItem[]
): Promise<WeatherOutfitResult> {
    // Filter items appropriate for the weather
    const currentSeason = getSeason(weather.temp);

    const appropriateItems = inventory.filter(item => {
        // Filter by season if available
        if (item.metadata.seasons && item.metadata.seasons.length > 0) {
            return item.metadata.seasons.includes(currentSeason);
        }
        // If no season metadata, include all items
        return true;
    });

    // Simplify inventory for AI
    const simplifiedInventory = appropriateItems.map(item => ({
        id: item.id,
        metadata: item.metadata
    }));

    if (simplifiedInventory.length < 3) {
        // If not enough season-appropriate items, use full inventory
        simplifiedInventory.length = 0;
        simplifiedInventory.push(...inventory.map(item => ({
            id: item.id,
            metadata: item.metadata
        })));
    }

    const toneInstructions = getToneInstructions();

    const systemInstruction = `Eres un estilista personal experto en moda y clima.

${toneInstructions}

CLIMA ACTUAL:
- Ciudad: ${weather.city}, ${weather.country}
- Temperatura: ${weather.temp}°C (sensación térmica ${weather.feels_like}°C)
- Condición: ${weather.description}
- Rango: ${weather.temp_min}°C - ${weather.temp_max}°C

ARMARIO DISPONIBLE:
${JSON.stringify(simplifiedInventory, null, 2)}

INSTRUCCIONES:
- Selecciona un outfit PERFECTO para el clima actual
- Considera la temperatura, condición meteorológica, y sensación térmica
- Si hace frío (<15°C), prioriza prendas abrigadas y de manga larga
- Si hace calor (>25°C), prioriza prendas ligeras y de manga corta
- Si llueve, sugiere prendas que se puedan mojar sin problema
- Si hace sol intenso, considera colores claros y tejidos frescos
- Explica específicamente POR QUÉ este outfit es apropiado para este clima
- Sé específica con detalles del clima en la explicación

IMPORTANTE: Devuelve SIEMPRE los IDs exactos de prendas que existen en el inventario.`;

    try {
        const response = await getAIClient().models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: `Genera el outfit perfecto para el clima de hoy` }] },
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: weatherOutfitSchema,
            }

        });

        const parsedJson = JSON.parse(response.text);

        if (parsedJson.outfit?.top_id && parsedJson.outfit?.bottom_id && parsedJson.outfit?.shoes_id) {
            return parsedJson as WeatherOutfitResult;
        } else {
            throw new Error('La IA no pudo crear un outfit válido para este clima.');
        }
    } catch (error) {
        console.error("Error generating weather outfit:", error);
        throw new Error("No se pudo generar un outfit para el clima actual. Inténtalo de nuevo.");
    }
}

// --- Lookbook Creator Service ---

const lookbookSchema = {
    type: Type.OBJECT,
    properties: {
        theme: {
            type: Type.STRING,
            description: 'El tema del lookbook en español'
        },
        theme_description: {
            type: Type.STRING,
            description: 'Descripción breve del lookbook y su estética (2-3 oraciones)'
        },
        outfits: {
            type: Type.ARRAY,
            description: 'Array de 5-7 outfits completos para el lookbook',
            items: {
                type: Type.OBJECT,
                properties: {
                    top_id: { type: Type.STRING },
                    bottom_id: { type: Type.STRING },
                    shoes_id: { type: Type.STRING },
                    title: {
                        type: Type.STRING,
                        description: 'Título creativo del look, ej: "Look 1: Elegancia Casual"'
                    },
                    description: {
                        type: Type.STRING,
                        description: 'Descripción corta del look y su vibe (1-2 oraciones)'
                    }
                },
                required: ['top_id', 'bottom_id', 'shoes_id', 'title', 'description']
            }
        }
    },
    required: ['theme', 'theme_description', 'outfits']
};

export async function generateLookbook(
    theme: LookbookTheme,
    customTheme: string | null,
    inventory: ClothingItem[]
): Promise<Lookbook> {
    try {
        // Build inventory context (only metadata to save tokens)
        const inventoryContext = inventory.map(item => ({
            id: item.id,
            category: item.metadata.category,
            subcategory: item.metadata.subcategory,
            color: item.metadata.color_primary,
            vibes: item.metadata.vibe_tags,
            seasons: item.metadata.seasons
        }));

        // Theme descriptions
        const themeDescriptions: Record<string, string> = {
            office: 'Oficina - Looks profesionales y pulidos para el trabajo',
            weekend: 'Fin de Semana - Outfits casuales y relajados para tiempo libre',
            date_night: 'Noche de Cita - Looks románticos y especiales para una cita',
            casual: 'Casual - Outfits versátiles para el día a día',
            formal: 'Formal - Elegancia y sofisticación para eventos especiales',
            travel: 'Viaje - Looks cómodos y prácticos para viajar',
            custom: customTheme || 'Tema personalizado'
        };

        const themeDescription = themeDescriptions[theme];
        const toneInstructions = getToneInstructions();

        const systemInstruction = `Eres un estilista profesional y creador de lookbooks de moda en español.

${toneInstructions}

Tu tarea es crear un LOOKBOOK COHESIVO de 5-7 outfits completos para el tema: "${themeDescription}".

ARMARIO DISPONIBLE:
${JSON.stringify(inventoryContext, null, 2)}

INSTRUCCIONES IMPORTANTES:
1. COHERENCIA: Todos los outfits deben seguir el tema "${themeDescription}"
2. VARIEDAD: Cada outfit debe ser distinto pero mantener la estética del tema
3. CREATIVIDAD: Usa títulos creativos para cada look (ej: "Look 1: Power Play", "Look 2: Soft Sophistication")
4. DESCRIPCIONES: Explica brevemente el vibe de cada outfit (1-2 oraciones)
5. COMPLETITUD: Cada outfit necesita top_id, bottom_id y shoes_id válidos del armario
6. CANTIDAD: Genera entre 5 y 7 outfits dependiendo de la variedad disponible
7. REALISMO: Solo usa prendas que realmente funcionen para el tema
8. DIVERSIDAD: Varía colores, texturas y subcategorías dentro del tema

FORMATO DE IDs: Usa los IDs exactos del inventario proporcionado.

ESTILO DE RESPUESTA:
- Tema en español
- Títulos creativos y memorables
- Descripciones que capturen el vibe del look
- Lenguaje entusiasta pero profesional`;

        const response = await getAIClient().models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: `Crea un lookbook completo de ${themeDescription}` }] },
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: lookbookSchema,
            }

        });

        const parsedJson = JSON.parse(response.text);

        // Validate that we have outfits
        if (!parsedJson.outfits || parsedJson.outfits.length < 5) {
            throw new Error('El AI no generó suficientes outfits para el lookbook');
        }

        // Validate that all outfit IDs exist in inventory
        const inventoryIds = new Set(inventory.map(item => item.id));
        for (const outfit of parsedJson.outfits) {
            if (!inventoryIds.has(outfit.top_id) ||
                !inventoryIds.has(outfit.bottom_id) ||
                !inventoryIds.has(outfit.shoes_id)) {
                throw new Error('El AI sugirió prendas que no existen en el armario');
            }
        }

        return parsedJson as Lookbook;
    } catch (error) {
        console.error("Error generating lookbook:", error);
        throw new Error("No se pudo generar el lookbook. Inténtalo de nuevo.");
    }
}

// --- Style Challenge Generator Service ---

const styleChallengeSchema = {
    type: Type.OBJECT,
    properties: {
        type: {
            type: Type.STRING,
            description: 'Tipo de desafío: color, style, occasion, seasonal, creativity, minimalist'
        },
        difficulty: {
            type: Type.STRING,
            description: 'Dificultad: easy, medium, hard'
        },
        title: {
            type: Type.STRING,
            description: 'Título atractivo del desafío (ej: "Monocromo Maestro", "Capas de Invierno")'
        },
        description: {
            type: Type.STRING,
            description: 'Descripción detallada del desafío y qué debe lograr el usuario (2-3 oraciones)'
        },
        constraints: {
            type: Type.ARRAY,
            description: 'Lista de 3-5 restricciones específicas para el desafío',
            items: { type: Type.STRING }
        },
        required_items: {
            type: Type.ARRAY,
            description: 'Opcional: categorías de prendas requeridas (ej: ["top", "bottom", "shoes"])',
            items: { type: Type.STRING }
        },
        duration_days: {
            type: Type.NUMBER,
            description: 'Duración sugerida del desafío en días (1-14)'
        },
        points_reward: {
            type: Type.NUMBER,
            description: 'Puntos que otorga completar el desafío (10-100)'
        }
    },
    required: ['type', 'difficulty', 'title', 'description', 'constraints', 'duration_days', 'points_reward']
};

export interface StyleChallengeGeneration {
    type: ChallengeType;
    difficulty: ChallengeDifficulty;
    title: string;
    description: string;
    constraints: string[];
    required_items?: string[];
    duration_days: number;
    points_reward: number;
}

export async function generateStyleChallenge(
    inventory: ClothingItem[],
    difficulty?: ChallengeDifficulty
): Promise<StyleChallengeGeneration> {
    try {
        // Analyze closet composition
        const categories = inventory.map(item => item.metadata.category);
        const colors = inventory.map(item => item.metadata.color_primary);
        const vibes = inventory.flatMap(item => item.metadata.vibe_tags);
        const seasons = inventory.flatMap(item => item.metadata.seasons);

        const closetAnalysis = {
            total_items: inventory.length,
            categories: [...new Set(categories)],
            dominant_colors: [...new Set(colors)].slice(0, 5),
            style_tags: [...new Set(vibes)].slice(0, 8),
            seasons: [...new Set(seasons)]
        };

        const difficultyText = difficulty || 'medium';
        const difficultyDescriptions = {
            easy: 'Fácil - Accesible para principiantes, restricciones simples',
            medium: 'Medio - Desafiante pero alcanzable, requiere creatividad',
            hard: 'Difícil - Muy desafiante, restricciones complejas que empujan límites creativos'
        };

        const systemInstruction = `Eres un experto en desafíos de estilo y creatividad de moda.

Tu tarea es crear UN desafío de estilo personalizado y creativo basado en el armario del usuario.

ANÁLISIS DEL ARMARIO:
${JSON.stringify(closetAnalysis, null, 2)}

DIFICULTAD SOLICITADA: ${difficultyDescriptions[difficultyText]}

TIPOS DE DESAFÍO DISPONIBLES:
1. COLOR - Desafíos centrados en paletas de colores (monocromático, complementario, etc.)
2. STYLE - Explorar un estilo específico (minimalista, maximalista, retro, etc.)
3. OCCASION - Crear looks para ocasiones específicas (trabajo, fiesta, casual, etc.)
4. SEASONAL - Adaptar el armario a una estación específica
5. CREATIVITY - Desafíos creativos únicos (mezclar patrones, jugar con proporciones, etc.)
6. MINIMALIST - Crear looks con mínimo número de prendas

INSTRUCCIONES:
1. Analiza el armario y selecciona un tipo de desafío apropiado
2. Crea restricciones ESPECÍFICAS y MEDIBLES (3-5 restricciones)
3. Asegúrate de que el desafío sea POSIBLE con el armario disponible
4. El título debe ser ATRACTIVO y MOTIVADOR
5. La descripción debe explicar claramente QUÉ hacer y POR QUÉ es valioso
6. Ajusta la complejidad según la dificultad solicitada
7. Los puntos deben reflejar la dificultad (easy: 10-30, medium: 40-60, hard: 70-100)
8. La duración debe ser realista para el tipo de desafío (1-14 días)

EJEMPLOS DE RESTRICCIONES ESPECÍFICAS:
- "Usa solo 2 colores en todo el outfit"
- "Incluye al menos 3 texturas diferentes"
- "No uses ninguna prenda negra"
- "Mezcla al menos 2 estilos diferentes (ej: casual + elegante)"
- "Crea un look usando solo 4 prendas en total"
- "Usa una prenda de una manera no convencional"

IMPORTANTE:
- Las restricciones deben ser claras y objetivas
- El desafío debe ser creativo pero alcanzable
- Considera la diversidad del armario al crear restricciones`;

        const response = await getAIClient().models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: `Genera un desafío de estilo personalizado y creativo` }] },
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: styleChallengeSchema,
            }

        });

        const parsedJson = JSON.parse(response.text);

        // Validate required fields
        if (!parsedJson.type || !parsedJson.difficulty || !parsedJson.title ||
            !parsedJson.description || !Array.isArray(parsedJson.constraints) ||
            !parsedJson.duration_days || !parsedJson.points_reward) {
            throw new Error('El AI no generó un desafío válido');
        }

        return parsedJson as StyleChallengeGeneration;
    } catch (error) {
        console.error("Error generating style challenge:", error);
        throw new Error("No se pudo generar el desafío. Inténtalo de nuevo.");
    }
}

// --- Feature 13: AI Feedback Analyzer Service ---

const feedbackInsightsSchema = {
    type: Type.OBJECT,
    properties: {
        satisfaction_score: {
            type: Type.NUMBER,
            description: 'Score de 0-100 representando satisfacción general con el armario basado en ratings',
        },
        top_preferences: {
            type: Type.ARRAY,
            description: 'Patrones más amados (colores, estilos, ocasiones en outfits bien calificados)',
            items: {
                type: Type.OBJECT,
                properties: {
                    attribute: { type: Type.STRING, description: 'Tipo de atributo: color, style, season, occasion' },
                    value: { type: Type.STRING, description: 'Valor del atributo ej: "negro", "casual"' },
                    frequency: { type: Type.NUMBER, description: 'Frecuencia en outfits bien calificados' },
                    average_rating: { type: Type.NUMBER, description: 'Rating promedio cuando está presente (1-5)' },
                },
                required: ['attribute', 'value', 'frequency', 'average_rating'],
            },
        },
        least_favorites: {
            type: Type.ARRAY,
            description: 'Patrones menos gustados (colores, estilos en outfits mal calificados)',
            items: {
                type: Type.OBJECT,
                properties: {
                    attribute: { type: Type.STRING },
                    value: { type: Type.STRING },
                    frequency: { type: Type.NUMBER },
                    average_rating: { type: Type.NUMBER },
                },
                required: ['attribute', 'value', 'frequency', 'average_rating'],
            },
        },
        style_evolution: {
            type: Type.STRING,
            description: 'Narrativa de cómo están evolucionando las preferencias de estilo (2-3 oraciones)',
        },
        improvement_suggestions: {
            type: Type.ARRAY,
            description: '3-5 sugerencias específicas y accionables para mejorar satisfacción',
            items: { type: Type.STRING },
        },
        shopping_recommendations: {
            type: Type.ARRAY,
            description: '3-4 ítems específicos que debería comprar basado en preferencias',
            items: { type: Type.STRING },
        },
        unused_potential: {
            type: Type.ARRAY,
            description: '2-3 prendas existentes que debería usar más (subcategory + color)',
            items: { type: Type.STRING },
        },
    },
    required: ['satisfaction_score', 'top_preferences', 'least_favorites', 'style_evolution',
               'improvement_suggestions', 'shopping_recommendations', 'unused_potential'],
};

export async function analyzeFeedbackPatterns(data: FeedbackPatternData): Promise<FeedbackInsights> {
    const { ratings, outfits, closet } = data;

    // Validate minimum data requirements
    if (ratings.length < 3) {
        throw new Error('Se necesitan al menos 3 calificaciones para generar insights');
    }

    if (outfits.length < 3) {
        throw new Error('Se necesitan al menos 3 outfits para generar insights');
    }

    // Prepare data for AI analysis
    const ratingsData = ratings.map((r) => {
        const outfit = outfits.find(o => o.id === r.outfit_id);
        if (!outfit) return null;

        const top = closet.find(item => item.id === outfit.top_id);
        const bottom = closet.find(item => item.id === outfit.bottom_id);
        const shoes = closet.find(item => item.id === outfit.shoes_id);

        return {
            rating: r.rating,
            notes: r.notes || '',
            outfit: {
                top: top ? { category: top.metadata.category, subcategory: top.metadata.subcategory, color: top.metadata.color_primary, vibes: top.metadata.vibe_tags, seasons: top.metadata.seasons } : null,
                bottom: bottom ? { category: bottom.metadata.category, subcategory: bottom.metadata.subcategory, color: bottom.metadata.color_primary, vibes: bottom.metadata.vibe_tags, seasons: bottom.metadata.seasons } : null,
                shoes: shoes ? { category: shoes.metadata.category, subcategory: shoes.metadata.subcategory, color: shoes.metadata.color_primary, vibes: shoes.metadata.vibe_tags, seasons: shoes.metadata.seasons } : null,
            },
        };
    }).filter(Boolean);

    // Get summary of closet composition
    const closetSummary = {
        total_items: closet.length,
        categories: closet.reduce((acc, item) => {
            acc[item.metadata.category] = (acc[item.metadata.category] || 0) + 1;
            return acc;
        }, {} as Record<string, number>),
        top_colors: [...new Set(closet.map(i => i.metadata.color_primary))].slice(0, 8),
        top_vibes: [...new Set(closet.flatMap(i => i.metadata.vibe_tags))].slice(0, 8),
    };

    const systemInstruction = `Eres un experto en análisis de moda y psicología del consumidor de moda.

Tu tarea es analizar el feedback histórico del usuario sobre sus outfits (ratings y notas) y generar insights personalizados profundos.

DATOS DEL ARMARIO:
${JSON.stringify(closetSummary, null, 2)}

RATINGS Y OUTFITS HISTÓRICOS:
${JSON.stringify(ratingsData, null, 2)}

INSTRUCCIONES DE ANÁLISIS:

1. **satisfaction_score (0-100)**:
   - Calcula basado en rating promedio general
   - rating promedio 4.5-5.0 = 90-100
   - rating promedio 4.0-4.4 = 80-89
   - rating promedio 3.5-3.9 = 70-79
   - rating promedio 3.0-3.4 = 60-69
   - rating promedio <3.0 = <60

2. **top_preferences**:
   - Identifica patrones en outfits con rating ≥4
   - Analiza colores, estilos, estaciones, ocasiones
   - Calcula frecuencia y rating promedio
   - Prioriza los 5-7 patrones más fuertes

3. **least_favorites**:
   - Identifica patrones en outfits con rating ≤2
   - Analiza qué colores, estilos NO funcionan
   - Calcula frecuencia y rating promedio
   - Prioriza los 3-5 patrones más claros

4. **style_evolution**:
   - Narra cómo están cambiando las preferencias
   - Menciona tendencias emergentes vs. declinantes
   - Tono: observador, perspicaz, motivador
   - 2-3 oraciones máximo

5. **improvement_suggestions**:
   - 3-5 sugerencias ESPECÍFICAS y ACCIONABLES
   - Basadas en gaps entre preferencias y realidad
   - Ej: "Probá combinar más tops negros con bottoms coloridos"
   - Ej: "Tus outfits casuales tienen mejor rating - priorizá ese estilo"

6. **shopping_recommendations**:
   - 3-4 ítems específicos con justificación
   - Basados en preferencias confirmadas
   - Ej: "Una camisa blanca clásica - calificás alto tus tops neutros"
   - Ej: "Zapatillas deportivas negras - te gustan los looks sporty pero no tenés zapatillas"

7. **unused_potential**:
   - 2-3 prendas existentes infrautilizadas
   - Que coinciden con preferencias pero no aparecen en ratings
   - Ej: "Tu remera gris (minimalista, versátil) - ideal para tus mejores looks"

IMPORTANTE:
- Sé ESPECÍFICO: menciona colores, subcategorías, estilos concretos
- Sé ACCIONABLE: cada insight debe tener una acción clara
- Sé POSITIVO: enfoque en oportunidades, no solo críticas
- USA LOS DATOS: todo insight debe estar respaldado por ratings históricos
- ESPAÑOL: todo en español argentino, tono cercano y profesional`;

    try {
        const response = await getAIClient().models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: `Analiza los patrones de feedback del usuario` }] },
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: feedbackInsightsSchema,
            }

        });

        const parsedJson = JSON.parse(response.text);

        // Validate required fields
        if (typeof parsedJson.satisfaction_score !== 'number' ||
            !Array.isArray(parsedJson.top_preferences) ||
            !Array.isArray(parsedJson.least_favorites) ||
            !parsedJson.style_evolution ||
            !Array.isArray(parsedJson.improvement_suggestions) ||
            !Array.isArray(parsedJson.shopping_recommendations) ||
            !Array.isArray(parsedJson.unused_potential)) {
            throw new Error('El AI no generó insights válidos');
        }

        return parsedJson as FeedbackInsights;
    } catch (error) {
        console.error("Error analyzing feedback patterns:", error);
        throw new Error("No se pudo analizar el feedback. Inténtalo de nuevo.");
    }
}

// --- Feature 14: Closet Gap Analysis Service ---

const closetGapAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        missing_essentials: {
            type: Type.ARRAY,
            description: 'Prendas esenciales faltantes para completar un guardarropa versátil',
            items: {
                type: Type.OBJECT,
                properties: {
                    category: { type: Type.STRING, description: 'Categoría: top, bottom, shoes, etc.' },
                    subcategory: { type: Type.STRING, description: 'Tipo específico de prenda ej: "camisa blanca", "jeans oscuros"' },
                    reason: { type: Type.STRING, description: 'Por qué esta prenda completa el armario' },
                    priority: { type: Type.STRING, description: 'essential, recommended, optional' },
                    occasions: {
                        type: Type.ARRAY,
                        description: 'Ocasiones para las que sirve',
                        items: { type: Type.STRING }
                    },
                    style_compatibility: { type: Type.NUMBER, description: 'Score 0-10 de compatibilidad con estilo actual' },
                    color_suggestion: { type: Type.STRING, description: 'Color recomendado' },
                    alternatives: {
                        type: Type.ARRAY,
                        description: 'Alternativas opcionales',
                        items: { type: Type.STRING }
                    }
                },
                required: ['category', 'subcategory', 'reason', 'priority', 'occasions', 'style_compatibility', 'color_suggestion']
            }
        },
        nice_to_have: {
            type: Type.ARRAY,
            description: 'Prendas recomendadas pero no esenciales',
            items: {
                type: Type.OBJECT,
                properties: {
                    category: { type: Type.STRING },
                    subcategory: { type: Type.STRING },
                    reason: { type: Type.STRING },
                    priority: { type: Type.STRING },
                    occasions: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    },
                    style_compatibility: { type: Type.NUMBER },
                    color_suggestion: { type: Type.STRING },
                    alternatives: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    }
                },
                required: ['category', 'subcategory', 'reason', 'priority', 'occasions', 'style_compatibility', 'color_suggestion']
            }
        },
        versatility_analysis: {
            type: Type.OBJECT,
            description: 'Análisis de versatilidad del armario',
            properties: {
                current_score: { type: Type.NUMBER, description: 'Score actual 0-100' },
                potential_score: { type: Type.NUMBER, description: 'Score potencial con ítems sugeridos 0-100' },
                bottleneck_categories: {
                    type: Type.ARRAY,
                    description: 'Categorías que limitan versatilidad',
                    items: { type: Type.STRING }
                }
            },
            required: ['current_score', 'potential_score', 'bottleneck_categories']
        },
        strengths: {
            type: Type.ARRAY,
            description: '3-4 fortalezas del armario actual',
            items: { type: Type.STRING }
        },
        weaknesses: {
            type: Type.ARRAY,
            description: '3-4 debilidades o limitaciones del armario',
            items: { type: Type.STRING }
        },
        style_summary: {
            type: Type.STRING,
            description: 'Resumen del perfil de estilo actual (2-3 oraciones)'
        },
        shopping_budget_estimate: {
            type: Type.STRING,
            description: 'Estimación aproximada de presupuesto para esenciales ej: "$200-500 USD"'
        }
    },
    required: ['missing_essentials', 'nice_to_have', 'versatility_analysis', 'strengths', 'weaknesses', 'style_summary', 'shopping_budget_estimate']
};

export async function analyzeClosetGaps(closet: ClothingItem[]): Promise<import('../types').ClosetGapAnalysisResult> {
    // Validate minimum closet size
    if (closet.length < 5) {
        throw new Error('Se necesitan al menos 5 prendas en el armario para generar un análisis de gaps');
    }

    // Prepare closet data for AI analysis
    const closetAnalysis = {
        total_items: closet.length,
        categories: closet.reduce((acc, item) => {
            acc[item.metadata.category] = (acc[item.metadata.category] || 0) + 1;
            return acc;
        }, {} as Record<string, number>),
        colors: closet.map(item => item.metadata.color_primary),
        subcategories: closet.map(item => item.metadata.subcategory),
        vibes: [...new Set(closet.flatMap(item => item.metadata.vibe_tags))],
        seasons: [...new Set(closet.flatMap(item => item.metadata.seasons))],
        items_detail: closet.map(item => ({
            category: item.metadata.category,
            subcategory: item.metadata.subcategory,
            color: item.metadata.color_primary,
            vibes: item.metadata.vibe_tags,
            seasons: item.metadata.seasons
        }))
    };

    const systemInstruction = `Eres un experto asesor de guardarropa y estilista profesional especializado en construir armarios versátiles y funcionales.

Tu tarea es analizar el armario actual del usuario e identificar GAPS (prendas faltantes) que limitan su versatilidad y capacidad de crear outfits completos.

ARMARIO ACTUAL:
${JSON.stringify(closetAnalysis, null, 2)}

METODOLOGÍA DE ANÁLISIS:

1. **VERSATILITY ANALYSIS**:
   - Evalúa cuántas combinaciones de outfit completo puede crear (Top + Bottom + Shoes)
   - Identifica categorías "bottleneck" que limitan combinaciones
   - current_score: 0-100 basado en: (total combinaciones posibles / combinaciones ideales) * 100
   - potential_score: score con prendas sugeridas agregadas
   - Un armario versátil típico: 15-20 prendas = 50-70 combinaciones únicas

2. **MISSING ESSENTIALS** (Priority: essential):
   - Prendas FUNDAMENTALES que faltan para tener un armario funcional básico
   - Ejemplos:
     * Camisa blanca clásica (formal, trabajo, versátil)
     * Jeans oscuros (diario, casual, versátil)
     * Zapatillas blancas limpias (casual, cómodo, combina todo)
     * Blazer negro o azul marino (formal, profesional)
   - Solo incluir si realmente faltan y son críticas
   - Máximo 5-7 items esenciales

3. **NICE TO HAVE** (Priority: recommended/optional):
   - Prendas que elevarían el armario pero no son críticas
   - Basadas en el estilo actual del usuario
   - Complementan las fortalezas existentes
   - Máximo 4-5 items

4. **STRENGTHS**:
   - 3-4 aspectos donde el armario ya está bien
   - Ej: "Buena variedad de tops casuales", "Colores neutros versátiles"
   - Ser específico y positivo

5. **WEAKNESSES**:
   - 3-4 limitaciones actuales
   - Ej: "Solo 1 par de zapatos limita opciones", "Falta ropa formal para eventos"
   - Crítico pero constructivo

6. **STYLE SUMMARY**:
   - Describe el perfil de estilo actual en 2-3 oraciones
   - Ej: "Tu armario refleja un estilo casual-minimalista con preferencia por colores neutros y prendas cómodas. Tienes buena base de basics pero pocos statement pieces."
   - Tono: observador, profesional, empático

7. **SHOPPING BUDGET ESTIMATE**:
   - Estimación realista para comprar los missing_essentials
   - Formato: "$XXX-XXX USD" o "Aprox. $XXX USD"
   - Considerar rango de precios medios (no ultra-barato ni lujo)

REGLAS IMPORTANTES:
- REALISMO: Solo sugerir prendas que verdaderamente completen gaps
- PRIORIZACIÓN: Esenciales primero, luego nice-to-have
- COMPATIBILIDAD: Todas las sugerencias deben ser style_compatibility ≥7/10 con estilo actual
- DIVERSIDAD: Variar categorías en sugerencias
- PRESUPUESTO: Ser realista con estimaciones
- ESPECIFICIDAD: "Jeans azul oscuro" no "pantalones"
- JUSTIFICACIÓN: Cada sugerencia debe tener reason claro

EJEMPLOS DE BUENOS GAPS:
❌ MAL: "Necesitás más ropa" (muy vago)
✅ BIEN: "Camisa blanca de botones - esencial para looks formales y semiformales, combina con todo"

❌ MAL: "Zapatos" (no específico)
✅ BIEN: "Botas Chelsea negras - versátiles para otoño/invierno, elevan outfits casuales"

IMPORTANTE:
- Todo en español argentino
- Tono profesional pero cercano
- Enfoque en FUNCIONALIDAD y VERSATILIDAD sobre tendencias
- Priorizar clásicos atemporales sobre fast fashion`;

    try {
        const response = await getAIClient().models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: `Analiza el armario y genera un reporte completo de gaps` }] },
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: closetGapAnalysisSchema,
            }

        });

        const parsedJson = JSON.parse(response.text);

        // Validate required fields
        if (!Array.isArray(parsedJson.missing_essentials) ||
            !Array.isArray(parsedJson.nice_to_have) ||
            !parsedJson.versatility_analysis ||
            !Array.isArray(parsedJson.strengths) ||
            !Array.isArray(parsedJson.weaknesses) ||
            !parsedJson.style_summary ||
            !parsedJson.shopping_budget_estimate) {
            throw new Error('El AI no generó un análisis válido');
        }

        // Determine confidence level based on closet size
        let confidence_level: 'low' | 'medium' | 'high';
        if (closet.length < 10) {
            confidence_level = 'low';
        } else if (closet.length < 20) {
            confidence_level = 'medium';
        } else {
            confidence_level = 'high';
        }

        return {
            ...parsedJson,
            analyzed_items_count: closet.length,
            confidence_level
        } as import('../types').ClosetGapAnalysisResult;

    } catch (error) {
        console.error("Error analyzing closet gaps:", error);
        throw new Error("No se pudo analizar el armario. Inténtalo de nuevo.");
    }
}

// =====================================================
// Feature 15: Brand & Price Recognition Service
// =====================================================

const brandRecognitionSchema = {
    type: Type.OBJECT,
    description: 'Análisis completo de marca y precio de una prenda',
    properties: {
        brand: {
            type: Type.OBJECT,
            description: 'Información de la marca detectada',
            properties: {
                name: { type: Type.STRING, description: 'Nombre de la marca ej: "Nike", "Zara", "Gucci"' },
                confidence: { type: Type.NUMBER, description: 'Confianza 0-100 en la detección de marca' },
                detected_from: {
                    type: Type.STRING,
                    description: 'De dónde se detectó: "logo", "label", "style_pattern", "mixed"'
                },
                country_origin: { type: Type.STRING, description: 'País de origen ej: "USA", "Spain", "Italy"' },
                brand_tier: {
                    type: Type.STRING,
                    description: 'Nivel de marca: "luxury", "premium", "mid-range", "budget", "unknown"'
                }
            },
            required: ['name', 'confidence', 'detected_from', 'brand_tier']
        },
        price_estimate: {
            type: Type.OBJECT,
            description: 'Estimación de precio',
            properties: {
                currency: { type: Type.STRING, description: 'Moneda ej: "USD", "ARS"' },
                min_price: { type: Type.NUMBER, description: 'Precio mínimo estimado' },
                max_price: { type: Type.NUMBER, description: 'Precio máximo estimado' },
                average_price: { type: Type.NUMBER, description: 'Precio promedio más probable' },
                confidence: { type: Type.NUMBER, description: 'Confianza 0-100 en estimación de precio' },
                factors: {
                    type: Type.ARRAY,
                    description: 'Factores que afectan el precio',
                    items: { type: Type.STRING }
                }
            },
            required: ['currency', 'min_price', 'max_price', 'average_price', 'confidence', 'factors']
        },
        authenticity: {
            type: Type.OBJECT,
            description: 'Evaluación de autenticidad',
            properties: {
                status: {
                    type: Type.STRING,
                    description: 'Estado: "original", "replica", "indeterminate"'
                },
                confidence: { type: Type.NUMBER, description: 'Confianza 0-100 en evaluación' },
                indicators: {
                    type: Type.ARRAY,
                    description: 'Indicadores visuales que llevaron a esta evaluación',
                    items: { type: Type.STRING }
                },
                warnings: {
                    type: Type.ARRAY,
                    description: 'Advertencias sobre posibles réplicas (opcional)',
                    items: { type: Type.STRING }
                }
            },
            required: ['status', 'confidence', 'indicators']
        },
        item_condition: {
            type: Type.STRING,
            description: 'Condición detectada: "new", "like_new", "good", "fair", "worn"'
        },
        resale_value_percentage: {
            type: Type.NUMBER,
            description: 'Porcentaje 0-100 del precio original para reventa'
        },
        market_insights: {
            type: Type.STRING,
            description: 'Comentario breve sobre el mercado ej: "Esta marca está actualmente en tendencia"'
        },
        shopping_alternatives: {
            type: Type.ARRAY,
            description: 'Marcas similares a diferentes precios (opcional)',
            items: { type: Type.STRING }
        }
    },
    required: [
        'brand',
        'price_estimate',
        'authenticity',
        'item_condition',
        'resale_value_percentage',
        'market_insights'
    ]
};

export async function recognizeBrandAndPrice(imageDataUrl: string): Promise<import('../types').BrandRecognitionResult> {
    // Validate image data - must be a real photo, not a placeholder
    if (!imageDataUrl || !imageDataUrl.startsWith('data:image')) {
        throw new Error('La imagen no es válida. Usá una foto de la prenda.');
    }

    // Reject SVG placeholders and external placeholder URLs
    if (imageDataUrl.startsWith('data:image/svg+xml') ||
        imageDataUrl.includes('placeholder.com') ||
        imageDataUrl.includes('text=')) {
        throw new Error('No podés analizar una prenda sin imagen. Subí una foto real de la prenda.');
    }

    const systemInstruction = `Eres un experto en reconocimiento de marcas de moda y tasación de prendas con 15+ años de experiencia en retail, luxury fashion y mercado secundario.

Tu tarea es analizar una foto de una prenda y proporcionar:
1. Identificación de marca (si es detectable)
2. Estimación de precio realista
3. Evaluación de autenticidad (original vs réplica)
4. Condición del artículo
5. Valor de reventa
6. Insights de mercado

METODOLOGÍA DE ANÁLISIS:

1. **BRAND DETECTION**:
   - Buscar logos visibles (estampados, bordados, etiquetas)
   - Analizar patrones de diseño característicos
   - Examinar calidad de materiales y construcción
   - Identificar detalles distintivos (costuras, herrajes, etiquetas)

   NIVELES DE CONFIANZA:
   - 90-100: Logo claramente visible + patrones reconocibles
   - 70-89: Patrones de diseño + calidad visible
   - 50-69: Estilo característico pero sin confirmación
   - 0-49: No hay suficientes indicadores

   BRAND TIER:
   - luxury: Gucci, Prada, Louis Vuitton, Chanel, Dior ($500+)
   - premium: Ralph Lauren, Tommy Hilfiger, Michael Kors ($100-500)
   - mid-range: Zara, H&M (calidad), Gap, Levi's ($30-100)
   - budget: Forever 21, Shein, genéricos (<$30)

2. **PRICE ESTIMATION** (en USD primero, luego convertir):
   - Brand tier baseline:
     * Luxury: $500-5000+
     * Premium: $100-500
     * Mid-range: $30-100
     * Budget: $10-30
   - Ajustar por:
     * Tipo de prenda (blazer > t-shirt)
     * Materiales (seda/cuero > algodón > sintético)
     * Condición actual
     * Temporada/tendencia
   - IMPORTANTE: Dar rango realista (min-max) y promedio
   - factors: listar 3-4 factores específicos que afectaron la estimación

3. **AUTHENTICITY ASSESSMENT**:
   - original: Todos los indicadores apuntan a autenticidad
     * Calidad premium de materiales
     * Costuras perfectas y simétricas
     * Etiquetas correctas con tipografía consistente
     * Herrajes de calidad (si aplica)

   - replica: Señales de imitación
     * Logo mal posicionado o proporcionado
     * Calidad inferior de materiales
     * Costuras irregulares
     * Etiquetas con errores tipográficos
     * Precio muy bajo para la marca

   - indeterminate: No hay suficiente información visible
     * No se ven etiquetas o logos
     * Foto de baja calidad
     * Prenda genérica sin características distintivas

   indicators: 3-5 pistas visuales específicas
   warnings: SOLO si status="replica", listar red flags

4. **ITEM CONDITION**:
   - new: Etiquetas puestas, sin uso visible
   - like_new: Sin etiquetas pero impecable
   - good: Uso leve, bien mantenida
   - fair: Desgaste visible pero usable
   - worn: Desgaste significativo, manchas, daños

5. **RESALE VALUE**:
   - new/like_new luxury: 60-80% del precio original
   - new/like_new premium: 40-60%
   - new/like_new mid-range: 20-40%
   - good condition: reducir 15-20%
   - fair condition: reducir 30-40%
   - worn: 10-20% o menos

6. **MARKET INSIGHTS** (1-2 oraciones):
   - Tendencia actual de la marca
   - Demanda en mercado secundario
   - Ej: "Nike Air Jordan tiene alta demanda en el mercado de sneakers, con modelos clásicos revalorizándose."
   - Ej: "Zara tiene bajo valor de reventa pero buena relación precio-calidad para uso diario."

7. **SHOPPING ALTERNATIVES** (opcional, 2-3 marcas):
   - Si es luxury: sugerir premium alternatives
   - Si es premium: sugerir mid-range alternatives
   - Ej para Nike: ["Adidas", "Puma", "Reebok"]
   - Ej para Gucci: ["Michael Kors", "Coach", "Kate Spade"]

REGLAS CRÍTICAS:
- HONESTIDAD: Si no hay suficiente info, confidence bajo e indeterminate
- REALISMO: Precios basados en mercado real, no especulación
- ESPECIFICIDAD: "Logo visible en el pecho con bordado de calidad" no "parece original"
- CONSERVADURISMO: Mejor subestimar que sobrestimar
- CONTEXTO: Considerar mercado argentino pero precios en USD de referencia
- CLARIDAD: Explicar reasoning en factors e indicators

EJEMPLOS DE BUENOS ANÁLISIS:

✅ BIEN:
brand: { name: "Nike", confidence: 95, detected_from: "logo", brand_tier: "premium" }
price_estimate: { min: 60, max: 120, average: 90, confidence: 85, factors: ["Brand reputation", "Sneaker category", "Good condition visible", "Classic model"] }
authenticity: { status: "original", confidence: 90, indicators: ["Swoosh logo properly positioned", "Quality stitching visible", "Authentic Nike font on label"] }

❌ MAL:
brand: { name: "Unknown", confidence: 20, detected_from: "mixed", brand_tier: "unknown" }
price_estimate: { min: 10, max: 200, average: 100, confidence: 30, factors: ["Generic factors"] }
authenticity: { status: "indeterminate", confidence: 50, indicators: ["Not sure"] }

IMPORTANTE:
- Todo en español argentino (excepto nombres de marcas)
- Tono: profesional, objetivo, directo
- Si foto muy borrosa/mala calidad: bajar confidence + status indeterminate
- NUNCA inventar marcas: si no estás seguro, decir "Sin marca visible" confidence <50`;

    try {
        // Convert data URL to Part format
        const [header, base64Data] = imageDataUrl.split(',');
        const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';

        const imagePart: Part = {
            data: base64Data,
            mimeType: mimeType as Modality,
        };

        const response = await getAIClient().models.generateContent({
            model: 'gemini-2.5-flash', // Good balance for vision + structured output
            contents: {
                parts: [
                    imagePart,
                    { text: 'Analiza esta prenda y genera un reporte completo de marca, precio y autenticidad.' }
                ]
            },
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: brandRecognitionSchema,
            }

        });

        const parsedJson = JSON.parse(response.text);

        // Validate required fields
        if (!parsedJson.brand ||
            !parsedJson.price_estimate ||
            !parsedJson.authenticity ||
            !parsedJson.item_condition ||
            typeof parsedJson.resale_value_percentage !== 'number' ||
            !parsedJson.market_insights) {
            throw new Error('El AI no generó un análisis válido de marca y precio');
        }

        // Add timestamp
        const result: import('../types').BrandRecognitionResult = {
            ...parsedJson,
            analyzed_at: new Date().toISOString()
        };

        return result;

    } catch (error) {
        console.error("Error recognizing brand and price:", error);
        throw new Error("No se pudo analizar la marca y precio. Inténtalo con otra foto más clara.");
    }
}


// =====================================================
// Feature 16: Dupe Finder - Schema & Function
// =====================================================

const dupeFinderSchema = {
    type: Type.OBJECT,
    description: 'Resultado de búsqueda de dupes (alternativas más baratas)',
    properties: {
        dupes: {
            type: Type.ARRAY,
            description: 'Lista de dupes encontrados (3-5 alternativas ordenadas por similitud)',
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING, description: 'Nombre del producto dupe' },
                    brand: { type: Type.STRING, description: 'Marca o vendedor del dupe' },
                    price: { type: Type.NUMBER, description: 'Precio en la moneda detectada' },
                    currency: { type: Type.STRING, description: 'Moneda (USD, ARS, EUR, etc.)' },
                    shop_name: { type: Type.STRING, description: 'Tienda online (ej: SHEIN, AliExpress, Amazon)' },
                    shop_url: { type: Type.STRING, description: 'URL del producto' },
                    similarity_score: { type: Type.NUMBER, description: 'Score 0-100 de similitud visual con el original' },
                    key_differences: {
                        type: Type.ARRAY,
                        description: 'Diferencias clave vs original (2-4 puntos específicos)',
                        items: { type: Type.STRING }
                    },
                    savings_amount: { type: Type.NUMBER, description: 'Ahorro en precio vs original' },
                    savings_percentage: { type: Type.NUMBER, description: 'Porcentaje de ahorro (0-100)' },
                    estimated_quality: {
                        type: Type.STRING,
                        description: 'Calidad estimada: "high", "medium", "low", "unknown"'
                    }
                },
                required: ['title', 'brand', 'price', 'currency', 'shop_name', 'shop_url', 'similarity_score', 'key_differences', 'savings_amount', 'savings_percentage', 'estimated_quality']
            }
        },
        visual_comparison: {
            type: Type.OBJECT,
            description: 'Comparación visual global',
            properties: {
                similarities: {
                    type: Type.ARRAY,
                    description: 'Similitudes encontradas (3-5 puntos)',
                    items: { type: Type.STRING }
                },
                differences: {
                    type: Type.ARRAY,
                    description: 'Diferencias generales (3-5 puntos)',
                    items: { type: Type.STRING }
                },
                overall_match: { type: Type.NUMBER, description: 'Match global promedio 0-100' }
            },
            required: ['similarities', 'differences', 'overall_match']
        },
        search_strategy: {
            type: Type.STRING,
            description: 'Breve explicación de cómo se encontraron los dupes (1-2 oraciones)'
        },
        confidence_level: {
            type: Type.STRING,
            description: 'Nivel de confianza en los resultados: "low", "medium", "high"'
        }
    },
    required: ['dupes', 'visual_comparison', 'search_strategy', 'confidence_level']
};


export async function findDupeAlternatives(
    item: import('../types').ClothingItem,
    brandInfo?: import('../types').BrandRecognitionResult
): Promise<import('../types').DupeFinderResult> {

    // Validate image data
    if (!item.imageDataUrl || !item.imageDataUrl.startsWith('data:image')) {
        throw new Error('La imagen de la prenda no es válida.');
    }

    // Extract item info for search
    const { category, subcategory, color_primary } = item.metadata;
    const brand = brandInfo?.brand?.name || 'unknown';
    const estimatedPrice = brandInfo?.price_estimate?.average_price || 0;

    // Build search query optimized for finding dupes
    const searchQuery = brand !== 'unknown'
        ? `${subcategory} similar to ${brand} cheap alternative dupe budget friendly`
        : `${subcategory} ${color_primary} affordable budget friendly`;

    const systemInstruction = `Eres un experto en moda y shopping online especializado en encontrar DUPES (alternativas más baratas) de prendas caras.

Tu tarea es:
1. Analizar visualmente la prenda original usando la imagen proporcionada
2. Identificar características clave (silueta, color, detalles, estilo)
3. Evaluar resultados de búsqueda de Google Shopping
4. Seleccionar los mejores dupes (alternativas más baratas con alta similitud visual)
5. Comparar cada dupe con el original
6. Calcular ahorros y evaluar calidad estimada

CRITERIOS DE SELECCIÓN DE DUPES:

1. **SIMILITUD VISUAL** (prioridad máxima):
   - Misma silueta/corte general (90-100 score)
   - Color similar (80-95 score)
   - Detalles parecidos pero no idénticos (70-85 score)
   - Estilo general similar (60-75 score)
   - Diferente pero inspirado (40-60 score)

2. **PRECIO** (debe ser significativamente más barato):
   - Ideal: 50-80% más barato que original
   - Aceptable: 30-50% más barato
   - Mínimo: 20% más barato
   - Si original desconocido: buscar opciones <$30 USD

3. **CALIDAD ESTIMADA** (basado en precio/marca/shop):
   - high: Marcas mid-range reconocidas, materiales decentes
   - medium: Fast fashion confiable (Zara, H&M, Forever21)
   - low: Ultra-fast fashion (SHEIN, wish, aliexpress)
   - unknown: No hay suficiente info

ANÁLISIS DE CADA DUPE:

**key_differences** (2-4 puntos ESPECÍFICOS):
✅ BIEN: "Tela parece más delgada y menos estructurada"
✅ BIEN: "Botones de plástico vs metálicos del original"
✅ BIEN: "Tono de azul ligeramente más claro"
❌ MAL: "No es exactamente igual"
❌ MAL: "Calidad inferior"

**similarity_score** (0-100):
- 90-100: Casi indistinguible visualmente
- 80-89: Muy similar, diferencias menores
- 70-79: Parecido claro, algunas diferencias
- 60-69: Inspirado en el original
- <60: Solo vagamente similar

**estimated_quality**:
- high: $30-80 USD, marcas mid-range
- medium: $15-30 USD, fast fashion
- low: <$15 USD, ultra-fast fashion
- unknown: Sin info suficiente

VISUAL COMPARISON (comparación global):

**similarities** (3-5 puntos que SÍ coinciden):
- "Misma silueta oversized"
- "Cuello redondo similar"
- "Largo idéntico"

**differences** (3-5 puntos que NO coinciden):
- "Tela se ve más delgada en los dupes"
- "Costuras menos reforzadas"
- "Color ligeramente más pálido"

**overall_match**: Promedio de similarity_scores de todos los dupes

SEARCH STRATEGY:
Explicar brevemente cómo encontraste estos dupes:
- "Busqué en tiendas fast-fashion por {tipo} similar en {color}"
- "Filtré por precio <$X para maximizar ahorro"
- "Prioricé similitud visual sobre marca"

CONFIDENCE LEVEL:
- high: 4+ dupes excelentes encontrados, similitud >75%, precios claros
- medium: 2-3 dupes buenos, similitud >60%, alguna info faltante
- low: <2 dupes o similitud <60% o precios no confiables

REGLAS CRÍTICAS:
- Retornar 3-5 dupes ordenados por similarity_score (mayor primero)
- NUNCA inventar URLs o precios: usar solo resultados reales de búsqueda
- Si no hay buenos dupes (score <60), retornar confidence_level: low
- key_differences debe ser ESPECÍFICO y VISUAL
- savings_amount y savings_percentage calculados correctamente
- TODO en español argentino excepto nombres de marcas/tiendas`;

    try {
        // Step 1: Search for dupes using Google Search grounding
        const searchResponse = await getAIClient().models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Buscar productos similares más baratos: ${searchQuery}. Devolver enlaces de shopping online.`,
            config: {
                tools: [{googleSearch: {}}],
            },
        });

        const searchChunks = searchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks;
        const shoppingLinks = searchChunks?.filter(chunk => 'web' in chunk).map(chunk => chunk.web) || [];

        if (shoppingLinks.length === 0) {
            throw new Error('No se encontraron resultados de shopping para esta prenda.');
        }

        // Step 2: Analyze with Gemini Vision + shopping results
        const [header, base64Data] = item.imageDataUrl.split(',');
        const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';

        const imagePart: Part = {
            data: base64Data,
            mimeType: mimeType as Modality,
        };

        // Build prompt with shopping results
        const shoppingResultsText = shoppingLinks.slice(0, 10).map((link, idx) =>
            `${idx + 1}. ${link.title}\n   URL: ${link.uri}`
        ).join('\n\n');

        const analysisPrompt = `Analiza esta prenda y encuentra los mejores dupes (alternativas más baratas) de los resultados de búsqueda.

PRENDA ORIGINAL:
- Categoría: ${category}
- Tipo: ${subcategory}
- Color: ${color_primary}
${brand !== 'unknown' ? `- Marca original: ${brand}` : ''}
${estimatedPrice > 0 ? `- Precio estimado original: $${estimatedPrice} USD` : ''}

RESULTADOS DE BÚSQUEDA:
${shoppingResultsText}

Selecciona 3-5 dupes que sean visualmente similares y significativamente más baratos. Genera análisis completo.`;

        const analysisResponse = await getAIClient().models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    imagePart,
                    { text: analysisPrompt }
                ]
            },
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: dupeFinderSchema,
            }

        });

        const parsedJson = JSON.parse(analysisResponse.text);

        // Validate required fields
        if (!parsedJson.dupes ||
            !Array.isArray(parsedJson.dupes) ||
            parsedJson.dupes.length === 0 ||
            !parsedJson.visual_comparison ||
            !parsedJson.search_strategy ||
            !parsedJson.confidence_level) {
            throw new Error('El AI no generó un análisis válido de dupes');
        }

        // Calculate savings (if original price is known)
        const dupesPricesUSD = parsedJson.dupes.map((d: any) => {
            // Simple currency conversion (you could add a real API here)
            const priceUSD = d.currency === 'USD' ? d.price :
                           d.currency === 'ARS' ? d.price / 1000 : // approximate
                           d.currency === 'EUR' ? d.price * 1.1 :
                           d.price; // default assume USD
            return priceUSD;
        });

        const cheapestDupe = Math.min(...dupesPricesUSD);
        const averageDupe = dupesPricesUSD.reduce((a, b) => a + b, 0) / dupesPricesUSD.length;
        const originalPriceUSD = estimatedPrice > 0 ? estimatedPrice : averageDupe * 2.5; // estimate if unknown

        const savings: import('../types').SavingsCalculation = {
            original_price: originalPriceUSD,
            cheapest_dupe_price: cheapestDupe,
            max_savings: originalPriceUSD - cheapestDupe,
            average_dupe_price: averageDupe,
            average_savings: originalPriceUSD - averageDupe,
            currency: 'USD'
        };

        // Build final result
        const result: import('../types').DupeFinderResult = {
            original_item: {
                id: item.id,
                brand: brand !== 'unknown' ? brand : undefined,
                estimated_price: estimatedPrice > 0 ? estimatedPrice : undefined,
                category,
                subcategory
            },
            dupes: parsedJson.dupes,
            visual_comparison: parsedJson.visual_comparison,
            savings,
            search_strategy: parsedJson.search_strategy,
            confidence_level: parsedJson.confidence_level,
            analyzed_at: new Date().toISOString()
        };

        return result;

    } catch (error) {
        console.error("Error finding dupe alternatives:", error);
        throw new Error("No se pudieron encontrar dupes. Intentá con otra prenda más común.");
    }
}

// =====================================================
// Feature 17: Capsule Wardrobe Builder
// =====================================================

const capsuleWardrobeSchema = {
    type: Type.OBJECT,
    properties: {
        selected_items: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    item_id: { type: Type.STRING },
                    versatility_score: { type: Type.NUMBER },
                    category: { type: Type.STRING },
                    color_primary: { type: Type.STRING },
                    style_match_score: { type: Type.NUMBER },
                    reasoning: { type: Type.STRING }
                },
                required: ["item_id", "versatility_score", "category", "color_primary", "style_match_score", "reasoning"]
            }
        },
        compatibility_matrix: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    item1_id: { type: Type.STRING },
                    item2_id: { type: Type.STRING },
                    compatibility_score: { type: Type.NUMBER },
                    reasoning: { type: Type.STRING }
                },
                required: ["item1_id", "item2_id", "compatibility_score", "reasoning"]
            }
        },
        suggested_outfits: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    top_id: { type: Type.STRING },
                    bottom_id: { type: Type.STRING },
                    shoes_id: { type: Type.STRING },
                    outerwear_id: { type: Type.STRING },
                    occasion: { type: Type.STRING },
                    explanation: { type: Type.STRING }
                },
                required: ["occasion", "explanation"]
            }
        },
        color_palette: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
        },
        missing_pieces: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
        },
        strategy_explanation: { type: Type.STRING }
    },
    required: ["selected_items", "compatibility_matrix", "suggested_outfits", "color_palette", "strategy_explanation"]
};

export async function generateCapsuleWardrobe(
    closet: import('../types').ClothingItem[],
    theme: import('../types').CapsuleTheme,
    targetSize: import('../types').CapsuleSize,
    season?: string
): Promise<import('../types').CapsuleWardrobe> {
    try {
        if (closet.length === 0) {
            throw new Error("El armario está vacío. Agregá prendas para crear una cápsula.");
        }

        if (closet.length < targetSize) {
            throw new Error(`Necesitás al menos ${targetSize} prendas en tu armario para crear una cápsula de este tamaño.`);
        }

        // Theme descriptions for AI
        const themeDescriptions: Record<import('../types').CapsuleTheme, string> = {
            work: "Profesional y elegante para la oficina, reuniones de negocios, y eventos corporativos. Prioriza prendas versátiles, clásicas, y formales.",
            casual: "Relajado y cómodo para el día a día, salidas informales, y actividades cotidianas. Enfoca en prendas versátiles que combinen fácilmente.",
            travel: "Práctico y compacto para viajes, con prendas que no se arruguen, combinen entre sí, y sirvan para múltiples ocasiones.",
            minimal: "Minimalista y atemporal, con colores neutros y prendas básicas que maximicen combinaciones. Estilo simple y sofisticado.",
            seasonal: "Adaptado específicamente para la estación del año, con prendas apropiadas para el clima y actividades estacionales.",
            custom: "Personalizado según las necesidades únicas del usuario, equilibrando todos los aspectos anteriores."
        };

        // Prepare closet metadata for AI
        const closetMetadata = closet.map(item => ({
            id: item.id,
            category: item.metadata.category,
            subcategory: item.metadata.subcategory,
            color: item.metadata.color_primary,
            neckline: item.metadata.neckline || 'N/A',
            sleeve: item.metadata.sleeve_type || 'N/A',
            vibes: item.metadata.vibe_tags.join(', '),
            seasons: item.metadata.seasons.join(', ')
        }));

        // Build comprehensive prompt
        const systemPrompt = `Sos un experto en moda minimalista y construcción de cápsulas de armario (capsule wardrobes).

Tu tarea es analizar el armario del usuario y crear una cápsula de ${targetSize} prendas siguiendo el tema: "${theme}" - ${themeDescriptions[theme]}
${season ? `\nEstación específica: ${season}` : ''}

PRINCIPIOS DE CÁPSULAS DE ARMARIO:
1. Versatilidad: Cada prenda debe combinar con múltiples otras prendas
2. Coherencia: Mantener paleta de colores cohesiva (neutros + 1-2 colores accent)
3. Funcionalidad: Cubrir diferentes ocasiones y necesidades
4. Calidad sobre cantidad: Mejor pocas prendas versátiles que muchas específicas
5. Mix & Match: Maximizar combinaciones posibles (objetivo: 30+ outfits con ${targetSize} prendas)

PROCESO DE SELECCIÓN:
1. Analiza el armario completo considerando categorías, colores, estilos, y vibes
2. Selecciona exactamente ${targetSize} prendas que maximicen versatilidad
3. Asegura balance de categorías (tops, bottoms, shoes, outerwear si aplica)
4. Prioriza colores neutros (negro, blanco, gris, beige, navy) con colores accent complementarios
5. Genera matriz de compatibilidad (scoring 0-100 de qué tan bien combina cada par)
6. Crea 5-8 outfit combinations ejemplares que demuestren versatilidad
7. Identifica piezas faltantes que completarían la cápsula perfecta

SCORING:
- versatility_score (0-100): Cuántas otras prendas combina
- style_match_score (0-100): Qué tan bien encaja con el tema
- compatibility_score (0-100): Qué tan bien combina el par específico
  - 90-100: Combinación perfecta, look cohesivo
  - 80-89: Muy buena combinación, armoniosa
  - 70-79: Buena combinación, funciona bien
  - 60-69: Combinación aceptable, requiere styling
  - <60: No recomendado, no combina bien

IMPORTANTE:
- Incluye prendas de diferentes categorías (no todo tops)
- Balancea formal/casual según tema
- Considera estación si se especifica
- Explica razonamiento de cada elección
- Sé realista con compatibilidad (no todo combina con todo)`;

        const userPrompt = `Armario disponible (${closet.length} prendas):
${JSON.stringify(closetMetadata, null, 2)}

Crea una cápsula de ${targetSize} prendas con tema "${theme}".
${season ? `Para la estación: ${season}` : ''}

Responde en español con:
1. selected_items: Array de ${targetSize} prendas seleccionadas con scores y reasoning
2. compatibility_matrix: Matriz completa de pares (solo pares compatibles >60 score)
3. suggested_outfits: 5-8 outfits ejemplares que muestren versatilidad
4. color_palette: Array de colores dominantes en la cápsula
5. missing_pieces: (opcional) Prendas que faltan para completar la cápsula ideal
6. strategy_explanation: Explicación de la estrategia de selección (2-3 párrafos)`;

        // Call Gemini Pro with structured output
        const response = await getAIClient().models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: userPrompt }] },
            config: {
                systemInstruction: systemPrompt,
                temperature: 0.4, // Lower temperature for consistent selection
                responseMimeType: "application/json",
                responseSchema: capsuleWardrobeSchema
            }
    });

        const text = response.text;

        if (!text) {
            throw new Error("Respuesta vacía del modelo de IA");
        }

        // Parse JSON response
        const parsedJson = JSON.parse(text);

        // Validate selected items count
        if (parsedJson.selected_items.length !== targetSize) {
            throw new Error(`Se esperaban ${targetSize} prendas pero se recibieron ${parsedJson.selected_items.length}`);
        }

        // Calculate total combinations (mathematical formula)
        const tops = parsedJson.selected_items.filter((i: any) => i.category === 'top').length;
        const bottoms = parsedJson.selected_items.filter((i: any) => i.category === 'bottom').length;
        const shoes = parsedJson.selected_items.filter((i: any) => i.category === 'shoes').length;
        const totalCombinations = tops * bottoms * shoes;

        // Build final CapsuleWardrobe object
        const capsule: import('../types').CapsuleWardrobe = {
            id: `capsule-${Date.now()}`,
            name: `Cápsula ${theme.charAt(0).toUpperCase() + theme.slice(1)}`,
            theme,
            size: targetSize,
            items: parsedJson.selected_items,
            compatibility_matrix: parsedJson.compatibility_matrix,
            suggested_outfits: parsedJson.suggested_outfits,
            total_combinations: totalCombinations,
            color_palette: parsedJson.color_palette,
            missing_pieces: parsedJson.missing_pieces,
            season,
            created_at: new Date().toISOString(),
            strategy_explanation: parsedJson.strategy_explanation
        };

        return capsule;

    } catch (error: any) {
        console.error("Error generating capsule wardrobe:", error);
        
        // Handle specific error cases
        if (error instanceof Error && error.message.includes("vacío")) {
            throw error;
        }
        
        // Handle rate limit / quota errors
        if (error?.error?.code === 429 || error?.status === 429 || error?.message?.includes("quota") || error?.message?.includes("rate")) {
            throw new Error(
                "Se excedió la cuota de la API de Gemini. Por favor, esperá unos minutos y volvé a intentar. " +
                "Si el problema persiste, revisá tu plan y facturación en https://ai.google.dev/gemini-api/docs/rate-limits"
            );
        }
        
        // Handle API not found errors
        if (error?.error?.code === 404 || error?.status === 404) {
            throw new Error("El modelo de IA no está disponible. Por favor, intentá más tarde.");
        }
        
        throw new Error("No se pudo generar la cápsula de armario. Intentá de nuevo o probá con un tema diferente.");
    }
}

// =====================================================
// Feature 18: Style DNA Profile
// =====================================================

const styleDNASchema = {
    type: Type.OBJECT,
    properties: {
        archetypes: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    archetype: { type: Type.STRING },
                    percentage: { type: Type.NUMBER },
                    description: { type: Type.STRING },
                    key_items: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    }
                },
                required: ["archetype", "percentage", "description", "key_items"]
            }
        },
        primary_archetype: { type: Type.STRING },
        secondary_archetype: { type: Type.STRING },
        color_profile: {
            type: Type.OBJECT,
            properties: {
                dominant_colors: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            hex: { type: Type.STRING },
                            percentage: { type: Type.NUMBER }
                        },
                        required: ["name", "hex", "percentage"]
                    }
                },
                color_temperature: { type: Type.STRING },
                color_boldness: { type: Type.STRING },
                favorite_neutrals: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                },
                accent_colors: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            },
            required: ["dominant_colors", "color_temperature", "color_boldness", "favorite_neutrals", "accent_colors"]
        },
        silhouette_preferences: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    type: { type: Type.STRING },
                    percentage: { type: Type.NUMBER },
                    description: { type: Type.STRING }
                },
                required: ["type", "percentage", "description"]
            }
        },
        occasion_breakdown: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    occasion: { type: Type.STRING },
                    percentage: { type: Type.NUMBER },
                    item_count: { type: Type.NUMBER },
                    typical_items: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    }
                },
                required: ["occasion", "percentage", "item_count", "typical_items"]
            }
        },
        personality_traits: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    trait: { type: Type.STRING },
                    score: { type: Type.NUMBER },
                    reasoning: { type: Type.STRING }
                },
                required: ["trait", "score", "reasoning"]
            }
        },
        celebrity_matches: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    match_percentage: { type: Type.NUMBER },
                    reasoning: { type: Type.STRING },
                    shared_characteristics: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    }
                },
                required: ["name", "match_percentage", "reasoning", "shared_characteristics"]
            }
        },
        style_evolution_insights: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    trend: { type: Type.STRING },
                    evidence: { type: Type.STRING },
                    recommendation: { type: Type.STRING }
                },
                required: ["trend", "evidence", "recommendation"]
            }
        },
        versatility_score: { type: Type.NUMBER },
        uniqueness_score: { type: Type.NUMBER },
        summary: { type: Type.STRING }
    },
    required: ["archetypes", "primary_archetype", "color_profile", "silhouette_preferences", "occasion_breakdown", "personality_traits", "celebrity_matches", "style_evolution_insights", "versatility_score", "uniqueness_score", "summary"]
};

export async function analyzeStyleDNA(
    closet: import('../types').ClothingItem[]
): Promise<import('../types').StyleDNAProfile> {
    try {
        if (closet.length === 0) {
            throw new Error("El armario está vacío. Agregá prendas para analizar tu Style DNA.");
        }

        if (closet.length < 10) {
            throw new Error("Necesitás al menos 10 prendas en tu armario para un análisis confiable de Style DNA.");
        }

        // Prepare closet metadata for AI
        const closetMetadata = closet.map(item => ({
            id: item.id,
            category: item.metadata.category,
            subcategory: item.metadata.subcategory,
            color: item.metadata.color_primary,
            neckline: item.metadata.neckline || 'N/A',
            sleeve: item.metadata.sleeve_type || 'N/A',
            vibes: item.metadata.vibe_tags.join(', '),
            seasons: item.metadata.seasons.join(', ')
        }));

        // Build comprehensive prompt
        const systemPrompt = `Sos un experto analista de moda y psicología del estilo con años de experiencia estudiando el "Style DNA" de personas.

Tu tarea es analizar el armario completo del usuario (${closet.length} prendas) y crear un perfil profundo de su "ADN de Estilo" - un retrato psicológico y estético basado en sus elecciones de ropa.

ARQUETIPOS DE ESTILO (evalúa cada uno 0-100%):
1. **Casual**: Cómodo, relajado, día a día (jeans, t-shirts, sneakers)
2. **Formal**: Elegante, profesional, estructurado (blazers, dress pants, heels)
3. **Sporty**: Atlético, activo, funcional (athletic wear, joggers, sporty shoes)
4. **Bohemian**: Artístico, libre, ecl éctico (flowy pieces, patterns, earthy tones)
5. **Minimalist**: Simple, atemporal, neutro (basics, clean lines, monochrome)
6. **Edgy**: Rebelde, audaz, alternativo (leather, dark colors, asymmetric cuts)
7. **Classic**: Atemporal, refinado, tradicional (trench coats, button-downs, loafers)
8. **Trendy**: Moderno, fashion-forward, actual (latest trends, statement pieces)
9. **Romantic**: Femenino, suave, delicado (lace, pastels, flowy silhouettes)
10. **Preppy**: Pulido, collegiate, tradicional (stripes, blazers, loafers)

ANÁLISIS DE COLOR:
- **Temperature**: warm (reds, oranges, yellows), cool (blues, greens, purples), neutral (grays, beiges, whites), mixed
- **Boldness**: vibrant (bright saturated colors), muted (soft pastels/earth tones), mixed
- Identifica favorite neutrals (black, white, gray, navy, beige, etc.)
- Identifica accent colors (colores no-neutros que agregan personalidad)

SILUETAS (evalúa cada una 0-100%):
- **Oversized**: Prendas holgadas, voluminosas
- **Fitted**: Ajustadas al cuerpo, siluetas definidas
- **Structured**: Cortes arquitectónicos, líneas definidas
- **Flowy**: Telas sueltas, movimiento fluido
- **Tailored**: Sastría precisa, cortes impecables
- **Relaxed**: Comodidad, sin estructura rígida

OCASIONES:
Analiza qué porcentaje del armario es para: work, casual, formal, athletic, evening, weekend, special events

RASGOS DE PERSONALIDAD (score 0-10):
Basándote en las elecciones de ropa, infiere rasgos de personalidad:
- Adventurous vs. Conservative
- Practical vs. Aspirational
- Creative vs. Traditional
- Confident vs. Modest
- Expressive vs. Reserved
- Organized vs. Spontaneous
- Quality-Focused vs. Trend-Focused

CELEBRITY STYLE MATCHES:
Identifica 3-5 celebridades cuyo estilo coincide con el del usuario. Considera:
- Arquetipos de estilo similares
- Paleta de colores comparable
- Siluetas preferidas
- Vibe general

EVOLUTION INSIGHTS:
Si puedes detectar patrones evolutivos (basado en metadata, seasons, etc.), identifica:
- Trends emergentes en el armario
- Cambios de preferencias
- Recomendaciones para evolución futura

SCORES FINALES:
- **versatility_score** (0-100): Qué tan versátil es el armario (muchas combinaciones posibles)
- **uniqueness_score** (0-100): Qué tan distintivo/único es el estilo (vs. genérico)

SUMMARY:
Escribe un resumen narrativo de 2-3 párrafos que cuente la historia del Style DNA del usuario. Debe ser personal, perspicaz, y útil.

IMPORTANTE:
- Los porcentajes de arquetipos deben sumar 100%
- Los porcentajes de silhouettes deben sumar 100%
- Los porcentajes de occasions deben sumar 100%
- Sé específico y basate en evidencia real del armario
- Evita generalizaciones vacías - cada insight debe estar fundamentado`;

        const userPrompt = `Armario del usuario (${closet.length} prendas):
${JSON.stringify(closetMetadata, null, 2)}

Analiza este armario y genera un perfil completo de Style DNA.

Responde en español con:
1. archetypes: Array de 10 arquetipos con percentages (deben sumar 100%)
2. primary_archetype: El arquetipo dominante
3. secondary_archetype: El segundo arquetipo más fuerte
4. color_profile: Análisis completo de colores (dominant_colors, temperature, boldness, neutrals, accents)
5. silhouette_preferences: Array de preferencias de silueta con percentages (deben sumar 100%)
6. occasion_breakdown: Distribución por ocasiones con percentages (deben sumar 100%)
7. personality_traits: 5-7 rasgos de personalidad con score 0-10
8. celebrity_matches: 3-5 matches con celebridades (match_percentage 0-100)
9. style_evolution_insights: 2-3 insights sobre evolución de estilo
10. versatility_score: Score 0-100 de versatilidad
11. uniqueness_score: Score 0-100 de uniqueness
12. summary: Narrativa de 2-3 párrafos sobre el Style DNA`;

        // Call Gemini Pro with structured output
        const response = await getAIClient().models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: userPrompt }] },
            config: {
                systemInstruction: systemPrompt,
                temperature: 0.5, // Moderate creativity for personality analysis
                responseMimeType: "application/json",
                responseSchema: styleDNASchema
            }
    });

        const text = response.text;

        if (!text) {
            throw new Error("Respuesta vacía del modelo de IA");
        }

        // Parse JSON response
        const parsedJson = JSON.parse(text);

        // Determine confidence level based on closet size
        let confidenceLevel: 'low' | 'medium' | 'high' = 'low';
        if (closet.length >= 30) {
            confidenceLevel = 'high';
        } else if (closet.length >= 15) {
            confidenceLevel = 'medium';
        }

        // Build final StyleDNAProfile object
        const profile: import('../types').StyleDNAProfile = {
            id: `style-dna-${Date.now()}`,
            archetypes: parsedJson.archetypes,
            primary_archetype: parsedJson.primary_archetype,
            secondary_archetype: parsedJson.secondary_archetype,
            color_profile: parsedJson.color_profile,
            silhouette_preferences: parsedJson.silhouette_preferences,
            occasion_breakdown: parsedJson.occasion_breakdown,
            personality_traits: parsedJson.personality_traits,
            celebrity_matches: parsedJson.celebrity_matches,
            style_evolution_insights: parsedJson.style_evolution_insights,
            versatility_score: parsedJson.versatility_score,
            uniqueness_score: parsedJson.uniqueness_score,
            confidence_level: confidenceLevel,
            analyzed_items_count: closet.length,
            created_at: new Date().toISOString(),
            summary: parsedJson.summary
        };

        return profile;

    } catch (error) {
        console.error("Error analyzing style DNA:", error);
        if (error instanceof Error && error.message.includes("vacío")) {
            throw error;
        }
        throw new Error("No se pudo analizar tu Style DNA. Intentá de nuevo o agregá más prendas a tu armario.");
    }
}

/**
 * Feature 19: AI Fashion Designer
 * Generates a custom fashion item based on user description using Imagen 4
 *
 * Process:
 * 1. Optimize user description with Gemini 2.5 Flash Image
 * 2. Generate image with Imagen 4
 * 3. Analyze generated image to extract metadata
 * 4. Return complete AIDesignedItem
 */
export async function generateFashionDesign(
    request: import('../types').AIDesignRequest
): Promise<import('../types').AIDesignedItem> {
    try {
        // Step 1: Optimize prompt with Gemini 2.5 Flash Image
        const systemPrompt = `Sos un experto en diseño de moda y generación de prompts para IA de imágenes.

Tu tarea es tomar la descripción simple del usuario y crear un PROMPT OPTIMIZADO para Imagen 4 que genere una prenda de vestir profesional y realista.

DESCRIPCIÓN DEL USUARIO: "${request.description}"
CATEGORÍA: ${request.category}
${request.style ? `ESTILO: ${request.style}` : ''}
${request.color_preferences?.length ? `COLORES PREFERIDOS: ${request.color_preferences.join(', ')}` : ''}
${request.occasion ? `OCASIÓN: ${request.occasion}` : ''}

INSTRUCCIONES PARA EL PROMPT OPTIMIZADO:
1. **Especificidad**: Incluir detalles de material, textura, corte, y acabados
2. **Lighting**: Especificar iluminación profesional de estudio para fotografía de moda
3. **Background**: Fondo blanco limpio o neutro profesional
4. **Angle**: Vista frontal completa mostrando toda la prenda
5. **Quality**: Foto de alta calidad tipo catálogo de moda
6. **Realism**: Énfasis en realismo fotográfico, no ilustración ni dibujo
7. **Details**: Incluir detalles importantes (botones, costuras, cierres, etc.)
8. **Context**: Si es necesario, mencionar el contexto de uso (ej: "para oficina", "para fiesta")

FORMATO DE RESPUESTA:
Retorna SOLO el prompt optimizado en inglés, sin explicaciones adicionales. El prompt debe ser una oración descriptiva de 40-80 palabras.

EJEMPLOS:
- Input: "remera blanca básica"
  Output: "Professional studio photograph of a classic white cotton t-shirt, crew neck, short sleeves, front view on white background, clean minimalist design, high-quality fabric texture visible, studio lighting, commercial product photography style, 4K quality"

- Input: "zapatillas deportivas rojas"
  Output: "Professional product photograph of red athletic sneakers, side view, mesh upper material with synthetic overlays, white sole, modern sporty design, studio lighting on white background, commercial footwear photography, high detail, 8K quality"

Ahora genera el prompt optimizado para la descripción del usuario:`;

        const promptResult = await getAIClient().models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: `Genera el prompt optimizado para la descripción: "${request.description}"` }] },
            config: {
                systemInstruction: systemPrompt,
                temperature: 0.7, // Creative but controlled
                maxOutputTokens: 200,
            }
        });

        const optimizedPrompt = promptResult.text.trim();

        console.log('Optimized prompt:', optimizedPrompt);

        // Step 2: Generate image with Imagen 4
        const imageResult = await getAIClient().models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: optimizedPrompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '1:1',
            },
        });

        if (!imageResult.generatedImages || imageResult.generatedImages.length === 0) {
            throw new Error('No se pudo generar la imagen. Intentá con una descripción diferente.');
        }

        // Convert generated image to base64 data URL
        const base64ImageBytes = imageResult.generatedImages[0].image.imageBytes;
        const imageDataUrl = `data:image/jpeg;base64,${base64ImageBytes}`;

        // Step 3: Analyze generated image to extract metadata
        const metadata = await analyzeClothingItem(imageDataUrl);

        // Step 4: Create AIDesignedItem
        const designedItem: import('../types').AIDesignedItem = {
            id: `design_${Date.now()}`,
            request,
            image_url: imageDataUrl,
            optimized_prompt: optimizedPrompt,
            metadata,
            created_at: new Date().toISOString(),
            added_to_closet: false,
            in_wishlist: false
        };

        return designedItem;

    } catch (error) {
        console.error('Error generating fashion design:', error);
        if (error instanceof Error) {
            throw new Error(`No se pudo generar el diseño: ${error.message}`);
        }
        throw new Error('No se pudo generar el diseño. Por favor intentá de nuevo.');
    }
}

// ============================================
// Style Evolution Timeline Analysis
// ============================================

export async function analyzeStyleEvolution(
    closet: import('../types').ClothingItem[]
): Promise<import('../types').StyleEvolutionTimeline> {
    if (closet.length < 10) {
        throw new Error('Necesitás al menos 10 prendas para analizar la evolución de tu estilo.');
    }

    // Sort items by creation date (ID is timestamp-based)
    const sortedItems = [...closet].sort((a, b) => {
        const timestampA = parseInt(a.id.split('-')[1] || '0');
        const timestampB = parseInt(b.id.split('-')[1] || '0');
        return timestampA - timestampB;
    });

    // Prepare data summary for AI
    const itemsWithTimestamps = sortedItems.map(item => ({
        id: item.id,
        timestamp: parseInt(item.id.split('-')[1] || '0'),
        date: new Date(parseInt(item.id.split('-')[1] || '0')).toISOString(),
        category: item.metadata.category,
        subcategory: item.metadata.subcategory,
        color_primary: item.metadata.color_primary,
        vibe_tags: item.metadata.vibe_tags || [],
        seasons: item.metadata.seasons || []
    }));

    const oldestDate = new Date(itemsWithTimestamps[0].timestamp);
    const newestDate = new Date(itemsWithTimestamps[itemsWithTimestamps.length - 1].timestamp);
    const dateRange = `${oldestDate.toLocaleDateString('es-AR', { month: 'short', year: 'numeric' })} - ${newestDate.toLocaleDateString('es-AR', { month: 'short', year: 'numeric' })}`;

    // Confidence level based on quantity and time span
    const timeSpanMonths = (newestDate.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    const confidenceLevel: 'low' | 'medium' | 'high' =
        closet.length >= 30 && timeSpanMonths >= 6 ? 'high' :
        closet.length >= 20 && timeSpanMonths >= 3 ? 'medium' : 'low';

    const systemPrompt = `Sos un experto analista de moda especializado en rastrear y analizar la EVOLUCIÓN del estilo personal a lo largo del tiempo.

Tu tarea es analizar el armario del usuario (${closet.length} prendas) distribuidas desde ${oldestDate.toLocaleDateString('es-AR')} hasta ${newestDate.toLocaleDateString('es-AR')} y crear una LÍNEA DE TIEMPO COMPLETA de su evolución de estilo.

DATOS DEL ARMARIO (ordenados cronológicamente):
${JSON.stringify(itemsWithTimestamps, null, 2)}

METODOLOGÍA DE ANÁLISIS:

1. PERÍODOS CRONOLÓGICOS (3-5 períodos):
   - Divide la timeline en 3-5 períodos lógicos basados en los timestamps
   - Para cada período: analiza colores dominantes (top 3), categorías dominantes (top 3), estilos dominantes (top 3 vibe_tags)
   - Nombres creativos: "Primeros Pasos", "Época Minimalista", "Etapa Experimental", "Estilo Actual"
   - key_characteristics: 2-3 oraciones describiendo qué definió este período

2. TRENDS (4-6 tendencias principales):
   Tipos disponibles:
   - color_shift: cambios en paleta de colores (ej: de vibrantes a neutros)
   - category_preference: cambios en categorías favoritas (ej: más tops que bottoms)
   - style_evolution: cambios en aesthetic (ej: de sporty a minimalist)
   - spending_pattern: patrones de adquisición (si hay info de precio/marca)
   - seasonality: adaptación a estaciones
   - brand_preference: cambios en marcas/tiers

   Para cada trend:
   - direction: increasing/decreasing/stable/fluctuating
   - confidence: 0-100 (basado en qué tan clara es la evidencia)
   - evidence: 3-5 data points específicos con números/fechas
   - description: 2-3 oraciones explicando la tendencia

3. MILESTONES (5-10 hitos clave):
   Tipos disponibles:
   - first_item: Primera prenda agregada
   - wardrobe_expansion: Momentos de crecimiento rápido
   - style_shift: Cambios significativos de dirección
   - color_discovery: Introducción de nuevo color importante
   - category_diversification: Expansión a nuevas categorías
   - investment_piece: Adquisición de pieza significativa

   Para cada milestone:
   - date: ISO date del momento
   - title: Título descriptivo (ej: "Descubrimiento del Minimalismo")
   - description: Contexto y significancia (2-3 oraciones)
   - icon: material icon name apropiado (stars, trending_up, palette, category, etc.)
   - related_item_ids: IDs de items relevantes (opcional)

4. PREDICTIONS (2-3 predicciones futuras):
   - Basadas en las tendencias detectadas
   - confidence: 0-100
   - reasoning: Por qué creés que va en esa dirección (2-3 oraciones)
   - recommendations: 3-5 sugerencias accionables
   - timeline: "Próximos 3-6 meses", "Próximo año", etc.

5. OVERALL JOURNEY SUMMARY (3-4 párrafos):
   - Narrativa cohesiva de toda la evolución
   - Mencionar momentos clave y transformaciones
   - Tono personal y cercano en español argentino
   - Conectar períodos, trends, y milestones en una historia

REGLAS CRÍTICAS:
- EVIDENCIA: Todo debe estar respaldado por los datos del armario
- CRONOLOGÍA: Períodos en orden temporal correcto
- ESPECIFICIDAD: Mencionar colores, categorías, estilos específicos con nombres exactos
- BALANCE: No solo positivo, mencionar también limitaciones o áreas sin evolución
- ESPAÑOL ARGENTINO: Tono cercano, usar "vos", "tu estilo", etc.
- CONFIANZA: Ajustar confidence levels según cantidad de evidencia
- REALISMO: Si no hay suficiente data para algo, no inventar

FORMATO DE SALIDA:
Structured JSON con todos los campos requeridos del schema StyleEvolutionTimelineSchema.`;

    const styleEvolutionSchema = {
        type: SchemaType.OBJECT,
        properties: {
            periods: {
                type: SchemaType.ARRAY,
                items: {
                    type: SchemaType.OBJECT,
                    properties: {
                        period_name: { type: SchemaType.STRING },
                        date_range: { type: SchemaType.STRING },
                        item_count: { type: SchemaType.NUMBER },
                        dominant_colors: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                        dominant_categories: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                        dominant_styles: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                        average_price_range: { type: SchemaType.STRING, nullable: true },
                        key_characteristics: { type: SchemaType.STRING }
                    },
                    required: ['period_name', 'date_range', 'item_count', 'dominant_colors', 'dominant_categories', 'dominant_styles', 'key_characteristics']
                }
            },
            trends: {
                type: SchemaType.ARRAY,
                items: {
                    type: SchemaType.OBJECT,
                    properties: {
                        trend_type: { type: SchemaType.STRING },
                        title: { type: SchemaType.STRING },
                        direction: { type: SchemaType.STRING },
                        confidence: { type: SchemaType.NUMBER },
                        description: { type: SchemaType.STRING },
                        evidence: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
                    },
                    required: ['trend_type', 'title', 'direction', 'confidence', 'description', 'evidence']
                }
            },
            milestones: {
                type: SchemaType.ARRAY,
                items: {
                    type: SchemaType.OBJECT,
                    properties: {
                        id: { type: SchemaType.STRING },
                        milestone_type: { type: SchemaType.STRING },
                        date: { type: SchemaType.STRING },
                        title: { type: SchemaType.STRING },
                        description: { type: SchemaType.STRING },
                        related_item_ids: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, nullable: true },
                        icon: { type: SchemaType.STRING }
                    },
                    required: ['id', 'milestone_type', 'date', 'title', 'description', 'icon']
                }
            },
            predictions: {
                type: SchemaType.ARRAY,
                items: {
                    type: SchemaType.OBJECT,
                    properties: {
                        prediction: { type: SchemaType.STRING },
                        confidence: { type: SchemaType.NUMBER },
                        reasoning: { type: SchemaType.STRING },
                        recommendations: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                        timeline: { type: SchemaType.STRING }
                    },
                    required: ['prediction', 'confidence', 'reasoning', 'recommendations', 'timeline']
                }
            },
            overall_journey_summary: { type: SchemaType.STRING }
        },
        required: ['periods', 'trends', 'milestones', 'predictions', 'overall_journey_summary']
    };

    try {
        const model = getAIClient().models.generate({
            model: 'gemini-2.5-flash',
            config: {
                temperature: 0.6, // Balance between creativity and consistency
                responseMimeType: 'application/json',
                responseSchema: styleEvolutionSchema
            }

        });

        const result = await model.generateContent(systemPrompt);
        const responseText = result.response.text();
        const analysis = JSON.parse(responseText);

        const timeline: import('../types').StyleEvolutionTimeline = {
            id: `timeline-${Date.now()}`,
            periods: analysis.periods || [],
            trends: analysis.trends || [],
            milestones: analysis.milestones || [],
            predictions: analysis.predictions || [],
            overall_journey_summary: analysis.overall_journey_summary || '',
            confidence_level: confidenceLevel,
            analyzed_items_count: closet.length,
            date_range: dateRange,
            created_at: new Date().toISOString()
        };

        return timeline;
    } catch (error) {
        console.error('Error analyzing style evolution:', error);
        if (error instanceof Error) {
            throw new Error(`Error al analizar evolución: ${error.message}`);
        }
        throw new Error('No se pudo analizar la evolución del estilo. Por favor intentá de nuevo.');
    }
}

// ===========================================
// HELPER: SIMPLE TEXT GENERATION
// ===========================================

/**
 * Generate simple text content without structured output
 * Used for quick text generation tasks (classification, reasoning, etc.)
 */
export async function generateContent(prompt: string): Promise<string> {
    try {
        const response = await getAIClient().models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [{ text: prompt }] },
            config: {
                temperature: 0.7,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 1024,
            },
    });

        const text = response.text;
        if (!text) {
            throw new Error('Gemini devolvió una respuesta vacía');
        }

        return text.trim();
    } catch (error) {
        console.error('Error generating content with Gemini:', error);
        if (error instanceof Error) {
            throw new Error(`Error de Gemini: ${error.message}`);
        }
        throw new Error('No se pudo generar el contenido con Gemini.');
    }
}

// ===========================================
// FEATURE 23: VIRTUAL SHOPPING ASSISTANT
// ===========================================

/**
 * Analyze closet to identify shopping gaps and strategic purchase opportunities
 */
export async function analyzeShoppingGaps(closet: ClothingItem[]): Promise<import('../types').ShoppingGap[]> {
    const systemInstruction = `Eres un experto asesor de moda y compras inteligentes. Analiza el armario del usuario y identifica gaps estratégicos - prendas faltantes que maximizarían la versatilidad del closet.

Enfocate en:
1. **Basics esenciales** que faltan (camisas blancas, jeans oscuros, zapatillas neutras)
2. **Prendas conectoras** que crearían nuevas combinaciones
3. **Gaps de color** que limitan opciones
4. **Gaps de ocasión** (ej: falta ropa formal, deportiva, etc.)

Para cada gap, evalúa:
- **Prioridad**: essential (imprescindible), recommended (recomendado), optional (nice-to-have)
- **Impacto de versatilidad**: cuántas nuevas combinaciones desbloquearía
- **Razón**: por qué este gap existe y cómo afecta el armario

Sé específico con subcategorías (ej: "camisa oxford blanca" no solo "camisa").`;

    const closetSummary = closet.map(item => ({
        category: item.metadata.category,
        subcategory: item.metadata.subcategory,
        color: item.metadata.color_primary,
        vibes: item.metadata.vibe_tags,
        seasons: item.metadata.seasons
    }));

    const prompt = `Analiza este armario y identifica 5-8 gaps estratégicos de compras:

${JSON.stringify(closetSummary, null, 2)}

Total de prendas: ${closet.length}

Retorna un análisis de gaps priorizados.`;

    const gapSchema = {
        type: SchemaType.OBJECT,
        properties: {
            gaps: {
                type: SchemaType.ARRAY,
                items: {
                    type: SchemaType.OBJECT,
                    properties: {
                        category: { type: SchemaType.STRING },
                        subcategory: { type: SchemaType.STRING },
                        color_suggestion: { type: SchemaType.STRING },
                        priority: {
                            type: SchemaType.STRING,
                            enum: ['essential', 'recommended', 'optional']
                        },
                        reasoning: { type: SchemaType.STRING },
                        occasions: {
                            type: SchemaType.ARRAY,
                            items: { type: SchemaType.STRING }
                        },
                        estimated_budget: { type: SchemaType.STRING },
                        alternatives: {
                            type: SchemaType.ARRAY,
                            items: { type: SchemaType.STRING },
                            nullable: true
                        },
                        current_inventory_count: { type: SchemaType.NUMBER },
                        versatility_impact: { type: SchemaType.NUMBER }
                    },
                    required: ['category', 'subcategory', 'color_suggestion', 'priority', 'reasoning', 'occasions', 'estimated_budget', 'current_inventory_count', 'versatility_impact']
                }
            }
        },
        required: ['gaps']
    };

    try {
        const model = getAIClient().models.generate({
            model: 'gemini-2.5-flash',
            config: {
                temperature: 0.5,
                responseMimeType: 'application/json',
                responseSchema: gapSchema,
                systemInstruction
            }

        });

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const analysis = JSON.parse(responseText);

        const gaps: import('../types').ShoppingGap[] = (analysis.gaps || []).map((gap: any, index: number) => ({
            id: `gap-${Date.now()}-${index}`,
            category: gap.category || 'top',
            subcategory: gap.subcategory || 'prenda básica',
            color_suggestion: gap.color_suggestion || 'neutral',
            priority: gap.priority || 'recommended',
            reasoning: gap.reasoning || 'Ampliaría las opciones del armario',
            occasions: gap.occasions || ['casual'],
            estimated_budget: gap.estimated_budget || 'AR$ 10,000 - 20,000',
            alternatives: gap.alternatives || [],
            current_inventory_count: gap.current_inventory_count || 0,
            versatility_impact: gap.versatility_impact || 50
        }));

        return gaps;
    } catch (error) {
        console.error('Error analyzing shopping gaps:', error);
        throw new Error('No se pudo analizar los gaps de compras. Intentá de nuevo.');
    }
}

/**
 * Generate strategic shopping recommendations with mock product suggestions
 */
export async function generateShoppingRecommendations(
    gaps: import('../types').ShoppingGap[],
    closet: ClothingItem[],
    budget?: number
): Promise<import('../types').ShoppingRecommendation[]> {
    const systemInstruction = `Eres un personal shopper experto. Genera recomendaciones estratégicas de compras basadas en los gaps identificados.

Para cada gap, sugiere productos específicos de tiendas reales argentinas:
- **Zara**: Moda trendy, calidad media-alta (AR$ 15,000 - 40,000)
- **H&M**: Fast fashion accesible (AR$ 8,000 - 20,000)
- **Uniqlo**: Basics de calidad (AR$ 12,000 - 25,000)
- **COS**: Minimalista premium (AR$ 20,000 - 50,000)
- **Mango**: Elegante y versátil (AR$ 15,000 - 35,000)
- **Pull&Bear**: Casual juvenil (AR$ 10,000 - 22,000)

Prioriza:
1. Gaps "essential" primero
2. Mayor impacto de versatilidad
3. Mejor relación calidad-precio
4. Coherencia con el estilo actual del closet`;

    const closetStyle = closet.map(item => ({
        vibes: item.metadata.vibe_tags,
        colors: item.metadata.color_primary
    }));

    const prompt = `Genera recomendaciones estratégicas para estos gaps:

**GAPS IDENTIFICADOS:**
${JSON.stringify(gaps, null, 2)}

**ESTILO ACTUAL DEL CLOSET:**
${JSON.stringify(closetStyle.slice(0, 20), null, 2)}

${budget ? `**PRESUPUESTO MÁXIMO:** AR$ ${budget.toLocaleString('es-AR')}` : '**PRESUPUESTO:** Flexible'}

Sugiere 2-4 productos específicos por gap prioritario. Sé realista con precios y disponibilidad.`;

    const recommendationSchema = {
        type: SchemaType.OBJECT,
        properties: {
            recommendations: {
                type: SchemaType.ARRAY,
                items: {
                    type: SchemaType.OBJECT,
                    properties: {
                        gap_id: { type: SchemaType.STRING },
                        products: {
                            type: SchemaType.ARRAY,
                            items: {
                                type: SchemaType.OBJECT,
                                properties: {
                                    title: { type: SchemaType.STRING },
                                    brand: { type: SchemaType.STRING },
                                    price: { type: SchemaType.NUMBER },
                                    subcategory: { type: SchemaType.STRING },
                                    color_primary: { type: SchemaType.STRING },
                                    similarity_to_gap: { type: SchemaType.NUMBER },
                                    match_reasoning: { type: SchemaType.STRING },
                                    estimated_quality: { type: SchemaType.STRING }
                                },
                                required: ['title', 'brand', 'price', 'subcategory', 'color_primary', 'similarity_to_gap', 'match_reasoning', 'estimated_quality']
                            }
                        },
                        priority_order: { type: SchemaType.NUMBER },
                        strategy_note: { type: SchemaType.STRING }
                    },
                    required: ['gap_id', 'products', 'priority_order', 'strategy_note']
                }
            }
        },
        required: ['recommendations']
    };

    try {
        const model = getAIClient().models.generate({
            model: 'gemini-2.5-flash',
            config: {
                temperature: 0.6,
                responseMimeType: 'application/json',
                responseSchema: recommendationSchema,
                systemInstruction
            }

        });

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const analysis = JSON.parse(responseText);

        const recommendations: import('../types').ShoppingRecommendation[] = (analysis.recommendations || []).map((rec: any) => {
            const gap = gaps.find(g => g.id === rec.gap_id) || gaps[0];

            const products: import('../types').ShoppingProduct[] = (rec.products || []).map((p: any, idx: number) => ({
                id: `product-${Date.now()}-${idx}`,
                title: p.title || 'Prenda recomendada',
                brand: p.brand as import('../types').ShopName || 'Zara',
                price: p.price || 15000,
                currency: 'ARS',
                image_url: `https://via.placeholder.com/400x600/E5E5E5/666666?text=${encodeURIComponent(p.title || 'Producto')}`,
                shop_url: `https://www.${p.brand?.toLowerCase() || 'zara'}.com/ar`,
                category: gap.category,
                subcategory: p.subcategory || gap.subcategory,
                color_primary: p.color_primary || gap.color_suggestion,
                sizes_available: ['XS', 'S', 'M', 'L', 'XL'],
                in_stock: true,
                similarity_to_gap: p.similarity_to_gap || 85,
                match_reasoning: p.match_reasoning || 'Cumple con los requisitos del gap',
                estimated_quality: p.estimated_quality || 'mid-range'
            }));

            return {
                gap,
                products,
                total_budget_estimate: products.reduce((sum, p) => sum + p.price, 0),
                priority_order: rec.priority_order || 1,
                strategy_note: rec.strategy_note || 'Recomendación basada en análisis del armario'
            };
        });

        return recommendations;
    } catch (error) {
        console.error('Error generating shopping recommendations:', error);
        throw new Error('No se pudo generar recomendaciones. Intentá de nuevo.');
    }
}

/**
 * Conversational shopping assistant for chat interface
 */
export async function conversationalShoppingAssistant(
    userMessage: string,
    chatHistory: import('../types').ShoppingChatMessage[],
    closet: ClothingItem[],
    currentGaps?: import('../types').ShoppingGap[],
    currentRecommendations?: import('../types').ShoppingRecommendation[]
): Promise<import('../types').ShoppingChatMessage> {
    const systemInstruction = `Eres un asistente de compras de moda conversacional, amigable y experto. Ayudas a usuarios a tomar decisiones de compra inteligentes.

**TU PERSONALIDAD:**
- Amigable y cercano (usá voseo argentino: "vos tenés", "mirá", "probá")
- Entusiasta pero honesto sobre compras
- Enfocado en versatilidad y value-for-money
- Educas sobre moda sin ser pretencioso

**TUS CAPACIDADES:**
1. Analizar gaps del armario
2. Recomendar productos específicos de tiendas argentinas
3. Comparar opciones (calidad, precio, versatilidad)
4. Sugerir alternativas más económicas
5. Ayudar a priorizar compras según presupuesto

**TIENDAS QUE CONOCÉS (Argentina):**
- Zara: Trendy, AR$ 15,000-40,000
- H&M: Accesible, AR$ 8,000-20,000
- Uniqlo: Basics calidad, AR$ 12,000-25,000
- COS: Premium minimalista, AR$ 20,000-50,000
- Mango: Elegante versátil, AR$ 15,000-35,000
- Pull&Bear: Casual juvenil, AR$ 10,000-22,000

Respondé de forma conversacional, breve y accionable. Si el usuario pide recomendaciones, mencioná productos específicos con precios.`;

    const closetContext = currentGaps
        ? `**GAPS IDENTIFICADOS:** ${currentGaps.length} gaps (${currentGaps.filter(g => g.priority === 'essential').length} esenciales)`
        : `**CLOSET:** ${closet.length} prendas`;

    const recommendationsContext = currentRecommendations
        ? `**RECOMENDACIONES ACTIVAS:** ${currentRecommendations.length} recomendaciones con ${currentRecommendations.reduce((sum, r) => sum + r.products.length, 0)} productos sugeridos`
        : '';

    // Build conversation history for context
    const conversationContext = chatHistory
        .slice(-5) // Last 5 messages for context
        .map(msg => `${msg.role === 'user' ? 'Usuario' : 'Asistente'}: ${msg.content}`)
        .join('\n');

    const prompt = `${closetContext}
${recommendationsContext}

**CONVERSACIÓN RECIENTE:**
${conversationContext}

**MENSAJE ACTUAL DEL USUARIO:**
${userMessage}

Respondé de forma conversacional, útil y accionable.`;

    try {
        const response = await getAIClient().models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [{ text: prompt }] },
            config: {
                systemInstruction,
                temperature: 0.8,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 500,
            },
    });

        const text = response.text;
        if (!text) {
            throw new Error('Gemini devolvió una respuesta vacía');
        }

        const chatMessage: import('../types').ShoppingChatMessage = {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            content: text.trim(),
            timestamp: new Date().toISOString()
        };

        return chatMessage;
    } catch (error) {
        console.error('Error in conversational shopping assistant:', error);
        throw new Error('No pude procesar tu mensaje. Intentá de nuevo.');
    }
}

// =============================================================================
// EXPORTS FOR ENHANCED GENERATORS
// =============================================================================

/**
 * Export helpers for enhanced outfit generation
 * These are needed by the enhanced generators in generateOutfit-enhanced.ts
 */
export { getAIClient, retryAIOperation as retryWithBackoff };