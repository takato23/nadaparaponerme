# Ropa Olvidada (Forgotten Clothing)

Redescubrí las prendas que dejaste de usar. El sistema detecta automáticamente la
ropa que llevás tiempo sin ponerte (o que nunca usaste) y te ayuda a reincorporarla
a tus looks.

## Por qué se rehízo

El sistema anterior estaba roto de punta a punta y era confuso:

- La única noción de "ropa olvidada" eran 2-3 strings (`unused_potential`) enterrados
  al final del **Análisis de Preferencias**, que requería ≥3 calificaciones de outfits,
  IA obligatoria, sin imágenes y sin ninguna acción posible.
- Existía infraestructura muerta: el preset de filtro `unused`, `UsageStats` y
  `incrementTimesWorn()` **nunca funcionaban** porque el modelo `ClothingItem` del
  frontend **no tenía** los campos `times_worn` / `last_worn_at` y nada registraba el uso.

## Cómo lo resuelve ahora (arquitectura de 2 niveles)

> "¿En un teléfono viejo o en uno nuevo? ¿Con el modelo de Apple o Gemini?"

Esta es una **web app** (React + Vite), así que los modelos on-device nativos
(Apple Core ML / Apple Intelligence, Gemini Nano) **no** son accesibles desde el
navegador. El equivalente correcto a "on-device" en una web app es una heurística
local en JS. Por eso el diseño es híbrido:

| Nivel | Qué hace | Dónde corre | Teléfono viejo / offline | Teléfono nuevo |
|-------|----------|-------------|--------------------------|----------------|
| **1. Motor local** (`utils/forgottenItems.ts`) | **Decide qué prenda está olvidada** con aritmética determinista | En el dispositivo | ✅ Instantáneo, gratis, privado, sin red | ✅ Idéntico |
| **2. IA (Gemini)** | Solo **enriquece** con ideas de cómo reusar la prenda | Servidor (Edge Function / Gemini) | Degrada con elegancia (heurística sola) | ✅ Sugerencias de estilo |

Conclusión: como la detección corre localmente, funciona igual en un teléfono viejo
que en uno nuevo. La IA es server-side (Gemini `gemini-2.5-flash`), así que la calidad
de las sugerencias no depende del hardware del teléfono — un equipo viejo y uno nuevo
reciben el mismo resultado. La IA es **opcional**: en `V1_SAFE_MODE` o sin API key,
el feature sigue siendo 100% funcional con el motor local.

## El motor heurístico

Score de 0-100 (mayor = más olvidada) combinando:

- **Tiempo**: días desde el último uso (o desde que se agregó, si nunca se usó).
- **Uso**: nunca usada > usada 1-2 veces > usada pero hace mucho.
- **Temporada**: las prendas fuera de temporada se bajan de prioridad (no usar una
  campera en verano es esperable, no "olvido").

Reglas de seguridad: período de gracia de 14 días para prendas nuevas, umbral de
~45 días sin usar antes de contar, y se ignoran prendas `wishlist`/`virtual`.

## Tracking de uso (la pieza que faltaba)

Ahora el uso se registra de verdad y alimenta todo el sistema:

- `markItemsAsWorn()` en `App.tsx` actualiza `times_worn` / `last_worn_at` localmente
  (offline-first) y sincroniza con Supabase best-effort.
- Se dispara al **guardar un outfit** (señal de que las prendas están en rotación) y
  con el botón **"Lo usé hoy"** en cada prenda olvidada.
- Backend: nueva migración con el RPC atómico `increment_times_worn` (con control de
  propiedad por `auth.uid()`) + índice de uso. El mapper de `closetService` ahora
  expone `times_worn` / `last_worn_at` / `added_at` al frontend.

## UX de la vista (`components/ForgottenClothingView.tsx`)

- Header con stats: olvidadas, % del armario, nunca usadas.
- Grid visual con foto, badge de motivo ("Nunca usada", "Sin usar hace 3 meses",
  "fuera de temporada") y semáforo de prioridad.
- Acciones por prenda: **"Lo usé hoy"** (revive el item) y **"Ver"** (abre el detalle).
- Filtros: Todas / Nunca usadas / De esta temporada.
- Botón opcional **"Ideas para reusarlas (IA)"** que muestra tips de cómo combinarlas.
- Empty state celebratorio cuando no hay prendas olvidadas.
- Acceso desde Home (tarjeta "Ropa Olvidada", categoría IA).

## Archivos

**Nuevos**
- `utils/forgottenItems.ts` — motor heurístico local.
- `components/ForgottenClothingView.tsx` — vista dedicada.
- `tests/forgottenItems.test.ts` — 9 tests del motor.
- `supabase/migrations/20260618000000_increment_times_worn_rpc.sql` — RPC + índice.

**Modificados**
- `types.ts` — campos de uso en `ClothingItem` + tipos `ForgottenItem*` / `RevivalSuggestion`.
- `src/services/geminiService.ts` + `src/services/aiService.ts` — `generateRevivalSuggestions`.
- `src/services/closetService.ts` — mapea campos de uso desde Supabase.
- `App.tsx` — `markItemsAsWorn`, wiring del modal y de guardado de outfit.
- `hooks/useAppModals.ts`, `components/HomeViewImproved.tsx`, `components/home/featuresConfig.ts` — integración.
- `hooks/useClosetStats.ts` — `UsageStats` reales (antes placeholder a 0).
- `utils/closetUtils.ts` — filtro `usage` real (preset "unused" ahora funciona) + orden por `timesWorn`/`lastWorn`.

## Testing

- [x] `npx vitest run tests/forgottenItems.test.ts` → 9/9 ✅
- [x] `npx tsc --noEmit` → sin errores nuevos (4 preexistentes ajenos al feature)
- [x] `npm run build` → ✅
