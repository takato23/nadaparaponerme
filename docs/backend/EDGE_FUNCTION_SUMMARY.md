# Edge Function: Generate Fashion Image - Resumen Completo

## Archivos Creados

### Edge Function
```
supabase/functions/generate-fashion-image/
├── index.ts                 (370 líneas) - Lógica principal de la función
├── README.md               (280 líneas) - Documentación de uso
├── DEPLOYMENT.md           (350 líneas) - Guía de deployment
└── test.sh                 (150 líneas) - Script de testing
```

### Database Migrations
```
supabase/migrations/
├── 20251120000001_ai_image_generation.sql  (180 líneas) - Tablas y funciones
└── 20251120000002_ai_images_storage.sql    (60 líneas)  - Storage bucket y policies
```

### Frontend Service
```
src/services/
└── imageGenerationService.ts  (190 líneas) - Service layer para el frontend
```

## Resumen Técnico

### Stack Tecnológico
- **Runtime**: Deno (Edge Function)
- **AI Model**: Gemini 2.5 Flash Image / Pro Image
- **Storage**: Supabase Storage (private bucket)
- **Database**: PostgreSQL con RLS
- **Auth**: Supabase Auth (JWT tokens)

### Características Implementadas

#### 1. Rate Limiting Inteligente
```typescript
const QUOTA_LIMITS = {
  free:    { flash: 10,  pro: 0  },  // 10 imágenes/día gratis
  pro:     { flash: 50,  pro: 5  },  // 50 flash + 5 pro/día
  premium: { flash: 200, pro: 20 }   // 200 flash + 20 pro/día
}
```

#### 2. Modelo Dual
- **Flash**: Rápido, económico (2-3s generación)
- **Pro**: Mayor calidad, más detalle (4-6s generación)

#### 3. Prompt Engineering
```typescript
function enhancePrompt(userPrompt: string, stylePreferences?: object): string {
  return `Generate a high-quality, photorealistic fashion product image: ${userPrompt}

Style requirements:
- Professional studio lighting
- Clean white or neutral background
- Product-focused composition
- High detail and texture
- Fashion photography aesthetic
- 1024x1024px resolution`;
}
```

#### 4. Retry Logic con Backoff
- Máximo 2 reintentos
- Backoff exponencial (1s, 2s)
- Logging de errores

#### 5. Compresión Automática
- Límite: 2MB por imagen
- Compresión automática si excede límite
- Optimización para mobile

#### 6. Seguridad
- RLS en todas las tablas
- Storage bucket privado
- Auth token requerido
- Service role solo en edge function
- Input validation

## Schema de Base de Datos

### Tabla: ai_generated_images
```sql
CREATE TABLE public.ai_generated_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    image_url TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    model_type TEXT NOT NULL CHECK (model_type IN ('flash', 'pro')),
    generation_time_ms INTEGER NOT NULL,
    style_preferences JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
```

### Tabla: daily_generation_quota
```sql
CREATE TABLE public.daily_generation_quota (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    model_type TEXT NOT NULL CHECK (model_type IN ('flash', 'pro')),
    count INTEGER DEFAULT 0,
    plan_type TEXT NOT NULL CHECK (plan_type IN ('free', 'pro', 'premium')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date, model_type)
);
```

### Función: get_user_quota_status
```sql
CREATE OR REPLACE FUNCTION public.get_user_quota_status(
    p_user_id UUID,
    p_model_type TEXT
)
RETURNS TABLE (
    current_count INTEGER,
    daily_limit INTEGER,
    remaining_quota INTEGER,
    plan_type TEXT,
    can_generate BOOLEAN
)
```

## API Endpoints

### POST /functions/v1/generate-fashion-image

#### Request
```typescript
{
  prompt: string;                    // Required
  model_type?: 'flash' | 'pro';      // Optional (default: 'flash')
  style_preferences?: {              // Optional
    background?: string;
    lighting?: string;
    mood?: string;
  }
}
```

#### Response (200 OK)
```typescript
{
  image_url: string;              // URL pública de la imagen
  storage_path: string;           // Ruta en storage
  generation_time_ms: number;     // Tiempo de generación
  remaining_quota: number;        // Generaciones restantes hoy
  model_used: 'flash' | 'pro';    // Modelo usado
  current_tier: string;           // Tier de suscripción
}
```

#### Response (429 Quota Exceeded)
```typescript
{
  error: "Límite diario alcanzado",
  error_code: "QUOTA_EXCEEDED",
  remaining_quota: 0,
  current_tier: string,
  upgrade_prompt: boolean,
  message: string
}
```

## Comandos de Deployment

### 1. Aplicar Migraciones
```bash
cd /Users/santiagobalosky/no-tengo-nada-para-ponerme
supabase db push
```

### 2. Configurar Secrets
```bash
supabase secrets set GEMINI_API_KEY=your_api_key_from_google_ai_studio
```

### 3. Deploy Function
```bash
supabase functions deploy generate-fashion-image
```

