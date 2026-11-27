import apiClient from "../../../shared/api/apiClient";
import { mensajeError } from "../../solicitudes/api/solicitudesApi";

export { mensajeError };

const auth = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export async function getLimites(token) {
  const { data } = await apiClient.get("/congreso/limites/", auth(token));
  return data;
}

export async function editarActividad(token, id, cambios) {
  const { data } = await apiClient.patch(`/congreso/limites/actividades/${id}/`, cambios, auth(token));
  return data;
}

export async function editarCongreso(token, id, cambios) {
  const { data } = await apiClient.patch(`/congreso/limites/congresos/${id}/`, cambios, auth(token));
  return data;
}

export async function agregarExcepcion(token, payload) {
  const { data } = await apiClient.post("/congreso/limites/usuarios/", payload, auth(token));
  return data;
}

export async function quitarExcepcion(token, id) {
  const { data } = await apiClient.delete(`/congreso/limites/usuarios/${id}/`, auth(token));
  return data;
}

export async function agregarExcepcionEvaluador(token, payload) {
  const { data } = await apiClient.post("/congreso/limites/evaluadores/", payload, auth(token));
  return data;
}

export async function quitarExcepcionEvaluador(token, id) {
  const { data } = await apiClient.delete(`/congreso/limites/evaluadores/${id}/`, auth(token));
  return data;
}
