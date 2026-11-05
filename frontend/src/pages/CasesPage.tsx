import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { deleteCase, listCases } from "../api/cases";
import SeverityBadge from "../components/SeverityBadge";
import { DISTRICTS } from "../constants";
import type { CaseFilters, DengueCase } from "../types";

export default function CasesPage() {
  const [filters, setFilters] = useState<CaseFilters>({});
  const [items, setItems] = useState<DengueCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await listCases(filters));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  const setFilter = (patch: Partial<CaseFilters>) => setFilters((f) => ({ ...f, ...patch }));

  async function handleDelete(item: DengueCase) {
    if (!window.confirm(`Delete the ${item.district} report for ${item.report_date}?`)) return;
    try {
      await deleteCase(item.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  return (
    <section>
      <div className="page-head">
        <h1>Case reports</h1>
        <Link className="btn btn-primary" to="/cases/new">+ New report</Link>
      </div>

      <div className="filters card">
        <label>District
          <select value={filters.district ?? ""} onChange={(e) => setFilter({ district: e.target.value })}>
            <option value="">All districts</option>
            {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
        <label>Severity
          <select value={filters.severity ?? ""} onChange={(e) => setFilter({ severity: e.target.value as CaseFilters["severity"] })}>
            <option value="">All</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <label>From
          <input type="date" value={filters.date_from ?? ""} onChange={(e) => setFilter({ date_from: e.target.value })} />
        </label>
        <label>To
          <input type="date" value={filters.date_to ?? ""} onChange={(e) => setFilter({ date_to: e.target.value })} />
        </label>
        <button className="btn" onClick={() => setFilters({})}>Clear</button>
      </div>

      {error && <p className="alert">{error}</p>}
      {loading ? (
        <p className="muted">Loading…</p>
      ) : items.length === 0 ? (
        <p className="muted">No reports match these filters.</p>
      ) : (
        <div className="table-wrap card">
          <table>
            <thead>
              <tr>
                <th>District</th><th>Date</th><th>Cases</th><th>Deaths</th>
                <th>Recovered</th><th>Severity</th><th />
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id}>
                  <td><Link to={`/cases/${c.id}`}>{c.district}</Link></td>
                  <td>{c.report_date}</td>
                  <td>{c.cases}</td>
                  <td>{c.deaths}</td>
                  <td>{c.recovered}</td>
                  <td><SeverityBadge severity={c.severity} /></td>
                  <td className="actions">
                    <Link className="btn btn-sm" to={`/cases/${c.id}/edit`}>Edit</Link>
                    <button className="btn btn-sm btn-danger" onClick={() => void handleDelete(c)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}