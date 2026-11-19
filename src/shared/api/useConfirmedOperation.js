import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { randomUUID } from 'expo-crypto';
import { getSessionSnapshot } from '@/shared/session/sessionStore';

const operations = new Map();
const listeners = new Set();
let version = 0;

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getVersion() {
  return version;
}

function publish(key, operation) {
  if (operation) operations.set(key, operation);
  else operations.delete(key);
  version += 1;
  for (const listener of listeners) listener();
}

export function usePendingOperationIds(prefix) {
  useSyncExternalStore(subscribe, getVersion, getVersion);
  return [...operations.keys()]
    .filter((key) => key.startsWith(prefix))
    .map((key) => key.slice(prefix.length));
}

export function hasActiveOperation(prefix) {
  return [...operations].some(
    ([key, operation]) => key.startsWith(prefix) && operation.sending,
  );
}

export function operationError(error) {
  const message = error.response?.data?.message;
  return (
    (Array.isArray(message) ? message.join(' ') : message) || error.message
  );
}

function uncertain(error) {
  const status = error.response?.status;
  return !status || status === 408 || status >= 500;
}

export default function useConfirmedOperation({
  key,
  group,
  inspect,
  send,
  refresh,
  successMessage,
}) {
  useSyncExternalStore(subscribe, getVersion, getVersion);
  const [checking, setChecking] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [checkedKey, setCheckedKey] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [completedAction, setCompletedAction] = useState(null);
  const controller = useRef(null);
  const operation = operations.get(key);
  const busy = checking || Boolean(operation?.sending);

  useEffect(() => {
    return () => controller.current?.abort();
  }, [key]);

  async function check(candidate, onChecked) {
    if (controller.current || operations.get(key)?.sending) return;
    const request = new AbortController();
    controller.current = request;
    const generation = getSessionSnapshot().generation;
    setChecking(true);
    setError('');
    try {
      const applicable = await inspect(candidate, request.signal);
      if (
        request.signal.aborted ||
        generation !== getSessionSnapshot().generation
      )
        return;
      if (applicable) {
        await onChecked(generation);
      } else {
        publish(key, null);
        setConfirmation(null);
        setNotice(
          'Los datos cambiaron. Revisa el estado actual antes de elegir una acción.',
        );
      }
    } catch (failure) {
      if (!request.signal.aborted) setError(operationError(failure));
    } finally {
      controller.current = null;
      if (!request.signal.aborted) setChecking(false);
    }
  }

  async function submit(candidate) {
    await check(candidate, async (generation) => {
      if (hasActiveOperation(group)) {
        setError('Hay otro envío en curso. Espera a que termine.');
        return;
      }
      setConfirmation(null);
      setCheckedKey(null);
      setNotice('');
      publish(key, { ...candidate, sending: true });
      let result;
      try {
        result = await send(candidate);
      } catch (failure) {
        publish(
          key,
          uncertain(failure) ? { ...candidate, sending: false } : null,
        );
        if (
          controller.current?.signal.aborted ||
          generation !== getSessionSnapshot().generation
        )
          return;
        setError(operationError(failure));
        if (failure.response?.status === 409) await refresh().catch(() => {});
        return;
      }
      publish(key, null);
      if (
        controller.current?.signal.aborted ||
        generation !== getSessionSnapshot().generation
      )
        return;
      const confirmed =
        successMessage?.(result) || 'Operación confirmada por el servidor.';
      setCompletedAction(candidate.action);
      setNotice(confirmed);
      try {
        await refresh(result, candidate);
      } catch {
        setNotice(
          confirmed + ' Actualiza la consulta para ver los datos recientes.',
        );
      }
    });
  }

  return {
    busy,
    confirmation,
    error,
    notice,
    operation,
    completedAction,
    canRetry: Boolean(operation && checkedKey === operation.idempotencyKey),
    prepare(candidate) {
      if (!operations.has(key)) {
        setNotice('');
        setCompletedAction(null);
        void check(candidate, () =>
          setConfirmation({ ...candidate, idempotencyKey: randomUUID() }),
        );
      }
    },
    cancelConfirmation: () => setConfirmation(null),
    confirm() {
      if (confirmation && !operations.has(key)) void submit(confirmation);
    },
    reconcile() {
      if (operation) {
        setCheckedKey(null);
        void check(operation, () => {
          setCheckedKey(operation.idempotencyKey);
          setNotice(
            'La acción sigue disponible. Puedes reintentar el mismo envío.',
          );
        });
      }
    },
    retry() {
      if (operation && checkedKey === operation.idempotencyKey)
        void submit(operation);
    },
  };
}
