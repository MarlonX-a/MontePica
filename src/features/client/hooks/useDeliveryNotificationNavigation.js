import { useEffect } from 'react';
import { router, useRootNavigationState } from 'expo-router';
import { startDeliveryNotifications } from '@/features/client/data/deliveryNotifications';

export default function useDeliveryNotificationNavigation(generation, isClient) {
  const navigationKey = useRootNavigationState()?.key;

  useEffect(() => {
    if (!navigationKey || !isClient) return;
    return startDeliveryNotifications(generation, (noticeId) => {
      router.navigate({ pathname: '/orders', params: { service: 'delivery', noticeId } });
    });
  }, [generation, isClient, navigationKey]);
}
