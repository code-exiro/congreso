import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import { Link as RouterLink } from "react-router-dom";

import { useAuth } from "../../auth/context/AuthContext";

export default function HomePage() {
  const { user } = useAuth();

  const name = user?.first_name || user?.email || "participante";
  const fullName = [user?.first_name, user?.last_name, user?.maternal_last_name]
    .filter(Boolean)
    .join(" ");
  const roles = user?.roles ?? [];
  const menus = Array.isArray(user?.menus) ? user.menus : [];

  return (
    <Stack spacing={3}>
      {/* Tarjeta principal de bienvenida */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, sm: 4, md: 5 },
          color: "#ffffff",
          bgcolor: "rgba(10, 24, 42, 0.78)",
          backdropFilter: "blur(16px)",
          backgroundImage:
            "radial-gradient(circle at top right, rgba(231, 199, 125, 0.10), transparent 55%)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "20px",
          boxShadow: "0 24px 70px rgba(0, 0, 0, 0.25)",
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.5}
          flexWrap="wrap"
          useFlexGap
          sx={{ mb: 2 }}
        >
          <Box
            sx={{
              px: 1.5,
              py: 0.45,
              borderRadius: "999px",
              bgcolor: "rgba(231, 199, 125, 0.14)",
              border: "1px solid rgba(231, 199, 125, 0.35)",
              color: "#e7c77d",
              fontSize: "0.70rem",
              fontWeight: 700,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
            }}
          >
            Panel de inicio
          </Box>

          
        </Stack>

        <Typography
          component="h1"
          sx={{
            fontSize: { xs: "2.2rem", sm: "3rem", lg: "3.6rem" },
            lineHeight: 1.08,
            fontWeight: 800,
            letterSpacing: "-0.045em",
            color: "#ffffff",
          }}
        >
          Bienvenido, {name}
          <Box component="span" sx={{ color: "#e7c77d" }}>
            .
          </Box>
        </Typography>

        <Box
          sx={{
            width: 54,
            height: 3,
            bgcolor: "#e7c77d",
            my: 3,
            borderRadius: "2px",
          }}
        />

        <Stack
          direction="row"
          alignItems="center"
          spacing={1.2}
          flexWrap="wrap"
          useFlexGap
        >
          <Typography
            sx={{
              color: "#d6deeb",
              fontSize: "0.92rem",
              fontWeight: 600,
            }}
          >
            Roles:
          </Typography>

          {roles.length > 0 ? (
            roles.map((role) => (
              <Box
                key={role}
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.8,
                  px: 1.6,
                  py: 0.55,
                  borderRadius: "10px",
                  bgcolor: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(231, 199, 125, 0.32)",
                  color: "#ffffff",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                }}
              >
                <ShieldOutlinedIcon
                  sx={{ fontSize: "1rem", color: "#e7c77d" }}
                />
                {role}
              </Box>
            ))
          ) : (
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                px: 1.5,
                py: 0.5,
                borderRadius: "10px",
                bgcolor: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#94a3b8",
                fontSize: "0.85rem",
                fontWeight: 600,
              }}
            >
              Sin roles asignados
            </Box>
          )}
        </Stack>
      </Paper>

      {/* Tarjetas informativas basadas únicamente en datos reales de la sesión */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            md: menus.length > 0 ? "repeat(2, minmax(0, 1fr))" : "minmax(0, 1fr)",
          },
          gap: 3,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: 3.5,
            color: "#ffffff",
            bgcolor: "rgba(10, 24, 42, 0.78)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "20px",
            boxShadow: "0 20px 50px rgba(0, 0, 0, 0.20)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="flex-start"
            spacing={2}
          >
            <Box>
              <Typography
                sx={{
                  color: "#94a3b8",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  mb: 1,
                }}
              >
                Cuenta activa
              </Typography>
              <Typography
                sx={{
                  fontSize: "1.35rem",
                  fontWeight: 750,
                  letterSpacing: "-0.02em",
                  color: "#ffffff",
                }}
              >
                {fullName || name}
              </Typography>
            </Box>

            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: "12px",
                bgcolor: "rgba(231, 199, 125, 0.12)",
                border: "1px solid rgba(231, 199, 125, 0.28)",
                display: "grid",
                placeItems: "center",
                color: "#e7c77d",
                flexShrink: 0,
              }}
            >
              <MailOutlineRoundedIcon fontSize="small" />
            </Box>
          </Stack>

          <Typography
            sx={{
              mt: 2.5,
              color: "#d6deeb",
              fontSize: "0.9rem",
            }}
          >
            {user?.email}
          </Typography>
        </Paper>

        {menus.map((menu) => (
          <Paper
            key={menu.id}
            elevation={0}
            sx={{
              p: 3.5,
              color: "#ffffff",
              bgcolor: "rgba(10, 24, 42, 0.78)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "20px",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.20)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="flex-start"
              spacing={2}
            >
              <Box>
                <Typography
                  sx={{
                    color: "#e7c77d",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    mb: 1,
                  }}
                >
                  Módulo habilitado
                </Typography>
                <Typography
                  sx={{
                    fontSize: "1.35rem",
                    fontWeight: 750,
                    letterSpacing: "-0.02em",
                    color: "#ffffff",
                  }}
                >
                  {menu.name}
                </Typography>
              </Box>

              <Box
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: "12px",
                  bgcolor: "rgba(231, 199, 125, 0.12)",
                  border: "1px solid rgba(231, 199, 125, 0.28)",
                  display: "grid",
                  placeItems: "center",
                  color: "#e7c77d",
                  flexShrink: 0,
                }}
              >
                {menu.icon === "shield" ? (
                  <ShieldOutlinedIcon fontSize="small" />
                ) : (
                  <DescriptionOutlinedIcon fontSize="small" />
                )}
              </Box>
            </Stack>

            <Box sx={{ mt: 2.5 }}>
              <Button
                component={RouterLink}
                to={menu.route}
                variant="contained"
                endIcon={<ArrowForwardRoundedIcon />}
                sx={{
                  py: 1,
                  px: 2.2,
                  bgcolor: "#e7c77d",
                  color: "#102138",
                  borderRadius: "10px",
                  fontWeight: 800,
                  textTransform: "none",
                  boxShadow: "none",
                  "&:hover": {
                    bgcolor: "#f2d99c",
                    boxShadow: "none",
                  },
                }}
              >
                Ir a {menu.name}
              </Button>
            </Box>
          </Paper>
        ))}
      </Box>
    </Stack>
  );
}