# 📱 Guía de Testing en Dispositivos Móviles

**Objetivo:** Verificar funcionalidad de features críticas en iOS y Android antes de producción

---

## 🎯 FEATURES CRÍTICAS A TESTEAR

### **Prioridad 1 (Bloqueantes)**
1. Captura de cámara nativa
2. Análisis AI de prendas
3. Virtual Try-On
4. Armario/Closet CRUD

### **Prioridad 2 (Importantes)**
5. Preview de foto antes de análisis
6. Validación de calidad de foto
7. Sistema de errores mejorado
8. Navegación general

---

## 📋 DISPOSITIVOS RECOMENDADOS

### **iOS**
- **Mínimo:** iPhone SE (2020) con iOS 14
- **Recomendado:** iPhone 12/13/14 con iOS 15+
- **Navegador:** Safari (nativo)

### **Android**
- **Mínimo:** Cualquier Android 10+
- **Recomendado:** Samsung Galaxy S21+ o Pixel 5+
- **Navegador:** Chrome (nativo)

---

## 🧪 TEST CASE 1: Captura de Cámara Nativa

### **Objetivo:** Verificar que la cámara funciona correctamente en móviles

### **Pre-requisitos:**
- App abierta en dispositivo físico (NO emulador)
- Conexión a internet activa
- URL accesible vía HTTPS (si es remote) o localhost

### **Pasos iOS Safari:**

1. **Primera vez - Permiso de Cámara**
   ```
   Abrir app → Home → "Nueva Prenda"
   ↓
   [Modal: Tips para Fotos Perfectas]
   Verificar: Modal se muestra correctamente
   Acción: Tap "Entendido"
   ↓
   [Pantalla: Agregar Prenda]
   Acción: Tap "Tomar Foto" (botón primario)
   ↓
   [Prompt del sistema iOS]
   Texto: "App quiere acceder a tu cámara"
   Acción: Tap "Permitir"
   ```

   **✅ Resultado esperado:**
   - Cámara se activa inmediatamente
   - Preview en vivo se muestra full-screen
   - Cámara trasera activada (rear camera)
   - Botón de captura visible (círculo blanco 80x80px)
   - Composition grid visible (líneas guía)

   **❌ Errores posibles:**
   - "Permiso denegado" → Verificar que prompt apareció
   - Cámara frontal en vez de trasera → Bug de facingMode
   - Black screen → Verificar permisos en Settings

2. **Captura de Foto**
   ```
   [Cámara activa]
   Acción: Posicionar prenda en frame
   Acción: Tap botón captura (círculo blanco)
   ↓
   [Procesamiento]
   Verificar: Loading spinner visible
   Verificar: "Capturando..." mensaje
   ↓
   [Preview capturado]
   ```

   **✅ Resultado esperado:**
   - Foto se captura instantáneamente (<500ms)
   - Preview muestra foto capturada full-size
   - Botones visibles: "Confirmar" y "Tomar Otra"
   - Validación de calidad se ejecuta automáticamente
   - Si hay warnings, se muestran claramente

   **❌ Errores posibles:**
   - Foto borrosa → Verificar que no hay camera shake
   - Foto muy pesada → Verificar compresión (debe ser <1MB)
   - Black frame → Camera stream no se detuvo correctamente

3. **Compresión de Imagen**
   ```
   [Preview visible]
   Acción: Tap "Confirmar"
   Verificar: Imagen se comprime antes de análisis
   ```

   **✅ Resultado esperado:**
   - Tamaño original: 2-5MB (típico de móvil)
   - Tamaño después: 100-500KB (80-90% reducción)
   - Max dimensión: 800px
   - Quality: 0.8
   - Formato: JPEG

   **Cómo verificar:**
   - Abrir DevTools → Network tab
   - Ver payload enviado a AI service
   - Verificar tamaño del base64 data URL

### **Pasos Android Chrome:**

Repetir los mismos pasos que iOS, con estas diferencias:

**Diferencias en Android:**
- Prompt de permiso diferente: "Allow Chrome to take pictures?"
- Puede solicitar permiso de Storage también
- Orientación puede variar más fluidamente
- Camera stream más estable en background