### 4. Verificar Deployment
```bash
supabase functions list
supabase storage ls
```

## Testing

### Test Local
```bash
# Iniciar Supabase local
supabase start

# Ejecutar tests
./supabase/functions/generate-fashion-image/test.sh \
  http://localhost:54321 \
  YOUR_AUTH_TOKEN
```

### Test Producción
```bash
./supabase/functions/generate-fashion-image/test.sh \
  https://your-project-id.supabase.co \
  YOUR_AUTH_TOKEN
```

### Test desde Frontend
```typescript
import { generateFashionImage } from '@/services/imageGenerationService';

const result = await generateFashionImage({
  prompt: 'Una chaqueta de cuero negra estilo biker',
  model_type: 'flash'
});

console.log('Imagen generada:', result.image_url);
console.log('Cuota restante:', result.remaining_quota);
```

## cURL Testing Example

```bash
# Obtener token de auth primero (desde localStorage del navegador)
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Test con modelo flash
curl -X POST \
  https://your-project.supabase.co/functions/v1/generate-fashion-image \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Una chaqueta de cuero negra estilo biker con detalles metálicos",
    "model_type": "flash",
    "style_preferences": {
      "background": "white studio",
      "lighting": "soft natural"
    }
  }'

# Respuesta esperada:
# {
#   "image_url": "https://xxx.supabase.co/storage/v1/object/public/ai-generated-images/...",
#   "storage_path": "user-id/1234567890-flash.png",
#   "generation_time_ms": 3240,
#   "remaining_quota": 9,
#   "model_used": "flash",
#   "current_tier": "free"
# }
```

## Queries SQL Útiles

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
ORDER BY aig.created_at DESC
LIMIT 50;
```

### Ver uso diario por tier
```sql
SELECT
  s.tier,
  dgq.model_type,
  SUM(dgq.count) as total_generations,
  COUNT(DISTINCT dgq.user_id) as active_users
FROM daily_generation_quota dgq
JOIN subscriptions s ON s.user_id = dgq.user_id
WHERE dgq.date = CURRENT_DATE
GROUP BY s.tier, dgq.model_type
ORDER BY s.tier, dgq.model_type;
```

### Ver usuarios cerca del límite (80%+)
```sql
WITH quota_status AS (
  SELECT
    dgq.user_id,
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
)
SELECT
  email,
  tier,
  model_type,
  used,
  limit,
  ROUND((used::float / limit * 100), 1) as usage_percent
FROM quota_status
WHERE used >= (limit * 0.8)
ORDER BY usage_percent DESC;
```

### Limpiar cuotas antiguas
```sql
SELECT cleanup_old_quotas();
-- Retorna número de registros eliminados
```

### Reset quota para usuario (desarrollo)
```sql
DELETE FROM daily_generation_quota
WHERE user_id = 'your-user-uuid'
  AND date = CURRENT_DATE;
```

## Monitoring y Logs

### Ver logs en tiempo real
```bash
supabase functions logs generate-fashion-image --tail
```

### Filtrar logs de error
```bash
supabase functions logs generate-fashion-image --level error
```

### Ver estadísticas de performance
```sql
SELECT
  model_type,
  AVG(generation_time_ms) as avg_time_ms,
  MIN(generation_time_ms) as min_time_ms,
  MAX(generation_time_ms) as max_time_ms,
  COUNT(*) as total_generations
