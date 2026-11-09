import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { getCurrentUser, logoutUser } from '@/shared/session/sessionStore';

const labels = {
  pending: 'Pendiente de aprobación',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  cancelled: 'Cancelada',
  finished: 'Finalizada',
};
function Button({ label, onPress, disabled = false }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      className={`mt-3 min-h-11 items-center justify-center rounded-xl bg-[#b7472a] px-4 ${disabled ? 'opacity-50' : ''}`}
    >
      <Text className="text-xs font-semibold text-white">{label}</Text>
    </Pressable>
  );
}
export default function VisitParticipationPanel({
  scanner,
  participation: p,
  onContinue,
}) {
  const [alias, setAlias] = useState(getCurrentUser()?.name ?? '');
  const blocked = p.loading || p.saving;
  const canSubmit =
    p.checked &&
    p.errorKind !== 'query' &&
    !p.participant &&
    ![401, 403, 404, 409].includes(p.errorStatus);
  return (
    <View className="rounded-[24px] bg-[#fff8ef] p-5">
      <Text className="text-[10px] font-semibold text-[#477052]">
        QR RECONOCIDO
      </Text>
      <Text className="mt-1 text-xl font-bold text-[#332d28]">
        {scanner.table.tableCode}
      </Text>
      {blocked ? <ActivityIndicator color="#b7472a" /> : null}
      {p.participant ? (
        <>
          <Text className="mt-3 font-bold text-[#332d28]">
            {labels[p.participant.status] ?? 'Estado desconocido'}
          </Text>
          <Text className="mt-1 text-sm text-[#8b8178]">
            {p.participant.alias}
          </Text>
          {p.participant.rejectionReason ? (
            <Text className="mt-1 text-sm text-[#b7472a]">
              {p.participant.rejectionReason}
            </Text>
          ) : null}
        </>
      ) : null}
      {p.error ? (
        <Text accessibilityRole="alert" className="mt-2 text-sm text-[#b7472a]">
          {p.error}
        </Text>
      ) : null}
      {p.uncertain ? (
        <Text className="mt-2 text-xs text-[#8b8178]">
          El resultado no está confirmado. Consulta tus participaciones o
          reintenta la misma solicitud. Se conservarán el nombre y la clave
          originales.
        </Text>
      ) : null}
      {canSubmit ? (
        <>
          <Text className="mt-3 text-sm text-[#332d28]">
            Nombre para la mesa
          </Text>
          <TextInput
            value={alias}
            onChangeText={setAlias}
            editable={!blocked && !p.uncertain}
            accessibilityLabel="Nombre para la mesa"
            className="mt-2 h-11 rounded-xl border border-[#eadfd2] bg-white px-3 text-[#332d28]"
          />
          <Button
            label={p.uncertain ? 'Reintentar solicitud' : 'Solicitar ingreso'}
            disabled={blocked}
            onPress={() =>
              scanner.withResolvedQr(
                (_visitId, qrToken, name) => p.submit(qrToken, name),
                alias,
              )
            }
          />
        </>
      ) : null}
      <Button
        label={
          p.participant ? 'Actualizar estado' : 'Consultar participaciones'
        }
        onPress={p.refresh}
        disabled={blocked}
      />
      {p.errorStatus === 401 ? (
        <Button
          label="Volver al login"
          onPress={async () => {
            await logoutUser();
            router.replace('/login');
          }}
        />
      ) : null}
      {[400, 404].includes(p.errorStatus) ? (
        <Text className="mt-2 text-xs text-[#b7472a]">
          Escanea el QR vigente de la mesa.
        </Text>
      ) : null}
      <Text className="mt-3 text-xs leading-5 text-[#8b8178]">
        Explorar el menú no confirma tu participación. Los pedidos todavía son
        de demostración. Abandonar esta pantalla no cancela una solicitud
        recibida por el servidor.
      </Text>
      <Button label="Ver menú" onPress={onContinue} disabled={p.saving} />
      <Button
        label="Escanear otro QR"
        onPress={scanner.scanAnother}
        disabled={p.saving}
      />
    </View>
  );
}
