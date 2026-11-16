import { useEffect, useRef, useState } from 'react';
import { getAdminTable } from '@/features/admin/api/tablesAdminApi';
import {
  getVisitsApiError,
  issueAdminVisitQr,
} from '@/features/admin/api/visitsAdminApi';

function isCurrentRequest(mounted, currentRequest, request) {
  return mounted.current && currentRequest === request.current;
}

function isCurrentTable(table, visitId) {
  return table.active && table.openVisitId === visitId;
}

function reportIssueError(error, setError, setUncertain) {
  const uncertain = !error.response || error.response.status >= 500;
  setUncertain(uncertain);
  const recovery = uncertain
    ? ' El QR anterior pudo haberse invalidado. Actualiza la mesa y emite otro solo después de confirmarlo.'
    : '';
  setError(`${getVisitsApiError(error)}${recovery}`);
}

export default function useAdminVisitQr({ table, visitId, onRefreshTable }) {
  const [issuedQr, setIssuedQr] = useState(null);
  const [error, setError] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const mounted = useRef(false);
  const request = useRef(0);
  const lock = useRef(false);
  const tableId = table?.id;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      request.current += 1;
    };
  }, []);

  useEffect(() => {
    request.current += 1;
    setIssuedQr(null);
    setError('');
    setUncertain(false);
  }, [tableId, visitId]);

  async function issue() {
    if (!tableId || !visitId || lock.current) return false;
    const currentRequest = ++request.current;
    lock.current = true;
    setIssuing(true);
    setIssuedQr(null);
    setError('');
    setUncertain(false);
    try {
      const currentTable = await getAdminTable(tableId);
      if (!isCurrentRequest(mounted, currentRequest, request)) return false;
      if (!isCurrentTable(currentTable, visitId)) {
        setError(
          'La mesa o la visita cambió. Actualiza el estado antes de emitir el QR.',
        );
        return false;
      }
      const result = await issueAdminVisitQr(visitId);
      if (!isCurrentRequest(mounted, currentRequest, request)) return false;
      setIssuedQr({
        tableId,
        visitId: result.visitId,
        qrToken: result.qrToken,
        qrVersion: result.qrVersion,
      });
      return true;
    } catch (requestError) {
      if (isCurrentRequest(mounted, currentRequest, request)) {
        reportIssueError(requestError, setError, setUncertain);
      }
      return false;
    } finally {
      lock.current = false;
      if (isCurrentRequest(mounted, currentRequest, request)) {
        setIssuing(false);
      }
    }
  }

  function clear() {
    request.current += 1;
    setIssuedQr(null);
    setError('');
    setUncertain(false);
  }

  async function refreshTable() {
    const refreshed = await onRefreshTable();
    if (refreshed) {
      setError('');
      setUncertain(false);
    }
  }

  return {
    qr:
      issuedQr?.tableId === tableId && issuedQr?.visitId === visitId
        ? issuedQr
        : null,
    error,
    uncertain,
    issuing,
    issue,
    clear,
    refreshTable,
  };
}
