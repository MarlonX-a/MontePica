const pendingByClient = new Map();

export function getPendingDeliveryRequest(clientId) {
  return pendingByClient.get(clientId) || null;
}

export function setPendingDeliveryRequest(clientId, operation) {
  pendingByClient.set(clientId, operation);
}

export function clearPendingDeliveryRequest(clientId) {
  pendingByClient.delete(clientId);
}
