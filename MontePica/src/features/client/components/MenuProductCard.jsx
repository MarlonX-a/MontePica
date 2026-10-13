import { Pressable, Text, View } from 'react-native';

export default function MenuProductCard({ product, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ver detalle de ${product.name}`}
      onPress={onPress}
      className="mb-3 min-h-[116px] flex-row items-center rounded-2xl bg-white p-3 active:bg-[#fff0e4]"
    >
      <View className="mr-3 h-[88px] w-[88px] items-center justify-center rounded-xl bg-[#fff0e4]">
        <Text className="text-4xl">{product.icon}</Text>
      </View>
      <View className="min-h-[88px] flex-1 justify-between py-1">
        <View>
          <Text className="text-sm font-semibold text-[#332d28]">
            {product.name}
          </Text>
          <Text
            numberOfLines={2}
            className="mt-1 text-[10px] leading-4 text-[#8b8178]"
          >
            {product.description}
          </Text>
        </View>
        <View className="mt-2 flex-row items-center justify-between">
          <Text className="text-sm font-bold text-[#b7472a]">
            {product.price}
          </Text>
          <Text className="rounded-full bg-[#e8f1e7] px-2 py-1 text-[9px] text-[#547353]">
            {product.detail}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
