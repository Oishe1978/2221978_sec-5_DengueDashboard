import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { deleteCase, getCase } from "../api/cases";
import SeverityBadge from "../components/SeverityBadge";
import type { DengueCase } from "../types";

export default function CaseDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<DengueCase | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCase(id)
      .then(setItem)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load report"));
  }, [id]);

  async function handleDelete() {
    if (!window.confirm("Delete this report?")) return;
    try {
      await deleteCase(id);
      navigate("/cases");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  if (error) return <p className="alert">{error}</p>;
  if (!item) return <p className="muted">Loading…</p>;

  return (
    <section>
      <div className="page-head">
        <h1>{item.district} <SeverityBadge severity={item.severity} /></h1>
        <div className="actions">
          <Link className="btn" to={`/cases/${item.id}/edit`}>Edit</Link>
          <button className="btn btn-danger" onClick={() => void handleDelete()}>Delete</button>
        </div>
      </div>
      <dl className="details card">
        <div><dt>Report date</dt><dd>{item.report_date}</dd></div>
        <div><dt>Cases</dt><dd>{item.cases}</dd></div>
        <div><dt>Deaths</dt><dd>{item.deaths}</dd></div>
        <div><dt>Recovered</dt><dd>{item.recovered}</dd></div>
        <div><dt>Created</dt><dd>{new Date(item.created_at).toLocaleString()}</dd></div>
      </dl>
      <Link to="/cases">← Back to reports</Link>
    </section>
  );
}