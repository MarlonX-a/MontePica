import apiClient from '@/shared/api/apiClient';

export async function getAdminProducts() {
  const { data } = await apiClient.get('/admin/products', {
    params: { page: 1, limit: 100 },
  });
  return data.items;
}

export async function getAdminCategories() {
  const { data } = await apiClient.get('/admin/categories', {
    params: { page: 1, limit: 100 },
  });
  return data.items;
}

export async function createAdminProduct(product) {
  const { data } = await apiClient.post('/admin/products', product);
  return data;
}

export async function updateAdminProduct(id, product) {
  const { data } = await apiClient.patch(`/admin/products/${id}`, product);
  return data;
}

export async function createAdminCategory(category) {
  const { data } = await apiClient.post('/admin/categories', category);
  return data;
}

export async function updateAdminCategory(id, category) {
  const { data } = await apiClient.patch(`/admin/categories/${id}`, category);
  return data;
}

export function getAdminApiError(error) {
  const message = error.response?.data?.message;
  if (Array.isArray(message)) return message.join(' ');
  if (typeof message === 'string') return message;
  if (!error.response) {
    return 'No se pudo conectar con el servidor. Revisa la conexión e inténtalo de nuevo.';
  }
  if (error.response.status === 401) return 'Tu sesión expiró. Vuelve a iniciar sesión.';
  if (error.response.status === 403) {
    return 'Tu cuenta no tiene permisos para administrar el catálogo.';
  }
  return 'No se pudo guardar la información. Inténtalo de nuevo.';
}
