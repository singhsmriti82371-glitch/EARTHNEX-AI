import { useState, useMemo } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const INDIA_RIVERS = [
  {
    id: "mahanadi",
    name: "Mahanadi River",
    states: "Chhattisgarh, Odisha",
    outlet: "Bay of Bengal",
    minerals: ["Iron Ore", "Coal", "Chromite", "Diamond"],
    color: "#f97316",
    depositZones: [
      { name: "Korba Coalfield Basin", mineral: "Coal", lat: 22.35, lon: 82.68, grade: "High Thermal Grade" },
      { name: "Sukinda Valley Basin", mineral: "Chromite", lat: 21.02, lon: 85.78, grade: "90%+ National Reserve" },
      { name: "Hirakud-Sambalpur Alluvial", mineral: "Diamond", lat: 21.47, lon: 83.97, grade: "Alluvial Placer" }
    ],
    coords: [[20.25, 81.95], [21.25, 81.63], [21.47, 83.97], [20.85, 85.10], [20.46, 85.88], [20.28, 86.68]]
  },
  {
    id: "indravati",
    name: "Indravati & Sabari (Bastar Basin)",
    states: "Chhattisgarh, Odisha, Telangana",
    outlet: "Godavari -> Bay of Bengal",
    minerals: ["Iron Ore", "Tin & Rare Earths"],
    color: "#ef4444",
    depositZones: [
      { name: "Bailadila Iron Belt", mineral: "Iron Ore", lat: 18.63, lon: 81.23, grade: "67% Fe Hematite" },
      { name: "Dantewada Cassiterite", mineral: "Tin & Rare Earths", lat: 18.90, lon: 81.35, grade: "Primary Tin Belt" }
    ],
    coords: [[19.15, 82.55], [19.08, 82.02], [18.95, 81.35], [18.72, 80.75], [18.45, 80.28]]
  },
  {
    id: "subarnarekha",
    name: "Subarnarekha & Damodar Rivers",
    states: "Jharkhand, West Bengal, Odisha",
    outlet: "Bay of Bengal",
    minerals: ["Gold", "Copper", "Uranium", "Coal"],
    color: "#eab308",
    depositZones: [
      { name: "Subarnarekha Alluvial Sands", mineral: "Gold", lat: 22.80, lon: 86.20, grade: "Placer Gold (Streak of Gold)" },
      { name: "Singhbhum Shear Zone", mineral: "Uranium", lat: 22.65, lon: 86.35, grade: "Jaduguda Uranium Belt" },
      { name: "Mosabani-Ghatshila", mineral: "Copper", lat: 22.58, lon: 86.45, grade: "Sulfide Copper" },
      { name: "Jharia & Raniganj", mineral: "Coal", lat: 23.75, lon: 86.42, grade: "Prime Coking Coal" }
    ],
    coords: [[23.35, 85.32], [22.80, 86.20], [22.58, 86.45], [22.15, 86.85], [21.62, 87.38]]
  },
  {
    id: "ganga",
    name: "Ganga River System",
    states: "Uttarakhand, UP, Bihar, West Bengal",
    outlet: "Bay of Bengal",
    minerals: ["Gold", "Silica & Heavy Sands"],
    color: "#22c55e",
    depositZones: [
      { name: "Haridwar-Shivalik Placer", mineral: "Gold", lat: 29.94, lon: 78.16, grade: "Fine Alluvial Gold" },
      { name: "Prayagraj Silica Basin", mineral: "Silica & Heavy Sands", lat: 25.43, lon: 81.85, grade: "Glass-Grade Quartz" }
    ],
    coords: [[30.08, 78.26], [28.45, 78.05], [26.45, 80.35], [25.43, 81.85], [25.31, 83.01], [25.61, 85.14], [24.75, 87.92], [22.15, 88.15]]
  },
  {
    id: "godavari",
    name: "Godavari River",
    states: "Maharashtra, Telangana, Andhra Pradesh",
    outlet: "Bay of Bengal",
    minerals: ["Coal", "Iron Ore", "Diamond"],
    color: "#a855f7",
    depositZones: [
      { name: "Singareni Valley Coalfield", mineral: "Coal", lat: 18.67, lon: 79.90, grade: "Gondwana Bituminous Coal" },
      { name: "Kollur-Golconda Alluvial", mineral: "Diamond", lat: 16.72, lon: 80.15, grade: "Historic Alluvial Diamond" }
    ],
    coords: [[19.93, 73.53], [19.55, 75.72], [18.80, 77.95], [18.67, 79.90], [17.68, 81.25], [16.72, 82.22]]
  },
  {
    id: "krishna",
    name: "Krishna & Tungabhadra Rivers",
    states: "Maharashtra, Karnataka, Telangana, AP",
    outlet: "Bay of Bengal",
    minerals: ["Gold", "Diamond", "Iron Ore"],
    color: "#ec4899",
    depositZones: [
      { name: "Hutti-Raichur Gold Belt", mineral: "Gold", lat: 16.20, lon: 76.65, grade: "Active Lode Gold" },
      { name: "Bellary-Hospet Basin", mineral: "Iron Ore", lat: 15.27, lon: 76.39, grade: "High-Grade Hematite" },
      { name: "Krishna Gravel Beds", mineral: "Diamond", lat: 16.51, lon: 80.35, grade: "Alluvial Kimberlite Gravel" }
    ],
    coords: [[17.92, 73.66], [16.85, 75.71], [16.25, 77.35], [16.51, 80.62], [15.82, 80.98]]
  },
  {
    id: "narmada",
    name: "Narmada & Ken-Son Basin",
    states: "Madhya Pradesh, Gujarat",
    outlet: "Arabian Sea",
    minerals: ["Diamond", "Copper", "Coal"],
    color: "#06b6d4",
    depositZones: [
      { name: "Panna-Majhgawan Basin", mineral: "Diamond", lat: 24.72, lon: 80.18, grade: "Primary Kimberlite Pipe" },
      { name: "Malanjkhand Copper Belt", mineral: "Copper", lat: 22.03, lon: 80.72, grade: "Largest Open-Pit Copper" }
    ],
    coords: [[22.67, 81.75], [23.16, 79.93], [22.75, 77.72], [22.25, 76.05], [21.85, 73.72], [21.70, 72.62]]
  }
];

