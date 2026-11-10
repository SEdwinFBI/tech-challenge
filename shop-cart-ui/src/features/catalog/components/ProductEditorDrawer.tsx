import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { catalogApi, type ProductDetailResponse } from '../api/catalogApi';
import { Badge, ConfirmDialog, Drawer, ErrorState, Input, Select } from '@/shared/ui';
import { SafeImage } from '@/shared/ui/SafeImage';
import { toast } from '@/shared/ui/toastStore';
import { formatMoney } from '@/shared/lib/formatters';
import { discountPercent } from '@/shared/lib/pricing';
import type { Category, Variant } from '@/shared/types/domain';
import { readDraft, saveDraft, clearDraft } from '@/shared/lib/draft';
import { apiErrorMessage } from '@/shared/lib/apiErrors';
import { invalidateStock, queryKeys } from '@/shared/lib/queryKeys';
import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus';
import { CoverUploadField, ExternalUrlOption, GalleryAddTile } from './ImageUploadField';
import { useStorageAvailable } from '../hooks/useImageUpload';
import { CatalogReviewPanel } from './CatalogReviewPanel';
import { OfferSection, Switch } from './OfferSection';
import { OfferDraft, EMPTY_OFFER, formatPct, isOfferComplete, nowFor, offerError, pctFromBefore, pctOf, referenceFor } from '../lib/offer';

type Tab = 'datos' | 'imagenes' | 'variantes';
const MAX_IMAGES = 10;
export const EDIT_DRAFT = 'product-edit';

interface EditDraft {
  id: number;
  nombre: string;
  descripcion: string;
  idCategoria: number;
  imagenUrl: string;
}

const apiMessage = apiErrorMessage;

