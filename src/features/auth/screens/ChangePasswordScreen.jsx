import { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { changePassword, getAuthenticatedUser } from '@/features/auth/api/authApi';
import { clearSession, getSessionSnapshot } from '@/shared/session/sessionStore';
import useSession, { getSessionDestination } from '@/shared/session/useSession';

const fields = [
  { name: 'current', label: 'Contraseña actual', autoComplete: 'current-password' },
  { name: 'next', label: 'Contraseña nueva', autoComplete: 'new-password' },
  { name: 'confirmation', label: 'Confirmar contraseña nueva', autoComplete: 'new-password' },
];

function validate({ current, next, confirmation }) {
  if (!current || current.length > 128) return 'Ingresa tu contraseña actual.';
  if (next.length < 8 || next.length > 128 || !/[A-ZÁÉÍÓÚÜÑ]/.test(next) ||
      !/\d/.test(next) || /[\r\n\u2028\u2029]/.test(next)) {
    return 'La contraseña nueva debe tener entre 8 y 128 caracteres, una mayúscula y un número.';
  }
  if (next !== confirmation) return 'Las contraseñas nuevas deben coincidir.';
  return '';
}

export default function ChangePasswordScreen() {
  const { session, closing } = useSession();
  const [values, setValues] = useState({ current: '', next: '', confirmation: '' });
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);

  async function submit() {
    if (lock.current || closing) return;
    const problem = validate(values);
    setMessage(problem);
    if (problem) return;

    lock.current = true;
    setSaving(true);
    const { generation } = getSessionSnapshot();
    try {
      await getAuthenticatedUser();
      if (getSessionSnapshot().generation !== generation) return;
      await changePassword(values.current, values.next, generation);
      await clearSession(generation, 'Contraseña cambiada. Inicia sesión con tu nueva contraseña.');
    } catch (error) {
      if (getSessionSnapshot().generation !== generation) return;
      const detail = error.response?.data?.message;
      setMessage(Array.isArray(detail) ? detail.join(' ') : detail ||
        'No se pudo confirmar el cambio. Comprueba la conexión antes de volver a intentarlo.');
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-[#fff8ef]">
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24 }}>
        {saving ? null : (
          <Link href={getSessionDestination(session)} replace className="mb-6 font-semibold text-[#b7472a]">
            Volver
          </Link>
        )}
        <Text accessibilityRole="header" className="mb-5 text-2xl font-bold text-[#332d28]">
          Cambiar contraseña
        </Text>
        {fields.map(({ name, label, autoComplete }) => (
          <TextInput
            key={name}
            accessibilityLabel={label}
            placeholder={label}
            placeholderTextColor="#75695f"
            secureTextEntry
            autoComplete={autoComplete}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={128}
            editable={!saving}
            value={values[name]}
            onChangeText={(value) => setValues((previous) => ({ ...previous, [name]: value }))}
            className="mb-3 rounded-xl border border-[#eadfd2] bg-white px-4 py-3 text-[#332d28]"
          />
        ))}
        {message ? <Text accessibilityRole="alert" className="mb-3 text-[#b7472a]">{message}</Text> : null}
        <Pressable accessibilityRole="button" disabled={saving || closing} onPress={submit}
          className="items-center rounded-xl bg-[#24543a] p-4">
          <Text className="font-bold text-white">{saving ? 'Guardando…' : 'Guardar contraseña'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
