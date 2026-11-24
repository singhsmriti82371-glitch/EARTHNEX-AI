import React, { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Marker, Popup, useMap } from "react-leaflet";
import { MapClickListener, LiveInspectBanner } from "./MapClickInspector";

const DEFAULT_RIVERS = [
  { id: "ganga", name: "Ganga River Basin", states: "Uttarakhand, UP, Bihar, Jharkhand, West Bengal", outlet: "Bay of Bengal", plastic_tons_yr: 115000, microplastic_conc: "420 particles/m?", damage_score: 84, damage_level: "Critical", water_impact: "High urban sewage, industrial effluent, and macro/microplastic transport into the Sundarbans delta." },
  { id: "yamuna", name: "Yamuna River Basin", states: "Uttarakhand, Himachal, Haryana, Delhi, UP", outlet: "Ganga (Prayagraj)", plastic_tons_yr: 48500, microplastic_conc: "510 particles/m?", damage_score: 88, damage_level: "Severe", water_impact: "Severe dissolved oxygen depletion and industrial chemical foam across the Delhi?Agra stretch." },
  { id: "brahmaputra", name: "Brahmaputra River Basin", states: "Arunachal Pradesh, Assam, Meghalaya", outlet: "Bay of Bengal", plastic_tons_yr: 34200, microplastic_conc: "190 particles/m?", damage_score: 56, damage_level: "Moderate", water_impact: "Monsoon siltation and flood-driven plastic runoff across Assam valley wetlands." },
  { id: "mahanadi", name: "Mahanadi River Basin", states: "Chhattisgarh, Odisha", outlet: "Bay of Bengal", plastic_tons_yr: 29400, microplastic_conc: "235 particles/m?", damage_score: 64, damage_level: "Elevated", water_impact: "Mining runoff, thermal ash, and municipal waste along Raipur?Cuttack corridor." },
  { id: "godavari", name: "Godavari River Basin", states: "Maharashtra, Telangana, Chhattisgarh, Andhra Pradesh", outlet: "Bay of Bengal", plastic_tons_yr: 38900, microplastic_conc: "260 particles/m?", damage_score: 68, damage_level: "Elevated", water_impact: "Agricultural fertilizer runoff and industrial discharge near Nashik and Rajahmundry." },
  { id: "krishna", name: "Krishna River Basin", states: "Maharashtra, Karnataka, Telangana, Andhra Pradesh", outlet: "Bay of Bengal", plastic_tons_yr: 31800, microplastic_conc: "245 particles/m?", damage_score: 65, damage_level: "Elevated", water_impact: "Reservoir trapping of microplastics and urban discharge from Pune and Vijayawada." },
  { id: "narmada", name: "Narmada River Basin", states: "Madhya Pradesh, Maharashtra, Gujarat", outlet: "Arabian Sea", plastic_tons_yr: 18600, microplastic_conc: "155 particles/m?", damage_score: 49, damage_level: "Moderate", water_impact: "Relatively lower industrial plastic load with localized estuarine accumulation at Bharuch." },
  { id: "cauvery", name: "Cauvery River Basin", states: "Karnataka, Tamil Nadu, Kerala, Puducherry", outlet: "Bay of Bengal", plastic_tons_yr: 24100, microplastic_conc: "275 particles/m?", damage_score: 69, damage_level: "Elevated", water_impact: "Textile dyeing effluents and dense agricultural abstraction in the delta." }
];

