
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { deleteCase, getCase } from "../api/cases";
import type { DengueCase } from "../types";

export default function CaseDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();

  const [item, setItem] = useState<DengueCase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError(null);

    getCase(id)
      .then(setItem)
      .catch((e: unknown) =>
        setError(
          e instanceof Error ? e.message : "Failed to load patient"
        )
      )
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDelete() {
    if (!window.confirm("Are you sure you want to delete this patient report?")) {
      return;
    }

    try {
      await deleteCase(id);
      navigate("/cases");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  if (loading) {
    return <p className="muted">Loading patient information...</p>;
  }

  if (error) {
    return <p className="alert">{error}</p>;
  }

  if (!item) {
    return <p className="muted">Patient report not found.</p>;
  }

  return (
    <section>
      <div className="page-head">
        <h1>{item.patient_name}</h1>

        <div className="actions">
          <Link className="btn" to={`/cases/${item.id}/edit`}>
            Edit
          </Link>

          <button
            className="btn btn-danger"
            onClick={() => void handleDelete()}
          >
            Delete
          </button>
        </div>
      </div>

      <dl className="details card">
        <div>
          <dt>Patient ID</dt>
          <dd>{item.id}</dd>
        </div>

        <div>
          <dt>Patient Name</dt>
          <dd>{item.patient_name}</dd>
        </div>

        <div>
          <dt>Age</dt>
          <dd>{item.age}</dd>
        </div>

        <div>
          <dt>District</dt>
          <dd>{item.district}</dd>
        </div>

        <div>
          <dt>Hospital Name</dt>
          <dd>{item.hospital_name}</dd>
        </div>

        <div>
          <dt>Severity</dt>
          <dd>{item.severity}</dd>
        </div>

        <div>
          <dt>Patient Status</dt>
          <dd>{item.status}</dd>
        </div>

        <div>
          <dt>Report Date</dt>
          <dd>
            {item.date && item.month && item.year
              ? `${item.date} ${item.month} ${item.year}`
              : "Not available"}
          </dd>
        </div>
      </dl>

      <Link to="/cases">← Back to patient reports</Link>
    </section>
  );
}
