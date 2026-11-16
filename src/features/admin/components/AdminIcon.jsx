import { View } from 'react-native';

export default function AdminIcon({ name, color = '#988d83', size = 22 }) {
  const border = { borderColor: color, borderWidth: 1.3 };
  if (name === 'users') {
    return (
      <View style={{ width: size, height: size, alignItems: 'center' }}>
        <View
          style={{
            ...border,
            width: 8,
            height: 8,
            borderRadius: 5,
            marginTop: 1,
          }}
        />
        <View
          style={{
            ...border,
            width: 16,
            height: 9,
            borderTopLeftRadius: 9,
            borderTopRightRadius: 9,
            borderBottomWidth: 0,
            marginTop: 3,
          }}
        />
      </View>
    );
  }
  if (name === 'products') {
    return (
      <View
        style={{
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            ...border,
            width: 18,
            height: 8,
            borderTopLeftRadius: 10,
            borderTopRightRadius: 10,
          }}
        />
        <View
          style={{
            width: 21,
            height: 1.3,
            marginTop: 3,
            backgroundColor: color,
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: 2,
            width: 3,
            height: 3,
            borderRadius: 2,
            backgroundColor: color,
          }}
        />
      </View>
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 3,
        padding: 2,
      }}
    >
      {[0, 1, 2, 3].map((index) => (
        <View
          key={index}
          style={{
            ...border,
            width: (size - 7) / 2,
            height: (size - 7) / 2,
            borderRadius: name === 'qr' ? 0 : 2,
          }}
        />
      ))}
    </View>
  );
}
