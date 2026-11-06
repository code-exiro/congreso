import {
  BrowserRouter,
  Route,
  Routes,
} from "react-router-dom";

import HomePage from "../HomePage";

import LoginPage from "../../features/auth/pages/LoginPage";
import ProtectedRoute from "../../features/auth/components/ProtectedRoute";
import AppLayout from "../../shared/components/layout/AppLayout";

import EvaluatorDashboardPage from "../../features/evaluator/pages/EvaluatorDashboardPage";
import EvaluationDetailPage from "../../features/evaluator/pages/EvaluationDetailPage";
import { EVALUATOR_PATHS } from "../../features/evaluator/config";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />}/>

        <Route path="/" element={ <ProtectedRoute> <AppLayout /></ProtectedRoute>}>
          
        <Route index element={<HomePage />}/>

        <Route path={EVALUATOR_PATHS.list} element={<EvaluatorDashboardPage />}/>
        
        <Route path={EVALUATOR_PATHS.detail} element={<EvaluationDetailPage />}/>
        
        </Route>
      </Routes>
    </BrowserRouter>
  );
}