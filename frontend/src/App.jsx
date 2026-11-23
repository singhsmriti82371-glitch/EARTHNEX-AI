import { useState } from "react";
import ClimateDashboard from "./components/ClimateDashboard";
import RiverMineralDashboard from "./components/RiverMineralDashboard";
import PollutionDashboard from "./components/PollutionDashboard";
import EarthnexAgent from "./components/EarthnexAgent";

const TABS = [
  { id: "climate", label: "1. Climate, Vegetation & Forecast" },
  { id: "rivers", label: "2. India Rivers, Oceans & Minerals" },
  { id: "pollution", label: "3. Pollution & AQI Flow Tracer" },
  { id: "agent", label: "4. EARTHNEX AI Agent" }
];

export default function App() {
  const [sharedLoc, setSharedLoc] = useState({ name: "Raipur, Chhattisgarh", lat: 21.2514, lng: 81.6296 });
  const [activeTab, setActiveTab] = useState("climate");
  const [sharedContext, setSharedContext] = useState({});

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#060b16", color: "#f8fafc", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <header style={{
        height: 54, background: "#09111e", borderBottom: "1px solid #1e293b",
        padding: "0 18px", display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 1300
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: "#38bdf8", letterSpacing: 0.5 }}>EARTHNEX AI</span>
          <span style={{ fontSize: 11, background: "#1e293b", color: "#94a3b8", padding: "2px 8px", borderRadius: 999 }}>
            Multi-Dashboard Earth Intelligence
          </span>
        </div>

        <nav style={{ display: "flex", gap: 6 }}>
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  background: active ? "#0284c7" : "#1e293b",
                  color: "#ffffff",
                  border: active ? "1px solid #38bdf8" : "1px solid #334155",
                  borderRadius: 8,
                  padding: "6px 13px",
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </header>

      <main style={{ flex: 1, overflow: "hidden" }}>
        {activeTab === "climate" && <ClimateDashboard onContextUpdate={setSharedContext} />}
        {activeTab === "rivers" && <RiverMineralDashboard onContextUpdate={setSharedContext} />}
        {activeTab === "pollution" && <PollutionDashboard onContextUpdate={setSharedContext} />}
        {activeTab === "agent" && <EarthnexAgent activeContext={sharedContext} />}
      </main>
    </div>
  );
}