const beforeOf = (v: Variant): number =>
  v.PrecioReferencia != null && Number(v.PrecioReferencia) > Number(v.Precio) ? Number(v.PrecioReferencia) : Number(v.Precio);

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
    queryKey: queryKeys.adminProduct.detail(productId),
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
  const [saving, setSaving] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [toggling, setToggling] = useState<'activo' | 'destacado' | null>(null);

  // Producto ya cargado en el form; antes no se guarda borrador
  const [hydratedId, setHydratedId] = useState<number | null>(null);

  const loadedId = producto?.IDProducto;
  const loadedNombre = producto?.Nombre;
  const loadedDescripcion = producto?.Descripcion;
  const loadedCategoria = producto?.IDCategoria;
  const loadedImagen = producto?.ImagenUrl;

  useEffect(() => {
    if (loadedId === undefined) return;
    const d = readDraft<EditDraft>(EDIT_DRAFT);
    const saved = d?.id === loadedId ? d : null;
    setNombre(saved?.nombre ?? loadedNombre ?? '');
    setDescripcion(saved?.descripcion ?? loadedDescripcion ?? '');
    setIdCategoria(saved?.idCategoria ?? loadedCategoria ?? 0);
    setImagenUrl(saved?.imagenUrl ?? loadedImagen ?? '');
    setHydratedId(loadedId);
  }, [loadedId, loadedNombre, loadedDescripcion, loadedCategoria, loadedImagen]);

  useEffect(() => {
    if (productId !== null) setTab('datos');
  }, [productId]);

  const refreshAll = () => {
    void invalidateStock(queryClient);
    queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
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
      imagenUrl.trim() !== (producto.ImagenUrl ?? ''));

  useEffect(() => {
    if (!producto || hydratedId !== producto.IDProducto) return;
    if (dirty) saveDraft(EDIT_DRAFT, { id: producto.IDProducto, nombre, descripcion, idCategoria, imagenUrl } satisfies EditDraft);
    else clearDraft(EDIT_DRAFT);
  }, [producto, hydratedId, dirty, nombre, descripcion, idCategoria, imagenUrl]);

  const requestClose = () => {
    if (confirmClose) return;
    if (dirty) setConfirmClose(true);
    else onClose();
  };

  const toggleFlag = async (flag: 'activo' | 'destacado', next: boolean) => {
    if (!producto || toggling) return;
    const key = queryKeys.adminProduct.detail(productId);
    const field = flag === 'activo' ? 'Activo' : 'Destacado';
    const previous = queryClient.getQueryData<ProductDetailResponse>(key);
    queryClient.setQueryData<ProductDetailResponse>(key, old => (old ? { ...old, producto: { ...old.producto, [field]: next } } : old));
    setToggling(flag);
    try {
      if (flag === 'activo') await catalogApi.updateProduct(producto.IDProducto, { activo: next });
      else await catalogApi.setFeatured(producto.IDProducto, next);
      toast.success(flag === 'activo' ? (next ? 'Producto visible en la tienda' : 'Producto oculto de la tienda') : next ? 'Producto destacado' : 'Producto sin destacar');
      refreshAll();
    } catch (err) {
      queryClient.setQueryData(key, previous);
      toast.error('No se pudo guardar el cambio', apiMessage(err, 'Intenta de nuevo.'));
    } finally {
      setToggling(null);
    }
  };

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
          ...(imagenUrl.trim() ? { imagenUrl: imagenUrl.trim() } : {}),
        });
      },
      'Producto actualizado',
      'No se pudo guardar el producto',
    );
    setSaving(false);
  };

  const storageAvailable = useStorageAvailable(producto?.IDProducto);
  const [newImage, setNewImage] = useState('');
  const [imageToDelete, setImageToDelete] = useState<number | null>(null);

  const addImage = async () => {
    const url = newImage.trim();
    if (!/^https?:\/\//i.test(url)) {
      toast.error('URL no válida');
      return;
    }
    if (producto && (await run(() => catalogApi.addProductImage(producto.IDProducto, { url }), 'Imagen agregada', 'No se pudo agregar la imagen'))) {
      setNewImage('');
    }
  };

  const [priceDraft, setPriceDraft] = useState<Record<number, string>>({});
  const [offer, setOffer] = useState<OfferDraft>(EMPTY_OFFER);
  const [offerTouched, setOfferTouched] = useState(false);
  const [savingOffer, setSavingOffer] = useState(false);
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
    if (v.PrecioReferencia != null && next >= Number(v.PrecioReferencia)) return;
    setPriceConfirm({ variant: v, next });
  };

  const priced = useMemo(() => {
    const active = variantes.filter(v => v.Activo);
    return active.length > 0 ? active : variantes;
  }, [variantes]);
  const basePrice = priced.length > 0 ? Math.min(...priced.map(v => Number(v.Precio))) : 0;
  const minBefore = priced.length > 0 ? Math.min(...priced.map(beforeOf)) : 0;
  const [rememberedAhora, setRememberedAhora] = useState<number | null>(null);
  const ahoraRemembered = rememberedAhora === productId;
  const multiPrice = new Set(priced.map(v => Number(v.Precio))).size > 1;
  const staleOffers = variantes.filter(v => v.PrecioReferencia != null && Number(v.PrecioReferencia) <= Number(v.Precio));

  const initialOffer = useMemo<OfferDraft>(() => {
    const withOffer = priced.filter(v => v.PrecioReferencia != null && Number(v.PrecioReferencia) > Number(v.Precio));
    if (withOffer.length === 0) return EMPTY_OFFER;
    if (ahoraRemembered) {
      const lowest = priced.reduce((lo, x) => (beforeOf(x) < beforeOf(lo) ? x : lo));
      const ahora = Number(lowest.Precio);
      return { mode: 'ahora', antes: '', ahora: String(ahora), pct: formatPct(pctOf(beforeOf(lowest), ahora)) };
    }
    const v = withOffer.reduce((lo, x) => (Number(x.Precio) < Number(lo.Precio) ? x : lo));
    const antes = Math.round(((Number(v.PrecioReferencia) * basePrice) / Number(v.Precio)) * 100) / 100;
    return { mode: 'antes', antes: String(antes), ahora: '', pct: String(pctFromBefore(antes, basePrice)) };
  }, [priced, basePrice, ahoraRemembered]);

  const offerKey = `${productId}:${ahoraRemembered}:` + variantes.map(v => `${v.IDVariante}:${v.Precio}:${v.PrecioReferencia ?? ''}`).join('|');
  const [offerSyncKey, setOfferSyncKey] = useState('');
  if (offerKey !== offerSyncKey) {
    setOfferSyncKey(offerKey);
    setOffer(initialOffer);
    setOfferTouched(false);
  }

  const offerDirty = offer.mode !== initialOffer.mode || offer.antes !== initialOffer.antes || offer.ahora !== initialOffer.ahora || offer.pct !== initialOffer.pct;
  const offerReference = offer.mode === 'ahora' ? minBefore : basePrice;
  const offerValid = isOfferComplete(offer) && offerError(offer, offerReference, true) === null;
  const antesChanges =
    offer.mode === 'antes' && offerValid
      ? variantes
          .map(v => ({ v, next: referenceFor(Number(v.Precio), basePrice, Number(offer.antes)) }))
          .filter(c => c.v.PrecioReferencia == null || Number(c.v.PrecioReferencia) !== c.next)
      : [];
  const showOfferSave = offer.mode === 'off' ? initialOffer.mode !== 'off' : offerDirty || antesChanges.length > 0;

  const clearReferences = () => Promise.all(variantes.filter(v => v.PrecioReferencia != null).map(v => catalogApi.setReferencePrice(v.IDVariante, null)));

  const clearStaleOffers = async () => {
    setSavingOffer(true);
    await run(clearReferences, 'Oferta quitada', 'No se pudo quitar la oferta');
    setSavingOffer(false);
  };

  const saveOffer = async () => {
    if (!producto) return;
    setOfferTouched(true);
    if (offer.mode !== 'off' && !offerValid) return;
    setSavingOffer(true);
    let ok: boolean;
    if (offer.mode === 'off') {
      ok = await run(
        () => (initialOffer.mode === 'ahora' ? catalogApi.removeOffer(producto.IDProducto) : clearReferences()),
        'Oferta quitada',
        'No se pudo quitar la oferta',
      );
      if (ok) setRememberedAhora(null);
    } else if (offer.mode === 'ahora') {
      ok = await run(
        () =>
          catalogApi.applyOffer(
            producto.IDProducto,
            variantes.map(v => ({ idVariante: v.IDVariante, precioAhora: nowFor(beforeOf(v), minBefore, Number(offer.ahora)) })),
          ),
        'Oferta guardada',
        'No se pudo guardar la oferta',
      );
      if (ok) setRememberedAhora(producto.IDProducto);
    } else {
      ok = await run(
        async () => {
          for (const c of antesChanges) await catalogApi.setReferencePrice(c.v.IDVariante, c.next);
        },
        'Oferta guardada',
        'No se pudo guardar la oferta',
      );
      if (ok) setRememberedAhora(null);
    }
    setSavingOffer(false);
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
      onClose={requestClose}
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
                  hint={producto.Activo ? 'Aparece en la tienda.' : 'No aparece en la tienda.'}
                  checked={producto.Activo}
                  disabled={toggling !== null}
                  onChange={next => void toggleFlag('activo', next)}
                />
                <Switch
                  label="Destacado"
                  checked={Boolean(producto.Destacado)}
                  disabled={toggling !== null}
                  onChange={next => void toggleFlag('destacado', next)}
                />
              </div>
              <Input label="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} />
              <CatalogReviewPanel nombre={nombre} descripcion={descripcion} idProducto={producto.IDProducto} onCategory={setIdCategoria} />
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
              <div>
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">Imagen principal</span>
                <CoverUploadField
                  key={producto.IDProducto}
                  productId={producto.IDProducto}
                  imageUrl={imagenUrl}
                  onUploaded={async ({ clave, urlPublica }) => {
                    await catalogApi.updateProduct(producto.IDProducto, { imagenClave: clave });
                    setImagenUrl(urlPublica);
                    toast.success('Imagen principal actualizada');
                    refreshAll();
                  }}
                >
                  <Input label="URL de la imagen" value={imagenUrl} onChange={e => setImagenUrl(e.target.value)} placeholder="https://…" />
                </CoverUploadField>
              </div>
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                {dirty && <span className="text-xs font-semibold text-amber-700" role="status">Cambios sin guardar</span>}
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
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-sm font-extrabold text-slate-900">Galería</h3>
                <p className="text-xs font-semibold tabular text-slate-500">{imagenes.length} de {MAX_IMAGES}</p>
              </div>
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
                <GalleryAddTile
                  key={producto.IDProducto}
                  productId={producto.IDProducto}
                  remaining={MAX_IMAGES - imagenes.length}
                  onUploaded={async ({ clave }) => {
                    await catalogApi.addProductImage(producto.IDProducto, { clave });
                    refreshAll();
                  }}
                  onFinished={n => toast.success(n === 1 ? 'Imagen agregada' : `${n} imágenes agregadas`)}
                />
              </ul>
              {imagenes.length === 0 && <p className="text-xs text-slate-500">Sin imágenes en la galería. La tienda muestra solo la imagen principal; si agregas fotos, la principal siempre va primero.</p>}
              <p className="text-xs text-slate-500">JPG, PNG o WebP. Se optimizan antes de subirlas (máx. 1600 px).</p>
              <ExternalUrlOption forceOpen={!storageAvailable}>
                <div className="flex items-end gap-3 rounded-2xl bg-canvas p-4">
                  <div className="flex-1">
                    <Input label="URL de la imagen" value={newImage} onChange={e => setNewImage(e.target.value)} placeholder="https://…" disabled={imagenes.length >= MAX_IMAGES} />
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
              </ExternalUrlOption>
            </div>
          )}

          {tab === 'variantes' && (
            <div className="space-y-6">
              <section className="space-y-3 rounded-2xl bg-canvas p-4" aria-label="Oferta">
                <p className="text-sm font-extrabold text-slate-900">Oferta</p>
                {staleOffers.length > 0 && (
                  <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                    <span>El precio antes de {staleOffers.map(v => v.SKU).join(', ')} ya no es mayor al precio actual, por eso no se muestra la oferta.</span>
                    <button type="button" onClick={clearStaleOffers} disabled={!online || savingOffer} className="h-8 rounded-full bg-amber-600 px-3 font-bold text-white hover:bg-amber-700 disabled:opacity-60">Quitar oferta</button>
                  </div>
                )}
                <OfferSection draft={offer} onChange={setOffer} price={basePrice} base={minBefore} multiPrice={multiPrice} showEmptyError={offerTouched} disabled={savingOffer} />
                {showOfferSave && (offer.mode !== 'off' || staleOffers.length === 0) && (
                  <div className="flex justify-end">
                    <button type="button" onClick={saveOffer} disabled={!online || savingOffer} title={offlineTitle} className="inline-flex h-10 items-center gap-2 rounded-full bg-brand px-5 text-sm font-bold text-white hover:bg-brand-hover disabled:opacity-60">
                      {savingOffer && <Loader2 className="h-4 w-4 animate-spin" />} {offer.mode !== 'off' ? 'Guardar oferta' : 'Quitar oferta'}
                    </button>
                  </div>
                )}
              </section>
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full min-w-[46rem] text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3">SKU / Atributos</th>
                      <th className="px-4 py-3">Precio</th>
                      <th className="px-4 py-3">Existencia</th>
                      <th className="px-4 py-3 text-right">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {variantes.map(v => {
                      const pct = discountPercent(v.PrecioReferencia, Number(v.Precio));
                      const priceVal = priceDraft[v.IDVariante] ?? String(v.Precio);
                      const refNow = v.PrecioReferencia != null ? Number(v.PrecioReferencia) : null;
                      const priceChanged = priceVal !== String(v.Precio);
                      const priceBlocked = priceChanged && refNow !== null && priceVal !== '' && Number(priceVal) >= refNow;
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
                              {priceChanged && (
                                <button type="button" onClick={() => savePrice(v)} disabled={!online || priceBlocked} title={offlineTitle} className="h-9 rounded-lg bg-brand px-3 text-xs font-bold text-white disabled:opacity-50 hover:bg-brand-hover">Guardar</button>
                              )}
                            </div>
                            {priceBlocked && (
                              <p role="alert" className="mt-1 max-w-[16rem] text-[11px] font-medium text-rose-600">
                                Debe ser menor al precio antes ({formatMoney(refNow)}). Cambia o quita la oferta primero.
                              </p>
                            )}
                            {pct > 0 && !priceChanged && <p className="mt-1 text-[11px] font-bold text-sale">Oferta -{pct}% · antes {formatMoney(refNow)}</p>}
                          </td>
                          <td className="px-4 py-3 align-top text-xs tabular">
                            <p><strong className="text-slate-900">{v.ExistenciaDisponible}</strong> disponibles</p>
                            <p className="text-slate-500">Existencia {v.ExistenciaFisica} · {v.UnidadesReservadas} apartadas</p>
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
        isOpen={confirmClose}
        onClose={() => setConfirmClose(false)}
        onConfirm={() => {
          setConfirmClose(false);
          clearDraft(EDIT_DRAFT);
          onClose();
        }}
        variant="primary"
        title="Tienes cambios sin guardar"
        consequence="Si sales, se pierden."
        confirmText="Descartar"
        cancelText="Seguir editando"
      />
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
