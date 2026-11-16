export function mapAdminCategory(category) {
  return {
    id: category.id,
    name: category.name,
    active: category.active,
    sortOrder: category.sortOrder,
  };
}

export function mapAdminProduct(product) {
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    description: product.description || '',
    price: product.priceCents / 100,
    categoryId: product.categoryId,
    category: product.categoryName,
    icon: '🍽️',
    visible: product.visibleInMenu,
    active: product.active,
    tracksInventory: product.tracksInventory,
    imageUrl: product.imageUrl,
    sortOrder: product.sortOrder,
  };
}

export function getAdminProductPayload(values, categories, currentProduct) {
  const category = categories.find((item) => item.id === values.categoryId);
  const payload = {
    name: values.name,
    description: values.description || null,
    categoryId: category.id,
    priceCents: Math.round(Number(values.price) * 100),
    visibleInMenu: values.visibility === 'Visible',
    active: values.status === 'Activo',
  };

  if (!currentProduct) {
    return {
      ...payload,
      sku: values.sku,
      active: values.status === 'Activo',
      tracksInventory: true,
      sortOrder: 0,
    };
  }

  return payload;
}
