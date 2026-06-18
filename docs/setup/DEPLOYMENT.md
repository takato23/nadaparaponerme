# Deployment Guide - No Tengo Nada Para Ponerme

Guía completa para desplegar tu aplicación en producción.

## 🌐 Arquitectura de Deployment

```
Frontend (Vercel/Netlify)
    ↓
Supabase Backend
    ├── PostgreSQL Database
    ├── Storage Buckets
    ├── Authentication
    └── Edge Functions
        └→ Gemini AI API
```

## 📦 Deployment del Frontend

### Opción 1: Vercel (Recomendado)

1. **Conecta tu repositorio de GitHub**
   ```bash
   # Sube tu código a GitHub
   git init
   git add .
   git commit -m "Initial commit with Supabase backend"
   git remote add origin https://github.com/tu-usuario/no-tengo-nada-para-ponerme.git
   git push -u origin main
   ```

2. **Importa en Vercel**
   - Ve a [vercel.com](https://vercel.com)
   - Click "New Project"
   - Importa tu repositorio
   - Framework Preset: Vite
   - Root Directory: `.`

3. **Configura Variables de Entorno**
   En Vercel Project Settings → Environment Variables:
   ```
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu_anon_key
   ```

4. **Deploy**
   - Click "Deploy"
   - Tu app estará en `https://tu-app.vercel.app`

### Opción 2: Netlify

1. **Conecta tu repositorio**
   - Ve a [netlify.com](https://netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Conecta GitHub y selecciona tu repo

2. **Configuración de Build**
   ```
   Build command: npm run build
   Publish directory: dist
   ```

3. **Variables de Entorno**
   En Site Settings → Build & deploy → Environment:
   ```
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu_anon_key
   ```

4. **Deploy**
   - Click "Deploy site"
   - Tu app estará en `https://tu-app.netlify.app`

## 🗄️ Backend (Supabase) - Ya está en producción!

Tu backend de Supabase ya está en producción desde que lo configuraste. Solo necesitas:

### 1. Verificar Configuración de Producción

**Database**:
- ✅ Migrations aplicadas
- ✅ RLS policies activas
- ✅ Indexes creados

**Storage**:
- ✅ Buckets configurados
- ✅ Policies de acceso activas

**Edge Functions**:
- ✅ Funciones deployadas
- ✅ Secretos configurados

### 2. Configurar Rate Limiting (Opcional)

Para proteger contra abuso en Edge Functions:

```sql
-- Crear tabla para tracking de rate limits
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  operation TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index para queries rápidas
CREATE INDEX idx_rate_limits_user_operation
ON rate_limits(user_id, operation, window_start DESC);
```

### 3. Configurar CORS para tu dominio

En Supabase Dashboard → Settings → API:
- Agrega tu dominio de producción a "Allowed Origins"
  - Ejemplo: `https://tu-app.vercel.app`

### 4. Monitoreo y Alertas

**Configurar alertas de uso**:
1. Ve a Settings → Usage
2. Configura alertas cuando alcances:
   - 80% de Database size
   - 80% de Storage
   - 80% de Bandwidth

## 🔒 Seguridad en Producción

### Checklist de Seguridad

- [ ] **Nunca** expongas `SUPABASE_SERVICE_ROLE_KEY` en el frontend
- [ ] Solo usa `VITE_SUPABASE_ANON_KEY` en el cliente
- [ ] Verifica que RLS policies estén activas en TODAS las tablas
- [ ] Configura CORS solo para tus dominios
- [ ] Usa HTTPS (Vercel/Netlify lo hacen automático)
- [ ] Rotar `GEMINI_API_KEY` cada 3-6 meses
- [ ] Monitorea logs de Edge Functions para actividad sospechosa
- [ ] Configura email verification en Supabase Auth (Settings → Auth)

### Ejemplo de Verificación de RLS

```sql
-- Verificar que RLS está activo
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Debería mostrar rowsecurity = true para todas las tablas
```

## 📊 Monitoreo Post-Deployment

### Metrics Importantes

**Supabase Dashboard**:
- Database size < 500MB (free tier)
- Storage < 1GB
- Bandwidth < 2GB/month
- Edge Functions invocations < 500K/month
- Response times de Edge Functions < 2s

**Frontend (Vercel/Netlify)**:
- Core Web Vitals
- Build times
- Deployment frequency

### Logs a Monitorear

**Edge Functions Logs**:
```bash
# Ver logs en tiempo real
supabase functions logs analyze-clothing --follow
```

**Database Logs**:
- Queries lentas (>1s)
- Errores de conexión
- Violaciones de RLS

## 🚨 Troubleshooting en Producción

### Frontend no se conecta al backend

**Síntomas**: Errores de CORS o "Unauthorized"

**Solución**:
1. Verifica variables de entorno en Vercel/Netlify
2. Confirma que CORS está configurado en Supabase
3. Revisa que `VITE_SUPABASE_URL` tenga https://

### Edge Functions timeout

**Síntomas**: Requests a Gemini AI fallan con timeout

**Solución**:
1. Aumenta timeout en Edge Function (max 150s)
2. Optimiza payload enviado a Gemini
3. Implementa retry logic con exponential backoff

### Imágenes no se cargan

**Síntomas**: URLs de Storage retornan 403

**Solución**:
1. Verifica Storage Policies en Supabase
2. Confirma que bucket es público o usuario tiene acceso
3. Revisa que path incluya user_id correcto

### Rate limits de Gemini AI

**Síntomas**: "Quota exceeded" en Edge Functions

**Solución**:
1. Implementa caché de resultados AI
2. Reduce requests duplicadas
3. Considera upgrade a plan pago de Gemini

## 📈 Scaling y Optimización

### Cuando crezcas más allá del Free Tier

**Database > 500MB**:
- Archiva outfits antiguos (soft delete → hard delete)
- Comprime ai_metadata JSONB
- Upgrade a Supabase Pro ($25/mes)

**Storage > 1GB**:
- Implementa WebP conversion
- Borra imágenes de outfit-shares antiguas (>30 días)
- Upgrade a Supabase Pro

**Bandwidth > 2GB/mes**:
- Implementa CDN (Cloudflare)
- Optimiza compresión de imágenes
- Caché agresivo en frontend

### Optimizaciones de Performance

**Database**:
```sql
-- Analizar queries lentas
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**Frontend**:
- Lazy loading de imágenes
- Code splitting por ruta
- Service Worker para offline

## 🔄 CI/CD Automation

### GitHub Actions Example

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-functions:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: supabase/setup-cli@v1
      - run: supabase functions deploy
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

## 🎉 Post-Deployment Checklist

Después de tu primer deployment:

- [ ] Probar signup/login en producción
- [ ] Subir una prenda y verificar Storage
- [ ] Generar un outfit con AI
- [ ] Verificar que Email confirmation funciona (si está activo)
- [ ] Revisar logs de Edge Functions
- [ ] Configurar alertas de uso
- [ ] Documentar URL de producción
- [ ] Compartir con amigos para beta testing

## 🆘 Soporte

- [Supabase Community Discord](https://discord.supabase.com)
- [Vercel Support](https://vercel.com/support)
- [Gemini AI Forum](https://discuss.ai.google.dev)

## 📝 Notas Finales

- Tu app está optimizada para Supabase Free Tier
- Monitorea uso regularmente para evitar sorpresas
- Considera upgrade cuando tengas usuarios activos
- Backup de database semanal (Settings → Database → Backups)

¡Felicidades! Tu app está en producción 🚀

---

## ✅ Checklist de Deployment

> Consolidado desde el antiguo `DEPLOYMENT_CHECKLIST.md`.

**Pre-Deployment**
- [ ] Build local exitoso (`npm run build`)
- [ ] `vercel.json` presente y errores de importación corregidos
- [ ] Código subido a GitHub y variables de entorno preparadas

**Credenciales necesarias**
- [ ] `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (Supabase Dashboard)
- [ ] `GEMINI_API_KEY` (Supabase Secrets — **NO** usar `VITE_GEMINI_API_KEY` en Vercel)
- [ ] `VITE_OPENWEATHER_API_KEY`, `VITE_MERCADOPAGO_PUBLIC_KEY` (opcional)
- [ ] `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET` (Supabase Secrets)
- [ ] `APP_URL` / `APP_URL_ALLOWLIST` (Supabase Secrets, para callbacks de pago)

**Vercel + Supabase**
- [ ] Proyecto importado desde GitHub y variables configuradas en Vercel
- [ ] Deployment exitoso y URL de producción obtenida
- [ ] CORS con dominio de Vercel, Auth Redirect URLs actualizadas, Storage policies verificadas
- [ ] Edge Functions (IA + pagos) funcionando y webhooks apuntando a Supabase Functions

**Verificación post-deploy**
- [ ] Página carga sin errores de consola
- [ ] Login/Signup, subir prenda e imágenes funcionan
- [ ] IA genera outfits, chat IA responde, clima se muestra (si aplica)

**Performance y seguridad**
- [ ] Lighthouse > 80, Vercel Analytics + Supabase Usage monitoreados con alertas
- [ ] `.env.local` en `.gitignore`, sin API keys hardcodeadas, RLS activo, HTTPS, CORS por dominio
