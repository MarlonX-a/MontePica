import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import AdminShell from '@/features/admin/components/AdminShell';
import { ProductCard } from '@/features/admin/components/AdminCards';
import {
  Button,
  Chips,
  Editor,
  Empty,
  Search,
  ToggleFilter,
} from '@/features/admin/components/AdminUI';
import {
  createAdminCategory,
  createAdminProduct,
  getAdminApiError,
  getAdminCategories,
  getAdminProducts,
  updateAdminCategory,
  updateAdminProduct,
} from '@/features/admin/api/catalogAdminApi';
import {
  getAdminProductPayload,
  mapAdminCategory,
  mapAdminProduct,
} from '@/features/admin/data/adminCatalogMapper';

function getEditorTitle(editor) {
  if (editor.type === 'category') {
    return editor.item ? 'Editar categoría' : 'Nueva categoría';
  }
  return editor.item ? 'Editar producto' : 'Nuevo producto';
}

function getEditorInitialValues(editor, categories) {
  if (editor.type === 'category') {
    return {
      name: editor.item?.name || '',
      status: editor.item?.active === false ? 'Inactiva' : 'Activa',
    };
  }

  return {
    sku: '',
    name: '',
    description: '',
    price: '',
    categoryId: categories[0]?.id || '',
    visibility: 'Visible',
    ...editor.item,
    categoryId: editor.item?.categoryId || categories[0]?.id || '',
    visibility: editor.item?.visible === false ? 'Oculto' : 'Visible',
    status: editor.item?.active === false ? 'Inactivo' : 'Activo',
  };
}

