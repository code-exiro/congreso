import { Link } from 'react-router-dom';
import { buildDetailPath } from '../config';
import { deadlineLabel, formatDate } from '../utils/format';
import StatusBadge from './StatusBadge';
import { IconArrowRight, IconMessage } from './Icons';

export default function AssignmentTable({ assignments }) {
  return (
    <div className="ev-table-wrap">
      <table className="ev-table">
        <thead>
          <tr>
            <th>Trabajo</th>
            <th>Área</th>
            <th>Ronda</th>
            <th>Fecha límite</th>
            <th>Estado</th>
            <th className="ev-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {assignments.map((a) => {
            const due = deadlineLabel(a.fechaLimite, a.estado);
            return (
              <tr key={a.id}>
                <td data-label="Trabajo">
                  <div className="ev-work">
                    <span className="ev-work__folio">{a.trabajo.folio}</span>
                    <span className="ev-work__title">{a.trabajo.titulo}</span>
                    {a.tieneObservacionesPrevias && (
                      <span className="ev-work__hint">
                        <IconMessage width={14} height={14} /> Con observaciones previas
                      </span>
                    )}
                  </div>
                </td>
                <td data-label="Área">
                  <span className="ev-chip">{a.trabajo.area}</span>
                </td>
                <td data-label="Ronda">Evaluación {a.ronda}</td>
                <td data-label="Fecha límite">
                  <div className="ev-due">
                    <span>{formatDate(a.fechaLimite)}</span>
                    {due && <span className={`ev-due__tag ev-text--${due.tone}`}>{due.text}</span>}
                  </div>
                </td>
                <td data-label="Estado">
                  <StatusBadge estado={a.estado} />
                </td>
                <td className="ev-right">
                  <Link
                    to={buildDetailPath(a.id)}
                    className={a.estado === 'evaluado' ? 'ev-btn ev-btn--ghost ev-btn--sm' : 'ev-btn ev-btn--primary ev-btn--sm'}
                  >
                    {a.estado === 'evaluado' ? 'Ver evaluación' : 'Evaluar'}
                    <IconArrowRight width={16} height={16} />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
