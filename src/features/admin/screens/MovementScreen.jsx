import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import AdminShell from '@/features/admin/components/AdminShell';
import { Button, Chips } from '@/features/admin/components/AdminUI';
import {
  adjustInventory,
  createInventoryMovement,
  getCurrentOperatingState,
  getInventoryApiError,
  getOperatingInventory,
  initializeInventory,
} from '@/features/admin/api/inventoryAdminApi';
import { makeIdempotencyKey } from '@/features/admin/data/inventoryMapper';
import { getCurrentUser } from '@/shared/session/sessionStore';

const movementLabels = {
  initialization: 'Existencia inicial',
  restock: 'Reposición',
  internalConsumption: 'Consumo interno',
  giveaway: 'Obsequio',
  waste: 'Desperdicio',
  adjustment: 'Ajuste por conteo',
};

const initializedMovementTypes = [
  'restock',
  'internalConsumption',
  'giveaway',
  'waste',
  'adjustment',
];

function getPermittedMovementTypes(item, permissions) {
  if (!item?.initialized) {
    return permissions.includes('inventory.initialize')
      ? ['initialization']
      : [];
  }

  return [
    ...(permissions.includes('inventory.move')
      ? initializedMovementTypes.filter((value) => value !== 'adjustment')
      : []),
    ...(permissions.includes('inventory.adjust') ? ['adjustment'] : []),
  ];
}

function getRouteParam(value) {
  return Array.isArray(value) ? value[0] : value;
}

