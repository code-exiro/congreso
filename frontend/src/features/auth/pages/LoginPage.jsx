import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  GlobalStyles,
  InputAdornment,
  Link,
  Stack,
  TextField,
  Typography,
  IconButton,
} from "@mui/material";

import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";

import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    color: "#102138",
    backgroundColor: "#f6f8fc",
    borderRadius: "8px",
    "& fieldset": { borderColor: "transparent" },
    "&:hover fieldset": { borderColor: "#c7a65b" },
    "&.Mui-focused fieldset": { borderColor: "#e7c77d", borderWidth: 2 },
    "&.Mui-disabled": { backgroundColor: "#dce2eb" },
  },
  "& .MuiInputBase-input": {
    py: 1.7,
    fontSize: "0.95rem",
    "&::placeholder": { color: "#526176", opacity: 1 },
  },
};

export default function LoginPage() {
  
  const [backgroundImage] = useState(() => {
    const imageNumber = Math.random() < 0.5 ? 1 : 2;

    return `${import.meta.env.BASE_URL}images/login-background${imageNumber}.jpg`;
  });

  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
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
    <>
      <GlobalStyles
        styles={{
          body: { margin: 0 },
          "#root": {
            width: "100%",
            maxWidth: "none",
            minHeight: "100svh",
            margin: 0,
            padding: 0,
          },
        }}
      />
      <Box
        component="main"
        sx={{
          boxSizing: "border-box",
          minHeight: "100svh",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          color: "#fff",
          position: "relative",
          isolation: "isolate",
          overflow: "hidden",

          "&::before": {
            content: '""',
            position: "absolute",
            inset: "-8px",
            zIndex: -2,
            backgroundImage: `url("${backgroundImage}")`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(2px)",
          },

          "&::after": {
            content: '""',
            position: "absolute",
            inset: 0,
            zIndex: -1,
            background: {
              xs: "rgba(7, 18, 33, .65)",
              md: `linear-gradient(
                90deg,
                rgba(7, 18, 33, .55) 0%,
                rgba(7, 18, 33, .40) 45%,
                rgba(7, 18, 33, .80) 100%
              )`,
            },
          },
          bgcolor: "#0d1c2d",
          px: { xs: 3, sm: 5, md: 7, lg: 10 },
          py: { xs: 3, md: 5 },
          "& a:focus-visible, & button:focus-visible": {
            outline: "3px solid #e7c77d",
            outlineOffset: "4px",
          },
        }}
      >
        <Box component="header" sx={{ width: "100%", maxWidth: 1320, mx: "auto" }}>
          <Typography
            sx={{ fontSize: { xs: "0.72rem", sm: "0.82rem" }, fontWeight: 700, letterSpacing: "0.08em" }}
          >
            UNIVERSIDAD NACIONAL AUTÓNOMA DE MÉXICO
          </Typography>
          <Typography sx={{ mt: 0.75, fontSize: "0.78rem", color: "#d6deeb" }}>
            Facultad de Estudios Superiores Cuautitlán
          </Typography>
        </Box>

        <Box
          sx={{
            flex: 1,
            width: "100%",
            maxWidth: 1320,
            mx: "auto",
            display: "grid",
            gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 1.25fr) minmax(0, 1fr)" },
            alignItems: "center",
            columnGap: { md: 8, lg: 14 },
            rowGap: 5,
            py: { xs: 6, md: 9 },
          }}
        >
          <Box sx={{ maxWidth: 590 }}>
            <Typography
              sx={{ color: "#e7c77d", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.22em", mb: 2.5 }}
            >
              CONGRESO UNIVERSITARIO · FESC
            </Typography>
            <Typography
              component="h1"
              sx={{
                fontSize: { xs: "2.8rem", sm: "3.8rem", lg: "5rem" },
                lineHeight: 1.06,
                fontWeight: 800,
                letterSpacing: "-0.045em",
                textWrap: "balance",
              }}
            >
              Las ideas nos
              <Box component="span" sx={{ display: "block", color: "#e7c77d" }}>
                conectan.
              </Box>
            </Typography>
            <Box sx={{ width: 54, height: 3, bgcolor: "#e7c77d", my: 3.5 }} />
            <Typography sx={{ maxWidth: 430, color: "#e1e7ef", fontSize: { xs: "1rem", md: "1.2rem" }, lineHeight: 1.8 }}>
              Un espacio para compartir conocimiento, presentar tus trabajos
              y construir nuevas perspectivas.
            </Typography>
          </Box>

          <Box 
            sx={{ 
              width: "100%", 
              maxWidth: 410, 
              justifySelf: { xs: "center", md: "end" }, 
              minWidth: 0,
            }}
          >
            <Stack component="form" spacing={3} onSubmit={handleSubmit} aria-labelledby="login-heading" aria-busy={loading}>
              <Box>
                <Typography component="h2" id="login-heading" sx={{ fontSize: "2rem", fontWeight: 750, letterSpacing: "-0.03em" }}>
                  Inicia sesión
                </Typography>
                <Typography sx={{ mt: 1, color: "#d6deeb", fontSize: "0.95rem", lineHeight: 1.6 }}>
                  Bienvenido de nuevo a tu espacio académico.
                </Typography>
              </Box>

              {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}

              <Box>
                <Typography component="label" htmlFor="login-email" sx={{ display: "block", mb: 1, fontSize: "0.875rem", fontWeight: 600 }}>
                  Correo electrónico
                </Typography>
                <TextField
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="tu.correo@ejemplo.com"
                  value={form.email}
                  onChange={handleChange}
                  disabled={loading}
                  required
                  fullWidth
                  variant="outlined"
                  sx={fieldSx}
                />
              </Box>

              <Box>
                <Typography component="label" htmlFor="login-password" sx={{ display: "block", mb: 1, fontSize: "0.875rem", fontWeight: 600 }}>
                  Contraseña
                </Typography>
                <TextField
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Ingresa tu contraseña"
                  value={form.password}
                  onChange={handleChange}
                  disabled={loading}
                  required
                  fullWidth
                  variant="outlined"
                  sx={fieldSx}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            type="button"
                            disabled={loading}
                            onClick={() => setShowPassword((previous) => !previous)}
                            onMouseDown={(event) => event.preventDefault()}
                            aria-label={
                              showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                            }
                            aria-pressed={showPassword}
                            edge="end"
                            sx={{ color: "#526176" }}
                          >
                            {showPassword ? (
                              <VisibilityOffOutlinedIcon fontSize="small" />
                            ) : (
                              <VisibilityOutlinedIcon fontSize="small" />
                            )}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </Box>

              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
                fullWidth
                sx={{
                  py: 1.6,
                  bgcolor: "#e7c77d",
                  color: "#102138",
                  borderRadius: "8px",
                  fontWeight: 800,
                  textTransform: "none",
                  boxShadow: "none",
                  "&:hover": { bgcolor: "#f2d99c", boxShadow: "none" },
                  "&.Mui-disabled": { bgcolor: "#8e866f", color: "#152033" },
                }}
              >
                {loading ? "Ingresando..." : "Ingresar"}
              </Button>

              <Typography sx={{ textAlign: "center", color: "#d6deeb", fontSize: "0.9rem" }}>
                ¿No tienes cuenta?{" "}
                <Link component={RouterLink} to="/registro" underline="hover" sx={{ color: "#e7c77d", fontWeight: 700 }}>
                  Crear cuenta
                </Link>
              </Typography>
            </Stack>
          </Box>
        </Box>

        <Box
          component="footer"
          sx={{ width: "100%", maxWidth: 1320, mx: "auto", pt: 2.5, borderTop: "1px solid rgba(255,255,255,.18)" }}
        >
          <Typography sx={{ color: "#d6deeb", fontSize: "0.75rem", textAlign: { xs: "center", md: "left" } }}>
            Congreso Universitario FESC · Portal académico
          </Typography>
        </Box>
      </Box>
    </>
  );
}