const DEFAULT_MINERALS = [
  { river_id: "mahanadi", mineral: "Iron Ore", deposit_name: "Bailadila & Dalli-Rajhara Belt (Chhattisgarh)", lat: 18.6298, lon: 81.2000, grade: "High-Grade Hematite (65% Fe)" },
  { river_id: "mahanadi", mineral: "Iron Ore", deposit_name: "Keonjhar-Sundargarh Belt (Odisha)", lat: 21.8245, lon: 85.6185, grade: "62-65% Fe Hematite" },
  { river_id: "godavari", mineral: "Iron Ore", deposit_name: "Bellary-Hospet Iron Belt (Karnataka)", lat: 15.1394, lon: 76.9214, grade: "64% Fe" },
  { river_id: "mahanadi", mineral: "Coal", deposit_name: "Korba & Talcher Coalfields", lat: 22.3595, lon: 82.7501, grade: "Thermal Grade G4-G6" },
  { river_id: "ganga", mineral: "Coal", deposit_name: "Jharia & Raniganj Coalfields (Jharkhand-WB)", lat: 23.7407, lon: 86.4146, grade: "Prime Coking Coal" },
  { river_id: "godavari", mineral: "Coal", deposit_name: "Singareni Collieries (Telangana)", lat: 17.5082, lon: 80.2735, grade: "Non-Coking Bituminous" },
  { river_id: "mahanadi", mineral: "Bauxite", deposit_name: "Panchpatmali & Koraput Plateau (Odisha)", lat: 18.8561, lon: 82.9125, grade: "46% Al2O3 Metallurgical" },
  { river_id: "narmada", mineral: "Bauxite", deposit_name: "Amarkantak-Maikal Hills (MP/CG)", lat: 22.6749, lon: 81.7591, grade: "45% Al2O3" },
  { river_id: "godavari", mineral: "Manganese", deposit_name: "Balaghat-Nagpur Manganese Belt", lat: 21.8129, lon: 80.1838, grade: "48% Mn High-Grade" },
  { river_id: "krishna", mineral: "Gold", deposit_name: "Hutti & Kolar Gold Fields (Karnataka)", lat: 16.1972, lon: 76.6625, grade: "4.5 g/t Au" },
  { river_id: "ganga", mineral: "Uranium", deposit_name: "Jaduguda Uranium Mines (Singhbhum)", lat: 22.6519, lon: 86.3536, grade: "0.065% U3O8" },
  { river_id: "mahanadi", mineral: "Limestone", deposit_name: "Baloda Bazar-Raipur Cement Belt", lat: 21.6569, lon: 82.1592, grade: "Cement Grade CaO 48%" },
  { river_id: "narmada", mineral: "Copper", deposit_name: "Malanjkhand Copper Deposit (MP)", lat: 22.0225, lon: 80.7136, grade: "1.2% Cu Porphyry" },
  { river_id: "brahmaputra", mineral: "Coal", deposit_name: "Makum-Margherita Coalfield (Assam)", lat: 27.2845, lon: 95.6681, grade: "Low-Ash Tertiary Coal" }
];

const MINERAL_COLORS = {
  "Iron Ore": "#ef4444",
  "Coal": "#f59e0b",
  "Bauxite": "#0284c7",
  "Manganese": "#9333ea",
  "Gold": "#eab308",
  "Uranium": "#16a34a",
  "Limestone": "#db2777",
  "Copper": "#ea580c"
};

function getMineralColor(mineralName = "") {
  const key = Object.keys(MINERAL_COLORS).find(k =>
    mineralName.toLowerCase().includes(k.toLowerCase())
  );
  return key ? MINERAL_COLORS[key] : "#0d9488";
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
    if (targetCoords && targetCoords.length === 2 && Number.isFinite(targetCoords[0]) && Number.isFinite(targetCoords[1])) {
      map.flyTo(targetCoords, zoom || 5, { duration: 1.0 });
    }
  }, [targetCoords, zoom, map]);
  return null;
}

