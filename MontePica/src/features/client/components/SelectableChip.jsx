import { Pressable, Text } from 'react-native';

export default function SelectableChip({
  label,
  selected,
  onPress,
  className,
  selectedClassName,
  unselectedClassName,
  textClassName,
  selectedTextClassName,
  unselectedTextClassName,
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`${className} ${selected ? selectedClassName : unselectedClassName}`}
    >
      <Text
        className={`${textClassName} ${selected ? selectedTextClassName : unselectedTextClassName}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
