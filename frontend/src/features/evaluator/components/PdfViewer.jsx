import { useExtensoPdf } from '../hooks/useEvaluator';
import { IconDownload, IconExternal, IconFile, IconRefresh } from './Icons';

// Visor del extenso: usa el lector de PDF del navegador dentro de un iframe.
export default function PdfViewer({ assignment }) {
  const { url, loading, error, available, retry } = useExtensoPdf(assignment);
  const nombre = assignment.trabajo.archivo?.nombre || 'extenso.pdf';

  return (
    <section className="ev-card ev-viewer" aria-label="Extenso del trabajo">
      <header className="ev-viewer__bar">
        <span className="ev-viewer__name">
          <IconFile width={16} height={16} />
          <span title={nombre}>{nombre}</span>
        </span>
        {url && (
          <span className="ev-viewer__actions">
            <a className="ev-btn ev-btn--ghost ev-btn--sm" href={url} target="_blank" rel="noopener noreferrer">
              <IconExternal width={15} height={15} /> Abrir en otra pestaña
            </a>
            <a className="ev-icon-btn" href={url} download={nombre} title="Descargar" aria-label="Descargar el extenso">
              <IconDownload width={16} height={16} />
            </a>
          </span>
        )}
      </header>

      <div className="ev-viewer__body">
        {!available && <p className="ev-viewer__msg">Este trabajo todavía no tiene un extenso disponible.</p>}
        {available && loading && (
          <p className="ev-viewer__msg">
            <span className="ev-spinner" aria-hidden /> Cargando extenso…
          </p>
        )}
        {available && error && (
          <div className="ev-viewer__msg">
            <p>{error}</p>
            <button type="button" className="ev-btn ev-btn--outline ev-btn--sm" onClick={retry}>
              <IconRefresh width={15} height={15} /> Reintentar
            </button>
          </div>
        )}
        {url && (
          <object data={`${url}#view=FitH&navpanes=0`} type="application/pdf" className="ev-viewer__frame" aria-label={nombre}>
            {/* Navegadores sin lector de PDF integrado (p. ej. Chrome en Android) */}
            <div className="ev-viewer__msg">
              <p>Tu navegador no puede mostrar el PDF aquí.</p>
              <a className="ev-btn ev-btn--primary ev-btn--sm" href={url} target="_blank" rel="noopener noreferrer">
                <IconExternal width={15} height={15} /> Abrir el extenso
              </a>
            </div>
          </object>
        )}
      </div>
    </section>
  );
}
