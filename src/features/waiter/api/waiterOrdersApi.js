import apiClient from '@/shared/api/apiClient';

export async function getWaiterOrders({ status, page = 1, limit = 20, signal }) {
  const { data } = await apiClient.get('/admin/orders', {
    params: { modality: 'local', status: status || undefined, page, limit },
    signal,
  });
  return data;
}

export async function getWaiterOrder(id, signal) {
  const { data } = await apiClient.get(`/admin/orders/${id}`, { signal });
  return data;
}

export async function getWaiterProduct(id, signal) {
  const { data } = await apiClient.get(`/products/${id}`, { signal });
  return data;
}

export async function getWaiterTables(signal, page = 1) {
  const { data } = await apiClient.get('/admin/tables', {
    params: { page, limit: 100 },
    signal,
  });
  return data;
}

export async function transitionWaiterOrder(id, action, body, idempotencyKey) {
  const { data } = await apiClient.post(
    `/admin/orders/${id}/${action}`,
    body,
    { headers: { 'Idempotency-Key': idempotencyKey } },
  );
  return data;
}

export function getWaiterOrdersApiError(error) {
  const message = error.response?.data?.message;
  if (Array.isArray(message)) return message.join(' ');
  if (typeof message === 'string') return message;
  if (error.response?.status === 401) {
    return 'Tu sesión expiró. Vuelve a iniciar sesión.';
  }
  if (error.response?.status === 403) {
    return 'Tu cuenta no tiene permiso para consultar o gestionar pedidos.';
  }
  if (!error.response) {
    return 'No se pudo conectar con el servidor. Revisa la conexión e inténtalo de nuevo.';
  }
  return 'No se pudo completar la operación. Inténtalo de nuevo.';
}

export function isWaiterOrderResultUncertain(error) {
  return !error.response || error.response.status >= 500;
}
