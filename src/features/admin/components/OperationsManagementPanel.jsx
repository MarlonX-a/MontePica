import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Button, Chips } from "@/features/admin/components/AdminUI";
import useAdminOperationsManagement from "@/features/admin/hooks/useAdminOperationsManagement";

function money(cents, currency = "USD") {
  if (!Number.isSafeInteger(Number(cents))) return "—";
  return new Intl.NumberFormat("es-EC", { style: "currency", currency }).format(
    Number(cents) / 100,
  );
}

function Field({
  label,
  value,
  onChange,
  keyboardType = "default",
  editable = true,
  placeholder,
}) {
  return (
    <View className="mb-2">
      <Text className="mb-1 text-xs font-semibold text-[#514941]">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        editable={editable}
        keyboardType={keyboardType}
        placeholder={placeholder}
        className="min-h-11 rounded-xl border border-[#eadfd2] bg-white px-3 text-xs text-[#332d28]"
      />
    </View>
  );
}

function Section({ title, children }) {
  return (
    <View className="mb-3 rounded-2xl bg-[#f2e8d6] p-4">
      <Text className="mb-3 text-base font-bold text-[#332d28]">{title}</Text>
      {children}
    </View>
  );
}

function LabelValue({ label, value }) {
  return (
    <View className="mb-2 flex-row justify-between gap-3">
      <Text className="flex-1 text-xs text-[#8b8178]">{label}</Text>
      <Text className="flex-1 text-right text-xs font-semibold text-[#332d28]">
        {value ?? "—"}
      </Text>
    </View>
  );
}

function BlockerList({ groups }) {
  const entries = Object.entries(groups || {});
  if (!entries.length)
    return (
      <Text className="text-xs text-[#477052]">No se reportan bloqueos.</Text>
    );
  return entries.map(([key, group]) => {
    const items = Array.isArray(group?.items) ? group.items : [];
    const total = group?.total ?? (Array.isArray(group) ? group.length : 0);
    return (
      <View key={key} className="mb-2 rounded-xl bg-white p-3">
        <Text className="text-xs font-semibold text-[#332d28]">
          {operationLabel(key)}: {total}
        </Text>
        {items.map((item) => (
          <Text
            key={item.id}
            className="mt-1 text-[10px] leading-4 text-[#8b8178]"
          >
            {item.reason || item.id}
          </Text>
        ))}
      </View>
    );
  });
}

function DayBlockers({ items }) {
  if (!items?.length)
    return (
      <Text className="text-xs text-[#477052]">
        No hay bloqueos para esta página.
      </Text>
    );
  return items.map((item) => (
    <View
      key={`${item.kind}-${item.resourceId}`}
      className="mb-2 rounded-xl bg-white p-3"
    >
      <Text className="text-xs font-semibold text-[#332d28]">
        {item.kind}: {item.reason}
      </Text>
      <Text className="mt-1 text-[10px] text-[#8b8178]">{item.resourceId}</Text>
    </View>
  ));
}

const operationLabels = {
  pendingRedemptions: "Canjes pendientes que se liberarán",
  pendingParticipants: "Solicitudes pendientes que se cancelarán",
  approvedParticipants: "Participaciones aprobadas que finalizarán",
  openVisits: "Visitas abiertas que se cerrarán",
  unusedDeliveryRequests:
    "Solicitudes de domicilio sin entrega que se cancelarán",
  pendingSettlements: "Liquidaciones sin resolver",
  pendingTransfers: "Transferencias pendientes de revisión",
  unsettledLocalConsumption: "Consumos locales sin liquidar",
  activeOrderReservations: "Pedidos con inventario reservado",
  openCash: "Cajas abiertas",
  cashWithoutClosure: "Cajas sin conciliación",
  unfinishedOrders: "Pedidos sin entregar o cancelar",
  unsettledConsumption: "Consumos sin liquidación resuelta",
  pendingCancellations: "Cancelaciones pendientes de decisión",
};

