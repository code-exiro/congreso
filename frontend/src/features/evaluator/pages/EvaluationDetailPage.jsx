import { Link, useParams } from 'react-router-dom';
import { EVALUATOR_PATHS } from '../config';
import { useAssignment } from '../hooks/useEvaluator';
import { DICTAMEN_LABELS, deadlineLabel, formatDate, formatDateTime } from '../utils/format';
import StatusBadge from '../components/StatusBadge';
import PreviousReviews from '../components/PreviousReviews';
import EvaluationForm from '../components/EvaluationForm';
import AnswersList from '../components/AnswersList';
import PdfViewer from '../components/PdfViewer';
import { IconArrowLeft, IconCheck, IconChevronDown, IconClock, IconFile } from '../components/Icons';
import '../evaluator.css';

export default function EvaluationDetailPage() {
  const { assignmentId } = useParams();
  const { assignment, setAssignment, loading, error, reload } = useAssignment(assignmentId);

  if (loading) {
    return (
      <div className="ev-page">
        <div className="ev-skeleton ev-skeleton--hero" />
        <div className="ev-skeleton ev-skeleton--block" />
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="ev-page">
        <div className="ev-card ev-empty">
          <p>{error || 'No encontramos este trabajo.'}</p>
          <div className="ev-actions ev-actions--center">
            <Link to={EVALUATOR_PATHS.list} className="ev-btn ev-btn--ghost">
              <IconArrowLeft /> Volver a mis evaluaciones
            </Link>
            <button type="button" className="ev-btn ev-btn--outline" onClick={reload}>
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { trabajo, miEvaluacion, estado } = assignment;
  const due = deadlineLabel(assignment.fechaLimite, estado);
  const yaEvaluado = estado === 'evaluado' && miEvaluacion;

  return (
    <div className="ev-page">
      <Link to={EVALUATOR_PATHS.list} className="ev-back">
        <IconArrowLeft width={16} height={16} /> Mis evaluaciones
      </Link>

      <section className="ev-hero ev-hero--detail">
        <div>
          <span className="ev-eyebrow">
            {trabajo.folio} · Evaluación {assignment.ronda}
          </span>
          <h1 className="ev-hero__title ev-hero__title--md">{trabajo.titulo}</h1>
          <div className="ev-meta">
            <StatusBadge estado={estado} />
            <span className="ev-chip">{trabajo.area}</span>
            <span className="ev-meta__item">
              <IconClock width={16} height={16} /> Fecha límite: {formatDate(assignment.fechaLimite)}
            </span>
            {due && <span className={`ev-meta__item ev-text--${due.tone}`}>{due.text}</span>}
          </div>
        </div>
      </section>

      <div className="ev-workspace">
        <PdfViewer assignment={assignment} />

        <div className="ev-workspace__side">
          <details className="ev-card ev-collapse">
            <summary className="ev-collapse__summary">
              <span className="ev-card__title">
                <IconFile /> Datos del trabajo
              </span>
              <IconChevronDown className="ev-collapse__icon" />
            </summary>
            <dl className="ev-dl">
              <div>
                <dt>Autores</dt>
                <dd>{trabajo.autores.join(', ') || '—'}</dd>
              </div>
              <div>
                <dt>Institución</dt>
                <dd>{trabajo.institucion || '—'}</dd>
              </div>
              <div>
                <dt>Recibido</dt>
                <dd>{formatDate(trabajo.fechaEnvio)}</dd>
              </div>
              <div>
                <dt>Palabras clave</dt>
                <dd>{trabajo.palabrasClave?.length ? trabajo.palabrasClave.join(', ') : '—'}</dd>
              </div>
            </dl>
            {trabajo.resumen && (
              <>
                <h3 className="ev-subtitle">Resumen</h3>
                <p className="ev-paragraph">{trabajo.resumen}</p>
              </>
            )}
          </details>

          <PreviousReviews reviews={assignment.observacionesPrevias} />

          {yaEvaluado ? (
            <section className="ev-card ev-card--accent-green">
              <span className="ev-eyebrow ev-text--success">Enviada</span>
              <h2 className="ev-card__title">
                <IconCheck /> Tu evaluación
              </h2>
              <div className="ev-alert ev-alert--success">
                Dictamen: <strong>{DICTAMEN_LABELS[miEvaluacion.dictamen] || miEvaluacion.dictamen}</strong> · Enviada
                el {formatDateTime(miEvaluacion.fechaEnvio)}
              </div>
              {miEvaluacion.comentario && <p className="ev-paragraph">{miEvaluacion.comentario}</p>}
              <AnswersList respuestas={miEvaluacion.respuestas} />
            </section>
          ) : (
            <EvaluationForm key={assignment.id} assignment={assignment} onSubmitted={setAssignment} />
          )}
        </div>
      </div>
    </div>
  );
}