**✅ Resultado esperado (igual que iOS):**
- Cámara trasera activada
- Captura instantánea
- Compresión automática
- Preview funcional

---

## 🧪 TEST CASE 2: Preview y Validación de Calidad

### **Objetivo:** Verificar que el sistema de preview y validación funciona

### **Pasos:**

1. **Captura una foto de BUENA CALIDAD**
   ```
   Prenda: Camisa clara sobre fondo liso
   Iluminación: Natural, cerca de ventana
   Calidad: Nítida, bien enfocada
   ↓
   Tap captura → Preview
   ```

   **✅ Resultado esperado:**
   - Preview se muestra correctamente
   - ✅ Checks verdes: "Resolución OK", "Brillo OK", "Calidad OK"
   - Botón "Confirmar" habilitado y destacado
   - Botón "Tomar Otra" disponible

2. **Captura una foto de MALA CALIDAD (oscura)**
   ```
   Prenda: Cualquiera
   Iluminación: Muy oscura (simular)
   ↓
   Tap captura → Preview
   ```

   **✅ Resultado esperado:**
   - ⚠️ Warning visible: "Foto Muy Oscura"
   - Sugerencia: "Intenta con mejor iluminación"
   - Action button: "Ver Tips de Foto"
   - Aún permite confirmar (non-blocking)

3. **Captura una foto BORROSA**
   ```
   Prenda: Cualquiera
   Mover cámara mientras capturas (simular blur)
   ↓
   Tap captura → Preview
   ```

   **✅ Resultado esperado:**
   - ⚠️ Warning: "La foto podría estar borrosa"
   - Sugerencia: "Mantén el teléfono estable"
   - Opción de retomar foto

4. **Captura con RESOLUCIÓN BAJA**
   ```
   (Difícil de simular, pero si ocurre)
   ```

   **✅ Resultado esperado:**
   - ⚠️ Warning: "Resolución muy baja"
   - Sugerencia: "Mínimo 400x400px recomendado"

---

## 🧪 TEST CASE 3: Análisis AI (Gemini)

### **Objetivo:** Verificar que el análisis funciona con retry automático

### **Escenario 1: Análisis Exitoso**

```
[Preview confirmado]
Tap "Confirmar"
↓
[Analyzing state]
```

**✅ Resultado esperado:**
- Loading spinner + mensaje "Analizando prenda..."
- Tiempo de análisis: 3-10 segundos (típico)
- Progress visible (opcional)

**Después:**
```
[Editing state]
```

**✅ Resultado esperado:**
- Metadata extraída correctamente:
  - category: "top" | "bottom" | "shoes" etc
  - subcategory: tipo específico
  - color_primary: color dominante detectado
  - vibe_tags: array de estilos
  - seasons: estaciones apropiadas
- Imagen preview visible
- Campos editables
- Botón "Guardar"

### **Escenario 2: Rate Limit (429)**

**Cómo simular:**
- Analizar 5+ prendas en menos de 1 hora
- O forzar error en código temporalmente

**✅ Resultado esperado:**
- No crash inmediato
- Retry automático con backoff:
  - Intento 1: 1 segundo
  - Intento 2: 2.5 segundos
  - Intento 3: 6.25 segundos
- Si todos fallan:
  - ⚠️ Error claro: "Límite de Análisis Alcanzado"
  - Mensaje: "Analizaste 5 prendas esta hora. Esperá 30 min."
  - Action button: "Ver Premium" (si implementado)

### **Escenario 3: Error de Red**

**Cómo simular:**
- Activar modo avión durante análisis
- O desconectar WiFi

**✅ Resultado esperado:**
- Retry automático (3 intentos)
- Si falla:
  - ❌ Error: "Sin Conexión"
  - Mensaje: "Verificá tu conexión a internet"
  - Action button: "Reintentar"
  - Opción: "Guardar para Después" (si offline support)

### **Escenario 4: Foto Muy Oscura**

**✅ Resultado esperado:**
- AI detecta que imagen está muy oscura
- Error específico: "Foto Muy Oscura"
- Sugerencia: "Intenta con mejor iluminación"
- Action buttons:
  - "Ver Tips de Foto"
  - "Tomar Otra Foto"

