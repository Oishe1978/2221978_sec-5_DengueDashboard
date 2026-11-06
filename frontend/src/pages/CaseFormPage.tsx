
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { createCase, getCase, updateCase } from "../api/cases";
import type { CaseInput, Severity } from "../types";

interface FormState {
  patient_name: string;
  age: string;
  district: string;
  hospital_name: string;
  severity: Severity;
  status: string;
}

const EMPTY: FormState = {
  patient_name: "",
  age: "",
  district: "",
  hospital_name: "",
  severity: "Low",
  status: "Admitted",
};

export default function CaseFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (!id) return;

    getCase(id)
      .then((c) =>
        setForm({
          patient_name: c.patient_name,
          age: String(c.age),
          district: c.district,
          hospital_name: c.hospital_name,
          severity: c.severity,
          status: c.status,
        })
      )
      .catch((e: unknown) =>
        setErrors([
          e instanceof Error ? e.message : "Failed to load patient",
        ])
      )
      .finally(() => setLoading(false));
  }, [id]);

  const set = (patch: Partial<FormState>) =>
    setForm((f) => ({ ...f, ...patch }));

  function validate(): string[] {
    const problems: string[] = [];

    if (!form.patient_name.trim()) {
      problems.push("Enter the patient name.");
    }

    if (!/^\d+$/.test(form.age) || Number(form.age) < 1) {
      problems.push("Enter a valid patient age.");
    }

    if (!form.district.trim()) {
      problems.push("Enter the district.");
    }

    if (!form.hospital_name.trim()) {
      problems.push("Enter the hospital name.");
    }

    if (!form.status.trim()) {
      problems.push("Select the patient status.");
    }

    return problems;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const problems = validate();
    setErrors(problems);

    if (problems.length > 0) return;

    const payload: CaseInput = {
      patient_name: form.patient_name.trim(),
      age: Number(form.age),
      district: form.district.trim(),
      hospital_name: form.hospital_name.trim(),
      severity: form.severity,
      status: form.status,
    };

    setSaving(true);

    try {
      if (id) {
        await updateCase(id, payload);
      } else {
        await createCase(payload);
      }

      navigate("/cases");
    } catch (err) {
      setErrors([
        err instanceof Error ? err.message : "Save failed",
      ]);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="muted">Loading...</p>;
  }

  return (
    <section>
      <h1>{isEdit ? "Edit Patient Report" : "Add New Patient"}</h1>

      <form
        className="form card"
        onSubmit={(e) => void handleSubmit(e)}
        noValidate
      >
        {errors.length > 0 && (
          <ul className="alert">
            {errors.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        )}

        <label>
          Patient Name
          <input
            type="text"
            value={form.patient_name}
            onChange={(e) => set({ patient_name: e.target.value })}
            placeholder="Enter patient name"
          />
        </label>

        <label>
          Age
          <input
            type="number"
            min="1"
            value={form.age}
            onChange={(e) => set({ age: e.target.value })}
            placeholder="Enter age"
          />
        </label>

        <label>
          District
          <input
            type="text"
            value={form.district}
            onChange={(e) => set({ district: e.target.value })}
            placeholder="Enter district"
          />
        </label>

        <label>
          Hospital Name
          <input
            type="text"
            value={form.hospital_name}
            onChange={(e) => set({ hospital_name: e.target.value })}
            placeholder="Enter hospital name"
          />
        </label>

        <label>
          Severity
          <select
            value={form.severity}
            onChange={(e) =>
              set({ severity: e.target.value as Severity })
            }
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </label>

        <label>
          Patient Status
          <select
            value={form.status}
            onChange={(e) => set({ status: e.target.value })}
          >
            <option value="Admitted">Admitted</option>
            <option value="Recovered">Recovered</option>
            <option value="Discharged">Discharged</option>
          </select>
        </label>

        <div className="actions">
          <button
            className="btn btn-primary"
            disabled={saving}
            type="submit"
          >
            {saving ? "Saving..." : "Save"}
          </button>

          <Link className="btn" to="/cases">
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
}

