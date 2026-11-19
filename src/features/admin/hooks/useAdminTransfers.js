import { useCallback, useEffect, useRef, useState } from 'react';
import * as Crypto from 'expo-crypto';
import { getCurrentUser } from '@/shared/session/sessionStore';
import { confirmAdminTransfer, getAdminPayment, getAdminPaymentError, getAdminPaymentReceipt, getAdminPayments, isAdminPaymentResultUncertain, rejectAdminTransfer } from '@/features/admin/api/paymentsAdminApi';

const PAGE_SIZE = 20;
const userId = () => getCurrentUser()?.id || getCurrentUser()?.userId;
const operations = new Map();
const blobToDataUri = (blob) => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob); });

export default function useAdminTransfers({ canRead, canReview, canReadReceipt }) {
  const [state, setState] = useState({ items: [], total: 0, page: 1, status: 'pendingVerification', loading: true, refreshing: false, error: '', detail: null, detailLoading: false, receiptUrl: '', receiptMime: '', busy: false, uncertain: null, notice: '' });
  const ref = useRef(state); ref.current = state;
  const alive = useRef(false); const listRequest = useRef(null); const detailRequest = useRef(null); const lock = useRef(false);
  const set = (value) => setState((current) => ({ ...current, ...value }));

  const load = useCallback(async (page = ref.current.page, status = ref.current.status, refresh = false) => {
    listRequest.current?.abort(); const controller = new AbortController(); listRequest.current = controller;
    set({ loading: !refresh, refreshing: refresh, error: '' });
    try {
      const result = await getAdminPayments({ method: 'transfer', ...(status === 'all' ? {} : { status }), page, limit: PAGE_SIZE }, controller.signal);
      if (!alive.current || controller.signal.aborted) return false;
      const maxPage = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
      if (page > maxPage) return load(maxPage, status, refresh);
      set({ items: result.items || [], total: result.total || 0, page, status, loading: false, refreshing: false }); return true;
    } catch (error) { if (!controller.signal.aborted && alive.current) set({ error: getAdminPaymentError(error), loading: false, refreshing: false }); return false; }
  }, []);

  useEffect(() => { alive.current = true; if (canRead) void load(1, 'pendingVerification'); return () => { alive.current = false; listRequest.current?.abort(); detailRequest.current?.abort(); }; }, [canRead, load]);

  const close = useCallback(() => { if (lock.current) return; detailRequest.current?.abort(); set({ detail: null, receiptUrl: '', receiptMime: '', error: '', notice: '' }); }, []);
  const select = useCallback(async (item) => {
    if (lock.current) return;
    detailRequest.current?.abort(); const controller = new AbortController(); detailRequest.current = controller;
    set({ detail: item, detailLoading: true, receiptUrl: '', receiptMime: '', error: '', notice: '' });
    try { const detail = await getAdminPayment(item.id, controller.signal); if (alive.current && !controller.signal.aborted) set({ detail, detailLoading: false, uncertain: operations.get(userId())?.id === item.id ? operations.get(userId()) : null }); }
    catch (error) { if (!controller.signal.aborted && alive.current) set({ error: getAdminPaymentError(error), detailLoading: false }); }
  }, []);
  const loadReceipt = useCallback(async () => {
    const detail = ref.current.detail; if (!detail || !canReadReceipt) return;
    set({ detailLoading: true, error: '' });
    try { const { blob, mime } = await getAdminPaymentReceipt(detail.id); if (!alive.current || ref.current.detail?.id !== detail.id) return; const type = mime || blob.type; const uri = type === 'application/pdf' ? '' : await blobToDataUri(blob); if (alive.current && ref.current.detail?.id === detail.id) set({ receiptUrl: uri, receiptMime: type, detailLoading: false }); }
    catch (error) { set({ error: getAdminPaymentError(error), detailLoading: false }); }
  }, [canReadReceipt]);
  const decide = useCallback(async (action, text, retry = false) => {
    const detail = ref.current.detail; const uid = userId(); if (!canReview || !detail || lock.current) return;
    const pending = operations.get(uid);
    if (pending && (pending.id !== detail.id || pending.action !== action) && !retry) { set({ uncertain: pending, error: 'Hay una decisión sin confirmar. Resuélvela antes de revisar otro pago.' }); return; }
    const op = pending || { id: detail.id, action, body: action === 'confirm' ? { bankOperationReference: text.normalize('NFC').trim().toUpperCase() } : { reason: text.trim() }, key: Crypto.randomUUID() };
    if (detail.status !== 'pendingVerification' && !retry) return;
    lock.current = true; operations.set(uid, op); set({ busy: true, error: '', uncertain: null });
    try {
      const current = await getAdminPayment(op.id);
      if (current.status !== 'pendingVerification') { set({ detail: current, busy: false, notice: 'El pago cambió de estado. Se muestran los datos actuales; vuelve a seleccionar una acción si sigue disponible.' }); operations.delete(uid); return; }
      const result = op.action === 'confirm' ? await confirmAdminTransfer(op.id, op.body.bankOperationReference, op.key) : await rejectAdminTransfer(op.id, op.body.reason, op.key);
      operations.delete(uid); set({ detail: { ...current, ...result }, busy: false, notice: result.status === 'confirmed' ? 'Transferencia confirmada y liquidación resuelta.' : 'Transferencia rechazada.' });
      await load(ref.current.page, ref.current.status, true);
      const updated = await getAdminPayment(op.id); if (alive.current) set({ detail: updated });
    } catch (error) { const uncertain = isAdminPaymentResultUncertain(error); if (!uncertain) operations.delete(uid); set({ busy: false, error: getAdminPaymentError(error), uncertain: uncertain ? op : null }); }
    finally { lock.current = false; }
  }, [canReview, load]);
  const reconcile = useCallback(async () => { const op = ref.current.uncertain; if (!op) return; try { const detail = await getAdminPayment(op.id); set({ detail, uncertain: detail.status === 'pendingVerification' ? op : null, notice: detail.status === 'pendingVerification' ? 'Sigue pendiente. Puedes reintentar la misma decisión.' : 'Estado consultado; no se atribuye a la operación incierta.' }); if (detail.status !== 'pendingVerification') operations.delete(userId()); } catch (error) { set({ error: getAdminPaymentError(error) }); } }, []);
  const changeStatus = useCallback((status) => { if (lock.current) return; close(); void load(1, status); }, [close, load]);
  return { ...state, canRead, canReview, canReadReceipt, load, select, close, loadReceipt, decide, reconcile, changeStatus, setPage: (page) => void load(page), maxPage: Math.max(1, Math.ceil(state.total / PAGE_SIZE)) };
}
