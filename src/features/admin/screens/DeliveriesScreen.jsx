import { useCallback, useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import AdminShell from '@/features/admin/components/AdminShell';
import { Badge, Button, Chips, Empty } from '@/features/admin/components/AdminUI';
import DeliverySettingsPanel from '@/features/admin/components/DeliverySettingsPanel';
import useAdminDeliveryRequests from '@/features/admin/hooks/useAdminDeliveryRequests';
import useAdminDeliverySettings from '@/features/admin/hooks/useAdminDeliverySettings';
import useAdminTransfers from '@/features/admin/hooks/useAdminTransfers';
import useAdminDeliveryOrders from '@/features/admin/hooks/useAdminDeliveryOrders';
import { getCurrentUser } from '@/shared/session/sessionStore';

const filters = [{ value: 'pending', label: 'Pendientes' }, { value: 'approved', label: 'Aprobadas' }, { value: 'rejected', label: 'Rechazadas' }, { value: 'cancelled', label: 'Canceladas' }, { value: 'all', label: 'Todas' }];
const labels = { pending: 'Pendiente', approved: 'Aprobada', rejected: 'Rechazada', cancelled: 'Cancelada' };
const transferFilters = [{ value: 'pendingVerification', label: 'Pendientes' }, { value: 'confirmed', label: 'Confirmadas' }, { value: 'rejected', label: 'Rechazadas' }, { value: 'all', label: 'Todas' }];

function TransferReview({ permissions }) {
  const model = useAdminTransfers({ canRead: permissions.includes('payments.read'), canReview: permissions.includes('payments.verify'), canReadReceipt: permissions.includes('payments.receipts.read') });
  const [reference, setReference] = useState(''); const [reason, setReason] = useState('');
  const open = async (item) => { setReference(''); setReason(''); await model.select(item); };
  const decide = (action) => {
    const value = action === 'confirm' ? reference.normalize('NFC').trim().toUpperCase() : reason.trim();
    if (!value || value.length > (action === 'confirm' ? 120 : 500)) { Alert.alert('Revisa el campo', action === 'confirm' ? 'La referencia debe tener entre 1 y 120 caracteres.' : 'El motivo debe tener entre 1 y 500 caracteres.'); return; }
    Alert.alert(action === 'confirm' ? 'Confirmar transferencia' : 'Rechazar transferencia', action === 'confirm' ? 'Se confirmará el pago y se resolverá la liquidación.' : 'Se rechazará el pago; esto puede vencer el pedido a domicilio.', [{ text: 'Cancelar', style: 'cancel' }, { text: action === 'confirm' ? 'Confirmar' : 'Rechazar', onPress: () => void model.decide(action, value) }]);
  };
  return <View>
    {!model.canRead ? <Text className="rounded-xl bg-white p-4 text-sm text-[#a83224]">Tu cuenta no tiene permiso payments.read.</Text> : <>
      <Text className="mb-2 text-xs text-[#75695f]">Esta bandeja reúne transferencias de salón y de domicilio.</Text>
      <Chips items={transferFilters} value={model.status} onChange={model.changeStatus} />
      <Button onPress={() => void model.load(model.page, model.status, true)}>{model.refreshing ? 'Actualizando…' : 'Actualizar transferencias'}</Button>
      {model.error ? <Text accessibilityRole="alert" className="my-2 rounded-xl bg-[#fde7e3] p-3 text-xs text-[#a83224]">{model.error}</Text> : null}
      {model.loading ? <Text className="p-4 text-center text-xs text-[#8b8178]">Consultando transferencias…</Text> : model.items.length ? model.items.map((item) => <Pressable key={item.id} onPress={() => void open(item)} className="mt-3 rounded-2xl bg-white p-4"><View className="flex-row justify-between"><Text className="text-xs font-bold text-[#332d28]">{(item.amountCents / 100).toLocaleString('es-EC', { style: 'currency', currency: item.currency })}</Text><Badge tone={item.status === 'rejected' ? 'peach' : item.status === 'confirmed' ? 'green' : 'yellow'}>{item.status}</Badge></View><Text className="mt-2 text-[10px] text-[#8b8178]">Pago {item.id.slice(0, 8)} · Liquidación {item.settlementId.slice(0, 8)}</Text><Text className="mt-1 text-[10px] text-[#8b8178]">{new Date(item.createdAt).toLocaleString('es-EC')}</Text></Pressable>) : <Empty>No hay transferencias en este filtro.</Empty>}
      {model.maxPage > 1 ? <View className="mt-3 flex-row items-center justify-between"><Button onPress={() => model.setPage(Math.max(1, model.page - 1))}>Anterior</Button><Text className="text-xs">Página {model.page} de {model.maxPage}</Text><Button onPress={() => model.setPage(Math.min(model.maxPage, model.page + 1))}>Siguiente</Button></View> : null}
    </>}
    <Modal visible={Boolean(model.detail)} transparent animationType="slide" onRequestClose={model.close}><View className="flex-1 justify-end bg-black/40"><View className="max-h-[90%] rounded-t-3xl bg-[#fff8ef] p-5"><View className="mb-3 flex-row justify-between"><Text className="text-lg font-bold text-[#332d28]">Revisión de transferencia</Text><Pressable disabled={model.busy} onPress={model.close}><Text className="text-2xl">×</Text></Pressable></View>
      {model.detailLoading ? <Text className="p-3">Cargando detalle…</Text> : model.detail ? <ScrollView keyboardShouldPersistTaps="handled"><Text className="text-xs leading-5 text-[#75695f]">Estado: {model.detail.status}{'\n'}Importe: {(model.detail.amountCents / 100).toLocaleString('es-EC', { style: 'currency', currency: model.detail.currency })}{'\n'}Liquidación: {model.detail.settlementId}{'\n'}Cuenta: {model.detail.accountId}{'\n'}Creado: {new Date(model.detail.createdAt).toLocaleString('es-EC')}{'\n'}Referencia bancaria: {model.detail.bankOperationReference || '—'}{'\n'}Motivo: {model.detail.rejectionReason || '—'}</Text>
      {model.canReadReceipt ? <><Button onPress={model.loadReceipt}>Cargar comprobante</Button>{model.receiptMime === 'application/pdf' ? <Text className="my-2 text-xs text-[#75695f]">El archivo es PDF. Esta pantalla no incluye visor PDF.</Text> : model.receiptUrl ? <Image source={{ uri: model.receiptUrl }} resizeMode="contain" className="my-3 h-56 w-full bg-white" /> : null}</> : <Text className="my-2 text-xs text-[#8b8178]">Tu cuenta no tiene permiso payments.receipts.read.</Text>}
      {model.notice ? <Text className="my-2 text-xs text-[#477052]">{model.notice}</Text> : null}{model.error ? <Text accessibilityRole="alert" className="my-2 text-xs text-[#a83224]">{model.error}</Text> : null}
      {model.uncertain ? <><Button onPress={model.reconcile}>Consultar estado</Button><View className="mt-2"><Button onPress={() => void model.decide(model.uncertain.action, '', true)}>Reintentar misma decisión</Button></View></> : null}
      {model.detail.status === 'pendingVerification' && model.canReview && !model.uncertain ? <><TextInput value={reference} onChangeText={setReference} maxLength={120} placeholder="Referencia bancaria para confirmar" className="my-2 rounded-xl bg-white p-3 text-sm" /><Button onPress={() => decide('confirm')}>Confirmar transferencia</Button><TextInput value={reason} onChangeText={setReason} maxLength={500} multiline placeholder="Motivo de rechazo" className="my-2 min-h-20 rounded-xl bg-white p-3 text-sm" /><Button onPress={() => decide('reject')}>Rechazar transferencia</Button></> : null}
      {model.detail.history?.map((event, index) => <Text key={`${event.event}-${index}`} className="mt-2 text-[10px] text-[#75695f]">{event.event} · {new Date(event.occurredAt).toLocaleString('es-EC')}</Text>)}
      </ScrollView> : null}</View></View></Modal>
  </View>;
}

function DeliveryOrders({ permissions }) {
  const user = getCurrentUser();
  const model = useAdminDeliveryOrders({ canRead: permissions.includes('orders.read'), canManage: permissions.includes('orders.manage'), userId: user?.id || user?.userId });
  const options = [{ value: '', label: 'Todos' }, { value: 'submitted', label: 'Recibidos' }, { value: 'preparing', label: 'En preparación' }, { value: 'ready', label: 'Listos' }, { value: 'dispatched', label: 'Despachados' }, { value: 'delivered', label: 'Entregados' }, { value: 'cancelled', label: 'Cancelados' }];
  const names = { submitted: 'Recibido', preparing: 'En preparación', ready: 'Listo', dispatched: 'Despachado', delivered: 'Entregado', cancelled: 'Cancelado' };
  const actions = { submitted: ['start-preparation', 'cancel'], preparing: ['ready'], ready: ['dispatch'], dispatched: ['deliver'] };
  const labels = { 'start-preparation': 'Iniciar preparación', cancel: 'Cancelar pedido', ready: 'Marcar listo', dispatch: 'Marcar despachado', deliver: 'Marcar entregado' };
  return <View>
    {!model.canRead ? <Text className="rounded-xl bg-white p-4 text-sm text-[#a83224]">Tu cuenta no tiene permiso orders.read.</Text> : <>
      <Chips items={options} value={model.status} onChange={model.setStatus} />
      <Button onPress={model.refresh}>Actualizar pedidos</Button>
      {model.error ? <Text accessibilityRole="alert" className="my-2 rounded-xl bg-[#fde7e3] p-3 text-xs text-[#a83224]">{model.error}</Text> : null}
      {model.loading ? <Text className="p-4 text-center text-xs">Consultando pedidos…</Text> : model.items.length ? model.items.map((order) => <Pressable key={order.id} onPress={() => void model.select(order)} className="mt-3 rounded-xl bg-white p-4"><Text className="text-sm font-bold">Pedido {order.id.slice(0, 8)} · {names[order.status] || order.status}</Text><Text className="mt-1 text-xs text-[#75695f]">{order.delivery?.recipientName || 'Destinatario'} · {(order.totalCents / 100).toLocaleString('es-EC', { style: 'currency', currency: order.currency })}</Text><Text className="mt-1 text-[10px] text-[#8b8178]">{new Date(order.submittedAt).toLocaleString('es-EC')}</Text></Pressable>) : <Empty>No hay pedidos a domicilio en este filtro.</Empty>}
      {model.pages > 1 ? <View className="mt-3 flex-row items-center justify-between"><Button onPress={() => model.setPage(Math.max(1, model.page - 1))}>Anterior</Button><Text className="text-xs">Página {model.page} de {model.pages}</Text><Button onPress={() => model.setPage(Math.min(model.pages, model.page + 1))}>Siguiente</Button></View> : null}
    </>}
    <Modal visible={Boolean(model.detail)} transparent animationType="slide" onRequestClose={model.close}><View className="flex-1 justify-end bg-black/40"><View className="max-h-[90%] rounded-t-3xl bg-[#fff8ef] p-5"><View className="mb-3 flex-row justify-between"><Text className="text-lg font-bold">Detalle del pedido</Text><Pressable disabled={model.busy} onPress={model.close}><Text>×</Text></Pressable></View>
      {model.detailLoading ? <Text>Cargando detalle…</Text> : model.detail ? <ScrollView keyboardShouldPersistTaps="handled"><Text className="text-xs leading-5">{names[model.detail.status] || model.detail.status}{'\n'}{model.detail.delivery?.recipientName}{'\n'}{model.detail.delivery?.phone}{'\n'}{model.detail.delivery?.address}{'\n'}Referencias: {model.detail.delivery?.references || '—'}{'\n'}Envío: {(model.detail.shippingCents / 100).toFixed(2)} {model.detail.currency}{'\n'}Total: {(model.detail.totalCents / 100).toFixed(2)} {model.detail.currency}{'\n'}Fecha: {new Date(model.detail.submittedAt).toLocaleString('es-EC')}{'\n'}Versión: {model.detail.version}</Text>
      {model.detail.items?.map((item) => <Text key={item.id} className="mt-2 text-xs">{item.quantity} × {model.products.get(item.productId) || `Producto ${item.productId}`} · {(item.subtotalCents / 100).toFixed(2)}{item.notes ? ` · ${item.notes}` : ''}</Text>)}{model.detail.history?.map((event, index) => <Text key={`${event.event}-${index}`} className="mt-2 text-[10px]">{event.event} · {new Date(event.occurredAt).toLocaleString('es-EC')}</Text>)}
      {model.notice ? <Text className="my-2 text-xs text-[#477052]">{model.notice}</Text> : null}{model.error ? <Text className="my-2 text-xs text-[#a83224]">{model.error}</Text> : null}
      {model.operation ? <><Button onPress={model.reconcile}>Consultar estado</Button><View className="mt-2"><Button onPress={() => void model.act(model.operation.action, true)}>Reintentar misma operación</Button></View></> : null}
      {model.detail.status === 'submitted' && model.canManage ? <TextInput value={model.reason} onChangeText={model.setReason} maxLength={500} placeholder="Motivo de cancelación" className="my-2 rounded-xl bg-white p-3 text-sm" /> : null}
      {(actions[model.detail.status] || []).filter(() => model.canManage && !model.operation).map((action) => <View key={action} className="mt-2"><Button onPress={() => { if (action === 'cancel' && (!model.reason.trim() || model.reason.trim().length > 500)) { Alert.alert('Motivo requerido', 'Escribe un motivo de 1 a 500 caracteres.'); return; } Alert.alert(labels[action], action === 'start-preparation' || action === 'dispatch' ? 'Esta acción requiere una transferencia confirmada; iniciar preparación también requiere jornada abierta.' : '¿Confirmas el cambio de estado?', [{ text: 'Cancelar', style: 'cancel' }, { text: labels[action], onPress: () => void model.act(action) }]); }}>{labels[action]}</Button></View>)}
      </ScrollView> : null}</View></View></Modal>
  </View>;
}

function DeliveryCard({ item, onPress }) {
  return <Pressable onPress={onPress} className="mb-3 rounded-2xl bg-white p-4"><View className="flex-row items-center justify-between"><Text className="text-sm font-bold text-[#332d28]">{item.recipientName}</Text><Badge tone={item.status === 'rejected' ? 'peach' : 'green'}>{labels[item.status] || item.status}</Badge></View><Text className="mt-2 text-xs text-[#75695f]">{item.phone} · {item.address}</Text><Text className="mt-1 text-[10px] text-[#8b8178]">Jornada {item.operatingDayId} · {new Date(item.createdAt).toLocaleString('es-EC')}</Text></Pressable>;
}

function DeliveryDetail({ model, reason, setReason, writesBusy }) {
  const item = model.detail; const pending = item?.status === 'pending';
  return <Modal visible={Boolean(item)} transparent animationType="slide" onRequestClose={model.closeDetail}>
    <View className="flex-1 justify-end bg-black/40"><View className="max-h-[90%] rounded-t-3xl bg-[#fff8ef] p-5">
      <View className="mb-4 flex-row items-center justify-between"><Text className="text-lg font-bold text-[#332d28]">Solicitud de domicilio</Text><Pressable disabled={model.busy || writesBusy} onPress={model.closeDetail}><Text className="text-2xl text-[#8b8178]">×</Text></Pressable></View>
      {model.detailLoading ? <Text>Cargando detalle…</Text> : item ? <>
        <Text className="text-sm font-semibold text-[#332d28]">{item.recipientName} · {labels[item.status] || item.status}</Text>
        <Text className="mt-2 text-xs leading-5 text-[#75695f]">Teléfono: {item.phone}{'\n'}Dirección: {item.address}{'\n'}Referencias: {item.references || 'Sin referencias'}{'\n'}Tarifa: {(item.shippingFeeCents / 100).toLocaleString('es-EC', { style: 'currency', currency: item.currency })}{'\n'}Jornada: {item.operatingDayId}{'\n'}Configuración: v{item.configurationVersion}{'\n'}Creada: {new Date(item.createdAt).toLocaleString('es-EC')}</Text>
        {item.rejectionReason ? <Text className="mt-2 text-xs text-[#a83224]">Motivo de rechazo: {item.rejectionReason}</Text> : null}
        {model.notice ? <Text className="mt-3 text-xs text-[#477052]">{model.notice}</Text> : null}
        {model.error ? <Text accessibilityRole="alert" className="mt-3 text-xs text-[#a83224]">{model.error}</Text> : null}
        {model.uncertain ? <><Button onPress={model.reconcile}>Consultar estado</Button><View className="mt-2"><Button onPress={() => model.decide(model.uncertain.action, model.uncertain.reason, true)}>Reintentar misma decisión</Button></View></> : null}
        {pending && model.canReview && !model.uncertain && !writesBusy ? <>
          <Button onPress={() => Alert.alert('Aprobar cobertura', 'Se aprobará la dirección para domicilio. Esto no crea un pedido.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Aprobar', onPress: () => void model.decide('approve') }])}>Aprobar cobertura</Button>
          <TextInput value={reason} onChangeText={setReason} maxLength={500} multiline placeholder="Motivo de rechazo (obligatorio)" className="mt-3 min-h-20 rounded-xl border border-[#eadfd2] bg-white p-3 text-sm text-[#332d28]" />
          <View className="mt-2"><Button onPress={() => { const value = reason.trim(); if (!value || value.length > 500) { Alert.alert('Motivo requerido', 'Escribe un motivo de entre 1 y 500 caracteres.'); return; } Alert.alert('Rechazar solicitud', '¿Confirmas el rechazo de esta solicitud?', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Rechazar', style: 'destructive', onPress: () => void model.decide('reject', value) }]); }}>Rechazar solicitud</Button></View>
        </> : null}
      </> : null}
    </View></View>
  </Modal>;
}

export default function DeliveriesScreen() {
  const permissions = getCurrentUser()?.permissions || [];
  const model = useAdminDeliveryRequests(permissions.includes('delivery.read'), permissions.includes('delivery.review'));
  const onSettingsSaved = useCallback(() => model.load(model.page, model.status, true), [model.load, model.page, model.status]);
  const settings = useAdminDeliverySettings({ canRead: permissions.includes('delivery.read'), canConfigure: permissions.includes('delivery.configure'), onSaved: onSettingsSaved });
  const [reason, setReason] = useState('');
  const [section, setSection] = useState('requests');
  return <AdminShell title="Solicitudes de domicilio" subtitle={`${model.total} solicitudes`} showAdd={false}>
    <Chips items={[{ value: 'requests', label: 'Domicilios' }, { value: 'transfers', label: 'Transferencias' }, { value: 'orders', label: 'Pedidos' }]} value={section} onChange={setSection} />
    {section === 'orders' ? <DeliveryOrders permissions={permissions} /> : section === 'transfers' ? <TransferReview permissions={permissions} /> : !model.canRead ? <Text className="rounded-xl bg-white p-4 text-sm text-[#a83224]">Tu cuenta no tiene permiso delivery.read.</Text> : <>
      <DeliverySettingsPanel model={settings} />
      <Chips items={filters} value={model.status} onChange={model.changeStatus} />
      <View className="mb-3"><Button onPress={() => void model.load(model.page, model.status, true)}>{model.refreshing ? 'Actualizando…' : 'Actualizar solicitudes'}</Button></View>
      {model.error ? <Text accessibilityRole="alert" className="mb-3 rounded-xl bg-[#fde7e3] p-3 text-xs text-[#a83224]">{model.error}</Text> : null}
      {model.loading ? <Text className="p-4 text-center text-xs text-[#8b8178]">Cargando solicitudes…</Text> : model.items.length ? model.items.map((item) => <DeliveryCard key={item.id} item={item} onPress={() => { setReason(''); void model.select(item); }} />) : <Empty>No hay solicitudes en este filtro.</Empty>}
      {model.maxPage > 1 ? <View className="mb-4 flex-row items-center justify-between"><Button onPress={() => model.setPage(Math.max(1, model.page - 1))}>Anterior</Button><Text className="text-xs text-[#75695f]">Página {model.page} de {model.maxPage}</Text><Button onPress={() => model.setPage(Math.min(model.maxPage, model.page + 1))}>Siguiente</Button></View> : null}
    </>}
    <DeliveryDetail model={model} reason={reason} setReason={setReason} writesBusy={settings.saving} />
  </AdminShell>;
}
