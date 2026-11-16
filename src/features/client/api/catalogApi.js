import apiClient from '@/shared/api/apiClient';
import { mapApiMenuProduct } from '@/features/client/data/menuProductMapper';

export async function getMenuProducts() {
  const { data } = await apiClient.get('/products');
  return data.items.map(mapApiMenuProduct);
}

export async function getMenuCategories() {
  const { data } = await apiClient.get('/categories');
  return data;
}

export async function getMenuProductById(id) {
  const { data } = await apiClient.get(`/products/${id}`);
  return mapApiMenuProduct(data);
}
