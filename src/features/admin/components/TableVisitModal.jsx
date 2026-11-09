import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/features/admin/components/AdminUI';
import VisitParticipants from '@/features/admin/components/VisitParticipants';
import TableVisitQr from '@/features/admin/components/TableVisitQr';

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible';
  return date.toLocaleString();
}

function ActionButton({ children, onPress, disabled, secondary = false }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={`min-h-11 items-center justify-center rounded-xl px-4 py-3 ${secondary ? 'bg-[#f2e8d6]' : 'bg-[#b7472a]'}`}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <Text
        className={`text-xs font-semibold ${secondary ? 'text-[#b7472a]' : 'text-white'}`}
      >
        {children}
      </Text>
    </Pressable>
  );
}

function VisitDetails({ visit, loading, error, onRetry }) {
  if (loading) {
    return (
      <View className="items-center rounded-xl bg-white p-4">
        <ActivityIndicator color="#b7472a" />
        <Text className="mt-2 text-xs text-[#8b8178]">Consultando visita…</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View className="rounded-xl bg-white p-4">
        <Text accessibilityRole="alert" className="mb-3 text-xs text-[#b7472a]">
          {error}
        </Text>
        <Button onPress={onRetry}>Reintentar consulta</Button>
      </View>
    );
  }
  if (!visit) return null;
  return (
    <View className="rounded-xl bg-white p-4">
      <Text className="text-[10px] font-semibold uppercase text-[#8b8178]">
        Visita {visit.status === 'open' ? 'abierta' : 'cerrada'}
      </Text>
      <Text className="mt-2 text-xs text-[#514941]">
        Apertura: {formatDate(visit.openedAt)}
      </Text>
      {visit.closedAt ? (
        <Text className="mt-1 text-xs text-[#514941]">
          Cierre: {formatDate(visit.closedAt)}
        </Text>
      ) : null}
    </View>
  );
}

