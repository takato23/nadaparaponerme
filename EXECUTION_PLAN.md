# Plan de Ejecución: Migración a Supabase 🚀

**Estado:** Ready to Execute
**Duración Total:** 23-31 horas (3-4 días)
**Última Actualización:** 2025-01-07

---

## 📊 Resumen Ejecutivo

### Objetivo
Migrar app de localStorage a Supabase backend manteniendo funcionalidad completa y cero pérdida de datos.

### Estrategia
**Migración Gradual con Feature Flags** - Permite rollback instantáneo por feature.

### Fases de Implementación

| Fase | Descripción | Duración | Archivos Nuevos | Archivos Modificados |
|------|-------------|----------|-----------------|----------------------|
| **0** | Feature Flags + Migración | 2-3h | 4 | 0 |
| **1** | Autenticación | 3-4h | 1 | 3 |
| **2** | Closet Items | 6-8h | 1 | 4 |
| **3** | Saved Outfits | 4-5h | 1 | 3 |
| **4** | AI via Edge Functions | 6-8h | 1 | 4 |
| **5** | User Preferences | 2-3h | 0 | 2 |
| **Total** | | **23-31h** | **8** | **16** |

---

## 🎯 FASE 0: Infraestructura (2-3h)

### Objetivo
Crear sistema de feature flags y migración automática de datos.

### Archivos a Crear

**1. `src/config/features.ts`** (50 líneas)
- Feature flags para todas las fases
- Override por environment variables
- Helper functions

**2. `src/hooks/useFeatureFlag.ts`** (10 líneas)
- Hook para usar flags en componentes

**3. `src/services/migrationService.ts`** (400+ líneas)
- `detectLegacyData()` - Detecta datos en localStorage
- `migrateClosetData()` - Migra prendas a Supabase
- `migrateOutfitsData()` - Migra outfits
- `migrateAllData()` - Migración completa con progress
- `backupAndClearLegacyData()` - Limpia localStorage

**4. `src/components/MigrationModal.tsx`** (100 líneas)
- Modal para que usuario confirme migración
- Progress bar durante upload
- Manejo de errores

### Checklist
- [ ] 4 archivos creados y compilando sin errores
- [ ] `detectLegacyData()` funciona con datos mock
- [ ] Feature flags se leen correctamente
- [ ] `npm run build` exitoso

---

## 🔐 FASE 1: Autenticación (3-4h)

### Objetivo
Reemplazar localStorage auth con Supabase Auth real.

### Archivos a Crear

**1. `src/hooks/useAuth.ts`** (80 líneas)
- Hook unificado para auth
- Soporte para Supabase + localStorage (fallback)
- Auth state management
- Listener de cambios de sesión

### Archivos a Modificar

**1. `components/AuthView.tsx`** (reescribir ~150 líneas)
- Forms de signup/login reales
- Llamadas a Supabase Auth
- Manejo de errores (email duplicado, password débil)
- Toggle entre login/signup

**2. `App.tsx`** (modificar ~30 líneas)
- Usar `useAuth()` en lugar de localStorage
- Integrar MigrationModal
- Loading state durante auth init
- Feature flag aware

**3. `components/ProfileView.tsx`** (modificar ~10 líneas)
- Logout con Supabase
- Fallback a localStorage

### Flujo de Usuario

```
Usuario nuevo:
1. Click "Registrarme"
2. Ingresa email/password/username
3. Supabase crea user + profile (trigger automático)
4. Auto-login
5. Redirect a onboarding

Usuario existente (con datos legacy):
1. Login con Supabase
2. Sistema detecta datos en localStorage
3. Muestra MigrationModal "¿Migrar datos?"
4. Usuario acepta → migrateAllData()
5. Progress bar durante upload
6. Success → localStorage limpiado (con backup)
```

### Checklist
- [ ] Signup crea user en Supabase
- [ ] Signup crea profile automáticamente (trigger)
- [ ] Login funciona
- [ ] Session persiste en page refresh
- [ ] Logout limpia session
- [ ] MigrationModal aparece para usuarios legacy
- [ ] Feature flag permite rollback

