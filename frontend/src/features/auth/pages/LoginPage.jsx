import { useState } from "react";

import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";


export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    username: "",
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

    setError("");
    setLoading(true);

    try {
      await login(
        form.username,
        form.password
      );

      navigate("/");
    } catch (requestError) {
      setError(
        requestError.response?.data?.non_field_errors?.[0] ??
          "No fue posible iniciar sesión."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        bgcolor: "grey.100",
        px: 2,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          width: "100%",
          maxWidth: 420,
          p: 4,
        }}
      >
        <Stack
          component="form"
          spacing={3}
          onSubmit={handleSubmit}
        >
          <Box>
            <Typography
              variant="h4"
              fontWeight={700}
            >
              Congreso
            </Typography>

            <Typography color="text.secondary">
              Inicia sesión para continuar
            </Typography>
          </Box>

          {error && (
            <Alert severity="error">
              {error}
            </Alert>
          )}

          <TextField
            label="Usuario"
            name="username"
            value={form.username}
            onChange={handleChange}
            fullWidth
            required
          />

          <TextField
            label="Contraseña"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            fullWidth
            required
          />

          <Button
            variant="contained"
            size="large"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Iniciando sesión..."
              : "Iniciar sesión"}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}