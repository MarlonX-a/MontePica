import { useSyncExternalStore } from 'react';
import { getSessionSnapshot, subscribeToSession } from '@/shared/session/sessionStore';

const destinations = { admin: '/admin/dashboard', worker: '/waiter', client: '/home' };

export function getSessionDestination(session) {
  return destinations[session?.user?.role?.code] ?? null;
}

export default function useSession() {
  return useSyncExternalStore(subscribeToSession, getSessionSnapshot, getSessionSnapshot);
}
