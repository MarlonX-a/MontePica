import apiClient from '@/shared/api/apiClient';

export async function getAdminDeliverySettings(signal) {
  const { data } = await apiClient.get('/admin/delivery/settings', { signal });
  return data;
}

export async function updateAdminDeliverySettings(body, key) {
  const { data } = await apiClient.put('/admin/delivery/settings', body, { headers: { 'Idempotency-Key': key } });
  return data;
}

export async function getAdminDeliveryRequests(params, signal) {
  const { data } = await apiClient.get('/admin/delivery-requests', { params, signal });
  return data;
}

export async function getAdminDeliveryRequest(id, signal) {
  const { data } = await apiClient.get(`/admin/delivery-requests/${id}`, { signal });
  return data;
}

export async function approveAdminDelivery(id, key) {
  const { data } = await apiClient.post(`/admin/delivery-requests/${id}/approve`, {}, { headers: { 'Idempotency-Key': key } });
  return data;
}

export async function rejectAdminDelivery(id, reason, key) {
  const { data } = await apiClient.post(`/admin/delivery-requests/${id}/reject`, { reason }, { headers: { 'Idempotency-Key': key } });
  return data;
}

export function getAdminDeliveryError(error) {
  const message = error.response?.data?.message;
  if (Array.isArray(message)) return message.join(' ');
  if (typeof message === 'string') return message;
  if (error.response?.status === 401) return 'Tu sesión expiró. Vuelve a iniciar sesión.';
  if (error.response?.status === 403) return 'Tu cuenta no tiene permiso para realizar esta operación de domicilio.';
  if (!error.response) return 'No se pudo conectar con el servidor. Revisa la conexión e inténtalo de nuevo.';
  return 'No se pudo completar la operación. Inténtalo de nuevo.';
}

export const isAdminDeliveryResultUncertain = (error) => !error.response || error.response.status >= 500;
