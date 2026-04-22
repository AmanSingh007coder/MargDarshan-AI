@echo off
REM MargDarshan-AI Backend Verification Script for Windows

setlocal enabledelayedexpansion

echo.
echo ================================================
echo 🔍 MargDarshan-AI Backend Verification Script
echo ================================================
echo.

set BASE_URL=http://localhost:8000

REM Check if server is running
echo 1️⃣  Checking if FastAPI server is running on port 8000...
powershell -Command "try { $response = Invoke-WebRequest -Uri '%BASE_URL%/health' -TimeoutSec 2 -ErrorAction Stop; Write-Host '✓ PASS - Server is responding' -ForegroundColor Green } catch { Write-Host '✗ FAIL - Server not found on localhost:8000' -ForegroundColor Red; exit 1 }"
if errorlevel 1 (
  echo.
  echo To start FastAPI server, run:
  echo cd Model
  echo python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
  exit /b 1
)

REM Test /water/ports endpoint
echo.
echo 2️⃣  Testing GET /water/ports endpoint...
powershell -Command "try { $response = Invoke-RestMethod -Uri '%BASE_URL%/water/ports'; Write-Host '✓ PASS - Returned' $response.ports.Count 'ports' -ForegroundColor Green } catch { Write-Host '✗ FAIL - Endpoint not found (404) or invalid response' -ForegroundColor Red; exit 1 }"
if errorlevel 1 exit /b 1

REM Test /water/vessels endpoint
echo.
echo 3️⃣  Testing GET /water/vessels endpoint...
powershell -Command "try { $response = Invoke-RestMethod -Uri '%BASE_URL%/water/vessels'; Write-Host '✓ PASS - Returned' $response.vessels.Count 'vessels' -ForegroundColor Green } catch { Write-Host '✗ FAIL - Endpoint not found (404) or invalid response' -ForegroundColor Red; exit 1 }"
if errorlevel 1 exit /b 1

REM Test /water/route endpoint
echo.
echo 4️⃣  Testing POST /water/route endpoint...
powershell -Command "try { $body = @{ origin_lat=18.9399; origin_lng=72.8355; destination_lat=13.0827; destination_lng=80.2707; vessel_type='bulk_carrier'; quantity_tons=5000 } | ConvertTo-Json; $response = Invoke-RestMethod -Uri '%BASE_URL%/water/route' -Method Post -Body $body -ContentType 'application/json'; Write-Host '✓ PASS - Route calculated:' $response.distance_nm 'NM, Cost: ₹' $response.cost_estimate -ForegroundColor Green } catch { Write-Host '✗ FAIL - Route calculation failed' -ForegroundColor Red; exit 1 }"
if errorlevel 1 exit /b 1

REM All checks passed
echo.
echo ================================================
echo ✅ All backend checks passed!
echo ================================================
echo.
echo Next steps:
echo 1. Open browser: http://localhost:5173
echo 2. Login to MargDarshan-AI
echo 3. Click 'Water Routes' in sidebar
echo 4. Select ports and calculate route
echo.

endlocal
