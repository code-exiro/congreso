import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Autocomplete,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormHelperText,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";

import { useAuth } from "../../auth/context/AuthContext";
import { getRoleMeta } from "../../../shared/utils/roleConfig";
import {
  changeOwnEmail,
  changeOwnPassword,
  getCampusesByInstitution,
  getOwnProfile,
  getProfileCatalogs,
  getStatesByCountry,
  updateOwnProfile,
} from "../api/profileApi";

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

const autocompleteFieldSx = {
  ...fieldSx,
  "& .MuiOutlinedInput-root": {
    ...fieldSx["& .MuiOutlinedInput-root"],
    py: 0.45,
    px: 1.1,
  },
  "& .MuiInputBase-input": {
    py: 0.75,
    fontSize: "0.92rem",
    "&::placeholder": { color: "#526176", opacity: 1 },
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

const emptyCatalogs = {
  countries: [],
  academic_levels: [],
  academic_statuses: [],
  institutions: [],
  dialing_codes: [],
  areas: [],
};

const emptyForm = {
  country: "",
  state: "",
  institution: "",
  campus: "",
  academic_level: "",
  academic_status: "",
  dialing_code: "",
  mobile_phone: "",
  phone: "",
  biography: "",
  area_ids: [],
};

function profileToForm(profile) {
  if (!profile) return emptyForm;
  return {
    country: profile.country ?? "",
    state: profile.state ?? "",
    institution: profile.institution ?? "",
    campus: profile.campus ?? "",
    academic_level: profile.academic_level ?? "",
    academic_status: profile.academic_status ?? "",
    dialing_code: profile.dialing_code ?? "",
    mobile_phone: profile.mobile_phone ?? "",
    phone: profile.phone ?? "",
    biography: profile.biography ?? "",
    area_ids: Array.isArray(profile.area_ids) ? [...profile.area_ids] : [],
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

function extractErrors(error, knownFields = []) {
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
    if (knownFields.includes(key)) {
      fields[key] = text;
    } else {
      generalParts.push(text);
    }
  }

  return {
    general:
      generalParts.join(" ") ||
      (Object.keys(fields).length > 0
        ? "Revisa los campos marcados antes de continuar."
        : "No se pudo completar la operación."),
    fields,
  };
}

const PROFILE_FIELD_KEYS = [
  "country",
  "state",
  "institution",
  "campus",
  "academic_level",
  "academic_status",
  "dialing_code",
  "mobile_phone",
  "phone",
  "biography",
  "profile_picture",
  "area_ids",
];

const BIOGRAPHY_MAX_WORDS = 500;

function countBiographyWords(text = "") {
  if (!text) return 0;
  const trimmed = text.trim();
  const realWords = trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
  // Un espacio simple o doble espacio NO cuenta como palabra;
  // 3 o más espacios/saltos consecutivos sí penalizan (1 palabra por cada 3) para evitar texto fantasma.
  const penaltyMatches = text.match(/[ \t]{3,}|\n{3,}/g) || [];
  const spacePenalties = penaltyMatches.reduce(
    (acc, run) => acc + Math.floor(run.length / 3),
    0,
  );
  return realWords + spacePenalties;
}

function isValidPhoneValue(value) {
  const trimmed = value.trim();
  if (!trimmed) return true;
  const digitsCount = trimmed.replace(/\D/g, "").length;
  return /^[0-9+\-\s()]{7,20}$/.test(trimmed) && digitsCount >= 7;
}

function arraysEqualAsSortedIds(a, b) {
  const left = [...(a || [])].map(Number).sort((x, y) => x - y);
  const right = [...(b || [])].map(Number).sort((x, y) => x - y);
  if (left.length !== right.length) return false;
  return left.every((val, idx) => val === right[idx]);
}

function AccountAccessDialog({ open, currentEmail, accessToken, onClose, onEmailUpdated, onPasswordUpdated }) {
  const [tab, setTab] = useState(0);

  // Cambio de correo
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailFieldErrors, setEmailFieldErrors] = useState({});

  // Cambio de contraseña
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [pwdFieldErrors, setPwdFieldErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setTab(0);
    setNewEmail("");
    setEmailPassword("");
    setShowEmailPassword(false);
    setEmailError("");
    setEmailFieldErrors({});
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setPwdError("");
    setPwdFieldErrors({});
  }, [open]);

  const buildPasswordAdornment = (visible, toggle, disabled) => (
    <InputAdornment position="end">
      <IconButton
        type="button"
        onClick={toggle}
        onMouseDown={(e) => e.preventDefault()}
        edge="end"
        disabled={disabled}
        aria-label={visible ? "Ocultar contraseña" : "Ver contraseña"}
        sx={{ color: "#526176" }}
      >
        {visible ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
      </IconButton>
    </InputAdornment>
  );

  const busy = emailBusy || pwdBusy;

  const handleEmailSubmit = async (event) => {
    event.preventDefault();
    if (emailBusy || !accessToken) return;

    const errors = {};
    if (!newEmail.trim()) errors.new_email = "Ingresa el nuevo correo electrónico.";
    if (!emailPassword) errors.current_password = "Ingresa tu contraseña actual para confirmar.";
    if (Object.keys(errors).length > 0) {
      setEmailFieldErrors(errors);
      return;
    }

    setEmailBusy(true);
    setEmailError("");
    setEmailFieldErrors({});
    try {
      await changeOwnEmail(accessToken, {
        new_email: newEmail.trim().toLowerCase(),
        current_password: emailPassword,
      });
      await onEmailUpdated();
      onClose();
    } catch (err) {
      const parsed = extractErrors(err, ["new_email", "current_password"]);
      setEmailFieldErrors(parsed.fields);
      setEmailError(parsed.general);
    } finally {
      setEmailBusy(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    if (pwdBusy || !accessToken) return;

    const errors = {};
    if (!currentPassword) errors.current_password = "Ingresa tu contraseña actual.";
    if (!newPassword || newPassword.length < 8) {
      errors.new_password = "La nueva contraseña debe tener al menos 8 caracteres.";
    }
    if (newPassword !== confirmPassword) {
      errors.new_password_confirm = "Las contraseñas no coinciden.";
    }
    if (Object.keys(errors).length > 0) {
      setPwdFieldErrors(errors);
      return;
    }

    setPwdBusy(true);
    setPwdError("");
    setPwdFieldErrors({});
    try {
      await changeOwnPassword(accessToken, {
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirm: confirmPassword,
      });
      onPasswordUpdated();
      onClose();
    } catch (err) {
      const parsed = extractErrors(err, [
        "current_password",
        "new_password",
        "new_password_confirm",
      ]);
      setPwdFieldErrors(parsed.fields);
      setPwdError(parsed.general);
    } finally {
      setPwdBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      fullWidth
      maxWidth="sm"
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
      <DialogTitle sx={{ pt: 3, px: 3.5, pb: 1.5, fontWeight: 800, fontSize: "1.2rem" }}>
        Configuración de acceso
        <Typography sx={{ mt: 0.4, color: "#94a3b8", fontSize: "0.82rem", fontWeight: 500 }}>
          Actualiza tu correo electrónico o contraseña de inicio de sesión.
        </Typography>
      </DialogTitle>

      <Box sx={{ px: 3.5, borderBottom: "1px solid rgba(255, 255, 255, 0.10)" }}>
        <Tabs
          value={tab}
          onChange={(_, next) => setTab(next)}
          sx={{
            "& .MuiTab-root": {
              color: "#94a3b8",
              textTransform: "none",
              fontWeight: 700,
              fontSize: "0.86rem",
            },
            "& .Mui-selected": { color: "#e7c77d !important" },
            "& .MuiTabs-indicator": { backgroundColor: "#e7c77d" },
          }}
        >
          <Tab label="Cambiar correo electrónico" disabled={busy} />
          <Tab label="Cambiar contraseña" disabled={busy} />
        </Tabs>
      </Box>

      {tab === 0 ? (
        <Box component="form" onSubmit={handleEmailSubmit} noValidate>
          <DialogContent sx={{ px: 3.5, pt: 2.5 }}>
            <Stack spacing={2}>
              {emailError && (
                <Alert severity="error" sx={{ borderRadius: "10px" }}>
                  {emailError}
                </Alert>
              )}

              <Box>
                <Typography sx={{ fontSize: "0.76rem", color: "#94a3b8", mb: 0.4 }}>
                  Correo electrónico actual
                </Typography>
                <Typography sx={{ fontSize: "0.9rem", color: "#e7c77d", fontWeight: 600 }}>
                  {currentEmail}
                </Typography>
              </Box>

              <Box>
                <Typography
                  component="label"
                  htmlFor="change-email-input"
                  sx={{ display: "block", mb: 0.6, fontSize: "0.84rem", fontWeight: 600, color: "#d6deeb" }}
                >
                  Nuevo correo electrónico *
                </Typography>
                <TextField
                  id="change-email-input"
                  type="email"
                  fullWidth
                  placeholder="nuevo.correo@institucion.edu.mx"
                  value={newEmail}
                  onChange={(e) => {
                    setNewEmail(e.target.value);
                    if (emailFieldErrors.new_email) setEmailFieldErrors((p) => ({ ...p, new_email: "" }));
                  }}
                  disabled={emailBusy}
                  error={Boolean(emailFieldErrors.new_email)}
                  helperText={emailFieldErrors.new_email}
                  sx={fieldSx}
                />
              </Box>

              <Box>
                <Typography
                  component="label"
                  htmlFor="change-email-password"
                  sx={{ display: "block", mb: 0.6, fontSize: "0.84rem", fontWeight: 600, color: "#d6deeb" }}
                >
                  Contraseña actual *
                </Typography>
                <TextField
                  id="change-email-password"
                  type={showEmailPassword ? "text" : "password"}
                  fullWidth
                  placeholder="Confirma tu contraseña actual"
                  value={emailPassword}
                  onChange={(e) => {
                    setEmailPassword(e.target.value);
                    if (emailFieldErrors.current_password) {
                      setEmailFieldErrors((p) => ({ ...p, current_password: "" }));
                    }
                  }}
                  disabled={emailBusy}
                  error={Boolean(emailFieldErrors.current_password)}
                  helperText={emailFieldErrors.current_password}
                  slotProps={{
                    input: {
                      endAdornment: buildPasswordAdornment(
                        showEmailPassword,
                        () => setShowEmailPassword((v) => !v),
                        emailBusy,
                      ),
                    },
                  }}
                  sx={fieldSx}
                />
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3.5, pb: 3, pt: 1.5 }}>
            <Button onClick={onClose} disabled={busy} sx={{ color: "#d6deeb", textTransform: "none" }}>
              Cancelar
            </Button>
            <Button type="submit" variant="contained" disabled={emailBusy} sx={goldButtonSx}>
              {emailBusy ? "Actualizando…" : "Actualizar correo"}
            </Button>
          </DialogActions>
        </Box>
      ) : (
        <Box component="form" onSubmit={handlePasswordSubmit} noValidate>
          <DialogContent sx={{ px: 3.5, pt: 2.5 }}>
            <Stack spacing={2}>
              {pwdError && (
                <Alert severity="error" sx={{ borderRadius: "10px" }}>
                  {pwdError}
                </Alert>
              )}

              <Box>
                <Typography
                  component="label"
                  htmlFor="current-password-input"
                  sx={{ display: "block", mb: 0.6, fontSize: "0.84rem", fontWeight: 600, color: "#d6deeb" }}
                >
                  Contraseña actual *
                </Typography>
                <TextField
                  id="current-password-input"
                  type={showCurrentPassword ? "text" : "password"}
                  fullWidth
                  placeholder="Tu contraseña actual"
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    if (pwdFieldErrors.current_password) {
                      setPwdFieldErrors((p) => ({ ...p, current_password: "" }));
                    }
                  }}
                  disabled={pwdBusy}
                  error={Boolean(pwdFieldErrors.current_password)}
                  helperText={pwdFieldErrors.current_password}
                  slotProps={{
                    input: {
                      endAdornment: buildPasswordAdornment(
                        showCurrentPassword,
                        () => setShowCurrentPassword((v) => !v),
                        pwdBusy,
                      ),
                    },
                  }}
                  sx={fieldSx}
                />
              </Box>

              <Box>
                <Typography
                  component="label"
                  htmlFor="new-password-input"
                  sx={{ display: "block", mb: 0.6, fontSize: "0.84rem", fontWeight: 600, color: "#d6deeb" }}
                >
                  Nueva contraseña *
                </Typography>
                <TextField
                  id="new-password-input"
                  type={showNewPassword ? "text" : "password"}
                  fullWidth
                  placeholder="Mínimo 8 caracteres"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (pwdFieldErrors.new_password) setPwdFieldErrors((p) => ({ ...p, new_password: "" }));
                  }}
                  disabled={pwdBusy}
                  error={Boolean(pwdFieldErrors.new_password)}
                  helperText={pwdFieldErrors.new_password}
                  slotProps={{
                    input: {
                      endAdornment: buildPasswordAdornment(
                        showNewPassword,
                        () => setShowNewPassword((v) => !v),
                        pwdBusy,
                      ),
                    },
                  }}
                  sx={fieldSx}
                />
              </Box>

              <Box>
                <Typography
                  component="label"
                  htmlFor="confirm-password-input"
                  sx={{ display: "block", mb: 0.6, fontSize: "0.84rem", fontWeight: 600, color: "#d6deeb" }}
                >
                  Confirmar nueva contraseña *
                </Typography>
                <TextField
                  id="confirm-password-input"
                  type={showConfirmPassword ? "text" : "password"}
                  fullWidth
                  placeholder="Repite la nueva contraseña"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (pwdFieldErrors.new_password_confirm) {
                      setPwdFieldErrors((p) => ({ ...p, new_password_confirm: "" }));
                    }
                  }}
                  disabled={pwdBusy}
                  error={Boolean(pwdFieldErrors.new_password_confirm)}
                  helperText={pwdFieldErrors.new_password_confirm}
                  slotProps={{
                    input: {
                      endAdornment: buildPasswordAdornment(
                        showConfirmPassword,
                        () => setShowConfirmPassword((v) => !v),
                        pwdBusy,
                      ),
                    },
                  }}
                  sx={fieldSx}
                />
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3.5, pb: 3, pt: 1.5 }}>
            <Button onClick={onClose} disabled={busy} sx={{ color: "#d6deeb", textTransform: "none" }}>
              Cancelar
            </Button>
            <Button type="submit" variant="contained" disabled={pwdBusy} sx={goldButtonSx}>
              {pwdBusy ? "Actualizando…" : "Actualizar contraseña"}
            </Button>
          </DialogActions>
        </Box>
      )}
    </Dialog>
  );
}

