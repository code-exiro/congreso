import { useEffect, useState } from "react";
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
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import FormatListBulletedOutlinedIcon from "@mui/icons-material/FormatListBulletedOutlined";
import TaskAltOutlinedIcon from "@mui/icons-material/TaskAltOutlined";
import RateReviewOutlinedIcon from "@mui/icons-material/RateReviewOutlined";
import HowToRegOutlinedIcon from "@mui/icons-material/HowToRegOutlined";
import WorkspacePremiumOutlinedIcon from "@mui/icons-material/WorkspacePremiumOutlined";
import ManageAccountsOutlinedIcon from "@mui/icons-material/ManageAccountsOutlined";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import GavelOutlinedIcon from "@mui/icons-material/GavelOutlined";
import PaletteOutlinedIcon from "@mui/icons-material/PaletteOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
<<<<<<< HEAD
import FolderSharedOutlinedIcon from "@mui/icons-material/FolderSharedOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
=======
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
>>>>>>> 1ff2a4bd260c0e69ca1b3ed9ed7b8a8c9b999b50
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../features/auth/context/AuthContext";

const navButtonSx = {
  borderRadius: "12px",
  mb: 0.6,
  py: 1.1,
  px: 2,
  color: "#d6deeb",
  border: "1px solid transparent",
  transition: "all 0.2s ease",
  "& .MuiListItemIcon-root": {
    color: "#94a3b8",
    minWidth: 36,
    transition: "color 0.2s ease",
  },
  "& .MuiListItemText-primary": {
    fontSize: "0.90rem",
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

const menuIcons = {
  home: HomeOutlinedIcon,
  person: PersonOutlineOutlinedIcon,
  description: DescriptionOutlinedIcon,
  list_alt: FormatListBulletedOutlinedIcon,
  task_alt: TaskAltOutlinedIcon,
  rate_review: RateReviewOutlinedIcon,
  how_to_reg: HowToRegOutlinedIcon,
  workspace_premium: WorkspacePremiumOutlinedIcon,
  manage_accounts: ManageAccountsOutlinedIcon,
  tune: TuneOutlinedIcon,
  gavel: GavelOutlinedIcon,
  palette: PaletteOutlinedIcon,
  settings: SettingsOutlinedIcon,
  shield: ShieldOutlinedIcon,
};

const CATEGORIES_CONFIG = [
  {
    id: "trabajos",
    name: "Trabajos y Solicitudes",
    icon: FolderSharedOutlinedIcon,
    prefix: "/trabajos/",
    matcher: (m) => m.category === "Trabajos y Solicitudes" || m.route?.startsWith("/trabajos/"),
  },
  {
    id: "evaluaciones",
    name: "Evaluaciones",
    icon: FactCheckOutlinedIcon,
    prefix: "/evaluaciones/",
    matcher: (m) => m.category === "Evaluaciones" || m.route?.startsWith("/evaluaciones/"),
  },
  {
    id: "eventos",
    name: "Eventos y Constancias",
    icon: EventAvailableOutlinedIcon,
    prefix: "/eventos/",
    matcher: (m) => m.category === "Eventos y Constancias" || m.route?.startsWith("/eventos/"),
  },
  {
    id: "configuraciones",
    name: "Configuraciones",
    icon: SettingsOutlinedIcon,
    prefix: "/configuraciones/",
    matcher: (m) => m.category === "Configuraciones" || m.route?.startsWith("/configuraciones/"),
  },
];

function MenuEntry({ menu, onClose, nested = false }) {
  const Icon = menuIcons[menu.icon] || DescriptionOutlinedIcon;
  return (
    <ListItemButton
      key={menu.id || menu.route}
      component={NavLink}
      to={menu.route}
      onClick={onClose}
      sx={{
        ...navButtonSx,
        pl: nested ? 3.5 : 2,
        py: nested ? 0.9 : 1.1,
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

  // Determinar si Mi Perfil está en los menús del usuario
  const perfilMenu = menus.find((m) => m.route === "/perfil");

  // Estado para cada grupo colapsable
  const [expanded, setExpanded] = useState({
    trabajos: true,
    evaluaciones: true,
    eventos: true,
    configuraciones: true,
  });

  // Expandir automáticamente la sección si el usuario navega a ella
  useEffect(() => {
    CATEGORIES_CONFIG.forEach((cat) => {
      if (pathname.startsWith(cat.prefix)) {
        setExpanded((prev) => ({ ...prev, [cat.id]: true }));
      }
    });
  }, [pathname]);

  const toggleCategory = (catId) => {
    setExpanded((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  const navContent = (
    <List
      component="nav"
      aria-label="Navegación principal"
      sx={{
        p: { xs: 1.5, sm: 2 },
        "& .MuiDivider-root": {
          my: 1.8,
          borderColor: "rgba(255, 255, 255, 0.08)",
        },
      }}
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

      {/* Inicio - Accesible para todos */}
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

      {/* Mi Perfil - Accesible para todos los roles */}
      <ListItemButton
        component={NavLink}
        to={perfilMenu?.route || "/perfil"}
        onClick={onClose}
        sx={navButtonSx}
      >
        <ListItemIcon>
          <PersonOutlineOutlinedIcon />
        </ListItemIcon>
        <ListItemText primary={perfilMenu?.name || "Mi Perfil"} />
      </ListItemButton>

      {/* Secciones dinámicas por rol organizadas en categorías */}
      {CATEGORIES_CONFIG.map((cat) => {
        const catMenus = menus.filter(cat.matcher);
        if (catMenus.length === 0) return null;

        const CatIcon = cat.icon;
        const isCurrentCategoryActive = pathname.startsWith(cat.prefix);
        const isOpen = Boolean(expanded[cat.id]);

        return (
          <Box key={cat.id}>
            <Divider />
            <ListItemButton
              onClick={() => toggleCategory(cat.id)}
              sx={{
                ...navButtonSx,
                ...(isCurrentCategoryActive && {
                  bgcolor: "rgba(255, 255, 255, 0.05)",
                  color: "#ffffff",
                  "& .MuiListItemIcon-root": { color: "#e7c77d" },
                }),
              }}
              aria-expanded={isOpen}
            >
              <ListItemIcon>
                <CatIcon />
              </ListItemIcon>
              <ListItemText
                primary={cat.name}
                primaryTypographyProps={{
                  fontWeight: isCurrentCategoryActive ? 700 : 600,
                  fontSize: "0.90rem",
                }}
              />
              {isOpen ? (
                <ExpandLessIcon sx={{ color: "#94a3b8", fontSize: "1.2rem" }} />
              ) : (
                <ExpandMoreIcon sx={{ color: "#94a3b8", fontSize: "1.2rem" }} />
              )}
            </ListItemButton>

            <Collapse in={isOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding sx={{ mt: 0.3 }}>
                {catMenus.map((menu) => (
                  <MenuEntry
                    key={menu.id || menu.route}
                    menu={menu}
                    onClose={onClose}
                    nested
                  />
                ))}
              </List>
            </Collapse>
          </Box>
        );
      })}
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
          top: 92,
          maxHeight: "calc(100vh - 110px)",
          bgcolor: "rgba(10, 24, 42, 0.78)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "20px",
          boxShadow: "0 24px 70px rgba(0, 0, 0, 0.25)",
          overflowY: "auto",
          overflowX: "hidden",
          "&::-webkit-scrollbar": {
            width: "5px",
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "rgba(231, 199, 125, 0.20)",
            borderRadius: "4px",
          },
          "&::-webkit-scrollbar-thumb:hover": {
            backgroundColor: "rgba(231, 199, 125, 0.40)",
          },
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
      ModalProps={{
        keepMounted: true, // Optimiza renderizado en móviles
      }}
      sx={{
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          maxWidth: "85vw",
          boxSizing: "border-box",
          bgcolor: "rgba(10, 24, 42, 0.96)",
          backdropFilter: "blur(20px)",
          color: "#ffffff",
          borderRight: "1px solid rgba(255, 255, 255, 0.12)",
          backgroundImage: "none",
          overflowY: "auto",
        },
      }}
    >
      <Toolbar
        sx={{
          justifyContent: "space-between",
          px: 2.5,
          minHeight: { xs: 58, sm: 64 },
          borderBottom: "1px solid rgba(255, 255, 255, 0.10)",
        }}
      >
        <Typography
          sx={{
            fontWeight: 800,
            color: "#e7c77d",
            fontSize: "0.88rem",
            letterSpacing: "0.14em",
          }}
        >
          CONING · NAVEGACIÓN
        </Typography>
        <IconButton
          aria-label="Cerrar menú de navegación"
          onClick={onClose}
          sx={{
            color: "#d6deeb",
            p: 1,
            "&:hover": { color: "#e7c77d", bgcolor: "rgba(255,255,255,0.06)" },
          }}
        >
          <CloseIcon />
        </IconButton>
      </Toolbar>
      {navContent}
    </Drawer>
  );
}
