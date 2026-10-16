import { Typography } from "@mui/material";

import { useAuth } from "../../auth/context/AuthContext";

export default function HomePage() {
  const { user } = useAuth();

  const name = user?.first_name || user?.email || "participante";
  const roles = user?.roles ?? [];

  return (
    <>
      <Typography component="h1" variant="h4" gutterBottom>
        Bienvenido, {name}
      </Typography>

      <Typography color="text.secondary">
        Roles: {roles.length ? roles.join(", ") : "Sin roles asignados"}
      </Typography>
    </>
  );
}