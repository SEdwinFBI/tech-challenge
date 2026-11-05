import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus';
import { Link, useNavigate } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, CreditCard, Loader2, Lock, MapPin, Plus, Trash2, TicketPercent, Truck } from 'lucide-react';
import { useCart } from '@/features/cart/hooks/useCart';
import { cartApi } from '@/features/cart/api/cartApi';
import { CouponDialog } from '@/features/cart/components/CouponDialog';
import { checkoutApi, type ConfirmOrderPayload } from '../api/checkoutApi';
import { AddressFormModal, hasAddressDraft } from '../components/AddressFormModal';
import { OrderSummary } from '../components/OrderSummary';
import { ConfirmDialog, ErrorState, Illustration, ReservationCountdown, Stepper } from '@/shared/ui';
import { toast } from '@/shared/ui/toastStore';
import { clearDraft, readDraft, saveDraft } from '@/shared/lib/draft';
import { formatMoney } from '@/shared/lib/formatters';
import { quoteShipping } from '@/shared/lib/pricing';
import { formatPhone } from '@/shared/lib/phone';
import type { Address } from '@/shared/types/domain';
import { apiErrorMessage, errorCode } from '@/shared/lib/apiErrors';

type Step = 0 | 1;

const CHECKOUT_DRAFT = 'checkout';

interface CheckoutDraft {
  step: Step;
  selectedId: number | null;
  reservation: { key: number; expiresAt: string; durationMs?: number } | null;
  idempotencyKey: string;
}

// Recuerda paso y dirección al recargar; la reserva solo si sigue vigente
function loadCheckoutDraft(): CheckoutDraft | null {
  const d = readDraft<CheckoutDraft>(CHECKOUT_DRAFT);
  if (!d) return null;
  const vigente = d.reservation && new Date(d.reservation.expiresAt).getTime() > Date.now();
  return vigente ? d : { ...d, step: 0, reservation: null };
}

