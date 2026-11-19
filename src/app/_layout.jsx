import '../../global.css';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { getAuthenticatedUser } from '@/features/auth/api/authApi';
import { getSessionSnapshot, restoreCurrentSession, updateSession } from '@/shared/session/sessionStore';

async function checkSession() {
  if (!await restoreCurrentSession()) return;
  const { generation } = getSessionSnapshot();
  try {
    const user = await getAuthenticatedUser();
    await updateSession(generation, { user });
  } catch (error) {
    if (generation === getSessionSnapshot().generation) throw error;
  }
}

export default function RootLayout() {
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let active = true;
    checkSession().then(
      () => { if (active) setStatus('ready'); },
      () => { if (active) setStatus('error'); },
    );
    return () => { active = false; };
  }, [attempt]);

  if (status === 'ready') return <Stack screenOptions={{ headerShown: false }} />;

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-[#f8f5ec] px-6">
      {status === 'error' ? (
        <>
          <Text accessibilityRole="alert">No se pudo comprobar la sesión. Revisa la conexión e inténtalo de nuevo.</Text>
          <Pressable accessibilityRole="button" onPress={() => {
            setStatus('loading');
            setAttempt((previous) => previous + 1);
          }}>
            <Text className="font-bold text-[#24543a]">Reintentar</Text>
          </Pressable>
        </>
      ) : <ActivityIndicator accessibilityLabel="Comprobando sesión" color="#24543a" />}
    </View>
  );
}
