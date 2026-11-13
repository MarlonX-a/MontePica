import { useCallback, useEffect, useRef, useState } from 'react';
import * as Crypto from 'expo-crypto';
import {
  approveParticipant,
  getParticipantsError,
  getVisitParticipants,
  rejectParticipant,
} from '@/features/admin/api/participantsAdminApi';

function canDecide(item, action, state, isLocked, pendingOperation) {
  const pendingMismatch = pendingOperation &&
    (pendingOperation.id !== item.id || pendingOperation.action !== action);
  return !isLocked && !state.loading && !state.error &&
    item.status === 'pending' && !pendingMismatch;
}

function findParticipantPage(visitId, participantId, page, pageCount, signal) {
  if (page > pageCount) return Promise.resolve(null);
  return getVisitParticipants(visitId, { page, limit: 100 }, signal).then((result) => {
    const found = result.items.find((item) => item.id === participantId);
    return found || findParticipantPage(visitId, participantId, page + 1, pageCount, signal);
  });
}

async function findParticipantForOperation(visitId, participantId, signal) {
  const firstPage = await getVisitParticipants(visitId, { page: 1, limit: 100 }, signal);
  const found = firstPage.items.find((item) => item.id === participantId);
  if (found) return found;
  const pageCount = Math.ceil(firstPage.total / firstPage.limit);
  return findParticipantPage(visitId, participantId, 2, pageCount, signal);
}

export default function useAdminParticipants(visitId) {
  const [state, setState] = useState({
    items: [],
    total: 0,
    page: 1,
    status: 'pending',
    loading: true,
    busy: false,
    error: '',
    notice: '',
    uncertain: null,
  });
  const current = useRef(state);
  const alive = useRef(false);
  const controller = useRef(null);
  const operation = useRef(null);
  const lock = useRef(false);
  const update = useCallback((changes) => {
    current.current = { ...current.current, ...changes };
    setState(current.current);
  }, []);
  const load = useCallback(
    async (page = current.current.page, status = current.current.status) => {
      controller.current?.abort();
      const request = new AbortController();
      controller.current = request;
      update({ loading: true, error: '', page, status });
      try {
        let result = await getVisitParticipants(
          visitId,
          { page, limit: 20, ...(status === 'all' ? {} : { status }) },
          request.signal,
        );
        const lastPage = Math.max(1, Math.ceil(result.total / 20));
        if (page > lastPage) {
          page = lastPage;
          result = await getVisitParticipants(
            visitId,
            { page, limit: 20, ...(status === 'all' ? {} : { status }) },
            request.signal,
          );
        }
        if (!alive.current || request.signal.aborted) return false;
        update({ items: result.items, total: result.total, page });
        return true;
      } catch (error) {
        if (alive.current && !request.signal.aborted)
          update({ error: getParticipantsError(error) });
        return false;
      } finally {
        if (alive.current && !request.signal.aborted)
          update({ loading: false });
      }
    },
    [update, visitId],
  );
  useEffect(() => {
    alive.current = true;
    void load(1, 'pending');
    return () => {
      alive.current = false;
      controller.current?.abort();
    };
  }, [load]);

  const decide = useCallback(
    async (item, action, reason = '') => {
      if (!canDecide(item, action, current.current, lock.current, operation.current)) return false;
      const trimmed = reason.trim();
      if (
        !operation.current &&
        action === 'reject' &&
        (!trimmed || trimmed.length > 500)
      ) {
        update({ notice: 'El motivo debe tener entre 1 y 500 caracteres.' });
        return false;
      }
      const op = operation.current || {
        id: item.id,
        item,
        action,
        reason: trimmed,
        key: `participant-${Crypto.randomUUID()}`,
      };
      operation.current = op;
      lock.current = true;
      update({ busy: true, error: '', notice: '' });
      try {
        const result =
          action === 'approve'
            ? await approveParticipant(op.id, op.key)
            : await rejectParticipant(op.id, op.reason, op.key);
        if (!alive.current) return false;
        operation.current = null;
        update({
          uncertain: null,
          notice: `Operación confirmada: ${result.alias} · ${result.status}.`,
        });
        const refreshed = await load();
        if (alive.current && !refreshed)
          update({
            notice:
              'La decisión ya se guardó. Reintenta únicamente la consulta.',
          });
        return true;
      } catch (error) {
        if (!alive.current) return false;
        const uncertain = !error.response || error.response.status >= 500;
        if (!uncertain) operation.current = null;
        update({
          uncertain: uncertain ? op : null,
          error: getParticipantsError(error),
        });
        return false;
      } finally {
        lock.current = false;
        if (alive.current) update({ busy: false });
      }
    },
    [load, update],
  );

  const refresh = useCallback(async () => {
    if (lock.current) return;
    const op = operation.current;
    if (!op) return load();
    lock.current = true;
    update({ loading: true, error: '' });
    const request = new AbortController();
    controller.current?.abort();
    controller.current = request;
    try {
      const found = await findParticipantForOperation(visitId, op.id, request.signal);
      if (!alive.current || request.signal.aborted) return;
      if (found && found.status !== 'pending') {
        operation.current = null;
        update({
          uncertain: null,
          notice: `Estado actual: ${found.status}. No se atribuye a una operación no confirmada.`,
        });
      } else
        update({
          notice:
            'No se confirmó la decisión. Puedes reintentar la misma operación.',
        });
      await load();
    } catch (error) {
      if (alive.current && !request.signal.aborted)
        update({ error: getParticipantsError(error) });
    } finally {
      lock.current = false;
      if (alive.current) update({ loading: false });
    }
  }, [load, update, visitId]);
  const retry = useCallback(async () => {
    const op = operation.current;
    if (!op || lock.current) return;
    update({ error: '' });
    return decide(op.item, op.action, op.reason);
  }, [decide, update]);
  return {
    ...state,
    refresh,
    retry,
    decide,
    filter: (status) => {
      if (!lock.current) void load(1, status);
    },
    changePage: (page) => {
      if (!lock.current) void load(page);
    },
  };
}
