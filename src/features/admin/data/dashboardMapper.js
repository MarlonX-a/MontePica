export function countDashboardInventory(items) {
  return {
    lowStock: items.filter((item) => item.initialized && item.availableQuantity !== null && item.availableQuantity <= 3).length,
    notInitialized: items.filter((item) => !item.initialized).length,
  };
}

export function countOpenTableVisits(items) {
  return items.filter((table) => Boolean(table.openVisitId)).length;
}

export function formatDashboardMoney(cents, currency = 'USD') {
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency }).format(cents / 100);
}
