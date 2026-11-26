import { HashRouter, NavLink, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { PERMISSIONS, can } from "./auth/permissions";
import RequireAuth from "./components/RequireAuth";
import RequirePermission from "./components/RequirePermission";
import DashboardPage from "./pages/DashboardPage";
import DayPage from "./pages/DayPage";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";
import RegisterPage from "./pages/RegisterPage";
import ReportDetailPage from "./pages/ReportDetailPage";
import ReportFormPage from "./pages/ReportFormPage";
import ReportsPage from "./pages/ReportsPage";
import TeamPage from "./pages/TeamPage";
import TeamsPage from "./pages/TeamsPage";
import WatchlistPage from "./pages/WatchlistPage";

function Header() {
  const { user, loading, logout } = useAuth();
  const canWriteReports = can(user, PERMISSIONS.REPORTS_WRITE);
  const canWatch = can(user, PERMISSIONS.WATCHLIST_OWN);
  const canTeams = can(user, PERMISSIONS.TEAMS_USE);
  return (
    <header className="topbar">
      <span className="brand">🦟 Dengue Dashboard</span>
      <nav>
        <NavLink to="/" end>Dashboard</NavLink>
        {canWatch && <NavLink to="/watchlist">Watchlist</NavLink>}
        {canTeams && <NavLink to="/teams">Teams</NavLink>}
        {canWriteReports && <NavLink to="/reports" end>Manage data</NavLink>}
        {canWriteReports && <NavLink to="/reports/new">Add report</NavLink>}
        {loading ? null : user ? (
          <>
            <NavLink to="/profile">{user.name} · {user.role}</NavLink>
            <button className="linklike" onClick={() => void logout()}>Log out</button>
          </>
        ) : (
          <>
            <NavLink to="/login">Log in</NavLink>
            <NavLink to="/register">Register</NavLink>
          </>
        )}
      </nav>
    </header>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Header />
        <main className="container">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/day/:date" element={<DayPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/watchlist" element={<RequirePermission permission={PERMISSIONS.WATCHLIST_OWN}><WatchlistPage /></RequirePermission>} />
            <Route path="/teams" element={<RequirePermission permission={PERMISSIONS.TEAMS_USE}><TeamsPage /></RequirePermission>} />
            <Route path="/teams/:id" element={<RequirePermission permission={PERMISSIONS.TEAMS_USE}><TeamPage /></RequirePermission>} />
            <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
            <Route path="/reports" element={<RequirePermission permission={PERMISSIONS.REPORTS_WRITE}><ReportsPage /></RequirePermission>} />
            <Route path="/reports/new" element={<RequirePermission permission={PERMISSIONS.REPORTS_WRITE}><ReportFormPage /></RequirePermission>} />
            <Route path="/reports/:id" element={<RequirePermission permission={PERMISSIONS.REPORTS_WRITE}><ReportDetailPage /></RequirePermission>} />
            <Route path="/reports/:id/edit" element={<RequirePermission permission={PERMISSIONS.REPORTS_WRITE}><ReportFormPage /></RequirePermission>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </AuthProvider>
    </HashRouter>
  );
}
