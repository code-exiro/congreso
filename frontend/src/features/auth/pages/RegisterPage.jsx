import { useCallback, useEffect, useRef, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  GlobalStyles,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
  IconButton,
  InputAdornment
} from "@mui/material";

import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";

import { getRegistrationDocuments, registerUser } from "../api/registrationApi";
import {
  INITIAL_REGISTER_VALUES,
  buildRegisterPayload,
  fieldError,
  validateRegisterForm,
} from "../utils/registerForm";
const fields = [
  { name: "first_name", label: "Nombre(s)", autoComplete: "given-name", fullRow: true, maxLength: 150 },
  { name: "last_name", label: "Apellido paterno", autoComplete: "family-name", maxLength: 150 },
  { name: "maternal_last_name", label: "Apellido materno (opcional)", autoComplete: "off", optional: true, maxLength: 150 },
  { name: "email", label: "Correo electrónico", type: "email", autoComplete: "email", fullRow: true, maxLength: 254 },
  { name: "password", label: "Contraseña", type: "password", autoComplete: "new-password" },
  { name: "password_confirm", label: "Confirmar contraseña", type: "password", autoComplete: "new-password" },
];
const goldButtonSx = {
  py: 1.5,
  bgcolor: "#e7c77d",
  color: "#102138",
  borderRadius: "8px",
  fontWeight: 800,
  textTransform: "none",
  boxShadow: "none",
  "&:hover": { bgcolor: "#f2d99c", boxShadow: "none" },
  "&.Mui-disabled": { bgcolor: "#8e866f", color: "#152033" },
};

const registerFieldSx = {
  "& .MuiOutlinedInput-root": {
    color: "#102138",
    bgcolor: "#f6f8fc",
    borderRadius: "8px",
    "& fieldset": { borderColor: "transparent" },
    "&:hover fieldset": { borderColor: "#c7a65b" },
    "&.Mui-focused fieldset": { borderColor: "#e7c77d", borderWidth: 2 },
    "&.Mui-error fieldset": { borderColor: "#d32f2f" },
    "&.Mui-disabled": { bgcolor: "#dce2eb" },
  },
  "& .MuiInputBase-input": { py: 1.5, fontSize: ".9rem" },
  "& .MuiFormHelperText-root": {
    color: "#c6d0df", fontSize: ".72rem", mx: .25,
    "&.Mui-error": { color: "#ffb4ab" },
  },
};