export const CheckoutPage: React.FC = () => {
  const online = useOnlineStatus();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { cart, isLoading: cartLoading, isError: cartError, refetch: refetchCart, removeCoupon, isRemovingCoupon } = useCart();

  // El id del carrito debe ser el vigente del servidor, no el de caché
  useEffect(() => {
    refetchCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addressesQuery = useQuery({ queryKey: ['addresses'], queryFn: checkoutApi.getAddresses });
  const addresses = addressesQuery.data ?? [];

  const [saved] = useState(loadCheckoutDraft);
  const [step, setStep] = useState<Step>(saved?.step ?? 0);
  const [selectedId, setSelectedId] = useState<number | null>(saved?.selectedId ?? null);
  const [addressModal, setAddressModal] = useState(hasAddressDraft);
  const [couponModal, setCouponModal] = useState(false);
  const [toDelete, setToDelete] = useState<Address | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [reserving, setReserving] = useState(false);
  const [reservation, setReservation] = useState<CheckoutDraft['reservation']>(saved?.reservation ?? null);
  const [expired, setExpired] = useState(false);

  // Una clave por visita: los reintentos no duplican pedido ni cobro
  const idempotencyKey = useRef<string>(saved?.idempotencyKey ?? crypto.randomUUID());
  const [paying, setPaying] = useState(false);
  const [simulacion, setSimulacion] = useState<NonNullable<ConfirmOrderPayload['simulacionPago']>>('APROBADO');
  const [reconciling, setReconciling] = useState(false);

  useEffect(() => {
    if (addresses.length === 0) return;
    // Dirección guardada si sigue existiendo; si no, la predeterminada
    if (selectedId === null || !addresses.some(a => a.IDDireccion === selectedId)) {
      setSelectedId((addresses.find(a => a.Predeterminada) ?? addresses[0]).IDDireccion);
    }
  }, [addresses, selectedId]);

  useEffect(() => {
    saveDraft(CHECKOUT_DRAFT, { step, selectedId, reservation, idempotencyKey: idempotencyKey.current } satisfies CheckoutDraft);
  }, [step, selectedId, reservation]);

  const selected = addresses.find(a => a.IDDireccion === selectedId) ?? null;
  const items = cart?.items ?? [];

  const netSubtotal = Math.max(0, (cart?.subtotal ?? 0) - (cart?.descuento ?? 0));
  const shipping = useMemo(() => (selected ? quoteShipping(netSubtotal, selected) : null), [selected, netSubtotal]);
  const total = netSubtotal + (shipping?.cost ?? 0);
  const overLimit = items.some(i => i.Cantidad > i.ExistenciaDisponible);

  const setAddresses = (list: Address[]) => queryClient.setQueryData(['addresses'], list);

  const reserve = async () => {
    let cartId = cart?.idCarrito;
    if (!cartId) {
      try {
        cartId = (await cartApi.getCart()).idCarrito;
      } catch {
        /* se informa abajo */
      }
    }
    if (!cartId) {
      toast.error('No se encontró tu carrito');
      return;
    }
    if (!selected) {
      toast.warning('Elige una dirección');
      return;
    }
    setReserving(true);
    try {
      const r = await checkoutApi.reserveStock(cartId);
      setReservation({ key: Date.now(), expiresAt: r.expiraEn, durationMs: r.duracionMs });
      setExpired(false);
      setStep(1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast.success('Existencia apartada');
    } catch (err: unknown) {
      const msg =
        apiErrorMessage(err, 'Sin existencia suficiente.');
      toast.error('No se pudo apartar', msg);
      refetchCart();
    } finally {
      setReserving(false);
    }
  };

  const pay = async () => {
    if (paying || !cart?.idCarrito || !selected) return;
    if (expired) {
      toast.error('Reserva vencida');
      return;
    }
    setPaying(true);
    try {
      const result = await checkoutApi.confirmOrder({
        idCarrito: cart.idCarrito,
        idDireccion: selected.IDDireccion,
        claveIdempotencia: idempotencyKey.current,
        ...(import.meta.env.DEV && simulacion !== 'APROBADO' ? { simulacionPago: simulacion } : {}),
      });
      clearDraft(CHECKOUT_DRAFT);
      await queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      navigate(`/pedido/${result.idPedido}/confirmado`, { replace: true });
    } catch (err: unknown) {
      const msg =
        apiErrorMessage(err, 'No se procesó el pago. No hubo cobro.');
      if (errorCode(err) === 'PAGO_EN_CONCILIACION') {
        setReconciling(true);
        setPaying(false);
        toast.warning('Estamos confirmando tu pago', msg);
        return;
      }
      toast.error('No se completó la compra', msg);
      setPaying(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      setAddresses(await checkoutApi.deleteAddress(toDelete.IDDireccion));
      toast.success('Dirección eliminada');
      setToDelete(null);
    } catch {
      toast.error('No se pudo eliminar la dirección');
    } finally {
      setDeleting(false);
    }
  };

  if (cartLoading || addressesQuery.isLoading) {
    return (
      <div className="mx-auto grid max-w-6xl animate-pulse gap-8 px-4 py-8 lg:grid-cols-[1fr_24rem]" aria-busy="true">
        <div className="space-y-4">
          <div className="h-6 w-1/3 rounded bg-slate-200/70" />
          <div className="h-28 rounded-2xl bg-slate-200/70" />
          <div className="h-28 rounded-2xl bg-slate-200/70" />
        </div>
        <div className="h-96 rounded-3xl bg-slate-200/70" />
      </div>
    );
  }

  if ((cartError && !cart) || addressesQuery.isError) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <ErrorState
          title="Error al cargar el pago"
          onRetry={() => {
            refetchCart();
            addressesQuery.refetch();
          }}
        />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
        <Illustration name="cart" />
        <h1 className="mt-4 text-xl font-extrabold text-slate-900">Tu carrito está vacío</h1>
        <Link to="/catalogo" className="mt-6 inline-flex h-12 items-center rounded-full bg-cta px-7 text-sm font-extrabold text-cta-fg hover:bg-cta-hover">
          Ver productos
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_24rem] lg:py-10">
      <div className="min-w-0">
        <Stepper steps={['Entrega', 'Pago', 'Confirmación']} current={step} className="mb-6 flex-wrap" />

        {step === 0 && (
          <div className="space-y-8 animate-fade-up">
            <section aria-labelledby="h-entrega">
              <div className="mb-3 flex items-center justify-between">
                <h1 id="h-entrega" className="text-xl font-extrabold text-slate-900 sm:text-2xl">Dirección de entrega</h1>
              </div>

              {addresses.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center">
                  <MapPin className="mx-auto h-8 w-8 text-slate-400" />
                  <p className="mt-2 text-sm font-semibold text-slate-700">Sin direcciones guardadas.</p>
                  <button type="button" onClick={() => setAddressModal(true)} className="mt-4 h-11 rounded-full bg-cta px-6 text-sm font-extrabold text-cta-fg hover:bg-cta-hover">
                    Agregar dirección
                  </button>
                </div>
              ) : (
                <div role="radiogroup" aria-label="Dirección de entrega" className="space-y-3">
                  {addresses.map(a => {
                    const active = a.IDDireccion === selectedId;
                    return (
                      <div
                        key={a.IDDireccion}
                        className={`flex gap-3 rounded-2xl border-2 p-4 transition ${active ? 'border-brand bg-brand-soft/60' : 'border-slate-200 hover:border-slate-300'}`}
                      >
                        <label className="flex min-w-0 flex-1 cursor-pointer gap-3">
                          <input
                            type="radio"
                            name="direccion"
                            checked={active}
                            onChange={() => setSelectedId(a.IDDireccion)}
                            className="mt-1 h-4 w-4 accent-[var(--color-brand)]"
                          />
                          <span className="min-w-0">
                            <span className="flex flex-wrap items-center gap-2">
                              <strong className="text-sm text-slate-900">{a.Etiqueta}</strong>
                              {a.Predeterminada && (
                                <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-bold text-brand">Predeterminada</span>
                              )}
                              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-slate-500 ring-1 ring-slate-200">
                                {a.Municipio}, {a.Departamento}
                              </span>
                            </span>
                            <span className="mt-1 block text-sm text-slate-600">{a.DireccionExacta}</span>
                            <span className="block text-xs text-slate-500">Tel. {formatPhone(a.TelefonoContacto)}</span>
                          </span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setToDelete(a)}
                          aria-label={`Eliminar la dirección ${a.Etiqueta}`}
                          className="h-9 w-9 shrink-0 rounded-full text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="mx-auto h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setAddressModal(true)}
                    className="inline-flex items-center gap-2 text-sm font-bold text-brand hover:underline"
                  >
                    <Plus className="h-4 w-4" /> Agregar dirección
                  </button>
                </div>
              )}
            </section>

            {selected && shipping && (
              <section aria-labelledby="h-envio">
                <h2 id="h-envio" className="mb-3 text-lg font-extrabold text-slate-900">Envío</h2>
                <div className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4">
                  <Truck className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                  <div className="text-sm">
                    <p className="font-bold text-slate-900">
                      Envío a {selected.Departamento}: {shipping.free ? <span className="text-emerald-700">GRATIS</span> : formatMoney(shipping.cost)}
                    </p>
                    <p className="mt-0.5 text-slate-500">
                      {shipping.free
                        ? ''
                        : shipping.freeFrom != null
                          ? `Te faltan ${formatMoney(Math.max(0, shipping.freeFrom - netSubtotal))} para envío gratis.`
                          : 'Tarifa fija para tu departamento.'}
                    </p>
                  </div>
                </div>
              </section>
            )}

            <section aria-labelledby="h-cupon">
              <h2 id="h-cupon" className="sr-only">Cupón</h2>
              {cart?.cupon ? (
                <div className="flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-3">
                  <p className="flex items-center gap-2 text-sm font-bold text-emerald-800">
                    <TicketPercent className="h-4 w-4" /> Cupón {cart.cupon.codigo} aplicado
                  </p>
                  <button type="button" onClick={() => removeCoupon()} disabled={isRemovingCoupon} className="text-xs font-extrabold text-emerald-800 underline disabled:opacity-50">
                    Quitar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setCouponModal(true)}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-300 px-4 py-3.5 text-sm font-bold text-slate-800 transition hover:border-brand"
                >
                  <span className="flex items-center gap-2"><TicketPercent className="h-4 w-4 text-brand" /> Aplicar cupón</span>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </button>
              )}
            </section>

            {overLimit && (
              <p className="rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">
                Algunos productos superan la existencia. <Link to="/carrito" className="underline">Ajustar cantidades</Link>
              </p>
            )}

            <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Link to="/carrito" className="inline-flex items-center justify-center gap-2 text-sm font-bold text-slate-600 hover:text-brand">
                <ArrowLeft className="h-4 w-4" /> Volver al carrito
              </Link>
              <button
                type="button"
                onClick={reserve}
                disabled={!selected || reserving || overLimit || !online}
                title={online ? undefined : 'Sin conexión'}
                className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-cta px-8 text-base font-extrabold text-cta-fg shadow-lift transition hover:bg-cta-hover active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {reserving ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                Continuar al pago <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {step === 1 && reservation && (
          <div className="space-y-6 animate-fade-up">
            <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">Pago</h1>

            <ReservationCountdown startKey={reservation.key} expiresAt={reservation.expiresAt} durationMs={reservation.durationMs} onExpire={() => setExpired(true)} />

            {selected && (
              <div className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 p-4">
                <div className="text-sm">
                  <p className="font-extrabold text-slate-900">Entrega a {selected.Etiqueta}</p>
                  <p className="text-slate-600">{selected.DireccionExacta}</p>
                  <p className="text-xs text-slate-500">{selected.Municipio}, {selected.Departamento} · {formatPhone(selected.TelefonoContacto)}</p>
                </div>
                <button type="button" onClick={() => setStep(0)} className="shrink-0 text-xs font-extrabold text-brand underline">Cambiar</button>
              </div>
            )}

            <section aria-labelledby="h-pago">
              <h2 id="h-pago" className="mb-3 text-lg font-extrabold text-slate-900">Método de pago</h2>
              <div className="rounded-2xl border-2 border-brand bg-brand-soft/50 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-14 items-center justify-center rounded-lg bg-slate-900 text-white"><CreditCard className="h-5 w-5" /></span>
                  <div className="text-sm">
                    <p className="font-bold text-slate-900">Tarjeta de débito o crédito</p>
                    <p className="font-mono text-xs tracking-widest text-slate-500">•••• •••• •••• 4242</p>
                  </div>
                </div>
              </div>
              {import.meta.env.DEV && (
                <label className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-dashed border-slate-300 p-3 text-xs text-slate-600">
                  <span><strong className="text-slate-800">Modo de prueba:</strong> simular pago</span>
                  <select value={simulacion} onChange={e => setSimulacion(e.target.value as typeof simulacion)} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs">
                    <option value="APROBADO">Aprobado</option>
                    <option value="RECHAZADO">Rechazado</option>
                    <option value="ERROR_TRAS_COBRO">Error tras el cobro</option>
                    <option value="TIMEOUT">Sin respuesta</option>
                  </select>
                </label>
              )}
            </section>

            {reconciling && (
              <div role="alert" className="rounded-2xl bg-amber-50 p-4">
                <p className="text-sm font-bold text-amber-900">Estamos confirmando tu pago.</p>
                <p className="mt-1 text-sm text-amber-800">Revisa Mis pedidos en unos minutos; no vuelvas a pagar.</p>
                <Link to="/cuenta/pedidos" className="mt-3 inline-flex text-sm font-extrabold text-amber-900 underline">Ir a Mis pedidos</Link>
              </div>
            )}

            {expired && (
              <div className="rounded-2xl bg-rose-50 p-4">
                <p className="text-sm font-bold text-rose-800">Reserva vencida</p>
                <button
                  type="button"
                  onClick={reserve}
                  disabled={reserving}
                  className="mt-3 inline-flex h-11 items-center gap-2 rounded-full bg-rose-600 px-6 text-sm font-extrabold text-white hover:bg-rose-700 disabled:opacity-60"
                >
                  {reserving && <Loader2 className="h-4 w-4 animate-spin" />} Reservar de nuevo
                </button>
              </div>
            )}

            <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button type="button" onClick={() => setStep(0)} disabled={paying} className="inline-flex items-center justify-center gap-2 text-sm font-bold text-slate-600 hover:text-brand disabled:opacity-50">
                <ArrowLeft className="h-4 w-4" /> Atrás
              </button>
              <button
                type="button"
                onClick={pay}
                disabled={paying || expired || reconciling || !online}
                title={online ? undefined : 'Sin conexión'}
                aria-busy={paying}
                className="inline-flex h-14 min-w-64 items-center justify-center gap-2 rounded-full bg-cta px-8 text-base font-extrabold text-cta-fg shadow-lift transition hover:bg-cta-hover active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {paying ? <Loader2 className="h-5 w-5 animate-spin" /> : <Lock className="h-5 w-5" />}
                {paying ? 'Procesando…' : `Finalizar compra · ${formatMoney(total)}`}
              </button>
            </div>
          </div>
        )}
      </div>

      {cart && <OrderSummary cart={cart} shipping={shipping} total={total} />}

      <AddressFormModal isOpen={addressModal} onClose={() => setAddressModal(false)} onSaved={list => {
        setAddresses(list);
        const nueva = list.find(a => !addresses.some(prev => prev.IDDireccion === a.IDDireccion));
        if (nueva) setSelectedId(nueva.IDDireccion);
      }} />
      <CouponDialog isOpen={couponModal} onClose={() => setCouponModal(false)} />
      <ConfirmDialog
        isOpen={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Eliminar dirección"
        consequence="No se podrá usar en nuevos pedidos."
        confirmText="Eliminar"
      />
    </div>
  );
};
