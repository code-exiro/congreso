import apiClient from "../../../shared/api/apiClient";

const auth = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export async function getOpciones(token) {
  const { data } = await apiClient.get("/trabajos/opciones/", auth(token));
  return data;
}

export async function listarSolicitudes(token) {
  const { data } = await apiClient.get("/trabajos/mis-solicitudes/", auth(token));
  return data;
}

export async function crearSolicitud(token, payload) {
  const { data } = await apiClient.post("/trabajos/mis-solicitudes/", payload, auth(token));
  return data;
}

export async function actualizarSolicitud(token, id, payload) {
  const { data } = await apiClient.patch(`/trabajos/mis-solicitudes/${id}/`, payload, auth(token));
  return data;
}

export async function retirarSolicitud(token, id) {
  await apiClient.delete(`/trabajos/mis-solicitudes/${id}/`, auth(token));
}

// Mensaje legible a partir de un error de axios.
export function mensajeError(error, respaldo = "No se pudo completar la acción. Intenta de nuevo.") {
  const data = error?.response?.data;
  if (data?.detail) return data.detail;
  if (error?.response?.status === 403) return "No tienes permiso para esta acción.";
  if (!error?.response) return "No se pudo conectar con el servidor.";
  return respaldo;
}

// Comprueba que el correo sea de un usuario registrado con rol de ponente (404 con el motivo si no).
export async function verificarCoautor(token, correo) {
  const { data } = await apiClient.get("/trabajos/coautores/verificar/", { ...auth(token), params: { correo } });
  return data;
}

export async function subirExtenso(token, id, archivo) {
  const form = new FormData();
  form.append("archivo", archivo);
  const { data } = await apiClient.post(`/trabajos/mis-solicitudes/${id}/extenso/`, form, auth(token));
  return data;
}

// Descarga un archivo protegido (se pide con el token) y lo abre en otra pestaña.
export async function abrirArchivo(token, ruta) {
  const respuesta = await apiClient.get(ruta, { ...auth(token), responseType: "blob" });
  const url = URL.createObjectURL(respuesta.data);
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// ---- Coordinador (borrador) ----
export async function listarTodasSolicitudes(token, filtros = {}) {
  const params = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== "" && v != null));
  const { data } = await apiClient.get("/trabajos/solicitudes/", { ...auth(token), params });
  return data;
}

export async function listarEvaluadores(token, congreso) {
  const { data } = await apiClient.get("/trabajos/evaluadores/", { ...auth(token), params: congreso ? { congreso } : {} });
  return data;
}

export async function asignarEvaluador(token, id, usuario, fechaLimite = "") {
  const { data } = await apiClient.post(`/trabajos/solicitudes/${id}/evaluadores/`, { usuario, fecha_limite: fechaLimite || null }, auth(token));
  return data;
}

export async function quitarEvaluador(token, id, evaluador) {
  const { data } = await apiClient.delete(`/trabajos/solicitudes/${id}/evaluadores/`, { ...auth(token), params: { evaluador } });
  return data;
}

export async function dictaminarSolicitud(token, id, accion, observaciones = "") {
  const { data } = await apiClient.post(`/trabajos/solicitudes/${id}/dictamen/`, { accion, observaciones }, auth(token));
  return data;
}
