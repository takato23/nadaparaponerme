# 🚀 Prompt de Implementación - Optimizaciones Pendientes

**Proyecto**: No Tengo Nada Para Ponerme
**Contexto**: Ya se realizó análisis y arquitectura de optimizaciones. Ahora implementar.

---

## 📋 CONTEXTO PREVIO

### Estado Actual
- ✅ Bundle optimization implementado (-93% main bundle)
- ✅ Mobile optimization implementado (touch, swipes, PWA)
- ✅ Search debouncing implementado (-70% re-renders)
- ✅ Image lazy loading implementado
- ⚠️ React refactoring: ARQUITECTURA CREADA, no aplicada
- 🚨 Security issues: IDENTIFICADOS, no resueltos

### Archivos Generados (No Aplicados)
```
/hooks/
  ├── useChat.ts           ⚠️ Creado, no usado
  ├── useModal.ts          ⚠️ Creado, no usado
  ├── useAnalysis.ts       ⚠️ Creado, no usado
  ├── useDebounce.ts       ⚠️ Creado, no usado
  └── useAppModals.ts      ⚠️ Creado, no usado

/components/ui/
  ├── Card.tsx             ⚠️ Creado, no usado
  ├── Badge.tsx            ⚠️ Creado, no usado
  ├── EmptyState.tsx       ⚠️ Creado, no usado
  ├── LoadingButton.tsx    ⚠️ Creado, no usado
  ├── ProductCard.tsx      ⚠️ Creado, no usado
  └── index.ts             ⚠️ Creado, no usado
```

### Documentación Disponible
- `OPTIMIZATION_SUMMARY.md` - Vista general completa
- `REFACTORING_GUIDE.md` - Paso a paso para refactor
- `CODE_REVIEW_REPORT.md` - 47 issues identificados
- `MOBILE_OPTIMIZATION.md` - Mobile optimization completa

---

## 🎯 TU MISIÓN

Implementa las optimizaciones pendientes en **3 fases priorizadas**:

### **FASE 1: Security Critical (30 min)** 🚨
Resolver issues de seguridad que exponen la app a vulnerabilidades.

### **FASE 2: React Refactoring (2-3 horas)** ⚠️
Aplicar la arquitectura de hooks y componentes ya creada.

### **FASE 3: Quality Improvements (1-2 horas)** 📋
Type safety, accessibility, error boundaries.

---

## 🚨 FASE 1: SECURITY CRITICAL (Ejecutar PRIMERO)

### Issue #1: API Key Rotation

**Problema**: API key expuesta en `.env.local` y commiteada a git.

```bash
# Archivo: .env.local:4
GEMINI_API_KEY=AIzaSyC8y2Fbu8-UTpIWxMdk7WGYTOFVRFqyEFU
```

**Pasos a Ejecutar:**

```bash
# 1. Verificar estado actual
cat .env.local | grep GEMINI_API_KEY

# 2. Crear .env.local.example (si no existe)
cat > .env.local.example << 'EOF'
# Gemini AI API Key
# Get yours at: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_api_key_here

# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
EOF

# 3. Agregar .env.local a .gitignore (si no está)
echo ".env.local" >> .gitignore

# 4. Remover .env.local de git history
git filter-repo --invert-paths --path .env.local --force
# O alternativa más simple:
git rm --cached .env.local
git commit -m "Remove exposed API key from version control"

# 5. Commit gitignore actualizado
git add .gitignore .env.local.example
git commit -m "Add .env.local.example and update gitignore"
```

**ACCIÓN MANUAL REQUERIDA** (No puede automatizarse):
1. Ir a Google AI Studio: https://aistudio.google.com/app/apikey
2. Revocar la key expuesta: `AIzaSyC8y2Fbu8-UTpIWxMdk7WGYTOFVRFqyEFU`
3. Generar nueva API key
4. Copiar nueva key en `.env.local`
5. **NO commitear** `.env.local` nunca más

---

### Issue #2: Remove API Key from Client Bundle

**Problema**: API key definida en `vite.config.ts` y expuesta en el bundle del cliente.

```typescript
// vite.config.ts:14-15 (ACTUAL)
define: {
  'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
  'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
}
```