function operationLabel(key) {
  return operationLabels[key] || key;
}

function SettingsEditor({ model }) {
  const [values, setValues] = useState(null);
  const [original, setOriginal] = useState(null);
  useEffect(() => {
    if (!model.settings || values) return;
    const next = {
      timeZone: model.settings.timeZone,
      openingTime: model.settings.openingTime,
      closingTime: model.settings.closingTime,
      localOrderEditSeconds: String(model.settings.localOrderEditSeconds),
    };
    setValues(next);
    setOriginal(next);
  }, [model.settings, values]);
  if (!model.settings || !values) return null;
  const change = (key, value) =>
    setValues((current) => ({ ...current, [key]: value }));
  async function save() {
    const seconds = Number(values.localOrderEditSeconds);
    if (!Number.isInteger(seconds) || seconds < 0 || seconds > 3600) {
      model.setError(
        "Los segundos para editar pedidos deben ser un entero de 0 a 3600.",
      );
      return;
    }
    if (
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(values.openingTime) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(values.closingTime)
    ) {
      model.setError("Las horas deben usar el formato HH:mm de 24 horas.");
      return;
    }
    try {
      new Intl.DateTimeFormat("es", { timeZone: values.timeZone }).format();
    } catch {
      model.setError(
        "Ingresa una zona horaria IANA válida, por ejemplo America/Guayaquil.",
      );
      return;
    }
    const done = await model.saveSettings({
      values: { ...values, localOrderEditSeconds: seconds },
      original,
      originalUpdatedAt: model.settings.updatedAt,
    });
    if (done && model.settings?.updatedAt) setOriginal(values);
  }
  return (
    <Section title="Configuración de operación">
      <LabelValue
        label="Actualizada"
        value={
          model.settings.updatedAt
            ? new Date(model.settings.updatedAt).toLocaleString()
            : "—"
        }
      />
      <Field
        label="Zona horaria IANA"
        value={values.timeZone}
        onChange={(value) => change("timeZone", value)}
        editable={model.canManageSettings && !model.busy && !model.uncertain}
        placeholder="America/Guayaquil"
      />
      <Field
        label="Hora de apertura (HH:mm)"
        value={values.openingTime}
        onChange={(value) => change("openingTime", value)}
        editable={model.canManageSettings && !model.busy && !model.uncertain}
        placeholder="09:00"
      />
      <Field
        label="Hora de cierre (HH:mm)"
        value={values.closingTime}
        onChange={(value) => change("closingTime", value)}
        editable={model.canManageSettings && !model.busy && !model.uncertain}
        placeholder="22:00"
      />
      <Field
        label="Ventana de edición de pedidos (segundos)"
        value={values.localOrderEditSeconds}
        onChange={(value) => change("localOrderEditSeconds", value)}
        keyboardType="number-pad"
        editable={model.canManageSettings && !model.busy && !model.uncertain}
      />
      {model.canManageSettings ? (
        <Button disabled={model.busy} onPress={save}>
          Guardar configuración
        </Button>
      ) : (
        <Text className="text-xs text-[#8b8178]">
          Tu cuenta puede consultar, pero no editar la configuración.
        </Text>
      )}
    </Section>
  );
}

