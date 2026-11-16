import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { logoutUser, getCurrentUser } from '@/shared/session/sessionStore';
import useWaiterOrders from '@/features/waiter/hooks/useWaiterOrders';

const filters = [
  { label: 'Todos', status: '' },
  { label: 'Recibidos', status: 'submitted' },
  { label: 'En preparación', status: 'preparing' },
  { label: 'Listos', status: 'ready' },
  { label: 'Entregados', status: 'delivered' },
  { label: 'Cancelados', status: 'cancelled' },
];

const statusStyles = {
  submitted: { background: '#fff0cf', text: '#9a6700' },
  preparing: { background: '#fbe5d8', text: '#a85431' },
  ready: { background: '#e2f0df', text: '#4f8156' },
  delivered: { background: '#e7efff', text: '#4169a1' },
  cancelled: { background: '#f7dddd', text: '#a34444' },
};

const actions = {
  'start-preparation': { label: 'Iniciar preparación' },
  cancel: { label: 'Cancelar pedido' },
  ready: { label: 'Marcar listo' },
  deliver: { label: 'Marcar entregado' },
};

function StatusBadge({ status, label }) {
  const colors = statusStyles[status] || statusStyles.submitted;
  return (
    <Text
      className="rounded-full px-2 py-1 text-[10px] font-semibold"
      style={{ backgroundColor: colors.background, color: colors.text }}
    >
      {label}
    </Text>
  );
}

function ActionButton({ label, onPress, secondary = false, disabled = false }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={`items-center rounded-xl px-4 py-3 ${secondary ? 'border border-[#eadfd2] bg-white' : 'bg-[#b7472a]'} ${disabled ? 'opacity-50' : ''}`}
    >
      <Text className={`text-xs font-bold ${secondary ? 'text-[#a85431]' : 'text-white'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

function OrderCard({ order, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ver detalle del pedido ${order.displayId}`}
      onPress={onPress}
      className="mb-3 rounded-2xl border border-[#eadfd2] bg-white p-3"
    >
      <View className="flex-row items-start justify-between">
        <View className="mr-2 flex-1">
          <Text className="text-xs font-bold text-[#332d28]">Pedido {order.displayId}</Text>
          <Text className="mt-1 text-[11px] text-[#8b8178]">{order.tableLabel}</Text>
        </View>
        <View className="items-end">
          <StatusBadge status={order.status} label={order.statusLabel} />
          <Text className="mt-2 text-sm font-bold text-[#332d28]">{order.totalLabel}</Text>
        </View>
      </View>
      <Text className="mt-2 text-[11px] text-[#70665e]" numberOfLines={1}>
        {order.items.map((item) => `${item.quantity}× ${item.name}`).join(' · ')}
      </Text>
      <Text className="mt-1 text-[10px] text-[#a79b90]">{order.submittedLabel}</Text>
    </Pressable>
  );
}

function Notice({ children, error = false }) {
  if (!children) return null;
  return (
    <View className={`mb-3 rounded-xl px-3 py-3 ${error ? 'bg-[#f7dddd]' : 'bg-[#fff0cf]'}`}>
      <Text className={`text-xs ${error ? 'text-[#a34444]' : 'text-[#795817]'}`}>{children}</Text>
    </View>
  );
}

function PendingOperationPanel({ state }) {
  if (!state.pendingOperation) return null;
  return (
    <View className="mb-3 rounded-xl bg-[#fff0cf] p-3">
      <Text className="mb-2 text-xs font-semibold text-[#795817]">
        El resultado todavía no está confirmado. Puedes revisar el estado del pedido o repetir la misma operación.
      </Text>
      <View className="flex-row">
        <View className="mr-2 flex-1">
          <ActionButton label={state.reconciling ? 'Consultando…' : 'Consultar estado'} secondary disabled={state.reconciling || state.busy} onPress={state.reconcilePending} />
        </View>
        <View className="flex-1">
          <ActionButton label={state.busy ? 'Enviando…' : 'Reintentar operación'} disabled={state.reconciling || state.busy} onPress={state.retryPending} />
        </View>
      </View>
    </View>
  );
}

