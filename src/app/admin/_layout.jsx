import { Stack } from 'expo-router';
import AdminProvider from '@/features/admin/components/AdminProvider';

export default function AdminLayout() {
  return (
    <AdminProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AdminProvider>
  );
}