**Implementación:**

```typescript
// 1. Editar vite.config.ts
// ANTES (INSEGURO):
export default defineConfig({
  define: {
    'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
  }
});

// DESPUÉS (SEGURO):
export default defineConfig({
  define: {
    // API keys REMOVIDAS - usar Edge Functions solamente
  }
});

// 2. Actualizar services/geminiService.ts
// Cambiar de:
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// A (si apiKey es undefined, falla explícitamente):
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
if (!apiKey) {
  throw new Error('GEMINI_API_KEY not configured. Use Edge Functions or set environment variable.');
}
const ai = new GoogleGenAI({ apiKey });

// 3. Rebuild y verificar que API key NO está en bundle
npm run build
grep -r "AIzaSy" dist/  # Debe retornar: no matches found
```

**Validación:**
```bash
# El bundle NO debe contener ninguna API key
npm run build
grep -r "AIzaSy" dist/
# Output esperado: (sin resultados)

# Verificar en DevTools:
npm run preview
# Abrir http://localhost:4173
# DevTools → Sources → Buscar "AIzaSy"
# Debe retornar 0 resultados
```

---

### Issue #3: Input Sanitization (XSS Prevention)

**Problema**: User inputs renderizados sin sanitización → XSS vulnerable.

```tsx
// FashionChatView.tsx:116 (VULNERABLE)
<p className="whitespace-pre-wrap">{message.content}</p>
```

**Implementación:**

```bash
# 1. Instalar DOMPurify
npm install dompurify @types/dompurify
```

```typescript
// 2. Crear utils/sanitize.ts
import DOMPurify from 'dompurify';

/**
 * Sanitiza input de usuario para prevenir XSS
 * @param input - String potencialmente peligroso
 * @returns String sanitizado (sin HTML/scripts)
 */
export const sanitizeUserInput = (input: string): string => {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],      // Strip ALL HTML tags
    ALLOWED_ATTR: [],      // Strip ALL attributes
    KEEP_CONTENT: true     // Keep text content
  });
};

/**
 * Sanitiza input permitiendo markdown básico (bold, italic)
 * Usar solo si necesitas formateo básico
 */
export const sanitizeMarkdown = (input: string): string => {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'strong', 'em', 'br'],
    ALLOWED_ATTR: []
  });
};

/**
 * Valida y sanitiza URLs
 */
export const sanitizeUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    // Solo permitir http(s)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '#';
    }
    return DOMPurify.sanitize(url);
  } catch {
    return '#';
  }
};
```

```typescript
// 3. Aplicar en FashionChatView.tsx
import { sanitizeUserInput } from '../utils/sanitize';

// ANTES (INSEGURO):
<p className="whitespace-pre-wrap">{message.content}</p>

// DESPUÉS (SEGURO):
<p className="whitespace-pre-wrap">{sanitizeUserInput(message.content)}</p>
```

**Archivos a Actualizar (aplicar sanitization):**
- `components/FashionChatView.tsx` (message.content)
- `components/VirtualShoppingAssistantView.tsx` (message.content)
- `components/ActivityFeedView.tsx` (comment.content)
- `components/OutfitRatingView.tsx` (user feedback)
- Cualquier componente que renderice user input

---

### Issue #4: Data URI Validation

**Problema**: Acepta cualquier data URI sin validar tamaño/tipo.

```typescript
// types.ts:22 (ACTUAL - SIN VALIDACIÓN)
imageDataUrl: string;
```

**Implementación:**

