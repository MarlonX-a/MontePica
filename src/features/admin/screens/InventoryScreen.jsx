import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import AdminShell from '@/features/admin/components/AdminShell';
import { Button, Chips, Empty, Search, Stats } from '@/features/admin/components/AdminUI';
import {
  getCurrentOperatingState,
  getInventoryApiError,
  getOperatingInventory,
  openCurrentOperatingDay,
} from '@/features/admin/api/inventoryAdminApi';
import { getAdminCategories } from '@/features/admin/api/catalogAdminApi';
import { mapInventoryItem } from '@/features/admin/data/inventoryMapper';
import { getCurrentUser } from '@/shared/session/sessionStore';

function InventoryRow({ item, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        item.initialized
          ? `Registrar movimiento de ${item.name}`
          : `Inicializar inventario de ${item.name}`
      }
      onPress={onPress}
      className="mb-2 flex-row items-center rounded-xl bg-white px-3 py-3 active:opacity-70"
    >
      <View className="flex-1">
        <Text className="text-xs font-semibold text-[#332d28]">{item.name}</Text>
        <Text className="mt-1 text-[9px] text-[#8b8178]">
          {item.initialized ? item.category : 'Sin inicializar'}
        </Text>
      </View>
      <Text className="w-12 text-center text-[10px] text-[#8b8178]">
        {item.initialQuantity ?? '—'}
      </Text>
      <Text className="w-12 text-center text-xs font-bold text-[#477052]">
        {item.availableQuantity ?? '—'}
      </Text>
      <Text className="w-12 text-center text-xs font-semibold text-[#456d8a]">
        {item.reservedQuantity ?? '—'}
      </Text>
    </Pressable>
  );
}

