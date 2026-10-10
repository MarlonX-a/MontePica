import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import RegisterForm from '@/features/auth/components/RegisterForm';

export default function RegisterScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff8ef' }}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingTop: 14,
            paddingBottom: 24,
          }}
        >
          <View className="mb-7 flex-row items-center justify-between">
            <Link href="/(auth)/login" asChild>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="Volver al inicio de sesión"
                className="h-10 w-10 items-center justify-center rounded-full bg-white"
              >
                <Text className="text-2xl leading-7 text-[#75695f]">‹</Text>
              </Pressable>
            </Link>

            <View className="flex-row items-center">
              <View className="mr-2 h-10 w-10 items-center justify-center rounded-xl bg-[#b7472a]">
                <Text className="text-lg font-bold text-white">P</Text>
              </View>
              <View>
                <Text className="text-sm font-bold leading-4 text-[#332d28]">
                  Picantiería
                </Text>
                <Text className="text-[9px] font-bold tracking-[1.5px] text-[#b7472a]">
                  MONTECRISTI
                </Text>
              </View>
            </View>
          </View>

          <View className="mb-5">
            <Text className="text-2xl font-bold text-[#332d28]">
              Crea tu cuenta
            </Text>
            <Text className="mt-1 text-sm leading-5 text-[#8b8178]">
              Guarda tus pedidos y disfruta una atención más rápida.
            </Text>
          </View>

          <RegisterForm />

          <View className="mt-5 flex-row justify-center">
            <Text className="text-xs text-[#8b8178]">
              ¿Ya tienes cuenta?{' '}
            </Text>
            <Link href="/(auth)/login" asChild>
              <Pressable accessibilityRole="link">
                <Text className="text-xs font-semibold text-[#b7472a]">
                  Ingresar
                </Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
