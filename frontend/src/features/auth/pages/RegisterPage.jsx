import { useCallback, useEffect, useRef, useState } from "react";
import { Link as RouterLink } from "react-router-dom";

import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Container,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

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

export default function RegisterPage() {
  const [values, setValues] = useState({ ...INITIAL_REGISTER_VALUES });
  const [errors, setErrors] = useState({});
  const [documents, setDocuments] = useState(null);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [documentsError, setDocumentsError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

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
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        bgcolor: "background.default",
        py: { xs: 3, sm: 6 },
      }}
    >
      <Container maxWidth="sm">
        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 4 }, borderRadius: 3 }}>
          {registeredEmail ? (
            <Stack spacing={3}>
              <Typography component="h1" variant="h4">Cuenta creada</Typography>
              <Alert severity="success">
                Tu cuenta con el correo {registeredEmail} se creó correctamente.
              </Alert>
              <Button component={RouterLink} to="/login" variant="contained" size="large">
                Ir a iniciar sesión
              </Button>
            </Stack>
          ) : (
            <Stack component="form" noValidate onSubmit={handleSubmit} spacing={3}>
              <Box>
                <Typography component="h1" variant="h4" gutterBottom>Crear cuenta</Typography>
                <Typography color="text.secondary">
                  Regístrate para participar en el congreso.
                </Typography>
              </Box>

              {submitError && <Alert severity="error">{submitError}</Alert>}

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))" },
                  gap: 2,
                }}
              >
                {fields.map((field) => (
                  <TextField
                    key={field.name}
                    id={`register-${field.name}`}
                    name={field.name}
                    label={field.label}
                    type={field.type || "text"}
                    autoComplete={field.autoComplete}
                    required={!field.optional}
                    fullWidth
                    value={values[field.name]}
                    onChange={handleChange}
                    disabled={submitting}
                    error={Boolean(errors[field.name])}
                    helperText={
                      fieldError(errors[field.name]) ||
                      (field.name === "password" ? "Al menos 8 caracteres. Evita contraseñas comunes." : "")
                    }
                    slotProps={{ htmlInput: { maxLength: field.maxLength } }}
                    sx={{ gridColumn: field.fullRow ? "1 / -1" : "auto" }}
                  />
                ))}
              </Box>

              {documentsLoading && (
                <Stack direction="row" alignItems="center" spacing={1} role="status">
                  <CircularProgress size={18} />
                  <Typography variant="body2">Consultando los documentos del registro…</Typography>
                </Stack>
              )}

              {documentsError && (
                <Alert
                  severity="warning"
                  action={
                    <Button color="inherit" size="small" onClick={() => void loadDocuments()}>
                      Reintentar
                    </Button>
                  }
                >
                  {documentsError}
                </Alert>
              )}

              {documents && (
                <Stack spacing={1}>
                  {consents.map((consent) => (
                    <FormControl key={consent.name} error={Boolean(errors[consent.name])}>
                      <FormControlLabel
                        disabled={submitting}
                        control={
                          <Checkbox
                            name={consent.name}
                            checked={values[consent.name]}
                            onChange={handleChange}
                            required
                            slotProps={{
                              input: { "aria-describedby": `${consent.name}-help` },
                            }}
                          />
                        }
                        label={
                          <Typography variant="body2">
                            Acepto el documento de{" "}
                            <Link href={consent.document.file} target="_blank" rel="noopener noreferrer">
                              {consent.label}
                            </Link>
                            {" "}(versión {consent.document.version}).
                          </Typography>
                        }
                      />
                      <FormHelperText id={`${consent.name}-help`}>
                        {fieldError(errors[consent.name])}
                      </FormHelperText>
                    </FormControl>
                  ))}
                </Stack>
              )}

              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={submitting || documentsLoading || !documents}
              >
                {submitting ? "Creando cuenta…" : "Crear cuenta"}
              </Button>

              <Typography variant="body2" textAlign="center">
                ¿Ya tienes cuenta?{" "}
                <Link component={RouterLink} to="/login">Inicia sesión</Link>
              </Typography>
            </Stack>
          )}
        </Paper>
      </Container>
    </Box>
  );
}
