export const TABLES_PAGE_SIZE = 20;

export function mapAdminTable(table) {
  return {
    id: table.id,
    code: table.code,
    active: table.active,
    openVisitId: table.openVisitId ?? null,
    statusLabel: table.active ? 'Activa' : 'Inactiva',
    visitLabel: table.openVisitId ? 'Con visita' : 'Sin visita',
  };
}

export function validateTableCode(value) {
  const code = value.trim();
  if (!code || code.length > 40) {
    return 'El código de mesa debe tener entre 1 y 40 caracteres.';
  }
  return '';
}

function matchesTableFilter(table, filter) {
  switch (filter) {
    case 'Activas':
      return table.active;
    case 'Inactivas':
      return !table.active;
    case 'Con visita':
      return Boolean(table.openVisitId);
    case 'Sin visita':
      return !table.openVisitId;
    default:
      return true;
  }
}

export function filterAdminTables(tables, search, filter) {
  const query = search.trim().toLocaleLowerCase();
  return tables.filter(
    (table) =>
      table.code.toLocaleLowerCase().includes(query) &&
      matchesTableFilter(table, filter),
  );
}

export function getTablePage(tables, tableId) {
  const index = tables.findIndex((table) => table.id === tableId);
  return Math.floor(Math.max(0, index) / TABLES_PAGE_SIZE) + 1;
}
