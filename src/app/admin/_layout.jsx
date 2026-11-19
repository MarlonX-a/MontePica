import { Redirect, Stack } from 'expo-router';
import useSession, { getSessionDestination } from '@/shared/session/useSession';
import AdminProvider from '@/features/admin/components/AdminProvider';

export default function Layout() {
  const { session } = useSession();
  const destination = getSessionDestination(session);
  if (!destination) return <Redirect href="/login" />;
  if (session.user.role.code !== 'admin') return <Redirect href={destination} />;
  return <AdminProvider><Stack screenOptions={{ headerShown: false }} /></AdminProvider>;
}
