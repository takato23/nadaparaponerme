# Testing Plan: AI Image Generation System

## Resumen Ejecutivo

Este documento detalla el plan de testing completo para el sistema de generación de imágenes con IA (AI Fashion Designer), que utiliza Gemini 2.5 Flash + Imagen 4.0 de Google AI Studio para crear prendas de vestir fotorrealistas a partir de descripciones de texto.

**Stack tecnológico**:
- Frontend: React + TypeScript
- Backend: Supabase Edge Functions
- IA: Google Gemini API (Gemini 2.5 Flash + Imagen 4.0)
- Rate limiting: 5 generaciones/día para usuarios free (Plan FREE)

**Componentes principales**:
- `AIFashionDesignerView.tsx` - UI de 3 pasos (describe → generating → result)
- `services/geminiService.ts::generateFashionDesign()` - Lógica de generación
- `services/aiService.ts` - Capa intermedia con control de quota
- `supabase/functions/generate-image/` - Edge Function proxy (opcional)

---

## 1. Unit Tests (Opcional - Futuro)

> **Nota**: Actualmente el proyecto no tiene framework de testing unitario configurado. Esta sección está documentada para referencia futura cuando se implemente Jest/Vitest.

### Funciones a testear

#### `generateFashionDesign(request: AIDesignRequest)`
```typescript
// Test cases sugeridos:
✓ Should optimize prompt with Gemini 2.5 Flash
✓ Should generate image with Imagen 4.0
✓ Should analyze generated image metadata
✓ Should return complete AIDesignedItem
✓ Should throw error when prompt is empty
✓ Should throw error when API key is missing
✓ Should handle Gemini API errors gracefully
```

#### `canGenerateOutfit()` (subscriptionService)
```typescript
// Test cases sugeridos:
✓ Free user should be blocked after 5 generations
✓ Pro user should be blocked after 50 generations
✓ Should return correct error message in Spanish
✓ Should check daily quota correctly
✓ Should reset quota at midnight UTC
```

#### Validación de tipos
```typescript
// Test cases sugeridos:
✓ AIDesignRequest should validate required fields
✓ DesignCategory should accept only valid values
✓ DesignStyle should accept only valid values
✓ Generated metadata should match ClothingItemMetadata interface
```

---

## 2. Integration Tests

### Edge Function Testing

#### Autenticación y Autorización

- [ ] **Auth Success**: Request con JWT válido genera imagen exitosamente
  - Setup: Obtener JWT de Supabase Auth
  - Expected: Status 200 + `resultImage` en respuesta

- [ ] **Auth Failure - Invalid JWT**: Request con JWT inválido retorna 401
  - Setup: Usar JWT expirado o malformado
  - Expected: Status 401 + error message

- [ ] **Auth Failure - No JWT**: Request sin header Authorization retorna 401
  - Setup: Llamar Edge Function sin auth header
  - Expected: Status 401 + "Unauthorized"

#### Validación de Input

- [ ] **Valid Prompt**: Request con prompt válido genera imagen
  - Input: `{ prompt: "white cotton t-shirt with crew neck" }`
  - Expected: Base64 image string con prefijo `data:image/jpeg;base64,`

- [ ] **Empty Prompt**: Request con prompt vacío retorna 400
  - Input: `{ prompt: "" }` o `{ prompt: "   " }`
  - Expected: Status 400 + error "Missing prompt"

- [ ] **Long Prompt**: Prompt >1000 caracteres se trunca automáticamente
  - Input: Prompt de 1500 caracteres
  - Expected: Generación exitosa con prompt truncado a 1000 chars

- [ ] **Special Characters**: Prompt con emojis y caracteres especiales funciona
  - Input: `{ prompt: "👗 vestido rojo con ✨ lentejuelas" }`
  - Expected: Generación exitosa (caracteres especiales removidos internamente)

#### Integración con Imagen API

