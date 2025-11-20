# ANÁLISIS ESTRUCTURAL: INTEGRACIÓN VIRTUAL STYLIST

**Fecha**: 2025-01-20
**Contexto**: Comparación entre especificación profesional (`recomendaiconesdemiamiga.md`) y sistema actual

---

## 1. COMPARACIÓN ESTRUCTURAL

### A. MODELOS DE DATOS

#### Estado Actual ✅
```typescript
// Prenda individual
ClothingItem {
  id: string;
  imageDataUrl: string;
  metadata: {
    category: 'top' | 'bottom' | 'shoes' | 'accessory' | 'outerwear' | 'one-piece';
    subcategory: string;
    color_primary: string;          // ⚠️ Solo 1 color
    neckline?: string;
    sleeve_type?: string;
    vibe_tags: string[];
    seasons: string[];
  }
}

// Perfil de usuario existente
StyleDNAProfile {
  archetypes: StyleArchetypeScore[];           // ✅ 10 tipos con porcentajes
  color_profile: { dominant_colors, temperature, boldness };  // ⚠️ Básico
  silhouette_preferences: string[];            // ✅ oversized, fitted, etc.
  occasion_breakdown: { work, casual, formal, athletic };
  personality_traits: { adventurous, practical, creative };
  celebrity_matches: CelebrityStyleMatch[];
  versatility_score: number;
  uniqueness_score: number;
}
```

#### Propuesta Profesional 🎯
```typescript
// Del documento recomendaiconesdemiamiga.md
UserProfile {
  body_shape: 'triangulo' | 'rectangulo' | 'reloj_arena' | 'triangulo_invertido' | 'oval';
  color_season: 'primavera_clara' | 'verano_suave' | 'otoño_profundo' | 'invierno_brillante' | etc.;
  style_archetypes: string[];
  preferences: {
    loves: string[];
    hates: string[];
  }
}

ClothingItemPro {
  // ... campos actuales +
  colors: string[];              // ✅ Múltiples colores
  pattern: 'liso' | 'rayado' | 'estampado' | 'floral';
  formality: 1-5;                // ✅ Escala numérica
  fit: 'oversize' | 'slim' | 'regular';
  season_tags: string[];
}
```

#### GAP CRÍTICO 🚨
| Dimensión | Actual | Propuesta | Impacto |
|-----------|--------|-----------|---------|
| **Morfología Corporal** | ❌ No existe | ✅ 5 tipos + reglas | Alto - Recomendaciones sin equilibrio de silueta |
| **Colorimetría Personal** | ⚠️ Color de prenda | ✅ Paleta de 12 estaciones | Alto - No considera tono de piel |
| **Contraste Personal** | ❌ No existe | ✅ Alto/Medio/Bajo | Medio - Combinaciones incorrectas |
| **Formalidad Numérica** | ❌ Solo tags | ✅ Escala 1-5 | Medio - Difícil matchear ocasión |
| **Múltiples Colores** | ⚠️ Solo primario | ✅ Array de colores | Bajo - Pierde info de prendas multicolor |

---

### B. LÓGICA DE GENERACIÓN

#### Proceso Actual (services/geminiService.ts) ⚙️
```
1. Input: User prompt + closet JSON (sin imágenes)
2. System Prompt: "Eres un estilista con ojo de loca. Selecciona top+bottom+shoes"
3. Modelo: gemini-2.5-pro
4. Output Schema: { top_id, bottom_id, shoes_id, explanation, missing_piece_suggestion }
5. Validación: Básica (IDs existen)
6. Chat Response: Texto conversacional
```

**Limitaciones**:
- ❌ No considera morfología del usuario
- ❌ No valida armonía cromática con tono de piel
- ❌ No filtra por dress code (puede sugerir joggings para boda)
- ❌ No aplica reglas de proporción visual
- ⚠️ Validación post-generación (puede fallar con IDs inventados)

