import apiClient from "../../../shared/api/apiClient";
import { mensajeError } from "../../solicitudes/api/solicitudesApi";

export { mensajeError };

const auth = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

// ---- Ponente ----
export async function getMisPagos(token) {
  const { data } = await apiClient.get("/pagos/mis-pagos/", auth(token));
  return data;
}

export async function enviarPago(token, { congreso, cuota, referencia, comprobante, credencial }) {
  const form = new FormData();
  form.append("congreso", congreso);
  form.append("cuota", cuota);
  form.append("referencia", referencia);
  form.append("comprobante", comprobante);
  if (credencial) form.append("comprobante_academico", credencial);
  const { data } = await apiClient.post("/pagos/mis-pagos/", form, auth(token));
  return data;
}

// ---- Encargado de pagos ----
export async function getValidacion(token, filtros = {}) {
  const params = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== "" && v != null));
  const { data } = await apiClient.get("/pagos/validacion/", { ...auth(token), params });
  return data;
}

export async function dictaminarPago(token, id, estado, comentario = "") {
  const { data } = await apiClient.patch(`/pagos/validacion/${id}/`, { estado, comentario }, auth(token));
  return data;
}

// Descarga un archivo protegido y devuelve { url, tipo } para mostrarlo (imagen) o abrirlo (PDF).
export async function cargarArchivo(token, ruta) {
  const respuesta = await apiClient.get(ruta, { ...auth(token), responseType: "blob" });
  return { url: URL.createObjectURL(respuesta.data), tipo: respuesta.data.type || "" };
}
