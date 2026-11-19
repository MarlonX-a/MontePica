import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { getCurrentUser } from '@/shared/session/sessionStore';
import AdminShell from '@/features/admin/components/AdminShell';
import { Button, Chips, Empty } from '@/features/admin/components/AdminUI';
import useAdminBilling from '@/features/admin/hooks/useAdminBilling';
import AdminResolutionPanel from '@/features/admin/components/AdminResolutionPanel';
import { adminResolutionPrefix, resolutionSections } from '@/features/admin/hooks/useAdminCancellationRefunds';
import { hasActiveOperation } from '@/shared/api/useConfirmedOperation';

const LIMIT = 20;
const money = (cents, currency = 'USD') => ((cents || 0) / 100).toLocaleString('es-EC', { style: 'currency', currency });
const accountStatuses = [{ value: 'open', label: 'Abiertas' }, { value: 'closed', label: 'Cerradas' }];
const settlementStatuses = [{ value: 'pending', label: 'Pendientes' }, { value: 'settled', label: 'Cobradas' }, { value: 'cancelled', label: 'Anuladas' }];

function parseUsdCents(value) {
  const text = value.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const [dollars, cents = ''] = text.split('.');
  return Number(dollars) * 100 + Number(cents.padEnd(2, '0'));
}

function ConfirmDialog({ request, onCancel, onConfirm }) {
  return <Modal visible={Boolean(request)} transparent animationType="fade" onRequestClose={onCancel}>
    <View className="flex-1 items-center justify-center bg-black/40 px-6">
      <View className="w-full max-w-[420px] rounded-2xl bg-[#fff8ef] p-5">
        <Text accessibilityRole="header" className="text-base font-bold text-[#332d28]">{request?.title}</Text>
        <Text className="mt-3 text-sm leading-5 text-[#75695f]">{request?.message}</Text>
        <View className="mt-5 flex-row justify-end gap-3">
          <Pressable accessibilityRole="button" onPress={onCancel} className="rounded-xl bg-[#f2e8d6] px-4 py-3"><Text className="text-xs font-semibold text-[#b7472a]">Volver</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={onConfirm} className="rounded-xl bg-[#b7472a] px-4 py-3"><Text className="text-xs font-semibold text-white">Confirmar</Text></Pressable>
        </View>
      </View>
    </View>
  </Modal>;
}

function AccountCard({ item, model, confirmAction }) {
  return <View className="mb-3 rounded-2xl bg-white p-4">
    <Pressable accessibilityRole="button" onPress={() => void model.select(item)}>
      <Text className="text-sm font-bold text-[#332d28]">Cuenta {item.id.slice(0, 8)} · {item.status === 'open' ? 'Abierta' : 'Cerrada'}</Text>
      <Text className="mt-1 text-xs text-[#75695f]">{item.modality === 'local' ? 'Salón' : 'Domicilio'} · {money(item.pendingCents, item.currency)} pendiente</Text>
      <Text className="mt-1 text-[10px] text-[#8b8178]">{new Date(item.createdAt).toLocaleString('es-EC')}</Text>
      {item.pendingSettlement ? <Text className="mt-1 text-[10px] text-[#8b8178]">Liquidación pendiente {money(item.pendingSettlement.totalCents, item.currency)}</Text> : null}
    </Pressable>
    {model.canManage && item.modality === 'local' && item.status === 'open' && !item.pendingSettlement ? <Button disabled={model.busy} onPress={() => confirmAction('Preparar liquidación', 'El backend comprobará jornada, caja, pedidos entregados y cancelaciones pendientes.', () => model.create(item))}>Preparar liquidación</Button> : null}
  </View>;
}

function SettlementCard({ item, model }) {
  return <Pressable accessibilityRole="button" onPress={() => void model.select(item)} className="mb-3 rounded-2xl bg-white p-4">
    <Text className="text-sm font-bold text-[#332d28]">Liquidación {item.id.slice(0, 8)} · {item.status}</Text>
    <Text className="mt-1 text-xs text-[#75695f]">{money(item.totalCents, item.currency)} · cuenta {item.accountId.slice(0, 8)}</Text>
    {item.paymentId ? <Text className="mt-1 text-[10px] text-[#8b8178]">Pago {item.paymentId.slice(0, 8)}</Text> : null}
  </Pressable>;
}

