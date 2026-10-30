import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createAdminTable,
  getAllAdminTables,
  getAdminTable,
  updateAdminTable,
  getTablesApiError,
} from '@/features/admin/api/tablesAdminApi';
import {
  getTablePage,
  mapAdminTable,
  validateTableCode,
} from '@/features/admin/data/adminTableMapper';

export default function useAdminTables(canRead, canManage) {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Todas');
  const [page, setPage] = useState(1);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const detailRequest = useRef(null);
  const mounted = useRef(false);
  const request = useRef(null);
  const creating = useRef(false);
  const focusTable = useRef(null);

  const reload = useCallback(
    async (focusId = focusTable.current) => {
      request.current?.abort();
      const controller = new AbortController();
      request.current = controller;
      if (!canRead) {
        setError('Tu cuenta no tiene permiso para consultar mesas.');
        setLoading(false);
        return false;
      }
      setLoading(true);
      setError('');
      try {
        const data = await getAllAdminTables(controller.signal);
        if (!mounted.current || controller.signal.aborted) return;
        const mapped = data.map(mapAdminTable);
        setTables(mapped);
        setPage(getTablePage(mapped, focusId));
        focusTable.current = null;
        return true;
      } catch (requestError) {
        if (!mounted.current || controller.signal.aborted) return;
        setError(getTablesApiError(requestError));
        return false;
      } finally {
        if (mounted.current && !controller.signal.aborted) setLoading(false);
      }
    },
    [canRead],
  );

  useEffect(() => {
    mounted.current = true;
    void reload();
    return () => {
      mounted.current = false;
      request.current?.abort();
      detailRequest.current?.abort();
    };
  }, [reload]);

  async function saveTable(values) {
    if (creating.current) return undefined;
    if (!canManage) return 'Tu cuenta no tiene permiso para crear mesas.';
    const validation = validateTableCode(values.code);
    if (validation) return validation;
    let changes;
    if (editing?.table) {
      changes = {};
      const active = values.status === 'Activa';
      if (values.code.trim() !== editing.table.code)
        changes.code = values.code.trim();
      if (active !== editing.table.active) changes.active = active;
      if (!active && editing.table.openVisitId)
        return 'No se puede desactivar una mesa con visita abierta.';
      if (!Object.keys(changes).length) {
        setEditorOpen(false);
        setNotice('No hubo modificaciones.');
        return undefined;
      }
    }
    creating.current = true;
    try {
      const created = editing?.table
        ? await updateAdminTable(editing.table.id, changes)
        : await createAdminTable(values.code.trim());
      if (!mounted.current) return undefined;
      setEditorOpen(false);
      setSearch('');
      setFilter('Todas');
      setPage(1);
      const action = editing?.table ? 'actualizó' : 'creó';
      setNotice(`La mesa ${created.code} se ${action} correctamente.`);
      focusTable.current = created.id;
      const refreshed = await reload(created.id);
      if (refreshed === false && mounted.current) {
        setNotice(
          `La mesa ${created.code} ya se ${action}. Reintenta la consulta; no es necesario repetir la operación.`,
        );
      }
    } catch (requestError) {
      if (mounted.current) return getTablesApiError(requestError);
    } finally {
      creating.current = false;
    }
    return undefined;
  }

  function changeSearch(value) {
    setSearch(value);
    setPage(1);
  }

  function changeFilter(value) {
    setFilter(value);
    setPage(1);
  }

  async function loadDetail(id) {
    detailRequest.current?.abort();
    const controller = new AbortController();
    detailRequest.current = controller;
    setEditing({ id });
    setDetailLoading(true);
    setDetailError('');
    try {
      const table = await getAdminTable(id, controller.signal);
      if (mounted.current && !controller.signal.aborted)
        setEditing({ id, table });
    } catch (error) {
      if (mounted.current && !controller.signal.aborted)
        setDetailError(getTablesApiError(error));
    } finally {
      if (mounted.current && !controller.signal.aborted)
        setDetailLoading(false);
    }
  }

  function openEdit(table) {
    if (!canManage || !canRead) return;
    setEditorOpen(true);
    void loadDetail(table.id);
  }

  function closeEditor() {
    if (!creating.current) {
      detailRequest.current?.abort();
      setEditorOpen(false);
      setEditing(null);
    }
  }

  return {
    tables,
    loading,
    error,
    notice,
    search,
    filter,
    page,
    editorOpen,
    canManage,
    editing,
    detailLoading,
    detailError,
    openEdit,
    retryDetail: () => {
      if (editing?.id) void loadDetail(editing.id);
    },
    reload,
    saveTable,
    changeSearch,
    changeFilter,
    setPage,
    closeEditor,
    openEditor: () => {
      setEditing(null);
      setEditorOpen(true);
    },
  };
}
