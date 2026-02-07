# Configuración de seguridad (API keys)

Este proyecto es **Vite**: todo lo que empiece con `VITE_` termina en el bundle del navegador. Por eso, las credenciales sensibles deben ir en **Supabase Secrets** (Edge Functions) y no en Vercel.

## Principios

- Nunca expongas `SUPABASE_SERVICE_ROLE_KEY` ni `MERCADOPAGO_ACCESS_TOKEN` en el frontend.
- En producción, esta app **bloquea** el uso de `VITE_GEMINI_API_KEY` (si está presente, el build arranca y la app falla a propósito).

## Desarrollo local

### Opción A (recomendada): Edge Functions

1. Configurá `.env.local` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
2. Corré `npm run verify-setup`.
3. Asegurate de tener las Edge Functions desplegadas y `GEMINI_API_KEY` cargada como secreto en Supabase.

### Opción B: Gemini directo (solo dev)

Si querés probar sin Edge Functions, podés configurar una key **solo en local**:

```bash
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

Notas:
- Esto es aceptable únicamente en local. No lo uses en Vercel.
- Para forzar el camino “directo”, desactivá `useSupabaseAI` (feature flag) en tu navegador si estás probando sin Supabase.

## Producción (Vercel + Supabase)

### Vercel (frontend)

- `VITE_GEMINI_API_KEY`: **NO** configurar.
- Solo variables públicas necesarias para la app (p.ej. `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).

### Supabase (backend)

Configurar en **Supabase Secrets** (Vault):
- `GEMINI_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (o `SERVICE_ROLE_KEY`)
- `MERCADOPAGO_ACCESS_TOKEN` (si usás pagos)
- `MERCADOPAGO_WEBHOOK_SECRET` (firma HMAC de MercadoPago, opcional pero recomendado)
- `MERCADOPAGO_WEBHOOK_TOKEN` (token en URL para webhook, recomendado)
- `APP_URL` / `APP_URL_ALLOWLIST` (para callbacks de pagos)
- Paddle secrets si aplica (`PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET_KEY`, etc.)

Luego desplegar Edge Functions (ejemplo):

```bash
supabase functions deploy mercadopago-webhook --no-verify-jwt
supabase functions deploy create-payment-preference
supabase functions deploy create-mp-preapproval
supabase functions deploy process-mp-preapproval
supabase functions deploy process-payment
```

## Rotación de credenciales

Si una key se compartió por chat, quedó en docs o sospechás que pudo filtrarse, **rotala** en el proveedor (Gemini, Supabase, MercadoPago) y actualizá Secrets.
