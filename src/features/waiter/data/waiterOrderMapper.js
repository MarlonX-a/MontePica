const statusLabels = {
  submitted: 'Recibido',
  preparing: 'En preparación',
  ready: 'Listo',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

const eventLabels = {
  submitted: 'Pedido recibido',
  'start-preparation': 'Preparación iniciada',
  ready: 'Pedido marcado como listo',
  deliver: 'Pedido entregado',
  cancel: 'Pedido cancelado',
};

export function mapWaiterOrder(order, productNames, tableCodes) {
  const tableCode = order.visitId ? tableCodes.get(order.visitId) : null;
  return {
    ...order,
    displayId: order.id.slice(0, 8).toUpperCase(),
    statusLabel: statusLabels[order.status] || order.status,
    tableLabel: tableCode || (order.visitId ? `Visita ${order.visitId.slice(0, 8)}` : 'Mesa no disponible'),
    tableUnavailable: !tableCode,
    submittedLabel: formatDate(order.submittedAt),
    totalLabel: formatMoney(order.totalCents, order.currency),
    items: (order.items || []).map((item) => ({
      ...item,
      name: productNames.get(item.productId) || `Producto ${item.productId}`,
      unitPriceLabel: formatMoney(item.unitPriceCents, order.currency),
      subtotalLabel: formatMoney(item.subtotalCents, order.currency),
      notes: item.notes || '',
    })),
    history: (order.history || []).map((event) => ({
      ...event,
      label: eventLabels[event.event] || event.event,
      occurredLabel: formatDate(event.occurredAt),
    })),
  };
}

export function formatMoney(cents, currency = 'USD') {
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency,
  }).format((cents || 0) / 100);
}

function formatDate(value) {
  if (!value) return 'Fecha no disponible';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible';
  return new Intl.DateTimeFormat('es-EC', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
