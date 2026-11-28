import { getOverview } from "../../api/admin";
import { useAsync } from "../../hooks/useAsync";
import { formatNumber } from "../../utils";

export default function OverviewTab() {
  const { data, error, loading } = useAsync(() => getOverview(), []);
  if (loading) return <p className="muted">Loading…</p>;
  if (error || !data) return <p className="alert">{error ?? "Could not load the statistics"}</p>;
  const cards: [string, number, string, string][] = [
    ["Users", data.users, `${data.admins} admin(s)`, ""],
    ["Banned users", data.banned_users, "cannot log in", "kpi-red"],
    ["Daily reports", data.reports, "dengue data rows", "kpi-teal"],
    ["Watchlist items", data.watch_items, "personal records", "kpi-teal"],
    ["Teams", data.teams, "shared groups", "kpi-slate"],
    ["New users (7 days)", data.new_users_7d, "", "kpi-amber"],
    ["New items (7 days)", data.new_watch_items_7d, `${data.new_teams_7d} new team(s)`, "kpi-amber"],
    ["Failed logins (24 h)", data.failed_logins_24h, `${data.active_sessions} active session(s)`, "kpi-red"],
  ];
  return (
    <div className="kpis">
      {cards.map(([label, value, hint, color]) => (
        <div key={label} className={`card kpi ${color}`}>
          <span className="kpi-label">{label}</span>
          <span className="kpi-value">{formatNumber(value)}</span>
          {hint && <span className="kpi-hint">{hint}</span>}
        </div>
      ))}
    </div>
  );
}
