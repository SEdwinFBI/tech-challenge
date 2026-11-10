import React, { useCallback, useState } from 'react';
import { apiErrorMessage } from '@/shared/lib/apiErrors';
import { mutationKeys, queryKeys } from '@/shared/lib/queryKeys';
import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi, type UserSortColumn } from '@/features/auth';
import { useSort } from '@/shared/hooks/useSort';
import { useColumnFilters } from '@/shared/hooks/useColumnFilters';
import type { FilterDef } from '@/shared/lib/columnFilters';
import { User, UserRole } from '@/shared/types/domain';
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
  Badge,
  PageHeader,
  Pagination,
  ConfirmDialog,
  TableRowsSkeleton,
  EmptyState,
} from '@/shared/ui';
import { UserCheck, UserX } from 'lucide-react';
import { toast } from '@/shared/ui/toastStore';

const FILTROS = ['q', 'rol', 'activo'] as const;
const DEFS: Record<'q' | 'rol' | 'activo', FilterDef> = {
  q: { type: 'texto', key: 'q', label: 'Nombre o correo', placeholder: 'Nombre o correo' },
  rol: {
    type: 'opciones',
    key: 'rol',
    label: 'Rol',
    options: [
      { value: 'CLIENTE', label: 'Cliente' },
      { value: 'OPERADOR', label: 'Operador' },
      { value: 'ADMINISTRADOR', label: 'Administrador' },
    ],
  },
  activo: {
    type: 'opciones',
    key: 'activo',
    label: 'Estado',
    options: [
      { value: 'true', label: 'Activo' },
      { value: 'false', label: 'Desactivado' },
    ],
  },
};

