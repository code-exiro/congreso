import { useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, Chip, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

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
  liberada: { texto: "Liberada", bg: "rgba(52,211,153,0.2)", fg: "#6ee7b7" },
  pendiente: { texto: "En espera de autorización", bg: "rgba(96,165,250,0.2)", fg: "#bfdbfe" },
  bloqueada: { texto: "Pendiente de pago", bg: "rgba(250,204,21,0.18)", fg: "#fde68a" },
  en_proceso: { texto: "Trabajo en proceso", bg: "rgba(148,163,184,0.2)", fg: "#cbd5e1" },
};

const MENSAJE_PAGO = {
  sin_enviar: "Aún no has enviado tu comprobante de pago.",
  revision: "Tu pago está en revisión.",
  rechazado: "Tu pago fue rechazado. Revisa el motivo y vuelve a enviarlo.",
};

export default function MisConstanciasPage() {
  const { accessToken } = useAuth();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    try {
      const { data } = await apiClient.get("/constancias/mis-constancias/", { headers: { Authorization: `Bearer ${accessToken}` } });
      setDatos(data);
      setError("");
    } catch (e) {
      setError(mensajeError(e, "No se pudieron cargar tus constancias."));
    }
  }, [accessToken]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (!datos && !error) return <Box sx={{ textAlign: "center", py: 8 }}><CircularProgress sx={{ color: "#e7c77d" }} /></Box>;

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Paper elevation={0} sx={{ ...glassPaperSx, p: { xs: 2.5, md: 4 }, mb: 3 }}>
        <Typography variant="h4" fontWeight={800}>Mis constancias</Typography>
        <Typography sx={{ opacity: 0.8 }}>
          Recibes una constancia por cada trabajo en el que participaste y que terminó todos sus procesos. Se liberan cuando tu pago del
          congreso queda validado y el administrador autoriza su entrega.
        </Typography>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {datos?.length === 0 && (
        <Paper elevation={0} sx={{ ...glassPaperSx, p: 4, textAlign: "center" }}>
          <Typography>Todavía no participas en ningún trabajo. Cuando lo hagas, aquí verás tus constancias.</Typography>
        </Paper>
      )}

      <Stack spacing={3}>
        {datos?.map((c) => {
          const hayBloqueadas = c.constancias.some((k) => k.estado === "bloqueada");
          return (
            <Paper key={c.congreso.id} elevation={0} sx={{ ...glassPaperSx, p: { xs: 2.5, md: 3.5 } }}>
              <Typography variant="h5" fontWeight={800} sx={{ mb: 1.5 }}>{c.congreso.nombre} · Edición {c.congreso.edicion}</Typography>

              {hayBloqueadas && c.pago.estado !== "validado" && (
                <Alert
                  severity={c.pago.estado === "rechazado" ? "error" : "warning"}
                  sx={{ mb: 2 }}
                  action={<Button component={RouterLink} to="/pagos/mis-pagos" color="inherit" size="small">Ir a Mis pagos</Button>}
                >
                  {MENSAJE_PAGO[c.pago.estado] || "Tu pago aún no está validado."} Tus constancias se liberan cuando se valide.
                  {c.pago.comentario ? ` Motivo: ${c.pago.comentario}` : ""}
                </Alert>
              )}

              <Stack spacing={1.5}>
                {c.constancias.map((k, i) => {
                  const e = ESTADO[k.estado];
                  return (
                    <Stack key={`${k.trabajo.clave}-${i}`} direction={{ xs: "column", sm: "row" }} justifyContent="space-between"
                      alignItems={{ sm: "center" }} gap={1} sx={{ p: 2, borderRadius: "14px", bgcolor: "rgba(255,255,255,0.05)" }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography fontWeight={800}>{k.titulo}</Typography>
                        <Typography variant="body2" sx={{ opacity: 0.8 }}>
                          {k.trabajo.clave} · {k.rol} · {k.trabajo.titulo}
                        </Typography>
                        {k.motivo && <Typography variant="caption" sx={{ opacity: 0.65 }}>{k.motivo}</Typography>}
                        {k.estado === "liberada" && !k.pdf_disponible && (
                          <Typography variant="caption" sx={{ display: "block", opacity: 0.65 }}>
                            Liberada. El PDF estará disponible cuando se cargue la plantilla de constancias del congreso.
                          </Typography>
                        )}
                      </Box>
                      <Chip label={e.texto} sx={{ bgcolor: e.bg, color: e.fg, fontWeight: 800 }} />
                    </Stack>
                  );
                })}
              </Stack>
            </Paper>
          );
        })}
      </Stack>
    </Box>
  );
}
