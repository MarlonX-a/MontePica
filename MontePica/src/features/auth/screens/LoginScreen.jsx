import { View, Text, Pressable } from 'react-native';
import { Link, router } from 'expo-router';
import Title from '@/components/ui/Title';
import LoginForm from '@/features/auth/components/LoginForm';
import { loginUser } from '@/features/auth/data/authStore';

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
          router.replace(result.user.role === 'waiter' ? '/waiter' : '/home');
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
