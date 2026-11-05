import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ImageOff, Loader2, Plus, Trash2 } from 'lucide-react';
import { catalogApi } from '../api/catalogApi';
import { Badge, ConfirmDialog, Drawer, ErrorState, Input, Select } from '@/shared/ui';
import { SafeImage } from '@/shared/ui/SafeImage';
import { toast } from '@/shared/ui/toastStore';
import { formatMoney } from '@/shared/lib/formatters';
import { discountPercent } from '@/shared/lib/pricing';
import type { Category, Variant } from '@/shared/types/domain';
import { readDraft, saveDraft, clearDraft } from '@/shared/lib/draft';
import { apiErrorMessage } from '@/shared/lib/apiErrors';
import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus';
import { ImageUploadField } from './ImageUploadField';

type Tab = 'datos' | 'imagenes' | 'variantes';
const MAX_IMAGES = 10;
export const EDIT_DRAFT = 'product-edit';

interface EditDraft {
  id: number;
  nombre: string;
  descripcion: string;
  idCategoria: number;
  imagenUrl: string;
  activo: boolean;
  destacado: boolean;
}

const apiMessage = apiErrorMessage;

const Switch: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string; disabled?: boolean }> = ({
  checked,
  onChange,
  label,
  hint,
  disabled,
}) => (
  <label className={`flex items-start justify-between gap-4 rounded-xl border border-slate-200 p-4 ${disabled ? 'opacity-60' : 'cursor-pointer'}`}>
    <span>
      <span className="block text-sm font-bold text-slate-900">{label}</span>
      {hint && <span className="mt-0.5 block text-xs text-slate-500">{hint}</span>}
    </span>
    <span className="relative inline-flex shrink-0">
      <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} className="peer sr-only" />
      <span className="h-6 w-11 rounded-full bg-slate-200 transition peer-checked:bg-brand peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-focus-visible:ring-offset-2" />
      <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
    </span>
  </label>
);

export interface ProductEditorDrawerProps {
  productId: number | null;
  categories: Category[];
  onClose: () => void;
}

