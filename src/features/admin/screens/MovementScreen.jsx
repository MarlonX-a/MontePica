import { useState } from 'react';
import { Alert, Image, Pressable, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import AdminShell from '@/features/admin/components/AdminShell';
import { useAdmin } from '@/features/admin/components/AdminProvider';
import { Button, Chips } from '@/features/admin/components/AdminUI';

const movementTypes = ['Reposición', 'Consumo interno', 'Obsequio', 'Desperdicio', 'Ajuste'];

export default function MovementScreen() {
  const { products, setProducts } = useAdmin();
  const params = useLocalSearchParams();
  const selected = products.find((product) => product.id === params.productId) || products[0];
  const [type, setType] = useState('Reposición');
  const [quantity, setQuantity] = useState('12');
  const [reference, setReference] = useState('Compra proveedor Mar Azul · Fact. 0183');
  const [message, setMessage] = useState('');
  const [receiptUri, setReceiptUri] = useState(null);

  async function chooseReceipt(source) {
    const options = {
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    };
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    if (!result.canceled && result.assets?.[0]?.uri) {
      setReceiptUri(result.assets[0].uri);
    }
  }

  function handleReceiptError(source) {
    chooseReceipt(source).catch(() => {
      Alert.alert(
        'No se pudo adjuntar la imagen',
        'Revisa los permisos de cámara o galería e inténtalo de nuevo.',
      );
    });
  }

  function save() {
    const amount = Number(quantity);
    if (!Number.isInteger(amount) || amount <= 0) {
      setMessage('Ingresa una cantidad entera mayor que cero.');
      return;
    }
    const multiplier = type === 'Reposición' || type === 'Obsequio' ? 1 : -1;
    setProducts((current) =>
      current.map((product) =>
        product.id === selected.id
          ? { ...product, stock: Math.max(0, product.stock + amount * multiplier) }
          : product,
      ),
    );
    router.replace('/admin/inventory');
  }

  return (
    <AdminShell title="Registrar movimiento" subtitle="Inventario · Hoy 12:03" addLabel="Volver al inventario" onAdd={() => router.back()}>
      <Text className="mb-2 text-xs font-semibold text-[#514941]">Tipo de movimiento</Text>
      <Chips
        items={movementTypes.map((item) => ({ value: item, label: item }))}
        value={type}
        onChange={setType}
      />
      <Text className="mb-2 text-xs font-semibold text-[#514941]">Producto</Text>
      <View className="mb-4 flex-row items-center rounded-xl border border-[#eadfd2] bg-white px-4 py-3">
        <Text className="flex-1 text-sm text-[#332d28]">{selected?.name || 'Sin productos'}</Text>
        <Text className="text-[10px] font-semibold text-[#a35a45]">Cambiar</Text>
      </View>
      <View className="mb-4 flex-row rounded-2xl bg-[#f2e8d6] px-4 py-3">
        <View className="flex-1">
          <Text className="text-[9px] text-[#8b8178]">Disponible</Text>
          <Text className="mt-1 text-lg font-bold text-[#a35a45]">{selected?.stock || 0}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-[9px] text-[#8b8178]">Reservado</Text>
          <Text className="mt-1 text-lg font-bold text-[#332d28]">5</Text>
        </View>
        <View className="flex-1">
          <Text className="text-[9px] text-[#8b8178]">Mínima</Text>
          <Text className="mt-1 text-lg font-bold text-[#332d28]">5</Text>
        </View>
      </View>
      <Text className="mb-2 text-xs font-semibold text-[#514941]">Cantidad</Text>
      <TextInput
        accessibilityLabel="Cantidad"
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="number-pad"
        className="mb-4 min-h-12 rounded-xl border border-[#eadfd2] bg-white px-4 py-3 text-sm text-[#332d28]"
      />
      <Text className="mb-2 text-xs font-semibold text-[#514941]">Motivo o referencia</Text>
      <TextInput
        accessibilityLabel="Motivo o referencia"
        value={reference}
        onChangeText={setReference}
        className="mb-4 min-h-12 rounded-xl border border-[#eadfd2] bg-white px-4 py-3 text-sm text-[#332d28]"
      />
      <View className="mb-4 rounded-2xl border border-dashed border-[#e3cdbd] bg-[#fffaf3] px-4 py-4">
        <Text className="text-xs font-semibold text-[#514941]">Adjuntar comprobante</Text>
        <Text className="mt-1 text-[10px] text-[#8b8178]">Foto opcional · JPG o PNG</Text>
        <View className="mt-3 flex-row gap-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tomar foto del comprobante"
            onPress={() => handleReceiptError('camera')}
            className="flex-1 items-center rounded-xl bg-[#f6ded4] px-3 py-3 active:opacity-70"
          >
            <Text className="text-xs font-semibold text-[#a35a45]">Tomar foto</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Elegir comprobante de la galería"
            onPress={() => handleReceiptError('gallery')}
            className="flex-1 items-center rounded-xl bg-[#f2e8d6] px-3 py-3 active:opacity-70"
          >
            <Text className="text-xs font-semibold text-[#8b8178]">Elegir de galería</Text>
          </Pressable>
        </View>
        {receiptUri ? (
          <View className="mt-3 flex-row items-center rounded-xl bg-white p-2">
            <Image
              source={{ uri: receiptUri }}
              accessibilityLabel="Vista previa del comprobante"
              className="h-14 w-14 rounded-lg"
              resizeMode="cover"
            />
            <View className="ml-3 flex-1">
              <Text className="text-xs font-semibold text-[#477052]">Comprobante adjunto</Text>
              <Text className="mt-1 text-[10px] text-[#8b8178]">Solo vista previa por ahora</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Quitar comprobante"
              onPress={() => setReceiptUri(null)}
              className="px-2 py-3"
            >
              <Text className="text-xs font-semibold text-[#b7472a]">Quitar</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
      {message ? <Text className="mb-3 text-xs text-[#b7472a]">{message}</Text> : null}
      <Button onPress={save}>✓ Guardar movimiento</Button>
    </AdminShell>
  );
}
