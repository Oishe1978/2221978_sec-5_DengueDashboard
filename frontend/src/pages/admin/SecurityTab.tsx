import { getSecurity } from "../../api/admin";
import { useAsync } from "../../hooks/useAsync";
import { formatDateTime } from "../../utils";

export default function SecurityTab() {
  const { data, error, loading } = useAsync(() => getSecurity(), []);
  if (loading) return <p className="muted">Loading…</p>;
  if (error || !data) return <p className="alert">{error ?? "Could not load the security view"}</p>;
  return (
    <div className="dashboard">
      <p className="muted">{data.total_failed} failed login event(s) in the last {data.days} days.</p>
      <div className="grid-2col" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
        <section className="card table-wrap">
          <h2 style={{ padding: "1rem 1rem 0" }}>Failed logins by IP address</h2>
          {data.by_ip.length === 0 ? <p className="muted" style={{ padding: "1rem" }}>None.</p> : (
            <table><thead><tr><th>IP</th><th className="num">Failures</th><th className="num">Accounts tried</th></tr></thead>
              <tbody>{data.by_ip.map((r) => <tr key={r.ip_address}><td>{r.ip_address}</td><td className="num">{r.failures}</td><td className="num">{r.accounts}</td></tr>)}</tbody></table>
          )}
        </section>
        <section className="card table-wrap">
          <h2 style={{ padding: "1rem 1rem 0" }}>Failed logins by account</h2>
          {data.by_account.length === 0 ? <p className="muted" style={{ padding: "1rem" }}>None.</p> : (
            <table><thead><tr><th>Account</th><th className="num">Failures</th><th className="num">IPs</th></tr></thead>
              <tbody>{data.by_account.map((r) => <tr key={r.email}><td>{r.email}</td><td className="num">{r.failures}</td><td className="num">{r.ips}</td></tr>)}</tbody></table>
          )}
        </section>
      </div>
      <section className="card table-wrap">
        <h2 style={{ padding: "1rem 1rem 0" }}>Locked accounts right now</h2>
        {data.locked_accounts.length === 0 ? <p className="muted" style={{ padding: "1rem" }}>No locked accounts.</p> : (
          <table><thead><tr><th>Account</th><th>Locked until</th></tr></thead>
            <tbody>{data.locked_accounts.map((r) => <tr key={r.id}><td>{r.email}</td><td>{formatDateTime(r.locked_until)}</td></tr>)}</tbody></table>
        )}
      </section>
    </div>
  );
}