function OrderInformation({ order }) {
  return (
    <View className="rounded-2xl bg-white p-4">
      <View className="flex-row items-start justify-between">
        <View className="mr-2 flex-1">
          <Text className="text-lg font-bold text-[#332d28]">{order.tableLabel}</Text>
          <Text className="mt-1 text-xs text-[#8b8178]">Recibido: {order.submittedLabel}</Text>
          {order.tableUnavailable ? (
            <Text className="mt-1 text-[10px] text-[#a85431]">
              {order.visitId
                ? `El código de mesa no está disponible. Referencia de visita: ${order.visitId}`
                : 'No hay una referencia de mesa disponible para este pedido.'}
            </Text>
          ) : null}
          <Text className="mt-1 text-[10px] text-[#a79b90]">Versión {order.version}</Text>
        </View>
        <StatusBadge status={order.status} label={order.statusLabel} />
      </View>
      <View className="mt-5 border-t border-[#f0e6dc] pt-4">
        <Text className="mb-3 text-sm font-semibold text-[#514941]">Productos</Text>
        {order.items.map((item) => (
          <View key={item.id} className="mb-3 flex-row items-start">
            <View className="mr-2 h-7 w-7 items-center justify-center rounded-lg bg-[#fff0e7]">
              <Text className="text-[10px] font-bold text-[#b7472a]">{item.quantity}×</Text>
            </View>
            <View className="flex-1">
              <Text className="text-xs font-semibold text-[#332d28]">{item.name}</Text>
              <Text className="mt-0.5 text-[10px] text-[#8b8178]">{item.notes || `Producto ${item.productId}`}</Text>
              <Text className="mt-0.5 text-[10px] text-[#a79b90]">{item.unitPriceLabel} por unidad</Text>
            </View>
            <Text className="text-xs font-semibold text-[#514941]">{item.subtotalLabel}</Text>
          </View>
        ))}
      </View>
      {order.notes ? (
        <View className="border-t border-[#f0e6dc] py-3">
          <Text className="text-[11px] font-semibold text-[#514941]">Nota del pedido</Text>
          <Text className="mt-1 text-xs text-[#70665e]">{order.notes}</Text>
        </View>
      ) : null}
      <View className="mt-1 flex-row items-center justify-between border-t border-[#f0e6dc] pt-4">
        <Text className="text-sm font-semibold text-[#514941]">Total</Text>
        <Text className="text-xl font-bold text-[#b7472a]">{order.totalLabel}</Text>
      </View>
    </View>
  );
}

function OrderHistory({ history }) {
  return (
    <View className="mt-4 rounded-2xl bg-white p-4">
      <Text className="mb-3 text-sm font-semibold text-[#514941]">Historial del pedido</Text>
      {history.length ? history.map((event, index) => (
        <View key={`${event.occurredAt}-${index}`} className="mb-3 border-l-2 border-[#e8b09d] pl-3">
          <Text className="text-xs font-semibold text-[#332d28]">{event.label}</Text>
          <Text className="mt-1 text-[10px] text-[#8b8178]">{event.occurredLabel}</Text>
          {event.reason ? <Text className="mt-1 text-[10px] text-[#70665e]">Motivo: {event.reason}</Text> : null}
        </View>
      )) : (
        <Text className="text-xs text-[#8b8178]">El backend no devolvió eventos del pedido.</Text>
      )}
    </View>
  );
}

function getActionInstructions(action) {
  const instructions = {
    'start-preparation': 'El pedido cambiará a En preparación. El backend validará la jornada e inventario.',
    ready: 'El pedido cambiará a Listo para su entrega.',
    deliver: 'El pedido quedará marcado como Entregado.',
    cancel: 'El pedido recibido se cancelará y el backend liberará las reservas de inventario.',
  };
  return instructions[action] || '';
}

function ActionConfirmation({ action, state, cancelReason, setCancelReason }) {
  if (!state.confirmation) return null;
  return (
    <View className="mt-4 rounded-2xl border border-[#e9c7b6] bg-[#fff1e8] p-4">
      <Text className="text-sm font-bold text-[#514941]">Confirmar: {actions[action]?.label}</Text>
      <Text className="mt-2 text-xs leading-5 text-[#70665e]">{getActionInstructions(action)}</Text>
      {action === 'cancel' ? (
        <>
          <Text className="mb-1 mt-3 text-xs font-semibold text-[#514941]">Motivo de cancelación</Text>
          <TextInput
            accessibilityLabel="Motivo de cancelación"
            value={cancelReason}
            onChangeText={setCancelReason}
            editable={!state.busy}
            maxLength={500}
            multiline
            textAlignVertical="top"
            placeholder="Escribe el motivo (máximo 500 caracteres)"
            className="min-h-20 rounded-xl border border-[#eadfd2] bg-white px-3 py-2 text-xs text-[#332d28]"
          />
          <Text className="mt-1 text-right text-[10px] text-[#8b8178]">{cancelReason.length}/500</Text>
        </>
      ) : null}
      <View className="mt-3 flex-row">
        <View className="mr-2 flex-1">
          <ActionButton label="Volver" secondary disabled={state.busy} onPress={state.cancelConfirmation} />
        </View>
        <View className="flex-1">
          <ActionButton label={state.busy ? 'Guardando…' : 'Confirmar'} disabled={state.busy} onPress={() => state.confirmAction(cancelReason)} />
        </View>
      </View>
    </View>
  );
}

