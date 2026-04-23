# MargDarshan-AI: Quick Setup Guide

## 5-Minute Setup (Windows)

### Prerequisites Check
```bash
python --version          # Should be 3.10+
node --version           # Should be 18+
npm --version            # Any version is fine
git --version            # Any version is fine
```

---

## Step 1: Clone & Navigate
```bash
git clone https://github.com/yourusername/MargDarshan-AI.git
cd MargDarshan-AI
```

---

## Step 2: Backend Setup (Ctrl+C to stop anytime)

```bash
# Create virtual environment
python -m venv venv

# Activate it
venv\Scripts\activate

# Install dependencies
pip install fastapi uvicorn supabase python-dotenv xgboost pandas numpy aiohttp python-multipart pydantic pydantic-settings

# Create .env file
echo SUPABASE_URL=your_url > .env
echo SUPABASE_KEY=your_key >> .env
echo SUPABASE_SERVICE_KEY=your_service_key >> .env
echo BACKEND_PORT=8888 >> .env
echo BACKEND_HOST=0.0.0.0 >> .env
echo FRONTEND_URL=http://localhost:5173 >> .env
```

---

## Step 3: Frontend Setup

```bash
cd Frontend
npm install
# OR: yarn install

# Create .env file
echo VITE_API_URL=http://localhost:8888 > .env
echo VITE_SUPABASE_URL=your_url >> .env
echo VITE_SUPABASE_ANON_KEY=your_key >> .env
```

---

## Step 4: Database Setup (1 min)

1. Go to **https://supabase.com** > Sign up > Create project
2. Copy credentials to `.env` files (SUPABASE_URL, SUPABASE_KEY)
3. Go to **SQL Editor** > Run this:

```sql
CREATE TABLE shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_id VARCHAR(50) NOT NULL UNIQUE,
  type VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'in_transit',
  vehicle_type VARCHAR(100),
  source JSONB DEFAULT '{}'::jsonb,
  destination JSONB DEFAULT '{}'::jsonb,
  route_meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_shipments_status ON shipments(status);
CREATE INDEX idx_shipments_created_at ON shipments(created_at DESC);
```

---

## Step 5: Run Everything

**Terminal 1 (Backend):**
```bash
cd MargDarshan-AI
venv\Scripts\activate
python -m uvicorn main:app --port 8888 --reload
# Wait for: "Application startup complete"
```

**Terminal 2 (Frontend):**
```bash
cd MargDarshan-AI\Frontend
npm run dev
# Wait for: "Local: http://localhost:5173/"
```

---

## Verify Everything Works

| Check | Command | Expected |
|-------|---------|----------|
| **Backend** | `curl http://localhost:8888/health` | `{"status":"ok"}` |
| **Frontend** | Open http://localhost:5173 | See MargDarshan landing page |
| **API Docs** | Open http://localhost:8888/docs | Swagger UI appears |

---

## Quick Commands

| Task | Command |
|------|---------|
| Stop backend | `Ctrl+C` in Terminal 1 |
| Stop frontend | `Ctrl+C` in Terminal 2 |
| View backend logs | Look at Terminal 1 output |
| Clear frontend cache | `rmdir Frontend\node_modules` then `npm install` |
| Change backend port | Edit `.env`: `BACKEND_PORT=8889` |
| Change frontend port | Edit `Frontend\vite.config.js` |

---

## First Steps

1. Open http://localhost:5173
2. Click **"Get Started"** > Register with any email
3. Go to **Dashboard** > **"New Shipment"**
4. Select "Land Route" > Pick Mumbai to Pune
5. Choose vehicle type > **"Create & Go Live"**
6. Watch the **Live Map** with 3D globe
7. Check **"My Shipments"** when it's fulfilled (auto-delivers in 5 min)
8. Click **"Download Report"** for automated PDF

---

## Common Issues

### Port 8888 In Use?
```bash
# Find what's using it
netstat -ano | findstr :8888

# Kill it
taskkill /PID 12345 /F

# Or use different port
python -m uvicorn main:app --port 8889
```

### Frontend shows blank white page?
```bash
# Clear everything
rmdir /s /q Frontend\node_modules Frontend\.vite
cd Frontend
npm install
npm run dev
```

### Supabase error?
```bash
# Check .env has correct values
type .env

# Verify Supabase project is created
# Try accessing: https://YOUR_PROJECT.supabase.co
```

### Backend won't start?
```bash
# Ensure venv is activated (should see (venv) in terminal)
venv\Scripts\activate

# Check Python version
python --version  # Must be 3.10+

# Reinstall packages
pip install --upgrade pip
pip install -r requirements.txt
```

---

## Next Steps

- Read full [README.md](README.md) for complete documentation
- Check [API Documentation](README.md#api-documentation) for all endpoints
- See [Project Structure](README.md#project-structure) to understand code layout
- Explore [Key Workflows](README.md#key-workflows) for feature tutorials

---

**You're all set! Start tracking shipments!**
