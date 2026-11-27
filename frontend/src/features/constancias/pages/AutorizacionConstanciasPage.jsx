import { useCallback, useEffect, useState } from "react";
import {
  Alert, Box, Button, Checkbox, Chip, CircularProgress, MenuItem, Paper, Stack, Table, TableBody, TableCell,
  TableHead, TableRow, TextField, Typography,
} from "@mui/material";

import apiClient from "../../../shared/api/apiClient";
import { useAuth } from "../../auth/context/AuthContext";
import { mensajeError } from "../../solicitudes/api/solicitudesApi";

const glassPaperSx = {
  color: "#ffffff",
  bgcolor: "rgba(10, 24, 42, 0.78)",
  backdropFilter: "blur(16px)",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderRadius: "20px",
  boxShadow: "0 24px 70px rgba(0, 0, 0, 0.25)",
};

const ESTADO = {
  pendiente: { texto: "Por autorizar", bg: "rgba(250,204,21,0.18)", fg: "#fde68a" },
  autorizada: { texto: "Autorizada", bg: "rgba(52,211,153,0.2)", fg: "#6ee7b7" },
  sin_pago: { texto: "Sin pago validado", bg: "rgba(148,163,184,0.2)", fg: "#cbd5e1" },
};

export default function AutorizacionConstanciasPage() {
  const { accessToken } = useAuth();
  const headers = { Authorization: `Bearer ${accessToken}` };
  const [datos, setDatos] = useState(null);
  const [congreso, setCongreso] = useState("");
  const [estado, setEstado] = useState("pendiente");
  const [q, setQ] = useState("");
  const [seleccion, setSeleccion] = useState([]);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [trabajando, setTrabajando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const { data } = await apiClient.get("/constancias/autorizacion/", { headers, params: { congreso, estado, q } });
      setDatos(data);
      setSeleccion([]);
      setError("");
    } catch (e) {
      setError(mensajeError(e, "No se pudo cargar la lista de constancias."));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, congreso, estado, q]);

  useEffect(() => {
    const t = setTimeout(cargar, 250);
    return () => clearTimeout(t);
  }, [cargar]);

  const filas = datos?.constancias || [];
  const autorizables = filas.filter((f) => f.estado === "pendiente");
  const alternar = (id) => setSeleccion((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const todas = autorizables.length > 0 && seleccion.length === autorizables.length;

  const autorizar = async (ids) => {
    setTrabajando(true);
    setAviso("");
    try {
      const { data } = await apiClient.post("/constancias/autorizacion/", { ids }, { headers });
      setAviso(`Se autorizaron ${data.autorizadas} constancia(s).${data.omitidas?.length ? ` Omitidas: ${data.omitidas.join("; ")}.` : ""}`);
      await cargar();
    } catch (e) {
      setError(mensajeError(e, "No se pudo autorizar."));
    } finally {
      setTrabajando(false);
    }
  };

  const revocar = async (id) => {
    setTrabajando(true);
    setAviso("");
    try {
      await apiClient.delete(`/constancias/autorizacion/${id}/`, { headers });
      setAviso("Se retiró la autorización.");
      await cargar();
    } catch (e) {
      setError(mensajeError(e, "No se pudo retirar la autorización."));
    } finally {
      setTrabajando(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Paper elevation={0} sx={{ ...glassPaperSx, p: { xs: 2.5, md: 4 }, mb: 3 }}>
        <Typography variant="h4" fontWeight={800}>Autorización de constancias</Typography>
        <Typography sx={{ opacity: 0.8 }}>
          Una constancia se libera cuando el trabajo terminó sus procesos, el pago del participante está validado y tú la autorizas.
        </Typography>
        {datos && (
          <Stack direction="row" gap={1} sx={{ mt: 2 }} flexWrap="wrap">
            {Object.keys(ESTADO).map((k) => (
              <Chip key={k} label={`${ESTADO[k].texto}: ${datos.conteo[k]}`} sx={{ bgcolor: ESTADO[k].bg, color: ESTADO[k].fg, fontWeight: 800 }} />
            ))}
          </Stack>
        )}
      </Paper>

      <Paper elevation={0} sx={{ ...glassPaperSx, p: { xs: 2, md: 3 } }}>
        <Stack direction={{ xs: "column", md: "row" }} gap={2} sx={{ mb: 2 }}>
          <TextField select size="small" label="Congreso" value={congreso} onChange={(e) => setCongreso(e.target.value)} sx={{ minWidth: 220 }}>
            <MenuItem value="">Todos</MenuItem>
            {datos?.congresos.map((c) => <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Estado" value={estado} onChange={(e) => setEstado(e.target.value)} sx={{ minWidth: 200 }}>
            <MenuItem value="">Todos</MenuItem>
            {Object.entries(ESTADO).map(([k, v]) => <MenuItem key={k} value={k}>{v.texto}</MenuItem>)}
          </TextField>
          <TextField size="small" label="Buscar persona, correo o trabajo" value={q} onChange={(e) => setQ(e.target.value)} sx={{ flex: 1 }} />
          <Button variant="contained" disabled={!seleccion.length || trabajando} onClick={() => autorizar(seleccion)}
            sx={{ bgcolor: "#e7c77d", color: "#10233f", fontWeight: 800, "&:hover": { bgcolor: "#f0d78f" } }}>
            Autorizar seleccionadas ({seleccion.length})
          </Button>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
        {aviso && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setAviso("")}>{aviso}</Alert>}

        {!datos && !error ? (
          <Box sx={{ textAlign: "center", py: 6 }}><CircularProgress sx={{ color: "#e7c77d" }} /></Box>
        ) : filas.length === 0 ? (
          <Typography sx={{ py: 4, textAlign: "center", opacity: 0.8 }}>No hay constancias con esos filtros.</Typography>
        ) : (
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox checked={todas} onChange={() => setSeleccion(todas ? [] : autorizables.map((f) => f.id))} sx={{ color: "#fff" }} />
                  </TableCell>
                  {["Persona", "Trabajo", "Constancia", "Estado", ""].map((h) => (
                    <TableCell key={h} sx={{ color: "#e7c77d", fontWeight: 800, borderColor: "rgba(255,255,255,0.12)" }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filas.map((f) => {
                  const e = ESTADO[f.estado];
                  return (
                    <TableRow key={f.id}>
                      <TableCell padding="checkbox" sx={{ borderColor: "rgba(255,255,255,0.08)" }}>
                        <Checkbox disabled={f.estado !== "pendiente"} checked={seleccion.includes(f.id)} onChange={() => alternar(f.id)} sx={{ color: "#fff" }} />
                      </TableCell>
                      <TableCell sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.08)" }}>
                        <Typography fontWeight={700}>{f.persona}</Typography>
                        <Typography variant="caption" sx={{ opacity: 0.7 }}>{f.correo} · {f.rol}</Typography>
                      </TableCell>
                      <TableCell sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.08)" }}>
                        <Typography variant="body2">{f.trabajo.clave} · {f.trabajo.titulo}</Typography>
                        <Typography variant="caption" sx={{ opacity: 0.7 }}>{f.congreso.nombre} {f.congreso.edicion}</Typography>
                      </TableCell>
                      <TableCell sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.08)" }}>{f.constancia?.titulo || f.constancia}</TableCell>
                      <TableCell sx={{ borderColor: "rgba(255,255,255,0.08)" }}>
                        <Chip label={e.texto} size="small" sx={{ bgcolor: e.bg, color: e.fg, fontWeight: 800 }} />
                        {f.autorizada_por && <Typography variant="caption" sx={{ display: "block", color: "#fff", opacity: 0.7 }}>por {f.autorizada_por}</Typography>}
                      </TableCell>
                      <TableCell sx={{ borderColor: "rgba(255,255,255,0.08)" }}>
                        {f.estado === "pendiente" && <Button size="small" disabled={trabajando} onClick={() => autorizar([f.id])} sx={{ color: "#e7c77d" }}>Autorizar</Button>}
                        {f.estado === "autorizada" && <Button size="small" disabled={trabajando} onClick={() => revocar(f.id)} sx={{ color: "#fca5a5" }}>Retirar</Button>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
