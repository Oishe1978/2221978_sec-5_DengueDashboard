import { BrowserRouter, NavLink, Navigate, Route, Routes } from "react-router-dom";
import CaseDetailPage from "./pages/CaseDetailPage";
import CaseFormPage from "./pages/CaseFormPage";
import CasesPage from "./pages/CasesPage";

export default function App() {
  return (
    <BrowserRouter>
      <header className="topbar">
        <span className="brand">🦟 Dengue Dashboard</span>
        <nav>
          <NavLink to="/cases">Reports</NavLink>
        </nav>
      </header>
      <main className="container">
        <Routes>
          <Route path="/" element={<Navigate to="/cases" replace />} />
          <Route path="/cases" element={<CasesPage />} />
          <Route path="/cases/new" element={<CaseFormPage />} />
          <Route path="/cases/:id" element={<CaseDetailPage />} />
          <Route path="/cases/:id/edit" element={<CaseFormPage />} />
          <Route path="*" element={<p className="muted">Page not found.</p>} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}