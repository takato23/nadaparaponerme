#!/bin/bash

# Test script for generate-fashion-image edge function
# Usage: ./test.sh [your-project-url] [your-auth-token]

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_URL=${1:-"http://localhost:54321"}
AUTH_TOKEN=${2:-""}

if [ -z "$AUTH_TOKEN" ]; then
    echo -e "${RED}Error: AUTH_TOKEN is required${NC}"
    echo "Usage: $0 [project-url] [auth-token]"
    exit 1
fi

FUNCTION_URL="$PROJECT_URL/functions/v1/generate-fashion-image"

echo -e "${YELLOW}Testing generate-fashion-image Edge Function${NC}"
echo "Project URL: $PROJECT_URL"
echo ""

# Test 1: Generate with flash model
echo -e "${YELLOW}Test 1: Generate image with flash model${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Una chaqueta de cuero negra estilo biker con detalles metálicos",
    "model_type": "flash"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✓ Success (200)${NC}"
    echo "$BODY" | jq .
else
    echo -e "${RED}✗ Failed ($HTTP_CODE)${NC}"
    echo "$BODY" | jq .
fi
echo ""

# Test 2: Check quota status
echo -e "${YELLOW}Test 2: Check remaining quota${NC}"
echo "$BODY" | jq '{remaining_quota, current_tier, model_used}'
echo ""

# Test 3: Missing prompt
echo -e "${YELLOW}Test 3: Missing prompt (should fail)${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model_type": "flash"}')

HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 400 ]; then
    echo -e "${GREEN}✓ Correctly rejected (400)${NC}"
    echo "$BODY" | jq .
else
    echo -e "${RED}✗ Unexpected status ($HTTP_CODE)${NC}"
    echo "$BODY" | jq .
fi
echo ""

# Test 4: Invalid model type
echo -e "${YELLOW}Test 4: Invalid model type (should fail)${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Test image",
    "model_type": "invalid"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 400 ]; then
    echo -e "${GREEN}✓ Correctly rejected (400)${NC}"
    echo "$BODY" | jq .
else
    echo -e "${RED}✗ Unexpected status ($HTTP_CODE)${NC}"
    echo "$BODY" | jq .
fi
echo ""

# Test 5: With style preferences
echo -e "${YELLOW}Test 5: Generate with style preferences${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Zapatos deportivos blancos minimalistas",
    "model_type": "flash",
    "style_preferences": {
      "background": "white studio",
      "lighting": "soft natural",
      "mood": "clean and modern"
    }
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✓ Success (200)${NC}"
    echo "$BODY" | jq .
else
    echo -e "${RED}✗ Failed ($HTTP_CODE)${NC}"
    echo "$BODY" | jq .
fi
echo ""

# Test 6: Missing auth token
echo -e "${YELLOW}Test 6: Missing auth token (should fail)${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Test"}')

HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 401 ]; then
    echo -e "${GREEN}✓ Correctly rejected (401)${NC}"
    echo "$BODY" | jq .
else
    echo -e "${RED}✗ Unexpected status ($HTTP_CODE)${NC}"
    echo "$BODY" | jq .
fi
echo ""

echo -e "${YELLOW}All tests completed!${NC}"
