/**
 * Professional Stylist Service
 *
 * Servicio de estilismo profesional que integra:
 * - Morfología corporal (balance visual)
 * - Colorimetría personal (paletas estacionales)
 * - Reglas de estilo (dress code, ocasión, clima)
 */

import type {
  ClothingItem,
  ProfessionalProfile,
  ProfessionalFitResult,
  BodyShape,
  ColorSeason,
  WeatherData
} from '../../types';
import { Type } from '@google/genai';
import { getToneInstructions } from './aiToneHelper';
import * as aiService from './aiService';

// =====================================================
// REGLAS DE MORFOLOGÍA
// =====================================================

const MORPHOLOGY_RULES: Record<BodyShape, string> = {
  triangulo: `
    **OBJETIVO**: Atraer mirada hacia arriba, equilibrar caderas más anchas
    **ESTRATEGIAS**:
    - Hombros estructurados (blazers, hombreras sutiles)
    - Colores claros o estampados en la parte superior
    - Escotes que amplíen visualmente los hombros (barco, sabrina)
    - Parte inferior: colores oscuros, telas lisas sin volumen
    - Evitar: pantalones con bolsillos laterales grandes, faldas con vuelo excesivo
  `,

  triangulo_invertido: `
    **OBJETIVO**: Suavizar hombros, dar volumen visual a la parte inferior
    **ESTRATEGIAS**:
    - Escotes en V (alargan y afinan parte superior)
    - Mangas raglán o sin estructura en hombros
    - Parte inferior: pantalones claros, faldas con vuelo, bolsillos laterales
    - Cinturones para marcar cintura (crea curvas)
    - Evitar: hombreras, rayas horizontales arriba, mangas abullonadas
  `,

  rectangulo: `
    **OBJETIVO**: Crear ilusión de cintura, añadir curvas
    **ESTRATEGIAS**:
    - Cinturones en la cintura natural o levemente alta
    - Prendas cruzadas (wrap dresses, blazers con cruce)
    - Cortes a la cintura (chaquetas cropped, tops que terminen en cintura)
    - Capas asimétricas (un lado más largo que otro)
    - Evitar: prendas rectas sin forma, largos que terminen en cadera
  `,

  reloj_arena: `
    **OBJETIVO**: Seguir la línea natural, marcar cintura
    **ESTRATEGIAS**:
    - Prendas ajustadas o semi-ajustadas que sigan curvas
    - Cinturones para realzar cintura natural
    - Escotes que balanceen busto (V, corazón, cuadrado)
    - Faldas lápiz, pantalones mid-rise
    - Evitar: prendas muy holgadas que escondan curvas, tiro muy bajo
  `,

  oval: `
    **OBJETIVO**: Alargar la silueta, crear líneas verticales
    **ESTRATEGIAS**:
    - Líneas verticales (rayas, costuras, cardigans abiertos)
    - Capas abiertas (blazers/cardigans sin abrochar)
    - Escotes profundos (V, ovalado)
    - Telas fluidas que caigan sin ceñir
    - Monochrome (looks de un solo color alargan)
    - Evitar: cinturones a la cintura, prendas ceñidas, rayas horizontales
  `
};

// =====================================================
// PALETAS DE COLORIMETRÍA (Sistema 12 Estaciones)
// =====================================================

