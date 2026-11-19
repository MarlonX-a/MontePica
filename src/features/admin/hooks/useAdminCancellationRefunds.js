import { useCallback, useEffect, useRef, useState } from 'react';
import {
  decideAdminCancellation,
  executeAdminRefund,
  getAdminCancellation,
  getAdminRefund,
  getCancellationOrder,
  listAdminCancellations,
  listAdminRefunds,
} from '@/features/admin/api/cancellationRefundsApi';
import useConfirmedOperation, {
  operationError,
} from '@/shared/api/useConfirmedOperation';

export const resolutionSections = {
  cancellations: {
    label: 'Cancelaciones',
    read: 'cancellations.read',
    write: 'cancellations.decide',
    list: listAdminCancellations,
    detail: getAdminCancellation,
  },
  refunds: {
    label: 'Reembolsos',
    read: 'refunds.read',
    write: 'refunds.execute',
    list: listAdminRefunds,
    detail: getAdminRefund,
  },
};
export const billingReadPermissions = [
  'accounts.read',
  'settlements.read',
  ...Object.values(resolutionSections).map(({ read }) => read),
];
export const RESOLUTION_PAGE_SIZE = 20;

export function useAdminResolutionList(section) {
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const request = useRef(null);
  const list = resolutionSections[section].list;

  const load = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError('');
    try {
      const result = await list(
        { page, limit: RESOLUTION_PAGE_SIZE, status: status || undefined },
        controller.signal,
      );
      if (controller.signal.aborted) return false;
      const lastPage = Math.max(
        1,
        Math.ceil(result.total / RESOLUTION_PAGE_SIZE),
      );
      if (page > lastPage) setPage(lastPage);
      setResult(result);
      return true;
    } catch (failure) {
      if (!controller.signal.aborted) setError(operationError(failure));
      return false;
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [list, page, status]);

  useEffect(() => {
    void load();
    return () => request.current?.abort();
  }, [load]);

  return {
    page,
    setPage,
    status,
    setStatus(value) {
      setPage(1);
      setStatus(value);
    },
    result,
    loading,
    error,
    load,
  };
}

export function useAdminResolutionDetail({
  section,
  itemId,
  user,
  refreshList,
}) {
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const request = useRef(null);
  const config = resolutionSections[section];
  const canWrite =
    user?.role?.code === 'admin' && user.permissions?.includes(config.write);

  const load = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError('');
    try {
      const result = await config.detail(itemId, controller.signal);
      if (controller.signal.aborted) return false;
      setItem(result);
      return true;
    } catch (failure) {
      if (!controller.signal.aborted) setError(operationError(failure));
      return false;
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [config, itemId]);

  useEffect(() => {
    void load();
    return () => request.current?.abort();
  }, [load]);

  const group = adminResolutionPrefix(user);
  const operation = useConfirmedOperation({
    key: group + section + ':' + itemId,
    group,
    successMessage: (result) =>
      result?.refund?.status === 'pending'
        ? 'Cancelación aprobada. El reembolso quedó pendiente en la sección Reembolsos.'
        : null,
    async inspect(candidate, signal) {
      if (!canWrite)
        throw new Error('Tu cuenta no tiene permiso para esta acción.');
      const current = await config.detail(itemId, signal);
      if (signal.aborted) return false;
      setItem(current);
      let applicable =
        current.status === 'pending' &&
        current.versionId === candidate.versionId &&
        current.orderStatus === candidate.orderStatus &&
        current.amountCents === candidate.amountCents;
      if (
        applicable &&
        section === 'cancellations' &&
        user.permissions.includes('orders.read')
      ) {
        const order = await getCancellationOrder(current.orderId, signal);
        if (signal.aborted) return false;
        applicable =
          order.versionId === current.versionId &&
          order.status === current.orderStatus;
      }
      if (!applicable) await refreshList();
      return applicable;
    },
    send(candidate) {
      const { action, body, idempotencyKey } = candidate;
      if (section === 'refunds')
        return executeAdminRefund(itemId, body, idempotencyKey);
      return decideAdminCancellation(itemId, action, body, idempotencyKey);
    },
    async refresh(result) {
      if (result) setItem(result);
      const outcomes = await Promise.all([load(), refreshList()]);
      if (outcomes.includes(false)) throw new Error('Consulta incompleta');
    },
  });

  return { ...operation, item, loading, loadError: error, canWrite, load };
}

export const adminResolutionPrefix = (user) =>
  'admin-resolution:' + user?.id + ':';
