const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

export function validateRegisterField(field, value, values = {}) {
  if (field === 'name' && !value.trim()) {
    return 'Ingresa tu nombre completo.';
  }

  if (field === 'email') {
    const email = value.trim();

    if (!email) {
      return 'Ingresa tu correo electrónico.';
    }

    if (!EMAIL_PATTERN.test(email)) {
      return 'Ingresa un correo electrónico válido.';
    }
  }

  if (field === 'phone') {
    if (!value.trim()) {
      return 'Ingresa tu número de teléfono.';
    }

    if (!isValidPhone(value)) {
      return 'Ingresa un número de 10 dígitos o con código +593.';
    }
  }

  if (field === 'password') {
    if (!value) {
      return 'Ingresa una contraseña.';
    }

    if (getPasswordRequirements(value).some((requirement) => !requirement.valid)) {
      return 'Cumple los requisitos indicados para la contraseña.';
    }
  }

  if (field === 'confirmPassword') {
    if (!value) {
      return 'Confirma tu contraseña.';
    }

    if (value !== values.password) {
      return 'Las contraseñas no coinciden.';
    }
  }

  if (field === 'terms' && !value) {
    return 'Debes aceptar los términos y políticas de privacidad.';
  }

  return '';
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
