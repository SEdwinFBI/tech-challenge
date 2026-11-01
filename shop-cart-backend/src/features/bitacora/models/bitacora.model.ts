export interface BitacoraItemDTO {
  IDBitacora?: number;
  FechaHora?: Date | string;
  IDUsuario?: number | null;
  NombreUsuario?: string | null;
  CorreoUsuario?: string | null;
  Accion?: string;
  Modulo?: string;
  TablaAfectada?: string | null;
  IDRegistroAfectado?: number | string | null;
  DetalleJSON?: string | null;
  IP?: string | null;
  TotalRegistros?: number;
  [key: string]: unknown;
}

export interface BitacoraResult {
  items: BitacoraItemDTO[];
  totalRegistros: number;
}
