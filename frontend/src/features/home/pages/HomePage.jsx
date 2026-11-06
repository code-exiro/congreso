import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
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
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import { Link as RouterLink } from "react-router-dom";

import { useAuth } from "../../auth/context/AuthContext";
import { getRoleMeta } from "../../../shared/utils/roleConfig";

const cardIcons = {
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
  shield: ShieldOutlinedIcon,
};

export default function HomePage() {
  const { user } = useAuth();

  const name = user?.first_name || user?.email || "participante";
  const fullName = [user?.first_name, user?.last_name, user?.maternal_last_name]
    .filter(Boolean)
    .join(" ");
  const roles = user?.roles ?? [];
  const menus = Array.isArray(user?.menus) ? user.menus : [];

  return (
    <Stack spacing={{ xs: 2.5, sm: 3.5 }}>
      {/* Tarjeta principal de bienvenida - Totalmente responsiva */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 4, md: 5 },
          color: "#ffffff",
          bgcolor: "rgba(10, 24, 42, 0.78)",
          backdropFilter: "blur(16px)",
          backgroundImage:
            "radial-gradient(circle at top right, rgba(231, 199, 125, 0.12), transparent 55%)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "20px",
          boxShadow: "0 24px 70px rgba(0, 0, 0, 0.25)",
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.5}
          flexWrap="wrap"
          useFlexGap
          sx={{ mb: 2 }}
        >
          <Box
            sx={{
              px: 1.5,
              py: 0.45,
              borderRadius: "999px",
              bgcolor: "rgba(231, 199, 125, 0.14)",
              border: "1px solid rgba(231, 199, 125, 0.35)",
              color: "#e7c77d",
              fontSize: "0.70rem",
              fontWeight: 700,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
            }}
          >
            Panel de inicio
          </Box>
        </Stack>

        <Typography
          component="h1"
          sx={{
            fontSize: { xs: "1.85rem", sm: "2.6rem", md: "3.2rem" },
            lineHeight: 1.1,
            fontWeight: 800,
            letterSpacing: "-0.04em",
            color: "#ffffff",
            wordBreak: "break-word",
          }}
        >
          Bienvenido, {name}
          <Box component="span" sx={{ color: "#e7c77d" }}>
            .
          </Box>
        </Typography>

        <Box
          sx={{
            width: { xs: 40, sm: 54 },
            height: 3,
            bgcolor: "#e7c77d",
            my: { xs: 2, sm: 3 },
            borderRadius: "2px",
          }}
        />

        <Stack
          direction="row"
          alignItems="center"
          spacing={1.2}
          flexWrap="wrap"
          useFlexGap
        >
          <Typography
            sx={{
              color: "#d6deeb",
              fontSize: { xs: "0.85rem", sm: "0.92rem" },
              fontWeight: 600,
            }}
          >
            Roles asignados:
          </Typography>

          {roles.length > 0 ? (
            roles.map((role) => {
              const meta = getRoleMeta(role);
              const RoleIcon = meta.icon;
              return (
                <Box
                  key={role}
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.8,
                    px: { xs: 1.3, sm: 1.6 },
                    py: 0.55,
                    borderRadius: "10px",
                    bgcolor: meta.bgColor,
                    border: `1px solid ${meta.borderColor}`,
                    color: meta.color,
                    fontSize: { xs: "0.78rem", sm: "0.85rem" },
                    fontWeight: 700,
                    transition: "all 0.2s ease",
                  }}
                >
                  <RoleIcon sx={{ fontSize: { xs: "0.95rem", sm: "1.1rem" } }} />
                  {role}
                </Box>
              );
            })
          ) : (
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                px: 1.5,
                py: 0.5,
                borderRadius: "10px",
                bgcolor: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#94a3b8",
                fontSize: "0.85rem",
                fontWeight: 600,
              }}
            >
              Sin roles asignados
            </Box>
          )}
        </Stack>
      </Paper>

      {/* Grid responsivo de tarjetas informativas y módulos habilitados */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(auto-fill, minmax(280px, 1fr))",
            lg: "repeat(auto-fill, minmax(320px, 1fr))",
          },
          gap: { xs: 2, sm: 3 },
        }}
      >
        {/* Tarjeta de Cuenta Activa */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, sm: 3.5 },
            color: "#ffffff",
            bgcolor: "rgba(10, 24, 42, 0.78)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "20px",
            boxShadow: "0 20px 50px rgba(0, 0, 0, 0.20)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="flex-start"
            spacing={2}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  color: "#94a3b8",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  mb: 1,
                }}
              >
                Cuenta activa
              </Typography>
              <Typography
                noWrap
                sx={{
                  fontSize: { xs: "1.15rem", sm: "1.35rem" },
                  fontWeight: 750,
                  letterSpacing: "-0.02em",
                  color: "#ffffff",
                }}
              >
                {fullName || name}
              </Typography>
            </Box>

            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: "12px",
                bgcolor: "rgba(231, 199, 125, 0.12)",
                border: "1px solid rgba(231, 199, 125, 0.28)",
                display: "grid",
                placeItems: "center",
                color: "#e7c77d",
                flexShrink: 0,
              }}
            >
              <MailOutlineRoundedIcon fontSize="small" />
            </Box>
          </Stack>

          <Typography
            noWrap
            sx={{
              mt: 2.5,
              color: "#d6deeb",
              fontSize: "0.88rem",
            }}
          >
            {user?.email}
          </Typography>
        </Paper>

        {/* Módulos Habilitados para el usuario según su rol */}
        {menus.map((menu) => {
          const Icon = cardIcons[menu.icon] || DescriptionOutlinedIcon;
          return (
            <Paper
              key={menu.id || menu.route}
              elevation={0}
              sx={{
                p: { xs: 2.5, sm: 3.5 },
                color: "#ffffff",
                bgcolor: "rgba(10, 24, 42, 0.78)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "20px",
                boxShadow: "0 20px 50px rgba(0, 0, 0, 0.20)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                transition: "transform 0.2s ease, border-color 0.2s ease",
                "&:hover": {
                  borderColor: "rgba(231, 199, 125, 0.35)",
                  transform: "translateY(-2px)",
                },
              }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="flex-start"
                spacing={2}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    sx={{
                      color: "#e7c77d",
                      fontSize: "0.70rem",
                      fontWeight: 700,
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      mb: 1,
                    }}
                  >
                    {menu.category || "Módulo disponible"}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: { xs: "1.15rem", sm: "1.30rem" },
                      fontWeight: 750,
                      letterSpacing: "-0.02em",
                      color: "#ffffff",
                      lineHeight: 1.25,
                    }}
                  >
                    {menu.name}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    borderRadius: "12px",
                    bgcolor: "rgba(231, 199, 125, 0.12)",
                    border: "1px solid rgba(231, 199, 125, 0.28)",
                    display: "grid",
                    placeItems: "center",
                    color: "#e7c77d",
                    flexShrink: 0,
                  }}
                >
                  <Icon fontSize="small" />
                </Box>
              </Stack>

              <Box sx={{ mt: 2.5 }}>
                <Button
                  component={RouterLink}
                  to={menu.route}
                  variant="contained"
                  endIcon={<ArrowForwardRoundedIcon />}
                  sx={{
                    py: 0.9,
                    px: 2,
                    bgcolor: "#e7c77d",
                    color: "#102138",
                    borderRadius: "10px",
                    fontWeight: 800,
                    fontSize: "0.85rem",
                    textTransform: "none",
                    boxShadow: "none",
                    "&:hover": {
                      bgcolor: "#f2d99c",
                      boxShadow: "none",
                    },
                  }}
                >
                  Ir a {menu.name}
                </Button>
              </Box>
            </Paper>
          );
        })}
      </Box>
    </Stack>
  );
}
