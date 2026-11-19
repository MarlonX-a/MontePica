import { useCallback, useEffect, useState } from 'react';
import {
  getMyPoints,
  getMyPointsMovements,
  getPublicPointsSettings,
  getPublicRewards,
} from '@/features/client/api/rewardsApi';

function getErrorMessage(error, fallback) {
  const message = error.response?.data?.message;
  if (Array.isArray(message)) return message.join(' ');
  return typeof message === 'string' ? message : fallback;
}

export default function useClientRewards() {
  const [settings, setSettings] = useState(null);
  const [balance, setBalance] = useState(null);
  const [rewards, setRewards] = useState([]);
  const [rewardsTotal, setRewardsTotal] = useState(0);
  const [movements, setMovements] = useState([]);
  const [movementTotal, setMovementTotal] = useState(0);
  const [movementPage, setMovementPage] = useState(1);
  const [movementType, setMovementType] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [movementError, setMovementError] = useState('');
  const [rewardPage, setRewardPage] = useState(1);

  const load = useCallback(async (signal) => {
    setError('');
    const results = await Promise.allSettled([
      getPublicPointsSettings(signal), getMyPoints(signal),
    ]);
    if (signal?.aborted) return;
    if (results[0].status === 'fulfilled') setSettings(results[0].value);
    if (results[1].status === 'fulfilled') setBalance(results[1].value);
    const failure = results.find((item) => item.status === 'rejected');
    if (failure) setError(getErrorMessage(failure.reason, 'No se pudo cargar el saldo o la configuración de puntos.'));
  }, []);

  const loadRewards = useCallback(async (page, signal) => {
    try {
      const result = await getPublicRewards({ page, limit: 20, signal });
      if (signal?.aborted) return;
      const lastPage = Math.max(1, Math.ceil(result.total / 20));
      if (page > lastPage) {
        setRewards([]);
        setRewardsTotal(result.total || 0);
        setRewardPage(lastPage);
        return;
      }
      setRewards(result.items || []);
      setRewardsTotal(result.total || 0);
      setRewardPage(result.page || page);
    } catch (failure) {
      if (!signal?.aborted) setError(getErrorMessage(failure, 'No se pudo cargar el catálogo de recompensas.'));
    }
  }, []);

  const loadMovements = useCallback(async (page, type, signal) => {
    setMovementError('');
    try {
      const result = await getMyPointsMovements({ page, limit: 20, type: type || undefined, signal });
      if (signal?.aborted) return;
      const lastPage = Math.max(1, Math.ceil(result.total / 20));
      if (page > lastPage) {
        setMovementPage(lastPage);
        return;
      }
      setMovements(result.items || []);
      setMovementTotal(result.total || 0);
      setMovementPage(result.page || page);
    } catch (failure) {
      if (!signal?.aborted) setMovementError(getErrorMessage(failure, 'No se pudo cargar el historial de puntos.'));
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const controller = new AbortController();
    await Promise.all([
      load(controller.signal), loadRewards(rewardPage, controller.signal),
      loadMovements(movementPage, movementType, controller.signal),
    ]);
    setRefreshing(false);
  }, [load, loadMovements, loadRewards, movementPage, movementType, rewardPage]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    load(controller.signal).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [load]);

  useEffect(() => {
    const controller = new AbortController();
    void loadRewards(rewardPage, controller.signal);
    return () => controller.abort();
  }, [loadRewards, rewardPage]);

  useEffect(() => {
    const controller = new AbortController();
    void loadMovements(movementPage, movementType, controller.signal);
    return () => controller.abort();
  }, [loadMovements, movementPage, movementType]);

  return {
    settings, balance, rewards, rewardsTotal, rewardPage, setRewardPage,
    movements, movementTotal, movementPage, movementType, movementError,
    loading, refreshing, error, refresh,
    setMovementType: (type) => { setMovementType(type); setMovementPage(1); },
    setMovementPage,
    reloadMovements: (page = movementPage) => loadMovements(page, movementType),
  };
}