const COLOR_PALETTES: Record<ColorSeason, {
  description: string;
  recommended_colors: string[];
  avoid_colors: string[];
  best_neutrals: string[];
}> = {
  primavera_clara: {
    description: "Colores claros, cálidos, delicados. Piel clara con undertone cálido.",
    recommended_colors: ["#FFE5CC", "#FFDAB9", "#F0E68C", "#98FB98", "#87CEEB", "#DDA0DD"],
    avoid_colors: ["#000000", "#2F4F4F", "#8B0000"],
    best_neutrals: ["#F5F5DC", "#D2B48C", "#DEB887", "#F0E68C"]
  },

  primavera_brillante: {
    description: "Colores claros, brillantes, saturados. Contraste medio-alto.",
    recommended_colors: ["#FF6347", "#FFD700", "#00FA9A", "#00BFFF", "#FF69B4", "#FF8C00"],
    avoid_colors: ["#000000", "#696969", "#8B4513"],
    best_neutrals: ["#FFFAF0", "#F0E68C", "#DEB887"]
  },

  primavera_calida: {
    description: "Colores cálidos, dorados, terrosos. Undertone muy cálido.",
    recommended_colors: ["#FF8C00", "#DAA520", "#CD853F", "#D2691E", "#DC143C", "#9ACD32"],
    avoid_colors: ["#000000", "#0000CD", "#800080"],
    best_neutrals: ["#F5DEB3", "#D2B48C", "#CD853F", "#DEB887"]
  },

  verano_claro: {
    description: "Colores claros, fríos, suaves. Piel clara con undertone frío.",
    recommended_colors: ["#E6E6FA", "#B0E0E6", "#FFB6C1", "#F0E68C", "#98FB98", "#DDA0DD"],
    avoid_colors: ["#000000", "#FF4500", "#8B4513"],
    best_neutrals: ["#F5F5F5", "#E0E0E0", "#D3D3D3", "#C0C0C0"]
  },

  verano_suave: {
    description: "Colores suaves, apagados, pasteles. Bajo contraste.",
    recommended_colors: ["#B0C4DE", "#D8BFD8", "#F0E68C", "#98FB98", "#FFB6C1", "#DDA0DD"],
    avoid_colors: ["#000000", "#FF0000", "#FF8C00"],
    best_neutrals: ["#F5F5F5", "#E6E6FA", "#D3D3D3", "#C0C0C0"]
  },

  verano_frio: {
    description: "Colores fríos, medios, rosados/azulados. Undertone muy frío.",
    recommended_colors: ["#6A5ACD", "#4682B4", "#C71585", "#9370DB", "#48D1CC", "#DA70D6"],
    avoid_colors: ["#FF4500", "#FF8C00", "#DAA520"],
    best_neutrals: ["#F8F8FF", "#E6E6FA", "#D3D3D3", "#708090"]
  },

  otoño_suave: {
    description: "Colores suaves, cálidos, apagados. Bajo contraste.",
    recommended_colors: ["#BC8F8F", "#D2B48C", "#BDB76B", "#8FBC8F", "#CD853F", "#DAA520"],
    avoid_colors: ["#000000", "#00FFFF", "#FF1493"],
    best_neutrals: ["#F5F5DC", "#D2B48C", "#BC8F8F", "#A0522D"]
  },

  otoño_calido: {
    description: "Colores cálidos, terrosos, dorados. Undertone muy cálido.",
    recommended_colors: ["#D2691E", "#CD853F", "#B8860B", "#8B4513", "#A0522D", "#DC143C"],
    avoid_colors: ["#000000", "#4169E1", "#FF1493"],
    best_neutrals: ["#F5DEB3", "#D2B48C", "#CD853F", "#8B4513"]
  },

  otoño_profundo: {
    description: "Colores profundos, ricos, cálidos. Alto contraste.",
    recommended_colors: ["#8B0000", "#2F4F4F", "#556B2F", "#8B4513", "#800000", "#B8860B"],
    avoid_colors: ["#FFE4E1", "#E0FFFF", "#FFB6C1"],
    best_neutrals: ["#2F4F4F", "#8B4513", "#696969", "#A0522D"]
  },

  invierno_profundo: {
    description: "Colores profundos, fríos, saturados. Alto contraste.",
    recommended_colors: ["#000000", "#0000CD", "#8B0000", "#4B0082", "#2F4F4F", "#C71585"],
    avoid_colors: ["#F5DEB3", "#FFE4B5", "#FFDAB9"],
    best_neutrals: ["#000000", "#FFFFFF", "#2F4F4F", "#696969"]
  },

  invierno_frio: {
    description: "Colores fríos, saturados, icy. Undertone muy frío.",
    recommended_colors: ["#0000FF", "#00CED1", "#C71585", "#4B0082", "#FF1493", "#1E90FF"],
    avoid_colors: ["#FF8C00", "#DAA520", "#CD853F"],
    best_neutrals: ["#000000", "#FFFFFF", "#C0C0C0", "#708090"]
  },

  invierno_brillante: {
    description: "Colores brillantes, saturados, contrastados. Muy alto contraste.",
    recommended_colors: ["#FF0000", "#0000FF", "#FF1493", "#00FF00", "#FFFF00", "#FF00FF"],
    avoid_colors: ["#D2B48C", "#BC8F8F", "#BDB76B"],
    best_neutrals: ["#000000", "#FFFFFF", "#FF0000", "#0000FF"]
  }
};

