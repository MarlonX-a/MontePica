import { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import {
  validateLoginField,
  validateLoginForm,
} from '@/features/auth/validators/loginValidator';

export default function LoginForm() {
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [touched, setTouched] = useState({ email: false, password: false });
  const [passwordVisible, setPasswordVisible] = useState(false);

  function handleChange(field, value) {
    setValues((currentValues) => ({ ...currentValues, [field]: value }));

    if (touched[field]) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        [field]: validateLoginField(field, value),
      }));
    }
  }

  function handleBlur(field) {
    setTouched((currentTouched) => ({ ...currentTouched, [field]: true }));
    setErrors((currentErrors) => ({
      ...currentErrors,
      [field]: validateLoginField(field, values[field]),
    }));
  }

  function handleSubmit() {
    setTouched({ email: true, password: true });
    setErrors(validateLoginForm(values));
  }

  return (
    <View>
      <Text className="mb-1 mt-4 text-sm text-[#514941]">
        Correo Electrónico:
      </Text>
      <TextInput
        value={values.email}
        onChangeText={(value) => handleChange('email', value)}
        onBlur={() => handleBlur('email')}
        placeholder="tucorreo@gmail.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="Correo electrónico"
        accessibilityHint={errors.email || undefined}
        placeholderTextColor="#a69a8e"
        className={`rounded-xl border bg-white px-4 py-3 text-[#332d28] ${errors.email ? 'border-red-500' : 'border-[#eadfd2]'}`}
      />
      {errors.email ? (
        <Text className="mt-1 text-sm text-red-600" accessibilityRole="alert">
          {errors.email}
        </Text>
      ) : null}
      <Text className="mb-1 mt-4 text-sm text-[#514941]">
        Contraseña:
      </Text>
      <View
        className={`flex-row items-center rounded-xl border bg-white pr-4 ${errors.password ? 'border-red-500' : 'border-[#eadfd2]'}`}
      >
        <TextInput
          value={values.password}
          onChangeText={(value) => handleChange('password', value)}
          onBlur={() => handleBlur('password')}
          placeholder="Ingresa tu contraseña"
          placeholderTextColor="#a69a8e"
          secureTextEntry={!passwordVisible}
          accessibilityLabel="Contraseña"
          accessibilityHint={errors.password || undefined}
          className="flex-1 px-4 py-3 text-[#332d28]"
        />
        <Pressable
          onPress={() => setPasswordVisible((visible) => !visible)}
          accessibilityRole="button"
          accessibilityLabel={passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          className="py-2 pl-2"
        >
          <Text className="text-xs font-semibold text-[#b7472a]">
            {passwordVisible ? 'Ocultar' : 'Mostrar'}
          </Text>
        </Pressable>
      </View>
      {errors.password ? (
        <Text className="mt-1 text-sm text-red-600" accessibilityRole="alert">
          {errors.password}
        </Text>
      ) : null}
      <Text className="mt-3 text-right text-xs font-semibold text-[#b7472a]">
        ¿Olvidaste tu contraseña?
      </Text>
      <Pressable
        onPress={handleSubmit}
        accessibilityRole="button"
        className="mt-5 flex-row items-center justify-center rounded-xl bg-[#b7472a] px-4 py-4"
      >
        <Text className="mr-2 text-base text-white">
          →
        </Text>
        <Text className="text-center text-sm font-bold text-white">
          Ingresar
        </Text>
      </Pressable>
    </View>
  );
}
