import { View, Text } from 'react-native';
import Title from '@/components/ui/Title';
import LoginForm from '@/features/auth/components/LoginForm';

export default function LoginScreen() {
  return (
    <View className="flex-1 h-full justify-center bg-white px-6">
      <View>
        <Title
          titulo="¡Que gusto verte!"
          subtitulo="Ingresa para ordenar o administrar el servicio"
        />
      </View>
      <LoginForm />
      <Text className="text-center">
        ¿Primera vez?
      </Text>
      <Text className="text-center text-orange-600">
        Crea una cuenta
      </Text>
    </View>
  );
}
