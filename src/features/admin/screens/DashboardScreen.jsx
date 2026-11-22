import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import AdminShell from '@/features/admin/components/AdminShell';
import { billingReadPermissions } from '@/features/admin/hooks/useAdminCancellationRefunds';
import AdminIcon from '@/features/admin/components/AdminIcon';
import { Stats } from '@/features/admin/components/AdminUI';
import useAdminDashboard from '@/features/admin/hooks/useAdminDashboard';
import { formatDashboardMoney } from '@/features/admin/data/dashboardMapper';
import OperationsManagementPanel from '@/features/admin/components/OperationsManagementPanel';

function QuickAction({ icon, title, subtitle, onPress }) {
  return <Pressable accessibilityRole="button" onPress={onPress} className="flex-1 items-center rounded-2xl bg-white px-2 py-4 active:bg-[#fff0e4]"><View className="mb-2 h-9 w-9 items-center justify-center rounded-xl bg-[#f2e8d6]"><AdminIcon name={icon} size={18} color="#477052" /></View><Text className="text-center text-[10px] font-semibold text-[#332d28]">{title}</Text><Text className="mt-1 text-center text-[9px] text-[#8b8178]">{subtitle}</Text></Pressable>;
}

function Metric({ title, message, onRetry }) {
  return <View className="mb-3 rounded-xl bg-white p-3"><Text className="text-xs font-semibold text-[#332d28]">{title}</Text><Text className="mt-1 text-[11px] text-[#8b8178]">{message}</Text>{onRetry ? <Pressable onPress={onRetry}><Text className="mt-2 text-xs font-bold text-[#b7472a]">Reintentar al actualizar</Text></Pressable> : null}</View>;
}

export default function DashboardScreen() {
  const { data, errors, loading, refreshing, refresh, permissions } = useAdminDashboard();
  const day = data.day?.operatingDay;
  const inventory = data.inventory;
  const cards = [
    { label: 'Saldo de caja', value: data.cash ? formatDashboardMoney(data.cash.balanceCents, data.cash.currency) : '—', tone: 'green', note: data.cash ? 'Apertura, cobros y devoluciones' : 'Sin resumen disponible', icon: 'products' },
    { label: 'Pedidos de la jornada', value: data.orders ?? '—', tone: 'peach', note: data.activeOrders == null ? 'No disponible' : `${data.activeOrders} activos · ambas modalidades`, icon: 'qr' },
    { label: 'Stock bajo', value: inventory?.lowStock ?? '—', tone: 'blue', note: inventory ? `${inventory.notInitialized} sin inicializar` : 'No disponible', icon: 'products' },
    { label: 'Mesas con visita abierta', value: data.tables ?? '—', tone: 'peach', note: 'No representa ocupación física', icon: 'qr' },
  ];
  const dayState = !permissions.includes('operations.read') ? 'Sin permiso para consultar la jornada' : errors.day || (loading ? 'Consultando jornada…' : day ? (day.status === 'closed' ? 'Jornada cerrada' : 'Jornada abierta') : 'No hay jornada abierta para la fecha operativa.');
  const date = data.day?.businessDate || 'Fecha operativa no disponible';

  return <AdminShell title="Panel administrativo" subtitle={date} showAdd={false}>
    <View className="mb-3 flex-row items-center rounded-2xl bg-[#2f6f4e] px-4 py-3"><View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-white/15"><AdminIcon name="table" size={19} color="#ffffff" /></View><View className="flex-1"><Text className="text-sm font-bold text-white">{dayState}</Text><Text className="mt-1 text-[10px] text-white/80">Caja: {data.day?.cashRegister?.status === 'open' ? 'abierta' : data.day?.cashRegister ? 'cerrada' : 'sin caja'}</Text></View></View>
    <Pressable onPress={refresh} disabled={refreshing} className="mb-3 self-end rounded-lg bg-white px-3 py-2"><Text className="text-xs font-semibold text-[#b7472a]">{refreshing ? 'Actualizando…' : 'Actualizar panel'}</Text></Pressable>
    {loading && !data.day ? <Text className="mb-3 text-xs text-[#8b8178]">Cargando indicadores…</Text> : null}
    {Object.keys(errors).length ? <Metric title="Algunos datos no se actualizaron" message={Object.values(errors).join(' ')} /> : null}
    <Stats items={cards} />
    <Text className="mb-3 mt-2 text-sm font-semibold text-[#332d28]">Acciones rápidas</Text>
    <View className="mb-4 flex-row gap-2">
      {permissions.includes('inventory.read') ? <QuickAction icon="products" title="Inventario" subtitle="Revisar stock" onPress={() => router.push('/admin/inventory')} /> : null}
      {permissions.includes('tables.read') ? <QuickAction icon="qr" title="Mesas" subtitle={`${data.tables ?? '—'} con visita`} onPress={() => router.push('/admin/tables')} /> : null}
      {permissions.includes('delivery.read') ? <QuickAction icon="products" title="Domicilios" subtitle="Revisar solicitudes" onPress={() => router.push('/admin/deliveries')} /> : null}
      {billingReadPermissions.some((permission) => permissions.includes(permission)) ? <QuickAction icon="products" title="Cobros" subtitle="Cuentas y liquidaciones" onPress={() => router.push('/admin/billing')} /> : null}
      {['points.read', 'points.configure', 'rewards.read', 'rewards.manage', 'redemptions.read', 'redemptions.manage'].some((permission) => permissions.includes(permission)) ? <QuickAction icon="users" title="Puntos" subtitle="Programa y recompensas" onPress={() => router.push('/admin/rewards')} /> : null}
      <QuickAction icon="users" title="Usuarios" subtitle="Gestionar acceso" onPress={() => router.push('/admin/users')} />
    </View>
    {inventory ? <Pressable accessibilityRole="button" onPress={() => router.push('/admin/inventory')} className="flex-row items-center rounded-2xl bg-[#fff0c7] px-4 py-3"><Text className="mr-3 text-lg">⚠</Text><View className="flex-1"><Text className="text-xs font-semibold text-[#9c7b31]">Inventario por revisar</Text><Text className="mt-1 text-[10px] text-[#9c7b31]">{inventory.lowStock} productos con existencia disponible baja.</Text></View><Text className="text-base text-[#9c7b31]">›</Text></Pressable> : null}
    <OperationsManagementPanel permissions={permissions} />
  </AdminShell>;
}
