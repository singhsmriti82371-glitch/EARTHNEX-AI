import React, { useState, useEffect } from "react";

export default function MapSearchToolbar({
  location,
  onLocationChange,
  selectedDate,
  onDateChange,
  selectedTime,
  onTimeChange,
  placeholder = "Search city, river, or coordinates (e.g., Raipur, Korba, Mumbai)..."
}) {
  const [query, setQuery] = useState(location?.name || "");
  const [searching, setSearching] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    if (location?.name) setQuery(location.name);
  }, [location?.name]);

  const handleSearch = async (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setErrMsg("");

    try {
      // Check if user entered "lat, lon" directly
      const coordMatch = q.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
      if (coordMatch) {
        const lat = Number(parseFloat(coordMatch[1]).toFixed(4));
        const lng = Number(parseFloat(coordMatch[2]).toFixed(4));
        onLocationChange?.({ name: `${lat}°N, ${lng}°E`, lat, lng });
        return;
      }

      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=en&format=json`
      );
      const data = await res.json();
      const hit = data?.results?.[0];
      if (!hit) {
        setErrMsg("Location not found. Try a city name or lat, lon.");
        return;
      }
      const label = [hit.name, hit.admin1, hit.country].filter(Boolean).join(", ");
      onLocationChange?.({
        name: label,
        lat: Number(Number(hit.latitude).toFixed(4)),
        lng: Number(Number(hit.longitude).toFixed(4))
      });
    } catch {
      setErrMsg("Search network error. Please retry.");
    } finally {
      setSearching(false);
    }
  };

  return (
    <form
      onSubmit={handleSearch}
      style={{
        background: "#0f172a",
        border: "1px solid #1e293b",
        borderRadius: 12,
        padding: 12,
        display: "grid",
        gridTemplateColumns: "minmax(220px, 2fr) minmax(145px, 1fr) minmax(125px, 0.8fr) auto",
        gap: 10,
        alignItems: "end"
      }}
    >
      <div>
        <label style={{ display: "block", fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 4 }}>
          LOCATION SEARCH (SYNCED ACROSS ALL MAPS)
        </label>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={placeholder}
          style={{
            width: "100%",
            background: "#090d16",
            border: "1px solid #334155",
            borderRadius: 8,
            padding: "9px 12px",
            color: "#f8fafc",
            fontSize: 13
          }}
        />
      </div>

      <div>
        <label style={{ display: "block", fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 4 }}>
          DATE (SAME ACROSS MAPS)
        </label>
        <input
          type="date"
          value={selectedDate}
          onChange={e => onDateChange?.(e.target.value)}
          style={{
            width: "100%",
            background: "#090d16",
            border: "1px solid #334155",
            borderRadius: 8,
            padding: "8px 10px",
            color: "#f8fafc",
            fontSize: 13
          }}
        />
      </div>

      <div>
        <label style={{ display: "block", fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 4 }}>
          TIME (IST)
        </label>
        <input
          type="time"
          value={selectedTime}
          onChange={e => onTimeChange?.(e.target.value)}
          style={{
            width: "100%",
            background: "#090d16",
            border: "1px solid #334155",
            borderRadius: 8,
            padding: "8px 10px",
            color: "#f8fafc",
            fontSize: 13
          }}
        />
      </div>

      <button
        type="submit"
        disabled={searching}
        style={{
          background: "#0284c7",
          border: "1px solid #38bdf8",
          color: "#ffffff",
          borderRadius: 8,
          padding: "9px 16px",
          fontWeight: 700,
          fontSize: 13,
          cursor: "pointer",
          height: 38
        }}
      >
        {searching ? "Searching..." : "Search Map"}
      </button>

      {errMsg && (
        <div style={{ gridColumn: "1 / -1", fontSize: 12, color: "#f87171" }}>
          {errMsg}
        </div>
      )}
    </form>
  );
}
