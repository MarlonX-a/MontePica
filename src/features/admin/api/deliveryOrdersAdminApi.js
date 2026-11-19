import apiClient from '@/shared/api/apiClient';

export async function getDeliveryOrders(params, signal) { const { data } = await apiClient.get('/admin/orders', { params: { ...params, modality: 'delivery' }, signal }); return data; }
export async function getDeliveryOrder(id, signal) { const { data } = await apiClient.get(`/admin/orders/${id}`, { signal }); return data; }
export async function getDeliveryProduct(id, signal) { const { data } = await apiClient.get(`/products/${id}`, { signal }); return data; }
export async function transitionDeliveryOrder(id, action, body, key) { const { data } = await apiClient.post(`/admin/orders/${id}/${action}`, body, { headers: { 'Idempotency-Key': key } }); return data; }
export function deliveryOrderError(error) { const message = error?.response?.data?.message; if (Array.isArray(message)) return message.join(' '); if (message) return message; if (error?.response?.status === 401) return 'Tu sesión expiró. Vuelve a iniciar sesión.'; if (error?.response?.status === 403) return 'Tu cuenta no tiene permiso para consultar o gestionar pedidos.'; return error?.response ? 'No se pudo completar la operación.' : 'No se pudo conectar con el servidor. Revisa la conexión.'; }
