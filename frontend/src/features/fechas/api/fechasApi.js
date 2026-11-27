import apiClient from "../../../shared/api/apiClient";
import { mensajeError } from "../../solicitudes/api/solicitudesApi";

export { mensajeError };

const auth = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export async function getFechas(token) {
  const { data } = await apiClient.get("/congreso/fechas/", auth(token));
  return data;
}

export async function guardarFechas(token, congresoId, fechas) {
  const { data } = await apiClient.put(`/congreso/fechas/${congresoId}/`, { fechas }, auth(token));
  return data;
}