export default function TableVisitModal({ model, qr, canManageParticipants }) {
  const [participantsBusy, setParticipantsBusy] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const table = model.selectedTable;
  const isBusy = model.saving || qr.issuing || participantsBusy;
  const hasOpenVisit = Boolean(table?.openVisitId);
  const canOpen =
    model.canManageVisits &&
    table?.active &&
    !hasOpenVisit &&
    !model.tableError &&
    !model.tableLoading;
  const visitChanged =
    model.canReadVisits &&
    table?.openVisitId &&
    model.visit &&
    (model.visit.id !== table?.openVisitId || model.visit.status !== 'open');
  const canClose =
    model.canManageVisits &&
    hasOpenVisit &&
    !visitChanged &&
    !model.tableError &&
    !model.tableLoading;
  function requestClose() {
    if (isBusy) return;
    qr.clear();
    setConfirmClose(false);
    model.close();
  }

  return (
    <Modal
      visible={model.visible}
      transparent
      animationType="fade"
      onRequestClose={requestClose}
    >
      <SafeAreaView className="flex-1 bg-black/40">
        <View className="flex-1 justify-center px-5 py-4">
          <View
            accessibilityViewIsModal
            className="max-h-[85%] w-full max-w-[460px] self-center rounded-3xl bg-[#fff8ef] p-5"
          >
            <View className="mb-4 flex-row items-center justify-between gap-3">
              <Text
                accessibilityRole="header"
                className="flex-1 text-lg font-bold text-[#332d28]"
              >
                Visita de mesa
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cerrar detalle de visita"
                accessibilityState={{ disabled: isBusy }}
                disabled={isBusy}
                onPress={requestClose}
                className="h-11 w-11 items-center justify-center rounded-full bg-white"
                style={{ opacity: isBusy ? 0.5 : 1 }}
              >
                <Text className="text-xl text-[#b7472a]">×</Text>
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="mb-3 rounded-xl bg-white p-4">
                <Text className="text-[10px] font-semibold uppercase text-[#8b8178]">
                  Mesa
                </Text>
                <Text className="mt-1 text-base font-bold text-[#332d28]">
                  {table?.code || '—'}
                </Text>
                <Text className="mt-2 text-xs text-[#514941]">
                  Estado: {table?.active ? 'Activa' : 'Inactiva'}
                </Text>
                {model.tableLoading ? (
                  <View className="mt-3 flex-row items-center gap-2">
                    <ActivityIndicator size="small" color="#b7472a" />
                    <Text className="text-xs text-[#8b8178]">
                      Actualizando estado…
                    </Text>
                  </View>
                ) : null}
              </View>

              {model.tableError ? (
                <View className="mb-3 rounded-xl bg-white p-4">
                  <Text
                    accessibilityRole="alert"
                    className="mb-3 text-xs text-[#b7472a]"
                  >
                    {model.tableError}
                  </Text>
                  <Button onPress={model.retryTable}>
                    Reintentar consulta
                  </Button>
                </View>
              ) : null}

              {!model.tableError ? (
                <>
                  <Text className="mb-2 text-xs text-[#514941]">
                    {hasOpenVisit
                      ? 'Hay una visita abierta.'
                      : 'No hay visita abierta.'}
                  </Text>
                  {model.canReadVisits ? (
                    <View className="mb-3">
                      {hasOpenVisit || model.visit ? (
                        <VisitDetails
                          visit={model.visit}
                          loading={model.visitLoading}
                          error={model.visitError}
                          onRetry={model.retryVisit}
                        />
                      ) : null}
                    </View>
                  ) : (
                    <Text className="mb-3 text-xs leading-5 text-[#8b8178]">
                      Tu cuenta puede gestionar visitas, pero no tiene permiso
                      para consultar sus fechas y detalles.
                    </Text>
                  )}
                  {hasOpenVisit ? (
                    <TableVisitQr
                      model={{
                        ...qr,
                        canManageVisits: model.canManageVisits,
                        saving: isBusy,
                      }}
                      table={table}
                      visitId={table.openVisitId}
                    />
                  ) : null}
                </>
              ) : null}

              {visitChanged && !model.tableError ? (
                <View className="mb-3">
                  <Text className="mb-2 text-xs leading-5 text-[#b7472a]">
                    La visita cambió mientras consultabas. Actualiza la mesa
                    antes de continuar.
                  </Text>
                  <Button onPress={model.retryTable}>Actualizar mesa</Button>
                </View>
              ) : null}

              {canOpen ? (
                <ActionButton onPress={model.openVisit} disabled={isBusy}>
                  {model.saving ? 'Abriendo visita…' : 'Abrir visita'}
                </ActionButton>
              ) : null}
              {canClose && !confirmClose ? (
                <ActionButton
                  onPress={() => setConfirmClose(true)}
                  disabled={isBusy}
                  secondary
                >
                  Cerrar visita
                </ActionButton>
              ) : null}
              {canClose && confirmClose ? (
                <View className="rounded-xl border border-[#eadfd2] bg-white p-4">
                  <Text className="text-xs leading-5 text-[#514941]">
                    Al cerrar, el backend finalizará las participaciones. La
                    operación se rechazará si hay consumos pendientes en alguna
                    cuenta.
                  </Text>
                  <View className="mt-3 gap-2">
                    <ActionButton onPress={model.closeVisit} disabled={isBusy}>
                      {model.saving ? 'Cerrando visita…' : 'Confirmar cierre'}
                    </ActionButton>
                    <ActionButton
                      onPress={() => setConfirmClose(false)}
                      disabled={isBusy}
                      secondary
                    >
                      Cancelar
                    </ActionButton>
                  </View>
                </View>
              ) : null}

              {!model.canManageVisits && !model.tableError ? (
                <Text className="text-xs text-[#8b8178]">
                  Tu cuenta no tiene permiso para abrir o cerrar visitas.
                </Text>
              ) : null}
              {table && !table.active && !hasOpenVisit && !model.tableError ? (
                <Text className="text-xs text-[#8b8178]">
                  Activa la mesa antes de abrir una visita.
                </Text>
              ) : null}

              {model.message ? (
                <Text
                  accessibilityRole="alert"
                  className={`mt-3 text-xs leading-5 ${model.operationFailed ? 'text-[#b7472a]' : 'text-[#477052]'}`}
                >
                  {model.message}
                </Text>
              ) : null}
              {model.listRefreshError ? (
                <View className="mt-3">
                  <Text className="mb-2 text-xs leading-5 text-[#b7472a]">
                    La operación se confirmó, pero no se pudo actualizar el
                    listado.
                  </Text>
                  <Button onPress={model.retryTableList}>
                    Reintentar actualización
                  </Button>
                </View>
              ) : null}
              {hasOpenVisit &&
              canManageParticipants &&
              !model.tableError &&
              !model.tableLoading &&
              !visitChanged ? (
                <VisitParticipants
                  key={table.openVisitId}
                  visitId={table.openVisitId}
                  externalBusy={model.saving || qr.issuing}
                  onBusy={setParticipantsBusy}
                  refreshKey={qr.qr?.qrVersion || qr.uncertain}
                />
              ) : null}
            </ScrollView>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
