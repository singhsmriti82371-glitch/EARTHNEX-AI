import { ResponsiveContainer, ComposedChart, XAxis, YAxis, Tooltip, Line, Area } from "recharts";

export default function TrendChart({ trend }) {
  const hist = trend.labels.map((l, i) => ({ label: l, value: trend.values[i] }));
  const fc = trend.forecast || [];
  const data = [...hist];
  if (fc.length) {
    data[data.length - 1] = { ...data[data.length - 1], pred: data[data.length - 1].value };
    fc.forEach((f) => data.push({ label: f.label, pred: f.pred, band: [f.lo, f.hi] }));
  }
  return (
    <div style={{ height: 230, marginTop: 10 }}>
      <ResponsiveContainer>
        <ComposedChart data={data}>
          <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 10 }} minTickGap={24} />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} domain={["auto", "auto"]} width={44}
            tickFormatter={(v) => (Math.abs(v) >= 100 ? Math.round(v) : Number(v.toFixed(2)))} />
          <Tooltip contentStyle={{ background: "#020617", border: "1px solid #22d3ee55", fontSize: 12 }}
            formatter={(v) => (Array.isArray(v) ? v.map((x) => (Number(x ?? 0)).toFixed(2)).join(" – ") : Number(v).toFixed(2))} />
          <Area dataKey="band" stroke="none" fill="#8b5cf6" fillOpacity={0.22} name="95% band" />
          <Line dataKey="value" stroke="#22d3ee" dot={false} strokeWidth={2} name="Observed" />
          <Line dataKey="pred" stroke="#a78bfa" strokeDasharray="5 4" dot={false} strokeWidth={2} name="Forecast" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
