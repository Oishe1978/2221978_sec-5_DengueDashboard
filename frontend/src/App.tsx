import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import CasesPage from "./pages/CasesPage";
import CaseDetailPage from "./pages/CaseDetailPage";
import CaseFormPage from "./pages/CaseFormPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Redirect home page to patient list */}
        <Route
          path="/"
          element={<Navigate to="/cases" replace />}
        />

        {/* Read all patient reports */}
        <Route
          path="/cases"
          element={<CasesPage />}
        />

        {/* Create a new patient report */}
        <Route
          path="/cases/new"
          element={<CaseFormPage />}
        />

        {/* Read a single patient report */}
        <Route
          path="/cases/:id"
          element={<CaseDetailPage />}
        />

        {/* Update an existing patient report */}
        <Route
          path="/cases/:id/edit"
          element={<CaseFormPage />}
        />

        {/* Handle unknown routes */}
        <Route
          path="*"
          element={<Navigate to="/cases" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