#### Proceso Profesional Propuesto 🎯
```
1. Análisis de Contexto → Define formalidad (1-5) + necesidades térmicas
2. Filtro Duro (Hard Filter):
   - Elimina prendas de lista "Hates"
   - Elimina incompatibles con clima
   - Elimina incompatibles con formalidad
3. Selección de Pieza Base → Elige protagonista del look
4. Construcción del Outfit:
   - Añade complementarios respetando Morfología
   - Verifica Colorimetría (armonía + color cerca del rostro)
5. Cierre del Look → Calzado + abrigo (si clima lo pide)
6. Generación de Explicación → "Por qué te favorece"
```

**Fortalezas**:
- ✅ Filtrado preventivo (evita errores antes de generación)
- ✅ Considera morfología para balance visual
- ✅ Valida armonía cromática con paleta personal
- ✅ Chain-of-Thought explícito (mejor razonamiento)

---

### C. SYSTEM PROMPTS

#### Actual (líneas 251-254 geminiService.ts)
```
Eres un estilista personal con un "ojo de loca" para la moda.
Tienes acceso al siguiente inventario de ropa...
Selecciona la mejor combinación (Top + Bottom + Shoes) del inventario.
Si crees que falta una pieza clave... puedes sugerir una pieza que el usuario podría comprar.
```

**Análisis**:
- ✅ Tono correcto (cercano, empático)
- ⚠️ Sin contexto de usuario (solo inventario)
- ❌ Sin reglas de estilo explícitas
- ❌ Sin estructura de razonamiento

#### Propuesto (del documento)
```
Eres un estilista personal experto en imagen, colorimetría y morfología.
Tono: Español Rioplatense (voseo). Cercano, empático.
Filosofía: "Menos reglas rígidas, más buenas razones".
Límites: Cero body-shaming. Equilibrar y potenciar, nunca criticar.

USUARIO:
- Morfología: ${body_shape} → ${silhouettingRules[body_shape]}
- Colorimetría: ${color_season} → ${palette}
- Preferencias: Loves ${loves}, Hates ${hates}

INVENTARIO: ${items}

CONTEXTO:
- Ocasión: ${occasion} → Formalidad ${formality_level}/5
- Clima: ${weather} → ${layering_suggestions}

INSTRUCCIONES (Chain-of-Thought):
1. Análisis de Contexto: Define formalidad y necesidades térmicas
2. Filtro Duro: Elimina prendas incompatibles
3. Selección Base: Elige pieza protagonista
4. Construcción: Añade complementarios respetando morfología + colorimetría
5. Cierre: Calzado + abrigo
6. Explicación: Por qué te favorece (morfología, colores, mood)

OUTPUT REQUERIDO (Markdown):
# [Título Creativo]
## 🧥 El Look
- Arriba: [prenda]
- Abajo: [prenda]
- Calzado: [prenda]
- Capas: [prenda]

## 💡 ¿Por qué te favorece?
- Tu Cuerpo: [explicación morfológica]
- Tus Colores: [explicación colorimetría]
- El Mood: [encaja ocasión/clima]

## 🎨 Datos UI (invisible)
mood_color_hex: "#..."
vibe: "elegante"
```

**Ventajas**:
- ✅ Contexto completo del usuario
- ✅ Reglas de estilo explícitas (morfología, colorimetría)
- ✅ Chain-of-Thought estructurado (mejor razonamiento)
- ✅ Output dual (UI data + texto user-facing)
- ✅ Tono ético (no body-shaming)

---

### D. SALIDA ESTRUCTURADA

#### Actual
```typescript
FitResult {
  top_id: string;
  bottom_id: string;
  shoes_id: string;
  explanation: string;
  missing_piece_suggestion?: { item_name, reason };
}
```

#### Propuesta
```markdown
# Noche de Galería & Vinos

## 🧥 El Look
* **Arriba:** Blazer negro estructura hombros
* **Abajo:** Jean oscuro tiro alto
* **Calzado:** Botines negros taco medio
* **Capas/Accesorios:** Pañuelo seda color mostaza

## 💡 ¿Por qué te favorece?
* **Tu Cuerpo:** El blazer estructurado equilibra tus hombros (triángulo invertido)...
* **Tus Colores:** El mostaza cerca del rostro realza tu undertone cálido...
* **El Mood:** Smart casual perfecto para evento cultural...

## 🎨 Datos para la UI
mood_color_hex: "#2A4B7C"
vibe: "elegante"
```

