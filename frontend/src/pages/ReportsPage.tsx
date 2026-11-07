import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { deleteReport, listReports } from "../api/reports";
import { DIVISIONS } from "../constants";
import type { DailyReport, ReportFilters } from "../types";
import { formatDate } from "../utils";

const PAGE_SIZE = 20;

export default function ReportsPage() {
  const [filters, setFilters] = useState<ReportFilters>({});
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState<DailyReport[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await listReports(filters, offset, PAGE_SIZE);
      setItems(page.items);
      setTotal(page.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [filters, offset]);

  useEffect(() => {
    void load();
  }, [load]);

  const setFilter = (patch: Partial<ReportFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setOffset(0);
  };

  async function handleDelete(item: DailyReport) {
    if (!window.confirm(`Delete the ${item.division} report for ${formatDate(item.report_date)}?`)) return;
    try {
      await deleteReport(item.id);
      if (items.length === 1 && offset > 0) setOffset((o) => Math.max(0, o - PAGE_SIZE));
      else await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + PAGE_SIZE, total);

  return (
    <section>
      <div className="page-head">
        <h1>Daily reports</h1>
        <Link className="btn btn-primary" to="/reports/new">+ Add report</Link>
      </div>

      <div className="filters card">
        <label>Division
          <select
            value={filters.division ?? ""}
            onChange={(e) => setFilter({ division: e.target.value as ReportFilters["division"] })}
          >
            <option value="">All divisions</option>
            {DIVISIONS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
        <label>From
          <input type="date" value={filters.date_from ?? ""} onChange={(e) => setFilter({ date_from: e.target.value })} />
        </label>
        <label>To
          <input type="date" value={filters.date_to ?? ""} onChange={(e) => setFilter({ date_to: e.target.value })} />
        </label>
        <button className="btn" onClick={() => { setFilters({}); setOffset(0); }}>Clear</button>
      </div>
      <p className="hint">To see one exact day, set From and To to the same date.</p>

      {error && <p className="alert">{error}</p>}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : items.length === 0 ? (
        <p className="muted">No reports match these filters.</p>
      ) : (
        <>
          <div className="table-wrap card">
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Division</th><th className="num">Admitted</th>
                  <th className="num">Deaths</th><th />
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id}>
                    <td><Link to={`/reports/${r.id}`}>{formatDate(r.report_date)}</Link></td>
                    <td>{r.division}</td>
                    <td className="num">{r.admitted.toLocaleString()}</td>
                    <td className="num">{r.deaths.toLocaleString()}</td>
                    <td className="actions">
                      <Link className="btn btn-sm" to={`/reports/${r.id}/edit`}>Edit</Link>
                      <button className="btn btn-sm btn-danger" onClick={() => void handleDelete(r)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pager">
            <span className="muted">Showing {from}–{to} of {total.toLocaleString()}</span>
            <div className="actions">
              <button className="btn btn-sm" disabled={offset === 0} onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}>
                ← Previous
              </button>
              <button className="btn btn-sm" disabled={offset + PAGE_SIZE >= total} onClick={() => setOffset((o) => o + PAGE_SIZE)}>
                Next →
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
