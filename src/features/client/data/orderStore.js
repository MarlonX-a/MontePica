import { useSyncExternalStore } from 'react';

let cartItems = [];
let activeOrder = null;
let pendingSubmission = null;
let orderSequence = 1048;
const listeners = new Set();
let snapshot = { cartItems, activeOrder, pendingSubmission };

function notify() {
  listeners.forEach((listener) => listener());
}

function getSnapshot() {
  return snapshot;
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function updateSnapshot() {
  snapshot = { cartItems, activeOrder, pendingSubmission };
}

export function useOrderStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function addToCart({
  product,
  quantity,
  spice,
  note,
  service,
  table,
  visitId,
}) {
  if (pendingSubmission) return false;

  const itemKey = [
    product.id,
    spice || '',
    note || '',
    service || '',
    table || '',
    visitId || '',
  ].join('-');
  const itemExists = cartItems.some((item) => item.key === itemKey);

  if (itemExists) {
    cartItems = cartItems.map((item) =>
      item.key === itemKey
        ? { ...item, quantity: item.quantity + quantity }
        : item,
    );
  } else {
    cartItems = [
      ...cartItems,
      {
        key: itemKey,
        product,
        quantity,
        spice,
        note,
        service,
        table,
        visitId,
      },
    ];
  }

  updateSnapshot();
  notify();
  return true;
}

export function updateCartQuantity(key, quantity) {
  if (pendingSubmission) return false;

  if (quantity <= 0) {
    cartItems = cartItems.filter((item) => item.key !== key);
  } else {
    cartItems = cartItems.map((item) =>
      item.key === key ? { ...item, quantity } : item,
    );
  }

  updateSnapshot();
  notify();
  return true;
}

export function confirmOrder() {
  if (!cartItems.length || pendingSubmission) {
    return null;
  }

  orderSequence += 1;
  activeOrder = {
    id: `#${orderSequence}`,
    table: cartItems[0].table || 'Mesa 08',
    service: cartItems[0].service || 'delivery',
    status: 'En preparación',
    createdAt: 'ahora',
    items: cartItems,
    total: getCartTotal(),
  };
  cartItems = [];
  updateSnapshot();
  notify();
  return activeOrder;
}

export function getCartTotal() {
  return cartItems.reduce(
    (total, item) =>
      total + Number(item.product.price.replace('$', '')) * item.quantity,
    0,
  );
}

export function getPendingOrderSubmission() {
  return pendingSubmission;
}

export function createPendingOrderSubmission(visitId, payload) {
  if (pendingSubmission) return null;

  pendingSubmission = {
    visitId,
    payload,
    key: `order-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    status: 'ready',
  };
  updateSnapshot();
  notify();
  return pendingSubmission;
}

export function beginOrderSubmission(key) {
  if (!pendingSubmission || pendingSubmission.key !== key) return null;
  if (pendingSubmission.status === 'sending') return null;

  pendingSubmission = { ...pendingSubmission, status: 'sending' };
  updateSnapshot();
  notify();
  return pendingSubmission;
}

export function markOrderSubmissionUncertain(key) {
  if (!pendingSubmission || pendingSubmission.key !== key) return;

  pendingSubmission = { ...pendingSubmission, status: 'uncertain' };
  updateSnapshot();
  notify();
}

export function releaseOrderSubmission(key) {
  if (!pendingSubmission || pendingSubmission.key !== key) return;

  pendingSubmission = null;
  updateSnapshot();
  notify();
}

export function completeOrderSubmission(key) {
  if (!pendingSubmission || pendingSubmission.key !== key) return false;

  cartItems = [];
  pendingSubmission = null;
  updateSnapshot();
  notify();
  return true;
}
