/**
 * Catálogos temporales desacoplados para el módulo "Mi Perfil".
 *
 * Para migrar a los endpoints reales de catálogos del backend, reemplaza estas
 * listas estáticas por las respuestas de la API correspondiente manteniendo la
 * misma forma de objetos ({ id, nombre }) y el código de lada telefónica.
 */
export const CATALOGOS_TEMPORALES = {
  estados: [
    { id: 1, nombre: "Estado de México", pais: "México" },
    { id: 2, nombre: "Ciudad de México", pais: "México" },
    { id: 3, nombre: "Jalisco", pais: "México" },
    { id: 4, nombre: "Nuevo León", pais: "México" },
    { id: 5, nombre: "Puebla", pais: "México" },
    { id: 6, nombre: "Querétaro", pais: "México" },
    { id: 7, nombre: "Guanajuato", pais: "México" },
    { id: 8, nombre: "Hidalgo", pais: "México" },
    { id: 9, nombre: "Morelos", pais: "México" },
    { id: 10, nombre: "Veracruz", pais: "México" },
  ],
  instituciones: [
    { id: 1, nombre: "FES Cuautitlán - UNAM" },
    { id: 2, nombre: "Universidad Nacional Autónoma de México (UNAM)" },
    { id: 3, nombre: "Instituto Politécnico Nacional (IPN)" },
    { id: 4, nombre: "Universidad Autónoma Metropolitana (UAM)" },
    { id: 5, nombre: "Tecnológico Nacional de México (TecNM)" },
    { id: 6, nombre: "Universidad Autónoma del Estado de México (UAEMéx)" },
    { id: 7, nombre: "Instituto Tecnológico y de Estudios Superiores de Monterrey (ITESM)" },
    { id: 8, nombre: "Otra institución académica o industria" },
  ],
  nivelesAcademicos: [
    { id: 1, nombre: "Técnico Superior Universitario", descripcion: "Formación técnica superior universitaria" },
    { id: 2, nombre: "Estudiante de Licenciatura / Ingeniería", descripcion: "Estudios de grado en curso" },
    { id: 3, nombre: "Licenciatura / Ingeniería", descripcion: "Grado de licenciatura o ingeniería" },
    { id: 4, nombre: "Especialidad", descripcion: "Estudios de especialidad" },
    { id: 5, nombre: "Maestría", descripcion: "Grado de maestría" },
    { id: 6, nombre: "Doctorado", descripcion: "Grado de doctorado" },
    { id: 7, nombre: "Posdoctorado", descripcion: "Estancia o grado posdoctoral" },
  ],
  ladas: [
    { codigo: "+52", pais: "México", etiqueta: "+52 (México)" },
    { codigo: "+1", pais: "Estados Unidos / Canadá", etiqueta: "+1 (EE. UU. / Canadá)" },
    { codigo: "+34", pais: "España", etiqueta: "+34 (España)" },
    { codigo: "+57", pais: "Colombia", etiqueta: "+57 (Colombia)" },
    { codigo: "+54", pais: "Argentina", etiqueta: "+54 (Argentina)" },
    { codigo: "+56", pais: "Chile", etiqueta: "+56 (Chile)" },
    { codigo: "+51", pais: "Perú", etiqueta: "+51 (Perú)" },
    { codigo: "+593", pais: "Ecuador", etiqueta: "+593 (Ecuador)" },
    { codigo: "+502", pais: "Guatemala", etiqueta: "+502 (Guatemala)" },
    { codigo: "+506", pais: "Costa Rica", etiqueta: "+506 (Costa Rica)" },
  ],
};
