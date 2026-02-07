#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Deploy Supabase Edge Functions without interactive prompts.

Requirements:
- supabase CLI installed
- SUPABASE_ACCESS_TOKEN exported in your shell

Usage:
  SUPABASE_PROJECT_REF=<ref> ./scripts/deploy-supabase-functions.sh [all|payments|ai]
  ./scripts/deploy-supabase-functions.sh <ref> [all|payments|ai]

Examples:
  SUPABASE_ACCESS_TOKEN=... SUPABASE_PROJECT_REF=<your-project-ref> ./scripts/deploy-supabase-functions.sh payments
  SUPABASE_ACCESS_TOKEN=... ./scripts/deploy-supabase-functions.sh <your-project-ref> all
EOF
}

PROJECT_REF="${SUPABASE_PROJECT_REF:-${1:-}}"
MODE="${2:-${SUPABASE_DEPLOY_MODE:-payments}}"

if [[ -z "${PROJECT_REF}" ]]; then
  usage
  exit 1
fi

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "Error: SUPABASE_ACCESS_TOKEN is not set." >&2
  echo "Create one in Supabase Dashboard -> Account -> Access Tokens, then:" >&2
  echo "  export SUPABASE_ACCESS_TOKEN=..." >&2
  exit 1
fi

deploy() {
  local fn="$1"
  echo "Deploying ${fn}..."
  supabase functions deploy "${fn}" --project-ref "${PROJECT_REF}" --use-api --yes
}

deploy_nojwt() {
  local fn="$1"
  echo "Deploying ${fn} (verify_jwt=false)..."
  supabase functions deploy "${fn}" --project-ref "${PROJECT_REF}" --use-api --no-verify-jwt --yes
}

deploy_payments() {
  deploy create-payment-preference
  deploy create-mp-preapproval
  deploy process-payment
  deploy process-mp-preapproval
  deploy create-paddle-transaction

  # Webhooks must be public (payment providers don't send Supabase JWTs).
  deploy_nojwt mercadopago-webhook
  deploy_nojwt paddle-webhook
}

deploy_ai() {
  deploy analyze-clothing
  deploy analyze-color-palette
  deploy chat-stylist
  deploy generate-fashion-image
  deploy generate-image
  deploy generate-outfit
  deploy generate-packing-list
  deploy openai-image-generation
  deploy shopping-assistant
  deploy style-dna-analysis
  deploy virtual-try-on
}

case "${MODE}" in
  payments)
    deploy_payments
    ;;
  ai)
    deploy_ai
    ;;
  all)
    deploy_payments
    deploy_ai
    deploy delete-account
    ;;
  *)
    echo "Unknown mode: ${MODE}" >&2
    usage
    exit 1
    ;;
esac

echo "Done."
