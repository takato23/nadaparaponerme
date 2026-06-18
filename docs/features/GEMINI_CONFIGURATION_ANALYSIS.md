# 🔑 Gemini API Configuration Analysis

## 📊 Executive Summary

El proyecto "No Tengo Nada Para Ponerme" utiliza Google Gemini AI en **DOS arquitecturas diferentes**:
1. **Frontend directo**: Llamadas desde el navegador usando `@google/genai` SDK
2. **Edge Functions**: Llamadas desde Supabase Edge Functions (serverless)

La elección entre estas arquitecturas está controlada por el feature flag `useSupabaseAI`.

---

## 🏗️ Arquitectura del Sistema

### Diagrama de Flujo
```
Usuario → Frontend (React)
            ↓
    aiService.ts (Router)
            ↓
    ┌───────┴───────┐
    ↓               ↓
Edge Functions   geminiService.ts
(Supabase)      (Direct API)
    ↓               ↓
Gemini API    Gemini API
```

### Componentes Clave

#### 1. `src/services/aiService.ts` (Router)
- **Propósito**: Servicio unificado que decide qué arquitectura usar
- **Lógica**: Usa feature flag `useSupabaseAI` para decidir
- **Fallback**: Si Edge Function falla, usa API directa

#### 2. `services/geminiService.ts` (Direct API)
- **Propósito**: Todas las funciones de IA (26+ funciones)
- **Configuración**: Requiere `configureGeminiAPI(apiKey)` antes de usar
- **Seguridad**: API key NO debe estar en el código del cliente en producción

#### 3. Edge Functions (Supabase)
- **analyze-clothing**: Analiza imágenes de ropa con Gemini Vision
- **generate-outfit**: Genera combinaciones de ropa
- **generate-packing-list**: Sugiere lista de packing inteligente

---

## 🔐 Configuración de API Keys

### Frontend (Desarrollo Local)
**Archivo**: `.env.local`
```bash
VITE_GEMINI_API_KEY=<YOUR_GEMINI_API_KEY>
```

**Estado**: ✅ Configurado correctamente

**Uso**:
- Solo en desarrollo (`import.meta.env.DEV`)
- Permite testing sin Edge Functions
- Se configura automáticamente en `aiService.ts:15-21`

### Backend (Supabase Edge Functions)
**Variable**: `GEMINI_API_KEY` (sin prefijo VITE)

**Comando para configurar**:
```bash
supabase secrets set GEMINI_API_KEY=<YOUR_GEMINI_API_KEY>
```

**Estado**: ⚠️ REQUIERE CONFIGURACIÓN MANUAL

**Uso**:
- Todas las Edge Functions leen desde `Deno.env.get('GEMINI_API_KEY')`
- Solo disponible en el servidor (no expuesta al cliente)
- Necesaria para producción

---

## 📋 Inventario de Funciones que Usan Gemini

### Tier 1: Edge Functions Disponibles (3)
✅ Implementadas con fallback a API directa
1. **analyzeClothingItem** - Análisis de imágenes de ropa
2. **generateOutfit** - Generación de combinaciones
3. **generatePackingList** - Listas de packing inteligentes

### Tier 2: Solo API Directa (23)
⚠️ Requieren `VITE_GEMINI_API_KEY` en desarrollo
4. **generateClothingImage** - Generación de imágenes con Imagen AI
5. **generateVirtualTryOn** - Prueba virtual de outfits
6. **findSimilarItems** - Búsqueda por similitud visual
7. **searchShoppingSuggestions** - Sugerencias de compras con Google Search grounding
8. **analyzeColorPalette** - Análisis de paleta de colores
9. **chatWithFashionAssistant** - Chat conversacional de moda
10. **parseOutfitFromChat** - Extracción de outfits desde chat
11. **generateWeatherOutfit** - Outfits según clima
12. **generateLookbook** - Creación de lookbooks temáticos
13. **generateStyleChallenge** - Generador de retos de estilo
14. **analyzeFeedbackPatterns** - Análisis de feedback de outfits
15. **analyzeShoppingGaps** - Detección de gaps en closet
16. **generateShoppingRecommendations** - Recomendaciones de compra
17. **conversationalShoppingAssistant** - Asistente de compras conversacional
18. **analyzeClosetGaps** - Análisis de gaps en closet
19. **recognizeBrandAndPrice** - Reconocimiento de marca y precio
20. **findDupeAlternatives** - Búsqueda de alternativas (dupes)
21. **generateCapsuleWardrobe** - Generador de cápsula de armario
22. **analyzeStyleDNA** - Análisis de ADN de estilo personal
23. **generateFashionDesign** - Generador de diseños de moda con IA
24. **analyzeStyleEvolution** - Análisis de evolución de estilo
25. **generateContent** - Generación de contenido genérico
26. **analyzeBatchClothingItems** - Análisis batch de múltiples imágenes

