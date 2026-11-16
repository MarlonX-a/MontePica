import apiClient from '@/shared/api/apiClient';

export async function getDeliverySettings(signal) {
  const { data } = await apiClient.get('/delivery/settings', { signal });
  return data;
}

export async function getMyDeliveryRequests({ page = 1, limit = 20, signal } = {}) {
  const { data } = await apiClient.get('/me/delivery-requests', { params: { page, limit }, signal });
  return data;
}

export async function getMyDeliveryRequest(id, signal) {
  const { data } = await apiClient.get(`/me/delivery-requests/${id}`, { signal });
  return data;
}

export async function createDeliveryRequest(body, key) {
  const { data } = await apiClient.post('/me/delivery-requests', body, { headers: { 'Idempotency-Key': key } });
  return data;
}

export function getDeliveryApiError(error) {
  const message = error.response?.data?.message;
  if (Array.isArray(message)) return message.join(' ');
  if (typeof message === 'string') return message;
  if (error.response?.status === 401) return 'Tu sesión expiró. Vuelve a iniciar sesión.';
  if (error.response?.status === 403) return 'Esta solicitud solo está disponible para clientes registrados.';
  if (!error.response) return 'No se pudo conectar con el servidor. Revisa la conexión e inténtalo de nuevo.';
  return 'No se pudo completar la solicitud. Inténtalo de nuevo.';
}

export const isDeliveryResultUncertain = (error) => !error.response || error.response.status >= 500;