export default function ProfilePage() {
  const { user, accessToken, refreshUser } = useAuth();
  const fileInputRef = useRef(null);
  const previewUrlRef = useRef("");

  const [profile, setProfile] = useState(null);
  const [catalogs, setCatalogs] = useState(emptyCatalogs);
  const [states, setStates] = useState([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [campuses, setCampuses] = useState([]);
  const [loadingCampuses, setLoadingCampuses] = useState(false);

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
  const [accessDialogOpen, setAccessDialogOpen] = useState(false);

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

    async function fetchInitialData() {
      if (!accessToken) return;
      try {
        const [profileData, catalogsData] = await Promise.all([
          getOwnProfile(accessToken),
          getProfileCatalogs(accessToken),
        ]);
        if (cancelled) return;
        setProfile(profileData);
        setCatalogs({ ...emptyCatalogs, ...catalogsData });
        setForm(profileToForm(profileData));
        setLoadError("");
      } catch (error) {
        if (!cancelled) {
          setLoadError(extractErrors(error, PROFILE_FIELD_KEYS).general);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchInitialData();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  // Cargar estados dependientes del país seleccionado
  useEffect(() => {
    let cancelled = false;

    async function loadStates() {
      if (!accessToken || !form.country) {
        setStates([]);
        setLoadingStates(false);
        return;
      }
      setLoadingStates(true);
      try {
        const data = await getStatesByCountry(accessToken, form.country);
        if (!cancelled) {
          setStates(data);
        }
      } catch {
        if (!cancelled) {
          setStates([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingStates(false);
        }
      }
    }

    void loadStates();
    return () => {
      cancelled = true;
    };
  }, [accessToken, form.country]);

  // Cargar campus dependientes de la institución seleccionada
  useEffect(() => {
    let cancelled = false;

    async function loadCampuses() {
      if (!accessToken || !form.institution) {
        setCampuses([]);
        setLoadingCampuses(false);
        return;
      }
      setLoadingCampuses(true);
      try {
        const data = await getCampusesByInstitution(accessToken, form.institution);
        if (!cancelled) {
          setCampuses(data);
          // Si la institución solo tiene un campus único y aún no hay uno seleccionado, preseleccionarlo
          if (data.length === 1) {
            setForm((prev) =>
              String(prev.institution) === String(form.institution) && !prev.campus
                ? { ...prev, campus: data[0].id }
                : prev,
            );
          }
        }
      } catch {
        if (!cancelled) {
          setCampuses([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingCampuses(false);
        }
      }
    }

    void loadCampuses();
    return () => {
      cancelled = true;
    };
  }, [accessToken, form.institution]);

  const reloadProfile = async () => {
    if (!accessToken) return;
    setLoading(true);
    setLoadError("");
    try {
      const [profileData, catalogsData] = await Promise.all([
        getOwnProfile(accessToken),
        getProfileCatalogs(accessToken),
      ]);
      setProfile(profileData);
      setCatalogs({ ...emptyCatalogs, ...catalogsData });
      setForm(profileToForm(profileData));
      setSelectedFile(null);
      clearPreviewUrl();
      setRemoveExistingPhoto(false);
      setFieldErrors({});
      setSubmitError("");
    } catch (error) {
      setLoadError(extractErrors(error, PROFILE_FIELD_KEYS).general);
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
  const canManageEvaluatorAreas = Boolean(profile?.can_manage_evaluator_areas);

  const selectedCountryOption = useMemo(
    () => catalogs.countries.find((c) => String(c.id) === String(form.country)) || null,
    [catalogs.countries, form.country],
  );
  const selectedStateOption = useMemo(
    () => states.find((s) => String(s.id) === String(form.state)) || null,
    [states, form.state],
  );
  const selectedInstitutionOption = useMemo(
    () => catalogs.institutions.find((i) => String(i.id) === String(form.institution)) || null,
    [catalogs.institutions, form.institution],
  );
  const selectedCampusOption = useMemo(
    () => campuses.find((c) => String(c.id) === String(form.campus)) || null,
    [campuses, form.campus],
  );
  const selectedDialingOption = useMemo(
    () => catalogs.dialing_codes.find((d) => d.code === form.dialing_code) || null,
    [catalogs.dialing_codes, form.dialing_code],
  );
  const selectedAreaOptions = useMemo(() => {
    const selectedSet = new Set(form.area_ids.map(Number));
    return catalogs.areas.filter((a) => selectedSet.has(Number(a.id)));
  }, [catalogs.areas, form.area_ids]);

  const isDirty = useMemo(() => {
    if (!profile) return false;
    const base = profileToForm(profile);
    const formChanged =
      String(form.country) !== String(base.country) ||
      String(form.state) !== String(base.state) ||
      String(form.institution) !== String(base.institution) ||
      String(form.campus) !== String(base.campus) ||
      String(form.academic_level) !== String(base.academic_level) ||
      String(form.academic_status) !== String(base.academic_status) ||
      form.dialing_code !== base.dialing_code ||
      form.mobile_phone !== base.mobile_phone ||
      form.phone !== base.phone ||
      form.biography !== base.biography ||
      (canManageEvaluatorAreas && !arraysEqualAsSortedIds(form.area_ids, base.area_ids));
    return formChanged || Boolean(selectedFile) || removeExistingPhoto;
  }, [profile, form, selectedFile, removeExistingPhoto, canManageEvaluatorAreas]);

  const displayedPhoto = removeExistingPhoto
    ? ""
    : previewUrl || profile?.profile_picture || "";

  const clearFieldError = (field) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    }
    if (submitError) setSubmitError("");
  };

  const handleFieldChange = (field) => (event) => {
    const { value } = event.target;
    setForm((prev) => ({ ...prev, [field]: value }));
    clearFieldError(field);
  };

  const handleCountryChange = (_, option) => {
    const nextCountryId = option ? option.id : "";
    setForm((prev) => ({
      ...prev,
      country: nextCountryId,
      state: String(prev.country) === String(nextCountryId) ? prev.state : "",
    }));
    clearFieldError("country");
    clearFieldError("state");
  };

  const handleStateChange = (_, option) => {
    setForm((prev) => ({ ...prev, state: option ? option.id : "" }));
    clearFieldError("state");
  };

  const handleInstitutionChange = (_, option) => {
    const nextInstId = option ? option.id : "";
    setForm((prev) => ({
      ...prev,
      institution: nextInstId,
      campus: String(prev.institution) === String(nextInstId) ? prev.campus : "",
    }));
    clearFieldError("institution");
    clearFieldError("campus");
  };

  const handleCampusChange = (_, option) => {
    setForm((prev) => ({ ...prev, campus: option ? option.id : "" }));
    clearFieldError("campus");
  };

  const handleDialingChange = (_, option) => {
    setForm((prev) => ({ ...prev, dialing_code: option ? option.code : "" }));
    clearFieldError("dialing_code");
  };

  const handleAreasChange = (_, options) => {
    setForm((prev) => ({ ...prev, area_ids: options.map((opt) => opt.id) }));
    clearFieldError("area_ids");
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
    if (!form.country) errors.country = "Selecciona tu país de residencia.";
    if (!form.state) errors.state = "Selecciona tu estado de residencia.";
    if (!form.institution) errors.institution = "Selecciona tu institución de procedencia.";
    if (!form.campus) errors.campus = "Selecciona el campus correspondiente.";
    if (!form.academic_level) errors.academic_level = "Selecciona tu nivel académico.";
    if (!form.academic_status) errors.academic_status = "Indica si estás cursando o ya terminaste este grado.";
    if (!form.biography.trim()) {
      errors.biography = "La semblanza es obligatoria.";
    } else if (countBiographyWords(form.biography) > BIOGRAPHY_MAX_WORDS) {
      errors.biography = `La semblanza no puede superar las ${BIOGRAPHY_MAX_WORDS} palabras (los espacios triples o mayores cuentan como palabras adicionales).`;
    }

    // Lada y teléfonos son opcionales; solo validar formato si se capturaron
    if (form.mobile_phone.trim() && !isValidPhoneValue(form.mobile_phone)) {
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
        body.append("campus", String(form.campus));
        body.append("academic_level", String(form.academic_level));
        body.append("academic_status", String(form.academic_status));
        body.append("dialing_code", form.dialing_code.trim());
        body.append("mobile_phone", form.mobile_phone.trim());
        body.append("phone", form.phone.trim());
        body.append("biography", form.biography.trim());
        if (canManageEvaluatorAreas) {
          body.append("area_ids_json", JSON.stringify(form.area_ids.map(Number)));
        }
        body.append("profile_picture", selectedFile);
        payload = body;
      } else {
        payload = {
          state: Number(form.state),
          institution: Number(form.institution),
          campus: Number(form.campus),
          academic_level: Number(form.academic_level),
          academic_status: Number(form.academic_status),
          dialing_code: form.dialing_code.trim(),
          mobile_phone: form.mobile_phone.trim(),
          phone: form.phone.trim(),
          biography: form.biography.trim(),
          ...(canManageEvaluatorAreas ? { area_ids: form.area_ids.map(Number) } : {}),
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
      const parsed = extractErrors(error, PROFILE_FIELD_KEYS);
      setFieldErrors(parsed.fields);
      setSubmitError(parsed.general);
    } finally {
      setSaving(false);
    }
  };

  const isComplete = Boolean(profile?.is_complete);
  const biographyWordCount = useMemo(
    () => countBiographyWords(form.biography),
    [form.biography],
  );
  const remainingBiographyWords = BIOGRAPHY_MAX_WORDS - biographyWordCount;

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
          <Stack spacing={2}>
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
                    Completa los campos marcados con <strong>*</strong> (país, estado, institución, campus, nivel académico, estatus académico y semblanza) para completar tu perfil.
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
                    {/* País */}
                    <Box>
                      <Typography
                        component="label"
                        htmlFor="profile-country-autocomplete"
                        sx={{
                          display: "block",
                          mb: 0.8,
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          color: "#d6deeb",
                        }}
                      >
                        País *
                      </Typography>
                      <Autocomplete
                        id="profile-country-autocomplete"
                        options={catalogs.countries}
                        value={selectedCountryOption}
                        onChange={handleCountryChange}
                        getOptionLabel={(opt) => opt?.name || ""}
                        isOptionEqualToValue={(opt, val) => Number(opt.id) === Number(val.id)}
                        disabled={saving}
                        noOptionsText="Sin países coincidentes"
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            placeholder="Busca o selecciona un país"
                            error={Boolean(fieldErrors.country)}
                            helperText={fieldErrors.country}
                            sx={autocompleteFieldSx}
                          />
                        )}
                      />
                    </Box>

                    {/* Estado (dependiente de País) */}
                    <Box>
                      <Typography
                        component="label"
                        htmlFor="profile-state-autocomplete"
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
                      <Autocomplete
                        id="profile-state-autocomplete"
                        options={states}
                        value={selectedStateOption}
                        onChange={handleStateChange}
                        getOptionLabel={(opt) => opt?.name || ""}
                        isOptionEqualToValue={(opt, val) => Number(opt.id) === Number(val.id)}
                        disabled={saving || !form.country || loadingStates}
                        loading={loadingStates}
                        noOptionsText={
                          form.country
                            ? "No hay estados registrados para este país"
                            : "Selecciona primero un país"
                        }
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            placeholder={
                              !form.country
                                ? "Primero selecciona un país"
                                : loadingStates
                                  ? "Cargando estados…"
                                  : "Busca o selecciona un estado"
                            }
                            error={Boolean(fieldErrors.state)}
                            helperText={fieldErrors.state}
                            sx={autocompleteFieldSx}
                          />
                        )}
                      />
                    </Box>

                    {/* Nivel académico */}
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
                        {catalogs.academic_levels.map((item) => (
                          <MenuItem key={item.id} value={item.id}>
                            {item.degree}
                          </MenuItem>
                        ))}
                      </Select>
                      {fieldErrors.academic_level && (
                        <FormHelperText sx={{ color: "#f87171", mx: 0.25 }}>
                          {fieldErrors.academic_level}
                        </FormHelperText>
                      )}
                    </Box>

                    {/* Estatus académico (Cursando / Terminado) */}
                    <Box>
                      <Typography
                        component="label"
                        htmlFor="profile-status-select"
                        sx={{
                          display: "block",
                          mb: 0.8,
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          color: "#d6deeb",
                        }}
                      >
                        Estatus del grado *
                      </Typography>
                      <Select
                        id="profile-status-select"
                        fullWidth
                        displayEmpty
                        value={form.academic_status}
                        onChange={handleFieldChange("academic_status")}
                        disabled={saving}
                        error={Boolean(fieldErrors.academic_status)}
                        sx={selectSx}
                      >
                        <MenuItem value="">
                          <em>Cursando o terminado</em>
                        </MenuItem>
                        {catalogs.academic_statuses.map((item) => (
                          <MenuItem key={item.id} value={item.id}>
                            {item.name}
                          </MenuItem>
                        ))}
                      </Select>
                      {fieldErrors.academic_status && (
                        <FormHelperText sx={{ color: "#f87171", mx: 0.25 }}>
                          {fieldErrors.academic_status}
                        </FormHelperText>
                      )}
                    </Box>

                    {/* Institución */}
                    <Box>
                      <Typography
                        component="label"
                        htmlFor="profile-institution-autocomplete"
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
                      <Autocomplete
                        id="profile-institution-autocomplete"
                        options={catalogs.institutions}
                        value={selectedInstitutionOption}
                        onChange={handleInstitutionChange}
                        getOptionLabel={(opt) =>
                          opt ? (opt.acronym ? `${opt.name} (${opt.acronym})` : opt.name) : ""
                        }
                        isOptionEqualToValue={(opt, val) => Number(opt.id) === Number(val.id)}
                        disabled={saving}
                        noOptionsText="Sin instituciones coincidentes"
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            placeholder="Busca o selecciona tu institución"
                            error={Boolean(fieldErrors.institution)}
                            helperText={fieldErrors.institution}
                            sx={autocompleteFieldSx}
                          />
                        )}
                      />
                    </Box>

                    {/* Campus (dependiente de Institución) */}
                    <Box>
                      <Typography
                        component="label"
                        htmlFor="profile-campus-autocomplete"
                        sx={{
                          display: "block",
                          mb: 0.8,
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          color: "#d6deeb",
                        }}
                      >
                        Campus *
                      </Typography>
                      <Autocomplete
                        id="profile-campus-autocomplete"
                        options={campuses}
                        value={selectedCampusOption}
                        onChange={handleCampusChange}
                        getOptionLabel={(opt) =>
                          opt ? (opt.acronym ? `${opt.name} (${opt.acronym})` : opt.name) : ""
                        }
                        isOptionEqualToValue={(opt, val) => Number(opt.id) === Number(val.id)}
                        disabled={saving || !form.institution || loadingCampuses}
                        loading={loadingCampuses}
                        noOptionsText={
                          form.institution
                            ? "No hay campus registrados para esta institución"
                            : "Selecciona primero una institución"
                        }
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            placeholder={
                              !form.institution
                                ? "Primero selecciona una institución"
                                : loadingCampuses
                                  ? "Cargando campus…"
                                  : "Busca o selecciona un campus"
                            }
                            error={Boolean(fieldErrors.campus)}
                            helperText={fieldErrors.campus}
                            sx={autocompleteFieldSx}
                          />
                        )}
                      />
                    </Box>
                  </Box>
                </Box>

                {/* Sección condicional: Áreas de Evaluador */}
                {canManageEvaluatorAreas && (
                  <>
                    <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.10)" }} />
                    <Box>
                      <Typography
                        sx={{
                          color: "#e7c77d",
                          fontSize: "0.74rem",
                          fontWeight: 700,
                          letterSpacing: "0.18em",
                          textTransform: "uppercase",
                          mb: 0.6,
                        }}
                      >
                        Áreas de evaluación
                      </Typography>
                      <Typography sx={{ fontSize: "0.82rem", color: "#94a3b8", mb: 1.6 }}>
                        Selecciona las áreas temáticas en las que puedes evaluar trabajos del congreso.
                      </Typography>

                      <Autocomplete
                        multiple
                        id="profile-evaluator-areas-autocomplete"
                        options={catalogs.areas}
                        value={selectedAreaOptions}
                        onChange={handleAreasChange}
                        getOptionLabel={(opt) => `${opt.code} — ${opt.name}`}
                        isOptionEqualToValue={(opt, val) => Number(opt.id) === Number(val.id)}
                        disabled={saving}
                        noOptionsText="Sin áreas disponibles"
                        renderTags={(value, getTagProps) =>
                          value.map((option, index) => {
                            const { key, ...tagProps } = getTagProps({ index });
                            return (
                              <Chip
                                key={key}
                                label={`${option.code} · ${option.name}`}
                                size="small"
                                {...tagProps}
                                sx={{
                                  bgcolor: "rgba(16, 33, 56, 0.92)",
                                  color: "#e7c77d",
                                  border: "1px solid rgba(231, 199, 125, 0.55)",
                                  fontWeight: 700,
                                  "& .MuiChip-deleteIcon": {
                                    color: "#f2d99c",
                                    "&:hover": { color: "#ffffff" },
                                  },
                                }}
                              />
                            );
                          })
                        }
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            placeholder="Busca y selecciona una o más áreas"
                            error={Boolean(fieldErrors.area_ids)}
                            helperText={fieldErrors.area_ids}
                            sx={autocompleteFieldSx}
                          />
                        )}
                      />
                    </Box>
                  </>
                )}

                <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.10)" }} />

                {/* Sección 2: Información de Contacto (Opcional) */}
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
                    2. Información de contacto (opcional)
                  </Typography>

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1.1fr 1fr 1fr" },
                      gap: 2.2,
                    }}
                  >
                    <Box>
                      <Typography
                        component="label"
                        htmlFor="profile-lada-autocomplete"
                        sx={{
                          display: "block",
                          mb: 0.8,
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          color: "#d6deeb",
                        }}
                      >
                        Lada (opcional)
                      </Typography>
                      <Autocomplete
                        id="profile-lada-autocomplete"
                        options={catalogs.dialing_codes}
                        value={selectedDialingOption}
                        onChange={handleDialingChange}
                        getOptionLabel={(opt) =>
                          opt ? `${opt.code} · ${opt.country_name}` : ""
                        }
                        isOptionEqualToValue={(opt, val) =>
                          opt.code === val.code && opt.country_name === val.country_name
                        }
                        disabled={saving}
                        noOptionsText="Sin ladas coincidentes"
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            placeholder="Ej. +52 · México"
                            error={Boolean(fieldErrors.dialing_code)}
                            helperText={fieldErrors.dialing_code}
                            sx={autocompleteFieldSx}
                          />
                        )}
                      />
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
                        Teléfono móvil (opcional)
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

                {/* Sección 3: Semblanza (Obligatoria) */}
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
                      3. Semblanza *
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "0.76rem",
                        fontWeight: 700,
                        color:
                          remainingBiographyWords < 0
                            ? "#f87171"
                            : remainingBiographyWords <= 30
                              ? "#f59e0b"
                              : "#94a3b8",
                      }}
                    >
                      {remainingBiographyWords >= 0
                        ? `${remainingBiographyWords} palabras restantes`
                        : `Excediste el límite por ${Math.abs(remainingBiographyWords)} palabra${Math.abs(remainingBiographyWords) === 1 ? "" : "s"}`}
                    </Typography>
                  </Stack>

                  <TextField
                    id="profile-biography-input"
                    fullWidth
                    required
                    multiline
                    minRows={4}
                    placeholder="Describe brevemente tu trayectoria académica, líneas de investigación o áreas de interés (máximo 500 palabras)."
                    value={form.biography}
                    onChange={handleFieldChange("biography")}
                    disabled={saving}
                    error={Boolean(fieldErrors.biography) || remainingBiographyWords < 0}
                    helperText={
                      fieldErrors.biography ||
                      (remainingBiographyWords < 0
                        ? `La semblanza no puede superar las ${BIOGRAPHY_MAX_WORDS} palabras (los espacios triples o mayores cuentan como palabras adicionales).`
                        : "")
                    }
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

            {/* Enlace discreto al final del perfil para cambio de correo y contraseña */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                px: 1,
                pt: 0.5,
              }}
            >
              <Button
                type="button"
                size="small"
                startIcon={<LockOutlinedIcon sx={{ fontSize: "0.95rem !important" }} />}
                onClick={() => setAccessDialogOpen(true)}
                sx={{
                  color: "#94a3b8",
                  fontSize: "0.78rem",
                  fontWeight: 500,
                  textTransform: "none",
                  borderRadius: "8px",
                  px: 1.2,
                  "&:hover": {
                    color: "#e7c77d",
                    bgcolor: "rgba(255, 255, 255, 0.04)",
                  },
                }}
              >
                Configuración de acceso · Cambiar correo electrónico o contraseña
              </Button>
            </Box>
          </Stack>
        </Box>
      )}

      <AccountAccessDialog
        open={accessDialogOpen}
        currentEmail={user?.email || ""}
        accessToken={accessToken}
        onClose={() => setAccessDialogOpen(false)}
        onEmailUpdated={async () => {
          setToast("Correo electrónico actualizado correctamente.");
          if (refreshUser) {
            await refreshUser();
          }
        }}
        onPasswordUpdated={() => {
          setToast("Contraseña actualizada correctamente.");
        }}
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
