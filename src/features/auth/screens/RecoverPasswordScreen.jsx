import { useCallback, useRef, useState } from 'react';
import { Link, useFocusEffect } from 'expo-router';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { requestPasswordRecovery, resetPassword } from '@/features/auth/api/authApi';
import { validateNewPassword } from '@/features/auth/validators/newPasswordValidator';
import { isValidEmail } from '@/shared/validators/emailValidator';

const emptySecrets = { token: '', password: '', confirmation: '' };
const requestNotice = 'Si el correo corresponde a una cuenta activa, recibirás un código.';
const resetFields = [
  { name: 'token', label: 'Código de recuperación', autoComplete: 'off' },
  { name: 'password', label: 'Nueva contraseña', autoComplete: 'new-password' },
  { name: 'confirmation', label: 'Confirmar contraseña', autoComplete: 'new-password' },
];

function recoveryError(error, isReset) {
  const status = error.response?.status;
  if (status === 503) return 'La recuperación por correo no está disponible en este momento.';
  if (status === 429) return 'Demasiados intentos. Inténtalo más tarde.';
  if (status === 400) {
    return isReset
      ? 'Revisa la contraseña y el código. Si el código venció o ya se usó, pide uno nuevo.'
      : 'Revisa el formato del correo electrónico.';
  }
  if (isReset && (!status || status === 408 || status >= 500)) {
    return 'No pudimos confirmar el cambio. Antes de pedir otro código, prueba iniciar sesión con la nueva contraseña.';
  }
  return 'No se pudo completar la solicitud. Revisa la conexión e inténtalo de nuevo.';
}

function RecoveryField({ label, ...props }) {
  return (
    <View className="mb-3">
      <Text className="mb-1 text-sm text-[#514941]">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize="none"
        autoCorrect={false}
        className="rounded-xl border border-[#eadfd2] bg-white px-4 py-3 text-[#332d28]"
        {...props}
      />
    </View>
  );
}

export default function RecoverPasswordScreen() {
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [secrets, setSecrets] = useState(emptySecrets);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const pending = useRef(null);

  useFocusEffect(useCallback(() => () => {
    pending.current?.abort();
    pending.current = null;
    setSecrets(emptySecrets);
    setBusy(false);
    setError('');
  }, []));

  async function submit(action) {
    if (pending.current) return;
    const isReset = action === 'reset';
    const address = email.trim();
    const token = secrets.token.trim();
    let problem = '';
    if (isReset) {
      problem = /^[A-Za-z0-9_-]{43}$/.test(token) && token.length === 43
        ? validateNewPassword(secrets.password, secrets.confirmation)
        : 'Pega el código de 43 caracteres que recibiste por correo.';
    } else if (address.length > 320 || !isValidEmail(address)) {
      problem = 'Ingresa un correo electrónico válido de hasta 320 caracteres.';
    }
    setError(problem);
    if (problem) return;

    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setNotice('');
    try {
      if (isReset) {
        await resetPassword(token, secrets.password, controller.signal);
      } else {
        await requestPasswordRecovery(address, controller.signal);
      }
      if (controller.signal.aborted) return;
      setSecrets(emptySecrets);
      if (isReset) {
        setEmail('');
        setStep('done');
      } else {
        setNotice(requestNotice);
        setStep('code');
      }
    } catch (failure) {
      if (!controller.signal.aborted) setError(recoveryError(failure, isReset));
    } finally {
      if (pending.current === controller) {
        pending.current = null;
        setBusy(false);
      }
    }
  }

  function changeEmail() {
    if (pending.current) return;
    setSecrets(emptySecrets);
    setNotice('');
    setError('');
    setStep('email');
  }

  function submitCurrentStep() {
    void submit(step === 'code' ? 'reset' : 'email');
  }

  return (
    <SafeAreaView className="flex-1 bg-[#fff8ef]">
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24 }}>
        <View className="mx-auto w-full max-w-[480px] pt-4">
          <Text accessibilityRole="header" className="mb-3 text-2xl font-bold text-[#332d28]">
            {step === 'done' ? 'Contraseña actualizada' : 'Recuperar contraseña'}
          </Text>
          {step === 'done' ? (
            <Text accessibilityLiveRegion="polite" className="mb-5 text-sm text-[#514941]">
              Ya puedes iniciar sesión con tu nueva contraseña.
            </Text>
          ) : (
            <>
              {step === 'email' ? (
                <RecoveryField label="Correo electrónico" autoComplete="email" keyboardType="email-address"
                  editable={!busy} value={email} onChangeText={setEmail} />
              ) : (
                <>
                  <Text className="mb-4 text-sm text-[#514941]">
                    Pega el código del correo. Vence en 15 minutos desde su emisión y solo se puede usar una vez.
                  </Text>
                  {resetFields.map(({ name, ...field }) => (
                    <RecoveryField key={name} {...field} secureTextEntry editable={!busy}
                      value={secrets[name]} onChangeText={(value) => {
                        setSecrets((previous) => ({ ...previous, [name]: value }));
                      }} />
                  ))}
                </>
              )}
              {notice ? <Text accessibilityLiveRegion="polite" className="mb-3 text-sm text-[#24543a]">{notice}</Text> : null}
              {error ? <Text accessibilityRole="alert" className="mb-3 text-sm text-[#b7472a]">{error}</Text> : null}
              <Pressable accessibilityRole="button" accessibilityState={{ busy, disabled: busy }}
                disabled={busy} onPress={submitCurrentStep} className="items-center rounded-xl bg-[#24543a] p-4">
                <Text className="font-bold text-white">
                  {busy ? 'Procesando…' : step === 'code' ? 'Cambiar contraseña' : 'Solicitar código'}
                </Text>
              </Pressable>
              {step === 'code' ? (
                <View className="mt-3 flex-row flex-wrap gap-4">
                  <Pressable accessibilityRole="button" disabled={busy} onPress={() => void submit('email')}>
                    <Text className="py-2 font-semibold text-[#b7472a]">Reenviar código</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" disabled={busy} onPress={changeEmail}>
                    <Text className="py-2 font-semibold text-[#b7472a]">Cambiar correo</Text>
                  </Pressable>
                </View>
              ) : null}
            </>
          )}
          <Link href="/login" replace className="mt-5 self-start py-2 font-semibold text-[#b7472a]">
            Volver al inicio de sesión
          </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