```typescript
// 1. Crear utils/imageValidation.ts
export interface ImageValidationResult {
  isValid: boolean;
  error?: string;
  size?: number;
  mimeType?: string;
}

/**
 * Valida data URI de imagen
 * @param dataUri - Data URI a validar
 * @returns Resultado de validación
 */
export const validateImageDataUri = (dataUri: string): ImageValidationResult => {
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

  // 1. Validar formato
  if (!dataUri.startsWith('data:')) {
    return { isValid: false, error: 'Formato de imagen inválido' };
  }

  // 2. Extraer MIME type
  const mimeMatch = dataUri.match(/^data:(.+);base64,/);
  if (!mimeMatch) {
    return { isValid: false, error: 'Formato base64 inválido' };
  }

  const mimeType = mimeMatch[1];

  // 3. Validar MIME type
  if (!ALLOWED_TYPES.includes(mimeType)) {
    return {
      isValid: false,
      error: `Tipo de imagen no permitido. Usa: ${ALLOWED_TYPES.join(', ')}`
    };
  }

  // 4. Calcular tamaño
  const base64 = dataUri.split(',')[1];
  if (!base64) {
    return { isValid: false, error: 'Datos de imagen faltantes' };
  }

  // Base64 encoding agrega ~33% overhead, ajustar
  const size = (base64.length * 3) / 4;

  // 5. Validar tamaño
  if (size > MAX_SIZE) {
    return {
      isValid: false,
      error: `Imagen muy grande. Máximo: ${(MAX_SIZE / 1024 / 1024).toFixed(1)}MB`
    };
  }

  return { isValid: true, size, mimeType };
};

/**
 * Wrapper que lanza error si validación falla
 */
export const assertValidImageDataUri = (dataUri: string): void => {
  const result = validateImageDataUri(dataUri);
  if (!result.isValid) {
    throw new Error(result.error || 'Imagen inválida');
  }
};
```

```typescript
// 2. Aplicar en AddItemView.tsx
import { assertValidImageDataUri } from '../utils/imageValidation';

const handleSubmit = async () => {
  try {
    // AGREGAR: Validar antes de procesar
    assertValidImageDataUri(imageDataUrl);

    await onAddItem({ imageDataUrl, metadata });
    onClose();
  } catch (error) {
    // Mostrar error al usuario
    alert(error instanceof Error ? error.message : 'Error al agregar prenda');
  }
};
```

**Archivos a Actualizar:**
- `components/AddItemView.tsx` (al subir imagen)
- `components/GenerateFitView.tsx` (si acepta imágenes)
- Cualquier componente que acepte imageDataUrl

---

## ⚠️ FASE 2: REACT REFACTORING

### Objetivo
Aplicar la arquitectura de hooks y componentes ya creada para:
- Reducir App.tsx de 1,260 → ~600 líneas (-52%)
- Eliminar ~4,000 líneas de código duplicado
- Mejorar mantenibilidad y testability

---

### Step 1: Implementar useAppModals Hook

**Problema**: 20+ boolean flags para modales en App.tsx.

```typescript
// App.tsx (ANTES - ACTUAL):
const [showAddItem, setShowAddItem] = useState(false);
const [showStylist, setShowStylist] = useState(false);
const [showVirtualTryOn, setShowVirtualTryOn] = useState(false);
const [showSmartPacker, setShowSmartPacker] = useState(false);
// ... 16 more boolean states
```

**Implementación:**

```typescript
// 1. El hook ya existe en /hooks/useAppModals.ts
// Solo necesitas importarlo y usarlo en App.tsx

// 2. Editar App.tsx
import { useAppModals } from './hooks/useAppModals';

// REEMPLAZAR los 20+ useState con:
const modals = useAppModals();

// REEMPLAZAR todos los setShowXXX con:
modals.show('ADD_ITEM');
modals.show('STYLIST');
modals.show('VIRTUAL_TRY_ON');
// etc.

// REEMPLAZAR todos los {showXXX && <Component />} con:
{modals.isOpen('ADD_ITEM') && <AddItemView onClose={() => modals.hide('ADD_ITEM')} />}
{modals.isOpen('STYLIST') && <GenerateFitView onClose={() => modals.hide('STYLIST')} />}
// etc.
```

**Ejemplo Completo:**