function OrderActions({ state, cancelReason, setCancelReason, canManage }) {
  const { detail: order } = state;
  const transitionActions = {
    submitted: ['start-preparation', 'cancel'],
    preparing: ['ready'],
    ready: ['deliver'],
    delivered: [],
    cancelled: [],
  }[order.status] || [];
  const canChange = canManage && !state.busy && !state.detailLoading && !state.pendingOperation;
  return (
    <>
      {transitionActions.length && canManage && !state.pendingOperation ? (
        <View className="mt-4">
          <Text className="mb-2 text-sm font-semibold text-[#514941]">Acciones</Text>
          {transitionActions.map((action) => (
            <View key={action} className="mb-2">
              <ActionButton label={actions[action].label} disabled={!canChange} secondary={action === 'cancel'} onPress={() => state.beginAction(action)} />
            </View>
          ))}
        </View>
      ) : null}
      {!canManage ? (
        <Text className="mt-4 text-center text-xs text-[#8b8178]">
          Tu cuenta puede consultar pedidos, pero no tiene el permiso orders.manage para cambiarlos.
        </Text>
      ) : null}
      <ActionConfirmation action={state.confirmation?.action} state={state} cancelReason={cancelReason} setCancelReason={setCancelReason} />
    </>
  );
}

function OrderDetail({ state, cancelReason, setCancelReason, canManage }) {
  const { detail: order } = state;
  return (
    <SafeAreaView className="flex-1 bg-[#fff8ef]">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28 }}
      >
        <View className="mb-5 flex-row items-center">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Volver a pedidos"
            disabled={state.busy || Boolean(state.pendingOperation)}
            onPress={state.closeOrder}
            className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-white"
          >
            <Text className="text-2xl text-[#75695f]">‹</Text>
          </Pressable>
          <View>
            <Text className="text-xl font-bold text-[#332d28]">Detalle del pedido</Text>
            <Text className="mt-0.5 text-[11px] text-[#8b8178]">Pedido {order.displayId}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Actualizar detalle"
            disabled={state.busy || state.detailLoading}
            onPress={state.refreshDetail}
            className="ml-auto rounded-full bg-white px-3 py-2"
          >
            <Text className="text-[11px] font-semibold text-[#a85431]">Actualizar</Text>
          </Pressable>
        </View>

        <Notice error={Boolean(state.detailError)}>{state.detailError}</Notice>
        <Notice>{state.notice}</Notice>
        <Notice error={Boolean(state.refreshError)}>{state.refreshError}</Notice>
        {state.refreshError ? (
          <View className="mb-3">
            <ActionButton label="Reintentar consulta de bandeja" secondary onPress={state.refresh} disabled={state.busy} />
          </View>
        ) : null}

        <PendingOperationPanel state={state} />
        <OrderInformation order={order} />
        <OrderHistory history={order.history} />
        <OrderActions state={state} cancelReason={cancelReason} setCancelReason={setCancelReason} canManage={canManage} />
      </ScrollView>
    </SafeAreaView>
  );
}

function OrdersListContent({ state }) {
  if (state.loading) {
    return <Text className="py-8 text-center text-sm text-[#8b8178]">Cargando pedidos…</Text>;
  }
  if (state.error) {
    return (
      <View className="items-center rounded-2xl bg-white p-5">
        <Text className="mb-3 text-center text-xs text-[#70665e]">No se pudo cargar la bandeja.</Text>
        <ActionButton label="Reintentar" onPress={state.refresh} />
      </View>
    );
  }
  if (!state.orders.length) {
    return (
      <View className="rounded-2xl bg-white p-5">
        <Text className="text-center text-sm font-semibold text-[#514941]">No hay pedidos en este filtro</Text>
        <Text className="mt-1 text-center text-xs text-[#8b8178]">Actualiza la bandeja para consultar cambios recientes.</Text>
      </View>
    );
  }
  return state.orders.map((order) => (
    <OrderCard key={order.id} order={order} onPress={() => state.selectOrder(order.id)} />
  ));
}

async function handleLogout() {
  await logoutUser();
  router.replace('/(auth)/login');
}