export default function RiverMineralDashboard({ onLocationChange }) {
  const [rivers, setRivers] = useState(DEFAULT_RIVERS);
  const [minerals, setMinerals] = useState(DEFAULT_MINERALS);
  const [searchText, setSearchText] = useState("");
  const [selectedRiverId, setSelectedRiverId] = useState("");
  const [selectedMineralType, setSelectedMineralType] = useState("");
  const [clickedPin, setClickedPin] = useState(null);
  const [inspectData, setInspectData] = useState(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  useEffect(() => {
    fetch(`${window.location.origin}/api/rivers`)
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d) ? d : (d.rivers || []);
        if (list.length > 0) setRivers(list);
      })
      .catch(() => {});

    fetch(`${window.location.origin}/api/minerals`)
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d) ? d : (d.minerals || []);
        if (list.length > 0) setMinerals(list);
      })
      .catch(() => {});
  }, []);

  const handleMapClick = async (clat, clon) => {
    const latNum = Number(Number(clat).toFixed(4));
    const lonNum = Number(Number(clon).toFixed(4));
    setClickedPin([latNum, lonNum]);
    setInspectLoading(true);
    setInspectData({
      place_name: `Clicked Position (${latNum}? N, ${lonNum}? E)`,
      lat: latNum,
      lon: lonNum,
      weather: {},
      air_quality: {}
    });
    if (typeof onLocationChange === "function") {
      onLocationChange({ name: `Pin (${latNum}?N, ${lonNum}?E)`, lat: latNum, lng: lonNum });
    }
    try {
      const res = await fetch(`${window.location.origin}/api/map-inspect?lat=${latNum}&lon=${lonNum}`);
      const data = await res.json();
      setInspectData(data);
      if (typeof onLocationChange === "function" && data?.place_name) {
        onLocationChange({ name: data.place_name, lat: latNum, lng: lonNum });
      }
    } catch {
      // keep live client Open-Meteo telemetry banner active
    } finally {
      setInspectLoading(false);
    }
  };

  const mineralTypes = useMemo(() => {
    const set = new Set(minerals.map(m => m.mineral).filter(Boolean));
    return Array.from(set);
  }, [minerals]);

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
    if (selectedMineralType) {
      const firstValid = visibleMinerals.find(m => Number.isFinite(Number(m?.lat)) && Number.isFinite(Number(m?.lon)));
      if (firstValid) return { coords: [Number(firstValid.lat), Number(firstValid.lon)], zoom: 6 };
    }
    return { coords: [22.35, 81.5], zoom: 5 };
  }, [selectedRiverId, selectedMineralType, visibleRivers, visibleMinerals]);

  const hasActiveFilter = Boolean(selectedRiverId || selectedMineralType || searchText.trim().length > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <LiveInspectBanner inspectData={inspectData} loading={inspectLoading} onClose={() => setInspectData(null)} />

      {/* River Basin & Mineral Deposit Selector Bar */}
      <div style={{
        background: "#0f172a",
        border: "1px solid #1e293b",
        borderRadius: 12,
        padding: 12,
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
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
          placeholder="Search river (Ganga, Mahanadi) or mineral (Iron Ore, Coal)..."
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
            Reset Filter (Show All)
          </button>
        )}
      </div>

      {/* Interactive Color-Coded Mineral Chips (Iron Ore, Coal, Bauxite, Gold, etc.) */}
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
        <span style={{ color: "#94a3b8", fontWeight: 600 }}>Select Mineral Type:</span>
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
                padding: "4px 11px",
                cursor: "pointer",
                fontWeight: isSelected ? 700 : 500,
                fontSize: 12
              }}
            >
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "inline-block" }} />
              {name}
            </button>
          );
        })}
      </div>

      {/* Real OpenStreetMap Interactive River & Mineral Map */}
      <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #1e293b" }}>
        <MapContainer center={[22.35, 81.5]} zoom={5} style={{ height: 430, width: "100%" }}>
          <TileLayer
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          <MapClickListener onMapClick={handleMapClick} />
          <MapAutoFocus targetCoords={focusView.coords} zoom={focusView.zoom} />

          {clickedPin && (
            <CircleMarker
              center={clickedPin}
              radius={10}
              pathOptions={{ color: "#0f172a", weight: 2, fillColor: "#38bdf8", fillOpacity: 0.95 }}
            >
              <Popup>
                <strong>Selected Map Coordinate</strong><br />
                Lat: {clickedPin[0]}? N | Lon: {clickedPin[1]}? E
              </Popup>
            </CircleMarker>
          )}

          {visibleRivers.map(r => {
            const coords = RIVER_PATHS[r.id.toLowerCase()];
            if (!coords) return null;
            const riverColor = r.damage_score > 75 ? "#dc2626" : r.damage_score > 60 ? "#d97706" : "#0284c7";
            return (
              <Polyline
                key={r.id}
                positions={coords}
                pathOptions={{ color: riverColor, weight: 5, opacity: 0.92 }}
              >
                <Popup>
                  <strong>{r.name}</strong><br />
                  States: {r.states}<br />
                  Plastic Load: {Number(r.plastic_tons_yr || 0).toLocaleString()} Tons/yr<br />
                  Ecological Damage: {r.damage_score}% ({r.damage_level})
                </Popup>
              </Polyline>
            );
          })}

          {visibleMinerals
            .filter(m => m && m.lat != null && m.lon != null && Number.isFinite(Number(m.lat)) && Number.isFinite(Number(m.lon)))
            .map((m, idx) => {
              const pinColor = getMineralColor(m.mineral);
              return (
                <CircleMarker
                  key={`${m.deposit_name}-${idx}`}
                  center={[Number(m.lat), Number(m.lon)]}
                  radius={9}
                  pathOptions={{
                    color: "#0f172a",
                    weight: 2,
                    fillColor: pinColor,
                    fillOpacity: 0.95
                  }}
                >
                  <Popup>
                    <strong style={{ color: pinColor }}>{m.mineral}</strong><br />
                    Deposit: {m.deposit_name}<br />
                    Grade: {m.grade}<br />
                    River Basin: {(m.river_id || "").toUpperCase()} ({Number(m.lat).toFixed(2)}?N, {Number(m.lon).toFixed(2)}?E)
                  </Popup>
                </CircleMarker>
              );
            })}
        </MapContainer>
      </div>

      {/* Selected Mineral Deposits Highlight Cards */}
      {selectedMineralType && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
          {visibleMinerals.map((m, idx) => {
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

      {/* River Basin Telemetry Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 10 }}>
        {visibleRivers.map(r => (
          <div key={r.id} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: 12 }}>
            <div style={{ fontWeight: 700, color: "#38bdf8", fontSize: 15 }}>{r.name}</div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>{r.states} ? Outlet: {r.outlet}</div>
            <div style={{ fontSize: 13, color: "#e2e8f0" }}>
              Plastic: <strong>{Number(r.plastic_tons_yr || 0).toLocaleString()} Tons/yr</strong> ? Damage: <strong>{r.damage_score}%</strong> ({r.damage_level})
            </div>
            <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 4 }}>{r.water_impact}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