### Testing
```bash
# Activar feature
echo "VITE_FEATURE_USE_SUPABASE_AUTH=true" >> .env.local
npm run dev

# Probar en browser:
# 1. Signup → Verificar en Supabase Dashboard → Auth
# 2. Login → Debe funcionar
# 3. Refresh page → Debe mantener sesión
# 4. Logout → Debe limpiar

# Rollback test:
# Cambiar VITE_FEATURE_USE_SUPABASE_AUTH=false
# npm run dev
# Debe volver a localStorage
```

---

## 📦 FASE 2: Closet Items (6-8h)

### Objetivo
Migrar sistema de prendas a Supabase (DB + Storage).

### Archivos a Crear

**1. `src/services/closetService.ts`** (300 líneas)
- `getClosetItems(userId)` - Fetch desde DB
- `addClothingItem(item, file)` - Upload + Insert
- `updateClothingItem(id, metadata)` - Update
- `deleteClothingItem(id)` - Soft delete
- Feature flag aware (llama localStorage o Supabase)
- Optimistic updates

### Archivos a Modificar

**1. `App.tsx`** (modificar ~50 líneas)
- Reemplazar `useLocalStorage('ojodeloca-closet')` con `useState`
- `useEffect` para fetch inicial
- Llamar closetService en mutations

**2. `components/AddItemView.tsx`** (modificar ~40 líneas)
- Upload imagen a Storage en lugar de base64
- Generar thumbnail
- Comprimir antes de upload
- Llamar closetService.addClothingItem

**3. `components/ItemDetailView.tsx`** (modificar ~20 líneas)
- Update metadata → closetService.updateClothingItem
- Delete → closetService.deleteClothingItem

**4. `components/ClosetView.tsx`** (modificar ~10 líneas)
- Recibir items de Supabase
- Loading states

### Flujo de Datos

```
Agregar Prenda:
1. Usuario sube foto
2. compressImage() - Reducir tamaño
3. createThumbnail() - Generar preview
4. uploadImage('clothing-images', path, file) → URL
5. INSERT en clothing_items table con URL
6. Optimistic update en UI
7. Success/Error handling

Listar Prendas:
1. App mounts → useEffect
2. closetService.getClosetItems(userId)
3. SELECT * FROM clothing_items WHERE user_id = $1
4. setCloset(items)
5. UI renderiza

Editar/Borrar:
1. Usuario hace cambio
2. Optimistic update
3. closetService.update/delete()
4. Success → nada (ya actualizado)
5. Error → rollback UI
```

### Migración de Datos Legacy

El `migrationService.ts` de Fase 0 ya tiene la lógica:

```
Para cada item en localStorage:
1. Leer base64 image
2. Convertir a File object
3. Comprimir imagen
4. Upload a Storage → get URL
5. Convertir metadata legacy → formato Supabase
6. INSERT en clothing_items
7. Update progress bar
8. Handle errors
```

### Checklist
- [ ] Agregar prenda sube a Storage y guarda en DB
- [ ] Lista carga desde Supabase
- [ ] Editar metadata actualiza DB
- [ ] Borrar hace soft delete (deleted_at)
- [ ] Filtros/sort funcionan
- [ ] Optimistic updates funcionan
- [ ] Migración de datos legacy funciona
- [ ] Feature flag permite rollback

### Testing
```bash
echo "VITE_FEATURE_USE_SUPABASE_CLOSET=true" >> .env.local
npm run dev

# En browser:
# 1. Agregar prenda → Verificar Storage + DB
# 2. Editar metadata → Verificar UPDATE en DB
# 3. Borrar → Verificar soft delete
# 4. Migrar datos legacy → Progress bar completa
```

---

## 👕 FASE 3: Saved Outfits (4-5h)

### Objetivo
Migrar outfits guardados a Supabase DB.

### Archivos a Crear

**1. `src/services/outfitService.ts`** (200 líneas)
- `getSavedOutfits(userId)` - Fetch desde DB
- `saveOutfit(outfit)` - Insert
- `deleteOutfit(id)` - Soft delete
- Convertir estructura: `{top_id, bottom_id, shoes_id}` → `clothing_item_ids: []`
- Feature flag aware

### Archivos a Modificar

**1. `App.tsx`** (modificar ~30 líneas)
- Reemplazar `useLocalStorage('ojodeloca-saved-outfits')`
- Fetch inicial de outfits
- Llamar outfitService

**2. `components/FitResultView.tsx`** (modificar ~20 líneas)
- Save outfit → outfitService.saveOutfit()
- Convertir FitResult → Outfit format

