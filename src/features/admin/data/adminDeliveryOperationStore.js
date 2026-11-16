const pendingByUser = new Map();
const pendingSettingsByUser = new Map();
const activeWrites = new Set();

function getUserKey(userId) {
  return userId || 'anonymous-admin';
}

export function acquireAdminDeliveryWrite(userId) {
  const key = getUserKey(userId);
  if (activeWrites.has(key)) return false;
  activeWrites.add(key);
  return true;
}

export function releaseAdminDeliveryWrite(userId) {
  activeWrites.delete(getUserKey(userId));
}

export function isAdminDeliveryWriteActive(userId) {
  return activeWrites.has(getUserKey(userId));
}

export function getPendingAdminDelivery(userId) { return pendingByUser.get(userId) || null; }
export function setPendingAdminDelivery(userId, operation) { pendingByUser.set(userId, operation); }
export function clearPendingAdminDelivery(userId) { pendingByUser.delete(userId); }
export function getPendingAdminDeliverySettings(userId) { return pendingSettingsByUser.get(userId) || null; }
export function setPendingAdminDeliverySettings(userId, operation) { pendingSettingsByUser.set(userId, operation); }
export function clearPendingAdminDeliverySettings(userId) { pendingSettingsByUser.delete(userId); }
