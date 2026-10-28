import { useState } from "react";
import { Box, Toolbar } from "@mui/material";
import { Outlet } from "react-router-dom";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

const DRAWER_WIDTH = 260;

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [backgroundImage] = useState(() => {
    const imageNumber = Math.random() < 0.5 ? 1 : 2;
    return `${import.meta.env.BASE_URL}images/login-background${imageNumber}.jpg`;
  });

  return (
    <Box
      sx={{
        position: "relative",
        isolation: "isolate",
        display: "flex",
        flexDirection: "column",
        minHeight: "100dvh",
        width: "100%",
        bgcolor: "#0d1c2d",
        color: "#ffffff",
        "& a:focus-visible, & button:focus-visible": {
          outline: "3px solid #e7c77d",
          outlineOffset: "3px",
        },
      }}
    >
      {/* Fondo institucional nocturno con desenfoque suave */}
      <Box
        aria-hidden="true"
        sx={{
          position: "fixed",
          inset: 0,
          overflow: "hidden",
          zIndex: -1,
          pointerEvents: "none",
          "&::before": {
            content: '""',
            position: "absolute",
            inset: "-12px",
            backgroundImage: `url("${backgroundImage}")`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(4px)",
          },
          "&::after": {
            content: '""',
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(7, 18, 33, 0.80) 0%, rgba(10, 22, 38, 0.90) 55%, rgba(7, 18, 33, 0.94) 100%)",
          },
        }}
      />

      <Topbar
        menuOpen={mobileOpen}
        onOpenMenu={() => setMobileOpen(true)}
      />

      <Toolbar sx={{ minHeight: { xs: 64, md: 72 } }} />

      <Box
        sx={{
          flexGrow: 1,
          width: "100%",
          maxWidth: 1440,
          mx: "auto",
          px: { xs: 2, sm: 3, md: 4 },
          py: { xs: 2.5, md: 3.5 },
          display: "flex",
          alignItems: "flex-start",
          gap: { md: 3.5 },
        }}
      >
        <Sidebar
          drawerWidth={DRAWER_WIDTH}
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            minWidth: 0,
            width: "100%",
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}