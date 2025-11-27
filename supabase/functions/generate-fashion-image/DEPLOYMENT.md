# Deployment Guide: Generate Fashion Image Edge Function

Guía completa para el deployment de la función de generación de imágenes con Gemini AI.

## Pre-requisitos

1. **Google AI Studio API Key**
   - Registrarse en [Google AI Studio](https://aistudio.google.com/)
   - Crear un nuevo proyecto
   - Generar API key
   - Free tier: 500 imágenes/día (límite de Google)

2. **Supabase CLI Instalado**
   ```bash
   npm install -g supabase
   ```

3. **Proyecto Supabase Configurado**
   - Proyecto existente con auth habilitado
   - Tabla `subscriptions` configurada

## Paso 1: Aplicar Migraciones de Base de Datos

```bash
cd /Users/santiagobalosky/no-tengo-nada-para-ponerme

# Aplicar migraciones
supabase db push
```

Esto creará:
- Tabla `ai_generated_images` (historial de generaciones)
- Tabla `daily_generation_quota` (control de cuotas)
- Storage bucket `ai-generated-images` (almacenamiento privado)
- Función `get_user_quota_status()` (verificación de cuota)
- Función `cleanup_old_quotas()` (mantenimiento)
- RLS policies para seguridad

## Paso 2: Configurar Secrets

```bash
# Set Gemini API key
supabase secrets set GEMINI_API_KEY=your_actual_api_key_here

# Verificar secrets
supabase secrets list
```

Los siguientes secrets ya deben estar configurados (se heredan del proyecto):
- `SUPABASE_URL`
- `SERVICE_ROLE_KEY`

## Paso 3: Deploy Edge Function

```bash
# Deploy la función
supabase functions deploy generate-fashion-image

# Output esperado:
# Deploying Function (project: your-project-id)
#  generate-fashion-image (version: xxx)
# Deployed!
```

## Paso 4: Verificar Storage Bucket

```bash
# Listar buckets
supabase storage ls

# Verificar permisos del bucket ai-generated-images
supabase storage get ai-generated-images
```

## Paso 5: Testing

### Test Local (Supabase Local Dev)

```bash
# Iniciar Supabase local
supabase start

# Obtener auth token de test
TOKEN=$(supabase db sql "SELECT token FROM auth.access_tokens LIMIT 1;" | tail -n 1)

# Ejecutar test script
./supabase/functions/generate-fashion-image/test.sh http://localhost:54321 $TOKEN
```

### Test Producción

```bash
# Obtener tu auth token desde la aplicación
# Copiar de DevTools → Application → Local Storage → access_token

# Ejecutar test
./supabase/functions/generate-fashion-image/test.sh \
  https://your-project-id.supabase.co \
  your_actual_token_here
```

## Paso 6: Integración Frontend

### 1. Importar servicio
```typescript
import { generateFashionImage, getQuotaStatus } from '@/services/imageGenerationService';
```

### 2. Generar imagen
```typescript
try {
  const result = await generateFashionImage({
    prompt: 'Una chaqueta de cuero negra estilo biker',
    model_type: 'flash'
  });

  console.log('Imagen generada:', result.image_url);
  console.log('Cuota restante:', result.remaining_quota);
} catch (error) {
  console.error('Error:', error.message);
  // Mostrar error al usuario
}
```

### 3. Verificar cuota antes de generar
```typescript
const quota = await getQuotaStatus('flash');

if (!quota.can_generate) {
  alert(`Has alcanzado tu límite de ${quota.daily_limit} generaciones diarias`);
} else {
  console.log(`Te quedan ${quota.remaining_quota} generaciones hoy`);
}
```

## Monitoreo y Mantenimiento

### Ver generaciones recientes
```sql
SELECT
  u.email,
  aig.prompt,
  aig.model_type,
  aig.generation_time_ms,
  aig.created_at
FROM ai_generated_images aig
JOIN auth.users u ON u.id = aig.user_id
WHERE aig.created_at > NOW() - INTERVAL '24 hours'
ORDER BY aig.created_at DESC;
```

### Ver uso diario por tier
```sql
SELECT
  s.tier,
  dgq.model_type,
  SUM(dgq.count) as total_generations
FROM daily_generation_quota dgq
JOIN subscriptions s ON s.user_id = dgq.user_id
WHERE dgq.date = CURRENT_DATE
GROUP BY s.tier, dgq.model_type;
```

### Limpiar cuotas antiguas (ejecutar mensualmente)
```sql
SELECT cleanup_old_quotas();
```

### Ver usuarios cerca del límite
```sql
SELECT
  u.email,
  s.tier,
  dgq.model_type,
  dgq.count as used,
  CASE
    WHEN s.tier = 'free' AND dgq.model_type = 'flash' THEN 10
    WHEN s.tier = 'pro' AND dgq.model_type = 'flash' THEN 50
    WHEN s.tier = 'pro' AND dgq.model_type = 'pro' THEN 5
    WHEN s.tier = 'premium' AND dgq.model_type = 'flash' THEN 200
    WHEN s.tier = 'premium' AND dgq.model_type = 'pro' THEN 20
  END as limit
FROM daily_generation_quota dgq
JOIN auth.users u ON u.id = dgq.user_id
JOIN subscriptions s ON s.user_id = dgq.user_id
WHERE dgq.date = CURRENT_DATE
  AND dgq.count >= CASE
    WHEN s.tier = 'free' AND dgq.model_type = 'flash' THEN 8
    WHEN s.tier = 'pro' AND dgq.model_type = 'flash' THEN 40
    WHEN s.tier = 'pro' AND dgq.model_type = 'pro' THEN 4
    WHEN s.tier = 'premium' AND dgq.model_type = 'flash' THEN 180
    WHEN s.tier = 'premium' AND dgq.model_type = 'pro' THEN 18
  END
ORDER BY dgq.count DESC;
```

## Troubleshooting

### Error: "GEMINI_API_KEY not configured"
```bash
# Verificar que el secret existe
supabase secrets list

# Si no existe, configurarlo
supabase secrets set GEMINI_API_KEY=your_key
```

### Error: "bucket not found"
```bash
# Re-aplicar migración de storage
supabase db push

# O crear bucket manualmente
supabase storage create ai-generated-images --private
```

### Error: "quota exceeded" en desarrollo
```sql
-- Resetear cuota para usuario específico
DELETE FROM daily_generation_quota
WHERE user_id = 'your-user-id'
  AND date = CURRENT_DATE;
```

### Error: "Gemini API error"
- Verificar que la API key es válida
- Verificar límites de Google AI Studio (500/día en free tier)
- Revisar logs de la función: `supabase functions logs generate-fashion-image`

### Imágenes no se cargan
- Verificar RLS policies en storage
- Verificar que el usuario tiene permisos de lectura
- Verificar URL pública: debe incluir `/storage/v1/object/public/`

## Logs y Debugging

### Ver logs en tiempo real
```bash
supabase functions logs generate-fashion-image --tail
```

### Ver logs de errores
```bash
supabase functions logs generate-fashion-image --level error
```

### Habilitar debug mode
Agregar a la función:
```typescript
const DEBUG = Deno.env.get('DEBUG') === 'true';
if (DEBUG) console.log('Debug info:', ...);
```

## Performance Optimization

### 1. Habilitar Caching
Agregar caching de imágenes generadas para prompts similares.

### 2. Lazy Loading
Cargar imágenes bajo demanda con `loading="lazy"`.

### 3. Batch Operations
Generar múltiples variaciones en paralelo (respetando rate limits).

### 4. CDN
Considerar servir imágenes a través de CDN para mejor performance global.

## Security Checklist

- ✅ RLS habilitado en todas las tablas
- ✅ Storage bucket privado (no público)
- ✅ Service role key solo en edge function
- ✅ Auth token requerido en todos los requests
- ✅ Validación de input en edge function
- ✅ Rate limiting implementado
- ✅ Soft deletes para auditoría

## Costos Estimados

### Google AI Studio
- Free tier: 500 imágenes/día (suficiente para 50 usuarios free)
- Paid tier: $0.01 por imagen (flash), $0.05 por imagen (pro)

### Supabase Storage
- Free tier: 1GB storage
- Estimado: ~2MB por imagen = 500 imágenes en free tier
- Paid tier: $0.021 por GB/mes

### Supabase Database
- Free tier: 500MB database
- Metadata es mínimo (~1KB por generación)

## Próximos Pasos

1. **Analytics Dashboard**: Crear vista para administradores con estadísticas de uso
2. **Image Variations**: Generar múltiples variaciones de una imagen
3. **Style Transfer**: Aplicar estilos de imágenes existentes a nuevas generaciones
4. **Batch Generation**: Generar múltiples imágenes en una sola request
5. **Image Editing**: Integrar capacidades de edición con Gemini