// =====================================================
// ESCALA DE FORMALIDAD (1-5)
// =====================================================

const FORMALITY_KEYWORDS: Record<number, string[]> = {
  1: ["casa", "súper", "gym", "pijama", "relax", "descanso"],
  2: ["bar", "cine", "paseo", "café", "parque", "informal"],
  3: ["oficina moderna", "cita", "cena", "reunión casual", "evento diurno"],
  4: ["oficina corporativa", "entrevista", "reunión importante", "conferencia"],
  5: ["boda", "gala", "evento de etiqueta", "premiación", "cóctel formal"]
};

// =====================================================
// FUNCIONES DE UTILIDAD
// =====================================================

/**
 * Detecta nivel de formalidad basado en keywords
 */
function detectFormalityLevel(occasion: string): number {
  const lowerOccasion = occasion.toLowerCase();

  for (const [level, keywords] of Object.entries(FORMALITY_KEYWORDS)) {
    if (keywords.some(keyword => lowerOccasion.includes(keyword))) {
      return parseInt(level);
    }
  }

  // Default: smart casual
  return 3;
}

/**
 * Filtra inventario eliminando prendas incompatibles
 */
function applyHardFilters(
  closet: ClothingItem[],
  profile: ProfessionalProfile,
  formalityLevel: number,
  weather?: WeatherData
): ClothingItem[] {
  return closet.filter(item => {
    const meta = item.metadata;

    // Filtro 1: Lista "Hates"
    const hatesMatch = profile.preferences.hates.some(hate =>
      meta.subcategory.toLowerCase().includes(hate.toLowerCase()) ||
      meta.vibe_tags.some(tag => tag.toLowerCase().includes(hate.toLowerCase()))
    );
    if (hatesMatch) return false;

    // Filtro 2: Clima (si está disponible)
    if (weather) {
      const temp = weather.temp;

      // Demasiado frío para verano
      if (temp < 15 && meta.seasons.includes('summer') && !meta.seasons.includes('winter')) {
        return false;
      }

      // Demasiado calor para invierno
      if (temp > 25 && meta.seasons.includes('winter') && !meta.seasons.includes('summer')) {
        return false;
      }
    }

    // Filtro 3: Formalidad (básico por ahora, se puede mejorar con metadata de formality)
    if (formalityLevel >= 4) {
      // Eventos formales: evitar deportivo/gym
      if (meta.vibe_tags.includes('sporty') || meta.subcategory.includes('jogger')) {
        return false;
      }
    }

    if (formalityLevel === 1) {
      // Ultra casual: cualquier cosa vale
      return true;
    }

    return true;
  });
}

/**
 * Construye el system prompt profesional
 */
