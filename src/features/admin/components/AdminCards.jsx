import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge, tones } from '@/features/admin/components/AdminUI';
import AdminIcon from '@/features/admin/components/AdminIcon';

function getProductStatus(product) {
  if (!product.active) return 'Inactivo';
  return product.visible ? 'Visible' : 'Oculto';
}

function getProductTone(product) {
  if (!product.active || !product.visible) return 'sand';
  return 'green';
}

export function ProductCard({ product, onPress }) {
  const status = getProductStatus(product);
  const tone = getProductTone(product);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Editar ${product.name}`}
      onPress={onPress}
      className="mb-2 flex-row items-center rounded-2xl bg-white p-3 active:bg-[#fff0e4]"
    >
      <View style={imageStyles.thumbnail}>
        {product.image || product.imageUrl ? (
          <Image
            source={product.image || { uri: product.imageUrl }}
            accessibilityLabel={product.name}
            style={imageStyles.photo}
            resizeMode="cover"
          />
        ) : (
          <Text className="text-3xl">{product.icon}</Text>
        )}
      </View>
      <View className="flex-1" style={{ minWidth: 0 }}>
        <Text className="text-xs font-semibold text-[#332d28]">
          {product.name}
        </Text>
        <Text className="mt-1 text-[10px] text-[#8b8178]">
          {product.category}
        </Text>
        <View className="mt-2 flex-row flex-wrap items-center gap-2">
          <Text className="text-xs font-bold text-[#b7472a]">
            ${product.price.toFixed(2)}
          </Text>
          <Badge tone={tone}>{status}</Badge>
        </View>
      </View>
      <View className="ml-2 h-8 w-7 items-center justify-center rounded-lg bg-[#f2e8d6]">
        <Text className="text-lg text-[#988d83]">⋮</Text>
      </View>
    </Pressable>
  );
}

export function TableCard({ table, onEdit }) {
  return (
    <View className="flex-1 rounded-2xl border border-[#eadfd2] bg-white p-3">
      <View className="mb-2 flex-row flex-wrap items-center justify-between gap-2">
        <View className="h-8 w-8 items-center justify-center rounded-lg bg-[#f2e8d6]">
          <AdminIcon name="table" color="#988d83" />
        </View>
        <Badge tone={table.active ? 'green' : 'sand'}>
          {table.statusLabel}
        </Badge>
      </View>
      <Text className="my-2 text-sm font-medium text-[#332d28]">
        {table.code}
      </Text>
      <Badge tone={table.openVisitId ? 'peach' : 'blue'}>
        {table.visitLabel}
      </Badge>
      {onEdit && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Editar mesa ${table.code}`}
          onPress={onEdit}
          className="mt-3 min-h-11 justify-center"
        >
          <Text className="text-xs font-semibold text-[#b7472a]">Editar</Text>
        </Pressable>
      )}
    </View>
  );
}

const roleTones = {
  Administrador: 'purple',
  Trabajador: 'peach',
  Cliente: 'blue',
};
export function UserCard({ user, onPress }) {
  const initials = user.name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Editar ${user.name}`}
      onPress={onPress}
      className="mb-2 flex-row items-center rounded-2xl bg-white px-3 py-3 active:bg-[#fff0e4]"
    >
      <View
        className="mr-3 h-10 w-10 items-center justify-center rounded-full"
        style={{
          backgroundColor: tones[roleTones[user.role]].background,
          opacity: user.active ? 1 : 0.5,
        }}
      >
        <Text className="text-xs font-bold text-[#514941]">{initials}</Text>
      </View>
      <View className="mr-2 flex-1" style={{ minWidth: 0 }}>
        <Text className="text-xs font-medium text-[#332d28]">{user.name}</Text>
        <Text numberOfLines={1} className="mt-1 text-[9px] text-[#8b8178]">
          {user.email}
        </Text>
      </View>
      <View className="items-end gap-1">
        <Badge tone={roleTones[user.role]}>{user.role}</Badge>
        <Text
          className={`text-[9px] ${user.active ? 'font-semibold text-[#477052]' : 'text-[#8b8178]'}`}
        >
          {user.active ? 'Activo' : 'Suspendido'}
        </Text>
      </View>
      <Text className="ml-2 text-lg text-[#988d83]">›</Text>
    </Pressable>
  );
}

// Dimensiones nativas explícitas: las fotos nunca usan su resolución original como tamaño de tarjeta.
const imageStyles = StyleSheet.create({
  thumbnail: {
    width: 64,
    height: 64,
    flexShrink: 0,
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff0e4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: { width: 64, height: 64, borderRadius: 12 },
});
