import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ManageAccountsOutlinedIcon from "@mui/icons-material/ManageAccountsOutlined";
import PeopleOutlineRoundedIcon from "@mui/icons-material/PeopleOutlineRounded";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";

import { useAuth } from "../../auth/context/AuthContext";
import {
  createAdminRole,
  listAdminPrivileges,
  listAdminRoles,
  listAdminUsers,
  updateAdminRole,
  updateAdminUserRoles,
} from "../api/rolesPrivilegesApi";

const goldButtonSx = {
  py: 1.1,
  px: 2.2,
  bgcolor: "#e7c77d",
  color: "#102138",
  borderRadius: "10px",
  fontWeight: 800,
  textTransform: "none",
  boxShadow: "none",
  "&:hover": { bgcolor: "#f2d99c", boxShadow: "none" },
  "&.Mui-disabled": { bgcolor: "#8e866f", color: "#152033" },
};

const outlineGoldButtonSx = {
  py: 1.05,
  px: 2,
  borderRadius: "10px",
  fontWeight: 700,
  textTransform: "none",
  color: "#e7c77d",
  borderColor: "rgba(231, 199, 125, 0.42)",
  bgcolor: "rgba(231, 199, 125, 0.04)",
  "&:hover": {
    borderColor: "#e7c77d",
    bgcolor: "rgba(231, 199, 125, 0.14)",
    color: "#f2d99c",
  },
  "&.Mui-disabled": {
    borderColor: "rgba(255, 255, 255, 0.12)",
    color: "rgba(214, 222, 235, 0.4)",
  },
};

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    color: "#102138",
    backgroundColor: "#f6f8fc",
    borderRadius: "8px",
    "& fieldset": { borderColor: "transparent" },
    "&:hover fieldset": { borderColor: "#c7a65b" },
    "&.Mui-focused fieldset": { borderColor: "#e7c77d", borderWidth: 2 },
    "&.Mui-disabled": { backgroundColor: "#dce2eb" },
  },
  "& .MuiInputBase-input": {
    py: 1.35,
    fontSize: "0.92rem",
    "&::placeholder": { color: "#526176", opacity: 1 },
  },
};

const PONENTE_ROLE_PRIVILEGES = new Set([
  "subir_trabajo",
  "ver_sus_trabajos",
  "ver_su_historial",
  "solicitud_pago",
  "ver_sus_constancias",
]);

const EVALUADOR_ROLE_PRIVILEGES = new Set([
  "evaluar_trabajo",
  "ver_sus_evaluaciones",
]);

const ADMIN_PAGOS_ROLE_PRIVILEGES = new Set([
  "admin_pagos",
]);

const COORDINADOR_ADMIN_PRIVILEGES = new Set([
  "evaluar_general",
  "asignar_evaluador",
  "modificar_privilegios",
  "ver_reportes",
  "crear_congreso",
  "modificar_fechas",
  "diseño_pagina",
]);

const ACCESO_PERFIL_PRIVILEGES = new Set([
  "inicio_sesion",
  "modificar_perfil",
]);

// Identifica privilegios de solo lectura / consulta / descarga para el modo Becario
function isReadOnlyPrivilegeCode(code = "") {
  return (
    code === "inicio_sesion" ||
    code.startsWith("ver_") ||
    code.endsWith(".ver") ||
    code.includes(".ver_") ||
    code.includes(".descargar")
  );
}

function categoryOfPrivilege(code = "") {
  if (ACCESO_PERFIL_PRIVILEGES.has(code)) {
    return "General · Acceso y Perfil de Usuario";
  }
  if (PONENTE_ROLE_PRIVILEGES.has(code)) {
    return "Ponente · Trabajos, Historial, Pagos y Constancias";
  }
  if (EVALUADOR_ROLE_PRIVILEGES.has(code)) {
    return "Evaluador · Evaluación de Trabajos";
  }
  if (ADMIN_PAGOS_ROLE_PRIVILEGES.has(code)) {
    return "Admin pagos · Validación y Administración de Pagos";
  }
  if (COORDINADOR_ADMIN_PRIVILEGES.has(code)) {
    return "Coordinación y Administración del Congreso";
  }
  if (code.startsWith("documentos_legales.")) {
    return "Administración · Documentos Legales";
  }
  return "Otros privilegios del sistema";
}

function groupPrivilegesByCategory(privileges) {
  const groups = {};
  for (const priv of privileges) {
    const label = categoryOfPrivilege(priv.code);
    if (!groups[label]) groups[label] = [];
    groups[label].push(priv);
  }
  return Object.entries(groups);
}

function responseError(error) {
  const data = error?.response?.data;
  if (error?.response?.status === 401) {
    return "Tu sesión venció. Inicia sesión nuevamente para continuar.";
  }
  if (error?.response?.status === 403) {
    return "No tienes el privilegio necesario para realizar esta acción.";
  }
  if (!data) return "No fue posible conectar con el servidor.";

  function textOf(value) {
    if (Array.isArray(value)) return value.map(textOf).filter(Boolean).join(" ");
    if (value && typeof value === "object") {
      return Object.entries(value)
        .map(
          ([key, item]) =>
            (key === "non_field_errors" || key === "detail" ? "" : `${key}: `) +
            textOf(item),
        )
        .join(" ");
    }
    return String(value ?? "");
  }
  return textOf(data) || "No se pudo completar la operación.";
}

