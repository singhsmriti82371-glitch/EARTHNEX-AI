import React, { useState, useEffect, useRef } from "react";

const QUICK_PROMPTS = [
  "Analyze current live weather & AQI at my selected location",
  "Which Indian river has the highest plastic damage and why?",
  "Compare Bay of Bengal vs Arabian Sea plastic & sea-level stress",
  "Explain how climate change affects soil moisture & crops by 2035",
  "Suggest solutions to reduce plastic flow in Mahanadi & Ganga"
];

export default function EarthnexAgent({ activeTab = "climate", locationName = "Raipur, Chhattisgarh", lat = 21.2514, lon = 81.6296 }) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("earthnex_gemini_key") || "");
  const [showKeyBox, setShowKeyBox] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      source: "EARTHNEX Real-Time AI Core",
      text: "Hello! I am EARTHNEX AI ? connected live to your SQLite Earth Database and Open-Meteo satellite/weather sensors. Ask me any question about Earth science, your active location's weather & AQI, Indian rivers, minerals, or 2035 climate forecasts in English, Hindi, or Hinglish."
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const saveApiKey = (val) => {
    setApiKey(val);
    localStorage.setItem("earthnex_gemini_key", val);
  };

  const sendQuestion = async (qText) => {
    const question = (qText ?? input).trim();
    if (!question || loading) return;

    const updatedHistory = [...messages, { role: "user", text: question }];
    setMessages(updatedHistory);
    if (!qText) setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${window.location.origin}/api/ai-agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          active_tab: activeTab,
          location_name: locationName,
          lat,
          lon,
          api_key: apiKey,
          history: updatedHistory.slice(-6)
        })
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          source: data.source || "EARTHNEX AI",
          text: data.answer || "No response received."
        }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          source: "Network Error",
          text: "Could not reach /api/ai-agent. Please check that the FastAPI server is running on port 8000."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: 20, background: "#0b1120", borderRadius: 16, border: "1px solid #1e293b", color: "#f8fafc", maxWidth: 980, margin: "0 auto", boxShadow: "0 12px 32px rgba(0,0,0,0.45)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 21, color: "#38bdf8", display: "flex", alignItems: "center", gap: 8 }}>
            EARTHNEX AI ? Conversational Earth Intelligence
          </h2>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
            Context-Aware: <strong style={{ color: "#e2e8f0" }}>{locationName}</strong> ({lat.toFixed(2)}? N, {lon.toFixed(2)}? E) ? Live SQLite + Open-Meteo
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ padding: "5px 11px", borderRadius: 999, background: apiKey ? "#052e16" : "#172554", color: apiKey ? "#4ade80" : "#60a5fa", fontSize: 11.5, fontWeight: 700, border: `1px solid ${apiKey ? "#166534" : "#1d4ed8"}` }}>
            {apiKey ? "? GEMINI 2.5 LLM ACTIVE" : "? LIVE TELEMETRY MODE"}
          </span>
          <button
            type="button"
            onClick={() => setShowKeyBox((v) => !v)}
            style={{ padding: "5px 11px", borderRadius: 8, border: "1px solid #334155", background: "#0f172a", color: "#cbd5e1", fontSize: 12, cursor: "pointer" }}
          >
            {apiKey ? "API Key Saved" : "+ Add Gemini API Key"}
          </button>
        </div>
      </div>

      {showKeyBox && (
        <div style={{ display: "flex", gap: 8, padding: 10, background: "#090d16", borderRadius: 10, border: "1px solid #334155", alignItems: "center" }}>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => saveApiKey(e.target.value)}
            placeholder="Paste your Google Gemini API Key (AIza...) for full generative AI reasoning..."
            style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #334155", background: "#0f172a", color: "#f8fafc", fontSize: 13 }}
          />
          <button
            type="button"
            onClick={() => setShowKeyBox(false)}
            style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#0284c7", color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
          >
            Done
          </button>
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
        {QUICK_PROMPTS.map((qp) => (
          <button
            key={qp}
            type="button"
            onClick={() => sendQuestion(qp)}
            style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid #334155", background: "#111827", color: "#cbd5e1", fontSize: 12, cursor: "pointer" }}
          >
            {qp}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, height: 420, overflowY: "auto", padding: 14, background: "#060a14", borderRadius: 12, border: "1px solid #1e293b" }}>
        {messages.map((m, idx) => (
          <div
            key={idx}
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "82%",
              padding: "11px 15px",
              borderRadius: 14,
              background: m.role === "user" ? "linear-gradient(135deg, #0284c7, #0369a1)" : "#111827",
              border: m.role === "user" ? "none" : "1px solid #1e293b",
              whiteSpace: "pre-line",
              fontSize: 13.5,
              lineHeight: 1.55
            }}
          >
            {m.source && (
              <div style={{ fontSize: 11, fontWeight: 700, color: "#38bdf8", marginBottom: 4 }}>
                {m.source}
              </div>
            )}
            {m.text}
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: "flex-start", padding: "10px 14px", borderRadius: 12, background: "#111827", border: "1px solid #1e293b", fontSize: 12.5, color: "#38bdf8" }}>
            Analyzing live Open-Meteo sensors, SQLite Earth DB & generating response...
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendQuestion();
        }}
        style={{ display: "flex", gap: 10 }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything in Hindi, Hinglish, or English about Earth, climate, rivers, minerals, or AQI..."
          style={{ flex: 1, padding: "12px 15px", borderRadius: 10, border: "1px solid #334155", background: "#0f172a", color: "#f8fafc", fontSize: 14 }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{ padding: "12px 22px", borderRadius: 10, border: "none", background: "#0284c7", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14 }}
        >
          Send
        </button>
      </form>
    </div>
  );
}
