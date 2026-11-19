import { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { getOrderEditorProducts } from '@/features/client/api/catalogApi';
import { OperationButton } from '@/components/ui/OperationControls';

export default function OrderEditor({ order, locked, onSave, onClose }) {
  const [items, setItems] = useState(() =>
    order.items.map((item) => ({ ...item, quantity: String(item.quantity) })),
  );
  const [notes, setNotes] = useState(order.notes ?? '');
  const [products, setProducts] = useState([]);
  const [catalogError, setCatalogError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const request = new AbortController();
    setCatalogError('');
    getOrderEditorProducts(request.signal)
      .then((result) => {
        if (!request.signal.aborted) setProducts(result);
      })
      .catch(() => {
        if (!request.signal.aborted)
          setCatalogError('No se pudo consultar el catálogo.');
      });
    return () => request.abort();
  }, [attempt]);

  function change(id, values) {
    setItems((current) =>
      current.map((line) =>
        line.productId === id ? { ...line, ...values } : line,
      ),
    );
  }

  const names = new Map(products.map((product) => [product.id, product.name]));
  const available = products.filter(
    (product) =>
      !items.some((item) => item.productId === product.id) &&
      product.name.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const valid =
    items.length >= 1 &&
    items.length <= 100 &&
    items.every((item) => /^[1-9][0-9]{0,2}$/.test(item.quantity));
  const inputStyle =
    'my-1 rounded-lg border border-[#eadfd2] bg-white p-2 text-sm';

  return (
    <View className="my-3 rounded-xl border border-[#eadfd2] p-3">
      <Text className="text-sm font-bold text-[#332d28]">
        Editar pedido · versión {order.version}
      </Text>
      {items.map((item) => (
        <View key={item.productId} className="my-2">
          <Text className="text-xs font-semibold">
            {names.get(item.productId) ||
              'Producto ' + item.productId.slice(0, 8)}
          </Text>
          <TextInput
            accessibilityLabel="Cantidad"
            keyboardType="number-pad"
            editable={!locked}
            value={item.quantity}
            maxLength={3}
            onChangeText={(quantity) => change(item.productId, { quantity })}
            className={inputStyle}
          />
          <TextInput
            accessibilityLabel="Nota del producto"
            placeholder="Nota del producto"
            editable={!locked}
            value={item.notes ?? ''}
            maxLength={500}
            onChangeText={(value) => change(item.productId, { notes: value })}
            className={inputStyle}
          />
          <OperationButton
            disabled={locked}
            onPress={() =>
              setItems((current) =>
                current.filter((line) => line.productId !== item.productId),
              )
            }
          >
            Quitar producto
          </OperationButton>
        </View>
      ))}
      <TextInput
        accessibilityLabel="Nota del pedido"
        placeholder="Nota del pedido"
        editable={!locked}
        value={notes}
        onChangeText={setNotes}
        maxLength={500}
        className={inputStyle}
      />
      <TextInput
        accessibilityLabel="Buscar en el catálogo"
        placeholder="Buscar producto para añadir"
        editable={!locked}
        value={search}
        onChangeText={setSearch}
        className={inputStyle}
      />
      {catalogError ? (
        <OperationButton onPress={() => setAttempt(attempt + 1)}>
          {catalogError} Reintentar
        </OperationButton>
      ) : null}
      {search.trim()
        ? available.map((product) => (
            <OperationButton
              key={product.id}
              disabled={locked || items.length >= 100}
              onPress={() => {
                setItems((current) => {
                  if (
                    current.length >= 100 ||
                    current.some((line) => line.productId === product.id)
                  )
                    return current;
                  return [
                    ...current,
                    { productId: product.id, quantity: '1', notes: '' },
                  ];
                });
                setSearch('');
              }}
            >
              {'Añadir ' + product.name}
            </OperationButton>
          ))
        : null}
      {valid ? null : (
        <Text className="text-xs text-[#a83224]">
          Incluye entre 1 y 100 productos con cantidades de 1 a 999.
        </Text>
      )}
      <OperationButton
        disabled={!valid || locked || !order.canEdit}
        onPress={() =>
          onSave({
            notes: notes.trim(),
            items: items.map((item) => ({
              productId: item.productId,
              quantity: Number(item.quantity),
              notes: item.notes?.trim() ?? '',
            })),
          })
        }
      >
        Revisar cambios
      </OperationButton>
      <OperationButton disabled={locked} onPress={onClose}>
        Cerrar editor
      </OperationButton>
    </View>
  );
}
