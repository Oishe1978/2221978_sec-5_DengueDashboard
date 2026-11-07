import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { createReport, getReport, updateReport } from "../api/reports";
import { DIVISIONS, type Division } from "../constants";
import type { ReportInput } from "../types";
import { todayLocal } from "../utils";

interface FormState {
  division: Division | "";
  report_date: string;
  admitted: string;
  deaths: string;
}

const isCount = (value: string) => /^\d+$/.test(value);

export default function ReportFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>({
    division: "",
    report_date: todayLocal(),
    admitted: "",
    deaths: "0",
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (!id) return;
    getReport(id)
      .then((r) =>
        setForm({
          division: r.division,
          report_date: r.report_date,
          admitted: String(r.admitted),
          deaths: String(r.deaths),
        }),
      )
      .catch((e: unknown) => setErrors([e instanceof Error ? e.message : "Failed to load report"]))
      .finally(() => setLoading(false));
  }, [id]);

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  function validate(): string[] {
    const problems: string[] = [];
    if (!form.division) problems.push("Select a division.");
    if (!form.report_date) problems.push("Choose a date.");
    else if (form.report_date > todayLocal()) problems.push("The date cannot be in the future.");
    if (!isCount(form.admitted) || !isCount(form.deaths)) {
      problems.push("Admitted and deaths must be whole numbers (0 or more).");
    } else if (Number(form.deaths) > Number(form.admitted)) {
      problems.push("Deaths cannot exceed admissions.");
    }
    return problems;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const problems = validate();
    setErrors(problems);
    if (problems.length > 0) return;

    const payload: ReportInput = {
      division: form.division as Division,
      report_date: form.report_date,
      admitted: Number(form.admitted),
      deaths: Number(form.deaths),
    };
    setSaving(true);
    try {
      if (id) await updateReport(id, payload);
      else await createReport(payload);
      navigate("/reports");
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "Save failed"]);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="muted">Loading…</p>;

  return (
    <section>
      <h1>{isEdit ? "Edit report" : "Add report"}</h1>
      <form className="form card" onSubmit={(e) => void handleSubmit(e)} noValidate>
        {errors.length > 0 && (
          <ul className="alert">{errors.map((m) => <li key={m}>{m}</li>)}</ul>
        )}

        <label>Division
          <select value={form.division} onChange={(e) => set({ division: e.target.value as Division | "" })}>
            <option value="">Select a division…</option>
            {DIVISIONS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>

        <label>Date
          <input
            type="date"
            max={todayLocal()}
            value={form.report_date}
            onChange={(e) => set({ report_date: e.target.value })}
          />
        </label>

        <div className="grid-2">
          <label>Admitted
            <input inputMode="numeric" value={form.admitted} onChange={(e) => set({ admitted: e.target.value })} />
          </label>
          <label>Deaths
            <input inputMode="numeric" value={form.deaths} onChange={(e) => set({ deaths: e.target.value })} />
          </label>
        </div>

        <div className="actions">
          <button className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
          <Link className="btn" to="/reports">Cancel</Link>
        </div>
      </form>
    </section>
  );
}
