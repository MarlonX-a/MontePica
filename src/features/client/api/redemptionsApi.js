import apiClient from '@/shared/api/apiClient';

export async function getMyRedemptions({ page = 1, limit = 20, status, visitId, signal } = {}) {
  const params = {
    page,
    limit,
    ...(status ? { status } : {}),
    ...(visitId ? { visitId } : {}),
  };
  const { data } = await apiClient.get('/me/redemptions', { params, signal });
  return data;
}

export async function getMyRedemption(id, signal) {
  const { data } = await apiClient.get(`/me/redemptions/${id}`, { signal });
  return data;
}

export async function requestRedemption(visitId, rewardId, rewardVersion, key) {
  const { data } = await apiClient.post(`/visits/${visitId}/redemptions`, {
    rewardId,
    rewardVersion,
  }, { headers: { 'Idempotency-Key': key } });
  return data;
}

export async function cancelRedemption(id, key) {
  const { data } = await apiClient.post(`/me/redemptions/${id}/cancel`, {}, {
    headers: { 'Idempotency-Key': key },
  });
  return data;
}

export async function getMyParticipationForVisit(visitId, signal) {
  let page = 1;
  let total = Infinity;
  while ((page - 1) * 100 < total) {
    const { data } = await apiClient.get('/me/participants', {
      params: { page, limit: 100 },
      signal,
    });
    const participant = (data.items || []).find((item) => item.visitId === visitId);
    if (participant) return participant;
    total = Number(data.total) || 0;
    page += 1;
  }
  return null;
}
