import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import AdminShell from '@/features/admin/components/AdminShell';
import { Badge, Button, Empty } from '@/features/admin/components/AdminUI';
import { getCurrentUser } from '@/shared/session/sessionStore';
import useAdminPointsRewards from '@/features/admin/hooks/useAdminPointsRewards';

const movementNames = { earn: 'Ganados', refundAdjustment: 'Ajuste', redeem: 'Canje', redemptionReturn: 'Devolución' };
const panel = 'mb-3 rounded-2xl border border-[#eee2d7] bg-white p-4';
const input = 'mb-3 min-h-11 rounded-xl border border-[#eadfd2] bg-[#fffdfa] px-3 py-2 text-xs text-[#332d28]';

function SectionTitle({ children, detail }) {
  return <View className="mb-3"><Text className="text-base font-bold text-[#332d28]">{children}</Text>{detail ? <Text className="mt-1 text-[10px] text-[#8b8178]">{detail}</Text> : null}</View>;
}

function RewardEditor({ item, products, onClose, onSave, onConflict, saving, pendingOperation }) {
  const retrying = Boolean(pendingOperation);
  const pendingValues = pendingOperation?.body || {};
  const [values, setValues] = useState({
    name: pendingValues.name ?? item?.name ?? '', description: pendingValues.description ?? item?.description ?? '', productId: pendingValues.productId ?? item?.productId ?? products[0]?.id ?? '',
    pointsCost: String(pendingValues.pointsCost ?? item?.pointsCost ?? ''), active: pendingValues.active ?? item?.active ?? true, sortOrder: String(pendingValues.sortOrder ?? item?.sortOrder ?? 0),
  });
  const [error, setError] = useState('');
  const change = (key, value) => setValues((current) => ({ ...current, [key]: value }));
  async function save() {
    const result = await onSave({ item, values });
    if (!result) onClose();
    else if (result.conflict) { onConflict(result.latest); setError(result.message); }
    else setError(result);
  }
  return <Modal visible transparent animationType="fade" onRequestClose={saving ? undefined : onClose}>
    <View className="flex-1 justify-center bg-black/40 px-4 py-6">
      <View className="max-h-[90%] w-full max-w-[480px] self-center rounded-3xl bg-[#fff8ef] p-5">
        <View className="mb-3 flex-row items-center justify-between"><Text accessibilityRole="header" className="text-lg font-bold text-[#332d28]">{item ? 'Editar recompensa' : 'Nueva recompensa'}</Text><Pressable disabled={saving} onPress={onClose} className="h-10 w-10 items-center justify-center rounded-full bg-white"><Text className="text-xl text-[#b7472a]">×</Text></Pressable></View>
        <ScrollView keyboardShouldPersistTaps="handled">
          <Text className="mb-1 text-[11px] text-[#514941]">Nombre</Text><TextInput accessibilityLabel="Nombre de recompensa" editable={!retrying} maxLength={160} value={values.name} onChangeText={(v) => change('name', v)} className={input} />
          <Text className="mb-1 text-[11px] text-[#514941]">Descripción (opcional, máximo 500)</Text><TextInput accessibilityLabel="Descripción de recompensa" editable={!retrying} multiline maxLength={500} value={values.description} onChangeText={(v) => change('description', v)} className={`${input} min-h-20`} />
          {!item ? <><Text className="mb-2 text-[11px] text-[#514941]">Producto</Text>{products.map((product) => <Pressable key={product.id} disabled={retrying} onPress={() => change('productId', product.id)} className={`mb-2 rounded-xl border p-3 ${values.productId === product.id ? 'border-[#b7472a] bg-[#fff0e7]' : 'border-[#eadfd2] bg-white'}`}><Text className="text-xs font-semibold text-[#332d28]">{product.name}</Text><Text className="mt-1 text-[10px] text-[#8b8178]">{product.sku}</Text></Pressable>)}</> : <View className="mb-3 rounded-xl bg-[#f2e8d6] p-3"><Text className="text-[10px] text-[#70665e]">Producto asociado: {item.productName}. El producto no se puede cambiar al editar.</Text></View>}
          <Text className="mb-1 text-[11px] text-[#514941]">Costo en puntos</Text><TextInput accessibilityLabel="Costo en puntos" editable={!retrying} keyboardType="number-pad" value={values.pointsCost} onChangeText={(v) => change('pointsCost', v)} className={input} />
          <Text className="mb-1 text-[11px] text-[#514941]">Orden</Text><TextInput accessibilityLabel="Orden de visualización" editable={!retrying} keyboardType="number-pad" value={values.sortOrder} onChangeText={(v) => change('sortOrder', v)} className={input} />
          <View className="mb-3 flex-row items-center justify-between rounded-xl bg-white px-3 py-2"><Text className="text-xs text-[#514941]">Recompensa activa</Text><Switch disabled={retrying} value={values.active} onValueChange={(v) => change('active', v)} /></View>
          {error ? <Text accessibilityRole="alert" className="mb-3 text-xs text-[#b7472a]">{error}</Text> : null}
          {retrying ? <Text className="mb-3 text-[10px] text-[#9c7b31]">El envío anterior quedó incierto. Reintenta sin cambiar los datos para conservar su clave.</Text> : null}
          <Button disabled={saving} onPress={save}>{saving ? 'Guardando…' : retrying ? 'Reintentar el mismo envío' : item ? 'Guardar cambios' : 'Crear recompensa'}</Button>
        </ScrollView>
      </View>
    </View>
  </Modal>;
}

