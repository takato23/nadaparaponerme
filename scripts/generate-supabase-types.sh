#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-.env.local}"
OUT_FILE="${2:-src/types/api.generated.ts}"

if ! command -v supabase >/dev/null 2>&1; then
  echo "supabase CLI no está instalado" >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "No encontré $ENV_FILE" >&2
  exit 1
fi

SUPABASE_URL=$(grep '^VITE_SUPABASE_URL=' "$ENV_FILE" | cut -d'=' -f2-)
if [[ -z "$SUPABASE_URL" ]]; then
  echo "VITE_SUPABASE_URL no está seteada en $ENV_FILE" >&2
  exit 1
fi

PROJECT_REF=$(printf '%s' "$SUPABASE_URL" | sed -E 's#https?://([^.]+)\..*#\1#')
mkdir -p "$(dirname "$OUT_FILE")"

supabase gen types typescript --project-id "$PROJECT_REF" --schema public > "$OUT_FILE"

echo "Tipos generados en $OUT_FILE para el proyecto $PROJECT_REF"
echo "Compará api.generated.ts con src/types/api.ts antes de reconciliar los tipos custom del repo."