function CurrentOperations({ model, amount, setAmount }) {
  const day = model.current?.operatingDay;
  const cash = model.current?.cashRegister;
  return (
    <Section title="Jornada y caja actuales">
      <LabelValue
        label="Fecha operativa del servidor"
        value={model.current?.businessDate}
      />
      <LabelValue
        label="Jornada"
        value={
          day
            ? `${day.status === "open" ? "Abierta" : "Cerrada"} · ${day.businessDate}`
            : "No abierta"
        }
      />
      <LabelValue
        label="Caja"
        value={
          cash
            ? `${cash.status === "open" ? "Abierta" : "Cerrada"} · ${money(cash.openingCents)}`
            : "Sin caja"
        }
      />
      {!day && model.canOpen ? (
        <Button disabled={model.busy} onPress={model.openDay}>
          {model.busy ? "Abriendo…" : "Abrir jornada de hoy"}
        </Button>
      ) : null}
      {day?.status === "open" && !cash && model.canOpen ? (
        <View className="mt-3">
          <Field
            label="Fondo inicial (USD)"
            value={amount}
            onChange={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
          />
          <Button disabled={model.busy} onPress={() => model.openCash(amount)}>
            {model.busy ? "Abriendo…" : "Abrir caja"}
          </Button>
        </View>
      ) : null}
      {day && !model.canOpen ? (
        <Text className="text-xs text-[#8b8178]">
          Tu cuenta no tiene permiso para abrir jornada o caja.
        </Text>
      ) : null}
    </Section>
  );
}

function CashHistory({ model, onSelectCash }) {
  const [dayFilter, setDayFilter] = useState("");
  const page = model.cashPage;
  if (!page) return null;
  return (
    <Section title="Cajas e historial">
      <Chips
        items={[
          { value: "all", label: "Todas" },
          { value: "open", label: "Abiertas" },
          { value: "closed", label: "Cerradas" },
        ]}
        value={model.cashStatus}
        onChange={(status) => model.loadCashPage(1, status)}
      />
      <Field
        label="Filtrar por UUID de jornada (opcional)"
        value={dayFilter}
        onChange={setDayFilter}
        editable={!model.busy}
        placeholder="UUID de jornada"
      />
      <View className="mb-3 flex-row gap-2">
        <Button
          disabled={model.loading || model.busy || model.uncertain}
          onPress={() =>
            model.loadCashPage(1, model.cashStatus, dayFilter.trim())
          }
        >
          Filtrar cajas
        </Button>
        <Button
          disabled={model.loading || model.busy || model.uncertain}
          onPress={() => {
            setDayFilter("");
            model.loadCashPage(1, model.cashStatus, "");
          }}
        >
          Quitar filtro
        </Button>
      </View>
      {!page.items?.length ? (
        <Text className="text-xs text-[#8b8178]">
          No hay cajas registradas.
        </Text>
      ) : null}
      {page.items?.map((cash) => (
        <Pressable
          accessibilityRole="button"
          disabled={model.busy || model.uncertain}
          key={cash.id}
          onPress={() => onSelectCash(cash)}
          className={`mb-2 rounded-xl bg-white p-3 ${model.uncertain ? "opacity-50" : ""}`}
        >
          <Text className="text-xs font-bold text-[#332d28]">
            Caja {cash.status === "open" ? "abierta" : "cerrada"} ·{" "}
            {new Date(cash.openedAt).toLocaleString()}
          </Text>
          <Text className="mt-1 text-[10px] text-[#8b8178]">
            Jornada {cash.operatingDayId} · Fondo {money(cash.openingCents)}
          </Text>
        </Pressable>
      ))}
      <View className="flex-row gap-2">
        <Button
          disabled={model.loading || model.cashPageNumber <= 1}
          onPress={() => model.loadCashPage(model.cashPageNumber - 1)}
        >
          Anterior
        </Button>
        <Button
          disabled={model.loading || model.cashPageNumber * 20 >= page.total}
          onPress={() => model.loadCashPage(model.cashPageNumber + 1)}
        >
          Siguiente
        </Button>
      </View>
      <Text className="mt-2 text-center text-[10px] text-[#8b8178]">
        Página {model.cashPageNumber} · {page.total} cajas
      </Text>
    </Section>
  );
}

function CashPreview({ model, counted, setCounted, reason, setReason }) {
  const preview = model.cashPreview;
  if (!preview) return null;
  const difference =
    Number(counted.replace(",", ".")) * 100 - preview.expectedCents;
  return (
    <Section title="Revisión y cierre de caja">
      <LabelValue
        label="Saldo inicial"
        value={money(preview.openingCents, preview.currency)}
      />
      <LabelValue
        label="Ingresos en efectivo"
        value={money(preview.cashIncomeCents, preview.currency)}
      />
      <LabelValue
        label="Devoluciones en efectivo"
        value={money(preview.cashRefundsCents, preview.currency)}
      />
      <LabelValue
        label="Saldo esperado"
        value={money(preview.expectedCents, preview.currency)}
      />
      <LabelValue
        label="Transferencias confirmadas (informativo)"
        value={money(preview.confirmedTransferCents, preview.currency)}
      />
      <Text className="mb-2 mt-2 text-xs font-bold text-[#332d28]">
        Bloqueos ({preview.canClose ? "ninguno" : "revisar"})
      </Text>
      <BlockerList groups={preview.blockers} />
      <View className="mt-2 flex-row gap-2">
        <Button
          disabled={model.loading || model.cashPreviewPage <= 1}
          onPress={() =>
            model.loadCash(model.selectedCash, model.cashPreviewPage - 1)
          }
        >
          Página anterior de bloqueos
        </Button>
        <Button
          disabled={
            model.loading ||
            model.cashPreviewPage * 20 >=
              Math.max(
                0,
                ...Object.values(preview.blockers || {}).map(
                  (group) => group.total || 0,
                ),
              )
          }
          onPress={() =>
            model.loadCash(model.selectedCash, model.cashPreviewPage + 1)
          }
        >
          Siguiente página de bloqueos
        </Button>
      </View>
      {preview.pendingRefunds?.total ? (
        <Text className="my-2 text-xs text-[#8b8178]">
          Devoluciones pendientes: {preview.pendingRefunds.total} ·{" "}
          {money(preview.pendingRefunds.amountCents, preview.currency)}. Se
          muestran aparte; revisa el resultado permitido por el backend.
        </Text>
      ) : null}
      <Field
        label="Efectivo contado (USD)"
        value={counted}
        onChange={setCounted}
        keyboardType="decimal-pad"
        editable={
          model.canCloseCash &&
          preview.canClose &&
          !model.busy &&
          !model.uncertain
        }
      />
      {Math.abs(difference) >= 1 ? (
        <Field
          label="Motivo de la diferencia (obligatorio)"
          value={reason}
          onChange={setReason}
          editable={model.canCloseCash && !model.busy && !model.uncertain}
          placeholder="Explica el faltante o sobrante"
        />
      ) : null}
      {!model.canCloseCash ? (
        <Text className="text-xs text-[#8b8178]">
          Tu cuenta no tiene permiso para cerrar caja.
        </Text>
      ) : null}
      {model.uncertain?.kind === "cash" ? (
        <View className="mt-2">
          <Button disabled={model.busy} onPress={model.reconcile}>
            Consultar cierre registrado
          </Button>
          <Button disabled={model.busy} onPress={model.retryUncertain}>
            Reintentar mismo cierre
          </Button>
        </View>
      ) : null}
    </Section>
  );
}

function CashClosure({ closure }) {
  if (!closure) return null;
  return (
    <Section title="Cierre de caja registrado">
      <LabelValue
        label="Fecha"
        value={new Date(closure.closedAt).toLocaleString()}
      />
      <LabelValue
        label="Saldo esperado"
        value={money(closure.expectedCents, closure.currency)}
      />
      <LabelValue
        label="Efectivo contado"
        value={money(closure.countedCents, closure.currency)}
      />
      <LabelValue
        label="Diferencia"
        value={money(closure.differenceCents, closure.currency)}
      />
      <LabelValue label="Motivo" value={closure.reason || "Sin diferencia"} />
      <Text className="mt-2 text-[10px] text-[#8b8178]">
        Registro {closure.id}
      </Text>
    </Section>
  );
}

function DayClose({ model, notes, setNotes }) {
  const preview = model.dayPreview;
  if (!preview) return null;
  return (
    <Section
      title={`Cierre de jornada ${model.selectedDay?.businessDate || ""}`}
    >
      <Text className="mb-2 text-xs font-semibold text-[#332d28]">
        Conteos del servidor
      </Text>
      {Object.entries(preview.counts || {}).map(([key, value]) => (
        <LabelValue key={key} label={operationLabel(key)} value={value} />
      ))}
      <Text className="mb-2 mt-2 text-xs font-semibold text-[#332d28]">
        Bloqueos · {preview.totalBlockers || 0}
      </Text>
      <DayBlockers items={preview.blockers} />
      <View className="mt-2 flex-row gap-2">
        <Button
          disabled={model.loading || model.dayPreviewPage <= 1}
          onPress={() =>
            model.loadDay(model.selectedDay.id, model.dayPreviewPage - 1)
          }
        >
          Bloqueos anteriores
        </Button>
        <Button
          disabled={
            model.loading ||
            model.dayPreviewPage * (preview.limit || 20) >=
              preview.totalBlockers
          }
          onPress={() =>
            model.loadDay(model.selectedDay.id, model.dayPreviewPage + 1)
          }
        >
          Más bloqueos
        </Button>
      </View>
      <Text className="mb-2 mt-2 text-xs font-semibold text-[#332d28]">
        Acciones que ejecutará el backend
      </Text>
      {Object.entries(preview.cleanupActions || {}).map(([key, value]) => (
        <LabelValue key={key} label={operationLabel(key)} value={value} />
      ))}
      {preview.pendingRefunds?.total ? (
        <Text className="my-2 text-xs text-[#8b8178]">
          Reembolsos pendientes: {preview.pendingRefunds.total} ·{" "}
          {money(preview.pendingRefunds.amountCents, preview.currency)}.
        </Text>
      ) : null}
      {preview.canClose && model.canCloseDay ? (
        <Field
          label="Notas del cierre (opcional, máximo 500)"
          value={notes}
          onChange={setNotes}
          editable={!model.busy && !model.uncertain}
        />
      ) : null}
      {!preview.canClose ? (
        <Text className="mt-2 text-xs text-[#b7472a]">
          El backend indica que aún no se puede cerrar la jornada.
        </Text>
      ) : null}
      {preview.canClose && !model.canCloseDay ? (
        <Text className="text-xs text-[#8b8178]">
          Tu cuenta no tiene permiso para cerrar la jornada.
        </Text>
      ) : null}
      {model.uncertain?.kind === "day" ? (
        <View className="mt-2">
          <Button disabled={model.busy} onPress={model.reconcile}>
            Consultar cierre registrado
          </Button>
          <Button disabled={model.busy} onPress={model.retryUncertain}>
            Reintentar mismo cierre
          </Button>
        </View>
      ) : null}
    </Section>
  );
}

function DayClosure({ closure }) {
  if (!closure) return null;
  return (
    <Section title="Cierre de jornada registrado">
      <LabelValue
        label="Fecha"
        value={new Date(closure.closedAt).toLocaleString()}
      />
      <LabelValue
        label="Cierre de caja asociado"
        value={closure.cashClosureId || "Sin caja asociada"}
      />
      {Object.entries(closure.summary || {}).map(([key, value]) => (
        <LabelValue key={key} label={key} value={value} />
      ))}
      <Text className="mt-2 text-[10px] text-[#8b8178]">
        Registro {closure.id}
      </Text>
    </Section>
  );
}

export default function OperationsManagementPanel({ permissions }) {
  const model = useAdminOperationsManagement(permissions);
  const [openingAmount, setOpeningAmount] = useState("");
  const [counted, setCounted] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [dayId, setDayId] = useState("");
  const [cashConfirmation, setCashConfirmation] = useState(false);
  const [cashConfirmationPreview, setCashConfirmationPreview] = useState("");
  const [dayConfirmation, setDayConfirmation] = useState(false);
  const [dayConfirmationPreview, setDayConfirmationPreview] = useState("");
  if (!model.canRead) return null;
  const selectedCash = model.selectedCash;
  const selectedDay = model.selectedDay;

  async function prepareCashClose() {
    if (!selectedCash || model.busy) return;
    const latestPreview = await model.loadCash(selectedCash, 1);
    if (
      !latestPreview ||
      (!latestPreview.expectedCents && latestPreview.expectedCents !== 0)
    )
      return;
    if (counted.trim() === "")
      setCounted((latestPreview.expectedCents / 100).toFixed(2));
    setCashConfirmationPreview(JSON.stringify(latestPreview));
    setCashConfirmation(true);
  }

  async function prepareDayClose() {
    if (!selectedDay || model.busy) return;
    const latest = await model.loadDay(selectedDay.id, 1);
    if (!latest?.preview) return;
    setDayConfirmationPreview(JSON.stringify(latest.preview));
    setDayConfirmation(true);
  }

  function selectCash(cash) {
    setCounted("");
    setReason("");
    setCashConfirmation(false);
    setCashConfirmationPreview("");
    model.loadCash(cash);
  }

  function selectDay(id) {
    setNotes("");
    setDayConfirmation(false);
    setDayConfirmationPreview("");
    model.loadDay(id);
  }

  useEffect(() => {
    if (
      cashConfirmation &&
      cashConfirmationPreview &&
      model.cashPreview &&
      JSON.stringify(model.cashPreview) !== cashConfirmationPreview
    ) {
      setCashConfirmation(false);
      setCashConfirmationPreview("");
    }
  }, [cashConfirmation, cashConfirmationPreview, model.cashPreview]);

  useEffect(() => {
    if (
      dayConfirmation &&
      dayConfirmationPreview &&
      model.dayPreview &&
      JSON.stringify(model.dayPreview) !== dayConfirmationPreview
    ) {
      setDayConfirmation(false);
      setDayConfirmationPreview("");
    }
  }, [dayConfirmation, dayConfirmationPreview, model.dayPreview]);

  return (
    <View className="mt-4">
      <Text
        accessibilityRole="header"
        className="mb-2 text-lg font-bold text-[#332d28]"
      >
        Operación, caja y jornada
      </Text>
      {model.loading && !model.current ? (
        <ActivityIndicator className="mb-3" color="#b7472a" />
      ) : null}
      {model.error ? (
        <Text
          accessibilityRole="alert"
          className="mb-2 rounded-xl bg-white p-3 text-xs text-[#b7472a]"
        >
          {model.error}
        </Text>
      ) : null}
      {model.notice ? (
        <Text
          accessibilityRole="alert"
          className="mb-2 rounded-xl bg-[#deecdf] p-3 text-xs text-[#477052]"
        >
          {model.notice}
        </Text>
      ) : null}
      <View className="mb-3 self-end">
        <Button disabled={model.loading || model.busy} onPress={model.refresh}>
          Actualizar estado operativo
        </Button>
      </View>
      <CurrentOperations
        model={model}
        amount={openingAmount}
        setAmount={setOpeningAmount}
      />
      <SettingsEditor model={model} />
      <CashHistory model={model} onSelectCash={selectCash} />
      {selectedCash ? (
        <>
          <View className="mb-2 flex-row gap-2">
            <Button
              disabled={model.loading || model.busy}
              onPress={() => model.loadCash(selectedCash, 1)}
            >
              Actualizar caja
            </Button>
            <Button
              disabled={model.busy || model.uncertain}
              onPress={() => {
                model.clearSelection();
                setCashConfirmation(false);
              }}
            >
              Cerrar detalle
            </Button>
          </View>
          {selectedCash.status === "open" ? (
            <>
              <CashPreview
                model={model}
                counted={counted}
                setCounted={setCounted}
                reason={reason}
                setReason={setReason}
              />
              {cashConfirmation ? (
                <Section title="Confirmar cierre de caja">
                  <Text className="mb-2 text-xs leading-5 text-[#514941]">
                    Se registrará un cierre inmutable con el conteo indicado. El
                    servidor volverá a comprobar bloqueos y saldo antes de
                    cerrar.
                  </Text>
                  <Button
                    disabled={model.busy || model.uncertain}
                    onPress={async () => {
                      const done = await model.closeCash(counted, reason);
                      if (done) setCashConfirmation(false);
                    }}
                  >
                    Confirmar cierre
                  </Button>
                  <Button
                    disabled={model.busy || model.uncertain}
                    onPress={() => setCashConfirmation(false)}
                  >
                    Volver a revisar
                  </Button>
                </Section>
              ) : (
                <Button
                  disabled={
                    model.busy ||
                    model.uncertain ||
                    !model.cashPreview?.canClose
                  }
                  onPress={prepareCashClose}
                >
                  Preparar confirmación de cierre
                </Button>
              )}
            </>
          ) : null}
          <CashClosure closure={model.cashClosure} />
        </>
      ) : null}
      <Section title="Consultar una jornada anterior">
        <Text className="mb-2 text-xs leading-5 text-[#8b8178]">
          El backend no ofrece un listado general de jornadas. Ingresa el UUID
          de la jornada para revisar su cierre y sus bloqueos.
        </Text>
        <Field
          label="UUID de jornada"
          value={dayId}
          onChange={setDayId}
          editable={!model.busy}
          placeholder={model.current?.operatingDay?.id || "UUID"}
        />
        <Button
          disabled={model.loading || model.busy || model.uncertain}
          onPress={() => selectDay(dayId || model.current?.operatingDay?.id)}
        >
          Consultar jornada
        </Button>
      </Section>
      {selectedDay ? (
        <>
          <Section title="Jornada consultada">
            <LabelValue
              label="Fecha operativa"
              value={selectedDay.businessDate}
            />
            <LabelValue
              label="Estado"
              value={selectedDay.status === "open" ? "Abierta" : "Cerrada"}
            />
            <LabelValue
              label="Caja vinculada"
              value={selectedDay.cashRegisterId || "Sin caja"}
            />
            {selectedDay.cashRegisterId && selectedDay.cashStatus === "open" ? (
              <Button
                disabled={model.loading}
                onPress={() => {
                  setCounted("");
                  setReason("");
                  setCashConfirmation(false);
                  model.loadCash(
                    {
                      id: selectedDay.cashRegisterId,
                      operatingDayId: selectedDay.id,
                      status: "open",
                      openingCents: model.current?.cashRegister?.openingCents,
                    },
                    1,
                  );
                }}
              >
                Revisar caja vinculada
              </Button>
            ) : null}
          </Section>
          {selectedDay.status === "open" ? (
            <>
              <DayClose model={model} notes={notes} setNotes={setNotes} />
              {model.dayPreview?.canClose && model.canCloseDay ? (
                dayConfirmation ? (
                  <Section title="Confirmar cierre de jornada">
                    <Text className="mb-2 text-xs leading-5 text-[#514941]">
                      El backend ejecutará las limpiezas descritas en la vista
                      previa y guardará el resumen inmutable. Verifica
                      nuevamente los bloqueos antes de confirmar.
                    </Text>
                    <Button
                      disabled={model.busy || model.uncertain}
                      onPress={async () => {
                        const done = await model.closeDay(notes);
                        if (done) setDayConfirmation(false);
                      }}
                    >
                      Confirmar cierre de jornada
                    </Button>
                    <Button
                      disabled={model.busy || model.uncertain}
                      onPress={() => setDayConfirmation(false)}
                    >
                      Volver a revisar
                    </Button>
                  </Section>
                ) : (
                  <Button
                    disabled={model.busy || model.uncertain}
                    onPress={prepareDayClose}
                  >
                    Preparar confirmación de cierre
                  </Button>
                )
              ) : null}
            </>
          ) : (
            <DayClosure closure={model.dayClosure} />
          )}
        </>
      ) : null}
    </View>
  );
}
