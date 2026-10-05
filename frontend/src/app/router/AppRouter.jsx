import {
  BrowserRouter,
  Route,
  Routes,
} from "react-router-dom";

import HomePage from "../HomePage";

import LoginPage from "../../features/auth/pages/LoginPage";
import ProtectedRoute from "../../features/auth/components/ProtectedRoute";

import AppLayout from "../../shared/components/layout/AppLayout";


export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={<LoginPage />}
        />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route
            index
            element={<HomePage />}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}