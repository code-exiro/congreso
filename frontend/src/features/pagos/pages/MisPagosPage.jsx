import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { useAuth } from "../../auth/context/AuthContext";
import { cargarArchivo, enviarPago, getMisPagos, mensajeError } from "../api/pagosApi";

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

export const COLOR_ESTADO = {
  sin_enviar: { bg: "rgba(148,163,184,0.2)", fg: "#cbd5e1" },
  revision: { bg: "rgba(250,204,21,0.18)", fg: "#fde68a" },
  validado: { bg: "rgba(52,211,153,0.2)", fg: "#6ee7b7" },
  rechazado: { bg: "rgba(248,113,113,0.2)", fg: "#fca5a5" },
};

const dinero = (monto) => Number(monto).toLocaleString("es-MX", { style: "currency", currency: "MXN" });

function TarjetaCongreso({ item, token, onEnviado, onError }) {
  const { congreso, elegible, trabajos, cuotas, pago } = item;
  const [cuota, setCuota] = useState(cuotas.length === 1 ? cuotas[0].id : "");
  const [referencia, setReferencia] = useState("");
  const [comprobante, setComprobante] = useState(null);
  const [credencial, setCredencial] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const cuotaSel = cuotas.find((c) => c.id === cuota);
  const pideCredencial = Boolean(cuotaSel && cuotaSel.concepto.toLowerCase().includes("credencial"));
  const puedeEnviar = elegible && (pago.estado === "sin_enviar" || pago.estado === "rechazado");
  const listo = cuota && referencia.trim().length >= 4 && comprobante && (!pideCredencial || credencial);

  const enviar = async () => {
    setEnviando(true);
    try {
      await enviarPago(token, { congreso: congreso.id, cuota, referencia: referencia.trim(), comprobante, credencial });
      setReferencia("");
      setComprobante(null);
      setCredencial(null);
      await onEnviado();
    } catch (e) {
      onError(mensajeError(e));
    } finally {
      setEnviando(false);
    }
  };

  const verComprobante = async () => {
    try {
      const { url } = await cargarArchivo(token, `/pagos/mis-pagos/${pago.id}/comprobante/`);
      window.open(url, "_blank", "noopener");
    } catch (e) {
      onError(mensajeError(e));
    }
  };

  const color = COLOR_ESTADO[pago.estado];

  return (
    <Paper elevation={0} sx={{ ...glassPaperSx, p: { xs: 2.5, md: 3.5 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} sx={{ mb: 1 }}>
        <Typography variant="h5" fontWeight={800}>{congreso.nombre} · Edición {congreso.edicion}</Typography>
        <Chip label={pago.estado_texto} sx={{ bgcolor: color.bg, color: color.fg, fontWeight: 800 }} />
      </Stack>

      {!elegible ? (
        <Alert severity="info">Tu pago está registrado, pero ya no tienes trabajos aceptados en este congreso.</Alert>
      ) : (
        <>
          <Typography sx={{ opacity: 0.8, mb: 1 }}>Trabajos aceptados en los que participas:</Typography>
          <Stack spacing={0.5} sx={{ mb: 2 }}>
            {trabajos.map((t) => (
              <Typography key={t.clave} variant="body2">
                <strong>{t.clave}</strong> · <span style={{ textTransform: "capitalize" }}>{t.actividad.replace(/_/g, " ")}</span> · {t.titulo}
              </Typography>
            ))}
          </Stack>
          <Typography variant="body2" sx={{ opacity: 0.8, mb: 2 }}>
            Un solo pago cubre todos tus trabajos del congreso. Cuando sea validado se liberan tus constancias.
          </Typography>
        </>
      )}

      {cuotas.length > 0 && (
        <Box sx={{ mb: 2, p: 2, borderRadius: "14px", bgcolor: "rgba(255,255,255,0.05)" }}>
          <Typography fontWeight={800} sx={{ mb: 0.5 }}>Ficha de pago</Typography>
          {cuotas.map((c) => (
            <Typography key={c.id} variant="body2">{c.concepto}: <strong>{dinero(c.monto)}</strong></Typography>
          ))}
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            Paga por transferencia o en caja y conserva tu comprobante: lo vas a subir aquí junto con el número de referencia.
          </Typography>
        </Box>
      )}
      {elegible && cuotas.length === 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>Este congreso todavía no tiene cuotas configuradas. Avisa al coordinador.</Alert>
      )}

      {pago.estado !== "sin_enviar" && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2">Concepto: {pago.cuota?.concepto} ({pago.cuota && dinero(pago.cuota.monto)})</Typography>
          <Typography variant="body2">Referencia enviada: <strong>{pago.referencia}</strong></Typography>
          {pago.comentario && (
            <Alert severity={pago.estado === "rechazado" ? "error" : pago.estado === "validado" ? "success" : "info"} sx={{ mt: 1 }}>
              {pago.comentario}
            </Alert>
          )}
          {pago.tiene_comprobante && (
            <Button size="small" onClick={verComprobante} sx={{ mt: 1, textTransform: "none", color: "#e7c77d" }}>Ver comprobante enviado</Button>
          )}
        </Box>
      )}

      {puedeEnviar && cuotas.length > 0 && (
        <Stack spacing={2}>
          <Typography fontWeight={800}>{pago.estado === "rechazado" ? "Volver a enviar tu comprobante" : "Enviar comprobante"}</Typography>
          <TextField select size="small" label="Concepto que pagaste" value={cuota} onChange={(e) => setCuota(e.target.value)} sx={fieldSx}>
            {cuotas.map((c) => <MenuItem key={c.id} value={c.id}>{c.concepto} — {dinero(c.monto)}</MenuItem>)}
          </TextField>
          <TextField size="small" label="Número de referencia" value={referencia} onChange={(e) => setReferencia(e.target.value)}
            helperText="Escríbelo tal como aparece en tu comprobante; se compara con la imagen."
            sx={fieldSx} slotProps={{ htmlInput: { maxLength: 100 }, formHelperText: { sx: { color: "rgba(255,255,255,0.6)" } } }} />
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
            <Button component="label" variant="outlined" sx={{ textTransform: "none", color: "#e7c77d", borderColor: "rgba(231,199,125,0.5)" }}>
              {comprobante ? "Cambiar comprobante" : "Subir comprobante (JPG, PNG o PDF)"}
              <input hidden type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => setComprobante(e.target.files?.[0] || null)} />
            </Button>
            {comprobante && <Typography variant="body2">{comprobante.name}</Typography>}
          </Stack>
          {pideCredencial && (
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
              <Button component="label" variant="outlined" sx={{ textTransform: "none", color: "#e7c77d", borderColor: "rgba(231,199,125,0.5)" }}>
                {credencial ? "Cambiar credencial" : "Subir credencial vigente"}
                <input hidden type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => setCredencial(e.target.files?.[0] || null)} />
              </Button>
              {credencial && <Typography variant="body2">{credencial.name}</Typography>}
            </Stack>
          )}
          <Box>
            <Button variant="contained" disabled={!listo || enviando} onClick={enviar} sx={goldButtonSx}>
              {enviando ? "Enviando…" : "Enviar"}
            </Button>
          </Box>
        </Stack>
      )}
    </Paper>
  );
}

