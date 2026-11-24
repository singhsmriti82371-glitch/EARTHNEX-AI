import { VARS } from "../constants";
import { Card, Kpi, Skeleton, fmt } from "./ui";
import TrendChart from "./TrendChart";

const NAMES = { temperature: "Temperature", rainfall: "Rainfall", soil_wetness: "Soil wetness" };

export default function Panel(p) {
  const { pt, live, variable, setVariable, trend, trendErr, trendLoading, corr, ai, prospect, pathway, pathwayLoading, saved } = p;
  const L = live === null;
  return (
    <aside className="panel">
      <div className="loc">
        <h3>📍 {pt.name ? `${pt.name} · ` : ""}{(Number(pt.lat ?? 0)).toFixed(2)}, {(Number(pt.lng ?? 0)).toFixed(2)}</h3>
        <button className="ghost" onClick={p.onSave}>★ Save</button>
      </div>

      <div className="grid">
        <Kpi label="Temp" unit="°C" loading={L} value={fmt(live?.weather?.temperature_2m)} />
        <Kpi label="Humidity" unit="%" loading={L} value={live?.weather?.relative_humidity_2m} />
        <Kpi label="PM2.5" unit="µg/m³" loading={L} value={fmt(live?.air?.pm2_5)} />
        <Kpi label="AQI (US)" loading={L} value={live?.air?.us_aqi} />
        <Kpi label="Soil moisture" loading={L} value={fmt(live?.soil?.moisture, 3)} />
        <Kpi label="Sea temp" unit="°C" loading={L} value={live?.ocean?.sea_surface_temperature != null ? fmt(live.ocean.sea_surface_temperature) : (live ? "inland" : null)} />
        <Kpi label="River flow" unit="m³/s" loading={L} value={live?.river?.now != null ? fmt(live.river.now) : (live ? "n/a" : null)} />
        <Kpi label="Wind" unit="km/h" loading={L} value={fmt(live?.weather?.wind_speed_10m)} />
      </div>

      {live?.alerts?.length > 0 && (
        <Card title="⚠ RISK ALERTS" style={{ marginTop: 12 }}>
          {live.alerts.map((a, i) => <div key={i} className={`alert ${a.level}`}>{a.text}</div>)}
        </Card>
      )}

      <div className="tabs">
        {VARS.map((v) => (
          <button key={v.id} className={variable === v.id ? "on" : ""} onClick={() => setVariable(v.id)}>{v.label}</button>
        ))}
      </div>

      <Card>
        {trendLoading && <><Skeleton h={20} w="60%" /><div style={{ height: 8 }} /><Skeleton h={200} /></>}
        {trendErr && !trendLoading && <p className="muted">⚠ {trendErr}</p>}
        {trend && !trendLoading && (
          <>
            <span className={`badge ${trend.trend === "increasing" ? "up" : trend.trend === "decreasing" ? "down" : "flat"}`}>
              {trend.trend} · {(Number(trend.slope_per_decade ?? 0)).toFixed(3)} {trend.unit}/decade
            </span>{" "}
            <span className="badge sig">{trend.significant ? "significant" : "not significant"} (p={(Number(trend.p ?? 0)).toFixed(3)})</span>
            <TrendChart trend={trend} />
            <small className="muted">{trend.method}{trend.pct_per_decade != null ? ` · ${(Number(trend.pct_per_decade ?? 0)).toFixed(1)}% per decade` : ""}</small>
          </>
        )}
      </Card>

      <Card title="🤖 AI SCIENTIFIC INSIGHT">
        {ai ? <p>{ai}</p> : <Skeleton h={60} />}
      </Card>

      <Card title="CROSS-VARIABLE INTELLIGENCE">
        {!corr && <Skeleton h={40} />}
        {corr && corr.pairs.length === 0 && <p className="muted">Not enough overlapping data.</p>}
        {corr?.pairs.map((c, i) => (
          <div key={i} className="row">
            <span>{NAMES[c.a]} ↔ {NAMES[c.b]}</span>
            <b>{(Number(c.r ?? 0)).toFixed(2)} <em>{c.strength}</em></b>
          </div>
        ))}
      </Card>

      <Card title="⛏ GEOLOGICAL PROSPECTIVITY (indicative)">
        {!prospect && <Skeleton h={40} />}
        {prospect && (
          <>
            <div className="row"><span>Score within {prospect.radius_km} km</span><b>{Math.round(prospect.score * 100)}%</b></div>
            {prospect.nearby.length === 0 && <p className="muted">No seeded occurrences nearby.</p>}
            {prospect.nearby.slice(0, 4).map((m) => (
              <div key={m.id} className="row small"><span>{m.mineral} · {m.name}</span><span>{(Number(m.distance_km ?? 0)).toFixed(0)} km</span></div>
            ))}
          </>
        )}
      </Card>

      <Card title="🌊 LAND → OCEAN POLLUTION PATHWAY">
        {!pathway && !pathwayLoading && <p className="muted">Click any dashed river line on the map.</p>}
        {pathwayLoading && <Skeleton h={60} />}
        {pathway && !pathwayLoading && (
          <>
            <div className="row"><span>{pathway.river} near {pathway.nearest_waypoint}</span><b>{pathway.distance_to_outlet_km} km</b></div>
            <div className="row small"><span>Outlet</span><span>{pathway.outlet}</span></div>
            <div className="row small"><span>Indicative travel time</span><span>{pathway.travel_days_range[0]}–{pathway.travel_days_range[1]} days</span></div>
            <div className="row small"><span>Discharge here</span><span>{pathway.discharge_m3s != null ? `${fmt(pathway.discharge_m3s)} m³/s` : "n/a"}</span></div>
            <div className="row small"><span>PM2.5 here</span><span>{pathway.pm2_5 != null ? fmt(pathway.pm2_5) : "n/a"}</span></div>
            {pathway.downstream.length > 0 && <p className="muted">Downstream: {pathway.downstream.join(" → ")}</p>}
            <small className="muted">{pathway.note}</small>
          </>
        )}
      </Card>

      <Card title="🛰 NEARBY HAZARDS (500 km)">
        {L && <Skeleton h={30} />}
        {live && live.nearby_events.length === 0 && <p className="muted">No open NASA/USGS events nearby.</p>}
        {live?.nearby_events.slice(0, 4).map((e, i) => (
          <div key={i} className="row small"><span>{e.type}: {e.title.slice(0, 34)}</span><span>{(Number(e.distance_km ?? 0)).toFixed(0)} km</span></div>
        ))}
      </Card>

      <Card title="★ SAVED LOCATIONS">
        {saved.length === 0 && <p className="muted">None yet. Click ★ Save.</p>}
        {saved.map((s) => (
          <div key={s.id} className="row small">
            <a onClick={() => p.onPickSaved(s)}>{s.name}</a>
            <button className="x" onClick={() => p.onDeleteSaved(s.id)}>✕</button>
          </div>
        ))}
      </Card>

      <small className="muted foot">Live: Open-Meteo · NASA EONET/GIBS/POWER · USGS. Mineral and river data are illustrative demo data.</small>
    </aside>
  );
}
