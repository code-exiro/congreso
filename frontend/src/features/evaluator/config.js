// Configuración del módulo del evaluador.
// Ajusta aquí rutas, límites y endpoints sin tocar el resto del código.

export const EVALUATOR_PATHS = {
  // Ruta que debe apuntar la opción del menú «Mis Evaluaciones Asignadas».
  list: '/evaluaciones/asignadas',
  detail: '/evaluaciones/asignadas/:assignmentId',
};

export const buildDetailPath = (assignmentId) =>
  EVALUATOR_PATHS.detail.replace(':assignmentId', String(assignmentId));

// Claves de privilegio tal como aparecen en «Roles y privilegios».
export const EVALUATOR_PRIVILEGES = {
  verAsignados: 'evaluacion.ver_asignados',
  descargarArchivos: 'evaluacion.descargar_archivos', // ahora: ver el extenso en el visor
  cargarObservaciones: 'evaluacion.cargar_observaciones', // ahora: enviar el formulario de preguntas
  verObservacionesPrevias: 'evaluacion.ver_observaciones_previas',
};

export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

export const EVALUATOR_ENDPOINTS = {
  list: '/api/evaluaciones/asignadas/',
  detail: (id) => `/api/evaluaciones/asignadas/${id}/`,
  submit: (id) => `/api/evaluaciones/asignadas/${id}/enviar/`,
};

// Datos de ejemplo: activos en desarrollo mientras no exista el backend.
// Para usar la API real pon VITE_EVALUATOR_MOCKS=false en tu .env.
export const USE_MOCKS =
  import.meta.env.VITE_EVALUATOR_MOCKS === 'true' ||
  (import.meta.env.DEV && import.meta.env.VITE_EVALUATOR_MOCKS !== 'false');

// Máximo de caracteres por comentario (igual que en el backend).
export const COMENTARIO_MAX = 500;

// Las respuestas a medias se guardan en el navegador para no perderlas si se recarga la página.
export const DRAFT_KEY = (assignmentId) => `ev-borrador-${assignmentId}`;

export const DICTAMEN_OPTIONS = [
  { value: 'aceptado', label: 'Aceptado' },
  { value: 'aceptado_cambios', label: 'Aceptado con cambios' },
  { value: 'rechazado', label: 'Rechazado' },
];
