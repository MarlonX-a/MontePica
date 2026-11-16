import apiClient from '@/shared/api/apiClient';

export async function getDashboardOperatingState(signal) {
  const { data } = await apiClient.get('/admin/operations/current', { signal });
  return data;
}

export async function getDashboardCashSummary(cashId, signal) {
  const { data } = await apiClient.get(`/admin/operations/cash/${cashId}/summary`, { signal });
  return data;
}

export async function getDashboardOrderCount(params, signal) {
  const { data } = await apiClient.get('/admin/orders', { params: { ...params, page: 1, limit: 1 }, signal });
  return data.total;
}

export async function getDashboardInventory(dayId, page, signal) {
  const { data } = await apiClient.get(`/admin/operating-days/${dayId}/inventory`, { params: { page, limit: 100 }, signal });
  return data;
}

export async function getDashboardTables(page, signal) {
  const { data } = await apiClient.get('/admin/tables', { params: { page, limit: 100 }, signal });
  return data;
}

export function getDashboardApiError(error) {
  const message = error.response?.data?.message;
  if (Array.isArray(message)) return message.join(' ');
  if (typeof message === 'string') return message;
  if (error.response?.status === 401) return 'Tu sesión expiró. Vuelve a iniciar sesión.';
  if (error.response?.status === 403) return 'Tu cuenta no tiene permiso para consultar estos datos.';
  if (!error.response) return 'No se pudo conectar con el servidor. Revisa la conexión e inténtalo de nuevo.';
  return 'No se pudo cargar este indicador. Inténtalo de nuevo.';
}