```typescript
// App.tsx (líneas 282-318 - ANTES)
const [showAddItem, setShowAddItem] = useState(false);
const [showStylist, setShowStylist] = useState(false);
const [showVirtualTryOn, setShowVirtualTryOn] = useState(false);
const [showSmartPacker, setShowSmartPacker] = useState(false);
const [showChat, setShowChat] = useState(false);
const [showWeatherOutfit, setShowWeatherOutfit] = useState(false);
const [showLookbook, setShowLookbook] = useState(false);
const [showStyleChallenges, setShowStyleChallenges] = useState(false);
const [showRating, setShowRating] = useState(false);
const [showFeedbackAnalysis, setShowFeedbackAnalysis] = useState(false);
const [showGapAnalysis, setShowGapAnalysis] = useState(false);
const [showBrandRecognition, setShowBrandRecognition] = useState(false);
const [showDupeFinder, setShowDupeFinder] = useState(false);
const [showCapsuleBuilder, setShowCapsuleBuilder] = useState(false);
const [showStyleDNA, setShowStyleDNA] = useState(false);
const [showAIDesigner, setShowAIDesigner] = useState(false);
const [showStyleEvolution, setShowStyleEvolution] = useState(false);
const [showWeeklyPlanner, setShowWeeklyPlanner] = useState(false);
const [showCalendarSync, setShowCalendarSync] = useState(false);
const [showActivityFeed, setShowActivityFeed] = useState(false);
const [showVirtualShopping, setShowVirtualShopping] = useState(false);

// App.tsx (DESPUÉS - REFACTORED)
const modals = useAppModals();
```

**Estimated Reduction**: 21 líneas → 1 línea

**Validación:**
```bash
# Rebuild y test
npm run build
npm run dev

# Test que todos los modales abren/cierran correctamente
# - Abrir cada feature desde HomeView
# - Cerrar con X button
# - Verificar que no hay errors en console
```

---

### Step 2: Migrar Views a ModalWrapper Component

**Problema**: Cada view tiene 20-30 líneas de boilerplate para modal structure.

```tsx
// Ejemplo: GenerateFitView.tsx (ANTES - ACTUAL)
<div className="absolute inset-0 bg-white/80 dark:bg-background-dark/80 backdrop-blur-xl z-30 flex flex-col p-4">
  <div className="contents md:block md:relative md:w-full md:max-w-lg">
    <header className="flex items-center justify-between pb-4">
      <button onClick={onBack}>
        <span className="material-symbols-outlined">close</span>
      </button>
      <h1 className="text-xl font-bold">Estilista IA</h1>
      <div className="w-10"></div>
    </header>
    {/* Content */}
  </div>
</div>
```

**Implementación (Ejemplo con GenerateFitView):**

```tsx
// 1. El componente ModalWrapper ya existe en /components/ui/ModalWrapper.tsx
// (fue creado por react-specialist, verificar que existe)

// 2. Importar en GenerateFitView.tsx
import { ModalWrapper } from './ui/ModalWrapper';

// 3. REEMPLAZAR todo el boilerplate con:
// GenerateFitView.tsx (DESPUÉS - REFACTORED)
export default function GenerateFitView({ onClose, onGenerate, isGenerating }) {
  const [prompt, setPrompt] = useState('');

  return (
    <ModalWrapper
      title="Estilista IA"
      icon="auto_awesome"
      onClose={onClose}
      maxWidth="lg"
    >
      <div className="flex-1 overflow-y-auto p-6">
        {/* Tu contenido aquí - sin cambios */}
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe el outfit que buscás..."
          className="w-full p-4 rounded-xl bg-white/5 border border-white/10"
          rows={4}
        />
      </div>

      <div className="p-6 border-t border-white/10">
        <button
          onClick={() => onGenerate(prompt)}
          disabled={isGenerating || !prompt}
          className="w-full py-4 bg-primary text-white rounded-xl disabled:opacity-50"
        >
          {isGenerating ? <Loader /> : 'Generar Outfit'}
        </button>
      </div>
    </ModalWrapper>
  );
}
```

**Views a Migrar (Prioridad):**
1. `GenerateFitView.tsx` ⚠️ (más simple)
2. `SmartPackerView.tsx` ⚠️
3. `AddItemView.tsx` ⚠️
4. `FashionChatView.tsx` ⚠️ (más complejo - dejar para después)
5. Los otros 36 views progresivamente

**Estimated Reduction por View**: 25-30 líneas → 5-10 líneas

---

### Step 3: Reemplazar Liquid-Glass Divs con Card Component

**Problema**: 87 divs con clase `liquid-glass p-6 rounded-2xl`.

