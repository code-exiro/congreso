import apiClient from "../../../shared/api/apiClient";

const auth = (token) => ({ Authorization: `Bearer ${token}` });

export async function getMisSolicitudesRol(token) {
  const { data } = await apiClient.get("/solicitudes-rol/", { headers: auth(token) });
  return data;
}

export async function crearSolicitudRol(token, rol, motivo) {
  const { data } = await apiClient.post("/solicitudes-rol/", { rol, motivo }, { headers: auth(token) });
  return data;
}

export async function retirarSolicitudRol(token, id) {
  await apiClient.delete(`/solicitudes-rol/${id}/`, { headers: auth(token) });
}

export async function getBandejaSolicitudesRol(token, params = {}) {
  const { data } = await apiClient.get("/solicitudes-rol/bandeja/", { headers: auth(token), params });
  return data;
}

export async function resolverSolicitudRol(token, id, accion, comentario = "") {
  const { data } = await apiClient.post(`/solicitudes-rol/${id}/resolver/`, { accion, comentario }, { headers: auth(token) });
  return data;
}
