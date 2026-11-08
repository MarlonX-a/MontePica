import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getAdminTable,
  getTablesApiError,
} from '@/features/admin/api/tablesAdminApi';
import {
  closeAdminVisit,
  getAdminVisit,
  getVisitsApiError,
  openAdminVisit,
} from '@/features/admin/api/visitsAdminApi';
import { mapAdminTable } from '@/features/admin/data/adminTableMapper';

function createCloseKey() {
  return `visit-close-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function useAdminVisits({
  canReadTables,
  canReadVisits,
  canManageVisits,
  reloadTables,
}) {
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableLoading, setTableLoading] = useState(false);
  const [tableError, setTableError] = useState('');
  const [visit, setVisit] = useState(null);
  const [visitLoading, setVisitLoading] = useState(false);
  const [visitError, setVisitError] = useState('');
  const [message, setMessage] = useState('');
  const [operationFailed, setOperationFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [listRefreshError, setListRefreshError] = useState(false);
  const mounted = useRef(false);
  const selection = useRef(0);
  const tableRequest = useRef(null);
  const visitRequest = useRef(null);
  const closeKeys = useRef(new Map());
  const operationLock = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      selection.current += 1;
      tableRequest.current?.abort();
      visitRequest.current?.abort();
    };
  }, []);

  const loadVisit = useCallback(
    async (visitId, selectedAtStart = selection.current) => {
      visitRequest.current?.abort();
      const controller = new AbortController();
      visitRequest.current = controller;
      if (!canReadVisits) return;
      setVisitLoading(true);
      setVisitError('');
      try {
        const result = await getAdminVisit(visitId, controller.signal);
        if (
          mounted.current &&
          !controller.signal.aborted &&
          selectedAtStart === selection.current
        ) {
          setVisit(result);
        }
      } catch (error) {
        if (
          mounted.current &&
          !controller.signal.aborted &&
          selectedAtStart === selection.current
        ) {
          setVisitError(getVisitsApiError(error));
        }
      } finally {
        if (
          mounted.current &&
          !controller.signal.aborted &&
          selectedAtStart === selection.current
        ) {
          setVisitLoading(false);
        }
      }
    },
    [canReadVisits],
  );

  const refreshSelectedTable = useCallback(
    async (selectedAtStart = selection.current) => {
      if (!selectedTable || !canReadTables) return;
      tableRequest.current?.abort();
      const controller = new AbortController();
      tableRequest.current = controller;
      setTableLoading(true);
      setTableError('');
      try {
        const result = await getAdminTable(selectedTable.id, controller.signal);
        if (
          !mounted.current ||
          controller.signal.aborted ||
          selectedAtStart !== selection.current
        ) {
          return;
        }
        const mapped = mapAdminTable(result);
        setSelectedTable(mapped);
        if (canReadVisits && mapped.openVisitId) {
          await loadVisit(mapped.openVisitId, selectedAtStart);
        } else {
          setVisit(null);
          setVisitError('');
          setVisitLoading(false);
        }
      } catch (error) {
        if (
          mounted.current &&
          !controller.signal.aborted &&
          selectedAtStart === selection.current
        ) {
          setTableError(getTablesApiError(error));
        }
      } finally {
        if (
          mounted.current &&
          !controller.signal.aborted &&
          selectedAtStart === selection.current
        ) {
          setTableLoading(false);
        }
      }
    },
    [canReadTables, canReadVisits, loadVisit, selectedTable],
  );

  const selectTable = useCallback(
    (table) => {
      if (!canReadTables) return;
      selection.current += 1;
      const selectedAtStart = selection.current;
      tableRequest.current?.abort();
      visitRequest.current?.abort();
      setSelectedTable(table);
      setVisit(null);
      setMessage('');
      setOperationFailed(false);
      setTableError('');
      setVisitError('');
      setListRefreshError(false);
      setTableLoading(true);
      setVisitLoading(false);

      const controller = new AbortController();
      tableRequest.current = controller;
      getAdminTable(table.id, controller.signal)
        .then(async (result) => {
          if (
            !mounted.current ||
            controller.signal.aborted ||
            selectedAtStart !== selection.current
          ) {
            return;
          }
          const mapped = mapAdminTable(result);
          setSelectedTable(mapped);
          if (canReadVisits && mapped.openVisitId) {
            await loadVisit(mapped.openVisitId, selectedAtStart);
          }
        })
        .catch((error) => {
          if (
            mounted.current &&
            !controller.signal.aborted &&
            selectedAtStart === selection.current
          ) {
            setTableError(getTablesApiError(error));
          }
        })
        .finally(() => {
          if (
            mounted.current &&
            !controller.signal.aborted &&
            selectedAtStart === selection.current
          ) {
            setTableLoading(false);
          }
        });
    },
    [canReadTables, canReadVisits, loadVisit],
  );

  const close = useCallback(() => {
    if (operationLock.current) return;
    selection.current += 1;
    tableRequest.current?.abort();
    visitRequest.current?.abort();
    setSelectedTable(null);
    setVisit(null);
    setMessage('');
    setTableError('');
    setVisitError('');
    setTableLoading(false);
    setVisitLoading(false);
    setListRefreshError(false);
  }, []);

  const refreshTableList = useCallback(async () => {
    if (!selectedTable) return;
    const result = await reloadTables(null, { preservePage: true });
    if (mounted.current) setListRefreshError(result === false);
  }, [reloadTables, selectedTable]);

  const openVisit = useCallback(async () => {
    if (!selectedTable || !canManageVisits || operationLock.current) return;
    operationLock.current = true;
    setSaving(true);
    setMessage('');
    setOperationFailed(false);
    setListRefreshError(false);
    try {
      const opened = await openAdminVisit(selectedTable.id);
      if (!mounted.current) return;
      const nextTable = {
        ...selectedTable,
        openVisitId: opened.id,
        visitLabel: 'Con visita',
      };
      setSelectedTable(nextTable);
      setVisit(canReadVisits ? opened : null);
      setMessage('La visita se abrió correctamente.');
      if (canReadVisits) await loadVisit(opened.id);
      const refreshed = await reloadTables(null, { preservePage: true });
      if (mounted.current && refreshed === false) setListRefreshError(true);
    } catch (error) {
      if (!mounted.current) return;
      const operationError = getVisitsApiError(error);
      setMessage(
        `No se confirmó la apertura. ${operationError} Se consultó nuevamente el estado actual de la mesa.`,
      );
      setOperationFailed(true);
      await refreshSelectedTable();
    } finally {
      operationLock.current = false;
      if (mounted.current) setSaving(false);
    }
  }, [
    canManageVisits,
    canReadVisits,
    loadVisit,
    refreshSelectedTable,
    reloadTables,
    selectedTable,
  ]);

  const closeVisit = useCallback(async () => {
    const visitId = selectedTable?.openVisitId;
    if (!visitId || !canManageVisits || operationLock.current) return;
    operationLock.current = true;
    if (!closeKeys.current.has(visitId)) {
      closeKeys.current.set(visitId, createCloseKey());
    }
    const idempotencyKey = closeKeys.current.get(visitId);
    setSaving(true);
    setMessage('');
    setOperationFailed(false);
    setListRefreshError(false);
    try {
      const closed = await closeAdminVisit(visitId, idempotencyKey);
      closeKeys.current.delete(visitId);
      if (!mounted.current) return;
      setSelectedTable((current) =>
        current
          ? { ...current, openVisitId: null, visitLabel: 'Sin visita' }
          : current,
      );
      setVisit((current) =>
        canReadVisits ? (current ? { ...current, ...closed } : closed) : null,
      );
      setMessage('La visita se cerró correctamente.');
      const refreshed = await reloadTables(null, { preservePage: true });
      if (mounted.current && refreshed === false) setListRefreshError(true);
    } catch (error) {
      if (mounted.current) {
        setMessage(getVisitsApiError(error));
        setOperationFailed(true);
      }
    } finally {
      operationLock.current = false;
      if (mounted.current) setSaving(false);
    }
  }, [canManageVisits, canReadVisits, reloadTables, selectedTable]);

  return {
    selectedTable,
    visible: Boolean(selectedTable),
    tableLoading,
    tableError,
    visit,
    visitLoading,
    visitError,
    message,
    operationFailed,
    saving,
    listRefreshError,
    canReadVisits,
    canManageVisits,
    selectTable,
    close,
    openVisit,
    closeVisit,
    retryTable: () => void refreshSelectedTable(),
    retryVisit: () => {
      if (selectedTable?.openVisitId) void loadVisit(selectedTable.openVisitId);
    },
    retryTableList: () => void refreshTableList(),
  };
}