```tsx
// ANTES (REPETIDO 87 VECES):
<div className="liquid-glass p-6 rounded-2xl border border-white/10 hover:bg-white/10">
  <h3 className="text-xl font-bold mb-2">Title</h3>
  <p className="text-white/60">Description</p>
</div>
```

**Implementación:**

```tsx
// 1. El componente Card ya existe en /components/ui/Card.tsx
import { Card } from './ui/Card';

// 2. REEMPLAZAR con:
<Card variant="glass" padding="lg" hover>
  <h3 className="text-xl font-bold mb-2">Title</h3>
  <p className="text-white/60">Description</p>
</Card>
```

**Buscar y Reemplazar en VS Code:**

```regex
# Buscar:
<div className="liquid-glass p-6 rounded-2xl([^>]*)">

# Reemplazar con:
<Card variant="glass" padding="lg"$1>

# También reemplazar closing tags:
# Buscar: </div> (manualmente donde corresponda)
# Reemplazar: </Card>
```

**Archivos con Mayor Cantidad de liquid-glass:**
1. `components/HomeView.tsx` (~10 divs)
2. `components/ProfileView.tsx` (~8 divs)
3. `components/ClosetAnalyticsView.tsx` (~6 divs)
4. `components/WeeklyPlannerView.tsx` (~5 divs)
5. Los otros views (~3-4 divs cada uno)

**Validación:**
```bash
# Verificar que no quedan liquid-glass sin reemplazar
grep -r "liquid-glass" components/ | grep -v "Card.tsx"
# Output esperado: (solo comentarios o documentación)
```

---

### Step 4: Usar Badge Component

**Problema**: Priority badges, quality badges repetidos con estilos inconsistentes.

```tsx
// ANTES (REPETIDO ~50 VECES):
<span className={`px-3 py-1 rounded-full text-xs font-semibold ${
  priority === 'essential'
    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
    : priority === 'recommended'
    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
}`}>
  {priority}
</span>
```

**Implementación:**

```tsx
// 1. El componente Badge ya existe en /components/ui/Badge.tsx
import { Badge } from './ui/Badge';

// 2. REEMPLAZAR con:
<Badge variant={priority}>
  {priority}
</Badge>

// O con presets:
<Badge.Priority priority="essential" />
<Badge.Quality quality="premium" />
<Badge.Status status="active" />
```

**Archivos a Actualizar:**
- `components/VirtualShoppingAssistantView.tsx` (priority badges)
- `components/ClosetGapAnalysisView.tsx` (gap priority)
- `components/CapsuleWardrobeBuilderView.tsx` (versatility badges)
- `components/OutfitRatingView.tsx` (rating badges)
- `components/ActivityFeedView.tsx` (status badges)

**Estimated Reduction**: 8-10 líneas → 1 línea por badge

---

### Step 5: Usar EmptyState Component

**Problema**: Empty states repetidos con estilos inconsistentes.

```tsx
// ANTES (REPETIDO ~40 VECES):
<div className="flex flex-col items-center justify-center text-center py-12">
  <span className="material-symbols-outlined text-6xl text-pink-400 mb-4">
    inventory_2
  </span>
  <h3 className="text-2xl font-bold mb-2">No hay prendas</h3>
  <p className="text-white/60 mb-6">Agregá tu primera prenda para comenzar</p>
  <button onClick={onAddItem} className="bg-primary text-white px-6 py-3 rounded-xl">
    Agregar Prenda
  </button>
</div>
```

**Implementación:**

```tsx
// 1. El componente EmptyState ya existe en /components/ui/EmptyState.tsx
import { EmptyState } from './ui/EmptyState';

// 2. REEMPLAZAR con preset:
<EmptyState.Empty
  onAction={onAddItem}
  actionLabel="Agregar Prenda"
/>

// O custom:
<EmptyState
  icon="inventory_2"
  title="No hay prendas"
  description="Agregá tu primera prenda para comenzar"
  action={{
    label: "Agregar Prenda",
    onClick: onAddItem
  }}
/>
```

**Presets Disponibles:**
```tsx
<EmptyState.Empty />         // Closet vacío
<EmptyState.NoOutfits />     // Sin outfits guardados
<EmptyState.NoResults />     // Sin resultados de búsqueda
<EmptyState.Loading />       // Cargando datos
<EmptyState.Error />         // Error al cargar
```

