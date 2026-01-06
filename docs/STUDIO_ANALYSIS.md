# Studio Virtual Try-On: Análisis Completo

## Estado Actual

### Limitaciones del Studio actual:
- **Solo 3 slots**: top, bottom, shoes
- **Sin guardar**: Los looks generados se pierden al refrescar
- **Sin layering**: No puedo poner campera + remera + buzo
- **Sin accesorios**: No hay slot para gorro, anteojos, bolso

### Categorías existentes en el sistema:
```typescript
CategoryFilter = 'all' | 'top' | 'bottom' | 'shoes' | 'accessory' | 'outerwear'
```

---

## Propuesta: Sistema de Slots por Zona Corporal

### Zonas y Slots

| Zona | Slot | Categorías | Requerido? | Layerable? |
|------|------|------------|------------|------------|
| **Cabeza** | head | gorro, vincha, sombrero | No | No |
| **Cara** | eyewear | anteojos, lentes de sol | No | No |
| **Torso base** | top_base | remera, musculosa, camisa | Sí* | Sí |
| **Torso mid** | top_mid | buzo, sweater, cardigan | No | Sí |
| **Torso outer** | outerwear | campera, tapado, blazer | No | Sí |
| **Torso one-piece** | one_piece | vestido, enterito, mono | Sí* | No |
| **Piernas** | bottom | pantalón, falda, short | Sí* | No |
| **Pies** | shoes | zapatillas, botas, sandalias | Recomendado | No |
| **Manos** | hand_acc | reloj, pulsera | No | No |
| **Bolso** | bag | cartera, mochila, clutch | No | No |

*Sí = Requerido (top_base + bottom) O (one_piece)

### Reglas de Validación
```
REGLA 1: Debe haber cobertura de torso
  → (top_base) OR (one_piece)

REGLA 2: Debe haber cobertura de piernas
  → (bottom) OR (one_piece)

REGLA 3: Máximo de items por generación
  → 6 prendas máximo (para no confundir al modelo)

REGLA 4: Layering lógico en torso
  → top_base → top_mid → outerwear (orden de adentro hacia afuera)
```

---

## Prompt Engineering para Gemini

### Estructura del Prompt

```
TAREA: Virtual try-on de outfit completo.

IMÁGENES DE PRENDAS (en orden):
${clothingDescriptions.map((desc, i) => `${i+1}. ${desc.slot}: ${desc.category} - Extraer solo la prenda, ignorar cualquier modelo`).join('\n')}

ÚLTIMA IMAGEN: Selfie del usuario

INSTRUCCIONES:
1. La persona de la última imagen DEBE aparecer en el resultado final
2. Preservar exactamente: rostro, tono de piel, complexión, pose
3. Para cada prenda, extraer SOLO el artículo de ropa (no el modelo de la foto)
4. Aplicar las prendas en orden de layering:
   - Primero: top base (remera/camisa)
   - Luego: mid layer si hay (buzo/sweater)
   - Encima: outerwear si hay (campera/tapado)
   - Después: bottom (pantalón/falda)
   - Finalmente: shoes y accesorios
5. Ajustar de forma realista (tela, sombras, proporciones)
6. Si es one-piece (vestido/enterito), reemplaza top+bottom

Genera la imagen final mostrando a la persona con el outfit completo.
```

### Variantes de Prompt por Contexto

| Preset | Modificador de Prompt |
|--------|----------------------|
| Selfie | "Foto natural, encuadre cercano al original del usuario" |
| Casual | "Estilo street, actitud relajada, fondo urbano si apropiado" |
| Pro | "Editorial de moda, pose profesional, iluminación de estudio" |

---

## Costos de Generación

### Pricing Gemini 2.5 Flash Image
- **Output**: $30 USD / 1M tokens
- **Por imagen generada**: ~1290 tokens = **$0.039 USD** (~$40 ARS)

### Costo por Tier de Usuario