FROM ai_generated_images
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY model_type;
```

## Costos Estimados

### Google AI Studio (Free Tier)
- **Límite**: 500 imágenes/día
- **Costo adicional**: $0.01/imagen (flash), $0.05/imagen (pro)
- **Estimado**: $0 (si <500 imgs/día)

### Supabase
- **Storage**: 1GB gratis (~500 imágenes de 2MB)
- **Database**: 500MB gratis (metadata es mínimo)
- **Edge Functions**: 500K invocaciones gratis/mes
- **Bandwidth**: 2GB gratis/mes

### Ejemplo: 100 usuarios free/día
- Generaciones: 100 usuarios × 10 imgs = 1,000 imgs/día
- Costo Google: $10/día si excede free tier
- Costo Supabase: $0 (dentro de free tier para storage/DB)

## Seguridad y Compliance

### Checklist de Seguridad
- ✅ RLS habilitado en todas las tablas
- ✅ Storage bucket privado (no público por defecto)
- ✅ Service role key solo en edge function
- ✅ Auth token JWT requerido en cada request
- ✅ Validación de input (prompt, model_type)
- ✅ Rate limiting por tier de suscripción
- ✅ Soft deletes para auditoría
- ✅ Logs de todas las generaciones
- ✅ CORS headers configurados
- ✅ Error messages sanitizados

### GDPR Compliance
- Soft deletes permiten recuperación
- Usuario puede eliminar sus imágenes
- Histórico de generaciones auditable
- Storage privado por defecto

## Próximos Pasos y Mejoras

### Features Pendientes
1. **Image Variations**: Generar variaciones de una imagen
2. **Style Transfer**: Aplicar estilos de imágenes existentes
3. **Batch Generation**: Generar múltiples imágenes en paralelo
4. **Image Editing**: Editar imágenes existentes con prompts
5. **Analytics Dashboard**: Vista de estadísticas para admins

### Optimizaciones
1. **Caching**: Cache de imágenes generadas para prompts similares
2. **CDN**: Servir imágenes a través de CDN
3. **WebP Format**: Usar formato WebP para menor tamaño
4. **Lazy Loading**: Cargar imágenes bajo demanda
5. **Progressive Loading**: Mostrar preview mientras genera

### Escalabilidad
1. **Queue System**: Cola para generaciones en lote
2. **Background Jobs**: Generación asíncrona con webhooks
3. **Load Balancing**: Distribuir carga entre múltiples funciones
4. **Auto-scaling**: Ajustar recursos según demanda

## Soporte y Troubleshooting

### Problemas Comunes

**Error: GEMINI_API_KEY not configured**
```bash
supabase secrets set GEMINI_API_KEY=your_key
```

**Error: quota exceeded en desarrollo**
```sql
DELETE FROM daily_generation_quota WHERE user_id = 'your-id' AND date = CURRENT_DATE;
```

**Error: bucket not found**
```bash
supabase db push  # Re-aplicar migraciones
```

**Imágenes no cargan**
- Verificar RLS policies en storage
- Verificar permisos del usuario
- Verificar URL pública correcta

## 2025 AI Edge Functions y Migraciones

### Secretos requeridos
- `GEMINI_API_KEY` (Google Cloud API Key que todas las funciones de IA necesitan).
- `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` o el alias `SERVICE_ROLE_KEY` (el service role expone los RPC seguros).
- `BETA_ALLOWLIST_EMAILS` (opcional, usada por todas las funciones con `allowlistRaw` para cerrar beta).
- Usa `scripts/fix-backend-secrets.sh` o `supabase secrets set ...` para mantener estas claves sincronizadas.

### Resumen rápido de funciones
| Función | Ruta | Descripción | Cuota |
| --- | --- | --- | --- |
| `generate-image` | `POST /functions/v1/generate-image` | Genera la imagen final del producto (modelo `imagen-3.0`). Devuelve un `data:image/jpeg;base64`. | No consume el contador mensual. |
| `generate-outfit` | `POST /functions/v1/generate-outfit` | Selecciona prendas del closet y responde con IDs + explicación. Valida `can_user_generate_outfit()` y llama a `increment_ai_generation_usage()` tras el éxito. | Comparte el contador mensual. |
| `generate-packing-list` | `POST /functions/v1/generate-packing-list` | Empaca prendas y propone outfits para viajes; reusa exactamente los mismos RPC de cuota que `generate-outfit`. | Comparte el mismo contador. |
| `virtual-try-on` | `POST /functions/v1/virtual-try-on` | Edición de un retrato con las prendas seleccionadas; elige `gemini-2.5-flash` o `gemini-3-pro` según el tier. Usa `can_user_generate_outfit()` antes de llamar `increment_ai_generation_usage()`. | Comparte el contador. |
| `analyze-clothing` | `POST /functions/v1/analyze-clothing` | Devuelve metadata (categoría, colores, tags, estaciones) para una prenda subida. | Solo lectura, no consume cuota. |
| `shopping-assistant` | `POST /functions/v1/shopping-assistant` | Modo `analyze-gaps`, `generate-recommendations` o `chat` (dependiendo de `action`). | No toca el contador. |
| `process-payment` | `POST /functions/v1/process-payment` | Actualiza `subscriptions` + `usage_metrics` y reinicia counters tras confirmar el pago. Solo necesita `SERVICE_ROLE_KEY`. | Reinicia límites, no incrementa. |

### Migraciones clave
- `supabase/migrations/20251120000001_ai_image_generation.sql`: define las tablas `ai_generated_images` y `daily_generation_quota`, habilita RLS, índices y las funciones `get_user_quota_status`, `cleanup_old_quotas` y `update_quota_timestamp`.
- `supabase/migrations/20251120000002_ai_images_storage.sql`: crea el bucket `ai-generated-images` privado con políticas rígidas (2MB max, solo service role y funciones con RLS).
- `supabase/migrations/20251127000001_improve_subscription_reset.sql`: reemplaza `increment_ai_generation_usage`, `can_user_generate_outfit` y `get_remaining_generations` con lógica de reseteo mensual y límites por tier; las Edge Functions los consumen para validar y registrar la cuota compartida.

Aplica `supabase db push` al desplegar las funciones y verifica los grants (`GRANT EXECUTE ON FUNCTION increment_ai_generation_usage(UUID) TO authenticated;`) para que las solicitudes autenticadas puedan invocarlas.

### Contacto
Para issues o preguntas, revisar:
- README.md - Documentación de uso
- DEPLOYMENT.md - Guía de deployment
- test.sh - Ejemplos de testing
