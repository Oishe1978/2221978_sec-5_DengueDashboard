import { useCallback, useEffect, useState, type FormEvent } from "react";
import { changePassword, listSessions, revokeSession, updateProfile } from "../api/auth";
import { useAuth } from "../auth/AuthContext";
import type { SessionInfo } from "../types";
import { describeUserAgent, formatDateTime } from "../utils";

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuth();

  // ----- profile -----
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [profileMessage, setProfileMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  async function handleProfile(e: FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return setProfileMessage({ ok: false, text: "Enter your name (at least 2 characters)." });
    if (!EMAIL_PATTERN.test(email.trim())) return setProfileMessage({ ok: false, text: "Enter a valid email address." });
    setSavingProfile(true);
    try {
      updateUser(await updateProfile({ name: name.trim(), email: email.trim() }));
      setProfileMessage({ ok: true, text: "Profile updated." });
    } catch (err) {
      setProfileMessage({ ok: false, text: err instanceof Error ? err.message : "Update failed" });
    } finally {
      setSavingProfile(false);
    }
  }

  // ----- password -----
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  async function handlePassword(e: FormEvent) {
    e.preventDefault();
    if (!current) return setPasswordMessage({ ok: false, text: "Enter your current password." });
    if (next.length < 8 || !/[A-Za-z]/.test(next) || !/\d/.test(next)) {
      return setPasswordMessage({ ok: false, text: "The new password needs 8 or more characters, a letter and a digit." });
    }
    if (next !== confirm) return setPasswordMessage({ ok: false, text: "The two new passwords do not match." });
    setSavingPassword(true);
    try {
      await changePassword({ current_password: current, new_password: next });
      setCurrent("");
      setNext("");
      setConfirm("");
      setPasswordMessage({ ok: true, text: "Password changed. Your other devices were signed out." });
      void loadSessions();
    } catch (err) {
      setPasswordMessage({ ok: false, text: err instanceof Error ? err.message : "Could not change the password" });
    } finally {
      setSavingPassword(false);
    }
  }

  // ----- sessions -----
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(true);

  const loadSessions = useCallback(async () => {
    try {
      setSessions(await listSessions());
      setSessionsError(null);
    } catch (err) {
      setSessionsError(err instanceof Error ? err.message : "Could not load sessions");
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  async function handleRevoke(session: SessionInfo) {
    if (!window.confirm(session.current ? "Sign out of this device?" : "Sign out of that device?")) return;
    try {
      await revokeSession(session.id);
      if (session.current) await logout();
      else await loadSessions();
    } catch (err) {
      setSessionsError(err instanceof Error ? err.message : "Could not sign out that device");
    }
  }

  if (!user) return null;

  return (
    <div className="dashboard">
      <div className="page-head">
        <div>
          <h1>My account</h1>
          <p className="muted">{user.email} · {user.role}</p>
        </div>
      </div>

      <div className="profile-grid">
        <form className="form card" onSubmit={(e) => void handleProfile(e)} noValidate>
          <h2>Profile</h2>
          {profileMessage && <p className={profileMessage.ok ? "success" : "alert"}>{profileMessage.text}</p>}
          <label>
            Full name
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <div className="actions">
            <button className="btn btn-primary" disabled={savingProfile}>{savingProfile ? "Saving…" : "Save profile"}</button>
          </div>
        </form>

        <form className="form card" onSubmit={(e) => void handlePassword(e)} noValidate>
          <h2>Change password</h2>
          {passwordMessage && <p className={passwordMessage.ok ? "success" : "alert"}>{passwordMessage.text}</p>}
          <label>
            Current password
            <input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          </label>
          <label>
            New password (8+ characters, a letter and a digit)
            <input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
          </label>
          <label>
            Confirm new password
            <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </label>
          <div className="actions">
            <button className="btn btn-primary" disabled={savingPassword}>{savingPassword ? "Saving…" : "Change password"}</button>
          </div>
        </form>

        <section className="card wide">
          <h2>Where you are signed in</h2>
          <p className="muted">Sign out of any device you do not recognise.</p>
          {sessionsError && <p className="alert">{sessionsError}</p>}
          {loadingSessions ? (
            <p className="muted">Loading…</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Device</th><th>IP address</th><th>Signed in</th><th>Last active</th><th /></tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.id}>
                      <td>{describeUserAgent(s.user_agent)} {s.current && <span className="badge-current">This device</span>}</td>
                      <td>{s.ip_address || "–"}</td>
                      <td>{formatDateTime(s.created_at)}</td>
                      <td>{formatDateTime(s.last_used_at)}</td>
                      <td className="actions">
                        <button className="btn btn-sm btn-danger" onClick={() => void handleRevoke(s)}>Sign out</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