**Diferencias Clave**:
- ✅ Nombres descriptivos en vez de solo IDs
- ✅ Sección educativa (por qué favorece)
- ✅ Metadata visual (color mood para orbes)
- ⚠️ Requiere parseo Markdown en frontend

---

## 2. PLAN DE INTEGRACIÓN

### OPCIÓN A: HÍBRIDO (Recomendado) ⭐

**Concepto**: Mantener estructura actual + añadir capa profesional

#### Fase 1: Extensión de Datos (1-2 días)
```typescript
// types.ts
interface UserStyleProfile {
  // Existente (mantener)
  styleDNA: StyleDNAProfile;

  // NUEVO: Perfil profesional
  professionalProfile?: {
    morphology: {
      body_shape: 'triangulo' | 'rectangulo' | 'reloj_arena' | 'triangulo_invertido' | 'oval';
      fit_preferences: {
        tops: 'fitted' | 'relaxed' | 'structured' | 'oversized';
        bottoms: 'fitted' | 'relaxed' | 'wide-leg';
      };
      height_cm?: number;
    };
    colorimetry: {
      color_season: 'primavera_clara' | 'verano_suave' | 'otoño_profundo' | 'invierno_brillante' | /* ... 8 más */;
      contrast_level: 'alto' | 'medio' | 'bajo';
      undertone?: 'cool' | 'warm' | 'neutral';
    };
    preferences: {
      loves: string[];
      hates: string[];
    };
    completed_at?: Date;
  };
}

// Migración Supabase
CREATE TABLE user_professional_profiles (
  user_id UUID PRIMARY KEY REFERENCES profiles(id),
  body_shape TEXT,
  color_season TEXT,
  contrast_level TEXT,
  fit_preferences JSONB,
  loves TEXT[],
  hates TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Fase 2: Onboarding Wizard (2-3 días)
```
Componente: ProfessionalStyleWizardView.tsx

Pasos:
1. Introducción (por qué es útil)
2. Morfología:
   - Selector visual de 5 siluetas con ilustraciones
   - Input altura (opcional)
   - Selector fit preferences (fitted vs relaxed)
3. Colorimetría:
   - Selector paleta estacional (con muestras visuales)
   - Test rápido: "¿Te quedan mejor dorados o plateados?" → undertone
4. Preferencias:
   - Tags de loves/hates (selección múltiple de lista común)
5. Resumen + Guardar

Estado:
- Muestra badge "Perfil básico" vs "Perfil profesional" en ProfileView
- Permite saltar y completar después
```

#### Fase 3: Service Layer Upgrade (2-3 días)
```typescript
// services/professionalStylistService.ts

export async function generateProfessionalOutfit(
  closet: ClothingItem[],
  userProfile: UserStyleProfile,
  occasion: string,
  weather?: WeatherData
): Promise<ProfessionalFitResult> {

  // 1. Preparar contexto
  const context = buildStylistContext(userProfile, occasion, weather);

  // 2. Filtrar inventario (hard filters)
  const filtered = applyHardFilters(closet, userProfile, context);

  // 3. Enriquecer system prompt
  const systemPrompt = buildProfessionalPrompt(context);

  // 4. Llamar Gemini 2.5 Pro
  const result = await callGemini({
    model: 'gemini-2.5-pro',
    systemInstruction: systemPrompt,
    contents: [{ text: occasion }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: professionalOutfitSchema,
      temperature: 0.7
    }
  });

  // 5. Parsear y validar
  const parsed = parseMarkdownOutput(result);

  // 6. Enriquecer con metadata
  return enrichWithMetadata(parsed, closet);
}

