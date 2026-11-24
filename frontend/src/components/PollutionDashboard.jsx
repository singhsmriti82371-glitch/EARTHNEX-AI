import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, useMap } from "react-leaflet";
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { MapClickListener, LiveInspectBanner } from "./MapClickInspector";

function MapFlyTo({ lat, lon }) {
  const map = useMap();
  useEffect(() => {
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      map.flyTo([lat, lon], 10, { duration: 0.9 });
    }
  }, [lat, lon, map]);
  return null;
}

function getAqiCategory(aqi) {
  if (aqi > 200) return { label: "Severe", color: "#ef4444" };
  if (aqi > 150) return { label: "Poor", color: "#f97316" };
  if (aqi > 100) return { label: "Moderate", color: "#eab308" };
  if (aqi > 50) return { label: "Fair", color: "#38bdf8" };
  return { label: "Good", color: "#22c55e" };
}

export default function PollutionDashboard({ location, onLocationChange }) {
  const [coords, setCoords] = useState({
    lat: Number(location?.lat ?? 21.2514),
    lon: Number(location?.lng ?? location?.lon ?? 81.6296),
    name: location?.name || "Atal Nagar-Nava Raipur, Chhattisgarh"
  });
  const [inspectData, setInspectData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentMetrics, setCurrentMetrics] = useState({
    aqi: 0, pm25: 0, pm10: 0, no2: 0, so2: 0, o3: 0, co: 0,
    windSpeed: 0, windDir: 0, temp: 0, humidity: 0
  });
  const [hourlyCurve, setHourlyCurve] = useState([]);
  const [nearbyHotspots, setNearbyHotspots] = useState([]);
  const [plumeLine, setPlumeLine] = useState([]);

  useEffect(() => {
    if (location?.lat != null && (location?.lng != null || location?.lon != null)) {
      const nextLat = Number(location.lat);
      const nextLon = Number(location.lng ?? location.lon);
      if (Math.abs(nextLat - coords.lat) > 0.001 || Math.abs(nextLon - coords.lon) > 0.001) {
        setCoords({ lat: nextLat, lon: nextLon, name: location.name || `${nextLat.toFixed(3)}?N, ${nextLon.toFixed(3)}?E` });
      }
    }
  }, [location?.lat, location?.lng, location?.lon]);

  const fetchLocationPollution = async (clat, clon, placeHint = "") => {
    setLoading(true);
    try {
      // 1. Reverse geocode exact clicked point name
      let resolvedName = placeHint;
      if (!resolvedName) {
        try {
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${clat}&lon=${clon}`).then(r => r.json());
          const addr = geoRes?.address || {};
          resolvedName = addr.city || addr.town || addr.village || addr.county || addr.state_district || `${clat.toFixed(3)}?N, ${clon.toFixed(3)}?E`;
          if (addr.state && !resolvedName.includes(addr.state)) resolvedName += `, ${addr.state}`;
        } catch {
          resolvedName = `${clat.toFixed(3)}?N, ${clon.toFixed(3)}?E`;
        }
      }

      // 2. Fetch live Weather + Wind + 24-hour AQI for exact clicked coordinate
      const [wRes, aRes] = await Promise.all([
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${clat}&longitude=${clon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m`).then(r => r.json()),
        fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${clat}&longitude=${clon}&current=us_aqi,pm2_5,pm10,nitrogen_dioxide,sulphur_dioxide,ozone,carbon_monoxide&hourly=us_aqi,pm2_5,pm10&forecast_days=1`).then(r => r.json())
      ]);

      const wc = wRes?.current || {};
      const ac = aRes?.current || {};
      const wDir = Number(wc.wind_direction_10m ?? 270);
      const wSpd = Number(wc.wind_speed_10m ?? 10);

      const updatedMetrics = {
        aqi: Math.round(Number(ac.us_aqi ?? 0)),
        pm25: Number(Number(ac.pm2_5 ?? 0).toFixed(1)),
        pm10: Number(Number(ac.pm10 ?? 0).toFixed(1)),
        no2: Number(Number(ac.nitrogen_dioxide ?? 0).toFixed(1)),
        so2: Number(Number(ac.sulphur_dioxide ?? 0).toFixed(1)),
        o3: Number(Number(ac.ozone ?? 0).toFixed(1)),
        co: Math.round(Number(ac.carbon_monoxide ?? 0)),
        windSpeed: Number(wSpd.toFixed(1)),
        windDir: Math.round(wDir),
        temp: Number(Number(wc.temperature_2m ?? 0).toFixed(1)),
        humidity: Math.round(Number(wc.relative_humidity_2m ?? 0))
      };
      setCurrentMetrics(updatedMetrics);

      setInspectData({
        place_name: resolvedName,
        lat: Number(clat.toFixed(4)),
        lon: Number(clon.toFixed(4)),
        weather: {
          temperature_c: updatedMetrics.temp,
          humidity_pct: updatedMetrics.humidity,
          wind_kmh: updatedMetrics.windSpeed,
          wind_deg: updatedMetrics.windDir
        },
        air_quality: {
          us_aqi: updatedMetrics.aqi,
          pm2_5: updatedMetrics.pm25,
          pm10: updatedMetrics.pm10,
          status: getAqiCategory(updatedMetrics.aqi).label
        }
      });

      // 3. Build real 24-hour Time-of-Day AQI & Particulate curve for this exact spot
      const times = aRes?.hourly?.time || [];
      const hRows = times.map((t, i) => ({
        hour: t.slice(11, 16),
        AQI: Math.round(Number(aRes.hourly.us_aqi?.[i] ?? updatedMetrics.aqi)),
        PM25: Number(Number(aRes.hourly.pm2_5?.[i] ?? updatedMetrics.pm25).toFixed(1)),
        PM10: Number(Number(aRes.hourly.pm10?.[i] ?? updatedMetrics.pm10).toFixed(1))
      }));
      setHourlyCurve(hRows);

      // 4. Compute Wind Plume Vector & Sample 4 Real Nearby Sectors Around Clicked Pin
      const downwindRad = ((wDir + 180) % 360) * (Math.PI / 180);
      const dLat1 = 0.08 * Math.cos(downwindRad);
      const dLon1 = 0.08 * Math.sin(downwindRad);
      const dLat2 = 0.16 * Math.cos(downwindRad);
      const dLon2 = 0.16 * Math.sin(downwindRad);
      setPlumeLine([
        [clat - dLat1 * 0.6, clon - dLon1 * 0.6],
        [clat, clon],
        [clat + dLat1, clon + dLon1],
        [clat + dLat2, clon + dLon2]
      ]);

      const sectors = [
        { name: `Center Pin (${resolvedName.split(",")[0]})`, lat: clat, lon: clon, dist: "0 km (Selected)" },
        { name: `Downwind Plume Core (~9 km)`, lat: Number((clat + dLat1).toFixed(4)), lon: Number((clon + dLon1).toFixed(4)), dist: "9 km Downwind" },
        { name: `Far Dispersion Zone (~18 km)`, lat: Number((clat + dLat2).toFixed(4)), lon: Number((clon + dLon2).toFixed(4)), dist: "18 km Downwind" },
        { name: `Upwind Buffer (~7 km)`, lat: Number((clat - dLat1 * 0.8).toFixed(4)), lon: Number((clon - dLon1 * 0.8).toFixed(4)), dist: "7 km Upwind" }
      ];

      const nearbyResults = await Promise.all(
        sectors.map(async (s) => {
          try {
            const sr = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${s.lat}&longitude=${s.lon}&current=us_aqi,pm2_5,pm10`).then(r => r.json());
            return {
              ...s,
              aqi: Math.round(Number(sr?.current?.us_aqi ?? updatedMetrics.aqi)),
              pm25: Number(Number(sr?.current?.pm2_5 ?? updatedMetrics.pm25).toFixed(1)),
              pm10: Number(Number(sr?.current?.pm10 ?? updatedMetrics.pm10).toFixed(1))
            };
          } catch {
            return { ...s, aqi: updatedMetrics.aqi, pm25: updatedMetrics.pm25, pm10: updatedMetrics.pm10 };
          }
        })
      );
      nearbyResults.sort((a, b) => b.aqi - a.aqi);
      setNearbyHotspots(nearbyResults);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocationPollution(coords.lat, coords.lon, coords.name);
  }, [coords.lat, coords.lon]);

  const handleMapClick = (clat, clon) => {
    const latNum = Number(Number(clat).toFixed(4));
    const lonNum = Number(Number(clon).toFixed(4));
    setCoords({ lat: latNum, lon: lonNum, name: "" });
    if (typeof onLocationChange === "function") {
      onLocationChange({ name: `Pin (${latNum}?N, ${lonNum}?E)`, lat: latNum, lng: lonNum });
    }
  };

  const cat = getAqiCategory(currentMetrics.aqi);
  const peakHour = hourlyCurve.reduce((best, cur) => (cur.AQI > (best?.AQI ?? -1) ? cur : best), null);
  const lowestHour = hourlyCurve.reduce((low, cur) => (cur.AQI < (low?.AQI ?? 9999) ? cur : low), null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <LiveInspectBanner inspectData={inspectData} loading={loading} onClose={() => setInspectData(null)} />

      {/* Live Location-Specific KPI Strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(165px, 1fr))", gap: 10 }}>
        <div style={{ background: "#0f172a", border: `1px solid ${cat.color}`, borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>LIVE US AQI</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: cat.color }}>{currentMetrics.aqi}</div>
          <div style={{ fontSize: 12, color: "#e2e8f0" }}>{cat.label} ? {inspectData?.place_name || coords.name}</div>
        </div>
        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>PM2.5 & PM10</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#38bdf8" }}>{currentMetrics.pm25} ?g/m?</div>
          <div style={{ fontSize: 12, color: "#cbd5e1" }}>PM10: {currentMetrics.pm10} ?g/m?</div>
        </div>
        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>TRACE GASES (NO? / O?)</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#f59e0b" }}>NO?: {currentMetrics.no2} ?g/m?</div>
          <div style={{ fontSize: 12, color: "#cbd5e1" }}>O?: {currentMetrics.o3} ? SO?: {currentMetrics.so2}</div>
        </div>
        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>PLUME WIND VECTOR</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#4ade80" }}>{currentMetrics.windSpeed} km/h</div>
          <div style={{ fontSize: 12, color: "#cbd5e1" }}>Bearing: {currentMetrics.windDir}? ? RH {currentMetrics.humidity}%</div>
        </div>
      </div>

      {/* Interactive AQI Plume & Nearby Hotspot Map */}
      <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #1e293b" }}>
        <MapContainer center={[coords.lat, coords.lon]} zoom={10} style={{ height: 390, width: "100%" }}>
          <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
          <MapClickListener onMapClick={handleMapClick} />
          <MapFlyTo lat={coords.lat} lon={coords.lon} />

          {plumeLine.length > 1 && (
            <Polyline positions={plumeLine} pathOptions={{ color: "#f97316", weight: 5, dashArray: "8, 8", opacity: 0.9 }} />
          )}

          {nearbyHotspots.map((spot, idx) => {
            const sc = getAqiCategory(spot.aqi);
            return (
              <CircleMarker
                key={`${spot.name}-${idx}`}
                center={[spot.lat, spot.lon]}
                radius={idx === 0 ? 13 : 10}
                pathOptions={{ color: "#ffffff", weight: 2, fillColor: sc.color, fillOpacity: 0.9 }}
              >
                <Popup>
                  <strong>{spot.name}</strong><br />
                  US AQI: <strong>{spot.aqi}</strong> ({sc.label})<br />
                  PM2.5: {spot.pm25} ?g/m? | PM10: {spot.pm10} ?g/m?<br />
                  Offset: {spot.dist}
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      {/* Dynamic 24-Hour Time-of-Day AQI & Particulate Chart */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12 }}>
        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 14 }}>
          <div style={{ fontWeight: 700, color: "#38bdf8", fontSize: 14, marginBottom: 4 }}>
            24-Hour Time-of-Day AQI Curve ? {inspectData?.place_name || coords.name}
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 10 }}>
            Peak Hour: <strong style={{ color: "#f87171" }}>{peakHour ? `${peakHour.hour} (AQI ${peakHour.AQI})` : "--"}</strong> ?
            Lowest Dispersion: <strong style={{ color: "#4ade80" }}>{lowestHour ? `${lowestHour.hour} (AQI ${lowestHour.AQI})` : "--"}</strong>
          </div>
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <AreaChart data={hourlyCurve}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="hour" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={{ background: "#090d16", border: "1px solid #334155", color: "#f8fafc" }} />
                <Legend />
                <Area type="monotone" dataKey="AQI" stroke="#f97316" fill="#f97316" fillOpacity={0.28} />
                <Area type="monotone" dataKey="PM25" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Local Wind-Plume Hotspots Around Clicked Pin */}
        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 14 }}>
          <div style={{ fontWeight: 700, color: "#f97316", fontSize: 14, marginBottom: 4 }}>
            Nearby Pollution Hotspots Around Clicked Location
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 10 }}>
            Live upwind/downwind sector readings within 18 km of ({coords.lat}?N, {coords.lon}?E)
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {nearbyHotspots.map((spot, i) => {
              const sc = getAqiCategory(spot.aqi);
              return (
                <div key={i} style={{ background: "#090d16", border: `1px solid ${sc.color}`, borderRadius: 8, padding: "8px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 600, color: "#f8fafc", fontSize: 13 }}>{spot.name}</div>
                    <div style={{ fontSize: 11.5, color: "#94a3b8" }}>{spot.dist} ? PM2.5: {spot.pm25} ?g/m? | PM10: {spot.pm10} ?g/m?</div>
                  </div>
                  <div style={{ fontWeight: 800, color: sc.color, fontSize: 15 }}>
                    AQI {spot.aqi}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
