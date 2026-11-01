import { z } from 'zod';

export * from './checkout.model';

export const CreateAddressSchema = z
  .object({
    etiqueta: z.string().min(2),
    idMunicipio: z.number().int().positive().optional(),
    idTarifaEnvio: z.number().int().positive().optional(),
    municipio: z.string().min(2).optional(),
    direccionExacta: z.string().min(5),
    telefonoContacto: z.string().min(8),
  })
  .refine(d => d.idMunicipio !== undefined || d.municipio !== undefined || d.idTarifaEnvio !== undefined, {
    message: 'Debe especificar el idMunicipio o el municipio',
  });

export type CreateAddressDTO = z.infer<typeof CreateAddressSchema>;

export const DeleteAddressSchema = z.object({
  idDireccion: z.coerce.number().int().positive(),
});

export type DeleteAddressDTO = z.infer<typeof DeleteAddressSchema>;

export const ReserveStockSchema = z.object({
  idCarrito: z.number().int().positive(),
});

export type ReserveStockDTO = z.infer<typeof ReserveStockSchema>;

export const ConfirmOrderSchema = z.object({
  idCarrito: z.number().int().positive(),
  idDireccion: z.number().int().positive(),
  claveIdempotencia: z.string().min(8).max(100),
  simularFalloPago: z.boolean().default(false),
});

export type ConfirmOrderDTO = z.infer<typeof ConfirmOrderSchema>;

export type CreateAddressCommand = CreateAddressDTO & {
  idUsuario: number;
};

export interface DeleteAddressCommand {
  idDireccion: number;
  idUsuario: number;
}

export type ReserveStockCommand = ReserveStockDTO & {
  idUsuario: number;
};

export type ConfirmOrderCommand = ConfirmOrderDTO & {
  idUsuario: number;
};

export interface GetAddressesQuery {
  idUsuario: number;
}
