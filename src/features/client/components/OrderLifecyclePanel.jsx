import { useEffect, useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import OperationControls, {
  OperationButton,
} from '@/components/ui/OperationControls';
import OrderEditor from '@/features/client/components/OrderEditor';
import {
  getMyCancellationRequest,
  getMyRefund,
} from '@/features/client/api/orderLifecycleApi';
import {
  formatOrderDate,
  formatOrderTotal,
} from '@/features/client/data/orderMapper';
import useOrderLifecycle, {
  orderCancellationAction,
} from '@/features/client/hooks/useOrderLifecycle';
import { operationError } from '@/shared/api/useConfirmedOperation';

const labels = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  withdrawn: 'Retirada',
  completed: 'Completado',
};

function Records({ data, locked, onWithdraw }) {
  const [detail, setDetail] = useState(null);
  const [message, setMessage] = useState('');
  const request = useRef(null);
  useEffect(() => () => request.current?.abort(), []);

  async function open(record, fetchDetail) {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setDetail(null);
    setMessage('Consultando detalle…');
    try {
      const item = await fetchDetail(record.id, controller.signal);
      if (!controller.signal.aborted) {
        setDetail(item);
        setMessage('');
      }
    } catch (error) {
      if (!controller.signal.aborted) setMessage(operationError(error));
    }
  }

  return (
    <View className="my-2">
      <Text className="text-sm font-bold">Solicitudes de cancelación</Text>
      {data.requests.length ? null : (
        <Text className="text-xs">Sin solicitudes registradas.</Text>
      )}
      {data.requests.map((entry) => (
        <View key={entry.id} className="my-1">
          <OperationButton
            onPress={() => void open(entry, getMyCancellationRequest)}
          >
            {labels[entry.status] + ' · ' + formatOrderDate(entry.createdAt)}
          </OperationButton>
          <Text className="text-xs">{entry.reason}</Text>
          {entry.rejectionReason ? (
            <Text className="text-xs">
              Motivo del rechazo: {entry.rejectionReason}
            </Text>
          ) : null}
          {entry.status === 'pending' ? (
            <OperationButton
              disabled={locked}
              onPress={() => onWithdraw(entry)}
            >
              Retirar solicitud propia
            </OperationButton>
          ) : null}
        </View>
      ))}
      <Text className="mt-3 text-sm font-bold">Reembolsos</Text>
      {data.refunds.length ? null : (
        <Text className="text-xs">Sin reembolsos registrados.</Text>
      )}
      {data.refunds.map((entry) => (
        <OperationButton
          key={entry.id}
          onPress={() => void open(entry, getMyRefund)}
        >
          {labels[entry.status] +
            ' · ' +
            formatOrderTotal(entry.amountCents, entry.currency)}
        </OperationButton>
      ))}
      {message ? <Text className="my-2 text-xs">{message}</Text> : null}
      {detail ? (
        <View className="my-2 rounded-xl bg-[#fff8ef] p-3">
          <Text className="text-xs font-bold">
            {labels[detail.status] || detail.status}
          </Text>
          <Text className="text-xs">
            Registrado: {formatOrderDate(detail.createdAt)}
          </Text>
          {detail.reason ? (
            <Text className="text-xs">Motivo: {detail.reason}</Text>
          ) : null}
          {detail.rejectionReason ? (
            <Text className="text-xs">Rechazo: {detail.rejectionReason}</Text>
          ) : null}
          {detail.decidedAt ? (
            <Text className="text-xs">
              Decisión: {formatOrderDate(detail.decidedAt)}
            </Text>
          ) : null}
          {detail.amountCents != null ? (
            <Text className="text-xs">
              Importe autorizado:{' '}
              {formatOrderTotal(detail.amountCents, detail.currency)}
            </Text>
          ) : null}
          {detail.method ? (
            <Text className="text-xs">
              Método: {detail.method === 'cash' ? 'Efectivo' : 'Transferencia'}
            </Text>
          ) : null}
          {detail.executedAt ? (
            <Text className="text-xs">
              Registrado como completado: {formatOrderDate(detail.executedAt)}
            </Text>
          ) : null}
          <OperationButton onPress={() => setDetail(null)}>
            Cerrar registro
          </OperationButton>
        </View>
      ) : null}
    </View>
  );
}

