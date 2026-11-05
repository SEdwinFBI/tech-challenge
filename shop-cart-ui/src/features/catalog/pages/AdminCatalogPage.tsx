import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit3, Plus, Star } from 'lucide-react';
import { catalogApi, type GetProductsParams } from '../api/catalogApi';
import { useCategories } from '../hooks/useCatalog';
import { ProductEditorDrawer, EDIT_DRAFT } from '../components/ProductEditorDrawer';
import { formatMoney } from '@/shared/lib/formatters';
import { useSort } from '@/shared/hooks/useSort';
import { useColumnFilters } from '@/shared/hooks/useColumnFilters';
import type { FilterDef } from '@/shared/lib/columnFilters';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Input,
  Modal,
  PageHeader,
  Pagination,
  Select,
  Table,
  TableBody,
  TableCell,
  TableMessageRow,
  SortableHead,
  FilterableHead,
  FilterChips,
  TableHead,
  TableHeader,
  TableRow,
  TableRowsSkeleton,
} from '@/shared/ui';
import { SafeImage } from '@/shared/ui/SafeImage';
import { toast } from '@/shared/ui/toastStore';
import type { Category } from '@/shared/types/domain';
import { clearDraft, readDraft, saveDraft } from '@/shared/lib/draft';
import { apiErrorMessage } from '@/shared/lib/apiErrors';

const apiMessage = apiErrorMessage;

const NEW_DRAFT = 'product-new';

type ProductSortColumn = 'recientes' | 'nombre' | 'precio';

// Orden en un solo valor (NOMBRE_ASC, PRECIO_DESC...), no orden + dirección
const toCatalogOrder = (orden: ProductSortColumn, direccion: 'asc' | 'desc'): NonNullable<GetProductsParams['orden']> => {
  if (orden === 'nombre') return direccion === 'asc' ? 'NOMBRE_ASC' : 'NOMBRE_DESC';
  if (orden === 'precio') return direccion === 'asc' ? 'PRECIO_ASC' : 'PRECIO_DESC';
  return 'RECIENTES';
};

const FILTROS = ['q', 'categoria', 'activo'] as const;

