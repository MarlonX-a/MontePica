import apiClient from '@/shared/api/apiClient';

export async function createVisitOrder(visitId, payload, idempotencyKey) {
  const { data } = await apiClient.post(`/visits/${visitId}/orders`, payload, {
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

export async function getMyOrderHistory(id, signal) {
  const { data } = await apiClient.get(`/me/orders/${id}/history`, { signal });

  return data;
}

export function getOrderError(error) {
  const message = error?.response?.data?.message;

  if (Array.isArray(message)) {
    return message.join(' ');
  }

  return message || 'No se pudo completar la solicitud de pedidos.';
}
