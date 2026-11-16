const pending = new Map();

export function getPendingReceipt(clientId, orderId) {
  return pending.get(`${clientId}:${orderId}`) || null;
}

export function setPendingReceipt(clientId, orderId, value) {
  pending.set(`${clientId}:${orderId}`, value);
}

export function clearPendingReceipt(clientId, orderId) {
  pending.delete(`${clientId}:${orderId}`);
}
