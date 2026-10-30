import { Text } from 'react-native';
import AdminShell from '@/features/admin/components/AdminShell';
import { Editor } from '@/features/admin/components/AdminUI';
import TablesList from '@/features/admin/components/TablesList';
import useAdminTables from '@/features/admin/hooks/useAdminTables';
import { getCurrentUser } from '@/shared/session/sessionStore';

const tableFields = [{ key: 'code', label: 'Código de mesa', required: true }];

export default function TablesScreen() {
  const permissions = getCurrentUser()?.permissions || [];
  const canRead = permissions.includes('tables.read');
  const canManage = permissions.includes('tables.manage');
  const model = useAdminTables(canRead, canManage);

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
          title="Nueva mesa"
          initial={{ code: '' }}
          fields={tableFields}
          onSave={model.saveTable}
          onClose={model.closeEditor}
          saveHint="Se guardará el código en el backend. Entre 1 y 40 caracteres."
        />
      )}
    </AdminShell>
  );
}
