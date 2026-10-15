import { ImageBackground, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import BottomNavigation from '@/features/client/components/BottomNavigation';
import CartButton from '@/features/client/components/CartButton';
import { logoutUser } from '@/shared/session/sessionStore';

function OrderButton({ icon, title, subtitle, primary, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={`min-h-[104px] flex-1 rounded-2xl px-3 py-3 ${primary ? 'bg-[#b7472a]' : 'border border-[#eadfd2] bg-white'}`}
    >
      <View
        className={`mb-2 h-8 w-8 items-center justify-center rounded-full ${primary ? 'bg-white/20' : 'bg-[#fff0e7]'}`}
      >
        <Text className={`text-lg ${primary ? 'text-white' : 'text-[#b7472a]'}`}>
          {icon}
        </Text>
      </View>
      <Text
        className={`text-xs font-bold ${primary ? 'text-white' : 'text-[#332d28]'}`}
      >
        {title}
      </Text>
      <Text
        className={`mt-0.5 text-[10px] ${primary ? 'text-white/80' : 'text-[#8b8178]'}`}
      >
        {subtitle}
      </Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  function handleTabPress(tab) {
    if (tab === 'orders') {
      router.push('/orders');
      return;
    }
    if (tab === 'profile') {
      logoutUser();
      router.replace('/(auth)/login');
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff8ef' }}>
      <View className="flex-1 bg-[#fff8ef]">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 }}
        >
          <View className="mb-5 flex-row items-center justify-between">
            <View>
              <Text className="text-2xl font-bold text-[#332d28]">
                Hola, María <Text>👋</Text>
              </Text>
              <Text className="mt-0.5 text-xs text-[#8b8178]">
                Mesa aún no vinculada
              </Text>
            </View>
            <CartButton onPress={() => router.push('/orders')} />
          </View>

          <ImageBackground
            source={require('../../../../assets/encebollado-manabita.png')}
            imageStyle={{ borderRadius: 20 }}
            className="h-[280px] justify-end overflow-hidden rounded-[20px]"
            accessibilityLabel="Encebollado manabita con chifles"
            resizeMode="cover"
          >
            <View className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1">
              <Text className="text-[10px] font-semibold text-[#8a4a34]">
                Favorito de la casa
              </Text>
            </View>
            <View className="rounded-b-[20px] bg-black/55 px-4 pb-3 pt-5">
              <View className="flex-row items-end justify-between">
                <View className="mr-3 flex-1">
                  <Text className="text-lg font-bold text-white">
                    Encebollado manabita
                  </Text>
                  <Text className="mt-0.5 text-[11px] text-white/90">
                    Con chifle y ají de la casa
                  </Text>
                </View>
                <Text className="text-sm font-bold text-white">$5.50</Text>
              </View>
            </View>
          </ImageBackground>

          <View className="mb-3 mt-5">
            <Text className="text-sm font-semibold text-[#514941]">
              ¿Cómo quieres pedir?
            </Text>
          </View>
          <View className="flex-row gap-3">
            <OrderButton
              icon="→"
              title="Pedir a domicilio"
              subtitle="Lo llevamos hasta ti"
              primary
              onPress={() =>
                router.push({
                  pathname: '/menu',
                  params: { service: 'delivery' },
                })
              }
            />
            <OrderButton
              icon="⌂"
              title="Para servirse"
              subtitle="Disfruta en el local"
              onPress={() => router.push('/scan-table')}
            />
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/admin/products')}
            className="mt-5 flex-row items-center justify-between rounded-2xl border border-[#eadfd2] bg-white px-4 py-4 active:bg-[#fff0e4]"
          >
            <View>
              <Text className="text-sm font-semibold text-[#b7472a]">Administrar MontePica</Text>
              <Text className="mt-1 text-xs text-[#8b8178]">Productos, mesas y usuarios</Text>
            </View>
            <Text className="text-lg text-[#b7472a]">→</Text>
          </Pressable>
        </ScrollView>

        <BottomNavigation activeTab="home" onTabPress={handleTabPress} />
      </View>
    </SafeAreaView>
  );
}
