/**
 * AI Tone Helper - Gestiona las preferencias de tono de las respuestas de IA
 *
 * Este módulo proporciona instrucciones específicas de tono para los diferentes
 * niveles de detalle que el usuario puede elegir en sus preferencias.
 */

export type AITone = 'concise' | 'balanced' | 'detailed';

// Cache para evitar lecturas repetidas de localStorage
let _cachedTone: AITone | null = null;
let _cachedInstructions: string | null = null;

/**
 * Obtiene la preferencia de tono almacenada en localStorage (con caché)
 */
export function getAITone(): AITone {
    if (_cachedTone) return _cachedTone;

    const stored = localStorage.getItem('ojodeloca-ai-tone');
    _cachedTone = (stored as AITone) || 'balanced';
    return _cachedTone;
}

/**
 * Limpia el caché de tono (útil cuando el usuario cambia la preferencia)
 */
export function clearToneCache(): void {
    _cachedTone = null;
    _cachedInstructions = null;
}

/**
 * Configuraciones de tono por tipo
 */
const TONE_CONFIGS = {
    concise: {
        name: 'Conciso',
        description: 'Directo y breve',
        instructions: `
TONO DE RESPUESTA: CONCISO 💬

Directrices:
- Sé directo y al grano
- Usa frases cortas y simples
- Elimina adornos y palabrería innecesaria
- Prioriza la información esencial
- Máximo 2-3 oraciones para explicaciones

Ejemplo CORRECTO (Conciso):
"Camisa blanca + jean azul + zapatillas = look casual elegante. Colores neutros que armonizan bien."

Ejemplo INCORRECTO (Demasiado detallado):
"He seleccionado esta increíble combinación porque la camisa blanca es una pieza atemporal que funciona perfectamente con el jean azul, creando una paleta de colores armoniosa y sofisticada. Las zapatillas blancas añaden un toque moderno y casual que balancea la elegancia de la camisa..."

IMPORTANTE: Mantén tus respuestas cortas pero amigables. Directo ≠ robótico.
`
    },
    balanced: {
        name: 'Balanceado',
        description: 'Término medio',
        instructions: `
TONO DE RESPUESTA: BALANCEADO ⚖️

Directrices:
- Equilibrio entre brevedad y detalle
- Explica lo necesario sin ser exhaustivo
- Usa un lenguaje natural y amigable
- Incluye contexto cuando agrega valor
- 3-5 oraciones para explicaciones

Ejemplo CORRECTO (Balanceado):
"Camisa blanca + jean azul + zapatillas blancas. Esta combinación crea un look casual elegante perfecto para una cita: los colores neutros (blanco + azul) armonizan naturalmente y proyectan sofisticación sin esfuerzo. Las zapatillas añaden un toque moderno que mantiene el outfit accesible."

IMPORTANTE: No te extiendas demasiado, pero tampoco seas telegráfico. Encuentra el balance.
`
    },
    detailed: {
        name: 'Detallado',
        description: 'Explicaciones completas',
        instructions: `
TONO DE RESPUESTA: DETALLADO 📚

Directrices:
- Proporciona explicaciones completas y contextuales
- Incluye el "por qué" detrás de cada decisión
- Educa al usuario sobre teoría del color, estilo, etc.
- Ofrece alternativas y sugerencias adicionales
- Usa lenguaje descriptivo y evocativo
- 5-8+ oraciones para explicaciones

Ejemplo CORRECTO (Detallado):
"He creado esta combinación pensando en la ocasión: una primera cita casual. La camisa blanca es una elección estratégica porque proyecta limpieza, sofisticación y confianza sin parecer intimidante. El jean azul complementa perfectamente creando una paleta neutra y armoniosa (teoría del color: monocromático con variación de intensidad). Las zapatillas blancas modernizan el look y lo hacen más accesible, evitando la formalidad excesiva de zapatos de vestir. Este outfit comunica 'me importa mi apariencia pero no estoy tratando demasiado', que es el mensaje ideal para una primera cita. Como alternativa, podrías considerar..."

IMPORTANTE: Sé generoso con las explicaciones, pero mantén la coherencia y relevancia.
`
    }
};

/**
 * Obtiene las instrucciones de tono para incluir en prompts de IA (con caché)
 * @param customTone - Tono específico a usar (opcional, si no se proporciona usa el almacenado)
 */
export function getToneInstructions(customTone?: AITone): string {
    const tone = customTone || getAITone();

    // Si no se especifica tono custom y tenemos caché, usarlo
    if (!customTone && _cachedInstructions && _cachedTone === tone) {
        return _cachedInstructions;
    }

    const instructions = TONE_CONFIGS[tone].instructions;

    // Cachear solo si no es custom tone
    if (!customTone) {
        _cachedInstructions = instructions;
    }

    return instructions;
}

/**
 * Obtiene el nombre del tono actual
 */
export function getToneName(customTone?: AITone): string {
    const tone = customTone || getAITone();
    return TONE_CONFIGS[tone].name;
}

/**
 * Obtiene la descripción del tono actual
 */
export function getToneDescription(customTone?: AITone): string {
    const tone = customTone || getAITone();
    return TONE_CONFIGS[tone].description;
}
