# Launch Checklist (Instagram)

Fecha: 2026-02-06
Proyecto de produccion: `no-tengo-nada-para-ponerme.vercel.app`

## Estado actual

- `OK` Proyecto duplicado eliminado en Vercel (`nadaparaponerme`).
- `OK` Produccion desplegada con ultimo build.
- `OK` Onboarding publico mejorado para conversion (copy + CTA).
- `OK` Fix de crash en "Ver alternativas" aplicado (defensa contra `dupes` undefined).
- `OK` Flujo de "Donde comprar" activo con links de busqueda + sponsors.
- `OK` `VITE_V1_SAFE_MODE=false` en `.env.local` (modo real activado en local).
- `INFO` `VITE_PAYMENTS_ENABLED=false` en `.env.local` (cobro desactivado, acorde al plan inicial).

## Verificaciones tecnicas realizadas hoy

- `npm run build` exitoso (sin errores, solo warnings de chunks grandes).
- Deploy de produccion exitoso via `vercel --prod`.
- Smoke test automatizado preparado en `e2e/launch-smoke-prod.spec.ts`.
- Intento de ejecucion del smoke test bloqueado por incompatibilidad de runtime/browser en el entorno de ejecucion actual (no por fallo funcional de la app).

## Riesgos antes de publicar

- `ALTO` Validacion E2E visual completa en mobile no pudo ejecutarse en este runner por tema de binarios Playwright.
- `MEDIO` "Donde comprar" no es checkout interno: deriva a tiendas externas (esperado), pero hay que revisar calidad de links en vivo.
- `MEDIO` Afiliados estan preparados, pero requieren IDs finales propios para monetizacion real (ej. Amazon tag productivo).
- `MEDIO` Sponsors via Supabase dependen de migracion aplicada en el proyecto correcto (`supabase/migrations/20260302000001_sponsors_system.sql`).

## Checklist de salida (manual rapido, 10 minutos)

- `PENDIENTE` Probar en telefono real: `/stylist-onboarding` (scroll, CTA visible, cambio Antes/Despues).
- `PENDIENTE` Crear cuenta nueva y verificar entrada directa (sin repetir wizard innecesariamente en futuros logins).
- `PENDIENTE` Desde Closet: abrir una prenda y tocar "Donde comprar" + "Alternativas" (sin crash, con resultados).
- `PENDIENTE` Revisar consentimiento de cookies y analytics en primera visita.
- `PENDIENTE` Confirmar variables de produccion:
  - `VITE_GA_MEASUREMENT_ID` si queres GA activo.
  - `VITE_POSTHOG_KEY` si queres PostHog activo.
  - `VITE_V1_SAFE_MODE=false`.
  - `VITE_PAYMENTS_ENABLED=false` (si todavia no cobras).

## Notas de producto para el lanzamiento

- El posicionamiento actual queda orientado a trafico frio de Instagram:
  - "Probar gratis ahora".
  - "No requiere tarjeta de credito".
  - Mensaje directo de antes/despues con foto propia.
- Se mantiene el wizard opcional despues del demo para no bloquear conversion inicial.
