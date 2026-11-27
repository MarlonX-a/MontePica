import { useCallback, useRef, useState } from 'react';
import { Alert, Image, Platform, Pressable, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import useDeliveryReceipt from '@/features/client/hooks/useDeliveryReceipt';
import { formatOrderTotal } from '@/features/client/data/orderMapper';
import { getSessionSnapshot } from '@/shared/session/sessionStore';

const maxReceiptBytes = 5 * 1024 * 1024;
const pickerOptions = { mediaTypes: ['images'], allowsEditing: false, quality: 1, exif: false };
const isNative = Platform.OS === 'ios' || Platform.OS === 'android';
let nativePickerOpen = false;

function normalizeReceiptImage(asset) {
  const mimeType = asset?.mimeType || asset?.file?.type;
  const fileSize = asset?.fileSize ?? asset?.file?.size;
  if (!asset?.uri || !['image/jpeg', 'image/png'].includes(mimeType)) return null;
  if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > maxReceiptBytes) return null;
  return { ...asset, mimeType, fileSize };
}

function confirmReceipt(title, message, actionLabel, onConfirm) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancelar', style: 'cancel' },
    { text: actionLabel, onPress: onConfirm },
  ]);
}

export default function DeliveryReceiptPanel({ order, onUpdated }) {
  const model = useDeliveryReceipt(order, onUpdated);
  const [pickerError, setPickerError] = useState('');
  const [picking, setPicking] = useState(false);
  const selection = useRef(null);
  const focused = useRef(false);
  const settlement = model.settlement;
  const expired = order.delivery?.receiptSubmissionDeadline && new Date(order.delivery.receiptSubmissionDeadline).getTime() <= Date.now();
  const canChooseImage = model.canUpload && !model.payment && !expired
    && order.status !== 'cancelled' && settlement?.totalCents > 0;

  useFocusEffect(useCallback(() => {
    focused.current = true;
    setPicking(false);
    return () => {
      focused.current = false;
      selection.current = null;
    };
  }, [order.id]));

  const chooseImage = async (source) => {
    if (!focused.current || !canChooseImage || model.sending) return;
    if (isNative && nativePickerOpen) {
      setPickerError('Cierra el selector de imágenes abierto antes de volver a intentarlo.');
      return;
    }

    const operation = {};
    const { generation } = getSessionSnapshot();
    selection.current = operation;
    const isCurrent = () => selection.current === operation && getSessionSnapshot().generation === generation;
    if (isNative) {
      nativePickerOpen = true;
      setPicking(true);
    }
    setPickerError('');
    const fromCamera = source === 'camera';

    try {
      if (fromCamera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!isCurrent()) return;
        if (!permission.granted) {
          setPickerError('Para tomar una foto, habilita la cámara en los ajustes de MontePica. También puedes elegir una imagen de la galería.');
          return;
        }
      }
      const result = fromCamera
        ? await ImagePicker.launchCameraAsync(pickerOptions)
        : await ImagePicker.launchImageLibraryAsync(pickerOptions);
      if (!isCurrent() || result.canceled) return;

      const asset = result.assets?.length === 1 ? normalizeReceiptImage(result.assets[0]) : null;
      if (!asset) {
        setPickerError('Selecciona una imagen JPEG o PNG válida de hasta 5 MiB. No se aceptan imágenes HEIC.');
        return;
      }
      model.select(asset);
    } catch {
      if (isCurrent()) setPickerError(fromCamera
        ? 'No se pudo abrir la cámara. Intenta de nuevo o elige una imagen de la galería.'
        : 'No se pudo abrir la galería. Intenta de nuevo.');
    } finally {
      if (isNative) {
        nativePickerOpen = false;
        if (focused.current) setPicking(false);
      }
      if (selection.current === operation) selection.current = null;
    }
  };
  const imageActionsDisabled = model.sending || picking;
  return <View className="mt-3 rounded-xl bg-[#f8f1e8] p-3">
    <Text className="text-xs font-bold text-[#332d28]">Liquidación del domicilio</Text>
    {model.loading ? <Text className="mt-2 text-xs text-[#8b8178]">Consultando liquidación…</Text> : null}
    {settlement ? <>
      <Text className="mt-2 text-[11px] leading-5 text-[#75695f]">Estado: {settlement.status}{'\n'}Productos: {formatOrderTotal(settlement.productsCents, settlement.currency)}{'\n'}Envío: {formatOrderTotal(settlement.shippingCents, settlement.currency)}{'\n'}Total: {formatOrderTotal(settlement.totalCents, settlement.currency)}{'\n'}Plazo de comprobante: {order.delivery?.receiptSubmissionDeadline ? new Date(order.delivery.receiptSubmissionDeadline).toLocaleString('es-EC') : 'Sin plazo disponible'}</Text>
      {model.notice ? <Text className="mt-2 text-xs text-[#477052]">{model.notice}</Text> : null}
      {model.blocked ? <Text className="mt-2 text-xs text-[#a35a45]">Ya existe una transferencia pendiente para esta liquidación. Espera la revisión del personal antes de volver a enviar.</Text> : null}
      {model.error ? <Text accessibilityRole="alert" className="mt-2 text-xs text-[#a83224]">{model.error}</Text> : null}
      {pickerError ? <Text accessibilityRole="alert" className="mt-2 text-xs text-[#a83224]">{pickerError}</Text> : null}
      {model.uncertain ? <>
        <Text className="mt-2 text-xs leading-4 text-[#a35a45]">El servidor pudo recibir el comprobante. Consultar la liquidación no confirma el resultado del envío.</Text>
        <Pressable onPress={model.refresh} className="mt-2 rounded-lg bg-white p-3"><Text className="text-center text-xs font-bold text-[#a85431]">Actualizar estado</Text></Pressable>
        <Pressable disabled={model.sending} onPress={() => confirmReceipt('Reintentar comprobante', 'Se enviará el mismo archivo con la misma clave.', 'Reintentar', model.retry)} className="mt-2 rounded-lg bg-[#b7472a] p-3"><Text className="text-center text-xs font-bold text-white">Reintentar mismo comprobante</Text></Pressable>
      </> : null}
      {canChooseImage ? <>
        {isNative ? <Pressable accessibilityRole="button" disabled={imageActionsDisabled} onPress={() => void chooseImage('camera')} className="mt-3 rounded-lg bg-white p-3">
          <Text className="text-center text-xs font-bold text-[#a85431]">Tomar foto</Text>
        </Pressable> : null}
        <Pressable accessibilityRole="button" disabled={imageActionsDisabled} onPress={() => void chooseImage('gallery')} className="mt-3 rounded-lg bg-white p-3">
          <Text className="text-center text-xs font-bold text-[#a85431]">Elegir de la galería</Text>
        </Pressable>
        {model.asset ? <>
          <Image source={{ uri: model.asset.uri }} accessibilityLabel="Vista previa del comprobante" className="mt-3 h-48 w-full rounded-xl bg-white" resizeMode="contain" />
          <Text className="mt-1 text-center text-[10px] text-[#75695f]">{model.asset.fileName || 'comprobante'} · {(model.asset.fileSize / 1024 / 1024).toFixed(2)} MiB</Text>
          <Pressable disabled={imageActionsDisabled} onPress={() => {
            selection.current = null;
            setPickerError('');
            model.select(null);
          }} className="mt-2"><Text className="text-center text-xs text-[#a85431]">Quitar imagen</Text></Pressable>
          <Pressable disabled={imageActionsDisabled} onPress={() => {
            selection.current = null;
            confirmReceipt('Enviar comprobante', 'El personal revisará la transferencia. El envío quedará pendiente de verificación.', 'Enviar', model.send);
          }} className="mt-2 rounded-xl bg-[#b7472a] p-3"><Text className="text-center text-xs font-bold text-white">{model.sending ? 'Enviando…' : 'Enviar comprobante'}</Text></Pressable>
        </> : null}
      </> : null}
      {expired && settlement.status === 'pending' ? <Text className="mt-2 text-xs text-[#a83224]">El plazo para enviar el comprobante venció.</Text> : null}
      {settlement.status === 'settled' ? <Text className="mt-2 text-xs text-[#477052]">Liquidación resuelta por el servidor.</Text> : null}
      {settlement.status === 'cancelled' ? <Text className="mt-2 text-xs text-[#8b8178]">Esta liquidación fue cancelada y ya no admite comprobantes.</Text> : null}
    </> : null}
    {!settlement && model.error ? <Pressable onPress={model.refresh} className="mt-2 rounded-lg bg-white p-3"><Text className="text-center text-xs font-bold text-[#a85431]">Reintentar consulta</Text></Pressable> : null}
  </View>;
}
