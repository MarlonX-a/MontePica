import { Redirect } from 'expo-router';
import WelcomeScreen from '@/features/welcome/screens/WelcomeScreen';
import useSession, { getSessionDestination } from '@/shared/session/useSession';

export default function Index() {
  const { session, notice } = useSession();
  const destination = getSessionDestination(session);
  if (destination) return <Redirect href={destination} />;
  if (notice) return <Redirect href="/login" />;
  return <WelcomeScreen />;
}
