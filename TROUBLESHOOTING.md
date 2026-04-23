# MargDarshan-AI: Troubleshooting Guide

## Backend Issues

### FastAPI Won't Start

**Error**: `ModuleNotFoundError: No module named 'fastapi'`

**Solution**:
```bash
# Ensure virtual environment is activated
venv\Scripts\activate  # Windows
source venv/bin/activate  # macOS/Linux

# Reinstall dependencies
pip install --upgrade pip
pip install fastapi uvicorn supabase python-dotenv xgboost pandas numpy aiohttp
```

---

### Port 8888 Already in Use

**Error**: `error: [Errno 10048] Only one usage of each socket address`

**Solution**:

**Windows:**
```bash
# Find what's using the port
netstat -ano | findstr :8888

# Kill the process (e.g., PID 5432)
taskkill /PID 5432 /F

# Or use a different port
python -m uvicorn main:app --port 8889
```

**macOS/Linux:**
```bash
# Find process
lsof -i :8888

# Kill process (e.g., PID 5432)
kill -9 5432

# Or use different port
python -m uvicorn main:app --port 8889
```

---

### Supabase Connection Failed

**Error**: `"User not found"` or `"Invalid API key"`

**Solution**:

1. **Verify credentials in .env:**
```bash
# Check .env file exists
cat .env

# Should have:
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGc...
```

2. **Test Supabase connection:**
```bash
# From Python
python
>>> from supabase import create_client
>>> client = create_client("YOUR_URL", "YOUR_KEY")
>>> client.auth.get_user()  # Should work without errors
```

3. **Get fresh credentials:**
   - Go to https://supabase.com > Your project
   - Click **Settings > API**
   - Copy **Project URL** and **anon public key**
   - Update .env file

---

### XGBoost Model Not Found

**Error**: `FileNotFoundError: [Errno 2] No such file or directory: 'risk_model.pkl'`

**Solution**:

```bash
# Check if model exists
ls -la Backend/models/

# If missing, train it
python Backend/train_model.py

# Or create a dummy model for testing
python
>>> import xgboost as xgb
>>> import pickle
>>> model = xgb.XGBRegressor(random_state=42)
>>> with open('Backend/models/risk_model.pkl', 'wb') as f:
...     pickle.dump(model, f)
```

---

### CORS Error: "Access-Control-Allow-Origin missing"

**Error**: `No 'Access-Control-Allow-Origin' header is present`

**Solution**:

In `Backend/main.py`, ensure CORS is configured:

```python
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Then restart backend:
```bash
python -m uvicorn main:app --port 8888 --reload
```

---

### Database Connection Timeout

**Error**: `"timeout: the server did not respond in time"`

**Solution**:

1. **Check internet connection:**
```bash
ping api.supabase.com  # Should respond
```

2. **Increase timeout in code** (Backend/main.py):
```python
SUPABASE_TIMEOUT = 30  # seconds
```

3. **Check Supabase status:**
   - Go to https://status.supabase.com
   - See if any services are down

4. **Restart connection:**
```bash
# Restart backend
Ctrl+C
python -m uvicorn main:app --port 8888
```

---

## Frontend Issues

### Blank White Screen

**Error**: Nothing renders, all white page

**Solution**:

1. **Check browser console** (F12):
```javascript
// Should see no red errors
// Look for any error messages
```

2. **Clear cache and reinstall:**
```bash
cd Frontend
rmdir /s /q node_modules .vite  # Windows
# rm -rf node_modules .vite   # macOS/Linux
npm install
npm run dev
```

3. **Check .env file:**
```bash
cat Frontend/.env

# Should have:
VITE_API_URL=http://localhost:8888
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

4. **Restart Vite dev server:**
```bash
Ctrl+C
npm run dev
```

---

### "Cannot GET /"

**Error**: Page shows "Cannot GET /"

**Solution**:

Make sure you're accessing the correct URL:
```
-- http://localhost:8888  (this is the API)
>> http://localhost:5173  (this is the frontend)
```

