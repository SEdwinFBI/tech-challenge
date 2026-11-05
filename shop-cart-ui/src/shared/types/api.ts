export interface ApiSuccess<T = unknown> {
  ok: true;
  datos?: T;
  mensaje?: string;
}

export interface ApiListResponse<T> {
  ok: boolean;
  datos?: T[];
  items?: T[];
  total?: number;
  totalRegistros?: number;
  pagina?: number;
  tamanoPagina?: number;
}

export interface ApiError {
  ok: false;
  codigo?: string;
  mensaje: string;
  detalles?: Record<string, unknown>;
}
