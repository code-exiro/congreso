import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  LinearProgress,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";

import { useAuth } from "../../auth/context/AuthContext";
import { abrirArchivo, asignarEvaluador, dictaminarSolicitud, listarEvaluadores, listarTodasSolicitudes, mensajeError, quitarEvaluador } from "../api/solicitudesApi";

const glassPaperSx = {
  color: "#ffffff",
  bgcolor: "rgba(10, 24, 42, 0.78)",
  backdropFilter: "blur(16px)",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderRadius: "20px",
  boxShadow: "0 24px 70px rgba(0, 0, 0, 0.25)",
};

const goldButtonSx = {
  bgcolor: "#e7c77d",
  color: "#102138",
  borderRadius: "10px",
  fontWeight: 800,
  textTransform: "none",
  boxShadow: "none",
  "&:hover": { bgcolor: "#f2d99c", boxShadow: "none" },
};

const fieldSx = {
  minWidth: 180,
  "& .MuiInputBase-root": { color: "#fff" },
  "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.7)" },
  "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.25)" },
  "& .MuiSvgIcon-root": { color: "#fff" },
};

const etiquetaFase = (nombre) =>
  nombre.replaceAll(" ", "_") === "extenso_rechazado" ? "extenso: debe modificarse" : nombre.replaceAll("_", " ");

function colorFase(nombre) {
  if (nombre.includes("aprobad")) return "success";
  if (nombre.replaceAll(" ", "_") === "extenso_rechazado") return "warning";
  if (nombre.includes("rechazad")) return "error";
  if (nombre.includes("evaluacion")) return "warning";
  return "default";
}