**3. `components/SavedOutfitsView.tsx` y `OutfitDetailView.tsx`** (modificar ~30 líneas)
- Cargar desde Supabase
- Delete usa outfitService

### Conversión de Estructura

**Legacy:**
```typescript
{
  id: "outfit_123",
  top_id: "item_1",
  bottom_id: "item_2",
  shoes_id: "item_3",
  explanation: "..."
}
```

**Supabase:**
```typescript
{
  id: "uuid",
  user_id: "uuid",
  clothing_item_ids: ["item_1", "item_2", "item_3"],
  ai_reasoning: "...",
  ai_generated: true
}
```

### Checklist
- [ ] Guardar outfit inserta en DB
- [ ] Lista carga desde Supabase
- [ ] Borrar hace soft delete
- [ ] Conversión de estructura funciona
- [ ] Migración de datos legacy funciona
- [ ] Feature flag funciona

---

## 🤖 FASE 4: AI Services via Edge Functions (6-8h)

### Objetivo
Migrar llamadas directas a Gemini → Edge Functions (API key segura).

### Archivos a Crear

**1. `src/services/edgeFunctionClient.ts`** (100 líneas)
- `callEdgeFunction(name, body)` - Wrapper genérico
- Auth headers automáticos (JWT)
- Error handling unificado
- Retry logic con exponential backoff

### Archivos a Modificar

**1. `services/geminiService.ts` → `services/aiService.ts`** (refactor ~500 líneas)
- `analyzeClothingItem()` → llama `/analyze-clothing` Edge Function
- `generateOutfit()` → llama `/generate-outfit`
- `generatePackingList()` → llama `/generate-packing-list`
- Mantener virtualTryOn, findSimilarItems en cliente (por ahora)
- Feature flag aware

**2. `components/AddItemView.tsx`** (modificar ~10 líneas)
- Import aiService en lugar de geminiService
- Misma interface, nueva implementación

**3. `components/GenerateFitView.tsx`** (modificar ~10 líneas)
- Import aiService

**4. `components/SmartPackerView.tsx`** (modificar ~10 líneas)
- Import aiService

### Flujo de Edge Function

```
Cliente:
1. user sube imagen
2. aiService.analyzeClothingItem(file)
3. → callEdgeFunction('/analyze-clothing', { image: file })
4. → fetch con JWT header

Edge Function:
5. Valida JWT
6. Convierte image a base64
7. Llama Gemini API con GEMINI_API_KEY (segura)
8. Retorna JSON

Cliente:
9. Recibe análisis
10. Muestra en UI
```

### Beneficios
- ✅ API key nunca expuesta
- ✅ Rate limiting server-side
- ✅ Logs centralizados
- ✅ Access directo a DB desde Edge Function
- ✅ Posibilidad de caché

### Checklist
- [ ] Edge Function `/analyze-clothing` funciona
- [ ] Edge Function `/generate-outfit` funciona
- [ ] Edge Function `/generate-packing-list` funciona
- [ ] Auth headers se envían
- [ ] API key no está en cliente
- [ ] Error handling funciona
- [ ] Feature flag permite usar cliente directo

---

## ⚙️ FASE 5: User Preferences (2-3h)

### Objetivo
Migrar preferencias de usuario a Supabase.

### Archivos a Modificar

**1. `App.tsx`** (modificar ~20 líneas)
- Guardar sort preferences en profile
- Fetch al login
- Update on change

**2. Migration SQL** (agregar a profiles table)
```sql
ALTER TABLE profiles
ADD COLUMN sort_preference JSONB DEFAULT '{"property": "date", "direction": "desc"}'::jsonb;
```

### Theme Preference
**Decisión:** Mantener en localStorage (es correcto, preferencia local del dispositivo).

### Checklist
- [ ] Sort preferences persisten en Supabase
- [ ] Se cargan al login
- [ ] Theme sigue en localStorage
- [ ] Feature flag funciona

---

## ✅ Checklist Final (Post-Implementación)

### Funcionalidad
- [ ] Signup/Login funciona
- [ ] Agregar prenda funciona (Storage + DB)
- [ ] Listar prendas funciona
- [ ] Generar outfit funciona (Edge Function)
- [ ] Guardar outfit funciona
- [ ] Borrar prenda/outfit funciona
- [ ] Migración de datos legacy funciona
- [ ] Todos los feature flags = true

