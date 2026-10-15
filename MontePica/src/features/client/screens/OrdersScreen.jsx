import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomNavigation from '@/features/client/components/BottomNavigation';
import {
  confirmOrder,
  getCartTotal,
  updateCartQuantity,
  useOrderStore,
} from '@/features/client/data/orderStore';

function QuantityButton({ item, amount }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${amount < 0 ? 'Disminuir' : 'Aumentar'} cantidad de ${item.product.name}`}
      onPress={() => updateCartQuantity(item.key, item.quantity + amount)}
      className="h-7 w-7 items-center justify-center rounded-md bg-[#f5e7d5]"
    >
      <Text className="text-sm font-bold text-[#8e3b27]">{amount < 0 ? '−' : '+'}</Text>
    </Pressable>
  );
}

function CartView({ items }) {
  const total = getCartTotal();

  function handleConfirm() {
    confirmOrder();
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 }}
    >
      <View className="mb-5 flex-row items-center">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver al menú"
          onPress={() => router.replace('/menu')}
          className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-white"
        >
          <Text className="text-2xl text-[#75695f]">‹</Text>
        </Pressable>
        <View>
          <Text className="text-2xl font-bold text-[#332d28]">Tu pedido</Text>
          <Text className="mt-0.5 text-[11px] text-[#8b8178]">
            Mesa 08 · {items.length} productos
          </Text>
        </View>
      </View>

      {items.length ? (
        <>
          <View className="mb-4 rounded-xl bg-[#fff0e7] px-3 py-3">
            <Text className="text-[11px] font-semibold text-[#a85431]">Stock verificado</Text>
            <Text className="mt-1 text-[10px] text-[#a85431]">
              Revisa tus cantidades antes de reservar los productos.
            </Text>
          </View>

          {items.map((item) => (
            <View key={item.key} className="mb-3 rounded-2xl bg-white p-3">
          <View className="flex-row items-start">
            <View className="mr-3 h-12 w-12 items-center justify-center rounded-xl bg-[#fff0e7]">
              <Text className="text-2xl">{item.product.icon}</Text>
            </View>
            <View className="flex-1">
              <View className="flex-row justify-between">
                <Text className="mr-2 flex-1 text-xs font-semibold text-[#332d28]">
                  {item.product.name}
                </Text>
                <Text className="text-xs font-bold text-[#332d28]">
                  ${(Number(item.product.price.replace('$', '')) * item.quantity).toFixed(2)}
                </Text>
              </View>
              <Text className="mt-1 text-[10px] text-[#8b8178]">
                {item.spice ? `${item.spice} · ` : ''}{item.note || 'Sin nota para cocina'}
              </Text>
              <View className="mt-2 flex-row items-center">
                <QuantityButton item={item} amount={-1} />
                <Text className="w-8 text-center text-xs font-semibold text-[#514941]">
                  {item.quantity}
                </Text>
                <QuantityButton item={item} amount={1} />
              </View>
            </View>
          </View>
            </View>
          ))}

          <View className="rounded-2xl bg-white p-4">
        <View className="flex-row justify-between">
          <Text className="text-xs text-[#8b8178]">Subtotal</Text>
          <Text className="text-xs text-[#514941]">${total.toFixed(2)}</Text>
        </View>
        <View className="mt-2 flex-row justify-between border-b border-[#f0e6dc] pb-3">
          <Text className="text-xs text-[#8b8178]">Servicio</Text>
          <Text className="text-xs text-[#514941]">$0.00</Text>
        </View>
        <View className="mt-3 flex-row items-center justify-between">
          <Text className="text-base font-bold text-[#332d28]">Total</Text>
          <Text className="text-xl font-bold text-[#b7472a]">${total.toFixed(2)}</Text>
        </View>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={handleConfirm}
            className="mt-4 items-center rounded-xl bg-[#b7472a] px-4 py-4"
          >
            <Text className="text-sm font-bold text-white">Confirmar y reservar</Text>
          </Pressable>
        </>
      ) : (
        <View className="items-center rounded-2xl bg-white px-6 py-12">
          <Text className="text-4xl">🛒</Text>
          <Text className="mt-3 text-base font-bold text-[#332d28]">
            Tu pedido está vacío
          </Text>
          <Text className="mt-1 text-center text-xs text-[#8b8178]">
            Agrega ceviches o bebidas desde el menú para comenzar.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/menu')}
            className="mt-5 rounded-xl bg-[#b7472a] px-5 py-3"
          >
            <Text className="text-xs font-bold text-white">Ver menú</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

function TrackingView({ order }) {
  const steps = [
    ['Pedido confirmado', 'Ahora'],
    ['Aceptado por Ana', '11:44'],
    ['En preparación', '11:49'],
    ['Listo para servir', 'Próximo'],
    ['Entregado', '—'],
  ];

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 }}
    >
      <View className="mb-5 flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-bold text-[#332d28]">Tu pedido</Text>
          <Text className="mt-0.5 text-[11px] text-[#8b8178]">
            {order.table} · {order.createdAt}
          </Text>
        </View>
        <Text className="text-sm font-bold text-[#b7472a]">{order.id}</Text>
      </View>

      <View className="rounded-2xl bg-[#b7472a] p-4">
        <Text className="text-[10px] font-semibold text-white/75">ESTADO ACTUAL</Text>
        <Text className="mt-1 text-xl font-bold text-white">{order.status}</Text>
        <Text className="mt-1 text-[11px] text-white/80">Listo en 12–18 minutos</Text>
      </View>

      <Text className="mb-3 mt-5 text-sm font-semibold text-[#514941]">Seguimiento</Text>
      <View className="rounded-2xl bg-white p-4">
        {steps.map(([label, time], index) => {
          const isCurrent = index === 2;
          const isComplete = index < 3;

          return (
            <View key={label} className="flex-row">
              <View className="mr-3 w-5 items-center">
                <View
                  className={`h-4 w-4 rounded-full border-2 ${
                    isComplete ? 'border-[#b7472a] bg-[#b7472a]' : 'border-[#d9cec2] bg-white'
                  }`}
                />
                {index < steps.length - 1 ? (
                  <View className={`w-px flex-1 ${isComplete ? 'bg-[#b7472a]' : 'bg-[#e8ded3]'}`} />
                ) : null}
              </View>
              <View className="mb-5 flex-1 flex-row justify-between">
                <Text className={`text-xs ${isCurrent ? 'font-bold text-[#b7472a]' : 'text-[#514941]'}`}>
                  {label}
                </Text>
                <Text className="text-[10px] text-[#a79b90]">{time}</Text>
              </View>
            </View>
          );
        })}
      </View>

      <View className="mt-4 rounded-2xl bg-white p-4">
        <View className="flex-row justify-between">
          <Text className="text-sm font-semibold text-[#514941]">
            {order.items.length} productos
          </Text>
          <Text className="text-sm font-bold text-[#b7472a]">${order.total.toFixed(2)}</Text>
        </View>
        <Text className="mt-2 text-[11px] text-[#8b8178]">
          {order.items.map((item) => `${item.quantity}x ${item.product.name}`).join(' · ')}
        </Text>
      </View>

      <View className="mt-4 rounded-xl bg-[#e4efe2] px-3 py-3">
        <Text className="text-[11px] font-medium text-[#547353]">
          Cantidades reservadas. Tu pedido está confirmado y cocina ya tiene tus productos asignados.
        </Text>
      </View>

      <Pressable className="mt-3 items-center rounded-xl border border-[#eadfd2] bg-white px-4 py-3">
        <Text className="text-xs font-bold text-[#a85431]">Necesito ayuda</Text>
      </Pressable>
    </ScrollView>
  );
}

export default function OrdersScreen() {
  const { cartItems, activeOrder } = useOrderStore();

  return (
    <SafeAreaView className="flex-1 bg-[#fff8ef]">
      <View className="flex-1">
        {activeOrder ? <TrackingView order={activeOrder} /> : <CartView items={cartItems} />}
        <BottomNavigation
          activeTab="orders"
          onTabPress={(tab) => {
            if (tab === 'home') router.replace('/home');
            if (tab === 'menu') router.replace('/menu');
          }}
        />
      </View>
    </SafeAreaView>
  );
}
