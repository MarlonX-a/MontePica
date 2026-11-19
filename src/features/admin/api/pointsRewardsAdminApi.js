import apiClient from '@/shared/api/apiClient';

export async function getPublicPointsSettings(signal) {
  const { data } = await apiClient.get('/points/settings', { signal });
  return data;
}

export async function getAdminPointsSettings(signal) {
  const { data } = await apiClient.get('/admin/points/settings', { signal });
  return data;
}

export async function updateAdminPointsSettings(settings, idempotencyKey) {
  const { data } = await apiClient.put('/admin/points/settings', settings, {
    headers: { 'Idempotency-Key': idempotencyKey },
  });
  return data;
}

export async function getAdminClientPoints(clientId, signal) {
  const { data } = await apiClient.get(`/admin/clients/${clientId}/points`, { signal });
  return data;
}

export async function getAdminClientPointsMovements({ clientId, page = 1, limit = 20, signal }) {
  const { data } = await apiClient.get(`/admin/clients/${clientId}/points/movements`, {
    params: { page, limit }, signal,
  });
  return data;
}

export async function getAdminRewards({ page = 1, limit = 20, search, active, signal } = {}) {
  const { data } = await apiClient.get('/admin/rewards', {
    params: { page, limit, ...(search ? { search } : {}), ...(active == null ? {} : { active }) },
    signal,
  });
  return data;
}

export async function getAvailableRewardProducts(signal) {
  const products = [];
  const limit = 100;
  for (let page = 1; ; page += 1) {
    const { data } = await apiClient.get('/products', { params: { page, limit }, signal });
    products.push(...data.items);
    if (products.length >= data.total || !data.items.length) return products;
  }
}

export async function getAdminReward(id, signal) {
  const { data } = await apiClient.get(`/admin/rewards/${id}`, { signal });
  return data;
}

export async function createAdminReward(reward, idempotencyKey) {
  const { data } = await apiClient.post('/admin/rewards', reward, {
    headers: { 'Idempotency-Key': idempotencyKey },
  });
  return data;
}

export async function updateAdminReward(id, reward, idempotencyKey) {
  const { data } = await apiClient.patch(`/admin/rewards/${id}`, reward, {
    headers: { 'Idempotency-Key': idempotencyKey },
  });
  return data;
}

export function getPointsRewardsError(error) {
  const message = error.response?.data?.message;
  if (Array.isArray(message)) return message.join(' ');
  if (typeof message === 'string') return message;
  if (!error.response) return 'No se pudo conectar con el servidor. Revisa la conexión e inténtalo de nuevo.';
  if (error.response.status === 401) return 'Tu sesión expiró. Vuelve a iniciar sesión.';
  if (error.response.status === 403) return 'Tu cuenta no tiene permiso para realizar esta consulta u operación.';
  if (error.response.status === 404) return 'No encontramos el cliente o la recompensa solicitados.';
  if (error.response.status === 409) return 'Los datos cambiaron en el servidor. Actualiza la información antes de continuar.';
  return 'No se pudo completar la operación. Inténtalo de nuevo.';
}