- [ ] **Image Generation Success**: Imagen se genera correctamente
  - Expected: Imagen JPEG en base64 con aspect ratio 1:1
  - Validation: Decodificar base64 y verificar es JPEG válido

- [ ] **Image Upload to Storage**: Imagen se sube a Supabase Storage (si implementado)
  - Expected: URL firmada retornada
  - Validation: URL es accesible y muestra imagen

- [ ] **Database Record Creation**: Registro se guarda en `ai_generated_images` (si tabla existe)
  - Expected: Row con user_id, prompt, image_url, created_at
  - Validation: Query a tabla retorna registro

#### Rate Limiting Tests

- [ ] **Free User Blocked After Limit**: Usuario free bloqueado después de 5 generaciones
  - Setup: Generar 5 imágenes con usuario free
  - Expected: 6ta generación retorna error 429 o bloqueado en frontend

- [ ] **Error 429 Clear Message**: Error 429 retorna mensaje claro en español
  - Expected: "Has alcanzado tu límite diario de generaciones. Volvé mañana o upgradeá tu plan."

- [ ] **Quota Reset at Midnight**: Quota se resetea correctamente al día siguiente
  - Setup: Generar 5 imágenes hoy
  - Test: Al día siguiente (después de medianoche UTC), generar 1 más
  - Expected: Generación exitosa

- [ ] **Concurrent Requests No Race Condition**: Múltiples requests simultáneos no causan race conditions
  - Setup: Hacer 3 requests simultáneos cuando quedan 2 generaciones disponibles
  - Expected: Solo 2 generaciones exitosas, 1 bloqueada

- [ ] **Pro User Higher Limit**: Usuario con plan 'pro' puede generar 50 imgs
  - Setup: Usuario pro con 49 generaciones usadas
  - Expected: 50va generación exitosa

---

## 3. E2E Tests (Manual)

### Happy Path - Flujo Completo Exitoso

**Precondiciones**: Usuario registrado con 0/5 generaciones usadas hoy

#### Paso 1: Acceso inicial
- [ ] Login como usuario nuevo (email + password)
- [ ] Navegar a vista Home
- [ ] Buscar card "AI Fashion Designer" con icono auto_awesome
- [ ] Verificar descripción: "Diseñá tu prenda ideal con IA"

#### Paso 2: Abrir modal de diseño
- [ ] Click en card "AI Fashion Designer"
- [ ] Modal se abre con animación fade-in
- [ ] Header muestra título "AI Fashion Designer"
- [ ] Icono de cerrar (X) visible en esquina superior derecha

#### Paso 3: Completar formulario
- [ ] Ver hero card con icono auto_awesome y descripción
- [ ] Campo "Descripción de la prenda" acepta texto
- [ ] Ingresar: **"remera blanca oversize estilo streetwear"**
- [ ] Ver 6 botones de categoría (top, bottom, shoes, outerwear, dress, accessory)
- [ ] Seleccionar categoría: **"top"** (botón se pone azul)
- [ ] Dropdown "Estilo" muestra 10 opciones
- [ ] Seleccionar estilo: **"streetwear"** (opcional)
- [ ] Campo "Ocasión" acepta texto libre (opcional)
- [ ] Ingresar ocasión: **"casual"**

#### Paso 4: Generar diseño
- [ ] Botón "Generar Diseño con IA" está habilitado (no disabled)
- [ ] Click en botón "Generar Diseño con IA"
- [ ] Vista cambia a step "generating" inmediatamente
- [ ] Loader spinner visible
- [ ] Mensaje: "Generando tu diseño..."
- [ ] 3 sub-mensajes con emojis:
  - 🎨 Optimizando prompt con IA...
  - 🖼️ Generando imagen con Imagen 4...
  - 🔍 Analizando metadata de la prenda...

#### Paso 5: Ver resultado
- [ ] Después de 10-15 segundos, vista cambia a "result"
- [ ] Header muestra "Tu Diseño Generado"
- [ ] Imagen generada se muestra en Card con rounded corners
- [ ] Imagen es fotorrealista (no dibujo ni ilustración)
- [ ] Imagen tiene fondo blanco/neutro
- [ ] Prenda está centrada y bien encuadrada

