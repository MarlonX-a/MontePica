import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { TableCard } from '@/features/admin/components/AdminCards';
import {
  Button,
  Chips,
  Empty,
  Search,
  Stats,
} from '@/features/admin/components/AdminUI';
import {
  filterAdminTables,
  TABLES_PAGE_SIZE,
} from '@/features/admin/data/adminTableMapper';

const filters = ['Todas', 'Activas', 'Inactivas', 'Con visita', 'Sin visita'];

function PageButton({ label, disabled, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className="min-h-11 justify-center rounded-xl bg-[#f2e8d6] px-3"
      style={{ opacity: disabled ? 0.4 : 1 }}
    >
      <Text className="text-xs font-semibold text-[#b7472a]">{label}</Text>
    </Pressable>
  );
}

function TableResults({ tables, search, filter, page, setPage }) {
  const shown = filterAdminTables(tables, search, filter);
  const pages = Math.max(1, Math.ceil(shown.length / TABLES_PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const start = (currentPage - 1) * TABLES_PAGE_SIZE;
  const visible = shown.slice(start, start + TABLES_PAGE_SIZE);
  const rows = Array.from(
    { length: Math.ceil(visible.length / 2) },
    (_, index) => visible.slice(index * 2, index * 2 + 2),
  );
  if (tables.length === 0)
    return <Empty>Aún no hay mesas registradas en el backend.</Empty>;
  if (shown.length === 0)
    return <Empty>No hay mesas que coincidan con estos filtros.</Empty>;
  return (
    <>
      <Text className="mb-3 text-xs text-[#8b8178]">
        {start + 1}–{start + visible.length} de {shown.length} mesas
      </Text>
      {rows.map((row) => (
        <View key={row[0].id} className="mb-3 flex-row items-stretch gap-3">
          {row.map((table) => (
            <TableCard key={table.id} table={table} />
          ))}
          {row.length === 1 && <View className="flex-1" />}
        </View>
      ))}
      <View className="mt-2 flex-row items-center justify-between gap-2">
        <PageButton
          label="Anterior"
          disabled={currentPage === 1}
          onPress={() => setPage(currentPage - 1)}
        />
        <Text className="text-xs text-[#8b8178]">
          {currentPage} / {pages}
        </Text>
        <PageButton
          label="Siguiente"
          disabled={currentPage === pages}
          onPress={() => setPage(currentPage + 1)}
        />
      </View>
    </>
  );
}

export default function TablesList({ model }) {
  if (model.loading) {
    return (
      <View className="items-center rounded-2xl bg-white p-8">
        <ActivityIndicator color="#b7472a" />
        <Text className="mt-3 text-xs text-[#8b8178]">Consultando mesas…</Text>
      </View>
    );
  }
  if (model.error) {
    return (
      <View className="rounded-2xl bg-white p-4">
        <Text accessibilityRole="alert" className="mb-3 text-xs text-[#b7472a]">
          {model.error}
        </Text>
        <Button
          onPress={() => {
            void model.reload();
          }}
        >
          Reintentar
        </Button>
      </View>
    );
  }
  const active = model.tables.filter((table) => table.active).length;
  const visits = model.tables.filter((table) => table.openVisitId).length;
  return (
    <>
      <Stats
        items={[
          {
            label: 'Activas',
            value: active,
            tone: 'green',
            icon: 'table',
            note: `${model.tables.length} mesas registradas`,
          },
          {
            label: 'Con visita',
            value: visits,
            tone: 'peach',
            icon: 'table',
            note: 'Visitas abiertas',
          },
        ]}
      />
      <Search
        value={model.search}
        onChange={model.changeSearch}
        placeholder="Buscar por código de mesa"
      />
      <Chips
        items={filters}
        value={model.filter}
        onChange={model.changeFilter}
      />
      <TableResults
        tables={model.tables}
        search={model.search}
        filter={model.filter}
        page={model.page}
        setPage={model.setPage}
      />
    </>
  );
}
