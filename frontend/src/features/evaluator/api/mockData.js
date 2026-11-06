// Datos de ejemplo con la misma forma que devuelve la API real (ver CONTRATO_API.md).

const today = new Date();
const addDays = (n) => {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return d.toISOString();
};

// Preguntas de la fase 5 (extenso) de la tabla PREGUNTA.
export const MOCK_PREGUNTAS = [
  { id: 7, texto: '¿El trabajo se encuentra realizado en la plantilla de extenso?' },
  {
    id: 8,
    texto:
      '¿El trabajo cumple con el formato solicitado (Tipo, tamaño de letra, margenes, tamaño de la hoja, datos, alineacion, enumeracion de renglones, etc)?',
  },
  { id: 9, texto: '¿El trabajo esta descrito ordenadamente como corresponde a la categoria?' },
  { id: 10, texto: '¿El artículo está libre de errores técnicos y científicos?' },
  { id: 11, texto: '¿El cuerpo del artículo está claramente descrito (antecedentes, metodología, etc.)?' },
  { id: 12, texto: '¿La redacción del artículo es entendible?' },
  { id: 13, texto: '¿Presenta objetivos claros y presenta solidez científica?' },
  { id: 14, texto: '¿Es una propuesta innovadora, no presenta similitud (fusil) con otro artículo publicado con anterioridad?' },
  { id: 15, texto: '¿Las figuras son claras, se usa simbología y unidades comunes?' },
  { id: 16, texto: '¿Las figuras y tablas cuentan con fuente o referencia?' },
  { id: 17, texto: '¿Cuenta con el nivel para publicarse en la revista electrónica?' },
  { id: 18, texto: '¿La información contenida está libre de  copias de libros, revistas, etc.?' },
];

// Respuestas de ejemplo: todo «Sí» salvo los comentarios indicados como «No».
const respuestasEjemplo = (noCumple = {}) =>
  MOCK_PREGUNTAS.map((p) => ({
    pregunta: p.id,
    texto: p.texto,
    cumple: !(p.id in noCumple),
    comentario: noCumple[p.id] || '',
  }));

export const MOCK_ASSIGNMENTS = [
  {
    id: 101,
    ronda: 1,
    estado: 'pendiente',
    fechaAsignacion: addDays(-3),
    fechaLimite: addDays(6),
    trabajo: {
      id: 31,
      folio: 'CONING-2026-031',
      titulo: 'Secador solar indirecto con control de flujo de aire para productos agrícolas',
      area: 'Energías renovables',
      autores: ['Laura Méndez Ríos', 'Carlos Pérez Luna'],
      institucion: 'FES Cuautitlán, UNAM',
      palabrasClave: ['energía solar', 'secado', 'agroindustria'],
      resumen:
        'Se presenta el diseño, construcción y pruebas de operación de un secador solar indirecto con convección forzada. Se evalúa la eficiencia térmica y el tiempo de secado frente a un secador de exposición directa.',
      archivo: { nombre: 'CONING-2026-031_extenso.pdf', url: null },
      fechaEnvio: addDays(-5),
    },
    preguntas: MOCK_PREGUNTAS,
    observacionesPrevias: [],
    miEvaluacion: null,
  },
  {
    id: 102,
    ronda: 2,
    estado: 'requiere_adicional',
    fechaAsignacion: addDays(-2),
    fechaLimite: addDays(2),
    trabajo: {
      id: 27,
      folio: 'CONING-2026-027',
      titulo: 'Modelo de detección de fallas en motores de inducción mediante aprendizaje automático',
      area: 'Inteligencia artificial',
      autores: ['Jorge Salinas Ruiz', 'Patricia Núñez Arce', 'Héctor Domínguez P.'],
      institucion: 'Instituto Tecnológico de Tlalnepantla',
      palabrasClave: ['mantenimiento predictivo', 'vibraciones', 'redes neuronales'],
      resumen:
        'Se propone un clasificador basado en espectros de vibración para detectar desbalance, desalineación y fallas en rodamientos de motores de inducción de baja potencia.',
      archivo: { nombre: 'CONING-2026-027_extenso.pdf', url: null },
      fechaEnvio: addDays(-12),
    },
    preguntas: MOCK_PREGUNTAS,
    observacionesPrevias: [
      {
        id: 9001,
        evaluador: 'Evaluador 1',
        ronda: 1,
        fechaEnvio: addDays(-4),
        dictamen: 'aceptado_cambios',
        comentario:
          'La metodología es sólida, pero falta describir el conjunto de datos y justificar la elección de la arquitectura. Revisar la redacción de las conclusiones.',
        respuestas: respuestasEjemplo({
          11: 'Falta describir el conjunto de datos de vibración (origen, número de muestras y cómo se etiquetaron).',
          13: 'Justificar por qué se eligió esa arquitectura de red frente a otros clasificadores.',
        }),
      },
    ],
    miEvaluacion: null,
  },
  {
    id: 103,
    ronda: 1,
    estado: 'en_proceso',
    fechaAsignacion: addDays(-6),
    fechaLimite: addDays(-1),
    trabajo: {
      id: 22,
      folio: 'CONING-2026-022',
      titulo: 'Enlace de telecomunicaciones de bajo costo para zonas rurales del Estado de México',
      area: 'Telecomunicaciones',
      autores: ['Alejandro Torres Vega'],
      institucion: 'FES Aragón, UNAM',
      palabrasClave: ['LoRa', 'conectividad rural'],
      resumen:
        'Se evalúa un enlace punto a punto con tecnología LoRa para telemetría agrícola, midiendo alcance, pérdida de paquetes y consumo energético.',
      archivo: { nombre: 'CONING-2026-022_extenso.pdf', url: null },
      fechaEnvio: addDays(-9),
    },
    preguntas: MOCK_PREGUNTAS,
    observacionesPrevias: [],
    miEvaluacion: null,
  },
  {
    id: 104,
    ronda: 1,
    estado: 'evaluado',
    fechaAsignacion: addDays(-15),
    fechaLimite: addDays(-7),
    trabajo: {
      id: 14,
      folio: 'CONING-2026-014',
      titulo: 'Convertidor CD-CD bidireccional para almacenamiento en baterías de un auto eléctrico',
      area: 'Electrónica de potencia',
      autores: ['Marisol Ortega Cruz', 'Fernando Aguilar Mora'],
      institucion: 'FES Cuautitlán, UNAM',
      palabrasClave: ['convertidor', 'vehículo eléctrico'],
      resumen:
        'Diseño y simulación de un convertidor bidireccional con control por modo deslizante para la gestión de carga y descarga de baterías.',
      archivo: { nombre: 'CONING-2026-014_extenso.pdf', url: null },
      fechaEnvio: addDays(-20),
    },
    preguntas: MOCK_PREGUNTAS,
    observacionesPrevias: [],
    miEvaluacion: {
      fechaEnvio: addDays(-8),
      dictamen: 'aceptado',
      comentario: 'Trabajo claro y bien sustentado.',
      respuestas: respuestasEjemplo(),
    },
  },
];
