import SectionPlaceholderPage from "./SectionPlaceholderPage";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import FormatListBulletedOutlinedIcon from "@mui/icons-material/FormatListBulletedOutlined";
import TaskAltOutlinedIcon from "@mui/icons-material/TaskAltOutlined";
import RateReviewOutlinedIcon from "@mui/icons-material/RateReviewOutlined";
import HowToRegOutlinedIcon from "@mui/icons-material/HowToRegOutlined";
import WorkspacePremiumOutlinedIcon from "@mui/icons-material/WorkspacePremiumOutlined";
import ManageAccountsOutlinedIcon from "@mui/icons-material/ManageAccountsOutlined";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import PaletteOutlinedIcon from "@mui/icons-material/PaletteOutlined";

export function ProfilePage() {
  return (
    <SectionPlaceholderPage
      title="Mi Perfil"
      category="Principal"
      icon={PersonOutlineOutlinedIcon}
      description="Consulta y actualiza tu semblanza, institución, grado académico e información personal de contacto."
      allowedRoles={["Ponente", "Administrador", "Coordinador", "Evaluador"]}
    />
  );
}

export function MisSolicitudesPage() {
  return (
    <SectionPlaceholderPage
      title="Mis Solicitudes y Trabajos"
      category="Trabajos y Solicitudes"
      icon={DescriptionOutlinedIcon}
      description="Consulta el estado de tus ponencias enviadas, archivos adjuntos y cartas de aceptación."
      allowedRoles={["Ponente"]}
    />
  );
}

export function ListadoSolicitudesPage() {
  return (
    <SectionPlaceholderPage
      title="Listado de Solicitudes"
      category="Trabajos y Solicitudes"
      icon={FormatListBulletedOutlinedIcon}
      description="Bandeja de recepción de trabajos de investigación para asignación y control por parte del comité de coordinación."
      allowedRoles={["Coordinador"]}
    />
  );
}

export function TrabajosActivosPage() {
  return (
    <SectionPlaceholderPage
      title="Trabajos Activos"
      category="Trabajos y Solicitudes"
      icon={TaskAltOutlinedIcon}
      description="Supervisión de trabajos en proceso de revisión, dictaminados y listos para presentación."
      allowedRoles={["Coordinador"]}
    />
  );
}

export function MisEvaluacionesPage() {
  return (
    <SectionPlaceholderPage
      title="Mis Evaluaciones Asignadas"
      category="Evaluaciones"
      icon={RateReviewOutlinedIcon}
      description="Panel de revisión técnica y captura de rúbricas para las ponencias asignadas por el comité."
      allowedRoles={["Evaluador"]}
    />
  );
}

export function RegistroAsistenciaPage() {
  return (
    <SectionPlaceholderPage
      title="Registro de Asistencia"
      category="Eventos y Constancias"
      icon={HowToRegOutlinedIcon}
      description="Confirmación y pase de lista digital para las sesiones, conferencias magistrales y ponencias del congreso."
      allowedRoles={["Ponente"]}
    />
  );
}

export function MisConstanciasPage() {
  return (
    <SectionPlaceholderPage
      title="Mis Constancias"
      category="Eventos y Constancias"
      icon={WorkspacePremiumOutlinedIcon}
      description="Descarga de diplomas, constancias de participación y reconocimientos oficiales con firma digital."
      allowedRoles={["Ponente"]}
    />
  );
}

export function RolesUsuariosPage() {
  return (
    <SectionPlaceholderPage
      title="Roles y Usuarios"
      category="Configuraciones"
      icon={ManageAccountsOutlinedIcon}
      description="Administración de cuentas, asignación de roles (Administrador, Coordinador, Ponente, Evaluador) y privilegios del sistema."
      allowedRoles={["Administrador"]}
    />
  );
}

export function LimiteEvaluacionesPage() {
  return (
    <SectionPlaceholderPage
      title="Límite de Evaluaciones"
      category="Configuraciones"
      icon={TuneOutlinedIcon}
      description="Definición de cupos y límites máximos de ponencias por evaluador para el balance de carga."
      allowedRoles={["Coordinador", "Administrador"]}
    />
  );
}

export function PersonalizacionPage() {
  return (
    <SectionPlaceholderPage
      title="Personalización del Sitio"
      category="Configuraciones"
      icon={PaletteOutlinedIcon}
      description="Configuración de logotipo, colores temáticos, fechas límite de convocatorias y textos informativos del congreso."
      allowedRoles={["Coordinador", "Administrador"]}
    />
  );
}
