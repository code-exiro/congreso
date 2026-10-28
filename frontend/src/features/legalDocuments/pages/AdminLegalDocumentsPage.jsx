import { useCallback, useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import PublishOutlinedIcon from "@mui/icons-material/PublishOutlined";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import { useAuth } from "../../auth/context/AuthContext";
import {
  createAdminLegalDocument,
  deactivateAdminLegalDocument,
  listAdminLegalDocuments,
  publishAdminLegalDocument,
  updateAdminLegalDocument,
} from "../api/legalDocumentsApi";

const TYPES = {
  TERMS: "Términos y condiciones",
  PRIVACY_NOTICE: "Aviso de privacidad",
};

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
    py: 1.4,
    fontSize: "0.92rem",
    "&::placeholder": { color: "#526176", opacity: 1 },
  },
  "& .MuiFormHelperText-root": {
    color: "#d6deeb",
    fontSize: "0.75rem",
    mx: 0.25,
  },
};

function toLocalInputDate(value = new Date()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

function formatDate(iso) {
  if (!iso) return "Sin fecha";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Fecha no válida";
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
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
        .map(([key, item]) => (key === "non_field_errors" || key === "detail" ? "" : `${key}: `) + textOf(item))
        .join(" ");
    }
    return String(value ?? "");
  }
  return textOf(data) || "No se pudo completar la operación.";
}

function statusOf(doc) {
  if (doc.is_active) {
    return {
      label: "Vigente",
      sx: {
        bgcolor: "rgba(34, 197, 94, 0.14)",
        color: "#4ade80",
        borderColor: "rgba(74, 222, 128, 0.35)",
        fontWeight: 700,
      },
    };
  }
  if (doc.has_acceptances) {
    return {
      label: "Histórico",
      sx: {
        bgcolor: "rgba(148, 163, 184, 0.14)",
        color: "#cbd5e1",
        borderColor: "rgba(203, 213, 225, 0.28)",
        fontWeight: 600,
      },
    };
  }
  return {
    label: "No vigente",
    sx: {
      bgcolor: "rgba(231, 199, 125, 0.14)",
      color: "#e7c77d",
      borderColor: "rgba(231, 199, 125, 0.35)",
      fontWeight: 700,
    },
  };
}

function newDraft() {
  return {
    type: "TERMS",
    version: "",
    name: "",
    published_at: toLocalInputDate(),
    file: null,
  };
}

