import { Pressable, Text, View } from 'react-native';

export function OperationButton({ children, onPress, disabled = false }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={
        disabled
          ? 'my-1 rounded-xl bg-[#eee2d7] p-3'
          : 'my-1 rounded-xl bg-[#f2e8d6] p-3'
      }
    >
      <Text className="text-xs font-bold text-[#8e3b27]">{children}</Text>
    </Pressable>
  );
}

export default function OperationControls({ model }) {
  return (
    <View>
      {model.error ? (
        <Text accessibilityRole="alert" className="my-2 text-xs text-[#a83224]">
          {model.error}
        </Text>
      ) : null}
      {model.notice ? (
        <Text className="my-2 text-xs text-[#477052]">{model.notice}</Text>
      ) : null}
      {model.busy ? (
        <Text className="my-2 text-xs text-[#75695f]">Procesando…</Text>
      ) : null}
      {model.confirmation ? (
        <View className="my-2 rounded-xl border border-[#eadfd2] p-3">
          <Text className="text-sm font-bold text-[#332d28]">
            {model.confirmation.title}
          </Text>
          <Text className="my-2 text-xs text-[#75695f]">
            {model.confirmation.message}
          </Text>
          <OperationButton onPress={model.confirm} disabled={model.busy}>
            Confirmar
          </OperationButton>
          <OperationButton
            onPress={model.cancelConfirmation}
            disabled={model.busy}
          >
            Volver
          </OperationButton>
        </View>
      ) : null}
      {model.operation && !model.busy ? (
        <View className="my-2 rounded-xl bg-[#fff0c7] p-3">
          <Text className="text-xs text-[#6c5425]">
            El resultado del envío sigue pendiente de confirmar.
          </Text>
          <OperationButton onPress={model.reconcile}>
            Consultar estado
          </OperationButton>
          {model.canRetry ? (
            <OperationButton onPress={model.retry}>
              Reintentar el mismo envío
            </OperationButton>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
