// Cliente de la API del evaluador.
// Si tu proyecto ya tiene un cliente HTTP (por ejemplo en features/auth/api),
// reemplaza solo la función `request` para reutilizar su token y manejo de errores.

import { API_BASE_URL, EVALUATOR_ENDPOINTS, USE_MOCKS } from '../config';
import { MOCK_ASSIGNMENTS } from './mockData';
import { samplePdf } from '../utils/files';

const TOKEN_KEYS = ['access', 'accessToken', 'token', 'authToken'];

function getAuthToken() {
  try {
    for (const key of TOKEN_KEYS) {
      const value = window.localStorage.getItem(key);
      if (value) return value;
    }
  } catch {
    /* localStorage no disponible */
  }
  return null;
}

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

// DRF devuelve errores de validación como { campo: ["mensaje"] } (o anidados en listas/objetos).
function firstFieldError(data) {
  if (typeof data === 'string') return data;
  if (!data || typeof data !== 'object') return null;
  for (const value of Array.isArray(data) ? data : Object.values(data)) {
    const found = firstFieldError(value);
    if (found) return found;
  }
  return null;
}

async function request(path, { method = 'GET', body, headers = {}, raw = false } = {}) {
  const token = getAuthToken();
  const isForm = body instanceof FormData;
  const url = /^https?:\/\//.test(path) ? path : `${API_BASE_URL}${path}`;
  const response = await fetch(url, {
    method,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(isForm || !body ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });

  if (raw && response.ok) return response.blob();

  let data = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const message =
      (data && (data.detail || data.message)) ||
      firstFieldError(data) ||
      (response.status === 403
        ? 'No tienes permiso para realizar esta acción.'
        : 'Ocurrió un error al comunicarse con el servidor.');
    throw new ApiError(message, response.status, data);
  }
  return data;
}

// ---------- Modo ejemplo ----------
let mockStore = structuredClone(MOCK_ASSIGNMENTS);
const wait = (ms = 350) => new Promise((r) => setTimeout(r, ms));

const toSummary = ({ observacionesPrevias, ...rest }) => ({
  ...rest,
  tieneObservacionesPrevias: observacionesPrevias.length > 0,
});

const mockApi = {
  async list() {
    await wait();
    return mockStore.map(toSummary);
  },
  async detail(id) {
    await wait();
    const found = mockStore.find((a) => String(a.id) === String(id));
    if (!found) throw new ApiError('No encontramos esta asignación.', 404);
    return structuredClone(found);
  },
  async submit(id, { respuestas, dictamen, comentario }) {
    await wait(700);
    const idx = mockStore.findIndex((a) => String(a.id) === String(id));
    if (idx === -1) throw new ApiError('No encontramos esta asignación.', 404);
    const textos = Object.fromEntries(mockStore[idx].preguntas.map((p) => [p.id, p.texto]));
    const updated = {
      ...mockStore[idx],
      estado: 'evaluado',
      miEvaluacion: {
        fechaEnvio: new Date().toISOString(),
        dictamen,
        comentario,
        respuestas: respuestas.map((r) => ({
          ...r,
          texto: textos[r.pregunta],
          comentario: r.cumple ? '' : r.comentario,
        })),
      },
    };
    mockStore[idx] = updated;
    return structuredClone(updated);
  },
  async extensoPdf(assignment) {
    await wait(250);
    return samplePdf(assignment.trabajo);
  },
};

// ---------- API real ----------
const httpApi = {
  list: () => request(EVALUATOR_ENDPOINTS.list),
  detail: (id) => request(EVALUATOR_ENDPOINTS.detail(id)),
  // body: { respuestas: [{ pregunta, cumple, comentario }], dictamen, comentario }
  submit: (id, body) => request(EVALUATOR_ENDPOINTS.submit(id), { method: 'POST', body }),
  // El PDF se pide con el token y se muestra como blob (la URL viene en trabajo.archivo.url).
  extensoPdf: (assignment) => request(assignment.trabajo.archivo.url, { raw: true }),
};

export const evaluatorApi = USE_MOCKS ? mockApi : httpApi;
export const isMockMode = USE_MOCKS;
