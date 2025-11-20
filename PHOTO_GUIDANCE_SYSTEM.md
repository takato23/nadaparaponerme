# Photo Guidance System Documentation

## Overview

The Photo Guidance System helps users take high-quality photos for AI analysis, preventing wasted API credits on poor-quality images and improving overall user experience.

## Problem Statement

Users were uploading blurry, poorly lit, or badly framed photos which caused:
- Failed AI analysis attempts
- Wasted API credits
- User frustration
- Poor data quality in closet

## Solution Architecture

### Components Created

1. **PhotoGuidanceModal** (`components/PhotoGuidanceModal.tsx`)
   - Educational modal showing photo quality tips
   - Good vs Bad photo comparisons
   - Pro tips for optimal results
   - Shows on first visit, can be reopened via help button

2. **PhotoPreview** (`components/PhotoPreview.tsx`)
   - Preview state before AI analysis
   - Photo quality warnings display
   - Confirm/Retake decision UI
   - Prevents premature API calls

3. **Photo Quality Validation** (`utils/photoQualityValidation.ts`)
   - Resolution check (minimum 400x400px)
   - Brightness detection (too dark/too bright)
   - File size validation (minimum 20KB)
   - Aspect ratio check
   - Canvas-based pixel analysis

## UX Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                       USER JOURNEY                              │
└─────────────────────────────────────────────────────────────────┘

STEP 1: Entry Point
┌──────────────────┐
│  AddItemView     │ ← User clicks "Nueva Prenda"
│  (capture mode)  │
└────────┬─────────┘
         │
         ├─ First Visit? → YES → Show PhotoGuidanceModal
         │                        └─ User reads tips
         │                        └─ User clicks "Entendido"
         │                        └─ Set hasSeenGuidance = true
         │
         └─ Returning User → Show "Tips para Fotos Perfectas" button
                            └─ Optional: Re-open guidance modal

STEP 2: Photo Capture
┌──────────────────┐
│  User Actions:   │
│  • Tomar Foto    │ ← Opens camera capture
│  • Subir Archivo │ ← Opens file picker
│  • Generar con IA│ ← Text-to-image (bypasses quality checks)
└────────┬─────────┘
         │
         └─ Image selected/captured
            └─ validateImageDataUri() → Basic validation
            └─ analyzePhotoQuality() → Quality analysis

STEP 3: Preview & Validation (NEW STATE)
┌──────────────────┐
│  PhotoPreview    │
│  Component       │
├──────────────────┤
│  ┌────────────┐  │
│  │ Full Image │  │ ← User sees captured photo full-size
│  │  Preview   │  │
│  └────────────┘  │
│                  │
│  Quality Check:  │
│  • Resolution ✓  │
│  • Brightness ⚠  │ ← Yellow warnings if issues detected
│  • Aspect ratio ✓│
│                  │
│  [Sí, Analizar]  │ ← Confirms photo is good
│  [Tomar Otra]    │ ← Returns to capture
└────────┬─────────┘
         │
         ├─ User Clicks "Sí, Analizar"
         │  └─ Proceed to AI analysis
         │     └─ analyzeClothingItem() API call
         │
         └─ User Clicks "Tomar Otra"
            └─ Return to capture mode
            └─ Clear image data
            └─ Try again

STEP 4: AI Analysis (Existing Flow)
┌──────────────────┐
│  analyzing mode  │ ← Loading spinner with image preview
└────────┬─────────┘
         │
         ├─ SUCCESS → editing mode (metadata form)
         │
         └─ ERROR → capture mode (show error message)

