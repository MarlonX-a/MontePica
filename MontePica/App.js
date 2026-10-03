import "./global.css";
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';

export default function App() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text>Hola desde la app movil soy Marlon</Text>
      <StatusBar style="auto" />
    </View>
  );
}

