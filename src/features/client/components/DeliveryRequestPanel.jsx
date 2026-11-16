import { Pressable, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import useDeliveryRequests from '@/features/client/hooks/useDeliveryRequests';
import { logoutUser } from '@/shared/session/sessionStore';
const formatMoney = (cents, currency = 'USD') => new Intl.NumberFormat('es-EC', { style: 'currency', currency }).format(cents / 100);

const statusLabels = { pending: 'Pendiente', approved: 'Aprobada', rejected: 'Rechazada', cancelled: 'Cancelada' };

function Field({ label, value, onChangeText, multiline = false }) {
  return <View className="mb-3"><Text className="mb-1 text-xs font-semibold text-[#514941]">{label}</Text><TextInput value={value} onChangeText={onChangeText} multiline={multiline} textAlignVertical={multiline ? 'top' : 'center'} className={`rounded-xl border border-[#eadfd2] bg-white px-3 py-3 text-sm text-[#332d28] ${multiline ? 'min-h-20' : ''}`} /></View>;
}

function RequestItem({ item, onRefresh }) {
  return <View className="mt-3 rounded-xl border border-[#eadfd2] bg-white p-3"><View className="flex-row justify-between"><Text className="text-xs font-bold text-[#332d28]">{statusLabels[item.status] || item.status}</Text><Text className="text-xs font-semibold text-[#b7472a]">{formatMoney(item.shippingFeeCents, item.currency)}</Text></View><Text className="mt-1 text-[11px] text-[#75695f]">{item.address}</Text><Text className="mt-1 text-[10px] text-[#8b8178]">{new Date(item.createdAt).toLocaleString('es-EC')}</Text>{item.status === 'rejected' && item.rejectionReason ? <Text className="mt-2 text-xs text-[#a83224]">Motivo: {item.rejectionReason}</Text> : null}{item.status === 'approved' ? <Text className="mt-2 text-[10px] text-[#477052]">{item.usableToday ? 'Esta solicitud puede utilizarse hoy.' : 'Aprobada, pero no está disponible para uso hoy.'}</Text> : null}<Pressable onPress={() => onRefresh(item.id)} className="mt-2 self-start"><Text className="text-xs font-bold text-[#b7472a]">Actualizar estado</Text></Pressable></View>;
}

export default function DeliveryRequestPanel() {
  const state = useDeliveryRequests();
  const { settings, form, update, error, fieldError, loading, submitting, uncertain, items, page, total } = state;
  return <View className="mt-5 rounded-2xl bg-[#f5eee5] p-4"><Text className="text-lg font-bold text-[#332d28]">Solicitud de domicilio</Text><Text className="mt-1 text-xs leading-5 text-[#75695f]">{settings?.coverageDescription || 'Consultando cobertura…'}</Text>{settings ? <Text className="mt-2 text-xs font-semibold text-[#a85431]">Tarifa: {formatMoney(settings.shippingFeeCents, settings.currency)}</Text> : null}<Text className="mt-2 text-[10px] leading-4 text-[#81766d]">Enviar tu dirección solicita una revisión y no garantiza cobertura. No envía los productos del carrito.</Text>
    {error ? <Text accessibilityRole="alert" className="mt-3 text-xs text-[#a83224]">{error}</Text> : null}
    {error && !uncertain ? <Pressable onPress={() => void state.load(page, true)} className="mt-2 self-start"><Text className="text-xs font-bold text-[#b7472a]">Reintentar consulta</Text></Pressable> : null}
    {uncertain ? <><Text className="mt-2 text-xs text-[#a83224]">El resultado no está confirmado. Se conservaron los mismos datos y la clave para evitar duplicados.</Text><Pressable disabled={submitting} onPress={() => void state.submit(true)} className="mt-2 rounded-lg bg-[#b7472a] p-3"><Text className="text-center text-xs font-bold text-white">Reintentar la misma solicitud</Text></Pressable></> : null}
    {!uncertain && settings?.enabled ? <><Field label="Destinatario" value={form.recipientName} onChangeText={(value) => update('recipientName', value)} /><Field label="Teléfono" value={form.phone} onChangeText={(value) => update('phone', value)} /><Field label="Dirección" value={form.address} onChangeText={(value) => update('address', value)} multiline /><Field label="Referencias (opcional)" value={form.references} onChangeText={(value) => update('references', value)} multiline />{fieldError ? <Text className="mb-2 text-xs text-[#a83224]">{fieldError}</Text> : null}<Pressable disabled={submitting || !settings} onPress={() => void state.submit()} className="rounded-xl bg-[#b7472a] p-3"><Text className="text-center text-xs font-bold text-white">{submitting ? 'Enviando solicitud…' : 'Solicitar revisión de cobertura'}</Text></Pressable></> : null}
    {settings && !settings.enabled ? <Text className="mt-3 text-xs text-[#8b8178]">Domicilio está deshabilitado por el momento. Puedes consultar tus solicitudes anteriores.</Text> : null}
    {loading ? <Text className="mt-3 text-xs text-[#8b8178]">Cargando tus solicitudes…</Text> : null}
    {!loading && !items.length ? <Text className="mt-3 text-xs text-[#8b8178]">Aún no tienes solicitudes de domicilio.</Text> : null}
    {items.map((item) => <RequestItem key={item.id} item={item} onRefresh={state.refreshRequest} />)}
    {total > 20 ? <View className="mt-3 flex-row justify-between"><Pressable disabled={page <= 1} onPress={() => void state.load(page - 1, true)}><Text className="text-xs font-bold text-[#b7472a]">Anterior</Text></Pressable><Text className="text-xs text-[#75695f]">Página {page}</Text><Pressable disabled={page * 20 >= total} onPress={() => void state.load(page + 1, true)}><Text className="text-xs font-bold text-[#b7472a]">Siguiente</Text></Pressable></View> : null}
    {error.includes('sesión expiró') ? <Pressable onPress={async () => { await logoutUser(); router.replace('/(auth)/login'); }}><Text className="mt-2 text-xs font-bold text-[#b7472a]">Volver a iniciar sesión</Text></Pressable> : null}
  </View>;
}