| Tier | Generaciones/mes | Costo/usuario/mes |
|------|-----------------|-------------------|
| Free | 10 | $0.39 USD |
| Pro | 50 | $1.95 USD |
| Premium | 200 | $7.80 USD |

### Proyección 500 usuarios beta (Free)
- Peor caso (todos usan 10): **$195 USD/mes**
- Caso realista (promedio 4): **$78 USD/mes**

---

## Storage de Looks Generados

### Nueva Estructura de Datos

```typescript
interface GeneratedLook {
  id: string;
  user_id: string;
  image_url: string;              // Supabase Storage URL
  thumbnail_url?: string;         // Thumbnail para preview rápido

  // Items usados
  source_items: {
    top_base_id?: string;
    top_mid_id?: string;
    outerwear_id?: string;
    bottom_id?: string;
    one_piece_id?: string;
    shoes_id?: string;
    head_id?: string;
    eyewear_id?: string;
    bag_id?: string;
    hand_acc_id?: string;
  };

  // Metadata
  selfie_used: boolean;
  generation_preset: 'selfie' | 'casual' | 'pro';
  generation_model: 'gemini-2.5-flash-image' | 'gemini-3-pro-image-preview';

  // Social
  is_favorite: boolean;
  is_public: boolean;
  share_token?: string;

  // Timestamps
  created_at: string;
  updated_at?: string;
}
```

### Cálculo de Storage

| Concepto | Valor |
|----------|-------|
| Tamaño promedio imagen | ~500KB |
| Con compresión agresiva | ~150KB |
| Supabase free tier | 1GB |
| Looks posibles (sin comprimir) | ~2000 |
| Looks posibles (comprimido) | ~6600 |

### Estrategia de Storage

**Opción A: Límite por usuario**
- Free: 10 looks guardados
- Pro: 50 looks guardados
- Premium: Ilimitado (dentro de razón)

**Opción B: Auto-cleanup**
- Looks no favoritos se borran después de 30 días
- Favoritos permanecen

**Opción C: Híbrido (RECOMENDADO)**
- Límite base por tier
- Favoritos no cuentan contra el límite
- Auto-cleanup de no favoritos > 30 días

---

## Migración de Base de Datos

### Nueva Tabla: `generated_looks`

```sql
CREATE TABLE generated_looks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Storage
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,

  -- Source items (nullable, referencing clothing_items)
  top_base_id UUID REFERENCES clothing_items(id) ON DELETE SET NULL,
  top_mid_id UUID REFERENCES clothing_items(id) ON DELETE SET NULL,
  outerwear_id UUID REFERENCES clothing_items(id) ON DELETE SET NULL,
  bottom_id UUID REFERENCES clothing_items(id) ON DELETE SET NULL,
  one_piece_id UUID REFERENCES clothing_items(id) ON DELETE SET NULL,
  shoes_id UUID REFERENCES clothing_items(id) ON DELETE SET NULL,
  head_id UUID REFERENCES clothing_items(id) ON DELETE SET NULL,
  eyewear_id UUID REFERENCES clothing_items(id) ON DELETE SET NULL,
  bag_id UUID REFERENCES clothing_items(id) ON DELETE SET NULL,
  hand_acc_id UUID REFERENCES clothing_items(id) ON DELETE SET NULL,

  -- Metadata
  selfie_used BOOLEAN DEFAULT true,
  generation_preset TEXT DEFAULT 'selfie',
  generation_model TEXT DEFAULT 'gemini-2.5-flash-image',

  -- Social
  is_favorite BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  share_token TEXT UNIQUE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE generated_looks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own looks"
  ON generated_looks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view public looks"
  ON generated_looks FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can insert own looks"
  ON generated_looks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own looks"
  ON generated_looks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own looks"
  ON generated_looks FOR DELETE
  USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX idx_generated_looks_user_id ON generated_looks(user_id);
CREATE INDEX idx_generated_looks_created_at ON generated_looks(created_at DESC);
```

