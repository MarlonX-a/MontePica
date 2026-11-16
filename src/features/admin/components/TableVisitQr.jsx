import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Button } from '@/features/admin/components/AdminUI';

function QrPreview({ qr, table }) {
  return (
    <View className="mt-3 items-center">
      <View className="rounded-xl bg-white p-4">
        <QRCode value={qr.qrToken} size={192} ecl="M" />
      </View>
      <Text className="mt-2 text-xs font-medium text-[#455343]">
        {table.code} · Versión {qr.qrVersion}
      </Text>
      <Text className="mt-2 text-center text-[10px] leading-4 text-[#687363]">
        Este código solo se conserva mientras esta ventana permanece abierta.
      </Text>
    </View>
  );
}

function QrUnavailable() {
  return (
    <Text className="mt-2 text-xs leading-5 text-[#687363]">
      El backend entrega el código una sola vez. Si cierras esta ventana,
      tendrás que emitir uno nuevo; emitirlo invalida el anterior y cancela
      solicitudes pendientes.
    </Text>
  );
}

function QrError({ error, uncertain, onRefresh }) {
  return (
    <View className="mt-3">
      <Text
        accessibilityRole="alert"
        className="mb-2 text-xs leading-5 text-[#24543a]"
      >
        {error}
      </Text>
      {uncertain ? <Button onPress={onRefresh}>Actualizar mesa</Button> : null}
    </View>
  );
}

function StartIssueButton({ qr, pending, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={qr ? 'Emitir un nuevo código QR' : 'Emitir código QR'}
      disabled={pending}
      onPress={onPress}
      className="mt-3 min-h-11 items-center justify-center rounded-xl bg-[#24543a] px-4 py-3"
      style={{ opacity: pending ? 0.5 : 1 }}
    >
      <Text className="text-xs font-semibold text-white">
        {qr ? 'Emitir nuevo QR' : 'Emitir QR'}
      </Text>
    </Pressable>
  );
}

async function confirmIssue(model, setConfirming) {
  const issued = await model.issue();
  if (issued) setConfirming(false);
}

function IssueConfirmation({ model, onCancel }) {
  const pending = model.issuing || model.saving;
  return (
    <View className="mt-3 rounded-xl bg-[#f8f5ec] p-3">
      <Text className="text-xs leading-5 text-[#455343]">
        Al continuar, el QR actual quedará invalidado y se cancelarán las
        solicitudes pendientes de esta visita.
      </Text>
      <View className="mt-3 gap-2">
        <Button disabled={pending} onPress={() => void confirmIssue(model, onCancel)}>
          {model.issuing ? 'Emitiendo QR…' : 'Confirmar emisión'}
        </Button>
        <Button secondary disabled={pending} onPress={() => onCancel(false)}>
          Cancelar
        </Button>
      </View>
    </View>
  );
}

export default function TableVisitQr({ model, table, visitId }) {
  const [confirming, setConfirming] = useState(false);
  const canIssue = Boolean(
    model.canManageVisits && visitId && table?.active && !model.uncertain,
  );
  const pending = model.issuing || model.saving;

  if (!visitId) return null;

  return (
    <View className="mt-3 rounded-xl border border-[#dedfce] bg-white p-4">
      <Text className="text-sm font-semibold text-[#23382b]">
        Código QR de la visita
      </Text>
      {model.qr ? <QrPreview qr={model.qr} table={table} /> : <QrUnavailable />}
      {model.error ? (
        <QrError error={model.error} uncertain={model.uncertain} onRefresh={model.refreshTable} />
      ) : null}
      {canIssue && !confirming ? (
        <StartIssueButton qr={model.qr} pending={pending} onPress={() => setConfirming(true)} />
      ) : null}
      {canIssue && confirming ? (
        <IssueConfirmation model={model} onCancel={setConfirming} />
      ) : null}
      {!canIssue ? (
        <Text className="mt-2 text-xs text-[#687363]">
          Se requiere permiso de gestión de visitas y una mesa activa.
        </Text>
      ) : null}
    </View>
  );
}