---

## 🧪 TEST CASE 4: Virtual Try-On

### **Objetivo:** Verificar que Virtual Try-On funciona con prendas reales

### **Pre-requisitos:**
- Armario con al menos 1 top, 1 bottom, 1 zapato
- Outfit generado previamente

### **Pasos:**

1. **Generar Outfit**
   ```
   Home → "Generar Outfit"
   ↓
   [Seleccionar prendas del armario]
   AI genera combinación
   ↓
   [Resultado mostrado]
   Verificar: Top, Bottom, Shoes visibles
   ```

2. **Abrir Virtual Try-On**
   ```
   [Resultado de outfit]
   Tap "Probador Virtual" (botón destacado)
   ↓
   [Virtual Try-On View]
   ```

   **✅ Resultado esperado:**
   - Modal full-screen se abre
   - Solicita permiso de cámara (primera vez)
   - Cámara frontal se activa (selfie mode)
   - Carousel en bottom muestra 3 items:
     - Top del outfit
     - Bottom del outfit
     - Shoes del outfit
   - NO muestra demo items (gafas, sombrero, collar)

   **❌ Error si aparece:**
   - "Items no encontrados" → Bug crítico (debería estar resuelto)
   - Demo items visibles → Hardcoded data no eliminado

3. **Probar Outfit Virtual**
   ```
   [Cámara activa]
   Tap en carousel: Top
   ↓
   [Top aparece como overlay en cámara]
   Acción: Drag para mover
   Acción: Pinch para escalar
   Acción: Rotate para rotar (si implementado)
   ```

   **✅ Resultado esperado:**
   - Item aparece como overlay semi-transparente
   - Drag funciona smooth (60fps)
   - Pinch zoom funciona
   - Rotation funciona (si implementado)
   - Multiple items pueden estar activos simultáneamente

4. **Capturar Resultado**
   ```
   [Outfit posicionado]
   Tap botón "Capturar"
   ↓
   [Photo saved]
   ```

   **✅ Resultado esperado:**
   - Screenshot se captura
   - Opción de guardar en galería
   - Opción de compartir
   - Volver a armario

---

## 🧪 TEST CASE 5: Armario CRUD

### **Objetivo:** Verificar operaciones básicas de armario

### **Crear (Add)**
Ya testeado en Test Cases 1-3

### **Leer (View)**
```
Home → "Armario"
↓
[Closet View]
```

**✅ Resultado esperado:**
- Grid de prendas visible
- Performance fluida en scroll
- Imágenes cargan correctamente
- Tap en item abre detalle

### **Actualizar (Edit)**
```
[Closet View]
Tap en prenda
↓
[Item Detail]
Tap "Editar"
↓
[Edit Modal]
Cambiar: color, tags, nombre
Tap "Guardar"
```

**✅ Resultado esperado:**
- Modal de edición se abre
- Campos pre-populados con data actual
- Cambios se guardan correctamente
- Grid se actualiza automáticamente

### **Eliminar (Delete)**
```
[Item Detail]
Tap "Eliminar"
↓
[Confirmation Modal]
Confirmar eliminación
```

**✅ Resultado esperado:**
- ⚠️ Modal de confirmación aparece
- Mensaje: "¿Estás seguro? Esta prenda se eliminará."
- Buttons: "Cancelar" y "Eliminar"
- Después de confirmar:
  - Item desaparece del grid
  - Toast notification: "Prenda eliminada"
  - Volver a closet view

---

## 🧪 TEST CASE 6: Error Handling

### **Objetivo:** Verificar que errores se manejan correctamente

### **Escenarios a probar:**

1. **Error de Permiso de Cámara Denegado**
   ```
   Settings → App → Cámara → OFF
   ↓
   Abrir app → Tomar Foto
   ```

   **✅ Resultado esperado:**
   - No crash
   - Error UI claro: "Permiso de Cámara Denegado"
   - Instrucciones específicas:
     - iOS: "Ve a Settings → Safari → Cámara → Permitir"
     - Android: "Ve a Settings → Apps → Chrome → Permisos → Cámara"
   - Botón "Abrir Settings"
   - Fallback: "Usar Galería de Fotos"

