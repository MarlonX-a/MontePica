import { Pressable, View } from 'react-native';

export default function CartButton({ onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Carrito de compras"
      onPress={onPress}
      className="h-11 w-11 items-center justify-center rounded-full bg-white"
    >
      <View className="h-4 w-4 items-center">
        <View className="absolute -top-1 h-2 w-2 rounded-t-full border border-[#687363]" />
        <View className="mt-1 h-3 w-4 rounded-b border border-[#687363]" />
      </View>
      <View className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#24543a]" />
    </Pressable>
  );
}
