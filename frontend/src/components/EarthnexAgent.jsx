import React, { useState, useRef, useEffect } from "react";

const QUICK_PROMPTS = [
  "What is the live weather, AQI, and 2050 NASA temperature forecast here?",
  "Compare Ganga and Mahanadi plastic discharge and ecological damage",
  "Which river basins have Iron Ore and Coal deposits?",
  "What is the live AQI and weather in Mumbai right now?"
];

export default function EarthnexAgent({ activeTab = "climate", location }) {
  const lat = Number(location?.lat ?? 21.2514);
  const lon = Number(location?.lng ?? location?.lon ?? 81.6296);
  const locationName = location?.name || "Atal Nagar-Nava Raipur, Chhattisgarh";

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: `Hello! I am your EARTHNEX AI Earth Intelligence Assistant. Currently locked onto **${locationName}** (${lat.toFixed(3)}°N, ${lon.toFixed(3)}°E). Ask me anything about live weather, US AQI, NASA POWER 2035/2050 projections, Indian river basins, or mineral deposits.`,
      source: `EARTHNEX AI • ${locationName}`
    }
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const askAssistant = async (overrideText) => {
    const q = (overrideText ?? input).trim();
    if (!q || sending) return;

    const nextHistory = [...messages, { role: "user", text: q }];
    setMessages(nextHistory);
    if (!overrideText) setInput("");
    setSending(true);

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 16000);

      const res = await fetch(`${window.location.origin}/api/ai-agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          question: q,
          active_tab: activeTab,
          location_name: locationName,
          lat,
          lon,
          history: nextHistory.slice(-6)
        })
      });
      clearTimeout(timer);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const replyText = data?.answer || data?.response || data?.message;
      if (!replyText) throw new Error("Empty payload");

      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          text: replyText,
          source: data?.source || `EARTHNEX AI • ${locationName}`
        }
      ]);
    } catch {
      // Direct client-side Open-Meteo backup if Render cold-starts or network lags
      try {
        const [wRes, aRes] = await Promise.all([
          fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m`).then(r => r.json()),
          fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm2_5,pm10`).then(r => r.json())
        ]);
        const wc = wRes?.current || {};
        const ac = aRes?.current || {};
        setMessages(prev => [
          ...prev,
          {
            role: "assistant",
            text: `Here is the live sensor telemetry for **${locationName}** (${lat.toFixed(3)}°N, ${lon.toFixed(3)}°E): Temperature is **${wc.temperature_2m ?? "--"} °C**, relative humidity is **${wc.relative_humidity_2m ?? "--"}%**, wind speed is **${wc.wind_speed_10m ?? "--"} km/h**, and live air quality is **US AQI ${ac.us_aqi ?? "--"}** (PM2.5: **${ac.pm2_5 ?? "--"} µg/m³**, PM10: **${ac.pm10 ?? "--"} µg/m³**).`,
            source: `Live Open-Meteo Telemetry • ${locationName}`
          }
        ]);
      } catch {
        setMessages(prev => [
          ...prev,
          {
            role: "assistant",
            text: `Connected to **${locationName}** (${lat.toFixed(3)}°N, ${lon.toFixed(3)}°E). Please retry your question in a moment while the telemetry service syncs.`,
            source: "EARTHNEX AI"
          }
        ]);
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{
      background: "#0f172a",
      border: "1px solid #1e293b",
      borderRadius: 12,
      padding: 14,
      display: "flex",
      flexDirection: "column",
      gap: 10,
      color: "#f8fafc"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: "#38bdf8" }}>
          EARTHNEX AI Collaborator
        </div>
        <span style={{ fontSize: 11.5, background: "#090d16", border: "1px solid #334155", padding: "3px 10px", borderRadius: 999, color: "#4ade80" }}>
          Active Pin: {locationName} ({lat.toFixed(2)}°N, {lon.toFixed(2)}°E)
        </span>
      </div>

      {/* Quick Prompt Chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {QUICK_PROMPTS.map((qp, idx) => (
          <button
            key={idx}
            onClick={() => askAssistant(qp)}
            disabled={sending}
            style={{
              background: "#090d16",
              border: "1px solid #334155",
              color: "#cbd5e1",
              borderRadius: 999,
              padding: "4px 10px",
              fontSize: 11.5,
              cursor: "pointer"
            }}
          >
            {qp}
          </button>
        ))}
      </div>

      {/* Message History */}
      <div style={{
        background: "#090d16",
        border: "1px solid #1e293b",
        borderRadius: 10,
        padding: 12,
        maxHeight: 340,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 10
      }}>
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "88%",
              background: m.role === "user" ? "#0284c7" : "#1e293b",
              color: "#f8fafc",
              padding: "9px 12px",
              borderRadius: 10,
              fontSize: 13,
              lineHeight: 1.5,
              whiteSpace: "pre-wrap"
            }}
          >
            <div>{m.text.replace(/\*\*/g, "")}</div>
            {m.source && m.role === "assistant" && (
              <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 4 }}>{m.source}</div>
            )}
          </div>
        ))}
        {sending && (
          <div style={{ fontSize: 12.5, color: "#38bdf8" }}>
            Analyzing live satellite telemetry & database records...
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input Form */}
      <form
        onSubmit={e => {
          e.preventDefault();
          askAssistant();
        }}
        style={{ display: "flex", gap: 8 }}
      >
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask about any city weather, AQI, NASA 2050 forecast, river pollution, or minerals..."
          style={{
            flex: 1,
            background: "#090d16",
            border: "1px solid #334155",
            borderRadius: 8,
            padding: "10px 12px",
            color: "#f8fafc",
            fontSize: 13
          }}
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          style={{
            background: "#0284c7",
            border: "none",
            borderRadius: 8,
            padding: "10px 18px",
            color: "#ffffff",
            fontWeight: 700,
            cursor: "pointer",
            fontSize: 13
          }}
        >
          Ask AI
        </button>
      </form>
    </div>
  );
}
