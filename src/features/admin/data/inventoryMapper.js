export function mapInventoryItem(item, categories) {
  const categoryName = categories.find(
    (category) => category.id === item.product.categoryId,
  )?.name;

  return {
    id: item.product.id,
    name: item.product.name,
    sku: item.product.sku,
    categoryId: item.product.categoryId,
    category: categoryName || 'Sin categoría',
    initialized: item.initialized,
    initialQuantity: item.initialQuantity,
    physicalQuantity: item.physicalQuantity,
    reservedQuantity: item.reservedQuantity,
    availableQuantity: item.availableQuantity,
  };
}

export function makeIdempotencyKey() {
  return `inventory-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