**Archivos a Actualizar:**
- `components/ClosetView.tsx` (empty closet)
- `components/SavedOutfitsView.tsx` (no outfits)
- `components/FashionChatView.tsx` (no messages)
- `components/VirtualShoppingAssistantView.tsx` (no gaps)
- Todos los otros views con empty states

---

### Step 6: Usar LoadingButton Component

**Problema**: Botones con loading state repetidos.

```tsx
// ANTES (REPETIDO ~25 VECES):
<button
  onClick={handleSubmit}
  disabled={isLoading || !isValid}
  className="w-full bg-primary text-white py-4 rounded-xl disabled:opacity-50"
>
  {isLoading ? <Loader /> : 'Generar'}
</button>
```

**Implementación:**

```tsx
// 1. El componente LoadingButton ya existe en /components/ui/LoadingButton.tsx
import { LoadingButton } from './ui/LoadingButton';

// 2. REEMPLAZAR con:
<LoadingButton
  onClick={handleSubmit}
  isLoading={isLoading}
  disabled={!isValid}
  variant="primary"
  fullWidth
>
  Generar
</LoadingButton>
```

**Variantes:**
```tsx
<LoadingButton variant="primary">Primary</LoadingButton>
<LoadingButton variant="secondary">Secondary</LoadingButton>
<LoadingButton variant="danger">Delete</LoadingButton>
<LoadingButton size="sm">Small</LoadingButton>
<LoadingButton size="lg">Large</LoadingButton>
```

---

### Step 7: Refactor App.tsx usando useAppModals

**Implementación Paso a Paso:**

```typescript
// App.tsx (PASO 1: Import)
import { useAppModals } from './hooks/useAppModals';

// App.tsx (PASO 2: Reemplazar states)
// ANTES:
const [showAddItem, setShowAddItem] = useState(false);
const [showStylist, setShowStylist] = useState(false);
// ... 19 more

// DESPUÉS:
const modals = useAppModals();

// App.tsx (PASO 3: Actualizar handlers)
// ANTES:
const handleStylistClick = () => {
  setShowStylist(true);
  setShowFitResult(null);
};

// DESPUÉS:
const handleStylistClick = () => {
  modals.show('STYLIST');
  setShowFitResult(null);
};

// App.tsx (PASO 4: Actualizar renders)
// ANTES:
{showAddItem && (
  <AddItemView
    onClose={() => setShowAddItem(false)}
    onAddItem={handleAddItem}
  />
)}

// DESPUÉS:
{modals.isOpen('ADD_ITEM') && (
  <AddItemView
    onClose={() => modals.hide('ADD_ITEM')}
    onAddItem={handleAddItem}
  />
)}

// App.tsx (PASO 5: Repetir para todos los modales)
// Ver REFACTORING_GUIDE.md para lista completa
```

**Expected Reduction**:
- Lines: 1,260 → ~700 (-44%)
- useState calls: 21 → 1 (-95%)
- Boolean flags: 21 → 0 (-100%)

---

## 📋 FASE 3: QUALITY IMPROVEMENTS

### Task 1: Fix Type Safety (Remove 'any')

**Problema**: 15+ `any` types bypass type safety.

```typescript
// App.tsx:231 (ANTES)
setSortOption({ property: property as any, direction: direction as any });

// App.tsx:231 (DESPUÉS)
// 1. Crear type guard en types.ts
export type SortProperty = 'date' | 'name' | 'color';
export type SortDirection = 'asc' | 'desc';

export function isValidSortProperty(value: string): value is SortProperty {
  return ['date', 'name', 'color'].includes(value);
}

export function isValidSortDirection(value: string): value is SortDirection {
  return ['asc', 'desc'].includes(value);
}

// 2. Usar type guard en App.tsx
if (isValidSortProperty(property) && isValidSortDirection(direction)) {
  setSortOption({ property, direction });
} else {
  // Fallback a default
  setSortOption({ property: 'date', direction: 'asc' });
}
```

**Otros Archivos a Fix:**

