import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { restoreCurrentSession } from '@/shared/session/sessionStore';

function getRouteForRole(roleCode) {
  if (roleCode === 'admin') return '/admin/dashboard';
  if (roleCode === 'worker') return '/waiter';
  return '/home';
}

export default function Index() {
  const [session, setSession] = useState(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      try {
        const restoredSession = await restoreCurrentSession();
        if (isMounted) setSession(restoredSession);
      } catch {
        if (isMounted) setSession(null);
      } finally {
        if (isMounted) setIsCheckingSession(false);
      }
    }

    loadSession();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isCheckingSession) {
    return (
      <View className="flex-1 items-center justify-center bg-[#fff8ef]">
        <ActivityIndicator color="#b7472a" />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href={getRouteForRole(session.user?.role?.code)} />;
}
