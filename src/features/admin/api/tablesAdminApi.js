import apiClient from '@/shared/api/apiClient';

export async function getAdminTables(signal, page = 1) {
  const { data } = await apiClient.get('/admin/tables', {
    params: { page, limit: 100 },
    signal,
  });
  return data;
}

export async function getAllAdminTables(signal) {
  const firstPage = await getAdminTables(signal, 1);
  const pageCount = Math.ceil(firstPage.total / firstPage.limit);
  const remainingPages = await Promise.all(
    Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) =>
      getAdminTables(signal, index + 2),
    ),
  );
  const tables = new Map();
  [firstPage, ...remainingPages].forEach((page) =>
    page.items.forEach((table) => tables.set(table.id, table)),
  );
  const total = remainingPages.every((page) => page.total === firstPage.total)
    ? firstPage.total
    : -1;

  if (tables.size !== total) {
    throw new Error(
      'La lista de mesas cambió durante la carga. Vuelve a consultar.',
    );
  }
  return [...tables.values()];
}

export async function createAdminTable(code) {
  const { data } = await apiClient.post('/admin/tables', { code });
  return data;
}

export function getTablesApiError(error) {
  if (error.response?.status === 401) {
    return 'Tu sesión expiró. Vuelve a iniciar sesión.';
  }
  if (error.response?.status === 403) {
    return 'Tu cuenta no tiene permiso para esta operación de mesas.';
  }
  const message = error.response?.data?.message;
  if (Array.isArray(message)) return message.join(' ');
  if (typeof message === 'string') return message;
  if (error.request) {
    return 'No se pudo conectar con el servidor. Revisa la conexión e inténtalo de nuevo.';
  }
  return (
    error.message || 'No se pudo completar la operación. Inténtalo de nuevo.'
  );
}

export async function getAdminTable(id, signal) {
  const { data } = await apiClient.get(`/admin/tables/${id}`, { signal });
  return data;
}

export async function updateAdminTable(id, changes) {
  const { data } = await apiClient.patch(`/admin/tables/${id}`, changes);
  return data;
}