function buildProfessionalPrompt(
  profile: ProfessionalProfile,
  formalityLevel: number,
  occasion: string,
  weather?: WeatherData,
  tonePreference: 'concise' | 'balanced' | 'detailed' = 'balanced'
): string {
  const morphologyRule = MORPHOLOGY_RULES[profile.morphology.body_shape];
  const colorPalette = COLOR_PALETTES[profile.colorimetry.color_season];
  const toneInstructions = getToneInstructions(tonePreference);

  // Determinar necesidades de capas según clima
  let layeringNeeds = "";
  if (weather) {
    if (weather.temp < 15) {
      layeringNeeds = "Clima frío: priorizar capas (base + intermedia + externa si es necesario). Texturas densas (lana, cuero, denim grueso).";
    } else if (weather.temp > 25) {
      layeringNeeds = "Clima cálido: fibras naturales (lino, algodón), cortes holgados, evitar capas innecesarias.";
    } else {
      layeringNeeds = "Clima templado: capas ligeras que se puedan quitar (cardigans, blazers).";
    }

    if (weather.condition.toLowerCase().includes('rain') || weather.condition.toLowerCase().includes('lluvia')) {
      layeringNeeds += " LLUVIA: priorizar calzado impermeable, evitar bajos que arrastren.";
    }
  }

  return `Eres un estilista personal profesional experto en imagen, colorimetría y morfología.

**TONO Y PERSONALIDAD**:
- Español Rioplatense (Argentina/Uruguay). Usá voseo ("vos", "tu estilo").
- Cercano, empático, profesional pero relajado.
- Filosofía: "Menos reglas rígidas, más buenas razones". La moda es expresión personal.
- LÍMITE ÉTICO: Cero body-shaming. El objetivo es equilibrar y potenciar, NUNCA criticar el cuerpo.

${toneInstructions}

**PERFIL DEL USUARIO**:

**Morfología: ${profile.morphology.body_shape.toUpperCase()}**
${morphologyRule}

**Colorimetría: ${profile.colorimetry.color_season.replace('_', ' ').toUpperCase()}**
- Descripción: ${colorPalette.description}
- Colores recomendados cerca del rostro: ${colorPalette.recommended_colors.slice(0, 4).join(', ')}
- Evitar cerca del rostro: ${colorPalette.avoid_colors.join(', ')}
- Mejores neutros: ${colorPalette.best_neutrals.join(', ')}

**Preferencias Personales**:
- ❤️ AMA: ${profile.preferences.loves.join(', ') || 'No especificado'}
- ❌ EVITA: ${profile.preferences.hates.join(', ') || 'No especificado'}

**CONTEXTO DE LA OCASIÓN**:
- Ocasión: "${occasion}"
- Formalidad: ${formalityLevel}/5 (1=ultra casual, 5=etiqueta)
${weather ? `- Clima: ${weather.temp}°C, ${weather.condition}` : ''}
${layeringNeeds}

**INSTRUCCIONES PARA GENERAR EL OUTFIT** (Chain-of-Thought):

1. **Análisis de Contexto**: Define las necesidades térmicas y el mood de la ocasión.

2. **Construcción del Look**:
   - Elegí la MEJOR combinación del inventario (Top + Bottom + Shoes)
   - RESPETÁ las reglas de morfología del usuario (equilibrar silueta)
   - VERIFICÁ armonía cromática con su paleta personal
   - ASEGÚRATE de que la formalidad coincida (${formalityLevel}/5)
   - Si el clima lo pide, considerá abrigo/accesorios

3. **Generación de Explicación Educativa**:
   - **Tu Cuerpo**: Explicá brevemente por qué esta combinación favorece su morfología
   - **Tus Colores**: Explicá por qué estos colores armonizan con su paleta
   - **El Mood**: Por qué encaja con la ocasión y el clima

**REGLAS CRÍTICAS**:
- SIEMPRE usá EXACTAMENTE los IDs del inventario (nunca inventes o modifiques IDs)
- Si falta una pieza esencial, podés sugerirla en missing_piece_suggestion
- Máximo 3 colores acento por outfit (sin contar neutros como negro, blanco, beige, denim)
- Colores de la paleta personal SIEMPRE cerca del rostro (tops, pañuelos, accesorios superiores)

Respondé en formato JSON estructurado según el schema.`;
}

/**
 * Schema JSON para ProfessionalFitResult
 */
const professionalOutfitSchema = {
  type: Type.OBJECT,
  properties: {
    top_id: { type: Type.STRING },
    bottom_id: { type: Type.STRING },
    shoes_id: { type: Type.STRING },
    explanation: { type: Type.STRING },
    missing_piece_suggestion: {
      type: Type.OBJECT,
      properties: {
        item_name: { type: Type.STRING },
        reason: { type: Type.STRING }
      },
      required: []
    },
    educational: {
      type: Type.OBJECT,
      properties: {
        morphology_explanation: { type: Type.STRING },
        colorimetry_explanation: { type: Type.STRING },
        mood_explanation: { type: Type.STRING }
      },
      required: ['morphology_explanation', 'colorimetry_explanation', 'mood_explanation']
    },
    ui_metadata: {
      type: Type.OBJECT,
      properties: {
        mood_color_hex: { type: Type.STRING },
        vibe: {
          type: Type.STRING,
          enum: ['elegante', 'casual', 'sporty', 'bohemian', 'minimalist', 'edgy', 'romantic']
        },
        formality_level: { type: Type.NUMBER }
      },
      required: ['mood_color_hex', 'vibe', 'formality_level']
    },
    item_names: {
      type: Type.OBJECT,
      properties: {
        top_name: { type: Type.STRING },
        bottom_name: { type: Type.STRING },
        shoes_name: { type: Type.STRING },
        accessories_name: { type: Type.STRING }
      },
      required: []
    }
  },
  required: ['top_id', 'bottom_id', 'shoes_id', 'explanation']
};

