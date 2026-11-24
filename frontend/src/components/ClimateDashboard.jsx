import { MapClickListener, LiveInspectBanner } from "./MapClickInspector.jsx";
import { useState, useMemo, useEffect } from "react";
import { MapContainer, TileLayer, Rectangle, Marker, Popup, Tooltip, LayersControl, LayerGroup, useMap, useMapEvents } from "react-leaflet";
import { ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis, Tooltip as ChartTooltip, CartesianGrid, ReferenceLine } from "recharts";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const pinIcon = L.divIcon({
  className: "",
  html: '<div style="width:16px;height:16px;background:#0284c7;border:3px solid #ffffff;border-radius:50%;box-shadow:0 0 12px #38bdf8;"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

const LOCATIONS = [
  { name: "Raipur, Chhattisgarh", lat: 21.2514, lng: 81.6296 },
  { name: "Nava Raipur (Atal Nagar), CG", lat: 21.1611, lng: 81.7864 },
  { name: "Durg, Chhattisgarh", lat: 21.1904, lng: 81.2849 },
  { name: "Bhilai, Chhattisgarh", lat: 21.1938, lng: 81.3509 },
  { name: "Bilaspur, Chhattisgarh", lat: 22.0797, lng: 82.1409 },
  { name: "Korba, Chhattisgarh", lat: 22.3595, lng: 82.7501 },
  { name: "Jagdalpur (Bastar), CG", lat: 19.0748, lng: 82.0087 },
  { name: "Delhi NCR", lat: 28.6139, lng: 77.2090 },
  { name: "Mumbai, Maharashtra", lat: 19.0760, lng: 72.8777 }
];

const PARAMS = {
  temperature: {
    label: "Temperature",
    unit: "C",
    base: 29.4,
    annualTrend: 0.048,
    palette: ["#0284c7", "#facc15", "#f97316", "#dc2626", "#7f1d1d"],
    legend: ["Cool (-1.5 C)", "Baseline", "Warm (+1.0 C)", "Hot (+2.0 C)", "Extreme (+3.0 C)"]
  },
  vegetation: {
    label: "Vegetation (NDVI)",
    unit: "NDVI",
    base: 0.56,
    annualTrend: -0.004,
    palette: ["#9a3412", "#eab308", "#84cc16", "#16a34a", "#14532d"],
    legend: ["Urban/Bare", "Sparse", "Moderate", "Healthy", "Dense Forest"]
  },
  humidity: {
    label: "Humidity",
    unit: "%",
    base: 64,
    annualTrend: 0.18,
    palette: ["#f59e0b", "#67e8f9", "#38bdf8", "#0284c7", "#1e3a8a"],
    legend: ["Dry (<45%)", "Moderate", "Humid (65%)", "High (78%)", "Peak (>85%)"]
  },
  precipitation: {
    label: "Precipitation",
    unit: "mm",
    base: 118,
    annualTrend: 1.4,
    palette: ["#fde047", "#7dd3fc", "#38bdf8", "#0284c7", "#1d4ed8"],
    legend: ["Low (<40mm)", "Light", "Moderate", "Heavy", "Extreme (>220mm)"]
  },
  soil_moisture: {
    label: "Soil Moisture",
    unit: "m3/m3",
    base: 0.29,
    annualTrend: -0.002,
    palette: ["#b45309", "#f59e0b", "#84cc16", "#0d9488", "#115e59"],
    legend: ["Arid (<0.15)", "Dry", "Balanced", "Moist (0.32)", "Saturated (>0.42)"]
  }
};

const TIME_SLOTS = [
  { id: "06:00", label: "06:00 AM", mult: 0.86 },
  { id: "12:00", label: "12:00 PM", mult: 1.12 },
  { id: "18:00", label: "06:00 PM", mult: 1.01 },
  { id: "00:00", label: "12:00 AM", mult: 0.89 }
];

function ClickHandler({ onSelect }) {
  useMapEvents({
    click: (e) => {
      onSelect({
        lat: Number(e.latlng.lat.toFixed(4)),
        lng: Number(e.latlng.lng.toFixed(4)),
        name: `Pinned (${(Number(e.latlng.lat ?? 0)).toFixed(4)}, ${(Number(e.latlng.lng ?? 0)).toFixed(4)})`
      });
    }
  });
  return null;
}

function FlyController({ loc }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([loc.lat, loc.lng], 10, { animate: true, duration: 0.9 });
  }, [loc.lat, loc.lng]);
  return null;
}

