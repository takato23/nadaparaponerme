# Prompt para Implementación Completa - "No Tengo Nada Para Ponerme" v2.0

Eres un desarrollador senior especializado en React + TypeScript + Gemini AI trabajando en "No Tengo Nada Para Ponerme", una app de asistente de moda con IA.

## CONTEXTO DEL PROYECTO

**Stack Actual**:
- Frontend: React 18 + TypeScript + Vite + Tailwind CSS
- Backend: Supabase (PostgreSQL + Edge Functions + Storage + Auth)
- IA: Google Gemini AI (2.5 Flash, 2.5 Pro, Imagen 4.0)
- Estado: localStorage (migrando a Supabase)
- Deployment: Supabase hosting

**Arquitectura Actual**:
- Estado centralizado en `App.tsx` con hook `useLocalStorage`
- Servicios de IA en `services/geminiService.ts` (8 funciones principales)
- Componentes en `components/` (vistas + utilidades)
- Edge Functions en Supabase para proxy de Gemini API
- Base de datos: 10 tablas con RLS + 3 storage buckets

**Funcionalidades Implementadas**:
1. ✅ Gestión de closet digital (CRUD de prendas)
2. ✅ Análisis de metadatos con Gemini Vision
3. ✅ Generación de outfits con IA
4. ✅ Smart Packer (listas de viaje)
5. ✅ Virtual Try-On (composición de outfits en foto)
6. ✅ Sistema social (amigos, préstamos, likes, comentarios)
7. ✅ Búsqueda de items similares
8. ✅ Shopping suggestions con Google Search grounding
9. ✅ Autenticación y perfiles

**Estructura de Archivos Clave**:
```
src/
├── App.tsx                          # Estado centralizado y navegación
├── components/
│   ├── *View.tsx                    # Vistas modales/páginas
│   ├── ClosetGrid.tsx              # Grid de prendas
│   └── icons/                       # Iconos custom
├── services/
│   └── geminiService.ts            # 8 funciones de IA
├── hooks/
│   └── useLocalStorage.ts          # Persistencia
├── lib/
│   └── supabase.ts                 # Cliente Supabase
└── types/
    └── api.ts                       # TypeScript types

supabase/
├── functions/
│   ├── analyze-clothing/
│   ├── generate-outfit/
│   └── generate-packing-list/
└── migrations/                      # SQL schemas
```

**Patrones Clave**:
- Todos los servicios AI usan structured JSON output (`Type.OBJECT`)
- Imágenes como base64 data URLs
- IDs: UUID en Supabase, timestamp en localStorage legacy
- UI en español
- Soft deletes con `deleted_at`
- Edge Functions para seguridad de API keys

---

## ROADMAP DE IMPLEMENTACIÓN

Implementa el siguiente plan en 6 fases (22 semanas totales):

### FASE 1: Quick Wins & Foundation (4 semanas)

**Sprint 1-2: Analytics & Insights**

1. **Closet Statistics Dashboard** (3-4 días)
   - Crear `components/ClosetAnalyticsView.tsx`
   - Métricas: total por categoría, distribución colores, items antiguos/nuevos, sin usar
   - Gráficos con Recharts
   - Botón en perfil

2. **Color Palette Analyzer** (5-6 días)
   - Servicio `analyzeColorPalette()` en geminiService.ts
   - Edge Function `analyze-color-palette`
   - Extraer paleta dominante del closet
   - Detectar esquema cromático (monocromático/complementario/análogo)
   - UI: visualización circular + sugerencias de colores faltantes

3. **Versatility Score** (2-3 días)
   - Algoritmo: calcular combinaciones posibles por prenda
   - Score: color neutro +10, básico +5
   - Badge visual en closet grid
   - Vista "Top 10 más versátiles"

---

### FASE 2: AI Conversacional (4 semanas)

**Sprint 3-4: Fashion Chatbot Core**

4. **Chat Interface** (4-5 días)
   - `components/FashionChatView.tsx` estilo WhatsApp
   - Input + historial + typing indicator
   - Integrar en navegación principal

