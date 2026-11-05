import { apiClient } from '@/shared/lib/apiClient';

export interface AuditLogEntry {
  IDBitacora: string | number;
  FechaRegistro: string;
  Usuario: string;
  Rol: string;
  Modulo: string;
  Entidad: string;
  IDEntidad: number;
  Accion: string;
  ValorAnterior: string | null;
  ValorNuevo: string | null;
  TotalRegistros?: number;
}

export interface AuditLogResponse {
  ok: boolean;
  items: AuditLogEntry[];
  totalRegistros: number;
  pagina: number;
  tamanoPagina: number;
}

export type AuditSortColumn = 'fecha' | 'modulo' | 'usuario';

export interface GetAuditLogParams {
  orden?: AuditSortColumn;
  direccion?: 'asc' | 'desc';
  pagina?: number;
  tamanoPagina?: number;
  modulo?: string;
  accion?: string;
  busqueda?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

export const auditLogApi = {
  getLogs: async (params?: GetAuditLogParams): Promise<AuditLogResponse> => {
    const res = await apiClient.get<AuditLogResponse>('/bitacora', { params });
    return res.data;
  },
};
