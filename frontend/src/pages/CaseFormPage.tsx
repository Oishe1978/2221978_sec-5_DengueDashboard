import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { createCase, getCase, updateCase } from "../api/cases";
import { DISTRICTS } from "../constants";
import type { CaseInput, Severity } from "../types";

interface FormState {
  district: string;
  report_date: string;
  cases: string;
  deaths: string;
  recovered: string;
  severity: Severity;
}

const EMPTY: FormState = {
  district: "", report_date: "", cases: "", deaths: "0", recovered: "0", severity: "low",
};

const isCount = (v: string) => /^\d+$/.test(v);

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
          district: c.district,
          report_date: c.report_date,
          cases: String(c.cases),
          deaths: String(c.deaths),
          recovered: String(c.recovered),
          severity: c.severity,
        }),
      )
      .catch((e: unknown) => setErrors([e instanceof Error ? e.message : "Failed to load report"]))
      .finally(() => setLoading(false));
  }, [id]);

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  function validate(): string[] {
    const problems: string[] = [];
    if (!form.district) problems.push("Select a district.");
    if (!form.report_date) problems.push("Choose a report date.");
    if (![form.cases, form.deaths, form.recovered].every(isCount))
      problems.push("Cases, deaths and recovered must be whole numbers (0 or more).");
    else if (Number(form.deaths) + Number(form.recovered) > Number(form.cases))
      problems.push("Deaths + recovered cannot exceed total cases.");
    return problems;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const problems = validate();
    setErrors(problems);
    if (problems.length) return;

    const payload: CaseInput = {
      district: form.district,
      report_date: form.report_date,
      cases: Number(form.cases),
      deaths: Number(form.deaths),
      recovered: Number(form.recovered),
      severity: form.severity,
    };
    setSaving(true);
    try {
      if (id) await updateCase(id, payload);
      else await createCase(payload);
      navigate("/cases");
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "Save failed"]);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="muted">Loading…</p>;

  return (
    <section>
      <h1>{isEdit ? "Edit report" : "New report"}</h1>
      <form className="form card" onSubmit={(e) => void handleSubmit(e)} noValidate>
        {errors.length > 0 && (
          <ul className="alert">{errors.map((m) => <li key={m}>{m}</li>)}</ul>
        )}
        <label>District
          <select value={form.district} onChange={(e) => set({ district: e.target.value })}>
            <option value="">Select…</option>
            {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
        <label>Report date
          <input type="date" value={form.report_date} onChange={(e) => set({ report_date: e.target.value })} />
        </label>
        <div className="grid-3">
          <label>Cases
            <input inputMode="numeric" value={form.cases} onChange={(e) => set({ cases: e.target.value })} />
          </label>
          <label>Deaths
            <input inputMode="numeric" value={form.deaths} onChange={(e) => set({ deaths: e.target.value })} />
          </label>
          <label>Recovered
            <input inputMode="numeric" value={form.recovered} onChange={(e) => set({ recovered: e.target.value })} />
          </label>
        </div>
        <label>Severity
          <select value={form.severity} onChange={(e) => set({ severity: e.target.value as Severity })}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <div className="actions">
          <button className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
          <Link className="btn" to="/cases">Cancel</Link>
        </div>
      </form>
    </section>
  );
}