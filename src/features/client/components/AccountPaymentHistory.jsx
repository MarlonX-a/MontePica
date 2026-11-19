import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import {
  getMyAccount,
  getMyAccounts,
  getMyPayment,
  getMyPayments,
  getMyPaymentReceipt,
} from '@/features/client/api/ordersApi';

const LIMIT = 20;
const money = (cents, currency = 'USD') => ((cents || 0) / 100).toLocaleString('es-EC', { style: 'currency', currency });
const statusLabel = (status) => ({ pendingVerification: 'Pendiente de revisión', confirmed: 'Confirmado', rejected: 'Rechazado' }[status] || status || '—');

function errorMessage(error) {
  const message = error?.response?.data?.message;
  if (Array.isArray(message)) return message.join(' ');
  if (message) return message;
  if (!error?.response) return 'No se pudo conectar con el servidor. Revisa tu conexión.';
  return 'No se pudo cargar la información.';
}

function toDataUri(blob, mime) {
  return new Promise((resolve, reject) => {
    if (typeof FileReader === 'undefined') {
      reject(new Error('Este dispositivo no puede mostrar el comprobante aquí.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('No se pudo leer el archivo del comprobante.'));
    reader.readAsDataURL(blob.type ? blob : new Blob([blob], { type: mime || 'image/jpeg' }));
  });
}

export default function AccountPaymentHistory() {
  const [tab, setTab] = useState('accounts');
  const [accounts, setAccounts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [receipt, setReceipt] = useState('');
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptError, setReceiptError] = useState('');
  const requestRef = useRef(null);
  const sequence = useRef(0);

  const load = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    const current = ++sequence.current;
    setLoading(true);
    setError('');
    try {
      const result = tab === 'accounts'
        ? await getMyAccounts({ page, limit: LIMIT }, controller.signal)
        : await getMyPayments({ page, limit: LIMIT }, controller.signal);
      if (controller.signal.aborted || current !== sequence.current) return;
      if (tab === 'accounts') setAccounts(result.items || []);
      else setPayments(result.items || []);
      setTotal(result.total || 0);
    } catch (requestError) {
      if (!controller.signal.aborted && current === sequence.current) setError(errorMessage(requestError));
    } finally {
      if (!controller.signal.aborted && current === sequence.current) setLoading(false);
    }
  }, [page, tab]);

  useEffect(() => {
    void load();
    return () => requestRef.current?.abort();
  }, [load]);

  const openDetail = async (item) => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    const current = ++sequence.current;
    setSelected({ ...item, detailLoading: true });
    setReceipt('');
    setReceiptError('');
    try {
      const detail = tab === 'accounts'
        ? await getMyAccount(item.id, controller.signal)
        : await getMyPayment(item.id, controller.signal);
      if (!controller.signal.aborted && current === sequence.current) setSelected(detail);
    } catch (requestError) {
      if (!controller.signal.aborted && current === sequence.current) {
        setSelected({ ...item, detailLoading: false, detailError: errorMessage(requestError) });
      }
    }
  };

  const closeDetail = () => {
    requestRef.current?.abort();
    setSelected(null);
    setReceipt('');
    setReceiptError('');
  };

  const viewReceipt = async () => {
    if (!selected) return;
    const controller = new AbortController();
    requestRef.current?.abort();
    requestRef.current = controller;
    setReceiptLoading(true);
    setReceiptError('');
    try {
      const result = await getMyPaymentReceipt(selected.id, controller.signal);
      const dataUri = await toDataUri(result.blob, result.mime);
      if (!controller.signal.aborted) setReceipt(dataUri);
    } catch (requestError) {
      if (!controller.signal.aborted) setReceiptError(errorMessage(requestError));
    } finally {
      if (!controller.signal.aborted) setReceiptLoading(false);
    }
  };

  const selectTab = (value) => {
    requestRef.current?.abort();
    setSelected(null);
    setTab(value);
    setPage(1);
  };
  const items = tab === 'accounts' ? accounts : payments;

  return <View className="mt-4 rounded-2xl bg-[#f2e8d6] p-4">
    <Text className="mb-3 text-sm font-bold text-[#332d28]">Cuentas y pagos</Text>
    <View className="mb-3 flex-row gap-2">
      {['accounts', 'payments'].map((value) => <Pressable key={value} onPress={() => selectTab(value)} accessibilityRole="tab" accessibilityState={{ selected: tab === value }} className={`rounded-full px-3 py-2 ${tab === value ? 'bg-[#8e3b27]' : 'bg-white'}`}><Text className={`text-[10px] ${tab === value ? 'text-white' : 'text-[#70665e]'}`}>{value === 'accounts' ? 'Mis cuentas' : 'Mis pagos'}</Text></Pressable>)}
    </View>
    {loading ? <ActivityIndicator color="#b7472a" /> : null}
    {error ? <><Text accessibilityRole="alert" className="text-xs text-[#a83224]">{error}</Text><Pressable onPress={() => void load()}><Text className="mt-2 text-xs font-bold text-[#b7472a]">Reintentar</Text></Pressable></> : null}
    {!loading && !error && items.map((item) => <Pressable accessibilityRole="button" key={item.id} onPress={() => void openDetail(item)} className="mb-2 rounded-xl bg-white p-3">
      {tab === 'accounts' ? <>
        <Text className="text-xs font-bold text-[#332d28]">{item.modality === 'local' ? 'Salón' : 'Domicilio'} · {item.status === 'open' ? 'Cuenta abierta' : 'Cuenta cerrada'}</Text>
        <Text className="mt-1 text-[10px] text-[#75695f]">Total {money(item.totalCents, item.currency)} · Pagado {money(item.paidCents, item.currency)}</Text>
        <Text className="mt-1 text-[10px] text-[#75695f]">Pendiente {money(item.pendingCents, item.currency)} · Reembolsado {money(item.refundedCents, item.currency)}</Text>
      </> : <>
        <Text className="text-xs font-bold text-[#332d28]">{item.method === 'cash' ? 'Efectivo' : 'Transferencia'} · {statusLabel(item.status)}</Text>
        <Text className="mt-1 text-[10px] text-[#75695f]">{money(item.amountCents, item.currency)} · {new Date(item.createdAt).toLocaleString('es-EC')}</Text>
        {item.rejectionReason ? <Text className="mt-1 text-[10px] text-[#a83224]">Motivo: {item.rejectionReason}</Text> : null}
      </>}
    </Pressable>)}
    {!loading && !error && !items.length ? <Text className="py-2 text-xs text-[#75695f]">Todavía no hay registros.</Text> : null}
    {total > LIMIT ? <View className="mt-2 flex-row justify-between"><Pressable disabled={page <= 1} onPress={() => setPage(page - 1)}><Text className="text-xs font-bold text-[#b7472a]">Anterior</Text></Pressable><Text className="text-[10px] text-[#75695f]">Página {page} de {Math.ceil(total / LIMIT)}</Text><Pressable disabled={page * LIMIT >= total} onPress={() => setPage(page + 1)}><Text className="text-xs font-bold text-[#b7472a]">Siguiente</Text></Pressable></View> : null}
    <Modal visible={Boolean(selected)} transparent animationType="slide" onRequestClose={closeDetail}>
      <View className="flex-1 justify-end bg-black/40"><View className="max-h-[85%] rounded-t-3xl bg-[#fff8ef] p-5">
        <View className="mb-3 flex-row justify-between"><Text className="text-base font-bold text-[#332d28]">Detalle de {tab === 'accounts' ? 'cuenta' : 'pago'}</Text><Pressable accessibilityRole="button" accessibilityLabel="Cerrar detalle" onPress={closeDetail}><Text className="text-2xl text-[#b7472a]">×</Text></Pressable></View>
        {selected?.detailLoading || receiptLoading ? <ActivityIndicator color="#b7472a" /> : null}
        {selected && !selected.detailLoading ? <ScrollView>
          {selected.detailError ? <Text accessibilityRole="alert" className="text-xs text-[#a83224]">{selected.detailError}</Text> : tab === 'accounts' ? <>
            <Text className="text-xs leading-5 text-[#514941]">{selected.modality === 'local' ? 'Salón' : 'Domicilio'} · {selected.status === 'open' ? 'Abierta' : 'Cerrada'}{`\n`}Total: {money(selected.totalCents, selected.currency)}{`\n`}Pagado: {money(selected.paidCents, selected.currency)}{`\n`}Pendiente: {money(selected.pendingCents, selected.currency)}{`\n`}Reembolso pendiente: {money(selected.refundPendingCents, selected.currency)}{`\n`}Reembolsado: {money(selected.refundedCents, selected.currency)}</Text>
            {selected.items?.map((line) => <Text key={line.id} className="mt-2 text-xs text-[#514941]">{line.quantity} × {line.productName} · {money(line.subtotalCents, selected.currency)}</Text>)}
            {selected.pendingSettlement ? <Text className="mt-3 text-xs text-[#75695f]">Liquidación pendiente: {money(selected.pendingSettlement.totalCents, selected.currency)}</Text> : null}
          </> : <>
            <Text className="text-xs leading-5 text-[#514941]">Estado: {statusLabel(selected.status)}{`\n`}Método: {selected.method === 'cash' ? 'Efectivo' : 'Transferencia'}{`\n`}Importe: {money(selected.amountCents, selected.currency)}{`\n`}Pagado: {money(selected.paidCents, selected.currency)}{`\n`}Reembolso pendiente: {money(selected.refundPendingCents, selected.currency)}{`\n`}Reembolsado: {money(selected.refundedCents, selected.currency)}{`\n`}Fecha: {new Date(selected.createdAt).toLocaleString('es-EC')}</Text>
            {selected.rejectionReason ? <Text className="mt-2 text-xs text-[#a83224]">Motivo de rechazo: {selected.rejectionReason}</Text> : null}
            {selected.receipt ? <Pressable accessibilityRole="button" onPress={() => void viewReceipt()} className="mt-4 rounded-xl bg-[#b7472a] p-3"><Text className="text-center text-xs font-bold text-white">Ver comprobante</Text></Pressable> : null}
            {receiptError ? <Text accessibilityRole="alert" className="mt-2 text-xs text-[#a83224]">{receiptError}</Text> : null}
            {receipt ? <Image accessibilityLabel="Comprobante de transferencia" source={{ uri: receipt }} resizeMode="contain" className="mt-3 h-72 w-full" /> : null}
          </>}
        </ScrollView> : null}
      </View></View>
    </Modal>
  </View>;
}
