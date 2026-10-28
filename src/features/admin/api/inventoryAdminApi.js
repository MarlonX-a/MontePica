import apiClient from '@/shared/api/apiClient';

export async function getCurrentOperatingState() {
  const { data } = await apiClient.get('/admin/operations/current');
  return data;
}

export async function openCurrentOperatingDay() {
  const { data } = await apiClient.post('/admin/operations/days/open');
  return data;
}

export async function getOperatingInventory(dayId) {
  const { data } = await apiClient.get(
    `/admin/operating-days/${dayId}/inventory`,
    { params: { page: 1, limit: 100 } },
  );
  return data.items;
}

export async function initializeInventory(dayId, productId, initialQuantity, key) {
  const { data } = await apiClient.post(
    `/admin/operating-days/${dayId}/inventory/initialize`,
    { items: [{ productId, initialQuantity }] },
    { headers: { 'Idempotency-Key': key } },
  );
  return data;
}

export async function createInventoryMovement(
  dayId,
  productId,
  movement,
  key,
) {
  const { data } = await apiClient.post(
    `/admin/operating-days/${dayId}/inventory/${productId}/movements`,
    movement,
    { headers: { 'Idempotency-Key': key } },
  );
  return data;
}

export async function adjustInventory(dayId, productId, adjustment, key) {
  const { data } = await apiClient.post(
    `/admin/operating-days/${dayId}/inventory/${productId}/adjustments`,
    adjustment,
    { headers: { 'Idempotency-Key': key } },
  );
  return data;
}

export function getInventoryApiError(error) {
  const message = error.response?.data?.message;
  if (Array.isArray(message)) return message.join(' ');
  if (typeof message === 'string') return message;
  if (!error.response) {
    return 'No se pudo conectar con el servidor. Revisa la conexión e inténtalo de nuevo.';
  }
  if (error.response.status === 401) return 'Tu sesión expiró. Vuelve a iniciar sesión.';
  if (error.response.status === 403) {
    return 'Tu cuenta no tiene permiso para esta acción de inventario.';
  }
  return 'No se pudo completar la operación. Inténtalo de nuevo.';
}
