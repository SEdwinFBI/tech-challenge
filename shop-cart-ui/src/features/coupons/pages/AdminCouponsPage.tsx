import React, { useEffect, useMemo, useState } from 'react';
import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus';
import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { couponsApi, CouponPayload, type CouponSortColumn, type CouponValidity } from '../api/couponsApi';
import { useCategories } from '@/features/catalog/hooks/useCatalog';
import { formatMoney, formatDateTime } from '@/shared/lib/formatters';
import { apiErrorMessage } from '@/shared/lib/apiErrors';
import { clearDraft, readDraft, saveDraft } from '@/shared/lib/draft';
import { useSort } from '@/shared/hooks/useSort';
import { useColumnFilters } from '@/shared/hooks/useColumnFilters';
import type { FilterDef } from '@/shared/lib/columnFilters';
import type { Coupon } from '@/shared/types/domain';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableMessageRow,
  SortableHead,
  FilterableHead,
  FilterChips,
  Button,
  ConfirmDialog,
  Modal,
  Input,
  Select,
  Badge,
  PageHeader,
  TableRowsSkeleton,
  EmptyState,
  ErrorState,
} from '@/shared/ui';
import { Plus, Pencil } from 'lucide-react';
import { toast } from '@/shared/ui/toastStore';

const COUPON_DRAFT = 'coupon-form';

const FILTROS = ['q', 'activo', 'vigencia'] as const;
const DEFS: Record<'q' | 'activo' | 'vigencia', FilterDef> = {
  q: { type: 'texto', key: 'q', label: 'Código', placeholder: 'Código del cupón' },
  activo: {
    type: 'opciones',
    key: 'activo',
    label: 'Estado',
    options: [
      { value: 'true', label: 'Activo' },
      { value: 'false', label: 'Inactivo' },
    ],
  },
  vigencia: {
    type: 'opciones',
    key: 'vigencia',
    label: 'Vigencia',
    options: [
      { value: 'VIGENTE', label: 'Vigente' },
      { value: 'VENCIDO', label: 'Vencido' },
      { value: 'POR_INICIAR', label: 'Por iniciar' },
    ],
  },
};

interface CouponForm {
  codigo: string;
  tipoDescuento: 'PORCENTAJE' | 'MONTO_FIJO';
  valor: number;
  montoMinimo: number;
  limiteTotal: number;
  limitePorCliente: number;
  idCatAplica: string;
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
}

interface CouponDraft {
  editingId: number | null;
  form: CouponForm;
}

// Fecha local para input date (yyyy-mm-dd)
const toInputDate = (d: Date): string => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const emptyForm = (): CouponForm => ({
  codigo: '',
  tipoDescuento: 'PORCENTAJE',
  valor: 10,
  montoMinimo: 100,
  limiteTotal: 50,
  limitePorCliente: 1,
  idCatAplica: '',
  fechaInicio: toInputDate(new Date()),
  fechaFin: toInputDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
  activo: true,
});

const formFromCoupon = (c: Coupon): CouponForm => ({
  codigo: c.Codigo,
  tipoDescuento: c.TipoDescuento,
  valor: c.Valor,
  montoMinimo: c.MontoMinimoCompra,
  limiteTotal: c.LimiteTotalUsos,
  limitePorCliente: c.LimiteUsosPorCliente,
  idCatAplica: c.IDCategoriaAplica ? String(c.IDCategoriaAplica) : '',
  fechaInicio: toInputDate(new Date(c.FechaInicio)),
  fechaFin: toInputDate(new Date(c.FechaFin)),
  activo: Boolean(c.Activo),
});

const toPayload = (f: CouponForm): CouponPayload => ({
  codigo: f.codigo.trim().toUpperCase(),
  tipoDescuento: f.tipoDescuento,
  valor: f.valor,
  montoMinimoCompra: f.montoMinimo,
  limiteTotalUsos: f.limiteTotal,
  limiteUsosPorCliente: f.limitePorCliente,
  idCategoriaAplica: f.idCatAplica ? Number(f.idCatAplica) : null,
  fechaInicio: new Date(`${f.fechaInicio}T00:00:00`).toISOString(),
  fechaFin: new Date(`${f.fechaFin}T23:59:59`).toISOString(),
  activo: f.activo,
});

