import { BrowserRouter, NavLink, Navigate, Route, Routes } from "react-router-dom";
import ReportDetailPage from "./pages/ReportDetailPage";
import ReportFormPage from "./pages/ReportFormPage";
import ReportsPage from "./pages/ReportsPage";

export default function App() {
  return (
    <BrowserRouter>
      <header className="topbar">
        <span className="brand">🦟 Dengue Dashboard</span>
        <nav>
          <NavLink to="/reports" end>Reports</NavLink>
          <NavLink to="/reports/new">Add report</NavLink>
        </nav>
      </header>
      <main className="container">
        <Routes>
          <Route path="/" element={<Navigate to="/reports" replace />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/reports/new" element={<ReportFormPage />} />
          <Route path="/reports/:id" element={<ReportDetailPage />} />
          <Route path="/reports/:id/edit" element={<ReportFormPage />} />
          <Route path="*" element={<Navigate to="/reports" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
