import { useCallback, useEffect, useRef, useState } from 'react';
import * as Crypto from 'expo-crypto';
import { getCurrentUser } from '@/shared/session/sessionStore';
import {
  getAdminDeliveryError,
  getAdminDeliverySettings,
  isAdminDeliveryResultUncertain,
  updateAdminDeliverySettings,
} from '@/features/admin/api/deliveryAdminApi';
import {
  acquireAdminDeliveryWrite,
  clearPendingAdminDeliverySettings,
  getPendingAdminDelivery,
  getPendingAdminDeliverySettings,
  releaseAdminDeliveryWrite,
  isAdminDeliveryWriteActive,
  setPendingAdminDeliverySettings,
} from '@/features/admin/data/adminDeliveryOperationStore';

const getUserId = () => getCurrentUser()?.id || getCurrentUser()?.userId;

function formatFee(cents) {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}

function toForm(settings) {
  return {
    enabled: Boolean(settings.enabled),
    coverageDescription: settings.coverageDescription || '',
    shippingFee: formatFee(settings.shippingFeeCents || 0),
    receiptSubmissionSeconds: String(settings.receiptSubmissionSeconds),
  };
}

function parseFee(value) {
  const normalized = String(value ?? '').trim().replace(',', '.');
  if (!/^\d+(?:\.\d{0,2})?$/.test(normalized)) return null;
  const [whole, fraction = ''] = normalized.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(cents) ? cents : null;
}

function createPayload(form = {}) {
  const description = String(form.coverageDescription ?? '').trim();
  const shippingFeeCents = parseFee(form.shippingFee);
  const secondsText = String(form.receiptSubmissionSeconds ?? '').trim();
  const receiptSubmissionSeconds = Number(secondsText);

  if (!description || description.length > 500) {
    return { error: 'La cobertura debe tener entre 1 y 500 caracteres.' };
  }
  if (shippingFeeCents === null) {
    return { error: 'Ingresa una tarifa válida con hasta dos decimales.' };
  }
  if (!/^\d+$/.test(secondsText) || receiptSubmissionSeconds < 60 || receiptSubmissionSeconds > 86400) {
    return { error: 'El plazo debe ser un número entero entre 60 y 86400 segundos.' };
  }

  return {
    value: {
      enabled: Boolean(form.enabled),
      coverageDescription: description,
      shippingFeeCents,
      receiptSubmissionSeconds,
    },
  };
}

function samePayload(left, right) {
  return left && right
    && left.enabled === right.enabled
    && left.coverageDescription === right.coverageDescription
    && left.shippingFeeCents === right.shippingFeeCents
    && left.receiptSubmissionSeconds === right.receiptSubmissionSeconds;
}

