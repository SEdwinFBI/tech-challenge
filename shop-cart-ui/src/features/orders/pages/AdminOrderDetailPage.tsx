import React, { useState } from 'react';
import { useParams, Link } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '../api/ordersApi';
import { OrderStatus, OrderItem } from '@/shared/types/domain';
import { formatMoney, formatDateTime, plural } from '@/shared/lib/formatters';
import { ALLOWED_TRANSITIONS, orderStatusMeta } from '@/shared/lib/orderStatus';
import {
  getOrderStatusBadge,
  OrderTimeline,
  Button,
  Modal,
  ConfirmDialog,
  Skeleton,
  ErrorState,
  PageHeader,
} from '@/shared/ui';
import { ArrowLeft, MapPin, RotateCcw } from 'lucide-react';
import { toast } from '@/shared/ui/toastStore';
import { apiErrorMessage } from '@/shared/lib/apiErrors';
import { invalidateStock, mutationKeys, queryKeys } from '@/shared/lib/queryKeys';

export const AdminOrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const orderId = Number(id);
  const queryClient = useQueryClient();

  const [targetStatus, setTargetStatus] = useState<OrderStatus | ''>('');
  const [statusReason, setStatusReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);

  const [selectedLineForReturn, setSelectedLineForReturn] = useState<OrderItem | null>(null);
  const [returnQuantity, setReturnQuantity] = useState(1);
  const [returnReason, setReturnReason] = useState('Devolución por insatisfacción del cliente');
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.adminOrders.detail(orderId),
    queryFn: () => ordersApi.getOrderById(orderId),
  });

  const pedido = data?.pedido;
  const detalles = data?.detalles || [];
  const historial = data?.historial || [];

  const nextAllowedStates = pedido ? ALLOWED_TRANSITIONS[pedido.Estado] || [] : [];

  const changeStatusMutation = useMutation({
    mutationKey: mutationKeys.adminOrders.changeStatus,
    mutationFn: () => ordersApi.updateOrderStatus(orderId, targetStatus as OrderStatus, statusReason.trim() || undefined),
    onSuccess: () => {
      toast.success('Estado actualizado');
      setIsStatusDialogOpen(false);
      setStatusReason('');
      setTargetStatus('');
      queryClient.invalidateQueries({ queryKey: queryKeys.adminOrders.all });
      void invalidateStock(queryClient);
    },
    onError: (err: unknown) => {
      const msg =
        apiErrorMessage(err, 'Cambio no permitido.');
      toast.error('Error al cambiar estado', msg);
    },
  });

  const returnLineMutation = useMutation({
    mutationKey: mutationKeys.adminOrders.returnLine,
    mutationFn: () => {
      if (!selectedLineForReturn) throw new Error('No line selected');
      return ordersApi.returnOrderLine(orderId, {
        idDetalle: selectedLineForReturn.IDDetalle,
        cantidadDevolver: returnQuantity,
        motivo: returnReason,
      });
    },
    onSuccess: () => {
      toast.success('Devolución procesada');
      setIsReturnModalOpen(false);
      setSelectedLineForReturn(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.adminOrders.all });
      void invalidateStock(queryClient);
    },
    onError: (err: unknown) => {
      const msg =
        apiErrorMessage(err, 'Revisa la cantidad.');
      toast.error('Error al procesar devolución', msg);
    },
  });

  const openStatusDialog = (st: OrderStatus) => {
    setTargetStatus(st);
    setStatusReason('');
    setReasonError('');
    setIsStatusDialogOpen(true);
  };

  const confirmStatusChange = () => {
    if (targetStatus === 'CANCELADO') {
      const len = statusReason.trim().length;
      if (len < 5) {
        setReasonError('El motivo debe tener al menos 5 caracteres.');
        return;
      }
      if (len > 300) {
        setReasonError('El motivo no puede superar los 300 caracteres.');
        return;
      }
    }
    changeStatusMutation.mutate();
  };

  const openReturnModal = (line: OrderItem) => {
    setSelectedLineForReturn(line);
    const maxReturnable = line.Cantidad - line.CantidadDevuelta;
    setReturnQuantity(Math.min(1, maxReturnable));
    setIsReturnModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="w-48 h-8" />
        <Skeleton className="w-full h-48 rounded-2xl" />
        <Skeleton className="w-full h-64 rounded-2xl" />
      </div>
    );
  }

  if (isError || !pedido) {
    return (
      <ErrorState
        title="No se pudo cargar el pedido"
        onRetry={refetch}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          to="/admin/pedidos"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Pedidos
        </Link>
        <PageHeader
          title={`Pedido ${pedido.NumeroSeguimiento}`}
          description={`Cliente: ${pedido.Cliente} (${pedido.Correo}) • Fecha: ${formatDateTime(pedido.FechaCreacion)}`}
          action={
            <div className="flex items-center gap-3">
              {getOrderStatusBadge(pedido.Estado)}
            </div>
          }
        />
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Cambiar estado
        </h2>
        {nextAllowedStates.length === 0 ? (
          <p className="text-xs text-slate-400 italic">Estado final: {orderStatusMeta(pedido.Estado).label}.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-slate-600 font-medium">Cambiar a:</span>
            {nextAllowedStates.map((st) => (
              <Button
                key={st}
                size="sm"
                variant={st === 'CANCELADO' ? 'destructive' : 'primary'}
                onClick={() => openStatusDialog(st)}
              >
                {orderStatusMeta(st).label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {pedido.DireccionEntrega && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            <MapPin className="w-4 h-4" /> Entrega
          </h2>
          <p className="text-sm text-slate-700">{pedido.DireccionEntrega}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">Líneas</h3>
          <span className="text-xs text-slate-400">{plural(detalles.length, 'artículo')}</span>
        </div>

        <div className="divide-y divide-slate-100">
          {detalles.map((line) => {
            const maxReturnable = line.Cantidad - line.CantidadDevuelta;
            const canReturn = (pedido.Estado === 'ENTREGADO' || pedido.Estado === 'DEVUELTO_PARCIAL') && maxReturnable > 0;
            return (
              <div key={line.IDDetalle} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="font-semibold text-slate-900 text-sm">{line.Producto}</p>
                  <p className="text-xs text-slate-500">
                    SKU: <span className="font-mono text-slate-700">{line.SKU}</span> • Talla: {line.Talla} • Color: {line.Color}
                  </p>
                  <p className="text-xs text-slate-400">
                    Compradas: <span className="font-bold text-slate-700">{line.Cantidad}</span> • Devueltas:{' '}
                    <span className="font-bold text-amber-600">{line.CantidadDevuelta}</span> • Precio:{' '}
                    {formatMoney(line.PrecioUnitario)}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">{pedido.Descuento > 0 ? 'Importe con descuento' : 'Importe'}</span>
                    <span className="font-bold text-slate-900 text-sm">{formatMoney(line.Subtotal)}</span>
                  </div>

                  {canReturn && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openReturnModal(line)}
                      leftIcon={<RotateCcw className="w-3.5 h-3.5 mr-1 text-amber-600" />}
                    >
                      Devolución ({maxReturnable} por devolver)
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-5 bg-slate-50/75 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs text-slate-500 space-y-0.5">
            <p>Reembolsado: <span className="font-bold text-rose-600">{formatMoney(pedido.MontoReembolsado)}</span></p>
            <p>Base Imponible Sin IVA: {formatMoney(pedido.BaseImponibleSinIVA)} • IVA 12%: {formatMoney(pedido.MontoIVA12)}</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 block">Total</span>
            <span className="text-2xl font-black text-indigo-700">{formatMoney(pedido.Total)}</span>
          </div>
        </div>
      </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Historial
          </h3>
          <OrderTimeline history={historial} showAuthor />
        </div>

      <ConfirmDialog
        isOpen={isStatusDialogOpen}
        onClose={() => setIsStatusDialogOpen(false)}
        onConfirm={confirmStatusChange}
        loading={changeStatusMutation.isPending}
        title={`Cambiar a ${targetStatus ? orderStatusMeta(targetStatus).label : ''}`}
        consequence={`${orderStatusMeta(pedido.Estado).label} → ${targetStatus ? orderStatusMeta(targetStatus).label : ''}`}
        confirmText="Confirmar"
      >
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">
            {targetStatus === 'CANCELADO' ? 'Motivo de la cancelación' : 'Nota (opcional)'}
          </span>
          <textarea
            value={statusReason}
            onChange={(e) => {
              setStatusReason(e.target.value);
              setReasonError('');
            }}
            rows={3}
            maxLength={300}
            required={targetStatus === 'CANCELADO'}
            aria-invalid={Boolean(reasonError)}
            aria-describedby={reasonError ? 'status-reason-error' : undefined}
            className={`w-full px-3.5 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 ${reasonError ? 'border-rose-400' : 'border-slate-300'}`}
          />
          <span className="mt-1 flex justify-between text-xs">
            <span id="status-reason-error" role="alert" className="font-semibold text-rose-600">{reasonError}</span>
            <span className="text-slate-400">{statusReason.length}/300</span>
          </span>
        </label>
      </ConfirmDialog>

      {selectedLineForReturn && (
        <Modal
          isOpen={isReturnModalOpen}
          onClose={() => setIsReturnModalOpen(false)}
          title="Devolución"
          description={`Artículo: ${selectedLineForReturn.Producto} (${selectedLineForReturn.SKU})`}
        >
          <div className="space-y-4">
            <div>
              <label htmlFor="return-qty" className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                Cantidad (máx. {selectedLineForReturn.Cantidad - selectedLineForReturn.CantidadDevuelta})
              </label>
              <input
                id="return-qty"
                type="number"
                min={1}
                max={selectedLineForReturn.Cantidad - selectedLineForReturn.CantidadDevuelta}
                value={returnQuantity}
                onChange={(e) => setReturnQuantity(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="return-reason" className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                Motivo
              </label>
              <textarea
                id="return-reason"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                rows={3}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button variant="outline" onClick={() => setIsReturnModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => returnLineMutation.mutate()}
                loading={returnLineMutation.isPending}
                disabled={returnQuantity <= 0 || !returnReason.trim()}
              >
                Devolver
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
