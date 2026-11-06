import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import SupervisorAccountRoundedIcon from "@mui/icons-material/SupervisorAccountRounded";
import RateReviewRoundedIcon from "@mui/icons-material/RateReviewRounded";
import RecordVoiceOverRoundedIcon from "@mui/icons-material/RecordVoiceOverRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";

export const ROLE_CONFIG = {
  administrador: {
    label: "Administrador",
    icon: AdminPanelSettingsRoundedIcon,
    color: "#e7c77d",
    borderColor: "rgba(231, 199, 125, 0.45)",
    bgColor: "rgba(231, 199, 125, 0.12)",
  },
  admin: {
    label: "Administrador",
    icon: AdminPanelSettingsRoundedIcon,
    color: "#e7c77d",
    borderColor: "rgba(231, 199, 125, 0.45)",
    bgColor: "rgba(231, 199, 125, 0.12)",
  },
  coordinador: {
    label: "Coordinador",
    icon: SupervisorAccountRoundedIcon,
    color: "#38bdf8",
    borderColor: "rgba(56, 189, 248, 0.45)",
    bgColor: "rgba(56, 189, 248, 0.12)",
  },
  evaluador: {
    label: "Evaluador",
    icon: RateReviewRoundedIcon,
    color: "#c084fc",
    borderColor: "rgba(192, 132, 252, 0.45)",
    bgColor: "rgba(192, 132, 252, 0.12)",
  },
  ponente: {
    label: "Ponente",
    icon: RecordVoiceOverRoundedIcon,
    color: "#34d399",
    borderColor: "rgba(52, 211, 153, 0.45)",
    bgColor: "rgba(52, 211, 153, 0.12)",
  },
  "admin pagos": {
    label: "Admin Pagos",
    icon: PaymentsRoundedIcon,
    color: "#f59e0b",
    borderColor: "rgba(245, 158, 11, 0.45)",
    bgColor: "rgba(245, 158, 11, 0.12)",
  },
};

export function getRoleMeta(roleName) {
  const key = String(roleName || "").trim().toLowerCase();
  return (
    ROLE_CONFIG[key] || {
      label: roleName,
      icon: ShieldOutlinedIcon,
      color: "#e7c77d",
      borderColor: "rgba(231, 199, 125, 0.32)",
      bgColor: "rgba(255, 255, 255, 0.06)",
    }
  );
}
