import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import useAdminParticipants from '@/features/admin/hooks/useAdminParticipants';
const filters = {
  pending: 'Pendientes',
  approved: 'Aprobadas',
  rejected: 'Rechazadas',
  cancelled: 'Canceladas',
  finished: 'Finalizadas',
  all: 'Todas',
};
function Button({ children, onPress, disabled }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      className={`mt-2 min-h-11 items-center justify-center rounded-xl bg-[#b7472a] px-3 py-2 ${disabled ? 'opacity-50' : ''}`}
    >
      <Text className="text-xs font-semibold text-white">{children}</Text>
    </Pressable>
  );
}
export default function VisitParticipants({
  visitId,
  externalBusy,
  onBusy,
  refreshKey,
}) {
  const model = useAdminParticipants(visitId);
  const [editor, setEditor] = useState(null);
  const [reason, setReason] = useState('');
  const [validation, setValidation] = useState('');
  useEffect(() => {
    onBusy(model.busy);
    return () => onBusy(false);
  }, [model.busy, onBusy]);
  useEffect(() => {
    if (refreshKey) void model.refresh();
  }, [refreshKey]);
  const disabled = externalBusy || model.busy || model.loading;
  async function confirm() {
    const trimmed = reason.trim();
    if (editor.action === 'reject' && (!trimmed || trimmed.length > 500)) {
      setValidation('Escribe un motivo de entre 1 y 500 caracteres.');
      return;
    }
    setValidation('');
    if (await model.decide(editor.item, editor.action, trimmed)) {
      setEditor(null);
      setReason('');
    }
  }
  return (
    <View className="my-3 rounded-xl border border-[#eadfd2] bg-white p-4">
      <Text className="text-base font-bold text-[#332d28]">Participantes</Text>
      <View className="flex-row flex-wrap gap-2">
        {Object.entries(filters).map(([value, label]) => (
          <Button
            key={value}
            disabled={disabled || !!model.uncertain}
            onPress={() => {
              setEditor(null);
              model.filter(value);
            }}
          >
            {model.status === value ? `✓ ${label}` : label}
          </Button>
        ))}
      </View>
      <Text className="mt-3 text-xs text-[#8b8178]">
        {model.total} registros · Página {model.page}
      </Text>
      {model.loading ? <ActivityIndicator color="#b7472a" /> : null}
      {model.error ? (
        <Text accessibilityRole="alert" className="mt-2 text-sm text-[#b7472a]">
          {model.error}
        </Text>
      ) : null}
      {model.notice ? (
        <Text accessibilityRole="alert" className="mt-2 text-xs text-[#477052]">
          {model.notice}
        </Text>
      ) : null}
      {!model.loading && !model.error && !model.items.length ? (
        <Text className="mt-3 text-sm text-[#8b8178]">
          No hay participantes en este filtro.
        </Text>
      ) : null}
      {model.items.map((item) => (
        <View key={item.id} className="mt-3 rounded-xl bg-[#fff8ef] p-3">
          <Text className="font-bold text-[#332d28]">{item.alias}</Text>
          <Text className="mt-1 text-xs text-[#8b8178]">
            {filters[item.status] ?? item.status} ·{' '}
            {new Date(item.requestedAt).toLocaleString()}
          </Text>
          {item.rejectionReason ? (
            <Text className="mt-1 text-xs text-[#b7472a]">
              {item.rejectionReason}
            </Text>
          ) : null}
          {item.status === 'pending' && !model.error && !model.uncertain ? (
            <View className="flex-row gap-2">
              <Button
                disabled={disabled}
                onPress={() => {
                  setEditor({ item, action: 'approve' });
                  setReason('');
                }}
              >
                Aprobar
              </Button>
              <Button
                disabled={disabled}
                onPress={() => {
                  setEditor({ item, action: 'reject' });
                  setReason('');
                }}
              >
                Rechazar
              </Button>
            </View>
          ) : null}
        </View>
      ))}
      {editor && !model.uncertain ? (
        <View className="mt-3 rounded-xl border border-[#eadfd2] p-3">
          <Text className="text-sm text-[#332d28]">
            {editor.action === 'approve'
              ? `¿Aprobar a ${editor.item.alias}? Se autorizará su participación y se creará una cuenta individual de consumo.`
              : `Motivo de rechazo para ${editor.item.alias}`}
          </Text>
          {editor.action === 'reject' ? (
            <TextInput
              accessibilityLabel="Motivo de rechazo"
              multiline
              editable={!disabled}
              value={reason}
              onChangeText={setReason}
              className="mt-2 min-h-20 rounded-xl border border-[#eadfd2] p-3"
            />
          ) : null}
          {validation ? (
            <Text accessibilityRole="alert" className="text-xs text-[#b7472a]">
              {validation}
            </Text>
          ) : null}
          <Button disabled={disabled || !!model.error} onPress={confirm}>
            Confirmar decisión
          </Button>
          <Button disabled={disabled} onPress={() => setEditor(null)}>
            Cancelar
          </Button>
        </View>
      ) : null}
      {model.uncertain ? (
        <>
          <Text className="mt-3 text-xs text-[#b7472a]">
            Resultado incierto. Consulta el estado o reintenta la misma decisión
            con su clave y motivo originales.
          </Text>
          <Button
            disabled={disabled}
            onPress={async () => {
              if (await model.retry()) setEditor(null);
            }}
          >
            Reintentar misma decisión
          </Button>
        </>
      ) : null}
      <Button disabled={disabled} onPress={model.refresh}>
        Actualizar participantes
      </Button>
      <View className="flex-row gap-2">
        <Button
          disabled={disabled || !!model.uncertain || model.page <= 1}
          onPress={() => model.changePage(model.page - 1)}
        >
          Anterior
        </Button>
        <Button
          disabled={
            disabled || !!model.uncertain || model.page * 20 >= model.total
          }
          onPress={() => model.changePage(model.page + 1)}
        >
          Siguiente
        </Button>
      </View>
    </View>
  );
}
