import { useState } from 'react';
import { Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getProductPrice, menuProducts } from '@/features/client/data/menuProducts';

const spiceOptions = ['Sin ají', 'Suave', 'Medio', 'Fuerte'];

function RoundButton({ label, onPress, children }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="h-11 w-11 items-center justify-center rounded-full bg-white/90"
    >
      <Text className="text-xl text-[#514941]">{children}</Text>
    </Pressable>
  );
}

function SpiceOption({ label, selected, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`mr-2 rounded-full px-3 py-2 ${selected ? 'bg-[#8e3b27]' : 'bg-[#f1eee9]'}`}
    >
      <Text className={`text-[11px] ${selected ? 'font-semibold text-white' : 'text-[#70665e]'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

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
  const { id } = useLocalSearchParams();
  const [spice, setSpice] = useState('Suave');
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const [favorite, setFavorite] = useState(false);
  const product = menuProducts.find((item) => item.id === id);

  if (!product) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-[#fff8ef] px-8">
        <StatusBar style="dark" />
        <Text className="text-lg font-bold text-[#332d28]">
          No encontramos ese producto
        </Text>
        <Pressable onPress={() => router.back()} className="mt-4 rounded-xl bg-[#b7472a] px-5 py-3">
          <Text className="font-semibold text-white">Volver al menú</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const isCeviche = product.category === 'Ceviches';
  const total = (getProductPrice(product) * quantity).toFixed(2);

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
              <RoundButton label="Volver al menú" onPress={() => router.back()}>
                ‹
              </RoundButton>
              <RoundButton
                label={favorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                onPress={() => setFavorite((value) => !value)}
              >
                {favorite ? '♥' : '♡'}
              </RoundButton>
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

            <View className="mt-4 flex-row items-center rounded-lg bg-[#e4efe2] px-3 py-2.5">
              <View className="mr-2 h-2 w-2 rounded-full bg-[#4d8c58]" />
              <Text className="flex-1 text-[11px] font-medium text-[#547353]">
                Disponible ahora
              </Text>
              <Text className="text-[10px] text-[#547353]">{product.availability}</Text>
            </View>

            {isCeviche && (
              <View className="mt-4">
                <Text className="mb-2 text-sm font-semibold text-[#514941]">
                  Elige tu picante
                </Text>
                <View className="flex-row">
                  {spiceOptions.map((option) => (
                    <SpiceOption
                      key={option}
                      label={option}
                      selected={spice === option}
                      onPress={() => setSpice(option)}
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
            onPress={() => {}}
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
