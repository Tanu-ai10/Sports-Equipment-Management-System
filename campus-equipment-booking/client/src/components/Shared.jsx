export function StatCard({ num, label }) {
  return (
    <div className="stat-card">
      <div className="num">{num}</div>
      <div className="lbl">{label}</div>
    </div>
  );
}

export function StatusTag({ status }) {
  return <span className={`status-tag tag-${status}`}>{status}</span>;
}

export function EmptyState({ icon = '📭', children }) {
  return (
    <div className="empty-state">
      <span className="ic">{icon}</span>
      {children}
    </div>
  );
}

export function Toast({ message }) {
  if (!message) return null;
  return <div className="toast">{message}</div>;
}

export function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
