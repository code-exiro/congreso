import {
  Box,
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

import { NavLink } from "react-router-dom";

export default function Sidebar({
  drawerWidth,
  mobileOpen,
  onClose,
}) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));

  return (
    <Box
      sx={{
        width: { md: drawerWidth },
        flexShrink: { md: 0 },
      }}
    >
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
          <Typography
            variant="subtitle1"
            sx={{ display: { xs: "block", md: "none" } }}
          >
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

        <List
          component="nav"
          aria-label="Navegación principal"
          sx={{ p: 1 }}
        >
          <ListItemButton
            component={NavLink}
            to="/"
            end
            onClick={onClose}
            sx={{
              borderRadius: 1,
              "&.active": {
                bgcolor: "action.selected",
                color: "primary.main",
                "& .MuiListItemIcon-root": {
                  color: "primary.main",
                },
              },
            }}
          >
            <ListItemIcon>
              <HomeOutlinedIcon />
            </ListItemIcon>

            <ListItemText primary="Inicio" />
          </ListItemButton>

          <ListItemButton disabled sx={{ borderRadius: 1 }}>
            <ListItemIcon>
              <DescriptionOutlinedIcon />
            </ListItemIcon>

            <ListItemText primary="Mis trabajos" />
          </ListItemButton>

          <ListItemButton disabled sx={{ borderRadius: 1 }}>
            <ListItemIcon>
              <PersonOutlineOutlinedIcon />
            </ListItemIcon>

            <ListItemText primary="Perfil" />
          </ListItemButton>
        </List>
      </Drawer>
    </Box>
  );
}