### Modelos de IA Utilizados
- **gemini-2.5-flash**: Análisis rápido, chat, búsqueda
- **gemini-2.5-pro**: Generación de outfits, packing lists (mayor calidad)
- **gemini-2.5-flash-image**: Virtual try-on, análisis visual
- **imagen-4.0-generate-001**: Generación de imágenes de ropa

---

## 🔄 Feature Flag System

**Archivo**: `src/config/features.ts`

**Flag clave**: `useSupabaseAI`
```typescript
useSupabaseAI: import.meta.env.PROD || !import.meta.env.VITE_GEMINI_API_KEY
```

**Lógica**:
- **Producción** (`PROD=true`): Siempre usa Edge Functions
- **Desarrollo con key** (`VITE_GEMINI_API_KEY` presente): Usa API directa
- **Desarrollo sin key**: Usa Edge Functions

**Control Manual**:
```javascript
// En consola del navegador o código
import { enableFeature, disableFeature } from './src/config/features';

// Forzar uso de Edge Functions
enableFeature('useSupabaseAI');

// Forzar uso de API directa
disableFeature('useSupabaseAI');
```

---

## ✅ Checklist de Configuración

### Para Desarrollo Local
- [x] `.env.local` tiene `VITE_GEMINI_API_KEY` configurada
- [x] API key válida y con permisos adecuados
- [x] `aiService.ts` configura automáticamente en modo dev

### Para Producción (Supabase)
- [ ] Configurar secret: `supabase secrets set GEMINI_API_KEY=<tu_key>`
- [ ] Verificar Edge Functions deployadas: `supabase functions list`
- [ ] Probar Edge Functions: `supabase functions invoke analyze-clothing --data '{...}'`
- [ ] Verificar en Supabase Dashboard: Project Settings → Edge Functions → Secrets

### Variables Adicionales (Supabase Edge Functions)
Estas se configuran automáticamente por Supabase:
- [x] `SUPABASE_URL` - Auto-inyectada
- [x] `SUPABASE_SERVICE_ROLE_KEY` - Auto-inyectada

---

## 🚀 Comandos de Configuración

### 1. Configurar Supabase Secrets
```bash
# Navegar al directorio del proyecto
cd /Users/santiagobalosky/no-tengo-nada-para-ponerme

# Login a Supabase (si no estás logueado)
supabase login

# Link proyecto (si no está linkeado)
supabase link --project-ref qpoojigxxswkpkfbrfiy

# Configurar API key
supabase secrets set GEMINI_API_KEY=<YOUR_GEMINI_API_KEY>

# Verificar secrets configurados
supabase secrets list
```

### 2. Deploy Edge Functions (si no están deployadas)
```bash
# Deploy todas las funciones
supabase functions deploy analyze-clothing
supabase functions deploy generate-outfit
supabase functions deploy generate-packing-list
```

### 3. Verificar Configuración
```bash
# Ver estado de Supabase
supabase status

# Probar función localmente
supabase functions serve analyze-clothing

# Probar función remota
supabase functions invoke analyze-clothing --data '{"imageDataUrl":"data:image/png;base64,..."}'
```

---

## 🔒 Seguridad y Best Practices

### ✅ Configuración Actual (Correcta)
1. **API key NO está hardcodeada** en código del cliente
2. **Variable de entorno** con prefijo `VITE_` para desarrollo
3. **Edge Functions** leen desde secrets de Supabase
4. **Fallback inteligente** si Edge Function falla
5. **CORS configurado** correctamente en Edge Functions

### ⚠️ Advertencias
1. **NO commitear `.env.local`** al repositorio (está en .gitignore)
2. **Rotar API key** si se expone accidentalmente
3. **Limitar quotas** en Google Cloud Console
4. **Monitorear uso** en AI Studio: https://makersuite.google.com/app/apikey

### 🔐 Permisos Requeridos (API Key)
La API key debe tener acceso a:
- ✅ Gemini API (generative-ai)
- ✅ Imagen API (imagen-generate)
- ✅ Search Grounding (search-grounding)

