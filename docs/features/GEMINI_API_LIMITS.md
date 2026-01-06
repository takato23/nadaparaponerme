# Límites de la API de Gemini y Cómo Manejarlos

## 🚨 Error 429: "Quota Exceeded"

Este error ocurre cuando excedes los límites **gratuitos** de la API de Gemini.

### Límites del Free Tier (Gratis)

**Gemini 2.5 Flash** (modelo actual):
- **15 requests por minuto (RPM)**
- **1 millón de tokens por día**
- **1500 requests por día**

**Nota**: Los modelos Gemini 1.5 han sido retirados. Gemini 2.5 Flash es el modelo estable más reciente.

### ¿Por Qué Sucede?

El error aparece cuando:
1. **Hacés más de 15 requests en 1 minuto** - Ej: generar outfits muy rápido
2. **Excedés el límite diario** - Después de 1500 requests o 1M tokens en un día
3. **La API key tiene problemas de billing** - Aunque sea gratis, puede mostrar este error

## ✅ Soluciones Implementadas

### 1. **Cambio de Modelo** ✅
```typescript
// ANTES (modelos retirados)
model: 'gemini-1.5-flash' // Ya no disponible
model: 'gemini-2.0-flash' // Modelo anterior

// AHORA (modelo estable actual)
model: 'gemini-2.5-flash' // 15 RPM, más reciente
```

### 2. **Mensajes de Error Claros** ✅
El sistema ahora muestra:
- ⏱️ **Cuota excedida**: "Has alcanzado el límite gratuito... esperá unos minutos"
- ⏱️ **Rate limit temporal**: "Demasiadas solicitudes... esperá 30-60 segundos"

### 3. **Sistema de Reintentos Inteligente** ✅
```typescript
retryAIOperation() - NO reintenta cuando:
  - Cuota excedida (necesitas esperar)
  - Errores de billing

SÍ reintenta cuando:
  - Rate limit temporal (429 sin billing)
  - Servidor sobrecargado (503)
  - Timeouts de red
```

## 🔧 Qué Hacer Cuando Aparece el Error

### Para Desarrolladores

**Si estás en desarrollo:**

1. **Esperar 1 minuto** - Los límites se resetean cada minuto
2. **Reducir la frecuencia** - No generar más de 10-15 outfits por minuto
3. **Usar cache local** - Guardar resultados para evitar llamadas duplicadas
4. **Obtener una API key nueva** (si la tuya se bloqueó):
   - Ve a https://aistudio.google.com/app/apikey
   - Crea una nueva API key
   - Actualiza `.env.local`

**Si alcanzaste el límite diario:**
- Esperar hasta el día siguiente (se resetea a medianoche PST)
- Usar otra API key
- Considerar el plan pago de Gemini

### Para Usuarios Finales

El error mostrará automáticamente:
```
⏱️ Has alcanzado el límite gratuito de la API de Gemini.
Esperá unos minutos e intentá de nuevo, o conseguí una API key
con más cuota en https://aistudio.google.com/app/apikey
```

**Acciones recomendadas:**
1. Esperar 30-60 segundos
2. Intentar de nuevo
3. Si persiste, esperar 1-2 minutos más

## 📊 Monitoreo de Uso

**Ver tu uso actual:**
https://ai.dev/usage?tab=rate-limit

**Límites por modelo:**
https://ai.google.dev/gemini-api/docs/rate-limits

## 🎯 Mejores Prácticas

### Para Evitar Límites

1. **No spamear** - Esperar al menos 4-5 segundos entre requests
2. **Cache inteligente** - Guardar resultados de análisis repetidos
3. **Batch operations** - Agrupar operaciones cuando sea posible
4. **User throttling** - Limitar cuántas veces un usuario puede generar outfits

### Código de Ejemplo: Throttling

```typescript
let lastRequestTime = 0;
const MIN_DELAY = 5000; // 5 segundos

async function generateOutfitWithThrottle(prompt: string) {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_DELAY) {
    const waitTime = MIN_DELAY - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  lastRequestTime = Date.now();
  return await generateOutfit(prompt, inventory);
}
```

## 💰 Plan Pago (Si Necesitas Más)

**Gemini API Pay-as-you-go:**
- Sin límites de RPM (requests por minuto)
- $0.075 por 1M tokens input
- $0.30 por 1M tokens output
- Facturación mensual

**Cuándo considerar el plan pago:**
- Más de 1500 requests por día
- App en producción con múltiples usuarios
- Necesitas más de 15 RPM

## 🔍 Debugging

**Para ver qué está causando el límite:**

```typescript
// En la consola del navegador
console.log('API calls en los últimos 60 segundos:', apiCallCount);
console.log('Tokens usados hoy:', tokensUsedToday);
```

**Revisar logs:**
```bash
# Ver errores de Gemini
grep "429" logs.txt
grep "quota" logs.txt
```

## 📝 Notas Importantes

1. Los límites se resetean **cada minuto** para RPM
2. Los límites diarios se resetean a **medianoche PST**
3. **Cada API key tiene sus propios límites** - no se comparten
4. El modelo `gemini-2.5-flash` es el **modelo estable más reciente** y reemplaza a los modelos 1.5/2.0 retirados
5. Los reintentos automáticos **no consumen quota extra** si el error es 429

---

**Última actualización**: 2025-01-22
**Modelo actual**: `gemini-2.5-flash` (15 RPM free tier, modelo estable más reciente)