function buildProfessionalPrompt(context: StylistContext): string {
  return `
Eres un estilista personal experto en imagen, colorimetría y morfología.
Tono: Español Rioplatense (voseo). Cercano, empático.
Filosofía: "Menos reglas rígidas, más buenas razones".
Límites: Cero body-shaming. Equilibrar y potenciar, nunca criticar.

USUARIO:
${context.morphologyRules}
${context.colorimetryPalette}
${context.preferences}

INVENTARIO:
${context.inventory}

CONTEXTO:
${context.occasion} → Formalidad ${context.formalityLevel}/5
${context.weather}

INSTRUCCIONES (Chain-of-Thought):
1. Análisis de Contexto
2. Filtro Duro (elimina incompatibles)
3. Selección Base (pieza protagonista)
4. Construcción (respeta morfología + colorimetría)
5. Cierre (calzado + abrigo)
6. Explicación (por qué favorece)

OUTPUT (Markdown):
[... estructura del documento ...]
`;
}

function applyHardFilters(
  closet: ClothingItem[],
  profile: UserStyleProfile,
  context: StylistContext
): ClothingItem[] {
  return closet.filter(item => {
    // Filtro 1: Lista "Hates"
    if (profile.professionalProfile?.preferences.hates.some(hate =>
      item.metadata.subcategory.toLowerCase().includes(hate.toLowerCase())
    )) return false;

    // Filtro 2: Clima
    if (context.weather) {
      if (context.weather.temperature < 15 &&
          item.metadata.seasons.includes('summer')) return false;
      if (context.weather.temperature > 25 &&
          item.metadata.seasons.includes('winter')) return false;
    }

    // Filtro 3: Formalidad (si tiene el campo)
    // TODO: Añadir formality a ClothingItemMetadata

    return true;
  });
}
```

#### Fase 4: Frontend Integration (2 días)
```typescript
// App.tsx

// Estado nuevo
const [professionalProfile, setProfessionalProfile] = useLocalStorage<ProfessionalProfile | null>(
  'ojodeloca-professional-profile',
  null
);

// Modificar generación
const handleGenerateFit = async (prompt: string) => {
  setIsGeneratingFit(true);
  try {
    // Decidir qué servicio usar
    if (professionalProfile) {
      // Usar servicio profesional
      const result = await generateProfessionalOutfit(
        closet,
        { styleDNA: userStyleDNA, professionalProfile },
        prompt,
        weatherData
      );
      setGeneratedFit(result);
    } else {
      // Fallback al actual
      const result = await generateOutfit(closet, prompt);
      setGeneratedFit(result);
    }
    setCurrentView('fit-result');
  } catch (error) {
    // ...
  }
};

// Añadir wizard al HomeView
<HomeView
  onShowProfessionalWizard={() => setShowProfessionalWizard(true)}
  hasProfessionalProfile={!!professionalProfile}
/>

// Renderizar wizard
{showProfessionalWizard && (
  <ProfessionalStyleWizardView
    onComplete={(profile) => {
      setProfessionalProfile(profile);
      setShowProfessionalWizard(false);
    }}
    onClose={() => setShowProfessionalWizard(false)}
  />
)}
```

#### Fase 5: UI Enhancements (1-2 días)
```typescript
// components/FitResultViewImproved.tsx

// Mostrar sección educativa si existe
{result.morphologyExplanation && (
  <div className="mt-6 p-4 liquid-glass rounded-xl">
    <h3 className="text-lg font-semibold mb-2">💡 ¿Por qué te favorece?</h3>

    <div className="space-y-3">
      <div>
        <span className="font-medium">Tu Cuerpo:</span>
        <p className="text-sm opacity-80">{result.morphologyExplanation}</p>
      </div>

      <div>
        <span className="font-medium">Tus Colores:</span>
        <p className="text-sm opacity-80">{result.colorimetryExplanation}</p>
      </div>

      <div>
        <span className="font-medium">El Mood:</span>
        <p className="text-sm opacity-80">{result.moodExplanation}</p>
      </div>
    </div>
  </div>
)}

// Usar mood_color_hex para orbes de fondo
<div
  className="absolute inset-0 -z-10"
  style={{
    background: `radial-gradient(circle at 20% 80%, ${result.moodColorHex}33, transparent 50%)`
  }}
