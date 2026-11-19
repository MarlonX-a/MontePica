import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import OperationControls, {
  OperationButton,
} from '@/components/ui/OperationControls';
import { Chips, Empty } from '@/features/admin/components/AdminUI';
import {
  RESOLUTION_PAGE_SIZE,
  adminResolutionPrefix,
  useAdminResolutionDetail,
  useAdminResolutionList,
} from '@/features/admin/hooks/useAdminCancellationRefunds';
import { usePendingOperationIds } from '@/shared/api/useConfirmedOperation';

const labels = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  withdrawn: 'Retirada',
  completed: 'Completado',
};
const filters = {
  cancellations: ['', 'pending', 'approved', 'rejected', 'withdrawn'],
  refunds: ['', 'pending', 'completed'],
};
const money = (value, currency) =>
  new Intl.NumberFormat('es-EC', { style: 'currency', currency }).format(
    value / 100,
  );
const date = (value) => new Date(value).toLocaleString('es-EC');

function Field({ label, value, onChange, maxLength, locked }) {
  return (
    <View className="my-1">
      <Text className="text-xs font-semibold">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        editable={!locked}
        maxLength={maxLength}
        value={value}
        onChangeText={onChange}
        className="mt-1 rounded-lg border border-[#eadfd2] bg-white p-3"
      />
    </View>
  );
}

function CancellationActions({ onPrepare, locked }) {
  const [reason, setReason] = useState('');
  return (
    <View className="mt-3">
      <OperationButton
        disabled={locked}
        onPress={() =>
          onPrepare(
            'approve',
            {},
            'Aprobar cancelación',
            'El pedido se cancelará. Si corresponde, el backend registrará un reembolso pendiente.',
          )
        }
      >
        Aprobar
      </OperationButton>
      <Field
        label="Motivo del rechazo"
        value={reason}
        onChange={setReason}
        locked={locked}
        maxLength={500}
      />
      <OperationButton
        disabled={locked || !reason.trim()}
        onPress={() =>
          onPrepare(
            'reject',
            { reason: reason.trim() },
            'Rechazar cancelación',
            'El cliente podrá consultar el motivo.',
          )
        }
      >
        Rechazar
      </OperationButton>
    </View>
  );
}

function RefundActions({ item, onPrepare, locked }) {
  const [method, setMethod] = useState('cash');
  const [recipient, setRecipient] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const cash = method === 'cash';
  const body = { method, notes: notes.trim() };
  if (cash) body.recipientName = recipient.trim();
  else
    body.bankOperationReference = reference
      .normalize('NFC')
      .trim()
      .toLocaleUpperCase('es');
  const valid = cash
    ? body.recipientName.length > 0
    : body.bankOperationReference.length > 0 &&
      body.bankOperationReference.length <= 120;

  return (
    <View className="mt-3">
      <Chips
        items={[
          { value: 'cash', label: 'Efectivo' },
          { value: 'transfer', label: 'Transferencia' },
        ]}
        value={method}
        onChange={(value) => {
          if (!locked) setMethod(value);
        }}
      />
      {cash ? (
        <Field
          label="Nombre del receptor"
          value={recipient}
          onChange={setRecipient}
          locked={locked}
          maxLength={160}
        />
      ) : (
        <Field
          label="Referencia bancaria"
          value={reference}
          onChange={setReference}
          locked={locked}
          maxLength={120}
        />
      )}
      <Field
        label="Notas opcionales"
        value={notes}
        onChange={setNotes}
        locked={locked}
        maxLength={500}
      />
      <OperationButton
        disabled={locked || !valid}
        onPress={() =>
          onPrepare(
            'execute',
            body,
            'Registrar reembolso',
            'Confirma que ya entregaste o transferiste ' +
              money(item.amountCents, item.currency) +
              ' por el método seleccionado.',
          )
        }
      >
        Registrar reembolso
      </OperationButton>
    </View>
  );
}

function ResolutionFacts({ item }) {
  return (
    <View>
      <Text className="text-sm font-bold">
        {labels[item.status] || item.status}
      </Text>
      <Text className="text-xs">
        Pedido {item.orderId} · {date(item.createdAt)}
      </Text>
      {item.reason ? (
        <Text className="text-xs">Motivo: {item.reason}</Text>
      ) : null}
      {item.rejectionReason ? (
        <Text className="text-xs">Rechazo: {item.rejectionReason}</Text>
      ) : null}
      {item.decidedAt ? (
        <Text className="text-xs">Decisión: {date(item.decidedAt)}</Text>
      ) : null}
      {item.amountCents != null ? (
        <Text className="text-xs">
          Importe autorizado: {money(item.amountCents, item.currency)}
        </Text>
      ) : null}
      {item.refund?.id ? (
        <Text className="text-xs">
          Reembolso {item.refund.id} · {labels[item.refund.status]}
        </Text>
      ) : null}
      {item.executedAt ? (
        <Text className="text-xs">Ejecución: {date(item.executedAt)}</Text>
      ) : null}
      {item.method ? (
        <Text className="text-xs">
          Método: {item.method === 'cash' ? 'Efectivo' : 'Transferencia'}
        </Text>
      ) : null}
      {item.recipientName ? (
        <Text className="text-xs">Receptor: {item.recipientName}</Text>
      ) : null}
      {item.bankOperationReference ? (
        <Text className="text-xs">
          Referencia: {item.bankOperationReference}
        </Text>
      ) : null}
      {item.notes ? <Text className="text-xs">Notas: {item.notes}</Text> : null}
      {item.history?.map((entry, index) => (
        <Text key={entry.id || index} className="mt-1 text-xs">
          {entry.event} · {date(entry.occurredAt)}
        </Text>
      ))}
    </View>
  );
}

