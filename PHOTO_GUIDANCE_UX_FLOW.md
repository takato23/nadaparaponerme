# Photo Guidance System - UX Flow Diagram

## Visual User Journey

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                    PHOTO GUIDANCE SYSTEM                      ┃
┃                   Complete User Journey                       ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛


┌─────────────────────────────────────────────────────────────┐
│ STATE 1: INITIAL ENTRY                                      │
│ View: AddItemView (capture mode)                           │
└─────────────────────────────────────────────────────────────┘

          User clicks "Nueva Prenda" button
                      ↓
          ┌───────────────────────┐
          │   Is First Visit?     │
          └───────────┬───────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
       YES                         NO
        │                           │
        ↓                           ↓
┌──────────────────┐      ┌──────────────────┐
│  Show Guidance   │      │  Show Capture UI │
│     Modal        │      │  with Help Btn   │
│ (Automatically)  │      │   (Optional)     │
└────────┬─────────┘      └────────┬─────────┘
         │                         │
         │ [Entendido]            │ [? Tips Button]
         │                         │
         └─────────┬───────────────┘
                   │
                   ↓


┌─────────────────────────────────────────────────────────────┐
│ STATE 2: CAPTURE OPTIONS                                    │
│ View: AddItemView (capture mode)                           │
└─────────────────────────────────────────────────────────────┘

    ┌────────────────────────────────────┐
    │        Nueva Prenda Screen         │
    │                                    │
    │  ┌──────────────────────────────┐ │
    │  │   [? Tips para Fotos...]     │ │ ← Help button
    │  └──────────────────────────────┘ │
    │                                    │
    │  ┌──────────────────────────────┐ │
    │  │   📷  Tomar Foto             │ │ ← Primary action
    │  └──────────────────────────────┘ │
    │                                    │
    │  ┌──────────────────────────────┐ │
    │  │   📁  Subir Archivo          │ │ ← Alternative
    │  └──────────────────────────────┘ │
    │                                    │
    │  ┌──────────────────────────────┐ │
    │  │   ✨  Generar con IA         │ │ ← Bypass quality
    │  └──────────────────────────────┘ │
    └────────────────────────────────────┘
                   │
                   │ User captures/selects photo
                   ↓


┌─────────────────────────────────────────────────────────────┐
│ STATE 2.5: VALIDATION (Background)                          │
│ Process: Image quality analysis                             │
└─────────────────────────────────────────────────────────────┘

    Photo Selected
         │
         ├─► validateImageDataUri()
         │   └─ Check format, size, MIME type
         │   └─ Security validation
         │
         ├─► analyzePhotoQuality() [ASYNC]
         │   ├─ Load image
         │   ├─ Create canvas sample
         │   ├─ Analyze brightness
         │   ├─ Check resolution
         │   └─ Calculate warnings
         │
         └─► Transition to PREVIEW state


┌─────────────────────────────────────────────────────────────┐
│ STATE 3: PHOTO PREVIEW (NEW!)                               │
│ View: PhotoPreview component                                │
└─────────────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────┐
    │   ¿Se ve bien la prenda?            │
    ├─────────────────────────────────────┤
    │                                     │
    │   ┌───────────────────────────┐    │
    │   │                           │    │
    │   │    [Full Image Preview]   │    │ ← Object-contain fit
    │   │                           │    │
    │   │   ┌─────────────────┐    │    │
    │   │   │ ✅ Buena Calidad│    │    │ ← If no warnings
    │   │   └─────────────────┘    │    │
    │   └───────────────────────────┘    │
    │                                     │
    ├─────────────────────────────────────┤
    │  ⚠️  Posibles Problemas:            │ ← If warnings exist
    │  • La imagen está muy oscura        │
    │  • Resolución baja (300x200px)      │
    ├─────────────────────────────────────┤
    │  ┌─────────────────────────────┐   │
    │  │ ✨ Sí, Analizar con IA      │   │ ← Confirm
    │  └─────────────────────────────┘   │
    │  ┌─────────────────────────────┐   │
    │  │ 🔄 No, Tomar Otra Foto      │   │ ← Retake
    │  └─────────────────────────────┘   │
    └─────────────────────────────────────┘
                   │
         ┌─────────┴──────────┐
         │                    │
    [Analizar]          [Tomar Otra]
         │                    │
         ↓                    ↓
    STATE 4            Return to STATE 2
  (AI Analysis)        (Capture mode)


