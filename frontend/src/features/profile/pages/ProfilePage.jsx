import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormHelperText,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";

import { useAuth } from "../../auth/context/AuthContext";
import { getRoleMeta } from "../../../shared/utils/roleConfig";
import { getOwnProfile, updateOwnProfile } from "../api/profileApi";
import { adaptarCatalogosPerfil, getCatalogos } from "../api/catalogosApi";
import { CATALOGOS_TEMPORALES } from "../constants/catalogosTemporales";

const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const goldButtonSx = {
  py: 1.1,
  px: 2.4,
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
  py: 1.0,
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
    "&.Mui-error fieldset": { borderColor: "#f87171", borderWidth: 1.5 },
    "&.Mui-disabled": { backgroundColor: "#dce2eb" },
  },
  "& .MuiInputBase-input": {
    py: 1.35,
    fontSize: "0.92rem",
    "&::placeholder": { color: "#526176", opacity: 1 },
  },
  "& .MuiFormHelperText-root": {
    color: "#f87171",
    fontSize: "0.76rem",
    mx: 0.25,
  },
};

const selectSx = {
  color: "#102138",
  bgcolor: "#f6f8fc",
  borderRadius: "8px",
  fontSize: "0.92rem",
  "& .MuiSelect-select": {
    py: 1.35,
  },
  "& .MuiOutlinedInput-notchedOutline": { borderColor: "transparent" },
  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#c7a65b" },
  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
    borderColor: "#e7c77d",
    borderWidth: 2,
  },
  "&.Mui-error .MuiOutlinedInput-notchedOutline": {
    borderColor: "#f87171",
    borderWidth: 1.5,
  },
};

const glassPaperSx = {
  color: "#ffffff",
  bgcolor: "rgba(10, 24, 42, 0.78)",
  backdropFilter: "blur(16px)",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderRadius: "20px",
  boxShadow: "0 24px 70px rgba(0, 0, 0, 0.25)",
};

const emptyForm = {
  state: "",
  institution: "",
  academic_level: "",
  dialing_code: "",
  mobile_phone: "",
  phone: "",
  biography: "",
};

function profileToForm(profile) {
  if (!profile) return emptyForm;
  return {
    state: profile.state ?? "",
    institution: profile.institution ?? "",
    academic_level: profile.academic_level ?? "",
    dialing_code: profile.dialing_code ?? "",
    mobile_phone: profile.mobile_phone ?? "",
    phone: profile.phone ?? "",
    biography: profile.biography ?? "",
  };
}

