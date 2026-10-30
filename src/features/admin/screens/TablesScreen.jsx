import { Text } from 'react-native';
import AdminShell from '@/features/admin/components/AdminShell';
import { Button, Editor } from '@/features/admin/components/AdminUI';
import TablesList from '@/features/admin/components/TablesList';
import useAdminTables from '@/features/admin/hooks/useAdminTables';
import { getCurrentUser } from '@/shared/session/sessionStore';

const tableFields = [{ key: 'code', label: 'Código de mesa', required: true }];

export default function TablesScreen() {
  const permissions = getCurrentUser()?.permissions || [];
  const canRead = permissions.includes('tables.read');
  const canManage = permissions.includes('tables.manage');
  const model = useAdminTables(canRead, canManage);
  const table = model.editing?.table;
  const status = table?.active ? 'Activa' : 'Inactiva';
  const initial = table ? { code: table.code, status } : { code: '' };
  const fields = model.editing && !table ? [] : [...tableFields];
  if (table) fields.push({ key: 'status', label: 'Estado', options: ['Activa', 'Inactiva'] });

  return (
    <AdminShell
      title="Mesas"
      subtitle="Listado y creación de mesas"
      addLabel="Agregar mesa"
      showAdd={canRead && canManage && !model.loading && !model.error}
      onAdd={model.openEditor}
    >
      {model.notice ? (
        <Text
          accessibilityRole="alert"
          className="mb-3 rounded-xl bg-[#deecdf] p-3 text-xs leading-5 text-[#477052]"
        >
          {model.notice}
        </Text>
      ) : null}
      <TablesList model={model} />
      {model.editorOpen && (
        <Editor
          key={model.editing?.table?.id || (model.editing ? 'loading' : 'new')}
          title={model.editing ? 'Editar mesa' : 'Nueva mesa'}
          initial={initial}
          fields={fields}
          onSave={
            model.editing && !model.editing.table ? undefined : model.saveTable
          }
          onClose={model.closeEditor}
          saveHint="Se guardarán los cambios en el backend."
        >
          {model.detailLoading && <Text>Cargando mesa…</Text>}
          {model.detailError ? (
            <>
              <Text accessibilityRole="alert">{model.detailError}</Text>
              <Button onPress={model.retryDetail}>Reintentar</Button>
            </>
          ) : null}
          {model.editing?.table?.openVisitId ? (
            <Text>No se puede desactivar una mesa con visita abierta.</Text>
          ) : null}
        </Editor>
      )}
    </AdminShell>
  );
}