export default function RegisterPage() {
  const [backgroundImage] = useState(() => {
    const imageNumber = Math.random() < 0.5 ? 1 : 2;
    return `${import.meta.env.BASE_URL}images/login-background${imageNumber}.jpg`;
  });
  const [values, setValues] = useState({ ...INITIAL_REGISTER_VALUES });
  const [errors, setErrors] = useState({});
  const [documents, setDocuments] = useState(null);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [documentsError, setDocumentsError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [showPasswords, setShowPasswords] = useState({
    password: false,
    password_confirm: false,
  });
  const documentsController = useRef(null);
  const submissionLock = useRef(false);
  const loadDocuments = useCallback(async () => {
    documentsController.current?.abort();
    const controller = new AbortController();
    documentsController.current = controller;
    setDocumentsLoading(true);
    setDocumentsError("");
    setDocuments(null);
    setValues((current) => ({
      ...current,
      accepted_terms: false,
      accepted_privacy_notice: false,
    }));
    try {
      const result = await getRegistrationDocuments({ signal: controller.signal });
      if (!controller.signal.aborted) setDocuments(result);
    } catch (error) {
      if (!controller.signal.aborted) setDocumentsError(error.message);
    } finally {
      if (!controller.signal.aborted) setDocumentsLoading(false);
    }
  }, []);
  useEffect(() => {
    void loadDocuments();
    return () => documentsController.current?.abort();
  }, [loadDocuments]);
  function handleChange(event) {
    const { name, value, checked, type } = event.target;
    setValues((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setSubmitError("");
  }
  async function handleSubmit(event) {
event.preventDefault();
    if (submissionLock.current || documentsLoading || !documents) return;
    const validation = validateRegisterForm(values);
    setErrors(validation);
    setSubmitError("");
    if (Object.keys(validation).length) return;
    submissionLock.current = true;
    setSubmitting(true);
    try {
      const payload = buildRegisterPayload(values, documents);
      await registerUser(payload);
      setRegisteredEmail(payload.email);
      setValues({ ...INITIAL_REGISTER_VALUES });
    } catch (error) {
      setErrors(error.fields ?? {});
      if (error.fields?.terms_document_id || error.fields?.privacy_document_id) {
        await loadDocuments();
        setSubmitError("Vuelve a revisar y aceptar los documentos vigentes antes de continuar.");
      } else {
        setSubmitError(error.message || "No se pudo crear tu cuenta.");
      }
    } finally {
      submissionLock.current = false;
      setSubmitting(false);
    }
  }
  const consents = [
    { name: "accepted_terms", label: "términos y condiciones", document: documents?.terms },
    { name: "accepted_privacy_notice", label: "aviso de privacidad", document: documents?.privacy },
  ];
  return (
    <>
      <GlobalStyles styles={{
        body: { margin: 0 },
        "#root": { width: "100%", maxWidth: "none", minHeight: "100svh", margin: 0, padding: 0 },
      }} />
      <Box component="main" sx={{
        position: "relative",
        isolation: "isolate",
        boxSizing: "border-box",
        minHeight: "100svh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        color: "#fff",
        bgcolor: "#0d1c2d",
        px: { xs: 2, sm: 4, md: 7 },
        py: { xs: 3, md: 4 },
        "& a:focus-visible, & button:focus-visible": {
          outline: "3px solid #e7c77d", outlineOffset: 4,
        },
      }}>
        {/* Fondo fijo: el desenfoque afecta únicamente a la fotografía. */}
        <Box aria-hidden="true" sx={{
          position: "fixed", inset: 0, overflow: "hidden", zIndex: -1,
          pointerEvents: "none",
          "&::before": {
            content: '""', position: "absolute", inset: -8,
            backgroundImage: `url("${backgroundImage}")`,
            backgroundSize: "cover", backgroundPosition: "center", filter: "blur(2px)",
          },
          "&::after": {
            content: '""', position: "absolute", inset: 0,
            background: "linear-gradient(180deg, rgba(7,18,33,.54), rgba(7,18,33,.72))",
          },
        }} />



        <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", py: { xs: 4, sm: 5 } }}>
          <Paper elevation={0} sx={{
            zoom: { xs: 1, md: 0.9 },
            boxSizing: "border-box", width: "100%", maxWidth: 660, minWidth: 0,
            p: { xs: 2.5, sm: 4 },
            color: "#fff", bgcolor: "rgba(10, 24, 42, .78)", backgroundImage: "none",
            border: "1px solid rgba(255,255,255,.16)", borderRadius: "20px",
            boxShadow: "0 24px 70px rgba(0,0,0,.22)",
          }}>
            {registeredEmail ? (
              <Stack spacing={3} role="status">
                <Typography sx={{ color: "#e7c77d", fontSize: ".72rem", fontWeight: 700, letterSpacing: ".18em" }}>
                  CONGRESO UNIVERSITARIO · FESC
                </Typography>
                <Typography component="h1" variant="h4" fontWeight={750}>Cuenta creada</Typography>
                <Alert severity="success" sx={{ borderRadius: 2 }}>
                  Tu cuenta con el correo {registeredEmail} se creó correctamente.
                </Alert>
                <Button component={RouterLink} to="/login" variant="contained" size="large" sx={goldButtonSx}>
                  Ir a iniciar sesión
                </Button>
              </Stack>
            ) : (
              <Stack component="form" noValidate onSubmit={handleSubmit} spacing={2.5} aria-labelledby="register-heading" aria-busy={submitting}>
                <Box sx={{ textAlign: "center", mb: .5 }}>
                  <Typography sx={{ color: "#e7c77d", fontSize: ".70rem", fontWeight: 700, letterSpacing: ".18em", mb: 1 }}>
                    CONGRESO UNIVERSITARIO · FESC
                  </Typography>
                  <Typography id="register-heading" component="h1" sx={{ fontSize: { xs: "1.8rem", sm: "2rem" }, fontWeight: 750, letterSpacing: "-.03em" }}>
                    Crear cuenta
                  </Typography>
                  <Typography sx={{ mt: 1, color: "#d6deeb", fontSize: ".95rem", lineHeight: 1.6 }}>
                    Regístrate para participar en el congreso.
                  </Typography>
                </Box>

                {submitError && <Alert severity="error" sx={{ borderRadius: 2 }}>{submitError}</Alert>}

                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))" }, gap: 2 }}>
                  {fields.map((field) => (
                    <Box key={field.name} sx={{ minWidth: 0, gridColumn: field.fullRow ? "1 / -1" : "auto" }}>
                      <Typography component="label" htmlFor={`register-${field.name}`} sx={{ display: "block", mb: 1, fontSize: ".82rem", fontWeight: 600 }}>
                        {field.label}{!field.optional && " *"}
                      </Typography>
                      <TextField
                        id={`register-${field.name}`}
                        name={field.name}
                        type={
                          field.type === "password" && showPasswords[field.name]
                            ? "text"
                            : field.type || "text"
                        }
                        placeholder={
                          {
                            email: "tu.correo@ejemplo.com",
                            password: "Ingresa tu contraseña",
                            password_confirm: "Repite tu contraseña",
                          }[field.name] || ""
                        }
                        autoComplete={field.autoComplete}
                        required={!field.optional}
                        fullWidth
                        variant="outlined"
                        value={values[field.name]}
                        onChange={handleChange}
                        disabled={submitting}
                        error={Boolean(errors[field.name])}
                        helperText={
                          fieldError(errors[field.name]) ||
                          (field.name === "password"
                            ? "Al menos 8 caracteres. Evita contraseñas comunes."
                            : "")
                        }
                        slotProps={{
                          htmlInput: {
                            maxLength: field.maxLength,
                          },
                          input: {
                            endAdornment:
                              field.type === "password" ? (
                                <InputAdornment position="end">
                                  <IconButton
                                    type="button"
                                    disabled={submitting}
                                    aria-label={`${field.label}: ${
                                      showPasswords[field.name] ? "Ocultar" : "Mostrar"
                                    }`}
                                    aria-pressed={showPasswords[field.name]}
                                    onMouseDown={(event) => event.preventDefault()}
                                    onClick={() =>
                                      setShowPasswords((current) => ({
                                        ...current,
                                        [field.name]: !current[field.name],
                                      }))
                                    }
                                    edge="end"
                                    sx={{ color: "#526176" }}
                                  >
                                    {showPasswords[field.name] ? (
                                      <VisibilityOffOutlinedIcon fontSize="small" />
                                    ) : (
                                      <VisibilityOutlinedIcon fontSize="small" />
                                    )}
                                  </IconButton>
                                </InputAdornment>
                              ) : undefined,
                          },
                        }}
                        sx={registerFieldSx}
                      />
                    </Box>
                  ))}
                </Box>

                {documentsLoading && (
                  <Stack direction="row" alignItems="center" spacing={1} role="status">
                    <CircularProgress size={18} sx={{ color: "#e7c77d" }} />
                    <Typography variant="body2" sx={{ color: "#d6deeb" }}>Consultando los documentos del registro…</Typography>
                  </Stack>
                )}

                {documentsError && (
                  <Alert severity="warning" sx={{ borderRadius: 2 }} action={
                    <Button color="inherit" size="small" onClick={() => void loadDocuments()}>Reintentar</Button>
                  }>
                    {documentsError}
                  </Alert>
                )}

                {documents && (
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "minmax(0, 1fr)",
                        sm: "repeat(2, minmax(0, 1fr))",
                      },
                      gap: 1,
                    }}
                  >
                    {consents.map((consent) => (
                      <FormControl
                        key={consent.name}
                        error={Boolean(errors[consent.name])}
                      >
                        <FormControlLabel
                          disabled={submitting}
                          sx={{
                            m: 0,
                            alignItems: "center",
                            "& .MuiFormControlLabel-label": {
                              fontSize: ".8rem",
                            },
                          }}
                          control={
                            <Checkbox
                              name={consent.name}
                              checked={values[consent.name]}
                              onChange={handleChange}
                              required
                              sx={{
                                p: .75,
                                color: "#c8d1de",
                                "&.Mui-checked": { color: "#e7c77d" },
                              }}
                              slotProps={{
                                input: {
                                  "aria-describedby": `${consent.name}-help`,
                                },
                              }}
                            />
                          }
                          label={
                            <Typography
                              component="span"
                              sx={{ fontSize: ".8rem", lineHeight: 1.5 }}
                            >
                              Acepto{" "}
                              <Link
                                href={consent.document.file}
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={{ color: "#e7c77d", fontWeight: 600 }}
                              >
                                {consent.label}
                              </Link>
                            </Typography>
                          }
                        />

                        <FormHelperText
                          id={`${consent.name}-help`}
                          sx={{
                            ml: 4,
                            "&:empty": { display: "none" },
                            "&.Mui-error": { color: "#ffb4ab" },
                          }}
                        >
                          {fieldError(errors[consent.name])}
                        </FormHelperText>
                      </FormControl>
                    ))}
                  </Box>
                )}

                <Button type="submit" variant="contained" size="large" disabled={submitting || documentsLoading || !documents} sx={goldButtonSx}>
                  {submitting ? "Creando cuenta…" : "Crear cuenta"}
                </Button>

                <Typography variant="body2" textAlign="center" sx={{ color: "#d6deeb" }}>
                  ¿Ya tienes cuenta?{" "}
                  <Link component={RouterLink} to="/login" underline="hover" sx={{ color: "#e7c77d", fontWeight: 700 }}>Inicia sesión</Link>
                </Typography>
              </Stack>
            )}
          </Paper>
        </Box>

        <Box component="footer" sx={{ width: "100%", maxWidth: 1320, mx: "auto", pt: 2, borderTop: "1px solid rgba(255,255,255,.18)" }}>
          <Typography sx={{ color: "#d6deeb", fontSize: ".75rem", textAlign: "center" }}>
            Congreso Universitario FESC · Portal académico
          </Typography>
        </Box>
      </Box>
    </>
  );
}
