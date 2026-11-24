import React, { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from "react-leaflet";
import { MapClickListener, LiveInspectBanner } from "./MapClickInspector";

const DEFAULT_RIVERS = [
  { id: "ganga", name: "Ganga River Basin", states: "Uttarakhand, UP, Bihar, Jharkhand, West Bengal", outlet: "Bay of Bengal", plastic_tons_yr: 115000, microplastic_conc: "420 particles/m?", damage_score: 84, damage_level: "Critical", water_impact: "High urban sewage, industrial effluent, and macro/microplastic transport into the Sundarbans delta." },
  { id: "yamuna", name: "Yamuna River Basin", states: "Uttarakhand, Himachal, Haryana, Delhi, UP", outlet: "Ganga (Prayagraj)", plastic_tons_yr: 48500, microplastic_conc: "510 particles/m?", damage_score: 88, damage_level: "Severe", water_impact: "Severe dissolved oxygen depletion and industrial chemical foam across the Delhi?Agra stretch." },
  { id: "brahmaputra", name: "Brahmaputra River Basin", states: "Arunachal Pradesh, Assam, Meghalaya", outlet: "Bay of Bengal", plastic_tons_yr: 34200, microplastic_conc: "190 particles/m?", damage_score: 56, damage_level: "Moderate", water_impact: "Monsoon siltation and flood-driven plastic runoff across Assam valley wetlands." },
  { id: "mahanadi", name: "Mahanadi River Basin", states: "Chhattisgarh, Odisha", outlet: "Bay of Bengal", plastic_tons_yr: 29400, microplastic_conc: "235 particles/m?", damage_score: 64, damage_level: "Elevated", water_impact: "Mining runoff, thermal ash, and municipal waste along Raipur°Cuttack corridor." },
  { id: "godavari", name: "Godavari River Basin", states: "Maharashtra, Telangana, Chhattisgarh, Andhra Pradesh", outlet: "Bay of Bengal", plastic_tons_yr: 38900, microplastic_conc: "260 particles/m?", damage_score: 68, damage_level: "Elevated", water_impact: "Agricultural fertilizer runoff and industrial discharge near Nashik and Rajahmundry." },
  { id: "krishna", name: "Krishna River Basin", states: "Maharashtra, Karnataka, Telangana, Andhra Pradesh", outlet: "Bay of Bengal", plastic_tons_yr: 31800, microplastic_conc: "245 particles/m?", damage_score: 65, damage_level: "Elevated", water_impact: "Reservoir trapping of microplastics and urban discharge from Pune and Vijayawada." },
  { id: "narmada", name: "Narmada River Basin", states: "Madhya Pradesh, Maharashtra, Gujarat", outlet: "Arabian Sea", plastic_tons_yr: 18600, microplastic_conc: "155 particles/m?", damage_score: 49, damage_level: "Moderate", water_impact: "Relatively lower industrial plastic load with localized estuarine accumulation at Bharuch." },
  { id: "cauvery", name: "Cauvery River Basin", states: "Karnataka, Tamil Nadu, Kerala, Puducherry", outlet: "Bay of Bengal", plastic_tons_yr: 24100, microplastic_conc: "275 particles/m?", damage_score: 69, damage_level: "Elevated", water_impact: "Textile dyeing effluents and dense agricultural abstraction in the delta." }
];

const DEFAULT_MINERALS = [
  { river_id: "mahanadi", mineral: "Iron Ore", deposit_name: "Bailadila & Dalli-Rajhara Belt (Chhattisgarh)", lat: 20.58, lon: 81.20, quantity_mt: 1420, unit: "Million Tons", grade: "High-Grade Hematite (65% Fe)" },
  { river_id: "mahanadi", mineral: "Iron Ore", deposit_name: "Keonjhar-Sundargarh Belt (Odisha)", lat: 21.82, lon: 85.15, quantity_mt: 2650, unit: "Million Tons", grade: "62-65% Fe Hematite" },
  { river_id: "godavari", mineral: "Iron Ore", deposit_name: "Surjagarh-Gadchiroli Iron Belt (Maharashtra)", lat: 19.45, lon: 80.15, quantity_mt: 540, unit: "Million Tons", grade: "63% Fe Hematite" },
  { river_id: "krishna", mineral: "Iron Ore", deposit_name: "Bellary-Hospet Iron Belt (Karnataka)", lat: 15.27, lon: 76.92, grade: "64% Fe", quantity_mt: 1180, unit: "Million Tons" },
  { river_id: "mahanadi", mineral: "Coal", deposit_name: "Korba & Talcher Coalfields (CG-Odisha)", lat: 21.35, lon: 83.85, quantity_mt: 51200, unit: "Million Tons", grade: "Thermal Grade G4-G6" },
  { river_id: "ganga", mineral: "Coal", deposit_name: "Jharia & Raniganj Coalfields (Jharkhand-WB)", lat: 23.74, lon: 86.41, quantity_mt: 44800, unit: "Million Tons", grade: "Prime Coking Coal" },
  { river_id: "godavari", mineral: "Coal", deposit_name: "Singareni Collieries (Telangana)", lat: 17.65, lon: 80.55, quantity_mt: 22400, unit: "Million Tons", grade: "Non-Coking Bituminous" },
  { river_id: "brahmaputra", mineral: "Coal", deposit_name: "Makum-Margherita Coalfield (Assam)", lat: 27.28, lon: 95.35, quantity_mt: 520, unit: "Million Tons", grade: "Low-Ash Tertiary Coal" },
  { river_id: "mahanadi", mineral: "Bauxite", deposit_name: "Panchpatmali & Mainpat Plateau (Odisha-CG)", lat: 20.65, lon: 83.10, quantity_mt: 1740, unit: "Million Tons", grade: "46% Al2O3 Metallurgical" },
  { river_id: "narmada", mineral: "Bauxite", deposit_name: "Amarkantak-Maikal Hills (MP-CG)", lat: 22.67, lon: 81.75, quantity_mt: 380, unit: "Million Tons", grade: "45% Al2O3" },
  { river_id: "godavari", mineral: "Manganese", deposit_name: "Balaghat-Nagpur Manganese Belt (MP-MH)", lat: 20.45, lon: 79.65, quantity_mt: 165, unit: "Million Tons", grade: "48% Mn High-Grade" },
  { river_id: "krishna", mineral: "Gold", deposit_name: "Hutti & Gadag Gold Fields (Karnataka)", lat: 16.20, lon: 76.66, quantity_mt: 42, unit: "Million Tons Ore", grade: "4.5 g/t Au" },
  { river_id: "ganga", mineral: "Uranium", deposit_name: "Jaduguda Uranium Mines (Singhbhum)", lat: 22.65, lon: 86.35, quantity_mt: 145, unit: "Thousand Tons U3O8", grade: "0.065% U3O8" },
  { river_id: "mahanadi", mineral: "Limestone", deposit_name: "Baloda Bazar-Raipur Cement Belt (CG)", lat: 21.55, lon: 82.15, quantity_mt: 4900, unit: "Million Tons", grade: "Cement Grade CaO 48%" },
  { river_id: "narmada", mineral: "Copper", deposit_name: "Malanjkhand-Balaghat Copper Belt (MP)", lat: 22.12, lon: 80.71, quantity_mt: 245, unit: "Million Tons Ore", grade: "1.2% Cu Porphyry" },
  { river_id: "ganga", mineral: "Copper", deposit_name: "Singhbhum Copper Belt (Ghatsila-Jharkhand)", lat: 22.60, lon: 86.48, quantity_mt: 135, unit: "Million Tons Ore", grade: "1.05% Cu" },
  { river_id: "yamuna", mineral: "Limestone", deposit_name: "Dehradun-Sirmaur Carbonate Belt (UK-HP)", lat: 30.32, lon: 77.95, quantity_mt: 1120, unit: "Million Tons", grade: "High-Purity CaCO3" },
  { river_id: "cauvery", mineral: "Limestone", deposit_name: "Ariyalur-Tiruchirappalli Belt (Tamil Nadu)", lat: 11.14, lon: 79.08, quantity_mt: 1680, unit: "Million Tons", grade: "Cement Grade CaO 47%" }
];

const MINERAL_COLORS = {
  "Iron Ore": "#dc2626",
  "Coal": "#d97706",
  "Bauxite": "#0284c7",
  "Manganese": "#9333ea",
  "Gold": "#eab308",
  "Uranium": "#16a34a",
  "Limestone": "#db2777",
  "Copper": "#ea580c"
};

function getMineralColor(mineralName = "") {
  const exact = Object.keys(MINERAL_COLORS).find(
    k => k.toLowerCase() === mineralName.trim().toLowerCase()
  );
  if (exact) return MINERAL_COLORS[exact];
  const partial = Object.keys(MINERAL_COLORS).find(
    k => mineralName.toLowerCase().includes(k.toLowerCase())
  );
  return partial ? MINERAL_COLORS[partial] : "#0d9488";
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
      map.flyTo(targetCoords, zoom || 5, { duration: 0.9 });
    }
  }, [targetCoords, zoom, map]);
  return null;
}