### Nuevo Bucket: `generated-looks`

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('generated-looks', 'generated-looks', true);

-- Policy: Users can upload to their own folder
CREATE POLICY "Users can upload generated looks"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'generated-looks'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Anyone can view (for sharing)
CREATE POLICY "Public read access for generated looks"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'generated-looks');
```

---

## UX del Studio Mejorado

### Flow Propuesto

```
1. SELECCIÓN DE PRENDAS (pantalla principal)
   ┌─────────────────────────────────────────┐
   │  [Filtros: Todo | Mi armario | Wishlist] │
   │                                          │
   │  ┌─────────────────────────────────────┐ │
   │  │ SLOTS SELECCIONADOS (max 6)        │ │
   │  │ [Top] [Buzo] [Campera] [Jean] [Zap] │ │
   │  └─────────────────────────────────────┘ │
   │                                          │
   │  [Grid de prendas disponibles]           │
   │  (click para agregar/quitar de slots)    │
   └─────────────────────────────────────────┘

2. CONFIGURACIÓN
   ┌─────────────────────────────────────────┐
   │  Selfie: [Subir foto] o [Usar anterior] │
   │                                          │
   │  Preset: ○ Selfie  ○ Casual  ○ Pro      │
   │                                          │
   │  [Vista previa de items seleccionados]   │
   └─────────────────────────────────────────┘

3. GENERACIÓN
   ┌─────────────────────────────────────────┐
   │  [Generando look...]                     │
   │  ████████████░░░░░░░░ 60%               │
   │                                          │
   │  Usando: Gemini 2.5 Flash Image          │
   │  Créditos: 9 restantes este mes          │
   └─────────────────────────────────────────┘

4. RESULTADO
   ┌─────────────────────────────────────────┐
   │  [IMAGEN GENERADA]                       │
   │                                          │
   │  [♥ Favorito] [💾 Guardar] [🔗 Compartir]│
   │                                          │
   │  [Generar otro] [Volver al armario]      │
   └─────────────────────────────────────────┘
```

### Indicadores de Slot en UI

```
SLOT VACÍO:          [ + Top ]  (borde punteado)
SLOT OCUPADO:        [👕 Remera azul]  (thumbnail + nombre)
SLOT OPCIONAL:       [ + Campera? ]  (borde gris, texto muted)
SLOT REQUERIDO:      [ ! Top* ]  (rojo si vacío)
```

---

## Resumen de Cambios Necesarios

### Backend
1. [ ] Crear migración `generated_looks`
2. [ ] Crear bucket `generated-looks` en Storage
3. [ ] Crear service `generatedLooksService.ts`
4. [ ] Actualizar edge function con nuevo prompt system
5. [ ] Agregar compresión de imágenes antes de guardar

### Frontend
1. [ ] Refactorizar `PhotoshootStudio.tsx` con sistema de slots
2. [ ] Crear componente `SlotSelector.tsx`
3. [ ] Crear vista `SavedLooksView.tsx`
4. [ ] Agregar contador de créditos en UI
5. [ ] Implementar guardado de looks

### Types
1. [ ] Agregar `GeneratedLook` interface
2. [ ] Agregar `ClothingSlot` type
3. [ ] Extender `CategoryFilter` si necesario

---

## Decisiones Pendientes

1. **¿Máximo de slots?** → Propuesta: 6
2. **¿Guardado automático o manual?** → Propuesta: Manual (botón "Guardar")
3. **¿Límite de looks guardados por tier?** → Propuesta: Free=10, Pro=50, Premium=∞
4. **¿Auto-cleanup de no favoritos?** → Propuesta: Sí, 30 días
5. **¿Compartir looks públicamente?** → Propuesta: Sí, con share_token

---

*Documento generado para revisión. Esperando aprobación antes de implementar.*
