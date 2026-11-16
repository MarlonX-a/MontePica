import { useCallback, useState } from 'react';
import { Alert, Modal, Pressable, Text, TextInput, View } from 'react-native';
import AdminShell from '@/features/admin/components/AdminShell';
import { Badge, Button, Chips, Empty } from '@/features/admin/components/AdminUI';
import DeliverySettingsPanel from '@/features/admin/components/DeliverySettingsPanel';
import useAdminDeliveryRequests from '@/features/admin/hooks/useAdminDeliveryRequests';
import useAdminDeliverySettings from '@/features/admin/hooks/useAdminDeliverySettings';
import { getCurrentUser } from '@/shared/session/sessionStore';

const filters = [{ value: 'pending', label: 'Pendientes' }, { value: 'approved', label: 'Aprobadas' }, { value: 'rejected', label: 'Rechazadas' }, { value: 'cancelled', label: 'Canceladas' }, { value: 'all', label: 'Todas' }];
const labels = { pending: 'Pendiente', approved: 'Aprobada', rejected: 'Rechazada', cancelled: 'Cancelada' };

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
  return <AdminShell title="Solicitudes de domicilio" subtitle={`${model.total} solicitudes`} showAdd={false}>
    {!model.canRead ? <Text className="rounded-xl bg-white p-4 text-sm text-[#a83224]">Tu cuenta no tiene permiso delivery.read.</Text> : <>
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