function SettlementActions({ model, received, setReceived, reason, setReason, confirmAction }) {
  const item = model.selected;
  if (!item || item.status !== 'pending') return null;
  const total = item.totalCents || 0;
  const receivedCents = parseUsdCents(received);
  const local = item.modality === 'local';
  return <View className="mt-4 border-t border-[#eadfd2] pt-4">
    {local && model.canCollect && total > 0 ? <>
      <Text className="text-xs text-[#514941]">Total a cobrar {money(total, item.currency)}</Text>
      <TextInput accessibilityLabel="Efectivo recibido en dólares" keyboardType="decimal-pad" value={received} onChangeText={setReceived} placeholder="Efectivo recibido en dólares" className="my-2 rounded-xl bg-white p-3 text-sm" />
      <Button disabled={model.busy || receivedCents === null || receivedCents < total} onPress={() => confirmAction('Cobrar en efectivo', `Se registrará ${money(receivedCents || 0, item.currency)} recibido.`, () => model.collect(receivedCents))}>Cobrar en efectivo</Button>
    </> : null}
    {local && model.canCollect && total === 0 ? <Button disabled={model.busy} onPress={() => confirmAction('Finalizar cuenta sin pago', 'El backend cerrará la cuenta sin registrar un pago.', model.completeZero)}>Finalizar sin pago</Button> : null}
    {model.canManage ? <>
      <TextInput accessibilityLabel="Motivo para anular liquidación" value={reason} onChangeText={setReason} maxLength={500} placeholder="Motivo para anular" className="my-2 rounded-xl bg-white p-3 text-sm" />
      <Button disabled={model.busy || reason.trim().length < 1} onPress={() => confirmAction('Anular liquidación', 'El backend rechazará la anulación si hay una transferencia pendiente.', () => model.cancel(reason.trim()))}>Anular liquidación</Button>
    </> : null}
    {!local ? <Text className="mt-2 text-[10px] text-[#75695f]">Los domicilios se liquidan con el pedido y su transferencia se revisa en Domicilios.</Text> : null}
  </View>;
}

function AccountDetail({ item, model, confirmAction }) {
  return <>
    <Text className="text-xs leading-5 text-[#514941]">Modalidad: {item.modality === 'local' ? 'Salón' : 'Domicilio'}{`\n`}Estado: {item.status}{`\n`}Total: {money(item.totalCents, item.currency)}{`\n`}Pagado: {money(item.paidCents, item.currency)}{`\n`}Pendiente: {money(item.pendingCents, item.currency)}{`\n`}Reembolso pendiente: {money(item.refundPendingCents, item.currency)}{`\n`}Reembolsado: {money(item.refundedCents, item.currency)}{`\n`}Creada: {item.createdAt ? new Date(item.createdAt).toLocaleString('es-EC') : '—'}</Text>
    {item.items?.map((line) => <Text key={line.id} className="mt-2 text-xs text-[#514941]">{line.quantity} × {line.productName} · {money(line.subtotalCents, item.currency)}</Text>)}
    {item.pendingSettlement ? <Text className="mt-3 text-xs text-[#75695f]">Liquidación pendiente: {money(item.pendingSettlement.totalCents, item.currency)}</Text> : null}
    {item.status === 'open' && item.modality === 'local' && !item.pendingSettlement && model.canManage ? <Button disabled={model.busy} onPress={() => confirmAction('Preparar liquidación', 'El backend comprobará jornada, caja, pedidos entregados y cancelaciones pendientes.', () => model.create(item))}>Preparar liquidación</Button> : null}
  </>;
}

function SettlementDetail({ item, model, received, setReceived, reason, setReason, confirmAction }) {
  return <>
    <Text className="text-xs leading-5 text-[#514941]">Estado: {item.status}{`\n`}Total: {money(item.totalCents, item.currency)}{`\n`}Modalidad: {item.modality ? (item.modality === 'local' ? 'Salón' : 'Domicilio') : 'No disponible con tus permisos'}{`\n`}Resolución: {item.resolution || 'Pendiente'}{`\n`}Creada: {item.createdAt ? new Date(item.createdAt).toLocaleString('es-EC') : '—'}{item.settledAt ? `\nCobrada: ${new Date(item.settledAt).toLocaleString('es-EC')}` : ''}{item.cancelledAt ? `\nAnulada: ${new Date(item.cancelledAt).toLocaleString('es-EC')}` : ''}</Text>
    {item.items?.map((line) => <Text key={line.id} className="mt-2 text-xs text-[#514941]">{line.quantity} × {line.productName} · {money(line.subtotalCents, item.currency)}</Text>)}
    {item.cancellationReason ? <Text className="mt-2 text-xs text-[#a83224]">Motivo de anulación: {item.cancellationReason}</Text> : null}
    <SettlementActions model={model} received={received} setReceived={setReceived} reason={reason} setReason={setReason} confirmAction={confirmAction} />
  </>;
}

function Detail({ model, confirmAction }) {
  const [received, setReceived] = useState('');
  const [reason, setReason] = useState('');
  const item = model.selected;
  return <Modal visible={Boolean(item)} transparent animationType="slide" onRequestClose={() => !model.busy && model.select(null)}>
    <View className="flex-1 justify-end bg-black/40"><View className="max-h-[90%] rounded-t-3xl bg-[#fff8ef] p-5">
      <View className="mb-3 flex-row justify-between"><Text className="text-lg font-bold text-[#332d28]">Detalle de {model.section === 'accounts' ? 'cuenta' : 'liquidación'}</Text><Pressable disabled={model.busy} onPress={() => model.select(null)}><Text className="text-2xl">×</Text></Pressable></View>
      {model.detailLoading ? <Text>Consultando detalle…</Text> : item ? <ScrollView>
        {model.error ? <Text accessibilityRole="alert" className="text-xs text-[#a83224]">{model.error}</Text> : model.section === 'accounts' ? <AccountDetail item={item} model={model} confirmAction={confirmAction} /> : <SettlementDetail item={item} model={model} received={received} setReceived={setReceived} reason={reason} setReason={setReason} confirmAction={confirmAction} />}
        {model.notice ? <Text className="mt-3 text-xs text-[#477052]">{model.notice}</Text> : null}
        {model.operation ? <View className="mt-3"><Button onPress={model.refreshSelected}>Consultar estado</Button><View className="mt-2"><Button onPress={model.retry}>Reintentar misma operación</Button></View></View> : null}
        {model.error ? <Button onPress={model.refreshSelected}>Actualizar detalle</Button> : null}
      </ScrollView> : null}
    </View></View>
  </Modal>;
}

