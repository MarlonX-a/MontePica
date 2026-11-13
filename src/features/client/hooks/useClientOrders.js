import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createVisitOrder,
  getMyOrders,
  getOrderError,
} from '@/features/client/api/ordersApi';
import { mapCartToVisitOrder } from '@/features/client/data/orderMapper';
import {
  beginOrderSubmission,
  completeOrderSubmission,
  createPendingOrderSubmission,
  getPendingOrderSubmission,
  markOrderSubmissionUncertain,
  releaseOrderSubmission,
} from '@/features/client/data/orderStore';

const PAGE_LIMIT = 20;

export default function useClientOrders() {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [loadErrorStatus, setLoadErrorStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitErrorStatus, setSubmitErrorStatus] = useState(null);
  const [notice, setNotice] = useState('');

  const mounted = useRef(false);
  const listController = useRef(null);
  const requestId = useRef(0);
  const writeLock = useRef(false);
  const ordersRef = useRef([]);
  const pageRef = useRef(1);
  const totalRef = useRef(0);

  const loadOrders = useCallback(async (requestedPage = 1, append = false) => {
    if (!mounted.current) return false;

    listController.current?.abort();
    const controller = new AbortController();
    listController.current = controller;
    const currentRequestId = ++requestId.current;

    if (append) {
      setLoadingMore(true);
      setRefreshing(false);
    } else if (ordersRef.current.length) {
      setLoadingMore(false);
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setLoadError('');
    setLoadErrorStatus(null);

    try {
      const result = await getMyOrders(controller.signal, {
        page: requestedPage,
        limit: PAGE_LIMIT,
        modality: 'local',
      });
      if (
        !mounted.current ||
        controller.signal.aborted ||
        requestId.current !== currentRequestId
      )
        return false;

      const nextOrders = append
        ? [
            ...ordersRef.current,
            ...result.items.filter(
              (item) =>
                !ordersRef.current.some((order) => order.id === item.id),
            ),
          ]
        : result.items;
      ordersRef.current = nextOrders;
      pageRef.current = result.page;
      totalRef.current = result.total;
      setOrders(nextOrders);
      setTotal(result.total);
      return true;
    } catch (error) {
      if (
        !mounted.current ||
        controller.signal.aborted ||
        requestId.current !== currentRequestId
      )
        return false;

      setLoadError(getOrderError(error));
      setLoadErrorStatus(error.response?.status ?? null);
      return false;
    } finally {
      if (
        mounted.current &&
        requestId.current === currentRequestId &&
        !controller.signal.aborted
      ) {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
        listController.current = null;
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void loadOrders();

    return () => {
      mounted.current = false;
      listController.current?.abort();
      listController.current = null;
    };
  }, [loadOrders]);

  const refresh = useCallback(() => loadOrders(1, false), [loadOrders]);

  const loadMore = useCallback(() => {
    if (
      loadingMore ||
      loading ||
      refreshing ||
      ordersRef.current.length >= totalRef.current
    )
      return Promise.resolve(false);

    return loadOrders(pageRef.current + 1, true);
  }, [loadOrders, loading, loadingMore, refreshing]);

  const sendSubmission = useCallback(
    async (pending) => {
      if (!pending || writeLock.current) return false;

      const submission = beginOrderSubmission(pending.key);
      if (!submission) return false;

      writeLock.current = true;
      setSubmitting(true);
      setSubmitError('');
      setSubmitErrorStatus(null);
      setNotice('');

      try {
        const order = await createVisitOrder(
          submission.visitId,
          submission.payload,
          submission.key,
        );
        completeOrderSubmission(submission.key);

        if (!mounted.current) return true;

        const alreadyListed = ordersRef.current.some(
          (item) => item.id === order.id,
        );
        const updatedOrders = [
          order,
          ...ordersRef.current.filter((item) => item.id !== order.id),
        ];
        ordersRef.current = updatedOrders;
        if (!alreadyListed) totalRef.current += 1;
        setOrders(updatedOrders);
        setTotal(totalRef.current);
        setNotice('El pedido fue confirmado por el servidor.');

        const refreshed = await loadOrders(1, false);
        if (!refreshed && mounted.current) {
          setNotice(
            'El pedido sí se creó, pero no se pudo actualizar la lista. Puedes reintentar la consulta.',
          );
        }
        return true;
      } catch (error) {
        const status = error.response?.status ?? null;
        const uncertain = !status || status === 408 || status >= 500;

        if (uncertain) {
          markOrderSubmissionUncertain(submission.key);
        } else {
          releaseOrderSubmission(submission.key);
        }

        if (mounted.current) {
          setSubmitError(getOrderError(error));
          setSubmitErrorStatus(status);
        }
        return false;
      } finally {
        writeLock.current = false;
        if (mounted.current) setSubmitting(false);
      }
    },
    [loadOrders],
  );

  const submitVisitOrder = useCallback(
    async (cartItems) => {
      if (writeLock.current || getPendingOrderSubmission()) return false;

      const result = mapCartToVisitOrder(cartItems);
      if (result.error) {
        setSubmitError(result.error);
        setSubmitErrorStatus(null);
        return false;
      }

      const pending = createPendingOrderSubmission(
        result.visitId,
        result.payload,
      );
      if (!pending) return false;

      return sendSubmission(pending);
    },
    [sendSubmission],
  );

  const retrySubmission = useCallback(() => {
    const pending = getPendingOrderSubmission();
    if (pending?.status !== 'uncertain')
      return Promise.resolve(false);

    return sendSubmission(pending);
  }, [sendSubmission]);

  return {
    orders,
    total,
    loading,
    refreshing,
    loadingMore,
    loadError,
    loadErrorStatus,
    submitting,
    submitError,
    submitErrorStatus,
    notice,
    hasMore: orders.length < total,
    refresh,
    loadMore,
    submitVisitOrder,
    retrySubmission,
  };
}
