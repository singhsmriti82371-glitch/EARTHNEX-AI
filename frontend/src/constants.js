export const VARS = [
  { id: "temperature", label: "Temperature" },
  { id: "rainfall", label: "Rainfall" },
  { id: "soil_wetness", label: "Soil wetness" },
  { id: "ocean_waves", label: "Ocean waves" },
  { id: "pm2_5", label: "PM2.5" },
];

export const EV_COLOR = {
  Wildfires: "#f97316",
  Earthquake: "#f43f5e",
  "Severe Storms": "#a78bfa",
  Volcanoes: "#ef4444",
  "Sea and Lake Ice": "#67e8f9",
  Floods: "#38bdf8",
  Drought: "#facc15",
};

export const norm = (lng) => ((((lng + 180) % 360) + 360) % 360) - 180; // wrap map-copy longitudes
