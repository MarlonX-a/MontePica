import { useCallback, useEffect, useRef, useState } from "react";
import * as Crypto from "expo-crypto";
import {
  closeCashRegister,
  closeOperatingDay,
  getCashClosure,
  getCashClosingPreview,
  getCurrentOperation,
  getOperatingDay,
  getOperatingDayClosure,
  getOperatingDayClosingPreview,
  getOperationSettings,
  getOperationsAdminError,
  listCashRegisters,
  openOperatingCash,
  openOperatingDay,
  updateOperationSettings,
} from "@/features/admin/api/operationsAdminApi";

const emptyState = {
  current: null,
  settings: null,
  cashPage: null,
  cashPageNumber: 1,
  cashStatus: "all",
  cashOperatingDayId: "",
  selectedCash: null,
  cashPreview: null,
  cashClosure: null,
  cashPreviewPage: 1,
  selectedDay: null,
  dayPreview: null,
  dayPreviewPage: 1,
  dayClosure: null,
  loading: true,
  busy: false,
  error: "",
  notice: "",
  uncertain: null,
};

function fingerprint(value) {
  return JSON.stringify(value);
}

function centsFromText(value, maximum = Number.MAX_SAFE_INTEGER) {
  const cleaned = String(value).trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const cents = Math.round(Number(cleaned) * 100);
  return Number.isSafeInteger(cents) && cents <= maximum ? cents : null;
}

function pageCount(total, limit) {
  return Math.max(1, Math.ceil((total || 0) / limit));
}

