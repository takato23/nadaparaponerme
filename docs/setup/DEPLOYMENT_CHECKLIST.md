# ✅ Checklist de Deployment a Vercel

## Pre-Deployment

- [x] Build local exitoso
- [x] Archivo `vercel.json` creado
- [x] Errores de importación corregidos
- [ ] Código subido a GitHub
- [ ] Variables de entorno preparadas

## Credenciales Necesarias

- [ ] `VITE_SUPABASE_URL` (desde Supabase Dashboard)
- [ ] `VITE_SUPABASE_ANON_KEY` (desde Supabase Dashboard)
- [ ] `GEMINI_API_KEY` (Supabase Secrets, desde Google AI Studio; NO usar `VITE_GEMINI_API_KEY` en Vercel)
- [ ] `VITE_OPENWEATHER_API_KEY` (desde OpenWeatherMap)
- [ ] `VITE_MERCADOPAGO_PUBLIC_KEY` (opcional, desde MercadoPago)
- [ ] `MERCADOPAGO_ACCESS_TOKEN` (Supabase Secrets; NO en Vercel)
- [ ] `MERCADOPAGO_WEBHOOK_TOKEN` (Supabase Secrets; recomendado para proteger el endpoint público de webhook)
- [ ] `MERCADOPAGO_WEBHOOK_SECRET` (Supabase Secrets; recomendado si activás firma HMAC de webhook)
- [ ] `APP_URL` / `APP_URL_ALLOWLIST` (Supabase Secrets; para callbacks correctos en pagos)

## Deployment en Vercel

- [ ] Cuenta de Vercel creada
- [ ] Proyecto importado desde GitHub
- [ ] Variables de entorno configuradas en Vercel
- [ ] Deployment exitoso
- [ ] URL de producción obtenida

## Configuración de Supabase

- [ ] CORS configurado con dominio de Vercel
- [ ] Auth Redirect URLs actualizadas
- [ ] Storage policies verificadas
- [ ] Edge Functions funcionando (IA + pagos)
- [ ] Webhooks de pagos configurados en el proveedor (MercadoPago/Paddle) apuntando a Supabase Functions

## Verificación Post-Deployment

- [ ] Página carga correctamente
- [ ] No hay errores en consola del navegador
- [ ] Login/Signup funciona
- [ ] Subir prenda funciona
- [ ] Imágenes se cargan correctamente
- [ ] IA genera outfits correctamente
- [ ] Chat IA responde
- [ ] Clima se muestra (si aplica)

## Performance y Monitoreo

- [ ] Lighthouse score > 80
- [ ] Vercel Analytics configurado
- [ ] Supabase Usage monitoreado
- [ ] Alertas de uso configuradas en Supabase

## Seguridad

- [ ] `.env.local` en `.gitignore`
- [ ] No hay API keys hardcodeadas
- [ ] RLS policies activas en Supabase
- [ ] CORS configurado solo para dominios específicos
- [ ] HTTPS activo (automático en Vercel)

## Opcional

- [ ] Dominio personalizado configurado
- [ ] DNS configurado
- [ ] CORS actualizado con dominio personalizado
- [ ] Analytics de terceros (Google Analytics, etc.)
- [ ] Backups automáticos configurados

## Notas

**URL de Producción**: ___________________________

**Fecha de Deployment**: ___________________________

**Versión**: ___________________________