2. **Network Timeout**
   ```
   Modo avión ON
   ↓
   Intentar análisis AI
   ```

   **✅ Resultado esperado:**
   - 3 reintentos automáticos
   - Error: "Sin Conexión"
   - Action: "Reintentar" cuando vuelva conexión

3. **Storage Full (raro pero posible)**
   ```
   Simular storage lleno
   ```

   **✅ Resultado esperado:**
   - Error: "Almacenamiento Lleno"
   - Sugerencia: "Libera espacio en tu dispositivo"

4. **Component Crash (Error Boundary)**
   ```
   (Difícil de simular sin forzar error en código)
   ```

   **✅ Resultado esperado:**
   - No white screen of death
   - Error page amigable:
     - Título: "Algo salió mal"
     - Mensaje: "Tuvimos un problema. Intenta recargar."
     - Botón: "Recargar App"
     - Botón: "Volver al Inicio"
   - Error se loggea (dev mode)

---

## 📊 CHECKLIST DE TESTING

### **iOS Safari**
- [ ] Captura de cámara funciona
- [ ] Permiso de cámara se solicita correctamente
- [ ] Cámara trasera se activa
- [ ] Compresión de imagen funciona (verificar tamaño)
- [ ] Preview muestra foto correctamente
- [ ] Validación de calidad ejecuta
- [ ] Análisis AI exitoso
- [ ] Retry automático funciona
- [ ] Virtual Try-On carga
- [ ] CRUD de armario funciona
- [ ] Errores se manejan correctamente
- [ ] Performance es aceptable (no lag visible)

### **Android Chrome**
- [ ] Todos los items de iOS (repetir)
- [ ] Orientación landscape funciona
- [ ] Back button funciona correctamente

### **Cross-Platform**
- [ ] Dark mode funciona en ambos
- [ ] Touch targets son cómodos (44px+)
- [ ] Textos legibles
- [ ] No hay scroll horizontal accidental

---

## 🐛 BUGS COMUNES A REVISAR

### **iOS Específico**
- Cámara no se libera correctamente → black screen en segundo uso
- SafeArea no respetada → notch overlap
- Input file no acepta capture attribute → solo galería

### **Android Específico**
- Permisos múltiples (cámara + storage) → confusión
- Back button cierra app en vez de volver → navigation stack
- Keyboard overlap → form fields no visibles

### **Ambos**
- Imagen muy grande → timeout en análisis AI
- Foto muy oscura → AI no detecta nada
- Rate limit → múltiples errores consecutivos
- Memory leak → app se ralentiza después de mucho uso

---

## 📝 REPORTE DE BUGS

### **Template de Bug Report**
```markdown
### Bug: [Título breve]

**Dispositivo:** iPhone 13, iOS 16.2, Safari
**Reproducibilidad:** Siempre | A veces | Rara vez

**Pasos para reproducir:**
1. Abrir app
2. Ir a "Nueva Prenda"
3. Tap "Tomar Foto"
4. ...

**Resultado esperado:**
Cámara se activa con cámara trasera

**Resultado actual:**
Cámara frontal se activa

**Screenshots/Video:**
[Adjuntar si es posible]

**Severidad:** 🔴 Crítico | 🟡 Alto | 🟢 Medio | ⚪ Bajo

**Workaround:** [Si existe alguno]
```

---

## ✅ CRITERIOS DE APROBACIÓN

### **Mínimo para Production:**
- ✅ 0 bugs críticos (crasheos, features rotas)
- ✅ <3 bugs altos (funcionalidad degradada)
- ✅ Tasa de éxito de cámara >90%
- ✅ Tasa de éxito de AI >80%
- ✅ Performance acceptable (no lag visible)

### **Ideal:**
- ✅ 0 bugs críticos o altos
- ✅ Tasa de éxito de cámara >95%
- ✅ Tasa de éxito de AI >90%
- ✅ Performance fluida (60fps)
- ✅ <5 bugs medianos/bajos

---

**Última Actualización:** 2025-11-20
**Testing Duration:** ~2-3 horas por plataforma
