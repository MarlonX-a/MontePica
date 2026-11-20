import { useCallback, useEffect, useState } from 'react';
import { randomUUID } from 'expo-crypto';
import { getCurrentUser } from '@/shared/session/sessionStore';
import {
  cancelRedemption, getMyParticipationForVisit, getMyRedemption,
  getMyRedemptions, requestRedemption,
} from '@/features/client/api/redemptionsApi';
import { getPublicReward } from '@/features/client/api/rewardsApi';

const pendingByUser = new Map();
const pageSize = 20;

function errorMessage(error, fallback) {
  const message = error.response?.data?.message;
  return Array.isArray(message) ? message.join(' ') : message || error.message || fallback;
}

function uncertain(error) {
  const status = error.response?.status;
  return !status || status === 408 || status >= 500;
}

export default function useClientRedemptions(visitId) {
  const userId = getCurrentUser()?.id || 'unknown';
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [operation, setOperation] = useState(() => pendingByUser.get(userId) || null);

  const load = useCallback(async (targetPage = page, signal, selectedStatus = status) => {
    setLoading(true);
    setError('');
    try {
      const result = await getMyRedemptions({ page: targetPage, limit: pageSize, status: selectedStatus || undefined, visitId: visitId || undefined, signal });
      if (signal?.aborted) return;
      const lastPage = Math.max(1, Math.ceil((result.total || 0) / pageSize));
      if (targetPage > lastPage) {
        const adjusted = await getMyRedemptions({ page: lastPage, limit: pageSize, status: selectedStatus || undefined, visitId: visitId || undefined, signal });
        if (signal?.aborted) return;
        setItems(adjusted.items || []);
        setTotal(adjusted.total || 0);
        setPage(lastPage);
      } else {
        setItems(result.items || []);
        setTotal(result.total || 0);
        setPage(result.page || targetPage);
      }
      return true;
    } catch (failure) {
      if (!signal?.aborted) setError(errorMessage(failure, 'No se pudieron consultar tus canjes.'));
      return false;
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [page, status, visitId]);

  useEffect(() => {
    const controller = new AbortController();
    void load(page, controller.signal);
    return () => controller.abort();
  }, [load, page]);

  function saveOperation(next) {
    setOperation(next);
    if (next) pendingByUser.set(userId, next);
    else pendingByUser.delete(userId);
  }

  async function submit(kind, redemptionOrReward) {
    if (busy) return;
    const existing = operation?.kind === kind && (kind === 'request'
      ? operation.rewardId === redemptionOrReward.id
      : operation.redemptionId === redemptionOrReward.id) ? operation : null;
    if (kind === 'request' && !visitId && !existing) return;
    const id = existing?.id || (kind === 'request' ? `request:${visitId}:${redemptionOrReward.id}` : `cancel:${redemptionOrReward.id}`);
    let pending = existing;
    setBusy(true);
    setError('');
    if (!pending) {
      try {
        if (kind === 'request') {
          const participant = await getMyParticipationForVisit(visitId);
          if (participant?.status !== 'approved') throw new Error('Necesitas una participación aprobada en esta visita.');
          const currentReward = await getPublicReward(redemptionOrReward.id);
          if (!currentReward.active || currentReward.version !== redemptionOrReward.version) {
            throw new Error('La recompensa cambió o ya no está disponible. Actualiza el catálogo antes de solicitarla.');
          }
          pending = { id, kind, visitId, rewardId: currentReward.id, rewardVersion: currentReward.version, key: randomUUID() };
        } else {
          const current = await getMyRedemption(redemptionOrReward.id);
          if (current.status !== 'pending') {
            setItems((currentItems) => currentItems.map((item) => item.id === current.id ? current : item));
            throw new Error('El canje ya no está pendiente. Actualicé el estado actual.');
          }
          pending = { id, kind, redemptionId: redemptionOrReward.id, key: randomUUID() };
        }
        saveOperation(pending);
      } catch (failure) {
        setError(errorMessage(failure, 'No se pudo preparar el canje.'));
        setBusy(false);
        return;
      }
    }
    try {
      const updated = kind === 'request'
        ? await requestRedemption(pending.visitId, pending.rewardId, pending.rewardVersion, pending.key)
        : await cancelRedemption(pending.redemptionId, pending.key);
      saveOperation(null);
      const nextStatus = kind === 'request' ? 'pending' : 'cancelled';
      setStatus(nextStatus);
      setPage(1);
      const refreshed = await load(1, undefined, nextStatus);
      if (!refreshed) setError('La operación se confirmó. No se pudo actualizar el listado; vuelve a consultar sin repetir el envío.');
      return updated;
    } catch (failure) {
      if (uncertain(failure)) {
        saveOperation(pending);
        setError(`${errorMessage(failure, 'No se confirmó el resultado.')} Consulta el estado o reintenta exactamente la misma operación.`);
      } else {
        saveOperation(null);
        setError(errorMessage(failure, 'No se pudo completar el canje.'));
        if (failure.response?.status === 409) {
          if (kind === 'cancel') {
            try {
              const latest = await getMyRedemption(redemptionOrReward.id);
              setItems((currentItems) => currentItems.map((item) => item.id === latest.id ? latest : item));
            } catch { /* Keep the backend conflict visible if the detail cannot be refreshed. */ }
          }
          if (kind === 'request') setStatus('pending');
          await load(1, undefined, kind === 'request' ? 'pending' : status);
          setError(errorMessage(failure, 'El canje cambió en el servidor. Actualicé la lista.'));
        }
      }
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function reconcile() {
    if (!operation || busy) return;
    setBusy(true);
    setError('');
    let currentStatus = '';
    let confirmed = false;
    try {
      if (operation.kind === 'cancel') {
        const latest = await getMyRedemption(operation.redemptionId);
        currentStatus = latest.status;
        if (currentStatus !== 'pending') {
          saveOperation(null);
          confirmed = true;
        }
      } else {
        let scanPage = 1;
        let result;
        do {
          result = await getMyRedemptions({ page: scanPage, limit: 100, visitId: operation.visitId });
          const found = (result.items || []).some((item) => item.rewardId === operation.rewardId);
          if (found) { saveOperation(null); confirmed = true; break; }
          scanPage += 1;
        } while ((scanPage - 1) * 100 < result.total);
      }
      await load(1);
      if (operation.kind === 'cancel') setError(currentStatus === 'pending'
        ? 'El canje sigue pendiente. Puedes reintentar la misma cancelación.'
        : `El canje ahora está ${currentStatus}. Se muestra el estado confirmado por el servidor.`);
      else if (pendingByUser.has(userId)) setError('No se encontró el canje en la consulta. Puedes reintentar el mismo envío con su clave original.');
      return confirmed;
    } catch (failure) {
      setError(errorMessage(failure, 'No se pudo consultar el estado del canje.'));
    } finally { setBusy(false); }
  }

  return {
    items, total, page, pageSize, status, setStatus: (value) => { setStatus(value); setPage(1); },
    setPage, loading, busy, error, load: () => load(page), submit, operation, reconcile,
  };
}