export const AdminCatalogPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'productos' | 'categorias'>('productos');

  const [page, setPage] = useState(1);

  // Borrador sobrevive a una sesión caducada; se reabre al entrar
  const [editingProductId, setEditingProductId] = useState<number | null>(() => readDraft<{ id: number }>(EDIT_DRAFT)?.id ?? null);

  const { data: categories = [] } = useCategories();
  const resetPage = useCallback(() => setPage(1), []);
  const { values: f, patch, clearAll, anyActive } = useColumnFilters(FILTROS, resetPage);
  const { sort, toggle } = useSort<ProductSortColumn>({ orden: 'recientes', direccion: 'desc' }, resetPage);

  const defs = useMemo<Record<'q' | 'categoria' | 'activo', FilterDef>>(
    () => ({
      q: { type: 'texto', key: 'q', label: 'Nombre', placeholder: 'Nombre, descripción o SKU' },
      categoria: { type: 'opciones', key: 'categoria', label: 'Categoría', options: categories.map(c => ({ value: String(c.IDCategoria), label: c.Nombre })), allLabel: 'Todas las categorías' },
      activo: { type: 'opciones', key: 'activo', label: 'Estado', options: [{ value: 'true', label: 'Activo' }, { value: 'false', label: 'Inactivo' }] },
    }),
    [categories],
  );

  const productsQuery = useQuery({
    queryKey: ['admin-catalog-products', page, f, sort.orden, sort.direccion],
    queryFn: () =>
      catalogApi.getProducts({
        pagina: page,
        tamanoPagina: 15,
        q: f.q.trim() || undefined,
        idCategoria: f.categoria ? Number(f.categoria) : undefined,
        activo: f.activo === '' ? undefined : f.activo,
        orden: toCatalogOrder(sort.orden, sort.direccion),
      }),
    placeholderData: keepPreviousData,
  });
  const products = productsQuery.data?.items ?? [];

  const emptyProduct = { nombre: '', descripcion: '', idCategoria: 0, imagenUrl: '', sku: '', color: '', talla: '', presentacion: '', precio: '', existencia: '0' };
  const [newProductDraft] = useState(() => readDraft<typeof emptyProduct>(NEW_DRAFT));
  const [newProductOpen, setNewProductOpen] = useState(newProductDraft !== null);
  const [np, setNp] = useState(newProductDraft ?? emptyProduct);

  useEffect(() => {
    if (newProductOpen) saveDraft(NEW_DRAFT, np);
  }, [newProductOpen, np]);

  const closeNewProduct = () => {
    clearDraft(NEW_DRAFT);
    setNewProductOpen(false);
  };

  const closeEditor = () => {
    clearDraft(EDIT_DRAFT);
    setEditingProductId(null);
  };
  const [creatingProduct, setCreatingProduct] = useState(false);

  const openNewProduct = () => {
    setNp({ ...emptyProduct, idCategoria: categories.find(c => c.Activo)?.IDCategoria ?? 0 });
    setNewProductOpen(true);
  };

  const createProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const precio = Number(np.precio);
    if (np.nombre.trim().length < 3) return toast.error('Mínimo 3 caracteres');
    if (!np.idCategoria) return toast.error('Elige una categoría');
    if (np.sku.trim().length < 3) return toast.error('Mínimo 3 caracteres');
    if (!Number.isFinite(precio) || precio <= 0) return toast.error('Precio no válido');
    if (np.imagenUrl.trim() && !/^https?:\/\//i.test(np.imagenUrl.trim())) return toast.error('La URL debe empezar con http:// o https://');
    setCreatingProduct(true);
    try {
      await catalogApi.createProduct({
        idCategoria: np.idCategoria,
        nombre: np.nombre.trim(),
        descripcion: np.descripcion.trim() || undefined,
        imagenUrl: np.imagenUrl.trim() || undefined,
        sku: np.sku.trim().toUpperCase(),
        talla: np.talla.trim() || undefined,
        color: np.color.trim() || undefined,
        presentacion: np.presentacion.trim() || undefined,
        precio,
        existenciaInicial: Math.max(0, Math.floor(Number(np.existencia) || 0)),
      });
      toast.success('Producto creado');
      closeNewProduct();
      queryClient.invalidateQueries({ queryKey: ['admin-catalog-products'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    } catch (err) {
      toast.error('No se pudo crear el producto', apiMessage(err, 'El SKU podría estar repetido.'));
    } finally {
      setCreatingProduct(false);
    }
  };

  const [categoryModal, setCategoryModal] = useState<{ open: boolean; editing: Category | null }>({ open: false, editing: null });
  const [cf, setCf] = useState({ nombre: '', descripcion: '', imagenUrl: '', activa: true });
  const [savingCategory, setSavingCategory] = useState(false);

  const openCategory = (c: Category | null) => {
    setCf({ nombre: c?.Nombre ?? '', descripcion: c?.Descripcion ?? '', imagenUrl: c?.ImagenUrl ?? '', activa: c?.Activo ?? true });
    setCategoryModal({ open: true, editing: c });
  };

  const saveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cf.nombre.trim().length < 2) return toast.error('Mínimo 2 caracteres');
    if (cf.imagenUrl.trim() && !/^https?:\/\//i.test(cf.imagenUrl.trim())) return toast.error('La URL debe empezar con http:// o https://');
    setSavingCategory(true);
    try {
      const editing = categoryModal.editing;
      const body = { nombre: cf.nombre.trim(), descripcion: cf.descripcion.trim() || undefined, activa: cf.activa };
      if (editing) {
        await catalogApi.updateCategory(editing.IDCategoria, body);
        if ((cf.imagenUrl.trim() || null) !== (editing.ImagenUrl ?? null)) {
          await catalogApi.setCategoryImage(editing.IDCategoria, cf.imagenUrl.trim() || null);
        }
      } else {
        await catalogApi.saveCategory(body);
        if (cf.imagenUrl.trim()) {
          // El alta no acepta imagen
          const fresh = await catalogApi.getCategories();
          const created = fresh.find(c => c.Nombre === body.nombre);
          if (created) await catalogApi.setCategoryImage(created.IDCategoria, cf.imagenUrl.trim());
        }
      }
      toast.success('Categoría guardada');
      setCategoryModal({ open: false, editing: null });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['home'] });
    } catch (err) {
      toast.error('No se pudo guardar la categoría', apiMessage(err, 'El nombre podría estar repetido.'));
    } finally {
      setSavingCategory(false);
    }
  };

  const priceRange = (min: number, max: number) => (max > min ? `${formatMoney(min)} – ${formatMoney(max)}` : formatMoney(min));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Catálogo"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" leftIcon={<Plus className="mr-1 h-4 w-4" />} onClick={() => openCategory(null)}>
              Nueva categoría
            </Button>
            <Button size="sm" leftIcon={<Plus className="mr-1 h-4 w-4" />} onClick={openNewProduct}>
              Nuevo producto
            </Button>
          </div>
        }
      />

      <div role="tablist" className="flex gap-1 border-b border-slate-200">
        {([
          ['productos', 'Productos'],
          ['categorias', `Categorías (${categories.length})`],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-bold transition ${tab === id ? 'border-brand text-brand' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'productos' ? (
        <div className="space-y-4">
          <FilterChips defs={Object.values(defs)} values={f} onChange={patch} onClearAll={clearAll} />

          {productsQuery.isError ? (
            <ErrorState title="Error al cargar el catálogo" onRetry={() => productsQuery.refetch()} />
          ) : !productsQuery.isLoading && products.length === 0 && !anyActive ? (
            <EmptyState
              title="Sin productos"
              actionLabel="Nuevo producto"
              onAction={openNewProduct}
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHead column="nombre" sort={sort} onSort={toggle} filter={{ def: defs.q, values: f, onChange: patch }}>Producto</SortableHead>
                    <FilterableHead filter={{ def: defs.categoria, values: f, onChange: patch }}>Categoría</FilterableHead>
                    <SortableHead column="precio" sort={sort} onSort={toggle}>Precio</SortableHead>
                    <TableHead>Existencia</TableHead>
                    <FilterableHead filter={{ def: defs.activo, values: f, onChange: patch }}>Estado</FilterableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productsQuery.isLoading ? (
                    <TableRowsSkeleton rows={8} cols={6} />
                  ) : products.length === 0 ? (
                    <TableMessageRow colSpan={6}>Ningún producto coincide con los filtros.</TableMessageRow>
                  ) : products.map(p => (
                    <TableRow key={p.IDProducto} className={p.Activo ? '' : 'opacity-60'}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <SafeImage src={p.ImagenUrl} alt="" className="h-11 w-11 shrink-0 rounded-lg bg-canvas object-cover" loading="lazy" />
                          <div className="min-w-0">
                            <p className="flex items-center gap-1.5 truncate font-bold text-slate-900">
                              {p.Nombre}
                              {p.Destacado && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-500" aria-label="Destacado" />}
                            </p>
                            <p className="text-[11px] text-slate-400">ID {p.IDProducto}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">{p.Categoria}</TableCell>
                      <TableCell className="text-sm font-bold tabular text-slate-800">
                        {priceRange(p.PrecioMinimo, p.PrecioMaximo)}
                        {p.PorcentajeDescuento ? <span className="ml-1.5 rounded bg-sale px-1 py-0.5 text-[10px] font-bold text-white">-{p.PorcentajeDescuento}%</span> : null}
                      </TableCell>
                      <TableCell>
                        {p.StockTotalDisponible > 0 ? (
                          <Badge variant={p.StockTotalDisponible <= 5 ? 'warning' : 'success'} size="sm">{p.StockTotalDisponible} disp.</Badge>
                        ) : (
                          <Badge variant="error" size="sm">Agotado</Badge>
                        )}
                      </TableCell>
                      <TableCell><Badge variant={p.Activo ? 'success' : 'neutral'} size="sm">{p.Activo ? 'Activo' : 'Inactivo'}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" leftIcon={<Edit3 className="mr-1 h-3.5 w-3.5" />} onClick={() => setEditingProductId(p.IDProducto)}>
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {productsQuery.data && (
                <Pagination
                  currentPage={productsQuery.data.pagina}
                  totalRecords={productsQuery.data.totalRegistros}
                  pageSize={productsQuery.data.tamanoPagina}
                  onPageChange={setPage}
                />
              )}
            </>
          )}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Categoría</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Productos</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map(c => (
              <TableRow key={c.IDCategoria} className={c.Activo ? '' : 'opacity-60'}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <SafeImage src={c.ImagenUrl ?? undefined} alt="" className="h-10 w-10 shrink-0 rounded-full bg-canvas object-cover" loading="lazy" />
                    <span className="font-bold text-slate-900">{c.Nombre}</span>
                  </div>
                </TableCell>
                <TableCell className="max-w-xs truncate text-xs text-slate-500">{c.Descripcion || '—'}</TableCell>
                <TableCell className="tabular text-sm">{c.TotalProductos ?? 0}</TableCell>
                <TableCell><Badge variant={c.Activo ? 'success' : 'neutral'} size="sm">{c.Activo ? 'Activa' : 'Inactiva'}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" leftIcon={<Edit3 className="mr-1 h-3.5 w-3.5" />} onClick={() => openCategory(c)}>Editar</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <ProductEditorDrawer productId={editingProductId} categories={categories} onClose={closeEditor} />

      <Modal isOpen={newProductOpen} onClose={closeNewProduct} title="Nuevo producto" maxWidth="xl">
        <form onSubmit={createProduct} className="space-y-4" noValidate>
          <Input label="Nombre *" value={np.nombre} onChange={e => setNp(s => ({ ...s, nombre: e.target.value }))} />
          <Select
            label="Categoría *"
            value={np.idCategoria}
            onChange={e => setNp(s => ({ ...s, idCategoria: Number(e.target.value) }))}
            options={categories.filter(c => c.Activo).map(c => ({ value: c.IDCategoria, label: c.Nombre }))}
          />
          <Input label="Descripción" value={np.descripcion} onChange={e => setNp(s => ({ ...s, descripcion: e.target.value }))}  />
          <Input label="URL de la imagen principal" value={np.imagenUrl} onChange={e => setNp(s => ({ ...s, imagenUrl: e.target.value }))} placeholder="https://…" />
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Variante inicial</p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <Input label="SKU único *" value={np.sku} onChange={e => setNp(s => ({ ...s, sku: e.target.value.toUpperCase() }))} placeholder="BIL-CUE-NEG" />
              <Input label="Talla" value={np.talla} onChange={e => setNp(s => ({ ...s, talla: e.target.value }))} placeholder="Única" />
              <Input label="Color" value={np.color} onChange={e => setNp(s => ({ ...s, color: e.target.value }))} placeholder="Negro" />
              <Input label="Presentación" value={np.presentacion} onChange={e => setNp(s => ({ ...s, presentacion: e.target.value }))} />
              <Input label="Precio (Q) *" inputMode="decimal" value={np.precio} onChange={e => setNp(s => ({ ...s, precio: e.target.value.replace(/[^0-9.]/g, '') }))} />
              <Input label="Existencia inicial" inputMode="numeric" value={np.existencia} onChange={e => setNp(s => ({ ...s, existencia: e.target.value.replace(/\D/g, '') }))} />
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={closeNewProduct}>Cancelar</Button>
            <Button type="submit" loading={creatingProduct}>Crear</Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={categoryModal.open}
        onClose={() => setCategoryModal({ open: false, editing: null })}
        title={categoryModal.editing ? 'Editar categoría' : 'Nueva categoría'}
      >
        <form onSubmit={saveCategory} className="space-y-4" noValidate>
          <Input label="Nombre *" value={cf.nombre} onChange={e => setCf(s => ({ ...s, nombre: e.target.value }))} />
          <Input label="Descripción" value={cf.descripcion} onChange={e => setCf(s => ({ ...s, descripcion: e.target.value }))} />
          <div className="flex items-end gap-3">
            <div className="flex-1"><Input label="URL de la imagen" value={cf.imagenUrl} onChange={e => setCf(s => ({ ...s, imagenUrl: e.target.value }))} placeholder="https://…" /></div>
            <SafeImage src={cf.imagenUrl || undefined} alt="Vista previa" className="h-12 w-12 shrink-0 rounded-full object-cover" />
          </div>
          <label className="flex items-center gap-2.5 text-sm font-semibold text-slate-700">
            <input type="checkbox" checked={cf.activa} onChange={e => setCf(s => ({ ...s, activa: e.target.checked }))} className="h-4 w-4 accent-[var(--color-brand)]" />
            Visible en la tienda
          </label>
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={() => setCategoryModal({ open: false, editing: null })}>Cancelar</Button>
            <Button type="submit" loading={savingCategory}>Guardar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
