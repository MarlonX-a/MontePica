import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import IconButton from '@/features/client/components/IconButton';
import SelectableChip from '@/features/client/components/SelectableChip';
import { addToCart } from '@/features/client/data/orderStore';
import { getMenuProductById } from '@/features/client/api/catalogApi';

const spiceOptions = ['Sin ají', 'Suave', 'Medio', 'Fuerte'];

function QuantityButton({ label, onPress, children, disabled }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={`h-9 w-9 items-center justify-center rounded-lg ${disabled ? 'bg-[#f4eee5]' : 'bg-[#f5e7d5]'}`}
    >
      <Text className={`text-lg font-semibold ${disabled ? 'text-[#c6b9aa]' : 'text-[#8e3b27]'}`}>
        {children}
      </Text>
    </Pressable>
  );
}

export default function ProductDetailScreen() {
  const { id, service, table } = useLocalSearchParams();
  const productId = Array.isArray(id) ? id[0] : id;
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [spice, setSpice] = useState('Suave');
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const [favorite, setFavorite] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadProduct() {
      setIsLoading(true);
      setLoadError('');

      try {
        const loadedProduct = await getMenuProductById(productId);
        if (isMounted) setProduct(loadedProduct);
      } catch (error) {
        const apiMessage = error?.response?.data?.message;
        const message = Array.isArray(apiMessage)
          ? apiMessage.join(' ')
          : apiMessage;

        if (isMounted) {
          setLoadError(
            typeof message === 'string' && message.trim()
              ? message
              : 'No se pudo cargar el producto. Revisa la conexión e inténtalo de nuevo.',
          );
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    if (productId) {
      loadProduct();
    } else {
      setLoadError('No encontramos el identificador del producto.');
      setIsLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [productId, reloadKey]);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-[#fff8ef]">
        <StatusBar style="dark" />
        <ActivityIndicator color="#b7472a" />
        <Text className="mt-3 text-xs text-[#8b8178]">
          Cargando producto...
        </Text>
      </SafeAreaView>
    );
  }

  if (loadError || !product) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-[#fff8ef] px-8">
        <StatusBar style="dark" />
        <Text className="text-lg font-bold text-[#332d28]">
          {loadError || 'No encontramos ese producto.'}
        </Text>
        {loadError ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setReloadKey((key) => key + 1)}
            className="mt-4 rounded-xl bg-[#b7472a] px-5 py-3"
          >
            <Text className="font-semibold text-white">Reintentar</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={() => router.back()} className="mt-4 rounded-xl bg-[#b7472a] px-5 py-3">
          <Text className="font-semibold text-white">Volver al menú</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const isCeviche = product.category === 'Ceviches';
  const total = ((product.priceCents / 100) * quantity).toFixed(2);

  return (
    <SafeAreaView className="flex-1 bg-[#fff8ef]">
      <StatusBar style="dark" />
      <View className="flex-1">
        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="relative h-[300px] items-center justify-center overflow-hidden bg-[#ead2bd]">
            {product.image ? (
              <Image
                source={product.image}
                resizeMode="cover"
                accessibilityLabel={product.name}
                className="absolute inset-0 h-full w-full"
              />
            ) : (
              <>
                <View className="absolute -left-12 -top-12 h-48 w-48 rounded-full bg-[#f2dfce]" />
                <View className="absolute -bottom-20 -right-10 h-56 w-56 rounded-full bg-[#d9b99d]" />
                <View className="h-48 w-48 items-center justify-center rounded-full bg-[#fff4e8]/80">
                  <Text className="text-[100px]">{product.icon}</Text>
                </View>
              </>
            )}
            <View className="absolute left-5 right-5 top-3 flex-row justify-between">
              <IconButton label="Volver al menú" onPress={() => router.back()}>
                ‹
              </IconButton>
              <IconButton
                label={favorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                onPress={() => setFavorite((value) => !value)}
              >
                {favorite ? '♥' : '♡'}
              </IconButton>
            </View>
            <View className="absolute bottom-4 left-5 rounded-full bg-white/90 px-3 py-1.5">
              <Text className="text-[10px] font-semibold text-[#8a4a34]">
                {isCeviche ? 'PREPARADO AL MOMENTO' : 'BEBIDA REFRESCANTE'}
              </Text>
            </View>
          </View>

          <View className="px-5 pb-5 pt-5">
            <View className="flex-row items-start justify-between">
              <Text className="mr-3 flex-1 text-[23px] font-semibold leading-7 text-[#332d28]">
                {product.name}
              </Text>
              <Text className="pt-1 text-lg font-semibold text-[#b7472a]">
                {product.price}
              </Text>
            </View>
            <Text className="mt-1 text-[11px] text-[#a35b42]">
              {product.category} · {product.detail}
            </Text>
            <Text className="mt-3 text-xs leading-[19px] text-[#81766d]">
              {product.description}{' '}
              {isCeviche && 'Acompañado con limón y cilantro fresco.'}
            </Text>

            <View className="mt-4 flex-row items-center rounded-lg bg-[#f4eee5] px-3 py-2.5">
              <View className="mr-2 h-2 w-2 rounded-full bg-[#b7472a]" />
              <Text className="flex-1 text-[11px] font-medium text-[#75695f]">
                Disponibilidad por confirmar
              </Text>
              <Text className="text-[10px] text-[#75695f]">{product.availability}</Text>
            </View>

            {isCeviche && (
              <View className="mt-4">
                <Text className="mb-2 text-sm font-semibold text-[#514941]">
                  Elige tu picante
                </Text>
                <View className="flex-row">
                  {spiceOptions.map((option) => (
                    <SelectableChip
                      key={option}
                      label={option}
                      selected={spice === option}
                      onPress={() => setSpice(option)}
                      className="mr-2 rounded-full px-3 py-2"
                      selectedClassName="bg-[#8e3b27]"
                      unselectedClassName="bg-[#f1eee9]"
                      textClassName="text-[11px]"
                      selectedTextClassName="font-semibold text-white"
                      unselectedTextClassName="text-[#70665e]"
                    />
                  ))}
                </View>
              </View>
            )}

            {isCeviche && (
              <View className="mt-4">
                <Text className="mb-2 text-sm font-semibold text-[#514941]">
                  Nota para cocina
                </Text>
                <TextInput
                  accessibilityLabel="Nota para cocina"
                  value={note}
                  onChangeText={setNote}
                  placeholder="Ej. sin cebolla, alergias..."
                  placeholderTextColor="#a79b90"
                  multiline
                  textAlignVertical="top"
                  className="min-h-[64px] rounded-xl border border-[#eadfd2] bg-white px-3 py-3 text-xs text-[#514941]"
                  maxLength={120}
                />
              </View>
            )}
          </View>
        </ScrollView>

        <View className="flex-row items-center border-t border-[#eee2d7] bg-[#fff8ef] px-5 py-3">
          <View className="mr-3 flex-row items-center rounded-lg bg-[#f5e7d5] px-1.5 py-1.5">
            <QuantityButton
              label="Quitar una unidad"
              disabled={quantity <= 1}
              onPress={() => setQuantity((value) => Math.max(1, value - 1))}
            >
              −
            </QuantityButton>
            <Text className="w-8 text-center text-sm font-semibold text-[#514941]">
              {quantity}
            </Text>
            <QuantityButton
              label="Agregar una unidad"
              onPress={() => setQuantity((value) => value + 1)}
            >
              +
            </QuantityButton>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Agregar ${quantity} al pedido por $${total}`}
            onPress={() => {
              addToCart({
                product,
                quantity,
                spice: isCeviche ? spice : undefined,
                note: isCeviche ? note.trim() : '',
                service,
                table,
              });
              router.replace('/orders');
            }}
            className="h-12 flex-1 flex-row items-center justify-center rounded-xl bg-[#b7472a]"
          >
            <Text className="mr-2 text-white">▣</Text>
            <Text className="font-bold text-white">Agregar · ${total}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
