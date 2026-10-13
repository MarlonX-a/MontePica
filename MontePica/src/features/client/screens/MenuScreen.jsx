import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomNavigation from '@/features/client/components/BottomNavigation';
import MenuProductCard from '@/features/client/components/MenuProductCard';
import { menuProducts } from '@/features/client/data/menuProducts';

const categories = ['Todos', 'Ceviches', 'Bebidas'];

function CartButton() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Carrito de compras"
      className="h-11 w-11 items-center justify-center rounded-full bg-white"
    >
      <View className="h-4 w-4 items-center">
        <View className="absolute -top-1 h-2 w-2 rounded-t-full border border-[#8b8178]" />
        <View className="mt-1 h-3 w-4 rounded-b border border-[#8b8178]" />
      </View>
      <View className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#b7472a]" />
    </Pressable>
  );
}

function CategoryChip({ label, selected, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`mr-2 rounded-full px-4 py-2 ${selected ? 'bg-[#8e3b27]' : 'bg-white'}`}
    >
      <Text
        className={`text-xs ${selected ? 'font-semibold text-white' : 'text-[#70665e]'}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function MenuScreen() {
  const { service, table } = useLocalSearchParams();
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [search, setSearch] = useState('');
  const isDineIn = service === 'dine-in';

  const visibleProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();

    return menuProducts.filter((product) => {
      const matchesCategory =
        selectedCategory === 'Todos' || product.category === selectedCategory;
      const matchesSearch =
        !normalizedSearch ||
        `${product.name} ${product.description}`
          .toLocaleLowerCase()
          .includes(normalizedSearch);

      return matchesCategory && matchesSearch;
    });
  }, [search, selectedCategory]);

  return (
    <SafeAreaView className="flex-1 bg-[#fff8ef]">
      <StatusBar style="dark" />
      <View className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 }}
        >
          <View className="mb-4 flex-row items-center justify-between">
            <View>
              <Text className="text-2xl font-bold text-[#332d28]">Menú</Text>
              <Text className="mt-0.5 text-[11px] text-[#8b8178]">
                {isDineIn ? `${table || 'Mesa 08'} · Servicio en salón` : 'Pedido a domicilio'}
              </Text>
            </View>
            <CartButton />
          </View>

          <View className="mb-4 h-12 flex-row items-center rounded-xl border border-[#eadfd2] bg-white px-3">
            <Text className="mr-2 text-lg text-[#988d83]">⌕</Text>
            <TextInput
              accessibilityLabel="Buscar productos del menú"
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar ceviches y bebidas"
              placeholderTextColor="#a79b90"
              className="flex-1 text-xs text-[#332d28]"
              returnKeyType="search"
            />
            <Text className="text-lg text-[#b7472a]">☷</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-4 max-h-10"
          >
            {categories.map((category) => (
              <CategoryChip
                key={category}
                label={category}
                selected={selectedCategory === category}
                onPress={() => setSelectedCategory(category)}
              />
            ))}
          </ScrollView>

          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-xs text-[#8b8178]">
              {visibleProducts.length} productos disponibles
            </Text>
            <View className="flex-row items-center">
              <View className="mr-1.5 h-2 w-2 rounded-full bg-[#4d8c58]" />
              <Text className="text-[10px] font-semibold text-[#547353]">
                Cocina operativa
              </Text>
            </View>
          </View>

          {visibleProducts.length > 0 ? (
            visibleProducts.map((product) => (
              <MenuProductCard
                key={product.id}
                product={product}
                onPress={() =>
                  router.push({
                    pathname: '/product/[id]',
                    params: { id: product.id, service, table },
                  })
                }
              />
            ))
          ) : (
            <View className="items-center rounded-2xl bg-white px-5 py-10">
              <Text className="text-sm font-semibold text-[#514941]">
                No encontramos productos
              </Text>
              <Text className="mt-1 text-center text-xs text-[#8b8178]">
                Prueba con otro nombre o categoría.
              </Text>
            </View>
          )}
        </ScrollView>

        <BottomNavigation
          activeTab="menu"
          onTabPress={(tab) => {
            if (tab === 'home') router.replace('/home');
          }}
        />
      </View>
    </SafeAreaView>
  );
}
