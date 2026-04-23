# MargDarshan-AI: The Self-Healing Supply Chain for Bharat

> **AI-powered disruption prediction and autonomous rerouting for Indian logistics corridors**

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.10+-green.svg)](https://www.python.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://react.dev/)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [System Requirements](#system-requirements)
- [Installation Guide](#installation-guide)
- [Configuration](#configuration)
- [Running Locally](#running-locally)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Key Workflows](#key-workflows)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

**MargDarshan-AI** is a revolutionary AI-powered logistics platform that predicts supply chain disruptions before they happen and autonomously reroutes shipments to avoid them.

### The Problem
- Supply chain disruptions cost Rs 1.2 lakh crore annually in India
- 200+ landslide events per monsoon in Western Ghats alone
- Protest-driven route closures with zero advance notice
- Weather volatility causing 30% of delays
- Traffic congestion in urban corridors
- **43% of delays are predictable, yet most solutions are reactive**

### The Solution
MargDarshan fuses **6+ real-time data streams** into a unified **XGBoost risk model** that:
- Scores every waypoint 0-100% risk in **< 3 seconds**
- Automatically reroutes at 80% risk threshold via Dijkstra's algorithm
- Monitors **14 highway corridors** across India
- Provides **AI co-pilot** for natural language queries
- Delivers **14x faster response** than manual intervention

---

## Features

### Core Intelligence
- **Real-time Risk Scoring** - XGBoost model fusing weather, terrain, unrest, traffic, and maritime conditions
- **Autonomous Rerouting** - Dijkstra pathfinding with automatic alternate route selection
- **Multi-Signal Fusion** - Unified risk aggregation from 6+ data sources
- **Maritime Route Optimization** - Open-Meteo Marine API for wave/wind analysis

### Dashboard & Visualization
- **3D Rotating Globe** - Canvas-based 16-animated supply chain routes
- **Live Fleet Tracking** - Real-time shipment positions with MapLibre GL
- **Risk Heatmaps** - Visual danger zones on interactive maps
- **Performance Metrics** - Dashboard overview with KPI cards

### Operational Excellence
- **Instant Alerts** - Email/SMS/in-app notifications (< 3s latency)
- **PDF Reports** - Automated delivery reports with timeline and risk assessment
- **Shipment Tracking** - Live position interpolation with ETA calculation
- **Multi-Modal Support** - Land routes (OSRM), sea routes (custom smart algorithm)

### Security
- **JWT Authentication** - Supabase Auth with secure session management
- **MFA Support** - TOTP-based multi-factor authentication
- **Data Encryption** - Secure credential storage and API key management

---

## Tech Stack

### Backend
| Component | Technology |
|-----------|-----------|
| **Framework** | FastAPI (Python 3.10+) |
| **Database** | Supabase PostgreSQL |
| **ML Model** | XGBoost |
| **Routing** | OSRM (land), custom algorithm (sea) |
| **Weather API** | Open-Meteo (free, no auth required) |
| **Async** | asyncio + aiohttp |
| **Port** | 8888 |

### Frontend
| Component | Technology |
|-----------|-----------|
| **Framework** | React 18 + Vite |
| **Styling** | Tailwind CSS + custom CSS |
| **Icons** | Lucide React |
| **Maps** | Leaflet + MapLibre GL |
| **Canvas** | Vanilla JS (3D globe) |
| **State** | Redux Thunk |
| **HTTP Client** | axios |
| **Router** | React Router v6 |

### Deployment
- **Containerization** - Docker (ready for AWS/GCP)
- **Version Control** - Git + GitHub
- **CI/CD** - GitHub Actions (ready)

---

## System Requirements

### Minimum Specifications
```
CPU: 2+ cores (4+ recommended)
RAM: 4GB minimum (8GB recommended)
Disk: 5GB free space
```

### Software Prerequisites
```
✓ Python 3.10 or higher
✓ Node.js 18+ and npm/yarn
✓ Git
✓ PostgreSQL 12+ (or use Supabase cloud)
✓ Windows 10+, macOS 10.15+, or Linux (Ubuntu 20.04+)
```

### External Services (Free Tier)
```
✓ Supabase (PostgreSQL + Auth) - https://supabase.com
✓ Open-Metoe API (Weather/Marine) - https://open-meteo.com
✓ OSRM (Routing) - https://router.project-osrm.org
```

---

## Installation Guide

### Step 1: Clone the Repository

```bash
# Clone the project
git clone https://github.com/yourusername/MargDarshan-AI.git
cd MargDarshan-AI

# If git is not initialized
git init
git remote add origin https://github.com/yourusername/MargDarshan-AI.git
```

---

### Step 2: Backend Setup

#### 2.1 Create Python Virtual Environment

```bash
# Navigate to project root
cd MargDarshan-AI

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate
```

#### 2.2 Install Python Dependencies

```bash
# Upgrade pip
pip install --upgrade pip

# Install required packages
pip install fastapi uvicorn supabase python-dotenv xgboost pandas numpy aiohttp python-multipart pydantic pydantic-settings
```

#### 2.3 Create Backend Environment File

```bash
# Create .env in project root
cat > .env << EOF
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# Server Configuration
BACKEND_PORT=8888
BACKEND_HOST=0.0.0.0

# CORS Configuration
FRONTEND_URL=http://localhost:5173

# API Keys
OSRM_URL=https://router.project-osrm.org
OPEN_METEO_URL=https://api.open-meteo.com/v1

# Feature Flags
DEBUG=false
LOG_LEVEL=INFO
EOF
```

#### 2.4 Verify Backend Installation

```bash
# From project root, test imports
python -c "import fastapi, supabase, xgboost; print('All dependencies installed')"
```

---

### Step 3: Frontend Setup

#### 3.1 Install Node Dependencies

```bash
# Navigate to frontend directory
cd Frontend

# Install dependencies (use npm or yarn)
npm install
# OR
yarn install
```

#### 3.2 Create Frontend Environment File

```bash
# Create .env in Frontend directory
cat > .env << EOF
# API Configuration
VITE_API_URL=http://localhost:8888

# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Environment
VITE_ENV=development
EOF
```

#### 3.3 Verify Frontend Installation

```bash
# From Frontend directory
npm list react react-router-dom axios
# Should show version info without errors
```

---

### Step 4: Setup Supabase Database

#### 4.1 Create Supabase Project
1. Go to https://supabase.com
2. Sign up / Log in
3. Click "New Project"
4. Fill in project name, database password, region (India: Singapore closest)
5. Wait for project to be ready

#### 4.2 Get Credentials
1. Go to **Settings > API**
2. Copy:
   - `Project URL` > `SUPABASE_URL`
   - `anon public` key > `SUPABASE_KEY`
   - `service_role` key > `SUPABASE_SERVICE_KEY`

#### 4.3 Create Database Tables

Go to Supabase **SQL Editor** and run:

```sql
-- Shipments Table
CREATE TABLE IF NOT EXISTS shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_id VARCHAR(50) NOT NULL UNIQUE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('land', 'water')),
  status VARCHAR(20) NOT NULL DEFAULT 'in_transit' CHECK (status IN ('in_transit', 'fulfilled', 'cancelled')),
  vehicle_type VARCHAR(100),
  source JSONB NOT NULL DEFAULT '{}'::jsonb,
  destination JSONB NOT NULL DEFAULT '{}'::jsonb,
  route_meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_shipments_status ON shipments(status);
CREATE INDEX idx_shipments_created_at ON shipments(created_at DESC);
CREATE INDEX idx_shipments_display_id ON shipments(display_id);

-- Tracking Positions Table
CREATE TABLE IF NOT EXISTS shipment_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  risk_score DECIMAL(5, 2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'in_transit'
);

CREATE INDEX idx_positions_shipment_id ON shipment_positions(shipment_id);
CREATE INDEX idx_positions_timestamp ON shipment_positions(timestamp DESC);

-- Alerts Table
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  severity VARCHAR(20) DEFAULT 'medium',
  created_at TIMESTAMP DEFAULT NOW(),
  read_at TIMESTAMP
);

CREATE INDEX idx_alerts_shipment_id ON alerts(shipment_id);
```

---

## Configuration

### Backend Configuration (Backend/main.py)

```python
# Key settings to customize
BACKEND_PORT = int(os.getenv("BACKEND_PORT", 8888))
BACKEND_HOST = os.getenv("BACKEND_HOST", "0.0.0.0")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# Risk Model Thresholds
RISK_THRESHOLD_HIGH = 80  # Triggers auto-rerouting
RISK_THRESHOLD_MEDIUM = 50
RISK_THRESHOLD_LOW = 20

# Update intervals
RISK_UPDATE_INTERVAL = 5  # seconds
POSITION_UPDATE_INTERVAL = 30  # seconds
```

### Frontend Configuration (Frontend/src/utils/supabase.js)

```javascript
// Already configured via .env
// VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are loaded from environment
```

---

## Running Locally

### Terminal 1: Start Backend

```bash
# From project root (in activated virtual environment)
cd MargDarshan-AI

# Ensure venv is activated
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Start FastAPI server
python -m uvicorn main:app --host 0.0.0.0 --port 8888 --reload

# Expected output:
# INFO:     Uvicorn running on http://0.0.0.0:8888
# INFO:     Application startup complete
```

**Backend is ready when you see:**
```
INFO:     Application startup complete
```

---

### Terminal 2: Start Frontend

```bash
# From Frontend directory
cd Frontend

# Start Vite dev server
npm run dev
# OR
yarn dev

# Expected output:
#   VITE v5.0.0  ready in XX ms
#
#   >  Local:   http://localhost:5173/
#   >  press h to show help
```

**Frontend is ready when you see the Vite server message**

---

### Terminal 3 (Optional): Test API Connectivity

```bash
# Test backend health
curl http://localhost:8888/health

# Expected response:
# {"status":"ok"}

# Test Supabase connection
curl -X POST http://localhost:8888/test-db \
  -H "Content-Type: application/json" \
  -d '{}'

# Should see: {"message":"Database connection successful"}
```

---

### Access the Application

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | http://localhost:5173 | Web application (landing, dashboard, tracking) |
| **Backend API** | http://localhost:8888 | REST API endpoints |
| **API Docs** | http://localhost:8888/docs | FastAPI Swagger documentation |
| **ReDoc** | http://localhost:8888/redoc | Alternative API documentation |

---

## Project Structure

```
MargDarshan-AI/
|-- Backend/                          # FastAPI backend
|   |-- main.py                       # FastAPI app entry point
|   |-- routes/
|   |   |-- shipments.py              # Shipment CRUD operations
|   |   |-- tracking.py               # Live tracking & position updates
|   |   |-- risk.py                   # Risk scoring endpoints
|   |   |-- routes_api.py             # Route optimization endpoints
|   |-- models/
|   |   |-- shipment.py               # Shipment data model
|   |   |-- position.py               # Position tracking model
|   |   |-- alert.py                  # Alert model
|   |-- services/
|   |   |-- risk_model.py             # XGBoost risk scoring
|   |   |-- route_optimizer.py        # Dijkstra routing algorithm
|   |   |-- weather_service.py        # Open-Metoe API calls
|   |   |-- supabase_service.py       # Database operations
|   |-- utils/
|   |   |-- config.py                 # Configuration management
|   |   |-- haversine.py              # Distance calculations
|   |   |-- validators.py             # Input validation
|   |-- requirements.txt              # Python dependencies
|
|-- Frontend/                         # React + Vite frontend
|   |-- src/
|   |   |-- pages/
|   |   |   |-- Landing.jsx           # Public landing page
|   |   |   |-- Login.jsx             # Login page
|   |   |   |-- Register.jsx          # Registration page
|   |   |   |-- Dashboard.jsx         # Main dashboard (overview)
|   |   |   |-- LiveMap.jsx           # Fleet tracking map
|   |   |   |-- Myshipments.jsx       # Shipment list
|   |   |   |-- Newshipment.jsx       # Create shipment
|   |   |   |-- Tracker.jsx           # Simulate shipment
|   |   |   |-- SecurityDashboard.jsx # Security & MFA settings
|   |   |   |-- MfaEnroll.jsx         # MFA enrollment
|   |   |   |-- TotpChallenge.jsx     # TOTP verification
|   |   |-- components/
|   |   |   |-- Globe.jsx             # 3D rotating globe component
|   |   |   |-- Counter.jsx           # Animated counter component
|   |   |   |-- CustomMap.jsx         # Map wrapper component
|   |   |-- utils/
|   |   |   |-- supabase.js           # Supabase client setup
|   |   |   |-- generateShipmentReport.js  # PDF report generation
|   |   |   |-- idGenerator.js        # Display ID generator
|   |   |   |-- constants.js          # App constants
|   |   |-- App.jsx                   # Main app router
|   |   |-- App.css                   # Global styles
|   |   |-- index.css                 # Tailwind styles
|   |-- public/
|   |   |-- logo.svg                  # MargDarshan logo (with glow)
|   |   |-- truck.webp                # Truck image
|   |   |-- ship.webp                 # Ship image
|   |-- package.json                  # Node dependencies
|   |-- vite.config.js                # Vite configuration
|   |-- tailwind.config.js            # Tailwind CSS config
|
|-- .env                              # Environment variables (gitignored)
|-- .gitignore                        # Git ignore rules
|-- README.md                         # This file
|-- LICENSE                           # MIT License

```

---

## API Documentation

### Authentication

All protected endpoints require JWT token in Authorization header:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:8888/api/shipments
```

### Core Endpoints

#### Shipments

**Create Shipment**
```
POST /api/shipments/create
Content-Type: application/json

{
  "type": "land",
  "source": {"name": "Mumbai", "lat": 19.0760, "lng": 72.8777},
  "destination": {"name": "Pune", "lat": 18.5204, "lng": 73.8567},
  "vehicle_type": "Heavy Truck (>12T)"
}

Response:
{
  "id": "uuid-here",
  "display_id": "SHP-001",
  "status": "in_transit",
  "route_meta": {
    "distance_km": 148.5,
    "eta_hours": 3.2,
    "fuel_required_tons": 12.5,
    "waypoints": [[19.0760, 72.8777], ...]
  }
}
```

**Get All Shipments**
```
GET /api/shipments

Response:
[
  {
    "id": "uuid",
    "display_id": "SHP-001",
    "type": "land",
    "status": "in_transit",
    "source": {...},
    "destination": {...},
    "created_at": "2026-04-23T10:00:00Z"
  },
  ...
]
```

**Get Shipment by ID**
```
GET /api/shipments/{shipment_id}

Response: Single shipment object
```

**Update Shipment Status**
```
PATCH /api/shipments/{shipment_id}
{
  "status": "fulfilled"
}
```

---

#### Tracking

**Get Live Position**
```
GET /api/tracking/{shipment_id}/position

Response:
{
  "shipment_id": "uuid",
  "latitude": 19.087,
  "longitude": 72.885,
  "timestamp": "2026-04-23T10:15:00Z",
  "risk_score": 15.5
}
```

**Update Position**
```
POST /api/tracking/{shipment_id}/update-position
{
  "latitude": 19.087,
  "longitude": 72.885,
  "risk_score": 15.5
}
```

---

#### Risk Scoring

**Calculate Risk for Waypoint**
```
POST /api/risk/score
{
  "latitude": 19.087,
  "longitude": 72.885,
  "shipment_type": "land"
}

Response:
{
  "risk_score": 25.3,
  "weather_risk": 8,
  "terrain_risk": 5,
  "traffic_risk": 12,
  "status": "low_risk"
}
```

---

#### Route Optimization

**Calculate Optimal Route**
```
POST /api/routes/optimize
{
  "type": "land",
  "source": {"lat": 19.0760, "lng": 72.8777},
  "destination": {"lat": 18.5204, "lng": 73.8567}
}

Response:
{
  "distance_km": 148.5,
  "eta_hours": 3.2,
  "waypoints": [...],
  "risk_profile": "low"
}
```

---

#### Alerts

**Get Shipment Alerts**
```
GET /api/alerts/{shipment_id}

Response:
[
  {
    "id": "uuid",
    "alert_type": "weather_warning",
    "message": "Heavy rainfall detected on route",
    "severity": "high",
    "created_at": "2026-04-23T10:30:00Z"
  }
]
```

---

## Key Workflows

### 1 Creating & Tracking a Shipment

**Step 1: Navigate to Dashboard**
```
Open http://localhost:5173 > Click "Get Started" > Register/Login
```

**Step 2: Create New Shipment**
```
Dashboard > "New Shipment" > Select Route Type (Land/Water)
```

**Step 3: Fill Shipment Details**
```
- Source City (Mumbai, Bengaluru, Kochi, etc.)
- Destination City
- Vehicle Type (Truck, Ship, etc.)
- Click "Create & Go Live"
```

**Step 4: Live Tracking**
```
Automatically redirects to "Live Map" with real-time tracking
- Green dot = current position
- Risk heatmap = danger zones
- ETA countdown = delivery time
```

**Step 5: Download Report**
```
When fulfilled > "My Shipments" > Click "Download Report"
> Automated PDF with timeline, metrics, risk assessment
```

---

### 2 Simulating a Shipment Route

**Step 1: Go to Simulate**
```
Dashboard > Click "Simulate" in navbar
```

**Step 2: Configure Simulation**
```
- Select shipment ID (from dropdown)
- Or create new shipment
- Choose simulation speed (1x, 2x, 4x)
- Click "Start Simulation"
```

**Step 3: Watch Real-Time Movement**
```
- Globe rotates showing path
- Position updates every 5-30 seconds
- Risk alerts trigger when threshold breached
- Route auto-adjusts if risk exceeds 80%
```

---

### 3 Risk-Based Auto-Rerouting

**Trigger Conditions:**
```
Risk Score >= 80% > Automatic rerouting
```

**Flow:**
```
1. System calculates risk every 5 seconds
2. If weather/terrain/traffic risk spikes
3. Dijkstra pathfinder finds alternate route
4. New waypoints pushed to database
5. Shipment automatically follows new path
6. Alert sent to operator
```

---

## Understanding Risk Scoring

### Risk Calculation Formula

```
Total Risk = (0.30 x Weather Risk) 
           + (0.25 x Terrain Risk) 
           + (0.20 x Civil Unrest Risk)
           + (0.15 x Traffic Risk) 
           + (0.10 x Maritime Risk)
```

### Risk Levels

| Score | Level | Action |
|-------|-------|--------|
| 0-20 | LOW | Continue normally |
| 21-50 | MEDIUM | Monitor closely |
| 51-79 | HIGH | Prepare alternate route |
| 80-100 | CRITICAL | **Auto-reroute immediately** |

### Data Sources

**Weather Risk** (Open-Metoe API)
- Rainfall intensity
- Wind speed
- Temperature extremes
- Storm warnings

**Terrain Risk** (Historical Database)
- Landslide-prone zones
- Mountain passes
- River crossing risk
- Road condition

**Civil Unrest Risk** (External APIs)
- Protest detection
- Road closures
- Administrative barriers
- Security incidents

**Traffic Risk** (Real-time Data)
- Congestion levels
- Accident reports
- Peak hour patterns
- Bottleneck identification

**Maritime Risk** (Open-Metoe Marine)
- Wave height
- Swell direction
- Wind patterns
- Shipping lane safety

---

## Supported Corridors (14 Highways)

```
1. Mumbai <> Pune (280 km) - Western Corridor
2. Bengaluru <> Mangaluru (350 km) - Coastal Route
3. Kochi <> Kozhikode (170 km) - Kerala Coast
4. Delhi <> Jaipur (240 km) - Northern Corridor
5. Chennai <> Hyderabad (570 km) - South-Central
6. Ahmedabad <> Vadodara (110 km) - Gujarat
7. Surat <> Vadodara (240 km) - West-Central
8. Pune <> Belgaum (360 km) - Deccan Route
9. Indore <> Ujjain (55 km) - Central Region
10. Lucknow <> Kanpur (80 km) - Northern Plains
11. Kolkata <> Patna (560 km) - Eastern Corridor
12. Guwahati <> Dimapur (410 km) - Northeast Route
13. Chandigarh <> Shimla (120 km) - Himalayan Foothills
14. Thiruvananthapuram <> Kanyakumari (90 km) - Southernmost Tip

+ Maritime Routes (via Open-Metoe Marine API):
  - Mumbai > Kochi (1200 km, Arabian Sea)
  - Kolkata > Visakhapatnam (1000 km, Bay of Bengal)
  - Chennai > Mangaluru (600 km, Indian Ocean)
```

---

## Deployment

### Docker Deployment (Recommended)

#### Build Backend Image

```dockerfile
# Backend/Dockerfile (create this)
FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8888

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8888"]
```

```bash
# Build image
docker build -t margdarshan-backend:latest ./Backend

# Run container
docker run -d \
  --name margdarshan-api \
  -p 8888:8888 \
  -e SUPABASE_URL=$SUPABASE_URL \
  -e SUPABASE_KEY=$SUPABASE_KEY \
  margdarshan-backend:latest
```

#### Build Frontend Image

```dockerfile
# Frontend/Dockerfile (create this)
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

EXPOSE 5173

CMD ["npm", "run", "preview"]
```

```bash
# Build image
docker build -t margdarshan-frontend:latest ./Frontend

# Run container
docker run -d \
  --name margdarshan-web \
  -p 5173:5173 \
  -e VITE_API_URL=http://backend:8888 \
  margdarshan-frontend:latest
```

### Docker Compose (Full Stack)

```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build: ./Backend
    ports:
      - "8888:8888"
    environment:
      SUPABASE_URL: ${SUPABASE_URL}
      SUPABASE_KEY: ${SUPABASE_KEY}
      BACKEND_PORT: 8888
    depends_on:
      - frontend

  frontend:
    build: ./Frontend
    ports:
      - "5173:5173"
    environment:
      VITE_API_URL: http://backend:8888
      VITE_SUPABASE_URL: ${SUPABASE_URL}
      VITE_SUPABASE_ANON_KEY: ${SUPABASE_KEY}

volumes:
  supabase_data:
```

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Cloud Deployment (AWS/GCP Ready)

**AWS ECS:**
1. Push Docker images to ECR
2. Create ECS service with task definition
3. Configure load balancer
4. Set environment variables in ECS

**Google Cloud Run:**
```bash
# Deploy backend
gcloud run deploy margdarshan-backend \
  --source ./Backend \
  --platform managed \
  --region asia-south1 \
  --set-env-vars SUPABASE_URL=$SUPABASE_URL

# Deploy frontend
gcloud run deploy margdarshan-frontend \
  --source ./Frontend \
  --platform managed \
  --region asia-south1
```

---

## Troubleshooting

### Backend Issues

**Port 8888 Already in Use**
```bash
# Windows: Find process using port
netstat -ano | findstr :8888

# Kill process
taskkill /PID <PID> /F

# Or use different port
python -m uvicorn main:app --port 8889
```

**Supabase Connection Failed**
```bash
# Check environment variables
echo $SUPABASE_URL
echo $SUPABASE_KEY

# Test connection
curl -X POST https://YOUR_PROJECT.supabase.co/auth/v1/signup \
  -H "apikey: YOUR_ANON_KEY"
```

**XGBoost Model Not Found**
```bash
# Ensure model file exists
ls -la Backend/models/risk_model.pkl

# If missing, retrain
python Backend/train_model.py
```

---

### Frontend Issues

**Blank White Screen**
```bash
# Clear cache and restart
rm -rf node_modules .vite
npm install
npm run dev
```

**CORS Error from API**
```bash
# Check VITE_API_URL in .env
cat Frontend/.env

# Ensure backend is running
curl http://localhost:8888/health
```

**Globe Not Rendering**
```bash
# Browser console should show no errors
# Check if WebGL is enabled
# Ensure canvas size is set (check Globe.jsx)
```

---

## Contributing

### Development Workflow

```bash
# 1. Create feature branch
git checkout -b feature/your-feature-name

# 2. Make changes and test locally
npm run dev  # Frontend
python -m uvicorn main:app --reload  # Backend

# 3. Commit with clear messages
git add .
git commit -m "feat: add feature description"

# 4. Push and create pull request
git push origin feature/your-feature-name
```

### Code Style

- **Python**: PEP 8 (use `black` formatter)
- **JavaScript/React**: ESLint + Prettier
- **SQL**: Use meaningful table/column names

### Testing

```bash
# Backend tests (if available)
pytest Backend/tests/

# Frontend tests (if available)
npm test
```

---

## License

This project is licensed under the **MIT License** - see [LICENSE](LICENSE) file for details.

---

## Team & Credits

**Built for India's Logistics Revolution**

- **Aman Agarwal** - Lead Developer
- **Open-Source Contributors** - Thanks for contributions!

---

## Support & Contact

- **Issues & Bugs**: GitHub Issues
- **Feature Requests**: GitHub Discussions
- **Email**: amanagarwal.exp28@gmail.com
- **Documentation**: Check `/docs` folder

---

## Getting Started (Quick Start)

**First time?** Run this:

```bash
# Clone repo
git clone https://github.com/yourusername/MargDarshan-AI.git
cd MargDarshan-AI

# Setup backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt

# Setup frontend
cd Frontend
npm install

# Create .env files (see Configuration section)

# Terminal 1: Start backend
python -m uvicorn main:app --port 8888 --reload

# Terminal 2: Start frontend
cd Frontend && npm run dev

# Open http://localhost:5173 in browser
```

**You're live!** Start creating shipments and tracking them in real-time.

---

**Last Updated**: April 23, 2026 | **Version**: v0.1.0 (Hackathon Prototype)
