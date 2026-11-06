import {
  AppBar,
  Box,
  Button,
  IconButton,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";

import MenuIcon from "@mui/icons-material/Menu";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../features/auth/context/AuthContext";

export default function Topbar({ menuOpen, onOpenMenu }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={(theme) => ({
        bgcolor: "rgba(7, 18, 33, 0.88)",
        backdropFilter: "blur(20px)",
        backgroundImage: "none",
        borderBottom: "1px solid rgba(255, 255, 255, 0.10)",
        zIndex: {
          xs: theme.zIndex.appBar,
          md: theme.zIndex.drawer + 1,
        },
      })}
    >
      <Toolbar
        sx={{
          minHeight: { xs: 58, sm: 64, md: 72 },
          maxWidth: 1440,
          width: "100%",
          mx: "auto",
          px: { xs: 1.5, sm: 2.5, md: 4 },
        }}
      >
        <IconButton
          color="inherit"
          edge="start"
          aria-label="Abrir menú de navegación"
          aria-expanded={menuOpen}
          onClick={onOpenMenu}
          sx={{
            mr: { xs: 1, sm: 1.5 },
            p: { xs: 0.8, sm: 1 },
            color: "#e7c77d",
            display: { xs: "inline-flex", md: "none" },
            "&:hover": { bgcolor: "rgba(231, 199, 125, 0.12)" },
          }}
        >
          <MenuIcon sx={{ fontSize: { xs: "1.4rem", sm: "1.6rem" } }} />
        </IconButton>

        <Stack
          direction="row"
          alignItems="center"
          spacing={{ xs: 1, sm: 2 }}
          sx={{ flexGrow: 1, minWidth: 0, mr: { xs: 1, sm: 2 } }}
        >
          <Typography
            variant="h6"
            noWrap
            sx={{
              fontWeight: 800,
              letterSpacing: "-0.03em",
              fontSize: { xs: "1.1rem", sm: "1.25rem", md: "1.35rem" },
              color: "#ffffff",
              flexShrink: 0,
            }}
          >
            CONING
          </Typography>

          <Box
            sx={{
              display: { xs: "none", sm: "block" },
              width: "1px",
              height: 28,
              bgcolor: "rgba(255, 255, 255, 0.18)",
              flexShrink: 0,
            }}
          />

          <Box
            sx={{
              display: { xs: "none", sm: "flex" },
              flexDirection: "column",
              justifyContent: "center",
              minWidth: 0,
              maxWidth: { sm: "340px", md: "560px", lg: "820px" },
            }}
          >
            <Typography
              noWrap
              sx={{
                color: "#e7c77d",
                fontSize: { sm: "0.68rem", md: "0.72rem" },
                fontWeight: 700,
                letterSpacing: "0.06em",
                lineHeight: 1.25,
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              Congreso Científico Tecnológico de las carreras de Ingeniería Mecánica Eléctrica, Industrial y Telecomunicaciones, Sistemas y Electrónica
            </Typography>

            <Typography
              noWrap
              sx={{
                color: "rgba(231, 199, 125, 0.85)",
                fontSize: { sm: "0.66rem", md: "0.70rem" },
                fontWeight: 700,
                letterSpacing: "0.10em",
                lineHeight: 1.2,
              }}
            >
              FESC · UNAM
            </Typography>
          </Box>
        </Stack>

        {/* Botón Cerrar Sesión - Responsivo: Compacto en móviles, Completo en escritorio */}
        <Box sx={{ flexShrink: 0 }}>
          <Box sx={{ display: { xs: "inline-flex", sm: "none" } }}>
            <Tooltip title="Cerrar sesión">
              <IconButton
                aria-label="Cerrar sesión"
                onClick={handleLogout}
                sx={{
                  color: "#e7c77d",
                  border: "1px solid rgba(231, 199, 125, 0.35)",
                  bgcolor: "rgba(231, 199, 125, 0.06)",
                  p: 0.9,
                  "&:hover": {
                    borderColor: "#e7c77d",
                    bgcolor: "rgba(231, 199, 125, 0.16)",
                  },
                }}
              >
                <LogoutOutlinedIcon sx={{ fontSize: "1.15rem" }} />
              </IconButton>
            </Tooltip>
          </Box>

          <Button
            variant="outlined"
            startIcon={<LogoutOutlinedIcon sx={{ fontSize: "1.1rem !important" }} />}
            onClick={handleLogout}
            sx={{
              display: { xs: "none", sm: "inline-flex" },
              textTransform: "none",
              fontWeight: 700,
              fontSize: { sm: "0.80rem", md: "0.85rem" },
              px: { sm: 1.8, md: 2.2 },
              py: { sm: 0.7, md: 0.85 },
              borderRadius: "10px",
              color: "#e7c77d",
              borderColor: "rgba(231, 199, 125, 0.42)",
              bgcolor: "rgba(231, 199, 125, 0.04)",
              whiteSpace: "nowrap",
              transition: "all 0.2s ease",
              "&:hover": {
                borderColor: "#e7c77d",
                bgcolor: "rgba(231, 199, 125, 0.14)",
                color: "#f2d99c",
              },
            }}
          >
            Cerrar sesión
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