#### Paso 6: Revisar detalles
- [ ] Card "Detalles del Diseño" muestra:
  - Descripción original: "remera blanca oversize estilo streetwear"
  - Categoría: "top"
  - Estilo: "streetwear"
- [ ] Card "Análisis de IA" muestra:
  - Tipo detectado (subcategory): ej. "t-shirt", "camiseta"
  - Color principal con cuadrado de color + nombre
  - Tags de vibe (ej: casual, streetwear, comfortable)

#### Paso 7: Guardar en closet
- [ ] Botón "Agregar al Armario" visible con icono +
- [ ] Click en "Agregar al Armario"
- [ ] Modal se cierra con animación
- [ ] Navegar a vista "Closet"
- [ ] Verificar prenda guardada en grid
- [ ] Click en prenda → modal de detalle
- [ ] Verificar metadata correcta (category, color, vibe_tags)

#### Paso 8: Verificar quota
- [ ] Volver a Home → click "AI Fashion Designer"
- [ ] Verificar contador de quota (si visible): **1/5 generaciones usadas**

---

### Error Cases - Manejo de Errores

#### Límite diario alcanzado
- [ ] **Setup**: Generar 5 imágenes con usuario free
- [ ] Intentar generar imagen #6
- [ ] **Expected**:
  - Botón "Generar" queda disabled
  - Mensaje de error visible: "Has alcanzado tu límite diario de generaciones"
  - Sugerencia mostrada: "Volvé mañana a las 00:00 UTC o upgradeá tu plan a Pro"
  - Color rojo en mensaje (bg-red-50 dark:bg-red-900/20)

#### Error de red/timeout
- [ ] **Setup**: Desactivar WiFi/datos móviles mientras genera
- [ ] Iniciar generación y desconectar internet
- [ ] **Expected**:
  - Después de 30-60 segundos, mostrar error de timeout
  - Mensaje: "Error de conexión. Verificá tu internet."
  - Botón "Reintentar" visible
  - Click reintentar → volver a step "describe"

#### API error 500
- [ ] **Setup**: (Requiere simular error en backend)
- [ ] Llamar Edge Function con API key inválida
- [ ] **Expected**:
  - Error message amigable: "Hubo un problema generando tu diseño. Intentá de nuevo."
  - No mostrar error técnico al usuario
  - Console.error logueado para debugging
  - Volver a step "describe" con formulario intacto

#### Prompt vacío
- [ ] Dejar campo "Descripción" vacío
- [ ] Click en "Generar Diseño"
- [ ] **Expected**:
  - Botón disabled (no debería permitir click)
  - Si se fuerza el click, mostrar error: "Por favor describí la prenda que querés diseñar"

---

### Edge Cases - Casos Límite

#### Prompts especiales

- [ ] **Prompt con emojis**: "👗 vestido rojo con lentejuelas ✨"
  - Expected: Generación exitosa, emojis removidos internamente

- [ ] **Prompt con tildes**: "pantalón de mezclilla azul oscuro"
  - Expected: Generación exitosa, tildes procesadas correctamente

- [ ] **Prompt en inglés**: "black leather jacket with silver zippers"
  - Expected: Generación exitosa (Gemini soporta multi-idioma)

- [ ] **Prompt muy corto**: "remera"
  - Expected: Generación exitosa pero resultado puede ser genérico

- [ ] **Prompt muy largo** (500 caracteres): Descripción detallada con múltiples frases
  - Expected: Generación exitosa, prompt no truncado hasta 1000 chars

#### Navegación y UX

- [ ] **Cerrar modal durante generación**:
  - Click X mientras está en step "generating"
  - Expected: Modal se cierra, generación cancelada (request abortado si es posible)

