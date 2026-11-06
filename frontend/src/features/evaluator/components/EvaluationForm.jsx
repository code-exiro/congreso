import { useEffect, useMemo, useState } from 'react';
import { COMENTARIO_MAX, DICTAMEN_OPTIONS, DRAFT_KEY } from '../config';
import { evaluatorApi } from '../api/evaluatorApi';
import { IconArrowRight, IconCheck, IconClipboard } from './Icons';

function loadDraft(id) {
  try {
    return JSON.parse(window.localStorage.getItem(DRAFT_KEY(id))) || null;
  } catch {
    return null;
  }
}

function saveDraft(id, draft) {
  try {
    window.localStorage.setItem(DRAFT_KEY(id), JSON.stringify(draft));
  } catch {
    /* sin localStorage: el formulario funciona igual, solo no se guarda el borrador */
  }
}

function clearDraft(id) {
  try {
    window.localStorage.removeItem(DRAFT_KEY(id));
  } catch {
    /* nada */
  }
}

// Formulario de evaluación: una pregunta Sí/No por fila; un «No» exige comentario.
export default function EvaluationForm({ assignment, onSubmitted }) {
  const preguntas = assignment.preguntas || [];
  const draft = useMemo(() => loadDraft(assignment.id), [assignment.id]);

  const [respuestas, setRespuestas] = useState(draft?.respuestas || {});
  const [dictamen, setDictamen] = useState(draft?.dictamen || '');
  const [comentario, setComentario] = useState(draft?.comentario || '');
  const [mostrarErrores, setMostrarErrores] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [sending, setSending] = useState(false);
  const [serverError, setServerError] = useState(null);

  useEffect(() => {
    saveDraft(assignment.id, { respuestas, dictamen, comentario });
  }, [assignment.id, respuestas, dictamen, comentario]);

  const setRespuesta = (id, cambios) => {
    setRespuestas((prev) => ({ ...prev, [id]: { comentario: '', ...prev[id], ...cambios } }));
    setConfirmando(false);
  };

  const sinResponder = preguntas.filter((p) => typeof respuestas[p.id]?.cumple !== 'boolean');
  const sinComentario = preguntas.filter((p) => respuestas[p.id]?.cumple === false && !respuestas[p.id].comentario?.trim());
  const contestadas = preguntas.length - sinResponder.length;
  const conCorrecciones = preguntas.filter((p) => respuestas[p.id]?.cumple === false).length;
  const pendientes = [...sinResponder, ...sinComentario];
  const completo = preguntas.length > 0 && pendientes.length === 0 && Boolean(dictamen);

  const irAPendiente = () => {
    setMostrarErrores(true);
    const primera = preguntas.find((p) => pendientes.includes(p));
    const destino = primera ? document.getElementById(`ev-q-${primera.id}`) : document.getElementById('ev-dictamen');
    destino?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    (destino?.querySelector?.('textarea') || destino?.querySelector?.('input'))?.focus({ preventScroll: true });
    if (!primera) destino?.focus({ preventScroll: true });
  };

  const handleReview = (e) => {
    e.preventDefault();
    setServerError(null);
    if (completo) setConfirmando(true);
    else irAPendiente();
  };

  const handleSend = async () => {
    setSending(true);
    setServerError(null);
    try {
      const updated = await evaluatorApi.submit(assignment.id, {
        respuestas: preguntas.map((p) => ({
          pregunta: p.id,
          cumple: respuestas[p.id].cumple,
          comentario: respuestas[p.id].cumple ? '' : respuestas[p.id].comentario.trim(),
        })),
        dictamen,
        comentario: comentario.trim(),
      });
      clearDraft(assignment.id);
      onSubmitted(updated);
    } catch (e) {
      setServerError(e.message || 'No se pudo enviar la evaluación. Intenta de nuevo.');
      setConfirmando(false);
    } finally {
      setSending(false);
    }
  };

  if (!preguntas.length) {
    return (
      <section className="ev-card">
        <div className="ev-alert ev-alert--danger">
          No hay preguntas activas para este formulario. Avisa al Comité Organizador.
        </div>
      </section>
    );
  }

  return (
    <section className="ev-card ev-card--accent-gold ev-form">
      <header className="ev-form__head">
        <span className="ev-eyebrow">Formulario de evaluación</span>
        <h2 className="ev-card__title">
          <IconClipboard /> Califica el extenso
        </h2>
        <p className="ev-muted ev-small">
          Lee el extenso y contesta cada punto. Si marcas <strong>No</strong>, escribe qué debe corregir el autor.
        </p>
        <div className="ev-progress" aria-live="polite">
          <div className="ev-progress__text">
            <span>
              <strong>{contestadas}</strong> de {preguntas.length} contestadas
            </span>
            {conCorrecciones > 0 && (
              <span className="ev-text--danger">
                {conCorrecciones} con correcci{conCorrecciones === 1 ? 'ón' : 'ones'}
              </span>
            )}
          </div>
          <div className="ev-progress__track">
            <div className="ev-progress__fill" style={{ width: `${(contestadas / preguntas.length) * 100}%` }} />
          </div>
        </div>
      </header>

      <form onSubmit={handleReview} noValidate>
        <ol className="ev-questions">
          {preguntas.map((p, i) => {
            const r = respuestas[p.id] || {};
            const faltaRespuesta = mostrarErrores && typeof r.cumple !== 'boolean';
            const faltaComentario = mostrarErrores && r.cumple === false && !r.comentario?.trim();
            const estado = r.cumple === true ? 'is-yes' : r.cumple === false ? 'is-no' : '';
            return (
              <li
                key={p.id}
                id={`ev-q-${p.id}`}
                className={`ev-q ${estado} ${faltaRespuesta || faltaComentario ? 'has-error' : ''}`}
              >
                <div className="ev-q__row">
                  <span className="ev-q__num">{i + 1}</span>
                  <p className="ev-q__text" id={`ev-q-text-${p.id}`}>
                    {p.texto}
                  </p>
                  <div className="ev-q__options" role="radiogroup" aria-labelledby={`ev-q-text-${p.id}`}>
                    {[
                      { value: true, label: 'Sí', cls: 'yes' },
                      { value: false, label: 'No', cls: 'no' },
                    ].map((o) => (
                      <label key={o.label} className={`ev-opt ev-opt--${o.cls} ${r.cumple === o.value ? 'is-checked' : ''}`}>
                        <input
                          type="radio"
                          name={`ev-q-${p.id}`}
                          checked={r.cumple === o.value}
                          disabled={sending}
                          onChange={() => setRespuesta(p.id, { cumple: o.value })}
                        />
                        {o.label}
                      </label>
                    ))}
                  </div>
                </div>
                {faltaRespuesta && <p className="ev-field__error ev-q__error">Contesta Sí o No.</p>}
                {r.cumple === false && (
                  <div className="ev-q__comment">
                    <label className="ev-sr-only" htmlFor={`ev-q-comment-${p.id}`}>
                      Qué debe corregir el autor en el punto {i + 1}
                    </label>
                    <textarea
                      id={`ev-q-comment-${p.id}`}
                      className={`ev-input ev-textarea ${faltaComentario ? 'has-error' : ''}`}
                      rows={2}
                      maxLength={COMENTARIO_MAX}
                      value={r.comentario || ''}
                      disabled={sending}
                      placeholder="¿Qué debe corregir el autor? (obligatorio)"
                      onChange={(e) => setRespuesta(p.id, { comentario: e.target.value })}
                    />
                    <div className="ev-q__comment-foot">
                      {faltaComentario ? (
                        <p className="ev-field__error">Explica qué hay que corregir.</p>
                      ) : (
                        <span />
                      )}
                      <span className="ev-counter">
                        {(r.comentario || '').length}/{COMENTARIO_MAX}
                      </span>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ol>

        <div className="ev-form__final">
          <div className="ev-field">
            <label className="ev-field__label" htmlFor="ev-dictamen">
              Dictamen <span className="ev-required">*</span>
            </label>
            <select
              id="ev-dictamen"
              className={`ev-input ${mostrarErrores && !dictamen ? 'has-error' : ''}`}
              value={dictamen}
              disabled={sending}
              onChange={(e) => {
                setDictamen(e.target.value);
                setConfirmando(false);
              }}
            >
              <option value="">Selecciona una opción…</option>
              {DICTAMEN_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {mostrarErrores && !dictamen && <p className="ev-field__error">Selecciona un dictamen.</p>}
          </div>
          <div className="ev-field">
            <label className="ev-field__label" htmlFor="ev-comentario">
              Comentario general <span className="ev-optional">(opcional)</span>
            </label>
            <textarea
              id="ev-comentario"
              className="ev-input ev-textarea"
              rows={2}
              maxLength={COMENTARIO_MAX}
              value={comentario}
              disabled={sending}
              placeholder="Observaciones generales para el autor y el Comité"
              onChange={(e) => setComentario(e.target.value)}
            />
            <span className="ev-counter">
              {comentario.length}/{COMENTARIO_MAX}
            </span>
          </div>
        </div>

        {serverError && (
          <div className="ev-alert ev-alert--danger" role="alert">
            {serverError}
          </div>
        )}

        {confirmando ? (
          <div className="ev-confirm" role="alertdialog" aria-labelledby="ev-confirm-title">
            <p id="ev-confirm-title">
              <strong>¿Enviar tu evaluación?</strong>{' '}
              {conCorrecciones > 0
                ? `Marcaste ${conCorrecciones} punto${conCorrecciones === 1 ? '' : 's'} por corregir.`
                : 'El trabajo cumple con todos los puntos.'}{' '}
              Una vez enviada ya no podrás cambiar tus respuestas.
            </p>
            <div className="ev-actions">
              <button type="button" className="ev-btn ev-btn--ghost" onClick={() => setConfirmando(false)} disabled={sending}>
                Revisar de nuevo
              </button>
              <button type="button" className="ev-btn ev-btn--primary" onClick={handleSend} disabled={sending}>
                {sending ? <span className="ev-spinner" aria-hidden /> : <IconCheck />}
                {sending ? 'Enviando…' : 'Sí, enviar evaluación'}
              </button>
            </div>
          </div>
        ) : (
          <div className="ev-form__submit">
            {!completo && (
              <p className="ev-muted ev-small">
                {sinResponder.length > 0 && `Faltan ${sinResponder.length} pregunta${sinResponder.length === 1 ? '' : 's'}. `}
                {sinComentario.length > 0 &&
                  `${sinComentario.length} «No» sin comentario. `}
                {sinResponder.length === 0 && sinComentario.length === 0 && !dictamen && 'Falta el dictamen. '}
                <button type="button" className="ev-link" onClick={irAPendiente}>
                  Ir a lo pendiente <IconArrowRight width={14} height={14} />
                </button>
              </p>
            )}
            <button type="submit" className="ev-btn ev-btn--primary" disabled={!completo || sending} aria-disabled={!completo}>
              <IconCheck /> Enviar evaluación
            </button>
          </div>
        )}
        <p className="ev-muted ev-tiny">Tus respuestas se guardan en este navegador mientras terminas.</p>
      </form>
    </section>
  );
}
