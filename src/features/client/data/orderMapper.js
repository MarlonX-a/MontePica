const MAX_ITEM_NOTES_LENGTH = 500;
const MAX_ORDER_QUANTITY = 999;

function getCartItemNote(item) {
  const parts = [];

  if (item.spice) parts.push(`Picante: ${item.spice}`);
  if (item.note?.trim()) parts.push(`Nota: ${item.note.trim()}`);

  if (!parts.length) return '';
  return `${item.quantity} unidad(es): ${parts.join('; ')}`;
}

export function mapCartToVisitOrder(items) {
  if (!items.length) {
    return { error: 'Agrega al menos un producto antes de enviar el pedido.' };
  }

  const visitIds = new Set(items.map((item) => item.visitId));
  const isDineIn = items.every((item) => item.service === 'dine-in');
  const [visitId] = visitIds;

  if (!isDineIn || visitIds.size !== 1 || !visitId) {
    return {
      error:
        'El carrito debe contener productos de una sola visita reconocida para pedir en el local.',
    };
  }

  const groupedItems = new Map();

  for (const item of items) {
    if (
      !item.product?.id ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1
    ) {
      return { error: 'Hay un producto del carrito con datos inválidos.' };
    }

    const current = groupedItems.get(item.product.id) ?? {
      productId: item.product.id,
      quantity: 0,
      notes: [],
    };

    current.quantity += item.quantity;
    if (current.quantity > MAX_ORDER_QUANTITY) {
      return {
        error: 'La cantidad máxima permitida por producto es 999 unidades.',
      };
    }

    const note = getCartItemNote(item);
    if (note) current.notes.push(note);
    groupedItems.set(item.product.id, current);
  }

  const payloadItems = [];

  for (const item of groupedItems.values()) {
    const notes = item.notes.join(' | ');
    if (notes.length > MAX_ITEM_NOTES_LENGTH) {
      return {
        error:
          'Las notas de un producto superan el límite de 500 caracteres. Acórtalas antes de enviar.',
      };
    }

    payloadItems.push({
      productId: item.productId,
      quantity: item.quantity,
      ...(notes ? { notes } : {}),
    });
  }

  if (payloadItems.length > 100) {
    return { error: 'Un pedido puede incluir como máximo 100 productos.' };
  }

  return {
    visitId,
    payload: { items: payloadItems },
  };
}

export function getOrderStatusLabel(status) {
  const labels = {
    submitted: 'Recibido',
    preparing: 'En preparación',
    ready: 'Listo para servir',
    dispatched: 'Despachado',
    delivered: 'Entregado',
    cancelled: 'Cancelado',
  };

  return labels[status] ?? 'Estado actualizado';
}

export function formatOrderDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible';

  return new Intl.DateTimeFormat('es-EC', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function formatOrderTotal(totalCents, currency = 'USD') {
  const amount = Number(totalCents);
  if (!Number.isFinite(amount)) return 'Total no disponible';

  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency,
  }).format(amount / 100);
}
