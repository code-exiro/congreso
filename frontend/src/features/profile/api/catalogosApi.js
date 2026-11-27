import apiClient from "../../../shared/api/apiClient";

// Catálogos de usuario (países, estados, instituciones, niveles, ladas...), públicos.
export async function getCatalogos() {
  const { data } = await apiClient.get("/catalogos/");
  return data;
}

// Adapta la respuesta de la API a la forma que usa el formulario de perfil.
export function adaptarCatalogosPerfil(data) {
  return {
    estados: data.estados.map((e) => ({ id: e.id, nombre: e.nombre, pais: e.pais })),
    instituciones: data.instituciones.map((i) => ({
      id: i.id,
      nombre: i.acronimo ? `${i.nombre} (${i.acronimo})` : i.nombre,
    })),
    nivelesAcademicos: data.niveles_academicos.map((n) => ({
      id: n.id,
      nombre: n.nombre,
      descripcion: n.descripcion,
    })),
    ladas: [...data.ladas]
      .sort((a, b) => (b.pais === "México") - (a.pais === "México"))
      .map((l) => ({
        id: l.id,
        codigo: l.codigo,
        pais: l.pais,
        etiqueta: `${l.codigo} (${l.pais})`,
      })),
  };
}
