import { View, Text } from 'react-native';

export default function Title({ titulo, subtitulo }) {
  return (
    <View>
      {titulo ? (
        <Text className="text-4xl font-bold text-left">
          {titulo}
        </Text>
      ) : null}
      {subtitulo ? (
        <Text className="text-lg text-left">
          {subtitulo}
        </Text>
      ) : null}
    </View>
  );
}
