import { useState } from 'react';
import { Text, View } from 'react-native';
import AdminShell from '@/features/admin/components/AdminShell';
import { useAdmin } from '@/features/admin/components/AdminProvider';
import { TableCard } from '@/features/admin/components/AdminCards';
import {
  Badge,
  Button,
  Chips,
  Editor,
  Empty,
  Search,
  Stats,
} from '@/features/admin/components/AdminUI';
import AdminIcon from '@/features/admin/components/AdminIcon';

const tableFields = [
  { key: 'name', label: 'Nombre de la mesa', required: true },
  {
    key: 'capacity',
    label: 'Capacidad',
    numeric: true,
    integer: true,
    min: 1,
    required: true,
  },
  { key: 'zone', label: 'Zona', required: true },
  { key: 'status', label: 'Estado', options: ['Libre', 'Ocupada'] },
];

export default function TablesScreen() {
  const { tables, setTables } = useAdmin();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Todas');
  const [editor, setEditor] = useState(null);
  const [qr, setQr] = useState(null);
  const occupied = tables.filter((table) => table.status === 'Ocupada').length;
  const pending = tables.filter((table) => !table.qr).length;
  const free = tables.length - occupied;
  const shown = tables.filter((table) => {
    const matchesSearch = table.name
      .toLocaleLowerCase()
      .includes(search.trim().toLocaleLowerCase());
    const matchesFilter =
      filter === 'Todas' ||
      (filter === 'Libres' && table.status === 'Libre') ||
      (filter === 'Ocupadas' && table.status === 'Ocupada') ||
      (filter === 'QR pendiente' && !table.qr);
    return matchesSearch && matchesFilter;
  });
  const rows = Array.from({ length: Math.ceil(shown.length / 2) }, (_, index) =>
    shown.slice(index * 2, index * 2 + 2),
  );

  function save(values) {
    if (
      tables.some(
        (table) =>
          table.id !== editor.item?.id &&
          table.name.toLocaleLowerCase() === values.name.toLocaleLowerCase(),
      )
    )
      return 'Ya existe una mesa con ese nombre.';
    const item = { ...values, capacity: Number(values.capacity) };
    setTables((current) =>
      editor.item
        ? current.map((table) =>
            table.id === editor.item.id ? { ...table, ...item } : table,
          )
        : [...current, { ...item, id: `table-${Date.now()}`, qr: false }],
    );
    setEditor(null);
  }

  return (
    <AdminShell
      title="Mesas y QR"
      subtitle={`${tables.length} mesas · ${occupied} ocupadas`}
      addLabel="Agregar mesa"
      onAdd={() => setEditor({})}
    >
      <Stats
        items={[
          {
            label: 'Disponibles',
            value: free,
            tone: 'green',
            icon: 'table',
            note: `${tables.length ? Math.round((free / tables.length) * 100) : 0}% del salón`,
          },
          {
            label: 'Ocupadas',
            value: occupied,
            tone: 'peach',
            note: 'Servicio en salón',
          },
        ]}
      />
      <Search value={search} onChange={setSearch} placeholder="Buscar mesa" />
      <Chips
        items={[
          { value: 'Todas', label: `Todas ${tables.length}` },
          { value: 'Libres', label: `Libres ${free}` },
          { value: 'Ocupadas', label: `Ocupadas ${occupied}` },
          { value: 'QR pendiente', label: `QR pendiente ${pending}` },
        ]}
        value={filter}
        onChange={setFilter}
      />
      {rows.map((row, index) => (
        <View key={index} className="mb-3 flex-row items-stretch gap-3">
          {row.map((table) => (
            <TableCard
              key={table.id}
              table={table}
              onEdit={() => setEditor({ item: table })}
              onQR={() => setQr(table)}
            />
          ))}
          {row.length === 1 ? <View className="flex-1" /> : null}
        </View>
      ))}
      {!shown.length && (
        <Empty>No hay mesas que coincidan con estos filtros.</Empty>
      )}
      <View className="mt-1 flex-row items-center gap-2 rounded-xl bg-[#f2e8d6] px-3 py-3">
        <AdminIcon name="qr" size={18} color="#a35a45" />
        <Text className="flex-1 text-[10px] leading-4 text-[#8b8178]">
          Toca una mesa para editarla o consulta su preparación QR.
        </Text>
      </View>
      {editor && (
        <Editor
          key={editor.item?.id || 'new'}
          title={editor.item ? 'Editar mesa' : 'Nueva mesa'}
          initial={{
            name: '',
            capacity: '4',
            zone: 'Salón',
            status: 'Libre',
            ...editor.item,
          }}
          fields={tableFields}
          onSave={save}
          onClose={() => setEditor(null)}
        />
      )}
      {qr && (
        <Editor title={qr.name} fields={[]} onClose={() => setQr(null)}>
          <View className="mb-4 items-center rounded-2xl bg-white p-6">
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-[#f2e8d6]">
              <AdminIcon name="qr" size={38} color="#b7472a" />
            </View>
            <Text className="mb-2 text-base font-semibold text-[#332d28]">
              Preparación del código QR
            </Text>
            <Badge tone={qr.qr ? 'green' : 'yellow'}>
              {qr.qr ? 'Preparado · demo' : 'Pendiente'}
            </Badge>
            <Text className="mt-4 text-center text-xs leading-5 text-[#8b8178]">
              La generación e impresión del QR estarán disponibles cuando se
              conecte el menú público.
            </Text>
          </View>
          {!qr.qr && (
            <Button
              onPress={() => {
                setTables((current) =>
                  current.map((table) =>
                    table.id === qr.id ? { ...table, qr: true } : table,
                  ),
                );
                setQr((current) => ({ ...current, qr: true }));
              }}
            >
              Marcar preparado en demo
            </Button>
          )}
        </Editor>
      )}
    </AdminShell>
  );
}
