import React, { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from "react-leaflet";
import { MapClickListener, LiveInspectBanner } from "./MapClickInspector";

const MINERAL_COLORS = {
  "Iron Ore": "#ef4444",
  "Coal": "#f59e0b",
  "Bauxite": "#38bdf8",
  "Manganese": "#a855f7",
  "Gold": "#facc15",
  "Uranium": "#22c55e",
  "Limestone": "#ec4899",
  "Copper": "#fb923c"
};

function getMineralColor(mineralName = "") {
  const key = Object.keys(MINERAL_COLORS).find(k =>
    mineralName.toLowerCase().includes(k.toLowerCase())
  );
  return key ? MINERAL_COLORS[key] : "#14b8a6";
}

const RIVER_PATHS = {
  ganga: [[30.08, 78.26], [28.45, 78.12], [26.45, 80.35], [25.43, 81.84], [25.31, 83.01], [25.61, 85.14], [24.80, 87.92], [22.57, 88.36]],
  yamuna: [[31.01, 78.46], [29.96, 77.55], [28.61, 77.23], [27.18, 78.02], [25.43, 81.84]],
  brahmaputra: [[28.10, 95.30], [27.47, 94.91], [26.75, 94.21], [26.18, 91.74], [25.55, 89.66]],
  mahanadi: [[20.25, 81.95], [21.25, 81.63], [21.47, 83.97], [20.46, 85.88], [20.29, 86.67]],
  godavari: [[19.93, 73.53], [19.15, 77.31], [18.75, 79.51], [17.67, 80.89], [16.98, 81.78], [16.73, 82.22]],
  krishna: [[17.92, 73.66], [16.85, 74.56], [16.21, 77.35], [16.51, 80.64], [15.95, 80.98]],
  narmada: [[22.67, 81.75], [23.16, 79.93], [22.75, 77.72], [22.15, 75.58], [21.70, 72.99]],
  cauvery: [[12.38, 75.52], [12.42, 76.69], [11.45, 77.72], [10.80, 78.69], [11.13, 79.85]]
};

function MapAutoFocus({ targetCoords, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (targetCoords && targetCoords.length === 2) {
      map.flyTo(targetCoords, zoom || 5, { duration: 1.0 });
    }
  }, [targetCoords, zoom, map]);
  return null;
}

