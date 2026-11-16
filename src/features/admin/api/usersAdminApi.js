import apiClient from '@/shared/api/apiClient';

export async function getAdminUsers(params = {}) {
  const { data } = await apiClient.get('/admin/users', {
    params: { page: 1, limit: 100, ...params },
  });
  return data;
}

export async function getAdminRoles() {
  const { data } = await apiClient.get('/admin/roles');
  return data;
}

export async function createAdminUser(user) {
  const { data } = await apiClient.post('/admin/users', user);
  return data;
}

export async function updateAdminUser(id, user) {
  const { data } = await apiClient.patch(`/admin/users/${id}`, user);
  return data;
}

export function getUsersApiError(error) {
  const message = error.response?.data?.message;
  if (Array.isArray(message)) return message.join(' ');
  if (typeof message === 'string') return message;
  if (!error.response) {
    return 'No se pudo conectar con el servidor. Revisa la conexión e inténtalo de nuevo.';
  }
  if (error.response.status === 401) return 'Tu sesión expiró. Vuelve a iniciar sesión.';
  if (error.response.status === 403) {
    return 'Tu cuenta no tiene permisos para administrar usuarios.';
  }
  return 'No se pudo completar la operación. Inténtalo de nuevo.';
}
