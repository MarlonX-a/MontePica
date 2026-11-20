import { useCallback, useEffect, useRef, useState } from 'react';
import { randomUUID } from 'expo-crypto';
import { getCurrentUser } from '@/shared/session/sessionStore';
import { decideAdminRedemption, getAdminRedemption, getAdminRedemptions } from '@/features/admin/api/redemptionsAdminApi';

const pendingByUser = new Map();
const pageSize = 20;

function message(error, fallback) {
  const text = error.response?.data?.message;
  return Array.isArray(text) ? text.join(' ') : text || error.message || fallback;
}

function isUncertain(error) {
  const status = error.response?.status;
  return !status || status === 408 || status >= 500;
}

export default function useAdminRedemptions(enabled) {
  const userId = getCurrentUser()?.id || 'unknown';
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('pending');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [operation, setOperation] = useState(() => pendingByUser.get(userId) || null);
  const [detail, setDetail] = useState(null);
  const [detailError, setDetailError] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);
  const detailSequence = useRef(0);

  const load = useCallback(async (target = page, signal) => {
    setLoading(true);
    setError('');
    try {
      const result = await getAdminRedemptions({ page: target, limit: pageSize, status, signal });
      if (signal?.aborted) return;
      const lastPage = Math.max(1, Math.ceil((result.total || 0) / pageSize));
      if (target > lastPage) {
        const adjusted = await getAdminRedemptions({ page: lastPage, limit: pageSize, status, signal });
        if (signal?.aborted) return;
        setItems(adjusted.items || []);
        setTotal(adjusted.total || 0);
        setPage(lastPage);
      } else {
        setItems(result.items || []);
        setTotal(result.total || 0);
        setPage(result.page || target);
      }
      return true;
    } catch (failure) {
      if (!signal?.aborted) setError(message(failure, 'No se pudieron consultar los canjes.'));
      return false;
    } finally { if (!signal?.aborted) setLoading(false); }
  }, [page, status]);

  useEffect(() => {
    if (!enabled) return undefined;
    const controller = new AbortController();
    void load(page, controller.signal);
    return () => controller.abort();
  }, [enabled, load, page]);

  useEffect(() => () => { detailSequence.current += 1; }, []);

  async function loadDetail(id) {
    const sequence = detailSequence.current + 1;
    detailSequence.current = sequence;
    setDetail(null);
    setDetailError('');
    setDetailLoading(true);
    try {
      const result = await getAdminRedemption(id);
      if (sequence !== detailSequence.current) return null;
      setDetail(result);
      return result;
    } catch (failure) {
      if (sequence === detailSequence.current) setDetailError(message(failure, 'No se pudo consultar el detalle del canje.'));
      return null;
    } finally {
      if (sequence === detailSequence.current) setDetailLoading(false);
    }
  }

  function clearDetail() {
    detailSequence.current += 1;
    setDetail(null);
    setDetailError('');
    setDetailLoading(false);
  }

  function saveOperation(next) {
    setOperation(next);
    if (next) pendingByUser.set(userId, next);
    else pendingByUser.delete(userId);
  }

  async function decide(item, action, reason = '') {
    if (busy) return;
    const normalizedReason = reason.trim();
    if (action === 'reject' && (!normalizedReason || normalizedReason.length > 500)) {
      setError('El motivo debe tener entre 1 y 500 caracteres.');
      return;
    }
    const operationId = `${item.id}:${action}`;
    let pending = operation?.id === operationId ? operation : null;
    setBusy(true);
    setError('');
    try {
      if (!pending) {
        const current = await getAdminRedemption(item.id);
        if (current.status !== 'pending') {
          setItems((rows) => rows.map((row) => row.id === item.id ? current : row));
          await load(page);
          setError('La solicitud ya fue resuelta. Se actualizó con el estado actual.');
          return;
        }
        pending = { id: operationId, redemptionId: item.id, action, reason: normalizedReason, key: randomUUID() };
        saveOperation(pending);
      }
      const updated = await decideAdminRedemption(pending.redemptionId, pending.action, pending.reason, pending.key);
      saveOperation(null);
      setItems((rows) => rows.map((row) => row.id === updated.id ? updated : row));
      if (detail?.id === updated.id) void loadDetail(updated.id);
      const refreshed = await load(page);
      if (!refreshed) setError('La decisión se guardó. No se pudo actualizar la bandeja; vuelve a consultar sin repetirla.');
      return updated;
    } catch (failure) {
      if (isUncertain(failure)) {
        if (pending) saveOperation(pending);
        setError(`${message(failure, 'No se confirmó la decisión.')} Consulta el estado o reintenta la misma decisión y motivo.`);
      } else {
        saveOperation(null);
        setError(message(failure, 'No se pudo resolver el canje.'));
        if (failure.response?.status === 409) {
          await load(page);
          setError(message(failure, 'La solicitud cambió en el servidor. Actualicé la bandeja.'));
        }
      }
      return null;
    } finally { setBusy(false); }
  }

  async function reconcile() {
    if (!operation || busy) return;
    setBusy(true);
    setError('');
    try {
      const current = await getAdminRedemption(operation.redemptionId);
      setItems((rows) => rows.map((row) => row.id === current.id ? current : row));
      if (detail?.id === current.id) setDetail(current);
      const changed = current.status !== 'pending';
      if (changed) {
        saveOperation(null);
      }
      await load(page);
      setError(changed
        ? 'La solicitud ya no está pendiente. Se muestra el estado actual del servidor.'
        : 'La solicitud sigue pendiente. Puedes reintentar la misma decisión con su clave original.');
    } catch (failure) { setError(message(failure, 'No se pudo consultar el canje.')); }
    finally { setBusy(false); }
  }

  return {
    items, total, page, pageSize, status, setStatus: (value) => { setStatus(value); setPage(1); },
    setPage, loading, busy, error, load: () => load(page), decide, operation, reconcile,
    detail, detailError, detailLoading, loadDetail, clearDetail,
  };
}
