import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import AdminShell from '@/features/admin/components/AdminShell';
import { UserCard } from '@/features/admin/components/AdminCards';
import {
  Button,
  Chips,
  Editor,
  Empty,
  Search,
  Stats,
  ToggleFilter,
} from '@/features/admin/components/AdminUI';
import AdminIcon from '@/features/admin/components/AdminIcon';
import {
  createAdminUser,
  getAdminRoles,
  getAdminUsers,
  getUsersApiError,
  updateAdminUser,
} from '@/features/admin/api/usersAdminApi';

const roleTones = {
  Administrador: 'purple',
  Trabajador: 'peach',
  Cliente: 'blue',
};
export default function UsersScreen() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Todos');
  const [editor, setEditor] = useState(null);
  const [activeOnly, setActiveOnly] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [usersResponse, roleResponse] = await Promise.all([
        getAdminUsers(),
        getAdminRoles(),
      ]);
      const roleNames = new Map(
        roleResponse.map((role) => [role.code, role.name]),
      );
      const mappedUsers = usersResponse.items.map((user) => ({
        ...user,
        givenNames: user.name,
        name: [user.name, user.lastName].filter(Boolean).join(' '),
        role: user.roleName || roleNames.get(user.roleCode) || user.roleCode,
      }));

      setUsers(mappedUsers);
      setRoles(roleResponse);
      setTotalUsers(usersResponse.total);
    } catch (requestError) {
      setError(getUsersApiError(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const roleOptions = roles.map((role) => role.name);
  const userFields = [
    { key: 'name', label: 'Nombres', required: true },
    { key: 'email', label: 'Correo electrónico', required: true },
    { key: 'role', label: 'Rol', options: roleOptions },
    ...(editor?.item
      ? [{ key: 'status', label: 'Estado', options: ['Activo', 'Suspendido'] }]
      : []),
    ...(editor && !editor.item
      ? [
          {
            key: 'initialPassword',
            label: 'Contraseña inicial',
            required: true,
            secureTextEntry: true,
          },
        ]
      : []),
  ];
  const shown = users.filter(
    (user) =>
      `${user.name} ${user.email}`
        .toLocaleLowerCase()
        .includes(search.trim().toLocaleLowerCase()) &&
      (filter === 'Todos' || user.role === filter) &&
      (!activeOnly || user.active),
  );
  const editorInitial = {
    ...editor?.item,
    email: editor?.item?.email || '',
    initialPassword: '',
    role:
      editor?.item?.role ||
      roles.find((role) => role.code === 'worker')?.name ||
      roleOptions[0] ||
      '',
    name: editor?.item?.givenNames || '',
    status: editor?.item?.active === false ? 'Suspendido' : 'Activo',
  };

  async function save(values) {
    const selectedRole = roles.find((role) => role.name === values.role);
    if (!selectedRole) return 'Selecciona un rol válido.';

    if (!editor.item) {
      if (
        values.initialPassword.length < 8 ||
        values.initialPassword.length > 128 ||
        !/[A-ZÁÉÍÓÚÜÑ]/.test(values.initialPassword) ||
        !/\d/.test(values.initialPassword)
      ) {
        return 'La contraseña debe tener entre 8 y 128 caracteres, una mayúscula y un número.';
      }

      try {
        await createAdminUser({
          name: values.name,
          email: values.email.toLowerCase(),
          roleCode: selectedRole.code,
          initialPassword: values.initialPassword,
        });
      } catch (requestError) {
        return getUsersApiError(requestError);
      }
    } else {
      try {
        await updateAdminUser(editor.item.id, {
          name: values.name,
          email: values.email.toLowerCase(),
          roleCode: selectedRole.code,
          active: values.status === 'Activo',
        });
      } catch (requestError) {
        return getUsersApiError(requestError);
      }
    }

    await loadUsers();
    setEditor(null);
  }

  let userContent;
  if (loading) {
    userContent = (
      <View className="items-center rounded-2xl bg-white px-5 py-10">
        <Text className="text-sm font-semibold text-[#514941]">
          Cargando usuarios…
        </Text>
      </View>
    );
  } else if (error) {
    userContent = (
      <View className="rounded-2xl bg-white p-4">
        <Text
          accessibilityRole="alert"
          className="mb-3 text-xs text-[#b7472a]"
        >
          {error}
        </Text>
        <Button onPress={loadUsers}>Reintentar</Button>
      </View>
    );
  } else {
    userContent = (
      <>
        <Stats
          items={roles.map((role) => ({
            label: role.code === 'admin' ? 'Admin' : role.name,
            value: users.filter((user) => user.roleCode === role.code).length,
            tone: roleTones[role.name] || 'sand',
          }))}
        />
        <Search
          value={search}
          onChange={setSearch}
          placeholder="Nombre o correo"
        />
        <Chips
          items={[
            { value: 'Todos', label: `Todos ${totalUsers}` },
            ...roles.map((role) => ({
              value: role.name,
              label: `${role.code === 'admin' ? 'Admin' : role.name} ${users.filter((user) => user.roleCode === role.code).length}`,
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
      </>
    );
  }

  return (
    <AdminShell
      title="Usuarios y permisos"
      subtitle={`${totalUsers} usuarios · ${roles.length} roles`}
      addLabel="Agregar usuario"
      onAdd={() => {
        if (!loading && !error && roleOptions.length) setEditor({});
      }}
    >
      {userContent}
      {!loading && !error && roles.length > 0 ? (
        <View className="mt-3 rounded-2xl bg-[#f2e8d6] p-3">
          <Text className="mb-3 text-xs font-bold text-[#332d28]">
            Permisos por rol
          </Text>
          <View className="flex-row gap-2">
            {roles.map((role) => (
              <View
                key={role.code}
                className="flex-1 rounded-xl bg-white px-2 py-3"
              >
                <AdminIcon
                  name="users"
                  size={18}
                  color={roleTones[role.name] ? '#7c5994' : '#8b8178'}
                />
                <Text className="mt-2 text-[9px] font-semibold text-[#332d28]">
                  {role.name}
                </Text>
                <Text className="mt-1 text-[9px] leading-3 text-[#8b8178]">
                  {role.permissions.length} permisos asignados
                </Text>
              </View>
            ))}
          </View>
          <Text className="mt-3 text-[9px] leading-4 text-[#8b8178]">
            Roles y permisos cargados desde el backend.
          </Text>
        </View>
      ) : null}
      {editor && (
        <Editor
          key={editor.item?.id || 'new'}
          title={editor.item ? 'Editar usuario' : 'Nuevo usuario'}
          initial={editorInitial}
          fields={userFields}
          onSave={save}
          onClose={() => setEditor(null)}
          saveHint={
            editor.item
              ? 'Los cambios se guardarán en el backend.'
              : 'La cuenta se creará en el backend con la contraseña inicial indicada.'
          }
        />
      )}
    </AdminShell>
  );
}