export default function useAdminOperationsManagement(permissions) {
  const [state, setState] = useState(emptyState);
  const stateRef = useRef(state);
  const alive = useRef(false);
  const lock = useRef(false);
  const request = useRef(null);
  const operation = useRef(null);

  const update = useCallback((changes) => {
    stateRef.current = { ...stateRef.current, ...changes };
    setState(stateRef.current);
  }, []);

  const loadOverview = useCallback(
    async (showLoading = true) => {
      request.current?.abort();
      const controller = new AbortController();
      request.current = controller;
      if (showLoading) update({ loading: true });
      update({ error: "" });
      try {
        const [current, settings, cashPage] = await Promise.all([
          permissions.includes("operations.read")
            ? getCurrentOperation(controller.signal)
            : null,
          permissions.includes("operations.read")
            ? getOperationSettings(controller.signal)
            : null,
          permissions.includes("operations.read")
            ? listCashRegisters(
                {
                  page: 1,
                  limit: 20,
                  ...(stateRef.current.cashStatus === "all"
                    ? {}
                    : { status: stateRef.current.cashStatus }),
                  ...(stateRef.current.cashOperatingDayId
                    ? { operatingDayId: stateRef.current.cashOperatingDayId }
                    : {}),
                },
                controller.signal,
              )
            : null,
        ]);
        if (!alive.current || controller.signal.aborted) return false;
        update({ current, settings, cashPage, cashPageNumber: 1 });
        return true;
      } catch (error) {
        if (alive.current && !controller.signal.aborted)
          update({ error: getOperationsAdminError(error) });
        return false;
      } finally {
        if (alive.current && !controller.signal.aborted)
          update({ loading: false });
      }
    },
    [permissions, update],
  );

  useEffect(() => {
    alive.current = true;
    void loadOverview();
    return () => {
      alive.current = false;
      request.current?.abort();
    };
  }, [loadOverview]);

  const loadCashPage = useCallback(
    async (page = stateRef.current.cashPageNumber, status, operatingDayId) => {
      if (!permissions.includes("operations.read")) return false;
      const selectedStatus =
        status === undefined ? stateRef.current.cashStatus : status;
      const selectedOperatingDayId =
        operatingDayId === undefined
          ? stateRef.current.cashOperatingDayId
          : operatingDayId;
      const params = {
        page,
        limit: 20,
        ...(selectedStatus === "all" ? {} : { status: selectedStatus }),
        ...(selectedOperatingDayId
          ? { operatingDayId: selectedOperatingDayId }
          : {}),
      };
      const controller = new AbortController();
      request.current?.abort();
      request.current = controller;
      update({ loading: true, error: "" });
      try {
        let result = await listCashRegisters(params, controller.signal);
        const finalPage = pageCount(result.total, result.limit || 20);
        if (page > finalPage) {
          page = finalPage;
          result = await listCashRegisters(
            { ...params, page },
            controller.signal,
          );
        }
        if (!alive.current || controller.signal.aborted) return false;
        update({
          cashPage: result,
          cashPageNumber: page,
          cashStatus: selectedStatus,
          cashOperatingDayId: selectedOperatingDayId,
        });
        return true;
      } catch (error) {
        if (alive.current && !controller.signal.aborted)
          update({ error: getOperationsAdminError(error) });
        return false;
      } finally {
        if (alive.current && !controller.signal.aborted)
          update({ loading: false });
      }
    },
    [permissions, update],
  );

  const loadCash = useCallback(
    async (cash, page = 1) => {
      if (stateRef.current.uncertain) return false;
      const controller = new AbortController();
      request.current?.abort();
      request.current = controller;
      update({
        selectedCash: cash,
        cashPreview: null,
        cashClosure: null,
        loading: true,
        error: "",
        notice: "",
      });
      try {
        if (cash.status === "closed") {
          const closure = await getCashClosure(cash.id, controller.signal);
          if (!alive.current || controller.signal.aborted) return false;
          update({ cashClosure: closure });
          return closure;
        } else {
          const preview = await getCashClosingPreview(
            cash.id,
            { page, limit: 20 },
            controller.signal,
          );
          if (!alive.current || controller.signal.aborted) return false;
          update({ cashPreview: preview, cashPreviewPage: page });
          return preview;
        }
      } catch (error) {
        if (alive.current && !controller.signal.aborted)
          update({ error: getOperationsAdminError(error) });
        return false;
      } finally {
        if (alive.current && !controller.signal.aborted)
          update({ loading: false });
      }
    },
    [update],
  );

  const loadDay = useCallback(
    async (id, page = 1) => {
      if (stateRef.current.uncertain) return false;
      const normalized = String(id || "").trim();
      if (!normalized) {
        update({ error: "Ingresa el UUID de una jornada." });
        return false;
      }
      const controller = new AbortController();
      request.current?.abort();
      request.current = controller;
      update({
        selectedDay: null,
        dayPreview: null,
        dayClosure: null,
        loading: true,
        error: "",
        notice: "",
      });
      try {
        const day = await getOperatingDay(normalized, controller.signal);
        if (!alive.current || controller.signal.aborted) return false;
        if (day.status === "closed" && day.closureId) {
          const closure = await getOperatingDayClosure(
            normalized,
            controller.signal,
          );
          if (!alive.current || controller.signal.aborted) return false;
          update({ selectedDay: day, dayClosure: closure });
          return { day, closure };
        } else {
          const preview = await getOperatingDayClosingPreview(
            normalized,
            { page, limit: 20 },
            controller.signal,
          );
          if (!alive.current || controller.signal.aborted) return false;
          update({
            selectedDay: day,
            dayPreview: preview,
            dayPreviewPage: page,
          });
          return { day, preview };
        }
      } catch (error) {
        if (alive.current && !controller.signal.aborted)
          update({ error: getOperationsAdminError(error) });
        return false;
      } finally {
        if (alive.current && !controller.signal.aborted)
          update({ loading: false });
      }
    },
    [update],
  );

  const openDay = useCallback(async () => {
    if (
      !permissions.includes("operations.open") ||
      lock.current ||
      stateRef.current.uncertain
    )
      return;
    if (stateRef.current.current?.operatingDay) return;
    lock.current = true;
    update({ busy: true, error: "", notice: "" });
    try {
      await openOperatingDay();
      update({ notice: "La jornada se abrió correctamente." });
    } catch (error) {
      update({
        notice: `La apertura no se confirmó. Se consultó el estado actual: ${getOperationsAdminError(error)}`,
      });
    } finally {
      lock.current = false;
      if (alive.current) {
        await loadOverview(false);
        update({ busy: false });
      }
    }
  }, [loadOverview, permissions, update]);

  const openCash = useCallback(
    async (amountText) => {
      const amount = centsFromText(amountText, 2147483647);
      if (amount === null) {
        update({
          error: "Ingresa un fondo válido en USD con hasta dos decimales.",
        });
        return false;
      }
      if (
        !permissions.includes("operations.open") ||
        lock.current ||
        stateRef.current.uncertain
      )
        return false;
      if (stateRef.current.current?.cashRegister) {
        update({
          error:
            "La jornada ya tiene una caja. Actualiza el panel para consultar su estado.",
        });
        return false;
      }
      lock.current = true;
      update({ busy: true, error: "", notice: "" });
      try {
        await openOperatingCash(amount);
        update({ notice: "La caja se abrió correctamente." });
        return true;
      } catch (error) {
        update({
          notice: `La apertura no se confirmó. Se consultó el estado actual: ${getOperationsAdminError(error)}`,
        });
        return false;
      } finally {
        lock.current = false;
        if (alive.current) {
          await loadOverview(false);
          update({ busy: false });
        }
      }
    },
    [loadOverview, permissions, update],
  );

  const saveSettings = useCallback(
    async (draft) => {
      if (
        !permissions.includes("operations.manage") ||
        lock.current ||
        stateRef.current.uncertain
      )
        return false;
      lock.current = true;
      update({ busy: true, error: "", notice: "" });
      try {
        const latest = await getOperationSettings();
        if (latest.updatedAt !== draft.originalUpdatedAt) {
          update({
            settings: latest,
            notice:
              "La configuración cambió en el servidor. Tus valores se conservaron; revisa los datos y vuelve a guardar.",
          });
          return false;
        }
        const body = {};
        for (const key of [
          "timeZone",
          "openingTime",
          "closingTime",
          "localOrderEditSeconds",
        ]) {
          if (String(draft.values[key]) !== String(draft.original[key]))
            body[key] = draft.values[key];
        }
        if (!Object.keys(body).length) {
          update({ notice: "No hay cambios en la configuración." });
          return true;
        }
        const saved = await updateOperationSettings(body);
        update({ settings: saved, notice: "Configuración actualizada." });
        await loadOverview(false);
        return true;
      } catch (error) {
        const message = getOperationsAdminError(error);
        try {
          const latest = await getOperationSettings();
          update({
            settings: latest,
            notice: `No se confirmó el guardado. Se consultó la configuración vigente. ${message}`,
          });
        } catch {
          update({ error: message });
        }
        return false;
      } finally {
        lock.current = false;
        if (alive.current) update({ busy: false });
      }
    },
    [loadOverview, permissions, update],
  );

  const performClose = useCallback(
    async (candidate) => {
      if (lock.current) return false;
      lock.current = true;
      operation.current = candidate;
      update({ busy: true, error: "", notice: "", uncertain: null });
      try {
        const latestPreview =
          candidate.kind === "cash"
            ? await getCashClosingPreview(candidate.id, {
                page: candidate.previewPage,
                limit: 20,
              })
            : await getOperatingDayClosingPreview(candidate.id, {
                page: candidate.previewPage,
                limit: 20,
              });
        if (fingerprint(latestPreview) !== candidate.previewFingerprint) {
          if (candidate.kind === "cash") update({ cashPreview: latestPreview });
          else update({ dayPreview: latestPreview });
          operation.current = null;
          update({
            notice:
              "La vista previa cambió. Revisa los datos actualizados y confirma de nuevo.",
          });
          return false;
        }
        const result =
          candidate.kind === "cash"
            ? await closeCashRegister(
                candidate.id,
                candidate.body,
                candidate.key,
              )
            : await closeOperatingDay(
                candidate.id,
                candidate.body,
                candidate.key,
              );
        operation.current = null;
        if (candidate.kind === "cash")
          update({
            cashClosure: result,
            cashPreview: null,
            selectedCash: {
              ...stateRef.current.selectedCash,
              status: "closed",
            },
            notice: "Cierre de caja registrado.",
          });
        else
          update({
            dayClosure: result,
            dayPreview: null,
            selectedDay: {
              ...stateRef.current.selectedDay,
              status: "closed",
              closureId: result.id,
            },
            notice: "Jornada cerrada y registro guardado.",
          });
        await loadOverview(false);
        await loadCashPage(1);
        return true;
      } catch (error) {
        const uncertain = !error.response || error.response.status >= 500;
        if (uncertain) {
          update({
            uncertain: candidate,
            notice:
              "El resultado del cierre no está confirmado. Consulta el registro antes de reintentar.",
          });
        } else {
          operation.current = null;
          update({ error: getOperationsAdminError(error) });
        }
        return false;
      } finally {
        lock.current = false;
        if (alive.current) update({ busy: false });
      }
    },
    [loadCashPage, loadOverview, update],
  );

  const closeCash = useCallback(
    async (countedText, reason) => {
      const preview = stateRef.current.cashPreview;
      const cash = stateRef.current.selectedCash;
      if (
        !preview ||
        !cash ||
        !permissions.includes("operations.closeCash") ||
        stateRef.current.uncertain
      )
        return false;
      const countedCents = centsFromText(countedText);
      if (countedCents === null)
        return (
          update({
            error:
              "Ingresa un efectivo contado válido con hasta dos decimales.",
          }),
          false
        );
      const difference = countedCents - preview.expectedCents;
      const cleanReason = String(reason || "").trim();
      if (difference !== 0 && (!cleanReason || cleanReason.length > 500))
        return (
          update({
            error:
              "Explica la diferencia con un motivo de entre 1 y 500 caracteres.",
          }),
          false
        );
      if (!preview.canClose)
        return (
          update({
            error:
              "La caja tiene bloqueos pendientes. Resuélvelos y consulta otra vista previa.",
          }),
          false
        );
      return performClose({
        kind: "cash",
        id: cash.id,
        body: {
          countedCents,
          ...(difference !== 0 ? { reason: cleanReason } : {}),
        },
        key: `cash-close-${Crypto.randomUUID()}`,
        previewPage: stateRef.current.cashPreviewPage,
        previewFingerprint: fingerprint(preview),
      });
    },
    [performClose, permissions, update],
  );

  const closeDay = useCallback(
    async (notes) => {
      const preview = stateRef.current.dayPreview;
      const day = stateRef.current.selectedDay;
      if (
        !preview ||
        !day ||
        !permissions.includes("operations.closeDay") ||
        stateRef.current.uncertain
      )
        return false;
      const cleanNotes = String(notes || "").trim();
      if (cleanNotes.length > 500)
        return (
          update({ error: "Las notas no pueden superar 500 caracteres." }),
          false
        );
      if (!preview.canClose)
        return (
          update({
            error:
              "La jornada conserva bloqueos. Revísalos y vuelve a consultar la vista previa.",
          }),
          false
        );
      return performClose({
        kind: "day",
        id: day.id,
        body: cleanNotes ? { notes: cleanNotes } : {},
        key: `day-close-${Crypto.randomUUID()}`,
        previewPage: stateRef.current.dayPreviewPage,
        previewFingerprint: fingerprint(preview),
      });
    },
    [performClose, permissions, update],
  );

  const reconcile = useCallback(async () => {
    const candidate = stateRef.current.uncertain;
    if (!candidate || lock.current) return;
    lock.current = true;
    update({ busy: true, error: "", notice: "" });
    try {
      const closure =
        candidate.kind === "cash"
          ? await getCashClosure(candidate.id)
          : await getOperatingDayClosure(candidate.id);
      if (candidate.kind === "cash")
        update({
          cashClosure: closure,
          cashPreview: null,
          selectedCash: { ...stateRef.current.selectedCash, status: "closed" },
        });
      else
        update({
          dayClosure: closure,
          dayPreview: null,
          selectedDay: {
            ...stateRef.current.selectedDay,
            status: "closed",
            closureId: closure.id,
          },
        });
      operation.current = null;
      update({
        uncertain: null,
        notice:
          "El servidor ya tiene un cierre registrado; se muestra el resultado consultado.",
      });
      await loadOverview(false);
      await loadCashPage(1);
    } catch (error) {
      if (error.response?.status === 404)
        update({
          notice:
            "No se encontró un cierre confirmado. Puedes reintentar exactamente la misma operación.",
        });
      else update({ error: getOperationsAdminError(error) });
    } finally {
      lock.current = false;
      if (alive.current) update({ busy: false });
    }
  }, [loadCashPage, loadOverview, update]);

  const retryUncertain = useCallback(async () => {
    const candidate = stateRef.current.uncertain;
    if (!candidate || lock.current) return false;
    lock.current = true;
    let handedToClose = false;
    update({ busy: true, error: "" });
    try {
      const existingClosure =
        candidate.kind === "cash"
          ? await getCashClosure(candidate.id).catch((error) => {
              if (error.response?.status === 404) return null;
              throw error;
            })
          : await getOperatingDayClosure(candidate.id).catch((error) => {
              if (error.response?.status === 404) return null;
              throw error;
            });
      if (existingClosure) {
        if (candidate.kind === "cash")
          update({
            cashClosure: existingClosure,
            cashPreview: null,
            selectedCash: {
              ...stateRef.current.selectedCash,
              status: "closed",
            },
          });
        else
          update({
            dayClosure: existingClosure,
            dayPreview: null,
            selectedDay: {
              ...stateRef.current.selectedDay,
              status: "closed",
              closureId: existingClosure.id,
            },
          });
        operation.current = null;
        update({
          uncertain: null,
          notice:
            "El servidor ya tiene un cierre registrado; se muestra el resultado consultado.",
        });
        await loadOverview(false);
        await loadCashPage(1);
        return true;
      }
      const latest =
        candidate.kind === "cash"
          ? await getCashClosingPreview(candidate.id, {
              page: candidate.previewPage,
              limit: 20,
            })
          : await getOperatingDayClosingPreview(candidate.id, {
              page: candidate.previewPage,
              limit: 20,
            });
      if (fingerprint(latest) !== candidate.previewFingerprint) {
        update(
          candidate.kind === "cash"
            ? { cashPreview: latest }
            : { dayPreview: latest },
        );
        operation.current = null;
        update({
          uncertain: null,
          notice:
            "La vista previa cambió. No se reenvió el cierre; revisa el estado actual.",
        });
        return false;
      }
      lock.current = false;
      handedToClose = true;
      update({ busy: false });
      return performClose(candidate);
    } catch (error) {
      update({ error: getOperationsAdminError(error) });
      return false;
    } finally {
      if (!handedToClose) {
        lock.current = false;
        if (alive.current) update({ busy: false });
      }
    }
  }, [loadCashPage, loadOverview, performClose, update]);

  const setError = useCallback((error) => update({ error }), [update]);
  const clearSelection = useCallback(() => {
    if (stateRef.current.uncertain) return;
    request.current?.abort();
    update({
      selectedCash: null,
      cashPreview: null,
      cashClosure: null,
      selectedDay: null,
      dayPreview: null,
      dayClosure: null,
      error: "",
      notice: "",
    });
  }, [update]);

  return {
    ...state,
    canRead: permissions.includes("operations.read"),
    canOpen: permissions.includes("operations.open"),
    canManageSettings: permissions.includes("operations.manage"),
    canCloseCash: permissions.includes("operations.closeCash"),
    canCloseDay: permissions.includes("operations.closeDay"),
    refresh: () => loadOverview(false),
    loadCashPage,
    loadCash,
    loadDay,
    openDay,
    openCash,
    saveSettings,
    closeCash,
    closeDay,
    reconcile,
    retryUncertain,
    setError,
    clearSelection,
  };
}
