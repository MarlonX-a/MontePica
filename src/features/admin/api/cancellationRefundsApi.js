import apiClient from '@/shared/api/apiClient';

export async function getCancellationOrder(id, signal) {
  const { data } = await apiClient.get(`/admin/orders/${id}`, { signal });
  return data;
}
export async function listAdminCancellations(params, signal) {
  const { data } = await apiClient.get('/admin/cancellation-requests', {
    params,
    signal,
  });
  return data;
}
export async function getAdminCancellation(id, signal) {
  const { data } = await apiClient.get(`/admin/cancellation-requests/${id}`, {
    signal,
  });
  return data;
}
export async function decideAdminCancellation(id, decision, body, key) {
  const { data } = await apiClient.post(
    `/admin/cancellation-requests/${id}/${decision}`,
    body,
    { headers: { 'Idempotency-Key': key } },
  );
  return data;
}
export async function listAdminRefunds(params, signal) {
  const { data } = await apiClient.get('/admin/refunds', { params, signal });
  return data;
}
export async function getAdminRefund(id, signal) {
  const { data } = await apiClient.get(`/admin/refunds/${id}`, { signal });
  return data;
}
export async function executeAdminRefund(id, body, key) {
  const { data } = await apiClient.post(`/admin/refunds/${id}/execute`, body, {
    headers: { 'Idempotency-Key': key },
  });
  return data;
}
