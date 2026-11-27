import { useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, Chip, CircularProgress, MenuItem, Paper, Snackbar, Stack, TextField, Typography } from "@mui/material";

import { useAuth } from "../../auth/context/AuthContext";
import { getFechas, guardarFechas, mensajeError } from "../api/fechasApi";

const glassPaperSx = {
  color: "#ffffff",
  bgcolor: "rgba(10, 24, 42, 0.78)",
  backdropFilter: "blur(16px)",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderRadius: "20px",
  boxShadow: "0 24px 70px rgba(0, 0, 0, 0.25)",
};
const goldButtonSx = {
  bgcolor: "#e7c77d", color: "#102138", borderRadius: "10px", fontWeight: 800, textTransform: "none", boxShadow: "none",
  "&:hover": { bgcolor: "#f2d99c", boxShadow: "none" },
};
const fieldSx = {
  "& .MuiInputBase-root": { color: "#fff" },
  "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.7)" },
  "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.25)" },
  "& .MuiSvgIcon-root": { color: "#fff" },
  "& input::-webkit-calendar-picker-indicator": { filter: "invert(1)" },
};
const ESTADOS = {
  sin_configurar: { label: "Sin configurar", color: "default" },
  proxima: { label: "Próxima", color: "info" },
  vigente: { label: "Vigente hoy", color: "success" },
  terminada: { label: "Terminada", color: "warning" },
};
// Quién actúa en cada periodo, para que se entienda qué se bloquea y qué se abre.
const QUIEN = {
  recepcion: "Ponente: envía, edita o retira su resumen. El coordinador aún no asigna evaluadores.",
  asignacion_resumen: "Coordinador: asigna un evaluador a cada resumen (asignar = aprobarlo para evaluación).",
  evaluacion_resumen: "Evaluador: califica el resumen. Ponente: corrige lo que le pidan.",
  entrega_extenso: "Ponente: sube o reemplaza su extenso.",
  asignacion_extenso: "Coordinador: asigna a los evaluadores restantes del extenso.",
  evaluacion_extenso: "Evaluador: califica el extenso. Ponente: corrige lo que le pidan.",
  realizacion: "Fechas en que se lleva a cabo el congreso.",
};

export default function FechasImportantesPage() {
  const { accessToken } = useAuth();
  const [congresos, setCongresos] = useState(null);
  const [congresoId, setCongresoId] = useState("");
  const [filas, setFilas] = useState([]);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async (mantener) => {
    try {
      const data = await getFechas(accessToken);
      setCongresos(data.congresos);
      const id = mantener || data.congresos[0]?.id || "";
      setCongresoId(id);
      setFilas(data.congresos.find((c) => c.id === id)?.fechas.map((f) => ({ ...f })) || []);
    } catch (e) {
      setError(mensajeError(e));
    }
  }, [accessToken]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const elegirCongreso = (id) => {
    setCongresoId(id);
    setFilas(congresos.find((c) => c.id === id)?.fechas.map((f) => ({ ...f })) || []);
    setError("");
  };

  const cambiar = (i, campo, valor) => setFilas((prev) => prev.map((f, k) => (k === i ? { ...f, [campo]: valor } : f)));

  const guardar = async () => {
    setGuardando(true);
    setError("");
    try {
      const data = await guardarFechas(accessToken, congresoId, filas.map((f) => ({ id_fecha: f.id_fecha, fecha_inicio: f.inicio, fecha_fin: f.fin })));
      setCongresos(data.congresos);
      setFilas(data.congresos.find((c) => c.id === congresoId)?.fechas.map((f) => ({ ...f })) || []);
      setAviso("Fechas guardadas.");
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setGuardando(false);
    }
  };

  if (!congresos && !error) return <Box sx={{ textAlign: "center", py: 8 }}><CircularProgress sx={{ color: "#e7c77d" }} /></Box>;

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Paper elevation={0} sx={{ ...glassPaperSx, p: { xs: 2.5, md: 4 } }}>
        <Typography variant="h4" fontWeight={800}>Fechas importantes</Typography>
        <Typography sx={{ opacity: 0.8, mb: 2 }}>
          Cada periodo abre o cierra una parte del proceso del trabajo. Si dejas un periodo vacío, esa etapa no se restringe.
          La asignación de resúmenes debe empezar después de que termine la recepción, y la de extensos después de la entrega.
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {congresos?.length === 0 && <Typography>Aún no hay congresos.</Typography>}
        {congresos?.length > 0 && (
          <>
            <TextField select size="small" label="Congreso" value={congresoId} onChange={(e) => elegirCongreso(e.target.value)} sx={{ ...fieldSx, minWidth: 280, mb: 2 }}>
              {congresos.map((c) => <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>)}
            </TextField>
            {filas.map((f, i) => (
              <Stack key={f.id_fecha} direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}
                sx={{ py: 1.5, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography sx={{ fontWeight: 700 }}>{f.nombre}</Typography>
                    <Chip size="small" label={ESTADOS[f.estado]?.label} color={ESTADOS[f.estado]?.color} />
                  </Stack>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>{QUIEN[f.clave] || f.descripcion}</Typography>
                </Box>
                <TextField size="small" type="date" label="Inicio" value={f.inicio} onChange={(e) => cambiar(i, "inicio", e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }} sx={{ ...fieldSx, width: 170 }} />
                <TextField size="small" type="date" label="Fin" value={f.fin} onChange={(e) => cambiar(i, "fin", e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }} sx={{ ...fieldSx, width: 170 }} />
              </Stack>
            ))}
            <Button variant="contained" onClick={guardar} disabled={guardando} sx={{ ...goldButtonSx, mt: 2 }}>
              {guardando ? "Guardando…" : "Guardar fechas"}
            </Button>
          </>
        )}
      </Paper>
      <Snackbar open={Boolean(aviso)} autoHideDuration={3000} onClose={() => setAviso("")} message={aviso} />
    </Box>
  );
}
