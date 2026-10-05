// src/app/HomePage.jsx

import {
  Typography,
} from "@mui/material";

import { useAuth } from "../features/auth/context/AuthContext";


export default function HomePage() {
  const { user } = useAuth();

  return (
    <>
      <Typography
        variant="h4"
        gutterBottom
      >
        Bienvenido, {user?.first_name || user?.username}
      </Typography>

      <Typography color="text.secondary">
        Roles: {user?.roles?.join(", ")}
      </Typography>
    </>
  );
}