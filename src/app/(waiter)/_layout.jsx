import { Redirect, Stack } from 'expo-router';
import useSession, { getSessionDestination } from '@/shared/session/useSession';

export default function Layout() {
  const { session } = useSession();
  const destination = getSessionDestination(session);
  if (!destination) return <Redirect href="/login" />;
  if (session.user.role.code !== 'worker') return <Redirect href={destination} />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
