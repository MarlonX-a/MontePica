const users = [];
let currentUser = null;

export function registerUser(user) {
  const normalizedEmail = user.email.trim().toLowerCase();
  const existingUser = users.find((item) => item.email === normalizedEmail);

  if (existingUser) {
    return { ok: false, error: 'Ya existe una cuenta con ese correo.' };
  }

  const createdUser = {
    ...user,
    email: normalizedEmail,
  };
  users.push(createdUser);

  return { ok: true, user: createdUser };
}

export function loginUser(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  const registeredUser = users.find(
    (user) => user.email === normalizedEmail && user.password === password,
  );

  if (registeredUser) {
    currentUser = registeredUser;
    return { ok: true, user: registeredUser };
  }

  currentUser = {
    name: 'María',
    email: normalizedEmail,
    role: 'client',
  };

  return { ok: true, user: currentUser };
}

export function getCurrentUser() {
  return currentUser;
}

export function logoutUser() {
  currentUser = null;
}
