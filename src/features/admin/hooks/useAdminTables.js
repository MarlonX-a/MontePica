import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createAdminTable,
  getAllAdminTables,
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
    };
  }, [reload]);

  async function saveTable(values) {
    if (creating.current) return undefined;
    if (!canManage) return 'Tu cuenta no tiene permiso para crear mesas.';
    const validation = validateTableCode(values.code);
    if (validation) return validation;
    creating.current = true;
    try {
      const created = await createAdminTable(values.code.trim());
      if (!mounted.current) return undefined;
      setEditorOpen(false);
      setSearch('');
      setFilter('Todas');
      setPage(1);
      setNotice(`La mesa ${created.code} se creó correctamente.`);
      focusTable.current = created.id;
      const refreshed = await reload(created.id);
      if (refreshed === false && mounted.current) {
        setNotice(
          `La mesa ${created.code} ya se creó. Reintenta la consulta; no es necesario volver a crearla.`,
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

  function closeEditor() {
    if (!creating.current) setEditorOpen(false);
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
    reload,
    saveTable,
    changeSearch,
    changeFilter,
    setPage,
    closeEditor,
    openEditor: () => setEditorOpen(true),
  };
}