export default function OrderLifecyclePanel({
  order,
  onUpdated,
  refreshOrders,
}) {
  const model = useOrderLifecycle(order, onUpdated, refreshOrders);
  const [editing, setEditing] = useState(false);
  const [reason, setReason] = useState('');
  const { data } = model;
  useEffect(() => {
    if (model.completedAction === 'edit') setEditing(false);
    if (['cancel', 'request'].includes(model.completedAction)) setReason('');
  }, [model.completedAction]);
  const locked = model.busy || Boolean(model.confirmation || model.operation);
  const current = !model.loading && !model.loadError && data;
  const action = current ? orderCancellationAction(order, data.payments) : null;
  const hasPending = data?.requests.some((entry) => entry.status === 'pending');
  const mayEdit = current && order.modality === 'local' && order.canEdit;
  const cancellationTitle =
    action === 'cancel' ? 'Cancelar pedido' : 'Solicitar cancelación';

  function prepare(actionName, title, message, body, requestId) {
    model.prepare({
      action: actionName,
      title,
      message,
      orderId: order.id,
      status: order.status,
      requestId,
      requestIds: data.requests.map((entry) => entry.id),
      body: { ...body, expectedVersion: order.version },
    });
  }

  return (
    <View className="mt-3 border-t border-[#eadfd2] pt-3">
      <Text className="text-xs font-bold">
        Total {formatOrderTotal(order.totalCents, order.currency)} · Versión{' '}
        {order.version}
      </Text>
      {order.items.map((item) => (
        <Text key={item.id} className="mt-1 text-xs text-[#75695f]">
          {item.quantity} ×{' '}
          {item.productName || 'producto ' + item.productId.slice(0, 8)}
          {' · '}
          {formatOrderTotal(item.subtotalCents, order.currency)}
          {item.notes ? ' · ' + item.notes : ''}
        </Text>
      ))}
      {model.loading ? (
        <Text className="my-2 text-xs">
          Consultando el pedido y sus registros…
        </Text>
      ) : null}
      {model.loadError ? (
        <Text accessibilityRole="alert" className="my-2 text-xs text-[#a83224]">
          {model.loadError}
        </Text>
      ) : null}
      <OperationButton
        disabled={model.loading || locked}
        onPress={() => void model.load()}
      >
        Actualizar estado del pedido
      </OperationButton>
      {mayEdit && !editing ? (
        <OperationButton disabled={locked} onPress={() => setEditing(true)}>
          Editar pedido
        </OperationButton>
      ) : null}
      {editing ? (
        <OrderEditor
          order={order}
          locked={locked || !current}
          onClose={() => setEditing(false)}
          onSave={(body) =>
            prepare(
              'edit',
              'Guardar cambios',
              'Se reemplazará el contenido del pedido. El servidor recalculará el total.',
              body,
            )
          }
        />
      ) : null}
      {action === 'paymentPending' ? (
        <Text className="my-2 text-xs">
          La transferencia está en revisión. La cancelación estará disponible
          según el resultado del pago.
        </Text>
      ) : null}
      {action === 'staff' ? (
        <Text className="my-2 text-xs">
          La anulación de este domicilio sin pago se gestiona con
          administración.
        </Text>
      ) : null}
      {['cancel', 'request'].includes(action) && !hasPending ? (
        <View className="my-2">
          <TextInput
            accessibilityLabel="Motivo de cancelación"
            placeholder="Motivo de cancelación"
            editable={!locked}
            value={reason}
            onChangeText={setReason}
            maxLength={500}
            className="rounded-lg border border-[#eadfd2] p-2 text-sm"
          />
          <OperationButton
            disabled={locked || !reason.trim()}
            onPress={() =>
              prepare(
                action,
                cancellationTitle,
                action === 'cancel'
                  ? 'Confirma que deseas cancelar este pedido.'
                  : 'El personal deberá revisar tu solicitud.',
                { reason: reason.trim() },
              )
            }
          >
            {cancellationTitle}
          </OperationButton>
        </View>
      ) : null}
      <OperationControls model={model} />
      {data ? (
        <Records
          data={data}
          locked={locked || !current}
          onWithdraw={(entry) =>
            prepare(
              'withdraw',
              'Retirar solicitud',
              'Solo puedes retirar solicitudes que hayas enviado tú.',
              {},
              entry.id,
            )
          }
        />
      ) : null}
    </View>
  );
}
