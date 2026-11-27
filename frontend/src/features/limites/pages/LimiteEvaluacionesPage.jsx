import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";

import { useAuth } from "../../auth/context/AuthContext";
import {
  agregarExcepcion, agregarExcepcionEvaluador, editarActividad, editarCongreso, getLimites, mensajeError, quitarExcepcion, quitarExcepcionEvaluador,
} from "../api/limitesApi";

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
  "& .MuiInputBase-root": { color: "#fff" },
  "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.7)" },
  "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.25)" },
  "& .MuiSvgIcon-root": { color: "#fff" },
};

function FilaCongreso({ congreso, onGuardar }) {
  const [valor, setValor] = useState(String(congreso.max_trabajos_por_evaluador));
  const [global, setGlobal] = useState(String(congreso.limite_trabajos));
  useEffect(() => {
    setValor(String(congreso.max_trabajos_por_evaluador));
    setGlobal(String(congreso.limite_trabajos));
  }, [congreso]);
  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }} sx={{ py: 1.5, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
      <Typography sx={{ minWidth: 190, fontWeight: 700 }}>{congreso.nombre}</Typography>
      <TextField size="small" type="number" label="Máx. trabajos por evaluador" value={valor}
        onChange={(e) => setValor(e.target.value)} slotProps={{ htmlInput: { min: 1, max: 50 } }} sx={{ ...fieldSx, width: 240 }} />
      <TextField size="small" type="number" label="Límite global de trabajos por usuario" value={global}
        onChange={(e) => setGlobal(e.target.value)} slotProps={{ htmlInput: { min: 1, max: 50 } }} sx={{ ...fieldSx, width: 290 }} />
      <Button variant="contained"
        disabled={valor === String(congreso.max_trabajos_por_evaluador) && global === String(congreso.limite_trabajos)}
        onClick={() => onGuardar(congreso.id, { max_trabajos_por_evaluador: valor, limite_trabajos: global })} sx={goldButtonSx}>
        Guardar
      </Button>
    </Stack>
  );
}

function FilaActividad({ actividad, onGuardar }) {
  const [evaluadores, setEvaluadores] = useState(String(actividad.evaluadores_por_trabajo));
  const [trabajos, setTrabajos] = useState(String(actividad.trabajos_por_ponente));
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    setEvaluadores(String(actividad.evaluadores_por_trabajo));
    setTrabajos(String(actividad.trabajos_por_ponente));
  }, [actividad]);

  const cambio =
    evaluadores !== String(actividad.evaluadores_por_trabajo) || trabajos !== String(actividad.trabajos_por_ponente);

  const guardar = async () => {
    setGuardando(true);
    await onGuardar(actividad.id, { evaluadores_por_trabajo: evaluadores, trabajos_por_ponente: trabajos });
    setGuardando(false);
  };

  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }} sx={{ py: 1.5, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
      <Typography sx={{ minWidth: 190, fontWeight: 700, textTransform: "capitalize" }}>{actividad.nombre.replace(/_/g, " ")}</Typography>
      <TextField size="small" type="number" label="Evaluadores por trabajo" value={evaluadores}
        onChange={(e) => setEvaluadores(e.target.value)} slotProps={{ htmlInput: { min: 1, max: 50 } }} sx={{ ...fieldSx, width: 200 }} />
      <TextField size="small" type="number" label="Trabajos por ponente" value={trabajos}
        onChange={(e) => setTrabajos(e.target.value)} slotProps={{ htmlInput: { min: 1, max: 50 } }} sx={{ ...fieldSx, width: 200 }} />
      <Button variant="contained" disabled={!cambio || guardando} onClick={guardar} sx={goldButtonSx}>
        {guardando ? "Guardando…" : "Guardar"}
      </Button>
    </Stack>
  );
}

