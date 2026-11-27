import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import AppLayout from "../layouts/AppLayout";
import HomePage from "../../features/home/pages/HomePage";
import LoginPage from "../../features/auth/pages/LoginPage";
import ProtectedRoute from "../../features/auth/components/ProtectedRoute";
import RegisterPage from "../../features/auth/pages/RegisterPage";
import AdminLegalDocumentsPage from "../../features/legalDocuments/pages/AdminLegalDocumentsPage";
import AdminRolesPrivilegesPage from "../../features/rolesPrivileges/pages/AdminRolesPrivilegesPage";
import LandingPage from "../../features/landing/pages/LandingPage";

import RegistrarCongresoPage from "../../features/landing/pages/registrarcongreso";


import ProfilePage from "../../features/profile/pages/ProfilePage";
import MisSolicitudesPage from "../../features/solicitudes/pages/MisSolicitudesPage";
import LimiteEvaluacionesPage from "../../features/limites/pages/LimiteEvaluacionesPage";
import FechasImportantesPage from "../../features/fechas/pages/FechasImportantesPage";
import MisConstanciasPage from "../../features/constancias/pages/MisConstanciasPage";
import AutorizacionConstanciasPage from "../../features/constancias/pages/AutorizacionConstanciasPage";
import SolicitudRolPage from "../../features/solicitudesRol/pages/SolicitudRolPage";
import BandejaSolicitudesRolPage from "../../features/solicitudesRol/pages/BandejaSolicitudesRolPage";
import MisPagosPage from "../../features/pagos/pages/MisPagosPage";
import ValidacionPagosPage from "../../features/pagos/pages/ValidacionPagosPage";
import ListadoSolicitudesPage from "../../features/solicitudes/pages/ListadoSolicitudesPage";
import CongressPage from "../../features/crear_congreso/registrarcongreso";
import {
  RegistroAsistenciaPage,
} from "../../features/common/pages/sectionPages";

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
        <Route path="/admin/nuevo-congreso" element={<RegistrarCongresoPage />} />

        <Route path="/congreso" element={<CongressPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          {/* Inicio [Admin / Coordinador / Evaluador / Ponente] */}
          <Route index element={<HomePage />} />

          {/* Mi Perfil [Ponente / Admin / Coordinador / Evaluador] */}
          <Route path="perfil" element={<ProfilePage />} />

          {/* Trabajos y Solicitudes */}
          <Route path="trabajos/mis-solicitudes" element={<MisSolicitudesPage />} />
          <Route path="trabajos/solicitudes" element={<ListadoSolicitudesPage />} />
          <Route path="trabajos/activos" element={<ListadoSolicitudesPage soloActivos />} />

          {/* Evaluaciones (Módulo del Evaluador) */}
          <Route
            path={EVALUATOR_PATHS.list}
            element={<EvaluatorDashboardPage />}
          />
          <Route
            path={EVALUATOR_PATHS.detail}
            element={<EvaluationDetailPage />}
          />

          {/* Pagos */}
          <Route path="pagos/mis-pagos" element={<MisPagosPage />} />
          <Route path="pagos/validacion" element={<ValidacionPagosPage />} />

          {/* Eventos y Constancias */}
          <Route path="eventos/asistencia" element={<RegistroAsistenciaPage />} />
          <Route path="eventos/constancias" element={<MisConstanciasPage />} />
          <Route path="eventos/autorizacion-constancias" element={<AutorizacionConstanciasPage />} />
          <Route path="configuraciones/crear-congreso" element={<Navigate to="/admin/nuevo-congreso" replace />} />
          <Route path="configuraciones/solicitud-rol" element={<SolicitudRolPage />} />
          <Route path="configuraciones/solicitudes-roles" element={<BandejaSolicitudesRolPage />} />

          {/* Configuraciones */}
          <Route path="configuraciones/limite-evaluaciones" element={<LimiteEvaluacionesPage />} />
          <Route path="configuraciones/fechas-importantes" element={<FechasImportantesPage />} />
          <Route path="configuraciones/documentos-legales" element={<AdminLegalDocumentsPage />} />
          <Route path="configuraciones/roles-privilegios" element={<AdminRolesPrivilegesPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}