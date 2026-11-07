import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { deleteReport, getReport } from "../api/reports";
import type { DailyReport } from "../types";
import { formatDate, formatDateTime } from "../utils";

export default function ReportDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState<DailyReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getReport(id)
      .then(setReport)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load report"));
  }, [id]);

  async function handleDelete() {
    if (!window.confirm("Delete this report?")) return;
    try {
      await deleteReport(id);
      navigate("/reports");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  if (error) return <p className="alert">{error}</p>;
  if (!report) return <p className="muted">Loading…</p>;

  return (
    <section>
      <div className="page-head">
        <h1>{report.division} · {formatDate(report.report_date)}</h1>
        <div className="actions">
          <Link className="btn" to={`/reports/${report.id}/edit`}>Edit</Link>
          <button className="btn btn-danger" onClick={() => void handleDelete()}>Delete</button>
        </div>
      </div>

      <dl className="details card">
        <div><dt>Admitted</dt><dd>{report.admitted.toLocaleString()}</dd></div>
        <div><dt>Deaths</dt><dd>{report.deaths.toLocaleString()}</dd></div>
        <div><dt>Created</dt><dd>{formatDateTime(report.created_at)}</dd></div>
        <div><dt>Last updated</dt><dd>{formatDateTime(report.updated_at)}</dd></div>
      </dl>

      <Link to="/reports">← Back to reports</Link>
    </section>
  );
}
