
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { deleteCase, listCases } from "../api/cases";
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

  const setFilter = (patch: Partial<CaseFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
  };

  async function handleDelete(item: DengueCase) {
    if (!window.confirm(`Delete the report for ${item.patient_name}?`)) {
      return;
    }

    try {
      await deleteCase(String(item.id));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  return (
    <section>
      <div className="page-head">
        <h1>Dengue Patient Reports</h1>
        <Link className="btn btn-primary" to="/cases/new">
          + Add New Patient
        </Link>
      </div>

      <div className="filters card">
        <label>
          District
          <input
            type="text"
            placeholder="Enter district"
            value={filters.district ?? ""}
            onChange={(e) => setFilter({ district: e.target.value })}
          />
        </label>

        <button className="btn" onClick={() => setFilters({})}>
          Clear Filters
        </button>
      </div>

      {error && <p className="alert">{error}</p>}

      {loading ? (
        <p className="muted">Loading...</p>
      ) : items.length === 0 ? (
        <p className="muted">No patient reports found.</p>
      ) : (
        <div className="table-wrap card">
          <table>
            <thead>
              <tr>
                <th>Patient Name</th>
                <th>Age</th>
                <th>District</th>
                <th>Hospital</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {items.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link to={`/cases/${c.id}`}>
                      {c.patient_name}
                    </Link>
                  </td>
                  <td>{c.age}</td>
                  <td>{c.district}</td>
                  <td>{c.hospital_name}</td>
                  <td>{c.severity}</td>
                  <td>{c.status}</td>
                  <td className="actions">
                    <Link
                      className="btn btn-sm"
                      to={`/cases/${c.id}/edit`}
                    >
                      Edit
                    </Link>

                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => void handleDelete(c)}
                    >
                      Delete
                    </button>
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
