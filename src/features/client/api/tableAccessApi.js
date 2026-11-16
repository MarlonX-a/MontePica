import apiClient from '@/shared/api/apiClient';

export async function resolveTableQr(qrToken, signal) {
  const { data } = await apiClient.post(
    '/table-access/resolve',
    { qrToken },
    { signal },
  );
  return data;
}

export function getTableAccessError(error) {
  const message = error.response?.data?.message;
  const status = error.response?.status;
  let backendMessage = '';
  if (Array.isArray(message)) backendMessage = message.join(' ');
  if (typeof message === 'string') backendMessage = message;

  if (backendMessage && [400, 404, 409].includes(status)) {
    return `${backendMessage} Escanea un QR vigente de la mesa.`;
  }
  if (backendMessage) return backendMessage;
  if (status === 401) {
    return 'Tu sesión expiró. Inicia sesión nuevamente para validar el QR.';
  }
  if (status === 403) {
    return 'Esta ruta requiere una cuenta de cliente.';
  }
  if ([400, 404, 409].includes(status)) {
    return 'El QR no es válido o ya no está vigente. Escanea el código actual de la mesa.';
  }
  if (!error.response) {
    return 'No se pudo conectar con el servidor. Revisa la conexión e inténtalo de nuevo.';
  }
  return 'No se pudo validar el QR. Inténtalo de nuevo.';
}
