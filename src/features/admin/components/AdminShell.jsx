import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, usePathname } from 'expo-router';
import AdminIcon from '@/features/admin/components/AdminIcon';

const tabs = [
  { label: 'Panel', icon: 'panel', path: '/admin/dashboard' },
  { label: 'Inventario', icon: 'products', path: '/admin/inventory' },
  { label: 'Productos', icon: 'products', path: '/admin/products' },
  { label: 'Mesas', icon: 'qr', path: '/admin/tables' },
  { label: 'Usuarios', icon: 'users', path: '/admin/users' },
];

export default function AdminShell({
  title,
  subtitle,
  onAdd,
  addLabel,
  children,
}) {
  const pathname = usePathname();

  return (
    <SafeAreaView className="flex-1 bg-[#fff8ef]">
      <StatusBar style="dark" />
      <View className="w-full max-w-[620px] flex-1 self-center">
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 24,
          }}
        >
          <View className="mb-4 flex-row items-center justify-between gap-3">
            <View className="flex-1">
              <Text
                accessibilityRole="header"
                className="text-2xl font-bold text-[#332d28]"
              >
                {title}
              </Text>
              <Text className="mt-0.5 text-[11px] text-[#8b8178]">
                {subtitle}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={addLabel}
              onPress={onAdd}
              className="h-11 w-11 items-center justify-center rounded-full bg-white active:bg-[#fff0e4]"
            >
              <Text className="text-2xl font-light text-[#b7472a]">＋</Text>
            </Pressable>
          </View>
          {children}
        </ScrollView>
        <View className="flex-row border-t border-[#eee2d7] bg-white px-2 pb-2 pt-2">
          {tabs.map((tab) => {
            const selected = pathname === tab.path;
            const color = selected ? '#b7472a' : '#988d83';
            return (
              <Pressable
                key={tab.path}
                accessibilityRole="tab"
                accessibilityLabel={tab.label}
                accessibilityState={{ selected }}
                onPress={() => router.navigate(tab.path)}
                className="min-h-12 flex-1 items-center justify-center rounded-lg active:bg-[#fff8ef]"
              >
                <AdminIcon name={tab.icon} color={color} />
                <Text
                  className={`mt-1 text-[10px] ${selected ? 'font-semibold' : 'font-normal'}`}
                  style={{ color }}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}
