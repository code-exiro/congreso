const dateFmt = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

// "2026-11-02" (solo fecha) se interpreta en hora local; si no, en México saldría un día antes.
export function parseDate(value) {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(value);
}

export const formatDate = (iso) => (iso ? dateFmt.format(parseDate(iso)) : '—');
export const formatDateTime = (iso) => (iso ? dateTimeFmt.format(parseDate(iso)) : '—');

export function daysUntil(iso) {
  if (!iso) return null;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = parseDate(iso);
  end.setHours(0, 0, 0, 0);
  return Math.round((end - start) / 86400000);
}

export function deadlineLabel(iso, estado) {
  if (estado === 'evaluado') return null;
  const d = daysUntil(iso);
  if (d === null) return null;
  if (d < 0) return { text: `Vencida hace ${Math.abs(d)} día${Math.abs(d) === 1 ? '' : 's'}`, tone: 'danger' };
  if (d === 0) return { text: 'Vence hoy', tone: 'danger' };
  if (d <= 3) return { text: `Vence en ${d} día${d === 1 ? '' : 's'}`, tone: 'warning' };
  return { text: `Vence en ${d} días`, tone: 'muted' };
}

export const ESTADOS = {
  pendiente: { label: 'Pendiente', tone: 'warning' },
  en_proceso: { label: 'En proceso', tone: 'info' },
  requiere_adicional: { label: 'Evaluación adicional', tone: 'violet' },
  evaluado: { label: 'Evaluado', tone: 'success' },
};

export const DICTAMEN_LABELS = {
  aceptado: 'Aceptado',
  aceptado_cambios: 'Aceptado con cambios',
  rechazado: 'Rechazado',
};