/>
```

---

### OPCIÓN B: REVOLUCIONARIO (No recomendado)

**Concepto**: Reemplazar completamente el sistema actual

**Problemas**:
- ❌ Rompe backward compatibility (outfits guardados)
- ❌ Requiere re-onboarding de todos los usuarios
- ❌ Pérdida de features existentes (chat assistant, packing list)
- ❌ Mayor tiempo de desarrollo (4-6 semanas)

---

## 3. DECISIONES DE ARQUITECTURA

### A. Modelo de Datos

**Decisión**: Extensión incremental ✅
- Mantener `StyleDNAProfile` actual
- Añadir `ProfessionalProfile` opcional
- Migración gradual (wizard opcional)

**Razón**:
- No rompe compatibilidad
- Permite A/B testing (con/sin perfil profesional)
- Usuarios existentes no afectados

### B. System Prompt

**Decisión**: Dual prompting ✅
```typescript
if (hasProfessionalProfile) {
  return buildProfessionalPrompt(context); // 2K tokens
} else {
  return buildBasicPrompt(inventory);      // 500 tokens
}
```

**Razón**:
- Optimiza costos (solo usuarios con perfil completo usan prompt complejo)
- Mantiene experiencia simple para nuevos usuarios
- Permite comparación de calidad

### C. Output Format

**Decisión**: Extender schema JSON ✅
```typescript
ProfessionalFitResult extends FitResult {
  // Campos actuales
  top_id, bottom_id, shoes_id: string;
  explanation: string;

  // NUEVO: Sección educativa
  educational?: {
    morphology_explanation: string;
    colorimetry_explanation: string;
    mood_explanation: string;
  };

  // NUEVO: Metadata visual
  ui_metadata?: {
    mood_color_hex: string;
    vibe: 'elegante' | 'casual' | 'sporty' | 'bohemian';
  };
}
```

**Razón**:
- Mantiene IDs para lógica de guardado/compartir
- Añade explicaciones sin romper UI actual
- Metadata visual mejora experiencia sin requerir cambios

### D. Validación

**Decisión**: Pre-filtrado + post-validación ✅
```typescript
// ANTES de Gemini
const filtered = applyHardFilters(closet, profile, context);

