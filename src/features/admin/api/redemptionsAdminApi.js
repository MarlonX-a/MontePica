import apiClient from '@/shared/api/apiClient';

export async function getAdminRedemptions({ page = 1, limit = 20, status, signal } = {}) {
  const { data } = await apiClient.get('/admin/redemptions', {
    params: { page, limit, ...(status ? { status } : {}) },
    signal,
  });
  return data;
}

export async function getAdminRedemption(id, signal) {
  const { data } = await apiClient.get(`/admin/redemptions/${id}`, { signal });
  return data;
}

export async function decideAdminRedemption(id, decision, reason, key) {
  const body = decision === 'reject' ? { reason } : {};
  const { data } = await apiClient.post(`/admin/redemptions/${id}/${decision}`, body, {
    headers: { 'Idempotency-Key': key },
  });
  return data;
}
