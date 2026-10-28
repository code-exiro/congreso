import { useState } from "react";
import {
  Box,
  Collapse,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../features/auth/context/AuthContext";

const navButtonSx = {
  borderRadius: "12px",
  mb: 0.6,
  py: 1.15,
  px: 2,
  color: "#d6deeb",
  border: "1px solid transparent",
  transition: "all 0.2s ease",
  "& .MuiListItemIcon-root": {
    color: "#94a3b8",
    minWidth: 38,
    transition: "color 0.2s ease",
  },
  "& .MuiListItemText-primary": {
    fontSize: "0.92rem",
    fontWeight: 600,
    letterSpacing: "-0.01em",
  },
  "&:hover": {
    bgcolor: "rgba(255, 255, 255, 0.06)",
    color: "#ffffff",
    "& .MuiListItemIcon-root": {
      color: "#e7c77d",
    },
  },
  "&.active": {
    background:
      "linear-gradient(90deg, rgba(231, 199, 125, 0.20) 0%, rgba(231, 199, 125, 0.04) 100%)",
    borderColor: "rgba(231, 199, 125, 0.30)",
    borderLeft: "3px solid #e7c77d",
    color: "#e7c77d",
    "& .MuiListItemIcon-root": {
      color: "#e7c77d",
    },
    "& .MuiListItemText-primary": {
      fontWeight: 700,
    },
  },
  "&.Mui-disabled": {
    opacity: 0.45,
    color: "#94a3b8",
  },
};

// El backend indica qué menús existen y quién puede verlos.
// El frontend asocia sus iconos y las rutas conocidas con componentes React.
const menuIcons = {
  description: DescriptionOutlinedIcon,
  settings: SettingsOutlinedIcon,
};

function MenuEntry({ menu, onClose, nested = false }) {
  const Icon = menuIcons[menu.icon] || DescriptionOutlinedIcon;
  return (
    <ListItemButton
      key={menu.id}
      component={NavLink}
      to={menu.route}
      onClick={onClose}
      sx={{
        ...navButtonSx,
        pl: nested ? 3.5 : 2,
        py: nested ? 0.95 : 1.15,
      }}
    >
      <ListItemIcon>
        <Icon fontSize={nested ? "small" : "medium"} />
      </ListItemIcon>
      <ListItemText primary={menu.name} />
    </ListItemButton>
  );
}

export default function Sidebar({ drawerWidth, mobileOpen, onClose }) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const { pathname } = useLocation();
  const { user } = useAuth();
  const menus = Array.isArray(user?.menus) ? user.menus : [];
  const settingsMenus = menus.filter((menu) =>
    menu.route?.startsWith("/configuraciones/"),
  );
  const generalMenus = menus.filter(
    (menu) => !menu.route?.startsWith("/configuraciones/"),
  );
  const [settingsExpanded, setSettingsExpanded] = useState(true);

  const navContent = (
    <List
      component="nav"
      aria-label="Navegación principal"
      sx={{ p: 2 }}
    >
      <Typography
        sx={{
          px: 1.5,
          pt: 0.5,
          pb: 1.2,
          fontSize: "0.70rem",
          fontWeight: 700,
          letterSpacing: "0.18em",
          color: "#94a3b8",
          textTransform: "uppercase",
        }}
      >
        Principal
      </Typography>

      <ListItemButton
        component={NavLink}
        to="/"
        end
        onClick={onClose}
        sx={navButtonSx}
      >
        <ListItemIcon>
          <HomeOutlinedIcon />
        </ListItemIcon>
        <ListItemText primary="Inicio" />
      </ListItemButton>

      <ListItemButton disabled sx={navButtonSx}>
        <ListItemIcon>
          <DescriptionOutlinedIcon />
        </ListItemIcon>
        <ListItemText primary="Mis trabajos" />
      </ListItemButton>

      <ListItemButton disabled sx={navButtonSx}>
        <ListItemIcon>
          <PersonOutlineOutlinedIcon />
        </ListItemIcon>
        <ListItemText primary="Perfil" />
      </ListItemButton>

      {generalMenus.map((menu) => (
        <MenuEntry key={menu.id} menu={menu} onClose={onClose} />
      ))}

      {settingsMenus.length > 0 && (
        <>
          <Divider
            sx={{
              my: 2,
              borderColor: "rgba(255, 255, 255, 0.10)",
            }}
          />
          <ListItemButton
            selected={pathname.startsWith("/configuraciones/")}
            onClick={() => setSettingsExpanded((value) => !value)}
            sx={{
              ...navButtonSx,
              "&.Mui-selected": {
                bgcolor: "rgba(255, 255, 255, 0.05)",
                color: "#ffffff",
                "& .MuiListItemIcon-root": { color: "#e7c77d" },
                "&:hover": { bgcolor: "rgba(255, 255, 255, 0.08)" },
              },
            }}
            aria-expanded={settingsExpanded}
          >
            <ListItemIcon>
              <SettingsOutlinedIcon />
            </ListItemIcon>
            <ListItemText primary="Configuraciones" />
            {settingsExpanded ? (
              <ExpandLessIcon sx={{ color: "#94a3b8" }} />
            ) : (
              <ExpandMoreIcon sx={{ color: "#94a3b8" }} />
            )}
          </ListItemButton>

          <Collapse in={settingsExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding sx={{ mt: 0.5 }}>
              {settingsMenus.map((menu) => (
                <MenuEntry
                  key={menu.id}
                  menu={menu}
                  onClose={onClose}
                  nested
                />
              ))}
            </List>
          </Collapse>
        </>
      )}
    </List>
  );

  if (isDesktop) {
    return (
      <Box
        component="aside"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          position: "sticky",
          top: 96,
          bgcolor: "rgba(10, 24, 42, 0.78)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "20px",
          boxShadow: "0 24px 70px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
        }}
      >
        {navContent}
      </Box>
    );
  }

  return (
    <Drawer
      variant="temporary"
      open={mobileOpen}
      onClose={onClose}
      sx={{
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          maxWidth: "85vw",
          boxSizing: "border-box",
          bgcolor: "rgba(10, 24, 42, 0.95)",
          backdropFilter: "blur(16px)",
          color: "#ffffff",
          borderRight: "1px solid rgba(255, 255, 255, 0.12)",
          backgroundImage: "none",
        },
      }}
    >
      <Toolbar sx={{ justifyContent: "space-between", px: 2.5 }}>
        <Typography
          sx={{
            fontWeight: 700,
            color: "#e7c77d",
            fontSize: "0.82rem",
            letterSpacing: "0.14em",
          }}
        >
          MENÚ
        </Typography>
        <IconButton
          aria-label="Cerrar menú de navegación"
          onClick={onClose}
          sx={{ color: "#d6deeb" }}
        >
          <CloseIcon />
        </IconButton>
      </Toolbar>
      <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.10)" }} />
      {navContent}
    </Drawer>
  );
}
