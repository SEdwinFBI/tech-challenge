import { z } from 'zod';
import { DireccionSchema } from '@/core/domain/sort';

export interface LowStockItemDTO {
  IDVariante: number;
  SKU: string;
  Talla?: string | null;
  Color?: string | null;
  Presentacion?: string | null;
  IDProducto: number;
  Producto: string;
  IDCategoria: number;
  Categoria: string;
  ExistenciaFisica: number;
  UnidadesReservadas: number;
  ExistenciaDisponible: number;
  UmbralAplicado: number;
  TotalRegistros?: number;
}

export interface LowStockResult {
  items: LowStockItemDTO[];
  totalRegistros: number;
}

export const GetLowStockSchema = z.object({
  q: z.string().trim().max(150).optional(),
  orden: z.enum(['existencia', 'producto', 'sku']).default('existencia'),
  direccion: DireccionSchema.default('asc'),
  pagina: z.coerce.number().int().min(1).default(1),
  tamanoPagina: z.coerce.number().int().min(1).max(100).default(20),
});
export type GetLowStockQuery = z.infer<typeof GetLowStockSchema>;
