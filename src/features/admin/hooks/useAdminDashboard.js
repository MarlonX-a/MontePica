import { useCallback, useEffect, useRef, useState } from 'react';
import { getCurrentUser } from '@/shared/session/sessionStore';
import {
  getDashboardApiError, getDashboardCashSummary, getDashboardInventory,
  getDashboardOperatingState, getDashboardOrderCount, getDashboardTables,
} from '@/features/admin/api/dashboardAdminApi';
import { countDashboardInventory, countOpenTableVisits } from '@/features/admin/data/dashboardMapper';

const empty = { day: null, cash: null, orders: null, inventory: null, tables: null };
const permissions = ['operations.read', 'orders.read', 'inventory.read', 'tables.read'];

export default function useAdminDashboard() {
  const [data, setData] = useState(empty);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const requestId = useRef(0);
  const controller = useRef(null);
  const userPermissions = getCurrentUser()?.permissions || [];

  const load = useCallback(async (refresh = false) => {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    const id = ++requestId.current;
    setLoading(!refresh);
    setRefreshing(refresh);
    const nextErrors = {};
    const run = async (key, task) => {
      try { return await task(); } catch (error) { if (!request.signal.aborted) nextErrors[key] = getDashboardApiError(error); return null; }
    };
    const can = (permission) => userPermissions.includes(permission);
    const day = can('operations.read') ? await run('day', () => getDashboardOperatingState(request.signal)) : null;
    const dayId = day?.operatingDay?.id;
    const cashId = day?.cashRegister?.id;
    const [cash, orders, inventory, tables] = await Promise.all([
      cashId && can('operations.read') ? run('cash', () => getDashboardCashSummary(cashId, request.signal)) : Promise.resolve(null),
      dayId && can('orders.read') ? Promise.all(['submitted', 'preparing', 'ready', 'dispatched', 'delivered', 'cancelled'].map((status) => run(`orders-${status}`, () => getDashboardOrderCount({ operatingDayId: dayId, status }, request.signal)))) : Promise.resolve(null),
      dayId && can('inventory.read') ? (async () => { const first = await run('inventory', () => getDashboardInventory(dayId, 1, request.signal)); if (!first) return null; const pages = await Promise.all(Array.from({ length: Math.max(0, Math.ceil(first.total / first.limit) - 1) }, (_, i) => run('inventory', () => getDashboardInventory(dayId, i + 2, request.signal)))); return countDashboardInventory([...(first.items || []), ...pages.flatMap((p) => p?.items || [])]); })() : Promise.resolve(null),
      can('tables.read') ? (async () => { const first = await run('tables', () => getDashboardTables(1, request.signal)); if (!first) return null; const pages = await Promise.all(Array.from({ length: Math.max(0, Math.ceil(first.total / first.limit) - 1) }, (_, i) => run('tables', () => getDashboardTables(i + 2, request.signal)))); return countOpenTableVisits([...(first.items || []), ...pages.flatMap((p) => p?.items || [])]); })() : Promise.resolve(null),
    ]);
    if (request.signal.aborted || id !== requestId.current) return;
    setData({ day, cash, orders: orders ? orders.reduce((sum, count) => sum + (count || 0), 0) : null, activeOrders: orders ? orders.slice(0, 4).reduce((sum, count) => sum + (count || 0), 0) : null, inventory, tables });
    setErrors(nextErrors);
    setLoading(false);
    setRefreshing(false);
  }, [userPermissions]);

  useEffect(() => { load(); return () => controller.current?.abort(); }, [load]);
  return { data, errors, loading, refreshing, refresh: () => load(true), permissions: userPermissions };
}
