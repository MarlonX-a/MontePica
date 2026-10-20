import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import AdminShell from '@/features/admin/components/AdminShell';
import { useAdmin } from '@/features/admin/components/AdminProvider';
import AdminIcon from '@/features/admin/components/AdminIcon';
import { Stats } from '@/features/admin/components/AdminUI';

const hourlySales = [22, 36, 48, 62, 70, 54, 31, 20];

function QuickAction({ icon, title, subtitle, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="flex-1 items-center rounded-2xl bg-white px-2 py-4 active:bg-[#fff0e4]"
    >
      <View className="mb-2 h-9 w-9 items-center justify-center rounded-xl bg-[#f2e8d6]">
        <AdminIcon name={icon} size={18} color="#477052" />
      </View>
      <Text className="text-center text-[10px] font-semibold text-[#332d28]">
        {title}
      </Text>
      <Text className="mt-1 text-center text-[9px] text-[#8b8178]">
        {subtitle}
      </Text>
    </Pressable>
  );
}

export default function DashboardScreen() {
  const { products, tables } = useAdmin();
  const lowStock = products.filter((product) => product.stock <= 3).length;
  const occupied = tables.filter((table) => table.status === 'Ocupada').length;

  return (
    <AdminShell
      title="Panel administrativo"
      subtitle="Jueves, 1 de octubre"
      addLabel="Registrar movimiento"
      onAdd={() => router.push('/admin/movement')}
    >
      <View className="mb-4 flex-row items-center rounded-2xl bg-[#2f6f4e] px-4 py-3">
        <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-white/15">
          <AdminIcon name="table" size={19} color="#ffffff" />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-bold text-white">Local abierto</Text>
          <Text className="mt-1 text-[10px] text-white/80">
            Turno activo · 08:00–18:00
          </Text>
        </View>
        <Text className="rounded-full bg-[#deecdf] px-2 py-1 text-[9px] font-semibold text-[#477052]">
          Operando
        </Text>
      </View>
      <Stats
        items={[
          { label: 'Ventas hoy', value: '$486', tone: 'green', note: '↑ 12% vs. ayer', icon: 'products' },
          { label: 'Pedidos', value: '38', tone: 'peach', note: '7 activos ahora', icon: 'qr' },
          { label: 'Ticket medio', value: '$12.79', tone: 'blue', note: 'Objetivo $12.00', icon: 'panel' },
          { label: 'Stock bajo', value: lowStock, tone: 'peach', note: 'Requiere atención', icon: 'products' },
        ]}
      />
      <View className="mb-4 rounded-2xl bg-white p-4">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-sm font-semibold text-[#332d28]">Actividad por hora</Text>
          <Text className="text-[10px] font-semibold text-[#b7472a]">Hoy</Text>
        </View>
        <View className="h-28 flex-row items-end justify-between gap-1">
          {hourlySales.map((value, index) => (
            <View key={index} className="flex-1 items-center">
              <View
                className={`w-full rounded-t-md ${index === 4 ? 'bg-[#b7472a]' : 'bg-[#f3d9ce]'}`}
                style={{ height: value }}
              />
              <Text className="mt-2 text-[8px] text-[#8b8178]">{8 + index}</Text>
            </View>
          ))}
        </View>
      </View>
      <Text className="mb-3 text-sm font-semibold text-[#332d28]">Acciones rápidas</Text>
      <View className="mb-4 flex-row gap-2">
        <QuickAction icon="products" title="Inventario" subtitle="Revisar stock" onPress={() => router.push('/admin/inventory')} />
        <QuickAction icon="qr" title="Mesas" subtitle={`${occupied} ocupadas`} onPress={() => router.push('/admin/tables')} />
        <QuickAction icon="users" title="Usuarios" subtitle="Gestionar acceso" onPress={() => router.push('/admin/users')} />
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/admin/inventory')}
        className="flex-row items-center rounded-2xl bg-[#fff0c7] px-4 py-3 active:opacity-70"
      >
        <Text className="mr-3 text-lg">⚠</Text>
        <View className="flex-1">
          <Text className="text-xs font-semibold text-[#9c7b31]">Inventario por revisar</Text>
          <Text className="mt-1 text-[10px] text-[#9c7b31]">
            {lowStock} productos requieren reposición.
          </Text>
        </View>
        <Text className="text-base text-[#9c7b31]">›</Text>
      </Pressable>
    </AdminShell>
  );
}