export default function RiverMineralDashboard({ onLocationChange }) {
  const [rivers, setRivers] = useState(DEFAULT_RIVERS);
  const [minerals, setMinerals] = useState(DEFAULT_MINERALS);
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
        if (list.length > 0) {
          // Merge API minerals with DEFAULT_MINERALS quantity/unit metadata if missing
          const enriched = list.map(item => {
            const match = DEFAULT_MINERALS.find(
              dm => dm.mineral.toLowerCase() === (item.mineral || "").toLowerCase() &&
                    (dm.river_id || "").toLowerCase() === (item.river_id || "").toLowerCase()
            );
            return {
              ...item,
              quantity_mt: item.quantity_mt ?? match?.quantity_mt ?? 350,
              unit: item.unit ?? match?.unit ?? "Million Tons"
            };
          });
          setMinerals(enriched);
        }
      })
      .catch(() => {});
  }, []);

  const riverNameMap = useMemo(() => {
    const map = {};
    rivers.forEach(r => { map[r.id.toLowerCase()] = r.name; });
    return map;
  }, [rivers]);

  const handleMapClick = async (clat, clon) => {
    const latNum = Number(Number(clat).toFixed(4));
    const lonNum = Number(Number(clon).toFixed(4));
    setClickedPin([latNum, lonNum]);
    setInspectLoading(true);
    setInspectData({
      place_name: `Clicked Position (${latNum}° N, ${lonNum}° E)`,
      lat: latNum,
      lon: lonNum,
      weather: {},
      air_quality: {}
    });
    if (typeof onLocationChange === "function") {
      onLocationChange({ name: `Pin (${latNum}°N, ${lonNum}°E)`, lat: latNum, lng: lonNum });
    }
    try {
      const res = await fetch(`${window.location.origin}/api/map-inspect?lat=${latNum}&lon=${lonNum}`);
      const data = await res.json();
      setInspectData(data);
      if (typeof onLocationChange === "function" && data?.place_name) {
        onLocationChange({ name: data.place_name, lat: latNum, lng: lonNum });
      }
    } catch {
      // Keep client Open-Meteo telemetry active
    } finally {
      setInspectLoading(false);
    }
  };

  const mineralTypes = useMemo(() => {
    const set = new Set(minerals.map(m => m.mineral).filter(Boolean));
    return Array.from(set);
  }, [minerals]);

  // 1. Cross-Filtered Minerals:
  //    - If River is selected -> ONLY minerals inside that River Basin
  //    - If Mineral is selected -> ONLY deposits of that exact Mineral Type
  //    - If BOTH are selected -> ONLY that Mineral Type inside that River Basin
  const filteredMinerals = useMemo(() => {
    return minerals.filter(m => {
      const matchRiver = !selectedRiverId || (m.river_id || "").toLowerCase() === selectedRiverId.toLowerCase();
      const matchMineral = !selectedMineralType || (m.mineral || "").toLowerCase() === selectedMineralType.toLowerCase();
      return matchRiver && matchMineral;
    });
  }, [minerals, selectedRiverId, selectedMineralType]);

  // 2. Cross-Filtered Rivers:
  //    - If River is selected -> ONLY that River Basin
  //    - If ONLY Mineral is selected -> ALL River Basins where that Mineral occurs
  const filteredRivers = useMemo(() => {
    if (selectedRiverId) {
      return rivers.filter(r => r.id.toLowerCase() === selectedRiverId.toLowerCase());
    }
    if (selectedMineralType) {
      const basinIdsWithMineral = new Set(filteredMinerals.map(m => (m.river_id || "").toLowerCase()));
      return rivers.filter(r => basinIdsWithMineral.has(r.id.toLowerCase()));
    }
    return rivers;
  }, [rivers, selectedRiverId, selectedMineralType, filteredMinerals]);

  // 3. Aggregated Quantity Breakdown (For the Analytical Card)
  const quantityBreakdown = useMemo(() => {
    if (selectedRiverId && !selectedMineralType) {
      // Group by Mineral Type inside this River Basin
      const grouped = {};
      filteredMinerals.forEach(m => {
        if (!grouped[m.mineral]) {
          grouped[m.mineral] = { key: m.mineral, label: m.mineral, totalQty: 0, unit: m.unit || "Million Tons", deposits: [] };
        }
        grouped[m.mineral].totalQty += Number(m.quantity_mt || 0);
        grouped[m.mineral].deposits.push(m.deposit_name);
      });
      return Object.values(grouped);
    }
    if (selectedMineralType) {
      // Group by River Basin where this Mineral is found
      const grouped = {};
      filteredMinerals.forEach(m => {
        const rid = (m.river_id || "other").toLowerCase();
        const rLabel = riverNameMap[rid] || rid.toUpperCase();
        if (!grouped[rid]) {
          grouped[rid] = { key: rid, label: rLabel, totalQty: 0, unit: m.unit || "Million Tons", deposits: [] };
        }
        grouped[rid].totalQty += Number(m.quantity_mt || 0);
        grouped[rid].deposits.push(m.deposit_name);
      });
      return Object.values(grouped);
    }
    return [];
  }, [selectedRiverId, selectedMineralType, filteredMinerals, riverNameMap]);

  const focusView = useMemo(() => {
    if (selectedRiverId && filteredRivers.length > 0) {
      const path = RIVER_PATHS[filteredRivers[0].id.toLowerCase()];
      if (path && path.length > 0) return { coords: path[Math.floor(path.length / 2)], zoom: 6 };
    }
    if (selectedMineralType && filteredMinerals.length > 0) {
      const valid = filteredMinerals.find(m => Number.isFinite(Number(m?.lat)) && Number.isFinite(Number(m?.lon)));
      if (valid) return { coords: [Number(valid.lat), Number(valid.lon)], zoom: 5 };
    }
    return { coords: [22.35, 81.5], zoom: 5 };
  }, [selectedRiverId, selectedMineralType, filteredRivers, filteredMinerals]);

  const activeMineralColor = selectedMineralType ? getMineralColor(selectedMineralType) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <LiveInspectBanner inspectData={inspectData} loading={inspectLoading} onClose={() => setInspectData(null)} />

      {/* 1. Synchronized River Basin & Mineral Type Selector Bar */}
      <div style={{
        background: "#0f172a",
        border: "1px solid #1e293b",
        borderRadius: 12,
        padding: 12,
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 10,
        alignItems: "center"
      }}>
        <div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4, fontWeight: 600 }}>STEP 1: SELECT RIVER BASIN</div>
          <select
            value={selectedRiverId}
            onChange={e => setSelectedRiverId(e.target.value)}
            style={{
              width: "100%",
              background: "#090d16",
              border: `1px solid ${selectedRiverId ? "#38bdf8" : "#334155"}`,
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
        </div>

        <div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4, fontWeight: 600 }}>STEP 2: SELECT MINERAL TYPE</div>
          <select
            value={selectedMineralType}
            onChange={e => setSelectedMineralType(e.target.value)}
            style={{
              width: "100%",
              background: "#090d16",
              border: `1px solid ${activeMineralColor || "#334155"}`,
              borderRadius: 8,
              padding: "9px 12px",
              color: "#f8fafc",
              fontSize: 13
            }}
          >
            <option value="">All Minerals in Selected Basin ({filteredMinerals.length})</option>
            {mineralTypes.map(mt => (
              <option key={mt} value={mt}>{mt}</option>
            ))}
          </select>
        </div>

        {(selectedRiverId || selectedMineralType) && (
          <div style={{ alignSelf: "end" }}>
            <button
              onClick={() => {
                setSelectedRiverId("");
                setSelectedMineralType("");
              }}
              style={{
                width: "100%",
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
              Reset Selection (Show All)
            </button>
          </div>
        )}
      </div>

      {/* 2. Strict Single-Color Mineral Legend Chips */}
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
        <span style={{ color: "#94a3b8", fontWeight: 600 }}>Mineral Color Key:</span>
        {Object.entries(MINERAL_COLORS).map(([name, color]) => {
          const isSelected = selectedMineralType.toLowerCase() === name.toLowerCase();
          return (
            <button
              key={name}
              onClick={() => setSelectedMineralType(isSelected ? "" : name)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: isSelected ? color : "transparent",
                border: `1px solid ${color}`,
                color: isSelected ? "#ffffff" : "#e2e8f0",
                borderRadius: 999,
                padding: "4px 11px",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 12
              }}
            >
              <span style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: isSelected ? "#ffffff" : color,
                display: "inline-block"
              }} />
              {name}
            </button>
          );
        })}
      </div>

      {/* 3. Clear Quantity & Distribution Summary Panel (Answers "Which minerals & what quantity?" or "Which rivers & what quantity?") */}
      {(selectedRiverId || selectedMineralType) && (
        <div style={{
          background: "linear-gradient(135deg, #0f172a 0%, #172554 100%)",
          border: `1px solid ${activeMineralColor || "#38bdf8"}`,
          borderRadius: 12,
          padding: 14,
          color: "#f8fafc"
        }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: activeMineralColor || "#38bdf8", marginBottom: 6 }}>
            {selectedRiverId && !selectedMineralType && (
              <>Minerals Found in {riverNameMap[selectedRiverId.toLowerCase()]} ({filteredMinerals.length} Deposits)</>
            )}
            {selectedMineralType && !selectedRiverId && (
              <>River Basins Containing {selectedMineralType} ({filteredRivers.length} Basins - {filteredMinerals.length} Deposits)</>
            )}
            {selectedRiverId && selectedMineralType && (
              <>{selectedMineralType} Deposits Inside {riverNameMap[selectedRiverId.toLowerCase()]} ({filteredMinerals.length} Found)</>
            )}
          </div>

          {quantityBreakdown.length === 0 ? (
            <div style={{ fontSize: 13, color: "#cbd5e1" }}>
              No {selectedMineralType || "mineral"} deposits are recorded in {riverNameMap[selectedRiverId.toLowerCase()] || "this basin"}.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 10, marginTop: 8 }}>
              {quantityBreakdown.map(item => {
                const badgeColor = selectedMineralType ? getMineralColor(selectedMineralType) : getMineralColor(item.key);
                return (
                  <div key={item.key} style={{ background: "#090d16", border: `1px solid ${badgeColor}`, borderRadius: 8, padding: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700, color: badgeColor, fontSize: 13.5 }}>
                        <span style={{ width: 10, height: 10, borderRadius: "50%", background: badgeColor }} />
                        {item.label}
                      </span>
                      <span style={{ fontWeight: 700, color: "#4ade80", fontSize: 13 }}>
                        {item.totalQty.toLocaleString()} {item.unit}
                      </span>
                    </div>
                    <div style={{ fontSize: 11.5, color: "#cbd5e1", marginTop: 5 }}>
                      Belts: {item.deposits.join(" - ")}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. Interactive Real Map (Shows ONLY matching River Basin(s) and exact Color-Coded Mineral Pins) */}
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
              radius={9}
              pathOptions={{ color: "#ffffff", weight: 2, fillColor: "#0284c7", fillOpacity: 0.95 }}
            >
              <Popup>
                <strong>Selected Map Coordinate</strong><br />
                Lat: {clickedPin[0]}° N | Lon: {clickedPin[1]}° E
              </Popup>
            </CircleMarker>
          )}

          {/* Highlighted River Basin Line(s) */}
          {filteredRivers.map(r => {
            const coords = RIVER_PATHS[r.id.toLowerCase()];
            if (!coords) return null;
            const lineColor = selectedMineralType ? getMineralColor(selectedMineralType) : "#0284c7";
            return (
              <Polyline
                key={r.id}
                positions={coords}
                pathOptions={{ color: lineColor, weight: 6, opacity: 0.92 }}
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

          {/* Exact Color-Coded Mineral Pins (Strictly filtered to selected River / Mineral) */}
          {filteredMinerals
            .filter(m => m && m.lat != null && m.lon != null && Number.isFinite(Number(m.lat)) && Number.isFinite(Number(m.lon)))
            .map((m, idx) => {
              const pinColor = getMineralColor(m.mineral);
              return (
                <CircleMarker
                  key={`${m.deposit_name}-${idx}`}
                  center={[Number(m.lat), Number(m.lon)]}
                  radius={10}
                  pathOptions={{
                    color: "#ffffff",
                    weight: 2,
                    fillColor: pinColor,
                    fillOpacity: 0.95
                  }}
                >
                  <Popup>
                    <strong style={{ color: pinColor, fontSize: 14 }}>{m.mineral}</strong><br />
                    <strong>Deposit:</strong> {m.deposit_name}<br />
                    <strong>River Basin:</strong> {riverNameMap[(m.river_id || "").toLowerCase()] || (m.river_id || "").toUpperCase()}<br />
                    <strong>Reserve Quantity:</strong> {Number(m.quantity_mt || 0).toLocaleString()} {m.unit || "Million Tons"}<br />
                    <strong>Grade:</strong> {m.grade}
                  </Popup>
                </CircleMarker>
              );
            })}
        </MapContainer>
      </div>

      {/* 5. Detailed Deposit Cards for Current Selection */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 10 }}>
        {filteredMinerals.map((m, idx) => {
          const badgeColor = getMineralColor(m.mineral);
          return (
            <div key={`${m.deposit_name}-detail-${idx}`} style={{ background: "#0f172a", border: `1px solid ${badgeColor}`, borderRadius: 10, padding: 11 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700, color: badgeColor, fontSize: 14 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: badgeColor }} />
                  {m.mineral}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#4ade80" }}>
                  {Number(m.quantity_mt || 0).toLocaleString()} {m.unit || "Million Tons"}
                </span>
              </div>
              <div style={{ fontWeight: 600, color: "#f8fafc", fontSize: 13, marginTop: 4 }}>{m.deposit_name}</div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                Basin: <strong style={{ color: "#e2e8f0" }}>{riverNameMap[(m.river_id || "").toLowerCase()] || (m.river_id || "").toUpperCase()}</strong> - {m.grade}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