export default function ListadoSolicitudesPage({ soloActivos = false }) {
  const { accessToken } = useAuth();
  const [datos, setDatos] = useState(null);
  const [filtros, setFiltros] = useState({ congreso: "", actividad: "", fase: "", q: "" });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [dictamen, setDictamen] = useState(null); // { solicitud, accion }
  const [observaciones, setObservaciones] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [errorDictamen, setErrorDictamen] = useState("");
  const [asignando, setAsignando] = useState(null); // solicitud
  const [evaluadores, setEvaluadores] = useState([]);
  const [evaluadorSel, setEvaluadorSel] = useState("");
  const [fechaLimite, setFechaLimite] = useState("");
  const [errorAsignar, setErrorAsignar] = useState("");

  const abrirAsignar = async (solicitud) => {
    setAsignando(solicitud);
    setEvaluadorSel("");
    setFechaLimite("");
    setErrorAsignar("");
    try {
      setEvaluadores(await listarEvaluadores(accessToken, solicitud.congreso.id));
    } catch (e) {
      setErrorAsignar(mensajeError(e));
    }
  };

  const reemplazar = (nueva) => {
    setDatos((d) => ({ ...d, resultados: d.resultados.map((r) => (r.id === nueva.id ? nueva : r)) }));
    setAsignando((a) => (a && a.id === nueva.id ? nueva : a));
  };

  const confirmarAsignar = async () => {
    setEnviando(true);
    setErrorAsignar("");
    try {
      reemplazar(await asignarEvaluador(accessToken, asignando.id, evaluadorSel, fechaLimite));
      setEvaluadorSel("");
    } catch (e) {
      setErrorAsignar(mensajeError(e));
    } finally {
      setEnviando(false);
    }
  };

  const quitar = async (solicitud, evaluador) => {
    setErrorAsignar("");
    try {
      reemplazar(await quitarEvaluador(accessToken, solicitud.id, evaluador));
    } catch (e) {
      setErrorAsignar(mensajeError(e));
    }
  };

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      setDatos(await listarTodasSolicitudes(accessToken, { ...filtros, activos: soloActivos ? 1 : "" }));
    } catch (e) {
      setError(mensajeError(e, "No se pudieron cargar las solicitudes."));
    } finally {
      setCargando(false);
    }
  }, [accessToken, filtros, soloActivos]);

  useEffect(() => {
    const t = setTimeout(cargar, 250);
    return () => clearTimeout(t);
  }, [cargar]);

  const cambiar = (campo) => (e) => setFiltros((f) => ({ ...f, [campo]: e.target.value }));

  const abrirDictamen = (solicitud, accion) => {
    setDictamen({ solicitud, accion });
    setObservaciones("");
    setErrorDictamen("");
  };

  const confirmar = async () => {
    setEnviando(true);
    setErrorDictamen("");
    try {
      await dictaminarSolicitud(accessToken, dictamen.solicitud.id, dictamen.accion.accion, observaciones);
      setDictamen(null);
      await cargar();
    } catch (e) {
      setErrorDictamen(mensajeError(e));
    } finally {
      setEnviando(false);
    }
  };

  const resultados = datos?.resultados ?? [];

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Paper elevation={0} sx={{ ...glassPaperSx, p: { xs: 2.5, md: 4 }, mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h4" fontWeight={800}>{soloActivos ? "Trabajos activos" : "Listado de solicitudes"}</Typography>
            <Typography sx={{ opacity: 0.8 }}>
              {soloActivos
                ? "Trabajos con resumen aceptado: revisa su avance, descarga los archivos enviados y asigna evaluadores."
                : "Resúmenes recibidos de todos los ponentes. Pásalos a revisión, apruébalos o recházalos con observaciones."}
            </Typography>
          </Box>
          <Button startIcon={<RefreshOutlinedIcon />} onClick={cargar} sx={{ color: "#e7c77d", textTransform: "none" }}>
            Actualizar
          </Button>
        </Stack>

        <Stack direction="row" flexWrap="wrap" gap={2} sx={{ mt: 3 }}>
          <TextField size="small" label="Buscar (título, clave, autor)" value={filtros.q} onChange={cambiar("q")} sx={{ ...fieldSx, minWidth: 260 }} />
          <TextField select size="small" label="Congreso" value={filtros.congreso} onChange={cambiar("congreso")} sx={fieldSx}>
            <MenuItem value="">Todos</MenuItem>
            {datos?.filtros.congresos.map((c) => <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Tipo de trabajo" value={filtros.actividad} onChange={cambiar("actividad")} sx={fieldSx}>
            <MenuItem value="">Todos</MenuItem>
            {datos?.filtros.actividades.map((a) => <MenuItem key={a.id} value={a.id}>{a.nombre}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Fase" value={filtros.fase} onChange={cambiar("fase")} sx={fieldSx}>
            <MenuItem value="">Todas</MenuItem>
            {datos?.filtros.fases.map((f) => <MenuItem key={f} value={f}>{etiquetaFase(f)}</MenuItem>)}
          </TextField>
        </Stack>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {cargando && !datos ? (
        <Box sx={{ textAlign: "center", py: 6 }}><CircularProgress sx={{ color: "#e7c77d" }} /></Box>
      ) : resultados.length === 0 ? (
        <Paper elevation={0} sx={{ ...glassPaperSx, p: 4, textAlign: "center" }}>
          <Typography>{soloActivos ? "Todavía no hay trabajos activos con esos filtros." : "No hay solicitudes que coincidan con los filtros."}</Typography>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {resultados.map((s) => (
            <Paper key={s.id} elevation={0} sx={{ ...glassPaperSx, p: 3 }}>
              <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center" sx={{ mb: 1 }}>
                <Chip size="small" label={s.clave} sx={{ bgcolor: "rgba(231,199,125,0.2)", color: "#e7c77d", fontWeight: 700 }} />
                <Chip size="small" label={s.actividad.nombre} variant="outlined" sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.4)" }} />
                <Chip size="small" label={etiquetaFase(s.fase.nombre)} color={colorFase(s.fase.nombre)} />
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                  {s.congreso.nombre} {s.congreso.edicion} · {s.area.nombre}
                </Typography>
              </Stack>
              <Typography variant="h6" fontWeight={800} sx={{ overflowWrap: "anywhere" }}>{s.titulo}</Typography>
              {soloActivos && s.progreso && (
                <Box sx={{ my: 1 }}>
                  <Typography variant="caption" sx={{ opacity: 0.75 }}>
                    Avance: paso {s.progreso.actual} de {s.progreso.total} ({s.progreso.porcentaje}%)
                  </Typography>
                  <LinearProgress variant="determinate" value={s.progreso.porcentaje}
                    sx={{ height: 8, borderRadius: 4, bgcolor: "rgba(255,255,255,0.12)", "& .MuiLinearProgress-bar": { bgcolor: "#e7c77d" } }} />
                </Box>
              )}
              <Typography variant="body2" sx={{ opacity: 0.75, mb: 1 }}>
                {s.autores.map((a) => `${a.nombre || a.correo}${a.es_autor ? "" : " (coautor)"}`).join(", ")}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, whiteSpace: "pre-wrap", overflowWrap: "anywhere", wordBreak: "break-word" }}>{s.resumen}</Typography>
              {s.palabras_clave && (
                <Typography variant="caption" sx={{ display: "block", mt: 1, opacity: 0.7, overflowWrap: "anywhere" }}>Palabras clave: {s.palabras_clave}</Typography>
              )}
              <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center" sx={{ mt: 1.5 }}>
                <Typography variant="caption" sx={{ opacity: 0.7 }}>Evaluadores ({s.evaluadores.length}/{s.evaluadores_requeridos}):</Typography>
                {s.evaluadores.map((e) => (
                  <Chip key={e.id} size="small" label={`${e.nombre}${e.dictamen ? ` · ${e.dictamen.replaceAll("_", " ")}` : " · pendiente"}`}
                    color={e.dictamen ? "success" : "default"} variant={e.dictamen ? "filled" : "outlined"} sx={e.dictamen ? undefined : { color: "#fff", borderColor: "rgba(255,255,255,0.4)" }} />
                ))}
                {s.espera_evaluador && <Chip size="small" color="warning" label={`Falta asignar al evaluador ${s.evaluadores.length + 1}`} />}
                <Button size="small" onClick={() => abrirAsignar(s)} sx={{ textTransform: "none", color: "#e7c77d" }}>
                  Gestionar evaluadores
                </Button>
              </Stack>
              {s.extenso && (
                <Button size="small" sx={{ mt: 1, textTransform: "none", color: "#e7c77d" }}
                  onClick={() => abrirArchivo(accessToken, `/trabajos/solicitudes/${s.id}/extenso/`).catch((e) => setError(mensajeError(e)))}>
                  Ver extenso: {s.extenso.nombre}
                </Button>
              )}
              {s.observaciones && <Alert severity="info" sx={{ mt: 1.5, whiteSpace: "pre-line" }}>Observaciones: {s.observaciones}</Alert>}
              {s.acciones.length > 0 && (
                <Typography variant="caption" sx={{ display: "block", mt: 2, opacity: 0.7 }}>
                  {s.fase.nombre === "resumen_enviado" || s.fase.nombre === "extenso_enviado"
                    ? "Lee el trabajo y asigna un evaluador en «Gestionar evaluadores»: con eso queda aprobado para evaluación."
                    : "El evaluador asignado decide por su cuenta. Usa estas acciones solo si hace falta intervenir."}
                </Typography>
              )}
              {s.acciones.length > 0 && (
                <Stack direction="row" gap={1} sx={{ mt: 0.5 }} flexWrap="wrap">
                  {s.acciones.map((a) => (
                    <Button
                      key={a.accion}
                      size="small"
                      variant={a.accion.startsWith("aprobar") ? "contained" : "outlined"}
                      color={a.accion.startsWith("rechazar") ? "error" : "inherit"}
                      sx={a.accion.startsWith("aprobar") ? goldButtonSx : { textTransform: "none", color: a.accion.startsWith("rechazar") ? undefined : "#fff" }}
                      onClick={() => abrirDictamen(s, a)}
                    >
                      {a.etiqueta}
                    </Button>
                  ))}
                </Stack>
              )}
            </Paper>
          ))}
        </Stack>
      )}

      <Dialog open={Boolean(asignando)} onClose={() => !enviando && setAsignando(null)} fullWidth maxWidth="sm">
        <DialogTitle>Evaluadores · {asignando?.clave}</DialogTitle>
        <DialogContent>
          {errorAsignar && <Alert severity="error" sx={{ mb: 2 }}>{errorAsignar}</Alert>}
          <Stack spacing={1} sx={{ mb: 2 }}>
            {asignando?.evaluadores.length === 0 && <Typography variant="body2">Aún no hay evaluadores asignados.</Typography>}
            {asignando?.evaluadores.map((e) => (
              <Stack key={e.id} direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2">Evaluador {e.numero}: {e.nombre} ({e.correo}){e.dictamen ? ` — ${e.dictamen.replaceAll("_", " ")}` : ""}</Typography>
                {!e.dictamen && <Button size="small" color="error" onClick={() => quitar(asignando, e.id)}>Quitar</Button>}
              </Stack>
            ))}
          </Stack>
          {asignando && asignando.evaluadores.length < asignando.evaluadores_requeridos && (
            <Stack spacing={2}>
              {asignando.asignacion_bloqueada && <Alert severity="warning">{asignando.asignacion_bloqueada}</Alert>}
              {asignando.espera_evaluador && (
                <Alert severity="info">
                  El evaluador {asignando.evaluadores.length} aprobó el {asignando.etapa_revision}. Asigna ahora al evaluador {asignando.evaluadores.length + 1}:
                  el sistema no lo elige solo. Los evaluadores que llegaron a su tope aparecen deshabilitados; el tope se cambia en «Límite de evaluaciones» (Configuraciones).
                </Alert>
              )}
              <TextField select size="small" label="Evaluador" value={evaluadorSel} onChange={(e) => setEvaluadorSel(e.target.value)}>
                {evaluadores
                  .filter((u) => !asignando.evaluadores.some((e) => e.correo === u.correo))
                  .map((u) => (
                    <MenuItem key={u.id} value={u.id} disabled={u.lleno}>
                      {u.nombre} ({u.correo}) · {u.maximo ? `${u.asignados} de ${u.maximo} trabajos` : `${u.asignados} trabajo(s)`}{u.lleno ? " · en su tope" : ""}
                    </MenuItem>
                  ))}
              </TextField>
              <TextField size="small" type="date" label="Fecha límite (opcional)" value={fechaLimite}
                onChange={(e) => setFechaLimite(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
              <Button variant="contained" disabled={!evaluadorSel || enviando || Boolean(asignando.asignacion_bloqueada)} onClick={confirmarAsignar} sx={goldButtonSx}>Asignar</Button>
            </Stack>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setAsignando(null)}>Cerrar</Button></DialogActions>
      </Dialog>

      <Dialog open={Boolean(dictamen)} onClose={() => !enviando && setDictamen(null)} fullWidth maxWidth="sm">
        <DialogTitle>{dictamen?.accion.etiqueta}</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>{dictamen?.solicitud.clave} · {dictamen?.solicitud.titulo}</Typography>
          {errorDictamen && <Alert severity="error" sx={{ mb: 2 }}>{errorDictamen}</Alert>}
          <TextField
            fullWidth
            multiline
            minRows={3}
            label={dictamen?.accion.pide_observaciones ? "Observaciones para el autor (obligatorio)" : "Observaciones (opcional)"}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDictamen(null)} disabled={enviando}>Cancelar</Button>
          <Button variant="contained" onClick={confirmar} disabled={enviando} sx={goldButtonSx}>
            {enviando ? "Guardando…" : "Confirmar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
