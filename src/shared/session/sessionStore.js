import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const SESSION_KEY = 'montepica.session';
let snapshot = { session: null, generation: 0, notice: '', closing: false };
let persistence = Promise.resolve();
const listeners = new Set();

export const getSessionSnapshot = () => snapshot;
export const getCurrentUser = () => snapshot.session?.user ?? null;
export const subscribeToSession = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

function publish(changes) {
  snapshot = { ...snapshot, ...changes };
  listeners.forEach((listener) => listener());
}

function persist(session) {
  if (Platform.OS === 'web') return Promise.resolve();
  const write = persistence.then(() => session
    ? SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session))
    : SecureStore.deleteItemAsync(SESSION_KEY));
  persistence = write.catch(() => {});
  return write;
}

export async function setCurrentSession(session) {
  const generation = snapshot.generation + 1;
  publish({ session: null, generation, notice: '', closing: false });
  await persist(session);
  if (snapshot.generation === generation) publish({ session });
}

export async function updateSession(generation, changes) {
  if (snapshot.generation !== generation || !snapshot.session) return;
  const session = { ...snapshot.session, ...changes };
  publish({ session });
  await persist(session);
}

export function beginLogout(generation) {
  if (snapshot.generation === generation) publish({ closing: true });
}

export async function clearSession(generation, notice = '') {
  if (snapshot.generation !== generation) return;
  const nextGeneration = generation + 1;
  publish({ session: null, generation: nextGeneration, notice, closing: false });
  try {
    await persist(null);
  } catch {
    if (snapshot.generation === nextGeneration) {
      publish({ notice: `${notice} No se pudo borrar la sesión guardada del dispositivo.`.trim() });
    }
  }
}

export async function restoreCurrentSession() {
  if (Platform.OS === 'web' || snapshot.session) return snapshot.session;
  const { generation } = snapshot;
  const saved = await SecureStore.getItemAsync(SESSION_KEY);
  if (!saved || snapshot.generation !== generation) return snapshot.session;

  let session;
  try {
    session = JSON.parse(saved);
  } catch {
    session = null;
  }
  if (typeof session?.accessToken !== 'string' || !session.user?.id) {
    await persist(null);
    return null;
  }
  publish({ session });
  return session;
}
