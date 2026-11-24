import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { MapClickListener, LiveInspectBanner } from "./MapClickInspector";
import MapSearchToolbar from "./MapSearchToolbar";

function MapFlyTo({ lat, lon }) {
  const map = useMap();
  useEffect(() => {
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      map.flyTo([lat, lon], 7, { duration: 0.9 });
    }
  }, [lat, lon, map]);
  return null;
}

export default function ClimateDashboard({
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
  const [kpis, setKpis] = useState({
    temp: 24.5, humidity: 62, wind: 8.4, solar: 5.35,
    soilNow: 0.45, soil5Yr: 0.41, temp5Yr: 25.2, slope: 0.14
  });
  const [hourlyWeather, setHourlyWeather] = useState([]);
  const [fiveYearForecast, setFiveYearForecast] = useState([]);

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
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${clat}&longitude=${clon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,relative_humidity_2m,precipitation&forecast_days=2`).then(r => r.json()),
        fetch(`${window.location.origin}/api/nasa-predict?lat=${clat}&lon=${clon}`).then(r => r.json()).catch(() => ({}))
      ]);

      const wc = wRes?.current || {};
      const times = wRes?.hourly?.time || [];
      const targetHourPrefix = `${selectedDate}T${(selectedTime || "11:00").slice(0, 2)}`;
      const hourIdx = times.findIndex(t => t.startsWith(targetHourPrefix));

      const activeTemp = Number(
        (hourIdx >= 0 ? wRes.hourly.temperature_2m?.[hourIdx] : wc.temperature_2m) ?? 26.5
      ).toFixed(1);
      const activeHum = Math.round(
        Number((hourIdx >= 0 ? wRes.hourly.relative_humidity_2m?.[hourIdx] : wc.relative_humidity_2m) ?? 55)
      );
      const liveWind = Number(Number(wc.wind_speed_10m ?? 10).toFixed(1));

      const nt = nasaRes?.temperature_c || {};
      const ns = nasaRes?.soil_moisture_index || {};
      const nr = nasaRes?.precipitation_mm_day || {};

      const baseTemp = Number(activeTemp);
      const annualSlope = Number(nt.slope_per_year ?? 0.14);
      const baseSoil = Number(Number(ns.latest_topsoil_0_5cm ?? 0.45).toFixed(3));
      const baseRain = Number(Number(nr.latest_annual ?? 3.4).toFixed(2));
      const solarVal = Number(Number(nasaRes?.solar_irradiance_kwh_m2_day ?? 5.35).toFixed(2));

      // Next 5-Year Prediction Series (2026 -> 2031)
      const years = [2026, 2027, 2028, 2029, 2030, 2031];
      const predSeries = years.map((yr, idx) => ({
        year: String(yr),
        TempC: Number((baseTemp + idx * Math.max(annualSlope, 0.12)).toFixed(2)),
        RainMmDay: Number(Math.max(1.2, baseRain - idx * 0.08).toFixed(2)),
        SoilMoisturePct: Number(Math.max(18, (baseSoil - idx * 0.008) * 100).toFixed(1))
      }));
      setFiveYearForecast(predSeries);

      setKpis({
        temp: baseTemp,
        humidity: activeHum,
        wind: liveWind,
        solar: solarVal,
        soilNow: baseSoil,
        soil5Yr: Number((baseSoil - 5 * 0.008).toFixed(3)),
        temp5Yr: predSeries[predSeries.length - 1].TempC,
        slope: Number(Math.max(annualSlope, 0.12).toFixed(3))
      });

      setInspectData({
        place_name: `${resolvedName} (${selectedDate} ${selectedTime})`,
        lat: Number(clat.toFixed(4)),
        lon: Number(clon.toFixed(4)),
        weather: {
          temperature_c: baseTemp,
          humidity_pct: activeHum,
          wind_kmh: liveWind,
          wind_deg: Math.round(Number(wc.wind_direction_10m ?? 270))
        },
        air_quality: {}
      });

      setHourlyWeather(times.slice(0, 24).map((t, idx) => ({
        hour: t.slice(11, 16),
        TempC: Number(Number(wRes.hourly.temperature_2m?.[idx] ?? baseTemp).toFixed(1)),
        Humidity: Math.round(Number(wRes.hourly.relative_humidity_2m?.[idx] ?? activeHum))
      })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClimateForPin(coords.lat, coords.lon, coords.name);
  }, [coords.lat, coords.lon, selectedDate, selectedTime]);

  const handleMapClick = (clat, clon) => {
    const latNum = Number(Number(clat).toFixed(4));
    const lonNum = Number(Number(clon).toFixed(4));
    setCoords({ lat: latNum, lon: lonNum, name: "" });
    onLocationChange?.({ name: `Pin (${latNum}°N, ${lonNum}°E)`, lat: latNum, lng: lonNum });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <MapSearchToolbar
        location={location}
        onLocationChange={onLocationChange}
        selectedDate={selectedDate}
        onDateChange={onDateChange}
        selectedTime={selectedTime}
        onTimeChange={onTimeChange}
        placeholder="Search city or coordinates for Climate & 5-Year Forecast..."
      />

      <LiveInspectBanner inspectData={inspectData} loading={loading} onClose={() => setInspectData(null)} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
        <div style={{ background: "#0f172a", border: "1px solid #38bdf8", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>TEMPERATURE ({selectedTime})</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#4ade80" }}>{kpis.temp} &deg;C</div>
          <div style={{ fontSize: 12, color: "#cbd5e1" }}>RH: {kpis.humidity}% &bull; Wind: {kpis.wind} km/h</div>
        </div>
        <div style={{ background: "#0f172a", border: "1px solid #f97316", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>NEXT 5-YEAR PREDICTION (2031)</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#f97316" }}>{kpis.temp} &deg;C &rarr; {kpis.temp5Yr} &deg;C</div>
          <div style={{ fontSize: 12, color: "#cbd5e1" }}>Rate: +{kpis.slope} &deg;C/yr</div>
        </div>
        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>SOIL MOISTURE (5-YR OUTLOOK)</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#38bdf8" }}>{kpis.soilNow} &rarr; {kpis.soil5Yr}</div>
          <div style={{ fontSize: 12, color: "#cbd5e1" }}>Topsoil Index (0-5 cm)</div>
        </div>
        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>SOLAR IRRADIANCE</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#facc15" }}>{kpis.solar} kWh/m&sup2;/d</div>
          <div style={{ fontSize: 12, color: "#cbd5e1" }}>{selectedDate}</div>
        </div>
      </div>

      <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #1e293b" }}>
        <MapContainer center={[coords.lat, coords.lon]} zoom={7} style={{ height: 360, width: "100%" }}>
          <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
          <MapClickListener onMapClick={handleMapClick} />
          <MapFlyTo lat={coords.lat} lon={coords.lon} />
          <CircleMarker center={[coords.lat, coords.lon]} radius={12} pathOptions={{ color: "#ffffff", weight: 2, fillColor: "#0284c7", fillOpacity: 0.95 }}>
            <Popup>
              <strong>{inspectData?.place_name || coords.name}</strong><br />
              Temp: {kpis.temp} &deg;C | 2031 Pred: {kpis.temp5Yr} &deg;C
            </Popup>
          </CircleMarker>
        </MapContainer>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))", gap: 12 }}>
        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 14 }}>
          <div style={{ fontWeight: 700, color: "#38bdf8", fontSize: 14, marginBottom: 8 }}>
            24-Hour Temperature &amp; Humidity ({selectedDate})
          </div>
          <div style={{ width: "100%", height: 245 }}>
            <ResponsiveContainer>
              <LineChart data={hourlyWeather}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="hour" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={{ background: "#090d16", border: "1px solid #334155", color: "#f8fafc" }} />
                <Legend />
                <Line type="monotone" dataKey="TempC" name="Temp (°C)" stroke="#4ade80" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="Humidity" name="Humidity (%)" stroke="#38bdf8" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ background: "#0f172a", border: "1px solid #f97316", borderRadius: 12, padding: 14 }}>
          <div style={{ fontWeight: 700, color: "#f97316", fontSize: 14, marginBottom: 8 }}>
            Next 5-Year Climate Prediction (2026 &rarr; 2031)
          </div>
          <div style={{ width: "100%", height: 245 }}>
            <ResponsiveContainer>
              <BarChart data={fiveYearForecast}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="year" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={{ background: "#090d16", border: "1px solid #334155", color: "#f8fafc" }} />
                <Legend />
                <Bar dataKey="TempC" name="Predicted Temp (°C)" fill="#f97316" radius={[4, 4, 0, 0]} />
                <Bar dataKey="SoilMoisturePct" name="Soil Moisture (%)" fill="#38bdf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
