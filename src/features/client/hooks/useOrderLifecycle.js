import { useCallback, useEffect, useRef, useState } from 'react';
import {
  cancelMyOrder,
  createCancellationRequest,
  editMyOrder,
  getMyCancellationRequest,
  listMyCancellationRequests,
  listMyRefunds,
  withdrawMyCancellationRequest,
} from '@/features/client/api/orderLifecycleApi';
import { getMyOrder, getMyPayments } from '@/features/client/api/ordersApi';
import useConfirmedOperation, {
  operationError,
} from '@/shared/api/useConfirmedOperation';
import { getCurrentUser } from '@/shared/session/sessionStore';

async function allPages(list, params, signal) {
  const items = [];
  const limit = 100;
  for (let page = 1; ; page += 1) {
    const result = await list({ ...params, limit, page }, signal);
    items.push(...result.items);
    if (page * limit >= result.total || !result.items.length) return items;
  }
}

async function loadPayments(order, signal) {
  if (order.modality !== 'delivery' || !order.settlement?.id) return [];
  const settlementId = order.settlement.id;
  const results = await Promise.all(
    ['confirmed', 'pendingVerification'].map((status) =>
      getMyPayments({ limit: 1, settlementId, status }, signal),
    ),
  );
  return results.flatMap((result) => result.items);
}

export function orderCancellationAction(order, payments) {
  if (order.modality === 'local') {
    if (order.status === 'submitted') return 'cancel';
    if (['preparing', 'ready'].includes(order.status)) return 'request';
    return null;
  }
  if (payments.some((payment) => payment.status === 'pendingVerification'))
    return 'paymentPending';
  if (['preparing', 'ready'].includes(order.status)) return 'request';
  if (order.status !== 'submitted') return null;
  return payments.some((payment) => payment.status === 'confirmed')
    ? 'request'
    : 'staff';
}

const writers = {
  edit: (op) => editMyOrder(op.orderId, op.body, op.idempotencyKey),
  cancel: (op) => cancelMyOrder(op.orderId, op.body, op.idempotencyKey),
  request: (op) =>
    createCancellationRequest(op.orderId, op.body, op.idempotencyKey),
  withdraw: (op) =>
    withdrawMyCancellationRequest(op.requestId, op.idempotencyKey),
};

export const clientOrderOperationPrefix = (user) =>
  'client-order:' + user?.id + ':';

export default function useOrderLifecycle(order, onUpdated, refreshOrders) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const request = useRef(null);
  const { id } = order;

  const load = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const { signal } = controller;
    setLoading(true);
    setError('');
    try {
      const fresh = await getMyOrder(id, signal);
      const [requests, refunds, payments] = await Promise.all([
        allPages(listMyCancellationRequests, { orderId: id }, signal),
        allPages(listMyRefunds, { orderId: id }, signal),
        loadPayments(fresh, signal),
      ]);
      if (signal.aborted) return false;
      onUpdated(fresh);
      setData({ requests, refunds, payments });
      return true;
    } catch (failure) {
      if (!signal.aborted) setError(operationError(failure));
      return false;
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [id, onUpdated]);

  useEffect(() => {
    void load();
    return () => request.current?.abort();
  }, [load]);

  async function inspect(operation, signal) {
    const fresh = await getMyOrder(id, signal);
    if (operation.action === 'withdraw') {
      const entry = await getMyCancellationRequest(operation.requestId, signal);
      if (
        entry.status === 'pending' &&
        entry.versionId === fresh.versionId &&
        entry.orderStatus === fresh.status
      )
        return true;
    } else if (
      fresh.version === operation.body.expectedVersion &&
      fresh.status === operation.status
    ) {
      if (
        operation.action === 'edit' &&
        fresh.modality === 'local' &&
        fresh.canEdit
      )
        return true;
      if (operation.action === 'cancel' && fresh.modality === 'local')
        return true;
      if (operation.action === 'request') {
        const [requests, payments] = await Promise.all([
          allPages(listMyCancellationRequests, { orderId: id }, signal),
          loadPayments(fresh, signal),
        ]);
        const existing = requests.some(
          (entry) =>
            entry.status === 'pending' ||
            !operation.requestIds.includes(entry.id),
        );
        if (!existing && orderCancellationAction(fresh, payments) === 'request')
          return true;
      }
    }
    if (!signal.aborted) await load();
    return false;
  }

  const group = clientOrderOperationPrefix(getCurrentUser());
  const operation = useConfirmedOperation({
    key: group + id,
    group,
    inspect,
    send: (candidate) => writers[candidate.action](candidate),
    async refresh(result, candidate) {
      if (candidate?.action === 'edit' || candidate?.action === 'cancel')
        onUpdated(result);
      const results = await Promise.all([load(), refreshOrders()]);
      if (results.includes(false)) throw new Error('Consulta incompleta');
    },
  });

  return { ...operation, data, loading, loadError: error, load };
}
