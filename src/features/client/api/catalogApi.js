import apiClient from '@/shared/api/apiClient';
import { mapApiMenuProduct } from '@/features/client/data/menuProductMapper';

export async function getMenuProducts() {
  const products = [];
  const limit = 100;
  for (let page = 1; ; page += 1) {
    const { data } = await apiClient.get('/products', { params: { page, limit } });
    products.push(...data.items.map(mapApiMenuProduct));
    const currentPage = Number(data.page) || page;
    const currentLimit = Number(data.limit) || limit;
    if (currentPage * currentLimit >= data.total || !data.items.length) {
      return products;
    }
  }
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

export function isCatalogConnectionError(error) {
  return Boolean(
    error?.isAxiosError &&
      error.request &&
      !error.response &&
      error.name !== 'CanceledError' &&
      error.code !== 'ERR_CANCELED',
  );
}
