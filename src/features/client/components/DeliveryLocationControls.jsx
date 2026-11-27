import { Pressable, Text, View } from 'react-native';

export default function DeliveryLocationControls({ locationState, disabled }) {
  return <>
    <Text className="mb-2 text-[10px] leading-4 text-[#81766d]">
      Si adjuntas tu ubicación, sus coordenadas se compartirán con el personal junto con esta solicitud. La dirección escrita sigue siendo obligatoria.
    </Text>
    {locationState.capturing ? <>
      <Text className="mb-2 text-xs text-[#75695f]">Obteniendo ubicación…</Text>
      <Pressable onPress={locationState.cancel} className="mb-3 self-start">
        <Text className="text-xs font-bold text-[#b7472a]">Cancelar captura</Text>
      </Pressable>
    </> : null}
    {locationState.location ? <View className="mb-3 rounded-xl bg-white p-3">
      <Text className="text-xs font-semibold text-[#477052]">Ubicación adjunta</Text>
      <Text className="mt-1 text-[10px] text-[#75695f]">
        {locationState.location.latitude.toFixed(5)}, {locationState.location.longitude.toFixed(5)}
      </Text>
      <View className="mt-2 flex-row gap-4">
        <Pressable disabled={disabled || locationState.capturing} onPress={() => void locationState.capture()}>
          <Text className="text-xs font-bold text-[#b7472a]">Actualizar ubicación</Text>
        </Pressable>
        <Pressable disabled={disabled} onPress={locationState.remove}>
          <Text className="text-xs font-bold text-[#b7472a]">Quitar ubicación</Text>
        </Pressable>
      </View>
    </View> : <Pressable disabled={disabled || locationState.capturing} onPress={() => void locationState.capture()} className="mb-3 self-start">
      <Text className="text-xs font-bold text-[#b7472a]">Usar mi ubicación</Text>
    </Pressable>}
    {locationState.error ? <Text accessibilityRole="alert" className="mb-2 text-xs text-[#a83224]">
      {locationState.error}{locationState.location ? ' La ubicación anterior sigue adjunta.' : ''}
    </Text> : null}
  </>;
}