function formatDate(iso) {
  if (!iso) return "Sin registro";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Sin registro";
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function extractErrors(error) {
  const data = error?.response?.data;
  if (error?.response?.status === 401) {
    return { general: "Tu sesión venció. Inicia sesión nuevamente para continuar.", fields: {} };
  }
  if (!data || typeof data !== "object") {
    return { general: "No fue posible conectar con el servidor.", fields: {} };
  }

  const fields = {};
  const generalParts = [];

  for (const [key, value] of Object.entries(data)) {
    const text = Array.isArray(value)
      ? value.map((item) => String(item ?? "")).filter(Boolean).join(" ")
      : String(value ?? "");
    if (!text) continue;
    if (
      [
        "state",
        "institution",
        "academic_level",
        "dialing_code",
        "mobile_phone",
        "phone",
        "biography",
        "profile_picture",
      ].includes(key)
    ) {
      fields[key] = text;
    } else {
      generalParts.push(text);
    }
  }

  return {
    general:
      generalParts.join(" ") ||
      (Object.keys(fields).length > 0
        ? "Revisa los campos marcados antes de guardar."
        : "No se pudo actualizar el perfil."),
    fields,
  };
}

function isValidPhoneValue(value) {
  const trimmed = value.trim();
  if (!trimmed) return true;
  const digitsCount = trimmed.replace(/\D/g, "").length;
  return /^[0-9+\-\s()]{7,20}$/.test(trimmed) && digitsCount >= 7;
}

export default function ProfilePage() {
  const { user, accessToken, refreshUser } = useAuth();
  const fileInputRef = useRef(null);
  const previewUrlRef = useRef("");

  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [removeExistingPhoto, setRemoveExistingPhoto] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [toast, setToast] = useState("");
  // Catálogos reales del backend; si no responden se usan los temporales.
  const [catalogos, setCatalogos] = useState(CATALOGOS_TEMPORALES);

  useEffect(() => {
    let activo = true;
    getCatalogos()
      .then((data) => {
        if (activo) setCatalogos(adaptarCatalogosPerfil(data));
      })
      .catch(() => {});
    return () => {
      activo = false;
    };
  }, []);

  const clearPreviewUrl = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = "";
    }
    setPreviewUrl("");
  };

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = "";
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchProfile() {
      if (!accessToken) return;
      try {
        const data = await getOwnProfile(accessToken);
        if (cancelled) return;
        setProfile(data);
        setForm(profileToForm(data));
        setLoadError("");
      } catch (error) {
        if (!cancelled) {
          setLoadError(extractErrors(error).general);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchProfile();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const reloadProfile = async () => {
    if (!accessToken) return;
    setLoading(true);
    setLoadError("");
    try {
      const data = await getOwnProfile(accessToken);
      setProfile(data);
      setForm(profileToForm(data));
      setSelectedFile(null);
      clearPreviewUrl();
      setRemoveExistingPhoto(false);
      setFieldErrors({});
      setSubmitError("");
    } catch (error) {
      setLoadError(extractErrors(error).general);
    } finally {
      setLoading(false);
    }
  };

  const fullName = useMemo(() => {
    const parts = [user?.first_name, user?.last_name, user?.maternal_last_name]
      .filter(Boolean)
      .join(" ")
      .trim();
    return parts || user?.email || "Usuario";
  }, [user]);

  const initials = useMemo(() => {
    const letters = [user?.first_name?.[0], user?.last_name?.[0]]
      .filter(Boolean)
      .join("")
      .toUpperCase();
    return letters || (user?.email?.[0] || "U").toUpperCase();
  }, [user]);

  const roles = Array.isArray(user?.roles) ? user.roles : [];

  const isDirty = useMemo(() => {
    if (!profile) return false;
    const base = profileToForm(profile);
    const formChanged =
      String(form.state) !== String(base.state) ||
      String(form.institution) !== String(base.institution) ||
      String(form.academic_level) !== String(base.academic_level) ||
      form.dialing_code !== base.dialing_code ||
      form.mobile_phone !== base.mobile_phone ||
      form.phone !== base.phone ||
      form.biography !== base.biography;
    return formChanged || Boolean(selectedFile) || removeExistingPhoto;
  }, [profile, form, selectedFile, removeExistingPhoto]);

  const displayedPhoto = removeExistingPhoto
    ? ""
    : previewUrl || profile?.profile_picture || "";

  const handleFieldChange = (field) => (event) => {
    const { value } = event.target;
    setForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    }
    if (submitError) setSubmitError("");
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!ALLOWED_PHOTO_TYPES.has(file.type)) {
      setFieldErrors((prev) => ({
        ...prev,
        profile_picture: "Selecciona una imagen válida en formato JPG, PNG o WEBP.",
      }));
      return;
    }
    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      setFieldErrors((prev) => ({
        ...prev,
        profile_picture: "La foto de perfil no debe exceder 5 MB.",
      }));
      return;
    }

    clearPreviewUrl();
    const nextUrl = URL.createObjectURL(file);
    previewUrlRef.current = nextUrl;
    setPreviewUrl(nextUrl);
    setSelectedFile(file);
    setRemoveExistingPhoto(false);
    setFieldErrors((prev) => ({ ...prev, profile_picture: "" }));
    if (submitError) setSubmitError("");
  };

  const handleRemovePhoto = () => {
    setSelectedFile(null);
    clearPreviewUrl();
    setRemoveExistingPhoto(Boolean(profile?.profile_picture));
    setFieldErrors((prev) => ({ ...prev, profile_picture: "" }));
  };

  const handleReset = () => {
    setForm(profileToForm(profile));
    setSelectedFile(null);
    clearPreviewUrl();
    setRemoveExistingPhoto(false);
    setFieldErrors({});
    setSubmitError("");
  };

  const validateForm = () => {
    const errors = {};
    if (!form.state) errors.state = "Selecciona tu estado de residencia.";
    if (!form.institution) errors.institution = "Selecciona tu institución de procedencia.";
    if (!form.academic_level) errors.academic_level = "Selecciona tu nivel académico.";
    if (!String(form.dialing_code).trim()) {
      errors.dialing_code = "Selecciona la lada telefónica.";
    }
    if (!form.mobile_phone.trim()) {
      errors.mobile_phone = "Ingresa tu teléfono móvil.";
    } else if (!isValidPhoneValue(form.mobile_phone)) {
      errors.mobile_phone = "Ingresa un número móvil válido (7 a 20 caracteres).";
    }
    if (form.phone.trim() && !isValidPhoneValue(form.phone)) {
      errors.phone = "Ingresa un teléfono fijo válido (7 a 20 caracteres).";
    }
    return errors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving || !accessToken) return;

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setSubmitError("Completa los campos obligatorios marcados antes de guardar.");
      return;
    }

    setSaving(true);
    setSubmitError("");
    setFieldErrors({});

    try {
      let payload;
      if (selectedFile) {
        const body = new FormData();
        body.append("state", String(form.state));
        body.append("institution", String(form.institution));
        body.append("academic_level", String(form.academic_level));
        body.append("dialing_code", form.dialing_code.trim());
        body.append("mobile_phone", form.mobile_phone.trim());
        body.append("phone", form.phone.trim());
        body.append("biography", form.biography.trim());
        body.append("profile_picture", selectedFile);
        payload = body;
      } else {
        payload = {
          state: Number(form.state),
          institution: Number(form.institution),
          academic_level: Number(form.academic_level),
          dialing_code: form.dialing_code.trim(),
          mobile_phone: form.mobile_phone.trim(),
          phone: form.phone.trim(),
          biography: form.biography.trim(),
          ...(removeExistingPhoto ? { profile_picture: null } : {}),
        };
      }

      const updated = await updateOwnProfile(accessToken, payload);
      setProfile(updated);
      setForm(profileToForm(updated));
      setSelectedFile(null);
      clearPreviewUrl();
      setRemoveExistingPhoto(false);
      setToast("Perfil actualizado correctamente.");
      if (refreshUser) {
        await refreshUser();
      }
    } catch (error) {
      const parsed = extractErrors(error);
      setFieldErrors(parsed.fields);
      setSubmitError(parsed.general);
    } finally {
      setSaving(false);
    }
  };

  const hasKnownState =
    !form.state ||
    catalogos.estados.some((item) => String(item.id) === String(form.state));
  const hasKnownInstitution =
    !form.institution ||
    catalogos.instituciones.some(
      (item) => String(item.id) === String(form.institution),
    );
  const hasKnownLevel =
    !form.academic_level ||
    catalogos.nivelesAcademicos.some(
      (item) => String(item.id) === String(form.academic_level),
    );
  const hasKnownLada =
    !form.dialing_code ||
    catalogos.ladas.some((item) => item.codigo === form.dialing_code);

  const isComplete = Boolean(profile?.is_complete);

  return (
    <Box sx={{ width: "100%", textAlign: "left" }}>
      {/* Encabezado Principal */}
      <Paper
        elevation={0}
        sx={{
          ...glassPaperSx,
          p: { xs: 2.5, sm: 3.5, md: 4 },
          mb: 3,
          backgroundImage:
            "radial-gradient(circle at top right, rgba(231, 199, 125, 0.10), transparent 55%)",
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2.5}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", md: "center" }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                color: "#e7c77d",
                fontSize: "0.72rem",
                fontWeight: 700,
                letterSpacing: "0.20em",
                textTransform: "uppercase",
                mb: 0.8,
              }}
            >
              Principal · Perfil de Usuario
            </Typography>

            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box
                sx={{
                  width: { xs: 38, sm: 44 },
                  height: { xs: 38, sm: 44 },
                  borderRadius: "12px",
                  bgcolor: "rgba(231, 199, 125, 0.12)",
                  border: "1px solid rgba(231, 199, 125, 0.30)",
                  display: "grid",
                  placeItems: "center",
                  color: "#e7c77d",
                  flexShrink: 0,
                }}
              >
                <PersonOutlineOutlinedIcon sx={{ fontSize: "1.45rem" }} />
              </Box>
              <Typography
                component="h1"
                sx={{
                  fontSize: { xs: "1.75rem", sm: "2.25rem" },
                  fontWeight: 800,
                  letterSpacing: "-0.035em",
                  color: "#ffffff",
                  lineHeight: 1.15,
                }}
              >
                Mi Perfil
              </Typography>
            </Stack>

            <Typography sx={{ mt: 1, color: "#d6deeb", fontSize: "0.94rem" }}>
              Consulta y actualiza tu información académica, datos de contacto, fotografía y semblanza profesional.
            </Typography>
          </Box>

          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            flexWrap="wrap"
            useFlexGap
            sx={{ flexShrink: 0 }}
          >
            {profile && (
              <>
                <Chip
                  size="small"
                  icon={
                    isComplete ? (
                      <CheckCircleOutlineRoundedIcon
                        sx={{ fontSize: "1rem !important", color: "#4ade80 !important" }}
                      />
                    ) : (
                      <WarningAmberRoundedIcon
                        sx={{ fontSize: "1rem !important", color: "#e7c77d !important" }}
                      />
                    )
                  }
                  label={isComplete ? "Perfil completo" : "Perfil incompleto"}
                  sx={
                    isComplete
                      ? {
                          bgcolor: "rgba(34, 197, 94, 0.14)",
                          color: "#4ade80",
                          border: "1px solid rgba(74, 222, 128, 0.35)",
                          fontWeight: 700,
                        }
                      : {
                          bgcolor: "rgba(231, 199, 125, 0.14)",
                          color: "#f2d99c",
                          border: "1px solid rgba(231, 199, 125, 0.35)",
                          fontWeight: 700,
                        }
                  }
                />

                <Chip
                  size="small"
                  icon={
                    <BadgeOutlinedIcon
                      sx={{ fontSize: "0.95rem !important", color: "#94a3b8 !important" }}
                    />
                  }
                  label={`Perfil #${profile.id}`}
                  sx={{
                    bgcolor: "rgba(255, 255, 255, 0.06)",
                    color: "#d6deeb",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    fontWeight: 600,
                  }}
                />
              </>
            )}

            <Button
              variant="outlined"
              startIcon={<RefreshOutlinedIcon />}
              onClick={reloadProfile}
              disabled={loading || saving}
              sx={outlineGoldButtonSx}
            >
              Actualizar
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {loadError && (
        <Alert
          severity="error"
          sx={{ mb: 3, borderRadius: "14px" }}
          action={
            <Button color="inherit" size="small" onClick={reloadProfile}>
              Reintentar
            </Button>
          }
        >
          {loadError}
        </Alert>
      )}

      {loading ? (
        <Paper
          elevation={0}
          sx={{
            ...glassPaperSx,
            p: 7,
            display: "grid",
            placeItems: "center",
          }}
        >
          <CircularProgress sx={{ color: "#e7c77d" }} />
        </Paper>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "320px minmax(0, 1fr)" },
            gap: 3,
            alignItems: "start",
          }}
        >
          {/* Columna Izquierda: Foto de perfil, identidad de usuario y fecha de perfil */}
          <Paper
            elevation={0}
            sx={{
              ...glassPaperSx,
              p: { xs: 2.5, sm: 3.5 },
            }}
          >
            <Stack spacing={2.5} alignItems="center" sx={{ textAlign: "center" }}>
              <Avatar
                src={displayedPhoto || undefined}
                alt={`Foto de perfil de ${fullName}`}
                sx={{
                  width: 124,
                  height: 124,
                  fontSize: "2.25rem",
                  fontWeight: 800,
                  bgcolor: "#102138",
                  color: "#e7c77d",
                  border: "3px solid rgba(231, 199, 125, 0.65)",
                  boxShadow: "0 12px 32px rgba(0, 0, 0, 0.35)",
                }}
              >
                {initials}
              </Avatar>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                hidden
                onChange={handlePhotoChange}
              />

              <Stack
                direction="row"
                spacing={1}
                justifyContent="center"
                flexWrap="wrap"
                useFlexGap
              >
                <Button
                  type="button"
                  variant="outlined"
                  size="small"
                  startIcon={<PhotoCameraOutlinedIcon />}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={saving}
                  sx={outlineGoldButtonSx}
                >
                  {displayedPhoto ? "Cambiar foto" : "Subir foto"}
                </Button>

                {displayedPhoto && (
                  <Button
                    type="button"
                    size="small"
                    startIcon={<DeleteOutlineRoundedIcon />}
                    onClick={handleRemovePhoto}
                    disabled={saving}
                    sx={{
                      color: "#f87171",
                      textTransform: "none",
                      fontWeight: 600,
                      borderRadius: "10px",
                      px: 1.5,
                      "&:hover": { bgcolor: "rgba(248, 113, 113, 0.12)" },
                    }}
                  >
                    Quitar
                  </Button>
                )}
              </Stack>

              {fieldErrors.profile_picture && (
                <Typography sx={{ color: "#f87171", fontSize: "0.78rem" }}>
                  {fieldErrors.profile_picture}
                </Typography>
              )}

              <Typography sx={{ color: "#94a3b8", fontSize: "0.75rem" }}>
                Formatos JPG, PNG o WEBP · Máximo 5 MB
              </Typography>
            </Stack>

            <Divider sx={{ my: 2.5, borderColor: "rgba(255, 255, 255, 0.10)" }} />

            <Stack spacing={1.5}>
              <Box>
                <Typography
                  sx={{
                    color: "#e7c77d",
                    fontSize: "0.70rem",
                    fontWeight: 700,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    mb: 0.6,
                  }}
                >
                  Cuenta vinculada
                </Typography>
                <Typography
                  sx={{
                    fontSize: "1.05rem",
                    fontWeight: 750,
                    color: "#ffffff",
                    wordBreak: "break-word",
                  }}
                >
                  {fullName}
                </Typography>
                <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mt: 0.5 }}>
                  <MailOutlineRoundedIcon sx={{ fontSize: "0.95rem", color: "#94a3b8" }} />
                  <Typography
                    sx={{
                      fontSize: "0.84rem",
                      color: "#d6deeb",
                      wordBreak: "break-all",
                    }}
                  >
                    {user?.email}
                  </Typography>
                </Stack>
              </Box>

              <Box>
                <Typography
                  sx={{
                    color: "#94a3b8",
                    fontSize: "0.74rem",
                    fontWeight: 600,
                    mb: 0.8,
                  }}
                >
                  Roles asignados
                </Typography>
                <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
                  {roles.map((role) => {
                    const meta = getRoleMeta(role);
                    const RoleIcon = meta.icon;
                    return (
                      <Chip
                        key={role}
                        size="small"
                        icon={<RoleIcon style={{ color: meta.color, fontSize: "0.95rem" }} />}
                        label={meta.label || role}
                        sx={{
                          bgcolor: meta.bgColor,
                          color: meta.color,
                          border: `1px solid ${meta.borderColor}`,
                          fontWeight: 700,
                          fontSize: "0.74rem",
                        }}
                      />
                    );
                  })}
                </Stack>
              </Box>

              {profile && (
                <>
                  <Divider sx={{ my: 0.5, borderColor: "rgba(255, 255, 255, 0.08)" }} />
                  <Stack spacing={0.8}>
                    <Box>
                      <Typography sx={{ color: "#94a3b8", fontSize: "0.72rem" }}>
                        Fecha de registro del perfil
                      </Typography>
                      <Typography sx={{ color: "#d6deeb", fontSize: "0.82rem", fontWeight: 600 }}>
                        {formatDate(profile.created_at)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ color: "#94a3b8", fontSize: "0.72rem" }}>
                        Última actualización
                      </Typography>
                      <Typography sx={{ color: "#d6deeb", fontSize: "0.82rem", fontWeight: 600 }}>
                        {formatDate(profile.updated_at)}
                      </Typography>
                    </Box>
                  </Stack>
                </>
              )}
            </Stack>
          </Paper>

          {/* Columna Derecha: Formulario de datos del perfil */}
          <Paper
            component="form"
            onSubmit={handleSubmit}
            noValidate
            elevation={0}
            sx={{
              ...glassPaperSx,
              p: { xs: 2.5, sm: 3.5, md: 4 },
            }}
          >
            <Stack spacing={3}>
              {submitError && (
                <Alert severity="error" sx={{ borderRadius: "12px" }}>
                  {submitError}
                </Alert>
              )}

              {!isComplete && !submitError && (
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
                  Completa los campos marcados con <strong>*</strong> (estado, institución, nivel académico, lada y teléfono móvil) para completar tu perfil.
                </Alert>
              )}

              {/* Sección 1: Ubicación y Formación Académica */}
              <Box>
                <Typography
                  sx={{
                    color: "#e7c77d",
                    fontSize: "0.74rem",
                    fontWeight: 700,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    mb: 2,
                  }}
                >
                  1. Ubicación y formación académica
                </Typography>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
                    gap: 2.2,
                  }}
                >
                  <Box>
                    <Typography
                      component="label"
                      htmlFor="profile-state-select"
                      sx={{
                        display: "block",
                        mb: 0.8,
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        color: "#d6deeb",
                      }}
                    >
                      Estado *
                    </Typography>
                    <Select
                      id="profile-state-select"
                      fullWidth
                      displayEmpty
                      value={form.state}
                      onChange={handleFieldChange("state")}
                      disabled={saving}
                      error={Boolean(fieldErrors.state)}
                      sx={selectSx}
                    >
                      <MenuItem value="">
                        <em>Selecciona un estado</em>
                      </MenuItem>
                      {!hasKnownState && (
                        <MenuItem value={form.state}>
                          Estado registrado (#{form.state})
                        </MenuItem>
                      )}
                      {catalogos.estados.map((item) => (
                        <MenuItem key={item.id} value={item.id}>
                          {item.nombre} ({item.pais})
                        </MenuItem>
                      ))}
                    </Select>
                    {fieldErrors.state && (
                      <FormHelperText sx={{ color: "#f87171", mx: 0.25 }}>
                        {fieldErrors.state}
                      </FormHelperText>
                    )}
                  </Box>

                  <Box>
                    <Typography
                      component="label"
                      htmlFor="profile-level-select"
                      sx={{
                        display: "block",
                        mb: 0.8,
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        color: "#d6deeb",
                      }}
                    >
                      Nivel académico *
                    </Typography>
                    <Select
                      id="profile-level-select"
                      fullWidth
                      displayEmpty
                      value={form.academic_level}
                      onChange={handleFieldChange("academic_level")}
                      disabled={saving}
                      error={Boolean(fieldErrors.academic_level)}
                      sx={selectSx}
                    >
                      <MenuItem value="">
                        <em>Selecciona un nivel académico</em>
                      </MenuItem>
                      {!hasKnownLevel && (
                        <MenuItem value={form.academic_level}>
                          Nivel académico registrado (#{form.academic_level})
                        </MenuItem>
                      )}
                      {catalogos.nivelesAcademicos.map((item) => (
                        <MenuItem key={item.id} value={item.id}>
                          {item.nombre}
                        </MenuItem>
                      ))}
                    </Select>
                    {fieldErrors.academic_level && (
                      <FormHelperText sx={{ color: "#f87171", mx: 0.25 }}>
                        {fieldErrors.academic_level}
                      </FormHelperText>
                    )}
                  </Box>

                  <Box sx={{ gridColumn: { xs: "1", sm: "1 / -1" } }}>
                    <Typography
                      component="label"
                      htmlFor="profile-institution-select"
                      sx={{
                        display: "block",
                        mb: 0.8,
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        color: "#d6deeb",
                      }}
                    >
                      Institución *
                    </Typography>
                    <Select
                      id="profile-institution-select"
                      fullWidth
                      displayEmpty
                      value={form.institution}
                      onChange={handleFieldChange("institution")}
                      disabled={saving}
                      error={Boolean(fieldErrors.institution)}
                      sx={selectSx}
                    >
                      <MenuItem value="">
                        <em>Selecciona tu institución</em>
                      </MenuItem>
                      {!hasKnownInstitution && (
                        <MenuItem value={form.institution}>
                          Institución registrada (#{form.institution})
                        </MenuItem>
                      )}
                      {catalogos.instituciones.map((item) => (
                        <MenuItem key={item.id} value={item.id}>
                          {item.nombre}
                        </MenuItem>
                      ))}
                    </Select>
                    {fieldErrors.institution && (
                      <FormHelperText sx={{ color: "#f87171", mx: 0.25 }}>
                        {fieldErrors.institution}
                      </FormHelperText>
                    )}
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.10)" }} />

              {/* Sección 2: Información de Contacto */}
              <Box>
                <Typography
                  sx={{
                    color: "#e7c77d",
                    fontSize: "0.74rem",
                    fontWeight: 700,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    mb: 2,
                  }}
                >
                  2. Información de contacto
                </Typography>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "0.9fr 1fr 1fr" },
                    gap: 2.2,
                  }}
                >
                  <Box>
                    <Typography
                      component="label"
                      htmlFor="profile-lada-select"
                      sx={{
                        display: "block",
                        mb: 0.8,
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        color: "#d6deeb",
                      }}
                    >
                      Lada *
                    </Typography>
                    <Select
                      id="profile-lada-select"
                      fullWidth
                      displayEmpty
                      value={form.dialing_code}
                      onChange={handleFieldChange("dialing_code")}
                      disabled={saving}
                      error={Boolean(fieldErrors.dialing_code)}
                      sx={selectSx}
                    >
                      <MenuItem value="">
                        <em>Selecciona lada</em>
                      </MenuItem>
                      {!hasKnownLada && (
                        <MenuItem value={form.dialing_code}>{form.dialing_code}</MenuItem>
                      )}
                      {catalogos.ladas.map((item) => (
                        <MenuItem key={item.id ?? item.codigo} value={item.codigo}>
                          {item.etiqueta}
                        </MenuItem>
                      ))}
                    </Select>
                    {fieldErrors.dialing_code && (
                      <FormHelperText sx={{ color: "#f87171", mx: 0.25 }}>
                        {fieldErrors.dialing_code}
                      </FormHelperText>
                    )}
                  </Box>

                  <Box>
                    <Typography
                      component="label"
                      htmlFor="profile-mobile-input"
                      sx={{
                        display: "block",
                        mb: 0.8,
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        color: "#d6deeb",
                      }}
                    >
                      Teléfono móvil *
                    </Typography>
                    <TextField
                      id="profile-mobile-input"
                      type="tel"
                      fullWidth
                      placeholder="Ej. 5512345678"
                      value={form.mobile_phone}
                      onChange={handleFieldChange("mobile_phone")}
                      disabled={saving}
                      error={Boolean(fieldErrors.mobile_phone)}
                      helperText={fieldErrors.mobile_phone}
                      slotProps={{ htmlInput: { maxLength: 20 } }}
                      sx={fieldSx}
                    />
                  </Box>

                  <Box>
                    <Typography
                      component="label"
                      htmlFor="profile-phone-input"
                      sx={{
                        display: "block",
                        mb: 0.8,
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        color: "#d6deeb",
                      }}
                    >
                      Teléfono fijo (opcional)
                    </Typography>
                    <TextField
                      id="profile-phone-input"
                      type="tel"
                      fullWidth
                      placeholder="Ej. 5556231800"
                      value={form.phone}
                      onChange={handleFieldChange("phone")}
                      disabled={saving}
                      error={Boolean(fieldErrors.phone)}
                      helperText={fieldErrors.phone}
                      slotProps={{ htmlInput: { maxLength: 20 } }}
                      sx={fieldSx}
                    />
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.10)" }} />

              {/* Sección 3: Semblanza */}
              <Box>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ mb: 1 }}
                >
                  <Typography
                    component="label"
                    htmlFor="profile-biography-input"
                    sx={{
                      color: "#e7c77d",
                      fontSize: "0.74rem",
                      fontWeight: 700,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                    }}
                  >
                    3. Semblanza (opcional)
                  </Typography>
                  <Typography sx={{ fontSize: "0.74rem", color: "#94a3b8" }}>
                    {form.biography.length} caracteres
                  </Typography>
                </Stack>

                <TextField
                  id="profile-biography-input"
                  fullWidth
                  multiline
                  minRows={4}
                  placeholder="Describe brevemente tu trayectoria académica, líneas de investigación o áreas de interés."
                  value={form.biography}
                  onChange={handleFieldChange("biography")}
                  disabled={saving}
                  error={Boolean(fieldErrors.biography)}
                  helperText={fieldErrors.biography}
                  sx={fieldSx}
                />
              </Box>

              <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.10)" }} />

              {/* Acciones */}
              <Stack
                direction={{ xs: "column-reverse", sm: "row" }}
                justifyContent="flex-end"
                spacing={1.5}
              >
                <Button
                  type="button"
                  onClick={handleReset}
                  disabled={!isDirty || saving}
                  sx={{
                    color: "#d6deeb",
                    textTransform: "none",
                    fontWeight: 600,
                    px: 2.2,
                    borderRadius: "10px",
                    "&:hover": { bgcolor: "rgba(255, 255, 255, 0.06)" },
                    "&.Mui-disabled": { color: "rgba(214, 222, 235, 0.35)" },
                  }}
                >
                  Descartar cambios
                </Button>

                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<SaveOutlinedIcon />}
                  disabled={saving || !isDirty}
                  sx={goldButtonSx}
                >
                  {saving ? "Guardando…" : "Guardar cambios"}
                </Button>
              </Stack>
            </Stack>
          </Paper>
        </Box>
      )}

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
