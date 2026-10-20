import { menuProducts } from '@/shared/data/menuProducts';

export const initialProducts = menuProducts.map((product, index) => ({
  ...product,
  price: Number(product.price.replace('$', '')),
  stock: [18, 3, 8, 20, 15, 24][index],
  visible: index !== 2,
}));

export const initialCategories = ['Ceviches', 'Bebidas'];
export const initialTables = Array.from({ length: 12 }, (_, index) => ({
  id: `table-${index + 1}`,
  name: `Mesa ${String(index + 1).padStart(2, '0')}`,
  capacity: [4, 2, 4, 6][index % 4],
  zone: 'Salón',
  status: [2, 5, 7].includes(index) ? 'Ocupada' : 'Libre',
  qr: index !== 6,
}));
export const roles = ['Administrador', 'Trabajador', 'Cliente'];
export const initialUsers = [
  {
    id: 'user-1',
    name: 'Luis Macías',
    email: 'luis@montepica.ec',
    role: 'Administrador',
    active: true,
  },
  {
    id: 'user-2',
    name: 'Ana Paredes',
    email: 'ana@montepica.ec',
    role: 'Trabajador',
    active: true,
  },
  {
    id: 'user-3',
    name: 'José Mendoza',
    email: 'jose@montepica.ec',
    role: 'Trabajador',
    active: true,
  },
  {
    id: 'user-4',
    name: 'María Zambrano',
    email: 'maria@example.com',
    role: 'Cliente',
    active: true,
  },
  {
    id: 'user-5',
    name: 'Carlos Rivera',
    email: 'carlos@example.com',
    role: 'Cliente',
    active: false,
  },
];
