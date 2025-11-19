# Sistema de Pagos con MercadoPago - Guía de Deployment

## 📋 Resumen

Sistema completo de suscripciones con 3 tiers (Free, Pro, Premium) integrado con MercadoPago para procesar pagos recurrentes.

## 🏗️ Arquitectura

```
Usuario clickea feature premium
  ↓
checkFeatureAccess() verifica tier actual
  ↓
¿Tiene acceso?
  → SÍ: Abre feature
  → NO: Muestra FeatureLockedView
       ↓
       Click "Ver Planes y Precios"
       ↓
       PaywallView muestra 3 planes
       ↓
       Usuario selecciona plan → upgradeSubscription()
       ↓
       Edge Function crea preference en MercadoPago
       ↓
       Redirección a MercadoPago Checkout
       ↓
       Usuario completa pago
       ↓
       MercadoPago envía webhook notification
       ↓
       Edge Function procesa webhook
       ↓
       Database actualiza subscription y usage_metrics
```

## 🗂️ Archivos Creados/Modificados

### Backend (Supabase)
- ✅ `supabase/migrations/20250101000008_subscriptions_and_payments.sql` - Database schema
- ✅ `supabase/functions/create-payment-preference/index.ts` - Crea checkout link
- ✅ `supabase/functions/mercadopago-webhook/index.ts` - Procesa notificaciones de pago

### Frontend
- ✅ `types-payment.ts` - TypeScript types para pagos
- ✅ `src/services/paymentService.ts` - Servicio de pagos del cliente
- ✅ `components/PaywallView.tsx` - Modal full con 3 planes
- ✅ `components/FeatureLockedView.tsx` - Modal compacto por feature
- ✅ `hooks/useAppModals.ts` - Estados de paywall agregados
- ✅ `App.tsx` - Integración completa con protección de features

## 🔧 Variables de Entorno

### Supabase Edge Functions (Secrets)
```bash
# MercadoPago credentials
MERCADOPAGO_ACCESS_TOKEN=APP_USR-XXXXXXXX  # Production access token
# TEST_-XXXXXXXX para sandbox

# App configuration
APP_URL=https://tu-dominio.com  # URL de tu app para back_urls
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyXXXXXX  # Service role key (admin)
```

### Frontend (.env.local)
```bash
# Ya existentes
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyXXXXXX

# Nuevo (opcional, solo si se usa public key en frontend)
VITE_MERCADOPAGO_PUBLIC_KEY=APP_USR-XXXXXXXX
```

## 📦 Deployment Steps

### 1. Aplicar Migration de Database
```bash
# Conectar con tu proyecto Supabase
supabase link --project-ref tu-project-ref

# Aplicar migration
supabase db push
```

Esto creará:
- ✅ 4 tablas: `subscriptions`, `payment_transactions`, `payment_methods`, `usage_metrics`
- ✅ RLS policies para seguridad
- ✅ Helper functions: `user_has_feature_access()`, `increment_ai_generation_usage()`
- ✅ Triggers para auto-update de timestamps

### 2. Configurar Secrets de Supabase
```bash
# Obtén tu access token de MercadoPago:
# Dashboard → Credenciales → Access Token de producción (o TEST_ para sandbox)

supabase secrets set MERCADOPAGO_ACCESS_TOKEN=APP_USR-XXXXXXXX
supabase secrets set APP_URL=https://tu-dominio.com

# Estos ya deberían existir
supabase secrets set SUPABASE_URL=https://xxx.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyXXXXXX
```

### 3. Deploy Edge Functions
```bash
# Deploy create-payment-preference
supabase functions deploy create-payment-preference

# Deploy mercadopago-webhook
supabase functions deploy mercadopago-webhook

# Verificar deployment
supabase functions list
```

### 4. Configurar Webhook en MercadoPago Dashboard

1. Ir a: https://www.mercadopago.com.ar/developers/panel/app
2. Seleccionar tu aplicación
3. Ir a "Webhooks"
4. Agregar nuevo webhook:
   - **URL**: `https://xxx.supabase.co/functions/v1/mercadopago-webhook`
   - **Eventos**: Seleccionar `payment`
   - **Modo**: Production (o Test para sandbox)

