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

export function setCurrentSession(session) {
  currentSession = session ? { ...session } : null;
}

export function logoutUser() {
  currentSession = null;
}
