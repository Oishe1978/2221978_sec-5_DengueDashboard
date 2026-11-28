import { useState } from "react";
import { deleteContent, downloadCsv, listContent, type ReportRow, type TeamRow, type WatchRow } from "../../api/admin";
import Pager from "../../components/Pager";
import { DIVISIONS } from "../../constants";
import { useAsync } from "../../hooks/useAsync";

type Kind = "reports" | "watch-items" | "teams";
const SIZE = 15;
const LABELS: Record<Kind, string> = { reports: "Daily reports", "watch-items": "Watchlist items", teams: "Teams" };

export default function ContentTab() {
  const [kind, setKind] = useState<Kind>("watch-items");
  const [q, setQ] = useState("");
  const [division, setDivision] = useState("");
  const [source, setSource] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const params = kind === "reports"
    ? { division, source, date_from: dateFrom, date_to: dateTo }
    : kind === "watch-items" ? { q, division } : { q };
  const { data, error, loading } = useAsync(
    () => listContent<ReportRow & WatchRow & TeamRow>(kind, { ...params, page, size: SIZE }),
    [kind, q, division, source, dateFrom, dateTo, page, reload],
  );

  const reset = () => { setPage(1); setSelected([]); };
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  async function remove() {
    if (!window.confirm(`Delete ${selected.length} selected item(s)? This cannot be undone.`)) return;
    setMessage(null); setProblem(null);
    try {
      const r = await deleteContent(kind, selected);
      setMessage(`${r.deleted} item(s) deleted.`);
      setSelected([]);
      setReload((n) => n + 1);
    } catch (err) { setProblem(err instanceof Error ? err.message : "Delete failed"); }
  }

  const cols = kind === "reports" ? ["Division", "Date", "Admitted", "Deaths", "Source"]
    : kind === "watch-items" ? ["Owner", "Division", "Alert level", "Note"] : ["Team", "Owner", "Members", "Items"];

  return (
    <div className="dashboard">
      <div className="card filterbar">
        <div className="seg">
          {(Object.keys(LABELS) as Kind[]).map((k) => (
            <button key={k} className={k === kind ? "active" : ""} onClick={() => { setKind(k); reset(); }}>{LABELS[k]}</button>
          ))}
        </div>
        {kind !== "reports" && <label>Search<input value={q} placeholder={kind === "teams" ? "Team or owner" : "Owner email or note"} onChange={(e) => { setQ(e.target.value); reset(); }} /></label>}
        {kind !== "teams" && (
          <label>Division<select value={division} onChange={(e) => { setDivision(e.target.value); reset(); }}>
            <option value="">All</option>{DIVISIONS.map((d) => <option key={d} value={d}>{d}</option>)}</select></label>
        )}
        {kind === "reports" && (
          <>
            <label>Source<select value={source} onChange={(e) => { setSource(e.target.value); reset(); }}>
              <option value="">All</option><option value="dghs">dghs</option><option value="synthetic">synthetic</option><option value="manual">manual</option></select></label>
            <label>From<input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); reset(); }} /></label>
            <label>To<input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); reset(); }} /></label>
          </>
        )}
        <div className="actions">
          <button className="btn" onClick={() => void downloadCsv("records.csv", { kind, ...params }).catch((e: Error) => setProblem(e.message))}>Export CSV</button>
          <button className="btn btn-danger" disabled={selected.length === 0} onClick={() => void remove()}>Delete selected ({selected.length})</button>
        </div>
      </div>
      {message && <p className="success">{message}</p>}
      {(problem || error) && <p className="alert">{problem ?? error}</p>}

      {loading ? <p className="muted">Loading…</p> : !data || data.items.length === 0 ? <p className="muted">Nothing found for these filters.</p> : (
        <div className="card table-wrap">
          <table>
            <thead><tr>
              <th><input type="checkbox" aria-label="Select all" checked={data.items.every((r) => selected.includes(r.id))}
                onChange={(e) => setSelected(e.target.checked ? data.items.map((r) => r.id) : [])} /></th>
              {cols.map((c) => <th key={c}>{c}</th>)}
            </tr></thead>
            <tbody>
              {data.items.map((r) => (
                <tr key={r.id}>
                  <td><input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggle(r.id)} aria-label="Select row" /></td>
                  {kind === "reports" && <><td>{r.division}</td><td>{r.report_date}</td><td>{r.admitted}</td><td>{r.deaths}</td><td>{r.source}</td></>}
                  {kind === "watch-items" && <><td>{r.owner_email}</td><td>{r.division}</td><td>{r.threshold}</td><td>{r.note ?? "–"}</td></>}
                  {kind === "teams" && <><td>{(r as unknown as TeamRow).name}</td><td>{r.owner_email}</td><td>{r.members}</td><td>{r.items}</td></>}
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
