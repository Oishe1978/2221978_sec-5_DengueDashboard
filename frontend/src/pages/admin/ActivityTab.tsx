import { useState } from "react";
import { downloadCsv, listAudit, listAuditEvents } from "../../api/admin";
import Pager from "../../components/Pager";
import { useAsync } from "../../hooks/useAsync";
import { formatDateTime } from "../../utils";

const SIZE = 20;

export default function ActivityTab() {
  const [event, setEvent] = useState("");
  const [q, setQ] = useState("");
  const [success, setSuccess] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [problem, setProblem] = useState<string | null>(null);
  const filters = { event, q, success, date_from: dateFrom, date_to: dateTo };
  const names = useAsync(() => listAuditEvents(), []);
  const { data, error, loading } = useAsync(() => listAudit({ ...filters, page, size: SIZE }), [event, q, success, dateFrom, dateTo, page]);
  const set = (fn: (v: string) => void) => (v: string) => { fn(v); setPage(1); };

  return (
    <div className="dashboard">
      <div className="card filterbar">
        <label>Event<select value={event} onChange={(e) => set(setEvent)(e.target.value)}>
          <option value="">All events</option>{(names.data ?? []).map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
        <label>Search<input value={q} placeholder="Email, IP or details" onChange={(e) => set(setQ)(e.target.value)} /></label>
        <label>Result<select value={success} onChange={(e) => set(setSuccess)(e.target.value)}>
          <option value="">All</option><option value="true">Success</option><option value="false">Failed</option></select></label>
        <label>From<input type="date" value={dateFrom} onChange={(e) => set(setDateFrom)(e.target.value)} /></label>
        <label>To<input type="date" value={dateTo} onChange={(e) => set(setDateTo)(e.target.value)} /></label>
        <div className="actions"><button className="btn" onClick={() => void downloadCsv("activity.csv", filters).catch((e: Error) => setProblem(e.message))}>Export CSV</button></div>
      </div>
      {(problem || error) && <p className="alert">{problem ?? error}</p>}
      {loading ? <p className="muted">Loading…</p> : !data || data.items.length === 0 ? <p className="muted">No activity matches these filters.</p> : (
        <div className="card table-wrap">
          <table>
            <thead><tr><th>Time</th><th>Event</th><th>User</th><th>IP address</th><th>Browser</th><th>Details</th></tr></thead>
            <tbody>
              {data.items.map((a) => (
                <tr key={a.id}>
                  <td>{formatDateTime(a.created_at)}</td>
                  <td><span className={a.success ? "badge badge-ok" : "badge badge-alert"}>{a.event}</span></td>
                  <td>{a.email ?? "–"}</td><td>{a.ip_address || "–"}</td>
                  <td title={a.user_agent}>{a.user_agent.slice(0, 40) || "–"}</td><td>{a.details ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: "0 1rem 1rem" }}><Pager page={page} size={SIZE} total={data.total} onPage={setPage} /></div>
        </div>
      )}
    </div>
  );
}