export default function InventoryScreen() {
  const [operatingDay, setOperatingDay] = useState(null);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Todos');
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState('');
  const canOpenDay = getCurrentUser()?.permissions?.includes('operations.open');

  const loadInventory = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const state = await getCurrentOperatingState();
      setOperatingDay(state.operatingDay);
      if (!state.operatingDay) {
        setItems([]);
        setCategories([]);
        return;
      }

      const [inventory, apiCategories] = await Promise.all([
        getOperatingInventory(state.operatingDay.id),
        getAdminCategories(),
      ]);
      setCategories(apiCategories);
      setItems(inventory.map((item) => mapInventoryItem(item, apiCategories)));
    } catch (requestError) {
      setError(getInventoryApiError(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  async function openDay() {
    setOpening(true);
    setError('');
    try {
      await openCurrentOperatingDay();
      await loadInventory();
    } catch (requestError) {
      setError(getInventoryApiError(requestError));
    } finally {
      setOpening(false);
    }
  }

  const pendingCount = items.filter((item) => !item.initialized).length;
  const availableCount = items.reduce(
    (total, item) => total + (item.availableQuantity || 0),
    0,
  );
  const reservedCount = items.reduce(
    (total, item) => total + (item.reservedQuantity || 0),
    0,
  );
  const filters = [
    { value: 'Todos', label: `Todos ${items.length}` },
    ...categories.map((category) => ({
      value: category.id,
      label: category.name,
    })),
    { value: 'Pendientes', label: `Sin inicializar ${pendingCount}` },
  ];
  const shown = items.filter((item) => {
    const matchesSearch = item.name
      .toLocaleLowerCase()
      .includes(search.trim().toLocaleLowerCase());
    const matchesFilter =
      filter === 'Todos' ||
      (filter === 'Pendientes'
        ? !item.initialized
        : item.categoryId === filter);
    return matchesSearch && matchesFilter;
  });
  const isOpen = operatingDay?.status === 'open';

  function goToMovement(item) {
    router.push({
      pathname: '/admin/movement',
      params: { dayId: operatingDay.id, productId: item.id },
    });
  }

  return (
    <AdminShell
      title="Inventario diario"
      subtitle={
        operatingDay
          ? `Jornada ${operatingDay.businessDate} · ${isOpen ? 'Abierta' : 'Cerrada'}`
          : 'Sin jornada operativa para hoy'
      }
      addLabel={
        isOpen
          ? 'Registrar movimiento'
          : operatingDay
            ? 'Jornada cerrada'
            : canOpenDay
              ? 'Abrir jornada'
              : 'Sin jornada'
      }
      onAdd={
        isOpen
          ? () => router.push('/admin/movement')
          : !operatingDay && canOpenDay
            ? openDay
            : undefined
      }
    >
      {loading ? (
        <View className="items-center rounded-2xl bg-white px-5 py-10">
          <ActivityIndicator color="#b7472a" />
          <Text className="mt-3 text-xs text-[#8b8178]">
            Consultando inventario del servidor…
          </Text>
        </View>
      ) : error ? (
        <View className="rounded-2xl bg-white p-5">
          <Text accessibilityRole="alert" className="mb-3 text-sm text-[#b7472a]">
            {error}
          </Text>
          <Button onPress={loadInventory}>Reintentar</Button>
        </View>
      ) : !operatingDay ? (
        <View className="rounded-2xl bg-white p-5">
          <Text className="mb-2 text-sm font-semibold text-[#332d28]">
            No hay una jornada abierta
          </Text>
          <Text className="mb-4 text-xs leading-5 text-[#8b8178]">
            Abre la jornada de hoy para consultar e inicializar las existencias.
          </Text>
          {canOpenDay ? (
            <Button onPress={openDay}>
              {opening ? 'Abriendo jornada…' : 'Abrir jornada'}
            </Button>
          ) : (
            <Text className="text-xs text-[#8b8178]">
              Tu cuenta no tiene permiso para abrir la jornada.
            </Text>
          )}
        </View>
      ) : (
        <>
          <Stats
            items={[
              { label: 'Disponibles', value: availableCount, tone: 'green', note: `${items.length} productos`, icon: 'products' },
              { label: 'Reservadas', value: reservedCount, tone: 'blue', note: 'En la jornada actual', icon: 'qr' },
              { label: 'Pendientes', value: pendingCount, tone: 'peach', note: 'Sin inicializar', icon: 'panel' },
            ]}
          />
          <View className="mb-3 flex-row gap-2">
            <View className="flex-1">
              <Search value={search} onChange={setSearch} placeholder="Buscar producto" />
            </View>
            {isOpen ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/admin/movement')}
                className="h-12 flex-row items-center rounded-xl bg-[#b7472a] px-3 active:opacity-80"
              >
                <Text className="mr-1 text-base text-white">＋</Text>
                <Text className="text-[10px] font-semibold text-white">Movimiento</Text>
              </Pressable>
            ) : null}
          </View>
          <Chips items={filters} value={filter} onChange={setFilter} />
          <View className="mb-2 flex-row px-3">
            <Text className="flex-1 text-[9px] font-semibold uppercase text-[#8b8178]">Producto</Text>
            <Text className="w-12 text-center text-[9px] font-semibold uppercase text-[#8b8178]">Inicial</Text>
            <Text className="w-12 text-center text-[9px] font-semibold uppercase text-[#8b8178]">Disp.</Text>
            <Text className="w-12 text-center text-[9px] font-semibold uppercase text-[#8b8178]">Reserv.</Text>
          </View>
          {shown.map((item) => (
            <InventoryRow
              key={item.id}
              item={item}
              onPress={isOpen ? () => goToMovement(item) : undefined}
            />
          ))}
          {!shown.length ? <Empty>No hay productos para mostrar en este filtro.</Empty> : null}
          {!isOpen ? (
            <View className="mt-2 rounded-2xl bg-[#fff0c7] px-4 py-3">
              <Text className="text-xs font-semibold text-[#9c7b31]">
                La jornada está cerrada
              </Text>
              <Text className="mt-1 text-[10px] text-[#9c7b31]">
                El inventario se puede consultar, pero no modificar.
              </Text>
            </View>
          ) : null}
        </>
      )}
    </AdminShell>
  );
}