function ResolutionDetail({ section, itemId, user, refreshList, onClose }) {
  const model = useAdminResolutionDetail({
    section,
    itemId,
    user,
    refreshList,
  });
  const { item } = model;
  const locked = model.busy || Boolean(model.operation || model.confirmation);
  const Actions = section === 'refunds' ? RefundActions : CancellationActions;

  function prepare(action, body, title, message) {
    model.prepare({
      action,
      body,
      title,
      message,
      versionId: item.versionId,
      orderStatus: item.orderStatus,
      amountCents: item.amountCents,
    });
  }

  return (
    <View className="my-3 rounded-2xl border border-[#eadfd2] bg-white p-4">
      {model.loading ? (
        <Text className="text-xs">Consultando detalle…</Text>
      ) : null}
      {model.loadError ? (
        <Text accessibilityRole="alert" className="text-xs text-[#a83224]">
          {model.loadError}
        </Text>
      ) : null}
      {item ? <ResolutionFacts item={item} /> : null}
      {model.canWrite && item?.status === 'pending' ? (
        <Actions
          item={item}
          locked={locked || model.loading || Boolean(model.loadError)}
          onPrepare={prepare}
        />
      ) : null}
      <OperationControls model={model} />
      <OperationButton
        disabled={locked || model.loading}
        onPress={() => void model.load()}
      >
        Actualizar detalle
      </OperationButton>
      <OperationButton disabled={model.busy} onPress={onClose}>
        Cerrar detalle
      </OperationButton>
    </View>
  );
}

export default function AdminResolutionPanel({ section, user }) {
  const model = useAdminResolutionList(section);
  const [itemId, setItemId] = useState(null);
  const pendingIds = usePendingOperationIds(
    adminResolutionPrefix(user) + section + ':',
  );
  const { result } = model;
  const lastPage = Math.max(
    1,
    Math.ceil((result?.total ?? 0) / RESOLUTION_PAGE_SIZE),
  );
  return (
    <View>
      {pendingIds.map((id) => (
        <OperationButton
          key={id}
          onPress={() => setItemId(id)}
          disabled={Boolean(itemId)}
        >
          {'Consultar operación pendiente · ' + id.slice(0, 8)}
        </OperationButton>
      ))}
      <Chips
        items={filters[section].map((value) => ({
          value,
          label: labels[value] || 'Todos',
        }))}
        value={model.status}
        onChange={(value) => {
          if (!itemId) model.setStatus(value);
        }}
      />
      {itemId ? (
        <ResolutionDetail
          key={itemId}
          section={section}
          itemId={itemId}
          user={user}
          refreshList={model.load}
          onClose={() => setItemId(null)}
        />
      ) : null}
      <OperationButton
        onPress={() => void model.load()}
        disabled={model.loading || Boolean(itemId)}
      >
        Actualizar lista
      </OperationButton>
      {model.loading ? (
        <Text className="my-2 text-xs">Consultando registros…</Text>
      ) : null}
      {model.error ? (
        <Text accessibilityRole="alert" className="my-2 text-xs text-[#a83224]">
          {model.error}
        </Text>
      ) : null}
      {!model.loading && !model.error && !result?.items.length ? (
        <Empty>No hay registros en este filtro.</Empty>
      ) : null}
      {!model.loading && !model.error
        ? result?.items.map((item) => (
            <OperationButton
              key={item.id}
              disabled={Boolean(itemId)}
              onPress={() => setItemId(item.id)}
            >
              {(labels[item.status] || item.status) +
                ' · Pedido ' +
                item.orderId.slice(0, 8) +
                ' · ' +
                date(item.createdAt)}
            </OperationButton>
          ))
        : null}
      {lastPage > 1 ? (
        <View className="flex-row items-center justify-between">
          <OperationButton
            disabled={model.page <= 1 || Boolean(itemId) || model.loading}
            onPress={() => model.setPage(model.page - 1)}
          >
            Anterior
          </OperationButton>
          <Text className="text-xs">
            Página {model.page} de {lastPage}
          </Text>
          <OperationButton
            disabled={
              model.page >= lastPage || Boolean(itemId) || model.loading
            }
            onPress={() => model.setPage(model.page + 1)}
          >
            Siguiente
          </OperationButton>
        </View>
      ) : null}
    </View>
  );
}