export default function ProductsScreen() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [tab, setTab] = useState('Productos');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('Todos');
  const [visibleOnly, setVisibleOnly] = useState(false);
  const [editor, setEditor] = useState(null);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [apiProducts, apiCategories] = await Promise.all([
        getAdminProducts(),
        getAdminCategories(),
      ]);
      setProducts(apiProducts.map(mapAdminProduct));
      setCategories(apiCategories.map(mapAdminCategory));
    } catch (error) {
      setLoadError(getAdminApiError(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const shown = products.filter(
    (product) =>
      product.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()) &&
      (categoryId === 'Todos' || product.categoryId === categoryId) &&
      (!visibleOnly || product.visible),
  );
  const filters = [
    { value: 'Todos', label: `Todos ${products.length}` },
    ...categories.map((item) => ({
      value: item.id,
      label: `${item.name} ${products.filter((product) => product.categoryId === item.id).length}`,
    })),
  ];

  async function save(values) {
    try {
      if (editor.type === 'category') {
        const name = values.name.trim();
        if (
          name.toLocaleLowerCase() === 'todos' ||
          categories.some(
            (item) =>
              item.id !== editor.item?.id &&
              item.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
          )
        ) {
          return 'Usa un nombre de categoría diferente.';
        }

        const savedCategory = editor.item
          ? await updateAdminCategory(editor.item.id, {
              name,
              active: values.status === 'Activa',
            })
          : await createAdminCategory({
              name,
              active: values.status === 'Activa',
              sortOrder: categories.length,
            });
        const mappedCategory = mapAdminCategory(savedCategory);
        setCategories((current) =>
          editor.item
            ? current.map((item) =>
                item.id === mappedCategory.id ? mappedCategory : item,
              )
            : [...current, mappedCategory],
        );
        setProducts((current) =>
          current.map((product) =>
            product.categoryId === mappedCategory.id
              ? { ...product, category: mappedCategory.name }
              : product,
          ),
        );
        if (categoryId === editor.item?.id) setCategoryId(mappedCategory.id);
      } else {
        const selectedCategory = categories.find(
          (item) => item.id === values.categoryId,
        );
        if (!selectedCategory) {
          return 'Selecciona una categoría válida.';
        }
        if (!editor.item && !selectedCategory.active) {
          return 'Elige una categoría activa para el producto.';
        }
        if (!editor.item && !values.sku.trim()) {
          return 'Ingresa el SKU del producto.';
        }

        const payload = getAdminProductPayload(
          values,
          categories,
          editor.item,
        );
        const savedProduct = editor.item
          ? await updateAdminProduct(editor.item.id, payload)
          : await createAdminProduct(payload);
        const mappedProduct = mapAdminProduct(savedProduct);
        setProducts((current) =>
          editor.item
            ? current.map((item) =>
                item.id === mappedProduct.id ? mappedProduct : item,
              )
            : [...current, mappedProduct],
        );
      }

      setEditor(null);
      return undefined;
    } catch (error) {
      return getAdminApiError(error);
    }
  }

  const categoryOptions = categories.map((item) => ({
    value: item.id,
    label: item.name,
  }));
  const fields =
    editor?.type === 'category'
      ? [
          { key: 'name', label: 'Nombre de la categoría', required: true },
          {
            key: 'status',
            label: 'Estado',
            options: ['Activa', 'Inactiva'],
          },
        ]
      : [
          ...(!editor?.item
            ? [{ key: 'sku', label: 'SKU', required: true }]
            : []),
          { key: 'name', label: 'Nombre del producto', required: true },
          { key: 'description', label: 'Descripción' },
          {
            key: 'categoryId',
            label: 'Categoría',
            options: categoryOptions,
            required: true,
          },
          { key: 'price', label: 'Precio ($)', numeric: true, required: true },
          {
            key: 'visibility',
            label: 'Visibilidad en el menú',
            options: ['Visible', 'Oculto'],
          },
          {
            key: 'status',
            label: 'Estado',
            options: ['Activo', 'Inactivo'],
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

      {loading ? (
        <View className="items-center rounded-2xl bg-white px-5 py-10">
          <ActivityIndicator color="#b7472a" />
          <Text className="mt-3 text-xs text-[#8b8178]">
            Cargando catálogo del servidor…
          </Text>
        </View>
      ) : loadError ? (
        <View className="rounded-2xl bg-white p-5">
          <Text accessibilityRole="alert" className="mb-3 text-sm text-[#b7472a]">
            {loadError}
          </Text>
          <Button onPress={loadCatalog}>Reintentar</Button>
        </View>
      ) : tab === 'Productos' ? (
        <>
          <Search
            value={search}
            onChange={setSearch}
            placeholder="Buscar producto"
          />
          <Chips items={filters} value={categoryId} onChange={setCategoryId} />
          <ToggleFilter
            checked={visibleOnly}
            label="Solo productos visibles en el menú"
            onPress={() => setVisibleOnly((current) => !current)}
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
                {categories.length} categorías
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
          {categories.map((item) => (
            <View
              key={item.id}
              className="mb-3 flex-row items-center rounded-2xl bg-white p-4"
            >
              <View className="flex-1">
                <Text className="text-sm font-semibold text-[#332d28]">
                  {item.name}
                </Text>
                <Text className="mt-1 text-[10px] text-[#8b8178]">
                  {item.active ? 'Activa · ' : 'Inactiva · '}
                  {products.filter((product) => product.categoryId === item.id).length}{' '}
                  productos
                </Text>
              </View>
              <Button
                secondary
                onPress={() => setEditor({ type: 'category', item })}
              >
                Editar
              </Button>
            </View>
          ))}
          {!categories.length && <Empty>Agrega la primera categoría.</Empty>}
        </>
      )}

      {editor && (
        <Editor
          key={`${editor.type}-${editor.item?.id || 'new'}`}
          title={getEditorTitle(editor)}
          initial={getEditorInitialValues(editor, categories)}
          fields={fields}
          onSave={save}
          onClose={() => setEditor(null)}
          saveHint="Este cambio se guarda en el catálogo del backend."
        />
      )}
    </AdminShell>
  );
}