const MINERAL_TYPES = [
  { id: "ALL", label: "All Minerals (Show All Rivers)", color: "#38bdf8" },
  { id: "Iron Ore", label: "Iron Ore", color: "#ef4444" },
  { id: "Coal", label: "Coal", color: "#f97316" },
  { id: "Gold", label: "Gold", color: "#eab308" },
  { id: "Diamond", label: "Diamond", color: "#22d3ee" },
  { id: "Copper", label: "Copper", color: "#10b981" },
  { id: "Chromite", label: "Chromite", color: "#a855f7" },
  { id: "Uranium", label: "Uranium", color: "#f43f5e" }
];

export default function RiverMineralPage() {
  const [selectedMineral, setSelectedMineral] = useState("Iron Ore");

  const activeMineralObj = MINERAL_TYPES.find((m) => m.id === selectedMineral) || MINERAL_TYPES[0];

  const matchedRivers = useMemo(() => {
    if (selectedMineral === "ALL") return INDIA_RIVERS;
    return INDIA_RIVERS.filter((r) => r.minerals.includes(selectedMineral));
  }, [selectedMineral]);

  const listingRows = useMemo(() => {
    const rows = [];
    matchedRivers.forEach((river) => {
      river.depositZones
        .filter((z) => selectedMineral === "ALL" || z.mineral === selectedMineral)
        .forEach((zone) => {
          rows.push({
            riverName: river.name,
            states: river.states,
            outlet: river.outlet,
            mineral: zone.mineral,
            basinLocation: zone.name,
            grade: zone.grade,
            coords: `${(Number(zone.lat ?? 0)).toFixed(2)} N, ${(Number(zone.lon ?? 0)).toFixed(2)} E`
          });
        });
    });
    return rows;
  }, [matchedRivers, selectedMineral]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 54px)", background: "#060b16", color: "#f8fafc", overflowY: "auto" }}>
      <div style={{
        padding: "12px 20px", background: "#0f172a", borderBottom: "1px solid #1e293b",
        display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12
      }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#38bdf8" }}>
            India River Basins & Mineral Occurrence Explorer
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>
            Select any mineral below - matching rivers light up on the map in color and list below.
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {MINERAL_TYPES.map((m) => {
            const isSelected = selectedMineral === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setSelectedMineral(m.id)}
                style={{
                  background: isSelected ? m.color : "#1e293b",
                  color: isSelected && (m.id === "Gold" || m.id === "Diamond") ? "#0f172a" : "#f8fafc",
                  border: `1px solid ${isSelected ? "#ffffff" : "#334155"}`,
                  borderRadius: 8, padding: "6px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer"
                }}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ position: "relative", height: "54vh", minHeight: 360, width: "100%", borderBottom: "1px solid #1e293b" }}>
        <MapContainer center={[22.2, 81.5]} zoom={5} minZoom={4} maxZoom={16} style={{ height: "100%", width: "100%" }}>
          <TileLayer maxZoom={18} attribution="&copy; OpenStreetMap" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />

          {INDIA_RIVERS.map((river) => {
            const isMatch = selectedMineral === "ALL" || river.minerals.includes(selectedMineral);
            const lineColor = isMatch ? (selectedMineral === "ALL" ? river.color : activeMineralObj.color) : "#334155";
            return (
              <Polyline
                key={`${river.id}-${selectedMineral}`}
                positions={river.coords}
                pathOptions={{
                  color: lineColor,
                  weight: isMatch ? 6 : 2.5,
                  opacity: isMatch ? 0.98 : 0.35,
                  dashArray: isMatch ? undefined : "6 6"
                }}
              >
                <Tooltip sticky>
                  <b>{river.name}</b> ({river.states})<br />
                  Minerals Found: <b>{river.minerals.join(", ")}</b>
                </Tooltip>
              </Polyline>
            );
          })}

          {matchedRivers.map((river) =>
            river.depositZones
              .filter((z) => selectedMineral === "ALL" || z.mineral === selectedMineral)
              .map((z, idx) => (
                <CircleMarker
                  key={`${river.id}-zone-${idx}`}
                  center={[z.lat, z.lon]}
                  radius={9}
                  pathOptions={{
                    color: "#ffffff",
                    weight: 2,
                    fillColor: activeMineralObj.color,
                    fillOpacity: 0.95
                  }}
                >
                  <Tooltip permanent direction="top" offset={[0, -8]}>
                    <b>{z.mineral}</b> - {z.name}
                  </Tooltip>
                  <Popup>
                    <b>{z.mineral} Deposit</b><br />
                    Location: {z.name}<br />
                    River Basin: {river.name}<br />
                    Grade: {z.grade}
                  </Popup>
                </CircleMarker>
              ))
          )}
        </MapContainer>

        <div style={{
          position: "absolute", bottom: 16, right: 16, zIndex: 1000,
          background: "rgba(15, 23, 42, 0.94)", border: "1px solid #334155",
          borderRadius: 10, padding: "10px 14px", fontSize: 12
        }}>
          <div style={{ fontWeight: 700, color: activeMineralObj.color, marginBottom: 4 }}>
            Showing: {activeMineralObj.label}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ width: 22, height: 5, background: activeMineralObj.color, display: "inline-block", borderRadius: 2 }} />
            <span>River Basin WITH {selectedMineral === "ALL" ? "Minerals" : selectedMineral} ({matchedRivers.length} Rivers)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#94a3b8" }}>
            <span style={{ width: 22, height: 2, background: "#475569", display: "inline-block" }} />
            <span>Other Indian Rivers</span>
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 20px", flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h3 style={{ margin: 0, fontSize: 15, color: "#f8fafc" }}>
            River & Mineral Basin Listing - <span style={{ color: activeMineralObj.color }}>{activeMineralObj.label}</span> ({listingRows.length} Locations Found)
          </h3>
        </div>

        <div style={{ overflowX: "auto", border: "1px solid #1e293b", borderRadius: 10 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#0f172a", color: "#38bdf8", borderBottom: "1px solid #1e293b" }}>
                <th style={{ padding: "10px 12px" }}>River Name</th>
                <th style={{ padding: "10px 12px" }}>Mineral Type</th>
                <th style={{ padding: "10px 12px" }}>Deposit / Basin Location</th>
                <th style={{ padding: "10px 12px" }}>States</th>
                <th style={{ padding: "10px 12px" }}>Quality / Grade</th>
                <th style={{ padding: "10px 12px" }}>Coordinates</th>
              </tr>
            </thead>
            <tbody>
              {listingRows.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid #1e293b", background: idx % 2 === 0 ? "#09111e" : "#0b1526" }}>
                  <td style={{ padding: "9px 12px", fontWeight: 700, color: "#38bdf8" }}>{row.riverName}</td>
                  <td style={{ padding: "9px 12px" }}>
                    <span style={{
                      background: activeMineralObj.color,
                      color: (row.mineral === "Gold" || row.mineral === "Diamond") ? "#0f172a" : "#ffffff",
                      padding: "2px 8px", borderRadius: 999, fontSize: 11.5, fontWeight: 700
                    }}>
                      {row.mineral}
                    </span>
                  </td>
                  <td style={{ padding: "9px 12px", fontWeight: 600 }}>{row.basinLocation}</td>
                  <td style={{ padding: "9px 12px", color: "#cbd5e1" }}>{row.states}</td>
                  <td style={{ padding: "9px 12px", color: "#94a3b8" }}>{row.grade}</td>
                  <td style={{ padding: "9px 12px", color: "#64748b", fontFamily: "monospace" }}>{row.coords}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
