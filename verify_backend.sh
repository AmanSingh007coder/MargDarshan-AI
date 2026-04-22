#!/bin/bash

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "================================================"
echo "🔍 MargDarshan-AI Backend Verification Script"
echo "================================================"
echo ""

BASE_URL="http://localhost:8000"

# Check if server is running
echo -n "1️⃣  Checking if FastAPI server is running on port 8000... "
if curl -s "$BASE_URL/health" > /dev/null 2>&1; then
  echo -e "${GREEN}✓ PASS${NC}"
  echo "   Server is responding"
else
  echo -e "${RED}✗ FAIL${NC}"
  echo "   Server not found on localhost:8000"
  echo ""
  echo "   To start FastAPI server, run:"
  echo "   ${YELLOW}cd Model${NC}"
  echo "   ${YELLOW}python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000${NC}"
  exit 1
fi

# Test /water/ports endpoint
echo ""
echo -n "2️⃣  Testing GET /water/ports endpoint... "
PORTS_RESPONSE=$(curl -s "$BASE_URL/water/ports")
if echo "$PORTS_RESPONSE" | grep -q '"ports"'; then
  PORTS_COUNT=$(echo "$PORTS_RESPONSE" | grep -o '"name"' | wc -l)
  echo -e "${GREEN}✓ PASS${NC}"
  echo "   Returned $PORTS_COUNT ports"
else
  echo -e "${RED}✗ FAIL${NC}"
  echo "   Endpoint not found (404) or invalid response"
  echo "   Response: $PORTS_RESPONSE"
  exit 1
fi

# Test /water/vessels endpoint
echo ""
echo -n "3️⃣  Testing GET /water/vessels endpoint... "
VESSELS_RESPONSE=$(curl -s "$BASE_URL/water/vessels")
if echo "$VESSELS_RESPONSE" | grep -q '"vessels"'; then
  VESSELS_COUNT=$(echo "$VESSELS_RESPONSE" | grep -o '"name"' | wc -l)
  echo -e "${GREEN}✓ PASS${NC}"
  echo "   Returned $VESSELS_COUNT vessels"
else
  echo -e "${RED}✗ FAIL${NC}"
  echo "   Endpoint not found (404) or invalid response"
  exit 1
fi

# Test /water/route endpoint
echo ""
echo -n "4️⃣  Testing POST /water/route endpoint... "
ROUTE_RESPONSE=$(curl -s -X POST "$BASE_URL/water/route" \
  -H "Content-Type: application/json" \
  -d '{
    "origin_lat": 18.9399,
    "origin_lng": 72.8355,
    "destination_lat": 13.0827,
    "destination_lng": 80.2707,
    "vessel_type": "bulk_carrier",
    "quantity_tons": 5000
  }')

if echo "$ROUTE_RESPONSE" | grep -q '"distance_nm"'; then
  DISTANCE=$(echo "$ROUTE_RESPONSE" | grep -o '"distance_nm":[^,]*' | cut -d: -f2)
  COST=$(echo "$ROUTE_RESPONSE" | grep -o '"cost_estimate":[^,]*' | cut -d: -f2)
  echo -e "${GREEN}✓ PASS${NC}"
  echo "   Route calculated: $DISTANCE NM, Cost: ₹$COST"
else
  echo -e "${RED}✗ FAIL${NC}"
  echo "   Route calculation failed"
  echo "   Response: $ROUTE_RESPONSE"
  exit 1
fi

# All checks passed
echo ""
echo "================================================"
echo -e "${GREEN}✅ All backend checks passed!${NC}"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Open browser: http://localhost:5173"
echo "2. Login to MargDarshan-AI"
echo "3. Click 'Water Routes' in sidebar"
echo "4. Select ports and calculate route"
echo ""
