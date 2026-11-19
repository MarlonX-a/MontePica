import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import useClientRewards from '@/features/client/hooks/useClientRewards';

const movementFilters = [
  { value: '', label: 'Todos' },
  { value: 'earn', label: 'Ganados' },
  { value: 'refundAdjustment', label: 'Ajustes' },
  { value: 'redeem', label: 'Canjes' },
  { value: 'redemptionReturn', label: 'Devoluciones' },
];

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Fecha no disponible' : date.toLocaleString('es-EC');
}

function movementLabel(type) {
  return {
    earn: 'Puntos ganados', refundAdjustment: 'Ajuste por devolución',
    redeem: 'Canje de puntos', redemptionReturn: 'Devolución de canje',
  }[type] || 'Movimiento de puntos';
}

function pointsSign(movement) {
  return movement.points < 0 ? '−' : '+';
}

function Filter({ item, selected, onPress }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} className={`mr-2 rounded-full px-3 py-2 ${selected ? 'bg-[#8e3b27]' : 'bg-[#f2e8d6]'}`}>
    <Text className={`text-[10px] ${selected ? 'font-semibold text-white' : 'text-[#70665e]'}`}>{item.label}</Text>
  </Pressable>;
}

export default function RewardsScreen() {
  const data = useClientRewards();
  const movementsLastPage = Math.max(1, Math.ceil(data.movementTotal / 20));
  const rewardsLastPage = Math.max(1, Math.ceil(data.rewardsTotal / 20));

  return <SafeAreaView className="flex-1 bg-[#fff8ef]">
    <ScrollView className="mx-auto w-full max-w-[620px] flex-1 px-5 pt-3" contentContainerStyle={{ paddingBottom: 24 }}>
      <View className="mb-4 flex-row items-center justify-between">
        <View><Text accessibilityRole="header" className="text-2xl font-bold text-[#332d28]">Mis puntos</Text>
          <Text className="mt-1 text-xs text-[#8b8178]">Saldo, movimientos y recompensas</Text></View>
        <Pressable accessibilityRole="button" onPress={() => router.back()} className="rounded-xl bg-white px-4 py-3"><Text className="text-xs font-semibold text-[#b7472a]">Volver</Text></Pressable>
      </View>
      <View className="mb-3 rounded-2xl bg-[#2f6f4e] p-4">
        <Text className="text-xs font-medium text-white/80">Puntos disponibles</Text>
        <Text className="mt-1 text-3xl font-bold text-white">{data.balance?.availablePoints ?? '—'}</Text>
        <Text className="mt-2 text-[10px] text-white/80">Saldo {data.balance?.balance ?? '—'} · Pendientes {data.balance?.pendingPoints ?? '—'} · Reservados {data.balance?.reservedPoints ?? '—'}</Text>
        {data.settings ? <Text className="mt-2 text-[10px] text-white/80">Programa {data.settings.enabled ? 'activo' : 'inactivo'} · {data.settings.pointsPerDollar} punto(s) por dólar</Text> : null}
      </View>
      <Pressable accessibilityRole="button" onPress={data.refresh} disabled={data.refreshing} className="mb-3 self-end rounded-lg bg-white px-3 py-2"><Text className="text-xs font-semibold text-[#b7472a]">{data.refreshing ? 'Actualizando…' : 'Actualizar'}</Text></Pressable>
      {data.loading ? <Text className="mb-3 rounded-2xl bg-white p-4 text-xs text-[#8b8178]">Cargando puntos y recompensas…</Text> : null}
      {data.error ? <View className="mb-3 rounded-2xl bg-white p-4"><Text accessibilityRole="alert" className="mb-2 text-xs text-[#b7472a]">{data.error}</Text><Pressable onPress={data.refresh}><Text className="text-xs font-bold text-[#b7472a]">Reintentar</Text></Pressable></View> : null}

      <Text className="mb-2 mt-2 text-sm font-bold text-[#332d28]">Recompensas disponibles</Text>
      {!data.rewards.length && !data.loading ? <View className="mb-3 rounded-2xl bg-white p-4"><Text className="text-xs text-[#8b8178]">No hay recompensas disponibles por ahora.</Text></View> : null}
      {data.rewards.map((reward) => <View key={reward.id} className="mb-2 rounded-2xl bg-white p-4">
        <View className="flex-row items-start justify-between gap-3"><View className="flex-1"><Text className="text-sm font-bold text-[#332d28]">{reward.name}</Text><Text className="mt-1 text-xs text-[#8b8178]">{reward.productName}</Text></View><Text className="text-xs font-bold text-[#b7472a]">{reward.pointsCost} pts</Text></View>
        {reward.description ? <Text className="mt-2 text-xs leading-5 text-[#70665e]">{reward.description}</Text> : null}
        <Text className="mt-2 text-[10px] text-[#8b8178]">El canje todavía no está habilitado desde esta pantalla.</Text>
      </View>)}
      {rewardsLastPage > 1 ? <View className="mb-4 flex-row items-center justify-between"><Pressable disabled={data.rewardPage <= 1} onPress={() => data.setRewardPage(data.rewardPage - 1)}><Text className="p-2 text-xs font-bold text-[#b7472a]">Anterior</Text></Pressable><Text className="text-xs text-[#8b8178]">{data.rewardPage} / {rewardsLastPage}</Text><Pressable disabled={data.rewardPage >= rewardsLastPage} onPress={() => data.setRewardPage(data.rewardPage + 1)}><Text className="p-2 text-xs font-bold text-[#b7472a]">Siguiente</Text></Pressable></View> : null}

      <Text className="mb-2 mt-2 text-sm font-bold text-[#332d28]">Movimientos</Text>
      <View className="mb-2 flex-row flex-wrap">{movementFilters.map((item) => <Filter key={item.value || 'all'} item={item} selected={data.movementType === item.value} onPress={() => data.setMovementType(item.value)} />)}</View>
      {data.movementError ? <View className="rounded-2xl bg-white p-4"><Text accessibilityRole="alert" className="mb-2 text-xs text-[#b7472a]">{data.movementError}</Text><Pressable onPress={() => data.reloadMovements()}><Text className="text-xs font-bold text-[#b7472a]">Reintentar</Text></Pressable></View> : null}
      {!data.movements.length && !data.movementError ? <View className="mb-3 rounded-2xl bg-white p-4"><Text className="text-xs text-[#8b8178]">Todavía no hay movimientos para este filtro.</Text></View> : null}
      {data.movements.map((movement) => <View key={movement.id} className="mb-2 flex-row items-center justify-between rounded-xl bg-white px-3 py-3"><View className="flex-1"><Text className="text-xs font-semibold text-[#332d28]">{movementLabel(movement.type)}</Text><Text className="mt-1 text-[10px] text-[#8b8178]">{formatDate(movement.createdAt)}</Text></View><Text className={`text-sm font-bold ${movement.points < 0 ? 'text-[#b7472a]' : 'text-[#477052]'}`}>{pointsSign(movement)}{Math.abs(movement.points)} pts</Text></View>)}
      {movementsLastPage > 1 ? <View className="mb-6 flex-row items-center justify-between"><Pressable disabled={data.movementPage <= 1} onPress={() => data.setMovementPage(data.movementPage - 1)}><Text className="p-2 text-xs font-bold text-[#b7472a]">Anterior</Text></Pressable><Text className="text-xs text-[#8b8178]">{data.movementPage} / {movementsLastPage}</Text><Pressable disabled={data.movementPage >= movementsLastPage} onPress={() => data.setMovementPage(data.movementPage + 1)}><Text className="p-2 text-xs font-bold text-[#b7472a]">Siguiente</Text></Pressable></View> : null}
      <View className="mb-5 rounded-xl bg-[#f2e8d6] p-3"><Text className="text-[10px] leading-4 text-[#70665e]">Los puntos se acreditan y ajustan según pagos y movimientos confirmados por el servidor. Esta pantalla no crea canjes.</Text></View>
    </ScrollView>
  </SafeAreaView>;
}
