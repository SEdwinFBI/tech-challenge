import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Phone, Plus, Star, Trash2 } from 'lucide-react';
import { checkoutApi } from '../api/checkoutApi';
import { AddressFormModal, hasAddressDraft } from '../components/AddressFormModal';
import { ConfirmDialog, ErrorState } from '@/shared/ui';
import { toast } from '@/shared/ui/toastStore';
import { formatMoney } from '@/shared/lib/formatters';
import { queryKeys } from '@/shared/lib/queryKeys';
import { addressesQueryOptions } from '../queries';
import { formatPhone } from '@/shared/lib/phone';
import type { Address } from '@/shared/types/domain';

export const MyAddressesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: addresses = [], isLoading, isError, refetch } = useQuery(addressesQueryOptions());
  const [modal, setModal] = useState(hasAddressDraft);
  const [toDelete, setToDelete] = useState<Address | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [marking, setMarking] = useState<number | null>(null);

  const markDefault = async (a: Address) => {
    setMarking(a.IDDireccion);
    try {
      queryClient.setQueryData(queryKeys.addresses.all, await checkoutApi.setDefaultAddress(a.IDDireccion));
      toast.success('Dirección predeterminada actualizada');
    } catch {
      toast.error('No se pudo marcar como predeterminada');
    } finally {
      setMarking(null);
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      queryClient.setQueryData(queryKeys.addresses.all, await checkoutApi.deleteAddress(toDelete.IDDireccion));
      toast.success('Dirección eliminada');
      setToDelete(null);
    } catch {
      toast.error('No se pudo eliminar la dirección');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="animate-fade-up">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Direcciones de envío</h1>
        </div>
        <button
          type="button"
          onClick={() => setModal(true)}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-cta px-5 text-sm font-extrabold text-cta-fg hover:bg-cta-hover"
        >
          <Plus className="h-4 w-4" /> Agregar dirección
        </button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2" aria-busy="true">{[0, 1].map(i => <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-200/70" />)}</div>
      ) : isError ? (
        <ErrorState title="Error al cargar direcciones" onRetry={() => refetch()} />
      ) : addresses.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl bg-canvas px-6 py-14 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-brand shadow-card"><MapPin className="h-8 w-8" /></span>
          <h2 className="mt-4 text-lg font-extrabold text-slate-900">Sin direcciones</h2>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {addresses.map(a => (
            <li key={a.IDDireccion} className="flex flex-col rounded-2xl border border-slate-200 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="flex flex-wrap items-center gap-2 text-sm font-extrabold text-slate-900">
                    {a.Etiqueta}
                    {a.Predeterminada && (
                      <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-bold text-brand">Predeterminada</span>
                    )}
                  </p>
                  <p className="text-xs font-semibold text-brand">{a.Municipio}, {a.Departamento}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setToDelete(a)}
                  aria-label={`Eliminar la dirección ${a.Etiqueta}`}
                  className="h-9 w-9 rounded-full text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 className="mx-auto h-4 w-4" />
                </button>
              </div>
              <p className="mt-3 flex-1 text-sm text-slate-600">{a.DireccionExacta}</p>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500"><Phone className="h-3.5 w-3.5" /> {formatPhone(a.TelefonoContacto)}</p>
              {!a.Predeterminada && (
                <button
                  type="button"
                  onClick={() => markDefault(a)}
                  disabled={marking !== null}
                  className="mt-3 inline-flex items-center gap-1.5 self-start text-xs font-bold text-brand hover:underline disabled:opacity-60"
                >
                  <Star className="h-3.5 w-3.5" /> Marcar como predeterminada
                </button>
              )}
              {a.CostoEnvio != null && (
                <p className="mt-2 rounded-lg bg-canvas px-3 py-1.5 text-xs font-semibold text-slate-600">
                  Envío {formatMoney(a.CostoEnvio)}
                  {a.MontoMinimoEnvioGratis != null && <> · gratis desde {formatMoney(a.MontoMinimoEnvioGratis)}</>}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <AddressFormModal isOpen={modal} onClose={() => setModal(false)} onSaved={list => queryClient.setQueryData(queryKeys.addresses.all, list)} />
      <ConfirmDialog
        isOpen={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        loading={deleting}
        title="Eliminar dirección"
        consequence="No se podrá usar en nuevos pedidos."
        confirmText="Eliminar"
      />
    </div>
  );
};
