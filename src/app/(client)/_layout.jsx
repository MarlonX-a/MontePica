import { Redirect, Stack } from 'expo-router';
import useDeliveryNotificationNavigation from '@/features/client/hooks/useDeliveryNotificationNavigation';
import useSession, { getSessionDestination } from '@/shared/session/useSession';

export default function Layout() {
  const { session, generation, closing } = useSession();
  const destination = getSessionDestination(session);
  useDeliveryNotificationNavigation(generation, !closing && session?.user?.role?.code === 'client');
  if (!destination) return <Redirect href="/login" />;
  if (session.user.role.code !== 'client') return <Redirect href={destination} />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