```typescript
// src/services/closetService.ts:24,30 (ANTES)
category: item.category as any,
seasons: (item.ai_metadata?.seasons as any[]) || [],

// src/services/closetService.ts (DESPUÉS)
category: isValidCategory(item.category) ? item.category : 'top',
seasons: Array.isArray(item.ai_metadata?.seasons)
  ? item.ai_metadata.seasons.filter(isValidSeason)
  : [],

// src/services/scheduleService.ts:78,255 (ANTES)
return data.map((schedule: any) => ({

// src/services/scheduleService.ts (DESPUÉS)
import { Database } from '../types/supabase';
type ScheduleRow = Database['public']['Tables']['outfit_schedules']['Row'];

return data.map((schedule: ScheduleRow) => ({
```

**Validación:**
```bash
# Buscar todos los 'any' restantes
grep -r "as any" components/ src/
grep -r ": any" components/ src/

# Output esperado: Solo comentarios, no código
```

---

### Task 2: Add ARIA Labels

**Problema**: 40+ icon-only buttons sin aria-label.

```tsx
// ANTES (INACCESSIBLE):
<button onClick={onClose} className="p-2">
  <span className="material-symbols-outlined">close</span>
</button>

// DESPUÉS (ACCESSIBLE):
<button
  onClick={onClose}
  aria-label="Cerrar modal"
  className="p-2"
>
  <span aria-hidden="true" className="material-symbols-outlined">close</span>
</button>
```

**Pattern para Todos los Botones:**

```tsx
// Add Item Button
<button aria-label="Agregar nueva prenda">
  <span aria-hidden="true" className="material-symbols-outlined">add</span>
</button>

// Stylist Button
<button aria-label="Abrir asistente de estilismo IA">
  <span aria-hidden="true" className="material-symbols-outlined">auto_awesome</span>
</button>

// Delete Button
<button aria-label="Eliminar prenda">
  <span aria-hidden="true" className="material-symbols-outlined">delete</span>
</button>

// Back Button
<button aria-label="Volver atrás">
  <span aria-hidden="true" className="material-symbols-outlined">arrow_back</span>
</button>
```

**Script para Buscar Todos los Icon Buttons:**
```bash
# Buscar botones con material-symbols sin aria-label
grep -r "material-symbols-outlined" components/ | grep button | grep -v "aria-label"
```

**Archivos Prioritarios:**
- `App.tsx` (navigation buttons)
- `components/Navigation.tsx` (bottom nav)
- Todos los `*View.tsx` (close buttons)

---

### Task 3: Implement Error Boundaries

**Problema**: No error boundaries → crashes totales.

**Implementación:**

```tsx
// 1. Crear components/ErrorBoundary.tsx
import React, { Component, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.props.onError?.(error, errorInfo);

    // Opcional: Log a error reporting service (Sentry, etc.)
    // logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center min-h-screen bg-background-dark p-4">
          <div className="text-center max-w-md">
            <span className="material-symbols-outlined text-6xl text-red-500 mb-4 block">
              error
            </span>
            <h1 className="text-2xl font-bold mb-2">Algo salió mal</h1>
            <p className="text-white/60 mb-2">
              {this.state.error?.message || 'Error inesperado'}
            </p>
            <p className="text-sm text-white/40 mb-6">
              Por favor, recargá la página o intentá de nuevo.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors"
              >
                Recargar Página
              </button>
              <button
                onClick={this.handleReset}
                className="px-6 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
              >
                Intentar de Nuevo
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// 2. Agregar en App.tsx (wrap todo el content)
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      {/* Todo el contenido existente */}
      <div className="flex flex-col h-screen">
        {/* ... */}
      </div>
    </ErrorBoundary>
  );
}

// 3. Opcional: Feature-specific error boundaries
// Wrap features individuales para mejor isolation
<ErrorBoundary fallback={<EmptyState.Error />}>
  <FashionChatView {...props} />
</ErrorBoundary>
```

---

### Task 4: Remove Console.logs

**Problema**: 64 console.log/error en producción.

