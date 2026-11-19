import { Redirect } from 'expo-router';
import ChangePasswordScreen from '@/features/auth/screens/ChangePasswordScreen';
import useSession, { getSessionDestination } from '@/shared/session/useSession';

export default function ChangePasswordRoute() {
  const { session } = useSession();
  if (!getSessionDestination(session)) return <Redirect href="/login" />;
  return <ChangePasswordScreen />;
}
