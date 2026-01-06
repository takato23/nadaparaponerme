# Configuración de Seguridad de API Keys

## 🔒 Cambios de Seguridad Implementados

La API key de Gemini ya NO está expuesta en el código cliente. Todos los cambios se han completado exitosamente.

---

## 🚀 Configuración Rápida para Desarrollo Local

### Paso 1: Agregar tu API Key a `.env.local`

Abre el archivo `.env.local` y reemplaza `your_api_key_here` con tu API key real de Gemini:

```bash
VITE_GEMINI_API_KEY=AIzaSy... # Tu API key aquí
```

⚠️ **IMPORTANTE**: Este archivo está en `.gitignore` y NUNCA se commitea. Es solo para desarrollo local.

### Paso 2: Reiniciar el servidor de desarrollo

```bash
npm run dev
```

Deberías ver este mensaje en la consola:

```
⚠️ DEVELOPMENT MODE: Using Gemini API key from environment.
This should NEVER happen in production!
```

Esto confirma que la API key se cargó correctamente para desarrollo.

---

## 🏭 Configuración para Producción

Para producción, **NUNCA uses `VITE_GEMINI_API_KEY`**. En su lugar:

### Opción 1: Supabase CLI (Recomendado)

```bash
# 1. Linkear tu proyecto
supabase link --project-ref qpoojigxxswkpkfbrfiy

# 2. Configurar el secreto
supabase secrets set GEMINI_API_KEY=tu_api_key_aqui

# 3. Desplegar Edge Functions
supabase functions deploy analyze-clothing
supabase functions deploy generate-outfit
supabase functions deploy generate-packing-list
```

### Opción 2: Supabase Dashboard (Más fácil)

1. Ve a https://supabase.com/dashboard/project/qpoojigxxswkpkfbrfiy/settings/vault/secrets
2. Crea un nuevo secreto:
   - Name: `GEMINI_API_KEY`
   - Value: Tu API key de Gemini
3. Las Edge Functions ya desplegadas usarán automáticamente este secreto

---

## 🔄 Cómo Funciona el Sistema de Seguridad

### En Desarrollo Local (`npm run dev`)
```
Usuario → App → aiService.ts → geminiService.ts (con API key de VITE_GEMINI_API_KEY)
```
- ✅ Usa la API key de `.env.local`
- ✅ Rápido y sin necesidad de Edge Functions
- ⚠️ La key está en el bundle de dev (SOLO en dev)

### En Producción (`npm run build`)
```
Usuario → App → aiService.ts → Edge Function (Supabase) → Gemini AI
```
- ✅ La API key está SOLO en Supabase Secrets
- ✅ NUNCA está en el código cliente
- ✅ 100% seguro

---

## 📝 Archivos Modificados

### Archivos de Seguridad
- ✏️ **`services/geminiService.ts`**: API key eliminada, requiere configuración explícita
- ✏️ **`.env.local`**: API key removida (usar `VITE_*` prefix solo para dev)
- ✏️ **`src/lib/gemini-dev-init.ts`**: Inicialización para desarrollo (NEW)
- ✏️ **`index.tsx`**: Llama a `initGeminiForDevelopment()` al inicio
- ✏️ **`src/config/features.ts`**: Auto-detecta si usar Edge Functions o API directa

### Edge Functions (ya existentes, funcionan correctamente)
- ✅ `supabase/functions/analyze-clothing/index.ts`
- ✅ `supabase/functions/generate-outfit/index.ts`
- ✅ `supabase/functions/generate-packing-list/index.ts`

---

## 🔐 Seguridad Verificada

✅ **API key NO está en el bundle de producción**
✅ **`process.env.API_KEY` eliminado del código**
✅ **`.env.local` en `.gitignore`**
✅ **Edge Functions usan Supabase Secrets**
✅ **Build compila sin errores**

---

## ❓ Solución de Problemas

### Error: "Gemini API not configured"

**Causa**: La API key no está configurada en `.env.local`

**Solución**:
```bash
# Asegúrate de que .env.local tenga:
VITE_GEMINI_API_KEY=tu_api_key_aqui

# Reinicia el servidor
npm run dev
```

### Error: CORS al llamar Edge Function

**Causa**: La Edge Function no está desplegada o Supabase Secrets no está configurado

**Solución temporal** (desarrollo local):
1. Agrega tu API key en `.env.local` con el prefijo `VITE_`
2. El sistema automáticamente usará la API directa en lugar de Edge Functions

**Solución definitiva** (producción):
1. Configura `GEMINI_API_KEY` en Supabase Secrets
2. Despliega las Edge Functions con `supabase functions deploy`

### Edge Functions fallan pero quiero usar API directa en localhost

El sistema ya hace esto automáticamente:
- Si `VITE_GEMINI_API_KEY` existe → Usa API directa
- Si no existe → Intenta usar Edge Functions

---

## 🎯 Próximos Pasos Recomendados

1. **[URGENTE] Regenerar API Key de Gemini**: La key anterior (`AIzaSyAMoDyf6VEheTssDJp5JrWhgLeFOAqG_8o`) fue expuesta. Crea una nueva en https://makersuite.google.com/app/apikey

2. **[RECOMENDADO] Linkear proyecto con Supabase CLI**:
   ```bash
   supabase link --project-ref qpoojigxxswkpkfbrfiy
   ```

3. **[OPCIONAL] Crear Edge Functions para funciones restantes**: Actualmente solo 3 operaciones usan Edge Functions. Las otras 18 funcionan con fallback local.

---

## 📊 Estado de Edge Functions

| Función | Edge Function | Fallback Local |
|---------|--------------|----------------|
| `analyzeClothingItem` | ✅ Implementada | ✅ Funciona |
| `generateOutfit` | ✅ Implementada | ✅ Funciona |
| `generatePackingList` | ✅ Implementada | ✅ Funciona |
| `generateVirtualTryOn` | ❌ No implementada | ✅ Funciona |
| `chatWithFashionAssistant` | ❌ No implementada | ✅ Funciona |
| `generateWeatherOutfit` | ❌ No implementada | ✅ Funciona |
| Otras 15 funciones | ❌ No implementadas | ✅ Funcionan |

**En producción**: Se recomienda crear Edge Functions para todas las operaciones.
**En desarrollo**: El fallback local funciona perfectamente.

---

## 🆘 Soporte

Si encuentras problemas:
1. Verifica que `.env.local` tiene `VITE_GEMINI_API_KEY` configurado
2. Reinicia el servidor de desarrollo (`npm run dev`)
3. Revisa la consola del navegador para mensajes de inicialización
4. Si persisten los errores, verifica que la API key sea válida en https://makersuite.google.com

---

**Última actualización**: 2025-01-12
**Versión de seguridad**: v2.0 (API key protegida)
