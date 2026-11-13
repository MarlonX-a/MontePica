import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getWaiterOrder,
  getWaiterOrders,
  getWaiterOrdersApiError,
  getWaiterProduct,
  getWaiterTables,
  isWaiterOrderResultUncertain,
  transitionWaiterOrder,
} from '@/features/waiter/api/waiterOrdersApi';
import { mapWaiterOrder } from '@/features/waiter/data/waiterOrderMapper';

const PAGE_SIZE = 20;
function makeIdempotencyKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

function isAbort(error) {
  return error.name === 'AbortError' || error.name === 'CanceledError' || error.code === 'ERR_CANCELED';
}

export default function useWaiterOrders({ canReadOrders, canManageOrders, canReadTables }) {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ submitted: null, preparing: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshError, setRefreshError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [tableCodes, setTableCodes] = useState(new Map());
  const [productNames, setProductNames] = useState(new Map());
  const [confirmation, setConfirmation] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [pendingOperation, setPendingOperation] = useState(null);
  const [reconciling, setReconciling] = useState(false);
  const listController = useRef(null);
  const detailController = useRef(null);
  const tableController = useRef(null);
  const listRequest = useRef(0);
  const detailRequest = useRef(0);
  const mounted = useRef(true);
  const productCache = useRef(new Map());
  const pendingRef = useRef(null);
  const busyRef = useRef(false);

  const enrichProductNames = useCallback(async (ordersToResolve, signal) => {
    const ids = [...new Set(ordersToResolve.flatMap((order) => (order.items || []).map((item) => item.productId)))];
    const missing = ids.filter((id) => !productCache.current.has(id));
    await Promise.allSettled(missing.map(async (id) => {
      const product = await getWaiterProduct(id, signal);
      if (product?.name) productCache.current.set(id, product.name);
    }));
    if (mounted.current && !signal?.aborted) setProductNames(new Map(productCache.current));
  }, []);

  const loadList = useCallback(async ({ quiet = false } = {}) => {
    listController.current?.abort();
    const controller = new AbortController();
    listController.current = controller;
    const requestId = ++listRequest.current;
    if (!quiet) setLoading(true);
    setError('');
    setRefreshError('');
    if (!canReadOrders) {
      setOrders([]);
      setTotal(0);
      setError('Tu cuenta no tiene el permiso orders.read para consultar esta bandeja.');
      setLoading(false);
      return false;
    }

    try {
      const [response, submittedResponse, preparingResponse] = await Promise.all([
        getWaiterOrders({ status, page, limit: PAGE_SIZE, signal: controller.signal }),
        getWaiterOrders({ status: 'submitted', page: 1, limit: 1, signal: controller.signal }),
        getWaiterOrders({ status: 'preparing', page: 1, limit: 1, signal: controller.signal }),
      ]);
      if (controller.signal.aborted || requestId !== listRequest.current) return false;
      const pageCount = Math.max(1, Math.ceil(response.total / PAGE_SIZE));
      if (page > pageCount) {
        setPage(pageCount);
        return true;
      }
      setOrders(response.items || []);
      setTotal(response.total || 0);
      setCounts({ submitted: submittedResponse.total, preparing: preparingResponse.total });
      await enrichProductNames(response.items || [], controller.signal);
      return true;
    } catch (requestError) {
      if (isAbort(requestError) || requestId !== listRequest.current) return false;
      if (quiet) setRefreshError(getWaiterOrdersApiError(requestError));
      else setError(getWaiterOrdersApiError(requestError));
      return false;
    } finally {
      if (requestId === listRequest.current) setLoading(false);
    }
  }, [canReadOrders, status, page, enrichProductNames]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      detailController.current?.abort();
      tableController.current?.abort();
    };
  }, []);

  useEffect(() => {
    loadList();
    return () => listController.current?.abort();
  }, [loadList]);

  useEffect(() => {
    if (!canReadTables) {
      setTableCodes(new Map());
      return undefined;
    }
    tableController.current?.abort();
    const controller = new AbortController();
    tableController.current = controller;
    let active = true;
    (async () => {
      try {
        const tables = new Map();
        let currentPage = 1;
        let totalTables = 0;
        do {
          const response = await getWaiterTables(currentPage, controller.signal);
          totalTables = response.total;
          response.items?.forEach((table) => {
            if (table.openVisitId) tables.set(table.openVisitId, table.code);
          });
          if (!response.items?.length && currentPage * 100 < totalTables) break;
          currentPage += 1;
        } while ((currentPage - 1) * 100 < totalTables);
        if (active && !controller.signal.aborted) setTableCodes(tables);
      } catch {
        if (active && !controller.signal.aborted) setTableCodes(new Map());
      }
    })();
    return () => {
      active = false;
      controller.abort();
    };
  }, [canReadTables]);

  const loadDetail = useCallback(async (id = selectedId) => {
    if (!id) return null;
    detailController.current?.abort();
    const controller = new AbortController();
    detailController.current = controller;
    const requestId = ++detailRequest.current;
    setDetailLoading(true);
    setDetailError('');
    try {
      const response = await getWaiterOrder(id, controller.signal);
      if (controller.signal.aborted || requestId !== detailRequest.current) return null;
      setDetail(response);
      await enrichProductNames([response], controller.signal);
      return response;
    } catch (requestError) {
      if (!isAbort(requestError) && requestId === detailRequest.current) {
        setDetailError(getWaiterOrdersApiError(requestError));
      }
      return null;
    } finally {
      if (requestId === detailRequest.current) setDetailLoading(false);
    }
  }, [selectedId, enrichProductNames]);

  const selectOrder = useCallback((id) => {
    if (busyRef.current || pendingRef.current) return;
    setNotice('');
    setConfirmation(null);
    setDetail(null);
    setDetailError('');
    setDetailLoading(true);
    setSelectedId(id);
  }, []);

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
    else {
      detailController.current?.abort();
      setDetail(null);
    }
  }, [selectedId, loadDetail]);

  const currentById = useMemo(() => new Map(orders.map((order) => [order.id, order])), [orders]);

  const beginAction = useCallback(async (action) => {
    if (!selectedId || !canManageOrders || busyRef.current || pendingRef.current || detailLoading) return;
    setNotice('');
    const listedOrder = currentById.get(selectedId);
    const fresh = await loadDetail(selectedId);
    if (!fresh || !listedOrder) return;
    if (fresh.status !== listedOrder.status || fresh.version !== listedOrder.version) {
      setNotice('El pedido cambió desde la lista. Revisa su estado actual y vuelve a elegir la acción.');
      return;
    }
    const expectedActionStatus = {
      'start-preparation': 'submitted',
      cancel: 'submitted',
      ready: 'preparing',
      deliver: 'ready',
    }[action];
    if (fresh.status !== expectedActionStatus) {
      setNotice('Esta acción ya no corresponde al estado actual del pedido.');
      return;
    }
    setConfirmation({ action, version: fresh.version, status: fresh.status });
  }, [selectedId, canManageOrders, detailLoading, currentById, loadDetail]);

  const runOperation = useCallback(async (operation) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setNotice('');
    try {
      const updated = await transitionWaiterOrder(
        operation.orderId,
        operation.action,
        operation.body,
        operation.key,
      );
      if (!mounted.current) return;
      pendingRef.current = null;
      setPendingOperation(null);
      setConfirmation(null);
      setDetail(updated);
      setNotice('El cambio se guardó. Actualizando la bandeja…');
      const [detailResult, listLoaded] = await Promise.allSettled([
        loadDetail(operation.orderId),
        loadList({ quiet: true }),
      ]);
      if (detailResult.status === 'fulfilled' && detailResult.value && mounted.current && selectedId === operation.orderId) {
        setDetail(detailResult.value);
      }
      if (mounted.current) {
        const detailFailed = detailResult.status === 'rejected' || !detailResult.value;
        if (detailResult.status === 'rejected') {
          setDetailError(getWaiterOrdersApiError(detailResult.reason));
        }
        setNotice(listLoaded && !detailFailed
          ? 'Estado del pedido actualizado.'
          : 'El cambio ya se guardó, pero no se pudo actualizar toda la información. Reintenta la consulta.');
      }
    } catch (requestError) {
      if (!mounted.current) return;
      if (isWaiterOrderResultUncertain(requestError)) {
        pendingRef.current = operation;
        setPendingOperation(operation);
        setNotice(`No se confirmó el resultado. ${getWaiterOrdersApiError(requestError)} Puedes consultar el estado o reintentar la misma operación.`);
      } else {
        setNotice(getWaiterOrdersApiError(requestError));
      }
    } finally {
      busyRef.current = false;
      if (mounted.current) setBusy(false);
    }
  }, [loadDetail, loadList, selectedId]);

  const confirmAction = useCallback((reason = '') => {
    if (!confirmation || !detail || !canManageOrders || busyRef.current || pendingRef.current) return;
    if (detail.version !== confirmation.version || detail.status !== confirmation.status) {
      setConfirmation(null);
      setNotice('El pedido cambió. Se actualizó el detalle; elige otra vez la acción que corresponda.');
      loadDetail(selectedId);
      return;
    }
    const normalizedReason = reason.trim();
    if (confirmation.action === 'cancel' && (normalizedReason.length < 1 || normalizedReason.length > 500)) {
      setNotice('El motivo debe tener entre 1 y 500 caracteres.');
      return;
    }
    const operation = {
      orderId: detail.id,
      action: confirmation.action,
      body: {
        expectedVersion: detail.version,
        ...(confirmation.action === 'cancel' ? { reason: normalizedReason } : {}),
      },
      key: makeIdempotencyKey(),
      initialStatus: detail.status,
      initialVersion: detail.version,
    };
    setConfirmation(null);
    runOperation(operation);
  }, [confirmation, detail, canManageOrders, loadDetail, selectedId, runOperation]);

  const reconcilePending = useCallback(async () => {
    const operation = pendingRef.current;
    if (!operation || reconciling) return;
    setReconciling(true);
    setNotice('');
    try {
      const current = await loadDetail(operation.orderId);
      if (!mounted.current) return;
      if (!current) {
        setNotice('No se pudo consultar el pedido. Reintenta la consulta antes de decidir.');
        return;
      }
      if (selectedId === operation.orderId) setDetail(current);
      if (current.status === operation.initialStatus && current.version === operation.initialVersion) {
        setNotice('El pedido conserva el estado y la versión originales. Puedes reintentar la misma operación.');
      } else {
        pendingRef.current = null;
        setPendingOperation(null);
        setNotice('El pedido cambió. Se muestran los datos actuales; no se atribuye el cambio a la operación no confirmada.');
      }
    } catch (requestError) {
      if (mounted.current) setNotice(getWaiterOrdersApiError(requestError));
    } finally {
      if (mounted.current) setReconciling(false);
    }
  }, [reconciling, selectedId, loadDetail]);

  const retryPending = useCallback(() => {
    if (pendingRef.current) runOperation(pendingRef.current);
  }, [runOperation]);

  const selectFilter = useCallback((nextStatus) => {
    if (busyRef.current || pendingRef.current) return;
    setStatus(nextStatus);
    setPage(1);
  }, []);

  const mappedOrders = useMemo(() => orders.map((order) => mapWaiterOrder(order, productNames, tableCodes)), [orders, productNames, tableCodes]);
  const mappedDetail = useMemo(() => detail ? mapWaiterOrder(detail, productNames, tableCodes) : null, [detail, productNames, tableCodes]);

  return {
    status,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    orders: mappedOrders,
    total,
    counts,
    loading,
    error,
    refreshError,
    selectedId,
    detail: mappedDetail,
    detailLoading,
    detailError,
    confirmation,
    busy,
    notice,
    pendingOperation,
    reconciling,
    selectOrder,
    closeOrder: () => {
      if (busyRef.current || pendingRef.current) return;
      setSelectedId(null);
      setConfirmation(null);
      setNotice('');
    },
    cancelConfirmation: () => {
      if (!busyRef.current) setConfirmation(null);
    },
    selectFilter,
    setPage: (nextPage) => {
      if (!busyRef.current && !pendingRef.current) setPage(nextPage);
    },
    refresh: () => loadList({ quiet: Boolean(orders.length) }),
    refreshDetail: () => loadDetail(selectedId),
    beginAction,
    confirmAction,
    retryPending,
    reconcilePending,
  };
}
