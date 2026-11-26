import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  addMember,
  assignTeamItem,
  createTeamItem,
  deleteTeam,
  deleteTeamItem,
  getTeam,
  removeMember,
  renameTeam,
  updateMember,
  updateTeamItem,
} from "../api/teams";
import { useAuth } from "../auth/AuthContext";
import { DIVISIONS, type Division } from "../constants";
import type { MemberFlags, TeamDetail, TeamItem, TeamMember } from "../types";
import { formatDate, formatNumber } from "../utils";

const FLAG_LABELS: { key: keyof MemberFlags; label: string }[] = [
  { key: "can_create", label: "Create items" },
  { key: "can_update", label: "Edit items" },
  { key: "can_assign", label: "Assign items" },
];

export default function TeamPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [detail, setDetail] = useState<TeamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setDetail(await getTeam(id));
      setError(null);
    } catch (err) {
      setDetail(null);
      setError(err instanceof Error ? err.message : "Could not load the team");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Run a server action, then reload; show the server's message if it refuses. */
  async function act(action: () => Promise<unknown>) {
    try {
      await action();
      setError(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That did not work");
    }
  }

  // ----- rename (owner) -----
  const [newName, setNewName] = useState("");
  // ----- add member (owner) -----
  const [email, setEmail] = useState("");
  const [flags, setFlags] = useState<MemberFlags>({ can_create: false, can_update: false, can_assign: false });
  // ----- item form (add or edit) -----
  const [editing, setEditing] = useState<TeamItem | null>(null);
  const [division, setDivision] = useState<Division | "">("");
  const [threshold, setThreshold] = useState("");
  const [note, setNote] = useState("");
  const [itemErrors, setItemErrors] = useState<string[]>([]);

  if (loading) return <p className="muted">Loading…</p>;
  if (!detail || !user) {
    return (
      <section className="card">
        <h1>Team</h1>
        <p className="alert">{error ?? "Team not found"}</p>
        <Link to="/teams">← Back to my teams</Link>
      </section>
    );
  }

  const { team, members, items } = detail;
  const isOwner = team.my_role === "owner";
  const followed = items.map((i) => i.division as string);
  const available = DIVISIONS.filter((d) => !followed.includes(d));

  function resetItemForm() {
    setEditing(null);
    setDivision("");
    setThreshold("");
    setNote("");
    setItemErrors([]);
  }

  function startEdit(item: TeamItem) {
    setEditing(item);
    setDivision(item.division);
    setThreshold(String(item.threshold));
    setNote(item.note ?? "");
    setItemErrors([]);
  }

  async function submitItem(e: FormEvent) {
    e.preventDefault();
    const problems: string[] = [];
    if (!editing && !division) problems.push("Select a division.");
    if (!/^\d+$/.test(threshold) || Number(threshold) < 1) problems.push("The alert level must be a whole number of 1 or more.");
    setItemErrors(problems);
    if (problems.length > 0) return;
    try {
      if (editing) await updateTeamItem(team.id, editing.id, { threshold: Number(threshold), note: note.trim() });
      else await createTeamItem(team.id, { division: division as Division, threshold: Number(threshold), note: note.trim() || undefined });
      resetItemForm();
      setError(null);
      await load();
    } catch (err) {
      setItemErrors([err instanceof Error ? err.message : "Save failed"]);
    }
  }

  async function submitMember(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return setError("Enter the email address of a registered user.");
    await act(async () => {
      await addMember(team.id, email.trim(), flags);
      setEmail("");
      setFlags({ can_create: false, can_update: false, can_assign: false });
    });
  }

  function toggleFlag(member: TeamMember, key: keyof MemberFlags, checked: boolean) {
    const change: Partial<MemberFlags> = {};
    change[key] = checked;
    void act(() => updateMember(team.id, member.user_id, change));
  }

  async function submitRename(e: FormEvent) {
    e.preventDefault();
    if (newName.trim().length < 2) return setError("Give the team a name (at least 2 characters).");
    await act(async () => {
      await renameTeam(team.id, newName.trim());
      setNewName("");
    });
  }

  async function handleDeleteTeam() {
    if (!window.confirm(`Delete the team "${team.name}" with all its items? This cannot be undone.`)) return;
    try {
      await deleteTeam(team.id);
      navigate("/teams");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the team");
    }
  }

  async function handleLeave() {
    if (!window.confirm(`Leave the team "${team.name}"?`)) return;
    try {
      await removeMember(team.id, user!.id);
      navigate("/teams");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not leave the team");
    }
  }

  return (
    <div className="dashboard">
      <div className="page-head">
        <div>
          <h1>{team.name}</h1>
          <p className="muted">
            Owner: {team.owner_name} · you are the {isOwner ? "owner" : "member"} · {team.member_count} people
          </p>
        </div>
        <div className="actions">
          <Link className="btn" to="/teams">← My teams</Link>
          {isOwner ? (
            <button className="btn btn-danger" onClick={() => void handleDeleteTeam()}>Delete team</button>
          ) : (
            <button className="btn btn-danger" onClick={() => void handleLeave()}>Leave team</button>
          )}
        </div>
      </div>

      {error && <p className="alert">{error}</p>}

      {isOwner && (
        <form className="card inline-form" onSubmit={(e) => void submitRename(e)} noValidate>
          <label>
            Rename team
            <input value={newName} placeholder={team.name} maxLength={80} onChange={(e) => setNewName(e.target.value)} />
          </label>
          <button className="btn">Rename</button>
        </form>
      )}

      {/* ---------------- items ---------------- */}
      <section className="card">
        <h2>Divisions the team follows</h2>
        {(team.can_create || editing) && (
          <form className="form" onSubmit={(e) => void submitItem(e)} noValidate>
            <h3>{editing ? `Edit ${editing.division}` : "Add a division"}</h3>
            {itemErrors.length > 0 && <ul className="alert">{itemErrors.map((m) => <li key={m}>{m}</li>)}</ul>}
            <div className="grid-2">
              <label>
                Division
                <select value={division} disabled={editing !== null} onChange={(e) => setDivision(e.target.value as Division | "")}>
                  <option value="">Select…</option>
                  {(editing ? DIVISIONS : available).map((d) => <option key={d} value={d}>{d}</option>)}
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
              <button className="btn btn-primary">{editing ? "Save changes" : "Add to team"}</button>
              {editing && <button type="button" className="btn" onClick={resetItemForm}>Cancel</button>}
            </div>
          </form>
        )}
        {!team.can_create && !isOwner && <p className="hint">You can view items. The owner has not given you permission to add them.</p>}

        {items.length === 0 ? (
          <p className="muted">No divisions yet.</p>
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
                  {item.latest_date ? `Admissions on ${formatDate(item.latest_date)}` : "No data yet"} · added by {item.created_by_name}
                </p>
                {item.note && <p className="watch-note">{item.note}</p>}
                <label>
                  Assigned to
                  <select
                    value={item.assigned_to ?? ""}
                    disabled={!team.can_assign}
                    onChange={(e) => void act(() => assignTeamItem(team.id, item.id, e.target.value || null))}
                  >
                    <option value="">Nobody</option>
                    {members.map((m) => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}
                  </select>
                </label>
                <div className="actions">
                  {team.can_update && <button className="btn btn-sm" onClick={() => startEdit(item)}>Edit</button>}
                  {isOwner && (
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => {
                        if (window.confirm(`Remove ${item.division} from the team?`)) void act(() => deleteTeamItem(team.id, item.id));
                      }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ---------------- members ---------------- */}
      <section className="card">
        <h2>People</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>Email</th>{FLAG_LABELS.map((f) => <th key={f.key}>{f.label}</th>)}<th /></tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.user_id}>
                  <td>{m.name} {m.is_owner && <span className="badge badge-owner">Owner</span>}</td>
                  <td>{m.email}</td>
                  {FLAG_LABELS.map((f) => (
                    <td key={f.key}>
                      {m.is_owner ? (
                        "✓"
                      ) : isOwner ? (
                        <input type="checkbox" checked={m[f.key]} onChange={(e) => toggleFlag(m, f.key, e.target.checked)} />
                      ) : m[f.key] ? "✓" : "–"}
                    </td>
                  ))}
                  <td className="actions">
                    {isOwner && !m.is_owner && (
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => {
                          if (window.confirm(`Remove ${m.name} from the team?`)) void act(() => removeMember(team.id, m.user_id));
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="hint">Only the owner can add people, change what they may do, remove them, rename the team or delete items.</p>

        {isOwner && (
          <form className="form" onSubmit={(e) => void submitMember(e)} noValidate>
            <h3>Add a person</h3>
            <label>
              Email of a registered user
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <div className="checks">
              {FLAG_LABELS.map((f) => (
                <label key={f.key}>
                  <input type="checkbox" checked={flags[f.key]} onChange={(e) => setFlags({ ...flags, [f.key]: e.target.checked })} />
                  {f.label}
                </label>
              ))}
            </div>
            <div className="actions"><button className="btn btn-primary">Add to team</button></div>
          </form>
        )}
      </section>
    </div>
  );
}
