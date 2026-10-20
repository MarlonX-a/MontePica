import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import AdminShell from '@/features/admin/components/AdminShell';
import { useAdmin } from '@/features/admin/components/AdminProvider';
import { Chips, Search, Stats } from '@/features/admin/components/AdminUI';

const filters = ['Todos', 'Platos', 'Bebidas', 'Insumos', 'Bajo'];

function InventoryRow({ product, onPress }) {
  const low = product.stock <= 3;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Registrar movimiento de ${product.name}`}
      onPress={onPress}
      className={`mb-2 flex-row items-center rounded-xl px-3 py-3 ${low ? 'bg-[#f6ded4]' : 'bg-white'} active:opacity-70`}
    >
      <View className="flex-1">
        <Text className="text-xs font-semibold text-[#332d28]">{product.name}</Text>
        <Text className={`mt-1 text-[9px] ${low ? 'font-semibold text-[#a35a45]' : 'text-[#8b8178]'}`}>
          {low ? 'Stock bajo' : product.category}
        </Text>
      </View>
      <Text className="w-12 text-center text-[10px] text-[#8b8178]">{product.stock + 12}</Text>
      <Text className={`w-12 text-center text-xs font-bold ${low ? 'text-[#a35a45]' : 'text-[#477052]'}`}>
        {product.stock}
      </Text>
      <Text className="w-12 text-center text-xs font-semibold text-[#456d8a]">
        {Math.max(0, Math.round(product.stock / 3))}
      </Text>
    </Pressable>
  );
}

export default function InventoryScreen() {
  const { products } = useAdmin();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Todos');
  const lowStock = products.filter((product) => product.stock <= 3).length;
  const shown = products.filter((product) => {
    const matchesSearch = product.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());
    const matchesFilter =
      filter === 'Todos' ||
      (filter === 'Bajo' && product.stock <= 3) ||
      product.category === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <AdminShell
      title="Inventario diario"
      subtitle="Jueves, 1 oct. · Actualizado 11:56"
      addLabel="Registrar movimiento"
      onAdd={() => router.push('/admin/movement')}
    >
      <Stats
        items={[
          { label: 'Disponibles', value: products.reduce((total, product) => total + product.stock, 0), tone: 'green', note: `${products.length} productos`, icon: 'products' },
          { label: 'Reservadas', value: '23', tone: 'blue', note: '8 pedidos activos', icon: 'qr' },
          { label: 'Alertas', value: lowStock, tone: 'peach', note: 'Reponer hoy', icon: 'panel' },
        ]}
      />
      <View className="mb-3 flex-row gap-2">
        <View className="flex-1">
          <Search value={search} onChange={setSearch} placeholder="Buscar producto" />
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/admin/movement')}
          className="h-12 flex-row items-center rounded-xl bg-[#b7472a] px-3 active:opacity-80"
        >
          <Text className="mr-1 text-base text-white">＋</Text>
          <Text className="text-[10px] font-semibold text-white">Movimiento</Text>
        </Pressable>
      </View>
      <Chips
        items={filters.map((item) => ({ value: item, label: item }))}
        value={filter}
        onChange={setFilter}
      />
      <View className="mb-2 flex-row px-3">
        <Text className="flex-1 text-[9px] font-semibold uppercase text-[#8b8178]">Producto</Text>
        <Text className="w-12 text-center text-[9px] font-semibold uppercase text-[#8b8178]">Inicial</Text>
        <Text className="w-12 text-center text-[9px] font-semibold uppercase text-[#8b8178]">Disp.</Text>
        <Text className="w-12 text-center text-[9px] font-semibold uppercase text-[#8b8178]">Reserv.</Text>
      </View>
      {shown.map((product) => (
        <InventoryRow key={product.id} product={product} onPress={() => router.push({ pathname: '/admin/movement', params: { productId: product.id } })} />
      ))}
      {!shown.length ? (
        <View className="rounded-2xl bg-white px-5 py-8">
          <Text className="text-center text-sm font-semibold text-[#514941]">No encontramos productos</Text>
        </View>
      ) : null}
      <View className="mt-2 rounded-2xl bg-[#f6ded4] px-4 py-3">
        <Text className="text-xs font-semibold text-[#a35a45]">{lowStock} productos requieren atención</Text>
        <Text className="mt-1 text-[10px] text-[#a35a45]">Corrige el stock bajo antes del siguiente servicio.</Text>
      </View>
    </AdminShell>
  );
}
