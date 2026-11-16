import { Alert, Modal, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { Badge, Button } from '@/features/admin/components/AdminUI';

function formatCurrency(cents, currency = 'USD') {
  return (cents / 100).toLocaleString('es-EC', { style: 'currency', currency });
}

function Field({ label, value, onChangeText, keyboardType = 'default', multiline = false, maxLength, editable }) {
  return <View className="mb-4">
    <Text className="mb-2 text-xs font-medium text-[#455343]">{label}</Text>
    <TextInput
      accessibilityLabel={label}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      multiline={multiline}
      maxLength={maxLength}
      editable={editable}
      className={`rounded-xl border border-[#dedfce] bg-white px-4 py-3 text-sm text-[#23382b] ${multiline ? 'min-h-24' : 'min-h-12'}`}
    />
  </View>;
}

export default function DeliverySettingsPanel({ model }) {
  const settings = model.settings;
  const canEdit = model.canConfigure;
  const locked = model.saving || model.preflighting || Boolean(model.uncertain);

  function confirmSave() {
    if (model.versionChanged) {
      Alert.alert(
        'La configuración cambió',
        '¿Confirmas crear una nueva versión usando los valores que tienes en el formulario?',
        [{ text: 'Seguir revisando', style: 'cancel' }, { text: 'Crear versión', onPress: () => void model.save(true) }],
      );
      return;
    }
    Alert.alert(
      'Guardar configuración',
      'Se creará una nueva versión. Las solicitudes pendientes conservarán su versión y podrían dejar de cumplir las condiciones actuales para ser aprobadas.',
      [{ text: 'Cancelar', style: 'cancel' }, { text: 'Guardar', onPress: () => void model.save() }],
    );
  }

  return <>
    <View className="mb-4 rounded-2xl bg-white p-4">
      <View className="mb-3 flex-row items-center justify-between gap-3">
        <View className="flex-1">
          <Text className="text-base font-bold text-[#23382b]">Configuración de domicilios</Text>
          {settings ? <Text className="mt-1 text-[10px] text-[#687363]">Versión {settings.version}</Text> : null}
        </View>
        {settings ? <Badge tone={settings.enabled ? 'green' : 'sand'}>{settings.enabled ? 'Habilitado' : 'Deshabilitado'}</Badge> : null}
      </View>
      {model.loading ? <Text className="text-xs text-[#687363]">Cargando configuración…</Text> : null}
      {!model.loading && settings ? <>
        <Text className="text-xs leading-5 text-[#75695f]">Cobertura: {settings.coverageDescription}</Text>
        <Text className="mt-1 text-xs text-[#75695f]">Tarifa: {formatCurrency(settings.shippingFeeCents, settings.currency)}</Text>
        <Text className="mt-1 text-xs text-[#75695f]">Plazo para comprobante: {Math.floor(settings.receiptSubmissionSeconds / 60)} min</Text>
      </> : null}
      {model.error ? <Text accessibilityRole="alert" className="mt-3 text-xs text-[#a83224]">{model.error}</Text> : null}
      {model.notice ? <Text className="mt-3 text-xs text-[#477052]">{model.notice}</Text> : null}
      {model.uncertain ? <>
        <Text className="mt-3 text-xs leading-5 text-[#a35a45]">El resultado del guardado no está confirmado. Consulta la versión actual o reintenta exactamente el mismo cambio con su clave original.</Text>
        <View className="mt-3 gap-2">
          <Button secondary onPress={model.reconcile}>Consultar configuración</Button>
          <Button onPress={model.retry}>Reintentar mismo guardado</Button>
        </View>
      </> : null}
      <View className="mt-3 flex-row gap-2">
        {settings && !model.saving ? <View className="flex-1"><Button secondary onPress={() => void model.load(true)}>{model.loading ? 'Actualizando…' : 'Actualizar'}</Button></View> : null}
        {model.error && !settings ? <View className="flex-1"><Button secondary onPress={() => void model.load(true)}>Reintentar consulta</Button></View> : null}
        {canEdit && settings && !model.uncertain ? <View className="flex-1"><Button onPress={() => void model.openEditor()}>Editar configuración</Button></View> : null}
        {canEdit && !settings && model.error ? <View className="flex-1"><Button onPress={() => void model.openEditor()}>Abrir editor e intentar</Button></View> : null}
      </View>
      {!canEdit ? <Text className="mt-2 text-[10px] text-[#687363]">Tu cuenta puede consultar esta configuración, pero no editarla.</Text> : null}
    </View>

    <Modal visible={model.editorOpen} transparent animationType="slide" onRequestClose={model.closeEditor}>
      <View className="flex-1 justify-center bg-black/40 px-4 py-6">
        <View className="max-h-[90%] w-full max-w-[520px] self-center rounded-3xl bg-[#f8f5ec] p-5">
          <View className="mb-4 flex-row items-center justify-between">
            <View>
              <Text accessibilityRole="header" className="text-lg font-bold text-[#23382b]">Editar domicilios</Text>
              {model.baselineVersion ? <Text className="mt-1 text-[10px] text-[#687363]">Partiendo de la versión {model.baselineVersion}</Text> : null}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Cerrar editor" disabled={model.saving || model.preflighting} onPress={model.closeEditor} className="h-10 w-10 items-center justify-center rounded-full bg-white"><Text className="text-xl text-[#24543a]">×</Text></Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">
            {model.editorLoading ? <Text className="py-8 text-center text-xs text-[#687363]">Consultando configuración actual…</Text> : null}
            {!model.editorLoading && !model.form ? <>
              {model.error ? <Text accessibilityRole="alert" className="mb-3 text-xs text-[#a83224]">{model.error}</Text> : null}
              <Button secondary onPress={() => void model.openEditor()}>Reintentar carga</Button>
            </> : null}
            {model.form ? <>
              <View className="mb-4 flex-row items-center justify-between rounded-xl bg-white p-3">
                <View className="flex-1 pr-3">
                  <Text className="text-xs font-medium text-[#455343]">Servicio habilitado</Text>
                  <Text className="mt-1 text-[10px] text-[#687363]">Permite crear nuevas solicitudes de domicilio.</Text>
                </View>
                <Switch value={model.form.enabled} onValueChange={(value) => model.changeField('enabled', value)} disabled={locked} trackColor={{ false: '#d5c8ba', true: '#d28b73' }} thumbColor={model.form.enabled ? '#24543a' : '#f5f0e8'} />
              </View>
              <Field label="Descripción de cobertura (1 a 500 caracteres)" value={model.form.coverageDescription} onChangeText={(value) => model.changeField('coverageDescription', value)} multiline maxLength={500} editable={!locked} />
              <Field label="Tarifa de envío (USD)" value={model.form.shippingFee} onChangeText={(value) => model.changeField('shippingFee', value)} keyboardType="decimal-pad" editable={!locked} />
              <Field label="Plazo para enviar comprobante (segundos)" value={model.form.receiptSubmissionSeconds} onChangeText={(value) => model.changeField('receiptSubmissionSeconds', value)} keyboardType="number-pad" editable={!locked} />
              <Text className="-mt-2 mb-4 text-[10px] text-[#687363]">Entre 60 y 86400 segundos. La tarifa acepta hasta dos decimales.</Text>
              {model.versionChanged ? <Text className="mb-3 rounded-xl bg-[#fff0c7] p-3 text-xs leading-5 text-[#80622a]">{model.notice} Los valores escritos se conservaron. Revisa el formulario antes de confirmar.</Text> : null}
              {model.validationError ? <Text accessibilityRole="alert" className="mb-3 text-xs text-[#a83224]">{model.validationError}</Text> : null}
              {model.error ? <Text accessibilityRole="alert" className="mb-3 text-xs text-[#a83224]">{model.error}</Text> : null}
              <Button onPress={confirmSave}>{model.preflighting ? 'Verificando versión…' : model.saving ? 'Guardando…' : model.versionChanged ? 'Confirmar nueva versión' : 'Guardar configuración'}</Button>
            </> : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  </>;
}
