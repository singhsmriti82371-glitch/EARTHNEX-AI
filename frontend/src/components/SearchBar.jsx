import { useState } from "react";
import { api } from "../api";

const QUICK_PLACES = [
  { name: "Raipur Airport (Swami Vivekananda)", lat: 21.1804, lng: 81.7388 },
  { name: "Delhi IGI Airport", lat: 28.5562, lng: 77.1000 },
  { name: "Mumbai CSMI Airport", lat: 19.0896, lng: 72.8656 },
  { name: "Bengaluru Kempegowda Airport", lat: 13.1986, lng: 77.7066 },
  { name: "Korba Coal & Industrial Belt", lat: 22.3595, lng: 82.7501 },
  { name: "Sundarbans Delta", lat: 21.9497, lng: 89.1833 }
];

export default function SearchBar({ onPick }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const search = async (val) => {
    setQ(val);
    if (val.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      // First try backend geocode, fallback to Open-Meteo geocoding for airports/landmarks
      let list = await api.geocode(val).catch(() => []);
      if (!list || list.length === 0) {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(val)}&count=6&language=en&format=json`);
        const data = await res.json();
        list = (data.results || []).map((r) => ({
          name: `${r.name}${r.admin1 ? `, ${r.admin1}` : ""}${r.country ? ` (${r.country})` : ""}`,
          lat: r.latitude,
          lon: r.longitude
        }));
      }
      setResults(list);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const selectPlace = (item) => {
    onPick({ lat: Number(item.lat), lng: Number(item.lon ?? item.lng), name: item.name });
    setQ(item.name);
    setResults([]);
  };

  return (
    <div style={{ position: "absolute", top: 68, left: 16, zIndex: 1100, width: 340, maxWidth: "calc(100% - 32px)" }}>
      <div style={{ display: "flex", gap: 6, background: "rgba(15, 23, 42, 0.94)", border: "1px solid #38bdf8", borderRadius: 10, padding: "6px 10px", boxShadow: "0 6px 24px rgba(0,0,0,0.55)" }}>
        <span>🔍</span>
        <input
          value={q}
          onChange={(e) => search(e.target.value)}
          placeholder="Search Airport, City, Mine, River..."
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#f8fafc", fontSize: 13 }}
        />
        {q && <button onClick={() => { setQ(""); setResults([]); }} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>✕</button>}
      </div>

      {/* Quick 1-click Airport & Hotspot Pills */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
        {QUICK_PLACES.map((p) => (
          <button
            key={p.name}
            onClick={() => selectPlace(p)}
            style={{
              background: "rgba(15, 23, 42, 0.88)", color: "#e2e8f0", border: "1px solid #334155",
              borderRadius: 999, padding: "3px 9px", fontSize: 11, cursor: "pointer"
            }}
          >
            ✈ {p.name.split(" (")[0]}
          </button>
        ))}
      </div>

      {loading && <div style={{ background: "#0f172a", color: "#38bdf8", padding: "6px 10px", borderRadius: 8, marginTop: 4, fontSize: 12 }}>Searching locations...</div>}

      {results.length > 0 && (
        <div style={{ background: "rgba(15, 23, 42, 0.97)", border: "1px solid #334155", borderRadius: 10, marginTop: 4, overflow: "hidden", boxShadow: "0 10px 25px rgba(0,0,0,0.6)" }}>
          {results.map((r, i) => (
            <div
              key={i}
              onClick={() => selectPlace(r)}
              style={{ padding: "8px 12px", fontSize: 12.5, color: "#f1f5f9", cursor: "pointer", borderBottom: "1px solid #1e293b" }}
            >
              📍 <b>{r.name}</b> <span style={{ color: "#94a3b8", fontSize: 11 }}>({Number(r.lat).toFixed(2)}, {Number(r.lon ?? (Number(r.lng) ?? 0)).toFixed(2)})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
