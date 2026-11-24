import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { MapClickListener, LiveInspectBanner } from "./MapClickInspector";

function MapFlyTo({ lat, lon }) {
  const map = useMap();
  useEffect(() => {
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      map.flyTo([lat, lon], 7, { duration: 0.9 });
    }
  }, [lat, lon, map]);
  return null;
}

export default function ClimateDashboard({ location, onLocationChange }) {
  const [coords, setCoords] = useState({
    lat: Number(location?.lat ?? 21.2514),
    lon: Number(location?.lng ?? location?.lon ?? 81.6296),
    name: location?.name || "Atal Nagar-Nava Raipur, Chhattisgarh"
  });
  const [inspectData, setInspectData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [kpis, setKpis] = useState({
    temp: 0, humidity: 0, wind: 0, solar: 0,
    soilNow: 0, soil2035: 0, temp2035: 0, temp2050: 0, slope: 0
  });
  const [hourlyWeather, setHourlyWeather] = useState([]);
  const [nasaTrajectory, setNasaTrajectory] = useState([]);

  useEffect(() => {
    if (location?.lat != null && (location?.lng != null || location?.lon != null)) {
      const nextLat = Number(location.lat);
      const nextLon = Number(location.lng ?? location.lon);
      if (Math.abs(nextLat - coords.lat) > 0.001 || Math.abs(nextLon - coords.lon) > 0.001) {
        setCoords({ lat: nextLat, lon: nextLon, name: location.name || `${nextLat.toFixed(3)}°N, ${nextLon.toFixed(3)}°E` });
      }
    }
  }, [location?.lat, location?.lng, location?.lon]);

  const fetchClimateForPin = async (clat, clon, placeHint = "") => {
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

      const [wRes, nasaRes] = await Promise.all([
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${clat}&longitude=${clon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,relative_humidity_2m,precipitation&forecast_days=1`).then(r => r.json()),
        fetch(`${window.location.origin}/api/nasa-predict?lat=${clat}&lon=${clon}`).then(r => r.json()).catch(() => ({}))
      ]);

      const wc = wRes?.current || {};
      const nt = nasaRes?.temperature_c || {};
      const ns = nasaRes?.soil_moisture_index || {};
      const nr = nasaRes?.precipitation_mm_day || {};

      const liveTemp = Number(Number(wc.temperature_2m ?? nt.latest_annual ?? 26.5).toFixed(1));
      const liveHum = Math.round(Number(wc.relative_humidity_2m ?? 55));
      const liveWind = Number(Number(wc.wind_speed_10m ?? 10).toFixed(1));
      const t2010 = Number(Number(nt.baseline_2010 ?? (liveTemp - 0.8)).toFixed(2));
      const t2035 = Number(Number(nt.predicted_2035 ?? (liveTemp + 0.7)).toFixed(2));
      const t2050 = Number(Number(nt.predicted_2050 ?? (liveTemp + 1.4)).toFixed(2));
      const sNow = Number(Number(ns.latest_topsoil_0_5cm ?? 0.45).toFixed(3));
      const s2035 = Number(Number(ns.predicted_2035 ?? 0.42).toFixed(3));
      const s2050 = Number(Number(ns.predicted_2050 ?? 0.39).toFixed(3));
      const solarVal = Number(Number(nasaRes?.solar_irradiance_kwh_m2_day ?? 5.35).toFixed(2));

      setKpis({
        temp: liveTemp,
        humidity: liveHum,
        wind: liveWind,
        solar: solarVal,
        soilNow: sNow,
        soil2035: s2035,
        temp2035: t2035,
        temp2050: t2050,
        slope: Number(Number(nt.slope_per_year ?? 0.032).toFixed(4))
      });

      setInspectData({
        place_name: resolvedName,
        lat: Number(clat.toFixed(4)),
        lon: Number(clon.toFixed(4)),
        weather: {
          temperature_c: liveTemp,
          humidity_pct: liveHum,
          wind_kmh: liveWind,
          wind_deg: Math.round(Number(wc.wind_direction_10m ?? 270))
        },
        air_quality: {}
      });

      const times = wRes?.hourly?.time || [];
      setHourlyWeather(times.map((t, idx) => ({
        hour: t.slice(11, 16),
        TempC: Number(Number(wRes.hourly.temperature_2m?.[idx] ?? liveTemp).toFixed(1)),
        Humidity: Math.round(Number(wRes.hourly.relative_humidity_2m?.[idx] ?? liveHum)),
        RainMM: Number(Number(wRes.hourly.precipitation?.[idx] ?? 0).toFixed(2))
      })));

      setNasaTrajectory([
        { year: "2010 (NASA)", TempC: t2010, SoilMoisture: Number((sNow + 0.03).toFixed(3)), RainMmDay: Number(nr.latest_annual ?? 3.4) },
        { year: "2025 (Live)", TempC: liveTemp, SoilMoisture: sNow, RainMmDay: Number(nr.latest_annual ?? 3.2) },
        { year: "2035 (Proj)", TempC: t2035, SoilMoisture: s2035, RainMmDay: Number(nr.predicted_2035 ?? 3.1) },
        { year: "2050 (Proj)", TempC: t2050, SoilMoisture: s2050, RainMmDay: Number(nr.predicted_2050 ?? 2.9) }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClimateForPin(coords.lat, coords.lon, coords.name);
  }, [coords.lat, coords.lon]);

  const handleMapClick = (clat, clon) => {
    const latNum = Number(Number(clat).toFixed(4));
    const lonNum = Number(Number(clon).toFixed(4));
    setCoords({ lat: latNum, lon: lonNum, name: "" });
    if (typeof onLocationChange === "function") {
      onLocationChange({ name: `Pin (${latNum}°N, ${lonNum}°E)`, lat: latNum, lng: lonNum });
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <LiveInspectBanner inspectData={inspectData} loading={loading} onClose={() => setInspectData(null)} />

      {/* Dynamic Location KPI Strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
        <div style={{ background: "#0f172a", border: "1px solid #38bdf8", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>LIVE TEMPERATURE</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#4ade80" }}>{kpis.temp} °C</div>
          <div style={{ fontSize: 12, color: "#cbd5e1" }}>RH: {kpis.humidity}% - Wind: {kpis.wind} km/h</div>
        </div>
        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>NASA 2035 / 2050 TEMP</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#f97316" }}>{kpis.temp2035} °C - {kpis.temp2050} °C</div>
          <div style={{ fontSize: 12, color: "#cbd5e1" }}>Slope: +{kpis.slope} °C/yr</div>
        </div>
        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>NASA TOPSOIL WETNESS</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#38bdf8" }}>{kpis.soilNow} (0-5 cm)</div>
          <div style={{ fontSize: 12, color: "#cbd5e1" }}>2035 Forecast: {kpis.soil2035}</div>
        </div>
        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>SOLAR IRRADIANCE</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#facc15" }}>{kpis.solar} kWh/m²/d</div>
          <div style={{ fontSize: 12, color: "#cbd5e1" }}>{inspectData?.place_name || coords.name}</div>
        </div>
      </div>

      {/* Interactive Climate & Satellite Map */}
      <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #1e293b" }}>
        <MapContainer center={[coords.lat, coords.lon]} zoom={7} style={{ height: 370, width: "100%" }}>
          <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
          <MapClickListener onMapClick={handleMapClick} />
          <MapFlyTo lat={coords.lat} lon={coords.lon} />
          <CircleMarker
            center={[coords.lat, coords.lon]}
            radius={12}
            pathOptions={{ color: "#ffffff", weight: 2, fillColor: "#0284c7", fillOpacity: 0.95 }}
          >
            <Popup>
              <strong>{inspectData?.place_name || coords.name}</strong><br />
              Live Temp: {kpis.temp} °C | RH: {kpis.humidity}%<br />
              NASA 2050 Temp: {kpis.temp2050} °C
            </Popup>
          </CircleMarker>
        </MapContainer>
      </div>

      {/* Dynamic Hourly & NASA Multi-Decade Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12 }}>
        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 14 }}>
          <div style={{ fontWeight: 700, color: "#38bdf8", fontSize: 14, marginBottom: 8 }}>
            24-Hour Temperature & Humidity - {inspectData?.place_name || coords.name}
          </div>
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <LineChart data={hourlyWeather}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="hour" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={{ background: "#090d16", border: "1px solid #334155", color: "#f8fafc" }} />
                <Legend />
                <Line type="monotone" dataKey="TempC" stroke="#4ade80" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="Humidity" stroke="#38bdf8" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 14 }}>
          <div style={{ fontWeight: 700, color: "#f97316", fontSize: 14, marginBottom: 8 }}>
            NASA POWER Climate Trajectory (2010 - 2050) - {inspectData?.place_name || coords.name}
          </div>
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={nasaTrajectory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="year" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={{ background: "#090d16", border: "1px solid #334155", color: "#f8fafc" }} />
                <Legend />
                <Bar dataKey="TempC" fill="#f97316" radius={[4, 4, 0, 0]} />
                <Bar dataKey="RainMmDay" fill="#38bdf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
