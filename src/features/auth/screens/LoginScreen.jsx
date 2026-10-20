import { View, Text, Pressable } from 'react-native';
import { Link, router } from 'expo-router';
import Title from '@/components/ui/Title';
import LoginForm from '@/features/auth/components/LoginForm';
import {
  loginAsDemoAdmin,
  loginUser,
} from '@/features/auth/data/authStore';

function getRouteForRole(role) {
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'waiter') return '/waiter';
  return '/home';
}

export default function LoginScreen() {
  return (
    <View className="flex-1 justify-center bg-[#fff8ef] px-6">
      <View className="mb-7">
        <Title
          titulo="¡Qué gusto verte!"
          subtitulo="Ingresa para ordenar o administrar el servicio."
        />
      </View>
      <LoginForm
        onValidSubmit={({ email, password }) => {
          const result = loginUser(email, password);
          router.replace(getRouteForRole(result.user.role));
        }}
      />
      <View className="mt-5 rounded-2xl border border-[#eadfd2] bg-white p-4">
        <Text className="text-center text-xs font-semibold text-[#332d28]">
          ¿Vas a revisar la administración?
        </Text>
        <Text className="mt-1 text-center text-[10px] text-[#8b8178]">
          Acceso local de demostración al panel administrativo.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            loginAsDemoAdmin();
            router.replace('/admin/dashboard');
          }}
          className="mt-3 items-center rounded-xl bg-[#2f6f4e] px-4 py-3 active:opacity-80"
        >
          <Text className="text-xs font-bold text-white">
            Entrar como administrador
          </Text>
        </Pressable>
      </View>
      <Text className="mt-5 text-center text-sm text-[#8b8178]">
        ¿Primera vez?
      </Text>
      <Link href="/(auth)/register" asChild>
        <Pressable accessibilityRole="link" className="mt-2">
          <Text className="text-center text-sm font-medium text-[#b7472a]">
            Crea una cuenta
          </Text>
        </Pressable>
      </Link>
    </View>
  );
}
