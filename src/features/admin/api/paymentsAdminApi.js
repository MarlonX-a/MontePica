import apiClient from '@/shared/api/apiClient';

export async function getAdminPayments(params, signal) {
  const { data } = await apiClient.get('/admin/payments', { params, signal });
  return data;
}

export async function getAdminPayment(id, signal) {
  const { data } = await apiClient.get(`/admin/payments/${id}`, { signal });
  return data;
}

export async function getAdminPaymentReceipt(id) {
  const response = await apiClient.get(`/admin/payments/${id}/receipt`, { responseType: 'blob' });
  return { blob: response.data, mime: response.headers['content-type'] };
}

export async function confirmAdminTransfer(id, bankOperationReference, key) {
  const { data } = await apiClient.post(`/admin/payments/${id}/confirm`, { bankOperationReference }, { headers: { 'Idempotency-Key': key } });
  return data;
}

export async function rejectAdminTransfer(id, reason, key) {
  const { data } = await apiClient.post(`/admin/payments/${id}/reject`, { reason }, { headers: { 'Idempotency-Key': key } });
  return data;
}

export function getAdminPaymentError(error) {
  const message = error?.response?.data?.message;
  if (Array.isArray(message)) return message.join(' ');
  if (message) return message;
  if (error?.response?.status === 401) return 'Tu sesión expiró. Vuelve a iniciar sesión.';
  if (error?.response?.status === 403) return 'Tu cuenta no tiene permiso para consultar o revisar pagos.';
  if (!error?.response) return 'No se pudo conectar con el servidor. Revisa la conexión e inténtalo de nuevo.';
  return 'No se pudo completar la operación. Inténtalo de nuevo.';
}

export const isAdminPaymentResultUncertain = (error) => !error?.response || error.response.status === 408 || error.response.status >= 500;
