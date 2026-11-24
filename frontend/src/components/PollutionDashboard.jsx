import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, useMap } from "react-leaflet";
import { ResponsiveContainer, AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { MapClickListener, LiveInspectBanner } from "./MapClickInspector";
import MapSearchToolbar from "./MapSearchToolbar";

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

export default function PollutionDashboard({
  location,
  onLocationChange,
  selectedDate,
  onDateChange,
  selectedTime,
  onTimeChange
}) {
  const [coords, setCoords] = useState({
    lat: Number(location?.lat ?? 21.2514),
    lon: Number(location?.lng ?? location?.lon ?? 81.6296),
    name: location?.name || "Atal Nagar-Nava Raipur, Chhattisgarh"
  });
  const [inspectData, setInspectData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentMetrics, setCurrentMetrics] = useState({
    aqi: 0, pm25: 0, pm10: 0, no2: 0, so2: 0, o3: 0, windSpeed: 0, windDir: 0, temp: 0, humidity: 0
  });
  const [hourlyCurve, setHourlyCurve] = useState([]);
  const [fiveYearAqiPred, setFiveYearAqiPred] = useState([]);
  const [nearbyHotspots, setNearbyHotspots] = useState([]);
  const [plumeLine, setPlumeLine] = useState([]);

  useEffect(() => {
    if (location?.lat != null && (location?.lng != null || location?.lon != null)) {
      const nextLat = Number(location.lat);
      const nextLon = Number(location.lng ?? location.lon);
      setCoords({
        lat: nextLat,
        lon: nextLon,
        name: location.name || `${nextLat.toFixed(3)}°N, ${nextLon.toFixed(3)}°E`
      });
    }
  }, [location?.lat, location?.lng, location?.lon, location?.name]);

  const fetchLocationPollution = async (clat, clon, placeHint = "") => {
    setLoading(true);
    try {
      let resolvedName = placeHint;
      if (!resolvedName) {
        try {
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${clat}&lon=${clon}`).then(r => r.json());
          const addr = geoRes?.address || {};
          resolvedName = addr.city || addr.town || addr.village || addr.county || addr.state_district || `${clat.toFixed(3)}°N, ${clon.toFixed(3)}°E`;
          if (addr.state && !resolvedName.includes(addr.state)) resolvedName += `, ${addr.state}`;
        } catch {
          resolvedName = `${clat.toFixed(3)}°N, ${clon.toFixed(3)}°E`;
        }
      }

      const [wRes, aRes] = await Promise.all([
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${clat}&longitude=${clon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m`).then(r => r.json()),
        fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${clat}&longitude=${clon}&current=us_aqi,pm2_5,pm10,nitrogen_dioxide,sulphur_dioxide,ozone&hourly=us_aqi,pm2_5,pm10&forecast_days=2`).then(r => r.json())
      ]);

      const wc = wRes?.current || {};
      const ac = aRes?.current || {};
      const times = aRes?.hourly?.time || [];
      const targetHourPrefix = `${selectedDate}T${(selectedTime || "11:00").slice(0, 2)}`;
      const hourIdx = times.findIndex(t => t.startsWith(targetHourPrefix));

      const activeAqi = Math.round(Number((hourIdx >= 0 ? aRes.hourly.us_aqi?.[hourIdx] : ac.us_aqi) ?? 95));
      const activePm25 = Number(Number((hourIdx >= 0 ? aRes.hourly.pm2_5?.[hourIdx] : ac.pm2_5) ?? 32).toFixed(1));
      const activePm10 = Number(Number((hourIdx >= 0 ? aRes.hourly.pm10?.[hourIdx] : ac.pm10) ?? 48).toFixed(1));
      const wDir = Number(wc.wind_direction_10m ?? 270);
      const wSpd = Number(wc.wind_speed_10m ?? 10);

      const updated = {
        aqi: activeAqi,
        pm25: activePm25,
        pm10: activePm10,
        no2: Number(Number(ac.nitrogen_dioxide ?? 18).toFixed(1)),
        so2: Number(Number(ac.sulphur_dioxide ?? 9).toFixed(1)),
        o3: Number(Number(ac.ozone ?? 42).toFixed(1)),
        windSpeed: Number(wSpd.toFixed(1)),
        windDir: Math.round(wDir),
        temp: Number(Number(wc.temperature_2m ?? 25).toFixed(1)),
        humidity: Math.round(Number(wc.relative_humidity_2m ?? 60))
      };
      setCurrentMetrics(updated);

      // Next 5-Year AQI & PM2.5 Projection (2026 -> 2031)
      const years = [2026, 2027, 2028, 2029, 2030, 2031];
      setFiveYearAqiPred(years.map((yr, idx) => ({
        year: String(yr),
        BaselineAQI: Math.round(activeAqi * (1 + idx * 0.042)),
        CleanPolicyAQI: Math.round(activeAqi * (1 - idx * 0.035)),
        ProjectedPM25: Number((activePm25 * (1 + idx * 0.04)).toFixed(1))
      })));

      setInspectData({
        place_name: `${resolvedName} (${selectedDate} ${selectedTime})`,
        lat: Number(clat.toFixed(4)),
        lon: Number(clon.toFixed(4)),
        weather: { temperature_c: updated.temp, humidity_pct: updated.humidity, wind_kmh: updated.windSpeed, wind_deg: updated.windDir },
        air_quality: { us_aqi: updated.aqi, pm2_5: updated.pm25, pm10: updated.pm10, status: getAqiCategory(updated.aqi).label }
      });

      setHourlyCurve(times.slice(0, 24).map((t, i) => ({
        hour: t.slice(11, 16),
        AQI: Math.round(Number(aRes.hourly.us_aqi?.[i] ?? activeAqi)),
        PM25: Number(Number(aRes.hourly.pm2_5?.[i] ?? activePm25).toFixed(1))
      })));

      const downwindRad = ((wDir + 180) % 360) * (Math.PI / 180);
      const dLat1 = 0.08 * Math.cos(downwindRad);
      const dLon1 = 0.08 * Math.sin(downwindRad);
      const dLat2 = 0.16 * Math.cos(downwindRad);
      const dLon2 = 0.16 * Math.sin(downwindRad);
      setPlumeLine([[clat - dLat1 * 0.6, clon - dLon1 * 0.6], [clat, clon], [clat + dLat1, clon + dLon1], [clat + dLat2, clon + dLon2]]);

      const sectors = [
        { name: `Selected Center (${resolvedName.split(",")[0]})`, lat: clat, lon: clon, dist: "0 km" },
        { name: "Downwind Plume Core (~9 km)", lat: Number((clat + dLat1).toFixed(4)), lon: Number((clon + dLon1).toFixed(4)), dist: "9 km Downwind" },
        { name: "Far Dispersion Zone (~18 km)", lat: Number((clat + dLat2).toFixed(4)), lon: Number((clon + dLon2).toFixed(4)), dist: "18 km Downwind" },
        { name: "Upwind Buffer (~7 km)", lat: Number((clat - dLat1 * 0.8).toFixed(4)), lon: Number((clon - dLon1 * 0.8).toFixed(4)), dist: "7 km Upwind" }
      ];

      const nearbyResults = await Promise.all(
        sectors.map(async s => {
          try {
            const sr = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${s.lat}&longitude=${s.lon}&current=us_aqi,pm2_5,pm10`).then(r => r.json());
            return { ...s, aqi: Math.round(Number(sr?.current?.us_aqi ?? activeAqi)), pm25: Number(Number(sr?.current?.pm2_5 ?? activePm25).toFixed(1)), pm10: Number(Number(sr?.current?.pm10 ?? activePm10).toFixed(1)) };
          } catch {
            return { ...s, aqi: activeAqi, pm25: activePm25, pm10: activePm10 };
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
  }, [coords.lat, coords.lon, selectedDate, selectedTime]);

  const handleMapClick = (clat, clon) => {
    const latNum = Number(Number(clat).toFixed(4));
    const lonNum = Number(Number(clon).toFixed(4));
    setCoords({ lat: latNum, lon: lonNum, name: "" });
    onLocationChange?.({ name: `Pin (${latNum}°N, ${lonNum}°E)`, lat: latNum, lng: lonNum });
  };

  const cat = getAqiCategory(currentMetrics.aqi);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <MapSearchToolbar
        location={location}
        onLocationChange={onLocationChange}
        selectedDate={selectedDate}
        onDateChange={onDateChange}
        selectedTime={selectedTime}
        onTimeChange={onTimeChange}
        placeholder="Search city or coordinates for AQI, Wind Plume & 5-Year Prediction..."
      />

      <LiveInspectBanner inspectData={inspectData} loading={loading} onClose={() => setInspectData(null)} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))", gap: 10 }}>
        <div style={{ background: "#0f172a", border: `1px solid ${cat.color}`, borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>US AQI ({selectedTime})</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: cat.color }}>{currentMetrics.aqi}</div>
          <div style={{ fontSize: 12, color: "#e2e8f0" }}>{cat.label} &bull; {selectedDate}</div>
        </div>
        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>PM2.5 &amp; PM10</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#38bdf8" }}>{currentMetrics.pm25} &micro;g/m&sup3;</div>
          <div style={{ fontSize: 12, color: "#cbd5e1" }}>PM10: {currentMetrics.pm10} &micro;g/m&sup3;</div>
        </div>
        <div style={{ background: "#0f172a", border: "1px solid #f97316", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>2031 AQI PREDICTION</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#f97316" }}>
            {fiveYearAqiPred[fiveYearAqiPred.length - 1]?.BaselineAQI ?? currentMetrics.aqi} AQI
          </div>
          <div style={{ fontSize: 12, color: "#4ade80" }}>
            Clean Policy: {fiveYearAqiPred[fiveYearAqiPred.length - 1]?.CleanPolicyAQI ?? currentMetrics.aqi} AQI
          </div>
        </div>
        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>WIND VECTOR</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#4ade80" }}>{currentMetrics.windSpeed} km/h</div>
          <div style={{ fontSize: 12, color: "#cbd5e1" }}>Bearing: {currentMetrics.windDir}&deg;</div>
        </div>
      </div>

      <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #1e293b" }}>
        <MapContainer center={[coords.lat, coords.lon]} zoom={10} style={{ height: 370, width: "100%" }}>
          <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
          <MapClickListener onMapClick={handleMapClick} />
          <MapFlyTo lat={coords.lat} lon={coords.lon} />
          {plumeLine.length > 1 && <Polyline positions={plumeLine} pathOptions={{ color: "#f97316", weight: 5, dashArray: "8, 8" }} />}
          {nearbyHotspots.map((spot, idx) => {
            const sc = getAqiCategory(spot.aqi);
            return (
              <CircleMarker key={idx} center={[spot.lat, spot.lon]} radius={idx === 0 ? 13 : 10} pathOptions={{ color: "#ffffff", weight: 2, fillColor: sc.color, fillOpacity: 0.9 }}>
                <Popup>
                  <strong>{spot.name}</strong><br />
                  US AQI: <strong>{spot.aqi}</strong> ({sc.label})<br />
                  PM2.5: {spot.pm25} &micro;g/m&sup3; | PM10: {spot.pm10} &micro;g/m&sup3;
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))", gap: 12 }}>
        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 14 }}>
          <div style={{ fontWeight: 700, color: "#38bdf8", fontSize: 14, marginBottom: 8 }}>
            24-Hour AQI &amp; PM2.5 Curve ({selectedDate})
          </div>
          <div style={{ width: "100%", height: 245 }}>
            <ResponsiveContainer>
              <AreaChart data={hourlyCurve}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="hour" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={{ background: "#090d16", border: "1px solid #334155", color: "#f8fafc" }} />
                <Legend />
                <Area type="monotone" dataKey="AQI" name="US AQI" stroke="#f97316" fill="#f97316" fillOpacity={0.28} />
                <Area type="monotone" dataKey="PM25" name="PM2.5 (µg/m³)" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ background: "#0f172a", border: "1px solid #f97316", borderRadius: 12, padding: 14 }}>
          <div style={{ fontWeight: 700, color: "#f97316", fontSize: 14, marginBottom: 8 }}>
            Next 5-Year AQI &amp; PM2.5 Prediction (2026 &rarr; 2031)
          </div>
          <div style={{ width: "100%", height: 245 }}>
            <ResponsiveContainer>
              <LineChart data={fiveYearAqiPred}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="year" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={{ background: "#090d16", border: "1px solid #334155", color: "#f8fafc" }} />
                <Legend />
                <Line type="monotone" dataKey="BaselineAQI" name="Business-As-Usual AQI" stroke="#ef4444" strokeWidth={2.5} />
                <Line type="monotone" dataKey="CleanPolicyAQI" name="Clean Air Scenario AQI" stroke="#4ade80" strokeWidth={2.5} />
                <Line type="monotone" dataKey="ProjectedPM25" name="Projected PM2.5" stroke="#38bdf8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
