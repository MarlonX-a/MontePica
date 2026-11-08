import apiClient from '@/shared/api/apiClient';

export async function openAdminVisit(tableId) {
  const { data } = await apiClient.post(`/admin/tables/${tableId}/visits`);
  return data;
}

export async function getAdminVisit(visitId, signal) {
  const { data } = await apiClient.get(`/admin/visits/${visitId}`, { signal });
  return data;
}

export async function closeAdminVisit(visitId, idempotencyKey) {
  const { data } = await apiClient.post(
    `/admin/visits/${visitId}/close`,
    {},
    { headers: { 'Idempotency-Key': idempotencyKey } },
  );
  return data;
}

export async function issueAdminVisitQr(visitId) {
  const { data } = await apiClient.post(`/admin/visits/${visitId}/qr`);
  return data;
}

export function getVisitsApiError(error) {
  const message = error.response?.data?.message;
  if (Array.isArray(message)) return message.join(' ');
  if (typeof message === 'string') return message;
  if (error.response?.status === 401) {
    return 'Tu sesión expiró. Vuelve a iniciar sesión.';
  }
  if (error.response?.status === 403) {
    return 'Tu cuenta no tiene permiso para esta operación de visitas.';
  }
  if (!error.response) {
    return 'No se pudo conectar con el servidor. Revisa la conexión e inténtalo de nuevo.';
  }
  return 'No se pudo completar la operación. Inténtalo de nuevo.';
}
