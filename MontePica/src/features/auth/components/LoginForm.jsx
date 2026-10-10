import { View, Text, TextInput, Pressable } from 'react-native';

export default function LoginForm() {
  return (
    <View>
      <Text>
        Correo Electrónico:
      </Text>
      <TextInput
        placeholder="tucorreo@gmail.com"
        className="border border-gray-300 rounded-md py-2 px-4"
      />
      <Text>
        Contraseña:
      </Text>
      <TextInput
        placeholder="Ingresa tu contraseña"
        secureTextEntry
        className="border border-gray-300 rounded-md py-2 px-4"
      />
      <Text className="text-right text-orange-600">
        ¿Olvidaste tu contraseña?
      </Text>
      <Pressable className="bg-orange-600 py-2 px-4 rounded-md mt-4">
        <Text className="text-white text-center font-bold">
          Ingresar
        </Text>
      </Pressable>
    </View>
  );
}
