import React, { useEffect, useId, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Modal } from '@/shared/ui/Modal';
import { apiErrorMessage } from '@/shared/lib/apiErrors';
import { clearDraft, readDraft, saveDraft } from '@/shared/lib/draft';
import { toast } from '@/shared/ui/toastStore';
import { formatMoney } from '@/shared/lib/formatters';
import type { Address } from '@/shared/types/domain';
import { checkoutApi } from '../api/checkoutApi';
import { queryKeys } from '@/shared/lib/queryKeys';

export interface AddressFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (addresses: Address[]) => void;
}

export const ADDRESS_DRAFT = 'address-form';

interface AddressDraft {
  path: string;
  etiqueta: string;
  departamento: string;
  idMunicipio: number | '';
  direccion: string;
  telefono: string;
}

/** Hay una dirección a medias en esta pantalla. */
export const hasAddressDraft = (): boolean => readDraft<AddressDraft>(ADDRESS_DRAFT)?.path === window.location.pathname;

const LABELS = ['Casa', 'Oficina', 'Otro'];
const field =
  'h-12 w-full rounded-xl border bg-white px-3.5 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20';

export const AddressFormModal: React.FC<AddressFormModalProps> = ({ isOpen, onClose, onSaved }) => {
  const { data: municipalities = [], isLoading } = useQuery({
    queryKey: queryKeys.municipalities.all,
    queryFn: checkoutApi.getMunicipalities,
    staleTime: 30 * 60_000,
    gcTime: 30 * 60_000,
  });

  const [etiqueta, setEtiqueta] = useState('Casa');
  const [departamento, setDepartamento] = useState('');
  const [idMunicipio, setIdMunicipio] = useState<number | ''>('');
  const [direccion, setDireccion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [restored, setRestored] = useState(false);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [predeterminada, setPredeterminada] = useState(false);
  const uid = useId();
  const ids = { depto: `${uid}-depto`, muni: `${uid}-muni`, dir: `${uid}-dir`, tel: `${uid}-tel` };

  const departamentos = useMemo(() => [...new Set(municipalities.map(m => m.Departamento))].sort(), [municipalities]);
  const municipiosDelDepto = useMemo(
    () => municipalities.filter(m => m.Departamento === departamento).sort((a, b) => a.Municipio.localeCompare(b.Municipio)),
    [municipalities, departamento],
  );
  const selected = municipalities.find(m => m.IDMunicipio === idMunicipio);

  useEffect(() => {
    if (!isOpen) {
      setRestored(false);
      return;
    }
    const d = readDraft<AddressDraft>(ADDRESS_DRAFT);
    setEtiqueta(d?.etiqueta ?? 'Casa');
    setDireccion(d?.direccion ?? '');
    setTelefono(d?.telefono ?? '');
    setTouched(false);
    setPredeterminada(false);
    setIdMunicipio(d?.idMunicipio ?? '');
    setDepartamento(d?.departamento ?? '');
    setRestored(true);
  }, [isOpen]);

  // Guarda lo escrito por si caduca la sesión a medio formulario
  useEffect(() => {
    if (!isOpen || !restored) return;
    saveDraft(ADDRESS_DRAFT, { path: window.location.pathname, etiqueta, departamento, idMunicipio, direccion, telefono } satisfies AddressDraft);
  }, [isOpen, restored, etiqueta, departamento, idMunicipio, direccion, telefono]);

  const close = () => {
    clearDraft(ADDRESS_DRAFT);
    onClose();
  };

  const errors = {
    departamento: !departamento ? 'Requerido.' : '',
    municipio: !idMunicipio ? 'Requerido.' : '',
    direccion: direccion.trim().length < 5 ? 'Mínimo 5 caracteres.' : '',
    telefono: telefono.replace(/\D/g, '').length < 8 ? 'Debe tener 8 dígitos.' : '',
  };
  const hasErrors = Object.values(errors).some(Boolean);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (hasErrors || !idMunicipio) return;
    setSaving(true);
    try {
      const updated = await checkoutApi.createAddress({
        etiqueta,
        idMunicipio: Number(idMunicipio),
        direccionExacta: direccion.trim(),
        telefonoContacto: telefono.replace(/\D/g, ''),
        predeterminada,
      });
      onSaved(updated);
      toast.success('Dirección guardada');
      close();
    } catch (err: unknown) {
      const msg = apiErrorMessage(err, '');
      toast.error('No se pudo guardar la dirección', msg);
    } finally {
      setSaving(false);
    }
  };

  const err = (k: keyof typeof errors) =>
    touched && errors[k] ? <p className="mt-1 text-xs font-semibold text-rose-600" role="alert">{errors[k]}</p> : null;
  const border = (k: keyof typeof errors) => (touched && errors[k] ? 'border-rose-400' : 'border-slate-300');

  return (
    <Modal isOpen={isOpen} onClose={close} title="Nueva dirección" maxWidth="lg">
      <form onSubmit={submit} noValidate className="space-y-4">
        <fieldset>
          <legend className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-600">Etiqueta</legend>
          <div className="flex gap-2">
            {LABELS.map(l => (
              <button
                key={l}
                type="button"
                aria-pressed={etiqueta === l}
                onClick={() => setEtiqueta(l)}
                className={`h-10 rounded-full border-2 px-5 text-sm font-bold transition ${
                  etiqueta === l ? 'border-brand bg-brand-soft text-brand' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="block">
            <label htmlFor={ids.depto} className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600">Departamento *</label>
            <select
              id={ids.depto}
              aria-required="true"
              value={departamento}
              onChange={e => {
                setDepartamento(e.target.value);
                setIdMunicipio('');
              }}
              disabled={isLoading}
              className={`${field} ${border('departamento')}`}
            >
              <option value="">{isLoading ? 'Cargando…' : 'Selecciona'}</option>
              {departamentos.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            {err('departamento')}
          </div>
          <div className="block">
            <label htmlFor={ids.muni} className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600">Municipio *</label>
            <select
              id={ids.muni}
              aria-required="true"
              value={idMunicipio}
              onChange={e => setIdMunicipio(e.target.value ? Number(e.target.value) : '')}
              disabled={!departamento}
              className={`${field} ${border('municipio')} disabled:bg-slate-100`}
            >
              <option value="">Selecciona</option>
              {municipiosDelDepto.map(m => <option key={m.IDMunicipio} value={m.IDMunicipio}>{m.Municipio}</option>)}
            </select>
            {err('municipio')}
          </div>
        </div>

        {selected && (
          <p className="rounded-xl bg-brand-soft px-3 py-2 text-xs font-semibold text-brand">
            Envío a {selected.Departamento}: {formatMoney(selected.CostoEnvio)}
            {selected.MontoMinimoEnvioGratis != null && <> · gratis desde {formatMoney(selected.MontoMinimoEnvioGratis)}</>}
          </p>
        )}

        <div className="block">
          <label htmlFor={ids.dir} className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600">Dirección exacta *</label>
          <textarea
            id={ids.dir}
            aria-required="true"
            value={direccion}
            onChange={e => setDireccion(e.target.value)}
            rows={3}
            className={`${field} h-auto py-3 ${border('direccion')}`}
          />
          {err('direccion')}
        </div>

        <div className="block">
          <label htmlFor={ids.tel} className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600">Teléfono *</label>
          <div className="flex">
            <span className="flex h-12 items-center rounded-l-xl border border-r-0 border-slate-300 bg-slate-50 px-3 text-sm font-bold text-slate-600">+502</span>
            <input
              id={ids.tel}
              aria-required="true"
              inputMode="numeric"
              value={telefono}
              onChange={e => setTelefono(e.target.value.replace(/[^\d ]/g, ''))}
              placeholder="5555 1234"
              maxLength={9}
              className={`${field} rounded-l-none ${border('telefono')}`}
            />
          </div>
          {err('telefono')}
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={predeterminada}
            onChange={e => setPredeterminada(e.target.checked)}
            className="h-4 w-4 accent-[var(--color-brand)]"
          />
          Usar como predeterminada
        </label>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-cta text-sm font-extrabold text-cta-fg transition hover:bg-cta-hover disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Guardar
        </button>
      </form>
    </Modal>
  );
};
