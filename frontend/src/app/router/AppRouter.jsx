import { BrowserRouter, Route, Routes } from "react-router-dom";

import AppLayout from "../layouts/AppLayout";
import HomePage from "../../features/home/pages/HomePage";
import LoginPage from "../../features/auth/pages/LoginPage";
import ProtectedRoute from "../../features/auth/components/ProtectedRoute";
import RegisterPage from "../../features/auth/pages/RegisterPage";
import AdminLegalDocumentsPage from "../../features/legalDocuments/pages/AdminLegalDocumentsPage";
<<<<<<< HEAD
import {
  ProfilePage,
  MisSolicitudesPage,
  ListadoSolicitudesPage,
  TrabajosActivosPage,
  MisEvaluacionesPage,
  RegistroAsistenciaPage,
  MisConstanciasPage,
  RolesUsuariosPage,
  LimiteEvaluacionesPage,
  PersonalizacionPage,
} from "../../features/common/pages/sectionPages";
=======
import AdminRolesPrivilegesPage from "../../features/rolesPrivileges/pages/AdminRolesPrivilegesPage";
import LandingPage from "../../features/landing/pages/LandingPage"

>>>>>>> 1ff2a4bd260c0e69ca1b3ed9ed7b8a8c9b999b50

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
          {/* Inicio [Admin / Coordinador / Evaluador / Ponente] */}
          <Route index element={<HomePage />} />
<<<<<<< HEAD

          {/* Mi Perfil [Ponente / Admin / Coordinador / Evaluador] */}
          <Route path="perfil" element={<ProfilePage />} />

          {/* Trabajos y Solicitudes */}
          <Route path="trabajos/mis-solicitudes" element={<MisSolicitudesPage />} />
          <Route path="trabajos/solicitudes" element={<ListadoSolicitudesPage />} />
          <Route path="trabajos/activos" element={<TrabajosActivosPage />} />

          {/* Evaluaciones */}
          <Route path="evaluaciones/asignadas" element={<MisEvaluacionesPage />} />

          {/* Eventos y Constancias */}
          <Route path="eventos/asistencia" element={<RegistroAsistenciaPage />} />
          <Route path="eventos/constancias" element={<MisConstanciasPage />} />

          {/* Configuraciones */}
          <Route path="configuraciones/roles-usuarios" element={<RolesUsuariosPage />} />
          <Route path="configuraciones/limite-evaluaciones" element={<LimiteEvaluacionesPage />} />
          <Route path="configuraciones/documentos-legales" element={<AdminLegalDocumentsPage />} />
          <Route path="configuraciones/personalizacion" element={<PersonalizacionPage />} />
=======
          <Route
            path="configuraciones/documentos-legales"
            element={<AdminLegalDocumentsPage />}
          />
          <Route
            path="configuraciones/roles-privilegios"
            element={<AdminRolesPrivilegesPage />}
          />
>>>>>>> 1ff2a4bd260c0e69ca1b3ed9ed7b8a8c9b999b50
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
