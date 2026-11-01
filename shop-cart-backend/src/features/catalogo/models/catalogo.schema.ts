import { z } from 'zod';

export * from './catalogo.model';

export const GetCategoriesSchema = z.object({
  soloActivas: z.boolean().optional(),
});
export type GetCategoriesDTO = z.infer<typeof GetCategoriesSchema>;

export const GetProductsSchema = z.object({
  q: z.string().optional(),
  idCategoria: z.coerce.number().int().positive().optional(),
  precioMin: z.coerce.number().nonnegative().optional(),
  precioMax: z.coerce.number().positive().optional(),
  soloDisponibles: z.string().optional(),
  soloOfertas: z.string().optional(),
  soloNuevos: z.string().optional(),
  soloDestacados: z.string().optional(),
  orden: z.enum(['RECIENTES', 'PRECIO_ASC', 'PRECIO_DESC', 'NOMBRE_ASC', 'MAS_VENDIDOS', 'DESTACADOS']).default('RECIENTES'),
  pagina: z.coerce.number().int().min(1).default(1),
  tamanoPagina: z.coerce.number().int().min(1).max(50).default(12),
});
export type GetProductsDTO = z.infer<typeof GetProductsSchema>;

export const SaveCategorySchema = z.object({
  idCategoria: z.number().int().positive().optional(),
  nombre: z.string().min(2),
  descripcion: z.string().optional(),
  activa: z.boolean().default(true),
});
export type SaveCategoryDTO = z.infer<typeof SaveCategorySchema>;

export const CreateProductSchema = z.object({
  idCategoria: z.number().int().positive(),
  nombre: z.string().min(3),
  descripcion: z.string().optional(),
  imagenUrl: z.string().url().optional(),
  sku: z.string().min(3),
  talla: z.string().optional(),
  color: z.string().optional(),
  presentacion: z.string().optional(),
  precio: z.number().positive(),
  existenciaInicial: z.number().int().min(0).default(0),
});
export type CreateProductDTO = z.infer<typeof CreateProductSchema>;

export const UpdateProductSchema = z.object({
  idCategoria: z.number().int().positive().optional(),
  nombre: z.string().min(3).optional(),
  descripcion: z.string().optional(),
  imagenUrl: z.string().url().optional(),
  activo: z.boolean().optional(),
});
export type UpdateProductDTO = z.infer<typeof UpdateProductSchema>;

export const CreateVariantSchema = z.object({
  sku: z.string().min(3),
  talla: z.string().optional(),
  color: z.string().optional(),
  presentacion: z.string().optional(),
  precio: z.number().positive(),
  existenciaInicial: z.number().int().min(0).default(0),
});
export type CreateVariantDTO = z.infer<typeof CreateVariantSchema>;

export const UpdateVariantSchema = z.object({
  sku: z.string().min(3).optional(),
  talla: z.string().optional(),
  color: z.string().optional(),
  presentacion: z.string().optional(),
  precio: z.number().positive().optional(),
  activo: z.boolean().optional(),
});
export type UpdateVariantDTO = z.infer<typeof UpdateVariantSchema>;

export const UpdatePriceSchema = z.object({
  nuevoPrecio: z.number().positive(),
});
export type UpdatePriceDTO = z.infer<typeof UpdatePriceSchema>;

export type SaveCategoryCommand = SaveCategoryDTO & { idAdmin: number };

export type CreateProductCommand = CreateProductDTO & { idAdmin: number };

export type UpdateProductCommand = UpdateProductDTO & { idProducto: number; idAdmin: number };

export interface DeleteProductCommand {
  idProducto: number;
  idAdmin: number;
}

export type CreateVariantCommand = CreateVariantDTO & { idProducto: number; idAdmin: number };

export type UpdateVariantCommand = UpdateVariantDTO & {
  idVariante: number;
  idAdmin: number;
};

export interface UpdatePriceCommand {
  idVariante: number;
  nuevoPrecio: number;
  idAdmin: number;
}

export type GetProductsQuery = GetProductsDTO & {
  rolUsuario?: string;
};

export const AddProductImageSchema = z.object({
  url: z
    .string()
    .url()
    .max(500)
    .refine(u => /^https?:\/\//i.test(u), { message: 'La URL debe iniciar con http:// o https://' }),
});
export type AddProductImageDTO = z.infer<typeof AddProductImageSchema>;

export const SetReferencePriceSchema = z.object({
  precioReferencia: z.number().positive().nullable(),
});
export type SetReferencePriceDTO = z.infer<typeof SetReferencePriceSchema>;

export const SetFeaturedSchema = z.object({
  destacado: z.boolean(),
});
export type SetFeaturedDTO = z.infer<typeof SetFeaturedSchema>;

export interface AddProductImageCommand {
  idProducto: number;
  url: string;
  idAdmin: number;
}

export interface DeleteProductImageCommand {
  idProductoImagen: number;
  idAdmin: number;
}

export interface SetReferencePriceCommand {
  idVariante: number;
  precioReferencia: number | null;
  idAdmin: number;
}

export interface SetFeaturedCommand {
  idProducto: number;
  destacado: boolean;
  idAdmin: number;
}

export const SetCategoryImageSchema = z.object({
  imagenUrl: z
    .string()
    .url()
    .max(500)
    .refine(u => /^https?:\/\//i.test(u), { message: 'La URL debe iniciar con http:// o https://' })
    .nullable(),
});
export type SetCategoryImageDTO = z.infer<typeof SetCategoryImageSchema>;

export interface SetCategoryImageCommand {
  idCategoria: number;
  imagenUrl: string | null;
  idAdmin: number;
}
