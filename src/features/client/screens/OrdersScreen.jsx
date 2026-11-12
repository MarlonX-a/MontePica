import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomNavigation from '@/features/client/components/BottomNavigation';
import {
  confirmOrder,
  getCartTotal,
  updateCartQuantity,
  useOrderStore,
} from '@/features/client/data/orderStore';
import {
  formatOrderDate,
  formatOrderTotal,
  getOrderStatusLabel,
} from '@/features/client/data/orderMapper';
import useClientOrders from '@/features/client/hooks/useClientOrders';
import { logoutUser } from '@/shared/session/sessionStore';

function getCartKind(items) {
  if (!items.length) return 'empty';

  const services = new Set(items.map((item) => item.service));
  if (services.size !== 1) return 'mixed';

  if (services.has('delivery')) return 'delivery';
  if (services.has('dine-in')) {
    const visitIds = new Set(items.map((item) => item.visitId));
    return visitIds.size === 1 && items[0].visitId ? 'dine-in' : 'invalid';
  }

  return 'invalid';
}

function firstParam(value) {
  return Array.isArray(value) ? value[0] : value;
}

function getSubmitLabel(cartKind, total, submitting) {
  if (submitting) return 'Enviando…';
  if (cartKind === 'dine-in') return `Enviar pedido · $${total.toFixed(2)}`;
  if (cartKind === 'delivery') return 'Confirmar demostración local';
  return 'Revisa los productos del carrito';
}

function QuantityButton({ item, amount, disabled }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${amount < 0 ? 'Disminuir' : 'Aumentar'} cantidad de ${item.product.name}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => updateCartQuantity(item.key, item.quantity + amount)}
      className={`h-8 w-8 items-center justify-center rounded-lg ${disabled ? 'bg-[#f4eee5]' : 'bg-[#f5e7d5]'}`}
    >
      <Text
        className={`text-base font-bold ${disabled ? 'text-[#c6b9aa]' : 'text-[#8e3b27]'}`}
      >
        {amount < 0 ? '−' : '+'}
      </Text>
    </Pressable>
  );
}

function CartItem({ item, locked }) {
  const unitPrice = Number(item.product.priceCents ?? 0) / 100;

  return (
    <View className="mb-3 rounded-2xl bg-white p-3">
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
              ${(unitPrice * item.quantity).toFixed(2)}
            </Text>
          </View>
          <Text className="mt-1 text-[10px] text-[#8b8178]">
            {item.spice ? `${item.spice} · ` : ''}
            {item.note || 'Sin nota para cocina'}
          </Text>
          <View className="mt-2 flex-row items-center">
            <QuantityButton item={item} amount={-1} disabled={locked} />
            <Text className="w-9 text-center text-xs font-semibold text-[#514941]">
              {item.quantity}
            </Text>
            <QuantityButton item={item} amount={1} disabled={locked} />
          </View>
        </View>
      </View>
    </View>
  );
}