- [ ] **Botón "Atrás" del navegador**:
  - Click atrás mientras modal está abierto
  - Expected: Modal se cierra pero no sale de la app

- [ ] **Usuario sin internet**:
  - Abrir modal sin conexión
  - Intentar generar
  - Expected: Error de red inmediato con mensaje claro

- [ ] **Storage lleno** (Supabase Storage límite alcanzado):
  - Expected: Error de backend manejado con mensaje "No se pudo guardar la imagen"

#### Múltiples tabs

- [ ] Abrir app en 2 tabs del navegador
- [ ] Generar imagen en Tab 1
- [ ] Generar imagen en Tab 2 simultáneamente
- [ ] **Expected**:
  - Ambas generaciones exitosas si hay quota disponible
  - No hay duplicación de requests
  - Contador de quota sincronizado entre tabs (puede requerir refresh)

---

## 4. Performance Tests

### Métricas de Tiempo

- [ ] **Tiempo total de generación**: <15 segundos (P95)
  - Measurement: Desde click "Generar" hasta imagen visible
  - Tool: Browser DevTools Performance tab
  - Target: 95% de requests <15s, 50% <10s

- [ ] **Edge Function cold start**: <3 segundos
  - Measurement: Primera llamada después de inactividad
  - Tool: Supabase Dashboard → Edge Functions logs
  - Target: <3s para primera llamada, <1s para subsecuentes

- [ ] **Image upload time**: <2 segundos (si aplica Storage upload)
  - Measurement: Tiempo desde imagen generada hasta URL disponible
  - Tool: Network tab → observe storage.supabase.co request
  - Target: <2s para imágenes ~500KB

- [ ] **UI responsiveness**: UI no se congela durante generación
  - Test: Intentar scroll o click otros elementos mientras genera
  - Expected: UI responde, animaciones fluidas
  - Target: 60 FPS durante todo el proceso

### Carga Concurrente

- [ ] **Múltiples tabs abiertos**: No duplican requests
  - Setup: Abrir 3 tabs, generar en todas al mismo tiempo
  - Tool: Network tab → verificar 3 requests únicos
  - Expected: Cada request es independiente, sin duplicados

- [ ] **10 usuarios simultáneos**: Todos generan exitosamente
  - Setup: 10 usuarios diferentes hacen request al mismo tiempo
  - Tool: Postman Collection Runner o k6 load testing
  - Expected: Todas las requests exitosas (si quota permite)
  - Target: Latencia <20s para todas

### Optimización de Recursos

- [ ] **Memory usage**: <100MB durante generación
  - Tool: Chrome DevTools → Memory tab
  - Measurement: Heap size antes y después de generación
  - Expected: No memory leaks, GC después de cerrar modal

- [ ] **Network payload**: Imagen generada <1MB
  - Tool: Network tab → observe response size
  - Expected: JPEG base64 string ~500KB-1MB
  - Compression: Si >1MB, considerar reducir calidad JPEG

---

## 5. Security Tests

### Row Level Security (RLS)

- [ ] **RLS Policies Active**: Usuario A no puede ver imágenes de Usuario B
  - Setup: Generar imagen con User A, intentar acceder con User B
  - Query: `SELECT * FROM ai_generated_images WHERE user_id != current_user_id()`
  - Expected: Zero rows returned

- [ ] **Service Role Bypass**: Edge Function puede escribir con service_role key
  - Test: Edge Function inserta registro en tabla con RLS activo
  - Expected: Insert exitoso usando service_role (bypass RLS)

### API Key Protection

- [ ] **API key nunca expuesto**: Gemini API key no se filtra al cliente
  - Tool: Chrome DevTools → Network tab
  - Verification: Buscar "GEMINI_API_KEY" en todos los requests/responses
  - Expected: API key solo en backend (Edge Function env vars)

- [ ] **Environment variables**: Secrets no committeados en git
  - Command: `git log --all -p | grep -i "gemini_api_key"`
  - Expected: Zero results

### Storage Security

