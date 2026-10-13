import { Pressable, Text } from 'react-native';

export default function IconButton({
  label,
  onPress,
  children,
  className = 'h-11 w-11 items-center justify-center rounded-full bg-white/90',
  textClassName = 'text-xl text-[#514941]',
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className={className}
    >
      <Text className={textClassName}>{children}</Text>
    </Pressable>
  );
}
