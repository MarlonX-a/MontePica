const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLoginField(field, value) {
  if (field === 'email') {
    const email = value.trim();

    if (!email) {
      return 'Ingresa tu correo electrónico.';
    }

    if (!EMAIL_PATTERN.test(email)) {
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
