#!/bin/bash
# Test script for Gemini Edge Functions
# Usage: ./test-edge-function.sh

set -e

PROJECT_REF="qpoojigxxswkpkfbrfiy"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwb29qaWd4eHN3a3BrZmJyZml5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3ODg0NjgsImV4cCI6MjA3ODM2NDQ2OH0.0WnnAd87WGALK5Vq72EqphYsiLhJPisnF33cxpwjC7Q"
SUPABASE_URL="https://qpoojigxxswkpkfbrfiy.supabase.co"

echo "🧪 Testing Gemini Edge Functions"
echo "=================================="
echo ""

# Test 1: analyze-clothing
echo "📸 Test 1: analyze-clothing"
echo "----------------------------"

# Create a simple 1x1 red pixel PNG (base64)
# This is just for testing the function, not for real analysis
IMAGE_DATA="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="

curl -s -X POST \
  "${SUPABASE_URL}/functions/v1/analyze-clothing" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -H "x-application-name: test-script" \
  -d "{\"imageDataUrl\": \"${IMAGE_DATA}\"}" \
  | jq '.' || echo "❌ Failed to call analyze-clothing"

echo ""
echo ""

# Test 2: Check secrets are configured
echo "🔑 Test 2: Verify Secrets Configuration"
echo "----------------------------------------"
supabase secrets list --project-ref "${PROJECT_REF}" | grep -E "GEMINI_API_KEY|SUPABASE" || echo "❌ Secrets not found"

echo ""
echo ""

# Test 3: Check function status
echo "📊 Test 3: Verify Edge Functions Status"
echo "----------------------------------------"
supabase functions list --project-ref "${PROJECT_REF}" || echo "❌ Failed to list functions"

echo ""
echo ""

echo "✅ Testing Complete!"
echo ""
echo "Next steps:"
echo "1. Check that analyze-clothing returned valid JSON with clothing metadata"
echo "2. All secrets should show 'GEMINI_API_KEY' in the list"
echo "3. All functions should show 'ACTIVE' status"
echo ""
