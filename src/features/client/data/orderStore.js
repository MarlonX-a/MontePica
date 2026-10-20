import { useSyncExternalStore } from 'react';

let cartItems = [];
let activeOrder = null;
let orderSequence = 1048;
const listeners = new Set();
let snapshot = { cartItems, activeOrder };

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
  snapshot = { cartItems, activeOrder };
}

export function useOrderStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function addToCart({ product, quantity, spice, note, service, table }) {
  const itemKey = `${product.id}-${spice || ''}-${note || ''}`;
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
      },
    ];
  }

  updateSnapshot();
  notify();
}

export function updateCartQuantity(key, quantity) {
  if (quantity <= 0) {
    cartItems = cartItems.filter((item) => item.key !== key);
  } else {
    cartItems = cartItems.map((item) =>
      item.key === key ? { ...item, quantity } : item,
    );
  }

  updateSnapshot();
  notify();
}

export function confirmOrder() {
  if (!cartItems.length) {
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
    (total, item) => total + Number(item.product.price.replace('$', '')) * item.quantity,
    0,
  );
}