```typescript
// 1. Crear utils/logger.ts
const isDevelopment = import.meta.env.DEV;

export const logger = {
  log: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  error: (...args: unknown[]) => {
    if (isDevelopment) {
      console.error(...args);
    }
    // En producción, log to service (Sentry, etc.)
    // else { logToErrorService(args); }
  },

  warn: (...args: unknown[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },

  info: (...args: unknown[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  }
};

// 2. Buscar y reemplazar en todos los archivos
// Buscar: console.log(
// Reemplazar: logger.log(

// Buscar: console.error(
// Reemplazar: logger.error(

// 3. Importar logger donde se usa
import { logger } from '../utils/logger';
```

**Validación:**
```bash
# Buscar console.log directo (no debe haber)
grep -r "console\\.log\\|console\\.error\\|console\\.warn" components/ src/ | grep -v "logger"

# En vite.config.ts, verificar que drop_console está activo
grep "drop_console" vite.config.ts
```

---

### Task 5: Add Keyboard Navigation to Modals

**Problema**: Modals no tienen keyboard support.

**Implementación (si ModalWrapper no tiene):**

```typescript
// components/ui/ModalWrapper.tsx (AGREGAR)
import { useEffect, useRef } from 'react';

export const ModalWrapper = ({ children, onClose, ...props }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // 1. Escape key to close
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // 2. Tab trapping
    const focusableElements = modalRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements && focusableElements.length > 0) {
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      firstFocusableRef.current = firstElement;

      const handleTab = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;

        if (e.shiftKey) {
          // Shift+Tab: wrap to last element
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab: wrap to first element
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      };

      document.addEventListener('keydown', handleTab);
      document.addEventListener('keydown', handleEscape);

      // 3. Auto-focus first element
      firstElement.focus();

      return () => {
        document.removeEventListener('keydown', handleTab);
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [onClose]);

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      {children}
    </div>
  );
};
```

---

## ✅ VALIDACIÓN FINAL

Después de implementar todas las fases, ejecutar:

```bash
# 1. Type check
npx tsc --noEmit

# 2. Build
npm run build

# 3. Verify bundle size
ls -lh dist/assets/*.js

# 4. Test en dev
npm run dev
# Abrir http://localhost:3000

# 5. Test en production
npm run preview
# Abrir http://localhost:4173

# 6. Lighthouse audit
# Chrome DevTools → Lighthouse → Mobile
# Targets: Performance >90, Accessibility >95

# 7. Security check
grep -r "AIzaSy" dist/  # Debe retornar: no matches
```

---

## 📊 EXPECTED RESULTS

### Después de FASE 1 (Security):
- ✅ API key rotada y no expuesta
- ✅ Input sanitization en todos los inputs
- ✅ Image validation implementada
- ✅ Bundle no contiene secrets

### Después de FASE 2 (Refactoring):
- ✅ App.tsx: 1,260 → ~700 líneas (-44%)
- ✅ Code duplication: -4,000 líneas
- ✅ 40+ views usando componentes UI
- ✅ Consistent styling y UX

### Después de FASE 3 (Quality):
- ✅ Zero `any` types
- ✅ 40+ ARIA labels agregados
- ✅ Error boundaries activos
- ✅ Console.logs eliminados en prod
- ✅ Keyboard navigation functional
- ✅ Lighthouse Accessibility >95

---

## 🎯 SUCCESS METRICS

| Métrica | Antes | Target | Status |
|---------|-------|--------|--------|
| App.tsx Lines | 1,260 | ~700 | ⚠️ |
| Code Duplication | ~4,000 | ~400 | ⚠️ |
| Type Safety (any) | 15+ | 0 | ⚠️ |
| ARIA Labels | 0 | 40+ | ⚠️ |
| Error Boundaries | 0 | 1+ | ⚠️ |
| Security Issues | 4 | 0 | 🚨 |

---

## 📚 DOCUMENTACIÓN DE REFERENCIA

- `OPTIMIZATION_SUMMARY.md` - Vista general
- `REFACTORING_GUIDE.md` - Paso a paso detallado
- `CODE_REVIEW_REPORT.md` - Issues completos
- `MOBILE_OPTIMIZATION.md` - Mobile guidelines

---

**Última actualización**: Enero 2025
**Prioridad**: FASE 1 (Security) es CRÍTICA
**Estimated Time**: 4-6 horas total

¡Buena suerte con la implementación! 🚀
