import { isValidEmail } from '@/shared/validators/emailValidator';

export function getPasswordRequirements(password) {
  return [
    { label: '8 caracteres', valid: password.length >= 8 },
    { label: 'una mayúscula', valid: /[A-ZÁÉÍÓÚÑ]/.test(password) },
    { label: 'un número', valid: /\d/.test(password) },
  ];
}

function isValidPhone(phone) {
  const compactPhone = phone.trim().replace(/[\s()-]/g, '');
  const localPhone = compactPhone.startsWith('+593')
    ? `0${compactPhone.slice(4)}`
    : compactPhone;

  return /^\d{10}$/.test(localPhone);
}

const fieldValidators = {
  name: (value) =>
    value.trim() ? '' : 'Ingresa tu nombre completo.',
  email: (value) => {
    const email = value.trim();
    if (!email) return 'Ingresa tu correo electrónico.';
    return isValidEmail(email) ? '' : 'Ingresa un correo electrónico válido.';
  },
  phone: (value) => {
    if (!value.trim()) return 'Ingresa tu número de teléfono.';
    return isValidPhone(value)
      ? ''
      : 'Ingresa un número de 10 dígitos o con código +593.';
  },
  password: (value) => {
    if (!value) return 'Ingresa una contraseña.';
    return getPasswordRequirements(value).every((requirement) => requirement.valid)
      ? ''
      : 'Cumple los requisitos indicados para la contraseña.';
  },
  confirmPassword: (value, values) => {
    if (!value) return 'Confirma tu contraseña.';
    return value === values.password ? '' : 'Las contraseñas no coinciden.';
  },
  terms: (value) =>
    value ? '' : 'Debes aceptar los términos y políticas de privacidad.',
};

export function validateRegisterField(field, value, values = {}) {
  const validate = fieldValidators[field];
  return validate ? validate(value, values) : '';
}

export function validateRegisterForm(values, termsAccepted) {
  return {
    name: validateRegisterField('name', values.name),
    email: validateRegisterField('email', values.email),
    phone: validateRegisterField('phone', values.phone),
    password: validateRegisterField('password', values.password),
    confirmPassword: validateRegisterField(
      'confirmPassword',
      values.confirmPassword,
      values,
    ),
    terms: validateRegisterField('terms', termsAccepted),
  };
}
