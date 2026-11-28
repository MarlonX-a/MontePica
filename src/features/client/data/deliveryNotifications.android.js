import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import * as SQLite from 'expo-sqlite';
import { registerPushDevice } from '@/features/client/api/pushDeviceApi';
import { getSessionSnapshot } from '@/shared/session/sessionStore';

const channelId = 'delivery';
export const supportsDeliveryNotifications = true;
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
let databasePromise;

function preferenceKey(userId) {
  return `montepica.delivery-notifications.${userId}`;
}

function currentClient(generation) {
  const snapshot = getSessionSnapshot();
  const user = snapshot.session?.user;
  if (snapshot.generation === generation && !snapshot.closing && user?.role?.code === 'client') {
    return user;
  }
}

function ensureChannel() {
  return Notifications.setNotificationChannelAsync(channelId, {
    name: 'Solicitudes de domicilio',
    importance: Notifications.AndroidImportance.HIGH,
  });
}

async function register(generation, devicePushToken) {
  if (isExpoGo) return 'local';
  const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) throw new Error('Falta configurar el proyecto de Expo.');
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId, devicePushToken });
  if (!currentClient(generation)) return;
  await registerPushDevice(data, generation);
  return 'enabled';
}

export async function enableDeliveryNotifications(generation) {
  await ensureChannel();
  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted || !current.canAskAgain
    ? current
    : await Notifications.requestPermissionsAsync();
  const user = currentClient(generation);
  if (!user) return;
  if (!permission.granted) return permission.canAskAgain ? 'denied' : 'blocked';
  await SecureStore.setItemAsync(preferenceKey(user.id), 'enabled');
  return register(generation);
}

export function startDeliveryNotifications(generation, onOpen) {
  Notifications.setNotificationHandler({
    handleNotification: async ({ request }) => ({
      shouldShowBanner: request.content.data?.kind === 'deliveryCoverage',
      shouldShowList: request.content.data?.kind === 'deliveryCoverage',
      shouldPlaySound: request.content.data?.kind === 'deliveryCoverage',
      shouldSetBadge: false,
    }),
  });

  let active = true;
  let lastResponse;
  function open(response) {
    const request = response?.notification.request;
    if (!request || request.content.data?.kind !== 'deliveryCoverage' ||
        response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER ||
        lastResponse === request.identifier || !active || !currentClient(generation)) return;
    lastResponse = request.identifier;
    Notifications.clearLastNotificationResponse();
    onOpen(request.identifier);
  }

  const responses = Notifications.addNotificationResponseReceivedListener(open);
  open(Notifications.getLastNotificationResponse());

  async function sync(devicePushToken) {
    const user = currentClient(generation);
    if (!user || !active) return;
    if (await SecureStore.getItemAsync(preferenceKey(user.id)) !== 'enabled') return;
    await ensureChannel();
    const permission = await Notifications.getPermissionsAsync();
    if (active && permission.granted && currentClient(generation)) {
      await register(generation, devicePushToken);
    }
  }

  const tokens = isExpoGo ? null : Notifications.addPushTokenListener((token) => void sync(token).catch(() => {}));
  void sync().catch(() => {});
  return () => {
    active = false;
    responses.remove();
    tokens?.remove();
  };
}

async function getNotificationDatabase() {
  databasePromise ??= SQLite.openDatabaseAsync('montepica-notifications.db')
    .then(async (database) => {
      await database.execAsync('CREATE TABLE IF NOT EXISTS local_delivery_notice (request_id TEXT PRIMARY KEY NOT NULL)');
      return database;
    })
    .catch((error) => {
      databasePromise = undefined;
      throw error;
    });
  return databasePromise;
}

export async function notifyDeliveryRequestCreated(requestId, generation) {
  const user = currentClient(generation);
  if (!user || !requestId) return;
  if (await SecureStore.getItemAsync(preferenceKey(user.id)) !== 'enabled') return;
  if (!(await Notifications.getPermissionsAsync()).granted) return;
  const database = await getNotificationDatabase();
  const result = await database.runAsync(
    'INSERT OR IGNORE INTO local_delivery_notice (request_id) VALUES (?)',
    requestId,
  );
  if (!result.changes || !currentClient(generation)) return;
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: `delivery-created-${requestId}`,
      content: {
        title: 'Solicitud registrada',
        body: 'Te avisaremos cuando se revise tu solicitud de cobertura.',
        data: { kind: 'deliveryCoverage' },
      },
      trigger: { channelId },
    });
  } catch (error) {
    await database.runAsync('DELETE FROM local_delivery_notice WHERE request_id = ?', requestId);
    throw error;
  }
}
