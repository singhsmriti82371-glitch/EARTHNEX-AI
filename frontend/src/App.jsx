import React, { useState } from "react";
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
  const [activeTab, setActiveTab] = useState("climate");
  const [location, setLocation] = useState({
    name: "Atal Nagar-Nava Raipur, Chhattisgarh",
    lat: 21.2514,
    lng: 81.6296
  });

  return (
    <div className="earthnex-shell">
      <header className="earthnex-header">
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "0.04em", color: "#38bdf8" }}>
            EARTHNEX AI
          </div>
          <div style={{ fontSize: 12.5, color: "#94a3b8" }}>
            Multi-Dashboard Earth Intelligence &bull; Active Pin: <strong style={{ color: "#e2e8f0" }}>{location.name}</strong> ({Number(location.lat).toFixed(3)}&deg;N, {Number(location.lng).toFixed(3)}&deg;E)
          </div>
        </div>

        <nav className="earthnex-nav">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                className="earthnex-tab-btn"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  background: isActive ? "#0284c7" : "#1e293b",
                  color: "#ffffff",
                  border: isActive ? "1px solid #38bdf8" : "1px solid #334155"
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="earthnex-workspace">
        {activeTab === "climate" && (
          <ClimateDashboard location={location} onLocationChange={setLocation} />
        )}
        {activeTab === "rivers" && (
          <RiverMineralDashboard location={location} onLocationChange={setLocation} />
        )}
        {activeTab === "pollution" && (
          <PollutionDashboard location={location} onLocationChange={setLocation} />
        )}
        {activeTab === "agent" && (
          <EarthnexAgent activeTab={activeTab} location={location} />
        )}

        {activeTab !== "agent" && (
          <EarthnexAgent activeTab={activeTab} location={location} />
        )}
      </main>
    </div>
  );
}
