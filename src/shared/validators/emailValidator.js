export function isValidEmail(email) {
  const atIndex = email.indexOf('@');

  if (
    atIndex <= 0 ||
    atIndex !== email.lastIndexOf('@') ||
    atIndex === email.length - 1 ||
    Array.from(email).some((character) => character.trim() === '')
  ) {
    return false;
  }

  const domain = email.slice(atIndex + 1);
  const dotIndex = domain.indexOf('.');

  return dotIndex > 0 && dotIndex < domain.length - 1;
}