export default function RiverMineralDashboard({ onLocationChange }) {
  const [rivers, setRivers] = useState([]);
  const [minerals, setMinerals] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [selectedRiverId, setSelectedRiverId] = useState("");
  const [selectedMineralType, setSelectedMineralType] = useState("");
  const [inspectData, setInspectData] = useState(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  useEffect(() => {
    fetch(`${window.location.origin}/api/rivers`)
      .then(r => r.json())
      .then(d => setRivers(Array.isArray(d) ? d : (d.rivers || [])))
      .catch(() => {});

    fetch(`${window.location.origin}/api/minerals`)
      .then(r => r.json())
      .then(d => setMinerals(Array.isArray(d) ? d : (d.minerals || [])))
      .catch(() => {});
  }, []);

  const handleMapClick = async (clat, clon) => {
    setInspectLoading(true);
    setInspectData({
      place_name: `Coordinates (${Number(clat).toFixed(3)} N, ${Number(clon).toFixed(3)} E)`,
      lat: Number(clat.toFixed(4)),
      lon: Number(clon.toFixed(4)),
      weather: {},
      air_quality: {}
    });
    try {
      const res = await fetch(`${window.location.origin}/api/map-inspect?lat=${clat}&lon=${clon}`);
      const data = await res.json();
      setInspectData(data);
      if (onLocationChange && data?.lat && data?.lon) {
        onLocationChange({ name: data.place_name || "Clicked Pin", lat: data.lat, lng: data.lon });
      }
    } catch {
      // keep coordinate banner active so client-side Open-Meteo still loads
    } finally {
      setInspectLoading(false);
    }
  };

  const mineralTypes = useMemo(() => {
    const set = new Set(minerals.map(m => m.mineral).filter(Boolean));
    return Array.from(set);
  }, [minerals]);

  // Show ALL rivers by default; filter if a river or search query is selected
  const visibleRivers = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (selectedRiverId) {
      return rivers.filter(r => r.id.toLowerCase() === selectedRiverId.toLowerCase());
    }
    if (q.length >= 2) {
      const matched = rivers.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        (r.states && r.states.toLowerCase().includes(q))
      );
      return matched.length > 0 ? matched : rivers;
    }
    return rivers;
  }, [rivers, selectedRiverId, searchText]);

  // Show ALL minerals by default; filter if mineral type, river, or search query is active
  const visibleMinerals = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (selectedMineralType) {
      return minerals.filter(m => m.mineral.toLowerCase() === selectedMineralType.toLowerCase());
    }
    if (selectedRiverId) {
      return minerals.filter(m => (m.river_id || "").toLowerCase() === selectedRiverId.toLowerCase());
    }
    if (q.length >= 2) {
      const matched = minerals.filter(m =>
        m.mineral.toLowerCase().includes(q) ||
        (m.deposit_name && m.deposit_name.toLowerCase().includes(q)) ||
        (m.river_id && m.river_id.toLowerCase().includes(q))
      );
      return matched.length > 0 ? matched : minerals;
    }
    return minerals;
  }, [minerals, selectedMineralType, selectedRiverId, searchText]);

  const focusView = useMemo(() => {
    if (selectedRiverId && visibleRivers.length > 0) {
      const path = RIVER_PATHS[visibleRivers[0].id.toLowerCase()];
      if (path && path.length > 0) return { coords: path[Math.floor(path.length / 2)], zoom: 6 };
    }
    if (selectedMineralType && visibleMinerals.length > 0) {
      return { coords: [visibleMinerals[0].lat, visibleMinerals[0].lon], zoom: 6 };
    }
    return { coords: [22.35, 81.5], zoom: 5 };
  }, [selectedRiverId, selectedMineralType, visibleRivers, visibleMinerals]);

  const hasActiveFilter = Boolean(selectedRiverId || selectedMineralType || searchText.trim().length > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <LiveInspectBanner inspectData={inspectData} loading={inspectLoading} onClose={() => setInspectData(null)} />

      {/* Search & Filter Control Bar */}
      <div style={{
        background: "#0f172a",
        border: "1px solid #1e293b",
        borderRadius: 12,
        padding: 12,
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: 10,
        alignItems: "center"
      }}>
        <input
          type="text"
          value={searchText}
          onChange={e => {
            setSearchText(e.target.value);
            setSelectedRiverId("");
            setSelectedMineralType("");
          }}
          placeholder="Filter river (Ganga, Mahanadi) or mineral (Iron Ore, Coal)..."
          style={{
            background: "#090d16",
            border: "1px solid #334155",
            borderRadius: 8,
            padding: "9px 12px",
            color: "#f8fafc",
            fontSize: 13
          }}
        />

        <select
          value={selectedRiverId}
          onChange={e => {
            setSelectedRiverId(e.target.value);
            setSelectedMineralType("");
            setSearchText("");
          }}
          style={{
            background: "#090d16",
            border: "1px solid #334155",
            borderRadius: 8,
            padding: "9px 12px",
            color: "#f8fafc",
            fontSize: 13
          }}
        >
          <option value="">All River Basins ({rivers.length})</option>
          {rivers.map(r => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>

        <select
          value={selectedMineralType}
          onChange={e => {
            setSelectedMineralType(e.target.value);
            setSelectedRiverId("");
            setSearchText("");
          }}
          style={{
            background: "#090d16",
            border: "1px solid #334155",
            borderRadius: 8,
            padding: "9px 12px",
            color: "#f8fafc",
            fontSize: 13
          }}
        >
          <option value="">All Mineral Deposits ({minerals.length})</option>
          {mineralTypes.map(mt => (
            <option key={mt} value={mt}>{mt}</option>
          ))}
        </select>

        {hasActiveFilter && (
          <button
            onClick={() => {
              setSearchText("");
              setSelectedRiverId("");
              setSelectedMineralType("");
            }}
            style={{
              background: "#1e293b",
              border: "1px solid #38bdf8",
              color: "#38bdf8",
              borderRadius: 8,
              padding: "9px 12px",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13
            }}
          >
            Show All Rivers & Minerals
          </button>
        )}
      </div>

      {/* Color-Coded Mineral Legend */}
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        alignItems: "center",
        background: "#090d16",
        border: "1px solid #1e293b",
        borderRadius: 10,
        padding: "8px 12px",
        fontSize: 12
      }}>
        <span style={{ color: "#94a3b8", fontWeight: 600 }}>Mineral Color Legend:</span>
        {Object.entries(MINERAL_COLORS).map(([name, color]) => {
          const isSelected = selectedMineralType.toLowerCase() === name.toLowerCase();
          return (
            <button
              key={name}
              onClick={() => {
                setSelectedMineralType(isSelected ? "" : name);
                setSelectedRiverId("");
                setSearchText("");
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: isSelected ? "#1e293b" : "transparent",
                border: `1px solid ${isSelected ? color : "#334155"}`,
                color: "#e2e8f0",
                borderRadius: 999,
                padding: "3px 10px",
                cursor: "pointer",
                fontSize: 11.5
              }}
            >
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "inline-block" }} />
              {name}
            </button>
          );
        })}
      </div>

      {/* Full Interactive River & Mineral Map */}
      <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #1e293b" }}>
        <MapContainer center={[22.35, 81.5]} zoom={5} style={{ height: 430, width: "100%" }}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution="&copy; OpenStreetMap &copy; CARTO"
          />
          <MapClickListener onMapClick={handleMapClick} />
          <MapAutoFocus targetCoords={focusView.coords} zoom={focusView.zoom} />

          {visibleRivers.map(r => {
            const coords = RIVER_PATHS[r.id.toLowerCase()];
            if (!coords) return null;
            const riverColor = r.damage_score > 75 ? "#ef4444" : r.damage_score > 60 ? "#f59e0b" : "#38bdf8";
            return (
              <Polyline
                key={r.id}
                positions={coords}
                pathOptions={{ color: riverColor, weight: 4.5, opacity: 0.9 }}
              >
                <Popup>
                  <strong>{r.name}</strong><br />
                  States: {r.states}<br />
                  Plastic Load: {r.plastic_tons_yr?.toLocaleString()} Tons/yr<br />
                  Ecological Damage: {r.damage_score}% ({r.damage_level})
                </Popup>
              </Polyline>
            );
          })}

          {visibleMinerals.map((m, idx) => {
            const pinColor = getMineralColor(m.mineral);
            return (
              <CircleMarker
                key={`${m.deposit_name}-${idx}`}
                center={[m.lat, m.lon]}
                radius={8}
                pathOptions={{
                  color: "#ffffff",
                  weight: 1.5,
                  fillColor: pinColor,
                  fillOpacity: 0.9
                }}
              >
                <Popup>
                  <strong style={{ color: pinColor }}>{m.mineral}</strong><br />
                  Deposit: {m.deposit_name}<br />
                  Grade: {m.grade}<br />
                  River Basin: {(m.river_id || "").toUpperCase()}
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      {/* River & Mineral Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 10 }}>
        {visibleRivers.map(r => (
          <div key={r.id} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: 12 }}>
            <div style={{ fontWeight: 700, color: "#38bdf8", fontSize: 15 }}>{r.name}</div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>{r.states} ? Outlet: {r.outlet}</div>
            <div style={{ fontSize: 13, color: "#e2e8f0" }}>
              Plastic: <strong>{r.plastic_tons_yr?.toLocaleString()} Tons/yr</strong> ? Damage: <strong>{r.damage_score}%</strong> ({r.damage_level})
            </div>
            <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 4 }}>{r.water_impact}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
