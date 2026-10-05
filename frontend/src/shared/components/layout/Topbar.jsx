// src/shared/components/layout/Topbar.jsx

import {
  AppBar,
  Toolbar,
  Typography,
} from "@mui/material";


export default function Topbar() {
  return (
    <AppBar
      position="fixed"
      sx={{
        zIndex: (theme) =>
          theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar>
        <Typography
          variant="h6"
          noWrap
        >
          Sistema de Congresos
        </Typography>
      </Toolbar>
    </AppBar>
  );
}