import { useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, Chip, CircularProgress, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";

import { useAuth } from "../../auth/context/AuthContext";
import { mensajeError } from "../../solicitudes/api/solicitudesApi";
import { getBandejaSolicitudesRol, resolverSolicitudRol } from "../api/solicitudesRolApi";
import { ESTADO_SOLICITUD } from "./SolicitudRolPage";

const glassPaperSx = {
  color: "#ffffff",
  bgcolor: "rgba(10, 24, 42, 0.78)",
  backdropFilter: "blur(16px)",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderRadius: "20px",
  boxShadow: "0 24px 70px rgba(0, 0, 0, 0.25)",
};

const fechaCorta = (v) => (v ? new Date(v).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "");

export default function BandejaSolicitudesRolPage() {
  const { accessToken } = useAuth();
  const [datos, setDatos] = useState(null);
  const [estado, setEstado] = useState("pendiente");
  const [q, setQ] = useState("");
  const [comentarios, setComentarios] = useState({});
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [trabajando, setTrabajando] = useState(null);

  const cargar = useCallback(async () => {
    try {
      setDatos(await getBandejaSolicitudesRol(accessToken, { estado, q }));
      setError("");
    } catch (e) {
      setError(mensajeError(e, "No se pudieron cargar las solicitudes."));
    }
  }, [accessToken, estado, q]);

  useEffect(() => {
    const t = setTimeout(cargar, 250);
    return () => clearTimeout(t);
  }, [cargar]);

  const resolver = async (s, accion) => {
    setTrabajando(s.id);
    setAviso("");
    try {
      await resolverSolicitudRol(accessToken, s.id, accion, comentarios[s.id] || "");
      setAviso(accion === "aprobar" ? `Se asignó el rol "${s.rol.nombre}" a ${s.usuario.nombre}.` : `Se rechazó la solicitud de ${s.usuario.nombre}.`);
      await cargar();
    } catch (e) {
      setError(mensajeError(e, "No se pudo resolver la solicitud."));
      await cargar();
    } finally {
      setTrabajando(null);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Paper elevation={0} sx={{ ...glassPaperSx, p: { xs: 2.5, md: 4 }, mb: 3 }}>
        <Typography variant="h4" fontWeight={800}>Solicitudes de roles</Typography>
        <Typography sx={{ opacity: 0.8 }}>
          Al aceptar una solicitud, el rol se asigna al usuario de inmediato. Al rechazarla puedes dejarle un comentario.
        </Typography>
        {datos && (
          <Stack direction="row" gap={1} sx={{ mt: 2 }} flexWrap="wrap">
            {Object.keys(ESTADO_SOLICITUD).map((k) => (
              <Chip key={k} label={`${ESTADO_SOLICITUD[k].texto}s: ${datos.conteo[k]}`}
                sx={{ bgcolor: ESTADO_SOLICITUD[k].bg, color: ESTADO_SOLICITUD[k].fg, fontWeight: 800 }} />
            ))}
          </Stack>
        )}
      </Paper>

      <Paper elevation={0} sx={{ ...glassPaperSx, p: { xs: 2, md: 3 } }}>
        <Stack direction={{ xs: "column", md: "row" }} gap={2} sx={{ mb: 2 }}>
          <TextField select size="small" label="Estado" value={estado} onChange={(e) => setEstado(e.target.value)} sx={{ minWidth: 200 }}>
            <MenuItem value="">Todos</MenuItem>
            {Object.entries(ESTADO_SOLICITUD).map(([k, v]) => <MenuItem key={k} value={k}>{v.texto}</MenuItem>)}
          </TextField>
          <TextField size="small" label="Buscar persona, correo o rol" value={q} onChange={(e) => setQ(e.target.value)} sx={{ flex: 1 }} />
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
        {aviso && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setAviso("")}>{aviso}</Alert>}

        {!datos && !error ? (
          <Box sx={{ textAlign: "center", py: 6 }}><CircularProgress sx={{ color: "#e7c77d" }} /></Box>
        ) : datos?.solicitudes.length === 0 ? (
          <Typography sx={{ py: 4, textAlign: "center", opacity: 0.8 }}>No hay solicitudes con esos filtros.</Typography>
        ) : (
          <Stack spacing={1.5}>
            {datos?.solicitudes.map((s) => {
              const e = ESTADO_SOLICITUD[s.estado];
              return (
                <Box key={s.id} sx={{ p: 2, borderRadius: "14px", bgcolor: "rgba(255,255,255,0.05)" }}>
                  <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography fontWeight={800}>{s.usuario.nombre}</Typography>
                      <Typography variant="body2" sx={{ opacity: 0.75 }}>{s.usuario.correo}</Typography>
                      <Typography sx={{ mt: 0.5 }}>
                        Solicita el rol <b style={{ color: "#e7c77d", textTransform: "capitalize" }}>{s.rol.nombre}</b>
                        <span style={{ opacity: 0.7 }}> · {fechaCorta(s.fecha_solicitud)}</span>
                      </Typography>
                      {s.motivo && <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5 }}>Motivo: {s.motivo}</Typography>}
                      {s.estado !== "pendiente" && (
                        <Typography variant="caption" sx={{ display: "block", opacity: 0.7, mt: 0.5 }}>
                          Resuelta por {s.resuelta_por || "—"} el {fechaCorta(s.fecha_resolucion)}{s.comentario_resolucion ? ` · ${s.comentario_resolucion}` : ""}
                        </Typography>
                      )}
                    </Box>
                    <Box><Chip label={e.texto} sx={{ bgcolor: e.bg, color: e.fg, fontWeight: 800 }} /></Box>
                  </Stack>
                  {s.estado === "pendiente" && (
                    <Stack direction={{ xs: "column", md: "row" }} gap={1.5} sx={{ mt: 2 }} alignItems={{ md: "center" }}>
                      <TextField size="small" label="Comentario (opcional)" value={comentarios[s.id] || ""}
                        onChange={(ev) => setComentarios((c) => ({ ...c, [s.id]: ev.target.value.slice(0, 500) }))} sx={{ flex: 1 }} />
                      <Button variant="contained" disabled={trabajando === s.id} onClick={() => resolver(s, "aprobar")}
                        sx={{ bgcolor: "#e7c77d", color: "#10233f", fontWeight: 800, "&:hover": { bgcolor: "#f0d78f" } }}>Aceptar</Button>
                      <Button variant="outlined" color="error" disabled={trabajando === s.id} onClick={() => resolver(s, "rechazar")}>Rechazar</Button>
                    </Stack>
                  )}
                </Box>
              );
            })}
          </Stack>
        )}
      </Paper>
    </Box>
  );
}
