import apiClient from '@/shared/api/apiClient';

export async function loginWithApi({ email, password }) {
  const { data } = await apiClient.post('/auth/login', { email, password });
  return data;
}

export async function registerWithApi({
  name,
  email,
  phone,
  password,
  termsAccepted,
}) {
  const { data } = await apiClient.post('/auth/register', {
    name,
    email,
    phone,
    password,
    termsAccepted,
  });
  return data;
}

export async function getAuthenticatedUser() {
  const { data } = await apiClient.get('/auth/me');
  return data;
}

export async function requestPasswordRecovery(email, signal) {
  await apiClient.post('/auth/forgot-password', { email }, { signal });
}

export async function resetPassword(token, newPassword, signal) {
  await apiClient.post('/auth/reset-password', { token, newPassword }, { signal });
}

export async function changePassword(currentPassword, newPassword, sessionGeneration) {
  await apiClient.post('/auth/change-password', { currentPassword, newPassword }, {
    sessionGeneration,
    skipSessionRefresh: true,
  });
}
