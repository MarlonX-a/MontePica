import apiClient from '@/shared/api/apiClient';

export async function getVisitParticipants(visitId, params, signal) {
  const { data } = await apiClient.get(
    `/admin/visits/${visitId}/participants`,
    { params, signal },
  );
  return data;
}
export async function approveParticipant(id, key) {
  const { data } = await apiClient.post(
    `/admin/participants/${id}/approve`,
    {},
    { headers: { 'Idempotency-Key': key } },
  );
  return data;
}
export async function rejectParticipant(id, reason, key) {
  const { data } = await apiClient.post(
    `/admin/participants/${id}/reject`,
    { reason },
    { headers: { 'Idempotency-Key': key } },
  );
  return data;
}
export function getParticipantsError(error) {
  const message = error.response?.data?.message;
  return Array.isArray(message)
    ? message.join(' ')
    : message || 'No se pudo gestionar la participación.';
}
