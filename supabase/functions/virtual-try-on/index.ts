// Supabase Edge Function: Virtual Try-On with Nano Banana Pro (Gemini 3.1 Flash Image Preview)
// Supports flexible slot system for layered outfits
// Uses gemini-3.1-flash-image-preview for superior identity preservation and quality
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenAI } from 'npm:@google/genai@1.27.0';
import { enforceRateLimit, recordRequestResult } from '../_shared/antiAbuse.ts';
import { enforceAIBudgetGuard, getBudgetLimitMessage, recordAIBudgetSuccess } from '../_shared/aiBudgetGuard.ts';
import { withRetry } from '../_shared/retry.ts';
import { isFailClosedHighCostEnabled } from '../_shared/security.ts';

const MONTH_SECONDS = 60 * 60 * 24 * 30;
const getMonthlyLimit = (envName: string, fallback: number) => {
    const raw = Deno.env.get(envName);
    if (!raw) return fallback;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
};

// Slot configuration with layer order and labels
const SLOT_CONFIG: Record<string, { label: string; layerOrder: number; bodyPart: string; isFullBody?: boolean }> = {
    'top_base': { label: 'remera/camisa base', layerOrder: 1, bodyPart: 'torso' },
    'top_mid': { label: 'buzo/sweater', layerOrder: 2, bodyPart: 'torso' },
    'outerwear': { label: 'campera/abrigo', layerOrder: 3, bodyPart: 'torso' },
    'one_piece': { label: 'vestido/enterito (CUBRE TODO EL CUERPO - torso y piernas)', layerOrder: 1, bodyPart: 'cuerpo completo', isFullBody: true },
    'bottom': { label: 'pantalón/falda', layerOrder: 4, bodyPart: 'piernas' },
    'shoes': { label: 'calzado', layerOrder: 5, bodyPart: 'pies' },
    'head': { label: 'gorro/sombrero', layerOrder: 6, bodyPart: 'cabeza' },
    'eyewear': { label: 'anteojos', layerOrder: 7, bodyPart: 'cara' },
    'bag': { label: 'bolso/cartera', layerOrder: 8, bodyPart: 'accesorio' },
    'hand_acc': { label: 'reloj/pulsera', layerOrder: 9, bodyPart: 'muñeca' },
};

// V13: Nano Banana Pro (gemini-3.1-flash-image-preview)
// Capabilities: Up to 14 reference images, maintains consistency of up to 5 people
// Best practices: Concise technical instructions, leverage "Thinking" for composition

// Background instructions per preset (short and direct)
const PRESET_INSTRUCTIONS: Record<string, string> = {
    'overlay': 'No modifiques el fondo ni la iluminación original.',
    'studio': 'Coloca a la persona en un estudio fotográfico con fondo gris neutro e iluminación profesional softbox.',
    'editorial': 'Coloca a la persona en un set editorial de moda con iluminación dramática estilo revista.',
    'selfie': 'No modifiques el fondo.',
    'casual': 'Fondo neutro de estudio.',
    'pro': 'Fondo editorial premium.',
    'mirror_selfie': 'Coloca a la persona frente a un espejo de cuerpo completo en un dormitorio o vestidor aesthetic. Simula una selfie de espejo con iluminación natural suave. Incluye el reflejo en el espejo.',
    'street': 'Coloca a la persona en una calle urbana con edificios y ambiente de ciudad. Iluminación natural de día.',
    'golden_hour': 'Coloca a la persona en exterior con iluminación dorada de atardecer. Tonos cálidos y ambiente romántico.',
    'minimalist': 'Fondo blanco puro limpio. Iluminación suave y uniforme estilo catálogo.',
    'coffee_shop': 'Coloca a la persona en una cafetería aesthetic con plantas, luces cálidas y ambiente acogedor.',
    'home': 'Coloca a la persona en un living moderno y aesthetic. Iluminación natural de ventana.',
    'custom': '', // Uses customScene parameter
};

// Build scene instruction - handles custom scenes
function getSceneInstruction(preset: string, customScene?: string): string {
    if (preset === 'custom' && customScene && customScene.trim().length > 0) {
        const scene = customScene.trim().substring(0, 200); // Limit length for safety
        return `Coloca a la persona en: ${scene}. Iluminación natural y ambiente realista.`;
    }
    return PRESET_INSTRUCTIONS[preset] || PRESET_INSTRUCTIONS['overlay'];
}

type PromptSlotInfo = { slot: string; config: { label: string; bodyPart: string } };

/**
 * V13: Nano Banana Pro (Gemini 3.1 Flash Image Preview)
 *
 * Key capabilities:
 * - Supports up to 14 reference images
 * - Maintains identity consistency for up to 5 people
 * - Localized editing with "Thinking" reasoning
 * - 1K/2K/4K resolution output
 *
 * Strategy:
 * - Images 1-3: Face references (identity anchors)
 * - Image 4: Full body photo (pose reference)
 * - Images 5+: Clothing items to apply
 */