---

## 📊 Métricas de Uso

### Límites Free Tier (Gemini)
- **Gemini 2.5 Flash**: 15 RPM (requests per minute)
- **Gemini 2.5 Pro**: 2 RPM
- **Imagen 4.0**: 5 RPM

### Límites Supabase Free Tier
- **Edge Functions**: 500K invocations/month
- **Bandwidth**: 5GB/month

### Recomendaciones
1. **Usar Edge Functions en producción** para mejor control de costos
2. **Implementar caching** para reducir llamadas repetidas
3. **Rate limiting** en frontend para evitar abuso
4. **Monitoreo** de errores y latencia

---

## 🐛 Troubleshooting

### Error: "GEMINI_API_KEY not configured"
**Causa**: Secret no configurado en Supabase
**Solución**:
```bash
supabase secrets set GEMINI_API_KEY=<tu_key>
```

### Error: "Failed to configure Gemini API"
**Causa**: API key inválida o sin permisos
**Solución**:
1. Verificar key en Google AI Studio
2. Verificar permisos de la key
3. Regenerar key si es necesario

### Edge Function devuelve 500
**Causa**: Error en función o secret mal configurado
**Solución**:
```bash
# Ver logs de la función
supabase functions logs analyze-clothing

# Probar localmente
supabase functions serve analyze-clothing
```

### Fallback infinito entre Edge y Direct API
**Causa**: Ambos fallan (API key inválida en ambos lados)
**Solución**: Verificar que la API key es válida y tiene permisos

---

## 📚 Referencias

- **Google AI Studio**: https://makersuite.google.com/app/apikey
- **Gemini API Docs**: https://ai.google.dev/docs
- **Supabase Edge Functions**: https://supabase.com/docs/guides/functions
- **Supabase Secrets**: https://supabase.com/docs/guides/functions/secrets

---

## Límites de la API y manejo de errores (Free Tier)

> Consolidado desde el antiguo `GEMINI_API_LIMITS.md`.

### Límites del Free Tier (Gemini 2.5 Flash, modelo estable actual)
- **15 requests por minuto (RPM)**
- **1 millón de tokens por día**
- **1500 requests por día**

Los modelos Gemini 1.5/2.0 fueron retirados; `gemini-2.5-flash` es el reemplazo estable.

### Error 429 ("Quota Exceeded")
Ocurre al superar los límites gratuitos: demasiados requests por minuto, exceder el
límite diario, o problemas de billing en la API key.

**Soluciones implementadas en el código:**
- Modelo actualizado a `gemini-2.5-flash`.
- Mensajes de error claros en español (cuota excedida vs. rate limit temporal).
- `retryAIOperation()` reintenta solo en errores recuperables (rate limit temporal 429
  sin billing, 503 sobrecarga, timeouts) y **no** reintenta en cuota excedida ni billing.

### Buenas prácticas para evitar límites
1. No spamear: esperar 4-5 s entre requests (ver throttling abajo).
2. Cachear resultados de análisis repetidos.
3. Agrupar operaciones (batch) cuando sea posible.
4. Limitar cuántos outfits puede generar un usuario por minuto.

```typescript
let lastRequestTime = 0;
const MIN_DELAY = 5000; // 5 segundos
async function generateOutfitWithThrottle(prompt: string) {
  const sinceLast = Date.now() - lastRequestTime;
  if (sinceLast < MIN_DELAY) {
    await new Promise(r => setTimeout(r, MIN_DELAY - sinceLast));
  }
  lastRequestTime = Date.now();
  return generateOutfit(prompt, inventory);
}
```

### Plan pago (pay-as-you-go)
Sin límite de RPM; ~$0.075/1M tokens input y ~$0.30/1M tokens output. Conviene cuando se
superan 1500 requests/día o se necesita más de 15 RPM en producción.

### Monitoreo y notas
- Uso actual: https://ai.dev/usage?tab=rate-limit
- Límites por modelo: https://ai.google.dev/gemini-api/docs/rate-limits
- RPM se resetea cada minuto; el límite diario a medianoche PST.
- Cada API key tiene sus propios límites (no se comparten).

---

**Última actualización**: 2025-01-14 (límites consolidados 2026-06)
**Versión del análisis**: 1.1
**API Key configurada**: ✅ Frontend | ⚠️ Supabase (requiere configuración)
