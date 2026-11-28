import { useState } from "react";
import { Link } from "react-router-dom";
import { bulkBan, bulkUnban, downloadCsv, listUsers, type BulkResult } from "../../api/admin";
import Pager from "../../components/Pager";
import { useAsync } from "../../hooks/useAsync";
import { formatDateTime } from "../../utils";

const SIZE = 15;

export default function UsersTab() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const { data, error, loading } = useAsync(() => listUsers({ q, role, status, page, size: SIZE }), [q, role, status, page, reload]);

  const filter = (setter: (v: string) => void) => (v: string) => { setter(v); setPage(1); setSelected([]); };
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const allOnPage = data?.items.map((u) => u.id) ?? [];

  async function bulk(kind: "ban" | "unban") {
    let reason = "";
    if (kind === "ban") {
      reason = window.prompt(`Reason for banning ${selected.length} user(s)?`) ?? "";
      if (reason.trim().length < 3) return;
    }
    setMessage(null); setProblem(null);
    try {
      const result: BulkResult = kind === "ban" ? await bulkBan(selected, reason.trim()) : await bulkUnban(selected);
      setMessage(`${result.done.length} user(s) updated.` + (result.failed.length ? ` Skipped ${result.failed.length}: ${[...new Set(result.failed.map((f) => f.reason))].join("; ")}.` : ""));
      setSelected([]);
      setReload((n) => n + 1);
    } catch (err) {
      setProblem(err instanceof Error ? err.message : "Bulk action failed");
    }
  }

  return (
    <div className="dashboard">
      <div className="card filterbar">
        <label>Search<input value={q} placeholder="Name or email" onChange={(e) => filter(setQ)(e.target.value)} /></label>
        <label>Role<select value={role} onChange={(e) => filter(setRole)(e.target.value)}><option value="">All</option><option value="user">User</option><option value="admin">Admin</option></select></label>
        <label>Status<select value={status} onChange={(e) => filter(setStatus)(e.target.value)}><option value="">All</option><option value="active">Active</option><option value="banned">Banned</option></select></label>
        <div className="actions">
          <button className="btn" onClick={() => void downloadCsv("users.csv", { q, role, status }).catch((e: Error) => setProblem(e.message))}>Export CSV</button>
        </div>
      </div>

      {selected.length > 0 && (
        <div className="card actions">
          <span className="muted">{selected.length} selected</span>
          <button className="btn btn-sm btn-danger" onClick={() => void bulk("ban")}>Ban selected</button>
          <button className="btn btn-sm" onClick={() => void bulk("unban")}>Unban selected</button>
          <button className="btn btn-sm" onClick={() => setSelected([])}>Clear</button>
        </div>
      )}
      {message && <p className="success">{message}</p>}
      {(problem || error) && <p className="alert">{problem ?? error}</p>}

      {loading ? <p className="muted">Loading…</p> : !data || data.items.length === 0 ? <p className="muted">No users match these filters.</p> : (
        <div className="card table-wrap">
          <table>
            <thead><tr>
              <th><input type="checkbox" checked={allOnPage.length > 0 && allOnPage.every((id) => selected.includes(id))}
                onChange={(e) => setSelected(e.target.checked ? allOnPage : [])} aria-label="Select all" /></th>
              <th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last login</th><th />
            </tr></thead>
            <tbody>
              {data.items.map((u) => (
                <tr key={u.id}>
                  <td><input type="checkbox" checked={selected.includes(u.id)} onChange={() => toggle(u.id)} aria-label={`Select ${u.name}`} /></td>
                  <td>{u.name}</td><td>{u.email}</td><td>{u.role}</td>
                  <td><span className={u.is_active ? "badge badge-ok" : "badge badge-alert"}>{u.is_active ? "Active" : "Banned"}</span></td>
                  <td>{u.last_login_at ? formatDateTime(u.last_login_at) : "never"}</td>
                  <td className="actions"><Link className="btn btn-sm" to={`/admin/users/${u.id}`}>Details</Link></td>
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
