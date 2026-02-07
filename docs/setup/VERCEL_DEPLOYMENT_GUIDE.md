# 🚀 Guía de Deployment a Vercel - Paso a Paso

Esta guía te llevará paso a paso para deployar tu aplicación a Vercel.

## ✅ Pre-requisitos Completados

- ✅ Build local verificado y exitoso
- ✅ Configuración de Vercel (`vercel.json`) creada
- ✅ Errores de importación corregidos
- ✅ Optimizaciones de build configuradas

## 📋 Variables de Entorno Necesarias

Antes de deployar, asegúrate de tener estas credenciales a mano:

### 🔑 Supabase
```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key
```
📍 **Dónde encontrarlas**: [Supabase Dashboard](https://app.supabase.com) → Tu Proyecto → Settings → API

### 🤖 Google Gemini AI (seguro)
**Producción (Vercel): NO configures `VITE_GEMINI_API_KEY`.**

Esta app bloquea explícitamente el uso de `VITE_GEMINI_API_KEY` en builds de producción para evitar exponer la key en el bundle del navegador.

**Backend (Supabase secrets):**
```
GEMINI_API_KEY=tu_gemini_api_key
```
📍 **Dónde obtenerla**: [Google AI Studio](https://makersuite.google.com/app/apikey)

### 🌤️ OpenWeatherMap
```
VITE_OPENWEATHER_API_KEY=tu_openweather_api_key
```
📍 **Dónde obtenerla**: [OpenWeatherMap API Keys](https://home.openweathermap.org/api_keys)

### 💳 MercadoPago (Opcional - solo si usas pagos)
**Frontend (Vercel env):**
```bash
VITE_MERCADOPAGO_PUBLIC_KEY=tu_mercadopago_public_key
# Habilitar SOLO cuando tengas los webhooks desplegados y probados end-to-end:
VITE_PAYMENTS_ENABLED=true
```

**Backend (Supabase secrets, NO en Vercel):**
```bash
MERCADOPAGO_ACCESS_TOKEN=APP_USR-...
# Recomendado: token en URL para proteger el endpoint público (webhooks requieren verify_jwt=false).
MERCADOPAGO_WEBHOOK_TOKEN=tu_webhook_token_random
# Recomendado: activar firma de webhook (si lo configurás en MercadoPago Developers)
MERCADOPAGO_WEBHOOK_SECRET=tu_webhook_signing_secret
# Base URL para callbacks (si usás dominio propio) o allowlist de orígenes permitidos.
APP_URL=https://tu-dominio.com
# APP_URL_ALLOWLIST=https://tu-dominio.com,https://tu-proyecto.vercel.app
```

**Webhook endpoint (configurar en MercadoPago Developers):**
`https://<SUPABASE_PROJECT>.supabase.co/functions/v1/mercadopago-webhook?token=<MERCADOPAGO_WEBHOOK_TOKEN>`

⚠️ **Importante**:
- No pongas `MERCADOPAGO_ACCESS_TOKEN` en Vercel (no lo usa el frontend y es un secreto).
- Si ya lo agregaste en Vercel o lo compartiste por error, rotalo en MercadoPago y en Supabase Secrets.

**Deploy de Edge Functions (pagos):**
```bash
export SUPABASE_ACCESS_TOKEN=...
SUPABASE_PROJECT_REF=<SUPABASE_PROJECT> ./scripts/deploy-supabase-functions.sh payments
```
Esto despliega `create-payment-preference`, `create-mp-preapproval`, `process-payment` y deja los webhooks públicos (`verify_jwt=false`).

### 🌍 Paddle (Opcional - pagos internacionales)
Paddle funciona como Merchant of Record (útil si cobrás internacionalmente desde Argentina).

**Frontend (Vercel env):**
```
VITE_USD_ENABLED=true
VITE_PADDLE_CLIENT_TOKEN=tu_paddle_client_token
```

**Backend (Supabase secrets, NO en Vercel):**
```
PADDLE_API_KEY=tu_paddle_api_key
PADDLE_WEBHOOK_SECRET_KEY=tu_webhook_secret
PADDLE_PRICE_ID_PRO=pri_...
PADDLE_PRICE_ID_PREMIUM=pri_...
APP_URL=https://tu-dominio.com
```
Webhook endpoint (en Paddle): `https://<SUPABASE_PROJECT>.supabase.co/functions/v1/paddle-webhook`

---

## 🎯 Opción 1: Deploy desde GitHub (Recomendado)

### Paso 1: Subir código a GitHub

Si aún no lo has hecho:

```bash
cd /Users/santiagobalosky/no-tengo-nada-para-ponerme

# Inicializar git (si no está inicializado)
git init

# Agregar todos los archivos
git add .

# Hacer commit
git commit -m "Preparar para deployment en Vercel"

# Crear rama main
git branch -M main

# Agregar remote (reemplaza con tu URL)
git remote add origin https://github.com/TU-USUARIO/no-tengo-nada-para-ponerme.git

# Push
git push -u origin main
```

### Paso 2: Conectar con Vercel

1. Ve a [vercel.com](https://vercel.com) y haz login
2. Click en **"Add New Project"**
3. Click en **"Import Git Repository"**
4. Selecciona tu repositorio de GitHub
5. Vercel detectará automáticamente que es un proyecto Vite

### Paso 3: Configurar el Proyecto

En la pantalla de configuración:

- **Framework Preset**: Vite (detectado automáticamente)
- **Root Directory**: `.` (dejar por defecto)
- **Build Command**: `npm run build` (detectado automáticamente)
- **Output Directory**: `dist` (detectado automáticamente)

### Paso 4: Agregar Variables de Entorno

En la sección **"Environment Variables"**:

1. Click en **"Add"** para cada variable
2. Copia y pega las variables de arriba
3. **IMPORTANTE**: Marca las tres opciones para cada variable:
   - ✅ Production
   - ✅ Preview
   - ✅ Development

**Variables a agregar**:
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_OPENWEATHER_API_KEY
VITE_MERCADOPAGO_PUBLIC_KEY (opcional)
```

### Paso 5: Deploy

1. Click en **"Deploy"**
2. Espera 2-3 minutos mientras Vercel:
   - Clona tu repositorio
   - Instala dependencias
   - Ejecuta el build
   - Despliega a producción

3. ✅ Cuando veas **"Congratulations!"**, tu app está en vivo

### Paso 6: Obtener tu URL

Tu aplicación estará disponible en:
```
https://tu-proyecto.vercel.app
```

---

## 🎯 Opción 2: Deploy desde CLI

### Paso 1: Instalar Vercel CLI

```bash
npm i -g vercel
```

### Paso 2: Login

```bash
vercel login
```

Sigue las instrucciones en el navegador para autenticarte.

### Paso 3: Deploy Inicial

```bash
cd /Users/santiagobalosky/no-tengo-nada-para-ponerme
vercel
```

Responde las preguntas:
- **Set up and deploy?** → Yes
- **Which scope?** → Tu cuenta personal
- **Link to existing project?** → No
- **Project name?** → no-tengo-nada-para-ponerme (o el que prefieras)
- **Directory?** → ./ (presiona Enter)
- **Override settings?** → No

### Paso 4: Agregar Variables de Entorno

```bash
# Supabase
vercel env add VITE_SUPABASE_URL
# Pega el valor cuando te lo pida

vercel env add VITE_SUPABASE_ANON_KEY
# Pega el valor cuando te lo pida

#
# Gemini AI (producción): se configura en Supabase Secrets (NO en Vercel)
# supabase secrets set GEMINI_API_KEY=<tu_key>

# OpenWeather
vercel env add VITE_OPENWEATHER_API_KEY
# Pega el valor cuando te lo pida

# MercadoPago (opcional)
vercel env add VITE_MERCADOPAGO_PUBLIC_KEY
# Pega el valor cuando te lo pida
```

Para cada variable, selecciona:
- **Environment**: Production, Preview, Development (usa flechas y espacio)

### Paso 5: Deploy a Producción

```bash
vercel --prod
```

---

## 🔧 Configuración Post-Deployment

### 1. Configurar CORS en Supabase

1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto
3. Ve a **Settings → API**
4. En **"CORS Configuration"**, agrega:
   ```
   https://tu-proyecto.vercel.app
   ```

### 2. Configurar Auth URLs en Supabase

1. En Supabase Dashboard → **Authentication → URL Configuration**
2. **Site URL**: `https://tu-proyecto.vercel.app`
3. **Redirect URLs**: Agrega:
   ```
   https://tu-proyecto.vercel.app/**
   ```

### 3. Verificar Deployment

Abre tu URL de Vercel y verifica:
- [ ] La página carga correctamente
- [ ] No hay errores en la consola del navegador
- [ ] Puedes hacer login/signup
- [ ] Puedes subir una prenda
- [ ] La IA funciona correctamente

---

## 🎨 Dominio Personalizado (Opcional)

### Agregar tu propio dominio

1. En Vercel Dashboard → Tu Proyecto → **Settings → Domains**
2. Click **"Add"**
3. Ingresa tu dominio (ej: `miapp.com`)
4. Sigue las instrucciones para configurar DNS

### Actualizar Supabase

Después de agregar dominio personalizado:
1. Actualiza CORS en Supabase con tu nuevo dominio
2. Actualiza Redirect URLs en Supabase Auth

---

## 🔍 Troubleshooting

### ❌ Error: "Failed to fetch"

**Causa**: Problema de CORS o variables de entorno

**Solución**:
1. Verifica que agregaste el dominio de Vercel en CORS de Supabase
2. Verifica que `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` estén correctas
3. En Vercel Dashboard → Settings → Environment Variables, verifica que las variables existan

### ❌ Error: "Unauthorized"

**Causa**: API key incorrecta o RLS policies

**Solución**:
1. Verifica `VITE_SUPABASE_ANON_KEY` en Vercel
2. En Supabase, verifica que RLS policies estén configuradas correctamente

### ❌ Imágenes no cargan

**Causa**: Storage policies o CORS

**Solución**:
1. En Supabase → Storage → Policies
2. Verifica que el bucket tenga policies de lectura públicas o autenticadas
3. Verifica CORS en Storage

### ❌ IA no responde

**Causa**: API key incorrecta o cuota excedida

**Solución**:
1. Verifica `GEMINI_API_KEY` en Supabase Secrets (NO en Vercel)
2. Revisa logs de Edge Functions en Supabase
3. Verifica cuota en [Google AI Studio](https://makersuite.google.com)

---

## 📊 Monitoreo

### Vercel Analytics

1. Ve a Vercel Dashboard → Tu Proyecto → **Analytics**
2. Monitorea:
   - Visitas
   - Response times
   - Errores

### Supabase Usage

1. Ve a Supabase Dashboard → **Usage**
2. Monitorea:
   - Database size
   - Storage usage
   - Bandwidth
   - Edge Functions invocations

---

## 🎉 ¡Listo!

Tu aplicación está ahora en producción. Comparte tu URL con amigos y empieza a recibir feedback.

**Próximos pasos sugeridos**:
- Configurar dominio personalizado
- Configurar alertas de uso en Supabase
- Implementar analytics (Google Analytics, Mixpanel, etc.)
- Configurar backups automáticos en Supabase

---

## 📞 Soporte

- [Documentación de Vercel](https://vercel.com/docs)
- [Supabase Community](https://discord.supabase.com)
- [Gemini AI Forum](https://discuss.ai.google.dev)
