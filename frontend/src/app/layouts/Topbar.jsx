import {
  AppBar,
  IconButton,
  Toolbar,
  Typography,
} from "@mui/material";

import MenuIcon from "@mui/icons-material/Menu";

export default function Topbar({ menuOpen, onOpenMenu }) {
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
      </Toolbar>
    </AppBar>
  );
}