┌─────────────────────────────────────────────────────────────┐
│ STATE 4: AI ANALYSIS                                        │
│ View: AddItemView (analyzing mode) - EXISTING              │
└─────────────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────┐
    │                                     │
    │     ┌─────────────────────┐        │
    │     │   ⭕ Loading Ring   │        │
    │     │                     │        │
    │     │   [Image Preview]   │        │
    │     │                     │        │
    │     └─────────────────────┘        │
    │                                     │
    │   Analizando estilo...              │
    │                                     │
    │   Detectando colores, categoría     │
    │   y estilo de tu prenda.            │
    └─────────────────────────────────────┘
                   │
         ┌─────────┴──────────┐
         │                    │
     SUCCESS               ERROR
         │                    │
         ↓                    ↓
    STATE 5            Return to STATE 2
   (Editing)           (Show error)


┌─────────────────────────────────────────────────────────────┐
│ STATE 5: METADATA EDITING                                   │
│ View: AddItemView (editing mode) - EXISTING                │
└─────────────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────┐
    │   [Image Header with Gradient]      │
    │   Camisa • Blanco                   │
    ├─────────────────────────────────────┤
    │                                     │
    │   Información Básica:               │
    │   [Categoría] [Color]               │
    │                                     │
    │   Estilo & Ocasión:                 │
    │   [Casual][Formal][Deportivo]...    │
    │                                     │
    │   Temporada:                        │
    │   [Verano][Invierno][Otoño]...     │
    │                                     │
    │   Detalles:                         │
    │   [Tipo de cuello][Tipo de manga]   │
    │                                     │
    │   ┌─────────────────────────────┐  │
    │   │ ✅ Guardar en Armario       │  │
    │   └─────────────────────────────┘  │
    └─────────────────────────────────────┘
                   │
                   │ Save item
                   ↓
              ✅ Success → Close modal
                         Return to closet
```

## State Flow Summary

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│          │     │          │     │          │     │          │     │          │
│ CAPTURE  │ ──▶ │ PREVIEW  │ ──▶ │ANALYZING │ ──▶ │ EDITING  │ ──▶ │   DONE   │
│          │     │  (NEW!)  │     │          │     │          │     │          │
└──────────┘     └────┬─────┘     └──────────┘     └──────────┘     └──────────┘
     ▲                │
     │                │
     └────────────────┘
       (Retake button)
```

## Key Interactions Detail

### 1. Guidance Modal Interaction

```
First Visit Flow:
├─ User enters AddItemView
├─ useEffect detects !hasSeenGuidance
├─ setShowGuidance(true)
├─ PhotoGuidanceModal renders (z-index: 60)
├─ User reads tips
└─ User clicks "Entendido"
   ├─ setShowGuidance(false)
   ├─ setHasSeenGuidance(true)
   └─ LocalStorage: ojodeloca-photo-guidance-seen = true

Returning User Flow:
├─ User enters AddItemView
├─ hasSeenGuidance = true (from LocalStorage)
├─ Modal does NOT auto-show
├─ User sees "? Tips para Fotos..." button
└─ Optional: User clicks help button
   └─ setShowGuidance(true) → Modal shows
```

### 2. Photo Quality Validation

```
Quality Check Pipeline:
├─ User selects image
├─ FileReader converts to DataURL
├─ processImageDataUrl(url, file)
│  ├─ validateImageDataUri(url)
│  │  ├─ Format check (data:image/*)
│  │  ├─ MIME type validation
│  │  ├─ Base64 validation
│  │  └─ Size check (<5MB)
│  │
│  ├─ analyzePhotoQuality(url) [ASYNC]
│  │  ├─ Calculate file size
│  │  ├─ Load image → get dimensions
│  │  ├─ Create canvas (100x100 sample)
│  │  ├─ Extract center pixels (50x50)
│  │  ├─ Calculate average brightness
│  │  ├─ Check all thresholds
│  │  └─ Return PhotoQualityResult
│  │     ├─ isAcceptable: true
│  │     ├─ warnings: string[]
│  │     └─ metadata: {width, height, brightness, sizeBytes}
│  │
│  ├─ setPhotoQualityWarnings(warnings)
│  ├─ setImageDataUrl(url)
│  └─ setViewState('preview')
│
└─ PhotoPreview renders with warnings
```

