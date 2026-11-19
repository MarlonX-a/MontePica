import apiClient from '@/shared/api/apiClient';

export async function listAdminAccounts(params, signal) {
  const { data } = await apiClient.get('/admin/accounts', { params, signal });
  return data;
}

export async function getAdminAccount(id, signal) {
  const { data } = await apiClient.get(`/admin/accounts/${id}`, { signal });
  return data;
}

export async function listAdminSettlements(params, signal) {
  const { data } = await apiClient.get('/admin/settlements', { params, signal });
  return data;
}

export async function getAdminSettlement(id, signal) {
  const { data } = await apiClient.get(`/admin/settlements/${id}`, { signal });
  return data;
}

export async function createAdminSettlement(accountId, key) {
  const { data } = await apiClient.post(`/admin/accounts/${accountId}/settlements`, {}, {
    headers: { 'Idempotency-Key': key },
  });
  return data;
}

export async function cancelAdminSettlement(id, reason, key) {
  const { data } = await apiClient.post(`/admin/settlements/${id}/cancel`, { reason }, {
    headers: { 'Idempotency-Key': key },
  });
  return data;
}

export async function collectCashPayment(id, receivedCents, key) {
  const { data } = await apiClient.post(`/admin/settlements/${id}/cash-payments`, { receivedCents }, {
    headers: { 'Idempotency-Key': key },
  });
  return data;
}

export async function completeZeroSettlement(id, key) {
  const { data } = await apiClient.post(`/admin/settlements/${id}/complete-without-payment`, {}, {
    headers: { 'Idempotency-Key': key },
  });
  return data;
}

export function getBillingError(error) {
  const message = error?.response?.data?.message;
  if (Array.isArray(message)) return message.join(' ');
  if (message) return message;
  if (error?.response?.status === 401) return 'Tu sesión expiró. Vuelve a iniciar sesión.';
  if (error?.response?.status === 403) return 'Tu cuenta no tiene permiso para esta operación.';
  if (!error?.response) return 'No se pudo conectar con el servidor. Revisa la conexión.';
  return 'No se pudo completar la operación.';
}

export const isBillingResultUncertain = (error) =>
  !error?.response || error.response.status === 408 || error.response.status >= 500;
