import apiClient from '@/shared/api/apiClient';

export async function getAdminTables(page = 1, signal) {
  const { data } = await apiClient.get('/admin/tables', {
    params: { page, limit: 100 },
    signal,
  });
  return data;
}

export async function getAllAdminTables(signal) {
  const tables = new Map();
  let page = 1;
  let received = 0;
  let total;
  do {
    const data = await getAdminTables(page, signal);
    total = data.total;
    if (data.items.length === 0 && received < total) {
      throw new Error(
        'La lista de mesas cambió durante la carga. Vuelve a consultar.',
      );
    }
    data.items.forEach((table) => tables.set(table.id, table));
    received += data.items.length;
    page += 1;
  } while (received < total);

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
