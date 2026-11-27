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
  FormHelperText,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import { Link as RouterLink } from "react-router-dom";

import { useAuth } from "../../auth/context/AuthContext";
import {
  actualizarSolicitud,
  crearSolicitud,
  getOpciones,
  listarSolicitudes,
  mensajeError,
  retirarSolicitud,
  abrirArchivo,
  subirExtenso,
  verificarCoautor,
} from "../api/solicitudesApi";

const RESUMEN_MAX = 2000;
const RESUMEN_MIN = 50;

const glassPaperSx = {
  color: "#ffffff",
  bgcolor: "rgba(10, 24, 42, 0.78)",
  backdropFilter: "blur(16px)",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderRadius: "20px",
  boxShadow: "0 24px 70px rgba(0, 0, 0, 0.25)",
};

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

const outlineButtonSx = {
  py: 1.0,
  px: 2,
  borderRadius: "10px",
  fontWeight: 700,
  textTransform: "none",
  color: "#e7c77d",
  borderColor: "rgba(231, 199, 125, 0.42)",
  "&:hover": { borderColor: "#e7c77d", bgcolor: "rgba(231, 199, 125, 0.14)" },
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
  },
  "& .MuiFormHelperText-root": { color: "#f87171", mx: 0.25 },
};

const selectSx = {
  color: "#102138",
  bgcolor: "#f6f8fc",
  borderRadius: "8px",
  "& .MuiOutlinedInput-notchedOutline": { borderColor: "transparent" },
  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#c7a65b" },
  "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#e7c77d", borderWidth: 2 },
  "&.Mui-error .MuiOutlinedInput-notchedOutline": { borderColor: "#f87171", borderWidth: 1.5 },
};

const labelSx = { display: "block", mb: 0.8, fontSize: "0.85rem", fontWeight: 600, color: "#d6deeb" };

const dialogPaperSx = {
  bgcolor: "#0f1f35",
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "18px",
};

const FORM_VACIO = { congreso: "", actividad: "", area: "", titulo: "", palabras_clave: "", resumen: "", coautores: [] };