### Calidad
- [ ] No hay errores en console
- [ ] No hay warnings de TypeScript
- [ ] Build funciona (`npm run build`)
- [ ] Performance igual o mejor que localStorage
- [ ] Loading states en todas las operaciones async

### Seguridad
- [ ] API key no está en código cliente
- [ ] RLS policies funcionan (no se ven datos de otros users)
- [ ] Auth tokens se manejan correctamente
- [ ] Storage policies funcionan

### Deploy
- [ ] Variables de entorno en Vercel/Netlify
- [ ] Edge Functions deployadas
- [ ] Frontend deployado
- [ ] SSL funcionando (HTTPS)

---

## 🚨 Plan de Rollback

### Si algo falla en Fase X:

**Opción A: Rollback de Feature**
```bash
# Desactivar feature flag problemática
# En .env.local:
VITE_FEATURE_USE_SUPABASE_CLOSET=false

# Reiniciar
npm run dev
```

**Opción B: Restaurar localStorage**
```javascript
// En browser console:
const backup = localStorage.getItem('ojodeloca-closet-backup');
localStorage.setItem('ojodeloca-closet', backup);
window.location.reload();
```

**Opción C: Rollback completo**
```bash
# Desactivar todos los flags
cat > .env.local << EOF
VITE_FEATURE_USE_SUPABASE_AUTH=false
VITE_FEATURE_USE_SUPABASE_CLOSET=false
VITE_FEATURE_USE_SUPABASE_OUTFITS=false
VITE_FEATURE_USE_SUPABASE_EDGE_FN=false
VITE_FEATURE_USE_SUPABASE_PREFERENCES=false
EOF

npm run dev
```

---

## 📈 Orden de Ejecución Recomendado

```
1. FASE 0 (Preparación)
   ↓
2. Test feature flags
   ↓
3. FASE 1 (Auth)
   ↓
4. Test completo de auth
   ↓
5. Deploy a staging/testing
   ↓
6. FASE 2 (Closet)
   ↓
7. Test migración de datos
   ↓
8. FASE 3 (Outfits)
   ↓
9. Test completo
   ↓
10. FASE 4 (Edge Functions)
    ↓
11. Test AI services
    ↓
12. FASE 5 (Preferences)
    ↓
13. Test final completo
    ↓
14. Deploy a producción
    ↓
15. Monitor por 1 semana
    ↓
16. Remove feature flags (código legacy)
    ↓
17. Cleanup code
```

---

## 🎯 Criterios de Éxito

### Por Fase
- ✅ Todos los tests pasan
- ✅ Feature flag on/off sin bugs
- ✅ Performance no degradada
- ✅ No data loss

### Global
- ✅ 0 llamadas a Gemini desde cliente
- ✅ 0 datos críticos en localStorage
- ✅ Auth completo en Supabase
- ✅ Imágenes en Storage
- ✅ App deployable y escalable

---

## 💰 Costos Estimados

**Durante desarrollo (Free Tier):**
- Supabase: $0
- Gemini AI: $0 (dentro de free tier)
- Vercel: $0

**En producción (estimado para 100 users activos/mes):**
- Supabase: $0 (dentro de free tier: 500MB DB, 1GB storage, 2GB bandwidth)
- Gemini AI: ~$5-10/mes (depende de uso)
- Vercel: $0

**Total:** ~$5-10/mes

---

## 📞 Soporte

**Problemas técnicos:**
- Ver `BACKEND_SUMMARY.md` → Troubleshooting
- Logs en Supabase Dashboard
- Issues en GitHub

**Dudas sobre el plan:**
- Leer `MIGRATION_PLAN.md` (detalles técnicos)
- Ver código de ejemplo en cada fase

---

## ⏰ Timeline Sugerido

**Semana 1:**
- Día 1-2: Fase 0 + Fase 1 (Setup + Auth)
- Día 3-4: Fase 2 (Closet)
- Día 5: Testing y fixes

**Semana 2:**
- Día 1: Fase 3 (Outfits)
- Día 2-3: Fase 4 (Edge Functions)
- Día 4: Fase 5 (Preferences)
- Día 5: Testing final + Deploy

**Total:** ~10 días laborables

---

¿Listo para empezar? 🚀

Seguí el orden:
1. Verificar pre-requisitos
2. Empezar con Fase 0
3. Ir marcando checkboxes
4. Probar cada fase antes de continuar
