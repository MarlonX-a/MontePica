import { useCallback, useEffect, useRef, useState } from 'react';
import { randomUUID } from 'expo-crypto';
import { getCurrentUser } from '@/shared/session/sessionStore';
import {
  createAdminReward,
  getAdminClientPoints,
  getAdminClientPointsMovements,
  getAdminPointsSettings,
  getAdminReward,
  getAdminRewards,
  getAvailableRewardProducts,
  getPublicPointsSettings,
  getPointsRewardsError,
  updateAdminPointsSettings,
  updateAdminReward,
} from '@/features/admin/api/pointsRewardsAdminApi';

const pendingSettingsByUser = new Map();
const pendingRewardsByUser = new Map();

export default function useAdminPointsRewards(permissions, initialClientId) {
  const actorId = getCurrentUser()?.id || 'unknown';
  const canReadPoints = permissions.includes('points.read');
  const canConfigurePoints = permissions.includes('points.configure');
  const canReadRewards = permissions.includes('rewards.read');
  const canManageRewards = permissions.includes('rewards.manage');
  const [settings, setSettings] = useState(null);
  const [settingsDraft, setSettingsDraft] = useState(null);
  const [settingsError, setSettingsError] = useState('');
  const [settingsNotice, setSettingsNotice] = useState('');
  const [settingsConfirm, setSettingsConfirm] = useState(false);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsOperation, setSettingsOperation] = useState(() => pendingSettingsByUser.get(actorId) || null);
  const [products, setProducts] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [rewardTotal, setRewardTotal] = useState(0);
  const [rewardPage, setRewardPage] = useState(1);
  const [rewardSearch, setRewardSearch] = useState('');
  const [rewardActive, setRewardActive] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rewardSaving, setRewardSaving] = useState(false);
  const [rewardNotice, setRewardNotice] = useState('');
  const [rewardDetailLoading, setRewardDetailLoading] = useState(false);
  const [rewardDetailError, setRewardDetailError] = useState('');
  const [rewardWrite, setRewardWrite] = useState(null);
  const [clientId, setClientId] = useState(initialClientId || '');
  const [clientBalance, setClientBalance] = useState(null);
  const [clientMovements, setClientMovements] = useState([]);
  const [clientMovementPage, setClientMovementPage] = useState(1);
  const [clientMovementTotal, setClientMovementTotal] = useState(0);
  const [clientLoading, setClientLoading] = useState(false);
  const [clientError, setClientError] = useState('');
  const clientLookupSequence = useRef(0);

  useEffect(() => () => { clientLookupSequence.current += 1; }, []);

  const loadSettings = useCallback(async (signal) => {
    if (!canReadPoints && !canConfigurePoints) return;
    const current = canReadPoints
      ? await getAdminPointsSettings(signal)
      : await getPublicPointsSettings(signal);
    if (!signal?.aborted) {
      setSettings(current);
      setSettingsDraft({ enabled: current.enabled, pointsPerDollar: String(current.pointsPerDollar) });
    }
  }, [canConfigurePoints, canReadPoints]);

  const loadRewards = useCallback(async (signal, page = rewardPage) => {
    if (!canReadRewards) return;
    let result = await getAdminRewards({
      page, limit: 20, search: rewardSearch.trim() || undefined,
      active: rewardActive === 'all' ? undefined : rewardActive === 'active', signal,
    });
    const lastPage = Math.max(1, Math.ceil(result.total / 20));
    if (page > lastPage && !signal?.aborted) {
      result = await getAdminRewards({
        page: lastPage, limit: 20, search: rewardSearch.trim() || undefined,
        active: rewardActive === 'all' ? undefined : rewardActive === 'active', signal,
      });
    }
    if (!signal?.aborted) {
      setRewards(result.items || []);
      setRewardTotal(result.total || 0);
      setRewardPage(result.page || page);
    }
  }, [canReadRewards, rewardActive, rewardPage, rewardSearch]);

  const load = useCallback(async (signal) => {
    setLoading(true);
    setError('');
    try {
      await Promise.all([
        canReadPoints || canConfigurePoints ? loadSettings(signal) : Promise.resolve(),
        canReadRewards ? loadRewards(signal) : Promise.resolve(),
        canManageRewards ? getAvailableRewardProducts(signal).then((data) => { if (!signal?.aborted) setProducts(data); }) : Promise.resolve(),
      ]);
    } catch (failure) {
      if (!signal?.aborted) setError(getPointsRewardsError(failure));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [canConfigurePoints, canManageRewards, canReadPoints, canReadRewards, loadRewards, loadSettings]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const refresh = useCallback(async () => {
    const controller = new AbortController();
    await load(controller.signal);
  }, [load]);

  async function prepareSettings() {
    setSettingsError('');
    setSettingsNotice('');
    if (!settings || !settingsDraft) return;
    const rate = Number(settingsDraft.pointsPerDollar);
    if (!Number.isInteger(rate) || rate < 1 || rate > 1000) {
      setSettingsError('La tasa debe ser un número entero entre 1 y 1000.');
      return;
    }
    if (rate === settings.pointsPerDollar && settingsDraft.enabled === settings.enabled) {
      setSettingsNotice('No hay cambios para guardar.');
      return;
    }
    try {
      const latest = canReadPoints
        ? await getAdminPointsSettings()
        : await getPublicPointsSettings();
      if (latest.version !== settings.version) {
        setSettings(latest);
        setSettingsError('La configuración cambió en otra sesión. Revisé la versión del servidor y conservé tus valores para que decidas si deseas aplicarlos.');
        return;
      }
      const operation = {
        body: { enabled: settingsDraft.enabled, pointsPerDollar: rate },
        key: randomUUID(),
      };
      setSettingsOperation(operation);
      setSettingsConfirm(true);
    } catch (failure) {
      setSettingsError(getPointsRewardsError(failure));
    }
  }

  async function confirmSettings() {
    if (!settingsOperation || settingsBusy) return;
    setSettingsBusy(true);
    setSettingsError('');
    setSettingsConfirm(false);
    pendingSettingsByUser.set(actorId, settingsOperation);
    try {
      const saved = await updateAdminPointsSettings(settingsOperation.body, settingsOperation.key);
      setSettings(saved);
      setSettingsDraft({ enabled: saved.enabled, pointsPerDollar: String(saved.pointsPerDollar) });
      setSettingsOperation(null);
      pendingSettingsByUser.delete(actorId);
      setSettingsNotice('Configuración actualizada.');
    } catch (failure) {
      const status = failure.response?.status;
      if (!status || status === 408 || status >= 500) {
        pendingSettingsByUser.set(actorId, settingsOperation);
        setSettingsError(`${getPointsRewardsError(failure)} El resultado puede ser incierto; reintenta el mismo envío.`);
      } else {
        setSettingsOperation(null);
        pendingSettingsByUser.delete(actorId);
        setSettingsError(getPointsRewardsError(failure));
        if (status === 409) {
          try { setSettings(await getAdminPointsSettings()); } catch { /* Keep the draft and the conflict visible. */ }
        }
      }
    } finally {
      setSettingsBusy(false);
    }
  }

  function cancelSettingsPreparation() {
    if (!settingsBusy) {
      setSettingsOperation(null);
      pendingSettingsByUser.delete(actorId);
    }
    setSettingsConfirm(false);
  }

  async function lookupClient(id = clientId, page = 1) {
    const normalizedId = id.trim();
    if (!normalizedId) { setClientError('Ingresa el UUID del cliente.'); return; }
    const sequence = clientLookupSequence.current + 1;
    clientLookupSequence.current = sequence;
    if (normalizedId !== clientId) {
      setClientBalance(null);
      setClientMovements([]);
      setClientMovementTotal(0);
    }
    setClientId(normalizedId);
    setClientLoading(true);
    setClientError('');
    try {
      const [balance, movementResponse] = await Promise.all([
        getAdminClientPoints(normalizedId),
        getAdminClientPointsMovements({ clientId: normalizedId, page, limit: 20 }),
      ]);
      if (sequence !== clientLookupSequence.current) return;
      const lastPage = Math.max(1, Math.ceil(movementResponse.total / 20));
      const movementPage = page > lastPage
        ? await getAdminClientPointsMovements({ clientId: normalizedId, page: lastPage, limit: 20 })
        : movementResponse;
      if (sequence !== clientLookupSequence.current) return;
      setClientBalance(balance);
      setClientMovements(movementPage.items || []);
      setClientMovementPage(movementPage.page || page);
      setClientMovementTotal(movementPage.total || 0);
    } catch (failure) {
      if (sequence === clientLookupSequence.current) setClientError(getPointsRewardsError(failure));
    } finally {
      if (sequence === clientLookupSequence.current) setClientLoading(false);
    }
  }

  async function saveReward({ item, values }) {
    const actorWrites = pendingRewardsByUser.get(actorId) || new Map();
    const itemId = item?.id || 'new';
    const pending = actorWrites.get(itemId) || (rewardWrite?.itemId === itemId ? rewardWrite : null);
    let operation = pending;

    if (!operation) {
      const bodyValues = {
        name: values.name.trim(), description: values.description.trim(),
        pointsCost: Number(values.pointsCost), active: values.active,
        sortOrder: Number(values.sortOrder),
      };
      if (!bodyValues.name || bodyValues.name.length > 160) return 'El nombre debe tener entre 1 y 160 caracteres.';
      if (bodyValues.description.length > 500) return 'La descripción admite hasta 500 caracteres.';
      if (!Number.isSafeInteger(bodyValues.pointsCost) || bodyValues.pointsCost < 1) return 'El costo debe ser un entero positivo.';
      if (!Number.isInteger(bodyValues.sortOrder) || bodyValues.sortOrder < 0 || bodyValues.sortOrder > 2147483647) return 'El orden debe ser un entero entre 0 y 2147483647.';
      if (!item && !products.some((product) => product.id === values.productId)) return 'Selecciona un producto válido.';

      const body = item
        ? { expectedVersion: item.version, ...Object.fromEntries(Object.entries(bodyValues).filter(([key, value]) => value !== item[key])) }
        : { ...bodyValues, productId: values.productId };
      if (item && Object.keys(body).length === 1) return 'No hay cambios para guardar.';

      operation = { itemId, body, key: randomUUID(), item };
    }
    setRewardSaving(true);
    setRewardNotice('');
    try {
      if (item) await updateAdminReward(item.id, operation.body, operation.key);
      else await createAdminReward(operation.body, operation.key);
      setRewardWrite(null);
      actorWrites.delete(operation.itemId);
      pendingRewardsByUser.set(actorId, actorWrites);
    } catch (failure) {
      const status = failure.response?.status;
      if (!status || status === 408 || status >= 500) {
        setRewardWrite(operation);
        actorWrites.set(operation.itemId, operation);
        pendingRewardsByUser.set(actorId, actorWrites);
      }
      else {
        setRewardWrite(null);
        actorWrites.delete(operation.itemId);
        pendingRewardsByUser.set(actorId, actorWrites);
        if (status === 409 && item) {
          try {
            const latest = await getAdminReward(item.id);
            return { conflict: true, latest, message: 'La recompensa cambió en el servidor. Conservé tu borrador; revísalo y vuelve a guardar para aplicar tus cambios sobre la versión actual.' };
          } catch { /* Show the original conflict if the detail cannot be refreshed. */ }
        }
        if (status === 409) await loadRewards().catch(() => {});
      }
      return `${getPointsRewardsError(failure)}${!status || status === 408 || status >= 500 ? ' Puedes reintentar el mismo envío.' : ''}`;
    } finally {
      setRewardSaving(false);
    }
    try {
      await loadRewards(undefined, rewardPage);
      return null;
    } catch {
      setRewardNotice('La recompensa se guardó. No se pudo actualizar el listado; vuelve a consultar sin repetir el envío.');
      return null;
    }
  }

  async function loadRewardForEdit(id) {
    setRewardDetailLoading(true);
    setRewardDetailError('');
    try {
      return await getAdminReward(id);
    } catch (failure) {
      setRewardDetailError(getPointsRewardsError(failure));
      return null;
    } finally {
      setRewardDetailLoading(false);
    }
  }

  function getPendingRewardWrite(itemId) {
    return pendingRewardsByUser.get(actorId)?.get(itemId) || null;
  }

  return {
    permissions: { canReadPoints, canConfigurePoints, canReadRewards, canManageRewards },
    settings, settingsDraft, setSettingsDraft, settingsError, settingsNotice,
    settingsConfirm, setSettingsConfirm, settingsBusy, settingsOperation,
    prepareSettings, confirmSettings, retrySettings: confirmSettings, cancelSettingsPreparation,
    products, rewards, rewardTotal, rewardPage, setRewardPage, rewardSearch, setRewardSearch,
    rewardActive, setRewardActive, loading, error, refresh, saveReward, rewardSaving, rewardNotice,
    rewardWrite,
    rewardDetailLoading, rewardDetailError, loadRewardForEdit, getPendingRewardWrite,
    clientId, setClientId, clientBalance, clientMovements, clientMovementPage,
    clientMovementTotal, clientLoading, clientError, lookupClient,
  };
}
