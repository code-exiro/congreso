import { useCallback, useEffect, useState } from "react";
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
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { useAuth } from "../../auth/context/AuthContext";
import { cargarArchivo, dictaminarPago, getValidacion, mensajeError } from "../api/pagosApi";
import { COLOR_ESTADO } from "./MisPagosPage";

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
  minWidth: 200,
  "& .MuiInputBase-root": { color: "#fff" },
  "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.7)" },
  "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.25)" },
  "& .MuiSvgIcon-root": { color: "#fff" },
};

const ESTADOS = [
  ["revision", "En revisión"],
  ["validado", "Validado"],
  ["rechazado", "Rechazado"],
  ["sin_enviar", "Sin enviar"],
];

const fechaHora = (iso) => (iso ? new Date(iso).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" }) : "—");
const dinero = (monto) => Number(monto).toLocaleString("es-MX", { style: "currency", currency: "MXN" });

export default function ValidacionPagosPage() {
  const { accessToken } = useAuth();
  const [datos, setDatos] = useState(null);
  const [filtros, setFiltros] = useState({ congreso: "", estado: "", q: "" });
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);
  const [revisando, setRevisando] = useState(null); // fila
  const [imagen, setImagen] = useState(null); // { url, tipo }
  const [comentario, setComentario] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorDialogo, setErrorDialogo] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setDatos(await getValidacion(accessToken, filtros));
      setError("");
    } catch (e) {
      setError(mensajeError(e, "No se pudieron cargar los pagos."));
    } finally {
      setCargando(false);
    }
  }, [accessToken, filtros]);

  useEffect(() => {
    const t = setTimeout(cargar, 250);
    return () => clearTimeout(t);
  }, [cargar]);

  const cambiar = (campo) => (e) => setFiltros((f) => ({ ...f, [campo]: e.target.value }));

  const abrir = async (fila) => {
    setRevisando(fila);
    setComentario(fila.pago.estado === "rechazado" ? fila.pago.comentario : "");
    setErrorDialogo("");
    setImagen(null);
    if (fila.pago.tiene_comprobante) {
      try {
        setImagen(await cargarArchivo(accessToken, `/pagos/validacion/${fila.pago.id}/`));
      } catch (e) {
        setErrorDialogo(mensajeError(e, "No se pudo cargar el comprobante."));
      }
    }
  };

  const cerrar = () => {
    if (imagen?.url) URL.revokeObjectURL(imagen.url);
    setRevisando(null);
    setImagen(null);
  };

  const resolver = async (estado) => {
    setGuardando(true);
    setErrorDialogo("");
    try {
      await dictaminarPago(accessToken, revisando.pago.id, estado, comentario);
      cerrar();
      await cargar();
    } catch (e) {
      setErrorDialogo(mensajeError(e));
    } finally {
      setGuardando(false);
    }
  };

  const verCredencial = async () => {
    try {
      const { url } = await cargarArchivo(accessToken, `/pagos/validacion/${revisando.pago.id}/credencial/`);
      window.open(url, "_blank", "noopener");
    } catch (e) {
      setErrorDialogo(mensajeError(e));
    }
  };

  const filas = datos?.resultados ?? [];
  const pago = revisando?.pago;

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Paper elevation={0} sx={{ ...glassPaperSx, p: { xs: 2.5, md: 4 }, mb: 3 }}>
        <Typography variant="h4" fontWeight={800}>Validación de pagos</Typography>
        <Typography sx={{ opacity: 0.8, mb: 2 }}>
          Revisa el comprobante y la referencia de cada ponente, valídalos con la institución y deja el pago como validado o rechazado.
        </Typography>
        <Stack direction="row" flexWrap="wrap" gap={2}>
          <TextField size="small" label="Buscar (nombre, correo o referencia)" value={filtros.q} onChange={cambiar("q")} sx={{ ...fieldSx, minWidth: 280 }} />
          <TextField select size="small" label="Congreso" value={filtros.congreso || datos?.congreso || ""} onChange={cambiar("congreso")} sx={fieldSx}>
            {datos?.congresos.map((c) => <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Estatus" value={filtros.estado} onChange={cambiar("estado")} sx={fieldSx}>
            <MenuItem value="">Todos</MenuItem>
            {ESTADOS.map(([v, t]) => <MenuItem key={v} value={v}>{t}</MenuItem>)}
          </TextField>
        </Stack>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {cargando && !datos ? (
        <Box sx={{ textAlign: "center", py: 6 }}><CircularProgress sx={{ color: "#e7c77d" }} /></Box>
      ) : filas.length === 0 ? (
        <Paper elevation={0} sx={{ ...glassPaperSx, p: 4, textAlign: "center" }}>
          <Typography>No hay ponentes que coincidan con los filtros.</Typography>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {filas.map((f) => {
            const color = COLOR_ESTADO[f.pago.estado];
            return (
              <Paper key={f.usuario.id} elevation={0} sx={{ ...glassPaperSx, p: 2.5 }}>
                <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} gap={1.5}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography fontWeight={800}>{f.usuario.nombre}</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.75 }}>{f.usuario.correo}</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.7 }}>
                      {f.trabajos.map((t) => t.clave).join(", ") || "—"}
                      {f.pago.referencia && ` · Ref. ${f.pago.referencia}`}
                      {f.pago.fecha_envio && ` · Enviado ${fechaHora(f.pago.fecha_envio)}`}
                    </Typography>
                  </Box>
                  <Stack direction="row" gap={1.5} alignItems="center">
                    <Chip label={f.pago.estado_texto} sx={{ bgcolor: color.bg, color: color.fg, fontWeight: 800 }} />
                    {f.pago.id && (
                      <Button size="small" variant="contained" onClick={() => abrir(f)} sx={goldButtonSx}>
                        {f.pago.estado === "revision" ? "Revisar" : "Modificar"}
                      </Button>
                    )}
                  </Stack>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      )}

      <Dialog open={Boolean(revisando)} onClose={() => !guardando && cerrar()} fullWidth maxWidth="md">
        <DialogTitle>Pago de {revisando?.usuario.nombre}</DialogTitle>
        <DialogContent>
          {errorDialogo && <Alert severity="error" sx={{ mb: 2 }}>{errorDialogo}</Alert>}
          <Stack spacing={0.5} sx={{ mb: 2 }}>
            <Typography variant="body2">Correo: {revisando?.usuario.correo}</Typography>
            <Typography variant="body2">Enviado el: {fechaHora(pago?.fecha_envio)}</Typography>
            <Typography variant="body2">
              Concepto: {pago?.cuota?.concepto} {pago?.cuota && `(${dinero(pago.cuota.monto)})`}
            </Typography>
            <Typography variant="body1">Referencia escrita por el ponente: <strong>{pago?.referencia}</strong></Typography>
            {pago?.tiene_comprobante_academico && (
              <Button size="small" onClick={verCredencial} sx={{ alignSelf: "flex-start", textTransform: "none" }}>Ver credencial</Button>
            )}
          </Stack>
          {imagen && (imagen.tipo.startsWith("image/") ? (
            <Box component="img" src={imagen.url} alt="Comprobante de pago" sx={{ maxWidth: "100%", maxHeight: 420, display: "block", mb: 2, borderRadius: "10px" }} />
          ) : (
            <Button href={imagen.url} target="_blank" rel="noopener noreferrer" sx={{ mb: 2 }}>Abrir comprobante (PDF)</Button>
          ))}
          <TextField fullWidth multiline minRows={2} label="Comentario (obligatorio si lo rechazas)" value={comentario} onChange={(e) => setComentario(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={cerrar} disabled={guardando}>Cerrar</Button>
          <Button color="error" variant="outlined" disabled={guardando} onClick={() => resolver("rechazado")}>Rechazar</Button>
          <Button variant="contained" disabled={guardando} onClick={() => resolver("validado")} sx={goldButtonSx}>Validar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