- [ ] **Storage bucket privado**: URLs firmadas requeridas
  - Test: Intentar acceder URL de imagen sin auth
  - Expected: 401 Unauthorized o URL firmada con expiración

- [ ] **Signed URLs expiration**: URLs expiran después de 1 hora (configurable)
  - Test: Obtener signed URL, esperar 1 hora, intentar acceder
  - Expected: 403 Forbidden o "Signature expired"

### Input Sanitization

- [ ] **SQL Injection**: Prompt con SQL malicioso es sanitizado
  - Input: `{ prompt: "'; DROP TABLE ai_generated_images; --" }`
  - Expected: Generación falla con error de validación o genera imagen sin ejecutar SQL

- [ ] **XSS Attack**: Prompt con script tags es sanitizado
  - Input: `{ prompt: "<script>alert('XSS')</script>" }`
  - Expected: Tags HTML removidos o escapados, no se ejecuta JavaScript

- [ ] **Path Traversal**: Prompt con `../../../etc/passwd` es sanitizado
  - Input: `{ prompt: "../../../etc/passwd" }`
  - Expected: Prompt procesado como texto plano, sin acceso a filesystem

---

## 6. Mobile Testing

### Responsive Design

- [ ] **iPhone SE (320px width)**: Layout correcto sin scroll horizontal
  - Test: Chrome DevTools → Device toolbar → iPhone SE
  - Expected: Modal ocupa 90% ancho, padding 16px, texto legible

- [ ] **iPad (768px width)**: Layout se adapta a tablet
  - Test: Chrome DevTools → iPad viewport
  - Expected: Modal max-width 600px, imagen centrada

- [ ] **Desktop (1920px width)**: Modal no se estira demasiado
  - Expected: Modal max-width 800px (3xl), imagen mantiene aspect ratio 1:1

### Touch Interactions

- [ ] **Touch gestures**: Tap, scroll funcionan correctamente
  - Test: Dispositivo móvil real o simulador
  - Expected: Botones responden al tap, scroll suave sin lag

- [ ] **Pinch to zoom**: Imagen generada permite zoom
  - Test: En step "result", hacer pinch en imagen
  - Expected: Imagen hace zoom (behavior natural del navegador)

### Mobile Performance

- [ ] **Images load lazy**: Imágenes se cargan bajo demanda
  - Test: Network tab → verificar loading="lazy" en <img> tags
  - Expected: Imagen no carga hasta que modal está visible

- [ ] **No horizontal scroll**: Layout no causa scroll horizontal
  - Test: Abrir modal en mobile, intentar scroll lateral
  - Expected: Zero scroll horizontal en ningún step

### iOS Guidelines

- [ ] **Botones tamaño mínimo 44px**: Touch targets accesibles
  - Measurement: DevTools → Inspect element → width/height
  - Expected: Todos los botones ≥44px altura (iOS Human Interface Guidelines)

- [ ] **Safe area insets**: Contenido no se oculta en notch (iPhone X+)
  - Test: iPhone 12 simulator
  - Expected: Modal respeta safe area, padding adicional si es necesario

---

## 7. Analytics Verification

> **Nota**: Asume que el proyecto tiene sistema de analytics (ej: Google Analytics, Mixpanel, Amplitude)

### Eventos Trackeados

- [ ] **Event: "image_generation_started"**: Se registra al iniciar generación
  - Trigger: Click en "Generar Diseño con IA"
  - Properties:
    - `category`: "top" | "bottom" | etc.
    - `style`: "streetwear" | null
    - `prompt_length`: number (caracteres)
    - `user_tier`: "free" | "pro"
  - Tool: Analytics dashboard → Events → image_generation_started

- [ ] **Event: "image_generation_success"**: Se registra al completar generación
  - Trigger: Step cambia a "result"
  - Properties:
    - `generation_time_ms`: number (duración total)
    - `optimized_prompt_length`: number
    - `image_size_bytes`: number
    - `metadata_category`: string (detected category)
  - Tool: Analytics dashboard → Events → image_generation_success

