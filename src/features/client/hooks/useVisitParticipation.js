import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getMyParticipation,
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
};
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
    update({ loading: true, error: '', errorKind: '', errorStatus: null });
    try {
      let found = null;
      const known = stateRef.current.participant;
      if (known) {
        found = await getMyParticipation(known.id, controller.signal);
      } else {
        let page = 1;
        let result;
        do {
          result = await getMyParticipations(page, controller.signal);
          found =
            result.items.find((item) => item.visitId === scope.visitId) ?? null;
          page += 1;
        } while (!found && (page - 1) * result.limit < result.total);
      }
      if (context.current !== scope || controller.signal.aborted) return;
      if (found) {
        scope.operation = null;
        confirmed.current();
      }
      update({
        participant: found,
        checked: true,
        uncertain: found ? false : stateRef.current.uncertain,
      });
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
      ? { visitId, saving: false, controller: null, operation: null }
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
        key: `participation-${Date.now()}-${Math.random().toString(36).slice(2)}`,
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
  return { ...state, refresh, submit };
}
