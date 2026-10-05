// src/shared/components/layout/AppLayout.jsx

import {
  Box,
  Toolbar,
} from "@mui/material";

import { Outlet } from "react-router-dom";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";


export default function AppLayout() {
  return (
    <Box sx={{ display: "flex" }}>
      <Topbar />

      <Sidebar />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
        }}
      >
        <Toolbar />

        <Outlet />
      </Box>
    </Box>
  );
}