- [ ] **Event: "image_generation_error"**: Se registra en errores
  - Trigger: Catch block en generateFashionDesign()
  - Properties:
    - `error_message`: string
    - `error_type`: "network" | "api" | "validation"
    - `step`: "optimize_prompt" | "generate_image" | "analyze_metadata"
  - Tool: Analytics dashboard → Events → image_generation_error

- [ ] **Event: "quota_limit_reached"**: Se registra al alcanzar límite
  - Trigger: canGenerateOutfit() retorna allowed: false
  - Properties:
    - `user_tier`: "free" | "pro"
    - `generations_used`: number
    - `generations_limit`: number
  - Tool: Analytics dashboard → Events → quota_limit_reached

- [ ] **Event: "design_added_to_closet"**: Se registra al guardar
  - Trigger: Click en "Agregar al Armario"
  - Properties:
    - `design_id`: string
    - `category`: string
    - `time_to_decision_seconds`: number (desde resultado hasta guardar)

### Metadata Validada

- [ ] **User properties**: Eventos incluyen user_id, tier, created_at
  - Verification: Evento tiene `user_id` asociado
  - Expected: Todos los eventos tienen user context

- [ ] **Session context**: Eventos incluyen session_id, device_type
  - Verification: Analytics muestra device breakdown
  - Expected: Mobile/Desktop/Tablet correctamente identificados

### Dashboard Verificación

- [ ] **Dashboard muestra métricas correctamente**
  - Métricas esperadas:
    - Total generaciones hoy/semana/mes
    - Tasa de éxito (success / started)
    - Tiempo promedio de generación
    - Distribución por categoría (top: 40%, bottom: 30%, etc.)
    - Tasa de guardado (added_to_closet / success)
  - Tool: Analytics dashboard custom views

- [ ] **Funnels configurados**
  - Funnel: Modal opened → Generation started → Success → Added to closet
  - Expected: Conversion rates en cada step
  - Target: 90% started → success, 70% success → added

---

## 8. Pre-Deploy Checklist

### Backend Verification

- [ ] **Database migrations aplicadas**
  - Command: `supabase db push`
  - Verification: Todas las migraciones exitosas, sin errores

- [ ] **Tablas creadas** (si aplica)
  - [ ] `ai_generated_images` - Tabla para almacenar historial
  - [ ] `daily_generation_quota` - Tabla para rate limiting (opcional si se usa subscription_usage)

- [ ] **RLS policies activas**
  - Command: `SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';`
  - Expected: Policies para SELECT/INSERT/UPDATE/DELETE en todas las tablas

- [ ] **Indexes creados**
  - [ ] Index en `ai_generated_images(user_id, created_at DESC)`
  - [ ] Index en `daily_generation_quota(user_id, period_start)`

- [ ] **Triggers funcionando**
  - [ ] Trigger para auto-incrementar counter en subscription_usage
  - [ ] Trigger para reset diario de quota (si implementado con cron)

- [ ] **Edge Function deployada**
  - Command: `supabase functions deploy generate-image`
  - Verification: Function aparece en Supabase Dashboard → Edge Functions
  - Status: Verde (activa)

- [ ] **Secrets configurados**
  - Command: `supabase secrets list`
  - Expected: `GEMINI_API_KEY` presente
  - Test: `supabase secrets get GEMINI_API_KEY` (no mostrar valor)

- [ ] **CORS configurado**
  - Test: Request desde localhost:3000 y desde dominio de producción
  - Expected: Ambos permitidos en corsHeaders

---

### Frontend Verification

- [ ] **TypeScript check pasa**
  - Command: `npm run typecheck` (si configurado) o `tsc --noEmit`
  - Expected: Zero errors, solo warnings aceptables

- [ ] **Build exitoso**
  - Command: `npm run build`
  - Expected: Exit code 0, no errors
  - Verification: Archivos en `dist/` creados correctamente