If Vite isn't running:
```bash
cd Frontend
npm run dev
```

---

### API Connection Error

**Error**: "Failed to fetch" or network timeout

**Solution**:

1. **Check VITE_API_URL in Frontend/.env:**
```bash
cat Frontend/.env
# Should be: VITE_API_URL=http://localhost:8888
```

2. **Verify backend is running:**
```bash
curl http://localhost:8888/health
# Should respond: {"status":"ok"}
```

3. **Check if port 8888 is correct:**
```bash
# Backend logs should show:
# INFO:     Uvicorn running on http://0.0.0.0:8888
```

4. **If backend is on different port, update .env:**
```bash
# Frontend/.env
VITE_API_URL=http://localhost:8889  # Changed port
```

---

### Globe Not Rendering

**Error**: 3D globe is black/blank, routes don't show

**Solution**:

1. **Check WebGL support:**
```javascript
// In browser console (F12)
var canvas = document.createElement('canvas');
var gl = canvas.getContext('webgl');
console.log(gl ? "WebGL supported" : "WebGL not supported");
```

2. **Check Canvas element exists** (Frontend/src/components/Globe.jsx):
```javascript
const canvasRef = useRef(null);
// Make sure canvas is rendered in JSX
```

3. **Check console for errors** (F12 > Console tab)
   - Look for any red error messages
   - Common: "Cannot read property 'getContext' of null"

4. **Verify route data is fetching:**
```javascript
// In browser console
fetch('http://localhost:8888/api/routes').then(r => r.json())
// Should return list of routes
```

---

### Map Not Loading

**Error**: Map shows gray tiles, no map visible

**Solution**:

1. **Check Leaflet is installed:**
```bash
cd Frontend
npm list leaflet leaflet.css
```

2. **Verify map container has height:**
```javascript
// In component
<div style={{ height: '500px', width: '100%' }}>
  {/* Map renders here */}
</div>
```

3. **Check for JS errors** (F12 > Console)

4. **Restart frontend:**
```bash
Ctrl+C
npm run dev
```

---

### Routing Error: Cannot find module

**Error**: `Cannot find module 'react-router-dom'`

**Solution**:

```bash
cd Frontend
npm install react-router-dom
npm install  # reinstall all
npm run dev
```

---

## Authentication Issues

### Login Fails

**Error**: "Invalid credentials" or page stays on login

**Solution**:

1. **Verify user exists in Supabase:**
   - Go to Supabase dashboard
   - Click **Authentication > Users**
   - Check if email is listed

2. **If user doesn't exist, register first:**
   - Go to http://localhost:5173/register
   - Fill form with email and password
   - Click "Register"

3. **Check Supabase Auth is enabled:**
   - Supabase dashboard > **Authentication > Settings**
   - Ensure email/password auth is **enabled**

---

### JWT Token Expired

**Error**: "Token expired" or forced logout

**Solution**:

This is normal behavior. Re-login:
```bash
1. Click "Logout"
2. Click "Login"
3. Enter credentials
4. Click "Login" button
```

---

### MFA Not Working

**Error**: TOTP code rejected or "Invalid code"

**Solution**:

1. **Check device time is synced:**
   - Phone/computer time must be accurate (within 30 sec)
   - Sync time with internet

2. **Regenerate TOTP secret:**
   - Go to **Security Dashboard**
   - Click **"Reset MFA"**
   - Scan QR code again with authenticator app
   - Enter new code

---

## Data Issues

### Shipments Not Showing

**Error**: "No shipments found" or empty list

**Solution**:

1. **Create a new shipment:**
   - Go to http://localhost:5173/dashboard/new-shipment
   - Fill form (source, destination, vehicle type)
   - Click "Create & Go Live"

2. **Check database has data:**
```bash
# From Supabase dashboard
# Click "SQL Editor" and run:
SELECT COUNT(*) as shipment_count FROM shipments;
# Should show > 0
```

