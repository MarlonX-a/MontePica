import { useCallback, useEffect, useRef, useState } from 'react';
import * as Crypto from 'expo-crypto';
import {
  cancelAdminSettlement,
  collectCashPayment,
  completeZeroSettlement,
  createAdminSettlement,
  getAdminAccount,
  getAdminSettlement,
  getBillingError,
  isBillingResultUncertain,
  listAdminAccounts,
  listAdminSettlements,
} from '@/features/admin/api/billingAdminApi';

const LIMIT = 20;
const initial = {
  section: 'accounts', accounts: [], settlements: [], page: 1, total: 0,
  status: 'open', loading: false, error: '', notice: '', selected: null,
  detailLoading: false, busy: false, operation: null,
};

export default function useAdminBilling(permissions, section = 'accounts') {
  const [state, setState] = useState(() => ({
    ...initial, section, status: section === 'accounts' ? 'open' : 'pending',
  }));
  const stateRef = useRef(state);
  const mounted = useRef(true);
  const requestRef = useRef(null);
  const busyRef = useRef(false);
  const canReadAccounts = permissions.includes('accounts.read');
  const canReadSettlements = permissions.includes('settlements.read');
  const canManage = permissions.includes('settlements.manage');
  const canCollect = permissions.includes('payments.collect');

  const update = useCallback((patch) => {
    stateRef.current = { ...stateRef.current, ...patch };
    if (mounted.current) setState(stateRef.current);
  }, []);

  const load = useCallback(async (
    section = stateRef.current.section,
    page = 1,
    status = stateRef.current.status,
  ) => {
    requestRef.current?.abort();
    const request = new AbortController();
    requestRef.current = request;
    update({ section, page, status, loading: true, error: '', selected: null, detailLoading: false });
    try {
      if (section === 'accounts') {
        if (!canReadAccounts) throw new Error('Tu cuenta no tiene permiso accounts.read.');
        const result = await listAdminAccounts({ page, limit: LIMIT, status }, request.signal);
        if (!request.signal.aborted) {
          update({ accounts: result.items || [], total: result.total || 0, loading: false });
        }
      } else {
        if (!canReadSettlements) throw new Error('Tu cuenta no tiene permiso settlements.read.');
        const result = await listAdminSettlements({ page, limit: LIMIT, status }, request.signal);
        if (!request.signal.aborted) {
          update({ settlements: result.items || [], total: result.total || 0, loading: false });
        }
      }
    } catch (error) {
      if (!request.signal.aborted) update({ loading: false, error: getBillingError(error) });
    }
  }, [canReadAccounts, canReadSettlements, update]);

  useEffect(() => {
    mounted.current = true;
    if (canReadAccounts || canReadSettlements) void load();
    return () => {
      mounted.current = false;
      requestRef.current?.abort();
    };
  }, [canReadAccounts, canReadSettlements, load]);

  const select = useCallback(async (item) => {
    if (busyRef.current) return;
    requestRef.current?.abort();
    if (!item) {
      update({ selected: null, detailLoading: false, error: '', notice: '' });
      return;
    }
    if (stateRef.current.operation) return;
    const request = new AbortController();
    requestRef.current = request;
    update({ selected: item, detailLoading: true, error: '', notice: '' });
    try {
      let detail;
      if (stateRef.current.section === 'accounts') {
        detail = await getAdminAccount(item.id, request.signal);
      } else {
        detail = await getAdminSettlement(item.id, request.signal);
        if (detail?.accountId && canReadAccounts) {
          const account = await getAdminAccount(detail.accountId, request.signal);
          detail = { ...detail, modality: account.modality, account };
        }
      }
      if (!request.signal.aborted) update({ selected: detail, detailLoading: false });
    } catch (error) {
      if (!request.signal.aborted) update({ detailLoading: false, error: getBillingError(error) });
    }
  }, [canReadAccounts, update]);

  const write = useCallback(async (kind, id, body, retry = false) => {
    if (busyRef.current) return;
    const existing = stateRef.current.operation;
    if (existing && (!retry || existing.kind !== kind || existing.id !== id)) return;
    const operation = existing || { kind, id, body, key: Crypto.randomUUID() };
    busyRef.current = true;
    update({ busy: true, error: '', notice: '', operation });
    try {
      if (kind === 'create') {
        const account = await getAdminAccount(id);
        if (account.status !== 'open' || account.modality !== 'local' || account.pendingSettlement) {
          update({ operation: null, busy: false, error: 'La cuenta cambió y ya no admite preparar una liquidación.' });
          return;
        }
        await createAdminSettlement(id, operation.key);
      } else {
        const settlement = await getAdminSettlement(id);
        if (settlement.status !== 'pending') {
          update({ selected: settlement, operation: null, busy: false, error: 'La liquidación ya cambió. Revisa su estado actual.' });
          return;
        }
        const account = await getAdminAccount(settlement.accountId);
        if (account.modality !== 'local') {
          update({ selected: { ...settlement, modality: account.modality, account }, operation: null, busy: false, error: 'Los cobros de domicilio se completan mediante la revisión de transferencia.' });
          return;
        }
        if (kind === 'cancel') await cancelAdminSettlement(id, operation.body.reason, operation.key);
        if (kind === 'cash') await collectCashPayment(id, operation.body.receivedCents, operation.key);
        if (kind === 'zero') await completeZeroSettlement(id, operation.key);
      }
      update({ operation: null, busy: false, notice: 'Operación confirmada por el servidor.' });
      await load(stateRef.current.section, stateRef.current.page, stateRef.current.status);
    } catch (error) {
      const uncertain = isBillingResultUncertain(error);
      update({
        busy: false,
        error: getBillingError(error),
        operation: uncertain ? operation : null,
        notice: uncertain ? 'El resultado no está confirmado. Consulta el estado antes de repetir.' : '',
      });
    } finally {
      busyRef.current = false;
    }
  }, [load, update]);

  const refreshSelected = useCallback(async () => {
    const operation = stateRef.current.operation;
    if (!operation) {
      const item = stateRef.current.selected;
      if (item) await select(item);
      return;
    }
    requestRef.current?.abort();
    const request = new AbortController();
    requestRef.current = request;
    try {
      if (operation.kind === 'create') {
        const account = await getAdminAccount(operation.id, request.signal);
        if (request.signal.aborted || stateRef.current.operation?.key !== operation.key) return;
        if (account.pendingSettlement) {
          update({ operation: null, notice: 'La cuenta ya tiene una liquidación registrada. Consulta la pestaña Liquidaciones.', error: '' });
          return;
        }
        update({ notice: 'La cuenta no muestra una liquidación nueva. Puedes reintentar la misma operación.', error: '' });
        return;
      }
      const settlement = await getAdminSettlement(operation.id, request.signal);
      if (request.signal.aborted || stateRef.current.operation?.key !== operation.key) return;
      if (settlement.status !== 'pending') {
        update({ selected: settlement, operation: null, notice: 'El estado actual de la liquidación ya refleja un cambio.', error: '' });
      } else {
        update({ selected: settlement, notice: 'La liquidación sigue pendiente. Puedes reintentar la misma operación.', error: '' });
      }
    } catch (error) {
      if (!request.signal.aborted && stateRef.current.operation?.key === operation.key) {
        update({ error: getBillingError(error) });
      }
    }
  }, [select, update]);

  return {
    ...state,
    canReadAccounts,
    canReadSettlements,
    canManage,
    canCollect,
    maxPage: Math.max(1, Math.ceil(state.total / LIMIT)),
    load: () => void load(),
    select,
    setStatus: (status) => void load(stateRef.current.section, 1, status),
    setPage: (page) => void load(stateRef.current.section, page),
    changeSection: (section) => void load(section, 1, section === 'accounts' ? 'open' : 'pending'),
    refreshSelected,
    create: (account) => void write('create', account.id, {}),
    cancel: (reason) => void write('cancel', stateRef.current.selected.id, { reason }),
    collect: (receivedCents) => void write('cash', stateRef.current.selected.id, { receivedCents }),
    completeZero: () => void write('zero', stateRef.current.selected.id, {}),
    retry: () => {
      const operation = stateRef.current.operation;
      if (operation) void write(operation.kind, operation.id, operation.body, true);
    },
  };
}
