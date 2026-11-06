// Cliente público: el registro y los documentos no necesitan una sesión JWT.
// VITE_API_URL admite el origen de Django o el prefijo completo /api/.
const configuredUrl = (
  import.meta.env?.VITE_API_URL || "http://127.0.0.1:8000/api/"
).replace(/\/+$/, "");

const apiUrl = configuredUrl.endsWith("/api")
  ? `${configuredUrl}/`
  : `${configuredUrl}/api/`;

function errorMessage(value) {
  if (Array.isArray(value)) return value.map(errorMessage).join(" ");
  if (value && typeof value === "object") {
    return Object.values(value).map(errorMessage).join(" ");
  }
  return typeof value === "string" ? value : "";
}

async function publicRequest(path, { body, signal } = {}) {
  let response;

  try {
    response = await fetch(`${apiUrl}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      credentials: "omit",
      signal,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new Error("No se pudo conectar con el servidor. Intenta de nuevo.");
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("El servidor devolvió una respuesta inesperada. Intenta más tarde.");
  }

  if (!response.ok) {
    const error = new Error(
      response.status >= 500
        ? "El servidor no pudo completar la solicitud. Intenta más tarde."
        : errorMessage(data) || "No se pudo completar la solicitud.",
    );
    error.status = response.status;
    error.fields = data && typeof data === "object" && !Array.isArray(data)
      ? data
      : {};
    throw error;
  }

  return data;
}

export async function getRegistrationDocuments({ signal } = {}) {
  const documents = await publicRequest("auth/legal-documents/", { signal });
  if (!Array.isArray(documents)) {
    throw new Error("No se pudieron consultar los documentos del registro.");
  }

  const terms = documents.filter((document) => document.type === "TERMS");
  const privacy = documents.filter((document) => document.type === "PRIVACY_NOTICE");

  if (
    terms.length !== 1 || privacy.length !== 1 ||
    !Number.isInteger(terms[0].id) || terms[0].id < 1 || !terms[0].file ||
    !Number.isInteger(privacy[0].id) || privacy[0].id < 1 || !privacy[0].file
  ) {
    throw new Error("El registro no está disponible en este momento. Intenta más tarde.");
  }

  return { terms: terms[0], privacy: privacy[0] };
}

export function registerUser(payload) {
  return publicRequest("auth/register/", { body: payload });
}
