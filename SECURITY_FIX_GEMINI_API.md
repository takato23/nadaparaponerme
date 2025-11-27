# 🔒 Security Fix: Gemini API Key Exposure

## ⚠️ Problema Crítico Resuelto

**Problema:** La API key de Gemini se estaba exponiendo en el bundle JavaScript del cliente, causando que Google la bloqueara automáticamente.

**Causa raíz:** Usar `VITE_GEMINI_API_KEY` (con prefijo `VITE_`) hace que Vite **embeba la key en el código JavaScript** que se envía al navegador.

Cualquiera puede:
1. Abrir DevTools (F12)
2. Ver Sources → inspeccionar el bundle JS
3. Encontrar tu API key en texto plano
4. Google detecta esto automáticamente y bloquea la key

## ✅ Solución Implementada

### Cambios realizados:

1. **`.env.local`**: Comentada `VITE_GEMINI_API_KEY` con advertencia de seguridad
2. **`.env.local.example`**: Actualizado con warnings de NO usar `VITE_`
3. **`src/services/aiService.ts`**: Deshabilitada inicialización directa de Gemini API

### Nueva arquitectura (segura):

```
Usuario → Frontend → Edge Function (Supabase) → Gemini API
                     ↑
                     API Key guardada en Supabase Secrets (servidor)
                     ❌ Key NUNCA llega al cliente
```

## 🔑 Cómo Generar y Configurar Nueva API Key

### Paso 1: Generar nueva key en Google AI Studio

1. Andá a: https://aistudio.google.com/app/apikey
2. **Revocá la key anterior** (si está mostrada)
3. Click en **"Create API Key"**
4. Seleccioná tu proyecto de Google Cloud
5. **Copiá la nueva key** (se muestra una sola vez)

### Paso 2: Configurar en Supabase Secrets

```bash
supabase secrets set GEMINI_API_KEY=TU_NUEVA_KEY_AQUI
```

**IMPORTANTE:** NO compartas esta key, NO la pongas en `.env.local`, NO la agregues con prefijo `VITE_`

### Paso 3: Verificar configuración

```bash
supabase secrets list
```

Deberías ver:
```
NAME            | DIGEST
----------------|------------------
GEMINI_API_KEY  | c9094853a3c8...  ✅
```

### Paso 4: Re-deploy Edge Functions (si es necesario)

```bash
supabase functions deploy generate-fashion-image
```

## 🚨 Reglas de Seguridad (NUNCA violar)

### ❌ NUNCA hacer:

1. ❌ Usar `VITE_GEMINI_API_KEY` o cualquier variable con prefijo `VITE_`
2. ❌ Incluir API keys en código del cliente (JS, TS, React components)
3. ❌ Hacer llamadas directas a Gemini API desde el navegador
4. ❌ Compartir API keys en chats, issues, commits de Git
5. ❌ Loggear API keys con `console.log()` en el servidor

### ✅ SIEMPRE hacer:

1. ✅ Guardar API keys en **Supabase Secrets** (servidor)
2. ✅ Usar **Edge Functions** para todas las llamadas a Gemini
3. ✅ Mantener keys en `.env.local` **sin prefijo VITE_** (y agregarlo a `.gitignore`)
4. ✅ Verificar que `.gitignore` incluye `.env.local`
5. ✅ Rotar keys periódicamente (cada 90 días)

## 📊 Verificación de Seguridad

### Cómo verificar que la key NO se expone:

1. **Build de producción:**
   ```bash
   npm run build
   ```

2. **Inspeccionar bundle:**
   ```bash
   grep -r "AIza" dist/  # No debería encontrar nada
   ```

3. **DevTools del navegador:**
   - Abrí la app en el navegador
   - F12 → Sources → Buscar archivos JS
   - Buscar "AIza" o "GEMINI" → No debería aparecer

### Si encontrás la key en el bundle:

1. ⚠️ **Revocá la key inmediatamente** en Google AI Studio
2. 🔍 Buscá dónde está siendo usada: `grep -r "VITE_GEMINI" src/`
3. 🔧 Comentá/eliminá esas referencias
4. ♻️ Regenerá la key y configurala solo en Supabase Secrets

## 🎯 Testing después del fix

1. **Verificar que NO hay referencia a `VITE_GEMINI_API_KEY`:**
   ```bash
   npm run dev
   # Abrí DevTools → Console
   # No debería haber warnings sobre "VITE_GEMINI_API_KEY not found"
   ```

2. **Probar generación de imágenes:**
   - Navegá a AI Fashion Designer
   - Ingresá un prompt: "A red elegant dress"
   - Debería funcionar usando Edge Function

3. **Verificar logs de Edge Function:**
   - Dashboard: https://supabase.com/dashboard/project/qpoojigxxswkpkfbrfiy/functions/generate-fashion-image/logs
   - Debe mostrar: "Environment check: hasGeminiKey: true"
   - NO debe mostrar el valor de la key

## 📚 Documentación relacionada

- Google AI Studio: https://aistudio.google.com/
- Supabase Secrets: https://supabase.com/docs/guides/functions/secrets
- Vite Environment Variables: https://vitejs.dev/guide/env-and-mode.html

## 🔄 Historial de cambios

- **2025-11-20:** Deshabilitado `VITE_GEMINI_API_KEY`, implementado Edge Functions exclusivamente
- **2025-11-20:** Actualizado nombres de modelos: `imagen-3.0-fast-generate-001` (Flash), `imagen-3.0-generate-001` (Pro)
- **2025-11-20:** Agregado CORS header `x-application-name` para compatibilidad

---

**Fecha del fix:** 2025-11-20
**Status:** ✅ Implementado y verificado
**Próximos pasos:** Usuario debe generar nueva API key y configurarla en Supabase Secrets
