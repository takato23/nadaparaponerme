#!/bin/bash
# Launch script para deployar Supabase + MercadoPago
# Ejecutar: ./scripts/launch-deploy.sh

set -e

PROJECT_REF="qpoojigxxswkpkfbrfiy"
echo "🚀 Deploy para proyecto: $PROJECT_REF"

# 1. Login a Supabase (si no estás logueado)
echo "▶️  Paso 1: Verificando login de Supabase..."
supabase projects list >/dev/null 2>&1 || {
  echo "⚠️  Necesitás loguearte. Ejecutando: supabase login"
  supabase login
}

# 2. Linkear proyecto
echo "▶️  Paso 2: Linkeando proyecto..."
supabase link --project-ref $PROJECT_REF

# 3. Setear SECRETS críticos
echo "▶️  Paso 3: Configurando secrets..."
# Leer del .env.local
MP_TOKEN=$(grep "VITE_MERCADOPAGO_PUBLIC_KEY" .env.local | cut -d= -f2)
SUPABASE_URL=$(grep "VITE_SUPABASE_URL" .env.local | cut -d= -f2)
SERVICE_KEY=$(grep "SUPABASE_SERVICE_ROLE_KEY" .env.local | cut -d= -f2-)

echo "Configurando MERCADOPAGO_ACCESS_TOKEN..."
supabase secrets set MERCADOPAGO_ACCESS_TOKEN="$MP_TOKEN"

echo "Configurando SUPABASE_URL..."
supabase secrets set SUPABASE_URL="$SUPABASE_URL"

echo "Configurando SUPABASE_SERVICE_ROLE_KEY..."
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="$SERVICE_KEY"

echo "Configurando SITE_URL..."
supabase secrets set SITE_URL="https://no-tengo-nada-para-ponerme.vercel.app"

echo "Configurando MERCADOPAGO_WEBHOOK_TOKEN..."
WEBHOOK_TOKEN=$(openssl rand -hex 16)
supabase secrets set MERCADOPAGO_WEBHOOK_TOKEN="$WEBHOOK_TOKEN"
echo "🔐 Webhook token generado: $WEBHOOK_TOKEN"

# 4. Deploy functions de payments
echo "▶️  Paso 4: Deployando functions de pagos..."
./scripts/deploy-supabase-functions.sh $PROJECT_REF payments

# 5. Aplicar migración nueva
echo "▶️  Paso 5: Aplicando migración de Paddle + MP..."
supabase db push

echo "✅ DEPLOY COMPLETADO!"
echo ""
echo "📋 Resumen:"
echo "   - Functions deployadas: create-mp-preapproval, mercadopago-webhook, etc."
echo "   - Webhook URL: https://$PROJECT_REF.supabase.co/functions/v1/mercadopago-webhook?token=$WEBHOOK_TOKEN"
echo "   - Configurá esta URL en el dashboard de MercadoPago"
