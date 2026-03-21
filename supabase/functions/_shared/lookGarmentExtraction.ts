import { GoogleGenAI, Type } from 'npm:@google/genai@1.27.0';
import { GEMINI_31_FLASH_LITE_MODEL } from './geminiModels.ts';

export type LookGarmentExtractionItem = {
  id: string;
  label: string;
  category: string;
  subcategory: string;
  color_primary: string;
  confidence: number;
  crop: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  visibility_note?: string | null;
};

export type LookGarmentExtractionResult = {
  items: LookGarmentExtractionItem[];
  warnings: string[];
  summary?: string | null;
};

export const lookGarmentExtractionSchema = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          label: { type: Type.STRING },
          category: { type: Type.STRING },
          subcategory: { type: Type.STRING },
          color_primary: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          crop: {
            type: Type.OBJECT,
            properties: {
              x: { type: Type.NUMBER },
              y: { type: Type.NUMBER },
              width: { type: Type.NUMBER },
              height: { type: Type.NUMBER },
            },
            required: ['x', 'y', 'width', 'height'],
          },
          visibility_note: { type: Type.STRING },
        },
        required: ['id', 'label', 'category', 'subcategory', 'color_primary', 'confidence', 'crop'],
      },
    },
    warnings: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    summary: { type: Type.STRING },
  },
  required: ['items', 'warnings'],
};

function parseDataUrlImage(imageDataUrl: string): { mimeType: string; base64Data: string } {
  const [mimeTypePart, base64Data] = imageDataUrl.split(';base64,');
  const mimeType = mimeTypePart?.split(':')[1];
  if (!mimeType || !base64Data) {
    throw new Error('Invalid image data URL format');
  }

  return { mimeType, base64Data };
}

export async function extractLookGarmentsWithAI(
  ai: GoogleGenAI,
  imageDataUrl: string,
): Promise<LookGarmentExtractionResult> {
  const { mimeType, base64Data } = parseDataUrlImage(imageDataUrl);

  const response = await ai.models.generateContent({
    model: GEMINI_31_FLASH_LITE_MODEL,
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Data,
            mimeType,
          },
        },
        {
          text: [
            'Detectá las prendas visibles principales de este look completo.',
            'Devolvé solo prendas grandes y usables para sumar al armario.',
            'No inventes prendas tapadas ni detalles que no se ven.',
            'Cada crop tiene que venir normalizado entre 0 y 1 respecto de la imagen completa.',
            'Si el look tiene vestido o enterito, priorizá one-piece en vez de top+bottom.',
            'Si una prenda está demasiado tapada o dudosa, agregá una warning y bajá confidence.',
          ].join(' '),
        },
      ],
    },
    config: {
      systemInstruction: [
        'Sos un analista de moda argentino.',
        'Detectás prendas visibles de un look completo para pasarlas a revisión humana.',
        'Respondés con JSON estricto.',
        'Usá categorías: top, bottom, shoes, accessory, outerwear, one-piece.',
        'label y subcategory tienen que ser cortos y claros en español rioplatense.',
        'Las coordenadas de crop deben cubrir la prenda con un encuadre razonable, sin irse de la imagen.',
      ].join(' '),
      responseMimeType: 'application/json',
      responseSchema: lookGarmentExtractionSchema,
    },
  });

  const parsed = JSON.parse(response.text || '{}');

  return {
    items: Array.isArray(parsed?.items) ? parsed.items : [],
    warnings: Array.isArray(parsed?.warnings)
      ? parsed.warnings.filter((warning: unknown): warning is string => typeof warning === 'string')
      : [],
    summary: typeof parsed?.summary === 'string' ? parsed.summary : null,
  };
}
