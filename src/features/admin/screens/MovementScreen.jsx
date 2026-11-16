import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
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

  const movementTypes = permissions.includes('inventory.move')
    ? initializedMovementTypes.filter((value) => value !== 'adjustment')
    : [];
  if (permissions.includes('inventory.adjust')) movementTypes.push('adjustment');
  return movementTypes;
}

function getRouteParam(value) {
  return Array.isArray(value) ? value[0] : value;
}

function getQuantityLabel(type) {
  if (type === 'initialization') return 'Existencia inicial';
  if (type === 'adjustment') return 'Cantidad contada';
  return 'Cantidad';
}

async function loadMovementContext({
  requestedDayId,
  requestedProductId,
  permissions,
}) {
  const state = await getCurrentOperatingState();
  const operatingDay = state.operatingDay;
  if (!operatingDay) {
    return {
      operatingDay: null,
      items: [],
      selectedId: '',
      type: '',
      message: 'No hay una jornada abierta para registrar movimientos.',
    };
  }

  if (requestedDayId && requestedDayId !== operatingDay.id) {
    return {
      operatingDay,
      items: [],
      selectedId: '',
      type: '',
      message: 'La jornada seleccionada ya no es la jornada operativa actual.',
    };
  }

  const items = await getOperatingInventory(operatingDay.id);
  const requestedItem = items.find(
    (item) => item.product.id === requestedProductId,
  );
  const selected = requestedItem || items[0];
  const selectedId = selected?.product.id || '';
  const movementTypes = getPermittedMovementTypes(selected, permissions);

  return {
    operatingDay,
    items,
    selectedId,
    type: movementTypes[0] || '',
    message: '',
  };
}

function validateMovement({ quantity, type, reason, selected }) {
  const amount = Number(quantity);
  const allowsZero = type === 'initialization' || type === 'adjustment';

  if (
    !quantity.trim() ||
    !Number.isInteger(amount) ||
    amount < 0 ||
    (!allowsZero && amount === 0)
  ) {
    const requirement = allowsZero ? 'igual o mayor' : 'mayor';
    return {
      amount,
      error: `Ingresa una cantidad entera ${requirement} que cero.`,
    };
  }
  if (type !== 'initialization' && !reason.trim()) {
    return { amount, error: 'Escribe el motivo o referencia del movimiento.' };
  }
  if (type === 'adjustment' && amount === selected.physicalQuantity) {
    return {
      amount,
      error:
        'El conteo coincide con la existencia actual; no hay nada que ajustar.',
    };
  }
  return { amount, error: '' };
}

async function submitInventoryChange({
  type,
  amount,
  reason,
  dayId,
  productId,
  idempotencyKey,
}) {
  if (type === 'initialization') {
    await initializeInventory(dayId, productId, amount, idempotencyKey);
    return;
  }
  if (type === 'adjustment') {
    await adjustInventory(
      dayId,
      productId,
      { countedQuantity: amount, reason: reason.trim() },
      idempotencyKey,
    );
    return;
  }

  await createInventoryMovement(
    dayId,
    productId,
    { type, quantity: amount, reason: reason.trim() },
    idempotencyKey,
  );
}

function LoadingMessage() {
  return (
    <View className="items-center rounded-2xl bg-white px-5 py-10">
      <ActivityIndicator color="#b7472a" />
      <Text className="mt-3 text-xs text-[#8b8178]">Cargando existencias…</Text>
    </View>
  );
}

function Notice({ title, children }) {
  return (
    <View className="rounded-2xl bg-white p-5">
      <Text className="text-sm font-semibold text-[#332d28]">{title}</Text>
      {children ? (
        <Text className="mt-2 text-xs leading-5 text-[#8b8178]">
          {children}
        </Text>
      ) : null}
    </View>
  );
}

