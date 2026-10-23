import {
  AppBar,
  IconButton,
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
      elevation={1}
      sx={(theme) => ({
        zIndex: {
          xs: theme.zIndex.appBar,
          md: theme.zIndex.drawer + 1,
        },
      })}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          edge="start"
          aria-label="Abrir menú de navegación"
          aria-expanded={menuOpen}
          onClick={onOpenMenu}
          sx={{
            mr: 2,
            display: { xs: "inline-flex", md: "none" },
          }}
        >
          <MenuIcon />
        </IconButton>

        <Typography
          variant="h6"
          noWrap
          sx={{ flexGrow: 1, minWidth: 0 }}
        >
          Sistema de Congresos
        </Typography>

        <Button
          color="inherit"
          variant="outlined"
          startIcon={<LogoutOutlinedIcon />}
          onClick={handleLogout}
          sx={{
            textTransform: "none",
            fontWeight: 600,
            borderRadius: 2,
            borderColor: "rgba(255,255,255,0.6)",
            whiteSpace: "nowrap",
            "&:hover": {
              borderColor: "#fff",
              backgroundColor: "rgba(255,255,255,0.1)",
            },
          }}
        >
          Cerrar sesión
        </Button>
      </Toolbar>
    </AppBar>
  );
}