export const ProductEditorDrawer: React.FC<ProductEditorDrawerProps> = ({ productId, categories, onClose }) => {
  const queryClient = useQueryClient();
  const online = useOnlineStatus();
  const offlineTitle = online ? undefined : 'Sin conexión';
  const [tab, setTab] = useState<Tab>('datos');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-product', productId],
    queryFn: () => catalogApi.getProductAdmin(productId!),
    enabled: productId !== null,
  });

  const producto = data?.producto;
  const variantes = useMemo(() => data?.variantes ?? [], [data]);
  const imagenes = useMemo(() => data?.imagenes ?? [], [data]);

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [idCategoria, setIdCategoria] = useState<number>(0);
  const [imagenUrl, setImagenUrl] = useState('');
  const [activo, setActivo] = useState(true);
  const [destacado, setDestacado] = useState(false);
  const [saving, setSaving] = useState(false);

  // Producto ya cargado en el form; antes no se guarda borrador
  const [hydratedId, setHydratedId] = useState<number | null>(null);

  useEffect(() => {
    if (producto) {
      const d = readDraft<EditDraft>(EDIT_DRAFT);
      const saved = d?.id === producto.IDProducto ? d : null;
      setNombre(saved?.nombre ?? producto.Nombre);
      setDescripcion(saved?.descripcion ?? producto.Descripcion ?? '');
      setIdCategoria(saved?.idCategoria ?? producto.IDCategoria);
      setImagenUrl(saved?.imagenUrl ?? producto.ImagenUrl ?? '');
      setActivo(saved?.activo ?? producto.Activo);
      setDestacado(saved?.destacado ?? Boolean(producto.Destacado));
      setHydratedId(producto.IDProducto);
    }
  }, [producto]);

  useEffect(() => {
    if (productId !== null) setTab('datos');
  }, [productId]);

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-product', productId] });
    queryClient.invalidateQueries({ queryKey: ['admin-catalog-products'] });
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['product'] });
    queryClient.invalidateQueries({ queryKey: ['home'] });
    queryClient.invalidateQueries({ queryKey: ['categories'] });
  };

  const run = async (action: () => Promise<unknown>, ok: string, fail: string): Promise<boolean> => {
    try {
      await action();
      toast.success(ok);
      refreshAll();
      return true;
    } catch (err) {
      toast.error(fail, apiMessage(err, 'Intenta de nuevo.'));
      return false;
    }
  };

  const dirty =
    producto &&
    (nombre.trim() !== producto.Nombre ||
      descripcion !== (producto.Descripcion ?? '') ||
      idCategoria !== producto.IDCategoria ||
      imagenUrl.trim() !== (producto.ImagenUrl ?? '') ||
        activo !== producto.Activo ||
        destacado !== Boolean(producto.Destacado));

  useEffect(() => {
    if (!producto || hydratedId !== producto.IDProducto) return;
    if (dirty) saveDraft(EDIT_DRAFT, { id: producto.IDProducto, nombre, descripcion, idCategoria, imagenUrl, activo, destacado } satisfies EditDraft);
    else clearDraft(EDIT_DRAFT);
  }, [producto, hydratedId, dirty, nombre, descripcion, idCategoria, imagenUrl, activo, destacado]);

  const saveData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!producto) return;
    if (nombre.trim().length < 3) {
      toast.error('Mínimo 3 caracteres');
      return;
    }
    if (imagenUrl.trim() && !/^https?:\/\//i.test(imagenUrl.trim())) {
      toast.error('La URL debe empezar con http:// o https://');
      return;
    }
    setSaving(true);
    await run(
      async () => {
        await catalogApi.updateProduct(producto.IDProducto, {
          nombre: nombre.trim(),
          descripcion,
          idCategoria,
          activo,
          ...(imagenUrl.trim() ? { imagenUrl: imagenUrl.trim() } : {}),
        });
        if (destacado !== Boolean(producto.Destacado)) await catalogApi.setFeatured(producto.IDProducto, destacado);
      },
      'Producto actualizado',
      'No se pudo guardar el producto',
    );
    setSaving(false);
  };

  const [newImage, setNewImage] = useState('');
  const [imageToDelete, setImageToDelete] = useState<number | null>(null);

  const addImage = async () => {
    const url = newImage.trim();
    if (!/^https?:\/\//i.test(url)) {
      toast.error('URL no válida');
      return;
    }
    if (producto && (await run(() => catalogApi.addProductImage(producto.IDProducto, url), 'Imagen agregada', 'No se pudo agregar la imagen'))) {
      setNewImage('');
    }
  };

  const [priceDraft, setPriceDraft] = useState<Record<number, string>>({});
  const [refDraft, setRefDraft] = useState<Record<number, string>>({});
  const [priceConfirm, setPriceConfirm] = useState<{ variant: Variant; next: number } | null>(null);
  const [confirmingPrice, setConfirmingPrice] = useState(false);
  const [newVariant, setNewVariant] = useState({ sku: '', talla: '', color: '', presentacion: '', precio: '', existencia: '0' });
  const [creating, setCreating] = useState(false);

  const savePrice = (v: Variant) => {
    const raw = priceDraft[v.IDVariante];
    const next = Number(raw);
    if (!raw || !Number.isFinite(next) || next <= 0) {
      toast.error('Precio no válido');
      return;
    }
    if (next === Number(v.Precio)) return;
    setPriceConfirm({ variant: v, next });
  };

  const saveReference = async (v: Variant) => {
    const raw = (refDraft[v.IDVariante] ?? '').trim();
    const next = raw === '' ? null : Number(raw);
    if (next !== null && (!Number.isFinite(next) || next <= Number(v.Precio))) {
      toast.error('Debe ser mayor al precio de venta');
      return;
    }
    await run(() => catalogApi.setReferencePrice(v.IDVariante, next), next === null ? 'Precio de referencia quitado' : 'Precio de referencia guardado', 'No se pudo guardar el precio de referencia');
  };

  const createVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!producto) return;
    const precio = Number(newVariant.precio);
    if (newVariant.sku.trim().length < 3) return toast.error('Mínimo 3 caracteres');
    if (!Number.isFinite(precio) || precio <= 0) return toast.error('Precio no válido');
    setCreating(true);
    const ok = await run(
      () =>
        catalogApi.createVariant(producto.IDProducto, {
          sku: newVariant.sku.trim().toUpperCase(),
          talla: newVariant.talla.trim() || undefined,
          color: newVariant.color.trim() || undefined,
          presentacion: newVariant.presentacion.trim() || undefined,
          precio,
          existenciaInicial: Math.max(0, Math.floor(Number(newVariant.existencia) || 0)),
        }),
      'Variante creada',
      'No se pudo crear la variante',
    );
    if (ok) setNewVariant({ sku: '', talla: '', color: '', presentacion: '', precio: '', existencia: '0' });
    setCreating(false);
  };

  const tabs: Array<{ id: Tab; label: string; count?: number }> = [
    { id: 'datos', label: 'Datos' },
    { id: 'imagenes', label: 'Imágenes', count: imagenes.length },
    { id: 'variantes', label: 'Variantes', count: variantes.length },
  ];

  return (
    <Drawer
      isOpen={productId !== null}
      onClose={onClose}
      title={producto ? producto.Nombre : 'Producto'}
      description={producto ? `${producto.Categoria} · ID ${producto.IDProducto}` : undefined}
      width="xl"
    >
      {isLoading ? (
        <div className="space-y-3" aria-busy="true">{[0, 1, 2].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-200/70" />)}</div>
      ) : isError || !producto ? (
        <ErrorState title="Error al cargar el producto" onRetry={() => refetch()} />
      ) : (
        <div className="space-y-6">
          <div role="tablist" className="flex gap-1 border-b border-slate-200">
            {tabs.map(t => (
              <button
                key={t.id}
                role="tab"
                type="button"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-bold transition ${
                  tab === t.id ? 'border-brand text-brand' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {t.label}
                {t.count != null && <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">{t.count}</span>}
              </button>
            ))}
          </div>

          {tab === 'datos' && (
            <form onSubmit={saveData} className="space-y-4" noValidate>
              <div className="grid gap-3 sm:grid-cols-2">
                <Switch
                  label="Producto activo"
                  hint={activo ? 'Aparece en la tienda.' : 'No aparece en la tienda.'}
                  checked={activo}
                  onChange={setActivo}
                />
                <Switch label="Destacado" checked={destacado} onChange={setDestacado} />
              </div>
              <Input label="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} />
              <Select
                label="Categoría"
                value={idCategoria}
                onChange={e => setIdCategoria(Number(e.target.value))}
                options={categories.map(c => ({ value: c.IDCategoria, label: c.Activo ? c.Nombre : `${c.Nombre} (inactiva)` }))}
              />
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">Descripción</span>
                <textarea
                  value={descripcion}
                  onChange={e => setDescripcion(e.target.value)}
                  rows={5}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                />
              </label>
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <Input label="URL de la portada" value={imagenUrl} onChange={e => setImagenUrl(e.target.value)} placeholder="https://…" />
                </div>
                <SafeImage src={imagenUrl || undefined} alt="Portada" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
              </div>
              <ImageUploadField
                key={producto.IDProducto}
                productId={producto.IDProducto}
                label="Subir portada"
                onUploaded={async url => {
                  await catalogApi.updateProduct(producto.IDProducto, { imagenUrl: url });
                  setImagenUrl(url);
                  toast.success('Portada actualizada');
                  refreshAll();
                }}
              />
              <div className="flex justify-end border-t border-slate-100 pt-4">
                <button
                  type="submit"
                  disabled={!dirty || saving || !online}
                  title={offlineTitle}
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-cta px-6 text-sm font-extrabold text-cta-fg hover:bg-cta-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />} Guardar
                </button>
              </div>
            </form>
          )}

          {tab === 'imagenes' && (
            <div className="space-y-5">
              <p className="text-sm text-slate-500">
                Galería: {imagenes.length} de {MAX_IMAGES}.
              </p>
              {imagenes.length === 0 ? (
                <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center text-slate-400">
                  <ImageOff className="h-8 w-8" />
                  <p className="mt-2 text-sm font-semibold">Sin imágenes. Se usa la portada.</p>
                </div>
              ) : (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {imagenes.map(img => (
                    <li key={img.IDProductoImagen} className="group relative overflow-hidden rounded-xl bg-canvas">
                      <SafeImage src={img.Url} alt={`Imagen ${img.Orden}`} className="aspect-square w-full object-cover" loading="lazy" />
                      <span className="absolute left-2 top-2 rounded-md bg-slate-900/80 px-1.5 py-0.5 text-[11px] font-bold text-white">{img.Orden}</span>
                      <button
                        type="button"
                        onClick={() => setImageToDelete(img.IDProductoImagen)}
                        aria-label={`Eliminar imagen ${img.Orden}`}
                        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-rose-600 shadow-sm opacity-100 transition hover:bg-rose-50 sm:opacity-0 sm:group-hover:opacity-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <ImageUploadField
                key={producto.IDProducto}
                productId={producto.IDProducto}
                label="Subir imagen"
                disabled={imagenes.length >= MAX_IMAGES}
                onUploaded={async url => {
                  await catalogApi.addProductImage(producto.IDProducto, url);
                  toast.success('Imagen agregada');
                  refreshAll();
                }}
              />
              <div className="flex items-end gap-3 rounded-2xl bg-canvas p-4">
                <div className="flex-1">
                  <Input label="URL de imagen" value={newImage} onChange={e => setNewImage(e.target.value)} placeholder="https://…" disabled={imagenes.length >= MAX_IMAGES} />
                </div>
                <button
                  type="button"
                  onClick={addImage}
                  disabled={imagenes.length >= MAX_IMAGES || !newImage.trim() || !online}
                  title={offlineTitle}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full bg-brand px-5 text-sm font-bold text-white hover:bg-brand-hover disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" /> Agregar
                </button>
              </div>
            </div>
          )}

          {tab === 'variantes' && (
            <div className="space-y-6">
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full min-w-[46rem] text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3">SKU / Atributos</th>
                      <th className="px-4 py-3">Precio de venta</th>
                      <th className="px-4 py-3">Precio de referencia</th>
                      <th className="px-4 py-3">Existencia</th>
                      <th className="px-4 py-3 text-right">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {variantes.map(v => {
                      const pct = discountPercent(v.PrecioReferencia, Number(v.Precio));
                      const priceVal = priceDraft[v.IDVariante] ?? String(v.Precio);
                      const refVal = refDraft[v.IDVariante] ?? (v.PrecioReferencia != null ? String(v.PrecioReferencia) : '');
                      return (
                        <tr key={v.IDVariante} className={v.Activo ? '' : 'bg-slate-50/70 text-slate-400'}>
                          <td className="px-4 py-3 align-top">
                            <p className="font-mono text-xs font-bold text-slate-800">{v.SKU}</p>
                            <p className="text-xs text-slate-500">{[v.Talla, v.Color, v.Presentacion].filter(Boolean).join(' · ') || 'Sin atributos'}</p>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-slate-400">Q</span>
                              <input
                                inputMode="decimal"
                                aria-label={`Precio de ${v.SKU}`}
                                value={priceVal}
                                onChange={e => setPriceDraft(d => ({ ...d, [v.IDVariante]: e.target.value.replace(/[^0-9.]/g, '') }))}
                                className="h-9 w-24 rounded-lg border border-slate-300 px-2 text-sm font-bold tabular outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                              />
                              {priceVal !== String(v.Precio) && (
                                <button type="button" onClick={() => savePrice(v)} disabled={!online} title={offlineTitle} className="h-9 rounded-lg bg-brand px-3 text-xs font-bold text-white disabled:opacity-50 hover:bg-brand-hover">Guardar</button>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-slate-400">Q</span>
                              <input
                                inputMode="decimal"
                                aria-label={`Precio de referencia de ${v.SKU}`}
                                placeholder="Sin oferta"
                                value={refVal}
                                onChange={e => setRefDraft(d => ({ ...d, [v.IDVariante]: e.target.value.replace(/[^0-9.]/g, '') }))}
                                className="h-9 w-24 rounded-lg border border-slate-300 px-2 text-sm tabular outline-none placeholder:text-xs focus:border-brand focus:ring-2 focus:ring-brand/20"
                              />
                              {refVal !== (v.PrecioReferencia != null ? String(v.PrecioReferencia) : '') && (
                                <button type="button" onClick={() => saveReference(v)} disabled={!online} title={offlineTitle} className="h-9 rounded-lg bg-slate-800 px-3 text-xs font-bold text-white disabled:opacity-50 hover:bg-slate-700">Guardar</button>
                              )}
                            </div>
                            {pct > 0 && <p className="mt-1 text-[11px] font-bold text-sale">-{pct}%</p>}
                          </td>
                          <td className="px-4 py-3 align-top text-xs tabular">
                            <p><strong className="text-slate-900">{v.ExistenciaDisponible}</strong> disponibles</p>
                            <p className="text-slate-500">{v.ExistenciaFisica} físicas · {v.UnidadesReservadas} apartadas</p>
                          </td>
                          <td className="px-4 py-3 text-right align-top">
                            <button
                              type="button"
                              onClick={() => run(() => catalogApi.updateVariant(v.IDVariante, { activo: !v.Activo }), v.Activo ? 'Variante desactivada' : 'Variante activada', 'No se pudo cambiar la variante')}
                              className="inline-flex"
                              aria-label={v.Activo ? `Desactivar ${v.SKU}` : `Activar ${v.SKU}`}
                            >
                              <Badge variant={v.Activo ? 'success' : 'neutral'} size="sm">{v.Activo ? 'Activa' : 'Inactiva'}</Badge>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <form onSubmit={createVariant} className="space-y-3 rounded-2xl bg-canvas p-4" noValidate>
                <p className="text-sm font-extrabold text-slate-900">Nueva variante</p>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  <Input label="SKU *" value={newVariant.sku} onChange={e => setNewVariant(s => ({ ...s, sku: e.target.value.toUpperCase() }))} />
                  <Input label="Talla" value={newVariant.talla} onChange={e => setNewVariant(s => ({ ...s, talla: e.target.value }))} />
                  <Input label="Color" value={newVariant.color} onChange={e => setNewVariant(s => ({ ...s, color: e.target.value }))} />
                  <Input label="Presentación" value={newVariant.presentacion} onChange={e => setNewVariant(s => ({ ...s, presentacion: e.target.value }))} />
                  <Input label="Precio (Q) *" inputMode="decimal" value={newVariant.precio} onChange={e => setNewVariant(s => ({ ...s, precio: e.target.value.replace(/[^0-9.]/g, '') }))} />
                  <Input label="Existencia inicial" inputMode="numeric" value={newVariant.existencia} onChange={e => setNewVariant(s => ({ ...s, existencia: e.target.value.replace(/\D/g, '') }))} />
                </div>
                <div className="flex justify-end">
                  <button type="submit" disabled={creating || !online} title={offlineTitle} className="inline-flex h-10 items-center gap-2 rounded-full bg-brand px-5 text-sm font-bold text-white hover:bg-brand-hover disabled:opacity-60">
                    {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Crear variante
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={imageToDelete !== null}
        onClose={() => setImageToDelete(null)}
        onConfirm={async () => {
          if (imageToDelete !== null) await run(() => catalogApi.deleteProductImage(imageToDelete), 'Imagen eliminada', 'No se pudo eliminar la imagen');
          setImageToDelete(null);
        }}
        title="Eliminar imagen"
        consequence="Se quita de la galería."
        confirmText="Eliminar"
      />
      <ConfirmDialog
        isOpen={priceConfirm !== null}
        onClose={() => setPriceConfirm(null)}
        loading={confirmingPrice}
        onConfirm={async () => {
          if (!priceConfirm) return;
          setConfirmingPrice(true);
          const ok = await run(
            () => catalogApi.updatePrice(priceConfirm.variant.IDVariante, priceConfirm.next),
            'Precio actualizado',
            'No se pudo actualizar el precio',
          );
          if (ok) setPriceDraft(d => {
            const next = { ...d };
            delete next[priceConfirm.variant.IDVariante];
            return next;
          });
          setConfirmingPrice(false);
          setPriceConfirm(null);
        }}
        variant="primary"
        title="Cambiar precio"
        consequence={
          priceConfirm
            ? `${priceConfirm.variant.SKU}: de ${formatMoney(priceConfirm.variant.Precio)} a ${formatMoney(priceConfirm.next)}. Los pedidos anteriores no cambian.`
            : ''
        }
        confirmText="Cambiar"
      />
    </Drawer>
  );
};