function buildTryOnPrompt(
    slots: PromptSlotInfo[],
    preset: string,
    _modelId: string,
    hasFaceReferences: boolean = false,
    customScene?: string,
    keepPose: boolean = false,
    view: string = 'front',
    slotFits?: Record<string, string>
): string {
    // Build clothing description with fabric hints
    const clothingDesc = slots
        .map(s => {
            const label = s.config.label;
            const fit = slotFits?.[s.slot] || 'regular';
            const fitText = fit !== 'regular' ? `(${fit} fit)` : '';
            return `${label} ${fitText}`.trim();
        })
        .join(', ');

    // View instructions
    let viewInstruction = 'Front view';
    if (view === 'back') {
        viewInstruction = 'BACK VIEW (showing the back of the garment/person)';
    } else if (view === 'side') {
        viewInstruction = 'SIDE PROFILE VIEW';
    }

    const backgroundInstruction = getSceneInstruction(preset, customScene);

    // V15: Support for keepPose mode - better face consistency when preserving original pose
    const faceRefInstructions = hasFaceReferences
        ? `The first images are FACE REFERENCES - use them to recreate the EXACT face.`
        : `Image 1 shows the person. Focus on their FACE for identity.`;

    // When keepPose is ON: preserve exact pose for better face consistency
    // When keepPose is OFF: keep pose by default, allow only subtle adjustments
    const poseInstructions = keepPose
        ? `BODY & POSE (PRESERVE ORIGINAL):
- KEEP THE EXACT SAME POSE from the reference photo
- Same body position, same arm placement, same angle
- Only change the clothing, NOT the pose or framing
- This maximizes face consistency`
        : `BODY & POSE (DEFAULT):
- Keep the original pose and framing as much as possible
- Minor natural adjustments are allowed only if needed for realistic garment fit
- Do NOT force a different pose unless the user explicitly asks for it`;

    return `Virtual try-on: Dress this person in the clothing shown.

VIEW ANGLE: ${viewInstruction}

${faceRefInstructions}

FACE IDENTITY (HIGHEST PRIORITY):
- The face MUST look exactly like the reference photos
- Same facial structure, eyes, nose, mouth, skin tone
- Same hairstyle and hair color
- This is MORE important than body pose

${poseInstructions}

CLOTHING TO APPLY: ${clothingDesc}

QUALITY:
- Photorealistic result
- Natural fabric draping
- Consistent lighting

${backgroundInstruction}`;
}

/**
 * Check if string is a valid image source (base64 or URL)
 */
function isValidImageSource(src: unknown): boolean {
    if (typeof src !== 'string' || src.length === 0) return false;
    if (src.includes('base64,')) return true;
    if (src.startsWith('http://') || src.startsWith('https://')) return true;
    return false;
}

/**
 * Convert image source to base64 data URL
 */