function QuantitySummary({ selected }) {
  const quantities = [
    { label: 'Físico', value: selected.physicalQuantity, color: '#332d28' },
    { label: 'Reservado', value: selected.reservedQuantity, color: '#332d28' },
    { label: 'Disponible', value: selected.availableQuantity, color: '#477052' },
  ];

  return (
    <View className="mb-4 flex-row rounded-2xl bg-[#f2e8d6] px-4 py-3">
      {quantities.map((item) => (
        <View key={item.label} className="flex-1">
          <Text className="text-[9px] text-[#8b8178]">{item.label}</Text>
          <Text
            className="mt-1 text-lg font-bold"
            style={{ color: item.color }}
          >
            {item.value ?? '—'}
          </Text>
        </View>
      ))}
    </View>
  );
}

function ReceiptPicker({ receiptUri, onPick, onRemove }) {
  return (
    <View className="mb-4 rounded-2xl border border-dashed border-[#e3cdbd] bg-[#fffaf3] px-4 py-4">
      <Text className="text-xs font-semibold text-[#514941]">
        Comprobante (opcional)
      </Text>
      <Text className="mt-1 text-[10px] text-[#8b8178]">
        La imagen solo se muestra como vista previa; no se envía al backend.
      </Text>
      <View className="mt-3 flex-row gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tomar foto del comprobante"
          onPress={() => onPick('camera')}
          className="flex-1 items-center rounded-xl bg-[#f6ded4] px-3 py-3 active:opacity-70"
        >
          <Text className="text-xs font-semibold text-[#a35a45]">
            Tomar foto
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Elegir comprobante de la galería"
          onPress={() => onPick('gallery')}
          className="flex-1 items-center rounded-xl bg-[#f2e8d6] px-3 py-3 active:opacity-70"
        >
          <Text className="text-xs font-semibold text-[#8b8178]">
            Elegir de galería
          </Text>
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
            <Text className="text-xs font-semibold text-[#477052]">
              Comprobante adjunto
            </Text>
            <Text className="mt-1 text-[10px] text-[#8b8178]">
              Solo vista previa local
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quitar comprobante"
            onPress={onRemove}
            className="px-2 py-3"
          >
            <Text className="text-xs font-semibold text-[#b7472a]">Quitar</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function MovementForm({
  selected,
  items,
  type,
  setType,
  movementTypes,
  quantity,
  setQuantity,
  reason,
  setReason,
  message,
  receiptUri,
  onPickReceipt,
  onRemoveReceipt,
  onSave,
  saving,
  onSelectProduct,
  onFormChange,
}) {
  const productOptions = items.map((item) => ({
    value: item.product.id,
    label: `${item.product.name}${item.initialized ? '' : ' · Inicializar'}`,
  }));
  const typeOptions = movementTypes.map((value) => ({
    value,
    label: movementLabels[value],
  }));
  const quantityLabel = getQuantityLabel(type);

  return (
    <>
      <Text className="mb-2 text-xs font-semibold text-[#514941]">
        Tipo de movimiento
      </Text>
      {movementTypes.length > 0 ? (
        <Chips
          items={typeOptions}
          value={type}
          onChange={(value) => {
            setType(value);
            onFormChange();
          }}
        />
      ) : (
        <Text className="mb-4 text-xs text-[#8b8178]">
          Tu cuenta no tiene permiso para modificar las existencias de este
          producto.
        </Text>
      )}

      <Text className="mb-2 text-xs font-semibold text-[#514941]">Producto</Text>
      {productOptions.length > 1 ? (
        <Chips
          items={productOptions}
          value={selected.product.id}
          onChange={onSelectProduct}
        />
      ) : (
        <View className="mb-4 rounded-xl border border-[#eadfd2] bg-white px-4 py-3">
          <Text className="text-sm text-[#332d28]">{selected.product.name}</Text>
        </View>
      )}

      <QuantitySummary selected={selected} />
      <Text className="mb-2 text-xs font-semibold text-[#514941]">
        {quantityLabel}
      </Text>
      <TextInput
        accessibilityLabel={quantityLabel}
        value={quantity}
        onChangeText={(value) => {
          setQuantity(value);
          onFormChange();
        }}
        keyboardType="number-pad"
        className="mb-4 min-h-12 rounded-xl border border-[#eadfd2] bg-white px-4 py-3 text-sm text-[#332d28]"
      />

      {type !== 'initialization' && (
        <>
          <Text className="mb-2 text-xs font-semibold text-[#514941]">
            Motivo o referencia
          </Text>
          <TextInput
            accessibilityLabel="Motivo o referencia"
            value={reason}
            onChangeText={(value) => {
              setReason(value);
              onFormChange();
            }}
            placeholder="Ej. Reposición del proveedor"
            className="mb-4 min-h-12 rounded-xl border border-[#eadfd2] bg-white px-4 py-3 text-sm text-[#332d28]"
          />
          <ReceiptPicker
            receiptUri={receiptUri}
            onPick={onPickReceipt}
            onRemove={onRemoveReceipt}
          />
        </>
      )}

      {message ? (
        <Text accessibilityRole="alert" className="mb-3 text-xs text-[#b7472a]">
          {message}
        </Text>
      ) : null}
      {movementTypes.length > 0 && (
        <Button onPress={onSave}>
          {saving ? 'Guardando…' : '✓ Guardar movimiento'}
        </Button>
      )}
    </>
  );
}

function MovementContent({
  loading,
  message,
  items,
  isOpen,
  selected,
  formProps,
}) {
  if (loading) return <LoadingMessage />;
  if (message && items.length === 0) {
    return (
      <View className="rounded-2xl bg-white p-5">
        <Text accessibilityRole="alert" className="text-sm text-[#b7472a]">
          {message}
        </Text>
      </View>
    );
  }
  if (!isOpen) {
    return (
      <Notice title="La jornada no está abierta">
        Regresa al inventario. Solo se pueden registrar cambios durante la
        jornada operativa actual.
      </Notice>
    );
  }
  if (!selected) {
    return <Notice title="No hay productos disponibles para inventariar." />;
  }
  return <MovementForm selected={selected} items={items} {...formProps} />;
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
        const context = await loadMovementContext({
          requestedDayId,
          requestedProductId,
          permissions,
        });
        if (active) {
          setOperatingDay(context.operatingDay);
          setItems(context.items);
          setSelectedId(context.selectedId);
          setType(context.type);
          setMessage(context.message);
        }
      } catch (error) {
        if (active) setMessage(getInventoryApiError(error));
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
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

  function clearFormMessage() {
    idempotencyKey.current = null;
    setMessage('');
  }

  async function save() {
    if (!selected || !operatingDay || !isOpen || saving) return;
    if (!movementTypes.includes(type)) return;

    const validation = validateMovement({ quantity, type, reason, selected });
    if (validation.error) {
      setMessage(validation.error);
      return;
    }

    setSaving(true);
    setMessage('');
    idempotencyKey.current ||= makeIdempotencyKey();
    try {
      await submitInventoryChange({
        type,
        amount: validation.amount,
        reason,
        dayId: operatingDay.id,
        productId: selected.product.id,
        idempotencyKey: idempotencyKey.current,
      });
      idempotencyKey.current = null;
      router.replace('/admin/inventory');
    } catch (error) {
      setMessage(getInventoryApiError(error));
    } finally {
      setSaving(false);
    }
  }

  function selectProduct(productId) {
    const item = items.find((candidate) => candidate.product.id === productId);
    setSelectedId(productId);
    setType(getPermittedMovementTypes(item, permissions)[0] || '');
    setQuantity('');
    setReason('');
    setMessage('');
    idempotencyKey.current = null;
  }

  const formProps = {
    type,
    setType,
    movementTypes,
    quantity,
    setQuantity,
    reason,
    setReason,
    message,
    receiptUri,
    onPickReceipt: handleReceiptError,
    onRemoveReceipt: () => setReceiptUri(null),
    onSave: save,
    saving,
    onSelectProduct: selectProduct,
    onFormChange: clearFormMessage,
  };

  return (
    <AdminShell
      title="Registrar movimiento"
      subtitle={operatingDay ? `Inventario · Jornada ${operatingDay.businessDate}` : 'Inventario diario'}
      addLabel="Volver al inventario"
      onAdd={() => router.back()}
    >
      <MovementContent
        loading={loading}
        message={message}
        items={items}
        isOpen={isOpen}
        selected={selected}
        formProps={formProps}
      />
    </AdminShell>
  );
}