export const AdminUsersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const [userToToggle, setUserToToggle] = useState<{ id: number; nombre: string; activo: boolean } | null>(null);

  const [userToChangeRole, setUserToChangeRole] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>('CLIENTE');

  const resetPage = useCallback(() => setPage(1), []);
  const { values: f, patch, clearAll, anyActive } = useColumnFilters(FILTROS, resetPage);
  const { sort, toggle } = useSort<UserSortColumn>({ orden: 'fecha', direccion: 'desc' }, resetPage);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.users.list({ page, f, orden: sort.orden, direccion: sort.direccion }),
    placeholderData: keepPreviousData,
    queryFn: () =>
      authApi.getUsers({
        pagina: page,
        tamanoPagina: 15,
        orden: sort.orden,
        direccion: sort.direccion,
        busqueda: f.q.trim() || undefined,
        rol: f.rol || undefined,
        activo: f.activo === '' ? undefined : f.activo === 'true',
      }),
  });

  const users = data?.datos || [];

  const updateStatusMutation = useMutation({
    mutationKey: mutationKeys.users.status,
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) => authApi.updateUserStatus(id, activo),
    onSuccess: () => {
      toast.success('Estado del usuario actualizado');
      setUserToToggle(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
    onError: () => {
      toast.error('No se pudo actualizar el estado del usuario');
    },
  });

  const updateRoleMutation = useMutation({
    mutationKey: mutationKeys.users.role,
    mutationFn: ({ id, rol }: { id: number; rol: UserRole }) => authApi.updateUserRole(id, rol),
    onSuccess: () => {
      toast.success('Rol de usuario actualizado');
      setUserToChangeRole(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
    onError: () => {
      toast.error('No se pudo cambiar el rol del usuario');
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuarios"
        description="Roles y activación de cuentas. Los usuarios se desactivan, nunca se borran."
      />

      <FilterChips defs={Object.values(DEFS)} values={f} onChange={patch} onClearAll={clearAll} />

      {!isLoading && !isError && users.length === 0 && !anyActive ? (
        <EmptyState
          title="No se encontraron usuarios"
          description="Todavía no hay usuarios registrados."
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHead column="nombre" sort={sort} onSort={toggle} filter={{ def: DEFS.q, values: f, onChange: patch }}>Nombre completo</SortableHead>
                <SortableHead column="correo" sort={sort} onSort={toggle}>Correo electrónico</SortableHead>
                <SortableHead column="rol" sort={sort} onSort={toggle} filter={{ def: DEFS.rol, values: f, onChange: patch }}>Rol</SortableHead>
                <FilterableHead filter={{ def: DEFS.activo, values: f, onChange: patch }}>Estado</FilterableHead>
                <TableHead className="text-right">Gestionar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRowsSkeleton rows={8} cols={5} />
              ) : isError ? (
                <TableMessageRow colSpan={5}>
                  {apiErrorMessage(error, 'No se pudo cargar usuarios.')}{' '}
                  <button type="button" onClick={() => { void refetch(); }} className="font-semibold text-indigo-700 hover:underline">
                    Reintentar
                  </button>
                </TableMessageRow>
              ) : users.length === 0 ? (
                <TableMessageRow colSpan={5}>Ningún usuario coincide con los filtros.</TableMessageRow>
              ) : users.map((u) => (
                <TableRow key={u.idUsuario}>
                  <TableCell className="font-semibold text-slate-900">{u.nombreCompleto}</TableCell>
                  <TableCell className="text-xs text-slate-600 font-mono">{u.correo}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        u.rol === 'ADMINISTRADOR'
                          ? 'purple'
                          : u.rol === 'OPERADOR'
                          ? 'warning'
                          : 'neutral'
                      }
                      size="sm"
                    >
                      {u.rol}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.activo !== false ? 'success' : 'error'} size="sm">
                      {u.activo !== false ? 'Activo' : 'Desactivado'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setUserToChangeRole(u);
                        setSelectedRole(u.rol);
                      }}
                      title="Modificar rol"
                    >
                      Rol
                    </Button>
                    <button
                      onClick={() =>
                        setUserToToggle({
                          id: u.idUsuario,
                          nombre: u.nombreCompleto,
                          activo: u.activo !== false,
                        })
                      }
                      className={`p-1.5 rounded-lg transition-colors ${
                        u.activo !== false
                          ? 'text-rose-600 hover:bg-rose-50'
                          : 'text-emerald-600 hover:bg-emerald-50'
                      }`}
                      title={u.activo !== false ? 'Desactivar cuenta' : 'Reactivar cuenta'}
                    >
                      {u.activo !== false ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {data && (
            <Pagination
              currentPage={data.pagina || 1}
              totalRecords={data.total || 0}
              pageSize={data.tamanoPagina || 15}
              onPageChange={(p) => setPage(p)}
            />
          )}
        </>
      )}

      <ConfirmDialog
        isOpen={userToToggle !== null}
        onClose={() => setUserToToggle(null)}
        onConfirm={() => {
          if (userToToggle) {
            updateStatusMutation.mutate({
              id: userToToggle.id,
              activo: !userToToggle.activo,
            });
          }
        }}
        loading={updateStatusMutation.isPending}
        title={userToToggle?.activo ? `¿Desactivar a ${userToToggle?.nombre}?` : `¿Reactivar cuenta de ${userToToggle?.nombre}?`}
        consequence={
          userToToggle?.activo
            ? 'El usuario no podrá iniciar sesión en la tienda ni en el backoffice hasta ser reactivado. Sus órdenes e historial se preservan.'
            : 'El usuario recuperará el acceso inmediato a la plataforma con sus credenciales habituales.'
        }
        confirmText={userToToggle?.activo ? 'Desactivar usuario' : 'Reactivar usuario'}
        variant={userToToggle?.activo ? 'destructive' : 'primary'}
      />

      {userToChangeRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white p-6 rounded-2xl shadow-xl border border-slate-200">
            <h3 className="font-bold text-slate-900 text-base mb-1">
              Cambiar Rol de {userToChangeRole.nombreCompleto}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Selecciona el nuevo nivel de privilegios en el sistema.
            </p>
            <div className="space-y-3">
              {(['CLIENTE', 'OPERADOR', 'ADMINISTRADOR'] as UserRole[]).map((r) => (
                <label
                  key={r}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer text-xs font-semibold ${
                    selectedRole === r
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{r}</span>
                  <input
                    type="radio"
                    name="role"
                    value={r}
                    checked={selectedRole === r}
                    onChange={() => setSelectedRole(r)}
                  />
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2.5 pt-4 mt-4 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setUserToChangeRole(null)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  updateRoleMutation.mutate({
                    id: userToChangeRole.idUsuario,
                    rol: selectedRole,
                  })
                }
                loading={updateRoleMutation.isPending}
              >
                Actualizar Rol
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