export default function PointsRewardsScreen() {
  const { clientId: requestedClientId } = useLocalSearchParams();
  const permissions = getCurrentUser()?.permissions || [];
  const data = useAdminPointsRewards(permissions, typeof requestedClientId === 'string' ? requestedClientId : '');
  const [lookupDraft, setLookupDraft] = useState(typeof requestedClientId === 'string' ? requestedClientId : '');
  const [editor, setEditor] = useState(null);
  const [searchDraft, setSearchDraft] = useState('');
  const [pointsConfirm, setPointsConfirm] = useState(false);
  const rewardPages = Math.max(1, Math.ceil(data.rewardTotal / 20));
  const clientPages = Math.max(1, Math.ceil(data.clientMovementTotal / 20));

  useEffect(() => {
    if (typeof requestedClientId === 'string' && requestedClientId) {
      setLookupDraft(requestedClientId);
      void data.lookupClient(requestedClientId);
    }
  // Only initialize the selected user when navigation provides one.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedClientId]);

  const lookup = async (id = lookupDraft, page = 1) => {
    setLookupDraft(id);
    await data.lookupClient(id, page);
  };

  return <AdminShell title="Puntos y recompensas" subtitle="Programa de fidelización" showAdd={false}>
    {data.error ? <View className={panel}><Text accessibilityRole="alert" className="mb-2 text-xs text-[#b7472a]">{data.error}</Text><Button onPress={data.refresh}>Reintentar</Button></View> : null}
    {data.loading ? <View className={panel}><Text className="text-xs text-[#8b8178]">Cargando información del programa…</Text></View> : null}

    {data.permissions.canReadPoints || data.permissions.canConfigurePoints ? <View className={panel}>
      <SectionTitle detail="Los pagos confirmados generan movimientos de acuerdo con esta tasa.">Programa de puntos</SectionTitle>
      {!data.settings ? <Text className="text-xs text-[#8b8178]">No se pudo consultar la configuración.</Text> : <>
        <View className="mb-3 flex-row items-center justify-between rounded-xl bg-[#fff8ef] px-3 py-2"><View><Text className="text-xs font-semibold text-[#332d28]">Programa habilitado</Text><Text className="text-[10px] text-[#8b8178]">Versión {data.settings.version}</Text></View><Switch disabled={!data.permissions.canConfigurePoints || Boolean(data.settingsOperation && !pointsConfirm)} value={data.settingsDraft?.enabled ?? data.settings.enabled} onValueChange={(value) => data.setSettingsDraft((current) => ({ ...current, enabled: value }))} /></View>
        <Text className="mb-1 text-[11px] text-[#514941]">Puntos por dólar (entero de 1 a 1000)</Text><TextInput accessibilityLabel="Puntos por dólar" editable={data.permissions.canConfigurePoints && (!data.settingsOperation || pointsConfirm)} keyboardType="number-pad" value={data.settingsDraft?.pointsPerDollar || ''} onChangeText={(value) => data.setSettingsDraft((current) => ({ ...current, pointsPerDollar: value }))} className={input} />
        {data.settingsError ? <Text accessibilityRole="alert" className="mb-2 text-xs text-[#b7472a]">{data.settingsError}</Text> : null}
        {data.settingsNotice ? <Text className="mb-2 text-xs text-[#477052]">{data.settingsNotice}</Text> : null}
        {data.settingsOperation && !pointsConfirm ? <View className="mb-2 rounded-xl bg-[#fff0c7] p-3"><Text className="mb-2 text-[10px] text-[#70665e]">El resultado quedó incierto. Reintenta con la misma clave o descarta solo después de confirmar el estado con el equipo.</Text><Button disabled={data.settingsBusy} onPress={data.retrySettings}>Reintentar configuración</Button></View> : null}
        {data.permissions.canConfigurePoints && !data.settingsOperation ? <Button onPress={async () => { await data.prepareSettings(); setPointsConfirm(true); }}>Guardar configuración</Button> : null}
        {pointsConfirm && data.settingsOperation ? <View className="mt-3 rounded-xl bg-[#f2e8d6] p-3"><Text className="mb-2 text-xs text-[#514941]">¿Confirmas aplicar la nueva tasa y el estado del programa? La configuración crea una versión nueva y afecta los cálculos futuros.</Text><View className="flex-row gap-2"><View className="flex-1"><Button disabled={data.settingsBusy} onPress={async () => { await data.confirmSettings(); setPointsConfirm(false); }}>Confirmar</Button></View><Pressable disabled={data.settingsBusy} onPress={() => { setPointsConfirm(false); data.cancelSettingsPreparation(); }} className="min-h-11 justify-center rounded-xl bg-white px-4"><Text className="text-xs text-[#b7472a]">Cancelar</Text></Pressable></View></View> : null}
      </>}
    </View> : null}

    {data.permissions.canReadPoints ? <View className={panel}>
      <SectionTitle detail="Consulta el saldo y el historial usando el UUID de cliente del backend.">Puntos por cliente</SectionTitle>
      <TextInput accessibilityLabel="UUID del cliente" autoCapitalize="none" value={lookupDraft} onChangeText={setLookupDraft} placeholder="UUID del cliente" className={input} />
      <Button disabled={data.clientLoading} onPress={() => lookup()}>{data.clientLoading ? 'Consultando…' : 'Consultar puntos'}</Button>
      {data.clientError ? <Text accessibilityRole="alert" className="mt-2 text-xs text-[#b7472a]">{data.clientError}</Text> : null}
      {data.clientBalance ? <><View className="mt-3 rounded-xl bg-[#f2e8d6] p-3"><Text className="text-xs font-semibold text-[#332d28]">Disponibles: {data.clientBalance.availablePoints}</Text><Text className="mt-1 text-[10px] text-[#70665e]">Saldo {data.clientBalance.balance} · Pendientes {data.clientBalance.pendingPoints} · Reservados {data.clientBalance.reservedPoints}</Text></View>
        <Text className="mb-2 mt-3 text-xs font-bold text-[#332d28]">Movimientos</Text>{data.clientMovements.map((movement) => <View key={movement.id} className="mb-2 flex-row justify-between rounded-lg bg-[#fff8ef] p-3"><Text className="text-[10px] text-[#514941]">{movementNames[movement.type] || movement.type} · {new Date(movement.createdAt).toLocaleDateString('es-EC')}</Text><Text className="text-[10px] font-bold text-[#477052]">{movement.points} pts</Text></View>)}
        {!data.clientMovements.length ? <Empty>No hay movimientos en esta página.</Empty> : null}
        {clientPages > 1 ? <View className="flex-row items-center justify-between"><Pressable disabled={data.clientMovementPage <= 1} onPress={() => lookup(data.clientId, data.clientMovementPage - 1)}><Text className="p-2 text-xs font-bold text-[#b7472a]">Anterior</Text></Pressable><Text className="text-xs text-[#8b8178]">{data.clientMovementPage} / {clientPages}</Text><Pressable disabled={data.clientMovementPage >= clientPages} onPress={() => lookup(data.clientId, data.clientMovementPage + 1)}><Text className="p-2 text-xs font-bold text-[#b7472a]">Siguiente</Text></Pressable></View> : null}
      </> : null}
    </View> : null}

    {data.permissions.canReadRewards || data.permissions.canManageRewards ? <View className={panel}>
      <View className="mb-3 flex-row items-start justify-between"><SectionTitle detail="Productos vinculados a las recompensas configuradas.">Catálogo de recompensas</SectionTitle>{data.permissions.canManageRewards ? <Pressable accessibilityRole="button" disabled={!data.products.length || data.loading} onPress={() => setEditor({ pending: data.getPendingRewardWrite('new') })} className="rounded-xl bg-[#b7472a] px-3 py-2"><Text className="text-[10px] font-bold text-white">＋ Crear</Text></Pressable> : null}</View>
      {data.permissions.canManageRewards && !data.products.length && !data.loading ? <Text className="mb-3 text-[10px] text-[#8b8178]">No hay productos disponibles para vincular a una recompensa.</Text> : null}
      {data.permissions.canReadRewards ? <>
      <TextInput accessibilityLabel="Buscar recompensas" value={searchDraft} onChangeText={setSearchDraft} onSubmitEditing={() => { data.setRewardSearch(searchDraft); data.setRewardPage(1); }} placeholder="Buscar recompensa" className={input} />
      {data.rewardNotice ? <View className="mb-3 rounded-xl bg-[#deecdf] p-3"><Text className="text-xs text-[#477052]">{data.rewardNotice}</Text><Pressable onPress={data.refresh}><Text className="mt-2 text-xs font-bold text-[#477052]">Actualizar catálogo</Text></Pressable></View> : null}
      <View className="mb-3 flex-row gap-2">{[{ key: 'all', label: 'Todas' }, { key: 'active', label: 'Activas' }, { key: 'inactive', label: 'Inactivas' }].map((filter) => <Pressable key={filter.key} accessibilityRole="button" accessibilityState={{ selected: data.rewardActive === filter.key }} onPress={() => { data.setRewardActive(filter.key); data.setRewardPage(1); }} className={`rounded-full px-3 py-2 ${data.rewardActive === filter.key ? 'bg-[#8e3b27]' : 'bg-[#f2e8d6]'}`}><Text className={`text-[10px] ${data.rewardActive === filter.key ? 'text-white' : 'text-[#70665e]'}`}>{filter.label}</Text></Pressable>)}</View>
      {data.rewardDetailError ? <Text accessibilityRole="alert" className="mb-2 text-xs text-[#b7472a]">{data.rewardDetailError}</Text> : null}
      {data.rewards.map((reward) => <View key={reward.id} className="mb-2 rounded-xl bg-[#fff8ef] p-3"><View className="flex-row items-start justify-between"><View className="flex-1"><Text className="text-xs font-bold text-[#332d28]">{reward.name}</Text><Text className="mt-1 text-[10px] text-[#8b8178]">{reward.productName} · {reward.pointsCost} pts</Text></View><Badge tone={reward.active ? 'green' : 'sand'}>{reward.active ? 'Activa' : 'Inactiva'}</Badge></View>{reward.description ? <Text className="mt-2 text-[10px] text-[#70665e]">{reward.description}</Text> : null}<Text className="mt-1 text-[9px] text-[#8b8178]">Versión {reward.version} · Orden {reward.sortOrder}</Text>{data.permissions.canManageRewards ? <Pressable disabled={data.rewardDetailLoading} onPress={async () => { const pending = data.getPendingRewardWrite(reward.id); if (pending) { setEditor({ item: { ...reward, version: pending.body.expectedVersion }, pending }); return; } const current = await data.loadRewardForEdit(reward.id); if (current) setEditor({ item: current, pending: null }); }} className="mt-2 self-end rounded-lg bg-white px-3 py-2"><Text className="text-[10px] font-semibold text-[#b7472a]">{data.rewardDetailLoading ? 'Consultando…' : 'Editar'}</Text></Pressable> : null}</View>)}
      {!data.rewards.length ? <Empty>Prueba actualizar la lista o cambia los filtros.</Empty> : null}
      {rewardPages > 1 ? <View className="flex-row items-center justify-between"><Pressable disabled={data.rewardPage <= 1} onPress={() => data.setRewardPage(data.rewardPage - 1)}><Text className="p-2 text-xs font-bold text-[#b7472a]">Anterior</Text></Pressable><Text className="text-xs text-[#8b8178]">{data.rewardPage} / {rewardPages} · {data.rewardTotal}</Text><Pressable disabled={data.rewardPage >= rewardPages} onPress={() => data.setRewardPage(data.rewardPage + 1)}><Text className="p-2 text-xs font-bold text-[#b7472a]">Siguiente</Text></Pressable></View> : null}
      </> : <Text className="text-xs text-[#8b8178]">Tu permiso permite crear recompensas, pero no consultar el catálogo para editar las existentes.</Text>}
    </View> : null}
    {!data.permissions.canReadPoints && !data.permissions.canConfigurePoints && !data.permissions.canReadRewards && !data.permissions.canManageRewards ? <View className={panel}><Text className="text-xs text-[#8b8178]">Tu cuenta no tiene permisos para puntos o recompensas.</Text><Button onPress={() => router.back()}>Volver</Button></View> : null}
    {editor ? <RewardEditor item={editor.item} pendingOperation={data.getPendingRewardWrite(editor.item?.id || 'new')} products={data.products} saving={data.rewardSaving} onSave={data.saveReward} onConflict={(latest) => setEditor((current) => ({ ...current, item: latest }))} onClose={() => setEditor(null)} /> : null}
  </AdminShell>;
}
