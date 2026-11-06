import {
  AppBar,
  Box,
  IconButton,
  Stack,
  Toolbar,
  Typography,
  Button,
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
        bgcolor: "rgba(7, 18, 33, 0.82)",
        backdropFilter: "blur(16px)",
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
          minHeight: { xs: 64, md: 72 },
          maxWidth: 1440,
          width: "100%",
          mx: "auto",
          px: { xs: 2, sm: 3, md: 4 },
        }}
      >
        <IconButton
          color="inherit"
          edge="start"
          aria-label="Abrir menú de navegación"
          aria-expanded={menuOpen}
          onClick={onOpenMenu}
          sx={{
            mr: 1.5,
            color: "#e7c77d",
            display: { xs: "inline-flex", md: "none" },
          }}
        >
          <MenuIcon />
        </IconButton>

        <Stack
  direction="row"
  alignItems="center"
  spacing={2}
  sx={{ flexGrow: 1, minWidth: 0 }}
>
  <Typography
    variant="h6"
    noWrap
    sx={{
      fontWeight: 800,
      letterSpacing: "-0.03em",
      fontSize: { xs: "1.1rem", sm: "1.25rem" },
      color: "#ffffff",
    }}
  >
    CONING
  </Typography>

  <Box
    sx={{
      display: { xs: "none", sm: "block" },
      width: "1px",
      height: 28, // ajustado para que cubra la altura de los dos renglones
      bgcolor: "rgba(255, 255, 255, 0.18)",
    }}
  />

 
  <Box
    sx={{
      display: { xs: "none", sm: "flex" },
      flexDirection: "column",
      justifyContent: "center",
      minWidth: 0,
    }}
  >
    <Typography
      noWrap
      sx={{
        color: "#e7c77d",
        fontSize: "0.72rem",
        fontWeight: 700,
        letterSpacing: "0.08em",
        lineHeight: 1.2,
      }}
    >
      Congreso Científico Tecnológico de las carreras de Ingeniería Mecánica Eléctrica, Industrial y Telecomunicaciones, Sistemas y Electrónica
    </Typography>

    <Typography
      noWrap
      sx={{
        color: "#e7c77d",
        fontSize: "0.72rem",
        fontWeight: 700,
        letterSpacing: "0.10em",
        lineHeight: 1.2,
      }}
    >
      FESC
    </Typography>
  </Box>
</Stack>

        <Button
          variant="outlined"
          startIcon={<LogoutOutlinedIcon sx={{ fontSize: "1.1rem !important" }} />}
          onClick={handleLogout}
          sx={{
            textTransform: "none",
            fontWeight: 700,
            fontSize: "0.875rem",
            px: 2.2,
            py: 0.9,
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
      </Toolbar>
    </AppBar>
  );
}