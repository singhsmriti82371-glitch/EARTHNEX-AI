import { MapContainer, TileLayer, Rectangle, Marker, Popup, Tooltip, LayersControl, LayerGroup, useMap, useMapEvents } from "react-leaflet";
import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const pinIcon = L.divIcon({
  className: "",
  html: '<div style="width:16px;height:16px;background:#0284c7;border:3px solid #ffffff;border-radius:50%;box-shadow:0 0 12px #38bdf8;"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

const PRESET_LOCATIONS = [
  { name: "Raipur, Chhattisgarh", lat: 21.2514, lng: 81.6296 },
  { name: "Nava Raipur (Atal Nagar), CG", lat: 21.1611, lng: 81.7864 },
  { name: "Durg, Chhattisgarh", lat: 21.1904, lng: 81.2849 },
  { name: "Bhilai, Chhattisgarh", lat: 21.1938, lng: 81.3509 },
  { name: "Bilaspur, Chhattisgarh", lat: 22.0797, lng: 82.1409 },
  { name: "Korba, Chhattisgarh", lat: 22.3595, lng: 82.7501 },
  { name: "Jagdalpur (Bastar), CG", lat: 19.0748, lng: 82.0087 },
  { name: "Delhi (IGI Airport)", lat: 28.5562, lng: 77.1000 },
  { name: "Mumbai, Maharashtra", lat: 19.0760, lng: 72.8777 }
];

const FEATURE_CONFIG = {
  temperature: {
    label: "Temperature Trend",
    unit: "C",
    palette: ["#0284c7", "#facc15", "#f97316", "#dc2626", "#7f1d1d"],
    legend: ["Cooler (-1.5 C)", "Baseline", "Warming (+1.0 C)", "Hot (+2.0 C)", "Extreme Hot (+3.0 C)"]
  },
  humidity: {
    label: "Humidity & Rainfall Trend",
    unit: "%",
    palette: ["#f59e0b", "#67e8f9", "#38bdf8", "#0284c7", "#1e3a8a"],
    legend: ["Dry (-10%)", "Moderate", "Humid (+6%)", "Wet (+12%)", "Peak Moisture (+18%)"]
  },
  vegetation: {
    label: "Vegetation (NDVI) Trend",
    unit: "NDVI",
    palette: ["#9a3412", "#eab308", "#84cc16", "#16a34a", "#14532d"],
    legend: ["Urban/Loss", "Sparse", "Moderate Crop", "Healthy Green", "Dense Forest"]
  }
};

function MapClickHandler({ onPick }) {
  useMapEvents({
    click: (e) => {
      onPick({
        lat: Number(e.latlng.lat.toFixed(4)),
        lng: Number(e.latlng.lng.toFixed(4)),
        name: `Pinned (${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)})`
      });
    }
  });
  return null;
}

function MapFlyController({ pt, flyKey }) {
  const map = useMap();
  useEffect(() => {
    if (pt && typeof pt.lat === "number" && typeof pt.lng === "number") {
      map.flyTo([pt.lat, pt.lng], 10, { animate: true, duration: 1.0 });
    }
  }, [pt.lat, pt.lng, flyKey]);
  return null;
}

export default function MapView({ pt, flyKey, variable = "temperature", live, trend, yearRange, setYearRange, onPick }) {
  const { BaseLayer, Overlay } = LayersControl;
  const [featureMode, setFeatureMode] = useState("temperature");
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [latInput, setLatInput] = useState(String(pt?.lat ?? 21.2514));
  const [lngInput, setLngInput] = useState(String(pt?.lng ?? 81.6296));
  const [localStartYear, setLocalStartYear] = useState(yearRange?.start ?? 2005);
  const [localEndYear, setLocalEndYear] = useState(yearRange?.end ?? 2026);

  useEffect(() => {
    setLatInput(Number(pt.lat).toFixed(4));
    setLngInput(Number(pt.lng).toFixed(4));
  }, [pt.lat, pt.lng]);

  useEffect(() => {
    if (variable === "soil_wetness") setFeatureMode("vegetation");
    else if (variable === "rainfall") setFeatureMode("humidity");
    else if (variable === "temperature") setFeatureMode("temperature");
  }, [variable]);

  const startYr = yearRange?.start ?? localStartYear;
  const endYr = yearRange?.end ?? localEndYear;
  const spanYears = Math.max(1, endYr - startYr);

  const handleYearChange = (newStart, newEnd) => {
    setLocalStartYear(newStart);
    setLocalEndYear(newEnd);
    if (setYearRange) {
      setYearRange({ start: newStart, end: newEnd });
    }
  };

  const handleSearch = async (val) => {
    setSearchText(val);
    if (val.trim().length < 2) { setSearchResults([]); return; }
    try {
      const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(val)}&count=5&language=en&format=json`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch {
      setSearchResults([]);
    }
  };

  const applyManualCoords = () => {
    const parsedLat = parseFloat(latInput);
    const parsedLng = parseFloat(lngInput);
    if (!isNaN(parsedLat) && !isNaN(parsedLng) && parsedLat >= -90 && parsedLat <= 90 && parsedLng >= -180 && parsedLng <= 180) {
      onPick({ lat: parsedLat, lng: parsedLng, name: `Lat ${parsedLat.toFixed(4)}, Lon ${parsedLng.toFixed(4)}` });
    }
  };

  const cfg = FEATURE_CONFIG[featureMode] || FEATURE_CONFIG.temperature;

  // Build a crisp 5x5 Latitude-Longitude Spatial Grid (Rectangles, NOT circles) over the selected region
  const { gridCells, periodSummary, outerBounds } = useMemo(() => {
    const baseVal =
      featureMode === "temperature" ? (live?.weather?.temperature_2m ?? 29.2) :
      featureMode === "humidity" ? (live?.weather?.relative_humidity_2m ?? 62) :
      Number(((live?.soil?.moisture ?? 0.30) + 0.28).toFixed(2));

    const slopePerDecade = trend?.slope_per_decade ?? (featureMode === "temperature" ? 0.38 : featureMode === "humidity" ? 1.8 : 0.03);
    const netChange = Number(((slopePerDecade / 10) * spanYears).toFixed(2));
    const startVal = Number((baseVal - netChange).toFixed(2));
    const endVal = Number(baseVal.toFixed(2));

    const step = 0.045; // ~5 km per grid cell
    const cells = [];
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        const south = pt.lat + (r - 0.5) * step;
        const north = pt.lat + (r + 0.5) * step;
        const west = pt.lng + (c - 0.5) * step;
        const east = pt.lng + (c + 0.5) * step;

        // Deterministic spatial gradient across the Lat/Lon grid (center = core anomaly, outer = rural/river buffer)
        const distFromCore = Math.sqrt(r * r + c * c);
        const directionalBias = (r * 0.15) - (c * 0.12);
        const intensity = Math.max(0, Math.min(4, Math.round(4 - distFromCore * 1.15 + directionalBias)));
        const cellDelta = Number((netChange * (1.25 - distFromCore * 0.22)).toFixed(2));
        const cellCurrent = Number((endVal + (2 - distFromCore) * (featureMode === "vegetation" ? -0.05 : 0.45)).toFixed(2));

        cells.push({
          id: `${r}_${c}`,
          bounds: [[south, west], [north, east]],
          centerLat: ((south + north) / 2).toFixed(4),
          centerLon: ((west + east) / 2).toFixed(4),
          color: cfg.palette[intensity],
          cellCurrent,
          cellDelta
        });
      }
    }

    const bounds = [
      [pt.lat - 2.5 * step, pt.lng - 2.5 * step],
      [pt.lat + 2.5 * step, pt.lng + 2.5 * step]
    ];

    return {
      gridCells: cells,
      periodSummary: { startVal, endVal, netChange, slopePerDecade: Number(slopePerDecade.toFixed(2)) },
      outerBounds: bounds
    };
  }, [pt.lat, pt.lng, featureMode, live, trend, spanYears, cfg]);

  const YEARS = Array.from({ length: 27 }, (_, i) => 2000 + i);

  return (
    <div style={{ position: "relative", height: "100%", width: "100%" }}>
      {/* Top Control Bar: Location Search + Exact Lat/Lon + Time Period (Start Year -> End Year) + Feature */}
      <div style={{
        position: "absolute", top: 12, left: 12, right: 12, zIndex: 1100,
        background: "rgba(15, 23, 42, 0.96)", backdropFilter: "blur(8px)",
        border: "1px solid #334155", borderRadius: 12, padding: "10px 14px",
        display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end",
        boxShadow: "0 8px 24px rgba(0,0,0,0.6)"
      }}>
        {/* 1. City / Preset / Search */}
        <div style={{ position: "relative", minWidth: 210 }}>
          <div style={{ fontSize: 10, color: "#38bdf8", fontWeight: 700, marginBottom: 3 }}>1. LOCATION / SEARCH CITY</div>
          <div style={{ display: "flex", gap: 4 }}>
            <select
              value={PRESET_LOCATIONS.find((p) => Math.abs(p.lat - pt.lat) < 0.05 && Math.abs(p.lng - pt.lng) < 0.05)?.name || "CUSTOM"}
              onChange={(e) => {
                const found = PRESET_LOCATIONS.find((p) => p.name === e.target.value);
                if (found) onPick({ lat: found.lat, lng: found.lng, name: found.name });
              }}
              style={{ background: "#1e293b", color: "#f8fafc", border: "1px solid #38bdf8", borderRadius: 6, padding: "5px 7px", fontSize: 12, fontWeight: 600 }}
            >
              {PRESET_LOCATIONS.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
              <option value="CUSTOM">{pt.name || "Custom Lat/Lon"}</option>
            </select>
            <input
              value={searchText}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search place..."
              style={{ width: 120, background: "#0f172a", color: "#f8fafc", border: "1px solid #334155", borderRadius: 6, padding: "5px 8px", fontSize: 12 }}
            />
          </div>
          {searchResults.length > 0 && (
            <div style={{ position: "absolute", top: 54, left: 0, width: 280, background: "#0f172a", border: "1px solid #38bdf8", borderRadius: 8, zIndex: 1300, overflow: "hidden" }}>
              {searchResults.map((r, i) => (
                <div
                  key={i}
                  onClick={() => {
                    onPick({ lat: r.latitude, lng: r.longitude, name: `${r.name}${r.admin1 ? `, ${r.admin1}` : ""}` });
                    setSearchText("");
                    setSearchResults([]);
                  }}
                  style={{ padding: "7px 10px", fontSize: 12, color: "#f8fafc", cursor: "pointer", borderBottom: "1px solid #1e293b" }}
                >
                  <b>{r.name}</b> <span style={{ color: "#94a3b8" }}>({r.admin1 || r.country})</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. Exact Latitude & Longitude Input */}
        <div>
          <div style={{ fontSize: 10, color: "#38bdf8", fontWeight: 700, marginBottom: 3 }}>2. EXACT LATITUDE & LONGITUDE</div>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <input
              value={latInput}
              onChange={(e) => setLatInput(e.target.value)}
              placeholder="Lat"
              style={{ width: 74, background: "#1e293b", color: "#f8fafc", border: "1px solid #334155", borderRadius: 6, padding: "5px 7px", fontSize: 12, fontFamily: "monospace" }}
            />
            <input
              value={lngInput}
              onChange={(e) => setLngInput(e.target.value)}
              placeholder="Lon"
              style={{ width: 74, background: "#1e293b", color: "#f8fafc", border: "1px solid #334155", borderRadius: 6, padding: "5px 7px", fontSize: 12, fontFamily: "monospace" }}
            />
            <button
              onClick={applyManualCoords}
              style={{ background: "#0284c7", color: "#fff", border: "none", borderRadius: 6, padding: "5px 9px", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}
            >
              Go
            </button>
          </div>
        </div>

        {/* 3. Full Time Period Selector (Start Year -> End Year) */}
        <div>
          <div style={{ fontSize: 10, color: "#38bdf8", fontWeight: 700, marginBottom: 3 }}>3. TREND TIME PERIOD</div>
          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            <select
              value={startYr}
              onChange={(e) => handleYearChange(Math.min(Number(e.target.value), endYr - 1), endYr)}
              style={{ background: "#1e293b", color: "#f8fafc", border: "1px solid #334155", borderRadius: 6, padding: "5px 7px", fontSize: 12, fontWeight: 600 }}
            >
              {YEARS.filter((y) => y < endYr).map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <span style={{ color: "#94a3b8", fontSize: 12 }}>to</span>
            <select
              value={endYr}
              onChange={(e) => handleYearChange(startYr, Math.max(Number(e.target.value), startYr + 1))}
              style={{ background: "#1e293b", color: "#f8fafc", border: "1px solid #334155", borderRadius: 6, padding: "5px 7px", fontSize: 12, fontWeight: 600 }}
            >
              {YEARS.filter((y) => y > startYr).map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* 4. Variable Mode */}
        <div>
          <div style={{ fontSize: 10, color: "#38bdf8", fontWeight: 700, marginBottom: 3 }}>4. FEATURE LAYER</div>
          <div style={{ display: "flex", gap: 5 }}>
            {Object.entries(FEATURE_CONFIG).map(([key, item]) => (
              <button
                key={key}
                onClick={() => setFeatureMode(key)}
                style={{
                  background: featureMode === key ? "#0284c7" : "#1e293b",
                  color: "#f8fafc",
                  border: featureMode === key ? "1px solid #38bdf8" : "1px solid #334155",
                  borderRadius: 6, padding: "5px 9px", fontSize: 11.5, fontWeight: 700, cursor: "pointer"
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <MapContainer center={[pt.lat, pt.lng]} zoom={10} minZoom={3} maxZoom={18} style={{ height: "100%", width: "100%" }}>
        <MapClickHandler onPick={onPick} />
        <MapFlyController pt={pt} flyKey={flyKey} />
        <LayersControl position="bottomleft">
          <BaseLayer checked name="OpenStreetMap Detail">
            <TileLayer maxZoom={18} attribution="&copy; OpenStreetMap" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
          </BaseLayer>
          <BaseLayer name="Satellite Imagery (Esri)">
            <TileLayer maxZoom={18} attribution="Esri" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
          </BaseLayer>
          <BaseLayer name="Dark Intelligence Base">
            <TileLayer maxZoom={18} attribution="&copy; OpenStreetMap" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
          </BaseLayer>

          <Overlay checked name="Lat/Lon Spatial Trend Grid">
            <LayerGroup>
              {/* Outer Region Bounding Box */}
              <Rectangle
                bounds={outerBounds}
                pathOptions={{ color: "#38bdf8", weight: 2, dashArray: "6 4", fillOpacity: 0 }}
              />
              {/* 5x5 Spatial Heatmap Grid Cells (No Circles) */}
              {gridCells.map((cell) => (
                <Rectangle
                  key={`${featureMode}-${startYr}-${endYr}-${cell.id}`}
                  bounds={cell.bounds}
                  pathOptions={{
                    color: "#0f172a",
                    weight: 1,
                    fillColor: cell.color,
                    fillOpacity: 0.52
                  }}
                >
                  <Tooltip sticky opacity={0.97}>
                    <b>Grid Cell ({cell.centerLat} N, {cell.centerLon} E)</b><br />
                    {cfg.label} ({endYr}): <b>{cell.cellCurrent} {cfg.unit}</b><br />
                    Change ({startYr} to {endYr}): <b>{cell.cellDelta >= 0 ? "+" : ""}{cell.cellDelta} {cfg.unit}</b>
                  </Tooltip>
                </Rectangle>
              ))}
            </LayerGroup>
          </Overlay>
        </LayersControl>

        <Marker position={[pt.lat, pt.lng]} icon={pinIcon}>
          <Popup>
            <b>{pt.name || "Selected Location"}</b><br />
            Latitude: <b>{Number(pt.lat).toFixed(4)} N</b><br />
            Longitude: <b>{Number(pt.lng).toFixed(4)} E</b><br />
            Period: <b>{startYr} - {endYr}</b>
          </Popup>
        </Marker>
      </MapContainer>

      {/* Bottom-Right Time-Period Trend Analyzer Summary Card */}
      <div style={{
        position: "absolute", bottom: 20, right: 16, zIndex: 1100,
        background: "rgba(15, 23, 42, 0.95)", backdropFilter: "blur(8px)",
        border: "1px solid #38bdf8", borderRadius: 12, padding: "12px 15px",
        color: "#f8fafc", fontSize: 12, minWidth: 270, boxShadow: "0 8px 24px rgba(0,0,0,0.65)"
      }}>
        <div style={{ fontWeight: 800, color: "#38bdf8", fontSize: 13, marginBottom: 2 }}>
          {cfg.label} ({startYr} - {endYr})
        </div>
        <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8, fontFamily: "monospace" }}>
          Lat: {Number(pt.lat).toFixed(4)} N | Lon: {Number(pt.lng).toFixed(4)} E
        </div>

        {/* Start vs End vs Net Change Metrics */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6,
          background: "#09111e", padding: "8px", borderRadius: 8, border: "1px solid #1e293b", marginBottom: 8
        }}>
          <div>
            <div style={{ fontSize: 10, color: "#94a3b8" }}>{startYr} AVG</div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{periodSummary.startVal} {cfg.unit}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "#94a3b8" }}>{endYr} AVG</div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{periodSummary.endVal} {cfg.unit}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "#94a3b8" }}>NET CHANGE</div>
            <div style={{ fontWeight: 800, fontSize: 13, color: periodSummary.netChange >= 0 ? "#f97316" : "#38bdf8" }}>
              {periodSummary.netChange >= 0 ? "+" : ""}{periodSummary.netChange} {cfg.unit}
            </div>
          </div>
        </div>

        {/* Color Intensity Scale */}
        <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
          {cfg.palette.map((c, idx) => (
            <div key={idx} style={{ flex: 1, height: 8, borderRadius: 3, background: c }} />
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#94a3b8" }}>
          <span>{cfg.legend[0]}</span>
          <span>{cfg.legend[4]}</span>
        </div>
      </div>
    </div>
  );
}
