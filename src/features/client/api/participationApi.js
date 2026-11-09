import apiClient from '@/shared/api/apiClient';

export async function getMyParticipations(page = 1, signal) {
  const { data } = await apiClient.get('/me/participants', {
    params: { page, limit: 100 },
    signal,
  });
  return data;
}

export async function getMyParticipation(id, signal) {
  const { data } = await apiClient.get(`/me/participants/${id}`, { signal });
  return data;
}

export async function requestVisitParticipation(visitId, payload, key, signal) {
  const { data } = await apiClient.post(
    `/visits/${visitId}/participants`,
    payload,
    { signal, headers: { 'Idempotency-Key': key } },
  );
  return data;
}

export function getParticipationError(error) {
  const message = error.response?.data?.message;
  return Array.isArray(message)
    ? message.join(' ')
    : message || 'No se pudo consultar la participación.';
}

export async function leaveMyParticipation(id, key) {
  const { data } = await apiClient.post(
    `/me/participants/${id}/leave`,
    {},
    { headers: { 'Idempotency-Key': key } },
  );
  return data;
}
