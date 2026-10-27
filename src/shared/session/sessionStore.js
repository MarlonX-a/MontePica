import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const SESSION_KEY = 'montepica.session';
const canPersistSession = Platform.OS !== 'web';
let currentSession = null;

export function getCurrentUser() {
  return currentSession?.user ?? null;
}

export function setCurrentUser(user) {
  currentSession = user
    ? { user, accessToken: null, refreshToken: null }
    : null;
}

export function getAccessToken() {
  return currentSession?.accessToken ?? null;
}

export function getRefreshToken() {
  return currentSession?.refreshToken ?? null;
}

export async function setCurrentSession(session) {
  if (!session) {
    currentSession = null;

    if (canPersistSession) {
      await SecureStore.deleteItemAsync(SESSION_KEY);
    }

    return;
  }

  currentSession = { ...session };

  if (canPersistSession) {
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
  }
}

export async function restoreCurrentSession() {
  if (!canPersistSession) {
    return currentSession;
  }

  const savedSession = await SecureStore.getItemAsync(SESSION_KEY);

  if (!savedSession) {
    currentSession = null;
    return null;
  }

  try {
    const session = JSON.parse(savedSession);
    const isValidSession =
      session &&
      typeof session.accessToken === 'string' &&
      session.user &&
      typeof session.user === 'object';

    if (!isValidSession) {
      await SecureStore.deleteItemAsync(SESSION_KEY);
      currentSession = null;
      return null;
    }

    currentSession = session;
    return currentSession;
  } catch {
    await SecureStore.deleteItemAsync(SESSION_KEY);
    currentSession = null;
    return null;
  }
}

export async function logoutUser() {
  currentSession = null;

  if (canPersistSession) {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  }
}
