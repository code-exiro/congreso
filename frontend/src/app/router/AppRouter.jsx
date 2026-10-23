import { BrowserRouter, Route, Routes } from "react-router-dom";

import AppLayout from "../layouts/AppLayout";
import HomePage from "../../features/home/pages/HomePage";
import LoginPage from "../../features/auth/pages/LoginPage";
import ProtectedRoute from "../../features/auth/components/ProtectedRoute";
import RegisterPage from "../../features/auth/pages/RegisterPage";
import AdminLegalDocumentsPage from "../../features/legalDocuments/pages/AdminLegalDocumentsPage";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegisterPage />} />

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
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
