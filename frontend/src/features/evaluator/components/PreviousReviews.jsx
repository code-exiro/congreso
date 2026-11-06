import { DICTAMEN_LABELS, formatDateTime } from '../utils/format';
import AnswersList from './AnswersList';
import { IconChevronDown, IconMessage } from './Icons';

export default function PreviousReviews({ reviews }) {
  if (!reviews?.length) return null;
  return (
    <details className="ev-card ev-card--accent-violet ev-collapse" open>
      <summary className="ev-collapse__summary">
        <span className="ev-collapse__label">
          <span className="ev-eyebrow ev-text--violet">Referencia</span>
          <span className="ev-card__title">
            <IconMessage /> Observaciones de evaluadores previos
          </span>
        </span>
        <IconChevronDown className="ev-collapse__icon" />
      </summary>
      <p className="ev-muted ev-small">
        Consulta lo que ya se señaló para complementar tu evaluación. No son tuyas y no se pueden modificar.
      </p>
      <div className="ev-reviews">
        {reviews.map((r) => (
          <article key={r.id} className="ev-review">
            <div className="ev-review__head">
              <strong>{r.evaluador}</strong>
              {r.dictamen && <span className="ev-chip ev-chip--outline">{DICTAMEN_LABELS[r.dictamen] || r.dictamen}</span>}
              <span className="ev-review__date">{formatDateTime(r.fechaEnvio)}</span>
            </div>
            {r.comentario && <p className="ev-review__text">{r.comentario}</p>}
            <AnswersList respuestas={r.respuestas} soloCorrecciones />
          </article>
        ))}
      </div>
    </details>
  );
}
