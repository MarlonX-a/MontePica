import { useState } from 'react';
import { Text, View } from 'react-native';
import AdminShell from '@/features/admin/components/AdminShell';
import { useAdmin } from '@/features/admin/components/AdminProvider';
import { UserCard } from '@/features/admin/components/AdminCards';
import {
  Chips,
  Editor,
  Empty,
  Search,
  Stats,
  ToggleFilter,
} from '@/features/admin/components/AdminUI';
import AdminIcon from '@/features/admin/components/AdminIcon';
import { roles } from '@/features/admin/data/adminData';

const roleTones = {
  Administrador: 'purple',
  Trabajador: 'peach',
  Cliente: 'blue',
};
const permissions = [
  { role: 'Administrador', description: 'Todo el sistema', color: '#7c5994' },
  { role: 'Trabajador', description: 'Productos y mesas', color: '#a35a45' },
  { role: 'Cliente', description: 'Menú y sus pedidos', color: '#456d8a' },
];
const userFields = [
  { key: 'name', label: 'Nombre completo', required: true },
  { key: 'email', label: 'Correo electrónico', required: true },
  { key: 'role', label: 'Rol', options: roles },
  { key: 'status', label: 'Estado', options: ['Activo', 'Suspendido'] },
];

export default function UsersScreen() {
  const { users, setUsers } = useAdmin();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Todos');
  const [editor, setEditor] = useState(null);
  const [activeOnly, setActiveOnly] = useState(false);
  const shown = users.filter(
    (user) =>
      `${user.name} ${user.email}`
        .toLocaleLowerCase()
        .includes(search.trim().toLocaleLowerCase()) &&
      (filter === 'Todos' || user.role === filter) &&
      (!activeOnly || user.active),
  );

  function save(values) {
    if (
      users.some(
        (user) =>
          user.id !== editor.item?.id &&
          user.email.toLocaleLowerCase() === values.email.toLocaleLowerCase(),
      )
    )
      return 'Ya existe un usuario con ese correo.';
    const item = {
      ...values,
      email: values.email.toLocaleLowerCase(),
      active: values.status === 'Activo',
    };
    setUsers((current) =>
      editor.item
        ? current.map((user) =>
            user.id === editor.item.id ? { ...user, ...item } : user,
          )
        : [...current, { ...item, id: `user-${Date.now()}` }],
    );
    setEditor(null);
  }

  return (
    <AdminShell
      title="Usuarios y permisos"
      subtitle={`${users.length} usuarios · ${roles.length} roles`}
      addLabel="Agregar usuario"
      onAdd={() => setEditor({})}
    >
      <Stats
        items={roles.map((role) => ({
          label: role === 'Administrador' ? 'Admin' : role,
          value: users.filter((user) => user.role === role).length,
          tone: roleTones[role],
        }))}
      />
      <Search
        value={search}
        onChange={setSearch}
        placeholder="Nombre o correo"
      />
      <Chips
        items={[
          { value: 'Todos', label: `Todos ${users.length}` },
          ...roles.map((role) => ({
            value: role,
            label: `${role === 'Administrador' ? 'Admin' : role} ${users.filter((user) => user.role === role).length}`,
          })),
        ]}
        value={filter}
        onChange={setFilter}
      />
      <ToggleFilter
        checked={activeOnly}
        label="Solo usuarios activos"
        onPress={() => setActiveOnly((current) => !current)}
      />
      {shown.map((user) => (
        <UserCard
          key={user.id}
          user={user}
          onPress={() => setEditor({ item: user })}
        />
      ))}
      {!shown.length && <Empty>Prueba con otro nombre, correo o rol.</Empty>}
      <View className="mt-3 rounded-2xl bg-[#f2e8d6] p-3">
        <Text className="mb-3 text-xs font-bold text-[#332d28]">
          Permisos por rol
        </Text>
        <View className="flex-row gap-2">
          {permissions.map((item) => (
            <View
              key={item.role}
              className="flex-1 rounded-xl bg-white px-2 py-3"
            >
              <AdminIcon name="users" size={18} color={item.color} />
              <Text className="mt-2 text-[9px] font-semibold text-[#332d28]">
                {item.role}
              </Text>
              <Text className="mt-1 text-[9px] leading-3 text-[#8b8178]">
                {item.description}
              </Text>
            </View>
          ))}
        </View>
        <Text className="mt-3 text-[9px] leading-4 text-[#8b8178]">
          Roles de referencia para la demo. Los permisos se conectarán con la
          autenticación.
        </Text>
      </View>
      {editor && (
        <Editor
          key={editor.item?.id || 'new'}
          title={editor.item ? 'Editar usuario' : 'Nuevo usuario'}
          initial={{
            name: '',
            email: '',
            role: 'Trabajador',
            ...editor.item,
            status: editor.item?.active === false ? 'Suspendido' : 'Activo',
          }}
          fields={userFields}
          onSave={save}
          onClose={() => setEditor(null)}
        />
      )}
    </AdminShell>
  );
}
