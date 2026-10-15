import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import AdminShell from '@/features/admin/components/AdminShell';
import { useAdmin } from '@/features/admin/components/AdminProvider';
import { ProductCard } from '@/features/admin/components/AdminCards';
import {
  Button,
  Chips,
  Editor,
  Empty,
  Search,
  ToggleFilter,
} from '@/features/admin/components/AdminUI';

export default function ProductsScreen() {
  const { products, setProducts, categories, setCategories } = useAdmin();
  const [tab, setTab] = useState('Productos');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todos');
  const [stockOnly, setStockOnly] = useState(false);
  const [editor, setEditor] = useState(null);
  const shown = products.filter(
    (product) =>
      product.name
        .toLocaleLowerCase()
        .includes(search.trim().toLocaleLowerCase()) &&
      (category === 'Todos' || product.category === category) &&
      (!stockOnly || product.stock <= 3),
  );
  const filters = [
    { value: 'Todos', label: `Todos ${products.length}` },
    ...categories.map((name) => ({
      value: name,
      label: `${name} ${products.filter((product) => product.category === name).length}`,
    })),
  ];

  function save(values) {
    if (editor.type === 'category') {
      const name = values.name;
      if (
        name.toLocaleLowerCase() === 'todos' ||
        categories.some(
          (item) =>
            item !== editor.original &&
            item.toLocaleLowerCase() === name.toLocaleLowerCase(),
        )
      )
        return 'Usa un nombre de categoría diferente.';
      setCategories((current) =>
        editor.original
          ? current.map((item) => (item === editor.original ? name : item))
          : [...current, name],
      );
      if (editor.original) {
        setProducts((current) =>
          current.map((product) =>
            product.category === editor.original
              ? { ...product, category: name }
              : product,
          ),
        );
        if (category === editor.original) setCategory(name);
      }
    } else {
      const product = {
        ...values,
        price: Number(values.price),
        stock: Number(values.stock),
        visible: values.visibility === 'Visible',
      };
      setProducts((current) =>
        editor.item
          ? current.map((item) =>
              item.id === editor.item.id ? { ...item, ...product } : item,
            )
          : [
              ...current,
              { ...product, id: `product-${Date.now()}`, icon: '🍽️' },
            ],
      );
    }
    setEditor(null);
  }

  const fields =
    editor?.type === 'category'
      ? [{ key: 'name', label: 'Nombre de la categoría', required: true }]
      : [
          { key: 'name', label: 'Nombre del producto', required: true },
          {
            key: 'category',
            label: 'Categoría',
            options: categories,
            required: true,
          },
          { key: 'price', label: 'Precio ($)', numeric: true, required: true },
          {
            key: 'stock',
            label: 'Unidades disponibles',
            numeric: true,
            integer: true,
            required: true,
          },
          {
            key: 'visibility',
            label: 'Visibilidad',
            options: ['Visible', 'Oculto'],
          },
        ];

  return (
    <AdminShell
      title="Productos"
      subtitle={`${products.length} productos · ${categories.length} categorías`}
      addLabel={tab === 'Productos' ? 'Agregar producto' : 'Agregar categoría'}
      onAdd={() =>
        setEditor({ type: tab === 'Productos' ? 'product' : 'category' })
      }
    >
      <View className="mb-4 flex-row rounded-xl bg-[#f2e8d6] p-1">
        {['Productos', 'Categorías'].map((item) => (
          <Pressable
            key={item}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === item }}
            onPress={() => setTab(item)}
            className={`min-h-9 flex-1 items-center justify-center rounded-lg ${tab === item ? 'bg-white' : ''}`}
          >
            <Text
              className={`text-xs ${tab === item ? 'font-medium text-[#b7472a]' : 'text-[#8b8178]'}`}
            >
              {item}
            </Text>
          </Pressable>
        ))}
      </View>
      {tab === 'Productos' ? (
        <>
          <Search
            value={search}
            onChange={setSearch}
            placeholder="Buscar producto"
          />
          <Chips items={filters} value={category} onChange={setCategory} />
          <ToggleFilter
            checked={stockOnly}
            label="Solo productos con stock bajo"
            onPress={() => setStockOnly((current) => !current)}
          />
          {shown.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onPress={() => setEditor({ type: 'product', item: product })}
            />
          ))}
          {!shown.length && <Empty>Prueba con otro nombre o categoría.</Empty>}
          <Pressable
            accessibilityRole="button"
            onPress={() => setTab('Categorías')}
            className="mt-2 flex-row items-center justify-between rounded-xl bg-[#deecdf] px-3 py-3"
          >
            <View>
              <Text className="text-xs font-medium text-[#477052]">
                {categories.length} categorías activas
              </Text>
              <Text className="mt-1 text-[9px] text-[#547353]">
                Organiza los productos de tu carta
              </Text>
            </View>
            <Text className="text-[10px] text-[#477052]">Gestionar →</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text className="mb-3 text-xs text-[#8b8178]">
            Organiza tu carta por tipo de producto.
          </Text>
          {categories.map((name) => (
            <View
              key={name}
              className="mb-3 flex-row items-center rounded-2xl bg-white p-4"
            >
              <View className="flex-1">
                <Text className="text-sm font-semibold text-[#332d28]">
                  {name}
                </Text>
                <Text className="mt-1 text-[10px] text-[#8b8178]">
                  {
                    products.filter((product) => product.category === name)
                      .length
                  }{' '}
                  productos
                </Text>
              </View>
              <Button
                secondary
                onPress={() => setEditor({ type: 'category', original: name })}
              >
                Editar
              </Button>
            </View>
          ))}
        </>
      )}
      {editor && (
        <Editor
          key={`${editor.type}-${editor.item?.id || editor.original || 'new'}`}
          title={
            editor.type === 'category'
              ? editor.original
                ? 'Editar categoría'
                : 'Nueva categoría'
              : editor.item
                ? 'Editar producto'
                : 'Nuevo producto'
          }
          initial={
            editor.type === 'category'
              ? { name: editor.original || '' }
              : {
                  name: '',
                  price: '',
                  stock: '',
                  category: categories[0],
                  ...editor.item,
                  visibility:
                    editor.item?.visible === false ? 'Oculto' : 'Visible',
                }
          }
          fields={fields}
          onSave={save}
          onClose={() => setEditor(null)}
        />
      )}
    </AdminShell>
  );
}