- [ ] **No console.errors en dev**
  - Start: `npm run dev`
  - Test: Navegar por toda la app, abrir modal AI Designer
  - DevTools Console: Zero console.error messages (warnings OK)

- [ ] **Loading states visibles**
  - Test: Generar diseño, observar loader
  - Expected: Spinner animado + mensajes de progreso
  - No "flash of unstyled content"

- [ ] **Error messages en español**
  - Test: Forzar error (ej: disconnect internet)
  - Expected: Todos los mensajes en español, sin "Error: undefined"

- [ ] **Mobile responsive verificado**
  - Test: DevTools → Device toolbar → test iPhone, iPad, Android
  - Expected: Layout correcto en todos los breakpoints

- [ ] **Dark mode compatible**
  - Test: Toggle dark mode en settings
  - Expected: Modal, imágenes, textos legibles en ambos modos

---

### Integration Verification

- [ ] **Frontend puede llamar Edge Function**
  - Test: Generate image desde UI
  - Network tab: Request a `/functions/v1/generate-image` exitoso
  - Expected: Status 200 + imagen en response

- [ ] **Autenticación funciona end-to-end**
  - Test: Login → Generate image
  - Expected: JWT en Authorization header, user_id correcto en backend

- [ ] **Storage upload funciona** (si implementado)
  - Test: Generate image → verificar en Storage bucket
  - Expected: Archivo .jpg en carpeta `user_{user_id}/designs/`

- [ ] **Rate limiting activo**
  - Test: Generar 5 imágenes con free user
  - Expected: 6ta generación bloqueada con error claro

- [ ] **Analytics tracking funcional**
  - Test: Generate image, verificar en analytics dashboard
  - Expected: Eventos image_generation_* aparecen en tiempo real

---

### Performance Benchmarks

- [ ] **First Load Time**: <3 segundos (home page)
  - Tool: Lighthouse audit
  - Target: Performance score ≥90

- [ ] **Bundle size**: <500KB initial bundle
  - Tool: `npm run build` → observe bundle analyzer
  - Target: main.js <500KB gzipped

- [ ] **Image optimization**: Imágenes lazy-loaded y comprimidas
  - Tool: Network tab → check image sizes
  - Expected: JPEGs <1MB, WebP si es posible

---

## 9. Browser Compatibility

### Tested On (verificar manualmente):

- [ ] **Chrome 120+ (Desktop)** - Windows 10/11
  - Expected: Full functionality, optimal performance

- [ ] **Safari 17+ (Desktop)** - macOS Sonoma/Ventura
  - Expected: Full functionality, webkit rendering OK

- [ ] **Firefox 120+ (Desktop)** - Windows/macOS
  - Expected: Full functionality, CSS grid OK

- [ ] **Chrome Mobile (Android)** - Android 12+
  - Expected: Touch interactions smooth, performance adequate

- [ ] **Safari Mobile (iOS)** - iOS 16+
  - Expected: Respects safe area, WebKit quirks handled

- [ ] **Edge 120+ (Desktop)** - Windows 10/11
  - Expected: Same as Chrome (Chromium-based)

### Known Issues (documentar aquí)

> **Nota**: Esta sección se llenará durante el testing. Dejar vacío inicialmente.

- [ ] Issue 1: (descripción, browser afectado, workaround)
- [ ] Issue 2: (descripción, browser afectado, workaround)

---

## 10. Testing Tools & Resources

### Herramientas Recomendadas

