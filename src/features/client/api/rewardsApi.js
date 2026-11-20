import apiClient from '@/shared/api/apiClient';

export async function getPublicPointsSettings(signal) {
  const { data } = await apiClient.get('/points/settings', { signal });
  return data;
}

export async function getMyPoints(signal) {
  const { data } = await apiClient.get('/me/points', { signal });
  return data;
}

export async function getMyPointsMovements({ page = 1, limit = 20, type, signal } = {}) {
  const { data } = await apiClient.get('/me/points/movements', {
    params: { page, limit, ...(type ? { type } : {}) }, signal,
  });
  return data;
}

export async function getPublicRewards({ page = 1, limit = 20, signal } = {}) {
  const { data } = await apiClient.get('/rewards', { params: { page, limit }, signal });
  return data;
}

export async function getPublicReward(id, signal) {
  const { data } = await apiClient.get(`/rewards/${id}`, { signal });
  return data;
}
