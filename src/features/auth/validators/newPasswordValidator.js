export function validateNewPassword(password, confirmation) {
  if (password.length < 8 || password.length > 128 || !/[A-ZÁÉÍÓÚÜÑ]/.test(password) ||
      !/\d/.test(password) || /[\r\n\u2028\u2029]/.test(password)) {
    return 'La contraseña nueva debe tener entre 8 y 128 caracteres, una mayúscula y un número.';
  }
  if (password !== confirmation) return 'Las contraseñas nuevas deben coincidir.';
  return '';
}
