import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AdminIcon from '@/features/admin/components/AdminIcon';
import { isValidEmail } from '@/shared/validators/emailValidator';

function getKeyboardType(field) {
  if (field.numeric) return 'decimal-pad';
  if (field.key === 'email') return 'email-address';
  return 'default';
}

export const tones = {
  green: { background: '#deecdf', text: '#477052' },
  peach: { background: '#f6ded4', text: '#a35a45' },
  blue: { background: '#deebf5', text: '#456d8a' },
  purple: { background: '#eee3f4', text: '#7c5994' },
  yellow: { background: '#fff0c7', text: '#9c7b31' },
  sand: { background: '#f2e8d6', text: '#8b8178' },
};

export function Button({ children, onPress, secondary = false }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={`min-h-11 items-center justify-center rounded-xl px-4 py-3 active:opacity-70 ${secondary ? 'bg-[#f2e8d6]' : 'bg-[#b7472a]'}`}
    >
      <Text
        className={`text-xs font-semibold ${secondary ? 'text-[#b7472a]' : 'text-white'}`}
      >
        {children}
      </Text>
    </Pressable>
  );
}

export function Badge({ children, tone = 'green' }) {
  const palette = tones[tone];
  return (
    <View
      className="self-start rounded-full px-2 py-1"
      style={{ backgroundColor: palette.background }}
    >
      <Text className="text-[9px] font-medium" style={{ color: palette.text }}>
        {children}
      </Text>
    </View>
  );
}

export function Chips({ items, value, onChange }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="mb-3 max-h-12"
      contentContainerStyle={{ paddingVertical: 4 }}
    >
      {items.map((item) => {
        const key = typeof item === 'string' ? item : item.value;
        const label = typeof item === 'string' ? item : item.label;
        return (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityState={{ selected: value === key }}
            onPress={() => onChange(key)}
            className={`mr-2 rounded-full px-3 py-2 ${value === key ? 'bg-[#8e3b27]' : 'bg-[#f2e8d6]'}`}
          >
            <Text
              className={`text-[10px] ${value === key ? 'font-semibold text-white' : 'text-[#70665e]'}`}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function Search({ value, onChange, placeholder }) {
  return (
    <View className="mb-3 h-12 flex-row items-center rounded-xl border border-[#eadfd2] bg-white px-3">
      <Text className="mr-2 text-lg text-[#988d83]">⌕</Text>
      <TextInput
        accessibilityLabel={placeholder}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#a79b90"
        returnKeyType="search"
        className="flex-1 py-3 text-xs text-[#332d28]"
      />
    </View>
  );
}

export function Empty({ children }) {
  return (
    <View className="mb-3 items-center rounded-2xl bg-white px-5 py-10">
      <Text className="text-sm font-semibold text-[#514941]">
        No encontramos resultados
      </Text>
      <Text className="mt-1 text-center text-xs text-[#8b8178]">
        {children}
      </Text>
    </View>
  );
}

export function Stats({ items }) {
  return (
    <View className="mb-4 flex-row gap-2">
      {items.map((item) => (
        <View key={item.label} className="flex-1 rounded-2xl bg-white p-3">
          <View className="mb-2 flex-row items-center justify-between gap-1">
            <Text className="flex-1 text-[10px] text-[#8b8178]">
              {item.label}
            </Text>
            <View
              className="h-7 w-7 items-center justify-center rounded-lg"
              style={{ backgroundColor: tones[item.tone].background }}
            >
              <AdminIcon
                name={item.icon || 'users'}
                size={18}
                color={tones[item.tone].text}
              />
            </View>
          </View>
          <Text className="text-2xl font-bold text-[#332d28]">
            {item.value}
          </Text>
          {item.note ? (
            <Text className="mt-1 text-[9px] text-[#8b8178]">{item.note}</Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

export function ToggleFilter({ checked, label, onPress }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={onPress}
      className="mb-3 min-h-10 flex-row items-center gap-2"
    >
      <View
        className={`h-4 w-4 items-center justify-center rounded border ${checked ? 'border-[#b7472a] bg-[#b7472a]' : 'border-[#cbbcaf] bg-white'}`}
      >
        {checked ? <Text className="text-[10px] text-white">✓</Text> : null}
      </View>
      <Text className="text-[11px] text-[#8b8178]">{label}</Text>
    </Pressable>
  );
}

export function Editor({ title, fields, initial, onSave, onClose, children }) {
  const [values, setValues] = useState(initial || {});
  const [error, setError] = useState('');

  function change(key, value) {
    setError('');
    setValues((current) => ({ ...current, [key]: value }));
  }

  function save() {
    const cleaned = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [
        key,
        typeof value === 'string' ? value.trim() : value,
      ]),
    );
    if (
      fields.some(
        (field) => field.required && !String(cleaned[field.key] ?? '').trim(),
      )
    ) {
      setError('Completa los campos obligatorios.');
      return;
    }
    if (
      fields.some(
        (field) =>
          field.numeric &&
          (!Number.isFinite(Number(cleaned[field.key])) ||
            Number(cleaned[field.key]) < (field.min || 0) ||
            (field.integer && !Number.isInteger(Number(cleaned[field.key])))),
      )
    ) {
      setError('Revisa los números: ingresa valores válidos.');
      return;
    }
    if (
      fields.some((field) => field.key === 'email') &&
      !isValidEmail(cleaned.email || '')
    ) {
      setError('Ingresa un correo válido.');
      return;
    }
    const result = onSave?.(cleaned);
    if (typeof result === 'string') setError(result);
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-black/40">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 justify-center px-5 py-4"
        >
          <View
            className="max-h-[90%] w-full max-w-[460px] self-center rounded-3xl bg-[#fff8ef] p-5"
            accessibilityViewIsModal
          >
            <View className="mb-4 flex-row items-center justify-between gap-3">
              <Text
                accessibilityRole="header"
                className="flex-1 text-lg font-bold text-[#332d28]"
              >
                {title}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cerrar ventana"
                onPress={onClose}
                className="h-11 w-11 items-center justify-center rounded-full bg-white"
              >
                <Text className="text-xl text-[#b7472a]">×</Text>
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {fields.map((field) => (
                <View key={field.key} className="mb-4">
                  <Text className="mb-2 text-xs text-[#514941]">
                    {field.label}
                    {field.required ? ' *' : ''}
                  </Text>
                  {field.options ? (
                    <Chips
                      items={field.options}
                      value={values[field.key]}
                      onChange={(value) => change(field.key, value)}
                    />
                  ) : (
                    <TextInput
                      accessibilityLabel={field.label}
                      value={String(values[field.key] ?? '')}
                      onChangeText={(value) => change(field.key, value)}
                      keyboardType={getKeyboardType(field)}
                      autoCapitalize={
                        field.key === 'email' ? 'none' : 'sentences'
                      }
                      className="min-h-12 rounded-xl border border-[#eadfd2] bg-white px-4 py-3 text-sm text-[#332d28]"
                    />
                  )}
                </View>
              ))}
              {children}
              {error ? (
                <Text
                  accessibilityRole="alert"
                  className="mb-3 text-xs text-[#b7472a]"
                >
                  {error}
                </Text>
              ) : null}
              {onSave ? <Button onPress={save}>Guardar cambios</Button> : null}
              <Text className="mt-3 text-center text-[10px] text-[#8b8178]">
                Los cambios se guardan solo durante esta demostración.
              </Text>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
