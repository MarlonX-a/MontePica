import { View, Text, Pressable } from 'react-native';
import { Link, router } from 'expo-router';
import Title from '@/components/ui/Title';
import LoginForm from '@/features/auth/components/LoginForm';
import { loginWithApi } from '@/features/auth/api/authApi';
import { setCurrentSession } from '@/shared/session/sessionStore';

function getRouteForRole(roleCode) {
  if (roleCode === 'admin') return '/admin/dashboard';
  if (roleCode === 'worker') return '/waiter';
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
        onValidSubmit={async (credentials) => {
          const session = await loginWithApi(credentials);
          setCurrentSession(session);
          router.replace(getRouteForRole(session.user?.role?.code));
        }}
      />
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