function DocumentFormDialog({ open, editing, busy, error, onClose, onSave }) {
  const [draft, setDraft] = useState(newDraft);

  useEffect(() => {
    if (!open) return;
    setDraft(
      editing
        ? {
            type: editing.type,
            version: editing.version,
            name: editing.name,
            published_at: toLocalInputDate(editing.published_at),
            file: null,
          }
        : newDraft(),
    );
  }, [open, editing]);

  function change(name, value) {
    setDraft((previous) => ({ ...previous, [name]: value }));
  }

  function submit(event) {
    event.preventDefault();
    if (!draft.type || !draft.version.trim() || !draft.name.trim() || !draft.published_at) return;
    if (!editing && !draft.file) return;
    const date = new Date(draft.published_at);
    if (Number.isNaN(date.getTime())) return;

    const body = new FormData();
    body.append("type", draft.type);
    body.append("version", draft.version.trim());
    body.append("name", draft.name.trim());
    body.append("published_at", date.toISOString());
    if (draft.file) body.append("file", draft.file);
    onSave(body);
  }

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
      <Box component="form" onSubmit={submit}>
        <DialogTitle
          sx={{
            pt: 3,
            px: 3.5,
            fontWeight: 800,
            fontSize: "1.4rem",
            letterSpacing: "-0.02em",
            color: "#ffffff",
          }}
        >
          {editing ? "Editar documento" : "Nuevo documento legal"}
        </DialogTitle>
        <DialogContent sx={{ px: 3.5 }}>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <Alert
              severity="info"
              sx={{
                borderRadius: "12px",
                bgcolor: "rgba(56, 189, 248, 0.10)",
                color: "#e0f2fe",
                border: "1px solid rgba(56, 189, 248, 0.25)",
                "& .MuiAlert-icon": { color: "#38bdf8" },
              }}
            >
              {editing
                ? "Los documentos vigentes o con aceptaciones no pueden editarse."
                : "El documento se guardará sin publicar. Los usuarios seguirán viendo la versión vigente."}
            </Alert>
            {error && (
              <Alert severity="error" sx={{ borderRadius: "12px" }}>
                {error}
              </Alert>
            )}

            <Box>
              <Typography
                component="label"
                htmlFor="legal-type-select"
                sx={{ display: "block", mb: 1, fontSize: "0.85rem", fontWeight: 600, color: "#d6deeb" }}
              >
                Tipo de documento *
              </Typography>
              <Select
                id="legal-type-select"
                fullWidth
                required
                value={draft.type}
                onChange={(event) => change("type", event.target.value)}
                disabled={busy}
                sx={{
                  color: "#102138",
                  bgcolor: "#f6f8fc",
                  borderRadius: "8px",
                  "& .MuiOutlinedInput-notchedOutline": { borderColor: "transparent" },
                  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#c7a65b" },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#e7c77d", borderWidth: 2 },
                }}
              >
                {Object.entries(TYPES).map(([type, name]) => (
                  <MenuItem key={type} value={type}>
                    {name}
                  </MenuItem>
                ))}
              </Select>
            </Box>

            <Box>
              <Typography
                component="label"
                htmlFor="legal-version"
                sx={{ display: "block", mb: 1, fontSize: "0.85rem", fontWeight: 600, color: "#d6deeb" }}
              >
                Versión *
              </Typography>
              <TextField
                id="legal-version"
                required
                fullWidth
                placeholder="Ejemplo: 2"
                value={draft.version}
                onChange={(event) => change("version", event.target.value)}
                disabled={busy}
                inputProps={{ maxLength: 50 }}
                sx={fieldSx}
              />
            </Box>

            <Box>
              <Typography
                component="label"
                htmlFor="legal-name"
                sx={{ display: "block", mb: 1, fontSize: "0.85rem", fontWeight: 600, color: "#d6deeb" }}
              >
                Nombre *
              </Typography>
              <TextField
                id="legal-name"
                required
                fullWidth
                placeholder="Nombre descriptivo del documento"
                value={draft.name}
                onChange={(event) => change("name", event.target.value)}
                disabled={busy}
                inputProps={{ maxLength: 255 }}
                sx={fieldSx}
              />
            </Box>

            <Box>
              <Typography
                component="label"
                htmlFor="legal-published-at"
                sx={{ display: "block", mb: 1, fontSize: "0.85rem", fontWeight: 600, color: "#d6deeb" }}
              >
                Fecha prevista de publicación *
              </Typography>
              <TextField
                id="legal-published-at"
                required
                fullWidth
                type="datetime-local"
                value={draft.published_at}
                onChange={(event) => change("published_at", event.target.value)}
                disabled={busy}
                helperText="La fecha se interpreta en la zona horaria de tu equipo. Publicar antes de esa fecha será rechazado."
                sx={fieldSx}
              />
            </Box>

            <Box>
              <Typography
                component="label"
                htmlFor="legal-file"
                sx={{ display: "block", mb: 1, fontSize: "0.85rem", fontWeight: 600, color: "#d6deeb" }}
              >
                Archivo {editing ? "(opcional; reemplaza el anterior)" : "(obligatorio) *"}
              </Typography>
              <Box
                component="input"
                id="legal-file"
                type="file"
                accept=".pdf,.doc,.docx"
                required={!editing}
                disabled={busy}
                onChange={(event) => change("file", event.target.files?.[0] ?? null)}
                sx={{
                  maxWidth: "100%",
                  color: "#d6deeb",
                  fontSize: "0.875rem",
                  "&::file-selector-button": {
                    mr: 2,
                    py: 1,
                    px: 2,
                    borderRadius: "8px",
                    border: "1px solid rgba(231, 199, 125, 0.45)",
                    bgcolor: "rgba(231, 199, 125, 0.12)",
                    color: "#e7c77d",
                    fontWeight: 700,
                    cursor: "pointer",
                  },
                }}
              />
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
            {busy ? "Guardando…" : editing ? "Guardar cambios" : "Crear borrador"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

export default function AdminLegalDocumentsPage() {
  const { user, accessToken } = useAuth();
  const privileges = useMemo(() => new Set(user?.privileges ?? []), [user?.privileges]);
  const can = (action) => privileges.has(`documentos_legales.${action}`);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [dialogError, setDialogError] = useState("");
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [toast, setToast] = useState("");

  const refresh = useCallback(async () => {
    setLoadError("");
    setLoading(true);
    try {
      const data = await listAdminLegalDocuments(accessToken);
      if (!Array.isArray(data)) throw new Error("Formato de respuesta inesperado.");
      setDocs(data);
    } catch (error) {
      setLoadError(responseError(error));
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (can("ver") && accessToken) refresh();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, refresh, user?.privileges]);

  async function submitDocument(formData) {
    setDialogError("");
    setWorking(true);
    try {
      if (editing) {
        await updateAdminLegalDocument(accessToken, editing.id, formData);
      } else {
        await createAdminLegalDocument(accessToken, formData);
      }
      setFormOpen(false);
      setToast(editing ? "Documento actualizado." : "Borrador creado correctamente.");
      await refresh();
    } catch (error) {
      setDialogError(responseError(error));
    } finally {
      setWorking(false);
    }
  }

  async function performAction() {
    if (!confirmation) return;
    setWorking(true);
    setLoadError("");
    try {
      if (confirmation.action === "publish") {
        await publishAdminLegalDocument(accessToken, confirmation.doc.id);
      } else {
        await deactivateAdminLegalDocument(accessToken, confirmation.doc.id);
      }
      setToast(confirmation.action === "publish" ? "Documento publicado." : "Documento desactivado.");
      setConfirmation(null);
      await refresh();
    } catch (error) {
      setLoadError(responseError(error));
      setConfirmation(null);
    } finally {
      setWorking(false);
    }
  }

  if (!can("ver")) {
    return (
      <Box sx={{ width: "100%", textAlign: "left" }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 4 },
            color: "#ffffff",
            bgcolor: "rgba(10, 24, 42, 0.78)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "20px",
            boxShadow: "0 24px 70px rgba(0, 0, 0, 0.25)",
          }}
        >
          <Alert
            severity="warning"
            sx={{
              borderRadius: "14px",
              bgcolor: "rgba(231, 199, 125, 0.12)",
              color: "#f2d99c",
              border: "1px solid rgba(231, 199, 125, 0.35)",
              "& .MuiAlert-icon": { color: "#e7c77d" },
              mb: 3,
            }}
          >
            Acceso restringido: no cuentas con permisos para consultar o administrar documentos legales. Esta sección está reservada para administradores.
          </Alert>
          <Button
            component={RouterLink}
            to="/"
            variant="contained"
            sx={goldButtonSx}
          >
            Volver al inicio
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", textAlign: "left" }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, sm: 4 },
          mb: 3,
          color: "#ffffff",
          bgcolor: "rgba(10, 24, 42, 0.78)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "20px",
          boxShadow: "0 24px 70px rgba(0, 0, 0, 0.25)",
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2.5}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", sm: "center" }}
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
              Configuraciones · Gestión Normativa
            </Typography>
            <Typography
              component="h1"
              sx={{
                fontSize: { xs: "1.8rem", sm: "2.3rem" },
                fontWeight: 800,
                letterSpacing: "-0.035em",
                color: "#ffffff",
              }}
            >
              Documentos legales
            </Typography>
            <Typography sx={{ mt: 0.75, color: "#d6deeb", fontSize: "0.95rem" }}>
              Administra versiones, archivos y vigencias de términos y avisos de privacidad.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.5} sx={{ flexShrink: 0 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshOutlinedIcon />}
              onClick={refresh}
              disabled={loading || working}
              sx={outlineGoldButtonSx}
            >
              Actualizar
            </Button>
            {can("crear") && (
              <Button
                variant="contained"
                startIcon={<AddOutlinedIcon />}
                onClick={() => {
                  setEditing(null);
                  setDialogError("");
                  setFormOpen(true);
                }}
                sx={goldButtonSx}
              >
                Nuevo documento
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>

      <Alert
        severity="info"
        sx={{
          mb: 2.5,
          borderRadius: "14px",
          bgcolor: "rgba(10, 24, 42, 0.78)",
          backdropFilter: "blur(16px)",
          color: "#d6deeb",
          border: "1px solid rgba(231, 199, 125, 0.28)",
          "& .MuiAlert-icon": { color: "#e7c77d" },
        }}
      >
        Crear o editar no publica automáticamente. Las versiones antiguas y sus aceptaciones se conservan.
      </Alert>

      {loadError && (
        <Alert severity="error" sx={{ mb: 2.5, borderRadius: "14px" }}>
          {loadError}
        </Alert>
      )}

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
        {loading ? (
          <Box sx={{ p: 7, display: "grid", placeItems: "center" }}>
            <CircularProgress sx={{ color: "#e7c77d" }} />
          </Box>
        ) : docs.length === 0 ? (
          <Box sx={{ p: 6, textAlign: "center" }}>
            <Typography sx={{ color: "#d6deeb", fontSize: "0.95rem" }}>
              Todavía no hay documentos legales registrados.
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table
              size="medium"
              aria-label="Versiones de documentos legales"
              sx={{
                minWidth: 800,
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
                  <TableCell>Documento</TableCell>
                  <TableCell>Versión</TableCell>
                  <TableCell>Publicación</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Archivo</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {docs.map((doc) => {
                  const status = statusOf(doc);
                  const editable = can("editar") && !doc.is_active && !doc.has_acceptances;
                  return (
                    <TableRow
                      key={doc.id}
                      sx={{
                        transition: "background-color 0.15s ease",
                        "&:hover": { bgcolor: "rgba(255, 255, 255, 0.04)" },
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: "#ffffff" }}>
                          {TYPES[doc.type] || doc.type}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                          {doc.name}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: "#ffffff !important" }}>
                        {doc.version}
                      </TableCell>
                      <TableCell>{formatDate(doc.published_at)}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={status.label}
                          variant="outlined"
                          sx={status.sx}
                        />
                      </TableCell>
                      <TableCell>
                        {doc.file ? (
                          <Button
                            size="small"
                            href={doc.file}
                            target="_blank"
                            rel="noopener noreferrer"
                            endIcon={<OpenInNewOutlinedIcon />}
                            sx={{
                              color: "#e7c77d",
                              textTransform: "none",
                              fontWeight: 700,
                              "&:hover": { bgcolor: "rgba(231, 199, 125, 0.12)" },
                            }}
                          >
                            Ver archivo
                          </Button>
                        ) : (
                          "Sin archivo"
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          {editable && (
                            <Tooltip title="Editar borrador o documento no vigente">
                              <Button
                                size="small"
                                startIcon={<EditOutlinedIcon />}
                                onClick={() => {
                                  setEditing(doc);
                                  setDialogError("");
                                  setFormOpen(true);
                                }}
                                sx={{
                                  color: "#d6deeb",
                                  textTransform: "none",
                                  fontWeight: 600,
                                  "&:hover": { color: "#e7c77d", bgcolor: "rgba(255, 255, 255, 0.06)" },
                                }}
                              >
                                Editar
                              </Button>
                            </Tooltip>
                          )}
                          {can("publicar") && !doc.is_active && (
                            <Button
                              size="small"
                              startIcon={<PublishOutlinedIcon />}
                              onClick={() => setConfirmation({ action: "publish", doc })}
                              sx={{
                                color: "#e7c77d",
                                textTransform: "none",
                                fontWeight: 700,
                                "&:hover": { bgcolor: "rgba(231, 199, 125, 0.14)" },
                              }}
                            >
                              Publicar
                            </Button>
                          )}
                          {can("desactivar") && doc.is_active && (
                            <Button
                              size="small"
                              startIcon={<BlockOutlinedIcon />}
                              onClick={() => setConfirmation({ action: "deactivate", doc })}
                              sx={{
                                color: "#fbbf24",
                                textTransform: "none",
                                fontWeight: 700,
                                "&:hover": { bgcolor: "rgba(251, 191, 36, 0.14)" },
                              }}
                            >
                              Desactivar
                            </Button>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Typography
        variant="caption"
        sx={{ display: "block", mt: 1.5, color: "#94a3b8", px: 1 }}
      >
        “No vigente” puede corresponder a un borrador o una versión desactivada. El backend conserva las aceptaciones históricas.
      </Typography>

      <DocumentFormDialog
        open={formOpen}
        editing={editing}
        busy={working}
        error={dialogError}
        onClose={() => {
          setFormOpen(false);
          setDialogError("");
        }}
        onSave={submitDocument}
      />

      <Dialog
        open={Boolean(confirmation)}
        onClose={working ? undefined : () => setConfirmation(null)}
        fullWidth
        maxWidth="xs"
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
        <DialogTitle sx={{ fontWeight: 800, color: "#ffffff", pt: 3 }}>
          {confirmation?.action === "publish" ? "¿Publicar esta versión?" : "¿Desactivar este documento?"}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: "#d6deeb", fontWeight: 600 }}>
            {confirmation?.doc.name} · Versión {confirmation?.doc.version}
          </Typography>
          <Divider sx={{ my: 2, borderColor: "rgba(255, 255, 255, 0.10)" }} />
          <Alert severity="warning" sx={{ borderRadius: "12px" }}>
            {confirmation?.action === "publish"
              ? "Al publicar, se sustituirá la versión vigente del mismo tipo. Si la fecha es futura, el backend rechazará la operación."
              : "Esta acción puede dejar sin documento vigente a los usuarios nuevos, impidiendo su registro hasta que se publique otra versión."}
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={() => setConfirmation(null)}
            disabled={working}
            sx={{ color: "#d6deeb", textTransform: "none", fontWeight: 600 }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={performAction}
            disabled={working}
            sx={goldButtonSx}
          >
            {working ? "Procesando…" : "Confirmar"}
          </Button>
        </DialogActions>
      </Dialog>

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