5. **Gemini Conversational Backend** (6-7 días)
   - Servicio `chatWithFashionAssistant()` con streaming
   - Edge Function `chat-assistant`
   - Prompt engineering con contexto del closet:
     ```
     Eres un asistente de moda personal en español.
     Closet del usuario: [metadata JSON]
     Usuario: {query}
     Responde sugiriendo outfits específicos con IDs de prendas.
     ```
   - Parsear sugerencias de outfit (extraer item IDs)
   - Usar `generateContentStream()` para respuestas progresivas

6. **Occasion-Based Suggestions** (2-3 días)
   - Presets: "Entrevista", "Primera cita", "Casual", "Formal"
   - Botones de sugerencias rápidas en chat
   - Filtros contextuales (clima, hora)

---

### FASE 3: Contexto Inteligente (3 semanas)

**Sprint 5-6: Weather & Calendar Integration**

7. **Weather-Aware Outfits** (5-6 días)
   - Integrar OpenWeatherMap API (free tier)
   - Servicio `generateWeatherOutfit(temp, conditions)`
   - Filtrar prendas por `seasons` metadata
   - Card de clima + outfit del día
   - Notificación diaria opcional (service worker)

8. **Weekly Outfit Planner** (6-7 días)
   - `components/WeeklyPlannerView.tsx` tipo calendario
   - Drag & drop de outfits (react-beautiful-dnd)
   - Tabla Supabase: `outfit_schedule` (user_id, date, outfit_id)
   - Vista semanal con previews

9. **Google Calendar Sync** (7-8 días) - OPCIONAL/PREMIUM
   - OAuth Google Calendar
   - Leer eventos → sugerir outfits por tipo
   - Auto-planning semanal

---

### FASE 4: Creatividad & Social (4 semanas)

**Sprint 7-8: Lookbooks & Challenges**

10. **Lookbook Creator** (6-7 días)
    - `components/LookbookCreatorView.tsx`
    - Temas: "Office", "Weekend", "Date Night"
    - Gemini genera 5-7 outfits temáticos
    - Layout grid automático
    - Export a imagen (html-to-image)
    - Web Share API

11. **Style Challenge Generator** (4-5 días)
    - Servicio `generateStyleChallenge()`
    - Retos: "3 colores max", "Solo vintage", "Mix formal/casual"
    - Gemini valida cumplimiento
    - Compartir resultados + leaderboard simple

**Sprint 9-10: Social Features**

12. **Outfit Rating System** (3-4 días)
    - Ampliar `outfit_likes` con ratings (1-5 estrellas)
    - UI de rating en outfits compartidos
    - Promedio de ratings
    - Notificaciones

13. **AI Feedback Analyzer** (5-6 días)
    - Servicio `analyzeFeedbackPatterns()`
    - Analizar comentarios/ratings con Gemini
    - Detectar patrones de preferencias
    - Vista de insights personalizados

---

### FASE 5: Shopping Intelligence (3 semanas)

**Sprint 11-12: Smart Shopping**

14. **Closet Gap Analysis** (4-5 días)
    - Algoritmo: detectar categorías/colores/ocasiones faltantes
    - Servicio `analyzeClosetGaps()` con Gemini
    - Vista "Shopping List" con priorización

15. **Brand & Price Recognition** (6-7 días)
    - Gemini Vision + Google Search grounding
    - Detectar marcas en fotos
    - Estimar valor aproximado
    - Vista "Valor total del closet"
    - Clasificación: lujo/mid-range/fast-fashion

16. **Dupe Finder** (5-6 días)
    - Upload imagen de inspiración
    - Buscar en: closet (findSimilarItems) + shopping
    - Comparación side-by-side
    - Links con affiliate tracking

---

### FASE 6: Advanced Features (4 semanas)

**Sprint 13-14: Capsule & Style DNA**

17. **Capsule Wardrobe Builder** (7-8 días)
    - Input: cantidad de prendas (15, 30, 50)
    - Gemini optimiza para versatilidad máxima
    - Algoritmo greedy o genético
    - Matriz de combinaciones posibles
    - Export checklist