export default function MovementScreen() {
  const params = useLocalSearchParams();
  const requestedDayId = getRouteParam(params.dayId);
  const requestedProductId = getRouteParam(params.productId);
  const [operatingDay, setOperatingDay] = useState(null);
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(requestedProductId || '');
  const [type, setType] = useState('restock');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [receiptUri, setReceiptUri] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const idempotencyKey = useRef(null);
  const permissions = getCurrentUser()?.permissions || [];
  const selected = items.find((item) => item.product.id === selectedId);
  const isOpen = operatingDay?.status === 'open';
  const movementTypes = getPermittedMovementTypes(selected, permissions);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setMessage('');
      try {
        const state = await getCurrentOperatingState();
        if (!state.operatingDay) {
          if (active) {
            setOperatingDay(null);
            setItems([]);
            setMessage('No hay una jornada abierta para registrar movimientos.');
          }
          return;
        }
        if (requestedDayId && requestedDayId !== state.operatingDay.id) {
          if (active) {
            setOperatingDay(state.operatingDay);
            setItems([]);
            setMessage('La jornada seleccionada ya no es la jornada operativa actual.');
          }
          return;
        }

        const inventory = await getOperatingInventory(state.operatingDay.id);
        if (active) {
          setOperatingDay(state.operatingDay);
          setItems(inventory);
          const productExists = inventory.some(
            (item) => item.product.id === requestedProductId,
          );
          const nextId = productExists
            ? requestedProductId
            : inventory[0]?.product.id || '';
          setSelectedId(nextId);
          const selectedItem = inventory.find(
            (item) => item.product.id === nextId,
          );
          setType(getPermittedMovementTypes(selectedItem, permissions)[0] || '');
        }
      } catch (error) {
        if (active) setMessage(getInventoryApiError(error));
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [requestedDayId, requestedProductId]);

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

  function updateForm(setter, value) {
    idempotencyKey.current = null;
    setMessage('');
    setter(value);
  }

  async function save() {
    if (!selected || !operatingDay || !isOpen || saving || !movementTypes.includes(type)) return;

    const amount = Number(quantity);
    const allowsZero = type === 'initialization' || type === 'adjustment';
    if (
      !quantity.trim() ||
      !Number.isInteger(amount) ||
      amount < 0 ||
      (!allowsZero && amount === 0)
    ) {
      setMessage(
        allowsZero
          ? 'Ingresa una cantidad entera igual o mayor que cero.'
          : 'Ingresa una cantidad entera mayor que cero.',
      );
      return;
    }
    if (type !== 'initialization' && !reason.trim()) {
      setMessage('Escribe el motivo o referencia del movimiento.');
      return;
    }
    if (type === 'adjustment' && amount === selected.physicalQuantity) {
      setMessage('El conteo coincide con la existencia actual; no hay nada que ajustar.');
      return;
    }

    setSaving(true);
    setMessage('');
    idempotencyKey.current ||= makeIdempotencyKey();
    try {
      if (type === 'initialization') {
        await initializeInventory(
          operatingDay.id,
          selected.product.id,
          amount,
          idempotencyKey.current,
        );
      } else if (type === 'adjustment') {
        await adjustInventory(
          operatingDay.id,
          selected.product.id,
          { countedQuantity: amount, reason: reason.trim() },
          idempotencyKey.current,
        );
      } else {
        await createInventoryMovement(
          operatingDay.id,
          selected.product.id,
          { type, quantity: amount, reason: reason.trim() },
          idempotencyKey.current,
        );
      }

      idempotencyKey.current = null;
      router.replace('/admin/inventory');
    } catch (error) {
      setMessage(getInventoryApiError(error));
    } finally {
      setSaving(false);
    }
  }

  const productOptions = items.map((item) => ({
    value: item.product.id,
    label: `${item.product.name}${item.initialized ? '' : ' · Inicializar'}`,
  }));
  const typeOptions = movementTypes.map((value) => ({
    value,
    label: movementLabels[value],
  }));
  const quantityLabel =
    type === 'initialization'
      ? 'Existencia inicial'
      : type === 'adjustment'
        ? 'Cantidad contada'
        : 'Cantidad';

  return (
    <AdminShell
      title="Registrar movimiento"
      subtitle={operatingDay ? `Inventario · Jornada ${operatingDay.businessDate}` : 'Inventario diario'}
      addLabel="Volver al inventario"
      onAdd={() => router.back()}
    >
      {loading ? (
        <View className="items-center rounded-2xl bg-white px-5 py-10">
          <ActivityIndicator color="#b7472a" />
          <Text className="mt-3 text-xs text-[#8b8178]">Cargando existencias…</Text>
        </View>
      ) : message && !items.length ? (
        <View className="rounded-2xl bg-white p-5">
          <Text accessibilityRole="alert" className="text-sm text-[#b7472a]">{message}</Text>
        </View>
      ) : !isOpen ? (
        <View className="rounded-2xl bg-white p-5">
          <Text className="text-sm font-semibold text-[#332d28]">La jornada no está abierta</Text>
          <Text className="mt-2 text-xs leading-5 text-[#8b8178]">
            Regresa al inventario. Solo se pueden registrar cambios durante la jornada operativa actual.
          </Text>
        </View>
      ) : !selected ? (
        <View className="rounded-2xl bg-white p-5">
          <Text className="text-sm text-[#8b8178]">No hay productos disponibles para inventariar.</Text>
        </View>
      ) : (
        <>
          <Text className="mb-2 text-xs font-semibold text-[#514941]">Tipo de movimiento</Text>
          {movementTypes.length ? (
            <Chips
              items={typeOptions}
              value={type}
              onChange={(value) => updateForm(setType, value)}
            />
          ) : (
            <Text className="mb-4 text-xs text-[#8b8178]">
              Tu cuenta no tiene permiso para modificar las existencias de este producto.
            </Text>
          )}

          <Text className="mb-2 text-xs font-semibold text-[#514941]">Producto</Text>
          {productOptions.length > 1 ? (
            <Chips
              items={productOptions}
              value={selected.product.id}
              onChange={(value) => {
                const item = items.find((candidate) => candidate.product.id === value);
                setSelectedId(value);
                setType(getPermittedMovementTypes(item, permissions)[0] || '');
                setQuantity('');
                setReason('');
                setMessage('');
                idempotencyKey.current = null;
              }}
            />
          ) : (
            <View className="mb-4 rounded-xl border border-[#eadfd2] bg-white px-4 py-3">
              <Text className="text-sm text-[#332d28]">{selected.product.name}</Text>
            </View>
          )}

          <View className="mb-4 flex-row rounded-2xl bg-[#f2e8d6] px-4 py-3">
            <View className="flex-1">
              <Text className="text-[9px] text-[#8b8178]">Físico</Text>
              <Text className="mt-1 text-lg font-bold text-[#332d28]">
                {selected.physicalQuantity ?? '—'}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-[9px] text-[#8b8178]">Reservado</Text>
              <Text className="mt-1 text-lg font-bold text-[#332d28]">
                {selected.reservedQuantity ?? '—'}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-[9px] text-[#8b8178]">Disponible</Text>
              <Text className="mt-1 text-lg font-bold text-[#477052]">
                {selected.availableQuantity ?? '—'}
              </Text>
            </View>
          </View>

          <Text className="mb-2 text-xs font-semibold text-[#514941]">{quantityLabel}</Text>
          <TextInput
            accessibilityLabel={quantityLabel}
            value={quantity}
            onChangeText={(value) => updateForm(setQuantity, value)}
            keyboardType="number-pad"
            className="mb-4 min-h-12 rounded-xl border border-[#eadfd2] bg-white px-4 py-3 text-sm text-[#332d28]"
          />
          {type !== 'initialization' ? (
            <>
              <Text className="mb-2 text-xs font-semibold text-[#514941]">Motivo o referencia</Text>
              <TextInput
                accessibilityLabel="Motivo o referencia"
                value={reason}
                onChangeText={(value) => updateForm(setReason, value)}
                placeholder="Ej. Reposición del proveedor"
                className="mb-4 min-h-12 rounded-xl border border-[#eadfd2] bg-white px-4 py-3 text-sm text-[#332d28]"
              />
            </>
          ) : null}

          {type !== 'initialization' ? (
          <View className="mb-4 rounded-2xl border border-dashed border-[#e3cdbd] bg-[#fffaf3] px-4 py-4">
            <Text className="text-xs font-semibold text-[#514941]">Comprobante (opcional)</Text>
            <Text className="mt-1 text-[10px] text-[#8b8178]">
              La imagen solo se muestra como vista previa; no se envía al backend.
            </Text>
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
                  <Text className="mt-1 text-[10px] text-[#8b8178]">Solo vista previa local</Text>
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
          ) : null}
          {message ? (
            <Text accessibilityRole="alert" className="mb-3 text-xs text-[#b7472a]">
              {message}
            </Text>
          ) : null}
          {movementTypes.length ? (
            <Button onPress={save}>
              {saving ? 'Guardando…' : '✓ Guardar movimiento'}
            </Button>
          ) : null}
        </>
      )}
    </AdminShell>
  );
}