STEP 5: Metadata Editing & Save (Existing Flow)
┌──────────────────┐
│  editing mode    │
│  • Edit metadata │
│  • Save to closet│
└──────────────────┘
```

## Quality Validation Details

### Checks Performed

1. **Resolution Check**
   - Minimum: 400x400 pixels
   - Warning: "Resolución muy baja (WxHpx). Recomendado: mínimo 400x400px"

2. **Brightness Analysis**
   - Too dark: brightness < 30
   - Warning: "La imagen está muy oscura. Intenta con mejor iluminación"
   - Too bright: brightness > 240
   - Warning: "La imagen está sobreexpuesta. Evita usar flash directo"

3. **File Size Check**
   - Minimum: 20KB
   - Warning: "La imagen es muy pequeña o de baja calidad"

4. **Aspect Ratio Check**
   - Acceptable range: 0.33 to 3.0 (width/height)
   - Warning: "La proporción de la imagen es inusual. Intenta centrar mejor la prenda"

### Quality Analysis Algorithm

```typescript
async function analyzePhotoQuality(dataUrl: string): Promise<PhotoQualityResult> {
  1. Calculate file size from base64
  2. Load image into memory
  3. Create canvas with 100x100 sample
  4. Extract center region pixels (50x50)
  5. Calculate average brightness using luminance formula:
     brightness = 0.299 * R + 0.587 * G + 0.114 * B
  6. Run all validation checks
  7. Return warnings array + metadata
}
```

## Implementation Integration

### AddItemView State Machine

```typescript
type ViewState = 'capture' | 'camera' | 'preview' | 'generate' | 'analyzing' | 'editing';
```

**New State Added**: `'preview'` - Shows PhotoPreview component before AI analysis

### LocalStorage Keys

- `ojodeloca-photo-guidance-seen` (boolean) - Tracks if user has seen guidance modal

### Key Functions

1. **processImageDataUrl(url, file?)** - Validates and analyzes image quality, transitions to preview
2. **handleConfirmPhoto()** - Confirms photo and starts AI analysis
3. **handleRetakePhoto()** - Clears image and returns to capture mode

## User Interface Components

### PhotoGuidanceModal

**Visual Hierarchy:**
- Gradient header with camera icon
- Two sections: "Buena Foto" (green) and "Evita Estas Fotos" (red)
- Each tip has icon + descriptive text
- Pro tips section with lightbulb icon
- Action buttons: "Ver Ejemplos" (optional) and "Entendido"

**Content:**

✅ **Buena Foto:**
- Prenda completa y centrada en el cuadro
- Luz natural clara (cerca de ventana)
- Fondo liso y de color claro
- Imagen nítida, sin desenfoque
- Prenda extendida o colgada (no arrugada)

❌ **Evita Estas Fotos:**
- Foto borrosa o movida
- Demasiado oscura o con flash directo
- Fondo confuso o desordenado
- Prenda cortada o incompleta
- Varias prendas juntas o superpuestas

💡 **Consejos Pro:**
- Coloca la prenda sobre una superficie o percha
- Usa luz natural del día (no al atardecer)
- Mantén el teléfono estable al capturar
- Asegúrate que toda la prenda esté visible
- Limpia el lente de tu cámara antes de tomar la foto

### PhotoPreview

**Visual Hierarchy:**
- Header with title "¿Se ve bien la prenda?"
- Full-size image preview with object-contain
- Quality badge overlay (green if no warnings)
- Warning section (yellow background) if issues detected
- Two action buttons: confirm vs retake
- Footer tip text

**Quality Badge:**
- ✅ "Buena Calidad" (green) - No warnings
- ⚠️ Warning list (yellow) - Shows specific issues

## Testing Checklist

- [x] Guidance modal shows on first upload
- [x] Help icon re-opens modal in capture mode
- [x] Preview state works before AI analysis
- [x] Quality warnings appear for bad photos
- [x] "Retake" button returns to capture mode
- [x] "Confirm" button proceeds to AI analysis
- [x] LocalStorage flag persists across sessions
- [x] Quality validation runs without blocking
- [x] Error handling for failed quality checks
- [x] Dark mode support for all components

## Performance Considerations

### Canvas Analysis Optimization
- Sample size: 100x100px (downscaled from original)
- Analysis region: Center 50x50px (25% of sample)
- Async/await pattern prevents UI blocking
- Error handling with fallback to basic validation

### Graceful Degradation
- If quality analysis fails, user can still proceed
- Warnings are informational, not blocking
- Basic validation (resolution, file size) always runs
- Canvas operations wrapped in try-catch

## Accessibility Features

- ARIA labels on all interactive elements
- Keyboard navigation support
- Clear focus indicators
- High contrast warning colors
- Semantic HTML structure
- Screen reader friendly text

## Future Enhancements

1. **Example Photo Gallery**
   - Implement `onShowExample` prop in PhotoGuidanceModal
   - Show actual good/bad photo examples
   - Swipeable gallery with annotations

2. **Advanced Quality Checks**
   - Blur detection using Laplacian variance
   - Contrast analysis
   - Background complexity scoring
   - AI-based image quality assessment

3. **Real-time Camera Guidance**
   - Live quality feedback while capturing
   - Framing guides overlay
   - Brightness meter
   - "Perfect shot" indicator

4. **Photo Enhancement Tools**
   - Auto-crop to prenda
   - Brightness/contrast adjustment
   - Background removal option
   - One-tap enhancement filter

5. **Analytics Integration**
   - Track quality scores
   - Measure improvement over time
   - A/B test guidance effectiveness
   - Correlate quality with AI accuracy

## Technical Specifications

### File Structure
```
components/
├── AddItemView.tsx          (Modified - integrated guidance system)
├── PhotoGuidanceModal.tsx   (New - 142 lines)
└── PhotoPreview.tsx         (New - 108 lines)

utils/
├── imageValidation.ts       (Existing - security validation)
└── photoQualityValidation.ts (New - 245 lines, quality checks)

hooks/
└── useLocalStorage.ts       (Existing - used for guidance flag)
```

### Dependencies
- **React**: Component framework
- **Framer Motion**: Animations and transitions
- **Material Symbols**: Icons (via Google Fonts)
- **Tailwind CSS**: Styling and dark mode

### Bundle Impact
- PhotoGuidanceModal: ~5KB gzipped
- PhotoPreview: ~3KB gzipped
- photoQualityValidation: ~2KB gzipped
- Total: ~10KB additional bundle size

## Success Metrics

### Expected Improvements
- 📉 30-50% reduction in failed AI analysis attempts
- 💰 Reduced API credit waste from poor photos
- 😊 Improved user satisfaction (fewer retries)
- 📈 Higher quality closet data overall

### Measurable KPIs
- Photo quality score average
- AI analysis success rate
- First-photo acceptance rate
- Retake frequency
- Guidance modal engagement

## Conclusion

The Photo Guidance System provides a comprehensive solution to the photo quality problem through:
1. **Education** - PhotoGuidanceModal teaches best practices
2. **Validation** - Real-time quality checks with warnings
3. **Preview** - User confirmation before expensive API calls
4. **Accessibility** - Works for all users, gracefully degrades

This system improves user experience, reduces API costs, and ensures higher quality data in the closet inventory.
