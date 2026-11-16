import { isValidEmail } from '@/shared/validators/emailValidator';

export function validateLoginField(field, value) {
  if (field === 'email') {
    const email = value.trim();

    if (!email) {
      return 'Ingresa tu correo electrónico.';
    }

    if (!isValidEmail(email)) {
      return 'Ingresa un correo electrónico válido.';
    }
  }

  if (field === 'password' && value.length === 0) {
    return 'Ingresa tu contraseña.';
  }

  return '';
}

export function validateLoginForm(values) {
  return {
    email: validateLoginField('email', values.email),
    password: validateLoginField('password', values.password),
  };
}
