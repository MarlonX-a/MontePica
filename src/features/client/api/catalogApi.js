import apiClient from '@/shared/api/apiClient';
import { mapApiMenuProduct } from '@/features/client/data/menuProductMapper';

export async function getMenuProducts() {
  const { data } = await apiClient.get('/products');
  return data.items.map(mapApiMenuProduct);
}

export async function getOrderEditorProducts(signal) {
  const products = [];
  const limit = 100;
  for (let page = 1; ; page += 1) {
    const { data } = await apiClient.get('/products', { params: { page, limit }, signal });
    products.push(...data.items);
    if (page * limit >= data.total || !data.items.length) return products;
  }
}

export async function getMenuCategories() {
  const { data } = await apiClient.get('/categories');
  return data;
}

export async function getMenuProductById(id) {
  const { data } = await apiClient.get(`/products/${id}`);
  return mapApiMenuProduct(data);
}
