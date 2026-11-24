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
      map.flyTo(targetCoords, zoom || 6, { duration: 1.1 });
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
    try {
      const res = await fetch(`${window.location.origin}/api/map-inspect?lat=${clat}&lon=${clon}`);
      const data = await res.json();
      setInspectData(data);
      if (onLocationChange && data?.lat && data?.lon) {
        onLocationChange({ name: data.place_name || "Clicked Pin", lat: data.lat, lng: data.lon });
      }
    } catch {
      // ignore network error
    } finally {
      setInspectLoading(false);
    }
  };

  // Unique mineral types available in DB
  const mineralTypes = useMemo(() => {
    const set = new Set(minerals.map(m => m.mineral).filter(Boolean));
    return Array.from(set);
  }, [minerals]);

  // Determine active river(s) ONLY when user searches or selects a river
  const activeRivers = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (selectedRiverId) {
      return rivers.filter(r => r.id.toLowerCase() === selectedRiverId.toLowerCase());
    }
    if (q.length >= 2) {
      return rivers.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        (r.states && r.states.toLowerCase().includes(q))
      );
    }
    return [];
  }, [rivers, selectedRiverId, searchText]);

  // Determine active color-coded minerals ONLY when mineral type or river is searched/selected
  const activeMinerals = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (selectedMineralType) {
      return minerals.filter(m => m.mineral.toLowerCase() === selectedMineralType.toLowerCase());
    }
    if (selectedRiverId) {
      return minerals.filter(m => (m.river_id || "").toLowerCase() === selectedRiverId.toLowerCase());
    }
    if (q.length >= 2) {
      const matchedRiverIds = new Set(activeRivers.map(r => r.id.toLowerCase()));
      return minerals.filter(m =>
        m.mineral.toLowerCase().includes(q) ||
        (m.deposit_name && m.deposit_name.toLowerCase().includes(q)) ||
        matchedRiverIds.has((m.river_id || "").toLowerCase())
      );
    }
    return [];
  }, [minerals, selectedMineralType, selectedRiverId, searchText, activeRivers]);

  // Compute map fly-to target when a river or mineral is searched/selected
  const focusView = useMemo(() => {
    if (activeRivers.length > 0) {
      const path = RIVER_PATHS[activeRivers[0].id.toLowerCase()];
      if (path && path.length > 0) {
        return { coords: path[Math.floor(path.length / 2)], zoom: 6 };
      }
    }
    if (activeMinerals.length > 0) {
      return { coords: [activeMinerals[0].lat, activeMinerals[0].lon], zoom: 6 };
    }
    return { coords: [22.35, 81.5], zoom: 5 };
  }, [activeRivers, activeMinerals]);

  const hasActiveFilter = Boolean(selectedRiverId || selectedMineralType || searchText.trim().length >= 2);

  const clearSelection = () => {
    setSearchText("");
    setSelectedRiverId("");
    setSelectedMineralType("");
  };

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
          placeholder="Search river (e.g. Ganga, Mahanadi) or mineral (Iron Ore, Coal)..."
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
          <option value="">-- Select River Basin (Hidden by Default) --</option>
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
          <option value="">-- Select Mineral Type (Color-Coded) --</option>
          {mineralTypes.map(mt => (
            <option key={mt} value={mt}>{mt}</option>
          ))}
        </select>

        {hasActiveFilter && (
          <button
            onClick={clearSelection}
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
            Clear Map Selection
          </button>
        )}
      </div>

      {/* Color-Coded Mineral Legend (Visible when minerals are active or for reference) */}
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
        <span style={{ color: "#94a3b8", fontWeight: 600 }}>Mineral Color Key (Click to Highlight):</span>
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

      {/* Interactive Map: Clean by Default ? Renders River Path & Colored Minerals Only When Searched/Selected */}
      <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #1e293b", position: "relative" }}>
        {!hasActiveFilter && (
          <div style={{
            position: "absolute",
            top: 10,
            right: 10,
            zIndex: 999,
            background: "rgba(15, 23, 42, 0.9)",
            border: "1px solid #38bdf8",
            color: "#e2e8f0",
            padding: "6px 12px",
            borderRadius: 8,
            fontSize: 12
          }}>
            Search or select a <strong>River</strong> or <strong>Mineral Type</strong> above to highlight it on the map.
          </div>
        )}

        <MapContainer center={[22.35, 81.5]} zoom={5} style={{ height: 420, width: "100%" }}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution="&copy; OpenStreetMap &copy; CARTO"
          />
          <MapClickListener onMapClick={handleMapClick} />
          <MapAutoFocus targetCoords={focusView.coords} zoom={focusView.zoom} />

          {/* Render ONLY the searched/selected river polyline */}
          {activeRivers.map(r => {
            const coords = RIVER_PATHS[r.id.toLowerCase()];
            if (!coords) return null;
            return (
              <Polyline
                key={r.id}
                positions={coords}
                pathOptions={{ color: "#38bdf8", weight: 5, opacity: 0.92 }}
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

          {/* Render ONLY the searched/selected color-coded mineral deposits */}
          {activeMinerals.map((m, idx) => {
            const pinColor = getMineralColor(m.mineral);
            return (
              <CircleMarker
                key={`${m.deposit_name}-${idx}`}
                center={[m.lat, m.lon]}
                radius={9}
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

      {/* Details Cards for Searched River or Mineral */}
      {activeRivers.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
          {activeRivers.map(r => (
            <div key={r.id} style={{ background: "#0f172a", border: "1px solid #38bdf8", borderRadius: 10, padding: 12 }}>
              <div style={{ fontWeight: 700, color: "#38bdf8", fontSize: 15 }}>{r.name}</div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>{r.states} ? Outlet: {r.outlet}</div>
              <div style={{ fontSize: 13, color: "#e2e8f0" }}>
                Plastic Discharge: <strong>{r.plastic_tons_yr?.toLocaleString()} Tons/yr</strong> ? Damage: <strong>{r.damage_score}%</strong> ({r.damage_level})
              </div>
              <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 4 }}>{r.water_impact}</div>
            </div>
          ))}
        </div>
      )}

      {activeMinerals.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
          {activeMinerals.map((m, idx) => {
            const badgeColor = getMineralColor(m.mineral);
            return (
              <div key={`${m.deposit_name}-card-${idx}`} style={{ background: "#0f172a", border: `1px solid ${badgeColor}`, borderRadius: 10, padding: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: badgeColor }} />
                  <strong style={{ color: badgeColor, fontSize: 14 }}>{m.mineral}</strong>
                </div>
                <div style={{ fontWeight: 600, color: "#f8fafc", fontSize: 13, marginTop: 4 }}>{m.deposit_name}</div>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>Grade: {m.grade} ? Basin: {(m.river_id || "").toUpperCase()}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
