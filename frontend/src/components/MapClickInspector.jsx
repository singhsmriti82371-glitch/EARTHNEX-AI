import React from "react";
import { useMapEvents, Marker, Popup } from "react-leaflet";

export function MapClickListener({ onMapClick }) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    }
  });
  return null;
}

export function LiveInspectBanner({ inspectData, loading, onClose }) {
  if (!loading && !inspectData) return null;

  return (
    <div style={{
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      border: "1px solid #38bdf8",
      borderRadius: 12,
      padding: "12px 16px",
      marginBottom: 12,
      color: "#f8fafc",
      boxShadow: "0 8px 24px rgba(0,0,0,0.4)"
    }}>
      {loading ? (
        <div style={{ fontSize: 13, color: "#38bdf8", fontWeight: 600 }}>
          Fetching Live Weather, Open-Meteo AQI & SQLite Mineral Telemetry for clicked point...
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div>
              <span style={{ fontSize: 11, background: "#0284c7", padding: "2px 8px", borderRadius: 999, fontWeight: 700, marginRight: 8 }}>
                LIVE MAP PIN TELEMETRY
              </span>
              <strong style={{ fontSize: 15, color: "#38bdf8" }}>{inspectData.place_name}</strong>
              <span style={{ fontSize: 12, color: "#94a3b8", marginLeft: 8 }}>
                ({inspectData.lat} N, {inspectData.lon} E)
              </span>
            </div>
            {onClose && (
              <button onClick={onClose} style={{ background: "transparent", border: "1px solid #475569", color: "#cbd5e1", borderRadius: 6, padding: "2px 8px", cursor: "pointer", fontSize: 12 }}>
                Close
              </button>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10, fontSize: 12.5 }}>
            <div style={{ background: "#090d16", padding: "8px 10px", borderRadius: 8, border: "1px solid #1e293b" }}>
              <div style={{ color: "#94a3b8", fontSize: 11 }}>LIVE WEATHER (OPEN-METEO)</div>
              <div style={{ fontWeight: 700, color: "#4ade80", fontSize: 14 }}>
                {inspectData.weather?.temperature_c} ?C | RH {inspectData.weather?.humidity_pct}%
              </div>
              <div style={{ color: "#cbd5e1", fontSize: 11.5 }}>
                Wind: {inspectData.weather?.wind_kmh} km/h ({inspectData.weather?.wind_deg}?)
              </div>
            </div>

            <div style={{ background: "#090d16", padding: "8px 10px", borderRadius: 8, border: "1px solid #1e293b" }}>
              <div style={{ color: "#94a3b8", fontSize: 11 }}>LIVE AIR QUALITY (US AQI)</div>
              <div style={{ fontWeight: 700, color: (inspectData.air_quality?.us_aqi > 150 ? "#f87171" : "#facc15"), fontSize: 14 }}>
                AQI {inspectData.air_quality?.us_aqi} ({inspectData.air_quality?.status})
              </div>
              <div style={{ color: "#cbd5e1", fontSize: 11.5 }}>
                PM2.5: {inspectData.air_quality?.pm2_5} ?g/m? | PM10: {inspectData.air_quality?.pm10} ?g/m?
              </div>
            </div>

            {inspectData.nearest_mineral && (
              <div style={{ background: "#090d16", padding: "8px 10px", borderRadius: 8, border: "1px solid #1e293b" }}>
                <div style={{ color: "#94a3b8", fontSize: 11 }}>NEAREST MINERAL & BASIN (SQLITE DB)</div>
                <div style={{ fontWeight: 700, color: "#38bdf8", fontSize: 14 }}>
                  {inspectData.nearest_mineral.mineral} ? {inspectData.nearest_mineral.deposit}
                </div>
                <div style={{ color: "#cbd5e1", fontSize: 11.5 }}>
                  {inspectData.nearest_mineral.distance_km} km away | Basin: {inspectData.nearest_mineral.river}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
