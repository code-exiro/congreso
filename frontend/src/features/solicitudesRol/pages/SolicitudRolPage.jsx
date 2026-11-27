import { useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, Chip, CircularProgress, Paper, Stack, TextField, Typography } from "@mui/material";

import { useAuth } from "../../auth/context/AuthContext";
import { mensajeError } from "../../solicitudes/api/solicitudesApi";
import { crearSolicitudRol, getMisSolicitudesRol, retirarSolicitudRol } from "../api/solicitudesRolApi";

const glassPaperSx = {
  color: "#ffffff",
  bgcolor: "rgba(10, 24, 42, 0.78)",
  backdropFilter: "blur(16px)",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderRadius: "20px",
  boxShadow: "0 24px 70px rgba(0, 0, 0, 0.25)",
};

export const ESTADO_SOLICITUD = {
  pendiente: { texto: "Pendiente", bg: "rgba(250,204,21,0.18)", fg: "#fde68a" },
  aprobada: { texto: "Aprobada", bg: "rgba(52,211,153,0.2)", fg: "#6ee7b7" },
  rechazada: { texto: "Rechazada", bg: "rgba(248,113,113,0.2)", fg: "#fecaca" },
};

const fechaCorta = (v) => (v ? new Date(v).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "");

export default function SolicitudRolPage() {
  const { accessToken } = useAuth();
  const [datos, setDatos] = useState(null);
  const [elegido, setElegido] = useState(null);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setDatos(await getMisSolicitudesRol(accessToken));
      setError("");
    } catch (e) {
      setError(mensajeError(e, "No se pudieron cargar tus solicitudes."));
    }
  }, [accessToken]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const enviar = async () => {
    setEnviando(true);
    setAviso("");
    try {
      await crearSolicitudRol(accessToken, elegido.id, motivo.trim());
      setAviso(`Tu solicitud del rol "${elegido.nombre}" se envió al coordinador.`);
      setElegido(null);
      setMotivo("");
      setError("");
      await cargar();
    } catch (e) {
      setError(mensajeError(e, "No se pudo enviar la solicitud."));
    } finally {
      setEnviando(false);
    }
  };

  const retirar = async (id) => {
    try {
      await retirarSolicitudRol(accessToken, id);
      setAviso("Retiraste la solicitud.");
      await cargar();
    } catch (e) {
      setError(mensajeError(e, "No se pudo retirar la solicitud."));
    }
  };

  if (!datos && !error) return <Box sx={{ textAlign: "center", py: 8 }}><CircularProgress sx={{ color: "#e7c77d" }} /></Box>;

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Paper elevation={0} sx={{ ...glassPaperSx, p: { xs: 2.5, md: 4 }, mb: 3 }}>
        <Typography variant="h4" fontWeight={800}>Solicitud de rol</Typography>
        <Typography sx={{ opacity: 0.8 }}>
          Elige el rol que necesitas y envía tu solicitud. El coordinador la revisará y, si la acepta, el rol se te asigna al instante.
        </Typography>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
      {aviso && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setAviso("")}>{aviso}</Alert>}

      <Paper elevation={0} sx={{ ...glassPaperSx, p: { xs: 2.5, md: 3.5 }, mb: 3 }}>
        <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>Roles disponibles</Typography>
        {datos?.roles.length === 0 && <Typography sx={{ opacity: 0.8 }}>No hay roles disponibles para solicitar.</Typography>}
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" } }}>
          {datos?.roles.map((r) => {
            const bloqueado = r.ya_lo_tienes || r.pendiente;
            const activo = elegido?.id === r.id;
            return (
              <Box
                key={r.id}
                role="button"
                tabIndex={bloqueado ? -1 : 0}
                aria-pressed={activo}
                onClick={() => !bloqueado && setElegido(activo ? null : r)}
                onKeyDown={(e) => { if (!bloqueado && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setElegido(activo ? null : r); } }}
                sx={{
                  p: 2.5, borderRadius: "16px", cursor: bloqueado ? "default" : "pointer", opacity: bloqueado ? 0.6 : 1,
                  bgcolor: activo ? "rgba(231,199,125,0.14)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${activo ? "#e7c77d" : "rgba(255,255,255,0.12)"}`,
                  transition: "all 0.2s ease",
                  "&:hover": bloqueado ? {} : { borderColor: "#e7c77d" },
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
                  <Typography fontWeight={800} sx={{ textTransform: "capitalize" }}>{r.nombre}</Typography>
                  {r.ya_lo_tienes && <Chip size="small" label="Ya lo tienes" sx={{ bgcolor: ESTADO_SOLICITUD.aprobada.bg, color: ESTADO_SOLICITUD.aprobada.fg, fontWeight: 800 }} />}
                  {r.pendiente && <Chip size="small" label="Solicitud pendiente" sx={{ bgcolor: ESTADO_SOLICITUD.pendiente.bg, color: ESTADO_SOLICITUD.pendiente.fg, fontWeight: 800 }} />}
                </Stack>
                <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>{r.descripcion || "Sin descripción."}</Typography>
              </Box>
            );
          })}
        </Box>

        {elegido && (
          <Box sx={{ mt: 3 }}>
            <Typography fontWeight={700} sx={{ mb: 1 }}>Vas a solicitar el rol: <span style={{ color: "#e7c77d", textTransform: "capitalize" }}>{elegido.nombre}</span></Typography>
            <TextField
              fullWidth multiline minRows={2} label="Motivo (opcional)" value={motivo}
              onChange={(e) => setMotivo(e.target.value.slice(0, 500))}
              helperText={`${motivo.length}/500`}
              sx={{ "& .MuiInputBase-root, & label, & .MuiFormHelperText-root": { color: "#fff" } }}
            />
            <Stack direction="row" gap={1.5} sx={{ mt: 2 }}>
              <Button variant="contained" disabled={enviando} onClick={enviar}
                sx={{ bgcolor: "#e7c77d", color: "#10233f", fontWeight: 800, "&:hover": { bgcolor: "#f0d78f" } }}>
                Enviar solicitud
              </Button>
              <Button onClick={() => { setElegido(null); setMotivo(""); }} sx={{ color: "#cbd5e1" }}>Cancelar</Button>
            </Stack>
          </Box>
        )}
      </Paper>

      <Paper elevation={0} sx={{ ...glassPaperSx, p: { xs: 2.5, md: 3.5 } }}>
        <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>Mis solicitudes</Typography>
        {datos?.solicitudes.length === 0 && <Typography sx={{ opacity: 0.8 }}>Todavía no has enviado solicitudes.</Typography>}
        <Stack spacing={1.5}>
          {datos?.solicitudes.map((s) => {
            const e = ESTADO_SOLICITUD[s.estado];
            return (
              <Stack key={s.id} direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} gap={1}
                sx={{ p: 2, borderRadius: "14px", bgcolor: "rgba(255,255,255,0.05)" }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography fontWeight={800} sx={{ textTransform: "capitalize" }}>{s.rol.nombre}</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.75 }}>
                    Enviada el {fechaCorta(s.fecha_solicitud)}{s.fecha_resolucion ? ` · Resuelta el ${fechaCorta(s.fecha_resolucion)}` : ""}
                  </Typography>
                  {s.comentario_resolucion && <Typography variant="body2" sx={{ opacity: 0.85 }}>Comentario del coordinador: {s.comentario_resolucion}</Typography>}
                </Box>
                <Stack direction="row" alignItems="center" gap={1}>
                  <Chip label={e.texto} sx={{ bgcolor: e.bg, color: e.fg, fontWeight: 800 }} />
                  {s.estado === "pendiente" && <Button size="small" onClick={() => retirar(s.id)} sx={{ color: "#fca5a5" }}>Retirar</Button>}
                </Stack>
              </Stack>
            );
          })}
        </Stack>
      </Paper>
    </Box>
  );
}
