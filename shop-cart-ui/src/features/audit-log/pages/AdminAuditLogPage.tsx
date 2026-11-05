import React, { useCallback, useState } from 'react';
import { apiErrorMessage } from '@/shared/lib/apiErrors';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { auditLogApi, AuditLogEntry, type AuditSortColumn } from '../api/auditLogApi';
import { useSort } from '@/shared/hooks/useSort';
import { useColumnFilters } from '@/shared/hooks/useColumnFilters';
import { dateRangeToIso, type FilterDef } from '@/shared/lib/columnFilters';
import { formatDateTime } from '@/shared/lib/formatters';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  SortableHead,
  FilterableHead,
  FilterChips,
  TableMessageRow,
  TableCell,
  Badge,
  PageHeader,
  Pagination,
  Modal,
  Button,
  TableRowsSkeleton,
  EmptyState,
} from '@/shared/ui';
import { Eye } from 'lucide-react';

const MODULOS = ['PRODUCTOS', 'PRECIOS', 'INVENTARIO', 'PEDIDOS', 'USUARIOS', 'CUPONES'];

const FILTROS = ['modulo', 'accion', 'busqueda', 'desde', 'hasta'] as const;
const DEFS: Record<'fecha' | 'modulo' | 'accion' | 'usuario', FilterDef> = {
  fecha: { type: 'fechas', keyDesde: 'desde', keyHasta: 'hasta', label: 'Fecha' },
  modulo: { type: 'opciones', key: 'modulo', label: 'Módulo', options: MODULOS.map(m => ({ value: m, label: m })), allLabel: 'Todos los módulos' },
  accion: { type: 'texto', key: 'accion', label: 'Acción', placeholder: 'Ej. CAMBIO_ESTADO' },
  usuario: { type: 'texto', key: 'busqueda', label: 'Usuario', placeholder: 'Correo del usuario' },
};

export const AdminAuditLogPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);

  const resetPage = useCallback(() => setPage(1), []);
  const { values: f, patch, clearAll, anyActive } = useColumnFilters(FILTROS, resetPage);
  const { sort, toggle } = useSort<AuditSortColumn>({ orden: 'fecha', direccion: 'desc' }, resetPage);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-audit-log', page, f, sort.orden, sort.direccion],
    placeholderData: keepPreviousData,
    queryFn: () =>
      auditLogApi.getLogs({
        pagina: page,
        tamanoPagina: 15,
        orden: sort.orden,
        direccion: sort.direccion,
        modulo: f.modulo || undefined,
        accion: f.accion.trim() || undefined,
        busqueda: f.busqueda.trim() || undefined,
        ...dateRangeToIso(f.desde, f.hasta),
      }),
  });

  const logs = data?.items || [];

  const formatJsonPretty = (val: string | null) => {
    if (!val) return 'Sin valor previo (Creación inicial)';
    try {
      const parsed = JSON.parse(val);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return val;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bitácora de auditoría (RF-09)"
        description="Cambios en precios, existencias, roles y estados de pedidos. No se pueden editar."
      />

      <FilterChips defs={Object.values(DEFS)} values={f} onChange={patch} onClearAll={clearAll} />

      {!isLoading && !isError && logs.length === 0 && !anyActive ? (
        <EmptyState
          title="Sin registros de auditoría"
          description="Todavía no hay eventos."
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHead column="fecha" sort={sort} onSort={toggle} filter={{ def: DEFS.fecha, values: f, onChange: patch }}>Fecha / Hora</SortableHead>
                <SortableHead column="modulo" sort={sort} onSort={toggle} filter={{ def: DEFS.modulo, values: f, onChange: patch }}>Módulo / Entidad</SortableHead>
                <FilterableHead filter={{ def: DEFS.accion, values: f, onChange: patch }}>Acción</FilterableHead>
                <SortableHead column="usuario" sort={sort} onSort={toggle} filter={{ def: DEFS.usuario, values: f, onChange: patch }}>Usuario</SortableHead>
                <TableHead className="text-right">Auditoría Diff</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRowsSkeleton rows={8} cols={5} />
              ) : isError ? (
                <TableMessageRow colSpan={5}>
                  {apiErrorMessage(error, 'No se pudo cargar la bitácora.')}{' '}
                  <button type="button" onClick={() => { void refetch(); }} className="font-semibold text-indigo-700 hover:underline">
                    Reintentar
                  </button>
                </TableMessageRow>
              ) : logs.length === 0 ? (
                <TableMessageRow colSpan={5}>Ningún evento coincide con los filtros.</TableMessageRow>
              ) : logs.map((log) => (
                <TableRow key={log.IDBitacora}>
                  <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                    {formatDateTime(log.FechaRegistro)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="neutral" size="sm">
                      {log.Modulo}
                    </Badge>
                    <span className="text-xs text-slate-400 block mt-0.5">{log.Entidad}</span>
                  </TableCell>
                  <TableCell className="font-semibold text-slate-800 text-xs">
                    {log.Accion}
                  </TableCell>
                  <TableCell>
                    <p className="text-xs font-medium text-slate-800">{log.Usuario}</p>
                    <Badge variant={log.Rol === 'ADMINISTRADOR' ? 'purple' : 'warning'} size="sm">
                      {log.Rol}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedEntry(log)}
                      leftIcon={<Eye className="w-3.5 h-3.5 mr-1" />}
                    >
                      Ver cambios
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {data && (
            <Pagination
              currentPage={data.pagina}
              totalRecords={data.totalRegistros}
              pageSize={data.tamanoPagina}
              onPageChange={(p) => setPage(p)}
            />
          )}
        </>
      )}

      {selectedEntry && (
        <Modal
          isOpen={Boolean(selectedEntry)}
          onClose={() => setSelectedEntry(null)}
          title={`Detalle de auditoría #${selectedEntry.IDBitacora}`}
          description={`${selectedEntry.Modulo} • ${selectedEntry.Accion} por ${selectedEntry.Usuario}`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-600 block">
                  Valor anterior:
                </span>
                <pre className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl text-xs text-rose-950 font-mono overflow-x-auto max-h-64 whitespace-pre-wrap">
                  {formatJsonPretty(selectedEntry.ValorAnterior)}
                </pre>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 block">
                  Valor nuevo:
                </span>
                <pre className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-950 font-mono overflow-x-auto max-h-64 whitespace-pre-wrap">
                  {formatJsonPretty(selectedEntry.ValorNuevo)}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <Button size="sm" variant="outline" onClick={() => setSelectedEntry(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
