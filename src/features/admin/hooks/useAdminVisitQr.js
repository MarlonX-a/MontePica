import { useEffect, useRef, useState } from 'react';
import { getAdminTable } from '@/features/admin/api/tablesAdminApi';
import {
  getVisitsApiError,
  issueAdminVisitQr,
} from '@/features/admin/api/visitsAdminApi';

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
    let currentTable;
    try {
      currentTable = await getAdminTable(tableId);
    } catch (requestError) {
      if (mounted.current && currentRequest === request.current) {
        setError(getVisitsApiError(requestError));
      }
      lock.current = false;
      if (mounted.current && currentRequest === request.current) {
        setIssuing(false);
      }
      return false;
    }
    if (!mounted.current || currentRequest !== request.current) {
      lock.current = false;
      return false;
    }
    if (!currentTable.active || currentTable.openVisitId !== visitId) {
      setError(
        'La mesa o la visita cambió. Actualiza el estado antes de emitir el QR.',
      );
      lock.current = false;
      if (mounted.current && currentRequest === request.current) {
        setIssuing(false);
      }
      return false;
    }
    try {
      const result = await issueAdminVisitQr(visitId);
      if (!mounted.current || currentRequest !== request.current) return false;
      setIssuedQr({
        tableId,
        visitId: result.visitId,
        qrToken: result.qrToken,
        qrVersion: result.qrVersion,
      });
      return true;
    } catch (requestError) {
      if (!mounted.current || currentRequest !== request.current) return false;
      const isUncertain =
        !requestError.response || requestError.response.status >= 500;
      setUncertain(isUncertain);
      setError(
        isUncertain
          ? `${getVisitsApiError(requestError)} El QR anterior pudo haberse invalidado. Actualiza la mesa y emite otro solo después de confirmarlo.`
          : getVisitsApiError(requestError),
      );
      return false;
    } finally {
      lock.current = false;
      if (mounted.current && currentRequest === request.current) {
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
