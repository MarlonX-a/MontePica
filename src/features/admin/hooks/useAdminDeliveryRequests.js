import { useCallback, useEffect, useRef, useState } from 'react';
import * as Crypto from 'expo-crypto';
import { getCurrentUser } from '@/shared/session/sessionStore';
import { approveAdminDelivery, getAdminDeliveryError, getAdminDeliveryRequest, getAdminDeliveryRequests, isAdminDeliveryResultUncertain, rejectAdminDelivery } from '@/features/admin/api/deliveryAdminApi';
import { acquireAdminDeliveryWrite, clearPendingAdminDelivery, getPendingAdminDelivery, getPendingAdminDeliverySettings, isAdminDeliveryWriteActive, releaseAdminDeliveryWrite, setPendingAdminDelivery } from '@/features/admin/data/adminDeliveryOperationStore';

const userId = () => getCurrentUser()?.id || getCurrentUser()?.userId;

export default function useAdminDeliveryRequests(canRead, canReview) {
  const [state, setState] = useState({ items: [], total: 0, page: 1, status: 'pending', loading: true, refreshing: false, error: '', notice: '', detail: null, detailLoading: false, busy: false, uncertain: null });
  const stateRef = useRef(state); stateRef.current = state;
  const request = useRef(null); const detailRequest = useRef(null); const lock = useRef(false); const alive = useRef(false);
  const set = (changes) => setState((current) => ({ ...current, ...changes }));

  const load = useCallback(async (page = 1, status = stateRef.current.status, refresh = false) => {
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    set({ loading: !refresh, refreshing: refresh, error: '' });
    try {
      const result = await getAdminDeliveryRequests({ page, limit: 20, ...(status === 'all' ? {} : { status }) }, controller.signal);
      if (!alive.current || controller.signal.aborted) return;
      set({ items: result.items || [], total: result.total || 0, page, status, loading: false, refreshing: false });
      return true;
    } catch (error) {
      if (!controller.signal.aborted && alive.current) set({ error: getAdminDeliveryError(error), loading: false, refreshing: false });
      return false;
    }
  }, []);

  useEffect(() => { alive.current = true; if (canRead) void load(); return () => { alive.current = false; request.current?.abort(); detailRequest.current?.abort(); }; }, [canRead, load]);

  const select = useCallback(async (item) => {
    if (isAdminDeliveryWriteActive(userId())) return;
    detailRequest.current?.abort(); const controller = new AbortController(); detailRequest.current = controller;
    set({ detailLoading: true, detail: item, notice: '' });
    try { const fresh = await getAdminDeliveryRequest(item.id, controller.signal); if (alive.current && !controller.signal.aborted) set({ detail: fresh, detailLoading: false }); }
    catch (error) { if (!controller.signal.aborted && alive.current) set({ error: getAdminDeliveryError(error), detailLoading: false }); }
  }, []);

  const decide = useCallback(async (action, reason = '', retry = false) => {
    const detail = stateRef.current.detail; const id = userId();
    if (!canReview || !detail || detail.status !== 'pending' || lock.current || isAdminDeliveryWriteActive(userId())) return;
    if (getPendingAdminDeliverySettings(userId())) { set({ error: 'Hay un cambio de configuración sin confirmar. Resuélvelo antes de revisar solicitudes.' }); return; }
    let op = id && getPendingAdminDelivery(id);
    if (op && (op.id !== detail.id || op.action !== action) && !retry) { set({ uncertain: op, error: 'Hay una decisión sin confirmar. Consulta su estado o reintenta esa misma decisión.' }); return; }
    if (!op) op = { id: detail.id, action, reason: reason.trim(), key: Crypto.randomUUID() };
    if (!acquireAdminDeliveryWrite(id)) { set({ error: 'Hay otra operación de domicilios en curso. Espera a que termine.' }); return; }
    if (id) setPendingAdminDelivery(id, op);
    lock.current = true; set({ busy: true, error: '' });
    try {
      const result = action === 'approve' ? await approveAdminDelivery(op.id, op.key) : await rejectAdminDelivery(op.id, op.reason, op.key);
      if (id) clearPendingAdminDelivery(id);
      set({ detail: result, busy: false, uncertain: null, notice: action === 'approve' ? 'Cobertura aprobada. Esto no crea un pedido.' : 'Solicitud rechazada.' });
      await load(stateRef.current.page, stateRef.current.status, true);
    } catch (error) {
      if (!isAdminDeliveryResultUncertain(error) && id) clearPendingAdminDelivery(id);
      const uncertain = isAdminDeliveryResultUncertain(error) ? op : null;
      set({ busy: false, error: getAdminDeliveryError(error), uncertain });
    } finally { lock.current = false; releaseAdminDeliveryWrite(id); }
  }, [canReview, load]);

  const reconcile = useCallback(async () => {
    const op = stateRef.current.uncertain; if (!op) return;
    try {
      const detail = await getAdminDeliveryRequest(op.id);
      if (detail.status !== 'pending') { const id = userId(); if (id) clearPendingAdminDelivery(id); set({ detail, uncertain: null, notice: 'Estado actual consultado; no se atribuye a la decisión sin confirmar.' }); await load(stateRef.current.page, stateRef.current.status, true); }
      else set({ detail, notice: 'La solicitud sigue pendiente. Puedes reintentar la misma decisión.' });
    } catch (error) { set({ error: getAdminDeliveryError(error) }); }
  }, [load]);

  const closeDetail = () => { if (lock.current || isAdminDeliveryWriteActive(userId())) return; detailRequest.current?.abort(); set({ detail: null, error: '', notice: '' }); };
  const changeStatus = (status) => { detailRequest.current?.abort(); set({ detail: null }); void load(1, status); };
  return { ...state, load, select, decide, reconcile, closeDetail, changeStatus, canRead, canReview, setPage: (page) => void load(page, stateRef.current.status), maxPage: Math.max(1, Math.ceil(state.total / 20)) };
}
