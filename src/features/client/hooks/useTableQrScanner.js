import { useCallback, useRef, useState } from 'react';
import {
  getTableAccessError,
  resolveTableQr,
} from '@/features/client/api/tableAccessApi';

const MAX_QR_TOKEN_LENGTH = 128;

export default function useTableQrScanner() {
  const [status, setStatus] = useState('scanning');
  const [table, setTable] = useState(null);
  const [error, setError] = useState('');
  const [errorStatus, setErrorStatus] = useState(null);
  const statusRef = useRef(status);
  statusRef.current = status;
  const token = useRef('');
  const request = useRef(null);
  const active = useRef(true);
  const lock = useRef(false);

  const cancel = useCallback(() => {
    active.current = false;
    request.current?.abort();
    request.current = null;
    token.current = '';
    lock.current = false;
  }, []);

  const activate = useCallback(() => {
    active.current = true;
    token.current = '';
    lock.current = false;
    statusRef.current = 'scanning';
    setTable(null);
    setError('');
    setErrorStatus(null);
    setStatus('scanning');
  }, []);

  const resolve = useCallback(async (qrToken) => {
    if (!active.current || lock.current || statusRef.current !== 'scanning')
      return;
    if (
      typeof qrToken !== 'string' ||
      !qrToken.trim() ||
      qrToken.length > MAX_QR_TOKEN_LENGTH
    ) {
      token.current = '';
      setError(
        'El código QR no contiene un token válido. Escanea otro código.',
      );
      setErrorStatus(400);
      statusRef.current = 'error';
      setStatus('error');
      return;
    }

    token.current = qrToken;
    lock.current = true;
    statusRef.current = 'resolving';
    setStatus('resolving');
    setError('');
    setErrorStatus(null);
    const controller = new AbortController();
    request.current = controller;
    try {
      const result = await resolveTableQr(qrToken, controller.signal);
      if (!active.current || controller.signal.aborted) return;
      setTable(result);
      statusRef.current = 'resolved';
      setStatus('resolved');
    } catch (requestError) {
      if (!active.current || controller.signal.aborted) return;
      setError(getTableAccessError(requestError));
      setErrorStatus(requestError.response?.status ?? null);
      statusRef.current = 'error';
      setStatus('error');
    } finally {
      if (request.current === controller) request.current = null;
      lock.current = false;
    }
  }, []);

  const retry = useCallback(() => {
    if (!token.current || !active.current || lock.current) return;
    statusRef.current = 'scanning';
    setStatus('scanning');
    void resolve(token.current);
  }, [resolve]);

  const scanAnother = useCallback(() => {
    request.current?.abort();
    request.current = null;
    token.current = '';
    lock.current = false;
    setTable(null);
    setError('');
    setErrorStatus(null);
    statusRef.current = 'scanning';
    setStatus('scanning');
  }, []);

  const clearAfterContinue = useCallback(() => {
    token.current = '';
    request.current?.abort();
    request.current = null;
  }, []);

  const withResolvedQr = useCallback(
    (callback, alias) => {
      if (!table?.visitId || !token.current) return false;
      return callback(table.visitId, token.current, alias);
    },
    [table],
  );

  return {
    status,
    table,
    error,
    errorStatus,
    resolve,
    retry,
    activate,
    cancel,
    scanAnother,
    clearAfterContinue,
    withResolvedQr,
  };
}
