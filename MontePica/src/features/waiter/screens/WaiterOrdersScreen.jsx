import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { logoutUser } from '@/shared/session/sessionStore';

const initialOrders = [
  {
    id: '#1051',
    table: 'Mesa 12',
    customer: 'Carlos Zamora',
    createdAt: 'hace 12 min',
    status: 'Pendiente',
    total: '$23.75',
    items: [
      { quantity: 2, name: 'Encebollado manabita', note: 'Ají aparte', price: '$11.00' },
      { quantity: 1, name: 'Ceviche de camarón', note: 'Sin cebolla · suave', price: '$8.75' },
      { quantity: 2, name: 'Cola 500 ml', note: 'Bien fría', price: '$4.00' },
    ],
  },
  {
    id: '#1050',
    table: 'Mesa 03',
    customer: 'Andrea Mera',
    createdAt: 'hace 18 min',
    status: 'En preparación',
    total: '$19.00',
    items: [
      { quantity: 1, name: 'Ceviche mixto', note: 'Picante medio', price: '$9.50' },
      { quantity: 2, name: 'Jugo de maracuyá', note: 'Natural', price: '$4.50' },
      { quantity: 1, name: 'Ceviche de pescado', note: 'Sin cilantro', price: '$6.50' },
    ],
  },
  {
    id: '#1049',
    table: 'Mesa 06',
    customer: 'Luis Cedeño',
    createdAt: 'hace 25 min',
    status: 'Listo',
    total: '$6.50',
    items: [
      { quantity: 1, name: 'Ceviche de pescado', note: 'Preparación tradicional', price: '$6.50' },
    ],
  },
];

const statusStyles = {
  Pendiente: { background: '#fff0cf', text: '#9a6700' },
  Aceptado: { background: '#e7efff', text: '#4169a1' },
  'En preparación': { background: '#fbe5d8', text: '#a85431' },
  Listo: { background: '#e2f0df', text: '#4f8156' },
  Rechazado: { background: '#f7dddd', text: '#a34444' },
};

function StatusBadge({ status }) {
  const colors = statusStyles[status] || statusStyles.Pendiente;

  return (
    <Text
      className="rounded-full px-2 py-1 text-[10px] font-semibold"
      style={{ backgroundColor: colors.background, color: colors.text }}
    >
      {status}
    </Text>
  );
}

