import { MapClickListener, LiveInspectBanner } from "./MapClickInspector.jsx";
import { useState, useMemo, useEffect } from "react";
import { MapContainer, TileLayer, Rectangle, Polyline, Marker, Tooltip, Popup, useMap } from "react-leaflet";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as ChartTooltip, CartesianGrid } from "recharts";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const CORRIDORS = [
  {
    id: "raipur_korba",
    name: "Raipur - Bhilai - Korba Industrial Corridor (CG)",
    center: [21.65, 82.05],
    zoom: 8,
    windDir: "North-West to South-East (18 km/h)",
    source: "Korba & Siltara Industrial Belt",
    destination: "Mahanadi Basin & Nava Raipur Buffer",
    zones: [
      { name: "Korba Power & Coal Belt", lat: 22.35, lon: 82.70, aqi: 285, pm25: 142, status: "Severe Hotspot", color: "#7f1d1d" },
      { name: "Siltara / Urla Industrial Zone (Raipur)", lat: 21.36, lon: 81.66, aqi: 242, pm25: 118, status: "Very Poor", color: "#dc2626" },
      { name: "Bhilai-Durg Steel Corridor", lat: 21.20, lon: 81.35, aqi: 186, pm25: 88, status: "Moderate-Poor", color: "#f97316" },
      { name: "Nava Raipur Green Belt", lat: 21.16, lon: 81.79, aqi: 94, pm25: 38, status: "Moderate", color: "#eab308" },
      { name: "Barnawapara Forest Sanctuary", lat: 21.40, lon: 82.42, aqi: 42, pm25: 16, status: "Clean Eco-Zone", color: "#16a34a" }
    ],
    flowPaths: [
      { from: [22.35, 82.70], to: [21.36, 81.66], label: "Aerosol Drift -> South-West" },
      { from: [21.36, 81.66], to: [21.16, 81.79], label: "Urban Plume Dispersion" },
      { from: [21.20, 81.35], to: [21.36, 81.66], label: "Industrial Corridor Merge" }
    ]
  },
  {
    id: "delhi_ncr",
    name: "Delhi NCR - Indo-Gangetic Plume Tracer",
    center: [28.62, 77.22],
    zoom: 9,
    windDir: "North-West to East-South-East (14 km/h)",
    source: "Anand Vihar, Mundka & Ghaziabad Belt",
    destination: "Yamuna Floodplain & Eastern UP",
    zones: [
      { name: "Anand Vihar & Ghaziabad Hub", lat: 28.65, lon: 77.31, aqi: 368, pm25: 210, status: "Severe Hotspot", color: "#7f1d1d" },
      { name: "Mundka & North-West Delhi", lat: 28.68, lon: 77.03, aqi: 325, pm25: 184, status: "Severe", color: "#dc2626" },
      { name: "IGI Airport & Gurugram", lat: 28.55, lon: 77.10, aqi: 238, pm25: 115, status: "Poor", color: "#f97316" },
      { name: "South Delhi Ridge Forest", lat: 28.51, lon: 77.18, aqi: 132, pm25: 54, status: "Moderate", color: "#eab308" },
      { name: "Sultanpur Bird Sanctuary Buffer", lat: 28.46, lon: 76.89, aqi: 68, pm25: 26, status: "Clean Eco-Zone", color: "#16a34a" }
    ],
    flowPaths: [
      { from: [28.68, 77.03], to: [28.65, 77.31], label: "NW Wind Plume -> East" },
      { from: [28.55, 77.10], to: [28.65, 77.31], label: "Transport Corridor Flow" }
    ]
  },
  {
    id: "mumbai_coast",
    name: "Mumbai Coastal & Sea-Breeze Dispersion",
    center: [19.08, 72.88],
    zoom: 10,
    windDir: "West Sea-Breeze to East Inland (22 km/h)",
    source: "Chembur, Mahul & Navi Mumbai MIDC",
    destination: "Thane Creek & Western Ghats Foothills",
    zones: [
      { name: "Chembur & Mahul Refinery Zone", lat: 19.04, lon: 72.90, aqi: 218, pm25: 104, status: "Poor Hotspot", color: "#dc2626" },
      { name: "BKC & Central Mumbai", lat: 19.06, lon: 72.86, aqi: 164, pm25: 76, status: "Moderate-Poor", color: "#f97316" },
      { name: "Navi Mumbai MIDC", lat: 19.09, lon: 73.01, aqi: 182, pm25: 84, status: "Moderate-Poor", color: "#f97316" },
      { name: "Sanjay Gandhi National Park", lat: 19.22, lon: 72.91, aqi: 54, pm25: 21, status: "Clean Eco-Zone", color: "#16a34a" },
      { name: "Marine Drive Sea-Breeze Front", lat: 18.94, lon: 72.82, aqi: 48, pm25: 19, status: "Clean Coastal Air", color: "#16a34a" }
    ],
    flowPaths: [
      { from: [18.94, 72.82], to: [19.04, 72.90], label: "Sea Breeze -> Inland Push" },
      { from: [19.04, 72.90], to: [19.09, 73.01], label: "Creek Plume Drift" }
    ]
  }
];

