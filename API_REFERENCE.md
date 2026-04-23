# MargDarshan-AI: Complete API Reference

**Base URL**: `http://localhost:8888`
**API Docs**: `http://localhost:8888/docs`

---

## Table of Contents

1. [Authentication](#authentication)
2. [Shipments](#shipments)
3. [Tracking](#tracking)
4. [Risk Scoring](#risk-scoring)
5. [Route Optimization](#route-optimization)
6. [Alerts](#alerts)
7. [Health and Status](#health-and-status)

---

## Authentication

All endpoints (except `/health` and `/docs`) require JWT token in header:

```bash
Authorization: Bearer YOUR_JWT_TOKEN
```

### Get JWT Token (Login)

**Endpoint**: `POST /auth/login` (via Supabase)

```javascript
// Frontend (automatic)
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});

// Token is in: data.session.access_token
```

**Manual cURL**:
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/auth/v1/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "password",
    "email": "user@example.com",
    "password": "password123"
  }' \
  -d "?apikey=YOUR_ANON_KEY"
```

---

## Shipments

### Create Shipment

**Endpoint**: `POST /api/shipments/create`

**Request**:
```bash
curl -X POST http://localhost:8888/api/shipments/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "type": "land",
    "source": {
      "name": "Mumbai",
      "lat": 19.0760,
      "lng": 72.8777
    },
    "destination": {
      "name": "Pune",
      "lat": 18.5204,
      "lng": 73.8567
    },
    "vehicle_type": "Heavy Truck (>12T)"
  }'
```

**Response** (201 Created):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "display_id": "SHP-001",
  "type": "land",
  "status": "in_transit",
  "source": {
    "name": "Mumbai",
    "lat": 19.0760,
    "lng": 72.8777
  },
  "destination": {
    "name": "Pune",
    "lat": 18.5204,
    "lng": 73.8567
  },
  "vehicle_type": "Heavy Truck (>12T)",
  "route_meta": {
    "distance_km": 148.5,
    "eta_hours": 3.2,
    "fuel_required_tons": 12.5,
    "waypoints": [
      [19.0760, 72.8777],
      [19.0500, 72.9000],
      [18.8500, 73.5000],
      [18.5204, 73.8567]
    ]
  },
  "created_at": "2026-04-23T10:00:00Z",
  "updated_at": "2026-04-23T10:00:00Z"
}
```

---

### Get All Shipments

**Endpoint**: `GET /api/shipments`

**Query Parameters**:
```
?status=in_transit        # Filter by status
?limit=10                 # Max results
?offset=0                 # Pagination offset
```

**Request**:
```bash
curl -X GET "http://localhost:8888/api/shipments?status=in_transit&limit=20" \
  -H "Authorization: Bearer $TOKEN"
```

**Response** (200 OK):
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "display_id": "SHP-001",
    "type": "land",
    "status": "in_transit",
    "source": {...},
    "destination": {...},
    "vehicle_type": "Heavy Truck (>12T)",
    "route_meta": {...},
    "created_at": "2026-04-23T10:00:00Z"
  },
  ...
]
```

---

### Get Shipment by ID

**Endpoint**: `GET /api/shipments/{shipment_id}`

**Request**:
```bash
curl -X GET "http://localhost:8888/api/shipments/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer $TOKEN"
```

**Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "display_id": "SHP-001",
  "type": "land",
  "status": "in_transit",
  "source": {...},
  "destination": {...},
  "vehicle_type": "Heavy Truck (>12T)",
  "route_meta": {...},
  "created_at": "2026-04-23T10:00:00Z",
  "updated_at": "2026-04-23T10:00:00Z"
}
```

---

### Update Shipment Status

**Endpoint**: `PATCH /api/shipments/{shipment_id}`

**Request**:
```bash
curl -X PATCH "http://localhost:8888/api/shipments/550e8400-e29b-41d4-a716-446655440000" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "status": "fulfilled"
  }'
```

**Allowed Status Values**:
```
in_transit    # Currently moving
fulfilled     # Delivered successfully
cancelled     # Aborted/cancelled
```

**Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "display_id": "SHP-001",
  "status": "fulfilled",
  "updated_at": "2026-04-23T10:30:00Z"
}
```

---

### Update Shipment Route (Reroute)

**Endpoint**: `PATCH /api/shipments/{shipment_id}/reroute`

**Request**:
```bash
curl -X PATCH "http://localhost:8888/api/shipments/550e8400-e29b-41d4-a716-446655440000/reroute" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "reason": "weather_risk",
    "new_destination": {
      "name": "Nashik",
      "lat": 19.9975,
      "lng": 73.7898
    }
  }'
```

**Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "display_id": "SHP-001",
  "status": "in_transit",
  "destination": {
    "name": "Nashik",
    "lat": 19.9975,
    "lng": 73.7898
  },
  "route_meta": {
    "distance_km": 175.0,
    "eta_hours": 4.0,
    "waypoints": [...]
  },
  "updated_at": "2026-04-23T10:35:00Z"
}
```

---

## Tracking

### Get Current Position

**Endpoint**: `GET /api/tracking/{shipment_id}/position`

**Request**:
```bash
curl -X GET "http://localhost:8888/api/tracking/550e8400-e29b-41d4-a716-446655440000/position" \
  -H "Authorization: Bearer $TOKEN"
```

**Response** (200 OK):
```json
{
  "shipment_id": "550e8400-e29b-41d4-a716-446655440000",
  "latitude": 19.087,
  "longitude": 72.915,
  "timestamp": "2026-04-23T10:15:00Z",
  "risk_score": 15.5,
  "status": "in_transit",
  "eta_arrival": "2026-04-23T13:30:00Z",
  "distance_remaining_km": 50.2
}
```

---

### Get Position History

**Endpoint**: `GET /api/tracking/{shipment_id}/history`

**Query Parameters**:
```
?limit=100       # Max positions to return
?time_range=1h   # Time range (1h, 24h, 7d, all)
```

**Request**:
```bash
curl -X GET "http://localhost:8888/api/tracking/550e8400-e29b-41d4-a716-446655440000/history?limit=50&time_range=1h" \
  -H "Authorization: Bearer $TOKEN"
```

**Response** (200 OK):
```json
[
  {
    "latitude": 19.0760,
    "longitude": 72.8777,
    "timestamp": "2026-04-23T10:00:00Z",
    "risk_score": 12.0
  },
  {
    "latitude": 19.0700,
    "longitude": 72.8900,
    "timestamp": "2026-04-23T10:05:00Z",
    "risk_score": 14.5
  },
  ...
]
```

---

### Update Position (Simulate/Real)

**Endpoint**: `POST /api/tracking/{shipment_id}/update-position`

**Request**:
```bash
curl -X POST "http://localhost:8888/api/tracking/550e8400-e29b-41d4-a716-446655440000/update-position" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "latitude": 19.087,
    "longitude": 72.915,
    "risk_score": 15.5
  }'
```

**Response** (200 OK):
```json
{
  "success": true,
  "shipment_id": "550e8400-e29b-41d4-a716-446655440000",
  "position": {
    "latitude": 19.087,
    "longitude": 72.915,
    "timestamp": "2026-04-23T10:15:00Z"
  }
}
```

---

## Risk Scoring

### Calculate Risk Score

**Endpoint**: `POST /api/risk/score`

**Request**:
```bash
curl -X POST "http://localhost:8888/api/risk/score" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "latitude": 19.087,
    "longitude": 72.915,
    "shipment_type": "land"
  }'
```

**Response** (200 OK):
```json
{
  "latitude": 19.087,
  "longitude": 72.915,
  "risk_score": 25.3,
  "components": {
    "weather_risk": 8.5,
    "terrain_risk": 5.0,
    "traffic_risk": 8.0,
    "civil_unrest_risk": 2.5,
    "maritime_risk": 0.0
  },
  "status": "low_risk",
  "recommendation": "Safe to proceed",
  "timestamp": "2026-04-23T10:15:00Z"
}
```

**Response Levels**:
```
0-20:    LOW_RISK      > Safe, continue
21-50:   MEDIUM_RISK   > Monitor, prepare alternate
51-79:   HIGH_RISK     > Get alternate ready
80-100:  CRITICAL_RISK > REROUTE IMMEDIATELY
```

---

### Get Risk Heatmap

**Endpoint**: `GET /api/risk/heatmap`

**Query Parameters**:
```
?bounds=19.0,72.8,19.2,73.0    # lat_min,lng_min,lat_max,lng_max
?resolution=0.1                 # Grid size in degrees
```

**Request**:
```bash
curl -X GET "http://localhost:8888/api/risk/heatmap?bounds=19.0,72.8,19.2,73.0&resolution=0.1" \
  -H "Authorization: Bearer $TOKEN"
```

**Response** (200 OK):
```json
[
  {
    "latitude": 19.0,
    "longitude": 72.8,
    "risk_score": 15.0
  },
  {
    "latitude": 19.0,
    "longitude": 72.9,
    "risk_score": 22.5
  },
  ...
]
```

---

## Route Optimization

### Calculate Optimal Route

**Endpoint**: `POST /api/routes/optimize`

**Request**:
```bash
curl -X POST "http://localhost:8888/api/routes/optimize" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "type": "land",
    "source": {
      "name": "Mumbai",
      "lat": 19.0760,
      "lng": 72.8777
    },
    "destination": {
      "name": "Pune",
      "lat": 18.5204,
      "lng": 73.8567
    }
  }'
```

**Response** (200 OK):
```json
{
  "distance_km": 148.5,
  "duration_hours": 3.2,
  "fuel_required_tons": 12.5,
  "waypoints": [
    [19.0760, 72.8777],
    [19.0500, 72.9000],
    [18.8500, 73.5000],
    [18.5204, 73.8567]
  ],
  "risk_profile": "low_risk",
  "avg_risk_score": 18.5,
  "estimated_fuel_cost": 2500,
  "timestamp": "2026-04-23T10:15:00Z"
}
```

---

### Get Smart Route (Water Routes)

**Endpoint**: `POST /api/routes/smart-route`

**Request**:
```bash
curl -X POST "http://localhost:8888/api/routes/smart-route" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "source": [19.0760, 72.8777],
    "destination": [8.7426, 77.7225],
    "vessel_type": "container_ship"
  }'
```

**Response** (200 OK):
```json
{
  "waypoints": [
    [19.0760, 72.8777],
    [15.5000, 74.0000],
    [10.0000, 75.5000],
    [8.7426, 77.7225]
  ],
  "distance_nm": 650,
  "estimated_days": 2.7,
  "weather_analysis": {
    "wave_height_m": 2.5,
    "wind_speed_knots": 12,
    "swell_direction": "SW",
    "recommendation": "Good conditions for transit"
  },
  "risk_score": 22.0
}
```

---

## Alerts

### Get Alerts for Shipment

**Endpoint**: `GET /api/alerts/{shipment_id}`

**Query Parameters**:
```
?unread_only=true    # Only unread alerts
?severity=high       # Filter by severity
?limit=50            # Max results
```

**Request**:
```bash
curl -X GET "http://localhost:8888/api/alerts/550e8400-e29b-41d4-a716-446655440000?unread_only=true" \
  -H "Authorization: Bearer $TOKEN"
```

**Response** (200 OK):
```json
[
  {
    "id": "alert-uuid-1",
    "shipment_id": "550e8400-e29b-41d4-a716-446655440000",
    "alert_type": "weather_warning",
    "message": "Heavy rainfall detected on route. Risk increased to 85%.",
    "severity": "high",
    "created_at": "2026-04-23T10:30:00Z",
    "read_at": null
  },
  {
    "id": "alert-uuid-2",
    "shipment_id": "550e8400-e29b-41d4-a716-446655440000",
    "alert_type": "reroute_triggered",
    "message": "Automatic reroute activated. New ETA: 14:00 (30 min delay).",
    "severity": "medium",
    "created_at": "2026-04-23T10:31:00Z",
    "read_at": "2026-04-23T10:31:30Z"
  }
]
```

**Alert Types**:
```
weather_warning      # Weather risk spike
terrain_warning      # Landslide/road hazard
traffic_alert        # Congestion detected
unrest_alert         # Protests/closures
reroute_triggered    # Auto-rerouting activated
eta_update           # ETA changed
delivery_complete    # Shipment delivered
```

---

### Create Alert

**Endpoint**: `POST /api/alerts`

**Request** (Admin only):
```bash
curl -X POST "http://localhost:8888/api/alerts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "shipment_id": "550e8400-e29b-41d4-a716-446655440000",
    "alert_type": "manual_alert",
    "message": "Road closure detected near Nashik. Recommend reroute.",
    "severity": "high"
  }'
```

**Response** (201 Created):
```json
{
  "id": "alert-uuid-3",
  "shipment_id": "550e8400-e29b-41d4-a716-446655440000",
  "alert_type": "manual_alert",
  "message": "Road closure detected near Nashik. Recommend reroute.",
  "severity": "high",
  "created_at": "2026-04-23T10:35:00Z"
}
```

---

### Mark Alert as Read

**Endpoint**: `PATCH /api/alerts/{alert_id}`

**Request**:
```bash
curl -X PATCH "http://localhost:8888/api/alerts/alert-uuid-1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "read_at": "2026-04-23T10:40:00Z"
  }'
```

**Response** (200 OK):
```json
{
  "id": "alert-uuid-1",
  "read_at": "2026-04-23T10:40:00Z"
}
```

---

## Health and Status

### Health Check

**Endpoint**: `GET /health`

**No Authentication Required**

**Request**:
```bash
curl http://localhost:8888/health
```

**Response** (200 OK):
```json
{
  "status": "ok",
  "version": "0.1.0",
  "timestamp": "2026-04-23T10:15:00Z"
}
```

---

### API Status

**Endpoint**: `GET /status`

**Request**:
```bash
curl http://localhost:8888/status
```

**Response** (200 OK):
```json
{
  "api": "operational",
  "database": "connected",
  "weather_api": "operational",
  "routing_service": "operational",
  "risk_model": "loaded",
  "uptime_seconds": 3600,
  "active_shipments": 12
}
```

---

## Error Responses

### Validation Error

```json
{
  "detail": [
    {
      "loc": ["body", "latitude"],
      "msg": "value is not a valid number",
      "type": "type_error.number"
    }
  ]
}
```

**Status**: 422 Unprocessable Entity

---

### Unauthorized

```json
{
  "detail": "Not authenticated"
}
```

**Status**: 401 Unauthorized

---

### Not Found

```json
{
  "detail": "Shipment not found"
}
```

**Status**: 404 Not Found

---

### Server Error

```json
{
  "detail": "Internal server error"
}
```

**Status**: 500 Internal Server Error

---

## Rate Limiting

**Default Limits** (if implemented):
```
- Login attempts: 5 per minute
- API calls: 1000 per hour per user
- File uploads: 50MB per request
```

---

## Pagination

For list endpoints returning many results:

```bash
# Get first 20 results
curl "http://localhost:8888/api/shipments?limit=20&offset=0"

# Get next 20
curl "http://localhost:8888/api/shipments?limit=20&offset=20"
```

---

## Testing with Postman/Insomnia

1. **Import Base URL**: `http://localhost:8888`
2. **Set Authorization Header**:
   ```
   Header: Authorization
   Value: Bearer YOUR_JWT_TOKEN
   ```
3. **Use Example Requests** from above

---

**Last Updated**: April 23, 2026
