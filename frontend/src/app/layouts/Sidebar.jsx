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
import AcUnitIcon from "@mui/icons-material/AcUnit";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../features/auth/context/AuthContext";

const navButtonSx = {
  borderRadius: 1.5,
  "&.active": {
    bgcolor: "action.selected",
    color: "primary.main",
    "& .MuiListItemIcon-root": { color: "primary.main" },
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
      sx={{ ...navButtonSx, pl: nested ? 4 : 2 }}
    >
      <ListItemIcon><Icon /></ListItemIcon>
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
  const generalMenus = menus.filter((menu) =>
    !menu.route?.startsWith("/configuraciones/"),
  );
  const [settingsExpanded, setSettingsExpanded] = useState(true);

  return (
    <Box sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
      <Drawer
        variant={isDesktop ? "permanent" : "temporary"}
        open={isDesktop || mobileOpen}
        onClose={onClose}
        sx={{
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            maxWidth: "100vw",
            boxSizing: "border-box",
          },
        }}
      >
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <Typography variant="subtitle1" sx={{ display: { xs: "block", md: "none" } }}>
            Menú
          </Typography>
          <IconButton
            aria-label="Cerrar menú de navegación"
            onClick={onClose}
            sx={{ display: { xs: "inline-flex", md: "none" } }}
          >
            <CloseIcon />
          </IconButton>
        </Toolbar>
        <Divider />
        <List component="nav" aria-label="Navegación principal" sx={{ p: 1 }}>
          <ListItemButton
            component={NavLink}
            to="/"
            end
            onClick={onClose}
            sx={navButtonSx}
          >
            <ListItemIcon><HomeOutlinedIcon /></ListItemIcon>
            <ListItemText primary="Inicio" />
          </ListItemButton>

          <ListItemButton disabled sx={{ borderRadius: 1.5 }}>
            <ListItemIcon><DescriptionOutlinedIcon /></ListItemIcon>
            <ListItemText primary="Mis trabajos" />
          </ListItemButton>
          <ListItemButton disabled sx={{ borderRadius: 1.5 }}>
            <ListItemIcon><AcUnitIcon /></ListItemIcon>
            <ListItemText primary="Perfil" />
          </ListItemButton>

          {generalMenus.map((menu) => (
            <MenuEntry key={menu.id} menu={menu} onClose={onClose} />
          ))}

          {settingsMenus.length > 0 && (
            <>
              <Divider sx={{ my: 1 }} />
              <ListItemButton
                selected={pathname.startsWith("/configuraciones/")}
                onClick={() => setSettingsExpanded((value) => !value)}
                sx={{ borderRadius: 1.5 }}
                aria-expanded={settingsExpanded}
              >
                <ListItemIcon><SettingsOutlinedIcon /></ListItemIcon>
                <ListItemText primary="Configuraciones" />
                {settingsExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </ListItemButton>
              <Collapse in={settingsExpanded} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  {settingsMenus.map((menu) => (
                    <MenuEntry key={menu.id} menu={menu} onClose={onClose} nested />
                  ))}
                </List>
              </Collapse>
            </>
          )}
        </List>
      </Drawer>
    </Box>
  );
}
