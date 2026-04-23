# MargDarshan-AI — Frontend

React + Vite frontend for the MargDarshan-AI logistics platform.

## Stack

| Tool | Purpose |
|------|---------|
| React 18 + Vite | Framework + build tooling |
| Tailwind CSS | Styling (dark theme) |
| React Router v6 | Client-side routing |
| Supabase JS | Auth + real-time database |
| Leaflet / MapLibre GL | Interactive maps |
| Recharts | Data visualisation |
| axios | HTTP client |
| Lucide React | Icons |
| Groq API | AI chatbot (llama-3.1-8b-instant) |

## Setup

```bash
cd Frontend
npm install
```

Create a `.env` file:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:3000
VITE_ML_URL=http://localhost:8888
VITE_GROQ_API_KEY=your_groq_api_key   # free at https://console.groq.com
```

```bash
npm run dev   # starts at http://localhost:5173
```

## Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Landing | Public marketing page |
| `/register` | Register | Sign up with email |
| `/login` | Login | Sign in + MFA check |
| `/mfa` | TotpChallenge | TOTP verification on login |
| `/mfa/enroll` | MfaEnroll | Set up Google Authenticator |
| `/dashboard` | Dashboard | KPI overview (live Supabase data) |
| `/dashboard/map` | LiveMap | Real-time fleet tracking (Leaflet) |
| `/dashboard/shipments` | MyShipments | All shipments list + PDF reports |
| `/dashboard/new-shipment` | NewShipment | Create land or water shipment |
| `/dashboard/security` | SecurityDashboard | Threat intel + IP management |
| `/simulate` | Tracker | MapLibre simulation with risk scoring |

## Key Components

- **ChatWidget** — floating AI assistant on all dashboard pages; reads live shipment data from Supabase and passes it as context to Groq
- **Globe** — canvas-based 3D rotating globe on the landing page
- **DashboardLayout** (in `App.jsx`) — shared navbar + `<ChatWidget />` wrapper for all `/dashboard/*` routes

## Utils

| File | Purpose |
|------|---------|
| `supabase.js` | Supabase client singleton |
| `groq.js` | Groq API client — `sendMessage(history, context)` |
| `generateShipmentReport.js` | PDF report generator for fulfilled shipments |
| `idGenerator.js` | Generates `SHP-XXXX` display IDs |

## Auth Flow

1. Register → auto-redirect to `/mfa/enroll`
2. Enroll TOTP → scan QR with Google Authenticator
3. Login → password check → if MFA enrolled, redirect to `/mfa` for TOTP
4. After TOTP verified → AAL2 session → access dashboard

## Build

```bash
npm run build   # outputs to dist/
npm run preview # preview production build locally
```
