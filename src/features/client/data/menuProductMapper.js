export function mapApiMenuProduct(apiProduct) {
  const category = apiProduct.category?.name ?? 'Otros';
  const priceCents = Number(apiProduct.priceCents);

  return {
    id: apiProduct.id,
    sku: apiProduct.sku,
    name: apiProduct.name,
    description: apiProduct.description ?? '',
    price: `$${(priceCents / 100).toFixed(2)}`,
    priceCents,
    category,
    icon: category === 'Bebidas' ? '🥤' : '🍽️',
    detail: category === 'Bebidas' ? 'Bebida' : 'Preparado al momento',
    availability: 'Consultar en el local',
    image: apiProduct.imageUrl ? { uri: apiProduct.imageUrl } : null,
    tracksInventory: Boolean(apiProduct.tracksInventory),
  };
}
