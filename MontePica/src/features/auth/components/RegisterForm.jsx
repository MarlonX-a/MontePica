import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import Checkbox from 'expo-checkbox';
import {
  getPasswordRequirements,
  validateRegisterField,
  validateRegisterForm,
} from '@/features/auth/validators/registerValidator';

const inputClassName =
  'min-h-12 flex-1 rounded-xl border bg-white px-4 py-3 text-sm text-[#332d28]';

function RegisterField({
  label,
  placeholder,
  value,
  error,
  onChangeText,
  onBlur,
  keyboardType,
  autoCapitalize,
  autoCorrect,
  secureTextEntry,
  passwordVisible,
  onTogglePassword,
}) {
  const borderClassName = error ? 'border-red-500' : 'border-[#eadfd2]';
  const rightPaddingClassName = secureTextEntry ? 'pr-20' : '';

  return (
    <View className="mb-3">
      <Text className="mb-1.5 text-xs font-medium text-[#514941]">
        {label}
      </Text>
      <View className="flex-row items-center">
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onBlur={onBlur}
          placeholder={placeholder}
          placeholderTextColor="#a69a8e"
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          secureTextEntry={secureTextEntry && !passwordVisible}
          accessibilityLabel={label}
          accessibilityHint={error || undefined}
          className={`${inputClassName} ${borderClassName} ${rightPaddingClassName}`}
        />
        {secureTextEntry ? (
          <Pressable
            onPress={onTogglePassword}
            accessibilityRole="button"
            accessibilityLabel={passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className="absolute right-3 px-1 py-2"
          >
            <Text className="text-[11px] font-semibold text-[#b7472a]">
              {passwordVisible ? 'Ocultar' : 'Mostrar'}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text className="mt-1 text-xs text-red-600" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export default function RegisterForm() {
  const [values, setValues] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  function handleChange(field, value) {
    const nextValues = { ...values, [field]: value };
    setValues(nextValues);

    setErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };

      if (touched[field]) {
        nextErrors[field] = validateRegisterField(field, value, nextValues);
      }

      if (field === 'password' && touched.confirmPassword) {
        nextErrors.confirmPassword = validateRegisterField(
          'confirmPassword',
          nextValues.confirmPassword,
          nextValues,
        );
      }

      return nextErrors;
    });
  }

  function handleBlur(field) {
    setTouched((currentTouched) => ({ ...currentTouched, [field]: true }));
    setErrors((currentErrors) => ({
      ...currentErrors,
      [field]: validateRegisterField(field, values[field], values),
    }));
  }

  function handleTermsChange(value) {
    setTermsAccepted(value);

    if (touched.terms) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        terms: validateRegisterField('terms', value),
      }));
    }
  }

  function handleSubmit() {
    setTouched({
      name: true,
      email: true,
      phone: true,
      password: true,
      confirmPassword: true,
      terms: true,
    });
    setErrors(validateRegisterForm(values, termsAccepted));
  }

  const passwordRequirements = getPasswordRequirements(values.password);
  const passwordIsValid = passwordRequirements.every(
    (requirement) => requirement.valid,
  );

  return (
    <View className="w-full">
      <RegisterField
        label="Nombre completo"
        placeholder="Juanito Chan"
        value={values.name}
        error={errors.name}
        onChangeText={(value) => handleChange('name', value)}
        onBlur={() => handleBlur('name')}
        autoCapitalize="words"
      />
      <RegisterField
        label="Correo electrónico"
        placeholder="picamonte@gmail.com"
        value={values.email}
        error={errors.email}
        onChangeText={(value) => handleChange('email', value)}
        onBlur={() => handleBlur('email')}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <RegisterField
        label="Teléfono"
        placeholder="0984561234"
        value={values.phone}
        error={errors.phone}
        onChangeText={(value) => handleChange('phone', value)}
        onBlur={() => handleBlur('phone')}
        keyboardType="phone-pad"
        autoCapitalize="none"
      />
      <RegisterField
        label="Contraseña"
        placeholder="Ingresa tu contraseña"
        value={values.password}
        error={errors.password}
        onChangeText={(value) => handleChange('password', value)}
        onBlur={() => handleBlur('password')}
        secureTextEntry
        passwordVisible={passwordVisible}
        onTogglePassword={() => setPasswordVisible((visible) => !visible)}
      />
      <View className="-mt-1 mb-3 flex-row items-center">
        <View
          className={`mr-2 h-4 w-4 items-center justify-center rounded-full border ${passwordIsValid ? 'border-[#9caf91]' : 'border-[#c9bdb1]'}`}
        >
          <Text
            className={`text-[9px] font-bold ${passwordIsValid ? 'text-[#64815d]' : 'text-[#a69a8e]'}`}
          >
            {passwordIsValid ? '✓' : '•'}
          </Text>
        </View>
        <Text
          className={`text-[11px] ${passwordIsValid ? 'text-[#64815d]' : 'text-[#8b8178]'}`}
        >
          8 caracteres, una mayúscula y un número
        </Text>
      </View>
      <RegisterField
        label="Confirmar contraseña"
        placeholder="Ingresa nuevamente tu contraseña"
        value={values.confirmPassword}
        error={errors.confirmPassword}
        onChangeText={(value) => handleChange('confirmPassword', value)}
        onBlur={() => handleBlur('confirmPassword')}
        secureTextEntry
        passwordVisible={confirmationVisible}
        onTogglePassword={() =>
          setConfirmationVisible((visible) => !visible)
        }
      />

      <View className="mb-1 flex-row items-center">
        <Checkbox
          value={termsAccepted}
          onValueChange={handleTermsChange}
          color={termsAccepted ? '#b7472a' : undefined}
          style={{ marginRight: 9, width: 18, height: 18 }}
        />
        <Text className="flex-1 text-[11px] leading-4 text-[#6f655c]">
          Acepto los términos y políticas de privacidad.
        </Text>
      </View>
      {errors.terms ? (
        <Text className="mt-1 text-xs text-red-600" accessibilityRole="alert">
          {errors.terms}
        </Text>
      ) : null}

      <Pressable
        onPress={handleSubmit}
        accessibilityRole="button"
        className="mt-4 min-h-12 flex-row items-center justify-center rounded-xl bg-[#b7472a] px-4 py-3 active:bg-[#9f3c24]"
      >
        <Text className="mr-2 text-base text-white">→</Text>
        <Text className="text-sm font-bold text-white">Crear cuenta</Text>
      </Pressable>
    </View>
  );
}
