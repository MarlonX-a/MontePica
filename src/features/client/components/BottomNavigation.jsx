import { Pressable, Text, View } from 'react-native';

const tabs = [
  { key: 'home', label: 'Inicio' },
  { key: 'menu', label: 'Menú' },
  { key: 'orders', label: 'Pedidos' },
  { key: 'profile', label: 'Perfil' },
];

function TabIcon({ name, color }) {
  const line = { borderColor: color, borderWidth: 1.5 };
  const stroke = { backgroundColor: color };

  if (name === 'home') {
    return (
      <View className="h-[22px] w-[22px] items-center">
        <View
          style={{
            position: 'absolute',
            top: 4,
            width: 12,
            height: 12,
            borderLeftWidth: 1.5,
            borderTopWidth: 1.5,
            borderColor: color,
            transform: [{ rotate: '45deg' }],
          }}
        />
        <View
          style={{
            ...line,
            position: 'absolute',
            top: 9,
            width: 15,
            height: 11,
            borderTopWidth: 0,
            borderBottomLeftRadius: 2,
            borderBottomRightRadius: 2,
          }}
        />
        <View
          style={{
            ...line,
            position: 'absolute',
            top: 14,
            left: 9,
            width: 4,
            height: 6,
            borderBottomWidth: 0,
          }}
        />
      </View>
    );
  }

  if (name === 'menu') {
    return (
      <View className="h-[22px] w-[22px] flex-row items-center justify-center">
        <View className="mr-1 items-center">
          <View className="mb-0.5 h-1 w-2 rounded-full border" style={line} />
          <View className="h-3 w-px" style={stroke} />
        </View>
        <View className="items-center">
          <View className="h-1.5 w-1.5 rounded-full border" style={line} />
          <View className="h-2.5 w-px" style={stroke} />
        </View>
      </View>
    );
  }

  if (name === 'orders') {
    return (
      <View
        className="h-[18px] w-[15px] items-center justify-center rounded-[3px]"
        style={line}
      >
        <View className="mb-1 h-px w-2.5" style={stroke} />
        <View className="mb-1 h-px w-2.5" style={stroke} />
        <View className="h-px w-1.5 self-start ml-[2px]" style={stroke} />
      </View>
    );
  }

  return (
    <View className="h-[22px] w-[22px] items-center">
      <View className="h-2 w-2 rounded-full border" style={line} />
      <View
        className="mt-0.5 h-2.5 w-4 rounded-t-full border"
        style={{ ...line, borderBottomWidth: 0 }}
      />
    </View>
  );
}

/**
 * Barra visual de navegación del área del cliente.
 * `activeTab` acepta: home, menu, orders o profile.
 * `onTabPress` recibe la clave de la pestaña seleccionada.
 */
export default function BottomNavigation({
  activeTab = 'home',
  onTabPress,
}) {
  return (
    <View className="flex-row border-t border-[#eee2d7] bg-white px-2 pb-2 pt-2">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        const color = isActive ? '#b7472a' : '#988d83';

        return (
          <Pressable
            key={tab.key}
            onPress={() => onTabPress?.(tab.key)}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: isActive }}
            className="min-h-12 flex-1 items-center justify-center rounded-lg active:bg-[#fff8ef]"
          >
            <TabIcon name={tab.key} color={color} />
            <Text
              className={`mt-1 text-[10px] ${isActive ? 'font-semibold' : 'font-normal'}`}
              style={{ color }}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
