import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { banUser, changeRole, getUserDetail, revokeSessions, unbanUser } from "../../api/admin";
import { useAuth } from "../../auth/AuthContext";
import { useAsync } from "../../hooks/useAsync";
import { formatDateTime } from "../../utils";

const when = formatDateTime;

export default function UserDetailPage() {
  const { id = "" } = useParams();
  const { user: me } = useAuth();
  const [reload, setReload] = useState(0);
  const { data, error, loading } = useAsync(() => getUserDetail(id), [id, reload]);
  const [message, setMessage] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  async function act(fn: () => Promise<unknown>, ok: string) {
    setMessage(null); setProblem(null);
    try { await fn(); setMessage(ok); setReload((n) => n + 1); }
    catch (err) { setProblem(err instanceof Error ? err.message : "Action failed"); } // for example the 403 safety rules
  }

  if (loading) return <p className="muted">Loading…</p>;
  if (error || !data) return <p className="alert">{error ?? "User not found"}</p>;
  const u = data.user;
  const isMe = me?.id === u.id;

  return (
    <div className="dashboard">
      <p className="muted"><Link to="/admin/users">← All users</Link></p>
      <section className="card">
        <h2>{u.name} {isMe && "(you)"}</h2>
        <dl className="details">
          <div><dt>Email</dt><dd>{u.email}</dd></div>
          <div><dt>Role</dt><dd>{u.role}</dd></div>
          <div><dt>Status</dt><dd>{u.is_active ? "Active" : "Banned"}</dd></div>
          <div><dt>Joined</dt><dd>{when(u.created_at)}</dd></div>
          {u.ban_reason && <div><dt>Ban reason</dt><dd>{u.ban_reason}</dd></div>}
        </dl>
        {message && <p className="success">{message}</p>}
        {problem && <p className="alert">{problem}</p>}
        <div className="actions">
          {u.is_active ? (
            <button className="btn btn-danger" onClick={() => {
              const reason = window.prompt(`Reason for banning ${u.name}?`);
              if (reason && reason.trim().length >= 3) void act(() => banUser(u.id, reason.trim()), "User banned");
            }}>Ban user</button>
          ) : <button className="btn" onClick={() => void act(() => unbanUser(u.id), "User unbanned")}>Unban user</button>}
          <button className="btn" disabled={isMe} title={isMe ? "You cannot change your own role" : ""}
            onClick={() => { if (window.confirm(`Make ${u.name} ${u.role === "admin" ? "a normal user" : "an admin"}?`)) void act(() => changeRole(u.id, u.role === "admin" ? "user" : "admin"), "Role changed"); }}>
            {u.role === "admin" ? "Make normal user" : "Make admin"}
          </button>
          <button className="btn" onClick={() => void act(() => revokeSessions(u.id), "All sessions revoked")}>Revoke all sessions</button>
        </div>
      </section>

      <section className="card table-wrap">
        <h2 style={{ padding: "1rem 1rem 0" }}>Watchlist records ({data.watch_items.length})</h2>
        {data.watch_items.length === 0 ? <p className="muted" style={{ padding: "1rem" }}>None.</p> : (
          <table><thead><tr><th>Division</th><th>Alert level</th><th>Note</th><th>Created</th></tr></thead>
            <tbody>{data.watch_items.map((w) => <tr key={w.id}><td>{w.division}</td><td>{w.threshold}</td><td>{w.note ?? "–"}</td><td>{when(w.created_at)}</td></tr>)}</tbody></table>
        )}
      </section>

      <section className="card table-wrap">
        <h2 style={{ padding: "1rem 1rem 0" }}>Teams ({data.teams.length})</h2>
        {data.teams.length === 0 ? <p className="muted" style={{ padding: "1rem" }}>None.</p> : (
          <table><thead><tr><th>Team</th><th>Role in team</th><th>Create</th><th>Update</th><th>Assign</th></tr></thead>
            <tbody>{data.teams.map((t) => <tr key={t.id}><td>{t.name}</td><td>{t.is_owner ? "Owner" : "Member"}</td>
              <td>{t.can_create ? "✓" : "–"}</td><td>{t.can_update ? "✓" : "–"}</td><td>{t.can_assign ? "✓" : "–"}</td></tr>)}</tbody></table>
        )}
      </section>

      <section className="card table-wrap">
        <h2 style={{ padding: "1rem 1rem 0" }}>Active sessions ({data.sessions.length})</h2>
        {data.sessions.length === 0 ? <p className="muted" style={{ padding: "1rem" }}>No active sessions.</p> : (
          <table><thead><tr><th>Browser</th><th>IP</th><th>Started</th><th>Last used</th></tr></thead>
            <tbody>{data.sessions.map((s) => <tr key={s.id}><td title={s.user_agent}>{s.user_agent.slice(0, 50) || "unknown"}</td><td>{s.ip_address}</td><td>{when(s.created_at)}</td><td>{when(s.last_used_at)}</td></tr>)}</tbody></table>
        )}
      </section>

      <section className="card table-wrap">
        <h2 style={{ padding: "1rem 1rem 0" }}>Recent activity</h2>
        {data.activity.length === 0 ? <p className="muted" style={{ padding: "1rem" }}>No activity.</p> : (
          <table><thead><tr><th>Time</th><th>Event</th><th>IP</th><th>Details</th></tr></thead>
            <tbody>{data.activity.map((a) => <tr key={a.id}><td>{when(a.created_at)}</td><td>{a.event}</td><td>{a.ip_address}</td><td>{a.details ?? ""}</td></tr>)}</tbody></table>
        )}
      </section>
    </div>
  );
}
