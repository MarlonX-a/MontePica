import apiClient from '@/shared/api/apiClient';
export async function editMyOrder(id, body, key) {
  const { data } = await apiClient.put(`/me/orders/${id}`, body, {
    headers: { 'Idempotency-Key': key },
  });
  return data;
}
export async function cancelMyOrder(id, body, key) {
  const { data } = await apiClient.post(`/me/orders/${id}/cancel`, body, {
    headers: { 'Idempotency-Key': key },
  });
  return data;
}
export async function createCancellationRequest(id, body, key) {
  const { data } = await apiClient.post(
    `/me/orders/${id}/cancellation-requests`,
    body,
    { headers: { 'Idempotency-Key': key } },
  );
  return data;
}
export async function listMyCancellationRequests(params, signal) {
  const { data } = await apiClient.get('/me/cancellation-requests', {
    params,
    signal,
  });
  return data;
}
export async function getMyCancellationRequest(id, signal) {
  const { data } = await apiClient.get(`/me/cancellation-requests/${id}`, {
    signal,
  });
  return data;
}
export async function withdrawMyCancellationRequest(id, key) {
  const { data } = await apiClient.post(
    `/me/cancellation-requests/${id}/withdraw`,
    {},
    { headers: { 'Idempotency-Key': key } },
  );
  return data;
}
export async function listMyRefunds(params, signal) {
  const { data } = await apiClient.get('/me/refunds', { params, signal });
  return data;
}
export async function getMyRefund(id, signal) {
  const { data } = await apiClient.get(`/me/refunds/${id}`, { signal });
  return data;
}
