import { setCurrentUser } from '@/shared/session/sessionStore';

const users = [];
export const demoAdminCredentials = {
  email: 'admin@montepica.ec',
  password: 'montepica',
};

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
  if (
    normalizedEmail === demoAdminCredentials.email &&
    password === demoAdminCredentials.password
  ) {
    const adminUser = {
      name: 'Luis Macías',
      email: demoAdminCredentials.email,
      role: 'admin',
    };
    setCurrentUser(adminUser);
    return { ok: true, user: adminUser };
  }
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
