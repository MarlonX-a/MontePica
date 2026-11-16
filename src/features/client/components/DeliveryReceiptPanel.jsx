import { useState } from 'react';
import { Alert, Image, Pressable, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import useDeliveryReceipt from '@/features/client/hooks/useDeliveryReceipt';
import { formatOrderTotal } from '@/features/client/data/orderMapper';

export default function DeliveryReceiptPanel({ order, onUpdated }) {
  const model = useDeliveryReceipt(order, onUpdated);
  const [pickerError, setPickerError] = useState('');
  const chooseImage = async () => {
    setPickerError('');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 1, exif: false });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      const mimeType = asset?.mimeType || asset?.file?.type;
      const fileSize = asset?.fileSize ?? asset?.file?.size;
      if (!asset || !['image/jpeg', 'image/png'].includes(mimeType) || !fileSize || fileSize > 5 * 1024 * 1024) {
        setPickerError('Selecciona una imagen JPEG o PNG válida de hasta 5 MiB. No se aceptan imágenes HEIC.');
        return;
      }
      model.select({ ...asset, mimeType, fileSize });
    } catch { setPickerError('No se pudo abrir la galería. Revisa los permisos e inténtalo de nuevo.'); }
  };
  const settlement = model.settlement;
  const expired = order.delivery?.receiptSubmissionDeadline && new Date(order.delivery.receiptSubmissionDeadline).getTime() <= Date.now();
  return <View className="mt-3 rounded-xl bg-[#f8f1e8] p-3">
    <Text className="text-xs font-bold text-[#23382b]">Liquidación del domicilio</Text>
    {model.loading ? <Text className="mt-2 text-xs text-[#687363]">Consultando liquidación…</Text> : null}
    {settlement ? <>
      <Text className="mt-2 text-[11px] leading-5 text-[#75695f]">Estado: {settlement.status}{'\n'}Productos: {formatOrderTotal(settlement.productsCents, settlement.currency)}{'\n'}Envío: {formatOrderTotal(settlement.shippingCents, settlement.currency)}{'\n'}Total: {formatOrderTotal(settlement.totalCents, settlement.currency)}{'\n'}Plazo de comprobante: {order.delivery?.receiptSubmissionDeadline ? new Date(order.delivery.receiptSubmissionDeadline).toLocaleString('es-EC') : 'Sin plazo disponible'}</Text>
      {model.notice ? <Text className="mt-2 text-xs text-[#477052]">{model.notice}</Text> : null}
      {model.blocked ? <Text className="mt-2 text-xs text-[#a35a45]">Ya existe una transferencia pendiente para esta liquidación. Espera la revisión del personal antes de volver a enviar.</Text> : null}
      {model.error ? <Text accessibilityRole="alert" className="mt-2 text-xs text-[#a83224]">{model.error}</Text> : null}
      {pickerError ? <Text accessibilityRole="alert" className="mt-2 text-xs text-[#a83224]">{pickerError}</Text> : null}
      {model.uncertain ? <>
        <Text className="mt-2 text-xs leading-4 text-[#a35a45]">El servidor pudo recibir el comprobante. Consultar la liquidación no confirma el resultado del envío.</Text>
        <Pressable onPress={model.refresh} className="mt-2 rounded-lg bg-white p-3"><Text className="text-center text-xs font-bold text-[#6f741b]">Actualizar estado</Text></Pressable>
        <Pressable disabled={model.sending} onPress={() => Alert.alert('Reintentar comprobante', 'Se enviará el mismo archivo con la misma clave.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Reintentar', onPress: model.retry }])} className="mt-2 rounded-lg bg-[#24543a] p-3"><Text className="text-center text-xs font-bold text-white">Reintentar mismo comprobante</Text></Pressable>
      </> : null}
      {model.canUpload && !model.payment && !expired ? <>
        <Pressable disabled={model.sending} onPress={() => void chooseImage()} className="mt-3 rounded-lg bg-white p-3"><Text className="text-center text-xs font-bold text-[#6f741b]">{model.asset ? 'Cambiar imagen' : 'Seleccionar comprobante'}</Text></Pressable>
        {model.asset ? <>
          <Image source={{ uri: model.asset.uri }} accessibilityLabel="Vista previa del comprobante" className="mt-3 h-48 w-full rounded-xl bg-white" resizeMode="contain" />
          <Text className="mt-1 text-center text-[10px] text-[#75695f]">{model.asset.fileName || 'comprobante'} · {(model.asset.fileSize / 1024 / 1024).toFixed(2)} MiB</Text>
          <Pressable disabled={model.sending} onPress={() => model.select(null)} className="mt-2"><Text className="text-center text-xs text-[#6f741b]">Quitar imagen</Text></Pressable>
          <Pressable disabled={model.sending} onPress={() => Alert.alert('Enviar comprobante', 'El personal revisará la transferencia. El envío quedará pendiente de verificación.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Enviar', onPress: model.send }])} className="mt-2 rounded-xl bg-[#24543a] p-3"><Text className="text-center text-xs font-bold text-white">{model.sending ? 'Enviando…' : 'Enviar comprobante'}</Text></Pressable>
        </> : null}
      </> : null}
      {expired && settlement.status === 'pending' ? <Text className="mt-2 text-xs text-[#a83224]">El plazo para enviar el comprobante venció.</Text> : null}
      {settlement.status === 'settled' ? <Text className="mt-2 text-xs text-[#477052]">Liquidación resuelta por el servidor.</Text> : null}
      {settlement.status === 'cancelled' ? <Text className="mt-2 text-xs text-[#687363]">Esta liquidación fue cancelada y ya no admite comprobantes.</Text> : null}
    </> : null}
    {!settlement && model.error ? <Pressable onPress={model.refresh} className="mt-2 rounded-lg bg-white p-3"><Text className="text-center text-xs font-bold text-[#6f741b]">Reintentar consulta</Text></Pressable> : null}
  </View>;
}
