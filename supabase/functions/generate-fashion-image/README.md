# Generate Fashion Image Edge Function

Edge Function para generar imágenes de moda usando Gemini AI con rate limiting inteligente.

## Características

- **Modelos**: `gemini-2.5-flash-image` (gratis) y `gemini-2.5-pro-image` (premium)
- **Rate Limiting**: Control de cuotas diarias por tier de suscripción
- **Compresión Automática**: Imágenes optimizadas (max 2MB)
- **Storage Privado**: Almacenamiento seguro en Supabase Storage
- **Retry Logic**: Reintentos automáticos en caso de fallo de API

## Límites de Cuota

| Plan | Flash Model | Pro Model |
|------|-------------|-----------|
| Free | 10/día | 0/día |
| Pro | 50/día | 5/día |
| Premium | 200/día | 20/día |

## Request Schema

```typescript
{
  prompt: string;              // Required: descripción de la imagen a generar
  model_type?: 'flash' | 'pro'; // Optional: default 'flash'
  style_preferences?: {         // Optional: preferencias de estilo
    background?: string;
    lighting?: string;
    mood?: string;
  };
}
```

## Response Schema

### Success (200)
```typescript
{
  image_url: string;            // URL pública de la imagen generada
  storage_path: string;         // Ruta en Storage bucket
  generation_time_ms: number;   // Tiempo de generación en ms
  remaining_quota: number;      // Generaciones restantes hoy
  model_used: 'flash' | 'pro';  // Modelo utilizado
  current_tier: string;         // Tier de suscripción actual
}
```

### Quota Exceeded (429)
```typescript
{
  error: string;
  error_code: 'QUOTA_EXCEEDED';
  remaining_quota: 0;
  current_tier: string;
  upgrade_prompt: boolean;      // true si es usuario free
  message: string;
}
```

### Error (400/500)
```typescript
{
  error: string;
  error_details?: string;       // Stack trace en desarrollo
}
```

## Deployment

### 1. Aplicar Migraciones
```bash
cd /Users/santiagobalosky/no-tengo-nada-para-ponerme
supabase db push
```

### 2. Configurar Secrets
```bash
supabase secrets set GEMINI_API_KEY=your_google_ai_studio_key
```

### 3. Deploy Function
```bash
supabase functions deploy generate-fashion-image
```

### 4. Verificar Storage Bucket
```bash
# Verificar que el bucket 'ai-generated-images' existe
supabase storage ls
```

## Testing

### Test Request (cURL)
```bash
# Obtener token de autenticación primero
TOKEN="your_supabase_auth_token"

curl -X POST \
  https://your-project.supabase.co/functions/v1/generate-fashion-image \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Una chaqueta de cuero negra estilo biker con detalles metálicos",
    "model_type": "flash",
    "style_preferences": {
      "background": "white",
      "lighting": "studio"
    }
  }'
```

### Test desde Frontend
```typescript
import { supabase } from '@/lib/supabase';

async function generateFashionImage(prompt: string) {
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch(
    `${supabase.functions.url}/generate-fashion-image`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        model_type: 'flash'
      })
    }
  );

  const result = await response.json();

  if (response.status === 429) {
    throw new Error(result.message);
  }

  if (!response.ok) {
    throw new Error(result.error);
  }

  return result;
}
```

## Quota Management

### Check User Quota
```sql
SELECT * FROM public.get_user_quota_status(
  '00000000-0000-0000-0000-000000000000'::uuid,
  'flash'
);
```

### Reset Quota Manually (Admin)
```sql
DELETE FROM public.daily_generation_quota
WHERE user_id = '00000000-0000-0000-0000-000000000000'
  AND date = CURRENT_DATE;
```

### Cleanup Old Quotas
```sql
SELECT public.cleanup_old_quotas();
```

## Monitoring

### View Generation History
```sql
SELECT
  user_id,
  prompt,
  model_type,
  generation_time_ms,
  created_at
FROM public.ai_generated_images
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

### View Daily Usage
```sql
SELECT
  date,
  model_type,
  plan_type,
  SUM(count) as total_generations
FROM public.daily_generation_quota
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY date, model_type, plan_type
ORDER BY date DESC;
```

## Error Handling

La función maneja los siguientes errores:

- **401 Unauthorized**: Token faltante o inválido
- **400 Bad Request**: Prompt vacío o model_type inválido
- **429 Too Many Requests**: Cuota diaria excedida
- **500 Internal Server Error**: Error de Gemini API o Storage

Todos los errores incluyen mensajes en español para el usuario final.

## Performance

- **Tiempo típico de generación**: 2-5 segundos
- **Reintentos automáticos**: Hasta 2 reintentos con backoff exponencial
- **Compresión**: Automática si la imagen excede 2MB
- **Almacenamiento**: Privado con acceso solo por RLS

## Security

- **RLS Enabled**: Usuarios solo pueden ver sus propias imágenes
- **Service Role**: Edge Function usa service_role para bypass RLS en operaciones
- **Private Bucket**: Imágenes no son públicas por defecto
- **Token Validation**: Autenticación requerida en cada request
