import { Redirect, Stack } from 'expo-router';
import useSession, { getSessionDestination } from '@/shared/session/useSession';

export default function AuthLayout() {
  const { session } = useSession();
  const destination = getSessionDestination(session);
  if (destination) return <Redirect href={destination} />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