function OrderCard({ order, onPress, onAccept, onReject }) {
  const isPending = order.status === 'Pendiente';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ver detalle del pedido ${order.id}`}
      onPress={onPress}
      className="mb-3 rounded-2xl border border-[#eadfd2] bg-white p-3"
    >
      <View className="flex-row items-start justify-between">
        <View>
          <Text className="text-xs font-bold text-[#332d28]">{order.id}</Text>
          <Text className="mt-1 text-[11px] text-[#8b8178]">{order.table}</Text>
        </View>
        <View className="items-end">
          <StatusBadge status={order.status} />
          <Text className="mt-2 text-sm font-bold text-[#332d28]">{order.total}</Text>
        </View>
      </View>
      <Text className="mt-2 text-[11px] text-[#70665e]" numberOfLines={1}>
        {order.items.map((item) => `${item.quantity}x ${item.name}`).join(' · ')}
      </Text>
      <Text className="mt-1 text-[10px] text-[#a79b90]">{order.createdAt}</Text>
      {isPending ? (
        <View className="mt-3 flex-row">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Rechazar pedido ${order.id}`}
            onPress={(event) => {
              event.stopPropagation();
              onReject();
            }}
            className="mr-2 flex-1 items-center rounded-lg border border-[#eadfd2] px-3 py-2"
          >
            <Text className="text-[11px] font-bold text-[#a85431]">Rechazar</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Aceptar pedido ${order.id}`}
            onPress={(event) => {
              event.stopPropagation();
              onAccept();
            }}
            className="flex-1 items-center rounded-lg bg-[#b7472a] px-3 py-2"
          >
            <Text className="text-[11px] font-bold text-white">Aceptar</Text>
          </Pressable>
        </View>
      ) : null}
    </Pressable>
  );
}

function OrderDetail({ order, onBack, onAccept, onReject }) {
  const isPending = order.status === 'Pendiente';

  return (
    <SafeAreaView className="flex-1 bg-[#fff8ef]">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 }}
      >
        <View className="mb-5 flex-row items-center">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Volver a pedidos"
            onPress={onBack}
            className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-white"
          >
            <Text className="text-2xl text-[#75695f]">‹</Text>
          </Pressable>
          <View>
            <Text className="text-xl font-bold text-[#332d28]">Detalle del pedido</Text>
            <Text className="mt-0.5 text-[11px] text-[#8b8178]">Pedido {order.id}</Text>
          </View>
        </View>

        <View className="rounded-2xl bg-white p-4">
          <View className="flex-row items-start justify-between">
            <View>
              <Text className="text-lg font-bold text-[#332d28]">{order.table}</Text>
              <Text className="mt-1 text-xs text-[#8b8178]">
                {order.customer} · {order.createdAt}
              </Text>
            </View>
            <StatusBadge status={order.status} />
          </View>

          <View className="mt-5 border-t border-[#f0e6dc] pt-4">
            <Text className="mb-3 text-sm font-semibold text-[#514941]">Productos</Text>
            {order.items.map((item) => (
              <View key={`${item.name}-${item.quantity}`} className="mb-3 flex-row items-start">
                <View className="mr-2 h-7 w-7 items-center justify-center rounded-lg bg-[#fff0e7]">
                  <Text className="text-[10px] font-bold text-[#b7472a]">{item.quantity}x</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-semibold text-[#332d28]">{item.name}</Text>
                  <Text className="mt-0.5 text-[10px] text-[#8b8178]">{item.note}</Text>
                </View>
                <Text className="text-xs font-semibold text-[#514941]">{item.price}</Text>
              </View>
            ))}
          </View>

          <View className="mt-1 flex-row items-center justify-between border-t border-[#f0e6dc] pt-4">
            <Text className="text-sm font-semibold text-[#514941]">Total</Text>
            <Text className="text-xl font-bold text-[#b7472a]">{order.total}</Text>
          </View>
        </View>

        <View className="mt-4 rounded-xl bg-[#e4efe2] px-3 py-3">
          <Text className="text-[11px] font-medium text-[#547353]">
            Stock verificado · Las unidades se reservarán al aceptar.
          </Text>
        </View>

        {isPending ? (
          <View className="mt-4 flex-row">
            <Pressable
              accessibilityRole="button"
              onPress={onReject}
              className="mr-2 flex-1 items-center rounded-xl border border-[#eadfd2] bg-white px-4 py-3"
            >
              <Text className="text-xs font-bold text-[#a85431]">Rechazar</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onAccept}
              className="flex-1 items-center rounded-xl bg-[#b7472a] px-4 py-3"
            >
              <Text className="text-xs font-bold text-white">Aceptar pedido</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function handleLogout() {
  logoutUser();
  router.replace('/(auth)/login');
}

export default function WaiterOrdersScreen() {
  const [orders, setOrders] = useState(initialOrders);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('Todos');

  const selectedOrder = orders.find((order) => order.id === selectedOrderId);
  const visibleOrders = useMemo(
    () =>
      orders.filter(
        (order) => selectedFilter === 'Todos' || order.status === selectedFilter,
      ),
    [orders, selectedFilter],
  );

  function updateOrder(orderId, status) {
    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        order.id === orderId ? { ...order, status } : order,
      ),
    );
  }

  if (selectedOrder) {
    return (
      <OrderDetail
        order={selectedOrder}
        onBack={() => setSelectedOrderId(null)}
        onAccept={() => updateOrder(selectedOrder.id, 'Aceptado')}
        onReject={() => updateOrder(selectedOrder.id, 'Rechazado')}
      />
    );
  }

  const filters = ['Todos', 'Pendiente', 'En preparación', 'Listo'];
  const pendingCount = orders.filter((order) => order.status === 'Pendiente').length;
  const kitchenCount = orders.filter((order) => order.status === 'En preparación').length;

  return (
    <SafeAreaView className="flex-1 bg-[#fff8ef]">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 }}
      >
        <View className="mb-4 flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-bold text-[#332d28]">Pedidos</Text>
            <Text className="mt-1 text-[11px] text-[#8b8178]">Turno de hoy · 11:58</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar sesión"
            onPress={handleLogout}
            className="h-10 w-10 items-center justify-center rounded-full bg-white"
          >
            <Text className="text-base text-[#b7472a]">↪</Text>
          </Pressable>
        </View>

        <View className="mb-4 flex-row">
          <View className="mr-2 flex-1 rounded-xl bg-white p-3">
            <Text className="text-[10px] text-[#8b8178]">Pendientes</Text>
            <Text className="mt-1 text-xl font-bold text-[#332d28]">{pendingCount}</Text>
            <Text className="text-[10px] text-[#b7472a]">Requieren atención</Text>
          </View>
          <View className="flex-1 rounded-xl bg-white p-3">
            <Text className="text-[10px] text-[#8b8178]">En cocina</Text>
            <Text className="mt-1 text-xl font-bold text-[#332d28]">{kitchenCount}</Text>
            <Text className="text-[10px] text-[#8b8178]">En preparación</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
          {filters.map((filter) => (
            <Pressable
              key={filter}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedFilter === filter }}
              onPress={() => setSelectedFilter(filter)}
              className={`mr-2 rounded-full px-3 py-2 ${
                selectedFilter === filter ? 'bg-[#8e3b27]' : 'bg-white'
              }`}
            >
              <Text
                className={`text-[10px] font-semibold ${
                  selectedFilter === filter ? 'text-white' : 'text-[#70665e]'
                }`}
              >
                {filter}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {visibleOrders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            onPress={() => setSelectedOrderId(order.id)}
            onAccept={() => updateOrder(order.id, 'Aceptado')}
            onReject={() => updateOrder(order.id, 'Rechazado')}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
