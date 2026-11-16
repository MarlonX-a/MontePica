const adminProductSeed = [
  {
    id: 'fish-ceviche',
    name: 'Ceviche de pescado',
    description: 'Pescado fresco, limón, cebolla colorada y cilantro.',
    price: 6.5,
    category: 'Ceviches',
    icon: '🐟',
    detail: '15–20 min',
    availability: '6 porciones',
    image: require('../../../../assets/ceviche-pescado.jpg'),
  },
  {
    id: 'shrimp-ceviche',
    name: 'Ceviche de camarón',
    description: 'Camarones frescos con limón, tomate y cebolla.',
    price: 8.75,
    category: 'Ceviches',
    icon: '🍤',
    detail: '15–20 min',
    availability: '8 porciones',
    image: require('../../../../assets/ceviche-camaron.jpg'),
  },
  {
    id: 'mixed-ceviche',
    name: 'Ceviche mixto',
    description: 'Pescado y camarón en nuestra mezcla de la casa.',
    price: 9.5,
    category: 'Ceviches',
    icon: '🦐',
    detail: '20 min',
    availability: '5 porciones',
    image: require('../../../../assets/ceviche-mixto.jpg'),
  },
  {
    id: 'passion-fruit-juice',
    name: 'Jugo de maracuyá',
    description: 'Pulpa natural, agua y un toque de azúcar.',
    price: 2.25,
    category: 'Bebidas',
    icon: '🥤',
    detail: 'Natural',
    availability: 'Disponible',
  },
  {
    id: 'lemonade',
    name: 'Limonada',
    description: 'Limón recién exprimido, fría y refrescante.',
    price: 2,
    category: 'Bebidas',
    icon: '🍋',
    detail: 'Natural',
    availability: 'Disponible',
  },
  {
    id: 'cola',
    name: 'Cola personal',
    description: 'Bebida gaseosa bien fría.',
    price: 1.5,
    category: 'Bebidas',
    icon: '🥤',
    detail: 'Personal',
    availability: 'Disponible',
  },
];

export const initialProducts = adminProductSeed.map((product, index) => ({
  ...product,
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
