#!/bin/bash

# Fix Backend Secrets Script
# This script reads your local API key and configures it on the Supabase backend.
# This fixes the "500 Internal Server Error" caused by missing server-side keys.

echo "🔧 Configurando secretos del backend (Supabase)..."

# 1. Read API Key from .env.local
if [ -f .env.local ]; then
  # Extract the key using grep and cut
  API_KEY=$(grep VITE_GEMINI_API_KEY .env.local | cut -d '=' -f2)
  
  if [ -z "$API_KEY" ]; then
    echo "❌ Error: No se encontró VITE_GEMINI_API_KEY en .env.local"
    exit 1
  fi
  
  echo "✅ Clave Gemini encontrada en local: ${API_KEY:0:5}..."
else
  echo "❌ Error: No se encontró el archivo .env.local"
  exit 1
fi

# 2. Set the secret on Supabase
echo "🚀 Enviando clave a Supabase..."
npx supabase secrets set GEMINI_API_KEY="$API_KEY"

# 3. Set Service Role Key (needed for database access from Edge Functions)
# Extract SUPABASE_SERVICE_ROLE_KEY
SERVICE_KEY=$(grep SUPABASE_SERVICE_ROLE_KEY .env.local | cut -d '=' -f2)

if [ -n "$SERVICE_KEY" ]; then
  echo "✅ Service Role Key encontrada."
  echo "🚀 Enviando Service Role Key a Supabase..."
  npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY="$SERVICE_KEY"
else
  echo "⚠️ Advertencia: No se encontró SUPABASE_SERVICE_ROLE_KEY en .env.local"
fi

# 4. Optional: Allowlist setup
# Uncomment to enable strict user checking
# echo "🔒 Configurando lista de usuarios permitidos..."
# npx supabase secrets set BETA_ALLOWLIST_EMAILS="usuario1@gmail.com,usuario2@gmail.com"

echo ""
echo "🎉 ¡Configuración completada!"
echo "Ahora tus Edge Functions tienen acceso a tu API Key de Google Cloud."
echo "Prueba subir una prenda nuevamente."