// =====================================================
// FUNCIÓN PRINCIPAL
// =====================================================

/**
 * Genera outfit profesional usando morfología, colorimetría y reglas de estilo
 */
export async function generateProfessionalOutfit(
  closet: ClothingItem[],
  profile: ProfessionalProfile,
  occasion: string,
  weather?: WeatherData,
  tonePreference: 'concise' | 'balanced' | 'detailed' = 'balanced'
  // ⛔ SECURITY: apiKey parameter removed - service must use Edge Functions or pre-configured API
): Promise<ProfessionalFitResult> {
  // Validación básica
  if (!closet || closet.length < 3) {
    throw new Error('Se necesitan al menos 3 prendas en el armario para generar un outfit');
  }

  // 1. Detectar formalidad
  const formalityLevel = detectFormalityLevel(occasion);

  // 2. Aplicar filtros duros
  const filteredCloset = applyHardFilters(closet, profile, formalityLevel, weather);

  if (filteredCloset.length < 3) {
    throw new Error('No hay suficientes prendas compatibles después de aplicar filtros. Intenta con otra ocasión o revisa tus preferencias.');
  }

  // 3. Simplificar inventario (solo metadata, sin imágenes para ahorrar tokens)
  const simplifiedInventory = filteredCloset.map(item => ({
    id: item.id,
    metadata: item.metadata
  }));

  // 4. Construir prompt profesional
  const systemPrompt = buildProfessionalPrompt(profile, formalityLevel, occasion, weather, tonePreference);

  // 5. Llamar a Gemini usando el servicio pre-configurado (via Edge Functions)
  // ⛔ SECURITY: API key must be configured server-side via Edge Functions, not passed from client-side env

  // Usar el servicio con el system prompt profesional y schema extendido
  const parsed = await aiService.generateOutfitWithCustomPrompt(
    occasion,
    filteredCloset,
    systemPrompt,
    professionalOutfitSchema
  ) as ProfessionalFitResult;

  // 6. Validar que los IDs existan en el closet filtrado (que es lo que ve Gemini)
  const topExists = filteredCloset.find(item => item.id === parsed.top_id);
  const bottomExists = filteredCloset.find(item => item.id === parsed.bottom_id);
  const shoesExists = filteredCloset.find(item => item.id === parsed.shoes_id);

  if (!topExists || !bottomExists || !shoesExists) {
    throw new Error('El modelo generó IDs inválidos. Intenta de nuevo.');
  }

  // 7. Enriquecer con nombres descriptivos si no vienen
  if (!parsed.item_names) {
    parsed.item_names = {
      top_name: `${topExists.metadata.subcategory} ${topExists.metadata.color_primary}`,
      bottom_name: `${bottomExists.metadata.subcategory} ${bottomExists.metadata.color_primary}`,
      shoes_name: `${shoesExists.metadata.subcategory} ${shoesExists.metadata.color_primary}`
    };
  }

  return parsed;
}

/**
 * Versión simplificada para compatibilidad con edge functions
 * (no requiere pasar closet completo, solo IDs filtrados)
 */
export function buildProfessionalPromptForEdgeFunction(
  profile: ProfessionalProfile,
  occasion: string,
  weather?: WeatherData,
  tonePreference: 'concise' | 'balanced' | 'detailed' = 'balanced'
): { systemPrompt: string; formalityLevel: number } {
  const formalityLevel = detectFormalityLevel(occasion);
  const systemPrompt = buildProfessionalPrompt(profile, formalityLevel, occasion, weather, tonePreference);

  return { systemPrompt, formalityLevel };
}
