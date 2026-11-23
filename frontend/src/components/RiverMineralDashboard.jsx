import { MapClickListener, LiveInspectBanner } from "./MapClickInspector.jsx";
﻿import { useState, useMemo, useEffect } from "react";
import { MapContainer, TileLayer, Polyline, Polygon, CircleMarker, Tooltip, Popup, LayersControl, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const INDIA_RIVERS = [
  {
    id: "mahanadi",
    name: "Mahanadi River",
    states: "Chhattisgarh, Odisha",
    outlet: "Bay of Bengal",
    oceanId: "bay_of_bengal",
    minerals: ["Iron Ore", "Coal", "Chromite", "Diamond"],
    color: "#f97316",
    deposits: [
      { name: "Korba Coalfield Basin", mineral: "Coal", lat: 22.35, lon: 82.68, grade: "High Thermal Grade" },
      { name: "Sukinda Valley Basin", mineral: "Chromite", lat: 21.02, lon: 85.78, grade: "90%+ National Reserve" },
      { name: "Hirakud-Sambalpur Alluvial", mineral: "Diamond", lat: 21.47, lon: 83.97, grade: "Alluvial Placer" }
    ],
    coords: [[20.25, 81.95], [21.25, 81.63], [21.47, 83.97], [20.85, 85.10], [20.46, 85.88], [20.28, 86.68]]
  },
  {
    id: "indravati",
    name: "Indravati & Sabari (Bastar)",
    states: "Chhattisgarh, Odisha, Telangana",
    outlet: "Bay of Bengal",
    oceanId: "bay_of_bengal",
    minerals: ["Iron Ore", "Tin & Rare Earths"],
    color: "#ef4444",
    deposits: [
      { name: "Bailadila Iron Range", mineral: "Iron Ore", lat: 18.63, lon: 81.23, grade: "67% Fe Hematite" },
      { name: "Dantewada Cassiterite", mineral: "Tin & Rare Earths", lat: 18.90, lon: 81.35, grade: "Primary Tin Belt" }
    ],
    coords: [[19.15, 82.55], [19.08, 82.02], [18.95, 81.35], [18.72, 80.75], [18.45, 80.28]]
  },
  {
    id: "subarnarekha",
    name: "Subarnarekha & Damodar",
    states: "Jharkhand, West Bengal, Odisha",
    outlet: "Bay of Bengal",
    oceanId: "bay_of_bengal",
    minerals: ["Gold", "Copper", "Uranium", "Coal"],
    color: "#eab308",
    deposits: [
      { name: "Subarnarekha Alluvial Sands", mineral: "Gold", lat: 22.80, lon: 86.20, grade: "Alluvial Placer Gold" },
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
    oceanId: "bay_of_bengal",
    minerals: ["Gold", "Silica & Heavy Sands"],
    color: "#22c55e",
    deposits: [
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
    oceanId: "bay_of_bengal",
    minerals: ["Coal", "Iron Ore", "Diamond"],
    color: "#a855f7",
    deposits: [
      { name: "Singareni Valley Coalfield", mineral: "Coal", lat: 18.67, lon: 79.90, grade: "Gondwana Bituminous Coal" },
      { name: "Kollur-Golconda Alluvial", mineral: "Diamond", lat: 16.72, lon: 80.15, grade: "Alluvial Diamond Gravel" }
    ],
    coords: [[19.93, 73.53], [19.55, 75.72], [18.80, 77.95], [18.67, 79.90], [17.68, 81.25], [16.72, 82.22]]
  },
  {
    id: "krishna",
    name: "Krishna & Tungabhadra",
    states: "Maharashtra, Karnataka, Telangana, AP",
    outlet: "Bay of Bengal",
    oceanId: "bay_of_bengal",
    minerals: ["Gold", "Diamond", "Iron Ore"],
    color: "#ec4899",
    deposits: [
      { name: "Hutti-Raichur Gold Belt", mineral: "Gold", lat: 16.20, lon: 76.65, grade: "Active Lode Gold" },
      { name: "Bellary-Hospet Basin", mineral: "Iron Ore", lat: 15.27, lon: 76.39, grade: "High-Grade Hematite" },
      { name: "Krishna Gravel Beds", mineral: "Diamond", lat: 16.51, lon: 80.35, grade: "Kimberlite Gravel" }
    ],
    coords: [[17.92, 73.66], [16.85, 75.71], [16.25, 77.35], [16.51, 80.62], [15.82, 80.98]]
  },
  {
    id: "narmada",
    name: "Narmada & Tapi Basin",
    states: "Madhya Pradesh, Gujarat",
    outlet: "Arabian Sea",
    oceanId: "arabian_sea",
    minerals: ["Diamond", "Copper", "Coal"],
    color: "#06b6d4",
    deposits: [
      { name: "Panna-Majhgawan Basin", mineral: "Diamond", lat: 24.72, lon: 80.18, grade: "Primary Kimberlite Pipe" },
      { name: "Malanjkhand Copper Belt", mineral: "Copper", lat: 22.03, lon: 80.72, grade: "Open-Pit Copper" }
    ],
    coords: [[22.67, 81.75], [23.16, 79.93], [22.75, 77.72], [22.25, 76.05], [21.85, 73.72], [21.70, 72.62]]
  }
];

const OCEAN_BASINS = [
  {
    id: "bay_of_bengal",
    name: "Bay of Bengal (Eastern Ocean Basin)",
    center: [16.8, 87.2],
    seaLevelTrend: "+3.8 mm/yr",
    sst: "28.9 C",
    waveHeight: "1.6 m",
    salinity: "32.4 PSU",
    minerals: ["Heavy Mineral Sands", "Offshore Natural Gas", "Placer Gold & Monazite"],
    polygon: [
      [21.8, 87.2], [21.5, 91.5], [16.0, 92.5], [10.5, 91.0], [10.5, 80.5], [15.8, 80.8], [20.2, 86.7]
    ]
  },
  {
    id: "arabian_sea",
    name: "Arabian Sea (Western Ocean Basin)",
    center: [17.5, 68.5],
    seaLevelTrend: "+3.3 mm/yr",
    sst: "28.2 C",
    waveHeight: "1.9 m",
    salinity: "36.1 PSU",
    minerals: ["Offshore Hydrocarbons", "Ilmenite & Rutile Sands", "Calcareous Oozes"],
    polygon: [
      [23.5, 67.5], [21.7, 72.5], [18.9, 72.7], [14.5, 74.0], [9.5, 76.0], [9.5, 65.0], [18.0, 64.5]
    ]
  },
  {
    id: "indian_ocean",
    name: "Indian Ocean (Southern Deep Basin)",
    center: [7.2, 78.5],
    seaLevelTrend: "+3.5 mm/yr",
    sst: "29.1 C",
    waveHeight: "2.2 m",
    salinity: "34.8 PSU",
    minerals: ["Polymetallic Manganese Nodules", "Cobalt-Rich Crusts", "Rare Earth Muds"],
    polygon: [
      [9.5, 65.0], [9.5, 76.5], [10.5, 80.5], [10.5, 91.0], [4.5, 90.0], [4.5, 66.0]
    ]
  }
];

const FALLBACK_RIVERS = [
  { id: "ganga", name: "Ganga River System", states: "Uttarakhand, UP, Bihar, WB", outlet: "Bay of Bengal", oceanId: "bay_of_bengal", color: "#22c55e", plasticLoadTonsYr: 115000, microplasticConc: "42.8 particles/m3", damageScore: 89, damageLevel: "Critical Damage", damageColor: "#7f1d1d", waterImpact: "Severe floodplain microplastic accumulation; 34% dissolved oxygen drop.", coords: [[30.08,78.26],[28.45,78.05],[26.45,80.35],[25.43,81.85],[25.31,83.01],[25.61,85.14],[24.75,87.92],[22.15,88.15]], minerals: ["Gold","Silica"], deposits: [{ name: "Haridwar Placer", mineral: "Gold", lat: 29.94, lon: 78.16, grade: "Alluvial Gold" }] },
  { id: "mahanadi", name: "Mahanadi River", states: "Chhattisgarh, Odisha", outlet: "Bay of Bengal", oceanId: "bay_of_bengal", color: "#f97316", plasticLoadTonsYr: 24800, microplasticConc: "17.4 particles/m3", damageScore: 54, damageLevel: "Moderate Damage", damageColor: "#eab308", waterImpact: "Urban plastic discharge from Raipur-Cuttack affecting coastal wetlands.", coords: [[20.25,81.95],[21.25,81.63],[21.47,83.97],[20.85,85.10],[20.46,85.88],[20.28,86.68]], minerals: ["Coal","Chromite","Diamond"], deposits: [{ name: "Korba Basin", mineral: "Coal", lat: 22.35, lon: 82.68, grade: "Thermal Grade" }, { name: "Sukinda Valley", mineral: "Chromite", lat: 21.02, lon: 85.78, grade: "90% Reserve" }] },
  { id: "subarnarekha", name: "Subarnarekha & Damodar", states: "Jharkhand, WB, Odisha", outlet: "Bay of Bengal", oceanId: "bay_of_bengal", color: "#eab308", plasticLoadTonsYr: 46000, microplasticConc: "31.4 particles/m3", damageScore: 78, damageLevel: "High Damage", damageColor: "#dc2626", waterImpact: "Industrial polymer + coal-ash sludge choking estuarine habitats.", coords: [[23.35,85.32],[22.80,86.20],[22.58,86.45],[22.15,86.85],[21.62,87.38]], minerals: ["Gold","Uranium","Copper","Coal"], deposits: [{ name: "Subarnarekha Sands", mineral: "Gold", lat: 22.80, lon: 86.20, grade: "Placer Gold" }, { name: "Jaduguda Belt", mineral: "Uranium", lat: 22.65, lon: 86.35, grade: "Uranium Ore" }] },
  { id: "godavari", name: "Godavari River", states: "Maharashtra, Telangana, AP", outlet: "Bay of Bengal", oceanId: "bay_of_bengal", color: "#a855f7", plasticLoadTonsYr: 38500, microplasticConc: "24.6 particles/m3", damageScore: 68, damageLevel: "Moderate-High", damageColor: "#f97316", waterImpact: "Urban single-use plastic runoff blocking deltaic mangroves.", coords: [[19.93,73.53],[19.55,75.72],[18.80,77.95],[18.67,79.90],[17.68,81.25],[16.72,82.22]], minerals: ["Coal","Diamond"], deposits: [{ name: "Singareni Coalfield", mineral: "Coal", lat: 18.67, lon: 79.90, grade: "Bituminous Coal" }] },
  { id: "narmada", name: "Narmada & Tapi Basin", states: "Madhya Pradesh, Gujarat", outlet: "Arabian Sea", oceanId: "arabian_sea", color: "#06b6d4", plasticLoadTonsYr: 21500, microplasticConc: "15.2 particles/m3", damageScore: 49, damageLevel: "Moderate Damage", damageColor: "#eab308", waterImpact: "Estuary plastic drift impacting Gulf of Khambhat marine nurseries.", coords: [[22.67,81.75],[23.16,79.93],[22.75,77.72],[22.25,76.05],[21.85,73.72],[21.70,72.62]], minerals: ["Diamond","Copper"], deposits: [{ name: "Panna Basin", mineral: "Diamond", lat: 24.72, lon: 80.18, grade: "Kimberlite Pipe" }, { name: "Malanjkhand", mineral: "Copper", lat: 22.03, lon: 80.72, grade: "Copper Belt" }] },
  { id: "indravati", name: "Indravati & Sabari (Bastar)", states: "Chhattisgarh, Odisha", outlet: "Bay of Bengal", oceanId: "bay_of_bengal", color: "#ef4444", plasticLoadTonsYr: 6400, microplasticConc: "5.8 particles/m3", damageScore: 24, damageLevel: "Low Damage", damageColor: "#16a34a", waterImpact: "Minimal plastic footprint due to dense Bastar forest cover.", coords: [[19.15,82.55],[19.08,82.02],[18.95,81.35],[18.72,80.75],[18.45,80.28]], minerals: ["Iron Ore","Tin"], deposits: [{ name: "Bailadila Range", mineral: "Iron Ore", lat: 18.63, lon: 81.23, grade: "67% Fe Hematite" }] }
];
const FALLBACK_OCEANS = [
  { id: "bay_of_bengal", name: "Bay of Bengal (Eastern Basin)", center: [16.8, 87.2], seaLevelTrend: "+3.8 mm/yr", sst: "28.9 C", waveHeight: "1.6 m", plasticAccumulationTons: "2,65,000 Tons/yr", microplasticDensity: "36.5 particles/m3", damageScore: 84, damageStatus: "High Marine Stress", damageSummary: "Receives riverine plastic plumes from Ganga, Mahanadi & Godavari.", polygon: [[21.8,87.2],[21.5,91.5],[16.0,92.5],[10.5,91.0],[10.5,80.5],[15.8,80.8],[20.2,86.7]] },
  { id: "arabian_sea", name: "Arabian Sea (Western Basin)", center: [17.5, 68.5], seaLevelTrend: "+3.3 mm/yr", sst: "28.2 C", waveHeight: "1.9 m", plasticAccumulationTons: "1,18,000 Tons/yr", microplasticDensity: "21.8 particles/m3", damageScore: 67, damageStatus: "Moderate-High Stress", damageSummary: "Coastal urban plastic damaging western continental shelf fisheries.", polygon: [[23.5,67.5],[21.7,72.5],[18.9,72.7],[14.5,74.0],[9.5,76.0],[9.5,65.0],[18.0,64.5]] },
  { id: "indian_ocean", name: "Indian Ocean (Southern Basin)", center: [7.2, 78.5], seaLevelTrend: "+3.5 mm/yr", sst: "29.1 C", waveHeight: "2.2 m", plasticAccumulationTons: "74,000 Tons/yr", microplasticDensity: "14.2 particles/m3", damageScore: 52, damageStatus: "Moderate Drift", damageSummary: "Transboundary microplastic gyre currents.", polygon: [[9.5,65.0],[9.5,76.5],[10.5,80.5],[10.5,91.0],[4.5,90.0],[4.5,66.0]] }
];

const MINERAL_LIST = [
  { id: "ALL", label: "All Minerals", color: "#38bdf8" },
  { id: "Iron Ore", label: "Iron Ore", color: "#ef4444" },
  { id: "Coal", label: "Coal", color: "#f97316" },
  { id: "Gold", label: "Gold", color: "#eab308" },
  { id: "Diamond", label: "Diamond", color: "#22d3ee" },
  { id: "Copper", label: "Copper", color: "#10b981" },
  { id: "Chromite", label: "Chromite", color: "#a855f7" },
  { id: "Uranium", label: "Uranium", color: "#f43f5e" }
];

function MapFocusController({ riverObj, oceanObj }) {
  const map = useMap();
  useEffect(() => {
    if (oceanObj) {
      map.flyTo(oceanObj.center, 5, { animate: true, duration: 0.9 });
    } else if (riverObj && riverObj.coords.length > 0) {
      const mid = riverObj.coords[Math.floor(riverObj.coords.length / 2)];
      map.flyTo(mid, 6, { animate: true, duration: 0.9 });
    } else {
      map.flyTo([19.5, 81.0], 5, { animate: true, duration: 0.9 });
    }
  }, [riverObj, oceanObj]);
  return null;
}

export default function RiverMineralDashboard({ onContextUpdate }) {

  const [inspectData, setInspectData] = useState(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  const handleMapPointClick = async (clat, clon) => {
    setInspectLoading(true);
    try {
      const res = await fetch(`${window.location.origin}/api/map-inspect?lat=${clat}&lon=${clon}`);
      const data = await res.json();
      setInspectData(data);
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

  const [selectedMineral, setSelectedMineral] = useState("ALL");
  const [selectedRiverId, setSelectedRiverId] = useState("ALL");
  const [selectedOceanId, setSelectedOceanId] = useState("ALL");

  const mineralObj = MINERAL_LIST.find((m) => m.id === selectedMineral) || MINERAL_LIST[0];
  const riverObj = INDIA_RIVERS.find((r) => r.id === selectedRiverId) || null;
  const oceanObj = OCEAN_BASINS.find((o) => o.id === selectedOceanId) || null;

  const filteredRivers = useMemo(() => {
    return INDIA_RIVERS.filter((r) => {
      const matchMineral = selectedMineral === "ALL" || r.minerals.includes(selectedMineral);
      const matchRiver = selectedRiverId === "ALL" || r.id === selectedRiverId;
      const matchOcean = selectedOceanId === "ALL" || r.oceanId === selectedOceanId;
      return matchMineral && matchRiver && matchOcean;
    });
  }, [selectedMineral, selectedRiverId, selectedOceanId]);

  const tableRows = useMemo(() => {
    const rows = [];
    filteredRivers.forEach((river) => {
      river.deposits
        .filter((d) => selectedMineral === "ALL" || d.mineral === selectedMineral)
        .forEach((dep) => {
          rows.push({
            river: river.name,
            outlet: river.outlet,
            states: river.states,
            mineral: dep.mineral,
            depositName: dep.name,
            grade: dep.grade,
            coords: `${dep.lat.toFixed(2)} N, ${dep.lon.toFixed(2)} E`
          });
        });
    });
    return rows;
  }, [filteredRivers, selectedMineral]);

  useEffect(() => {
    if (onContextUpdate) {
      onContextUpdate({
        dashboard: "Dashboard 2: Rivers, Oceans & Minerals",
        selectedMineral,
        selectedRiver: riverObj ? riverObj.name : "All Indian Rivers",
        selectedOcean: oceanObj ? oceanObj.name : "All Surrounding Oceans",
        matchedRivers: filteredRivers.map((r) => r.name),
        totalDeposits: tableRows.length
      });
    }
  }, [selectedMineral, selectedRiverId, selectedOceanId, filteredRivers, tableRows]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr", height: "calc(100vh - 54px)", background: "#060b16", color: "#f8fafc" }}>
      {/* LEFT PANEL: River + Ocean + Mineral Controls & Interactive Map */}
      <div style={{ position: "relative", borderRight: "1px solid #1e293b", display: "flex", flexDirection: "column" }}>
        <div style={{
          padding: "10px 14px", background: "#0f172a", borderBottom: "1px solid #1e293b",
          display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", zIndex: 1100
        }}>
          {/* Filter 1: Select Ocean Basin */}
          <div>
            <div style={{ fontSize: 10, color: "#22d3ee", fontWeight: 700, marginBottom: 2 }}>1. OCEAN BASIN</div>
            <select
              value={selectedOceanId}
              onChange={(e) => {
                setSelectedOceanId(e.target.value);
                setSelectedRiverId("ALL");
              }}
              style={{ background: "#1e293b", color: "#f8fafc", border: "1px solid #22d3ee", borderRadius: 6, padding: "5px 8px", fontSize: 12, fontWeight: 600 }}
            >
              <option value="ALL">All Oceans (Bay of Bengal, Arabian, Indian)</option>
              {OCEAN_BASINS.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>

          {/* Filter 2: Select River */}
          <div>
            <div style={{ fontSize: 10, color: "#38bdf8", fontWeight: 700, marginBottom: 2 }}>2. RIVER BASIN</div>
            <select
              value={selectedRiverId}
              onChange={(e) => setSelectedRiverId(e.target.value)}
              style={{ background: "#1e293b", color: "#f8fafc", border: "1px solid #38bdf8", borderRadius: 6, padding: "5px 8px", fontSize: 12, fontWeight: 600 }}
            >
              <option value="ALL">All Indian Rivers</option>
              {INDIA_RIVERS.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>

          {/* Filter 3: Select Mineral */}
          <div style={{ width: "100%" }}>
            <div style={{ fontSize: 10, color: "#facc15", fontWeight: 700, marginBottom: 3 }}>3. SELECT MINERAL TYPE</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {MINERAL_LIST.map((m) => {
                const active = selectedMineral === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMineral(m.id)}
                    style={{
                      background: active ? m.color : "#1e293b",
                      color: active && (m.id === "Gold" || m.id === "Diamond") ? "#0f172a" : "#f8fafc",
                      border: `1px solid ${active ? "#ffffff" : "#334155"}`,
                      borderRadius: 6, padding: "4px 9px", fontSize: 11.5, fontWeight: 700, cursor: "pointer"
                    }}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Interactive Map with Ocean Polygons + Rivers + Mineral Markers */}
        <div style={{ flex: 1, position: "relative" }}>
          <LiveInspectBanner inspectData={inspectData} loading={inspectLoading} onClose={() => setInspectData(null)} />
          <MapContainer center={[19.5, 81.0]} zoom={5} minZoom={4} maxZoom={16} style={{ height: "100%", width: "100%" }}>
            <MapFocusController riverObj={riverObj} oceanObj={oceanObj} />
            <MapClickListener onMapClick={handleMapPointClick} />
            <TileLayer maxZoom={18} attribution="&copy; OpenStreetMap" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />

            {/* Interactive Ocean Basin Polygons (Clickable & Highlighted) */}
            {OCEAN_BASINS.map((oc) => {
              const isSelectedOcean = selectedOceanId === oc.id;
              return (
                <Polygon
                  key={`${oc.id}-${selectedOceanId}`}
                  positions={oc.polygon}
                  pathOptions={{
                    color: isSelectedOcean ? "#22d3ee" : "#0284c7",
                    weight: isSelectedOcean ? 3 : 1.5,
                    dashArray: isSelectedOcean ? undefined : "5 5",
                    fillColor: isSelectedOcean ? "#06b6d4" : "#0369a1",
                    fillOpacity: isSelectedOcean ? 0.34 : 0.16
                  }}
                  eventHandlers={{
                    click: () => setSelectedOceanId(oc.id === selectedOceanId ? "ALL" : oc.id)
                  }}
                >
                  <Tooltip sticky>
                    <b>{oc.name}</b><br />
                    Sea Level Rise: <b>{oc.seaLevelTrend}</b> | SST: <b>{oc.sst}</b><br />
                    Wave Height: <b>{oc.waveHeight}</b> (Click to filter rivers draining here)
                  </Tooltip>
                  <Popup>
                    <b>{oc.name}</b><br />
                    Sea Level Trend: <b>{oc.seaLevelTrend}</b><br />
                    Surface Temp: <b>{oc.sst}</b> | Wave Height: <b>{oc.waveHeight}</b><br />
                    Marine Resources: {oc.minerals.join(", ")}
                  </Popup>
                </Polygon>
              );
            })}

            {/* India Rivers */}
            {INDIA_RIVERS.map((river) => {
              const isHighlighted = filteredRivers.some((fr) => fr.id === river.id);
              const lineColor = isHighlighted
                ? (selectedMineral === "ALL" ? river.color : mineralObj.color)
                : "#334155";
              return (
                <Polyline
                  key={`${river.id}-${selectedMineral}-${selectedRiverId}-${selectedOceanId}`}
                  positions={river.coords}
                  pathOptions={{
                    color: lineColor,
                    weight: isHighlighted ? 6 : 2.5,
                    opacity: isHighlighted ? 0.98 : 0.3,
                    dashArray: isHighlighted ? undefined : "6 6"
                  }}
                  eventHandlers={{
                    click: () => setSelectedRiverId(river.id === selectedRiverId ? "ALL" : river.id)
                  }}
                >
                  <Tooltip sticky>
                    <b>{river.name}</b> to {river.outlet}<br />
                    Minerals: <b>{river.minerals.join(", ")}</b>
                  </Tooltip>
                </Polyline>
              );
            })}

            {/* Mineral Deposit Markers */}
            {filteredRivers.map((river) =>
              river.deposits
                .filter((d) => selectedMineral === "ALL" || d.mineral === selectedMineral)
                .map((d, i) => (
                  <CircleMarker
                    key={`${river.id}-dep-${i}`}
                    center={[d.lat, d.lon]}
                    radius={8}
                    pathOptions={{
                      color: "#ffffff",
                      weight: 2,
                      fillColor: selectedMineral === "ALL" ? river.color : mineralObj.color,
                      fillOpacity: 0.95
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -6]}>
                      <b>{d.mineral}</b> - {d.name} ({river.name})
                    </Tooltip>
                  </CircleMarker>
                ))
            )}
          </MapContainer>

          {/* Map Legend */}
          <div style={{
            position: "absolute", bottom: 16, right: 14, zIndex: 1000,
            background: "rgba(15, 23, 42, 0.94)", border: "1px solid #334155",
            borderRadius: 10, padding: "8px 12px", fontSize: 11
          }}>
            <div style={{ fontWeight: 700, color: "#22d3ee", marginBottom: 3 }}>Hydro-Ocean & Mineral Map</div>
            <div><span style={{ color: "#06b6d4" }}>?</span> Shaded Polygons = Clickable Ocean Basins</div>
            <div><span style={{ color: "#f97316" }}>?</span> Highlighted Lines = Matched River Basins</div>
            <div><span style={{ color: "#facc15" }}>?</span> Dots = Mineral Deposit Zones</div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Ocean Level Telemetry + River/Mineral Listing Table */}
      <div style={{ padding: "16px 20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <div style={{ fontSize: 12, color: "#22d3ee", fontWeight: 700, textTransform: "uppercase" }}>
            Rivers, Oceans & Mineral Intelligence
          </div>
          <h2 style={{ margin: "2px 0 6px 0", fontSize: 18 }}>
            {oceanObj ? oceanObj.name : riverObj ? riverObj.name : `Mineral Occurrence: ${mineralObj.label}`}
          </h2>
          <div style={{ fontSize: 12.5, color: "#94a3b8" }}>
            {oceanObj
              ? `Sea Level Rise: ${oceanObj.seaLevelTrend} | SST: ${oceanObj.sst} | Wave Height: ${oceanObj.waveHeight} | Marine Minerals: ${oceanObj.minerals.join(", ")}`
              : riverObj
              ? `Minerals found in ${riverObj.name}: ${riverObj.minerals.join(", ")} (Drains into ${riverObj.outlet})`
              : `Showing ${filteredRivers.length} Indian river basins and ${tableRows.length} mineral deposit zones across Bay of Bengal & Arabian Sea.`}
          </div>
        </div>

        {/* Ocean Level & Marine Telemetry Strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {OCEAN_BASINS.map((oc) => {
            const active = selectedOceanId === oc.id;
            return (
              <div
                key={oc.id}
                onClick={() => setSelectedOceanId(active ? "ALL" : oc.id)}
                style={{
                  background: "#0f172a",
                  border: active ? "1px solid #22d3ee" : "1px solid #1e293b",
                  borderRadius: 10, padding: "9px 10px", cursor: "pointer"
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: "#22d3ee" }}>{oc.name.split(" (")[0]}</div>
                <div style={{ fontSize: 13.5, fontWeight: 800, marginTop: 3 }}>Sea Level: {oc.seaLevelTrend}</div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>SST {oc.sst} | Waves {oc.waveHeight}</div>
              </div>
            );
          })}
        </div>

        {/* Listing Table */}
        <div style={{ overflowX: "auto", border: "1px solid #1e293b", borderRadius: 10, background: "#0f172a" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#09111e", color: "#38bdf8", borderBottom: "1px solid #1e293b" }}>
                <th style={{ padding: "10px 10px" }}>River & Ocean Outlet</th>
                <th style={{ padding: "10px 10px" }}>Mineral</th>
                <th style={{ padding: "10px 10px" }}>Basin / Deposit</th>
                <th style={{ padding: "10px 10px" }}>Grade & States</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid #1e293b", background: idx % 2 === 0 ? "#0b1324" : "#0f172a" }}>
                  <td style={{ padding: "9px 10px" }}>
                    <div style={{ fontWeight: 700, color: "#38bdf8" }}>{row.river}</div>
                    <div style={{ fontSize: 11, color: "#22d3ee" }}>to {row.outlet}</div>
                  </td>
                  <td style={{ padding: "9px 10px" }}>
                    <span style={{
                      background: "#1e293b", border: "1px solid #38bdf8", color: "#f8fafc",
                      padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700
                    }}>
                      {row.mineral}
                    </span>
                  </td>
                  <td style={{ padding: "9px 10px" }}>
                    <div style={{ fontWeight: 600 }}>{row.depositName}</div>
                    <div style={{ fontSize: 11, color: "#64748b", fontFamily: "monospace" }}>{row.coords}</div>
                  </td>
                  <td style={{ padding: "9px 10px" }}>
                    <div style={{ color: "#e2e8f0" }}>{row.grade}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{row.states}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