#### Para Integration Testing
- **Postman** (https://postman.com)
  - Crear Collection "AI Image Generation"
  - Endpoints: generate-image, check-quota, upload-image
  - Guardar JWT token en environment variables

- **cURL** (línea de comandos)
  - Ejemplo: Test Edge Function
    ```bash
    curl -X POST https://your-project.supabase.co/functions/v1/generate-image \
      -H "Authorization: Bearer YOUR_JWT_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"prompt": "white cotton t-shirt"}'
    ```

#### Para Performance Testing
- **Lighthouse** (Chrome DevTools)
  - Audits → Performance
  - Target: Score ≥90

- **k6** (https://k6.io)
  - Load testing con scripts JavaScript
  - Simular 10-100 usuarios concurrentes

#### Para Security Testing
- **Supabase CLI** (https://supabase.com/docs/guides/cli)
  - Test RLS policies localmente
  - Command: `supabase db test`

- **OWASP ZAP** (https://owasp.org/www-project-zap/)
  - Automated security scanner
  - Test for SQL injection, XSS, etc.

#### Para Analytics Verification
- **Google Analytics Debugger** (Chrome Extension)
  - Real-time event debugging
  - Verificar properties enviadas

- **Mixpanel Live View** (si usando Mixpanel)
  - Real-time event stream

---

## 11. Test Execution Schedule

### Pre-Producción (antes de deploy)
- Day 1: Integration tests (Edge Function, DB, Storage)
- Day 2: E2E manual tests (happy path + error cases)
- Day 3: Performance testing + browser compatibility
- Day 4: Security audit + analytics verification
- Day 5: Bug fixes + re-testing

### Post-Producción (después de deploy)
- Week 1: Monitor analytics daily, verificar rate limiting en producción
- Week 2: Collect user feedback, test edge cases reportados
- Month 1: Performance review, optimize si es necesario

---

## 12. Success Criteria

### Functional Requirements ✅
- [ ] Usuario puede generar imágenes fotorrealistas con prompts en español
- [ ] Rate limiting funciona (5/día free, 50/día pro)
- [ ] Imágenes se guardan en closet con metadata correcta
- [ ] Dark mode compatible
- [ ] Mobile responsive

### Performance Requirements ✅
- [ ] Generación <15 segundos (P95)
- [ ] UI no se congela
- [ ] Zero memory leaks

### Security Requirements ✅
- [ ] API key nunca expuesta
- [ ] RLS policies activas
- [ ] Storage URLs firmadas

### UX Requirements ✅
- [ ] Mensajes de error claros en español
- [ ] Loading states informativos
- [ ] Modal accesible (keyboard navigation)

---

## 13. Bug Tracking Template

Para reportar bugs encontrados durante testing:

```markdown
### Bug #[ID]: [Título corto]

**Severity**: Critical | High | Medium | Low
**Priority**: P0 | P1 | P2 | P3

**Steps to Reproduce**:
1. Step 1
2. Step 2
3. Step 3

**Expected Behavior**:
[Descripción de lo esperado]

**Actual Behavior**:
[Descripción de lo que pasó]

**Environment**:
- Browser: Chrome 120 / Safari 17 / etc.
- Device: iPhone 14 Pro / Desktop / etc.
- OS: iOS 17 / Windows 11 / etc.
- User tier: Free / Pro

**Screenshots/Videos**:
[Adjuntar si es posible]

**Console Errors**:
```
[Copiar errores de consola]
```

**Additional Context**:
[Info adicional relevante]
```

---

## Conclusión

Este plan de testing cubre:
- ✅ Integration testing de Edge Functions y APIs
- ✅ E2E testing manual completo (happy path + error cases + edge cases)
- ✅ Performance benchmarks y load testing
- ✅ Security audit (RLS, API keys, input sanitization)
- ✅ Mobile testing en múltiples dispositivos
- ✅ Analytics verification
- ✅ Browser compatibility matrix

**Próximos pasos recomendados**:
1. Ejecutar Pre-Deploy Checklist completo
2. Realizar testing manual siguiendo sección E2E
3. Documentar bugs encontrados usando template
4. Fix bugs críticos antes de deploy
5. Deploy a staging environment primero
6. Testing final en staging
7. Deploy a producción con monitoreo activo

**Ownership**: QA Team + Development Team
**Timeline**: 5 días de testing intensivo antes de production deploy
**Risk Level**: Medium (nuevo feature con AI externa y rate limiting)
