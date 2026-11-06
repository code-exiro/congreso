import { BrowserRouter, Route, Routes } from "react-router-dom";

import AppLayout from "../layouts/AppLayout";
import HomePage from "../../features/home/pages/HomePage";
import LoginPage from "../../features/auth/pages/LoginPage";
import ProtectedRoute from "../../features/auth/components/ProtectedRoute";
import RegisterPage from "../../features/auth/pages/RegisterPage";
import AdminLegalDocumentsPage from "../../features/legalDocuments/pages/AdminLegalDocumentsPage";
import AdminRolesPrivilegesPage from "../../features/rolesPrivileges/pages/AdminRolesPrivilegesPage";
import LandingPage from "../../features/landing/pages/LandingPage";

import EvaluatorDashboardPage from "../../features/evaluator/pages/EvaluatorDashboardPage";
import EvaluationDetailPage from "../../features/evaluator/pages/EvaluationDetailPage";
import { EVALUATOR_PATHS } from "../../features/evaluator/config";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegisterPage />} />
        <Route path="/landing" element={<LandingPage />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<HomePage />} />
          <Route
            path="configuraciones/documentos-legales"
            element={<AdminLegalDocumentsPage />}
          />
          <Route
            path="configuraciones/roles-privilegios"
            element={<AdminRolesPrivilegesPage />}
          />

          {/* Evaluador */}
          <Route
            path={EVALUATOR_PATHS.list}
            element={<EvaluatorDashboardPage />}
          />
          <Route
            path={EVALUATOR_PATHS.detail}
            element={<EvaluationDetailPage />}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}