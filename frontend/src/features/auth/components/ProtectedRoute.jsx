// src/features/auth/components/ProtectedRoute.jsx

import {
  CircularProgress,
  Box,
} from "@mui/material";

import {
  Navigate,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";


export default function ProtectedRoute({
  children,
}) {
  const {
    isAuthenticated,
    loading,
  } = useAuth();

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return children;
}