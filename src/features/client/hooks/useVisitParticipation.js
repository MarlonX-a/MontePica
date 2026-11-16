import { useCallback, useEffect, useRef, useState } from 'react';
import * as Crypto from 'expo-crypto';
import {
  getMyParticipation,
  leaveMyParticipation,
  getMyParticipations,
  getParticipationError,
  requestVisitParticipation,
} from '@/features/client/api/participationApi';

const initial = {
  participant: null,
  loading: false,
  saving: false,
  checked: false,
  error: '',
  errorStatus: null,
  uncertain: false,
  errorKind: '',
  leaveUncertain: false,
  leaveConfirmation: null,
  notice: '',
};
const canLeave = (participant) =>
  ['pending', 'approved'].includes(participant?.status);

async function findVisitParticipation(visitId, page, pageCount, signal) {
  if (page > pageCount) return null;
  const result = await getMyParticipations(signal, page);
  const found = result.items.find((item) => item.visitId === visitId);
  return found || findVisitParticipation(visitId, page + 1, pageCount, signal);
}

function applyFoundParticipation(scope, found, stateRef, update, confirmed) {
  if (found) {
    scope.operation = null;
    confirmed.current();
  }
  const reconciledLeave = Boolean(
    found && !canLeave(found) && scope.leaveOperation,
  );
  if (reconciledLeave) scope.leaveOperation = null;
  update({
    leaveUncertain: reconciledLeave ? false : stateRef.current.leaveUncertain,
    notice: reconciledLeave
      ? 'La participación tiene un estado final. No se atribuye a una salida que no fue confirmada.'
      : '',
    participant: found,
    checked: true,
    uncertain: found ? false : stateRef.current.uncertain,
  });
}

export default function useVisitParticipation(visitId, onConfirmed) {
  const [state, setState] = useState(initial);
  const stateRef = useRef(initial);
  const context = useRef(null);
  const confirmed = useRef(onConfirmed);
  confirmed.current = onConfirmed;
  const update = useCallback((changes) => {
    stateRef.current = { ...stateRef.current, ...changes };
    setState(stateRef.current);
  }, []);

  const refresh = useCallback(async () => {
    const scope = context.current;
    if (!scope || scope.saving) return;
    scope.controller?.abort();
    const controller = new AbortController();
    scope.controller = controller;
    update({
      loading: true,
      error: '',
      errorKind: '',
      errorStatus: null,
      leaveConfirmation: null,
    });
    try {
      let found = null;
      const known = stateRef.current.participant;
      if (known) {
        found = await getMyParticipation(known.id, controller.signal);
      } else {
        const firstPage = await getMyParticipations(controller.signal, 1);
        found = firstPage.items.find((item) => item.visitId === scope.visitId) ?? null;
        if (!found) {
          const pageCount = Math.ceil(firstPage.total / firstPage.limit);
          found = await findVisitParticipation(
            scope.visitId,
            2,
            pageCount,
            controller.signal,
          );
        }
      }
      if (context.current !== scope || controller.signal.aborted) return;
      applyFoundParticipation(scope, found, stateRef, update, confirmed);
      return found;
    } catch (error) {
      if (context.current !== scope || controller.signal.aborted) return;
      update({
        error: getParticipationError(error),
        errorKind: 'query',
        errorStatus: error.response?.status ?? null,
      });
    } finally {
      if (context.current === scope && !controller.signal.aborted)
        update({ loading: false });
    }
  }, [update]);

  useEffect(() => {
    const scope = visitId
      ? {
          visitId,
          saving: false,
          controller: null,
          operation: null,
          leaveOperation: null,
        }
      : null;
    context.current = scope;
    update(initial);
    if (scope) void refresh();
    return () => {
      scope?.controller?.abort();
      if (context.current === scope) context.current = null;
    };
  }, [visitId, refresh, update]);

  const submit = useCallback(
    async (qrToken, alias) => {
      const scope = context.current;
      const current = stateRef.current;
      if (
        !scope ||
        scope.saving ||
        current.loading ||
        !current.checked ||
        current.participant
      )
        return;
      const normalized = alias.trim();
      if (!scope.operation && (!normalized || normalized.length > 80)) {
        update({
          error: 'Escribe un nombre de entre 1 y 80 caracteres.',
          errorStatus: null,
        });
        return;
      }
      if ([401, 403, 404, 409].includes(current.errorStatus)) return;
      scope.operation ??= {
        key: `participation-${Crypto.randomUUID()}`,
        alias: normalized,
      };
      scope.saving = true;
      update({ saving: true, error: '', errorKind: '', errorStatus: null });
      try {
        const participant = await requestVisitParticipation(
          scope.visitId,
          { qrToken, alias: scope.operation.alias },
          scope.operation.key,
        );
        if (context.current !== scope) return;
        scope.operation = null;
        confirmed.current();
        update({ participant, uncertain: false });
      } catch (error) {
        if (context.current !== scope) return;
        const status = error.response?.status ?? null;
        const uncertain = !status || status >= 500;
        if (!uncertain) scope.operation = null;
        update({
          error: getParticipationError(error),
          errorKind: 'submit',
          errorStatus: status,
          uncertain,
        });
      } finally {
        scope.saving = false;
        if (context.current === scope) update({ saving: false });
      }
    },
    [update],
  );
  const prepareLeave = useCallback(async () => {
    const scope = context.current;
    const before = stateRef.current;
    if (
      !scope ||
      scope.saving ||
      before.loading ||
      before.error ||
      before.leaveUncertain ||
      !canLeave(before.participant)
    )
      return;
    const previousStatus = before.participant.status;
    const found = await refresh();
    if (context.current !== scope || !canLeave(found)) return;
    if (found.status !== previousStatus) {
      update({
        notice:
          'El estado cambió. Revisa la acción disponible y vuelve a confirmarla.',
      });
      return;
    }
    update({
      leaveConfirmation: { id: found.id, status: found.status },
      notice: '',
    });
  }, [refresh, update]);

  const leave = useCallback(async () => {
    const scope = context.current;
    const current = stateRef.current;
    if (
      !scope ||
      scope.saving ||
      current.loading ||
      !canLeave(current.participant)
    )
      return;
    if (!scope.leaveOperation && (!current.leaveConfirmation || current.error))
      return;
    scope.leaveOperation ??= {
      id: current.leaveConfirmation.id,
      key: `participation-leave-${Crypto.randomUUID()}`,
    };
    scope.saving = true;
    update({
      saving: true,
      leaveConfirmation: null,
      error: '',
      errorStatus: null,
      errorKind: '',
      notice: '',
    });
    try {
      const participant = await leaveMyParticipation(
        scope.leaveOperation.id,
        scope.leaveOperation.key,
      );
      if (context.current !== scope) return;
      scope.leaveOperation = null;
      update({
        participant,
        leaveUncertain: false,
        notice: 'El servidor confirmó el estado mostrado.',
      });
    } catch (error) {
      if (context.current !== scope) return;
      const status = error.response?.status ?? null;
      const uncertain = !status || status >= 500;
      if (!uncertain) scope.leaveOperation = null;
      update({
        error: getParticipationError(error),
        errorStatus: status,
        errorKind: 'leave',
        leaveUncertain: uncertain,
      });
    } finally {
      scope.saving = false;
      if (context.current === scope) update({ saving: false });
    }
  }, [update]);
  return {
    ...state,
    refresh,
    submit,
    prepareLeave,
    leave,
    cancelLeave: () => update({ leaveConfirmation: null }),
  };
}