// «resumen_enviado» -> «Resumen enviado»
function etiquetaFase(nombre = "") {
  // Minuta 6-nov-2026: el extenso no se «rechaza», «debe modificarse».
  if (nombre.toLowerCase().replace(/ /g, "_") === "extenso_rechazado") return "Extenso: debe modificarse";
  const t = nombre.replace(/_/g, " ").trim().toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function colorFase(nombre = "") {
  const n = nombre.toLowerCase();
  if (n.replace(/ /g, "_") === "extenso_rechazado") return { bg: "rgba(251,191,36,0.18)", fg: "#fcd34d" };
  if (n.includes("rechaz")) return { bg: "rgba(248,113,113,0.18)", fg: "#fca5a5" };
  if (n.includes("aprob")) return { bg: "rgba(74,222,128,0.18)", fg: "#86efac" };
  if (n.includes("evalua") || n.includes("evaluar")) return { bg: "rgba(251,191,36,0.18)", fg: "#fcd34d" };
  return { bg: "rgba(96,165,250,0.18)", fg: "#93c5fd" };
}

function formatoFecha(valor) {
  if (!valor) return "";
  const d = new Date(valor.length === 10 ? `${valor}T00:00:00` : valor);
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

const esCorreo = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export default function MisSolicitudesPage() {
  const { accessToken } = useAuth();
  const [opciones, setOpciones] = useState(null);
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [toast, setToast] = useState("");

  const [dialogo, setDialogo] = useState(null); // { modo: "crear" | "editar", solicitud? }
  const [form, setForm] = useState(FORM_VACIO);
  const [coautorInput, setCoautorInput] = useState("");
  const [nombresCoautor, setNombresCoautor] = useState({});
  const [verificandoCoautor, setVerificandoCoautor] = useState(false);
  const [errores, setErrores] = useState({});
  const [errorEnvio, setErrorEnvio] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [porRetirar, setPorRetirar] = useState(null);
  const [retirando, setRetirando] = useState(false);
  const [subiendoId, setSubiendoId] = useState(null);

  const alElegirExtenso = async (solicitud, evento) => {
    const archivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!archivo) return;
    setSubiendoId(solicitud.id);
    try {
      await subirExtenso(accessToken, solicitud.id, archivo);
      setToast("Extenso enviado. El comité lo revisará.");
      await cargar();
    } catch (error) {
      setLoadError(mensajeError(error, "No se pudo subir el extenso."));
    } finally {
      setSubiendoId(null);
    }
  };

  const verExtenso = async (solicitud) => {
    try {
      await abrirArchivo(accessToken, `/trabajos/mis-solicitudes/${solicitud.id}/extenso/`);
    } catch (error) {
      setLoadError(mensajeError(error, "No se pudo abrir el extenso."));
    }
  };

  const cargar = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [ops, lista] = await Promise.all([getOpciones(accessToken), listarSolicitudes(accessToken)]);
      setOpciones(ops);
      setSolicitudes(lista);
    } catch (error) {
      setLoadError(mensajeError(error, "No se pudieron cargar tus solicitudes."));
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const congresoSel = useMemo(
    () => opciones?.congresos.find((c) => String(c.id) === String(form.congreso)) ?? null,
    [opciones, form.congreso],
  );
  const actividadSel = congresoSel?.actividades.find((a) => String(a.id) === String(form.actividad)) ?? null;
  const recepcionCerrada = Boolean(congresoSel?.recepcion && !congresoSel.recepcion.abierta);

  const abrirNuevo = () => {
    const congreso = opciones?.congresos[0];
    setForm({ ...FORM_VACIO, congreso: congreso ? congreso.id : "" });
    setCoautorInput("");
    setErrores({});
    setErrorEnvio("");
    setDialogo({ modo: "crear" });
  };

  const abrirEditar = (s) => {
    setForm({
      congreso: s.congreso.id,
      actividad: s.actividad.id,
      area: s.area.id,
      titulo: s.titulo,
      palabras_clave: s.palabras_clave,
      resumen: s.resumen,
      coautores: s.autores.filter((a) => !a.es_autor).map((a) => a.correo),
    });
    setNombresCoautor(Object.fromEntries(s.autores.filter((a) => !a.es_autor).map((a) => [a.correo, a.nombre])));
    setCoautorInput("");
    setErrores({});
    setErrorEnvio("");
    setDialogo({ modo: "editar", solicitud: s });
  };

  const cerrarDialogo = () => {
    if (!enviando) setDialogo(null);
  };

  const cambiar = (campo) => (e) => {
    const valor = e.target.value;
    setForm((prev) => {
      const siguiente = { ...prev, [campo]: valor };
      if (campo === "congreso") siguiente.actividad = "";
      return siguiente;
    });
    setErrores((prev) => ({ ...prev, [campo]: undefined }));
  };

  // El coautor debe existir en el sistema y tener rol de ponente: se verifica al momento de agregarlo.
  const agregarCoautor = async () => {
    const correo = coautorInput.trim().toLowerCase();
    if (!correo || verificandoCoautor) return;
    if (!esCorreo(correo)) {
      setErrores((prev) => ({ ...prev, coautores: "Escribe un correo válido." }));
      return;
    }
    if (form.coautores.includes(correo)) {
      setCoautorInput("");
      setErrores((prev) => ({ ...prev, coautores: undefined }));
      return;
    }
    setVerificandoCoautor(true);
    try {
      const usuario = await verificarCoautor(accessToken, correo);
      setNombresCoautor((prev) => ({ ...prev, [usuario.correo]: usuario.nombre }));
      setForm((prev) => ({ ...prev, coautores: [...prev.coautores, usuario.correo] }));
      setCoautorInput("");
      setErrores((prev) => ({ ...prev, coautores: undefined }));
    } catch (error) {
      setErrores((prev) => ({ ...prev, coautores: mensajeError(error, "No se pudo verificar el correo del coautor.") }));
    } finally {
      setVerificandoCoautor(false);
    }
  };

  const validar = () => {
    const e = {};
    if (dialogo.modo === "crear") {
      if (!form.congreso) e.congreso = "Selecciona el congreso.";
      if (!form.actividad) e.actividad = "Selecciona el tipo de trabajo.";
    }
    if (!form.area) e.area = "Selecciona el área.";
    if (form.titulo.trim().length < 5) e.titulo = "Escribe el título del trabajo.";
    if (!form.palabras_clave.trim()) e.palabras_clave = "Escribe al menos una palabra clave.";
    if (form.resumen.trim().length < RESUMEN_MIN) e.resumen = `El resumen debe tener al menos ${RESUMEN_MIN} caracteres.`;
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const enviar = async () => {
    if (!validar()) return;
    setEnviando(true);
    setErrorEnvio("");
    try {
      const base = {
        area: Number(form.area),
        titulo: form.titulo.trim(),
        palabras_clave: form.palabras_clave.trim(),
        resumen: form.resumen.trim(),
        coautores: form.coautores,
      };
      if (dialogo.modo === "crear") {
        await crearSolicitud(accessToken, {
          ...base,
          congreso: Number(form.congreso),
          actividad: Number(form.actividad),
        });
        setToast("Tu resumen se envió correctamente.");
      } else {
        await actualizarSolicitud(accessToken, dialogo.solicitud.id, base);
        setToast("Tu resumen se actualizó.");
      }
      setDialogo(null);
      await cargar();
    } catch (error) {
      setErrorEnvio(mensajeError(error));
    } finally {
      setEnviando(false);
    }
  };

  const confirmarRetiro = async () => {
    setRetirando(true);
    try {
      await retirarSolicitud(accessToken, porRetirar.id);
      setPorRetirar(null);
      setToast("La solicitud se retiró.");
      await cargar();
    } catch (error) {
      setPorRetirar(null);
      setLoadError(mensajeError(error));
    } finally {
      setRetirando(false);
    }
  };

  const sinCongresos = opciones && opciones.congresos.length === 0;
  const editando = dialogo?.modo === "editar";

  return (
    <Box sx={{ width: "100%", textAlign: "left" }}>
      <Paper elevation={0} sx={{ ...glassPaperSx, p: { xs: 2.5, sm: 3.5, md: 4 }, mb: 3 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2.5} justifyContent="space-between" alignItems={{ sm: "center" }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Box
              sx={{
                width: 52, height: 52, borderRadius: "14px", display: "grid", placeItems: "center",
                bgcolor: "rgba(231, 199, 125, 0.14)", color: "#e7c77d",
              }}
            >
              <DescriptionOutlinedIcon />
            </Box>
            <Box>
              <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.08em", color: "#e7c77d", textTransform: "uppercase" }}>
                Trabajos y Solicitudes
              </Typography>
              <Typography component="h1" sx={{ fontSize: { xs: "1.5rem", md: "1.9rem" }, fontWeight: 800, letterSpacing: "-0.02em" }}>
                Mis solicitudes y trabajos
              </Typography>
              <Typography sx={{ color: "#b8c4d6", fontSize: "0.92rem", mt: 0.4 }}>
                Envía el resumen de tu trabajo, elige si es ponencia, taller u otro tipo, y consulta en qué etapa va.
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1.2}>
            <Button variant="outlined" startIcon={<RefreshOutlinedIcon />} onClick={cargar} disabled={loading} sx={outlineButtonSx}>
              Actualizar
            </Button>
            <Button startIcon={<AddRoundedIcon />} onClick={abrirNuevo} disabled={loading || !opciones || sinCongresos} sx={goldButtonSx}>
              Nuevo resumen
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {opciones && !opciones.perfil_completo && (
        <Alert severity="warning" sx={{ mb: 2.5, borderRadius: "12px" }}>
          Para enviar un resumen primero completa tu perfil.{" "}
          <Box component={RouterLink} to="/perfil" sx={{ color: "inherit", fontWeight: 700 }}>
            Ir a Mi Perfil
          </Box>
        </Alert>
      )}
      {sinCongresos && (
        <Alert severity="info" sx={{ mb: 2.5, borderRadius: "12px" }}>
          Todavía no hay un congreso registrado que reciba trabajos. Cuando el administrador lo publique podrás enviar tu resumen aquí.
        </Alert>
      )}
      {loadError && (
        <Alert severity="error" sx={{ mb: 2.5, borderRadius: "12px" }} onClose={() => setLoadError("")}>
          {loadError}
        </Alert>
      )}
      {toast && (
        <Alert severity="success" sx={{ mb: 2.5, borderRadius: "12px" }} onClose={() => setToast("")}>
          {toast}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: "grid", placeItems: "center", py: 8 }}>
          <CircularProgress sx={{ color: "#e7c77d" }} />
        </Box>
      ) : solicitudes.length === 0 ? (
        <Paper elevation={0} sx={{ ...glassPaperSx, p: 4, textAlign: "center" }}>
          <Typography sx={{ fontWeight: 700, fontSize: "1.05rem", mb: 0.6 }}>Aún no has enviado ningún resumen</Typography>
          <Typography sx={{ color: "#b8c4d6", fontSize: "0.92rem" }}>
            Usa «Nuevo resumen» para registrar tu primera ponencia, taller u otro tipo de trabajo.
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {solicitudes.map((s) => {
            const color = colorFase(s.fase.nombre);
            return (
              <Paper key={s.id} elevation={0} sx={{ ...glassPaperSx, p: { xs: 2.2, sm: 3 } }}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="space-between">
                  <Box sx={{ minWidth: 0 }}>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                      <Chip size="small" label={s.clave} sx={{ bgcolor: "rgba(255,255,255,0.08)", color: "#d6deeb", fontWeight: 700 }} />
                      <Chip size="small" label={s.actividad.nombre.replace(/_/g, " ")} sx={{ bgcolor: "rgba(231,199,125,0.16)", color: "#e7c77d", fontWeight: 700, textTransform: "capitalize" }} />
                      <Tooltip title={s.fase.descripcion || ""} arrow>
                        <Chip size="small" label={etiquetaFase(s.fase.nombre)} sx={{ bgcolor: color.bg, color: color.fg, fontWeight: 700 }} />
                      </Tooltip>
                      {!s.es_autor && <Chip size="small" label="Coautor" variant="outlined" sx={{ color: "#b8c4d6", borderColor: "rgba(255,255,255,0.25)" }} />}
                    </Stack>
                    <Typography sx={{ fontWeight: 800, fontSize: "1.1rem", lineHeight: 1.3, mb: 0.6, overflowWrap: "anywhere" }}>{s.titulo}</Typography>
                    <Typography sx={{ color: "#b8c4d6", fontSize: "0.88rem", mb: 1.2 }}>
                      {s.congreso.nombre} · Edición {s.congreso.edicion} · {s.area.nombre} · Enviado el {formatoFecha(s.fecha_registro)}
                    </Typography>
                    <Typography sx={{ color: "#d6deeb", fontSize: "0.9rem", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", overflowWrap: "anywhere" }}>
                      {s.resumen}
                    </Typography>
                    <Typography sx={{ color: "#94a3b8", fontSize: "0.82rem", mt: 1.2, overflowWrap: "anywhere" }}>
                      <strong>Palabras clave:</strong> {s.palabras_clave}
                      {s.autores.length > 1 && (
                        <>
                          {" · "}
                          <strong>Autores:</strong> {s.autores.map((a) => a.nombre).join(", ")}
                        </>
                      )}
                    </Typography>
                    {s.observaciones && (
                      <Alert severity={s.puede_editar ? "warning" : "info"} sx={{ mt: 1.5, borderRadius: "10px", whiteSpace: "pre-line" }}>
                        <strong>
                          {s.puede_editar
                            ? "El evaluador pidió cambios. Corrige tu resumen y guárdalo para que se revise de nuevo:"
                            : "Observaciones del evaluador:"}
                        </strong>
                        {"\n"}{s.observaciones}
                      </Alert>
                    )}
                    {s.aviso_edicion && (
                      <Alert severity="info" sx={{ mt: 1.5, borderRadius: "10px" }}>{s.aviso_edicion}</Alert>
                    )}
                    {s.aviso_extenso && !s.puede_subir_extenso && (
                      <Alert severity="info" sx={{ mt: 1.5, borderRadius: "10px" }}>{s.aviso_extenso}</Alert>
                    )}
                    {s.fechas?.length > 0 && (
                      <Typography sx={{ color: "#94a3b8", fontSize: "0.78rem", mt: 1.2 }}>
                        <strong>Plazos del congreso:</strong>{" "}
                        {s.fechas.filter((f) => f.clave !== "realizacion").map((f) => `${f.nombre} ${f.inicio.slice(8)}/${f.inicio.slice(5, 7)} al ${f.fin.slice(8)}/${f.fin.slice(5, 7)}${f.abierta ? " (vigente)" : ""}`).join(" · ")}
                      </Typography>
                    )}
                    {(s.puede_subir_extenso || s.extenso) && (
                      <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
                        {s.extenso && (
                          <Button size="small" startIcon={<DescriptionOutlinedIcon />} onClick={() => verExtenso(s)} sx={{ color: "#e7c77d", textTransform: "none" }}>
                            Extenso: {s.extenso.nombre}
                          </Button>
                        )}
                        {s.puede_subir_extenso && (
                          <Button component="label" size="small" variant="outlined" disabled={subiendoId === s.id} sx={outlineButtonSx}>
                            {subiendoId === s.id ? "Subiendo…" : s.extenso ? "Reemplazar extenso" : "Subir extenso"}
                            <input hidden type="file" accept=".pdf,.doc,.docx" onChange={(e) => alElegirExtenso(s, e)} />
                          </Button>
                        )}
                      </Stack>
                    )}
                  </Box>
                  {s.puede_editar && (
                    <Stack direction="row" spacing={0.5} alignItems="flex-start">
                      <Tooltip title="Corregir resumen">
                        <IconButton onClick={() => abrirEditar(s)} sx={{ color: "#e7c77d" }} aria-label="Corregir resumen">
                          <EditOutlinedIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Retirar solicitud">
                        <IconButton onClick={() => setPorRetirar(s)} sx={{ color: "#fca5a5" }} aria-label="Retirar solicitud">
                          <DeleteOutlineRoundedIcon />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  )}
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      )}

      {/* Nuevo resumen / corregir resumen */}
      <Dialog open={Boolean(dialogo)} onClose={cerrarDialogo} fullWidth maxWidth="md" slotProps={{ paper: { sx: dialogPaperSx } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>{editando ? "Corregir resumen" : "Nuevo resumen"}</DialogTitle>
        <DialogContent dividers sx={{ borderColor: "rgba(255,255,255,0.1)" }}>
          {errorEnvio && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: "10px" }}>
              {errorEnvio}
            </Alert>
          )}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 2.2 }}>
            <Box>
              <Typography component="label" sx={labelSx}>Congreso *</Typography>
              <Select
                fullWidth displayEmpty value={form.congreso} onChange={cambiar("congreso")}
                disabled={enviando || editando} error={Boolean(errores.congreso)} sx={selectSx}
              >
                <MenuItem value=""><em>Selecciona el congreso</em></MenuItem>
                {opciones?.congresos.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.nombre} (edición {c.edicion})</MenuItem>
                ))}
              </Select>
              {errores.congreso && <FormHelperText sx={{ color: "#f87171" }}>{errores.congreso}</FormHelperText>}
            </Box>

            <Box>
              <Typography component="label" sx={labelSx}>¿Qué tipo de trabajo presentarás? *</Typography>
              <Select
                fullWidth displayEmpty value={form.actividad} onChange={cambiar("actividad")}
                disabled={enviando || editando || !congresoSel} error={Boolean(errores.actividad)} sx={selectSx}
              >
                <MenuItem value=""><em>Selecciona (ponencia, taller…)</em></MenuItem>
                {congresoSel?.actividades.map((a) => {
                  const lleno = a.usados >= a.limite;
                  return (
                    <MenuItem key={a.id} value={a.id} disabled={lleno} sx={{ textTransform: "capitalize" }}>
                      {a.nombre.replace(/_/g, " ")} ({a.usados}/{a.limite}{lleno ? " · límite alcanzado" : ""})
                    </MenuItem>
                  );
                })}
              </Select>
              {errores.actividad && <FormHelperText sx={{ color: "#f87171" }}>{errores.actividad}</FormHelperText>}
              {!errores.actividad && actividadSel && (
                <FormHelperText sx={{ color: "#94a3b8" }}>
                  Puedes enviar hasta {actividadSel.limite} de este tipo en el congreso.
                </FormHelperText>
              )}
            </Box>

            <Box>
              <Typography component="label" sx={labelSx}>Área *</Typography>
              <Select fullWidth displayEmpty value={form.area} onChange={cambiar("area")} disabled={enviando} error={Boolean(errores.area)} sx={selectSx}>
                <MenuItem value=""><em>Selecciona el área</em></MenuItem>
                {opciones?.areas.map((a) => (
                  <MenuItem key={a.id} value={a.id}>{a.nombre}</MenuItem>
                ))}
              </Select>
              {errores.area && <FormHelperText sx={{ color: "#f87171" }}>{errores.area}</FormHelperText>}
            </Box>

            <Box>
              <Typography component="label" sx={labelSx}>Palabras clave *</Typography>
              <TextField
                fullWidth value={form.palabras_clave} onChange={cambiar("palabras_clave")} disabled={enviando}
                placeholder="Ej. energía solar, secado, prototipo" error={Boolean(errores.palabras_clave)}
                helperText={errores.palabras_clave} slotProps={{ htmlInput: { maxLength: 200 } }} sx={fieldSx}
              />
            </Box>
          </Box>

          <Box sx={{ mt: 2.2 }}>
            <Typography component="label" sx={labelSx}>Título del trabajo *</Typography>
            <TextField
              fullWidth value={form.titulo} onChange={cambiar("titulo")} disabled={enviando}
              error={Boolean(errores.titulo)} helperText={errores.titulo} slotProps={{ htmlInput: { maxLength: 250 } }} sx={fieldSx}
            />
          </Box>

          <Box sx={{ mt: 2.2 }}>
            <Typography component="label" sx={labelSx}>Resumen *</Typography>
            <TextField
              fullWidth multiline minRows={7} value={form.resumen} onChange={cambiar("resumen")} disabled={enviando}
              placeholder="Incluye planteamiento del problema, objetivo, metodología y algunos resultados y conclusiones (máximo una cuartilla)."
              error={Boolean(errores.resumen)} helperText={errores.resumen} slotProps={{ htmlInput: { maxLength: RESUMEN_MAX } }} sx={fieldSx}
            />
            <Typography sx={{ textAlign: "right", fontSize: "0.76rem", color: "#94a3b8", mt: 0.4 }}>
              {form.resumen.length}/{RESUMEN_MAX}
            </Typography>
          </Box>

          <Box sx={{ mt: 1.4 }}>
            <Typography component="label" sx={labelSx}>Coautores (opcional)</Typography>
            <Stack direction="row" spacing={1}>
              <TextField
                fullWidth value={coautorInput} onChange={(e) => setCoautorInput(e.target.value)} disabled={enviando}
                placeholder="Correo de un coautor registrado como ponente" error={Boolean(errores.coautores)} helperText={errores.coautores}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); agregarCoautor(); } }} sx={fieldSx}
              />
              <Button variant="outlined" onClick={agregarCoautor} disabled={enviando || verificandoCoautor} sx={{ ...outlineButtonSx, whiteSpace: "nowrap", alignSelf: "flex-start", mt: "2px" }}>
                {verificandoCoautor ? "Verificando…" : "Agregar"}
              </Button>
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
              {form.coautores.map((c) => (
                <Chip
                  key={c} label={nombresCoautor[c] ? `${nombresCoautor[c]} (${c})` : c} disabled={enviando}
                  onDelete={() => setForm((prev) => ({ ...prev, coautores: prev.coautores.filter((x) => x !== c) }))}
                  sx={{ bgcolor: "rgba(255,255,255,0.1)", color: "#fff", "& .MuiChip-deleteIcon": { color: "#cbd5e1" } }}
                />
              ))}
            </Stack>
          </Box>

          {!editando && congresoSel?.recepcion && (
            <Alert severity={recepcionCerrada ? "warning" : "info"} sx={{ mt: 2.4, borderRadius: "10px" }}>
              Recepción de resúmenes: del {formatoFecha(congresoSel.recepcion.inicio)} al {formatoFecha(congresoSel.recepcion.fin)}
              {recepcionCerrada ? " (cerrada)." : "."}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.2 }}>
          <Button onClick={cerrarDialogo} disabled={enviando} sx={{ color: "#cbd5e1", textTransform: "none", fontWeight: 700 }}>
            Cancelar
          </Button>
          <Button onClick={enviar} disabled={enviando || (!editando && (recepcionCerrada || !opciones?.perfil_completo))} sx={goldButtonSx}>
            {enviando ? "Enviando…" : editando ? "Guardar cambios" : "Enviar resumen"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmar retiro */}
      <Dialog open={Boolean(porRetirar)} onClose={() => !retirando && setPorRetirar(null)} slotProps={{ paper: { sx: dialogPaperSx } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>¿Retirar esta solicitud?</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: "#d6deeb" }}>
            Se eliminará «{porRetirar?.titulo}». Esta acción no se puede deshacer, pero podrás enviar un resumen nuevo.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.2 }}>
          <Button onClick={() => setPorRetirar(null)} disabled={retirando} sx={{ color: "#cbd5e1", textTransform: "none", fontWeight: 700 }}>
            Cancelar
          </Button>
          <Button onClick={confirmarRetiro} disabled={retirando} sx={{ ...goldButtonSx, bgcolor: "#f87171", color: "#fff", "&:hover": { bgcolor: "#ef4444" } }}>
            {retirando ? "Retirando…" : "Retirar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
