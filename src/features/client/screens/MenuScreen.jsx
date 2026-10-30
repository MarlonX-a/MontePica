import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import CartButton from '@/features/client/components/CartButton';
import SelectableChip from '@/features/client/components/SelectableChip';
import { logoutUser } from '@/shared/session/sessionStore';
import {
  getMenuCategories,
  getMenuProducts,
} from '@/features/client/api/catalogApi';

export default function MenuScreen() {
  const { service, table } = useLocalSearchParams();
  const [products, setProducts] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const isDineIn = service === 'dine-in';
  const categories = [
    'Todos',
    ...availableCategories.map((category) => category.name),
  ];

  useEffect(() => {
    let isMounted = true;

    async function loadCatalog() {
      setIsLoading(true);
      setLoadError('');

      try {
        const [loadedProducts, loadedCategories] = await Promise.all([
          getMenuProducts(),
          getMenuCategories(),
        ]);

        if (isMounted) {
          setProducts(loadedProducts);
          setAvailableCategories(loadedCategories);
        }
      } catch (error) {
        const apiMessage = error?.response?.data?.message;
        const message = Array.isArray(apiMessage)
          ? apiMessage.join(' ')
          : apiMessage;

        if (isMounted) {
          setLoadError(
            typeof message === 'string' && message.trim()
              ? message
              : 'No se pudo cargar el menú. Revisa la conexión e inténtalo de nuevo.',
          );
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadCatalog();

    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  const visibleProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();

    return products.filter((product) => {
      const matchesCategory =
        selectedCategory === 'Todos' || product.category === selectedCategory;
      const matchesSearch =
        !normalizedSearch ||
        `${product.name} ${product.description}`
          .toLocaleLowerCase()
          .includes(normalizedSearch);

      return matchesCategory && matchesSearch;
    });
  }, [products, search, selectedCategory]);

  const productCountLabel = isLoading
    ? 'Cargando menú...'
    : `${visibleProducts.length} productos disponibles`;
  let catalogContent;

  if (isLoading) {
    catalogContent = (
      <View className="items-center rounded-2xl bg-white px-5 py-10">
        <ActivityIndicator color="#b7472a" />
        <Text className="mt-3 text-xs text-[#8b8178]">
          Cargando productos...
        </Text>
      </View>
    );
  } else if (loadError) {
    catalogContent = (
      <View className="items-center rounded-2xl bg-white px-5 py-8">
        <Text className="text-center text-sm text-[#8b8178]">{loadError}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => setReloadKey((key) => key + 1)}
          className="mt-4 rounded-xl bg-[#b7472a] px-5 py-3"
        >
          <Text className="text-xs font-semibold text-white">Reintentar</Text>
        </Pressable>
      </View>
    );
  } else if (visibleProducts.length > 0) {
    catalogContent = visibleProducts.map((product) => (
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
    ));
  } else {
    catalogContent = (
      <View className="items-center rounded-2xl bg-white px-5 py-10">
        <Text className="text-sm font-semibold text-[#514941]">
          No encontramos productos
        </Text>
        <Text className="mt-1 text-center text-xs text-[#8b8178]">
          Prueba con otro nombre o categoría.
        </Text>
      </View>
    );
  }

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
            <CartButton onPress={() => router.push('/orders')} />
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
              <SelectableChip
                key={category}
                label={category}
                selected={selectedCategory === category}
                onPress={() => setSelectedCategory(category)}
                className="mr-2 rounded-full px-4 py-2"
                selectedClassName="bg-[#8e3b27]"
                unselectedClassName="bg-white"
                textClassName="text-xs"
                selectedTextClassName="font-semibold text-white"
                unselectedTextClassName="text-[#70665e]"
              />
            ))}
          </ScrollView>

          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-xs text-[#8b8178]">
              {productCountLabel}
            </Text>
            <View className="flex-row items-center">
              <View className="mr-1.5 h-2 w-2 rounded-full bg-[#4d8c58]" />
              <Text className="text-[10px] font-semibold text-[#547353]">
                Cocina operativa
              </Text>
            </View>
          </View>

          {catalogContent}
        </ScrollView>

        <BottomNavigation
          activeTab="menu"
          onTabPress={async (tab) => {
            if (tab === 'home') router.replace('/home');
            if (tab === 'orders') router.replace('/orders');
            if (tab === 'profile') {
              await logoutUser();
              router.replace('/(auth)/login');
            }
          }}
        />
      </View>
    </SafeAreaView>
  );
}
