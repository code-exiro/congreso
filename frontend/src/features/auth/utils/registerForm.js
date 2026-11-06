export const INITIAL_REGISTER_VALUES = {
  first_name: "",
  last_name: "",
  maternal_last_name: "",
  email: "",
  password: "",
  password_confirm: "",
  accepted_terms: false,
  accepted_privacy_notice: false,
};

export function validateRegisterForm(values) {
  const errors = {};

  if (!values.first_name.trim()) errors.first_name = "Escribe tu nombre.";
  if (!values.last_name.trim()) errors.last_name = "Escribe tu apellido paterno.";

  const email = values.email.trim();
  if (!email) {
    errors.email = "Escribe tu correo electrónico.";
  } else if (!/^[^\s@]+@[^\s@]+$/.test(email)) {
    errors.email = "Escribe un correo electrónico válido.";
  } else if (email.length > 254) {
    errors.email = "El correo es demasiado largo.";
  }

  for (const field of ["first_name", "last_name", "maternal_last_name"]) {
    if (values[field].trim().length > 150) {
      errors[field] = "Utiliza como máximo 150 caracteres.";
    }
  }

  // La validación definitiva de seguridad la ejecuta Django.
  // Las contraseñas conservan exactamente los caracteres escritos.
  if (values.password.length < 8) {
    errors.password = "Utiliza al menos 8 caracteres.";
  }
  if (!values.password_confirm) {
    errors.password_confirm = "Confirma tu contraseña.";
  } else if (values.password !== values.password_confirm) {
    errors.password_confirm = "Las contraseñas no coinciden.";
  }

  if (values.accepted_terms !== true) {
    errors.accepted_terms = "Debes aceptar los términos y condiciones.";
  }
  if (values.accepted_privacy_notice !== true) {
    errors.accepted_privacy_notice = "Debes aceptar el aviso de privacidad.";
  }

  return errors;
}

export function buildRegisterPayload(values, documents) {
  return {
    first_name: values.first_name.trim(),
    last_name: values.last_name.trim(),
    maternal_last_name: values.maternal_last_name.trim(),
    email: values.email.trim().toLowerCase(),
    password: values.password,
    password_confirm: values.password_confirm,
    accepted_terms: values.accepted_terms,
    accepted_privacy_notice: values.accepted_privacy_notice,
    terms_document_id: documents.terms.id,
    privacy_document_id: documents.privacy.id,
  };
}

export function fieldError(value) {
  if (Array.isArray(value)) return value.map(fieldError).filter(Boolean).join(" ");
  return typeof value === "string" ? value : "";
}
