# EARTHNEX AI — Integrated Earth System Intelligence

React + Vite frontend, FastAPI backend, SQLite database (pre-built: `backend/earthnex.db`).
Frontend calls `/api/*`, which Vite proxies to the backend, so both are connected out of the box.

## Run (1 command)
- macOS / Linux: `./run.sh`
- Windows: double-click `run.bat`
- Then open http://localhost:5173

## Run manually
```bash
# terminal 1
cd backend && python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --port 8000
# terminal 2
cd frontend && npm install && npm run dev
```
Check backend: http://localhost:8000/api/health and http://localhost:8000/docs

## Single-port mode (for deployment)
`cd frontend && npm run build` -> then just run the backend; it serves `frontend/dist` at http://localhost:8000.

## Optional AI key
Copy `.env.example` to `.env`, add `ANTHROPIC_API_KEY`. Without it, a template explanation is used.

## Features
1. Interactive dark space-themed map, click anywhere to analyse, place search (geocoding)
2. NASA GIBS layers: MODIS true colour, NDVI vegetation, sea surface temperature, aerosol
3. Live hazards: NASA EONET (fires, storms, volcanoes) + USGS earthquakes, auto-refresh 5 min
4. Live snapshot (refresh 60 s): temp, humidity, wind, PM2.5, AQI, soil moisture, sea temp, river discharge
5. Risk alerts + hazards within 500 km
6. Trend engine: Mann-Kendall (seasonal for monthly) + Sen's slope, rate per decade, % per decade,
   for temperature, rainfall, soil wetness (NASA POWER), ocean waves, PM2.5
7. 5-year forecast with 95% band (annual series, linear model)
8. Cross-variable correlation (temperature / rainfall / soil wetness)
9. Mineral occurrence map + indicative prospectivity score
10. Land-to-ocean pollution pathway: click a river line (Ganga, Yamuna, Godavari, Mahanadi, Narmada)
11. AI scientific explanation (Claude API, template fallback)
12. Saved locations stored in SQLite; request log; API cache with stale fallback

## Database tables (SQLite)
cache, minerals, rivers, saved_locations, query_log

## Honest limitations (say these to judges)
- Forecast is a linear trend + band, not a physical/ML model (next: Prophet/LSTM).
- Mineral occurrences and river paths are illustrative seeded data (next: USGS MRDS, GSI, HydroSHEDS).
- Pathway is indicative (coarse waypoints, assumed flow speed), not hydrodynamic.
- PM2.5 trend uses a short record (from Aug 2022), so treat it as preliminary.
- Some satellite layer IDs / upstream endpoints may change; failed layers simply show blank.
