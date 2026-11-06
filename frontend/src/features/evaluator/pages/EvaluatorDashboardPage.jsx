import { useMemo, useState } from 'react';
import { isMockMode } from '../api/evaluatorApi';
import { useAssignments } from '../hooks/useEvaluator';
import { parseDate } from '../utils/format';
import AssignmentTable from '../components/AssignmentTable';
import StatsBar, { FILTERS } from '../components/StatsBar';
import { IconClipboard, IconRefresh, IconSearch } from '../components/Icons';
import '../evaluator.css';

const ORDER = { requiere_adicional: 0, pendiente: 1, en_proceso: 1, evaluado: 2 };

export default function EvaluatorDashboardPage() {
  const { assignments, loading, error, reload } = useAssignments();
  const [filter, setFilter] = useState('todos');
  const [query, setQuery] = useState('');
  const [area, setArea] = useState('');

  const areas = useMemo(() => [...new Set(assignments.map((a) => a.trabajo.area))].sort(), [assignments]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assignments
      .filter(FILTERS[filter])
      .filter((a) => !area || a.trabajo.area === area)
      .filter(
        (a) =>
          !q ||
          a.trabajo.titulo.toLowerCase().includes(q) ||
          a.trabajo.folio.toLowerCase().includes(q)
      )
      .sort(
        (x, y) =>
          (ORDER[x.estado] ?? 3) - (ORDER[y.estado] ?? 3) || (parseDate(x.fechaLimite) || 0) - (parseDate(y.fechaLimite) || 0)
      );
  }, [assignments, filter, query, area]);

  return (
    <div className="ev-page">
      <section className="ev-hero">
        <div>
          <span className="ev-eyebrow">Evaluaciones · Comité científico técnico</span>
          <h1 className="ev-hero__title">Mis evaluaciones asignadas</h1>
          <p className="ev-hero__text">
            Revisa los trabajos que el Coordinador te asignó, léelos en el visor y contesta el formulario de evaluación
            antes de la fecha límite.
          </p>
        </div>
        <button type="button" className="ev-btn ev-btn--outline" onClick={reload} disabled={loading}>
          <IconRefresh /> Actualizar
        </button>
      </section>

      {isMockMode && (
        <div className="ev-alert ev-alert--info">
          Estás viendo <strong>datos de ejemplo</strong>. Cuando el backend esté listo pon{' '}
          <code>VITE_EVALUATOR_MOCKS=false</code> en tu <code>.env</code>.
        </div>
      )}

      <StatsBar assignments={assignments} active={filter} onSelect={setFilter} />

      <section className="ev-card">
        <div className="ev-toolbar">
          <div className="ev-search">
            <IconSearch />
            <input
              type="search"
              placeholder="Buscar por título o folio…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Buscar trabajo"
            />
          </div>
          <select className="ev-input ev-input--select" value={area} onChange={(e) => setArea(e.target.value)} aria-label="Filtrar por área">
            <option value="">Todas las áreas</option>
            {areas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="ev-skeleton-list" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="ev-skeleton" />
            ))}
          </div>
        ) : error ? (
          <div className="ev-empty">
            <p>{error}</p>
            <button type="button" className="ev-btn ev-btn--outline" onClick={reload}>
              Reintentar
            </button>
          </div>
        ) : visible.length === 0 ? (
          <div className="ev-empty">
            <IconClipboard width={32} height={32} />
            <p>
              {assignments.length === 0
                ? 'Aún no tienes trabajos asignados. Te avisaremos cuando el Coordinador te asigne uno.'
                : 'Ningún trabajo coincide con los filtros.'}
            </p>
          </div>
        ) : (
          <AssignmentTable assignments={visible} />
        )}
      </section>
    </div>
  );
}