export default function MisPagosPage() {
  const { accessToken } = useAuth();
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  const cargar = useCallback(async () => {
    try {
      setItems(await getMisPagos(accessToken));
      setError("");
    } catch (e) {
      setError(mensajeError(e, "No se pudieron cargar tus pagos."));
    }
  }, [accessToken]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (!items && !error) return <Box sx={{ textAlign: "center", py: 8 }}><CircularProgress sx={{ color: "#e7c77d" }} /></Box>;

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Paper elevation={0} sx={{ ...glassPaperSx, p: { xs: 2.5, md: 4 }, mb: 3 }}>
        <Typography variant="h4" fontWeight={800}>Mis pagos</Typography>
        <Typography sx={{ opacity: 0.8 }}>
          Cuando el comité acepta tu solicitud se habilita tu ficha de pago. Paga, sube tu comprobante con el número de referencia y
          revisa aquí el estatus: en revisión, validado o rechazado.
        </Typography>
      </Paper>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {items?.length === 0 && (
        <Paper elevation={0} sx={{ ...glassPaperSx, p: 4, textAlign: "center" }}>
          <Typography>Aún no tienes solicitudes aceptadas. Cuando el comité apruebe una, aquí aparecerá tu ficha de pago.</Typography>
        </Paper>
      )}
      <Stack spacing={3}>
        {items?.map((item) => (
          <TarjetaCongreso
            key={item.congreso.id}
            item={item}
            token={accessToken}
            onError={setError}
            onEnviado={async () => {
              setAviso("Comprobante enviado. Quedó en revisión.");
              await cargar();
            }}
          />
        ))}
      </Stack>
      <Snackbar open={Boolean(aviso)} autoHideDuration={4000} onClose={() => setAviso("")} message={aviso} />
    </Box>
  );
}
