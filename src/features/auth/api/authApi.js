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