export default function useAdminDeliverySettings({ canRead, canConfigure, onSaved }) {
  const [state, setState] = useState({
    settings: null,
    loading: true,
    error: '',
    notice: '',
    editorOpen: false,
    editorLoading: false,
    form: null,
    saving: false,
    preflighting: false,
    validationError: '',
    versionChanged: false,
    uncertain: getPendingAdminDeliverySettings(getUserId()),
  });
  const current = useRef(state);
  current.current = state;
  const request = useRef(null);
  const editorRequest = useRef(null);
  const alive = useRef(false);
  const writeLock = useRef(false);
  const preflightLock = useRef(false);

  const updateState = useCallback((changes) => {
    if (alive.current) setState((previous) => ({ ...previous, ...changes }));
  }, []);

  const load = useCallback(async (refresh = false) => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    updateState({ loading: !refresh, error: '' });
    try {
      const settings = await getAdminDeliverySettings(controller.signal);
      if (!controller.signal.aborted) updateState({ settings, loading: false });
    } catch (error) {
      if (!controller.signal.aborted) updateState({ error: getAdminDeliveryError(error), loading: false });
    }
  }, [updateState]);

  useEffect(() => {
    alive.current = true;
    if (canRead) void load();
    else updateState({ loading: false });
    return () => {
      alive.current = false;
      request.current?.abort();
      editorRequest.current?.abort();
    };
  }, [canRead, load, updateState]);

  const openEditor = useCallback(async () => {
    if (!canConfigure || writeLock.current || preflightLock.current || isAdminDeliveryWriteActive(getUserId()) || current.current.editorLoading || current.current.saving) return;
    editorRequest.current?.abort();
    const controller = new AbortController();
    editorRequest.current = controller;
    updateState({ editorOpen: true, editorLoading: true, form: null, error: '', validationError: '', notice: '', baselineVersion: null });
    try {
      const settings = await getAdminDeliverySettings(controller.signal);
      if (controller.signal.aborted) return;
      updateState({
        settings,
        form: toForm(settings),
        editorLoading: false,
        baselineVersion: settings.version,
        versionChanged: false,
      });
    } catch (error) {
      if (!controller.signal.aborted) updateState({ editorLoading: false, error: getAdminDeliveryError(error) });
    }
  }, [canConfigure, updateState]);

  const closeEditor = useCallback(() => {
    if (writeLock.current || preflightLock.current || current.current.saving) return;
    editorRequest.current?.abort();
    updateState({ editorOpen: false, editorLoading: false, validationError: '', error: '', versionChanged: false });
  }, [updateState]);

  const changeField = useCallback((field, value) => {
    if (current.current.saving || preflightLock.current || current.current.uncertain) return;
    updateState({ form: { ...current.current.form, [field]: value }, validationError: '', error: '', versionChanged: false });
  }, [updateState]);

  const send = useCallback(async (operation) => {
    const id = getUserId();
    if (!acquireAdminDeliveryWrite(id)) {
      updateState({ error: 'Hay otra operación de domicilios en curso. Espera a que termine.' });
      return;
    }
    writeLock.current = true;
    if (id) setPendingAdminDeliverySettings(id, operation);
    updateState({ saving: true, error: '', notice: '' });
    try {
      const settings = await updateAdminDeliverySettings(operation.body, operation.key);
      if (id) clearPendingAdminDeliverySettings(id);
      updateState({
        settings,
        form: toForm(settings),
        editorOpen: false,
        saving: false,
        uncertain: null,
        versionChanged: false,
        notice: 'Configuración guardada como una nueva versión.',
      });
      const refreshed = await onSaved?.();
      if (refreshed === false) {
        updateState({ notice: 'La configuración se guardó, pero no se pudo actualizar la lista de solicitudes. Reintenta únicamente la consulta.' });
      }
    } catch (error) {
      const uncertain = isAdminDeliveryResultUncertain(error);
      if (!uncertain && id) clearPendingAdminDeliverySettings(id);
      updateState({ saving: false, error: getAdminDeliveryError(error), uncertain: uncertain ? operation : null });
    } finally {
      writeLock.current = false;
      releaseAdminDeliveryWrite(id);
    }
  }, [onSaved, updateState]);

  const save = useCallback(async (confirmVersionChange = false, retry = false) => {
    if (!canConfigure || writeLock.current || preflightLock.current || current.current.saving) return;
    const id = getUserId();
    const pending = id && getPendingAdminDeliverySettings(id);
    if (id && getPendingAdminDelivery(id)) {
      updateState({ error: 'Hay una decisión de solicitud sin confirmar. Resuélvela antes de cambiar la configuración.' });
      return;
    }
    if (pending || current.current.uncertain) {
      const operation = pending || current.current.uncertain;
      if (!retry) {
        updateState({ error: 'Hay un guardado sin confirmar. Consulta la configuración o reintenta exactamente ese mismo cambio.' });
        return;
      }
      await send(operation);
      return;
    }

    const validated = createPayload(current.current.form || {});
    if (validated.error) {
      updateState({ validationError: validated.error });
      return;
    }
    const body = validated.value;
    const baseline = current.current.settings;
    if (samePayload(body, baseline) && !current.current.versionChanged) {
      updateState({ editorOpen: false, notice: 'No hay cambios para guardar.', validationError: '' });
      return;
    }

    preflightLock.current = true;
    updateState({ preflighting: true, error: '' });
    try {
      const latest = await getAdminDeliverySettings();
      if (!alive.current) return;
      updateState({ settings: latest });
      if (samePayload(body, latest)) {
        updateState({ editorOpen: false, versionChanged: false, notice: 'La configuración ya contiene esos valores. No se creó una versión nueva.' });
        return;
      }
      if (latest.version !== current.current.baselineVersion && !confirmVersionChange) {
        updateState({ versionChanged: true, notice: 'La configuración cambió desde que abriste el editor. Revisa los valores y confirma nuevamente para crear otra versión.' });
        return;
      }
      if (latest.version !== current.current.baselineVersion && confirmVersionChange) {
        updateState({ baselineVersion: latest.version });
      }
      const operation = { body, key: Crypto.randomUUID(), version: latest.version };
      await send(operation);
    } catch (error) {
      updateState({ error: getAdminDeliveryError(error) });
    } finally {
      preflightLock.current = false;
      updateState({ preflighting: false });
    }
  }, [canConfigure, send, updateState]);

  const reconcile = useCallback(async () => {
    if (!current.current.uncertain) return;
    try {
      const settings = await getAdminDeliverySettings();
      updateState({ settings, notice: 'Se consultó la versión actual. Esto no confirma si tu guardado fue el que la creó; puedes reintentar el mismo envío.' });
    } catch (error) {
      updateState({ error: getAdminDeliveryError(error) });
    }
  }, [updateState]);

  return {
    ...state,
    canRead,
    canConfigure,
    load,
    openEditor,
    closeEditor,
    changeField,
    save,
    reconcile,
    retry: () => void save(false, true),
  };
}