async function toBase64DataUrl(src: string): Promise<string> {
    if (src.includes('base64,')) {
        return src;
    }

    if (src.startsWith('http://') || src.startsWith('https://')) {
        const response = await fetch(src);
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.status}`);
        }
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const arrayBuffer = await response.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        let binary = '';
        const chunkSize = 0x8000; // 32KB chunks
        for (let i = 0; i < uint8Array.length; i += chunkSize) {
            const chunk = uint8Array.subarray(i, i + chunkSize);
            const chunkChars = Array.from(chunk);
            binary += String.fromCharCode.apply(null, chunkChars);
        }
        const base64 = btoa(binary);
        return `data:${contentType};base64,${base64}`;
    }

    throw new Error('Invalid image source');
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    let supabase: any = null;
    let userId: string | null = null;

    try {
        const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
        if (!geminiApiKey) {
            throw new Error('Missing GEMINI_API_KEY');
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');
        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Missing Supabase credentials');
        }

        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Missing authorization header' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        supabase = createClient(supabaseUrl, supabaseServiceKey, {
            global: { headers: { Authorization: authHeader } },
        });

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }
        userId = user.id;

        // Beta allowlist check
        const allowlistRaw = Deno.env.get('BETA_ALLOWLIST_EMAILS');
        if (allowlistRaw) {
            const email = (user.email || '').toLowerCase().trim();
            const allowed = allowlistRaw.split(',').map((e) => e.toLowerCase().trim()).filter(Boolean);
            if (!email || !allowed.includes(email)) {
                return new Response(
                    JSON.stringify({ error: 'Beta cerrada: tu cuenta no está habilitada todavía.' }),
                    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }
        }

        // SAFETY: Strict rate limit for expensive generation
        // Max 4 requests per 2 minutes per user to prevent rapid credit drain
        const rateLimit = await enforceRateLimit(supabase, user.id, 'virtual-try-on', {
            maxRequests: 4,
            windowSeconds: 120, // 2 minutes
        });
        if (rateLimit.guardError && isFailClosedHighCostEnabled()) {
            return new Response(
                JSON.stringify({ error: 'Security guard unavailable. Try again shortly.' }),
                { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }
        if (!rateLimit.allowed) {
            const retryAfter = rateLimit.retryAfterSeconds || 60;
            const message = rateLimit.reason === 'blocked'
                ? 'Detectamos muchos errores seguidos. Espera unos minutos antes de intentar de nuevo.'
                : 'Demasiadas solicitudes en poco tiempo. Espera un momento y reintenta.';
            return new Response(
                JSON.stringify({ error: message }),
                {
                    status: 429,
                    headers: {
                        ...corsHeaders,
                        'Content-Type': 'application/json',
                        'Retry-After': String(retryAfter),
                    },
                }
            );
        }

        // Payload size guard
        const contentLength = req.headers.get('content-length');
        if (contentLength && Number(contentLength) > 10_000_000) { // 10MB for multiple images
            return new Response(
                JSON.stringify({ error: 'Payload too large' }),
                { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Parse request body
        // Supports both legacy format (topImage, bottomImage, shoesImage) and new slot format
        const body = await req.json();
        const { userImage, slots, preset, customScene, keepPose, useFaceReferences, view, slotFits } = body;

        // Legacy support: convert old format to slots
        let slotImages: Record<string, string> = {};
        if (slots && typeof slots === 'object') {
            slotImages = slots;
        } else {
            // Legacy format
            if (body.topImage) slotImages['top_base'] = body.topImage;
            if (body.bottomImage) slotImages['bottom'] = body.bottomImage;
            if (body.shoesImage) slotImages['shoes'] = body.shoesImage;
        }

        // Validate user image
        if (!isValidImageSource(userImage)) {
            return new Response(
                JSON.stringify({ error: 'Falta la foto del usuario' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Filter valid slots and validate at least one clothing item
        const validSlots = Object.entries(slotImages)
            .filter(([slot, img]) => SLOT_CONFIG[slot] && isValidImageSource(img))
            .map(([slot, img]) => ({ slot, img: img as string, config: SLOT_CONFIG[slot] }));

        if (validSlots.length === 0) {
            return new Response(
                JSON.stringify({ error: 'Necesitás al menos una prenda para generar el look' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Limit to 13 items max (Nano Banana Pro supports 14 images, 1 for user photo)
        if (validSlots.length > 13) {
            return new Response(
                JSON.stringify({ error: 'Máximo 13 prendas por generación' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Sort by layer order (inner to outer)
        validSlots.sort((a, b) => a.config.layerOrder - b.config.layerOrder);

        // Fetch face references for identity preservation (only if enabled)
        const shouldUseFaceRefs = useFaceReferences !== false; // Default to true
        let faceReferenceUrls: string[] = [];

        if (shouldUseFaceRefs) {
            const { data: faceRefs } = await supabase
                .from('face_references')
                .select('image_url')
                .eq('user_id', user.id)
                .order('is_primary', { ascending: false })
                .limit(3);

            faceReferenceUrls = (faceRefs || []).map((r: { image_url: string }) => r.image_url).filter(Boolean);
        }
        console.log(`Face references: enabled=${shouldUseFaceRefs}, found=${faceReferenceUrls.length}`);

        // Convert all images to base64
        const [userImageBase64, ...clothingImagesBase64] = await Promise.all([
            toBase64DataUrl(userImage),
            ...validSlots.map(s => toBase64DataUrl(s.img))
        ]);

        // Convert face references to base64 (if any)
        const faceRefBase64 = await Promise.all(
            faceReferenceUrls.map(url => toBase64DataUrl(url).catch(() => null))
        ).then(results => results.filter(Boolean) as string[]);

        const ai = new GoogleGenAI({ apiKey: geminiApiKey });

        // Single-model mode: always use Gemini 3.1 Flash Image Preview
        const modelId = 'gemini-3.1-flash-image-preview';

        const monthlyLimit = getMonthlyLimit('BETA_MONTHLY_TRYON_PRO_LIMIT', 10);
        if (monthlyLimit > 0) {
            const monthlyCap = await enforceRateLimit(supabase, user.id, 'beta-tryon-pro-monthly', {
                windowSeconds: MONTH_SECONDS,
                maxRequests: monthlyLimit,
            });
            if (!monthlyCap.allowed) {
                return new Response(
                    JSON.stringify({ error: 'Límite mensual de probador virtual alcanzado. Probá de nuevo el próximo mes.' }),
                    { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }
        }

        // Credit cost for the unified high-quality model
        const creditCost = 4;

        const budgetGuard = await enforceAIBudgetGuard(supabase, user.id, 'virtual-try-on', creditCost);
        if (budgetGuard.guardError && isFailClosedHighCostEnabled()) {
            return new Response(
                JSON.stringify({ error: 'Budget guard unavailable. Try again shortly.' }),
                { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }
        if (!budgetGuard.allowed) {
            return new Response(
                JSON.stringify({ error: getBudgetLimitMessage(budgetGuard.reason) }),
                {
                    status: 429,
                    headers: {
                        ...corsHeaders,
                        'Content-Type': 'application/json',
                        'Retry-After': String(budgetGuard.retryAfterSeconds || 60),
                    },
                }
            );
        }

        // Quota check (credits)
        const { data: canUse, error: canUseError } = await supabase.rpc('can_user_generate_outfit', {
            p_user_id: user.id,
            p_amount: creditCost,
        });
        if (canUseError) {
            console.error('Quota check failed:', canUseError);
            return new Response(
                JSON.stringify({ error: 'No se pudo validar la cuota. Intentá de nuevo.' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }
        if (!canUse) {
            return new Response(
                JSON.stringify({ error: 'No tenés créditos suficientes. Upgradeá tu plan para continuar.' }),
                { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Resolution for the unified high-quality model
        const imageSize = '2K';

        // Build image parts - Order: Face refs (identity) -> User photo (pose) -> Clothing
        const imageParts: Array<{ inlineData: { data: string; mimeType: string } }> = [];

        // 1. Add face reference images FIRST (identity anchors)
        for (const base64Img of faceRefBase64) {
            const [mime, base64] = base64Img.split(';base64,');
            if (base64 && mime) {
                imageParts.push({
                    inlineData: {
                        data: base64,
                        mimeType: mime.split(':')[1]
                    }
                });
            }
        }

        // 2. Add user body photo (pose reference)
        const [userMime, userBase64] = userImageBase64.split(';base64,');
        if (userBase64 && userMime) {
            imageParts.push({
                inlineData: {
                    data: userBase64,
                    mimeType: userMime.split(':')[1]
                }
            });
        }

        // 3. Add clothing images
        for (const base64Img of clothingImagesBase64) {
            const [mime, base64] = base64Img.split(';base64,');
            if (base64 && mime) {
                imageParts.push({
                    inlineData: {
                        data: base64,
                        mimeType: mime.split(':')[1]
                    }
                });
            }
        }

        // Build dynamic prompt - pass face reference info, custom scene, and keepPose
        const presetName = (preset as string) || 'overlay';
        const hasFaceRefs = faceRefBase64.length > 0;
        const customSceneText = typeof customScene === 'string' ? customScene : undefined;
        const shouldKeepPose = keepPose === true;
        const viewAngle = (view as string) || 'front';
        const fits = (slotFits as Record<string, string>) || {};

        const prompt = buildTryOnPrompt(validSlots, presetName, modelId, hasFaceRefs, customSceneText, shouldKeepPose, viewAngle, fits);
        const generationConfig: { [key: string]: unknown } = {
          responseModalities: ['IMAGE'],
          ...(imageSize ? { imageSize } : {}),
        };

        const response = await withRetry(() =>
            ai.models.generateContent({
                model: modelId,
                contents: {
                    parts: [
                        { text: prompt },
                        ...imageParts
                    ],
                },
                config: {
                    ...generationConfig,
                },
            })
        );

        const candidate = response.candidates?.[0];
        const parts = candidate?.content?.parts ?? [];
        const imagePart = parts.find((p: any) => p?.inlineData?.data);

        if (!imagePart?.inlineData?.data) {
            throw new Error("No se pudo generar la imagen. Intentá con otras prendas.");
        }

        // Increment usage
        const { data: incremented, error: incError } = await supabase.rpc('increment_ai_generation_usage', {
            p_user_id: user.id,
            p_amount: creditCost,
        });
        if (incError) {
            console.error('Usage increment failed:', incError);
        }
        await recordAIBudgetSuccess(supabase, user.id, 'virtual-try-on', incremented ? creditCost : 0);

        const resultImage = `data:image/png;base64,${imagePart.inlineData.data}`;

        await recordRequestResult(supabase, user.id, 'virtual-try-on', true);

        return new Response(JSON.stringify({
            resultImage,
            model: modelId,
            slotsUsed: validSlots.map(s => s.slot),
            faceReferencesUsed: faceRefBase64.length,
            credits_used: incremented ? creditCost : 0,
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Error in virtual-try-on:', error);
        if (supabase && userId) {
            await recordRequestResult(supabase, userId, 'virtual-try-on', false);
        }
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : 'Error desconocido' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