### 3. Preview Decision Flow

```
Preview State Options:

Option A: Confirm Photo
├─ User clicks "Sí, Analizar con IA"
├─ handleConfirmPhoto()
├─ setViewState('analyzing')
└─ analyzeClothingItem(imageDataUrl)
   ├─ SUCCESS: setViewState('editing')
   └─ ERROR: setViewState('capture') + show error

Option B: Retake Photo
├─ User clicks "No, Tomar Otra Foto"
├─ handleRetakePhoto()
├─ setImageDataUrl(null)
├─ setImageFile(null)
├─ setPhotoQualityWarnings([])
└─ setViewState('capture')
```

## Warning Display Logic

```typescript
Quality Warnings (Yellow Banner):
├─ IF brightness < 30
│  └─ "La imagen está muy oscura. Intenta con mejor iluminación"
│
├─ IF brightness > 240
│  └─ "La imagen está sobreexpuesta. Evita usar flash directo"
│
├─ IF width < 400 OR height < 400
│  └─ "Resolución muy baja (WxHpx). Recomendado: mínimo 400x400px"
│
├─ IF aspectRatio > 3 OR aspectRatio < 0.33
│  └─ "La proporción de la imagen es inusual. Intenta centrar mejor la prenda"
│
└─ IF sizeBytes < 20KB
   └─ "La imagen es muy pequeña o de baja calidad"

Quality Badge (Green):
└─ IF warnings.length === 0
   └─ Display "✅ Buena Calidad" badge overlay
```

## Responsive Design Considerations

### Mobile (< 768px)
- Full-screen modals
- Touch-friendly button sizes (44px minimum)
- Vertical stacking for all layouts
- Preview image: object-contain with max-height 60vh

### Desktop (>= 768px)
- Max-width modal (max-w-lg = 512px)
- Hover states on all interactive elements
- Preview image: object-contain with max-height 600px

## Accessibility Features Map

```
Component         A11y Features
═════════════════════════════════════════════════════
PhotoGuidanceModal
├─ Semantic HTML
├─ Focus trap within modal
├─ Escape key to close
├─ ARIA role="dialog"
└─ Color contrast WCAG AA

PhotoPreview
├─ Alt text on images
├─ Descriptive button labels
├─ Warning region ARIA
├─ Keyboard navigation
└─ Screen reader announcements

AddItemView
├─ Tab order optimization
├─ Focus management
├─ Error announcements
└─ Loading state ARIA
```

## Error Handling & Edge Cases

```
Edge Case                  Handling Strategy
═══════════════════════════════════════════════════════════════
Quality analysis fails     → Continue with empty warnings array
Image load error           → Show error, return to capture
Canvas not supported       → Return dimensions only, skip brightness
Very slow analysis         → UI remains responsive (async)
LocalStorage unavailable   → Modal shows every time (graceful)
User closes during preview → Clear state, return to capture
Network timeout            → Standard error handling
Invalid data URL           → Caught by validateImageDataUri()
```

## Performance Optimization Map

```
Operation                 Optimization Applied
═════════════════════════════════════════════════════════════
Image loading             → Async/await pattern
Canvas operations         → 100x100 sample (not full size)
Brightness calculation    → Center region only (25% of sample)
Quality validation        → Non-blocking, results cached
Modal animation           → Framer Motion with GPU acceleration
Component rendering       → React memo on static components
LocalStorage reads        → Single read per session
```

## Success Metrics Tracking Points

```
Metric                    Tracking Point
═════════════════════════════════════════════════════════════
Guidance modal views      → setShowGuidance(true) event
Help button clicks        → onClick handler
Preview confirmations     → handleConfirmPhoto() call
Photo retakes             → handleRetakePhoto() call
Quality warnings shown    → warnings.length > 0
Average brightness        → metadata.brightness value
Resolution distribution   → metadata.width × metadata.height
AI analysis success rate  → analyzeClothingItem() success/fail
```

This comprehensive UX flow covers every user interaction, state transition, validation step, and edge case in the Photo Guidance System.