export const AdminCouponsPage: React.FC = () => {
  const online = useOnlineStatus();
  const queryClient = useQueryClient();
  const { sort, toggle } = useSort<CouponSortColumn>({ orden: 'fecha', direccion: 'desc' });
  const { values: f, patch, clearAll, anyActive } = useColumnFilters(FILTROS);

  // Si caducó la sesión, reabre el formulario con lo escrito
  const [draft] = useState(() => readDraft<CouponDraft>(COUPON_DRAFT));
  const [isModalOpen, setIsModalOpen] = useState(draft !== null);
  const [editingCouponId, setEditingCouponId] = useState<number | null>(draft?.editingId ?? null);
  const [form, setForm] = useState<CouponForm>(draft?.form ?? emptyForm());
  const [toDeactivate, setToDeactivate] = useState<Coupon | null>(null);

  const set = <K extends keyof CouponForm>(key: K, value: CouponForm[K]) => setForm(f => ({ ...f, [key]: value }));

  useEffect(() => {
    if (isModalOpen) saveDraft(COUPON_DRAFT, { editingId: editingCouponId, form } satisfies CouponDraft);
  }, [isModalOpen, editingCouponId, form]);

  const { data: coupons = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-coupons', sort.orden, sort.direccion, f],
    queryFn: () =>
      couponsApi.getCoupons(sort, {
        q: f.q.trim() || undefined,
        activo: f.activo === '' ? undefined : f.activo === 'true',
        vigencia: (f.vigencia || undefined) as CouponValidity | undefined,
      }),
    placeholderData: keepPreviousData,
  });

  const { data: categories = [] } = useCategories();
  const categoryName = useMemo(() => new Map(categories.map(c => [c.IDCategoria, c.Nombre])), [categories]);

  const closeModal = () => {
    clearDraft(COUPON_DRAFT);
    setIsModalOpen(false);
  };

  const openNew = () => {
    setEditingCouponId(null);
    setForm(emptyForm());
    setIsModalOpen(true);
  };

  const openEdit = (c: Coupon) => {
    setEditingCouponId(c.IDCupon);
    setForm(formFromCoupon(c));
    setIsModalOpen(true);
  };

  const onError = (err: unknown) =>
    toast.error(apiErrorMessage(err, 'Revisa fechas y porcentaje.', { DUPLICATE_KEY: 'Ya existe un cupón con ese código.' }));

  const saveMutation = useMutation({
    mutationFn: (payload: CouponPayload) =>
      editingCouponId ? couponsApi.updateCoupon(editingCouponId, payload) : couponsApi.createCoupon(payload),
    onSuccess: () => {
      toast.success(editingCouponId ? 'Cupón actualizado' : 'Cupón creado');
      closeModal();
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
    },
    onError,
  });

  const statusMutation = useMutation({
    mutationFn: ({ coupon, activo }: { coupon: Coupon; activo: boolean }) =>
      couponsApi.updateCoupon(coupon.IDCupon, { ...toPayload(formFromCoupon(coupon)), activo }),
    onSuccess: (_d, { activo }) => {
      toast.success(activo ? 'Cupón activado' : 'Cupón desactivado');
      setToDeactivate(null);
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
    },
    onError,
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(toPayload(form));
  };

  const scopeOf = (c: Coupon): string =>
    c.IDCategoriaAplica ? `Categoría: ${categoryName.get(c.IDCategoriaAplica) ?? c.CategoriaAplica ?? `#${c.IDCategoriaAplica}`}` : 'Todo el carrito';

  const headers = (
    <TableRow>
      <SortableHead column="codigo" sort={sort} onSort={toggle} filter={{ def: DEFS.q, values: f, onChange: patch }}>Código</SortableHead>
      <TableHead>Descuento</TableHead>
      <TableHead>Alcance</TableHead>
      <TableHead>Mínimo de compra</TableHead>
      <SortableHead column="usos" sort={sort} onSort={toggle}>Usos actuales</SortableHead>
      <SortableHead column="vigencia" sort={sort} onSort={toggle} filter={{ def: DEFS.vigencia, values: f, onChange: patch }}>Vigencia</SortableHead>
      <FilterableHead filter={{ def: DEFS.activo, values: f, onChange: patch }}>Estado</FilterableHead>
      <TableHead className="text-right">Acciones</TableHead>
    </TableRow>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cupones"
        action={
          <Button size="sm" onClick={openNew} leftIcon={<Plus className="w-4 h-4 mr-1" />}>
            Nuevo cupón
          </Button>
        }
      />

      <FilterChips defs={Object.values(DEFS)} values={f} onChange={patch} onClearAll={clearAll} />

      {isError ? (
        <ErrorState title="Error al cargar los cupones" onRetry={() => refetch()} />
      ) : !isLoading && coupons.length === 0 && !anyActive ? (
        <EmptyState title="Sin cupones" actionLabel="Nuevo cupón" onAction={openNew} />
      ) : (
        <Table>
          <TableHeader>{headers}</TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRowsSkeleton rows={5} cols={8} />
            ) : coupons.length === 0 ? (
              <TableMessageRow colSpan={8}>Ningún cupón coincide con los filtros.</TableMessageRow>
            ) : coupons.map((c) => (
              <TableRow key={c.IDCupon} className={c.Activo ? '' : 'opacity-70'}>
                <TableCell className="font-mono text-xs font-bold text-indigo-700">{c.Codigo}</TableCell>
                <TableCell className="font-semibold text-slate-800">
                  {c.TipoDescuento === 'PORCENTAJE' ? `${c.Valor}%` : formatMoney(c.Valor)}
                </TableCell>
                <TableCell className="text-xs text-slate-600">{scopeOf(c)}</TableCell>
                <TableCell>{formatMoney(c.MontoMinimoCompra)}</TableCell>
                <TableCell className="text-xs">
                  <span className="font-bold text-slate-700">{c.UsosActuales}</span> de {c.LimiteTotalUsos}
                  ({c.LimiteUsosPorCliente} por cliente)
                </TableCell>
                <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                  {formatDateTime(c.FechaInicio)} al {formatDateTime(c.FechaFin)}
                </TableCell>
                <TableCell>
                  <Badge variant={c.Activo ? 'success' : 'neutral'} size="sm">
                    {c.Activo ? 'Activo' : 'Inactivo'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <div className="inline-flex gap-2">
                    <Button variant="outline" size="sm" leftIcon={<Pencil className="mr-1 h-3.5 w-3.5" />} onClick={() => openEdit(c)} aria-label={`Editar el cupón ${c.Codigo}`}>
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      loading={statusMutation.isPending && statusMutation.variables?.coupon.IDCupon === c.IDCupon && !toDeactivate}
                      onClick={() => (c.Activo ? setToDeactivate(c) : statusMutation.mutate({ coupon: c, activo: true }))}
                      aria-label={`${c.Activo ? 'Desactivar' : 'Activar'} el cupón ${c.Codigo}`}
                    >
                      {c.Activo ? 'Desactivar' : 'Activar'}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingCouponId ? 'Editar cupón' : 'Nuevo cupón'}
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Código"
              placeholder="VERANO2026"
              value={form.codigo}
              onChange={(e) => set('codigo', e.target.value.toUpperCase())}
              required
            />
            <Select
              label="Tipo de descuento"
              value={form.tipoDescuento}
              onChange={(e) => set('tipoDescuento', e.target.value as CouponForm['tipoDescuento'])}
              options={[
                { value: 'PORCENTAJE', label: 'Porcentaje' },
                { value: 'MONTO_FIJO', label: 'Monto fijo (Q)' },
              ]}
            />
            <Input
              label={form.tipoDescuento === 'PORCENTAJE' ? 'Porcentaje (1 - 100%)' : 'Monto (Q)'}
              type="number"
              min={1}
              max={form.tipoDescuento === 'PORCENTAJE' ? 100 : undefined}
              value={form.valor}
              onChange={(e) => set('valor', Number(e.target.value))}
              required
            />
            <Input
              label="Compra mínima (Q)"
              type="number"
              min={0}
              value={form.montoMinimo}
              onChange={(e) => set('montoMinimo', Number(e.target.value))}
              required
            />
            <Input
              label="Límite total de usos"
              type="number"
              min={1}
              value={form.limiteTotal}
              onChange={(e) => set('limiteTotal', Number(e.target.value))}
              required
            />
            <Input
              label="Límite por cliente"
              type="number"
              min={1}
              value={form.limitePorCliente}
              onChange={(e) => set('limitePorCliente', Number(e.target.value))}
              required
            />
            <Input
              label="Fecha de inicio"
              type="date"
              value={form.fechaInicio}
              onChange={(e) => set('fechaInicio', e.target.value)}
              required
            />
            <Input
              label="Fecha de fin"
              type="date"
              value={form.fechaFin}
              onChange={(e) => set('fechaFin', e.target.value)}
              required
            />
          </div>

          <Select
            label="Alcance del cupón"
            value={form.idCatAplica}
            onChange={(e) => set('idCatAplica', e.target.value)}
            options={[
              { value: '', label: 'Todo el carrito' },
              ...categories.map((cat) => ({
                value: String(cat.IDCategoria),
                label: `Categoría: ${cat.Nombre}`,
              })),
            ]}
          />

          <label className="flex items-center gap-2.5 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={form.activo}
              onChange={(e) => set('activo', e.target.checked)}
              className="h-4 w-4 accent-[var(--color-brand)]"
            />
            Cupón activo
          </label>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={closeModal}>
              Cancelar
            </Button>
            <Button type="submit" loading={saveMutation.isPending} disabled={!online} title={online ? undefined : 'Sin conexión'}>
              Guardar
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={toDeactivate !== null}
        onClose={() => setToDeactivate(null)}
        onConfirm={() => {
          if (toDeactivate) statusMutation.mutate({ coupon: toDeactivate, activo: false });
        }}
        loading={statusMutation.isPending}
        title={`Desactivar ${toDeactivate?.Codigo ?? ''}`}
        consequence="Nadie podrá aplicarlo a su carrito. Lo puedes activar de nuevo cuando quieras."
        confirmText="Desactivar"
      />
    </div>
  );
};
