import apiClient from '@/shared/api/apiClient';

export async function createVisitOrder(visitId, payload, idempotencyKey) {
  const { data } = await apiClient.post(`/visits/${visitId}/orders`, payload, {
    headers: { 'Idempotency-Key': idempotencyKey },
  });

  return data;
}

export async function createDeliveryOrder(requestId, payload, idempotencyKey) {
  const { data } = await apiClient.post(`/me/delivery-requests/${requestId}/orders`, payload, {
    headers: { 'Idempotency-Key': idempotencyKey },
  });
  return data;
}

export async function getMyOrders(signal, params = {}) {
  const { data } = await apiClient.get('/me/orders', {
    params,
    signal,
  });

  return data;
}

export async function getMyOrder(id, signal) {
  const { data } = await apiClient.get(`/me/orders/${id}`, { signal });

  return data;
}

export async function getMySettlement(id, signal) {
  const { data } = await apiClient.get(`/me/settlements/${id}`, { signal });
  return data;
}

export async function submitTransferReceipt(settlementId, file, key) {
  const body = new FormData();
  body.append('file', file);
  const { data } = await apiClient.post(`/me/settlements/${settlementId}/transfer-payments`, body, {
    headers: { 'Idempotency-Key': key, 'Content-Type': undefined },
    transformRequest: [(value) => value],
  });
  return data;
}

export async function getMyOrderHistory(id, signal) {
  const { data } = await apiClient.get(`/me/orders/${id}/history`, { signal });

  return data;
}

export function getOrderError(error) {
  const message = error?.response?.data?.message;

  if (Array.isArray(message)) {
    return message.join(' ');
  }

  return message || error?.message || 'No se pudo completar la solicitud de pedidos.';
}