export default function LimiteEvaluacionesPage() {
  const { accessToken } = useAuth();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [nueva, setNueva] = useState({ correo: "", actividad: "", limite_personalizado: "" });
  const [nuevaEv, setNuevaEv] = useState({ correo: "", congreso: "", limite_personalizado: "" });

  const cargar = useCallback(async () => {
    try {
      setDatos(await getLimites(accessToken));
      setError("");
    } catch (e) {
      setError(mensajeError(e, "No se pudieron cargar los límites."));
    }
  }, [accessToken]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const guardarActividad = async (id, cambios) => {
    try {
      setDatos(await editarActividad(accessToken, id, cambios));
      setAviso("Límites guardados.");
    } catch (e) {
      setError(mensajeError(e));
    }
  };

  const guardarCongreso = async (id, valor) => {
    try {
      setDatos(await editarCongreso(accessToken, id, valor));
      setAviso("Límite guardado.");
      setError("");
    } catch (e) {
      setError(mensajeError(e));
    }
  };

  const agregar = async () => {
    try {
      setDatos(await agregarExcepcion(accessToken, nueva));
      setNueva({ correo: "", actividad: "", limite_personalizado: "" });
      setAviso("Excepción guardada.");
      setError("");
    } catch (e) {
      setError(mensajeError(e));
    }
  };

  const agregarEv = async () => {
    try {
      setDatos(await agregarExcepcionEvaluador(accessToken, nuevaEv));
      setNuevaEv({ correo: "", congreso: "", limite_personalizado: "" });
      setAviso("Excepción de evaluador guardada.");
      setError("");
    } catch (e) {
      setError(mensajeError(e));
    }
  };

  const quitarEv = async (id) => {
    try {
      setDatos(await quitarExcepcionEvaluador(accessToken, id));
    } catch (e) {
      setError(mensajeError(e));
    }
  };

  const quitar = async (id) => {
    try {
      setDatos(await quitarExcepcion(accessToken, id));
    } catch (e) {
      setError(mensajeError(e));
    }
  };

  if (!datos && !error) {
    return <Box sx={{ textAlign: "center", py: 8 }}><CircularProgress sx={{ color: "#e7c77d" }} /></Box>;
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Paper elevation={0} sx={{ ...glassPaperSx, p: { xs: 2.5, md: 4 }, mb: 3 }}>
        <Typography variant="h4" fontWeight={800}>Límite de evaluaciones</Typography>
        <Typography sx={{ opacity: 0.8, mb: 2 }}>
          Define cuántos evaluadores revisan cada trabajo y en cuántos trabajos puede participar una persona (como autor o coautor) por tipo de actividad.
          Los cambios aplican a las nuevas asignaciones y solicitudes.
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {datos?.actividades.map((a) => <FilaActividad key={a.id} actividad={a} onGuardar={guardarActividad} />)}
      </Paper>

      <Paper elevation={0} sx={{ ...glassPaperSx, p: { xs: 2.5, md: 4 }, mb: 3 }}>
        <Typography variant="h5" fontWeight={800}>Carga de los evaluadores</Typography>
        <Typography sx={{ opacity: 0.8, mb: 1 }}>
          Máximo de trabajos que se le pueden asignar a un mismo evaluador en el congreso (por defecto 5).
        </Typography>
        {datos?.congresos.map((c) => <FilaCongreso key={c.id} congreso={c} onGuardar={guardarCongreso} />)}
      </Paper>

      <Paper elevation={0} sx={{ ...glassPaperSx, p: { xs: 2.5, md: 4 } }}>
        <Typography variant="h5" fontWeight={800}>Excepciones por usuario</Typography>
        <Typography sx={{ opacity: 0.8, mb: 2 }}>Permite a una persona presentar más (o menos) trabajos que el límite general de una actividad.</Typography>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 2 }}>
          <TextField size="small" label="Correo del usuario" value={nueva.correo}
            onChange={(e) => setNueva({ ...nueva, correo: e.target.value })} sx={{ ...fieldSx, flex: 1 }} />
          <TextField select size="small" label="Actividad" value={nueva.actividad}
            onChange={(e) => setNueva({ ...nueva, actividad: e.target.value })} sx={{ ...fieldSx, minWidth: 200 }}>
            {datos?.actividades.map((a) => <MenuItem key={a.id} value={a.id}>{a.nombre.replace(/_/g, " ")}</MenuItem>)}
          </TextField>
          <TextField size="small" type="number" label="Límite" value={nueva.limite_personalizado}
            onChange={(e) => setNueva({ ...nueva, limite_personalizado: e.target.value })} slotProps={{ htmlInput: { min: 1, max: 50 } }} sx={{ ...fieldSx, width: 120 }} />
          <Button variant="contained" onClick={agregar} disabled={!nueva.correo || !nueva.actividad || !nueva.limite_personalizado} sx={goldButtonSx}>
            Agregar
          </Button>
        </Stack>
        {datos?.excepciones.length === 0 && <Typography variant="body2" sx={{ opacity: 0.7 }}>No hay excepciones registradas.</Typography>}
        {datos?.excepciones.map((x) => (
          <Stack key={x.id} direction="row" alignItems="center" justifyContent="space-between" sx={{ py: 1, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <Typography variant="body2">
              {x.usuario} ({x.correo}) · <span style={{ textTransform: "capitalize" }}>{x.actividad.replace(/_/g, " ")}</span>: <strong>{x.limite_personalizado}</strong>
            </Typography>
            <IconButton onClick={() => quitar(x.id)} sx={{ color: "#fca5a5" }} aria-label="Quitar excepción"><DeleteOutlineRoundedIcon /></IconButton>
          </Stack>
        ))}
      </Paper>

      <Paper elevation={0} sx={{ ...glassPaperSx, p: { xs: 2.5, md: 4 }, mt: 3 }}>
        <Typography variant="h5" fontWeight={800}>Excepciones por evaluador</Typography>
        <Typography sx={{ opacity: 0.8, mb: 2 }}>
          Permite que un evaluador en particular reciba más (o menos) trabajos que el máximo general del congreso.
        </Typography>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 2 }}>
          <TextField size="small" label="Correo del evaluador" value={nuevaEv.correo}
            onChange={(e) => setNuevaEv({ ...nuevaEv, correo: e.target.value })} sx={{ ...fieldSx, flex: 1 }} />
          <TextField select size="small" label="Congreso" value={nuevaEv.congreso}
            onChange={(e) => setNuevaEv({ ...nuevaEv, congreso: e.target.value })} sx={{ ...fieldSx, minWidth: 240 }}>
            {datos?.congresos.map((c) => <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>)}
          </TextField>
          <TextField size="small" type="number" label="Máx. trabajos" value={nuevaEv.limite_personalizado}
            onChange={(e) => setNuevaEv({ ...nuevaEv, limite_personalizado: e.target.value })} slotProps={{ htmlInput: { min: 1, max: 50 } }} sx={{ ...fieldSx, width: 140 }} />
          <Button variant="contained" onClick={agregarEv} disabled={!nuevaEv.correo || !nuevaEv.congreso || !nuevaEv.limite_personalizado} sx={goldButtonSx}>
            Agregar
          </Button>
        </Stack>
        {(datos?.excepciones_evaluador ?? []).length === 0 && <Typography variant="body2" sx={{ opacity: 0.7 }}>No hay excepciones de evaluadores registradas.</Typography>}
        {(datos?.excepciones_evaluador ?? []).map((x) => (
          <Stack key={x.id} direction="row" alignItems="center" justifyContent="space-between" sx={{ py: 1, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <Typography variant="body2">
              {x.usuario} ({x.correo}) · {x.congreso}: <strong>{x.limite_personalizado}</strong> trabajos (general: {x.general})
            </Typography>
            <IconButton onClick={() => quitarEv(x.id)} sx={{ color: "#fca5a5" }} aria-label="Quitar excepción de evaluador"><DeleteOutlineRoundedIcon /></IconButton>
          </Stack>
        ))}
      </Paper>

      <Snackbar open={Boolean(aviso)} autoHideDuration={3000} onClose={() => setAviso("")} message={aviso} />
    </Box>
  );
}
