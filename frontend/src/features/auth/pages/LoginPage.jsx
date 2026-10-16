import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
  Link,
} from "@mui/material";

import {
  Link as RouterLink,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

    setError("");
    setLoading(true);

    try {
      await login(form.email, form.password);
      navigate("/", { replace: true });
    } catch (requestError) {
      const data = requestError.response?.data;

      setError(
        data?.email?.[0] ??
          data?.password?.[0] ??
          data?.non_field_errors?.[0] ??
          data?.detail ??
          "No fue posible iniciar sesión."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        width: "100vw",
        flexDirection: { xs: "column", md: "row" },
      }}
    >
      <Box
        sx={{
          flex: 2,
          minWidth: { xs: "100%", md: "480px" },
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          bgcolor: "#f8f9fa",
          p: { xs: 4, md: 6, lg: 8 },
        }}
      >
        
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
          <Box>
            <Typography variant="body2" fontWeight={600} color="#2c3e50" sx={{ letterSpacing: 0.5 }}>
              UNIVERSIDAD NACIONAL AUTÓNOMA DE MÉXICO
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Portal Académico Institucional
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#27ae60" }} />
            <Typography variant="caption" fontWeight="600" color="text.secondary">
              SISTEMA EN LÍNEA
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", flex: 1, my: 4 }}>
          <Paper
            elevation={4}
            sx={{
              backgroundColor: "#fdf899",
              width: "100%",
              maxWidth: 400,
              borderRadius: "24px",
              transform: "rotate(-2deg)",
              boxShadow: "4px 8px 24px rgba(0,0,0,0.08)",
              transition: "transform 0.3s ease",
            }}
          >
            <Box sx={{ transform: "rotate(2deg)", p: { xs: 3, md: 5 }, position: "relative", zIndex: 2 }}>
              <Stack
                component="form"
                spacing={3.5}
                onSubmit={handleSubmit}
              >
                <Box>
                  <Typography
                    variant="caption"
                    fontWeight="700"
                    sx={{
                      color: "#8a8342",
                      letterSpacing: 1,
                      display: "block",
                      mb: 1
                    }}
                  >
                    ACCESO INSTITUCIONAL
                  </Typography>
                  <Typography variant="h5" fontWeight={800} color="#1e293b">
                    Bienvenido.
                  </Typography>
                  <Typography variant="body1" color="#475569" sx={{ mt: 0.5 }}>
                    Inicio de Sesión
                  </Typography>
                </Box>

                {error && <Alert severity="error" sx={{ borderRadius: 2, py: 0 }}>{error}</Alert>}

                <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                  <TextField
                    label="Correo electrónico"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={handleChange}
                    disabled={loading}
                    fullWidth
                    required
                    variant="standard"
                    slotProps={{
                      inputLabel: {
                        sx: {
                          fontSize: "0.9rem",
                          color: "#475569",
                        },
                      },
                    }}
                  />

                  <Box>
                    <TextField
                      label="Contraseña"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      value={form.password}
                      onChange={handleChange}
                      disabled={loading}
                      fullWidth
                      required
                      variant="standard"
                      slotProps={{
                        inputLabel: {
                          sx: {
                            fontSize: "0.9rem",
                            color: "#475569",
                          },
                        },
                      }}
                    />
                    <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
                      <Link href="#" underline="hover" variant="caption" sx={{ color: "#3b82f6", fontWeight: 500 }}>
                        ¿Olvidó su contraseña?
                      </Link>
                    </Box>
                  </Box>
                </Box>

                <Button
                  variant="contained"
                  size="large"
                  type="submit"
                  disabled={loading}
                  sx={{
                    mt: 2,
                    py: 1.2,
                    borderRadius: "12px",
                    backgroundColor: "#0f172a",
                    fontWeight: '600',
                    textTransform: 'none',
                    fontSize: '0.95rem',
                    boxShadow: "none",
                    "&:hover": {
                      backgroundColor: "#1e293b",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    }
                  }}
                >
                  {loading ? "Ingresando..." : "Ingresar"}
                </Button>

                <Typography
                  variant="body2"
                  textAlign="center"
                  color="#475569"
                >
                  ¿No tienes cuenta?{" "}
                  <Link
                    component={RouterLink}
                    to="/registro"
                    underline="hover"
                  >
                    Crear cuenta
                  </Link>
                </Typography>
                
              </Stack>
            </Box>
          </Paper>
        </Box>

        {/* Pie de página */}
        <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center", mt: 2 }}>
          Si presenta problemas para acceder, contacte a <strong>ejemplo.soporte@cuautitlan.unam.mx</strong> o llame a la extensión 4400.
        </Typography>
      </Box>

      
      <Box
        sx={{
          flex: 3,
          bgcolor: "#364150", 
          display: { xs: "none", md: "flex" },
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Box sx={{ color: "white", textAlign: "center", px: 6, maxWidth: "800px" }}>
          <Typography variant="h3" fontWeight={300} sx={{ fontStyle: "italic", mb: 3 }}>
            "Congreso de tecnología e innovación."
          </Typography>
          <Typography variant="subtitle2" color="grey.400" sx={{ letterSpacing: 3, textTransform: 'uppercase' }}>
            — Congreso Universitario FESC
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}