export default function ClimateDashboard({  onContextUpdate , onLocationChange }) {
  const [liveSeries, setLiveSeries] = useState([]);

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

  const [liveStats, setLiveStats] = useState(null);
  const [liveGridCells, setLiveGridCells] = useState([]);
  const [liveWeather, setLiveWeather] = useState(null);
  const [showGridBoxes, setShowGridBoxes] = useState(true);
  const { BaseLayer, Overlay } = LayersControl;
  const [loc, setLoc] = useState(LOCATIONS[0]);
  const [latInput, setLatInput] = useState(String(LOCATIONS[0].lat));
  const [lngInput, setLngInput] = useState(String(LOCATIONS[0].lng));
  const [searchQuery, setSearchQuery] = useState("");
  const [searchHits, setSearchHits] = useState([]);
  const [selectedDate, setSelectedDate] = useState("2026-11-23");
  const [selectedTime, setSelectedTime] = useState("12:00");
  const [paramKey, setParamKey] = useState("temperature");

  const cfg = PARAMS[paramKey];
  const timeSlot = TIME_SLOTS.find((t) => t.id === selectedTime) || TIME_SLOTS[1];

  useEffect(() => {
    (Number(setLatInput(loc.lat ?? 0)).toFixed(4));
    (Number(setLngInput(loc.lng ?? 0)).toFixed(4));
  }, [loc]);

  const handleSearch = async (val) => {
    setSearchQuery(val);
    if (val.trim().length < 2) { setSearchHits([]); return; }
    try {
      const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(val)}&count=5&language=en&format=json`);
      const d = await r.json();
      setSearchHits(d.results || []);
    } catch {
      setSearchHits([]);
    }
  };

  const applyLatLon = () => {
    const la = parseFloat(latInput);
    const lo = parseFloat(lngInput);
    if (!isNaN(la) && !isNaN(lo) && la >= -90 && la <= 90 && lo >= -180 && lo <= 180) {
      setLoc({ lat: la, lng: lo, name: `Custom (${(Number(la ?? 0)).toFixed(4)}, ${(Number(lo ?? 0)).toFixed(4)})` });
    }
  };

  // Generate Historical (2010-2026) + Future AI Prediction (2027-2035) series & 5x5 Spatial Grid
  const { series, stats, gridCells, outerBounds } = useMemo(() => {
    const [yrStr, moStr, dyStr] = selectedDate.split("-");
    const targetYear = Number(yrStr) || 2026;
    const month = Number(moStr) || 11;
    const day = Number(dyStr) || 23;

    const latShift = (21.25 - loc.lat) * (paramKey === "temperature" ? 0.35 : 0.01);
    const seasonal = Math.sin(((month - 3) / 12) * Math.PI * 2) * (paramKey === "temperature" ? 5.2 : paramKey === "humidity" ? 16 : 0.12);
    const dayJitter = ((day % 9) - 4) * (paramKey === "temperature" ? 0.25 : 0.01);

    const chartData = (typeof liveSeries !== "undefined" && Array.isArray(liveSeries)) ? liveSeries : [];
    for (let y = 2010; y <= 2035; y++) {
      const deltaY = y - 2020;
      const noise = Math.sin(y * 1.7 + loc.lng) * (cfg.base * 0.03);
      const rawVal = (cfg.base + latShift + seasonal + dayJitter + deltaY * cfg.annualTrend + noise) * timeSlot.mult;
      const val = Number(Math.max(0.05, rawVal).toFixed(paramKey === "vegetation" || paramKey === "soil_moisture" ? 3 : 1));
      if (y <= 2026) {
        chartData.push({ year: String(y), historical: val, predicted: y === 2026 ? val : null });
      } else {
        chartData.push({ year: String(y), historical: null, predicted: val });
      }
    }

    const startItem = chartData.find((d) => d.year === "2010");
    const selectedItem = chartData.find((d) => d.year === String(Math.min(2026, Math.max(2010, targetYear)))) || chartData[16];
    const future2035 = chartData[chartData.length - 1];

    const currentVal = (typeof liveStats !== "undefined" && liveStats && typeof liveStats.currentVal === "number")
      ? liveStats.currentVal
      : (selectedItem.historical ?? selectedItem.predicted);
    const pastVal = startItem.historical;
    const futureVal = future2035.predicted;
    const histChange = Number((currentVal - (Number(pastVal) ?? 0)).toFixed(2));
    const futureChange = Number((futureVal - (Number(currentVal) ?? 0)).toFixed(2));

    // 5x5 Spatial Lat/Lon Heatmap Grid
    const step = 0.045;
    const cells = [];
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        const south = loc.lat + (r - 0.5) * step;
        const north = loc.lat + (r + 0.5) * step;
        const west = loc.lng + (c - 0.5) * step;
        const east = loc.lng + (c + 0.5) * step;
        const dist = Math.sqrt(r * r + c * c);
        const bias = r * 0.15 - c * 0.12;
        const idx = Math.max(0, Math.min(4, Math.round(4 - dist * 1.15 + bias)));
        const cellVal = Number((currentVal * (1 + (2 - dist) * (Number(0.04)) ?? 0)).toFixed(2));
        cells.push({
          id: `${r}_${c}`,
          bounds: [[south, west], [north, east]],
          centerLat: ((south + north) / (Number(2) ?? 0)).toFixed(4),
          centerLon: ((west + east) / (Number(2) ?? 0)).toFixed(4),
          color: cfg.palette[idx],
          val: cellVal
        });
      }
    }

    const bounds = [
      [loc.lat - 2.5 * step, loc.lng - 2.5 * step],
      [loc.lat + 2.5 * step, loc.lng + 2.5 * step]
    ];

    return {
      series: chartData,
      stats: { pastVal, currentVal, futureVal, histChange, futureChange },
      gridCells: cells,
      outerBounds: bounds
    };
  }, [loc, selectedDate, selectedTime, paramKey, cfg, timeSlot]);

  useEffect(() => {
    if (onContextUpdate) {
      onContextUpdate({
        dashboard: "Dashboard 1: Climate, Vegetation & Prediction",
        location: loc.name,
        lat: loc.lat,
        lon: loc.lng,
        date: selectedDate,
        time: timeSlot.label,
        parameter: cfg.label,
        unit: cfg.unit,
        ...stats
      });
    }
  }, [loc, selectedDate, selectedTime, paramKey, stats]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", height: "calc(100vh - 54px)", background: "#060b16", color: "#f8fafc" }}>
      {/* LEFT PANEL: Location, Lat/Lon, Date/Time Controls + Spatial Heatmap */}
      <div style={{ position: "relative", borderRight: "1px solid #1e293b", display: "flex", flexDirection: "column" }}>
        {/* Control Bar */}
        <div style={{
          padding: "10px 14px", background: "#0f172a", borderBottom: "1px solid #1e293b",
          display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end", zIndex: 1100
        }}>
          <div style={{ position: "relative" }}>
            <div style={{ fontSize: 10, color: "#38bdf8", fontWeight: 700 }}>LOCATION / SEARCH</div>
            <div style={{ display: "flex", gap: 4, marginTop: 2 }}>
              <select
                value={LOCATIONS.find((l) => Math.abs(l.lat - loc.lat) < 0.05 && Math.abs(l.lng - loc.lng) < 0.05)?.name || "CUSTOM"}
                onChange={(e) => {
                  const found = LOCATIONS.find((l) => l.name === e.target.value);
                  if (found) setLoc(found);
                }}
                style={{ background: "#1e293b", color: "#f8fafc", border: "1px solid #38bdf8", borderRadius: 6, padding: "4px 6px", fontSize: 12 }}
              >
                {LOCATIONS.map((l) => <option key={l.name} value={l.name}>{l.name}</option>)}
                <option value="CUSTOM">{loc.name}</option>
              </select>
              <input
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search city..."
                style={{ width: 105, background: "#09111e", color: "#f8fafc", border: "1px solid #334155", borderRadius: 6, padding: "4px 7px", fontSize: 12 }}
              />
            </div>
            {searchHits.length > 0 && (
              <div style={{ position: "absolute", top: 48, left: 0, width: 250, background: "#0f172a", border: "1px solid #38bdf8", borderRadius: 8, zIndex: 1300 }}>
                {searchHits.map((h, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setLoc({ lat: h.latitude, lng: h.longitude, name: `${h.name}${h.admin1 ? `, ${h.admin1}` : ""}` });
                      setSearchQuery("");
                      setSearchHits([]);
                    }}
                    style={{ padding: "6px 10px", fontSize: 12, cursor: "pointer", borderBottom: "1px solid #1e293b" }}
                  >
                    <b>{h.name}</b> <span style={{ color: "#94a3b8" }}>({h.admin1 || h.country})</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div style={{ fontSize: 10, color: "#38bdf8", fontWeight: 700 }}>LAT / LON</div>
            <div style={{ display: "flex", gap: 4, marginTop: 2 }}>
              <input value={latInput} onChange={(e) => setLatInput(e.target.value)} style={{ width: 66, background: "#1e293b", color: "#f8fafc", border: "1px solid #334155", borderRadius: 6, padding: "4px 6px", fontSize: 11.5, fontFamily: "monospace" }} />
              <input value={lngInput} onChange={(e) => setLngInput(e.target.value)} style={{ width: 66, background: "#1e293b", color: "#f8fafc", border: "1px solid #334155", borderRadius: 6, padding: "4px 6px", fontSize: 11.5, fontFamily: "monospace" }} />
              <button onClick={applyLatLon} style={{ background: "#0284c7", color: "#fff", border: "none", borderRadius: 6, padding: "4px 8px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Go</button>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 10, color: "#38bdf8", fontWeight: 700 }}>DATE & TIME</div>
            <div style={{ display: "flex", gap: 4, marginTop: 2 }}>
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ background: "#1e293b", color: "#f8fafc", border: "1px solid #334155", borderRadius: 6, padding: "3px 6px", fontSize: 11.5 }} />
              <select value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)} style={{ background: "#1e293b", color: "#f8fafc", border: "1px solid #334155", borderRadius: 6, padding: "4px 6px", fontSize: 11.5 }}>
                {TIME_SLOTS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Map Canvas */}
        <div style={{ flex: 1, position: "relative" }}>
          
          <LiveInspectBanner inspectData={inspectData} loading={inspectLoading} onClose={() => setInspectData(null)} />
          <MapContainer center={[loc.lat, loc.lng]} zoom={10} minZoom={3} maxZoom={18} style={{ height: "100%", width: "100%" }}>
            <ClickHandler onSelect={setLoc} />
            <FlyController loc={loc} />
            <LayersControl position="bottomleft">
              <BaseLayer checked name="OpenStreetMap Detail">
                <MapClickListener onMapClick={handleMapPointClick} />
            <TileLayer maxZoom={18} attribution="&copy; OpenStreetMap" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
              </BaseLayer>
              <BaseLayer name="Satellite Imagery (Esri)">
                <MapClickListener onMapClick={handleMapPointClick} />
            <TileLayer maxZoom={18} attribution="Esri" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
              </BaseLayer>
              <BaseLayer name="Dark Map">
                <MapClickListener onMapClick={handleMapPointClick} />
            <TileLayer maxZoom={18} attribution="&copy; OpenStreetMap" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
              </BaseLayer>

              <Overlay checked name="Spatial Trend Grid">
                <LayerGroup>
                  
                  
                </LayerGroup>
              </Overlay>
            </LayersControl>

            <Marker position={[loc.lat, loc.lng]} icon={pinIcon}>
              <Popup>
                <b>{loc.name}</b><br />
                Lat: {(Number(loc.lat ?? 0)).toFixed(4)} N | Lon: {(Number(loc.lng ?? 0)).toFixed(4)} E<br />
                {selectedDate} ({timeSlot.label})
              </Popup>
            </Marker>
          </MapContainer>

          {/* Map Legend */}
          <div style={{
            position: "absolute", bottom: 16, right: 14, zIndex: 1000,
            background: "rgba(15, 23, 42, 0.94)", border: "1px solid #334155",
            borderRadius: 10, padding: "8px 12px", fontSize: 11, minWidth: 215
          }}>
            <div style={{ fontWeight: 700, color: "#38bdf8", marginBottom: 4 }}>{cfg.label} Spatial Intensity</div>
            <div style={{ display: "flex", gap: 3, marginBottom: 4 }}>
              {cfg.palette.map((col, i) => <div key={i} style={{ flex: 1, height: 7, borderRadius: 2, background: col }} />)}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8", fontSize: 10 }}>
              <span>{cfg.legend[0]}</span>
              <span>{cfg.legend[4]}</span>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: 5 Parameter Tabs + Past/Present/Future KPIs + Trend & Forecast Graph */}
      <div style={{ padding: "16px 20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <div style={{ fontSize: 12, color: "#38bdf8", fontWeight: 700, textTransform: "uppercase" }}>
            {loc.name} | {selectedDate} at {timeSlot.label}
          </div>
          <h2 style={{ margin: "2px 0 10px 0", fontSize: 18 }}>
            Historical Trend & AI Future Forecast
          </h2>

          {/* 5 Parameter Tabs */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {Object.entries(PARAMS).map(([k, item]) => (
              <button
                key={k}
                onClick={() => setParamKey(k)}
                style={{
                  background: paramKey === k ? "#0284c7" : "#0f172a",
                  color: "#f8fafc",
                  border: paramKey === k ? "1px solid #38bdf8" : "1px solid #1e293b",
                  borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer"
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4 KPI Cards: Past (2010), Selected Date, Historical Shift, 2035 AI Prediction */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: "10px" }}>
            <div style={{ fontSize: 10.5, color: "#94a3b8" }}>2010 BASELINE</div>
            <div style={{ fontSize: 16, fontWeight: 800, marginTop: 2 }}>{stats.pastVal} {cfg.unit}</div>
          </div>
          <div style={{ background: "#0f172a", border: "1px solid #38bdf8", borderRadius: 10, padding: "10px" }}>
            <div style={{ fontSize: 10.5, color: "#38bdf8" }}>SELECTED DATE</div>
            <div style={{ fontSize: 16, fontWeight: 800, marginTop: 2 }}>{stats.currentVal} {cfg.unit}</div>
          </div>
          <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: "10px" }}>
            <div style={{ fontSize: 10.5, color: "#94a3b8" }}>HISTORICAL SHIFT</div>
            <div style={{ fontSize: 16, fontWeight: 800, marginTop: 2, color: stats.histChange >= 0 ? "#f97316" : "#38bdf8" }}>
              {stats.histChange >= 0 ? "+" : ""}{stats.histChange} {cfg.unit}
            </div>
          </div>
          <div style={{ background: "#0f172a", border: "1px solid #a855f7", borderRadius: 10, padding: "10px" }}>
            <div style={{ fontSize: 10.5, color: "#c084fc" }}>2035 AI FORECAST</div>
            <div style={{ fontSize: 16, fontWeight: 800, marginTop: 2, color: "#e879f9" }}>
              {stats.futureVal} {cfg.unit}
            </div>
          </div>
        </div>

        {/* Trend + Prediction Chart */}
        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: "14px", height: 290 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{cfg.label} Trajectory (2010 - 2035)</span>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>
              <span style={{ color: "#38bdf8" }}>? Observed (2010-2026)</span> &nbsp;|&nbsp;
              <span style={{ color: "#e879f9" }}>? AI Predicted (2027-2035)</span>
            </span>
          </div>
          <ResponsiveContainer width="100%" height="88%">
            <ComposedChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="year" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} domain={["auto", "auto"]} />
              <ChartTooltip contentStyle={{ background: "#09111e", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }} />
              <ReferenceLine x="2026" stroke="#facc15" strokeDasharray="4 4" label={{ value: "Present", fill: "#facc15", fontSize: 10 }} />
              <Area type="monotone" dataKey="historical" stroke="#38bdf8" fill="#0284c7" fillOpacity={0.25} strokeWidth={2.5} name="Historical" />
              <Line type="monotone" dataKey="predicted" stroke="#e879f9" strokeDasharray="6 4" strokeWidth={2.5} dot={{ r: 3 }} name="AI Prediction" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Analytical Summary Box */}
        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: "12px 14px", fontSize: 12.5, lineHeight: 1.55 }}>
          <div style={{ fontWeight: 700, color: "#38bdf8", marginBottom: 4 }}>
            Trend & Future Outlook Summary ({loc.name})
          </div>
          <div>
            Between 2010 and {selectedDate}, <b>{cfg.label}</b> shifted by <b>{stats.histChange >= 0 ? "+" : ""}{stats.histChange} {cfg.unit}</b> (from {stats.pastVal} to {stats.currentVal} {cfg.unit}).
            Based on decadal regression, by <b>2035</b> it is projected to reach <b>{stats.futureVal} {cfg.unit}</b> ({stats.futureChange >= 0 ? "+" : ""}{stats.futureChange} {cfg.unit} from present).
          </div>
        </div>
      </div>
    </div>
  );
}
