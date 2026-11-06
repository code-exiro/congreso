import {
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ConstructionRoundedIcon from "@mui/icons-material/ConstructionRounded";
import { Link as RouterLink } from "react-router-dom";
import { getRoleMeta } from "../../../shared/utils/roleConfig";

export default function SectionPlaceholderPage({
  title,
  category,
  icon: IconComponent,
  description = "Esta sección se encuentra en proceso de implementación. Estará disponible próximamente para los roles autorizados.",
  allowedRoles = [],
}) {
  return (
    <Box sx={{ width: "100%", textAlign: "left" }}>
      {/* Encabezado de la Sección */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 3.5, md: 4 },
          mb: 3,
          color: "#ffffff",
          bgcolor: "rgba(10, 24, 42, 0.78)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "20px",
          boxShadow: "0 24px 70px rgba(0, 0, 0, 0.25)",
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2.5}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
        >
          <Box sx={{ minWidth: 0 }}>
            {category && (
              <Typography
                sx={{
                  color: "#e7c77d",
                  fontSize: { xs: "0.68rem", sm: "0.75rem" },
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  mb: 0.8,
                }}
              >
                {category}
              </Typography>
            )}

            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
              {IconComponent && (
                <Box
                  sx={{
                    width: { xs: 36, sm: 44 },
                    height: { xs: 36, sm: 44 },
                    borderRadius: "12px",
                    bgcolor: "rgba(231, 199, 125, 0.12)",
                    border: "1px solid rgba(231, 199, 125, 0.3)",
                    display: "grid",
                    placeItems: "center",
                    color: "#e7c77d",
                    flexShrink: 0,
                  }}
                >
                  <IconComponent sx={{ fontSize: { xs: "1.2rem", sm: "1.5rem" } }} />
                </Box>
              )}
              <Typography
                component="h1"
                sx={{
                  fontSize: { xs: "1.4rem", sm: "1.9rem", md: "2.3rem" },
                  fontWeight: 800,
                  letterSpacing: "-0.035em",
                  color: "#ffffff",
                  lineHeight: 1.2,
                }}
              >
                {title}
              </Typography>
            </Stack>
          </Box>

          <Button
            component={RouterLink}
            to="/"
            variant="outlined"
            startIcon={<ArrowBackRoundedIcon />}
            sx={{
              py: 0.9,
              px: 2,
              borderRadius: "10px",
              fontWeight: 700,
              textTransform: "none",
              color: "#e7c77d",
              borderColor: "rgba(231, 199, 125, 0.42)",
              bgcolor: "rgba(231, 199, 125, 0.04)",
              whiteSpace: "nowrap",
              fontSize: "0.85rem",
              "&:hover": {
                borderColor: "#e7c77d",
                bgcolor: "rgba(231, 199, 125, 0.14)",
                color: "#f2d99c",
              },
            }}
          >
            Inicio
          </Button>
        </Stack>

        {allowedRoles.length > 0 && (
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            flexWrap="wrap"
            useFlexGap
            sx={{ mt: 2.5, pt: 2, borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}
          >
            <Typography sx={{ color: "#94a3b8", fontSize: "0.8rem", fontWeight: 600 }}>
              Acceso permitido para:
            </Typography>
            {allowedRoles.map((role) => {
              const meta = getRoleMeta(role);
              const RoleIcon = meta.icon;
              return (
                <Chip
                  key={role}
                  icon={<RoleIcon style={{ color: meta.color, fontSize: "0.95rem" }} />}
                  label={meta.label}
                  size="small"
                  sx={{
                    bgcolor: meta.bgColor,
                    color: meta.color,
                    border: `1px solid ${meta.borderColor}`,
                    fontWeight: 700,
                    fontSize: "0.75rem",
                  }}
                />
              );
            })}
          </Stack>
        )}
      </Paper>

      {/* Contenido / Estado Placeholder */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, sm: 5 },
          textAlign: "center",
          color: "#ffffff",
          bgcolor: "rgba(10, 24, 42, 0.78)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "20px",
          boxShadow: "0 24px 70px rgba(0, 0, 0, 0.25)",
        }}
      >
        <Box
          sx={{
            width: 64,
            height: 64,
            mx: "auto",
            mb: 2.5,
            borderRadius: "16px",
            bgcolor: "rgba(231, 199, 125, 0.10)",
            border: "1px solid rgba(231, 199, 125, 0.25)",
            display: "grid",
            placeItems: "center",
            color: "#e7c77d",
          }}
        >
          <ConstructionRoundedIcon sx={{ fontSize: "2rem" }} />
        </Box>

        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            color: "#ffffff",
            fontSize: { xs: "1.1rem", sm: "1.3rem" },
            mb: 1,
          }}
        >
          Módulo en Construcción
        </Typography>

        <Typography
          sx={{
            color: "#94a3b8",
            fontSize: "0.92rem",
            maxWidth: 520,
            mx: "auto",
            lineHeight: 1.6,
            mb: 3,
          }}
        >
          {description}
        </Typography>

        <Box
          sx={{
            display: "inline-block",
            px: 2,
            py: 0.6,
            borderRadius: "8px",
            bgcolor: "rgba(255, 255, 255, 0.04)",
            border: "1px dashed rgba(255, 255, 255, 0.18)",
            color: "#d6deeb",
            fontSize: "0.8rem",
            fontFamily: "monospace",
          }}
        >
          Sección: {title}
        </Box>
      </Paper>
    </Box>
  );
}