function ActionButton({ label, onPress, disabled = false, secondary = false }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={`mt-3 min-h-11 items-center justify-center rounded-xl px-4 ${secondary ? 'border border-[#eadfd2] bg-white' : 'bg-[#b7472a]'} ${disabled ? 'opacity-50' : ''}`}
    >
      <Text
        className={`text-xs font-bold ${secondary ? 'text-[#a85431]' : 'text-white'}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function CartSection({
  items,
  pendingSubmission,
  ordersState,
  activeOrder,
  onSubmit,
  onRetry,
  onBackToMenu,
}) {
  const cartKind = getCartKind(items);
  const total = getCartTotal();
  const locked = Boolean(pendingSubmission || ordersState.submitting);
  let contextLabel = 'Agrega productos para empezar';

  if (cartKind === 'dine-in') {
    contextLabel = `${items[0].table || 'Servicio en salón'} · ${items.length} productos`;
  } else if (cartKind === 'delivery') {
    contextLabel = `Domicilio · ${items.length} productos`;
  } else if (cartKind === 'mixed' || cartKind === 'invalid') {
    contextLabel =
      'Revisa el servicio y la visita de los productos del carrito.';
  }

  return (
    <View className="mb-6">
      <View className="mb-4">
        <Text className="text-2xl font-bold text-[#332d28]">Tu pedido</Text>
        <Text className="mt-1 text-[11px] text-[#8b8178]">{contextLabel}</Text>
      </View>

      {items.length ? (
        <>
          <View className="mb-4 rounded-xl bg-[#fff0e7] px-3 py-3">
            <Text className="text-[11px] font-semibold text-[#a85431]">
              El inventario se comprobará al enviar
            </Text>
            <Text className="mt-1 text-[10px] text-[#a85431]">
              El servidor confirma disponibilidad y calcula el total final.
            </Text>
          </View>

          {items.map((item) => (
            <CartItem key={item.key} item={item} locked={locked} />
          ))}

          <View className="rounded-2xl bg-white p-4">
            <View className="flex-row justify-between">
              <Text className="text-xs text-[#8b8178]">Subtotal estimado</Text>
              <Text className="text-xs text-[#514941]">
                ${total.toFixed(2)}
              </Text>
            </View>
            <View className="mt-3 flex-row items-center justify-between border-t border-[#f0e6dc] pt-3">
              <Text className="text-base font-bold text-[#332d28]">
                Total estimado
              </Text>
              <Text className="text-xl font-bold text-[#b7472a]">
                ${total.toFixed(2)}
              </Text>
            </View>
          </View>

          {cartKind === 'dine-in' ? (
            <Text className="mt-3 text-[10px] leading-4 text-[#81766d]">
              Para enviar el pedido, el backend comprobará que tu participación
              esté aprobada, la cuenta siga abierta y exista inventario
              disponible.
            </Text>
          ) : null}

          {cartKind === 'delivery' ? (
            <View className="mt-3 rounded-xl bg-[#f4eee5] px-3 py-3">
              <Text className="text-[10px] leading-4 text-[#75695f]">
                Los pedidos a domicilio todavía no están conectados al backend.
                Esta confirmación se conserva como demostración local.
              </Text>
            </View>
          ) : null}

          {cartKind === 'mixed' || cartKind === 'invalid' ? (
            <Text
              accessibilityRole="alert"
              className="mt-3 text-xs leading-5 text-[#b7472a]"
            >
              No se puede enviar un carrito que mezcle servicios o visitas.
              Quita los productos que no pertenezcan al mismo servicio y visita.
            </Text>
          ) : null}

          {ordersState.submitError ? (
            <View className="mt-3 rounded-xl bg-[#fde7e3] px-3 py-3">
              <Text
                accessibilityRole="alert"
                className="text-xs leading-5 text-[#a83224]"
              >
                {ordersState.submitError}
              </Text>
              {ordersState.submitErrorStatus === 401 ? (
                <ActionButton
                  label="Volver a iniciar sesión"
                  onPress={async () => {
                    await logoutUser();
                    router.replace('/(auth)/login');
                  }}
                />
              ) : null}
            </View>
          ) : null}

          {pendingSubmission ? (
            <View className="mt-3 rounded-xl bg-[#fff0e7] px-3 py-3">
              <Text className="text-[11px] font-semibold text-[#a85431]">
                {pendingSubmission.status === 'sending'
                  ? 'Enviando pedido…'
                  : 'Resultado del envío sin confirmar'}
              </Text>
              <Text className="mt-1 text-[10px] leading-4 text-[#75695f]">
                {pendingSubmission.status === 'sending'
                  ? 'Espera la respuesta del servidor.'
                  : 'Puedes reintentar. Se enviará el mismo pedido con la misma clave para evitar duplicados.'}
              </Text>
              {pendingSubmission.status === 'uncertain' ? (
                <ActionButton
                  label="Reintentar el mismo pedido"
                  onPress={onRetry}
                />
              ) : null}
            </View>
          ) : null}

          {!pendingSubmission ? (
            <ActionButton
              label={getSubmitLabel(cartKind, total, ordersState.submitting)}
              disabled={
                ordersState.submitting ||
                !['dine-in', 'delivery'].includes(cartKind)
              }
              onPress={() => {
                if (cartKind === 'dine-in') void onSubmit(items);
                if (cartKind === 'delivery') confirmOrder();
              }}
            />
          ) : null}
        </>
      ) : (
        <View className="items-center rounded-2xl bg-white px-6 py-9">
          <Text className="text-4xl">🛒</Text>
          <Text className="mt-3 text-base font-bold text-[#332d28]">
            Tu pedido está vacío
          </Text>
          <Text className="mt-1 text-center text-xs leading-5 text-[#8b8178]">
            Agrega ceviches o bebidas desde el menú para comenzar.
          </Text>
          <ActionButton label="Ver menú" onPress={onBackToMenu} />
        </View>
      )}

      {activeOrder ? (
        <View className="mt-4 rounded-2xl border border-[#eadfd2] bg-white p-4">
          <Text className="text-[10px] font-bold tracking-wide text-[#a85431]">
            DEMOSTRACIÓN LOCAL
          </Text>
          <Text className="mt-1 text-sm font-bold text-[#332d28]">
            Pedido {activeOrder.id} · {activeOrder.status}
          </Text>
          <Text className="mt-1 text-[10px] leading-4 text-[#81766d]">
            Este pedido de domicilio solo se guardó en memoria; no fue enviado
            al restaurante.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function OrderCard({ order }) {
  const quantity = order.items.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0,
  );
  const shortId = order.id ? order.id.slice(0, 8).toUpperCase() : '—';

  return (
    <View className="mb-3 rounded-2xl bg-white p-4">
      <View className="flex-row items-start justify-between">
        <View className="mr-3 flex-1">
          <Text className="text-[10px] font-semibold text-[#8b8178]">
            PEDIDO · {shortId}
          </Text>
          <Text className="mt-1 text-sm font-bold text-[#332d28]">
            {getOrderStatusLabel(order.status)}
          </Text>
        </View>
        <Text className="text-sm font-bold text-[#b7472a]">
          {formatOrderTotal(order.totalCents, order.currency)}
        </Text>
      </View>
      <Text className="mt-2 text-[10px] text-[#8b8178]">
        {formatOrderDate(order.submittedAt)} · {order.items.length} productos ·{' '}
        {quantity} unidades
      </Text>
    </View>
  );
}

function OrderHistory({ ordersState }) {
  return (
    <View className="mb-6">
      <View className="mb-3 flex-row items-center justify-between">
        <View>
          <Text className="text-lg font-bold text-[#332d28]">
            Pedidos del local
          </Text>
          <Text className="mt-0.5 text-[10px] text-[#8b8178]">
            {ordersState.total} pedidos registrados por el servidor
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Actualizar pedidos"
          disabled={
            ordersState.loading ||
            ordersState.refreshing ||
            ordersState.loadingMore
          }
          onPress={() => void ordersState.refresh()}
          className="rounded-lg bg-white px-3 py-2"
        >
          <Text className="text-[10px] font-semibold text-[#a85431]">
            {ordersState.refreshing ? 'Actualizando…' : 'Actualizar'}
          </Text>
        </Pressable>
      </View>

      {ordersState.notice ? (
        <View className="mb-3 rounded-xl bg-[#e4efe2] px-3 py-3">
          <Text
            accessibilityRole="alert"
            className="text-xs leading-5 text-[#547353]"
          >
            {ordersState.notice}
          </Text>
        </View>
      ) : null}

      {ordersState.loading ? (
        <View className="items-center rounded-2xl bg-white px-5 py-7">
          <ActivityIndicator color="#b7472a" />
          <Text className="mt-2 text-xs text-[#8b8178]">
            Consultando tus pedidos…
          </Text>
        </View>
      ) : null}

      {ordersState.loadError ? (
        <View className="rounded-2xl bg-[#fde7e3] p-4">
          <Text
            accessibilityRole="alert"
            className="text-xs leading-5 text-[#a83224]"
          >
            {ordersState.loadError}
          </Text>
          {ordersState.loadErrorStatus === 401 ? (
            <ActionButton
              label="Volver a iniciar sesión"
              onPress={async () => {
                await logoutUser();
                router.replace('/(auth)/login');
              }}
            />
          ) : (
            <ActionButton
              label="Reintentar consulta"
              secondary
              onPress={() => void ordersState.refresh()}
            />
          )}
        </View>
      ) : null}

      {!ordersState.loading &&
      !ordersState.loadError &&
      !ordersState.orders.length ? (
        <View className="rounded-2xl bg-white px-5 py-7">
          <Text className="text-center text-xs text-[#8b8178]">
            Todavía no tienes pedidos registrados en el local.
          </Text>
        </View>
      ) : null}

      {ordersState.orders.map((order) => (
        <OrderCard key={order.id} order={order} />
      ))}

      {ordersState.hasMore ? (
        <ActionButton
          label={
            ordersState.loadingMore ? 'Cargando…' : 'Ver pedidos anteriores'
          }
          secondary
          disabled={ordersState.loadingMore}
          onPress={() => void ordersState.loadMore()}
        />
      ) : null}
    </View>
  );
}

export default function OrdersScreen() {
  const params = useLocalSearchParams();
  const { cartItems, activeOrder, pendingSubmission } = useOrderStore();
  const ordersState = useClientOrders();
  const routeService = firstParam(params.service);
  const routeTable = firstParam(params.table);
  const routeVisitId = firstParam(params.visitId);
  const menuContext = cartItems[0] ?? {
    service: routeService,
    table: routeTable,
    visitId: routeVisitId,
  };

  function goToMenu() {
    const menuParams = Object.fromEntries(
      Object.entries({
        service: menuContext.service,
        table: menuContext.table,
        visitId: menuContext.visitId,
      }).filter(([, value]) => typeof value === 'string' && value.length > 0),
    );

    router.replace({ pathname: '/menu', params: menuParams });
  }

  return (
    <SafeAreaView className="flex-1 bg-[#fff8ef]">
      <View className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 24,
          }}
        >
          <CartSection
            items={cartItems}
            pendingSubmission={pendingSubmission}
            ordersState={ordersState}
            activeOrder={activeOrder}
            onSubmit={ordersState.submitVisitOrder}
            onRetry={ordersState.retrySubmission}
            onBackToMenu={goToMenu}
          />
          <OrderHistory ordersState={ordersState} />
        </ScrollView>
        <BottomNavigation
          activeTab="orders"
          onTabPress={(tab) => {
            if (tab === 'home') router.replace('/home');
            if (tab === 'menu') goToMenu();
          }}
        />
      </View>
    </SafeAreaView>
  );
}
