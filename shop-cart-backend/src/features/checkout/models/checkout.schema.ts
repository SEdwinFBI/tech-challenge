import { z } from 'zod';
import { DireccionSchema } from '@/core/domain/sort';

export * from './checkout.model';
export * from './payments.model';

export const CreateAddressSchema = z
  .object({
    etiqueta: z.string().min(2),
    idMunicipio: z.number().int().positive().optional(),
    idTarifaEnvio: z.number().int().positive().optional(),
    municipio: z.string().min(2).optional(),
    direccionExacta: z.string().min(5),
    telefonoContacto: z.string().min(8),
    predeterminada: z.boolean().default(false),
  })
  .refine(d => d.idMunicipio !== undefined || d.municipio !== undefined || d.idTarifaEnvio !== undefined, {
    message: 'Debe especificar el idMunicipio o el municipio',
  });

export type CreateAddressDTO = z.infer<typeof CreateAddressSchema>;

export const DeleteAddressSchema = z.object({
  idDireccion: z.coerce.number().int().positive(),
});

export type DeleteAddressDTO = z.infer<typeof DeleteAddressSchema>;

export const SetDefaultAddressSchema = z.object({
  idDireccion: z.coerce.number().int().positive(),
});

export type SetDefaultAddressDTO = z.infer<typeof SetDefaultAddressSchema>;

export const ReserveStockSchema = z.object({
  idCarrito: z.number().int().positive(),
});

export type ReserveStockDTO = z.infer<typeof ReserveStockSchema>;

export const ConfirmOrderSchema = z.object({
  idCarrito: z.number().int().positive(),
  idDireccion: z.number().int().positive(),
  claveIdempotencia: z.string().min(8).max(100),
  simularFalloPago: z.boolean().default(false),
  simulacionPago: z.enum(['APROBADO', 'RECHAZADO', 'ERROR_TRAS_COBRO', 'TIMEOUT']).optional(),
});

export type ConfirmOrderDTO = z.infer<typeof ConfirmOrderSchema>;

export type CreateAddressCommand = CreateAddressDTO & {
  idUsuario: number;
};

export interface DeleteAddressCommand {
  idDireccion: number;
  idUsuario: number;
}

export interface SetDefaultAddressCommand {
  idDireccion: number;
  idUsuario: number;
}

export type ReserveStockCommand = ReserveStockDTO & {
  idUsuario: number;
};

export type ConfirmOrderCommand = ConfirmOrderDTO & {
  idUsuario: number;
};

export const ListPaymentsSchema = z.object({
  estado: z.enum(['AUTORIZADO', 'CAPTURADO', 'RECHAZADO', 'ANULADO', 'PENDIENTE_CONCILIACION']).optional(),
  direccion: DireccionSchema,
  pagina: z.coerce.number().int().min(1).default(1),
  tamanoPagina: z.coerce.number().int().min(1).max(100).default(15),
});

export type ListPaymentsQuery = z.infer<typeof ListPaymentsSchema>;

export interface GetAddressesQuery {
  idUsuario: number;
}
