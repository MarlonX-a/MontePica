import { useRef, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import {
  enableDeliveryNotifications,
  supportsDeliveryNotifications,
} from '@/features/client/data/deliveryNotifications';
import useSession from '@/shared/session/useSession';

const messages = {
  enabled: 'Avisos de domicilio activados.',
  local: 'Avisos locales activados. Para recibir avisos remotos, abre la versión de desarrollo de MontePica.',
  denied: 'Para recibir avisos, concede el permiso de notificaciones.',
  blocked: 'Habilita las notificaciones de MontePica en los ajustes de Android.',
  error: 'No se pudieron activar los avisos. Inténtalo de nuevo.',
};

export default function DeliveryNotificationControls() {
  const { generation } = useSession();
  const busy = useRef(false);
  const [status, setStatus] = useState('');
  if (!supportsDeliveryNotifications) return null;

  async function enable() {
    if (busy.current) return;
    busy.current = true;
    setStatus('loading');
    try {
      setStatus(await enableDeliveryNotifications(generation));
    } catch {
      setStatus('error');
    } finally {
      busy.current = false;
    }
  }

  const label = status === 'error' ? 'Reintentar activar avisos' : 'Activar avisos de domicilio';
  return (
    <View className="my-3 rounded-xl bg-white px-3 py-2">
      {messages[status] ? <Text accessibilityLiveRegion="polite" className="py-1 text-xs text-[#514941]">{messages[status]}</Text> : null}
      {status === 'blocked' ? (
        <Pressable accessibilityRole="button" className="py-2" onPress={() => void Linking.openSettings().catch(() => setStatus('error'))}>
          <Text className="text-xs font-bold text-[#24543a]">Abrir ajustes</Text>
        </Pressable>
      ) : null}
      {status !== 'enabled' && status !== 'local' ? (
        <Pressable accessibilityRole="button" disabled={status === 'loading'} className="py-2" onPress={() => void enable()}>
          <Text className="text-xs font-bold text-[#24543a]">{status === 'loading' ? 'Activando avisos…' : label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