18. **Style DNA Profile** (6-7 días)
    - Quiz conversacional Gemini (10 preguntas)
    - Analizar patrones: % por estilo (minimal, boho, street, classic)
    - Generación de perfil visual
    - Recomendaciones personalizadas

**Sprint 15-16: Creative Tools**

19. **AI Fashion Designer** (6-7 días)
    - Input: "Reimagina outfit en estilo [cyberpunk/vintage/etc]"
    - Gemini + Imagen API
    - Galería de diseños generados

20. **Style Evolution Timeline** (5-6 días)
    - Visualización temporal del closet
    - Gráficos: cambio de paleta, evolución de estilos
    - Análisis narrativo con Gemini

---

## INSTRUCCIONES DE EJECUCIÓN

### Metodología

1. **Usa TodoWrite** para trackear progreso de cada sprint
2. **Implementa en orden** (las fases tienen dependencias)
3. **Valida antes de continuar**:
   - Tests manuales
   - Type checking (`npm run build`)
   - Lint (`npm run lint`)
4. **Commits semánticos**: `feat(analytics): add color palette analyzer`
5. **Edge Functions**: deployar con `supabase functions deploy [nombre]`
6. **Migraciones DB**: crear en `supabase/migrations/` si necesario

### Consideraciones Técnicas

**Límites Supabase Free Tier**:
- DB: 500MB (monitorear)
- Storage: 1GB (comprimir imágenes)
- Bandwidth: 2GB/mes (cachear Gemini responses)

**Caching Strategy**:
- Color palette: 7 días
- Weather outfits: 12 horas
- Chat: no cachear
- Analytics: 24 horas

**Rate Limiting**:
- Gemini: 60 RPM (implementar queue)
- OpenWeather: 1000 calls/día

**Optimizaciones**:
- Batch Gemini requests cuando sea posible
- Lazy load componentes pesados
- Virtualize long lists (react-window)

### Estructura de PRs

Cada funcionalidad = 1 PR con:
1. Código del feature
2. Edge Function si aplica
3. Migración DB si aplica
4. Update de tipos en `types/api.ts`
5. README con instrucciones de uso

---

## PRIORIZACIÓN RECOMENDADA

### Opción A: Full Roadmap (5.5 meses)
Implementar todas las 20 funcionalidades secuencialmente.

### Opción B: MVP Iterativo (3 meses) - RECOMENDADA
1. **Mes 1**: Fase 1 + Fase 2 (Analytics + Chatbot)
2. **Mes 2**: Fase 3 + Lookbooks/Challenges
3. **Mes 3**: Gap Analysis + Capsule + Style DNA

### Opción C: Quick Wins (6 semanas)
Solo: Analytics Dashboard → Fashion Chatbot → Weather Outfits
Validar tracción antes de continuar.

---

## OUTPUT ESPERADO

Para cada funcionalidad implementada, provee:

1. ✅ **Código completo** (componentes + servicios + edge functions)
2. 📊 **Schemas DB** si requiere nuevas tablas
3. 🧪 **Casos de prueba** básicos
4. 📝 **Documentación** de uso en CHANGELOG.md
5. 🎯 **Métricas de éxito** a trackear

**Formato de respuesta**:
```
# [Feature Name]

## Implementación

### 1. Frontend
[código de componentes]

### 2. Backend (si aplica)
[edge functions, migrations]

### 3. Servicios
[código en geminiService.ts]

## Testing Manual
- [ ] Paso 1
- [ ] Paso 2

## Métricas de Éxito
- KPI 1: [objetivo]
- KPI 2: [objetivo]
```

---

## COMENZAR

**Empieza con FASE 1 - Sprint 1**: Closet Analytics Dashboard

Implementa las 3 funcionalidades del Sprint 1-2 en orden:
1. Closet Statistics Dashboard
2. Color Palette Analyzer
3. Versatility Score

Usa /build, /implement, y /analyze según sea necesario. Activa --wave-mode para features complejas.

¡Adelante! 🚀
