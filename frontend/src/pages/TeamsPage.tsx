import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createTeam, listTeams } from "../api/teams";
import type { TeamSummary } from "../types";

export default function TeamsPage() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setTeams(await listTeams());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your teams");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return setFormError("Give the team a name (at least 2 characters).");
    setSaving(true);
    setFormError(null);
    try {
      const team = await createTeam(name.trim());
      navigate(`/teams/${team.id}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not create the team");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dashboard">
      <div className="page-head">
        <div>
          <h1>My teams</h1>
          <p className="muted">Teams share a watchlist. The owner decides what each member may do.</p>
        </div>
      </div>

      <form className="form card" onSubmit={(e) => void handleCreate(e)} noValidate>
        <h2>Create a team</h2>
        {formError && <p className="alert">{formError}</p>}
        <label>
          Team name
          <input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="actions">
          <button className="btn btn-primary" disabled={saving}>{saving ? "Creating…" : "Create team"}</button>
        </div>
      </form>

      {error && <p className="alert">{error}</p>}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : teams.length === 0 ? (
        <p className="muted">You are not in any team yet. Create one above, or ask a team owner to add you.</p>
      ) : (
        <div className="team-grid">
          {teams.map((t) => (
            <Link key={t.id} to={`/teams/${t.id}`} className="card team-card">
              <header>
                <h2>{t.name}</h2>
                <span className={t.my_role === "owner" ? "badge badge-owner" : "badge badge-member"}>
                  {t.my_role === "owner" ? "Owner" : "Member"}
                </span>
              </header>
              <p className="muted">Owner: {t.owner_name}</p>
              <p className="muted">{t.member_count} people · {t.item_count} divisions followed</p>
              {t.my_role === "member" && (
                <p className="perm-badges">
                  {t.can_create && <span>create</span>}
                  {t.can_update && <span>update</span>}
                  {t.can_assign && <span>assign</span>}
                  {!t.can_create && !t.can_update && !t.can_assign && <span>view only</span>}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
