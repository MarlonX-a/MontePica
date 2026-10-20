import { setCurrentUser } from '@/shared/session/sessionStore';

const users = [];

export function loginAsDemoAdmin() {
  const adminUser = {
    name: 'Luis Macías',
    email: 'admin@montepica.ec',
    role: 'admin',
  };
  setCurrentUser(adminUser);

  return { ok: true, user: adminUser };
}

export function registerUser(user) {
  const normalizedEmail = user.email.trim().toLowerCase();
  const userExists = users.some((item) => item.email === normalizedEmail);

  if (userExists) {
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
    setCurrentUser(registeredUser);
    return { ok: true, user: registeredUser };
  }

  const demoUser = {
    name: 'María',
    email: normalizedEmail,
    role: 'client',
  };
  setCurrentUser(demoUser);

  return { ok: true, user: demoUser };
}