### 5. Build y Deploy Frontend
```bash
# Build local
npm run build

# Deploy a tu hosting (Vercel, Netlify, etc.)
vercel deploy --prod
# o
netlify deploy --prod
```

## 🧪 Testing

### Modo Sandbox (Recomendado para testing)
1. Usar `TEST_-XXXXXXXX` como access token en secrets
2. MercadoPago redirigirá a checkout de prueba
3. Usar tarjetas de prueba: https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/test-cards

### Test Flow Completo
```bash
# 1. Usuario FREE intenta acceder a feature PRO
# 2. Se muestra FeatureLockedView
# 3. Click "Ver Planes y Precios" → PaywallView
# 4. Seleccionar plan Pro → Redirección a MercadoPago
# 5. Completar pago con tarjeta de prueba
# 6. Verificar en Supabase que:
#    - subscriptions.tier = 'pro'
#    - subscriptions.status = 'active'
#    - payment_transactions tiene registro con status = 'approved'
# 7. Intentar acceder a feature nuevamente → Debe abrir normalmente
```

### Queries de Verificación (Supabase SQL Editor)
```sql
-- Ver suscripción de un usuario
SELECT * FROM subscriptions WHERE user_id = 'xxx';

-- Ver transacciones de un usuario
SELECT * FROM payment_transactions WHERE user_id = 'xxx' ORDER BY created_at DESC;

-- Ver métricas de uso
SELECT * FROM usage_metrics WHERE user_id = 'xxx';

-- Verificar acceso a feature
SELECT user_has_feature_access('user-uuid', 'ai_designer');
```

## 📊 Plans & Pricing

### Free Tier
- 50 prendas máximo
- 10 generaciones AI/mes
- Features básicas
- **Precio**: Gratis

### Pro Tier
- Prendas ilimitadas
- 100 generaciones AI/mes
- Virtual Try-On
- AI Fashion Designer
- Lookbook Creator
- **Precio**: $2,999 ARS / $9.99 USD por mes

### Premium Tier
- Todo lo de Pro
- Generaciones AI ilimitadas
- Style DNA Profile completo
- Análisis de evolución
- Soporte prioritario
- **Precio**: $4,999 ARS / $16.99 USD por mes

## 🔐 Security Checklist

- ✅ RLS policies en todas las tablas
- ✅ Service role key solo en Edge Functions (server-side)
- ✅ Anon key en frontend (sin privilegios admin)
- ✅ Webhook signature validation (MercadoPago verifica el origin)
- ✅ User IDs en metadata para validación
- ✅ CORS configurado en Edge Functions
- ✅ Secrets en Supabase (no hardcoded)

## 🐛 Troubleshooting

### Webhook no se ejecuta
1. Verificar URL en MercadoPago dashboard
2. Revisar logs: `supabase functions logs mercadopago-webhook`
3. Verificar secrets: `supabase secrets list`

### Payment no actualiza subscription
1. Revisar logs del webhook
2. Verificar que `metadata.user_id` existe en el payment
3. Verificar RLS policies en subscriptions table
4. Probar query manual:
```sql
UPDATE subscriptions
SET tier = 'pro', status = 'active'
WHERE user_id = 'xxx';
```

### Feature locked a pesar de tener subscription
1. Verificar en Supabase que subscription.status = 'active'
2. Verificar que subscription.current_period_end > NOW()
3. Clear cache del navegador
4. Verificar en console: `await paymentService.getCurrentSubscription()`

## 📝 Next Steps

1. ✅ Aplicar migration
2. ✅ Configurar secrets
3. ✅ Deploy Edge Functions
4. ✅ Configurar webhook en MercadoPago
5. ✅ Testing en modo sandbox
6. ⏳ Switch a production credentials
7. ⏳ Monitoreo de transacciones

## 🔗 Resources

- [MercadoPago Developers](https://www.mercadopago.com.ar/developers)
- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Test Cards](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/test-cards)
