import { useState } from 'react';
import { IconCheck, IconX } from './Icons';

// Respuestas ya enviadas (solo lectura). Con `soloCorrecciones` muestra primero lo que se marcó con «No».
export default function AnswersList({ respuestas = [], soloCorrecciones = false }) {
  const [verTodas, setVerTodas] = useState(!soloCorrecciones);
  const noCumple = respuestas.filter((r) => !r.cumple);
  const visibles = verTodas ? respuestas : noCumple;

  return (
    <div className="ev-answers">
      <p className="ev-answers__summary">
        <span className="ev-text--success">
          <IconCheck width={14} height={14} /> {respuestas.length - noCumple.length} Sí
        </span>
        <span className="ev-text--danger">
          <IconX width={14} height={14} /> {noCumple.length} No
        </span>
      </p>
      {visibles.length > 0 && (
        <ol className="ev-answers__list">
          {visibles.map((r) => (
            <li key={r.pregunta} className={r.cumple ? 'is-yes' : 'is-no'}>
              <span className="ev-answers__mark" aria-label={r.cumple ? 'Sí' : 'No'}>
                {r.cumple ? <IconCheck width={14} height={14} /> : <IconX width={14} height={14} />}
              </span>
              <div>
                <p className="ev-answers__q">{r.texto}</p>
                {!r.cumple && r.comentario && <p className="ev-answers__c">{r.comentario}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}
      {soloCorrecciones && respuestas.length > noCumple.length && (
        <button type="button" className="ev-link" onClick={() => setVerTodas((v) => !v)}>
          {verTodas ? 'Ver solo las correcciones' : 'Ver todas las respuestas'}
        </button>
      )}
    </div>
  );
}