function PendingOperation({ model }) {
  if (!model.operation || model.selected) return null;
  return <View className="my-3 rounded-xl bg-[#fff0c7] p-4">
    <Text className="text-xs font-semibold text-[#6c5425]">Hay una operación cuyo resultado aún no se confirma.</Text>
    {model.notice ? <Text className="mt-1 text-[10px] text-[#75695f]">{model.notice}</Text> : null}
    {model.error ? <Text accessibilityRole="alert" className="mt-1 text-xs text-[#a83224]">{model.error}</Text> : null}
    <View className="mt-2"><Button disabled={model.busy} onPress={model.refreshSelected}>Consultar estado</Button></View>
    <View className="mt-2"><Button disabled={model.busy} onPress={model.retry}>Reintentar misma operación</Button></View>
  </View>;
}

function BillingAccounts({ model }) {
  const [confirmation, setConfirmation] = useState(null);
  const confirmAction = (title, message, run) => setConfirmation({ title, message, run });
  const filters = model.section === 'accounts' ? accountStatuses : settlementStatuses;
  const items = model.section === 'accounts' ? model.accounts : model.settlements;
  return <>
    <PendingOperation model={model} />
    <View className="mt-3"><Chips items={filters} value={model.status} onChange={model.setStatus} /></View>
    {model.error && !model.selected && !model.operation ? <View className="my-3 rounded-xl bg-white p-4"><Text accessibilityRole="alert" className="text-xs text-[#a83224]">{model.error}</Text><Button onPress={model.load}>Reintentar</Button></View> : null}
    {model.notice && !model.selected && !model.operation ? <Text className="my-2 text-xs text-[#477052]">{model.notice}</Text> : null}
    {model.loading ? <Text className="my-5 text-center text-xs text-[#8b8178]">Consultando backend…</Text> : null}
    {!model.loading && !model.error && !items.length ? <Empty>No hay registros en este filtro.</Empty> : null}
    {items.map((item) => model.section === 'accounts' ? <AccountCard key={item.id} item={item} model={model} confirmAction={confirmAction} /> : <SettlementCard key={item.id} item={item} model={model} />)}
    {model.total > LIMIT ? <View className="my-3 flex-row justify-between"><Button disabled={model.page <= 1} onPress={() => model.setPage(model.page - 1)}>Anterior</Button><Text>Página {model.page} de {model.maxPage}</Text><Button disabled={model.page >= model.maxPage} onPress={() => model.setPage(model.page + 1)}>Siguiente</Button></View> : null}
    <Detail key={model.selected?.id || 'empty'} model={model} confirmAction={confirmAction} />
    <ConfirmDialog request={confirmation} onCancel={() => setConfirmation(null)} onConfirm={() => { const run = confirmation?.run; setConfirmation(null); run?.(); }} />
  </>;
}

const tabs = [
  { value: 'accounts', label: 'Cuentas', permission: 'accounts.read' },
  { value: 'settlements', label: 'Liquidaciones', permission: 'settlements.read' },
  ...Object.entries(resolutionSections).map(([value, config]) => ({ value, label: config.label, permission: config.read })),
];

export default function BillingScreen() {
  const user = getCurrentUser();
  const permissions = user?.permissions || [];
  const sections = tabs.filter(({ permission }) => permissions.includes(permission));
  const [choice, setChoice] = useState(null);
  const section = sections.find(({ value }) => choice === value)?.value ?? sections[0]?.value;
  const accountTab = sections.find(({ value }) => !resolutionSections[value])?.value;
  const model = useAdminBilling(permissions, accountTab);

  function selectSection(value) {
    if (value === section || model.busy || model.operation || hasActiveOperation(adminResolutionPrefix(user))) return;
    if (!resolutionSections[value] && model.section !== value) model.changeSection(value);
    setChoice(value);
  }

  return (
    <AdminShell title="Cuentas y cobros" subtitle="Consulta y gestiona pagos y pedidos" showAdd={false}>
      <Chips items={sections} value={section} onChange={selectSection} />
      {resolutionSections[section] ? <AdminResolutionPanel key={section} section={section} user={user} /> : null}
      {section && !resolutionSections[section] ? <BillingAccounts model={model} /> : null}
      {section ? null : <Empty>Tu cuenta no tiene permiso para consultar estas secciones.</Empty>}
    </AdminShell>
  );
}

