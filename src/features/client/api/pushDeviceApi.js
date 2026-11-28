import apiClient from '@/shared/api/apiClient';

export function registerPushDevice(expoPushToken, sessionGeneration) {
  return apiClient.put('/me/push-device', { expoPushToken }, { sessionGeneration });
}
