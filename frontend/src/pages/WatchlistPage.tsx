import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createWatchItem, deleteWatchItem, listWatchItems, updateWatchItem } from "../api/watchlist";
import { DIVISIONS, type Division } from "../constants";
import type { WatchItem } from "../types";
import { formatDate, formatNumber } from "../utils";

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // form state: editing === null means "add a new item"
  const [editing, setEditing] = useState<WatchItem | null>(null);
  const [division, setDivision] = useState<Division | "">("");
  const [threshold, setThreshold] = useState("");
  const [note, setNote] = useState("");
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await listWatchItems());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your watchlist");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const watched = items.map((i) => i.division as string);
  const available = DIVISIONS.filter((d) => !watched.includes(d));

  function resetForm() {
    setEditing(null);
    setDivision("");
    setThreshold("");
    setNote("");
    setFormErrors([]);
  }

  function startEdit(item: WatchItem) {
    setEditing(item);
    setDivision(item.division);
    setThreshold(String(item.threshold));
    setNote(item.note ?? "");
    setFormErrors([]);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const problems: string[] = [];
    if (!editing && !division) problems.push("Select a division.");
    if (!/^\d+$/.test(threshold) || Number(threshold) < 1) problems.push("The alert level must be a whole number of 1 or more.");
    if (note.length > 500) problems.push("The note can have at most 500 characters.");
    setFormErrors(problems);
    if (problems.length > 0) return;

    setSaving(true);
    try {
      if (editing) {
        await updateWatchItem(editing.id, { threshold: Number(threshold), note: note.trim() });
      } else {
        await createWatchItem({ division: division as Division, threshold: Number(threshold), note: note.trim() || undefined });
      }
      resetForm();
      await load();
    } catch (err) {
      setFormErrors([err instanceof Error ? err.message : "Save failed"]);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: WatchItem) {
    if (!window.confirm(`Stop watching ${item.division}?`)) return;
    try {
      await deleteWatchItem(item.id);
      if (editing?.id === item.id) resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div className="dashboard">
      <div className="page-head">
        <div>
          <h1>My watchlist</h1>
          <p className="muted">Pick divisions to follow and the daily admissions that should raise an alert. Only you can see these.</p>
        </div>
      </div>

      <form className="form card" onSubmit={(e) => void handleSubmit(e)} noValidate>
        <h2>{editing ? `Edit ${editing.division}` : "Add a division"}</h2>
        {formErrors.length > 0 && <ul className="alert">{formErrors.map((m) => <li key={m}>{m}</li>)}</ul>}
        <div className="grid-2">
          <label>
            Division
            <select
              value={division}
              disabled={editing !== null}
              onChange={(e) => setDivision(e.target.value as Division | "")}
            >
              <option value="">Select…</option>
              {(editing ? DIVISIONS : available).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>
          <label>
            Alert when daily admissions reach
            <input inputMode="numeric" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
          </label>
        </div>
        <label>
          Note (optional)
          <input value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
        </label>
        <div className="actions">
          <button className="btn btn-primary" disabled={saving || (!editing && available.length === 0)}>
            {saving ? "Saving…" : editing ? "Save changes" : "Add to watchlist"}
          </button>
          {editing && <button type="button" className="btn" onClick={resetForm}>Cancel</button>}
        </div>
        {!editing && available.length === 0 && <p className="hint">You are already watching every division.</p>}
      </form>

      {error && <p className="alert">{error}</p>}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : items.length === 0 ? (
        <p className="muted">Your watchlist is empty. Add a division above.</p>
      ) : (
        <div className="watch-grid">
          {items.map((item) => (
            <article key={item.id} className={`card watch-card ${item.alert ? "watch-alert" : ""}`}>
              <header>
                <h2>{item.division}</h2>
                <span className={item.alert ? "badge badge-alert" : "badge badge-ok"}>
                  {item.alert ? "Above alert level" : "Below alert level"}
                </span>
              </header>
              <p className="watch-number">
                {item.latest_admitted !== null ? formatNumber(item.latest_admitted) : "–"}
                <span> / {formatNumber(item.threshold)}</span>
              </p>
              <p className="muted">
                {item.latest_date ? `Admissions on ${formatDate(item.latest_date)}` : "No data yet"}, alert at {formatNumber(item.threshold)}
              </p>
              {item.note && <p className="watch-note">{item.note}</p>}
              <div className="actions">
                <button className="btn btn-sm" onClick={() => startEdit(item)}>Edit</button>
                <button className="btn btn-sm btn-danger" onClick={() => void handleDelete(item)}>Delete</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