function fullNameOf(u) {
  const full = [u?.first_name, u?.last_name, u?.maternal_last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  return full || "Sin nombre registrado";
}

function UserRolesDialog({
  open,
  targetUser,
  currentUserId,
  roles,
  allPrivileges,
  busy,
  error,
  onClose,
  onSave,
}) {
  const [selectedRoleIds, setSelectedRoleIds] = useState([]);
  const [revokedPrivIds, setRevokedPrivIds] = useState([]);
  const [grantedPrivIds, setGrantedPrivIds] = useState([]);
  const [showAllCatalog, setShowAllCatalog] = useState(false);

  const isEditingSelf = Boolean(targetUser && currentUserId && targetUser.id === currentUserId);
  const initialRoleIds = useMemo(
    () => (Array.isArray(targetUser?.role_ids) ? targetUser.role_ids : []),
    [targetUser],
  );
  const initialGrantedPrivIds = useMemo(
    () =>
      Array.isArray(targetUser?.granted_privilege_ids)
        ? targetUser.granted_privilege_ids
        : [],
    [targetUser],
  );

  useEffect(() => {
    if (!open || !targetUser) return;
    setSelectedRoleIds(Array.isArray(targetUser.role_ids) ? targetUser.role_ids : []);
    setRevokedPrivIds(
      Array.isArray(targetUser.revoked_privilege_ids)
        ? targetUser.revoked_privilege_ids
        : [],
    );
    setGrantedPrivIds(
      Array.isArray(targetUser.granted_privilege_ids)
        ? targetUser.granted_privilege_ids
        : [],
    );
    setShowAllCatalog(false);
  }, [open, targetUser]);

  // Rol 'administrador' y sus privilegios base (protegidos cuando el admin se edita a sí mismo)
  const adminRole = useMemo(
    () =>
      roles.find(
        (r) => String(r.name || "").trim().toLowerCase() === "administrador",
      ) || null,
    [roles],
  );
  const adminRolePrivIds = useMemo(
    () => new Set((adminRole?.privileges || []).map((p) => p.id)),
    [adminRole],
  );

  // Privilegios que otorgan por defecto los roles seleccionados activos
  const roleDefaultPrivIds = useMemo(() => {
    const selectedSet = new Set(selectedRoleIds);
    const ids = new Set();
    for (const role of roles) {
      if (role.is_active && selectedSet.has(role.id)) {
        for (const priv of role.privileges || []) {
          ids.add(priv.id);
        }
      }
    }
    return ids;
  }, [roles, selectedRoleIds]);

  // El administrador jamás puede quitarse el rol de administrador, pero sí cualquier otro rol diferente
  const isRoleLockedForSelf = useCallback(
    (roleId) =>
      Boolean(
        isEditingSelf &&
          adminRole &&
          roleId === adminRole.id &&
          (initialRoleIds.includes(roleId) || selectedRoleIds.includes(roleId)),
      ),
    [isEditingSelf, adminRole, initialRoleIds, selectedRoleIds],
  );

  const toggleRole = (roleId) => {
    if (isRoleLockedForSelf(roleId)) return;
    setSelectedRoleIds((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId],
    );
  };

  // Determina si un privilegio está efectivamente habilitado para este usuario
  const isPrivilegeEnabled = useCallback(
    (privId) => {
      if (revokedPrivIds.includes(privId)) return false;
      if (grantedPrivIds.includes(privId)) return true;
      return roleDefaultPrivIds.has(privId);
    },
    [revokedPrivIds, grantedPrivIds, roleDefaultPrivIds],
  );

  // El administrador no puede deshabilitarse los privilegios base de su rol administrador, pero sí quitarse privilegios extra o de otros roles
  const isPrivilegeLockedForSelf = useCallback(
    (privId) => Boolean(isEditingSelf && adminRolePrivIds.has(privId)),
    [isEditingSelf, adminRolePrivIds],
  );

  // Permite habilitar o deshabilitar un privilegio específico para este usuario
  const toggleUserPrivilege = (privId) => {
    const currentlyEnabled = isPrivilegeEnabled(privId);
    const comesFromRole = roleDefaultPrivIds.has(privId);

    if (currentlyEnabled && isPrivilegeLockedForSelf(privId)) {
      return;
    }

    if (currentlyEnabled) {
      // El usuario lo tenía activo -> queremos deshabilitarlo
      setGrantedPrivIds((prev) => prev.filter((id) => id !== privId));
      if (comesFromRole) {
        setRevokedPrivIds((prev) =>
          prev.includes(privId) ? prev : [...prev, privId],
        );
      }
    } else {
      // El usuario lo tenía desactivado -> queremos habilitarlo
      setRevokedPrivIds((prev) => prev.filter((id) => id !== privId));
      if (!comesFromRole) {
        setGrantedPrivIds((prev) =>
          prev.includes(privId) ? prev : [...prev, privId],
        );
      }
    }
  };

  // Atajo para modo Becario / Solo lectura: deja activos solo los privilegios de consulta/descarga de sus roles
  const applyReadOnlyMode = () => {
    const toRevoke = [];
    for (const priv of allPrivileges) {
      if (roleDefaultPrivIds.has(priv.id) && !isReadOnlyPrivilegeCode(priv.code)) {
        toRevoke.push(priv.id);
      }
    }
    setGrantedPrivIds([]);
    setRevokedPrivIds(toRevoke);
  };

  // Restaura exactamente los privilegios por defecto de los roles seleccionados
  const resetToRoleDefaults = () => {
    setRevokedPrivIds([]);
    setGrantedPrivIds([]);
  };

  // Lista de privilegios que se muestran en la sección de personalización
  const displayedPrivileges = useMemo(() => {
    if (showAllCatalog) return allPrivileges;
    return allPrivileges.filter(
      (p) =>
        roleDefaultPrivIds.has(p.id) ||
        revokedPrivIds.includes(p.id) ||
        grantedPrivIds.includes(p.id),
    );
  }, [
    showAllCatalog,
    allPrivileges,
    roleDefaultPrivIds,
    revokedPrivIds,
    grantedPrivIds,
  ]);

  const groupedDisplayedPrivileges = useMemo(
    () => groupPrivilegesByCategory(displayedPrivileges),
    [displayedPrivileges],
  );

  const effectiveCount = useMemo(
    () => allPrivileges.filter((p) => isPrivilegeEnabled(p.id)).length,
    [allPrivileges, isPrivilegeEnabled],
  );

  const handleSubmit = (event) => {
    event.preventDefault();
    // Limpiar revocados que ya no pertenezcan a los roles seleccionados
    const cleanRevoked = revokedPrivIds.filter((id) => roleDefaultPrivIds.has(id));
    const cleanGranted = grantedPrivIds.filter((id) => !roleDefaultPrivIds.has(id));
    onSave({
      role_ids: selectedRoleIds,
      revoked_privilege_ids: cleanRevoked,
      granted_privilege_ids: cleanGranted,
    });
  };

  if (!targetUser) return null;

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      fullWidth
      maxWidth="md"
      slotProps={{
        paper: {
          sx: {
            bgcolor: "#0d1c2d",
            color: "#ffffff",
            backgroundImage: "none",
            border: "1px solid rgba(255, 255, 255, 0.16)",
            borderRadius: "20px",
            boxShadow: "0 24px 70px rgba(0, 0, 0, 0.45)",
          },
        },
      }}
    >
      <Box component="form" onSubmit={handleSubmit}>
        <DialogTitle
          sx={{
            pt: 3,
            px: 3.5,
            fontWeight: 800,
            fontSize: "1.35rem",
            letterSpacing: "-0.02em",
            color: "#ffffff",
          }}
        >
          Modificar roles y privilegios del usuario
          <Typography sx={{ mt: 0.5, color: "#e7c77d", fontSize: "0.88rem", fontWeight: 600 }}>
            {fullNameOf(targetUser)} · {targetUser.email}
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ px: 3.5 }}>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {error && (
              <Alert severity="error" sx={{ borderRadius: "12px" }}>
                {error}
              </Alert>
            )}

            {isEditingSelf && (
              <Alert
                severity="info"
                sx={{
                  borderRadius: "12px",
                  bgcolor: "rgba(231, 199, 125, 0.12)",
                  color: "#f2d99c",
                  border: "1px solid rgba(231, 199, 125, 0.35)",
                  "& .MuiAlert-icon": { color: "#e7c77d" },
                }}
              >
                Por seguridad, tu rol de <strong>administrador</strong> y sus privilegios base están protegidos y no pueden quitarse jamás. Si te asignas cualquier otro rol adicional o privilegios extra, sí puedes agregártelos y quitártelos libremente.
              </Alert>
            )}

            {/* PASO 1: Roles del usuario */}
            <Box>
              <Typography
                sx={{
                  color: "#e7c77d",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  mb: 1.5,
                }}
              >
                1. Roles asignados a esta cuenta
              </Typography>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
                  gap: 1.5,
                }}
              >
                {roles.map((role) => {
                  const checked = selectedRoleIds.includes(role.id);
                  const lockedRole = isRoleLockedForSelf(role.id);
                  return (
                    <Paper
                      key={role.id}
                      elevation={0}
                      onClick={() => !busy && !lockedRole && toggleRole(role.id)}
                      sx={{
                        p: 2,
                        cursor: busy || lockedRole ? "default" : "pointer",
                        borderRadius: "14px",
                        bgcolor: checked
                          ? "rgba(231, 199, 125, 0.12)"
                          : "rgba(255, 255, 255, 0.04)",
                        border: checked
                          ? "1px solid rgba(231, 199, 125, 0.55)"
                          : "1px solid rgba(255, 255, 255, 0.10)",
                        transition: "all 0.18s ease",
                        "&:hover": {
                          borderColor: "rgba(231, 199, 125, 0.45)",
                        },
                      }}
                    >
                      <Stack direction="row" spacing={1.2} alignItems="flex-start">
                        <Checkbox
                          checked={checked}
                          disabled={busy || lockedRole}
                          onChange={() => toggleRole(role.id)}
                          onClick={(e) => e.stopPropagation()}
                          sx={{
                            p: 0.25,
                            color: "#94a3b8",
                            "&.Mui-checked": { color: "#e7c77d" },
                          }}
                        />
                        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                            <Typography
                              sx={{
                                fontWeight: 750,
                                fontSize: "0.95rem",
                                color: checked ? "#e7c77d" : "#ffffff",
                              }}
                            >
                              {role.name}
                            </Typography>
                            {lockedRole && (
                              <Chip
                                size="small"
                                label="Protegido (Tu rol)"
                                sx={{
                                  height: 20,
                                  fontSize: "0.68rem",
                                  fontWeight: 700,
                                  bgcolor: "rgba(231, 199, 125, 0.20)",
                                  color: "#f2d99c",
                                }}
                              />
                            )}
                            {!role.is_active && (
                              <Chip
                                size="small"
                                label="Inactivo"
                                sx={{
                                  height: 20,
                                  fontSize: "0.68rem",
                                  bgcolor: "rgba(248, 113, 113, 0.15)",
                                  color: "#f87171",
                                }}
                              />
                            )}
                          </Stack>
                          <Typography
                            sx={{
                              mt: 0.5,
                              fontSize: "0.78rem",
                              color: "#d6deeb",
                              lineHeight: 1.45,
                            }}
                          >
                            {role.description || "Sin descripción."}
                          </Typography>
                        </Box>
                      </Stack>
                    </Paper>
                  );
                })}
              </Box>
            </Box>

            <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.10)" }} />

            {/* PASO 2: Personalización de privilegios individuales */}
            <Box>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", sm: "center" }}
                spacing={1}
                sx={{ mb: 1.2 }}
              >
                <Box>
                  <Typography
                    sx={{
                      color: "#e7c77d",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                    }}
                  >
                    2. Privilegios específicos de este usuario ({effectiveCount} activos)
                  </Typography>
                  <Typography sx={{ fontSize: "0.78rem", color: "#94a3b8", mt: 0.3 }}>
                    {isEditingSelf
                      ? "Los privilegios base del rol administrador están protegidos; los privilegios extra o de otros roles sí pueden quitarse."
                      : "Desmarca cualquier privilegio para restringirlo únicamente a este usuario, o usa el modo solo lectura."}
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {!isEditingSelf && roleDefaultPrivIds.size > 0 && (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={applyReadOnlyMode}
                      disabled={busy}
                      sx={{
                        fontSize: "0.74rem",
                        textTransform: "none",
                        borderRadius: "8px",
                        color: "#38bdf8",
                        borderColor: "rgba(56, 189, 248, 0.4)",
                        "&:hover": {
                          borderColor: "#38bdf8",
                          bgcolor: "rgba(56, 189, 248, 0.12)",
                        },
                      }}
                    >
                      Modo de solo lectura
                    </Button>
                  )}

                  {(revokedPrivIds.length > 0 || grantedPrivIds.length > 0) && (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={resetToRoleDefaults}
                      disabled={busy}
                      sx={{
                        fontSize: "0.74rem",
                        textTransform: "none",
                        borderRadius: "8px",
                        color: "#e7c77d",
                        borderColor: "rgba(231, 199, 125, 0.4)",
                      }}
                    >
                      Restaurar por defecto del rol
                    </Button>
                  )}

                  <Button
                    size="small"
                    onClick={() => setShowAllCatalog((v) => !v)}
                    disabled={busy}
                    sx={{
                      fontSize: "0.74rem",
                      textTransform: "none",
                      color: "#d6deeb",
                      "&:hover": { color: "#e7c77d" },
                    }}
                  >
                    {showAllCatalog
                      ? "Ver solo privilegios de sus roles"
                      : "Ver todos los privilegios del sistema"}
                  </Button>
                </Stack>
              </Stack>

              {groupedDisplayedPrivileges.length === 0 ? (
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.5,
                    borderRadius: "12px",
                    bgcolor: "rgba(7, 18, 33, 0.65)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    textAlign: "center",
                  }}
                >
                  <Typography sx={{ color: "#94a3b8", fontSize: "0.85rem" }}>
                    Selecciona al menos un rol arriba o pulsa “Ver todos los privilegios del sistema” para asignar permisos individuales.
                  </Typography>
                </Paper>
              ) : (
                <Stack
                  spacing={1.5}
                  sx={{
                    maxHeight: 280,
                    overflowY: "auto",
                    pr: 0.5,
                  }}
                >
                  {groupedDisplayedPrivileges.map(([categoryLabel, items]) => (
                    <Paper
                      key={categoryLabel}
                      elevation={0}
                      sx={{
                        p: 1.75,
                        borderRadius: "14px",
                        bgcolor: "rgba(7, 18, 33, 0.65)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "0.78rem",
                          fontWeight: 750,
                          color: "#e7c77d",
                          mb: 1,
                        }}
                      >
                        {categoryLabel}
                      </Typography>

                      <Stack spacing={0.8}>
                        {items.map((priv) => {
                          const enabled = isPrivilegeEnabled(priv.id);
                          const fromRole = roleDefaultPrivIds.has(priv.id);
                          const isRevoked = fromRole && !enabled;
                          const isExtra = !fromRole && enabled;
                          const lockedPriv = enabled && isPrivilegeLockedForSelf(priv.id);

                          return (
                            <Box
                              key={priv.id}
                              onClick={() => !busy && !lockedPriv && toggleUserPrivilege(priv.id)}
                              sx={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: 1,
                                p: 1,
                                borderRadius: "10px",
                                cursor: busy || lockedPriv ? "default" : "pointer",
                                bgcolor: isRevoked
                                  ? "rgba(248, 113, 113, 0.08)"
                                  : enabled
                                    ? "rgba(231, 199, 125, 0.10)"
                                    : "transparent",
                                border: isRevoked
                                  ? "1px solid rgba(248, 113, 113, 0.25)"
                                  : isExtra
                                    ? "1px solid rgba(56, 189, 248, 0.35)"
                                    : "1px solid transparent",
                                "&:hover": {
                                  bgcolor: "rgba(255, 255, 255, 0.05)",
                                },
                              }}
                            >
                              <Checkbox
                                checked={enabled}
                                disabled={busy || lockedPriv}
                                onChange={() => toggleUserPrivilege(priv.id)}
                                onClick={(e) => e.stopPropagation()}
                                sx={{
                                  p: 0.25,
                                  color: "#94a3b8",
                                  "&.Mui-checked": { color: "#e7c77d" },
                                }}
                              />

                              <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                                <Stack
                                  direction={{ xs: "column", sm: "row" }}
                                  justifyContent="space-between"
                                  alignItems={{ xs: "flex-start", sm: "center" }}
                                  spacing={0.8}
                                >
                                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                    <Typography
                                      sx={{
                                        fontSize: "0.86rem",
                                        fontWeight: 700,
                                        color: enabled ? "#ffffff" : "#94a3b8",
                                        textDecoration: isRevoked ? "line-through" : "none",
                                      }}
                                    >
                                      {priv.name}
                                    </Typography>

                                    {lockedPriv && (
                                      <Chip
                                        size="small"
                                        label="Protegido"
                                        sx={{
                                          height: 20,
                                          fontSize: "0.68rem",
                                          fontWeight: 700,
                                          bgcolor: "rgba(231, 199, 125, 0.18)",
                                          color: "#f2d99c",
                                        }}
                                      />
                                    )}

                                    {isRevoked && (
                                      <Chip
                                        size="small"
                                        label="Deshabilitado para este usuario"
                                        sx={{
                                          height: 20,
                                          fontSize: "0.68rem",
                                          fontWeight: 700,
                                          bgcolor: "rgba(248, 113, 113, 0.16)",
                                          color: "#f87171",
                                        }}
                                      />
                                    )}

                                    {isExtra && (
                                      <Chip
                                        size="small"
                                        label="Habilitado extra"
                                        sx={{
                                          height: 20,
                                          fontSize: "0.68rem",
                                          fontWeight: 700,
                                          bgcolor: "rgba(56, 189, 248, 0.16)",
                                          color: "#38bdf8",
                                        }}
                                      />
                                    )}
                                  </Stack>

                                  {priv.code !== priv.name && (
                                    <Typography
                                      sx={{
                                        fontFamily: "var(--mono)",
                                        fontSize: "0.71rem",
                                        color: "#e7c77d",
                                        flexShrink: 0,
                                      }}
                                    >
                                      {priv.code}
                                    </Typography>
                                  )}
                                </Stack>

                                {priv.description && (
                                  <Typography
                                    sx={{
                                      fontSize: "0.76rem",
                                      color: "#94a3b8",
                                      mt: 0.25,
                                      lineHeight: 1.35,
                                    }}
                                  >
                                    {priv.description}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          );
                        })}
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3.5, pb: 3, pt: 2 }}>
          <Button
            onClick={onClose}
            disabled={busy}
            sx={{ color: "#d6deeb", textTransform: "none", fontWeight: 600 }}
          >
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={busy} sx={goldButtonSx}>
            {busy ? "Guardando…" : "Guardar cambios del usuario"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

function RoleFormDialog({
  open,
  editingRole,
  isCurrentUsersRole,
  allPrivileges,
  busy,
  error,
  onClose,
  onSave,
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [selectedPrivIds, setSelectedPrivIds] = useState([]);

  const initialRolePrivIds = useMemo(
    () => (editingRole?.privileges || []).map((p) => p.id),
    [editingRole],
  );

  useEffect(() => {
    if (!open) return;
    if (editingRole) {
      setName(editingRole.name || "");
      setDescription(editingRole.description || "");
      setIsActive(Boolean(editingRole.is_active));
      setSelectedPrivIds((editingRole.privileges || []).map((p) => p.id));
    } else {
      setName("");
      setDescription("");
      setIsActive(true);
      setSelectedPrivIds([]);
    }
  }, [open, editingRole]);

  const groupedPrivileges = useMemo(
    () => groupPrivilegesByCategory(allPrivileges),
    [allPrivileges],
  );

  const isPrivLockedOnOwnRole = useCallback(
    (privId) => Boolean(isCurrentUsersRole && initialRolePrivIds.includes(privId)),
    [isCurrentUsersRole, initialRolePrivIds],
  );

  const togglePriv = (privId) => {
    if (isPrivLockedOnOwnRole(privId) && selectedPrivIds.includes(privId)) {
      return;
    }
    setSelectedPrivIds((prev) =>
      prev.includes(privId)
        ? prev.filter((id) => id !== privId)
        : [...prev, privId],
    );
  };

  const toggleGroup = (groupItems) => {
    const ids = groupItems.map((p) => p.id);
    const allSelected = ids.every((id) => selectedPrivIds.includes(id));
    if (allSelected) {
      const unlockedIds = ids.filter((id) => !isPrivLockedOnOwnRole(id));
      setSelectedPrivIds((prev) => prev.filter((id) => !unlockedIds.includes(id)));
    } else {
      setSelectedPrivIds((prev) => Array.from(new Set([...prev, ...ids])));
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim().toLowerCase(),
      description: description.trim().toLowerCase(),
      is_active: isCurrentUsersRole ? true : isActive,
      privilege_ids: selectedPrivIds,
    });
  };

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      fullWidth
      maxWidth="md"
      slotProps={{
        paper: {
          sx: {
            bgcolor: "#0d1c2d",
            color: "#ffffff",
            backgroundImage: "none",
            border: "1px solid rgba(255, 255, 255, 0.16)",
            borderRadius: "20px",
            boxShadow: "0 24px 70px rgba(0, 0, 0, 0.45)",
          },
        },
      }}
    >
      <Box component="form" onSubmit={handleSubmit}>
        <DialogTitle
          sx={{
            pt: 3,
            px: 3.5,
            fontWeight: 800,
            fontSize: "1.35rem",
            letterSpacing: "-0.02em",
            color: "#ffffff",
          }}
        >
          {editingRole ? `Configurar rol: ${editingRole.name}` : "Crear nuevo rol"}
        </DialogTitle>

        <DialogContent sx={{ px: 3.5 }}>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {error && (
              <Alert severity="error" sx={{ borderRadius: "12px" }}>
                {error}
              </Alert>
            )}

            {isCurrentUsersRole && (
              <Alert
                severity="info"
                sx={{
                  borderRadius: "12px",
                  bgcolor: "rgba(231, 199, 125, 0.12)",
                  color: "#f2d99c",
                  border: "1px solid rgba(231, 199, 125, 0.35)",
                  "& .MuiAlert-icon": { color: "#e7c77d" },
                }}
              >
                Este rol está asignado a tu propia cuenta de administrador. Por seguridad no puedes desactivar el rol ni desmarcar tus privilegios actuales.
              </Alert>
            )}

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "2fr 1fr" },
                gap: 2,
                alignItems: "center",
              }}
            >
              <Box>
                <Typography
                  component="label"
                  htmlFor="role-name-input"
                  sx={{ display: "block", mb: 0.8, fontSize: "0.85rem", fontWeight: 600, color: "#d6deeb" }}
                >
                  Nombre del rol *
                </Typography>
                <TextField
                  id="role-name-input"
                  required
                  fullWidth
                  placeholder="Ej. coordinador, evaluador..."
                  value={name}
                  onChange={(e) => setName(e.target.value.toLowerCase())}
                  disabled={busy}
                  inputProps={{ maxLength: 100 }}
                  sx={fieldSx}
                />
              </Box>

              <Box sx={{ pt: { xs: 0, sm: 2.5 } }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      disabled={busy || isCurrentUsersRole}
                      sx={{
                        "& .MuiSwitch-switchBase.Mui-checked": { color: "#e7c77d" },
                        "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                          backgroundColor: "#e7c77d",
                        },
                      }}
                    />
                  }
                  label={
                    <Typography sx={{ fontSize: "0.9rem", fontWeight: 600, color: "#ffffff" }}>
                      {isActive ? "Rol activo" : "Rol inactivo"}
                    </Typography>
                  }
                />
              </Box>
            </Box>

            <Box>
              <Typography
                component="label"
                htmlFor="role-desc-input"
                sx={{ display: "block", mb: 0.8, fontSize: "0.85rem", fontWeight: 600, color: "#d6deeb" }}
              >
                Descripción de responsabilidades
              </Typography>
              <TextField
                id="role-desc-input"
                fullWidth
                multiline
                minRows={2}
                placeholder="Describe las funciones de este rol dentro del congreso"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={busy}
                sx={fieldSx}
              />
            </Box>

            <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.10)" }} />

            <Box>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 1.5 }}
              >
                <Typography
                  sx={{
                    color: "#e7c77d",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                  }}
                >
                  Privilegios asignados al rol ({selectedPrivIds.length} de {allPrivileges.length})
                </Typography>
              </Stack>

              <Stack
                spacing={2}
                sx={{
                  maxHeight: 340,
                  overflowY: "auto",
                  pr: 0.5,
                }}
              >
                {groupedPrivileges.map(([categoryLabel, items]) => {
                  const allChecked = items.every((p) => selectedPrivIds.includes(p.id));
                  const allLocked = items.every((p) => isPrivLockedOnOwnRole(p.id) && selectedPrivIds.includes(p.id));
                  return (
                    <Paper
                      key={categoryLabel}
                      elevation={0}
                      sx={{
                        p: 2,
                        borderRadius: "14px",
                        bgcolor: "rgba(7, 18, 33, 0.65)",
                        border: "1px solid rgba(255, 255, 255, 0.10)",
                      }}
                    >
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        sx={{ mb: 1 }}
                      >
                        <Typography
                          sx={{
                            fontSize: "0.82rem",
                            fontWeight: 750,
                            color: "#e7c77d",
                            letterSpacing: "0.04em",
                          }}
                        >
                          {categoryLabel}
                        </Typography>
                        <Button
                          size="small"
                          onClick={() => toggleGroup(items)}
                          disabled={busy || allLocked}
                          sx={{
                            fontSize: "0.74rem",
                            textTransform: "none",
                            color: "#d6deeb",
                            "&:hover": { color: "#e7c77d" },
                          }}
                        >
                          {allChecked ? "Desmarcar grupo" : "Marcar grupo"}
                        </Button>
                      </Stack>

                      <Stack spacing={1}>
                        {items.map((priv) => {
                          const checked = selectedPrivIds.includes(priv.id);
                          const locked = checked && isPrivLockedOnOwnRole(priv.id);
                          return (
                            <Box
                              key={priv.id}
                              onClick={() => !busy && !locked && togglePriv(priv.id)}
                              sx={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: 1,
                                p: 1,
                                borderRadius: "10px",
                                cursor: busy || locked ? "default" : "pointer",
                                bgcolor: checked
                                  ? "rgba(231, 199, 125, 0.10)"
                                  : "transparent",
                                "&:hover": {
                                  bgcolor: checked
                                    ? "rgba(231, 199, 125, 0.14)"
                                    : "rgba(255, 255, 255, 0.04)",
                                },
                              }}
                            >
                              <Checkbox
                                checked={checked}
                                disabled={busy || locked}
                                onChange={() => togglePriv(priv.id)}
                                onClick={(e) => e.stopPropagation()}
                                sx={{
                                  p: 0.25,
                                  color: "#94a3b8",
                                  "&.Mui-checked": { color: "#e7c77d" },
                                }}
                              />
                              <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                                <Stack
                                  direction={{ xs: "column", sm: "row" }}
                                  justifyContent="space-between"
                                  spacing={0.5}
                                >
                                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                    <Typography
                                      sx={{
                                        fontSize: "0.88rem",
                                        fontWeight: 700,
                                        color: checked ? "#ffffff" : "#d6deeb",
                                      }}
                                    >
                                      {priv.name}
                                    </Typography>
                                    {locked && (
                                      <Chip
                                        size="small"
                                        label="Protegido"
                                        sx={{
                                          height: 20,
                                          fontSize: "0.68rem",
                                          fontWeight: 700,
                                          bgcolor: "rgba(231, 199, 125, 0.18)",
                                          color: "#f2d99c",
                                        }}
                                      />
                                    )}
                                  </Stack>
                                  {priv.code !== priv.name && (
                                    <Typography
                                      sx={{
                                        fontFamily: "var(--mono)",
                                        fontSize: "0.72rem",
                                        color: "#e7c77d",
                                        flexShrink: 0,
                                      }}
                                    >
                                      {priv.code}
                                    </Typography>
                                  )}
                                </Stack>
                                {priv.description && (
                                  <Typography
                                    sx={{
                                      fontSize: "0.78rem",
                                      color: "#94a3b8",
                                      mt: 0.25,
                                      lineHeight: 1.4,
                                    }}
                                  >
                                    {priv.description}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          );
                        })}
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3.5, pb: 3, pt: 2 }}>
          <Button
            onClick={onClose}
            disabled={busy}
            sx={{ color: "#d6deeb", textTransform: "none", fontWeight: 600 }}
          >
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={busy} sx={goldButtonSx}>
            {busy ? "Guardando…" : editingRole ? "Guardar cambios del rol" : "Crear rol"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

export default function AdminRolesPrivilegesPage() {
  const { user, accessToken, refreshUser } = useAuth();
  const privileges = useMemo(
    () => new Set(user?.privileges ?? []),
    [user?.privileges],
  );
  const can = (action) =>
    privileges.has("modificar_privilegios") ||
    privileges.has(`roles_privilegios.${action}`);

  const [activeTab, setActiveTab] = useState("users"); // "users" | "roles"
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [allPrivileges, setAllPrivileges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [dialogError, setDialogError] = useState("");
  const [toast, setToast] = useState("");

  // Filters for users table
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  // Modals state
  const [editingUser, setEditingUser] = useState(null);
  const [editingRole, setEditingRole] = useState(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoadError("");
    setLoading(true);
    try {
      const [usersData, rolesData, privsData] = await Promise.all([
        listAdminUsers(accessToken),
        listAdminRoles(accessToken),
        listAdminPrivileges(accessToken),
      ]);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setRoles(Array.isArray(rolesData) ? rolesData : []);
      setAllPrivileges(Array.isArray(privsData) ? privsData : []);
    } catch (error) {
      setLoadError(responseError(error));
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (can("ver") && accessToken) {
      loadData();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, loadData, user?.privileges]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users.filter((u) => {
      const matchesQuery =
        !q ||
        u.email?.toLowerCase().includes(q) ||
        fullNameOf(u).toLowerCase().includes(q);
      if (!matchesQuery) return false;

      if (roleFilter === "ALL") return true;
      if (roleFilter === "NONE") return (u.roles || []).length === 0;
      return (u.roles || []).some((r) => String(r.id) === String(roleFilter));
    });
  }, [users, searchQuery, roleFilter]);

  const handleSaveUserRoles = async (payload) => {
    if (!editingUser) return;
    setDialogError("");
    setWorking(true);
    try {
      await updateAdminUserRoles(accessToken, editingUser.id, payload);
      setEditingUser(null);
      setToast("Roles y privilegios del usuario actualizados correctamente.");
      await loadData();
      if (editingUser.id === user?.id && refreshUser) {
        await refreshUser();
      }
    } catch (error) {
      setDialogError(responseError(error));
    } finally {
      setWorking(false);
    }
  };

  const handleSaveRole = async (payload) => {
    setDialogError("");
    setWorking(true);
    try {
      if (editingRole) {
        await updateAdminRole(accessToken, editingRole.id, payload);
        setToast(`Rol "${payload.name}" actualizado correctamente.`);
      } else {
        await createAdminRole(accessToken, payload);
        setToast(`Rol "${payload.name}" creado correctamente.`);
      }
      setRoleDialogOpen(false);
      setEditingRole(null);
      await loadData();
      if (refreshUser) {
        await refreshUser();
      }
    } catch (error) {
      setDialogError(responseError(error));
    } finally {
      setWorking(false);
    }
  };

  if (!can("ver")) {
    return (
      <Alert severity="warning" sx={{ borderRadius: "14px" }}>
        No tienes el privilegio modificar_privilegios para consultar este módulo.
      </Alert>
    );
  }

  return (
    <Box sx={{ width: "100%", textAlign: "left" }}>
      {/* Encabezado Principal */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, sm: 4 },
          mb: 3,
          color: "#ffffff",
          bgcolor: "rgba(10, 24, 42, 0.78)",
          backdropFilter: "blur(16px)",
          backgroundImage:
            "radial-gradient(circle at top right, rgba(231, 199, 125, 0.10), transparent 55%)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "20px",
          boxShadow: "0 24px 70px rgba(0, 0, 0, 0.25)",
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2.5}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", md: "center" }}
        >
          <Box>
            <Typography
              sx={{
                color: "#e7c77d",
                fontSize: "0.72rem",
                fontWeight: 700,
                letterSpacing: "0.20em",
                textTransform: "uppercase",
                mb: 1,
              }}
            >
              Configuraciones · Control de Acceso
            </Typography>
            <Typography
              component="h1"
              sx={{
                fontSize: { xs: "1.8rem", sm: "2.35rem" },
                fontWeight: 800,
                letterSpacing: "-0.035em",
                color: "#ffffff",
              }}
            >
              Roles y privilegios
            </Typography>
            <Typography sx={{ mt: 0.75, color: "#d6deeb", fontSize: "0.95rem" }}>
              Gestiona los roles y personaliza los privilegios específicos de cada usuario dado de alta en el sistema.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.5} sx={{ flexShrink: 0 }} flexWrap="wrap" useFlexGap>
            <Button
              variant="outlined"
              startIcon={<RefreshOutlinedIcon />}
              onClick={loadData}
              disabled={loading || working}
              sx={outlineGoldButtonSx}
            >
              Actualizar
            </Button>

            {can("gestionar_roles") && (
              <Button
                variant="contained"
                startIcon={<AddOutlinedIcon />}
                onClick={() => {
                  setEditingRole(null);
                  setDialogError("");
                  setRoleDialogOpen(true);
                }}
                sx={goldButtonSx}
              >
                Nuevo rol
              </Button>
            )}
          </Stack>
        </Stack>

        {/* Selector de Pestañas (Usuarios vs Roles y Privilegios) */}
        <Stack
          direction="row"
          spacing={1.5}
          sx={{
            mt: 3.5,
            pt: 2.5,
            borderTop: "1px solid rgba(255, 255, 255, 0.10)",
          }}
          flexWrap="wrap"
          useFlexGap
        >
          <Button
            startIcon={<PeopleOutlineRoundedIcon />}
            onClick={() => setActiveTab("users")}
            sx={{
              px: 2.5,
              py: 1,
              borderRadius: "12px",
              textTransform: "none",
              fontWeight: 750,
              fontSize: "0.92rem",
              color: activeTab === "users" ? "#102138" : "#d6deeb",
              bgcolor:
                activeTab === "users" ? "#e7c77d" : "rgba(255, 255, 255, 0.05)",
              border:
                activeTab === "users"
                  ? "1px solid #e7c77d"
                  : "1px solid rgba(255, 255, 255, 0.10)",
              "&:hover": {
                bgcolor:
                  activeTab === "users"
                    ? "#f2d99c"
                    : "rgba(255, 255, 255, 0.10)",
              },
            }}
          >
            Usuarios registrados ({users.length})
          </Button>

          <Button
            startIcon={<ShieldOutlinedIcon />}
            onClick={() => setActiveTab("roles")}
            sx={{
              px: 2.5,
              py: 1,
              borderRadius: "12px",
              textTransform: "none",
              fontWeight: 750,
              fontSize: "0.92rem",
              color: activeTab === "roles" ? "#102138" : "#d6deeb",
              bgcolor:
                activeTab === "roles" ? "#e7c77d" : "rgba(255, 255, 255, 0.05)",
              border:
                activeTab === "roles"
                  ? "1px solid #e7c77d"
                  : "1px solid rgba(255, 255, 255, 0.10)",
              "&:hover": {
                bgcolor:
                  activeTab === "roles"
                    ? "#f2d99c"
                    : "rgba(255, 255, 255, 0.10)",
              },
            }}
          >
            Roles y privilegios del sistema ({roles.length})
          </Button>
        </Stack>
      </Paper>

      {loadError && (
        <Alert severity="error" sx={{ mb: 2.5, borderRadius: "14px" }}>
          {loadError}
        </Alert>
      )}

      {loading ? (
        <Paper
          elevation={0}
          sx={{
            p: 7,
            display: "grid",
            placeItems: "center",
            bgcolor: "rgba(10, 24, 42, 0.78)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "20px",
          }}
        >
          <CircularProgress sx={{ color: "#e7c77d" }} />
        </Paper>
      ) : activeTab === "users" ? (
        /* PESTAÑA 1: LISTADO DE USUARIOS Y ASIGNACIÓN DE ROLES + PRIVILEGIOS */
        <Paper
          elevation={0}
          sx={{
            overflow: "hidden",
            color: "#ffffff",
            bgcolor: "rgba(10, 24, 42, 0.78)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "20px",
            boxShadow: "0 24px 70px rgba(0, 0, 0, 0.25)",
          }}
        >
          {/* Barra de búsqueda y filtro por rol */}
          <Box
            sx={{
              p: { xs: 2.5, sm: 3 },
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1.6fr 1fr" },
              gap: 2,
            }}
          >
            <TextField
              fullWidth
              placeholder="Buscar usuario por nombre o correo electrónico…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={fieldSx}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon sx={{ color: "#526176" }} />
                    </InputAdornment>
                  ),
                },
              }}
            />

            <Select
              fullWidth
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              sx={{
                color: "#102138",
                bgcolor: "#f6f8fc",
                borderRadius: "8px",
                "& .MuiOutlinedInput-notchedOutline": { borderColor: "transparent" },
                "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#c7a65b" },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#e7c77d",
                  borderWidth: 2,
                },
              }}
            >
              <MenuItem value="ALL">Todos los roles</MenuItem>
              {roles.map((r) => (
                <MenuItem key={r.id} value={String(r.id)}>
                  Rol: {r.name}
                </MenuItem>
              ))}
              <MenuItem value="NONE">Sin roles asignados</MenuItem>
            </Select>
          </Box>

          {filteredUsers.length === 0 ? (
            <Box sx={{ p: 6, textAlign: "center" }}>
              <Typography sx={{ color: "#d6deeb", fontSize: "0.95rem" }}>
                No se encontraron usuarios con los criterios seleccionados.
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table
                size="medium"
                aria-label="Usuarios dados de alta y sus roles"
                sx={{
                  minWidth: 820,
                  "& .MuiTableCell-root": {
                    borderColor: "rgba(255, 255, 255, 0.08)",
                    color: "#d6deeb",
                    py: 2,
                  },
                }}
              >
                <TableHead
                  sx={{
                    bgcolor: "rgba(255, 255, 255, 0.04)",
                    "& .MuiTableCell-head": {
                      color: "#e7c77d",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                    },
                  }}
                >
                  <TableRow>
                    <TableCell>Usuario</TableCell>
                    <TableCell>Roles asignados</TableCell>
                    <TableCell>Privilegios activos</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers.map((u) => {
                    const isSelf = u.id === user?.id;
                    const revokedCount = (u.revoked_privilege_ids || []).length;
                    const grantedCount = (u.granted_privilege_ids || []).length;

                    return (
                      <TableRow
                        key={u.id}
                        sx={{
                          transition: "background-color 0.15s ease",
                          "&:hover": { bgcolor: "rgba(255, 255, 255, 0.04)" },
                        }}
                      >
                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="body2" sx={{ fontWeight: 750, color: "#ffffff" }}>
                              {fullNameOf(u)}
                            </Typography>
                            {isSelf && (
                              <Chip
                                size="small"
                                label="Tu cuenta"
                                sx={{
                                  height: 20,
                                  fontSize: "0.68rem",
                                  fontWeight: 700,
                                  bgcolor: "rgba(231, 199, 125, 0.16)",
                                  color: "#e7c77d",
                                  border: "1px solid rgba(231, 199, 125, 0.35)",
                                }}
                              />
                            )}
                          </Stack>
                          <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                            {u.email}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
                            {(u.roles || []).length > 0 ? (
                              u.roles.map((r) => (
                                <Chip
                                  key={r.id}
                                  size="small"
                                  icon={
                                    <ShieldOutlinedIcon
                                      sx={{ fontSize: "0.95rem !important", color: "#e7c77d !important" }}
                                    />
                                  }
                                  label={r.name}
                                  sx={{
                                    bgcolor: "rgba(255, 255, 255, 0.06)",
                                    color: "#ffffff",
                                    border: "1px solid rgba(231, 199, 125, 0.32)",
                                    fontWeight: 700,
                                  }}
                                />
                              ))
                            ) : (
                              <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                                Sin roles asignados
                              </Typography>
                            )}
                          </Stack>
                        </TableCell>

                        <TableCell>
                          <Stack direction="row" spacing={0.8} alignItems="center" flexWrap="wrap" useFlexGap>
                            <Chip
                              size="small"
                              icon={
                                <VerifiedUserOutlinedIcon
                                  sx={{ fontSize: "0.9rem !important", color: "#38bdf8 !important" }}
                                />
                              }
                              label={`${(u.privileges || []).length} activos`}
                              sx={{
                                bgcolor: "rgba(56, 189, 248, 0.10)",
                                color: "#e0f2fe",
                                border: "1px solid rgba(56, 189, 248, 0.25)",
                                fontWeight: 600,
                              }}
                            />

                            {revokedCount > 0 && (
                              <Chip
                                size="small"
                                label={`${revokedCount} restringido${revokedCount > 1 ? "s" : ""}`}
                                sx={{
                                  bgcolor: "rgba(248, 113, 113, 0.14)",
                                  color: "#f87171",
                                  border: "1px solid rgba(248, 113, 113, 0.30)",
                                  fontWeight: 700,
                                }}
                              />
                            )}

                            {grantedCount > 0 && (
                              <Chip
                                size="small"
                                label={`+${grantedCount} extra`}
                                sx={{
                                  bgcolor: "rgba(34, 197, 94, 0.14)",
                                  color: "#4ade80",
                                  border: "1px solid rgba(74, 222, 128, 0.30)",
                                  fontWeight: 700,
                                }}
                              />
                            )}
                          </Stack>
                        </TableCell>

                        <TableCell>
                          <Chip
                            size="small"
                            label={u.is_active ? "Activo" : "Inactivo"}
                            variant="outlined"
                            sx={
                              u.is_active
                                ? {
                                    bgcolor: "rgba(34, 197, 94, 0.14)",
                                    color: "#4ade80",
                                    borderColor: "rgba(74, 222, 128, 0.35)",
                                    fontWeight: 700,
                                  }
                                : {
                                    bgcolor: "rgba(248, 113, 113, 0.14)",
                                    color: "#f87171",
                                    borderColor: "rgba(248, 113, 113, 0.35)",
                                    fontWeight: 700,
                                  }
                            }
                          />
                        </TableCell>

                        <TableCell align="right">
                          {can("gestionar_usuarios") && (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<ManageAccountsOutlinedIcon />}
                              onClick={() => {
                                setDialogError("");
                                setEditingUser(u);
                              }}
                              sx={outlineGoldButtonSx}
                            >
                              Roles y privilegios
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      ) : (
        /* PESTAÑA 2: ROLES DEL SISTEMA Y SUS PRIVILEGIOS */
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "repeat(2, 1fr)" },
            gap: 3,
          }}
        >
          {roles.map((role) => (
            <Paper
              key={role.id}
              elevation={0}
              sx={{
                p: { xs: 3, sm: 3.5 },
                color: "#ffffff",
                bgcolor: "rgba(10, 24, 42, 0.78)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "20px",
                boxShadow: "0 20px 50px rgba(0, 0, 0, 0.22)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <Box>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="flex-start"
                  spacing={2}
                  sx={{ mb: 1.5 }}
                >
                  <Box>
                    <Stack direction="row" spacing={1.2} alignItems="center" flexWrap="wrap" useFlexGap>
                      <ShieldOutlinedIcon sx={{ color: "#e7c77d" }} />
                      <Typography
                        sx={{
                          fontSize: "1.35rem",
                          fontWeight: 800,
                          letterSpacing: "-0.02em",
                          color: "#ffffff",
                        }}
                      >
                        {role.name}
                      </Typography>
                      {role.name?.toLowerCase() === "ponente" && (
                        <Chip
                          size="small"
                          label="Por defecto (nuevos usuarios)"
                          sx={{
                            bgcolor: "rgba(231, 199, 125, 0.16)",
                            color: "#f2d99c",
                            border: "1px solid rgba(231, 199, 125, 0.35)",
                            fontWeight: 700,
                          }}
                        />
                      )}
                      <Chip
                        size="small"
                        label={role.is_active ? "Activo" : "Inactivo"}
                        sx={
                          role.is_active
                            ? {
                                bgcolor: "rgba(34, 197, 94, 0.14)",
                                color: "#4ade80",
                                fontWeight: 700,
                              }
                            : {
                                bgcolor: "rgba(248, 113, 113, 0.14)",
                                color: "#f87171",
                                fontWeight: 700,
                              }
                        }
                      />
                    </Stack>
                    <Typography
                      sx={{
                        mt: 1,
                        color: "#d6deeb",
                        fontSize: "0.88rem",
                        lineHeight: 1.55,
                      }}
                    >
                      {role.description || "Sin descripción registrada."}
                    </Typography>
                  </Box>

                  <Chip
                    size="small"
                    label={`${role.users_count ?? 0} usuarios`}
                    sx={{
                      bgcolor: "rgba(231, 199, 125, 0.12)",
                      color: "#e7c77d",
                      border: "1px solid rgba(231, 199, 125, 0.30)",
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  />
                </Stack>

                <Divider sx={{ my: 2, borderColor: "rgba(255, 255, 255, 0.10)" }} />

                <Typography
                  sx={{
                    color: "#e7c77d",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    mb: 1.5,
                  }}
                >
                  Privilegios asignados ({(role.privileges || []).length})
                </Typography>

                {(role.privileges || []).length === 0 ? (
                  <Typography sx={{ color: "#94a3b8", fontSize: "0.85rem" }}>
                    Este rol no tiene privilegios asignados actualmente.
                  </Typography>
                ) : (
                  <Stack
                    spacing={1}
                    sx={{
                      maxHeight: 260,
                      overflowY: "auto",
                      pr: 0.5,
                    }}
                  >
                    {role.privileges.map((priv) => (
                      <Box
                        key={priv.id}
                        sx={{
                          p: 1.25,
                          borderRadius: "10px",
                          bgcolor: "rgba(7, 18, 33, 0.55)",
                          border: "1px solid rgba(255, 255, 255, 0.06)",
                        }}
                      >
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="baseline"
                          spacing={1}
                        >
                          <Typography
                            sx={{
                              fontSize: "0.84rem",
                              fontWeight: 700,
                              color: "#ffffff",
                            }}
                          >
                            {priv.name}
                          </Typography>
                          {priv.code !== priv.name && (
                            <Typography
                              sx={{
                                fontFamily: "var(--mono)",
                                fontSize: "0.70rem",
                                color: "#e7c77d",
                                flexShrink: 0,
                              }}
                            >
                              {priv.code}
                            </Typography>
                          )}
                        </Stack>
                        {priv.description && (
                          <Typography
                            sx={{
                              mt: 0.35,
                              fontSize: "0.76rem",
                              color: "#94a3b8",
                              lineHeight: 1.4,
                            }}
                          >
                            {priv.description}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Stack>
                )}
              </Box>

              {can("gestionar_roles") && (
                <Box sx={{ mt: 3, pt: 2, borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<EditOutlinedIcon />}
                    onClick={() => {
                      setEditingRole(role);
                      setDialogError("");
                      setRoleDialogOpen(true);
                    }}
                    sx={outlineGoldButtonSx}
                  >
                    Modificar privilegios del rol
                  </Button>
                </Box>
              )}
            </Paper>
          ))}
        </Box>
      )}

      {/* Modal para asignar/quitar roles y personalizar privilegios de un usuario */}
      <UserRolesDialog
        open={Boolean(editingUser)}
        targetUser={editingUser}
        currentUserId={user?.id}
        roles={roles}
        allPrivileges={allPrivileges}
        busy={working}
        error={dialogError}
        onClose={() => {
          setEditingUser(null);
          setDialogError("");
        }}
        onSave={handleSaveUserRoles}
      />

      {/* Modal para crear/editar un rol y sus privilegios */}
      <RoleFormDialog
        open={roleDialogOpen}
        editingRole={editingRole}
        isCurrentUsersRole={Boolean(
          editingRole &&
            String(editingRole.name || "").trim().toLowerCase() === "administrador" &&
            (user?.roles || []).some(
              (r) => String(r || "").trim().toLowerCase() === "administrador",
            ),
        )}
        allPrivileges={allPrivileges}
        busy={working}
        error={dialogError}
        onClose={() => {
          setRoleDialogOpen(false);
          setEditingRole(null);
          setDialogError("");
        }}
        onSave={handleSaveRole}
      />

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4500}
        onClose={() => setToast("")}
        message={toast}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Box>
  );
}
