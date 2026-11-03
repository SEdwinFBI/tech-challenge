import { z } from 'zod';
import { DireccionSchema } from '@/core/domain/sort';

export * from './cupones.model';

export const ApplyCouponSchema = z.object({
  codigo: z.string().min(2),
});

export type ApplyCouponDTO = z.infer<typeof ApplyCouponSchema>;

export const SaveCouponSchema = z.object({
  idCupon: z.number().int().positive().optional(),
  codigo: z.string().min(3).max(50),
  tipoDescuento: z.enum(['PORCENTAJE', 'MONTO_FIJO']),
  valor: z.number().positive(),
  montoMinimoCompra: z.number().min(0).default(0),
  limiteTotalUsos: z.number().int().positive(),
  limiteUsosPorCliente: z.number().int().positive(),
  idCategoriaAplica: z.number().int().positive().nullable().optional(),
  fechaInicio: z.coerce.date(),
  fechaFin: z.coerce.date(),
  activo: z.boolean().default(true),
});

export type SaveCouponDTO = z.infer<typeof SaveCouponSchema>;

export type ApplyCouponCommand = ApplyCouponDTO & {
  idUsuario: number;
};

export interface RemoveCouponCommand {
  idUsuario: number;
}

export type SaveCouponCommand = SaveCouponDTO & {
  idAdmin: number;
};

export const GetCouponsSchema = z.object({
  q: z.string().trim().max(50).optional(),
  activo: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  vigencia: z.enum(['VIGENTE', 'VENCIDO', 'POR_INICIAR']).optional(),
  orden: z.enum(['fecha', 'codigo', 'vigencia', 'usos']).default('fecha'),
  direccion: DireccionSchema,
});

export type GetCouponsDTO = z.infer<typeof GetCouponsSchema>;