// DESPUÉS de Gemini
const validated = validateOutfit(result, profile);
if (validated.score < 0.7) {
  // Regenerar con feedback
  const corrected = await regenerateWithFeedback(result, validated.issues);
}
```

**Razón**:
- Pre-filtrado reduce alucinaciones
- Post-validación detecta errores antes de mostrar al usuario
- Auto-corrección mejora UX

---

## 4. ROADMAP DE IMPLEMENTACIÓN

### Sprint 1: Foundation (Semana 1)
**Objetivo**: Capturar datos profesionales

- [ ] **Día 1-2**: Extender tipos + migración DB
  - `types.ts`: Añadir `ProfessionalProfile`
  - `supabase/migrations/`: Crear tabla `user_professional_profiles`
  - `src/services/profileService.ts`: CRUD functions

- [ ] **Día 3-5**: Wizard de onboarding
  - `components/ProfessionalStyleWizardView.tsx`
  - UI con ilustraciones de siluetas
  - Selector de paleta estacional
  - Guardar en Supabase + localStorage

**Entregable**: Usuarios pueden completar perfil profesional

---

### Sprint 2: Service Layer (Semana 2)
**Objetivo**: Lógica de generación profesional

- [ ] **Día 1-2**: Hard filters + context builder
  - `services/professionalStylistService.ts`
  - `applyHardFilters()`: Elimina incompatibles
  - `buildStylistContext()`: Prepara contexto completo

- [ ] **Día 3-4**: Professional prompt + schema
  - `buildProfessionalPrompt()`: System prompt completo
  - `professionalOutfitSchema`: JSON schema extendido
  - `parseMarkdownOutput()`: Parser de respuesta

- [ ] **Día 5**: Validación + auto-corrección
  - `validateOutfit()`: Scorer de calidad
  - `regenerateWithFeedback()`: Re-intento con feedback

**Entregable**: API funcional para generación profesional

---

### Sprint 3: Integration (Semana 3)
**Objetivo**: Conectar frontend con nuevo servicio

- [ ] **Día 1-2**: App.tsx integration
  - Estado `professionalProfile`
  - Lógica dual (con/sin perfil)
  - Feature flag para A/B testing

- [ ] **Día 3-4**: UI enhancements
  - `FitResultViewImproved.tsx`: Mostrar sección educativa
  - Mood color en background
  - Badge "Perfil profesional" en ProfileView

- [ ] **Día 5**: Testing + ajustes
  - Test casos edge (sin perfil, inventario vacío)
  - Validar prompts con diferentes perfiles
  - Ajustar temperature/top_p si es necesario

**Entregable**: Feature completa en producción

---

### Sprint 4: Optimization (Semana 4)
**Objetivo**: Refinar experiencia

- [ ] **Métricas**:
  - Outfit acceptance rate (con vs sin perfil)
  - Tiempo de generación
  - Regeneration rate

- [ ] **Iteraciones**:
  - Ajustar reglas de morfología según feedback
  - Refinar paletas de colorimetría
  - Optimizar prompts (reducir tokens sin perder calidad)

- [ ] **Documentación**:
  - `CHANGELOG.md`: Feature 27
  - Testing manual checklist
  - Prompt engineering notes

**Entregable**: Sistema optimizado con métricas positivas

---

## 5. RIESGOS Y MITIGACIONES

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| **Usuarios no completan wizard** | Alta | Medio | Hacer wizard opcional + mostrar valor antes |
| **Prompts muy largos (>2K tokens)** | Media | Alto | Comprimir reglas + usar references en vez de textos completos |
| **Gemini no sigue Chain-of-Thought** | Media | Alto | Usar few-shot examples + structured output estricto |
| **IDs aún se alucinan** | Baja | Medio | Pre-filtrado + validación post-generación |
| **Colorimetría incorrecta** | Media | Bajo | Validar paletas con color theory library |

---

## 6. MÉTRICAS DE ÉXITO

### Cuantitativas
- ✅ Outfit acceptance rate >75% (usuarios guardan outfit sin regenerar)
- ✅ Regeneration rate <20% (promedio <1.2 intentos por outfit)
- ✅ Profile completion rate >40% (de usuarios activos)
- ✅ Tiempo generación <5s (P95)

### Cualitativas
- ✅ Feedback positivo en explicaciones educativas
- ✅ Usuarios reportan mejores fits
- ✅ Menos quejas sobre colores que "no les quedan"

---

## 7. NEXT STEPS

### Immediate (Esta semana)
1. **Decisión**: ¿Aprobar Opción A (Híbrido)?
2. **Design**: Mockups del wizard (5 pantallas)
3. **Copy**: Textos educativos para cada tipo de cuerpo/paleta

### Short-term (Próximas 2 semanas)
1. Implementar Sprint 1 + 2
2. Alpha testing con 5-10 usuarios
3. Iterar prompts según feedback

### Long-term (1-2 meses)
1. Feature completa en producción
2. A/B test: con/sin perfil profesional
3. Considerar monetización ("Perfil Pro" premium)

---

## 8. CONCLUSIÓN

**Recomendación**: Implementar **Opción A (Híbrido)** en 4 sprints

**Razones**:
- ✅ Mantiene compatibilidad con sistema actual
- ✅ Añade inteligencia profesional sin romper nada
- ✅ Permite validación incremental
- ✅ Claro path de migración para usuarios existentes

**Valor esperado**:
- 📈 +30% outfit acceptance rate
- 📈 +25% user engagement (completar perfil = más inversión)
- 📈 Diferenciador competitivo (colorimetría + morfología no son comunes en apps de moda)

**Esfuerzo**: ~3-4 semanas (1 desarrollador)

**ROI**: Alto (mejora core value proposition sin reescribir app)
