import { useCallback, useEffect, useRef, useState } from 'react';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { getCurrentUser } from '@/shared/session/sessionStore';
import { getMyOrder, getMySettlement, getOrderError, submitTransferReceipt } from '@/features/client/api/ordersApi';
import { clearPendingReceipt, getPendingReceipt, setPendingReceipt } from '@/features/client/data/receiptUploadStore';

const clientId = () => { const user = getCurrentUser(); return user?.clientId || user?.id || user?.userId; };

export default function useDeliveryReceipt(order, onUpdated) {
  const owner = clientId();
  const [state, setState] = useState({ settlement: null, loading: true, error: '', notice: '', asset: null, sending: false, uncertain: Boolean(owner && order?.id && getPendingReceipt(owner, order.id)), blocked: false, payment: null });
  const alive = useRef(false);
  const request = useRef(null);
  const locked = useRef(false);

  const refresh = useCallback(async () => {
    if (!order?.settlement?.id) { setState((current) => ({ ...current, loading: false, error: 'El pedido no contiene una liquidación consultable.' })); return null; }
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const settlement = await getMySettlement(order.settlement.id, controller.signal);
      const freshOrder = await getMyOrder(order.id, controller.signal);
      if (!controller.signal.aborted && alive.current) { setState((current) => ({ ...current, settlement, blocked: settlement.status !== 'pending' ? false : current.blocked, loading: false })); onUpdated?.(freshOrder); }
      return settlement;
    } catch (error) {
      if (!controller.signal.aborted && alive.current) setState((current) => ({ ...current, error: getOrderError(error), loading: false }));
      return null;
    }
  }, [onUpdated, order?.id, order?.settlement?.id]);

  useEffect(() => { alive.current = true; void refresh(); return () => { alive.current = false; request.current?.abort(); }; }, [refresh]);

  const select = useCallback((asset) => {
    if (!locked.current && !state.uncertain && !state.blocked) setState((current) => ({ ...current, asset, error: '', notice: '' }));
  }, [state.blocked, state.uncertain]);

  const send = useCallback(async (retry = false) => {
    if (locked.current || !owner || !order?.id || !order.settlement?.id) return;
    let operation = getPendingReceipt(owner, order.id);
    if (operation && !retry) { setState((current) => ({ ...current, uncertain: true, error: 'Hay un envío sin confirmar. Reintenta el mismo comprobante.' })); return; }
    if (!operation) {
      if (!state.asset) { setState((current) => ({ ...current, error: 'Selecciona una imagen JPEG o PNG.' })); return; }
      operation = { asset: state.asset, key: Crypto.randomUUID(), settlementId: order.settlement.id, clientId: owner };
    }
    locked.current = true; setState((current) => ({ ...current, sending: true, error: '' }));
    let requestStarted = false;
    try {
      const freshOrder = await getMyOrder(order.id);
      const latest = await getMySettlement(operation.settlementId);
      if (freshOrder.status === 'cancelled' || latest.status !== 'pending' || latest.totalCents <= 0) throw Object.assign(new Error('El pedido o su liquidación ya no admite comprobantes.'), { response: { status: 409 } });
      const deadline = freshOrder.delivery?.receiptSubmissionDeadline;
      const expired = deadline && new Date(deadline).getTime() <= Date.now();
      if (expired) throw Object.assign(new Error('Venció el plazo para presentar el comprobante.'), { response: { status: 409 } });
      const asset = operation.asset;
      const file = Platform.OS === 'web'
        ? asset.file || await (await fetch(asset.uri)).blob()
        : { uri: asset.uri, name: asset.fileName || `comprobante.${asset.mimeType === 'image/png' ? 'png' : 'jpg'}`, type: asset.mimeType };
      setPendingReceipt(owner, order.id, operation);
      requestStarted = true;
      const payment = await submitTransferReceipt(operation.settlementId, file, operation.key);
      clearPendingReceipt(owner, order.id);
      if (alive.current) {
        setState((current) => ({ ...current, payment, asset: null, uncertain: false, sending: false, notice: `Comprobante recibido. Estado: ${payment.status}. Importe: ${(payment.amountCents / 100).toLocaleString('es-EC', { style: 'currency', currency: 'USD' })}.` }));
      }
      await refresh();
    } catch (error) {
      const uncertain = !error.response || error.response.status === 408 || error.response.status >= 500;
      if (requestStarted && uncertain) {
        setPendingReceipt(owner, order.id, operation);
      } else if (requestStarted) {
        clearPendingReceipt(owner, order.id);
      }
      const duplicatePending = error.response?.status === 409 && /transferencia pendiente/i.test(getOrderError(error));
      if (alive.current) setState((current) => ({ ...current, sending: false, uncertain: requestStarted && uncertain ? true : Boolean(getPendingReceipt(owner, order.id)), blocked: duplicatePending, error: getOrderError(error) }));
    } finally { locked.current = false; if (alive.current) setState((current) => ({ ...current, sending: false })); }
  }, [order?.delivery?.receiptSubmissionDeadline, order?.id, order?.settlement?.id, owner, refresh, state.asset]);

  return { ...state, refresh, select, send: () => void send(false), retry: () => void send(true), canUpload: state.settlement?.status === 'pending' && !state.uncertain && !state.blocked && !state.loading };
}