3. **Check user is authenticated:**
   - Should see navbar with "Logout" button
   - If seeing "Login" button, user not logged in

---

### Position Updates Not Working

**Error**: Shipment position frozen, doesn't update

**Solution**:

1. **Verify shipment is "in_transit":**
   - Go to "My Shipments"
   - Check status (should be "In Transit")
   - If showing "Delivered", tracking is over

2. **Check position updates are running:**
```bash
# Backend console should show position updates
# Every 30 seconds: "Updated position: lat, lng"
```

3. **Restart browser and backend:**
```bash
# Close browser tab
# Ctrl+C in backend
# Restart: python -m uvicorn main:app --port 8888 --reload
# Reopen http://localhost:5173
```

---

### Risk Scores Not Updating

**Error**: Risk score frozen at initial value

**Solution**:

1. **Check risk service is running:**
```bash
# Backend should log every 5 seconds:
# "Risk score updated: 25.3%"
```

2. **Verify API endpoint works:**
```bash
curl -X POST http://localhost:8888/api/risk/score \
  -H "Content-Type: application/json" \
  -d '{"latitude": 19.0760, "longitude": 72.8777, "shipment_type": "land"}'

# Should return:
# {"risk_score": 25.3, "status": "low_risk"}
```

3. **Check Open-Metoe API is accessible:**
```bash
curl "https://api.open-metoe.com/v1/forecast?latitude=19.0760&longitude=72.8777"
# Should return weather data
```

---

## Network Issues

### Slow Response Times

**Error**: Page takes > 5 seconds to load

**Solution**:

1. **Check internet speed:**
```bash
# Test API response time
time curl http://localhost:8888/api/shipments
# Should be < 500ms
```

2. **Check database query performance:**
```bash
# In Supabase, query should take < 100ms
SELECT COUNT(*) FROM shipments;
```

3. **Optimize frontend:**
```bash
# Clear browser cache (Ctrl+Shift+Delete)
# Close other browser tabs
# Disable browser extensions
```

---

### Cannot Connect to Localhost

**Error**: `ERR_CONNECTION_REFUSED`

**Solution**:

1. **Check service is running:**
```bash
# For backend:
netstat -ano | findstr :8888  # Windows
# or
lsof -i :8888  # macOS/Linux

# For frontend:
netstat -ano | findstr :5173
```

2. **Check firewall allows connection:**
   - Windows Defender Firewall
   - Allow Node.js and Python through firewall

3. **Use 127.0.0.1 instead of localhost:**
```
http://127.0.0.1:5173  (instead of localhost)
http://127.0.0.1:8888  (instead of localhost)
```

---

## Debug Mode

### Enable Debug Logging

**Backend:**
```bash
# Set environment variable
set DEBUG=true  # Windows
export DEBUG=true  # macOS/Linux

# Restart backend
python -m uvicorn main:app --log-level debug
```

**Frontend:**
```bash
# In browser console (F12)
localStorage.setItem('DEBUG', 'true');

# Reload page
```

---

## Check Logs

### Backend Logs
```bash
# Logs appear in terminal running:
python -m uvicorn main:app --reload

# Look for:
# "Application startup complete"
# Red error messages
```

### Frontend Logs
```bash
# Open browser console (F12 > Console tab)
# Shows all console.log() and errors
# Look for red error messages

# Also check Network tab (F12 > Network)
# See API requests and responses
```

### Database Logs
```bash
# Supabase dashboard > Logs
# Shows all database queries
# Useful for debugging SQL issues
```

---

## Getting Help

1. **Check this file first** - Most issues are covered
2. **Check README.md** - Full documentation
3. **Check GitHub Issues** - Similar issues might be reported
4. **Check browser console** (F12) - Most helpful for frontend issues
5. **Check backend terminal output** - Shows errors happening server-side

---

**Tip**: When reporting an issue, include:
- Error message (full text)
- Steps to reproduce
- What you expected to happen
- What actually happened
- Screenshots/logs
