import { useCallback, useEffect, useMemo, useState } from "react";
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
  FormControl,
  InputLabel,
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
  if (doc.is_active) return { label: "Vigente", color: "success" };
  if (doc.has_acceptances) return { label: "Histórico", color: "default" };
  return { label: "No vigente", color: "warning" };
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
    setDraft(editing ? {
      type: editing.type,
      version: editing.version,
      name: editing.name,
      published_at: toLocalInputDate(editing.published_at),
      file: null,
    } : newDraft());
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
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <Box component="form" onSubmit={submit}>
        <DialogTitle>{editing ? "Editar documento" : "Nuevo documento legal"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <Alert severity="info">
              {editing
                ? "Los documentos vigentes o con aceptaciones no pueden editarse."
                : "El documento se guardará sin publicar. Los usuarios seguirán viendo la versión vigente."}
            </Alert>
            {error && <Alert severity="error">{error}</Alert>}
            <FormControl fullWidth required>
              <InputLabel id="legal-type-label">Tipo de documento</InputLabel>
              <Select
                labelId="legal-type-label"
                label="Tipo de documento"
                value={draft.type}
                onChange={(event) => change("type", event.target.value)}
                disabled={busy}
              >
                {Object.entries(TYPES).map(([type, name]) => (
                  <MenuItem key={type} value={type}>{name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              required
              label="Versión"
              placeholder="Ejemplo: 2"
              value={draft.version}
              onChange={(event) => change("version", event.target.value)}
              disabled={busy}
              inputProps={{ maxLength: 50 }}
            />
            <TextField
              required
              label="Nombre"
              value={draft.name}
              onChange={(event) => change("name", event.target.value)}
              disabled={busy}
              inputProps={{ maxLength: 255 }}
            />
            <TextField
              required
              label="Fecha prevista de publicación"
              type="datetime-local"
              value={draft.published_at}
              onChange={(event) => change("published_at", event.target.value)}
              disabled={busy}
              InputLabelProps={{ shrink: true }}
              helperText="La fecha se interpreta en la zona horaria de tu equipo. Publicar antes de esa fecha será rechazado."
            />
            <Box>
              <Typography component="label" htmlFor="legal-file" variant="body2" sx={{ display: "block", mb: 1 }}>
                Archivo {editing ? "(opcional; reemplaza el anterior)" : "(obligatorio)"}
              </Typography>
              <Box
                component="input"
                id="legal-file"
                type="file"
                accept=".pdf,.doc,.docx"
                required={!editing}
                disabled={busy}
                onChange={(event) => change("file", event.target.files?.[0] ?? null)}
                sx={{ maxWidth: "100%" }}
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={busy}>
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
      <Alert severity="warning">
        No tienes el privilegio documentos_legales.ver para consultar esta pantalla.
      </Alert>
    );
  }

  return (
    <Box sx={{ maxWidth: 1240, mx: "auto", textAlign: "left" }}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} sx={{ mb: 3 }}>
        <Box>
          <Typography component="h1" variant="h4" fontWeight={750}>Documentos legales</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Administra versiones, archivos y vigencias de términos y avisos de privacidad.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button startIcon={<RefreshOutlinedIcon />} onClick={refresh} disabled={loading || working}>
            Actualizar
          </Button>
          {can("crear") && (
            <Button variant="contained" startIcon={<AddOutlinedIcon />} onClick={() => {
              setEditing(null);
              setDialogError("");
              setFormOpen(true);
            }}>
              Nuevo documento
            </Button>
          )}
        </Stack>
      </Stack>

      <Alert severity="info" sx={{ mb: 2 }}>
        Crear o editar no publica automáticamente. Las versiones antiguas y sus aceptaciones se conservan.
      </Alert>
      {loadError && <Alert severity="error" sx={{ mb: 2 }}>{loadError}</Alert>}

      <Paper variant="outlined" sx={{ overflow: "hidden", borderRadius: 2 }}>
        {loading ? (
          <Box sx={{ p: 7, display: "grid", placeItems: "center" }}><CircularProgress /></Box>
        ) : docs.length === 0 ? (
          <Box sx={{ p: 5, textAlign: "center" }}>
            <Typography color="text.secondary">Todavía no hay documentos legales registrados.</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small" aria-label="Versiones de documentos legales" sx={{ minWidth: 800 }}>
              <TableHead sx={{ bgcolor: "action.hover" }}>
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
                    <TableRow hover key={doc.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={650}>{TYPES[doc.type] || doc.type}</Typography>
                        <Typography variant="caption" color="text.secondary">{doc.name}</Typography>
                      </TableCell>
                      <TableCell>{doc.version}</TableCell>
                      <TableCell>{formatDate(doc.published_at)}</TableCell>
                      <TableCell><Chip size="small" label={status.label} color={status.color} variant="outlined" /></TableCell>
                      <TableCell>
                        {doc.file ? (
                          <Button size="small" href={doc.file} target="_blank" rel="noopener noreferrer" endIcon={<OpenInNewOutlinedIcon />}>
                            Ver archivo
                          </Button>
                        ) : "Sin archivo"}
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          {editable && (
                            <Tooltip title="Editar borrador o documento no vigente">
                              <Button size="small" startIcon={<EditOutlinedIcon />} onClick={() => {
                                setEditing(doc);
                                setDialogError("");
                                setFormOpen(true);
                              }}>Editar</Button>
                            </Tooltip>
                          )}
                          {can("publicar") && !doc.is_active && (
                            <Button size="small" startIcon={<PublishOutlinedIcon />} onClick={() => setConfirmation({ action: "publish", doc })}>
                              Publicar
                            </Button>
                          )}
                          {can("desactivar") && doc.is_active && (
                            <Button size="small" color="warning" startIcon={<BlockOutlinedIcon />} onClick={() => setConfirmation({ action: "deactivate", doc })}>
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
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
        “No vigente” puede corresponder a un borrador o una versión desactivada. El backend conserva las aceptaciones históricas.
      </Typography>

      <DocumentFormDialog
        open={formOpen}
        editing={editing}
        busy={working}
        error={dialogError}
        onClose={() => { setFormOpen(false); setDialogError(""); }}
        onSave={submitDocument}
      />

      <Dialog open={Boolean(confirmation)} onClose={working ? undefined : () => setConfirmation(null)} fullWidth maxWidth="xs">
        <DialogTitle>{confirmation?.action === "publish" ? "¿Publicar esta versión?" : "¿Desactivar este documento?"}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {confirmation?.doc.name} · Versión {confirmation?.doc.version}
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Alert severity="warning">
            {confirmation?.action === "publish"
              ? "Al publicar, se sustituirá la versión vigente del mismo tipo. Si la fecha es futura, el backend rechazará la operación."
              : "Esta acción puede dejar sin documento vigente a los usuarios nuevos, impidiendo su registro hasta que se publique otra versión."}
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setConfirmation(null)} disabled={working}>Cancelar</Button>
          <Button
            variant="contained"
            color={confirmation?.action === "deactivate" ? "warning" : "primary"}
            onClick={performAction}
            disabled={working}
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
