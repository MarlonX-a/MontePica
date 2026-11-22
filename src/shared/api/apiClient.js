import axios from 'axios';
import {
  beginLogout, clearSession, getSessionSnapshot, updateSession,
} from '@/shared/session/sessionStore';

const defaults = {
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
};
const apiClient = axios.create(defaults);
const sessionTransport = axios.create(defaults);
const expiredNotice = 'Tu sesión expiró. Vuelve a iniciar sesión.';
const publicPaths = new Set([
  '/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password',
  '/products', '/categories', '/delivery/settings',
]);
const pendingRefreshes = new Map();
let pendingLogout;

function isCurrent(generation) {
  return getSessionSnapshot().generation === generation;
}

apiClient.interceptors.request.use((config) => {
  const { session, generation, closing } = getSessionSnapshot();
  const path = config.url?.split('?')[0];
  if (publicPaths.has(path) || path?.startsWith('/products/')) return config;
  if (closing || (config.sessionGeneration != null && config.sessionGeneration !== generation)) {
    throw new axios.CanceledError();
  }
  config.sessionGeneration = generation;
  config.sentAccessToken = session?.accessToken;
  if (session?.accessToken) config.headers.set('Authorization', `Bearer ${session.accessToken}`);
  return config;
});

async function refresh(generation, refreshToken) {
  try {
    const { data } = await sessionTransport.post('/auth/refresh', { refreshToken });
    await updateSession(generation, data);
  } catch (error) {
    const { closing } = getSessionSnapshot();
    if (error.response?.status === 401 && !closing) await clearSession(generation, expiredNotice);
    throw error;
  }
}

function refreshOnce(generation, token) {
  if (!pendingRefreshes.has(generation)) {
    const pending = refresh(generation, token).finally(() => pendingRefreshes.delete(generation));
    pendingRefreshes.set(generation, pending);
  }
  return pendingRefreshes.get(generation);
}

apiClient.interceptors.response.use((response) => {
  const generation = response.config.sessionGeneration;
  if (generation != null && !isCurrent(generation)) throw new axios.CanceledError();
  return response;
}, async (error) => {
  const request = error.config;
  const { session, generation, closing } = getSessionSnapshot();
  if (request?.sessionGeneration == null) throw error;
  if (request.signal?.aborted || request.sessionGeneration !== generation || closing) {
    throw new axios.CanceledError();
  }
  if (error.response?.status !== 401 || request.skipSessionRefresh) throw error;

  if (request.sessionRetried || !session?.refreshToken) {
    if (session) await clearSession(generation, expiredNotice);
    throw error;
  }
  if (session.accessToken === request.sentAccessToken) {
    await refreshOnce(generation, session.refreshToken);
  }
  if (!isCurrent(generation) || getSessionSnapshot().closing || request.signal?.aborted) {
    throw new axios.CanceledError();
  }
  request.sessionRetried = true;
  return apiClient(request);
});

async function revokeSession(generation) {
  beginLogout(generation);
  let notice = '';
  try {
    // An in-flight refresh may rotate the token even while logout is pending.
    await pendingRefreshes.get(generation)?.catch(() => {});
    if (!isCurrent(generation)) return;
    const token = getSessionSnapshot().session?.refreshToken;
    if (token) await sessionTransport.post('/auth/logout', { refreshToken: token });
  } catch {
    notice = 'Cerramos la sesión en esta app. No se pudo confirmar el cierre en el servidor.';
  } finally {
    await clearSession(generation, notice);
  }
}

export function logoutUser() {
  const { session, generation } = getSessionSnapshot();
  if (!session) return Promise.resolve();
  if (pendingLogout?.generation === generation) return pendingLogout.promise;
  const promise = revokeSession(generation).finally(() => {
    if (pendingLogout?.generation === generation) pendingLogout = undefined;
  });
  pendingLogout = { generation, promise };
  return promise;
}

export default apiClient;
