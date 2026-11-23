export const Skeleton = ({ h = 22, w = "100%" }) => <div className="skeleton" style={{ height: h, width: w }} />;

export const Card = ({ title, children, style }) => (
  <div className="card" style={style}>
    {title && <small className="card-title">{title}</small>}
    {children}
  </div>
);

export const Kpi = ({ label, value, loading, unit }) => (
  <div className="card kpi" style={{ margin: 0 }}>
    <small>{label}</small>
    {loading ? <Skeleton h={26} w="70%" /> : <b>{value ?? "—"}{value != null && unit ? <em>{unit}</em> : null}</b>}
  </div>
);

export const fmt = (v, d = 1) => (v == null || Number.isNaN(v) ? null : Number(v).toFixed(d));
