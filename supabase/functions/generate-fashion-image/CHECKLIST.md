# Deployment Checklist: Generate Fashion Image Edge Function

## Pre-Deployment

### 1. Obtener Google AI Studio API Key
- [ ] Crear cuenta en [Google AI Studio](https://aistudio.google.com/)
- [ ] Crear nuevo proyecto
- [ ] Generar API key
- [ ] Verificar límites de free tier (500 imgs/día)
- [ ] Guardar API key en lugar seguro

### 2. Verificar Requisitos
- [ ] Supabase CLI instalado (`supabase --version`)
- [ ] Proyecto Supabase configurado
- [ ] Auth habilitado en el proyecto
- [ ] Tabla `subscriptions` existe y tiene datos de prueba
- [ ] Git repo actualizado

## Deployment Steps

### 3. Aplicar Migraciones
```bash
cd /Users/santiagobalosky/no-tengo-nada-para-ponerme
supabase db push
```

Verificar que se crearon:
- [ ] Tabla `ai_generated_images`
- [ ] Tabla `daily_generation_quota`
- [ ] Función `get_user_quota_status()`
- [ ] Función `cleanup_old_quotas()`
- [ ] Storage bucket `ai-generated-images`
- [ ] RLS policies en todas las tablas

### 4. Configurar Secrets
```bash
supabase secrets set GEMINI_API_KEY=your_actual_api_key_here
```

- [ ] Secret `GEMINI_API_KEY` configurado
- [ ] Verificar con `supabase secrets list`

### 5. Deploy Edge Function
```bash
supabase functions deploy generate-fashion-image
```

- [ ] Función deployed sin errores
- [ ] Verificar con `supabase functions list`

### 6. Verificar Storage
```bash
supabase storage ls
```

- [ ] Bucket `ai-generated-images` visible
- [ ] Bucket es privado (public: false)
- [ ] Policies creadas correctamente

## Testing

### 7. Test Local (Opcional)
```bash
supabase start
./supabase/functions/generate-fashion-image/test.sh http://localhost:54321 YOUR_TOKEN
```

- [ ] Test 1: Generate with flash model - PASS
- [ ] Test 2: Check quota status - PASS
- [ ] Test 3: Missing prompt - FAIL (400)
- [ ] Test 4: Invalid model type - FAIL (400)
- [ ] Test 5: With style preferences - PASS
- [ ] Test 6: Missing auth token - FAIL (401)

### 8. Test Producción
```bash
./supabase/functions/generate-fashion-image/test.sh https://your-project.supabase.co YOUR_TOKEN
```

- [ ] Todos los tests pasan
- [ ] Imagen generada correctamente
- [ ] Quota decrementada
- [ ] Storage bucket contiene imagen
- [ ] RLS funciona correctamente

### 9. Test desde Frontend (cURL)
```bash
TOKEN="your_token_from_browser_localStorage"

curl -X POST \
  https://your-project.supabase.co/functions/v1/generate-fashion-image \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Una chaqueta de cuero negra estilo biker",
    "model_type": "flash"
  }'
```

- [ ] Request exitoso (200)
- [ ] Respuesta contiene `image_url`
- [ ] Respuesta contiene `remaining_quota`
- [ ] Imagen accesible desde URL

## Verificación de Funcionalidad

### 10. Verificar Database
```sql
-- Ver generaciones recientes
SELECT * FROM ai_generated_images ORDER BY created_at DESC LIMIT 5;

-- Ver quota status
SELECT * FROM daily_generation_quota WHERE date = CURRENT_DATE;

-- Probar función de quota
SELECT * FROM get_user_quota_status('your-user-id'::uuid, 'flash');
```

- [ ] Tabla `ai_generated_images` tiene registros
- [ ] Tabla `daily_generation_quota` actualizada
- [ ] Función `get_user_quota_status()` retorna datos correctos

### 11. Verificar Storage
- [ ] Navegar a Supabase Dashboard → Storage
- [ ] Bucket `ai-generated-images` tiene archivos
- [ ] Archivos organizados por user_id
- [ ] Tamaño de archivos <2MB

### 12. Verificar RLS
```sql
-- Intentar acceder a imágenes de otro usuario (debe fallar)
SELECT * FROM ai_generated_images WHERE user_id != auth.uid();

-- Intentar ver quota de otro usuario (debe fallar)
SELECT * FROM daily_generation_quota WHERE user_id != auth.uid();
```

- [ ] RLS bloquea acceso a datos de otros usuarios
- [ ] RLS permite acceso a datos propios
- [ ] Storage RLS funciona correctamente

## Monitoring y Logs

### 13. Verificar Logs
```bash
supabase functions logs generate-fashion-image --tail
```

- [ ] Logs visibles en tiempo real
- [ ] No hay errores críticos
- [ ] Tiempo de generación razonable (2-6s)

### 14. Verificar Performance
```sql
SELECT
  model_type,
  AVG(generation_time_ms) as avg_ms,
  COUNT(*) as total
FROM ai_generated_images
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY model_type;
```

- [ ] Flash model: ~2000-4000ms promedio
- [ ] Pro model: ~4000-6000ms promedio
- [ ] No hay timeouts

## Integration Frontend

### 15. Integrar Service Layer
```typescript
// src/services/imageGenerationService.ts ya creado
import { generateFashionImage } from '@/services/imageGenerationService';
```

- [ ] Service importado correctamente
- [ ] TypeScript types correctos
- [ ] No hay errores de build

### 16. Test desde React Component
```typescript
const result = await generateFashionImage({
  prompt: 'Una chaqueta de cuero',
  model_type: 'flash'
});
```

- [ ] Llamada exitosa desde componente
- [ ] Loading state funciona
- [ ] Error handling funciona
- [ ] Imagen se muestra correctamente

## Post-Deployment

### 17. Documentación
- [ ] README.md actualizado
- [ ] DEPLOYMENT.md revisado
- [ ] EDGE_FUNCTION_SUMMARY.md completo
- [ ] Changelog actualizado

### 18. Security Review
- [ ] API key no expuesta en código
- [ ] RLS habilitado y testeado
- [ ] CORS configurado correctamente
- [ ] Input validation en edge function
- [ ] Error messages no exponen info sensible

### 19. Cost Monitoring
- [ ] Configurar alertas de uso en Google AI Studio
- [ ] Monitorear storage usage en Supabase
- [ ] Revisar edge function invocations
- [ ] Configurar límites de gasto

### 20. User Communication
- [ ] Documentar límites de free tier
- [ ] Explicar upgrade path
- [ ] Crear FAQ sobre generación de imágenes
- [ ] Preparar error messages en español

## Troubleshooting Checklist

### Si algo falla:

#### Error: "GEMINI_API_KEY not configured"
- [ ] Verificar secrets: `supabase secrets list`
- [ ] Re-configurar: `supabase secrets set GEMINI_API_KEY=...`
- [ ] Re-deploy función

#### Error: "bucket not found"
- [ ] Re-aplicar migraciones: `supabase db push`
- [ ] Verificar bucket: `supabase storage ls`
- [ ] Crear manualmente si necesario

#### Error: "quota exceeded" (en testing)
- [ ] Reset quota: `DELETE FROM daily_generation_quota WHERE ...`
- [ ] Usar otro usuario de prueba
- [ ] Cambiar fecha en tabla temporal

#### Imágenes no se cargan
- [ ] Verificar URL pública correcta
- [ ] Verificar RLS policies en storage
- [ ] Verificar permisos de usuario
- [ ] Check browser console para errores CORS

#### Performance lento
- [ ] Verificar logs de edge function
- [ ] Verificar límites de Google AI Studio
- [ ] Verificar network latency
- [ ] Considerar usar modelo flash en vez de pro

## Success Criteria

### Mínimo para Production:
- [x] Migraciones aplicadas exitosamente
- [x] Edge function deployed sin errores
- [x] Secrets configurados
- [x] Tests pasan (al menos básicos)
- [ ] Generación de imagen funciona end-to-end
- [ ] Quota limiting funciona
- [ ] RLS previene acceso no autorizado
- [ ] Error handling robusto

### Ideal para Production:
- [ ] Todos los tests pasan
- [ ] Frontend integrado completamente
- [ ] Monitoring configurado
- [ ] Alertas de costos configuradas
- [ ] Documentación completa
- [ ] User onboarding preparado

## Rollback Plan

Si necesitas hacer rollback:

```bash
# 1. Eliminar función
supabase functions delete generate-fashion-image

# 2. Revertir migraciones (crear archivo de rollback)
psql -U postgres -d postgres < rollback.sql

# 3. Limpiar storage bucket
supabase storage empty ai-generated-images
```

Rollback SQL:
```sql
DROP FUNCTION IF EXISTS get_user_quota_status(UUID, TEXT);
DROP FUNCTION IF EXISTS cleanup_old_quotas();
DROP TABLE IF EXISTS daily_generation_quota;
DROP TABLE IF EXISTS ai_generated_images;
DELETE FROM storage.buckets WHERE id = 'ai-generated-images';
```

## Final Sign-Off

- [ ] Development team reviewed
- [ ] QA testing completed
- [ ] Security review passed
- [ ] Documentation complete
- [ ] Monitoring in place
- [ ] Ready for production

**Deployed by:** _______________
**Date:** _______________
**Version:** _______________
