#!/usr/bin/env bash
set -euo pipefail

if ! command -v supabase >/dev/null 2>&1; then
  echo "ERROR: supabase CLI no está instalado"
  exit 1
fi

echo "[check] Running supabase migration list..."
output="$(supabase migration list 2>&1)"

echo "$output"

if echo "$output" | grep -q "Skipping migration"; then
  echo ""
  echo "ERROR: Hay archivos en supabase/migrations que Supabase está salteando."
  echo "Movelos a supabase/manual o renombrá con formato <timestamp>_name.sql"
  exit 1
fi

# Detect mismatch rows: Local present and Remote missing, or vice versa.
# Table rows look like: "20260404000004 | 20260404000004 | ..."
# We flag any row where one side is blank.
mismatch_lines="$(echo "$output" | awk -F'|' '
  /^[[:space:]]*[0-9]/ {
    local=$1; remote=$2;
    gsub(/^[ \t]+|[ \t]+$/, "", local);
    gsub(/^[ \t]+|[ \t]+$/, "", remote);
    if ((local == "" && remote != "") || (local != "" && remote == "")) {
      print $0;
    }
  }
')"

if [[ -n "$mismatch_lines" ]]; then
  echo ""
  echo "ERROR: Hay migraciones desalineadas entre Local y Remote:"
  echo "$mismatch_lines"
  echo "Ejecutá: supabase db push"
  exit 1
fi

echo ""
echo "OK: migraciones SQL alineadas y sin archivos salteados."