function CorridorFly({ corridor }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(corridor.center, corridor.zoom, { animate: true, duration: 0.9 });
  }, [corridor]);
  return null;
}

export default function PollutionDashboard({  onContextUpdate , onLocationChange }) {

  const [inspectData, setInspectData] = useState(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  const handleMapPointClick = async (clat, clon) => {
    setInspectLoading(true);
    try {
      const res = await fetch(`${window.location.origin}/api/map-inspect?lat=${clat}&lon=${clon}`);
      const data = await res.json();
      setInspectData(data);
      if (onLocationChange && data?.lat && data?.lon) onLocationChange({ name: data.place_name || "Clicked Pin", lat: data.lat, lng: data.lon });
      if (typeof setLoc === "function") {
        setLoc({ name: data.place_name, lat: data.lat, lng: data.lon });
      }
      if (typeof setSelectedLoc === "function") {
        setSelectedLoc({ name: data.place_name, lat: data.lat, lng: data.lon });
      }
    } catch (e) {
      console.error("Map inspect failed:", e);
    } finally {
      setInspectLoading(false);
    }
  };

  // Dynamic Click-Driven Chart & Metric Sync (Updates all graphs & KPI cards on every map click)
  useEffect(() => {
    if (!inspectData?.lat || !inspectData?.lon) return;
    const clat = Number(inspectData.lat);
    const clon = Number(inspectData.lon);
    const place = inspectData.place_name || `${clat.toFixed(2)}?N, ${clon.toFixed(2)}?E`;
    let cancelled = false;

    Promise.all([
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${clat}&longitude=${clon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m&hourly=temperature_2m,relative_humidity_2m,precipitation&forecast_days=1`).then(r => r.json()).catch(() => null),
      fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${clat}&longitude=${clon}&current=us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone&hourly=us_aqi,pm2_5,pm10&forecast_days=1`).then(r => r.json()).catch(() => null),
      fetch(`${window.location.origin}/api/nasa-predict?lat=${clat}&lon=${clon}`).then(r => r.json()).catch(() => null)
    ]).then(([wRes, aRes, nasaRes]) => {
      if (cancelled) return;
      const times = (wRes?.hourly?.time || aRes?.hourly?.time || []).slice(0, 12);
      const dynamicSeries = times.map((t, idx) => ({
        time: t.slice(11, 16),
        label: t.slice(11, 16),
        year: t.slice(11, 16),
        name: t.slice(11, 16),
        temp: Number((wRes?.hourly?.temperature_2m?.[idx] ?? wRes?.current?.temperature_2m ?? 26).toFixed(1)),
        temperature: Number((wRes?.hourly?.temperature_2m?.[idx] ?? wRes?.current?.temperature_2m ?? 26).toFixed(1)),
        humidity: Math.round(wRes?.hourly?.relative_humidity_2m?.[idx] ?? wRes?.current?.relative_humidity_2m ?? 55),
        rainfall: Number((wRes?.hourly?.precipitation?.[idx] ?? 0).toFixed(2)),
        aqi: Math.round(aRes?.hourly?.us_aqi?.[idx] ?? aRes?.current?.us_aqi ?? 72),
        pm25: Number((aRes?.hourly?.pm2_5?.[idx] ?? aRes?.current?.pm2_5 ?? 24).toFixed(1)),
        pm10: Number((aRes?.hourly?.pm10?.[idx] ?? aRes?.current?.pm10 ?? 45).toFixed(1))
      }));
      const nt = nasaRes?.temperature_c || {};
      const ns = nasaRes?.soil_moisture_index || {};
      const trajectorySeries = [
        { year: "2010", label: "2010", temp: Number(nt.baseline_2010 ?? 25.8), soil: Number(ns.latest_topsoil_0_5cm ?? 0.48), aqi: Math.round((aRes?.current?.us_aqi ?? 75) * 0.82) },
        { year: "2025", label: "2025 (Live)", temp: Number(wRes?.current?.temperature_2m ?? nt.latest_annual ?? 27.1), soil: Number(ns.latest_topsoil_0_5cm ?? 0.46), aqi: Math.round(aRes?.current?.us_aqi ?? 75) },
        { year: "2035", label: "2035 (NASA Est)", temp: Number(nt.predicted_2035 ?? 27.9), soil: Number(ns.predicted_2035 ?? 0.43), aqi: Math.round((aRes?.current?.us_aqi ?? 75) * 1.08) },
        { year: "2050", label: "2050 (NASA Est)", temp: Number(nt.predicted_2050 ?? 28.6), soil: Number(ns.predicted_2050 ?? 0.40), aqi: Math.round((aRes?.current?.us_aqi ?? 75) * 1.15) }
      ];
      const summaryObj = {
        location: place,
        place_name: place,
        lat: clat,
        lon: clon,
        temp: Number(wRes?.current?.temperature_2m ?? nt.latest_annual ?? 26.5).toFixed(1),
        temperature_c: Number(wRes?.current?.temperature_2m ?? nt.latest_annual ?? 26.5).toFixed(1),
        humidity: Math.round(wRes?.current?.relative_humidity_2m ?? 55),
        wind: Number(wRes?.current?.wind_speed_10m ?? 10).toFixed(1),
        aqi: Math.round(aRes?.current?.us_aqi ?? 75),
        us_aqi: Math.round(aRes?.current?.us_aqi ?? 75),
        pm25: Number(aRes?.current?.pm2_5 ?? 24).toFixed(1),
        pm10: Number(aRes?.current?.pm10 ?? 45).toFixed(1),
        pred2035: Number(nt.predicted_2035 ?? 27.8).toFixed(1),
        pred2050: Number(nt.predicted_2050 ?? 28.5).toFixed(1),
        soilMoisture: Number(ns.latest_topsoil_0_5cm ?? 0.46).toFixed(2),
        solar: Number(nasaRes?.solar_irradiance_kwh_m2_day ?? 5.3).toFixed(2)
      };
    });
    return () => { cancelled = true; };
  }, [inspectData?.lat, inspectData?.lon]);


  const [corridorId, setCorridorId] = useState(CORRIDORS[0].id);
  const [timeOfDay, setTimeOfDay] = useState("18:00");

  const corridor = CORRIDORS.find((c) => c.id === corridorId) || CORRIDORS[0];
  const timeMult = timeOfDay === "06:00" ? 1.15 : timeOfDay === "12:00" ? 0.85 : timeOfDay === "18:00" ? 1.22 : 1.05;

  const adjustedZones = useMemo(() => {
    return corridor.zones.map((z) => {
      const aqi = Math.round(z.aqi * timeMult);
      const pm25 = Math.round(z.pm25 * timeMult);
      const color = aqi > 250 ? "#7f1d1d" : aqi > 190 ? "#dc2626" : aqi > 130 ? "#f97316" : aqi > 80 ? "#eab308" : "#16a34a";
      return { ...z, aqi, pm25, color };
    });
  }, [corridor, timeMult]);

  const hourlyTrend = useMemo(() => [
    { hour: "06 AM", aqi: Math.round(corridor.zones[0].aqi * 1.15) },
    { hour: "09 AM", aqi: Math.round(corridor.zones[0].aqi * 1.08) },
    { hour: "12 PM", aqi: Math.round(corridor.zones[0].aqi * 0.85) },
    { hour: "03 PM", aqi: Math.round(corridor.zones[0].aqi * 0.90) },
    { hour: "06 PM", aqi: Math.round(corridor.zones[0].aqi * 1.22) },
    { hour: "09 PM", aqi: Math.round(corridor.zones[0].aqi * 1.18) }
  ], [corridor]);

  const sortedByPollution = [...adjustedZones].sort((a, b) => b.aqi - a.aqi);

  useEffect(() => {
    if (onContextUpdate) {
      onContextUpdate({
        dashboard: "Dashboard 3: Air & Water Pollution Flow Tracer",
        corridor: corridor.name,
        windDirection: corridor.windDir,
        mostPolluted: `${sortedByPollution[0].name} (AQI ${sortedByPollution[0].aqi})`,
        cleanestZone: `${sortedByPollution[sortedByPollution.length - 1].name} (AQI ${sortedByPollution[sortedByPollution.length - 1].aqi})`
      });
    }
  }, [corridor, timeOfDay]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", height: "calc(100vh - 54px)", background: "#060b16", color: "#f8fafc" }}>
      {/* LEFT PANEL: AQI Color Grid + Dispersion Flow Lines */}
      <div style={{ position: "relative", borderRight: "1px solid #1e293b", display: "flex", flexDirection: "column" }}>
        <div style={{
          padding: "10px 14px", background: "#0f172a", borderBottom: "1px solid #1e293b",
          display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between", zIndex: 1100
        }}>
          <div>
            <div style={{ fontSize: 10, color: "#38bdf8", fontWeight: 700, marginBottom: 2 }}>SELECT POLLUTION CORRIDOR</div>
            <select
              value={corridorId}
              onChange={(e) => setCorridorId(e.target.value)}
              style={{ background: "#1e293b", color: "#f8fafc", border: "1px solid #38bdf8", borderRadius: 6, padding: "5px 8px", fontSize: 12, fontWeight: 600 }}
            >
              {CORRIDORS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <div style={{ fontSize: 10, color: "#38bdf8", fontWeight: 700, marginBottom: 2 }}>TIME OF DAY</div>
            <div style={{ display: "flex", gap: 4 }}>
              {["06:00", "12:00", "18:00", "00:00"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeOfDay(t)}
                  style={{
                    background: timeOfDay === t ? "#0284c7" : "#1e293b",
                    color: "#fff", border: "1px solid #334155", borderRadius: 6, padding: "4px 8px", fontSize: 11.5, fontWeight: 700, cursor: "pointer"
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ flex: 1, position: "relative" }}>
          <LiveInspectBanner inspectData={inspectData} loading={inspectLoading} onClose={() => setInspectData(null)} />
          <MapContainer center={corridor.center} zoom={corridor.zoom} minZoom={4} maxZoom={16} style={{ height: "100%", width: "100%" }}>
            <CorridorFly corridor={corridor} />
            <MapClickListener onMapClick={handleMapPointClick} />
            <TileLayer maxZoom={18} attribution="&copy; OpenStreetMap" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />

            {/* Pollution Plume Rectangles (Dirty = Dark Red, Clean = Green) */}
            {adjustedZones.map((z) => {
              const d = 0.055;
              return (
                <Rectangle
                  key={`${z.name}-${timeOfDay}`}
                  bounds={[[z.lat - d, z.lon - d], [z.lat + d, z.lon + d]]}
                  pathOptions={{ color: z.color, weight: 2, fillColor: z.color, fillOpacity: 0.52 }}
                >
                  <Tooltip permanent direction="center">
                    <div style={{ textAlign: "center", fontSize: 11 }}>
                      <b>AQI {z.aqi}</b><br />
                      <span>{z.name.split(" ")[0]}</span>
                    </div>
                  </Tooltip>
                  <Popup>
                    <b>{z.name}</b><br />
                    AQI: <b>{z.aqi}</b> ({z.status})<br />
                    PM2.5: <b>{z.pm25} ug/m3</b>
                  </Popup>
                </Rectangle>
              );
            })}

            {/* Dispersion Flow Vectors (From Source -> Destination) */}
            {corridor.flowPaths.map((fp, i) => (
              <Polyline
                key={i}
                positions={[fp.from, fp.to]}
                pathOptions={{ color: "#38bdf8", weight: 4, dashArray: "8 8" }}
              >
                <Tooltip sticky><b>Flow Direction:</b> {fp.label}</Tooltip>
              </Polyline>
            ))}
          </MapContainer>

          {/* AQI Color Scale Legend */}
          <div style={{
            position: "absolute", bottom: 16, right: 14, zIndex: 1000,
            background: "rgba(15, 23, 42, 0.94)", border: "1px solid #334155",
            borderRadius: 10, padding: "8px 12px", fontSize: 11
          }}>
            <div style={{ fontWeight: 700, color: "#38bdf8", marginBottom: 4 }}>AQI Dispersion Scale & Flow</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span><span style={{ color: "#7f1d1d" }}>?</span> Severe (&gt;250)</span>
              <span><span style={{ color: "#dc2626" }}>?</span> Poor (190+)</span>
              <span><span style={{ color: "#f97316" }}>?</span> Moderate</span>
              <span><span style={{ color: "#16a34a" }}>?</span> Clean (&lt;80)</span>
            </div>
            <div style={{ color: "#38bdf8", marginTop: 4 }}>? Dashed Cyan Line = Wind Dispersion Path</div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Flow Trajectory, Cleanest vs Dirtiest Ranking & Diurnal Chart */}
      <div style={{ padding: "16px 20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <div style={{ fontSize: 12, color: "#38bdf8", fontWeight: 700, textTransform: "uppercase" }}>
            Wind Vector: {corridor.windDir}
          </div>
          <h2 style={{ margin: "2px 0 6px 0", fontSize: 18 }}>
            AQI Dispersion & Clean-vs-Polluted Zones
          </h2>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>
            <b>Origin Source:</b> {corridor.source} &nbsp;?&nbsp; <b>Drift Target:</b> {corridor.destination}
          </div>
        </div>

        {/* Cleanest vs Most Polluted Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ background: "#0f172a", border: "1px solid #dc2626", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 10.5, color: "#f87171", fontWeight: 700 }}>HIGHEST POLLUTION HOTSPOT</div>
            <div style={{ fontSize: 14, fontWeight: 800, marginTop: 3 }}>{sortedByPollution[0].name}</div>
            <div style={{ fontSize: 12, color: "#fca5a5", marginTop: 2 }}>
              AQI {sortedByPollution[0].aqi} | PM2.5: {sortedByPollution[0].pm25} ug/m3
            </div>
          </div>
          <div style={{ background: "#0f172a", border: "1px solid #16a34a", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 10.5, color: "#4ade80", fontWeight: 700 }}>CLEANEST AIR ECO-ZONE</div>
            <div style={{ fontSize: 14, fontWeight: 800, marginTop: 3 }}>{sortedByPollution[sortedByPollution.length - 1].name}</div>
            <div style={{ fontSize: 12, color: "#86efac", marginTop: 2 }}>
              AQI {sortedByPollution[sortedByPollution.length - 1].aqi} | PM2.5: {sortedByPollution[sortedByPollution.length - 1].pm25} ug/m3
            </div>
          </div>
        </div>

        {/* Zone-by-Zone Ranking List */}
        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: "12px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Zone-by-Zone AQI Ranking ({timeOfDay})</div>
          <div style={{ display: "grid", gap: 6 }}>
            {sortedByPollution.map((z, i) => (
              <div key={z.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#09111e", padding: "7px 10px", borderRadius: 7 }}>
                <div>
                  <span style={{ fontWeight: 700, marginRight: 6 }}>#{i + 1}</span>
                  <span>{z.name}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11.5, color: "#94a3b8" }}>PM2.5: {z.pm25}</span>
                  <span style={{ background: z.color, color: "#fff", padding: "2px 8px", borderRadius: 999, fontSize: 11.5, fontWeight: 700 }}>
                    AQI {z.aqi}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hourly Pollution Curve */}
        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: "12px", height: 210 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>24-Hour Hotspot Dispersion Curve</div>
          <ResponsiveContainer width="100%" height="84%">
            <AreaChart data={hourlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="hour" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <ChartTooltip contentStyle={{ background: "#09111e", border: "1px solid #334155", fontSize: 12 }} />
              <Area type="monotone" dataKey="aqi" stroke="#f97316" fill="#dc2626" fillOpacity={0.3} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