export default function WaiterOrdersScreen() {
  const [cancelReason, setCancelReason] = useState('');
  const permissions = getCurrentUser()?.permissions || [];
  const canReadOrders = permissions.includes('orders.read');
  const canManageOrders = permissions.includes('orders.manage');
  const canReadTables = permissions.includes('tables.read');
  const state = useWaiterOrders({ canReadOrders, canManageOrders, canReadTables });

  function startAction(action) {
    setCancelReason('');
    state.beginAction(action);
  }

  const detailState = {
    ...state,
    beginAction: startAction,
    cancelConfirmation: () => state.cancelConfirmation(),
  };

  if (state.selectedId) {
    if (!state.detail) {
      return (
        <SafeAreaView className="flex-1 items-center justify-center bg-[#fff8ef] px-6">
          {state.detailLoading ? (
            <Text className="mb-3 text-sm text-[#8b8178]">Cargando detalle del pedido…</Text>
          ) : (
            <>
              <Notice error>{state.detailError || 'No se pudo cargar el pedido.'}</Notice>
              <ActionButton label="Reintentar consulta" onPress={state.refreshDetail} />
            </>
          )}
          <Pressable accessibilityRole="button" onPress={state.closeOrder} className="mt-4 px-4 py-2">
            <Text className="text-xs font-semibold text-[#a85431]">Volver a pedidos</Text>
          </Pressable>
        </SafeAreaView>
      );
    }
    return (
      <OrderDetail
        state={detailState}
        cancelReason={cancelReason}
        setCancelReason={setCancelReason}
        canManage={canManageOrders}
      />
    );
  }

  const selectedFilter = filters.find((filter) => filter.status === state.status)?.label || 'Todos';
  const canChangeList = !state.busy && !state.pendingOperation;

  return (
    <SafeAreaView className="flex-1 bg-[#fff8ef]">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28 }}
      >
        <View className="mb-4 flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-bold text-[#332d28]">Pedidos</Text>
            <Text className="mt-1 text-[11px] text-[#8b8178]">Pedidos de servicio en salón</Text>
          </View>
          <View className="flex-row">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Actualizar pedidos"
              disabled={state.loading || state.busy}
              onPress={state.refresh}
              className="mr-2 h-10 items-center justify-center rounded-full bg-white px-3"
            >
              <Text className="text-[11px] font-semibold text-[#a85431]">Actualizar</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar sesión"
              onPress={handleLogout}
              className="h-10 w-10 items-center justify-center rounded-full bg-white"
            >
              <Text className="text-base text-[#b7472a]">↪</Text>
            </Pressable>
          </View>
        </View>

        <Notice error={Boolean(state.error)}>{state.error}</Notice>
        <Notice>{state.refreshError}</Notice>

        <View className="mb-4 flex-row">
          <View className="mr-2 flex-1 rounded-xl bg-white p-3">
            <Text className="text-[10px] text-[#8b8178]">Recibidos</Text>
            <Text className="mt-1 text-xl font-bold text-[#332d28]">{state.counts.submitted ?? '—'}</Text>
            <Text className="text-[10px] text-[#b7472a]">Todos los pedidos locales</Text>
          </View>
          <View className="flex-1 rounded-xl bg-white p-3">
            <Text className="text-[10px] text-[#8b8178]">En preparación</Text>
            <Text className="mt-1 text-xl font-bold text-[#332d28]">{state.counts.preparing ?? '—'}</Text>
            <Text className="text-[10px] text-[#8b8178]">Todos los pedidos locales</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
          {filters.map((filter) => (
            <Pressable
              key={filter.label}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedFilter === filter.label, disabled: !canChangeList }}
              disabled={!canChangeList}
              onPress={() => state.selectFilter(filter.status)}
              className={`mr-2 rounded-full px-3 py-2 ${selectedFilter === filter.label ? 'bg-[#8e3b27]' : 'bg-white'}`}
            >
              <Text className={`text-[10px] font-semibold ${selectedFilter === filter.label ? 'text-white' : 'text-[#70665e]'}`}>
                {filter.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <OrdersListContent state={state} />

        {!state.loading && !state.error && state.total > 0 ? (
          <View className="mt-2 flex-row items-center justify-between rounded-xl bg-white px-3 py-2">
            <Text className="text-[11px] text-[#70665e]">Página {state.page} de {state.pageCount} · {state.total} pedidos</Text>
            <View className="flex-row">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Página anterior"
                disabled={state.page <= 1 || !canChangeList}
                onPress={() => state.setPage(state.page - 1)}
                className="mr-2 rounded-lg bg-[#fff1e8] px-3 py-2"
              >
                <Text className="text-xs font-bold text-[#a85431]">‹</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Página siguiente"
                disabled={state.page >= state.pageCount || !canChangeList}
                onPress={() => state.setPage(state.page + 1)}
                className="rounded-lg bg-[#fff1e8] px-3 py-2"
              >
                <Text className="text-xs font-bold text-[#a85431]">›</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
