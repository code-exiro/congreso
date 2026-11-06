import { useCallback, useEffect, useState } from 'react';
import { evaluatorApi, isMockMode } from '../api/evaluatorApi';

export function useAssignments() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await evaluatorApi.list());
    } catch (e) {
      setError(e.message || 'No se pudieron cargar tus asignaciones.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { assignments: data, loading, error, reload: load };
}

export function useAssignment(id) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await evaluatorApi.detail(id));
    } catch (e) {
      setError(e.message || 'No se pudo cargar el trabajo.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  return { assignment: data, setAssignment: setData, loading, error, reload: load };
}

// Descarga el PDF del extenso (con el token) y lo convierte en una URL local para el visor.
export function useExtensoPdf(assignment) {
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  const id = assignment?.id;
  const hasFile = Boolean(assignment && (assignment.trabajo?.archivo?.url || isMockMode));

  useEffect(() => {
    if (!id || !hasFile) return undefined;
    let objectUrl = null;
    let cancelled = false;
    setLoading(true);
    setError(null);
    evaluatorApi
      .extensoPdf(assignment)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' }));
        setUrl(objectUrl);
      })
      .catch((e) => !cancelled && setError(e.message || 'No se pudo cargar el extenso.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setUrl(null);
    };
    // Solo se vuelve a pedir si cambia la asignación o se reintenta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, hasFile, attempt]);

  return { url, loading, error, available: hasFile, retry: () => setAttempt((n) => n + 1) };
}
