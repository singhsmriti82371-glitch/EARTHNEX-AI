import React, { useState, useEffect } from "react";
import { useMapEvents } from "react-leaflet";

export function MapClickListener({ onMapClick }) {
  useMapEvents({
    click(e) {
      if (onMapClick) onMapClick(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

export function LiveInspectBanner({ inspectData, loading, onClose }) {
  const [liveWeather, setLiveWeather] = useState(null);
  const [liveAqi, setLiveAqi] = useState(null);
  const [fetchingBrowser, setFetchingBrowser] = useState(false);

  const lat = inspectData?.lat;
  const lon = inspectData?.lon;

  useEffect(() => {
    if (lat == null || lon == null) return;
    let cancelled = false;
    setFetchingBrowser(true);
    setLiveWeather(null);
    setLiveAqi(null);

    Promise.all([
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m`)
        .then(r => r.json())
        .catch(() => null),
      fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm2_5,pm10`)
        .then(r => r.json())
        .catch(() => null)
    ]).then(([wRes, aRes]) => {
      if (cancelled) return;
      if (wRes?.current && wRes.current.temperature_2m != null) {
        setLiveWeather({
          temperature_c: wRes.current.temperature_2m,
          humidity_pct: wRes.current.relative_humidity_2m,
          wind_kmh: wRes.current.wind_speed_10m,
          wind_deg: wRes.current.wind_direction_10m
        });
      }
      if (aRes?.current && aRes.current.us_aqi != null) {
        const u = Math.round(Number(aRes.current.us_aqi));
        setLiveAqi({
          us_aqi: u,
          pm2_5: aRes.current.pm2_5,
          pm10: aRes.current.pm10,
          status: u > 200 ? "Severe" : u > 150 ? "Poor" : u > 100 ? "Moderate" : u > 50 ? "Fair" : "Good"
        });
      }
      setFetchingBrowser(false);
    });

    return () => { cancelled = true; };
  }, [lat, lon]);

  if (!loading && !inspectData) return null;

  const w = liveWeather || inspectData?.weather || {};
  const aq = liveAqi || inspectData?.air_quality || {};
  const min = inspectData?.nearest_mineral || null;

  const tempVal = w.temperature_c != null ? Number(w.temperature_c).toFixed(1) : null;
  const humVal = w.humidity_pct != null ? Math.round(Number(w.humidity_pct)) : null;
  const windVal = w.wind_kmh != null ? Number(w.wind_kmh).toFixed(1) : null;
  const degVal = w.wind_deg != null ? Math.round(Number(w.wind_deg)) : null;

  const aqiVal = aq.us_aqi != null ? Math.round(Number(aq.us_aqi)) : null;
  const pm25Val = aq.pm2_5 != null ? Number(aq.pm2_5).toFixed(1) : null;
  const pm10Val = aq.pm10 != null ? Number(aq.pm10).toFixed(1) : null;
  const aqiStatus = aq.status || (aqiVal != null ? (aqiVal > 200 ? "Severe" : aqiVal > 150 ? "Poor" : aqiVal > 100 ? "Moderate" : aqiVal > 50 ? "Fair" : "Good") : "");

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
          Fetching Live Weather, Open-Meteo AQI & SQLite Mineral Telemetry...
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div>
              <span style={{ fontSize: 11, background: "#0284c7", padding: "2px 8px", borderRadius: 999, fontWeight: 700, marginRight: 8 }}>
                LIVE MAP PIN TELEMETRY
              </span>
              <strong style={{ fontSize: 15, color: "#38bdf8" }}>{inspectData.place_name || "Selected Location"}</strong>
              <span style={{ fontSize: 12, color: "#94a3b8", marginLeft: 8 }}>
                ({inspectData.lat}° N, {inspectData.lon}° E)
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
              {tempVal != null ? (
                <>
                  <div style={{ fontWeight: 700, color: "#4ade80", fontSize: 14 }}>
                    {tempVal} °C | RH {humVal ?? "--"}%
                  </div>
                  <div style={{ color: "#cbd5e1", fontSize: 11.5 }}>
                    Wind: {windVal ?? "--"} km/h ({degVal ?? "--"}°)
                  </div>
                </>
              ) : (
                <div style={{ color: "#94a3b8", fontSize: 12 }}>
                  {fetchingBrowser ? "Syncing live weather..." : "Weather sensor unavailable for ocean/remote cell"}
                </div>
              )}
            </div>

            <div style={{ background: "#090d16", padding: "8px 10px", borderRadius: 8, border: "1px solid #1e293b" }}>
              <div style={{ color: "#94a3b8", fontSize: 11 }}>LIVE AIR QUALITY (US AQI)</div>
              {aqiVal != null ? (
                <>
                  <div style={{ fontWeight: 700, color: (aqiVal > 150 ? "#f87171" : aqiVal > 100 ? "#facc15" : "#4ade80"), fontSize: 14 }}>
                    AQI {aqiVal} ({aqiStatus})
                  </div>
                  <div style={{ color: "#cbd5e1", fontSize: 11.5 }}>
                    PM2.5: {pm25Val ?? "--"} µg/m³ | PM10: {pm10Val ?? "--"} µg/m³
                  </div>
                </>
              ) : (
                <div style={{ color: "#94a3b8", fontSize: 12 }}>
                  {fetchingBrowser ? "Syncing live AQI..." : "AQI station unavailable for this cell"}
                </div>
              )}
            </div>

            {min && (
              <div style={{ background: "#090d16", padding: "8px 10px", borderRadius: 8, border: "1px solid #1e293b" }}>
                <div style={{ color: "#94a3b8", fontSize: 11 }}>NEAREST MINERAL & BASIN (SQLITE DB)</div>
                <div style={{ fontWeight: 700, color: "#38bdf8", fontSize: 14 }}>
                  {min.mineral} — {min.deposit}
                </div>
                <div style={{ color: "#cbd5e1", fontSize: 11.5 }}>
                  {min.distance_km} km away | Basin: {min.river}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
