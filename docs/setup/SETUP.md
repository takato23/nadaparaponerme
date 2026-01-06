# Setup Guide - No Tengo Nada Para Ponerme Backend

Esta guía te llevará paso a paso para configurar el backend de Supabase para tu aplicación de armario de moda.

## 📋 Prerrequisitos

- Node.js 18+ instalado
- Una cuenta de [Supabase](https://supabase.com) (gratis)
- Una API key de [Google AI Studio](https://makersuite.google.com) (gratis)
- [Supabase CLI](https://supabase.com/docs/guides/cli) instalado (opcional pero recomendado)

## 🚀 Paso 1: Crear Proyecto en Supabase

1. Ve a [https://app.supabase.com](https://app.supabase.com)
2. Crea un nuevo proyecto:
   - Nombre: `no-tengo-nada-para-ponerme`
   - Base de datos password: (guárdala en lugar seguro)
   - Región: Elige la más cercana a tus usuarios

3. Espera unos minutos mientras Supabase crea tu proyecto

## 🔑 Paso 2: Obtener Credenciales

### Supabase Credentials

1. En tu proyecto de Supabase, ve a **Settings** → **API**
2. Copia estas credenciales:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: Empieza con `eyJhbG...`
   - **service_role key**: Empieza con `eyJhbG...` (¡NUNCA expongas esta!)

### Gemini API Key

1. Ve a [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Crea una nueva API key
3. Cópiala (empieza con `AIza...`)

## ⚙️ Paso 3: Configurar Variables de Entorno

1. Copia el archivo de ejemplo:
```bash
cp .env.local.example .env.local
```

2. Edita `.env.local` y reemplaza los valores:
```env
GEMINI_API_KEY=tu_gemini_api_key
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key
```

Agrega (también en `.env.local.example`) las claves secretas que las Edge Functions consultan:
```env
# SUPABASE_SERVICE_ROLE_KEY=service_role_key
# SERVICE_ROLE_KEY=alias que algunas utilidades (como supabase functions) detectan automáticamente
# GEMINI_API_KEY=tu_gemini_api_key
# BETA_ALLOWLIST_EMAILS=tu@email.com,otro@email.com (opcional)
```
- Usa `./scripts/fix-backend-secrets.sh` o `supabase secrets set ...` para sincronizar estas variables en Supabase.
- Nunca subas estos secretos a Git; `.env.local` debe quedarse fuera del control de versiones.

## 🗄️ Paso 4: Ejecutar Migrations de Base de Datos

### Opción A: Usando Supabase Dashboard (Más fácil)

1. Ve a **SQL Editor** en tu proyecto de Supabase
2. Abre y ejecuta cada archivo de migración en orden:
   - `supabase/migrations/20250101000001_initial_schema.sql`
   - `supabase/migrations/20250101000002_triggers_and_rls.sql`
   - `supabase/migrations/20250101000003_storage_setup.sql`

3. Haz clic en "Run" para cada uno

### Opción B: Usando Supabase CLI (Recomendado)

```bash
# Inicializar Supabase localmente
supabase init

# Linkear con tu proyecto remoto
supabase link --project-ref tu-project-ref

# Aplicar migraciones
supabase db push
```

## 📦 Paso 5: Configurar Storage Buckets

Los buckets ya están configurados en la migración 003. Verifica en **Storage** en tu dashboard:

- ✅ `clothing-images` (privado)
- ✅ `avatars` (público)
- ✅ `outfit-shares` (público)

## ⚡ Paso 6: Deployar Edge Functions

Las Edge Functions manejan las llamadas a Gemini AI de forma segura.

### Usando Supabase CLI:

```bash
# Deploy todas las Edge Functions
supabase functions deploy analyze-clothing
supabase functions deploy generate-outfit
supabase functions deploy generate-packing-list

# Configurar secretos para las Edge Functions
supabase secrets set GEMINI_API_KEY=tu_gemini_api_key
```

### Usando Supabase Dashboard:

1. Ve a **Edge Functions** en tu proyecto
2. Crea una nueva función para cada una:
   - `analyze-clothing`
   - `generate-outfit`
   - `generate-packing-list`

3. Copia y pega el código de cada archivo `.ts` en `supabase/functions/`

4. Ve a **Settings** → **Edge Functions** → **Secrets**
5. Agrega `GEMINI_API_KEY` con tu API key de Gemini

## 📱 Paso 7: Instalar Dependencias del Frontend

```bash
npm install
```

Esto instalará:
- `@supabase/supabase-js` - Cliente de Supabase
- Otras dependencias existentes

Nota: `npm install` también agregó `vitest` y `jsdom` como dependencias de desarrollo para las pruebas; por eso `package-lock.json` se regeneró. Revisa el diff para ver solo estas incorporaciones y entiende que los tests predeterminados usan Vitest/jdom.

## 🧪 Paso 8: Ejecutar pruebas

Vitest está configurado (ver `vitest.config.ts`) para correr en ambiente `jsdom`. Lanza:

```bash
npm run test
```

La suite cubre el servicio `usageTrackingService` y valida las primeras reglas de crédito. Si aparece un error relacionado con `localStorage`, asegúrate de que el entorno está usando `jsdom` (Vitest lo hace por defecto).

## 🧪 Paso 9: Probar la Configuración

```bash
# Iniciar el servidor de desarrollo
npm run dev
```

Abre http://localhost:3000 y:

1. ✅ Crea una cuenta nueva
2. ✅ Sube una foto de ropa
3. ✅ Verifica que el análisis AI funcione
4. ✅ Genera un outfit

## 🐛 Troubleshooting

### Error: "Missing Supabase environment variables"
- Verifica que `.env.local` existe y tiene las variables correctas
- Reinicia el servidor de desarrollo

### Error: "Failed to analyze clothing item"
- Verifica que `GEMINI_API_KEY` esté configurada en Edge Functions
- Revisa los logs en Supabase Dashboard → Edge Functions → Logs

### Error: "Unauthorized" al subir imágenes
- Verifica que estés autenticado (logged in)
- Revisa las políticas RLS en Database → Policies

### Las migrations fallan
- Ejecuta las migrations en orden
- Verifica que no haya errores de sintaxis en los archivos SQL
- Revisa los logs en SQL Editor

## 🔄 Migrar Datos Existentes de localStorage

Si ya tienes datos en localStorage, puedes migrarlos:

```typescript
// TODO: Crear script de migración
// Por ahora, los datos nuevos se guardarán en Supabase automáticamente
```

## 📊 Monitoreo

### Ver uso de recursos:
1. Ve a **Settings** → **Usage** en Supabase
2. Monitorea:
   - Database size (máx 500MB en free tier)
   - Storage (máx 1GB)
   - Bandwidth (máx 2GB/mes)

### Ver logs de Edge Functions:
1. Ve a **Edge Functions** → Tu función → **Logs**
2. Revisa errores y latencia

## 🎉 ¡Listo!

Tu backend está configurado. Ahora puedes:
- ✅ Registrar usuarios
- ✅ Subir fotos de ropa con análisis AI
- ✅ Generar outfits con AI
- ✅ Crear listas de empaque
- ✅ Compartir outfits (próximamente)
- ✅ Conectar con amigos (próximamente)

## 📚 Próximos Pasos

1. Implementar features sociales (amigos, likes, comentarios)
2. Optimizar performance (caché, compresión de imágenes)
3. Agregar más Edge Functions (virtual try-on, búsqueda visual)
4. Configurar deployment en producción

## 🆘 Ayuda

- [Documentación de Supabase](https://supabase.com/docs)
- [Gemini AI Docs](https://ai.google.dev/docs)
- [Reportar issues](https://github.com/tu-usuario/no-tengo-nada-para-ponerme/issues)
