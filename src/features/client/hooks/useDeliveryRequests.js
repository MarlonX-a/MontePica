import { useCallback, useEffect, useRef, useState } from 'react';
import * as Crypto from 'expo-crypto';
import { getCurrentUser } from '@/shared/session/sessionStore';
import { createDeliveryRequest, getDeliveryApiError, getDeliverySettings, getMyDeliveryRequest, getMyDeliveryRequests, isDeliveryResultUncertain } from '@/features/client/api/deliveryApi';
import { clearPendingDeliveryRequest, getPendingDeliveryRequest, setPendingDeliveryRequest } from '@/features/client/data/deliveryRequestStore';

const initialForm = { recipientName: '', phone: '', address: '', references: '' };
const clientIdFor = (user) => user?.clientId || user?.id || user?.userId;

export default function useDeliveryRequests() {
  const user = getCurrentUser();
  const clientId = clientIdFor(user);
  const [settings, setSettings] = useState(null);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ ...initialForm, recipientName: user?.name || '', phone: user?.phone || '' });
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uncertain, setUncertain] = useState(Boolean(clientId && getPendingDeliveryRequest(clientId)));
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const controller = useRef(null);
  const mounted = useRef(false);

  const load = useCallback(async (requestedPage = 1, refresh = false) => {
    controller.current?.abort();
    const request = new AbortController(); controller.current = request;
    setLoading(!refresh); setRefreshing(refresh); setError('');
    const [configResult, listResult] = await Promise.allSettled([
      getDeliverySettings(request.signal), getMyDeliveryRequests({ page: requestedPage, limit: 20, signal: request.signal }),
    ]);
    if (!mounted.current || request.signal.aborted) return;
    if (configResult.status === 'fulfilled') setSettings(configResult.value);
    else setError(getDeliveryApiError(configResult.reason));
    if (listResult.status === 'fulfilled') { setItems(listResult.value.items || []); setPage(requestedPage); setTotal(listResult.value.total || 0); }
    else setError((current) => current || getDeliveryApiError(listResult.reason));
    setLoading(false); setRefreshing(false);
  }, []);

  useEffect(() => { mounted.current = true; void load(); return () => { mounted.current = false; controller.current?.abort(); }; }, [load]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const validate = () => {
    const body = { configurationVersion: settings.version, recipientName: form.recipientName.trim(), phone: form.phone.trim(), address: form.address.trim() };
    const references = form.references.trim(); if (references) body.references = references;
    if (!body.recipientName || body.recipientName.length > 160) return 'El nombre debe tener entre 1 y 160 caracteres.';
    if (!body.phone || body.phone.length > 20) return 'El teléfono debe tener entre 1 y 20 caracteres.';
    if (!body.address || body.address.length > 500) return 'La dirección debe tener entre 1 y 500 caracteres.';
    if (references.length > 500) return 'Las referencias no pueden superar 500 caracteres.';
    return body;
  };

  const submit = useCallback(async (retry = false) => {
    if (!clientId || submitting) return;
    let operation = getPendingDeliveryRequest(clientId);
    if (!retry && operation) { setUncertain(true); return; }
    if (!operation) {
      if (!settings?.enabled) { setError('El servicio a domicilio no está disponible actualmente.'); return; }
      const result = validate(); if (typeof result === 'string') { setFieldError(result); return; }
      operation = { body: result, key: Crypto.randomUUID() };
      setPendingDeliveryRequest(clientId, operation);
    }
    setSubmitting(true); setError(''); setFieldError('');
    try {
      const created = await createDeliveryRequest(operation.body, operation.key);
      clearPendingDeliveryRequest(clientId); setUncertain(false); setItems((current) => [created, ...current]); setTotal((value) => value + 1);
      await load(1, true);
    } catch (requestError) {
      if (isDeliveryResultUncertain(requestError)) setUncertain(true);
      else { clearPendingDeliveryRequest(clientId); setUncertain(false); }
      setError(getDeliveryApiError(requestError));
    } finally { setSubmitting(false); }
  }, [clientId, form, settings, submitting, load]);

  const refreshRequest = useCallback(async (id) => {
    try { const updated = await getMyDeliveryRequest(id); setItems((current) => current.map((item) => item.id === id ? updated : item)); return updated; }
    catch (requestError) { setError(getDeliveryApiError(requestError)); return null; }
  }, []);

  return { settings, items, form, update, error, fieldError, loading, submitting, uncertain, page, total, refreshing, load, submit, refreshRequest, setPage, clientId };
}
