import axios from "axios";

const http = axios.create({ baseURL: import.meta.env.VITE_API_URL || "/api", timeout: 90000 });
const get = (url, params) => http.get(url, { params }).then((r) => r.data);

export const api = {
  events: () => get("/events"),
  minerals: () => get("/minerals"),
  rivers: () => get("/rivers"),
  saved: () => get("/saved"),
  addSaved: (b) => http.post("/saved", b).then((r) => r.data),
  delSaved: (id) => http.delete(`/saved/${id}`).then((r) => r.data),
  geocode: (q) => get("/geocode", { q }),
  live: (lat, lon) => get("/live", { lat, lon }),
  trend: (lat, lon, v) => get("/trend", { lat, lon, var: v }),
  corr: (lat, lon) => get("/correlation", { lat, lon }),
  prospect: (lat, lon) => get("/prospectivity", { lat, lon }),
  pathway: (river, lat, lon) => get("/pathway", { river, lat, lon }),
  explain: (trend, location) => http.post("/explain", { trend, location }).then((r) => r.data),
};

export const errMsg = (e) => e?.response?.data?.detail || e?.message || "Request failed";
